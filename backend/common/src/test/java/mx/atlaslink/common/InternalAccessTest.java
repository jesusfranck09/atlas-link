package mx.atlaslink.common;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import mx.atlaslink.identity.Actor;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class InternalAccessTest {
    private static final String KEY = "a".repeat(48);
    private final Actor platform = new Actor(UUID.randomUUID(), null, "Atlas", "platform@example.test", "PLATFORM_ADMIN", null);

    @Test void aggregateMetadataRequiresBothPlatformIdentityAndServiceKey() {
        InternalAccess.requirePlatform(platform, KEY, KEY);
        var hospital = new Actor(UUID.randomUUID(), UUID.randomUUID(), "Hospital", "hospital@example.test", "HOSPITAL_ADMIN", "Hospital");
        assertThatThrownBy(() -> InternalAccess.requirePlatform(hospital, KEY, KEY)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> InternalAccess.requirePlatform(platform, null, KEY)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> InternalAccess.requirePlatform(platform, "wrong", KEY)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> InternalAccess.requirePlatform(platform, "short", "short")).isInstanceOf(ApiException.class);
    }

    @Test void batchIsBoundedAndDeduplicated() {
        var id = UUID.randomUUID();
        assertThat(new InternalAccess.UsageRequest(List.of(id, id)).validatedIds()).containsExactly(id);
        assertThatThrownBy(() -> new InternalAccess.UsageRequest(null).validatedIds()).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> new InternalAccess.UsageRequest(Arrays.asList(id, null)).validatedIds()).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> new InternalAccess.UsageRequest(Collections.nCopies(201, id)).validatedIds()).isInstanceOf(ApiException.class);
    }

    @Test void aggregateScopeKeepsVerifiedActorAndChangesOnlyExplicitTenant() {
        UUID tenant = UUID.randomUUID();
        Actor scoped = InternalAccess.aggregateScope(platform, tenant);
        assertThat(scoped.id()).isEqualTo(platform.id());
        assertThat(scoped.tenantId()).isEqualTo(tenant);
        assertThat(scoped.role()).isEqualTo("PLATFORM_ADMIN");
    }
}
