package mx.atlaslink.hospital;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.*;
import mx.atlaslink.common.*;
import mx.atlaslink.identity.Actor;
import org.junit.jupiter.api.Test;

class AccountReadAndResolutionTest {
    private final UUID tenantId=UUID.randomUUID(),insurerId=UUID.randomUUID();
    private final Actor actor=new Actor(UUID.randomUUID(),tenantId,"Demo","demo@example.test","HOSPITAL_ADMIN","Demo");
    private final Db db=mock(Db.class);
    private final AccountService service=new AccountService(db,"http://127.0.0.1:1","test-key");

    @Test void crossingMonthsResolvesByAdmissionInsteadOfDischarge(){
        var august=Map.<String,Object>of("id",UUID.randomUUID(),"version",1,"rules",Map.of("tariffs",Map.of("HAB",100)));
        when(db.list(anyString(),eq(tenantId),eq(insurerId),eq("2026-08-31"),eq("2026-08-31"))).thenReturn(List.of(august));
        var result=service.resolveAgreementScoped(actor,Map.of("insurerId",insurerId,"admissionDate","2026-08-31","dischargeDate","2026-09-02"));
        assertThat(result).isSameAs(august);
        verify(db).list(contains("status='PUBLISHED'"),eq(tenantId),eq(insurerId),eq("2026-08-31"),eq("2026-08-31"));
        verifyNoMoreInteractions(db);
    }

    @Test void missingAdmissionAgreementDoesNotFallForwardToDischarge(){
        when(db.list(anyString(),eq(tenantId),eq(insurerId),eq("2026-08-31"),eq("2026-08-31"))).thenReturn(List.of());
        assertThat(service.resolveAgreementScoped(actor,Map.of("insurerId",insurerId,"admissionDate","2026-08-31","dischargeDate","2026-09-02"))).isNull();
        verify(db).list(anyString(),eq(tenantId),eq(insurerId),eq("2026-08-31"),eq("2026-08-31"));verifyNoMoreInteractions(db);
    }

    @Test void selectedVersionRemainsPinnedAcrossReevaluations(){
        UUID pinnedId=UUID.randomUUID();var pinned=Map.<String,Object>of("id",pinnedId,"version",1);
        when(db.list(anyString(),eq(pinnedId),eq(tenantId))).thenReturn(List.of(pinned));
        var result=service.resolveAgreementScoped(actor,Map.of("agreementId",pinnedId,"insurerId",insurerId,"admissionDate","2026-08-31","dischargeDate","2026-09-02"));
        assertThat(result).isSameAs(pinned);
        verify(db).list("select * from hospital.agreement where id=? and tenant_id=?",pinnedId,tenantId);verifyNoMoreInteractions(db);
    }

    @Test void filterSupportsEntireReviewQueueAndTreatsWildcardsLiterally(){
        var filter=AccountService.accountFilter(actor,"RECEIVED,EVALUATED,IN_REVIEW","RED","A_50%\\x");
        assertThat(filter.sql()).contains("status in (?,?,?)","lane=?","folio ilike ?");
        assertThat(filter.args()).containsExactly(tenantId,"RECEIVED","EVALUATED","IN_REVIEW","RED","%A\\_50\\%\\\\x%","%A\\_50\\%\\\\x%","%A\\_50\\%\\\\x%");
        assertThatThrownBy(()->AccountService.accountFilter(actor,"SENT;DROP TABLE","GREEN",null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AccountService.accountFilter(actor,null,"BLUE",null)).isInstanceOf(ApiException.class);
    }

    @Test void pageBoundsProtectResourceUsageWithoutLimitingNumberOfPages(){
        assertThatCode(()->AccountService.validatePage(100000,200)).doesNotThrowAnyException();
        assertThatThrownBy(()->AccountService.validatePage(-1,20)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AccountService.validatePage(0,201)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AccountService.validatePage(0,0)).isInstanceOf(ApiException.class);
    }

    @Test void reportDateBoundsUseInclusiveMexicoReceptionDay(){
        var filter=AccountService.reportFilter(actor,"2026-09-01","2026-09-30",insurerId);
        assertThat(filter.sql()).contains("created_at>=?","created_at<?","insurer_id=?").doesNotContain("limit");
        assertThat(filter.args()).containsExactly(tenantId,java.sql.Timestamp.from(Instant.parse("2026-09-01T06:00:00Z")),java.sql.Timestamp.from(Instant.parse("2026-10-01T06:00:00Z")),insurerId);
        assertThatThrownBy(()->AccountService.reportFilter(actor,"2026-09-30","2026-09-01",null)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->AccountService.reportFilter(actor,"2026-02-30",null,null)).isInstanceOf(ApiException.class);
    }

    @Test void providerCannotReadAccountPagesOrHistoricalEvidence(){
        var platform=new Actor(UUID.randomUUID(),null,"Atlas","demo@example.test","PLATFORM_ADMIN","Atlas");
        assertThatThrownBy(()->service.page(platform,null,null,null,0,20)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.evaluations(platform,UUID.randomUUID())).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.evaluation(platform,UUID.randomUUID(),UUID.randomUUID())).isInstanceOf(ApiException.class);
        verifyNoInteractions(db);
    }
}
