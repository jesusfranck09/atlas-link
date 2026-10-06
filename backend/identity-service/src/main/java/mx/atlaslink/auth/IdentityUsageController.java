package mx.atlaslink.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import mx.atlaslink.common.Db;
import mx.atlaslink.common.InternalAccess;
import mx.atlaslink.identity.Actor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class IdentityUsageController {
    private final Db db;
    private final String key;

    public IdentityUsageController(Db db, @Value("${atlas.internal-key}") String key) {
        this.db = db;
        this.key = key;
    }

    @PostMapping("/internal/usage")
    @Transactional(readOnly = true)
    public Map<String, Object> usage(@AuthenticationPrincipal Actor actor,
            @RequestHeader(value = "X-Internal-Key", required = false) String supplied,
            @RequestBody InternalAccess.UsageRequest request) {
        InternalAccess.requirePlatform(actor, supplied, key);
        Map<String, Object> result = new LinkedHashMap<>();
        for (var tenant : request.validatedIds()) {
            db.scope(InternalAccess.aggregateScope(actor, tenant));
            result.put(tenant.toString(), db.one("select count(*) user_count from identity.app_user where tenant_id = ? and active", tenant));
        }
        return result;
    }
}
