package mx.atlaslink.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;
import mx.atlaslink.identity.Actor;

/** Service-only access to aggregate commercial metadata, never patient detail. */
public final class InternalAccess {
    private InternalAccess() {}

    public static void requirePlatform(Actor actor, String actualKey, String expectedKey) {
        actor.require("PLATFORM_ADMIN");
        if (expectedKey == null || expectedKey.length() < 32 || actualKey == null
                || !MessageDigest.isEqual(actualKey.getBytes(StandardCharsets.UTF_8), expectedKey.getBytes(StandardCharsets.UTF_8))) {
            throw ApiException.forbidden();
        }
    }

    public record UsageRequest(List<UUID> tenantIds) {
        public List<UUID> validatedIds() {
            if (tenantIds == null || tenantIds.size() > 200 || tenantIds.stream().anyMatch(id -> id == null)) {
                throw ApiException.bad("Se requiere una lista de hasta 200 hospitales válidos.");
            }
            return tenantIds.stream().distinct().toList();
        }
    }

    public static Actor aggregateScope(Actor platform, UUID tenantId) {
        return new Actor(platform.id(), tenantId, platform.name(), platform.email(), platform.role(), null);
    }
}
