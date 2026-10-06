package mx.atlaslink.hospital;

import java.math.*;
import java.util.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Pure deterministic engine. No clinical decision or insurer payment authorization. */
public final class RulesEngine {
    public static final String VERSION="1.1.0";
    private static final BigDecimal ZERO=new BigDecimal("0.00");
    public record Charge(UUID id,String code,BigDecimal quantity,BigDecimal unitPrice,boolean removed) { public BigDecimal total(){return money(quantity.multiply(unitPrice));} }
    public record Finding(UUID lineId,String code,String message,String severity,BigDecimal amount) {}
    public record LineTrace(UUID lineId,String code,boolean removed,BigDecimal billedAmount,BigDecimal contractualUnitPrice,BigDecimal eligibleAmount,BigDecimal excludedAmount,BigDecimal tariffAdjustment,BigDecimal unresolvedAmount,List<String> checks) {}
    public record FinancialTrace(boolean policyComplete,BigDecimal eligibleAmount,BigDecimal deductibleApplied,BigDecimal coinsuranceBeforeCap,BigDecimal coinsuranceApplied,BigDecimal coverageGap,BigDecimal highRiskThreshold,boolean thresholdExceeded) {}
    public record Result(BigDecimal billedTotal,BigDecimal excludedTotal,BigDecimal tariffAdjustment,BigDecimal deductible,BigDecimal coinsurance,BigDecimal insurerEstimate,BigDecimal patientEstimate,BigDecimal unresolvedAmount,String lane,List<Finding> findings,Integer agreementVersion,String engineVersion,List<LineTrace> lineTrace,FinancialTrace financialTrace) {}
    public Result evaluate(List<Charge> lines,Map<String,Object> rules,Integer agreementVersion,AccountInput.Policy policy) {
        BigDecimal billed=ZERO,excluded=ZERO,adjustment=ZERO,uncertain=ZERO;
        var findings=new ArrayList<Finding>();
        var traces=new ArrayList<LineTrace>();
        Map<?,?> tariffs=rules==null?Map.of():map(rules.get("tariffs"));
        Map<?,?> max=rules==null?Map.of():map(rules.get("maxQuantities"));
        Collection<?> excludedCodes=rules==null?List.of():rules.get("excludedCodes") instanceof Collection<?> values?values:List.of();
        var seen=new HashSet<String>();
        for(var line:lines) {
            if(line.removed()) {traces.add(new LineTrace(line.id(),line.code(),true,ZERO,null,ZERO,ZERO,ZERO,ZERO,List.of("REMOVED_NOT_BILLED")));continue;}
            var total=line.total();billed=billed.add(total);
            if(rules==null) {uncertain=uncertain.add(total);traces.add(new LineTrace(line.id(),line.code(),false,total,null,ZERO,ZERO,ZERO,total,List.of("NO_AGREEMENT")));continue;}
            if(excludedCodes.contains(line.code())) { excluded=excluded.add(total);findings.add(new Finding(line.id(),"EXCLUDED","Concepto excluido del convenio; responsabilidad por confirmar.","RED",total));traces.add(new LineTrace(line.id(),line.code(),false,total,null,ZERO,total,ZERO,total,List.of("EXCLUDED")));continue; }
            if(!tariffs.containsKey(line.code())) {uncertain=uncertain.add(total);findings.add(new Finding(line.id(),"UNMAPPED_CODE","Código sin tabulador homologado.","RED",total));traces.add(new LineTrace(line.id(),line.code(),false,total,null,ZERO,ZERO,ZERO,total,List.of("NOT_EXCLUDED","UNMAPPED_CODE")));continue;}
            var checks=new ArrayList<String>();checks.add("NOT_EXCLUDED");checks.add("TARIFF_MAPPED");
            var tariff=decimal(tariffs.get(line.code()));
            var excess=money(line.unitPrice().subtract(tariff).max(ZERO).multiply(line.quantity()));
            if(excess.signum()>0) {adjustment=adjustment.add(excess);findings.add(new Finding(line.id(),"ABOVE_TARIFF","Precio por encima del tabulador contractual.","YELLOW",excess));}
            checks.add(excess.signum()>0?"ABOVE_TARIFF":"WITHIN_TARIFF");
            boolean quantityExceeded=max.containsKey(line.code())&&line.quantity().compareTo(decimal(max.get(line.code())))>0;
            if(quantityExceeded) findings.add(new Finding(line.id(),"QUANTITY_REVIEW","Cantidad superior al parámetro del convenio; requiere evidencia.","YELLOW",ZERO));
            checks.add(!max.containsKey(line.code())?"QUANTITY_LIMIT_NOT_CONFIGURED":quantityExceeded?"QUANTITY_REVIEW":"QUANTITY_WITHIN_LIMIT");
            String signature=line.code()+":"+line.quantity().stripTrailingZeros()+":"+line.unitPrice().stripTrailingZeros();
            boolean duplicate=!seen.add(signature);
            if(duplicate)findings.add(new Finding(line.id(),"POSSIBLE_DUPLICATE","Posible cargo duplicado; confirmar origen.","YELLOW",ZERO));
            checks.add(duplicate?"POSSIBLE_DUPLICATE":"NO_EQUAL_PRECEDING_CHARGE");
            traces.add(new LineTrace(line.id(),line.code(),false,total,tariff,total.subtract(excess),ZERO,excess,ZERO,List.copyOf(checks)));
        }
        if(rules==null)findings.add(new Finding(null,"NO_AGREEMENT","No hay convenio publicado vigente para la fecha de ingreso.","RED",billed));
        var eligible=billed.subtract(excluded).subtract(adjustment).subtract(uncertain).max(ZERO);
        BigDecimal deductible=ZERO,coinsurance=ZERO,insurer=ZERO,patient=ZERO,unresolved=excluded.add(uncertain),coinsuranceBeforeCap=ZERO,coverageGap=ZERO;
        boolean complete=policy!=null&&policy.deductible()!=null&&policy.coinsuranceRate()!=null&&policy.coinsuranceCap()!=null&&policy.coverageAvailable()!=null;
        if(!complete) {unresolved=unresolved.add(eligible);findings.add(new Finding(null,"POLICY_INCOMPLETE","Faltan parámetros confirmados de póliza; no se atribuyen importes al paciente.","YELLOW",eligible));}
        else {
            deductible=policy.deductible().min(eligible);
            var afterDeductible=eligible.subtract(deductible);
            coinsuranceBeforeCap=money(afterDeductible.multiply(policy.coinsuranceRate()));
            coinsurance=coinsuranceBeforeCap.min(policy.coinsuranceCap());
            var expectedInsurer=afterDeductible.subtract(coinsurance);
            insurer=expectedInsurer.min(policy.coverageAvailable());
            coverageGap=expectedInsurer.subtract(insurer);
            if(coverageGap.signum()>0) {unresolved=unresolved.add(coverageGap);findings.add(new Finding(null,"COVERAGE_LIMIT","La estimación supera la cobertura disponible; responsabilidad pendiente.","RED",coverageGap));}
            patient=deductible.add(coinsurance);
        }
        String lane=findings.stream().anyMatch(f->f.severity().equals("RED"))?"RED":findings.isEmpty()?"GREEN":"YELLOW";
        BigDecimal threshold=rules==null?null:rules.get("highRiskThreshold")==null?null:decimal(rules.get("highRiskThreshold"));
        boolean thresholdExceeded=threshold!=null&&adjustment.add(unresolved).compareTo(threshold)>0;
        if(thresholdExceeded)lane="RED";
        var financialTrace=new FinancialTrace(complete,money(eligible),money(deductible),money(coinsuranceBeforeCap),money(coinsurance),money(coverageGap),threshold,thresholdExceeded);
        return new Result(money(billed),money(excluded),money(adjustment),money(deductible),money(coinsurance),money(insurer),money(patient),money(unresolved),lane,List.copyOf(findings),agreementVersion,VERSION,List.copyOf(traces),financialTrace);
    }
    /** Identifies the actual loaded engine bytecode, including its nested value types. */
    public static String artifactSha256(){return ArtifactHash.VALUE;}
    private static final class ArtifactHash {
        private static final String VALUE=calculate();
        private static String calculate(){
            try {
                var digest=MessageDigest.getInstance("SHA-256");
                var classes=new ArrayList<Class<?>>();classes.add(RulesEngine.class);classes.addAll(List.of(RulesEngine.class.getDeclaredClasses()));
                classes.sort(Comparator.comparing(Class::getName));
                for(var type:classes){
                    String path="/"+type.getName().replace('.','/')+".class";
                    digest.update(path.getBytes(StandardCharsets.UTF_8));
                    try(var stream=type.getResourceAsStream(path)){if(stream==null)throw new IllegalStateException("Engine bytecode unavailable: "+path);digest.update(stream.readAllBytes());}
                }
                return HexFormat.of().formatHex(digest.digest());
            }catch(IOException|java.security.NoSuchAlgorithmException e){throw new IllegalStateException("Cannot identify engine bytecode",e);}
        }
    }
    private static Map<?,?> map(Object value){return value instanceof Map<?,?> map?map:Map.of();}
    private static BigDecimal decimal(Object value){return new BigDecimal(value.toString());}
    public static BigDecimal money(BigDecimal value){return value.setScale(2,RoundingMode.HALF_UP);}
}
