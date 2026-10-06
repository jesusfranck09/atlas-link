package mx.atlaslink.common;

import java.math.BigDecimal;
import java.util.*;

public final class Input {
    private Input(){}
    public static String text(Map<String,Object> map,String key,int max) { Object v=map.get(key); if(v==null||v.toString().isBlank()||v.toString().length()>max) throw ApiException.bad("Revisa el campo "+key+"."); return v.toString().strip(); }
    public static String optional(Map<String,Object> map,String key,int max) { if(!map.containsKey(key)||map.get(key)==null) return null; return text(map,key,max); }
    public static long version(Map<String,Object> map) { try { long v=new BigDecimal(map.get("version").toString()).longValueExact();if(v<0)throw new ArithmeticException();return v;}catch(Exception e){throw ApiException.bad("Incluye la versión vigente del registro.");} }
    public static BigDecimal decimal(Map<String,Object> map,String key,boolean required) { Object v=map.get(key);if(v==null){if(required)throw ApiException.bad("Falta "+key+".");return null;}try { var n=new BigDecimal(v.toString());if(n.signum()<0||n.precision()>16||n.scale()>6)throw new ArithmeticException();return n;}catch(Exception e){throw ApiException.bad("Importe inválido: "+key+".");} }
    public static UUID uuid(Object value) { try { return UUID.fromString(value.toString()); }catch(Exception e){throw ApiException.bad("Identificador inválido.");} }
    public static boolean bool(Map<String,Object> map,String key,boolean defaultValue) {if(!map.containsKey(key))return defaultValue;if(!(map.get(key) instanceof Boolean value))throw ApiException.bad("Valor booleano inválido: "+key+".");return value;}
}
