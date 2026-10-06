package mx.atlaslink.hospital;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class EvaluationEvidenceTest {
    private final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    private final RulesEngine engine=new RulesEngine();
    private final UUID accountId=UUID.randomUUID(),agreementId=UUID.randomUUID(),firstLine=UUID.randomUUID(),secondLine=UUID.randomUUID();
    private static BigDecimal n(String n){return new BigDecimal(n);}
    private AccountInput.Policy policy(){return new AccountInput.Policy(n("25.00"),n("0.123456"),n("15.00"),n("1000.00"));}
    private Map<String,Object> account(){return new HashMap<>(Map.of("id",accountId,"version",1L,"folio","SYNTHETIC-1","patientReference","DEMO-P1","insurerId",UUID.randomUUID(),"admissionDate","2026-08-31","dischargeDate","2026-09-02"));}
    private Map<String,Object> row(UUID id,String code,String quantity,String price,boolean removed){return new HashMap<>(Map.of("id",id,"code",code,"description","Synthetic charge","category","DEMO","quantity",n(quantity),"unitPrice",n(price),"removed",removed));}
    private Map<String,Object> agreement(Map<String,Object> rules){return new HashMap<>(Map.of("id",agreementId,"version",4,"validFrom","2026-08-01","validTo","2026-08-31","rules",rules));}
    private List<RulesEngine.Charge> charges(List<Map<String,Object>> rows){return rows.stream().map(r->new RulesEngine.Charge((UUID)r.get("id"),(String)r.get("code"),(BigDecimal)r.get("quantity"),(BigDecimal)r.get("unitPrice"),(boolean)r.get("removed"))).toList();}

    @Test void replayDoesNotReadCurrentLinesOrAgreementAndPreservesOriginalPrecision() throws Exception {
        var sourceAccount=account();var first=row(firstLine,"HAB","1.125","150.99",false);var second=row(secondLine,"LAB","2.010","33.15",false);
        var rows=new ArrayList<>(List.of(first,second));
        var tariffs=new HashMap<String,Object>(Map.of("HAB",n("100.05"),"LAB",n("33.15")));
        var rules=new HashMap<String,Object>(Map.of("tariffs",tariffs,"maxQuantities",Map.of("HAB",n("2.001")),"excludedCodes",new ArrayList<String>()));
        var agreement=agreement(rules);var original=engine.evaluate(charges(rows),rules,4,policy());
        var evidence=EvaluationEvidence.capture(json,sourceAccount,rows,agreement,policy(),original);

        first.put("quantity",n("999"));second.put("removed",true);rows.clear();tariffs.put("HAB",n("0"));sourceAccount.put("admissionDate","2030-01-01");agreement.put("version",5);

        var replay=EvaluationEvidence.replay(json,evidence);
        assertThat(replay).isEqualTo(original);
        assertThat(json.readTree(evidence.inputSnapshot()).path("lines")).hasSize(2);
        assertThat(json.readTree(evidence.inputSnapshot()).path("admissionDate").asText()).isEqualTo("2026-08-31");
        assertThat(json.readTree(evidence.rulesSnapshot()).path("agreementVersion").asInt()).isEqualTo(4);
        assertThat(json.readValue(evidence.resultSnapshot(),RulesEngine.Result.class)).isEqualTo(original);
    }

    @Test void removedLinesRemainInEvidenceAndTraceButNeverEnterBilledAmount(){
        var rows=List.of(row(firstLine,"HAB","1","150",false),row(secondLine,"KIT","9","700",true));
        var rules=Map.<String,Object>of("tariffs",Map.of("HAB",100));var result=engine.evaluate(charges(rows),rules,4,policy());
        var replay=EvaluationEvidence.replay(json,EvaluationEvidence.capture(json,account(),rows,agreement(rules),policy(),result));
        assertThat(replay.billedTotal()).isEqualByComparingTo("150.00");
        assertThat(replay.lineTrace()).hasSize(2);
        assertThat(replay.lineTrace().get(1).lineId()).isEqualTo(secondLine);
        assertThat(replay.lineTrace().get(1).checks()).containsExactly("REMOVED_NOT_BILLED");
        assertThat(replay.lineTrace().get(1).billedAmount()).isZero();
    }

    @Test void missingAgreementSnapshotIsReplayableWithoutInventingRules(){
        var rows=List.of(row(firstLine,"HAB","1","150",false));var result=engine.evaluate(charges(rows),null,null,null);
        var replay=EvaluationEvidence.replay(json,EvaluationEvidence.capture(json,account(),rows,null,null,result));
        assertThat(replay).isEqualTo(result);
        assertThat(replay.findings()).anySatisfy(f->{assertThat(f.code()).isEqualTo("NO_AGREEMENT");assertThat(f.message()).contains("ingreso");});
        assertThat(replay.lineTrace().getFirst().checks()).containsExactly("NO_AGREEMENT");
        assertThat(replay.financialTrace().policyComplete()).isFalse();
    }

    @Test void replayRejectsAnotherArtifactEvenWhenSemanticVersionMayMatch(){
        var snapshot=new EvaluationEvidence.Snapshot("{}","{}","{}","0".repeat(64));
        assertThatThrownBy(()->EvaluationEvidence.replay(json,snapshot)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("original engine artifact");
        assertThat(RulesEngine.artifactSha256()).matches("[a-f0-9]{64}");
        assertThat(RulesEngine.artifactSha256()).isNotEqualTo("0".repeat(64));
    }

    @Test void replayRejectsUnsupportedSnapshotSchema(){
        var snapshot=new EvaluationEvidence.Snapshot("{\"schemaVersion\":2}","{\"schemaVersion\":1}","{}",RulesEngine.artifactSha256());
        assertThatThrownBy(()->EvaluationEvidence.replay(json,snapshot)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("schema version");
    }

    @Test void lineTracesExplainEveryBranchAndFinancialReconciliation(){
        var lines=List.of(new RulesEngine.Charge(firstLine,"HAB",n("2"),n("150"),false),new RulesEngine.Charge(secondLine,"HAB",n("2"),n("150"),false),new RulesEngine.Charge(UUID.randomUUID(),"KIT",n("1"),n("50"),false),new RulesEngine.Charge(UUID.randomUUID(),"UNKNOWN",n("1"),n("20"),false));
        var rules=Map.<String,Object>of("tariffs",Map.of("HAB",100),"maxQuantities",Map.of("HAB",1),"excludedCodes",List.of("KIT"),"highRiskThreshold",100);
        var result=engine.evaluate(lines,rules,4,policy());
        assertThat(result.lineTrace().getFirst().checks()).contains("ABOVE_TARIFF","QUANTITY_REVIEW","NO_EQUAL_PRECEDING_CHARGE");
        assertThat(result.lineTrace().get(1).checks()).contains("POSSIBLE_DUPLICATE");
        assertThat(result.lineTrace().get(2).checks()).containsExactly("EXCLUDED");
        assertThat(result.lineTrace().get(3).checks()).contains("UNMAPPED_CODE");
        for(var trace:result.lineTrace())assertThat(trace.billedAmount()).isEqualByComparingTo(trace.eligibleAmount().add(trace.tariffAdjustment()).add(trace.unresolvedAmount()));
        assertThat(result.financialTrace().thresholdExceeded()).isTrue();
        assertThat(result.financialTrace().coinsuranceBeforeCap()).isGreaterThan(result.financialTrace().coinsuranceApplied());
        assertThatThrownBy(()->result.lineTrace().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(()->result.lineTrace().getFirst().checks().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
}
