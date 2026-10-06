package mx.atlaslink.hospital;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class RulesEngineTest {
    private final RulesEngine engine=new RulesEngine();
    private final Map<String,Object> rules=Map.of("tariffs",Map.of("HAB",4500,"LAB",850),"excludedCodes",List.of("KIT"),"maxQuantities",Map.of("HAB",10));
    private static BigDecimal n(String value){return new BigDecimal(value);}
    private static RulesEngine.Charge line(String code,String qty,String price){return new RulesEngine.Charge(UUID.randomUUID(),code,n(qty),n(price),false);}
    private static AccountInput.Policy policy(String deductible,String rate,String cap,String coverage){return new AccountInput.Policy(n(deductible),n(rate),n(cap),n(coverage));}
    private static void balanced(RulesEngine.Result result){assertThat(result.billedTotal()).isEqualByComparingTo(result.tariffAdjustment().add(result.insurerEstimate()).add(result.patientEstimate()).add(result.unresolvedAmount()));assertThat(result.patientEstimate()).isEqualByComparingTo(result.deductible().add(result.coinsurance()));assertThat(result.excludedTotal()).isLessThanOrEqualTo(result.unresolvedAmount());}
    @Test void appliesDeductibleThenCoinsuranceWithoutFloatingPoint(){
        var result=engine.evaluate(List.of(line("HAB","2","4500"),line("LAB","1","850")),rules,1,policy("1000","0.10","20000","100000"));
        assertThat(result.billedTotal()).isEqualByComparingTo("9850.00");assertThat(result.coinsurance()).isEqualByComparingTo("885.00");assertThat(result.insurerEstimate()).isEqualByComparingTo("7965.00");assertThat(result.patientEstimate()).isEqualByComparingTo("1885.00");assertThat(result.lane()).isEqualTo("GREEN");balanced(result);
    }
    @Test void contractualAdjustmentIsNeverAssignedToPatient(){
        var result=engine.evaluate(List.of(line("HAB","2","5000")),rules,1,policy("1000","0.10","20000","100000"));
        assertThat(result.tariffAdjustment()).isEqualByComparingTo("1000");assertThat(result.patientEstimate()).isEqualByComparingTo("1800");assertThat(result.insurerEstimate()).isEqualByComparingTo("7200");assertThat(result.lane()).isEqualTo("YELLOW");balanced(result);
    }
    @Test void exclusionsUnknownCodesAndCoverageGapsRemainUnresolved(){
        var result=engine.evaluate(List.of(line("HAB","2","4500"),line("KIT","1","1200"),line("UNKNOWN","1","300")),rules,1,policy("1000","0.10","20000","5000"));
        assertThat(result.unresolvedAmount()).isEqualByComparingTo("3700");assertThat(result.excludedTotal()).isEqualByComparingTo("1200");assertThat(result.patientEstimate()).isEqualByComparingTo("1800");assertThat(result.lane()).isEqualTo("RED");balanced(result);
    }
    @Test void incompletePolicyNeverProducesUnsubstantiatedPatientLiability(){
        var result=engine.evaluate(List.of(line("HAB","1","4500")),rules,1,new AccountInput.Policy(n("1000"),n("0.10"),null,n("100000")));
        assertThat(result.patientEstimate()).isZero();assertThat(result.insurerEstimate()).isZero();assertThat(result.unresolvedAmount()).isEqualByComparingTo("4500");assertThat(result.lane()).isEqualTo("YELLOW");balanced(result);
    }
    @Test void missingAgreementHoldsEntireBillEvenWithCompletePolicy(){
        var result=engine.evaluate(List.of(line("HAB","1","4500")),null,null,policy("1000","0.10","20000","100000"));assertThat(result.unresolvedAmount()).isEqualByComparingTo("4500");assertThat(result.patientEstimate()).isZero();assertThat(result.lane()).isEqualTo("RED");balanced(result);
    }
    @Test void capsDeductibleAndCoinsuranceAndOmitsRemovedCharges(){
        var removed=new RulesEngine.Charge(UUID.randomUUID(),"KIT",n("1"),n("1200"),true);
        var result=engine.evaluate(List.of(line("HAB","1","4500"),removed),rules,1,policy("1000","0.20","100","100000"));assertThat(result.billedTotal()).isEqualByComparingTo("4500");assertThat(result.coinsurance()).isEqualByComparingTo("100");assertThat(result.patientEstimate()).isEqualByComparingTo("1100");balanced(result);
        var low=engine.evaluate(List.of(line("LAB","1","850")),rules,1,policy("1000","0.10","100","100000"));assertThat(low.deductible()).isEqualByComparingTo("850");assertThat(low.insurerEstimate()).isZero();balanced(low);
    }
    @Test void repeatedEvaluationIsIdenticalAndRoundingIsConservative(){
        var lines=List.of(line("LAB","0.333","850"));var policy=policy("0","0.13","1000","100000");var first=engine.evaluate(lines,rules,4,policy);assertThat(first).isEqualTo(engine.evaluate(lines,rules,4,policy));assertThat(first.billedTotal()).isEqualByComparingTo("283.05");assertThat(first.coinsurance()).isEqualByComparingTo("36.80");balanced(first);
    }
    @Test void duplicateAndQuantityChecksKeepFinancialConservation(){
        var result=engine.evaluate(List.of(line("HAB","11","4500"),line("HAB","11","4500")),rules,2,policy("0","0","0","1000000"));assertThat(result.findings()).extracting(RulesEngine.Finding::code).contains("QUANTITY_REVIEW","POSSIBLE_DUPLICATE");balanced(result);
    }
}
