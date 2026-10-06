package mx.atlaslink.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import mx.atlaslink.identity.Actor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class IdentityController {
    private final IdentityService service;
    public IdentityController(IdentityService service) {this.service=service;}
    public record Login(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=72) String password) {}
    public record NewUser(@NotBlank @Size(max=160) String name,@NotBlank @Email @Size(max=254) String email,
                          @NotBlank @Size(max=24) String role,@NotBlank @Size(min=12,max=72) String password) {}
    public record ChangeUser(Boolean active,@Size(max=24) String role) {}
    public record Bootstrap(@NotNull UUID tenantId,@NotBlank @Size(max=160) String name,@NotBlank @Email @Size(max=254) String email,
                            @NotBlank @Size(min=12,max=72) String password) {}
    @GetMapping("/auth/demo-profiles") public Object demos(){return service.demoProfiles();}
    @PostMapping("/auth/login") public Object login(@Valid @RequestBody Login login,HttpServletRequest request){return service.login(login.email(),login.password(),request.getRemoteAddr());}
    @GetMapping("/auth/me") public Actor me(@AuthenticationPrincipal Actor actor){return actor;}
    @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Actor actor,@RequestHeader("Authorization") String auth){service.logout(actor,auth.substring(7));}
    @GetMapping("/users") public Object users(@AuthenticationPrincipal Actor actor){return service.users(actor);}
    @PostMapping("/users") @ResponseStatus(HttpStatus.CREATED)
    public Object create(@AuthenticationPrincipal Actor actor,@Valid @RequestBody NewUser user){return service.createUser(actor,user.name(),user.email(),user.role(),user.password());}
    @PatchMapping("/users/{id}") public Object update(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@Valid @RequestBody ChangeUser user){return service.updateUser(actor,id,user.active(),user.role());}
}
