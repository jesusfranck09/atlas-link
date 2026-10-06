package mx.atlaslink.hospital;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record AccountInput(
  @NotBlank @Size(max=64) String folio,
  @NotBlank @Size(max=80) String patientReference,
  @NotNull UUID insurerId,
  @NotNull LocalDate admissionDate,
  @NotNull LocalDate dischargeDate,
  @Size(max=80) String policyNumber,
  @Size(max=20) String diagnosis,
  @Valid Policy policy,
  @NotEmpty @Size(max=1000) List<@NotNull @Valid Line> lines
) {
    public record Policy(@DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal deductible,
                         @DecimalMin("0") @DecimalMax("1") @Digits(integer=1,fraction=6) BigDecimal coinsuranceRate,
                         @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal coinsuranceCap,
                         @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal coverageAvailable) {}
    public record Line(@NotBlank @Size(max=40) String code,@NotBlank @Size(max=200) String description,
                       @NotBlank @Size(max=40) String category,@NotNull @DecimalMin("0.001") @Digits(integer=8,fraction=3) BigDecimal quantity,
                       @NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal unitPrice) {}
}
