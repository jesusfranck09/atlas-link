package mx.atlaslink.auth;

import jakarta.validation.Valid;
import mx.atlaslink.identity.Actor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class BootstrapController {
    private final IdentityService service;
    public BootstrapController(IdentityService service){this.service=service;}
    @PostMapping("/internal/tenant-admin")
    public Object bootstrap(@AuthenticationPrincipal Actor actor,@RequestHeader(value="X-Internal-Key",required=false) String key,
                            @Valid @RequestBody IdentityController.Bootstrap admin) {
        return service.bootstrap(actor,key,admin.tenantId(),admin.name(),admin.email(),admin.password());
    }
}
