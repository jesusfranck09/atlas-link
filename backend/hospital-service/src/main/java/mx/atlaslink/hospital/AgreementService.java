package mx.atlaslink.hospital;

import mx.atlaslink.common.*;
import mx.atlaslink.identity.Actor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AgreementService {
    private final Db db;
    private final AccountService accounts;
    public AgreementService(Db db,AccountService accounts){this.db=db;this.accounts=accounts;}
    @Transactional
    public List<Map<String,Object>> list(Actor actor){actor.hospital();db.scope(actor);return db.list("select id,name,insurer_id,insurer,version,status,valid_from,valid_to,rules,created_at from hospital.agreement where tenant_id=? order by created_at desc limit 100",actor.tenantId());}
    @Transactional
    public Map<String,Object> create(Actor actor,Map<String,Object> input){
        actor.require("HOSPITAL_ADMIN");accounts.requireActiveLicense(actor);db.scope(actor);
        String name=Input.text(input,"name",180);UUID insurerId=Input.uuid(input.get("insurerId"));LocalDate from=LocalDate.parse(Input.text(input,"validFrom",10)),to=LocalDate.parse(Input.text(input,"validTo",10));if(to.isBefore(from))throw ApiException.bad("Vigencia final anterior al inicio.");
        if(!(input.get("rules") instanceof Map<?,?>))throw ApiException.bad("Incluye reglas de convenio válidas.");
        Map<String,Object> rules=db.object(input.get("rules"));validateRules(rules);
        var insurer=db.one("select name from hospital.insurer where id=?",insurerId);
        db.jdbc.queryForObject("select pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,actor.tenantId()+":"+insurerId);
        Integer version=db.jdbc.queryForObject("select coalesce(max(version),0)+1 from hospital.agreement where tenant_id=? and insurer_id=?",Integer.class,actor.tenantId(),insurerId);
        UUID id=UUID.randomUUID();db.jdbc.update("insert into hospital.agreement(id,tenant_id,insurer_id,insurer,name,version,valid_from,valid_to,rules) values(?,?,?,?,?,?,?,?,?::jsonb)",id,actor.tenantId(),insurerId,insurer.get("name"),name,version,from,to,db.json(rules));db.audit(actor,"AGREEMENT_DRAFTED","AGREEMENT",id,Map.of("version",version));return db.one("select * from hospital.agreement where id=? and tenant_id=?",id,actor.tenantId());
    }
    @Transactional
    public Map<String,Object> publish(Actor actor,UUID id){actor.require("HOSPITAL_ADMIN");accounts.requireActiveLicense(actor);db.scope(actor);var agreement=db.one("select * from hospital.agreement where id=? and tenant_id=?",id,actor.tenantId());if(!"DRAFT".equals(agreement.get("status")))throw ApiException.conflict("El convenio ya está publicado y es inmutable.");validateRules(db.object(agreement.get("rules")));
        db.jdbc.queryForObject("select pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,actor.tenantId()+":"+agreement.get("insurerId"));
        Long overlaps=db.jdbc.queryForObject("select count(*) from hospital.agreement where tenant_id=? and insurer_id=? and id<>? and status='PUBLISHED' and valid_from<=?::date and valid_to>=?::date",Long.class,actor.tenantId(),agreement.get("insurerId"),id,agreement.get("validTo"),agreement.get("validFrom"));
        if(overlaps!=null&&overlaps>0)throw ApiException.conflict("La vigencia se superpone con un convenio publicado para esta aseguradora. Crea una versión con fechas no superpuestas.");
        if(db.jdbc.update("update hospital.agreement set status='PUBLISHED',published_at=now() where id=? and tenant_id=? and status='DRAFT'",id,actor.tenantId())!=1)throw ApiException.conflict("El convenio cambió. Actualiza la pantalla.");db.audit(actor,"AGREEMENT_PUBLISHED","AGREEMENT",id,Map.of("version",agreement.get("version")));return db.one("select * from hospital.agreement where id=? and tenant_id=?",id,actor.tenantId());}
    static void validateRules(Map<String,Object> rules){
        if(!Set.of("tariffs","excludedCodes","maxQuantities","highRiskThreshold").containsAll(rules.keySet()))throw ApiException.bad("Parámetro de convenio no reconocido.");
        if(!(rules.get("tariffs") instanceof Map<?,?> tariffs)||tariffs.isEmpty()||tariffs.size()>1000)throw ApiException.bad("Incluye entre1 y1000 tarifas.");
        for(var entry:tariffs.entrySet()){code(entry.getKey());amount(entry.getValue(),2,false);}
        if(rules.get("maxQuantities")!=null){if(!(rules.get("maxQuantities") instanceof Map<?,?> max)||max.size()>1000)throw ApiException.bad("Límites de cantidad inválidos.");for(var entry:max.entrySet()){code(entry.getKey());amount(entry.getValue(),3,true);}}
        if(rules.get("excludedCodes")!=null){if(!(rules.get("excludedCodes") instanceof List<?> excluded)||excluded.size()>1000)throw ApiException.bad("Exclusiones inválidas.");for(var code:excluded)code(code);}
        if(rules.get("highRiskThreshold")!=null)amount(rules.get("highRiskThreshold"),2,true);
    }
    private static void code(Object code){if(code==null||!code.toString().matches("[A-Z0-9_.-]{1,40}"))throw ApiException.bad("Los códigos deben usar mayúsculas, números, punto, guion o guion bajo.");}
    private static void amount(Object value,int scale,boolean positive){try{var amount=new BigDecimal(value.toString());if(amount.scale()>scale||amount.signum()<0||(positive&&amount.signum()==0)||amount.compareTo(new BigDecimal("9999999999.99"))>0)throw new ArithmeticException();}catch(Exception e){throw ApiException.bad("Tarifa o límite inválido.");}}
}
