package mx.atlaslink.control;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
import java.util.*;
import mx.atlaslink.common.ApiException;
import mx.atlaslink.identity.Actor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class ControlController {
    private final ControlService service;
    private final CommercialUsage usage;
    public ControlController(ControlService service, CommercialUsage usage){this.service=service;this.usage=usage;}
    public record Administrator(@NotBlank @Size(max=160) String name,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=12,max=72) String password) {}
    public record NewTenant(@NotBlank @Size(max=160) String name,@NotBlank @Size(max=80) @Pattern(regexp="^[a-z0-9][a-z0-9-]*$") String slug,@Valid Administrator admin) {}
    public record LicenseChange(@NotNull @PositiveOrZero Long version,@NotBlank @Size(max=80) String plan,
        @NotNull @Pattern(regexp="TRIAL|ACTIVE|SUSPENDED|EXPIRED") String status,@NotNull @Min(1) @Max(10000000) Integer monthlyAccountLimit,
        @NotNull @Min(1) @Max(100000) Integer seatLimit,@NotNull OffsetDateTime expiresAt) {}
    public record Lead(@NotBlank @Size(max=160) String name,@NotBlank @Email @Size(max=254) String email,
        @NotBlank @Size(max=200) String organization,@NotBlank @Size(max=3000) String message,@NotNull @AssertTrue Boolean consent) {}
    @GetMapping("/api/tenants") public Object tenants(@AuthenticationPrincipal Actor actor){return usage.tenants(actor,service.tenants(actor));}
    @PostMapping("/api/tenants") @ResponseStatus(HttpStatus.CREATED)
    public Object create(@AuthenticationPrincipal Actor actor,@Valid @RequestBody NewTenant tenant) {
        var result=service.createTenant(actor,tenant.name(),tenant.slug());
        if(tenant.admin()!=null) {
            try {service.provision(actor,(UUID)result.get("id"),tenant.admin());result.put("provisioning",Map.of("status","READY"));}
            catch(ApiException e){result.put("provisioning",Map.of("status","PENDING","message",e.getMessage()));}
        }else result.put("provisioning",Map.of("status","PENDING","message","Da de alta al administrador para habilitar el acceso del hospital."));
        return result;
    }
    @PostMapping("/api/tenants/{id}/administrator") public Object administrator(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@Valid @RequestBody Administrator admin) {
        service.tenant(actor,id);return service.provision(actor,id,admin);
    }
    @GetMapping("/api/licenses") public Object licenses(@AuthenticationPrincipal Actor actor){return usage.licenses(actor,service.licenses(actor));}
    @PatchMapping("/api/licenses/{id}") public Object license(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@Valid @RequestBody LicenseChange change){return service.updateLicense(actor,id,change);}
    @GetMapping("/api/leads") public Object leads(@AuthenticationPrincipal Actor actor){return service.leads(actor);}
    @PostMapping("/api/leads") @ResponseStatus(HttpStatus.CREATED)
    public Object lead(@Valid @RequestBody Lead input,HttpServletRequest request){return service.lead(input,request.getRemoteAddr());}
    @GetMapping("/internal/entitlement") public Object entitlement(@AuthenticationPrincipal Actor actor,@RequestHeader(value="X-Internal-Key",required=false) String key){service.internal(key);return service.entitlement(actor);}
    @GetMapping("/internal/platform-summary") public Object summary(@AuthenticationPrincipal Actor actor,@RequestHeader(value="X-Internal-Key",required=false) String key){service.internal(key);return service.summary(actor);}
    @GetMapping("/internal/tenants/{id}") public Object tenant(@AuthenticationPrincipal Actor actor,@RequestHeader(value="X-Internal-Key",required=false) String key,@PathVariable UUID id){service.internal(key);return service.tenant(actor,id);}
}
