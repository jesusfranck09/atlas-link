package mx.atlaslink.common;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import mx.atlaslink.identity.Actor;

@Component
public class Db {
    public final JdbcTemplate jdbc;
    public final ObjectMapper json;
    public Db(JdbcTemplate jdbc,ObjectMapper json) { this.jdbc=jdbc; this.json=json; }
    public void scope(Actor actor) {
        jdbc.queryForObject("select set_config('app.tenant_id', ?, true)",String.class,actor.tenantId()==null?"":actor.tenantId().toString());
        jdbc.queryForObject("select set_config('app.platform_admin', ?, true)",String.class,Boolean.toString(actor.platform()));
        jdbc.queryForObject("select set_config('app.actor_id', ?, true)",String.class,actor.id().toString());
        jdbc.queryForObject("select set_config('app.user_id', ?, true)",String.class,actor.id().toString());
    }
    public List<Map<String,Object>> list(String sql,Object...args) { return jdbc.query(sql,(rs,n)->row(rs),args); }
    public Map<String,Object> one(String sql,Object...args) { var result=list(sql,args); if(result.isEmpty()) throw ApiException.missing(); return result.getFirst(); }
    public String json(Object value) { try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException(e); } }
    public Map<String,Object> object(Object value) { if(value instanceof Map<?,?> map) return json.convertValue(map,new TypeReference<>(){}); try { return json.readValue(value.toString(),new TypeReference<>(){}); }catch(Exception e) {throw new IllegalStateException(e);} }
    public void audit(Actor actor,String action,String entityType,UUID entityId,Map<String,?> detail) {
        jdbc.update("insert into hospital.audit_event(id,tenant_id,actor_id,action,entity_type,entity_id,details) values(?,?,?,?,?,?,?::jsonb)",UUID.randomUUID(),actor.tenantId(),actor.id(),action,entityType,entityId,json(detail));
    }
    private Map<String,Object> row(ResultSet rs) throws SQLException {
        var map=new LinkedHashMap<String,Object>(); var metadata=rs.getMetaData();
        for(int i=1;i<=metadata.getColumnCount();i++) {
            var name=metadata.getColumnLabel(i); var key=new StringBuilder(); boolean upper=false;
            for(char c:name.toCharArray()) { if(c=='_') {upper=true;} else {key.append(upper?Character.toUpperCase(c):c);upper=false;} }
            Object value=rs.getObject(i);
            if(value instanceof Timestamp timestamp) value=timestamp.toInstant().toString();
            else if(value instanceof java.sql.Date date) value=date.toLocalDate().toString();
            else if(value!=null && metadata.getColumnType(i)==Types.OTHER && !"uuid".equals(metadata.getColumnTypeName(i))) {
                try { value=json.readValue(value.toString(),Object.class); } catch(Exception ignored) { value=value.toString(); }
            }
            map.put(key.toString(),value);
        }
        return map;
    }
}
