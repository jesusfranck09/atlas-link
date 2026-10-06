package mx.atlaslink.gateway;

import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class GatewaySecurity {
    @Bean SecurityFilterChain gatewayFilterChain(HttpSecurity http)throws Exception {
        // Browser credentials are bearer tokens; cookies are never forwarded to services.
        return http.csrf(c->c.disable()).cors(c->c.disable()).requestCache(c->c.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.anyRequest().permitAll()).build();
    }
}
