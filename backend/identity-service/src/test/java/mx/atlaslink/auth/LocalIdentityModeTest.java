package mx.atlaslink.auth;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import mx.atlaslink.common.*;
import mx.atlaslink.identity.Actor;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

class LocalIdentityModeTest {
    private Db db;
    private IdentityService local;
    private final String sessionToken="r".repeat(43);
    private final UUID ownId=UUID.randomUUID();
    private final UUID ownTenant=UUID.randomUUID();
    @BeforeEach void setup(){
        db=spy(new Db(mock(JdbcTemplate.class),new ObjectMapper()));
        local=new IdentityService(db,false,new MockEnvironment(),"http://127.0.0.1:1","k".repeat(48),mock(TransactionTemplate.class),"local");
    }
    private HashMap<String,Object> user(String email,String role,UUID tenant){
        var user=new HashMap<String,Object>();user.put("id",ownId);user.put("email",email);user.put("role",role);user.put("tenantId",tenant);user.put("name","Cuenta propia");return user;
    }
    private void session(Map<String,Object> row){
        doReturn(List.of(row)).when(db).list("select id,tenant_id,name,email,role from identity.find_session_user(?)",IdentityService.hash(sessionToken));
    }
    @Test void localModeCreatesNoIdentityOrDefaultCredentials(){
        verifyNoInteractions(db.jdbc);
        assertThatThrownBy(local::demoProfiles).isInstanceOf(ApiException.class).extracting("status").isEqualTo(404);
    }
    @Test void demoFlagsAndUnknownProviderFailClosed(){
        var demoEnv=new MockEnvironment();demoEnv.setActiveProfiles("demo");
        assertThatThrownBy(()->new IdentityService(db,true,new MockEnvironment(),"http://127.0.0.1:1","k".repeat(48),mock(TransactionTemplate.class),"local")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->new IdentityService(db,false,demoEnv,"http://127.0.0.1:1","k".repeat(48),mock(TransactionTemplate.class),"local")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->new IdentityService(db,false,new MockEnvironment(),"http://127.0.0.1:1","k".repeat(48),mock(TransactionTemplate.class),"oidc")).isInstanceOf(IllegalStateException.class);
    }
    @Test void existingSyntheticSessionsAreRejectedInLocalMode(){
        for(var row:List.of(user("atlas@demo.atlaslink.mx","PLATFORM_ADMIN",null),
            user("person@example.test","INSURER_DEMO",ownTenant),
            user("person@example.test","REVIEWER",UUID.fromString("11111111-1111-1111-1111-111111111111")),
            user("person@example.test","REVIEWER",UUID.fromString("22222222-2222-2222-2222-222222222222")))){
            session(row);assertThat(local.verify(sessionToken)).isNull();
        }
        var renamedSeed=user("new-owner@example.test","PLATFORM_ADMIN",null);renamedSeed.put("id",UUID.fromString("a0000000-0000-0000-0000-000000000001"));
        session(renamedSeed);assertThat(local.verify(sessionToken)).isNull();
    }
    @Test void actualTenantSessionRetainsItsVerifiedScope(){
        session(user("reviewer@example.test","REVIEWER",ownTenant));
        assertThat(local.verify(sessionToken)).satisfies(actor->{assertThat(actor.tenantId()).isEqualTo(ownTenant);assertThat(actor.id()).isEqualTo(ownId);assertThat(actor.role()).isEqualTo("REVIEWER");});
    }
    @Test void seededLoginCannotIssueSessionEvenWithCorrectDemoPassword(){
        var seed=user("atlas@demo.atlaslink.mx","PLATFORM_ADMIN",null);seed.put("passwordHash",new BCryptPasswordEncoder(12).encode(IdentityService.DEMO_PASSWORD));
        doReturn(List.of(seed)).when(db).list("select id,tenant_id,name,email,role,password_hash from identity.find_login_user(?)","atlas@demo.atlaslink.mx");
        assertThatThrownBy(()->local.login("atlas@demo.atlaslink.mx",IdentityService.DEMO_PASSWORD,"127.0.0.1")).isInstanceOf(ApiException.class).extracting("status").isEqualTo(401);
        verifyNoInteractions(db.jdbc);
    }
    @Test void properlyProvisionedUserCanLoginWithoutDemo(){
        String password="Private-test-credential-2026!";
        var own=user("owner@example.test","PLATFORM_ADMIN",null);own.put("passwordHash",new BCryptPasswordEncoder(12).encode(password));
        doReturn(List.of(own)).when(db).list("select id,tenant_id,name,email,role,password_hash from identity.find_login_user(?)","owner@example.test");
        var result=local.login("owner@example.test",password,"127.0.0.1");
        assertThat(result.get("token").toString()).matches("[A-Za-z0-9_-]{43}");
        assertThat((Actor)result.get("user")).extracting(Actor::email,Actor::role).containsExactly("owner@example.test","PLATFORM_ADMIN");
    }
    @Test void localModeCannotCreateReservedDemoIdentity(){
        var owner=new Actor(ownId,null,"Owner","owner@example.test","PLATFORM_ADMIN","Atlas Link");
        assertThatThrownBy(()->local.createUser(owner,"Demo","demo@demo.atlaslink.mx","PLATFORM_ADMIN","LongPassword2026!")).isInstanceOf(ApiException.class).extracting("status").isEqualTo(400);
        verifyNoInteractions(db.jdbc);
    }
}
