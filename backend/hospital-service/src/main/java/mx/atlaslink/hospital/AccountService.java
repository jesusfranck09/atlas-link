package mx.atlaslink.hospital;

import mx.atlaslink.common.*;
import mx.atlaslink.identity.*;
import java.math.*;
import java.time.*;
import java.util.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class AccountService {
    private final Db db;
    private final RestClient control;
    private final String internalKey;
    private final RulesEngine engine=new RulesEngine();
    private static final String ACCOUNT_COLUMNS="id,folio,patient_reference,insurer,insurer_id,admission_date,discharge_date,total,lane,status,anomaly_count,assigned_to,created_at,version";
    public AccountService(Db db,@Value("${atlas.control-url}") String controlUrl,@Value("${atlas.internal-api-key}") String internalKey) { this.db=db;this.control=RemoteIdentity.client(controlUrl);this.internalKey=internalKey; }

    @Transactional
    public List<Map<String,Object>> list(Actor actor,String status,String lane,String search) {
        return list(actor,status,lane,search,0,200);
    }

    @Transactional
    public List<Map<String,Object>> list(Actor actor,String status,String lane,String search,int offset,int limit) {
        actor.hospital();db.scope(actor);validatePage(offset,limit);
        return listScoped(accountFilter(actor,status,lane,search),offset,limit);
    }

    @Transactional
    public Map<String,Object> page(Actor actor,String status,String lane,String search,int offset,int limit) {
        actor.hospital();db.scope(actor);validatePage(offset,limit);
        var filter=accountFilter(actor,status,lane,search);
        Long count=db.jdbc.queryForObject("select count(*) from hospital.hospital_account"+filter.sql(),Long.class,filter.args().toArray());
        return Map.of("items",listScoped(filter,offset,limit),"total",count,"offset",offset,"limit",limit);
    }

    private List<Map<String,Object>> listScoped(AccountFilter filter,int offset,int limit){
        var args=new ArrayList<Object>(filter.args());args.add(limit);args.add(offset);
        return db.list("select "+ACCOUNT_COLUMNS+" from hospital.hospital_account"+filter.sql()+" order by created_at desc,id desc limit ? offset ?",args.toArray());
    }

    record AccountFilter(String sql,List<Object> args) {}
    static AccountFilter accountFilter(Actor actor,String status,String lane,String search){
        var sql=new StringBuilder(" where tenant_id=?");var args=new ArrayList<Object>();args.add(actor.tenantId());
        if(status!=null&&!status.isBlank()){
            var statuses=Arrays.stream(status.split(",",-1)).map(String::strip).distinct().toList();
            if(!Set.of("RECEIVED","EVALUATED","IN_REVIEW","READY","SENT","RESOLVED").containsAll(statuses))throw ApiException.bad("Estado de cuenta no válido.");
            sql.append(" and status in (").append(String.join(",",Collections.nCopies(statuses.size(),"?"))).append(")");args.addAll(statuses);
        }
        if(lane!=null&&!lane.isBlank()){
            if(!Set.of("GREEN","YELLOW","RED").contains(lane))throw ApiException.bad("Semáforo no válido.");
            sql.append(" and lane=?");args.add(lane);
        }
        if(search!=null&&!search.isBlank()){
            if(search.length()>100)throw ApiException.bad("Búsqueda demasiado larga.");
            sql.append(" and (folio ilike ? or patient_reference ilike ? or insurer ilike ?)");
            String literal="%"+search.replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
            for(int i=0;i<3;i++)args.add(literal);
        }
        return new AccountFilter(sql.toString(),List.copyOf(args));
    }
    static void validatePage(int offset,int limit){if(offset<0||limit<1||limit>200)throw ApiException.bad("Usa offset mayor o igual a cero y limit entre 1 y 200.");}

    @Transactional
    public Map<String,Object> report(Actor actor,String from,String to,UUID insurerId){
        actor.require("HOSPITAL_ADMIN","DIRECTOR");actor.hospital();db.scope(actor);
        var filter=reportFilter(actor,from,to,insurerId);
        var total=db.one("select count(*) as total_accounts,coalesce(sum(total),0) as total_billed,count(*) filter(where lane='GREEN') as green_count,count(*) filter(where status='RESOLVED') as resolved_count,count(*) filter(where lane='YELLOW') as yellow_count,count(*) filter(where lane='RED') as red_count from hospital.hospital_account"+filter.sql(),filter.args().toArray());
        total.put("byLane",Map.of("GREEN",total.get("greenCount"),"YELLOW",total.remove("yellowCount"),"RED",total.remove("redCount")));
        total.put("byInsurer",db.list("select insurer_id,insurer as name,count(*) as count,coalesce(sum(total),0) as total,count(*) filter(where lane='GREEN') as green,count(*) filter(where status in ('EVALUATED','IN_REVIEW') and lane<>'GREEN') as pending from hospital.hospital_account"+filter.sql()+" group by insurer_id,insurer order by count(*) desc,insurer_id",filter.args().toArray()));
        db.audit(actor,"REPORT_VIEWED","ACCOUNT",null,Map.of("totalAccounts",total.get("totalAccounts")));
        return total;
    }

    static AccountFilter reportFilter(Actor actor,String from,String to,UUID insurerId){
        var sql=new StringBuilder(" where tenant_id=?");var args=new ArrayList<Object>();args.add(actor.tenantId());
        try {
            LocalDate first=from==null||from.isBlank()?null:LocalDate.parse(from);
            LocalDate last=to==null||to.isBlank()?null:LocalDate.parse(to);
            if(first!=null&&last!=null&&last.isBefore(first))throw ApiException.bad("La fecha final no puede preceder a la inicial.");
            var zone=ZoneId.of("America/Mexico_City");
            if(first!=null){sql.append(" and created_at>=?");args.add(java.sql.Timestamp.from(first.atStartOfDay(zone).toInstant()));}
            if(last!=null){sql.append(" and created_at<?");args.add(java.sql.Timestamp.from(last.plusDays(1).atStartOfDay(zone).toInstant()));}
        }catch(DateTimeException e){throw ApiException.bad("Usa fechas válidas en formato YYYY-MM-DD.");}
        if(insurerId!=null){sql.append(" and insurer_id=?");args.add(insurerId);}
        return new AccountFilter(sql.toString(),List.copyOf(args));
    }

    @Transactional
    public List<Map<String,Object>> evaluations(Actor actor,UUID id){
        return evaluations(actor,id,0,50);
    }

    @Transactional
    public List<Map<String,Object>> evaluations(Actor actor,UUID id,int offset,int limit){
        if(offset<0||offset>1000000||limit<1||limit>200)throw ApiException.bad("Paginación inválida: offset de 0 a 1000000 y limit de 1 a 200.");
        actor.hospital();db.scope(actor);requireAccount(actor,id);
        var rows=db.list("select id,agreement_id,agreement_version,engine_version,engine_artifact_sha256,lane,created_at,previous_evaluation_id,(input_snapshot is not null) as evidence_available from hospital.evaluation where account_id=? and tenant_id=? order by created_at desc,id desc limit ? offset ?",id,actor.tenantId(),limit,offset);
        db.audit(actor,"EVALUATION_HISTORY_VIEWED","ACCOUNT",id,Map.of());return rows;
    }

    @Transactional
    public Map<String,Object> evaluation(Actor actor,UUID id,UUID evaluationId){
        actor.hospital();db.scope(actor);requireAccount(actor,id);
        var row=db.one("select id,account_id,agreement_id,agreement_version,engine_version,engine_artifact_sha256,billed_total,excluded_total,tariff_adjustment,deductible,coinsurance,insurer_estimate,patient_estimate,unresolved_amount,lane,findings,created_at,previous_evaluation_id,input_snapshot,rules_snapshot,result_snapshot,(input_snapshot is not null) as evidence_available from hospital.evaluation where id=? and account_id=? and tenant_id=?",evaluationId,id,actor.tenantId());
        db.audit(actor,"EVALUATION_VIEWED","EVALUATION",evaluationId,Map.of("accountId",id));return row;
    }

    private void requireAccount(Actor actor,UUID id){db.one("select id from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());}

    @Transactional
    public Map<String,Object> detail(Actor actor,UUID id) { actor.hospital();db.scope(actor);var account=detailScoped(actor,id);db.audit(actor,"ACCOUNT_VIEWED","ACCOUNT",id,Map.of());return account; }

    private Map<String,Object> detailScoped(Actor actor,UUID id) {
        var account=db.one("select "+ACCOUNT_COLUMNS+",policy_number,diagnosis_code as diagnosis,deductible,coinsurance_rate,coinsurance_cap,available_coverage,agreement_id,result,authorized_amount,outcome_reason from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());
        var policy=new LinkedHashMap<String,Object>();policy.put("deductible",account.remove("deductible"));policy.put("coinsuranceRate",account.remove("coinsuranceRate"));policy.put("coinsuranceCap",account.remove("coinsuranceCap"));policy.put("coverageAvailable",account.remove("availableCoverage"));account.put("policy",policy);
        account.put("lines",db.list("select id,code,description,category,quantity,unit_price,total,status,reason,justification,removed,version from hospital.account_line where account_id=? and tenant_id=? order by code,id",id,actor.tenantId()));
        var evaluations=db.list("select id,billed_total,excluded_total,tariff_adjustment,deductible,coinsurance,insurer_estimate,patient_estimate,unresolved_amount,lane,findings,agreement_version,engine_version,created_at from hospital.evaluation where account_id=? and tenant_id=? order by created_at desc,id desc limit 1",id,actor.tenantId());
        account.put("evaluation",evaluations.isEmpty()?null:evaluations.getFirst());
        account.put("history",db.list("select id,action,coalesce(after_value->>'actor',actor_id::text,'Sistema') as actor,created_at,description as detail,before_value,after_value from hospital.account_history where account_id=? and tenant_id=? order by created_at desc,id desc limit 100",id,actor.tenantId()));
        return account;
    }

    @Transactional
    public List<Map<String,Object>> insurers(Actor actor) { actor.hospital();db.scope(actor);return db.list("select id,name,code from hospital.insurer order by name"); }

    @Transactional
    public Map<String,Object> create(Actor actor,AccountInput input,String key) {
        actor.require("HOSPITAL_ADMIN","BILLING","REVIEWER");
        if(key==null||key.isBlank()||key.length()>120)throw ApiException.bad("Incluye Idempotency-Key (máximo120 caracteres).");
        if(input.dischargeDate().isBefore(input.admissionDate()))throw ApiException.bad("El egreso no puede ser anterior al ingreso.");
        if(input.dischargeDate().isAfter(LocalDate.now(ZoneId.of("America/Mexico_City"))))throw ApiException.bad("El egreso no puede ser futuro.");
        BigDecimal gross=input.lines().stream().map(line->RulesEngine.money(line.quantity().multiply(line.unitPrice()))).reduce(BigDecimal.ZERO,BigDecimal::add);
        if(gross.compareTo(new BigDecimal("999999999999.99"))>0)throw ApiException.bad("La cuenta supera el importe máximo admitido.");
        var entitlement=entitlement(actor);db.scope(actor);
        db.jdbc.queryForObject("select pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,actor.tenantId().toString());
        String hash=hash(db.json(input));
        var duplicate=db.list("select id,content_hash from hospital.hospital_account where tenant_id=? and idempotency_key=?",actor.tenantId(),key);
        if(!duplicate.isEmpty()){var prior=duplicate.getFirst();if(!hash.equals(prior.get("contentHash")))throw ApiException.conflict("La llave de idempotencia ya identifica otro contenido.");return detailScoped(actor,Input.uuid(prior.get("id")));}
        var monthly=db.jdbc.queryForObject("select count(*) from hospital.hospital_account where tenant_id=? and created_at>=date_trunc('month',current_timestamp at time zone 'America/Mexico_City') at time zone 'America/Mexico_City'",Long.class,actor.tenantId());
        if(monthly>=((Number)entitlement.get("monthlyAccountLimit")).longValue())throw new ApiException(402,"CAPACITY_REACHED","Se alcanzó la capacidad mensual contratada.");
        var insurer=db.one("select id,name from hospital.insurer where id=?",input.insurerId());
        UUID id=UUID.randomUUID();var policy=input.policy();
        db.jdbc.update("insert into hospital.hospital_account(id,tenant_id,folio,patient_reference,insurer,insurer_id,admission_date,discharge_date,diagnosis_code,policy_number,deductible,coinsurance_rate,coinsurance_cap,available_coverage,status,lane,total,content_hash,idempotency_key) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'RECEIVED','YELLOW',0,?,?)",id,actor.tenantId(),input.folio().strip(),input.patientReference().strip(),insurer.get("name"),input.insurerId(),input.admissionDate(),input.dischargeDate(),input.diagnosis(),input.policyNumber(),policy==null?null:policy.deductible(),policy==null?null:policy.coinsuranceRate(),policy==null?null:policy.coinsuranceCap(),policy==null?null:policy.coverageAvailable(),hash,key);
        for(var line:input.lines()) {
            String code=normalizeCode(line.code());
            db.jdbc.update("insert into hospital.account_line(id,tenant_id,account_id,code,description,category,quantity,unit_price,status) values(?,?,?,?,?,?,?,?,'PENDING')",UUID.randomUUID(),actor.tenantId(),id,code,line.description().strip(),line.category().strip().toUpperCase(Locale.ROOT),line.quantity(),line.unitPrice());
        }
        history(actor,id,"RECEIVED","Cuenta recibida para preauditoría.",Map.of("lineCount",input.lines().size()));
        evaluateScoped(actor,id,0L);
        db.audit(actor,"ACCOUNT_CREATED","ACCOUNT",id,Map.of("lineCount",input.lines().size()));
        return detailScoped(actor,id);
    }

    @Transactional
    public Map<String,Object> evaluate(Actor actor,UUID id,long version) {
        actor.require("HOSPITAL_ADMIN","REVIEWER");entitlement(actor);db.scope(actor);evaluateScoped(actor,id,version);return detailScoped(actor,id);
    }

    private void evaluateScoped(Actor actor,UUID id,long version) {
        var account=db.one("select * from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());
        checkVersion(account,version);String state=account.get("status").toString();
        if(!Set.of("RECEIVED","EVALUATED","IN_REVIEW").contains(state))throw ApiException.conflict("La cuenta ya fue preparada o enviada.");
        checkAssignee(actor,account);
        var agreement=resolveAgreementScoped(actor,account);
        var rows=db.list("select id,code,description,category,quantity,unit_price,removed,justification,service_date,version from hospital.account_line where account_id=? and tenant_id=? order by id",id,actor.tenantId());
        var lines=rows.stream().map(row->new RulesEngine.Charge(Input.uuid(row.get("id")),row.get("code").toString(),money(row.get("quantity")),money(row.get("unitPrice")),Boolean.TRUE.equals(row.get("removed")))).toList();
        var policy=new AccountInput.Policy(nullableMoney(account.get("deductible")),nullableMoney(account.get("coinsuranceRate")),nullableMoney(account.get("coinsuranceCap")),nullableMoney(account.get("availableCoverage")));
        var result=engine.evaluate(lines,agreement==null?null:db.object(agreement.get("rules")),agreement==null?null:((Number)agreement.get("version")).intValue(),policy);
        var snapshot=EvaluationEvidence.capture(db.json,account,rows,agreement,policy,result);
        int changed=db.jdbc.update("update hospital.hospital_account set agreement_id=?,total=?,lane=?,anomaly_count=?,status=?,version=version+1,updated_at=now() where id=? and tenant_id=? and version=?",agreement==null?null:agreement.get("id"),result.billedTotal(),result.lane(),result.findings().size(),state.equals("IN_REVIEW")?state:"EVALUATED",id,actor.tenantId(),version);
        if(changed!=1)throw stale();
        var previous=db.list("select id from hospital.evaluation where account_id=? and tenant_id=? order by created_at desc,id desc limit 1",id,actor.tenantId());
        db.jdbc.update("insert into hospital.evaluation(id,tenant_id,account_id,agreement_id,agreement_version,engine_version,billed_total,excluded_total,tariff_adjustment,deductible,coinsurance,insurer_estimate,patient_estimate,unresolved_amount,lane,findings,created_by,previous_evaluation_id,input_snapshot,rules_snapshot,result_snapshot,engine_artifact_sha256) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb,?,?,?::jsonb,?::jsonb,?::jsonb,?)",UUID.randomUUID(),actor.tenantId(),id,agreement==null?null:agreement.get("id"),result.agreementVersion(),result.engineVersion(),result.billedTotal(),result.excludedTotal(),result.tariffAdjustment(),result.deductible(),result.coinsurance(),result.insurerEstimate(),result.patientEstimate(),result.unresolvedAmount(),result.lane(),db.json(result.findings()),actor.id(),previous.isEmpty()?null:previous.getFirst().get("id"),snapshot.inputSnapshot(),snapshot.rulesSnapshot(),snapshot.resultSnapshot(),snapshot.engineArtifactSha256());
        for(var line:lines) {
            var findings=result.findings().stream().filter(f->line.id().equals(f.lineId())).toList();
            String lineStatus=line.removed()?"REMOVED":findings.isEmpty()?"ACCEPTED":"FLAGGED";
            String reason=findings.isEmpty()?null:findings.stream().map(RulesEngine.Finding::message).reduce((a,b)->a+" "+b).orElse(null);
            db.jdbc.update("update hospital.account_line set status=?,reason=? where id=? and tenant_id=?",lineStatus,reason,line.id(),actor.tenantId());
        }
        history(actor,id,"EVALUATED","Motor "+RulesEngine.VERSION+" · "+result.lane()+" · "+result.findings().size()+" hallazgos.",Map.of("lane",result.lane(),"engineVersion",RulesEngine.VERSION));
        db.audit(actor,"ACCOUNT_EVALUATED","ACCOUNT",id,Map.of("lane",result.lane(),"findings",result.findings().size()));
    }

    Map<String,Object> resolveAgreementScoped(Actor actor,Map<String,Object> account){
        List<Map<String,Object>> agreements;
        // An already selected published version remains the source of truth after corrections.
        if(account.get("agreementId")!=null)agreements=db.list("select * from hospital.agreement where id=? and tenant_id=?",account.get("agreementId"),actor.tenantId());
        else agreements=db.list("select * from hospital.agreement where tenant_id=? and insurer_id=? and status='PUBLISHED' and valid_from<=?::date and valid_to>=?::date order by version desc limit 1",actor.tenantId(),account.get("insurerId"),account.get("admissionDate"),account.get("admissionDate"));
        return agreements.isEmpty()?null:agreements.getFirst();
    }

    @Transactional
    public Map<String,Object> claim(Actor actor,UUID id,long version) {
        actor.require("HOSPITAL_ADMIN","REVIEWER");entitlement(actor);db.scope(actor);
        var account=db.one("select * from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());checkVersion(account,version);
        if(!Set.of("EVALUATED","IN_REVIEW").contains(account.get("status")))throw ApiException.conflict("La cuenta no está disponible para revisión.");
        if(account.get("assignedTo")!=null&&!account.get("assignedTo").equals(actor.id()))throw ApiException.conflict("Otra persona ya tomó esta cuenta.");
        updateState(actor,id,version,"IN_REVIEW",actor.id());history(actor,id,"CLAIMED","Cuenta asignada para revisión.",Map.of());db.audit(actor,"ACCOUNT_CLAIMED","ACCOUNT",id,Map.of());return detailScoped(actor,id);
    }

    @Transactional
    public Map<String,Object> correct(Actor actor,UUID id,UUID lineId,Map<String,Object> input) {
        actor.require("HOSPITAL_ADMIN","REVIEWER");entitlement(actor);db.scope(actor);
        long version=Input.version(input);var justification=Input.text(input,"justification",1000);
        var account=db.one("select * from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());checkVersion(account,version);checkAssignee(actor,account);
        if(!"IN_REVIEW".equals(account.get("status")))throw ApiException.conflict("Toma la cuenta antes de corregirla.");
        var before=db.one("select id as line_id,quantity,unit_price,removed from hospital.account_line where id=? and account_id=? and tenant_id=?",lineId,id,actor.tenantId());
        var quantity=input.containsKey("quantity")?Input.decimal(input,"quantity",true):money(before.get("quantity"));
        var price=input.containsKey("unitPrice")?Input.decimal(input,"unitPrice",true):money(before.get("unitPrice"));
        if(quantity.signum()<=0||quantity.scale()>3||quantity.compareTo(new BigDecimal("99999999"))>0||price.scale()>2||price.compareTo(new BigDecimal("9999999999.99"))>0)throw ApiException.bad("Cantidad o precio fuera del rango permitido.");
        boolean removed=Input.bool(input,"removed",Boolean.TRUE.equals(before.get("removed")));
        int changed=db.jdbc.update("update hospital.hospital_account set version=version+1,updated_at=now() where id=? and tenant_id=? and version=?",id,actor.tenantId(),version);if(changed!=1)throw stale();
        // The successful version update holds the account row lock. All writers must
        // acquire it before modifying lines, so this aggregate cannot race a correction.
        BigDecimal remaining=db.jdbc.queryForObject("select coalesce(sum(total),0) from hospital.account_line where account_id=? and tenant_id=? and id<>? and not removed",BigDecimal.class,id,actor.tenantId(),lineId);
        validateCorrectedTotal(remaining,quantity,price,removed);
        db.jdbc.update("update hospital.account_line set quantity=?,unit_price=?,justification=?,removed=?,status='PENDING',version=version+1 where id=? and account_id=? and tenant_id=?",quantity,price,justification,removed,lineId,id,actor.tenantId());
        var after=Map.of("lineId",lineId,"quantity",quantity,"unitPrice",price,"removed",removed,"actor",actor.name());
        db.jdbc.update("insert into hospital.account_history(id,tenant_id,account_id,actor_id,action,description,before_value,after_value) values(?,?,?,?,'LINE_CORRECTED',?,?::jsonb,?::jsonb)",UUID.randomUUID(),actor.tenantId(),id,actor.id(),justification,db.json(before),db.json(after));
        db.audit(actor,"LINE_CORRECTED","ACCOUNT_LINE",lineId,Map.of("accountId",id.toString()));return detailScoped(actor,id);
    }

    @Transactional
    public Map<String,Object> ready(Actor actor,UUID id,Map<String,Object> input) {
        actor.require("HOSPITAL_ADMIN","REVIEWER");entitlement(actor);db.scope(actor);
        long version=Input.version(input);var account=db.one("select * from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());checkVersion(account,version);checkAssignee(actor,account);
        if(!Set.of("EVALUATED","IN_REVIEW").contains(account.get("status")))throw ApiException.conflict("La cuenta no puede prepararse desde su estado actual.");
        if(db.jdbc.queryForObject("select count(*) from hospital.account_line where account_id=? and tenant_id=? and status='PENDING'",Long.class,id,actor.tenantId())>0)throw ApiException.conflict("Reevalúa las correcciones antes de preparar la cuenta.");
        boolean risk=!"GREEN".equals(account.get("lane"));
        String reason="Revisión completada; cuenta lista para exportación.";
        if(risk){if(!Boolean.TRUE.equals(input.get("acceptRisk")))throw ApiException.conflict("La cuenta conserva alertas; requiere aceptación explícita de riesgo.");reason=Input.text(input,"reason",1000);}
        updateState(actor,id,version,"READY",account.get("assignedTo"));history(actor,id,"READY",reason,Map.of("riskAccepted",risk));db.audit(actor,"ACCOUNT_READY","ACCOUNT",id,Map.of("riskAccepted",risk));return detailScoped(actor,id);
    }

    @Transactional
    public Map<String,Object> send(Actor actor,UUID id,long version) {
        actor.require("HOSPITAL_ADMIN","BILLING");entitlement(actor);db.scope(actor);var account=db.one("select * from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());checkVersion(account,version);
        if(!"READY".equals(account.get("status")))throw ApiException.conflict("Solo una cuenta preparada puede marcarse enviada.");
        updateState(actor,id,version,"SENT",account.get("assignedTo"));history(actor,id,"SENT","Envío externo registrado por el hospital; Atlas Link no envía a la aseguradora.",Map.of());db.audit(actor,"ACCOUNT_SENT","ACCOUNT",id,Map.of());return detailScoped(actor,id);
    }

    @Transactional
    public Map<String,Object> outcome(Actor actor,UUID id,Map<String,Object> input) {
        actor.require("HOSPITAL_ADMIN","BILLING");entitlement(actor);db.scope(actor);long version=Input.version(input);
        var result=Input.text(input,"result",20);if(!Set.of("APPROVED","ADJUSTED","REJECTED").contains(result))throw ApiException.bad("Resultado no válido.");
        var amount=Input.decimal(input,"authorizedAmount",true);if(amount.scale()>2)throw ApiException.bad("El importe admite dos decimales.");
        var account=db.one("select * from hospital.hospital_account where id=? and tenant_id=?",id,actor.tenantId());checkVersion(account,version);
        if(!"SENT".equals(account.get("status")))throw ApiException.conflict("Registra el envío antes de capturar la respuesta.");
        if(amount.compareTo(money(account.get("total")))>0)throw ApiException.bad("El monto autorizado supera el facturado.");
        if(result.equals("REJECTED")&&amount.signum()!=0)throw ApiException.bad("Una cuenta rechazada debe registrar monto cero.");
        var reason=result.equals("APPROVED")?Input.optional(input,"reason",1000):Input.text(input,"reason",1000);
        int changed=db.jdbc.update("update hospital.hospital_account set status='RESOLVED',result=?,authorized_amount=?,outcome_reason=?,outcome_at=now(),version=version+1,updated_at=now() where id=? and tenant_id=? and version=?",result,amount,reason,id,actor.tenantId(),version);if(changed!=1)throw stale();
        history(actor,id,"RESOLVED","Respuesta de aseguradora registrada: "+result+".",Map.of("result",result));db.audit(actor,"ACCOUNT_OUTCOME","ACCOUNT",id,Map.of("result",result));return detailScoped(actor,id);
    }

    @Transactional
    public Map<String,Object> exportData(Actor actor,UUID id) {
        actor.require("HOSPITAL_ADMIN","BILLING","REVIEWER");db.scope(actor);var account=detailScoped(actor,id);
        if(!Set.of("READY","SENT","RESOLVED").contains(account.get("status")))throw ApiException.conflict("Prepara la cuenta antes de exportar.");
        db.audit(actor,"ACCOUNT_EXPORTED","ACCOUNT",id,Map.of());return account;
    }

    @Transactional
    public Map<String,Object> dashboard(Actor actor) {
        db.scope(actor);
        if(actor.platform()) {
            var summary=remoteControl("/internal/platform-summary");
            var response=new LinkedHashMap<String,Object>(summary);response.putAll(Map.of("totalAccounts",0,"pendingReview",0,"readyToSend",0,"totalBilled",0,"insurerEstimate",0,"patientEstimate",0,"unresolvedAmount",0,"byLane",Map.of("GREEN",0,"YELLOW",0,"RED",0),"recentAccounts",List.of()));response.put("monthly",List.of());response.put("activity",List.of());return response;
        }
        actor.hospital();
        var summary=db.one("select count(*) as total_accounts,count(*) filter(where status in ('EVALUATED','IN_REVIEW') and lane<>'GREEN') as pending_review,count(*) filter(where status='READY') as ready_to_send,coalesce(sum(total),0) as total_billed from hospital.hospital_account where tenant_id=?",actor.tenantId());
        var estimates=db.one("select coalesce(sum(insurer_estimate),0) as insurer_estimate,coalesce(sum(patient_estimate),0) as patient_estimate,coalesce(sum(unresolved_amount),0) as unresolved_amount from (select distinct on(account_id) insurer_estimate,patient_estimate,unresolved_amount from hospital.evaluation where tenant_id=? order by account_id,created_at desc) e",actor.tenantId());summary.putAll(estimates);
        var lanes=new LinkedHashMap<String,Object>();for(var lane:List.of("GREEN","YELLOW","RED"))lanes.put(lane,0);
        for(var row:db.list("select lane,count(*) as count from hospital.hospital_account where tenant_id=? group by lane",actor.tenantId()))lanes.put(row.get("lane").toString(),row.get("count"));summary.put("byLane",lanes);
        summary.put("recentAccounts",db.list("select "+ACCOUNT_COLUMNS+" from hospital.hospital_account where tenant_id=? order by created_at desc limit 6",actor.tenantId()));
        summary.put("monthly",db.list("select to_char(date_trunc('month',created_at),'YYYY-MM') as label,sum(total) as total,count(*) as count from hospital.hospital_account where tenant_id=? group by date_trunc('month',created_at) order by date_trunc('month',created_at) desc limit 6",actor.tenantId()));
        summary.put("activity",db.list("select id,action,coalesce(after_value->>'actor','Equipo hospitalario') as actor,created_at,description as detail from hospital.account_history where tenant_id=? order by created_at desc limit 6",actor.tenantId()));return summary;
    }

    @Transactional
    public List<Map<String,Object>> audit(Actor actor) {actor.require("HOSPITAL_ADMIN","DIRECTOR","PLATFORM_ADMIN");db.scope(actor);return db.list("select id,action,actor_id as actor,created_at,entity_type as detail,entity_id,details from hospital.audit_event where tenant_id is not distinct from ? order by created_at desc limit 200",actor.tenantId());}

    public void requireActiveLicense(Actor actor) { entitlement(actor); }
    private Map<String,Object> entitlement(Actor actor) {actor.hospital();var result=remoteControl("/internal/entitlement");if(!actor.tenantId().toString().equals(result.get("tenantId").toString()))throw ApiException.forbidden();return result;}
    private Map<String,Object> remoteControl(String path) {try { Object response=control.get().uri(path).header("Authorization",RemoteIdentity.authorization()).header("X-Internal-Key",internalKey).retrieve().body(Object.class);return db.object(response);}catch(RestClientResponseException e){if(e.getStatusCode().value()==402||e.getStatusCode().value()==403)throw new ApiException(402,"LICENSE_UNAVAILABLE","La licencia no permite esta operación. Contacta al administrador.");throw new ApiException(503,"CONTROL_UNAVAILABLE","No se pudo verificar la licencia. Intenta nuevamente.");}catch(ApiException e){throw e;}catch(Exception e){throw new ApiException(503,"CONTROL_UNAVAILABLE","No se pudo verificar la licencia. Intenta nuevamente.");}}
    private void updateState(Actor actor,UUID id,long version,String state,Object assignedTo) {if(db.jdbc.update("update hospital.hospital_account set status=?,assigned_to=?,version=version+1,updated_at=now() where id=? and tenant_id=? and version=?",state,assignedTo,id,actor.tenantId(),version)!=1)throw stale();}
    private void history(Actor actor,UUID id,String action,String detail,Map<String,?> values) {var after=new LinkedHashMap<String,Object>(values);after.put("actor",actor.name());db.jdbc.update("insert into hospital.account_history(id,tenant_id,account_id,actor_id,action,description,after_value) values(?,?,?,?,?,?,?::jsonb)",UUID.randomUUID(),actor.tenantId(),id,actor.id(),action,detail,db.json(after));}
    private static void checkVersion(Map<String,Object> account,long version) {if(((Number)account.get("version")).longValue()!=version)throw stale();}
    private static void checkAssignee(Actor actor,Map<String,Object> account) {if(account.get("assignedTo")!=null&&!account.get("assignedTo").equals(actor.id())&&!actor.role().equals("HOSPITAL_ADMIN"))throw ApiException.conflict("La cuenta está asignada a otra persona.");}
    private static ApiException stale(){return ApiException.conflict("La cuenta cambió. Actualiza la pantalla antes de continuar.");}
    private static BigDecimal money(Object value){return new BigDecimal(value.toString());}
    private static BigDecimal nullableMoney(Object value){return value==null?null:money(value);}
    static void validateCorrectedTotal(BigDecimal remaining,BigDecimal quantity,BigDecimal price,boolean removed){
        BigDecimal lineTotal=RulesEngine.money(quantity.multiply(price));
        BigDecimal maximum=new BigDecimal("999999999999.99");
        if(lineTotal.compareTo(maximum)>0||remaining.add(removed?BigDecimal.ZERO:lineTotal).compareTo(maximum)>0)throw ApiException.bad("La corrección supera el importe máximo admitido para la cuenta.");
    }
    private static String normalizeCode(String code){String clean=code.replaceAll("\\s","").toUpperCase(Locale.ROOT);if(!clean.matches("[A-Z0-9_.-]{1,40}"))throw ApiException.bad("Código de cargo no válido.");return clean;}
    private static String hash(String content){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
