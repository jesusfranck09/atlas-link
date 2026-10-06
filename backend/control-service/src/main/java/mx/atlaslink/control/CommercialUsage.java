package mx.atlaslink.control;

import java.util.List;
import java.util.Map;
import mx.atlaslink.identity.Actor;
import mx.atlaslink.identity.RemoteIdentity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Calls are deliberately outside SQL transactions to avoid holding connections across services. */
@Service
public class CommercialUsage {
    private final RestClient hospital;
    private final RestClient identity;
    private final String internalKey;

    public CommercialUsage(@Value("${atlas.hospital-url}") String hospitalUrl,
                           @Value("${atlas.identity-url}") String identityUrl,
                           @Value("${atlas.internal-key}") String key) {
        hospital = RemoteIdentity.client(hospitalUrl);
        identity = RemoteIdentity.client(identityUrl);
        internalKey = key;
    }

    public List<Map<String, Object>> tenants(Actor actor, List<Map<String, Object>> rows) {
        actor.require("PLATFORM_ADMIN");
        var ids = rows.stream().map(row -> row.get("id").toString()).toList();
        var accounts = fetch(hospital, ids);
        var users = fetch(identity, ids);
        for (var row : rows) {
            String id = row.get("id").toString();
            copy(accounts, id, row, "accountCount");
            copy(users, id, row, "userCount");
        }
        return rows;
    }

    public List<Map<String, Object>> licenses(Actor actor, List<Map<String, Object>> rows) {
        actor.require("PLATFORM_ADMIN");
        var usage = fetch(hospital, rows.stream().map(row -> row.get("tenantId").toString()).distinct().toList());
        for (var row : rows) copy(usage, row.get("tenantId").toString(), row, "usedAccounts");
        return rows;
    }

    private Map<?, ?> fetch(RestClient client, List<String> ids) {
        if (ids.isEmpty()) return Map.of();
        try {
            Map<?, ?> result = client.post().uri("/internal/usage")
                .header("Authorization", RemoteIdentity.authorization())
                .header("X-Internal-Key", internalKey)
                .body(Map.of("tenantIds", ids)).retrieve().body(Map.class);
            return result == null ? Map.of() : result;
        } catch (RestClientException unavailable) {
            // Unknown usage is null, never a fabricated zero. Existing console indicates unavailable.
            return Map.of();
        }
    }

    private static void copy(Map<?, ?> source, String tenant, Map<String, Object> target, String field) {
        if (source.get(tenant) instanceof Map<?, ?> counts && counts.get(field) instanceof Number number) {
            target.put(field, number);
        }
    }
}
