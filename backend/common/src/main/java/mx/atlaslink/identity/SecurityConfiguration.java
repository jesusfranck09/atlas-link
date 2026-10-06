package mx.atlaslink.identity;

import com.fasterxml.jackson.databind.ObjectMapper;
import mx.atlaslink.common.JsonBodyLimitFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfiguration {
    @Bean SecurityFilterChain security(HttpSecurity http,TokenVerifier verifier,ObjectMapper json) throws Exception {
        http.csrf(csrf->csrf.disable()).cors(cors->cors.disable())
          .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
          .authorizeHttpRequests(auth->auth.requestMatchers("/api/auth/login","/api/auth/demo-profiles","/actuator/health").permitAll()
              .requestMatchers(org.springframework.http.HttpMethod.POST,"/api/leads").permitAll().anyRequest().authenticated())
          .exceptionHandling(errors->errors.authenticationEntryPoint((request,response,error)-> {
              response.setStatus(401); response.setContentType("application/json"); json.writeValue(response.getOutputStream(),Map.of("code","UNAUTHENTICATED","message","Inicia sesión para continuar."));
          }).accessDeniedHandler((request,response,error)-> {
              response.setStatus(403);response.setContentType("application/json"); json.writeValue(response.getOutputStream(),Map.of("code","FORBIDDEN","message","Tu perfil no tiene permiso para esta operación."));
          }))
          .addFilterBefore(new JsonBodyLimitFilter(json),UsernamePasswordAuthenticationFilter.class)
          .addFilterBefore(new OncePerRequestFilter() {
              @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
                  String auth=request.getHeader("Authorization");
                  if(auth!=null && auth.startsWith("Bearer ") && auth.length()<512) {
                      try { Actor actor=verifier.verify(auth.substring(7)); if(actor!=null) SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor,null,List.of(new SimpleGrantedAuthority("ROLE_"+actor.role())))); }
                      catch(Exception ignored) { SecurityContextHolder.clearContext(); }
                  }
                  chain.doFilter(request,response);
              }
          },UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
