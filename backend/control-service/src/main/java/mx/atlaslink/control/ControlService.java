package mx.atlaslink.control;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import mx.atlaslink.common.*;
import mx.atlaslink.identity.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class ControlService {
    private final Db db;
    private final byte[] internalKey;
    private final RestClient identity;
    private final Map<String,Long> leadAttempts=new LinkedHashMap<>();
    private final Map<String,IpAttempts> leadIpAttempts=new LinkedHashMap<>();
    private record IpAttempts(int count,long expiresAt) {}
    private static final String LICENSE_SELECT="select l.id,l.tenant_id,t.name tenant_name,l.plan,case when t.status='SUSPENDED' then 'SUSPENDED' when l.expires_at<=now() then 'EXPIRED' else l.status end status,l.monthly_account_limit,l.seat_limit,l.starts_at,l.expires_at,null::bigint used_accounts,l.version from control.license l join control.tenant t on t.id=l.tenant_id";
    public ControlService(Db db,@Value("${atlas.internal-key}") String key,@Value("${atlas.identity-url}") String identityUrl) {
        if(key.length()<32)throw new IllegalStateException("INTERNAL_API_KEY debe contener al menos 32 caracteres.");
        this.db=db;this.internalKey=key.getBytes(StandardCharsets.UTF_8);this.identity=RemoteIdentity.client(identityUrl);
    }
    void internal(String key) {
        if(key==null||!MessageDigest.isEqual(internalKey,key.getBytes(StandardCharsets.UTF_8)))throw ApiException.forbidden();
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> tenants(Actor actor) {
        actor.require("PLATFORM_ADMIN");db.scope(actor);
        return db.list("select id,name,slug,status,is_demo,created_at,null::bigint account_count,null::bigint user_count from control.tenant order by created_at desc limit 200");
    }
    @Transactional
    public Map<String,Object> createTenant(Actor actor,String name,String slug) {
        actor.require("PLATFORM_ADMIN");db.scope(actor);
        UUID id=UUID.randomUUID();
        db.jdbc.update("insert into control.tenant(id,name,slug) values(?,?,?)",id,name.strip(),slug);
        db.jdbc.update("insert into control.license(tenant_id,plan,status,seat_limit,monthly_account_limit) values(?,'Exploración','TRIAL',10,1000)",id);
        return db.one("select id,name,slug,status,is_demo,created_at,null::bigint account_count,null::bigint user_count from control.tenant where id=?",id);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> tenant(Actor actor,UUID id) {
        actor.require("PLATFORM_ADMIN");db.scope(actor);
        return db.one("select t.id,t.name,t.status,t.is_demo,l.seat_limit from control.tenant t join control.license l on l.tenant_id=t.id where t.id=?",id);
    }
    public Object provision(Actor actor,UUID tenantId,ControlController.Administrator admin) {
        actor.require("PLATFORM_ADMIN");
        try {
            return identity.post().uri("/internal/tenant-admin").header("Authorization",RemoteIdentity.authorization())
                .header("X-Internal-Key",new String(internalKey,StandardCharsets.UTF_8))
                .body(Map.of("tenantId",tenantId,"name",admin.name(),"email",admin.email(),"password",admin.password()))
                .retrieve().body(Map.class);
        }catch(RestClientException e){throw new ApiException(409,"ADMIN_PROVISIONING_PENDING","El hospital está registrado. Reintenta el alta de su administrador; comprueba que el correo no pertenezca a otra cuenta.");}
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> licenses(Actor actor){actor.require("PLATFORM_ADMIN");db.scope(actor);return db.list(LICENSE_SELECT+" order by t.name limit 200");}
    @Transactional
    public Map<String,Object> updateLicense(Actor actor,UUID id,ControlController.LicenseChange patch) {
        actor.require("PLATFORM_ADMIN");db.scope(actor);
        Map<String,Object> old=db.one("select starts_at,expires_at,version from control.license where id=? for update",id);
        if(((Number)old.get("version")).longValue()!=patch.version()) throw ApiException.conflict("La licencia cambió. Recarga antes de guardar.");
        Instant expires=patch.expiresAt().toInstant();
        if(!expires.isAfter(Instant.parse(old.get("startsAt").toString())))throw ApiException.bad("El vencimiento debe ser posterior al inicio.");
        if(Set.of("ACTIVE","TRIAL").contains(patch.status())&&!expires.isAfter(Instant.now()))throw ApiException.bad("Una licencia activa debe vencer en el futuro.");
        db.jdbc.update("update control.license set plan=?,status=?,monthly_account_limit=?,seat_limit=?,expires_at=?,version=version+1 where id=?",
            patch.plan().strip(),patch.status(),patch.monthlyAccountLimit(),patch.seatLimit(),Timestamp.from(expires),id);
        return db.one(LICENSE_SELECT+" where l.id=?",id);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> entitlement(Actor actor) {
        actor.hospital();db.scope(actor);
        var rows=db.list("select l.tenant_id,l.status,l.monthly_account_limit,l.seat_limit,l.expires_at,t.status tenant_status,t.is_demo from control.license l join control.tenant t on t.id=l.tenant_id where l.tenant_id=?",actor.tenantId());
        if(rows.isEmpty())throw new ApiException(402,"LICENSE_REQUIRED","El hospital necesita una licencia vigente.");
        var license=rows.getFirst();
        boolean active=Set.of("ACTIVE","TRIAL").contains(license.get("status"))&&"ACTIVE".equals(license.get("tenantStatus"))
            &&Instant.parse(license.get("expiresAt").toString()).isAfter(Instant.now());
        if(!active)throw new ApiException(402,"LICENSE_INACTIVE","La licencia no permite modificaciones. La consulta y exportación siguen disponibles.");
        license.remove("tenantStatus");return license;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> summary(Actor actor) {
        actor.require("PLATFORM_ADMIN");db.scope(actor);
        Map<String,Object> result=db.one("select (select count(*) from control.tenant where status='ACTIVE') active_tenants,(select count(*) from control.license l join control.tenant t on t.id=l.tenant_id where l.status in ('ACTIVE','TRIAL') and l.expires_at>now() and t.status='ACTIVE') active_licenses,(select coalesce(sum(l.monthly_account_limit),0) from control.license l join control.tenant t on t.id=l.tenant_id where l.status in ('ACTIVE','TRIAL') and l.expires_at>now() and t.status='ACTIVE') monthly_capacity,(select count(*) from control.lead) leads_count");
        result.put("tenants",db.list("select id,name,slug,status,created_at from control.tenant order by created_at desc limit 200"));return result;
    }
    private synchronized void throttleLead(String email,String ip) {
        long now=System.currentTimeMillis();leadAttempts.entrySet().removeIf(e->e.getValue()<now);
        leadIpAttempts.entrySet().removeIf(e->e.getValue().expiresAt()<now);
        IpAttempts old=leadIpAttempts.get(ip);
        if(old!=null&&old.count()>=30)throw new ApiException(429,"RATE_LIMITED","Demasiadas solicitudes. Intenta nuevamente en diez minutos.");
        if(leadIpAttempts.size()>=10000&&!leadIpAttempts.containsKey(ip))throw new ApiException(429,"RATE_LIMITED","Intenta nuevamente más tarde.");
        if(leadAttempts.containsKey("email:"+email))throw new ApiException(429,"RATE_LIMITED","Ya recibimos una solicitud de este correo. Intenta más tarde.");
        if(leadAttempts.size()>=10000)throw new ApiException(429,"RATE_LIMITED","Intenta nuevamente más tarde.");
        leadAttempts.put("email:"+email,now+60000);
        leadIpAttempts.put(ip,new IpAttempts(old==null?1:old.count()+1,old==null?now+600000:old.expiresAt()));
    }
    @Transactional
    public Map<String,Object> lead(ControlController.Lead input,String ip) {
        String email=input.email().strip().toLowerCase(Locale.ROOT);throttleLead(email,ip);
        UUID id=UUID.randomUUID();
        db.jdbc.update("insert into control.lead(id,name,email,organization,message,consent) values(?,?,?,?,?,true)",id,input.name().strip(),email,input.organization().strip(),input.message().strip());
        return Map.of("id",id,"status","RECEIVED","message","Recibimos tu solicitud. Quedó registrada para seguimiento comercial.");
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> leads(Actor actor){actor.require("PLATFORM_ADMIN");db.scope(actor);return db.list("select id,name,email,organization,message,consent,created_at from control.lead order by created_at desc limit 200");}
}
