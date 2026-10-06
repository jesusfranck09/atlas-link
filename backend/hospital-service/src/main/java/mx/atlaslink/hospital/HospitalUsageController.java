package mx.atlaslink.hospital;

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
public class HospitalUsageController {
    private final Db db;
    private final String key;

    public HospitalUsageController(Db db, @Value("${atlas.internal-api-key}") String key) {
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
            result.put(tenant.toString(), db.one("""
                select count(*) account_count,
                  count(*) filter (where created_at >= date_trunc('month', current_timestamp at time zone 'America/Mexico_City') at time zone 'America/Mexico_City') used_accounts
                from hospital.hospital_account where tenant_id = ?
                """, tenant));
        }
        return result;
    }
}
