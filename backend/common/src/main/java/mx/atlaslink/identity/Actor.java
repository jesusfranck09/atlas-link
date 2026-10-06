package mx.atlaslink.identity;

import java.util.*;
import mx.atlaslink.common.ApiException;

public record Actor(UUID id,UUID tenantId,String name,String email,String role,String tenantName) {
    public boolean platform() { return role.equals("PLATFORM_ADMIN"); }
    public void require(String...roles) { if(!Set.of(roles).contains(role)) throw ApiException.forbidden(); }
    public void hospital() { if(tenantId==null || platform()) throw ApiException.forbidden(); }
    public static Actor from(Map<String,Object> row) {
        return new Actor(UUID.fromString(row.get("id").toString()),row.get("tenantId")==null?null:UUID.fromString(row.get("tenantId").toString()),row.get("name").toString(),row.get("email").toString(),row.get("role").toString(),Objects.toString(row.get("tenantName"),"Atlas Link"));
    }
}
