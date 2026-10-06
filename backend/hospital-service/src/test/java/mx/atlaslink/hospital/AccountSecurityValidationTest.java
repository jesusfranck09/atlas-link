package mx.atlaslink.hospital;

import static org.assertj.core.api.Assertions.*;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import mx.atlaslink.common.*;
import org.junit.jupiter.api.Test;

class AccountSecurityValidationTest {
    @Test void nullChargeRejectedByBeanValidation(){
        var input=new AccountInput("F-1","P-1",UUID.randomUUID(),LocalDate.now(),LocalDate.now(),null,null,null,Arrays.asList((AccountInput.Line)null));
        try(var factory=Validation.buildDefaultValidatorFactory()){
            assertThat(factory.getValidator().validate(input)).anySatisfy(v->assertThat(v.getPropertyPath().toString()).startsWith("lines[0]"));
        }
    }
    @Test void correctionCannotStrandAccountOutsideNumericRange(){
        assertThatThrownBy(()->AccountService.validateCorrectedTotal(new BigDecimal("999999999990.00"),new BigDecimal("2"),new BigDecimal("10.00"),false)).isInstanceOf(ApiException.class);
        assertThatCode(()->AccountService.validateCorrectedTotal(new BigDecimal("999999999990.00"),new BigDecimal("2"),new BigDecimal("10.00"),true)).doesNotThrowAnyException();
    }
    @Test void removedLineStillMustFitItsGeneratedSqlAmount(){
        assertThatThrownBy(()->AccountService.validateCorrectedTotal(BigDecimal.ZERO,new BigDecimal("99999999"),new BigDecimal("9999999999.99"),true)).isInstanceOf(ApiException.class);
    }
    @Test void removedFlagCannotSilentlyInterpretStringFalseAsRestoringLine(){
        assertThatThrownBy(()->Input.bool(Map.of("removed","true"),"removed",true)).isInstanceOf(ApiException.class);
        assertThat(Input.bool(Map.of("removed",false),"removed",true)).isFalse();
    }
}
