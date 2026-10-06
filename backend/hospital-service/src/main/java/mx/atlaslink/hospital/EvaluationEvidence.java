package mx.atlaslink.hospital;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;

/** Serialized, self-contained evidence; source mutations cannot change a captured snapshot. */
public final class EvaluationEvidence {
    private EvaluationEvidence() {}

    public record Snapshot(String inputSnapshot,String rulesSnapshot,String resultSnapshot,String engineArtifactSha256) {}

    public static Snapshot capture(ObjectMapper mapper,Map<String,Object> account,List<Map<String,Object>> rows,
                                   Map<String,Object> agreement,AccountInput.Policy policy,RulesEngine.Result result) {
        var input=new LinkedHashMap<String,Object>();
        input.put("schemaVersion",1);
        for(String key:List.of("id","folio","patientReference","insurerId","policyNumber","diagnosisCode","admissionDate","dischargeDate"))
            input.put(key.equals("id")?"accountId":key,account.get(key));
        input.put("accountVersion",account.get("version"));
        input.put("policy",policy);
        input.put("lines",rows);
        var rules=new LinkedHashMap<String,Object>();
        rules.put("schemaVersion",1);
        rules.put("agreementId",agreement==null?null:agreement.get("id"));
        rules.put("agreementVersion",agreement==null?null:agreement.get("version"));
        rules.put("validFrom",agreement==null?null:agreement.get("validFrom"));
        rules.put("validTo",agreement==null?null:agreement.get("validTo"));
        rules.put("resolvedForAdmissionDate",account.get("admissionDate"));
        rules.put("rules",agreement==null?null:agreement.get("rules"));
        try {
            return new Snapshot(mapper.writeValueAsString(input),mapper.writeValueAsString(rules),
                    mapper.writeValueAsString(result),RulesEngine.artifactSha256());
        }catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Cannot capture evaluation evidence",e);}
    }

    /** Replays only matching bytecode; running a different engine is not historical reproduction. */
    public static RulesEngine.Result replay(ObjectMapper mapper,Snapshot snapshot) {
        if(!RulesEngine.artifactSha256().equals(snapshot.engineArtifactSha256()))
            throw new IllegalArgumentException("Replay requires the original engine artifact.");
        try {
            var exact=mapper.copy().enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);
            var input=exact.readTree(snapshot.inputSnapshot());
            var rules=exact.readTree(snapshot.rulesSnapshot());
            if(input.path("schemaVersion").asInt()!=1||rules.path("schemaVersion").asInt()!=1)
                throw new IllegalArgumentException("Unsupported evidence schema version.");
            var lines=new ArrayList<RulesEngine.Charge>();
            for(var line:input.path("lines"))
                lines.add(new RulesEngine.Charge(UUID.fromString(line.path("id").asText()),line.path("code").asText(),
                        new BigDecimal(line.path("quantity").asText()),new BigDecimal(line.path("unitPrice").asText()),line.path("removed").asBoolean()));
            AccountInput.Policy policy=input.path("policy").isNull()?null:exact.treeToValue(input.path("policy"),AccountInput.Policy.class);
            Map<String,Object> ruleValues=rules.path("rules").isNull()?null:exact.convertValue(rules.path("rules"),new com.fasterxml.jackson.core.type.TypeReference<>(){});
            Integer version=rules.path("agreementVersion").isNull()?null:rules.path("agreementVersion").asInt();
            return new RulesEngine().evaluate(lines,ruleValues,version,policy);
        }catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalArgumentException("Invalid evaluation evidence",e);}
    }
}
