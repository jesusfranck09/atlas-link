package mx.atlaslink.control;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.time.*;
import java.util.*;
import mx.atlaslink.common.*;
import mx.atlaslink.identity.Actor;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ControlServiceTest {
    private Db db;
    private ControlService service;
    private final Actor platform=new Actor(UUID.randomUUID(),null,"Owner","owner@example.test","PLATFORM_ADMIN","Atlas");
    private final Actor admin=new Actor(UUID.randomUUID(),UUID.randomUUID(),"Admin","admin@example.test","HOSPITAL_ADMIN","Hospital");
    @BeforeEach void setup(){db=spy(new Db(mock(JdbcTemplate.class),new ObjectMapper()));service=new ControlService(db,"x".repeat(48),"http://127.0.0.1:1");}
    @Test void internalEndpointsRequireKey(){
        assertThatThrownBy(()->service.internal(null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.internal("bad")).isInstanceOf(ApiException.class);
        assertThatCode(()->service.internal("x".repeat(48))).doesNotThrowAnyException();
    }
    @Test void hospitalCannotReadGlobalLicensesOrTenants(){
        assertThatThrownBy(()->service.tenants(admin)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        assertThatThrownBy(()->service.licenses(admin)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        assertThatThrownBy(()->service.leads(admin)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        verifyNoInteractions(db.jdbc);
    }
    @Test void platformCannotBorrowHospitalEntitlement(){
        assertThatThrownBy(()->service.entitlement(platform)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        verifyNoInteractions(db.jdbc);
    }
    @Test void expirationAndSuspensionBlockWrites(){
        String query="select l.tenant_id,l.status,l.monthly_account_limit,l.seat_limit,l.expires_at,t.status tenant_status,t.is_demo from control.license l join control.tenant t on t.id=l.tenant_id where l.tenant_id=?";
        var expired=new HashMap<String,Object>(Map.of("status","ACTIVE","tenantStatus","ACTIVE","expiresAt",Instant.now().minusSeconds(1).toString()));
        doReturn(List.of(expired)).when(db).list(query,admin.tenantId());
        assertThatThrownBy(()->service.entitlement(admin)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(402);
        expired.put("expiresAt",Instant.now().plusSeconds(900).toString());expired.put("tenantStatus","SUSPENDED");
        assertThatThrownBy(()->service.entitlement(admin)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(402);
    }
    @Test void staleLicenseVersionRejectedBeforeUpdate(){
        UUID id=UUID.randomUUID();
        doReturn(Map.of("version",4L)).when(db).one("select starts_at,expires_at,version from control.license where id=? for update",id);
        var patch=new ControlController.LicenseChange(3L,"Hospital","ACTIVE",1000,10,OffsetDateTime.now().plusDays(30));
        assertThatThrownBy(()->service.updateLicense(platform,id,patch)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(409);
    }
    @Test void validatesConsentAndCapacityBounds(){
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            assertThat(validator.validate(new ControlController.Lead("Name","mail@example.test","Hospital","Hello",false))).isNotEmpty();
            assertThat(validator.validate(new ControlController.LicenseChange(0L,"Hospital","ACTIVE",0,0,OffsetDateTime.now()))).hasSize(2);
        }
    }
    @Test void publicLeadCannotBypassIpLimitWithDifferentEmails(){
        for(int i=0;i<30;i++)service.lead(new ControlController.Lead("Name","mail"+i+"@example.test","Hospital","Hello",true),"127.0.0.1");
        assertThatThrownBy(()->service.lead(new ControlController.Lead("Name","last@example.test","Hospital","Hello",true),"127.0.0.1"))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(429);
    }
}
