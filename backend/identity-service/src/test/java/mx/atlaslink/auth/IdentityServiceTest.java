package mx.atlaslink.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import mx.atlaslink.common.*;
import mx.atlaslink.identity.Actor;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionCallback;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class IdentityServiceTest {
    private Db db;
    private IdentityService service;
    private final Actor platform=new Actor(UUID.randomUUID(),null,"Owner","owner@example.test","PLATFORM_ADMIN","Atlas");
    private final Actor director=new Actor(UUID.randomUUID(),UUID.randomUUID(),"Director","director@example.test","DIRECTOR","Hospital");
    @BeforeEach void setup(){
        db=spy(new Db(mock(JdbcTemplate.class),new ObjectMapper()));
        var env=new MockEnvironment();env.setActiveProfiles("demo");
        TransactionTemplate transactions=mock(TransactionTemplate.class);
        when(transactions.execute(any())).thenAnswer(invocation->((TransactionCallback<?>)invocation.getArgument(0)).doInTransaction(null));
        service=new IdentityService(db,true,env,"http://127.0.0.1:1","x".repeat(48),transactions,"demo");
    }
    @Test void rejectsLocalIdentityOutsideExplicitDemo(){
        assertThatThrownBy(()->new IdentityService(db,false,new MockEnvironment(),"http://127.0.0.1:1","x".repeat(48),mock(TransactionTemplate.class),"demo"))
            .isInstanceOf(IllegalStateException.class);
    }
    @Test void demoSeedPasswordIsValidBcrypt12(){
        assertThat(new BCryptPasswordEncoder(12).matches(IdentityService.DEMO_PASSWORD,
            "$2y$12$gjoKjyL3K26EtWgNkRYGl.rGgUtbka1we2ac4GMHXfuJoXQfexxF6")).isTrue();
    }
    @Test void malformedTokensNeverReachDatabase(){
        assertThat(service.verify("short")).isNull();assertThat(service.verify(null)).isNull();
        assertThat(service.verify("!".repeat(43))).isNull();verifyNoInteractions(db.jdbc);
    }
    @Test void hashesOpaqueTokensWithoutRetainingRawValue(){
        String token="a".repeat(43);
        doReturn(List.of()).when(db).list("select id,tenant_id,name,email,role from identity.find_session_user(?)",IdentityService.hash(token));
        assertThat(service.verify(token)).isNull();
        verify(db).list("select id,tenant_id,name,email,role from identity.find_session_user(?)",IdentityService.hash(token));
        assertThat(IdentityService.hash(token)).hasSize(64).doesNotContain(token);
    }
    @Test void readOnlyRolesCannotAdministerUsers(){
        assertThatThrownBy(()->service.users(director)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        assertThatThrownBy(()->service.createUser(director,"New","n@example.test","HOSPITAL_ADMIN","LongPassword2026!"))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        verifyNoInteractions(db.jdbc);
    }
    @Test void platformCannotCreateHospitalUserThroughRegularEndpoint(){
        assertThatThrownBy(()->service.createUser(platform,"New","n@example.test","HOSPITAL_ADMIN","LongPassword2026!"))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        verifyNoInteractions(db.jdbc);
    }
    @Test void internalBootstrapRequiresPlatformAndSecret(){
        assertThatThrownBy(()->service.bootstrap(platform,"wrong",UUID.randomUUID(),"New","n@example.test","LongPassword2026!"))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        assertThatThrownBy(()->service.bootstrap(director,"x".repeat(48),UUID.randomUUID(),"New","n@example.test","LongPassword2026!"))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        verifyNoInteractions(db.jdbc);
    }
    @Test void passwordBytesRespectBcryptLimit(){
        assertThatThrownBy(()->service.createUser(platform,"New","n@example.test","PLATFORM_ADMIN","界".repeat(30)))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(400);
        verifyNoInteractions(db.jdbc);
    }
    @Test void ownAdministratorCannotBeDisabled(){
        doReturn(new HashMap<>(Map.of("role","PLATFORM_ADMIN","active",true))).when(db)
            .one("select id,name,email,role,active,created_at from identity.app_user where id=? for update",platform.id());
        assertThatThrownBy(()->service.updateUser(platform,platform.id(),false,null))
            .isInstanceOf(ApiException.class).hasMessageContaining("propia cuenta");
    }
}
