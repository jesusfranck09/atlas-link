package mx.atlaslink.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import mx.atlaslink.common.*;
import mx.atlaslink.identity.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class IdentityService implements TokenVerifier {
    static final String DEMO_PASSWORD="AtlasDemo2026!";
    private final Db db;
    private final boolean demo;
    private final String internalKey;
    private final RestClient control;
    private final TransactionTemplate transactions;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    private final SecureRandom random=new SecureRandom();
    private final String dummyHash=passwords.encode(UUID.randomUUID().toString());
    private final Map<String,Attempt> attempts=new LinkedHashMap<>();
    private record Attempt(int count,Instant resetAt) {}

    public IdentityService(Db db,@Value("${atlas.demo-enabled:false}") boolean demo,Environment environment,
                           @Value("${atlas.control-url}") String controlUrl,@Value("${atlas.internal-key}") String internalKey,TransactionTemplate transactions,
                           @Value("${atlas.auth-mode:demo}") String authMode) {
        this.db=db;this.demo=demo;this.control=RemoteIdentity.client(controlUrl);this.internalKey=internalKey;this.transactions=transactions;
        boolean demoProfile=Arrays.asList(environment.getActiveProfiles()).contains("demo");
        if("demo".equals(authMode)) {
            if(!demo||!demoProfile)throw new IllegalStateException("El modo demo requiere ATLAS_DEMO_ENABLED=true y perfil demo. Para identidad propia configura ATLAS_AUTH_MODE=local sin datos demo.");
        } else if("local".equals(authMode)) {
            if(demo||demoProfile)throw new IllegalStateException("ATLAS_AUTH_MODE=local requiere ATLAS_DEMO_ENABLED=false y no permite el perfil demo.");
        } else throw new IllegalStateException("ATLAS_AUTH_MODE debe ser demo o local. OIDC no está implementado.");
        if(internalKey.length()<32) throw new IllegalStateException("INTERNAL_API_KEY debe contener al menos 32 caracteres.");
    }

    static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private synchronized void throttle(String key,int maximum) {
        Instant now=Instant.now();
        attempts.entrySet().removeIf(e->!e.getValue().resetAt().isAfter(now));
        Attempt old=attempts.get(key);
        if(old!=null&&old.count()>=maximum) throw new ApiException(429,"RATE_LIMITED","Demasiados intentos. Espera un minuto.");
        if(attempts.size()>=10000&&!attempts.containsKey(key)) throw new ApiException(429,"RATE_LIMITED","Intenta nuevamente en un minuto.");
        attempts.put(key,new Attempt(old==null?1:old.count()+1,old==null?now.plusSeconds(60):old.resetAt()));
    }

    @Transactional
    public Map<String,Object> login(String email,String password,String ip) {
        email=email.strip().toLowerCase(Locale.ROOT);
        throttle("ip:"+ip,120); throttle("email:"+email,10);
        if(password.getBytes(StandardCharsets.UTF_8).length>72)throw new ApiException(401,"INVALID_CREDENTIALS","Correo o contraseña incorrectos.");
        List<Map<String,Object>> users=db.list("select id,tenant_id,name,email,role,password_hash from identity.find_login_user(?)",email);
        boolean allowed=!users.isEmpty()&&allowedIdentity(users.getFirst());
        String expected=allowed?users.getFirst().get("passwordHash").toString():dummyHash;
        if(!passwords.matches(password,expected)||!allowed) throw new ApiException(401,"INVALID_CREDENTIALS","Correo o contraseña incorrectos.");
        Actor actor=actor(users.getFirst()); db.scope(actor);
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires=Instant.now().plus(Duration.ofHours(8));
        db.jdbc.update("delete from identity.auth_session where user_id=? and expires_at<=now()",actor.id());
        db.jdbc.update("insert into identity.auth_session(token_hash,user_id,expires_at) values(?,?,?)",hash(token),actor.id(),Timestamp.from(expires));
        return Map.of("token",token,"expiresAt",expires.toString(),"user",actor);
    }

    @Override @Transactional(readOnly=true)
    public Actor verify(String token) {
        if(token==null||!token.matches("[A-Za-z0-9_-]{43}")) return null;
        List<Map<String,Object>> users=db.list("select id,tenant_id,name,email,role from identity.find_session_user(?)",hash(token));
        return users.isEmpty()||!allowedIdentity(users.getFirst())?null:actor(users.getFirst());
    }

    private boolean allowedIdentity(Map<String,Object> user) {
        return demo||(!reservedEmail(Objects.toString(user.get("email"),""))
            &&!"INSURER_DEMO".equals(user.get("role"))
            &&!syntheticTenant(user.get("tenantId"))
            &&!Objects.toString(user.get("id"),"").matches("a0000000-0000-0000-0000-00000000000[1-8]"));
    }
    private static boolean reservedEmail(String email){return email.strip().toLowerCase(Locale.ROOT).endsWith("@demo.atlaslink.mx");}
    private static boolean syntheticTenant(Object tenant){return Set.of("11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222").contains(Objects.toString(tenant,""));}
    private void validateNewIdentity(String email,String role,UUID tenantId){
        if(!demo&&(reservedEmail(email)||"INSURER_DEMO".equals(role)||syntheticTenant(tenantId)))throw ApiException.bad("Esta identidad está reservada para demostración; utiliza una cuenta y hospital propios.");
    }

    private Actor actor(Map<String,Object> user) {
        Object tenant=user.get("tenantId");
        String name=tenant==null?"Atlas Link":tenant.toString().equals("11111111-1111-1111-1111-111111111111")?"Hospital Aurora · DEMO":
            tenant.toString().equals("22222222-2222-2222-2222-222222222222")?"Clínica Horizonte · DEMO":"Hospital";
        user.put("tenantName",name);return Actor.from(user);
    }

    public List<Map<String,Object>> demoProfiles() {
        if(!demo) throw ApiException.missing();
        String[][] profiles={{"atlas","Marina Solís","PLATFORM_ADMIN"},{"admin","Ana Beltrán","HOSPITAL_ADMIN"},
            {"caja","Camila Vega","BILLING"},{"auditor","Diego Navarro","REVIEWER"},{"direccion","Elena Robles","DIRECTOR"},
            {"aseguradora","Santiago Cruz","INSURER_DEMO"},{"baja","Cuenta desactivada","BILLING"}};
        List<Map<String,Object>> result=new ArrayList<>();
        for(String[] p:profiles) result.add(Map.of("email",p[0]+"@demo.atlaslink.mx","name",p[1],"role",p[2],
            "tenantName",p[0].equals("atlas")?"Atlas Link":"Hospital Aurora · DEMO","password",DEMO_PASSWORD,"active",!p[0].equals("baja")));
        return result;
    }

    @Transactional
    public void logout(Actor actor,String token) {
        db.scope(actor);db.jdbc.update("delete from identity.auth_session where token_hash=? and user_id=?",hash(token),actor.id());
    }

    @Transactional(readOnly=true)
    public List<Map<String,Object>> users(Actor actor) {
        actor.require("HOSPITAL_ADMIN","PLATFORM_ADMIN"); db.scope(actor);
        return db.list("select id,name,email,role,active,created_at from identity.app_user order by created_at desc limit 200");
    }

    private Map<?,?> entitlement() {
        try {
            Map<?,?> value=control.get().uri("/internal/entitlement").header("Authorization",RemoteIdentity.authorization())
                .header("X-Internal-Key",internalKey).retrieve().body(Map.class);
            if(value==null) throw new IllegalStateException("Missing entitlement");
            return value;
        } catch(RestClientException e) {throw new ApiException(403,"LICENSE_UNAVAILABLE","No se pudo validar una licencia vigente para gestionar usuarios.");}
    }

    private void validateRole(Actor actor,String role,Map<?,?> entitlement) {
        if(actor.platform()) {if(!role.equals("PLATFORM_ADMIN"))throw ApiException.forbidden();return;}
        if(!Set.of("HOSPITAL_ADMIN","BILLING","REVIEWER","DIRECTOR","INSURER_DEMO").contains(role))throw ApiException.forbidden();
        if(role.equals("INSURER_DEMO")&&(!demo||!Boolean.TRUE.equals(entitlement.get("isDemo")))) throw ApiException.forbidden();
    }

    private void lockUsers(Actor actor) {
        db.jdbc.queryForObject("select pg_advisory_xact_lock(hashtextextended(?,0))",Object.class,"identity-users:"+Objects.toString(actor.tenantId(),"platform"));
    }

    public Map<String,Object> createUser(Actor actor,String name,String email,String role,String password) {
        actor.require("HOSPITAL_ADMIN","PLATFORM_ADMIN");
        validateNewIdentity(email,role,actor.tenantId());
        validatePassword(password);
        Map<?,?> license=actor.platform()?Map.of():entitlement();validateRole(actor,role,license);
        String passwordHash=passwords.encode(password);
        return transactions.execute(status->{
        db.scope(actor);lockUsers(actor);
        if(!actor.platform()) checkSeats(license);
        UUID id=UUID.randomUUID();
        db.jdbc.update("insert into identity.app_user(id,tenant_id,name,email,role,password_hash) values(?,?,?,?,?,?)",
            id,actor.tenantId(),name.strip(),email.strip().toLowerCase(Locale.ROOT),role,passwordHash);
        return db.one("select id,name,email,role,active,created_at from identity.app_user where id=?",id);
        });
    }

    private void validatePassword(String password) {
        if(password.getBytes(StandardCharsets.UTF_8).length>72)throw ApiException.bad("La contraseña supera el límite de 72 bytes UTF-8.");
    }

    public Map<String,Object> bootstrap(Actor actor,String key,UUID tenantId,String name,String email,String password) {
        actor.require("PLATFORM_ADMIN");
        if(key==null||!MessageDigest.isEqual(internalKey.getBytes(StandardCharsets.UTF_8),key.getBytes(StandardCharsets.UTF_8)))throw ApiException.forbidden();
        validateNewIdentity(email,"HOSPITAL_ADMIN",tenantId);
        validatePassword(password);
        Map<?,?> tenant;
        try {
            tenant=control.get().uri("/internal/tenants/{id}",tenantId).header("Authorization",RemoteIdentity.authorization())
                .header("X-Internal-Key",internalKey).retrieve().body(Map.class);
        }catch(RestClientException e){throw new ApiException(409,"TENANT_UNAVAILABLE","No se pudo validar el hospital para crear su administrador.");}
        if(tenant==null||!"ACTIVE".equals(tenant.get("status")))throw ApiException.forbidden();
        Actor scoped=new Actor(actor.id(),tenantId,actor.name(),actor.email(),"HOSPITAL_ADMIN",tenant.get("name").toString());
        String normalizedEmail=email.strip().toLowerCase(Locale.ROOT),passwordHash=passwords.encode(password);
        return transactions.execute(status->{
        db.scope(scoped);lockUsers(scoped);
        var existing=db.list("select id,name,email,role,active,created_at from identity.app_user where tenant_id=? and role='HOSPITAL_ADMIN' order by created_at limit 1",tenantId);
        if(!existing.isEmpty()) {
            if(normalizedEmail.equals(existing.getFirst().get("email"))&&Boolean.TRUE.equals(existing.getFirst().get("active")))return existing.getFirst();
            throw ApiException.conflict("El hospital ya tiene un administrador. Gestiona los usuarios desde su portal.");
        }
        UUID id=UUID.randomUUID();
        db.jdbc.update("insert into identity.app_user(id,tenant_id,name,email,role,password_hash) values(?,?,?,?,'HOSPITAL_ADMIN',?)",id,tenantId,name.strip(),normalizedEmail,passwordHash);
        return db.one("select id,name,email,role,active,created_at from identity.app_user where id=?",id);
        });
    }

    private void checkSeats(Map<?,?> license) {
        int limit=((Number)license.get("seatLimit")).intValue();
        Long count=db.jdbc.queryForObject("select count(*) from identity.app_user where active",Long.class);
        if(count!=null&&count>=limit) throw new ApiException(402,"SEAT_LIMIT","La licencia alcanzó su límite de usuarios activos.");
    }

    public Map<String,Object> updateUser(Actor actor,UUID id,Boolean active,String role) {
        actor.require("HOSPITAL_ADMIN","PLATFORM_ADMIN");
        if(active==null&&role==null)throw ApiException.bad("Indica el rol o estado que deseas actualizar.");
        Map<?,?> license=actor.platform()?Map.of():entitlement();
        if(role!=null)validateRole(actor,role,license);
        return transactions.execute(status->{
        db.scope(actor);lockUsers(actor);
        var existing=db.one("select id,name,email,role,active,created_at from identity.app_user where id=? for update",id);
        String nextRole=role==null?existing.get("role").toString():role;
        boolean nextActive=active==null?(Boolean)existing.get("active"):active;
        if(nextActive){var proposed=new HashMap<>(existing);proposed.put("role",nextRole);proposed.put("tenantId",actor.tenantId());if(!allowedIdentity(proposed))throw ApiException.bad("Las identidades de demostración no pueden activarse en modo local.");}
        if(actor.id().equals(id)&&(!nextActive||!actor.role().equals(nextRole))) throw ApiException.bad("No puedes desactivar ni retirar los permisos de tu propia cuenta.");
        if(!actor.platform()&&nextActive&&!Boolean.TRUE.equals(existing.get("active")))checkSeats(license);
        db.jdbc.update("update identity.app_user set active=?,role=? where id=?",nextActive,nextRole,id);
        if(!nextActive||!nextRole.equals(existing.get("role"))) {
            db.jdbc.queryForObject("select set_config('app.user_id', ?, true)",String.class,id.toString());
            db.jdbc.update("delete from identity.auth_session where user_id=?",id);db.scope(actor);
        }
        return db.one("select id,name,email,role,active,created_at from identity.app_user where id=?",id);
        });
    }
}
