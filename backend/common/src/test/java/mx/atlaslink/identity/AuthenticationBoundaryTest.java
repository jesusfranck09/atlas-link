package mx.atlaslink.identity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@SpringJUnitWebConfig(AuthenticationBoundaryTest.Config.class)
class AuthenticationBoundaryTest {
    @Configuration @EnableWebMvc @EnableWebSecurity @Import(SecurityConfiguration.class)
    static class Config {
        @Bean ObjectMapper json(){return new ObjectMapper();}
        @Bean TokenVerifier verifier(){return token->{
            if(token.equals("identity-down"))throw new IllegalStateException("Remote unavailable");
            return token.equals("valid")?new Actor(UUID.randomUUID(),UUID.randomUUID(),"Reviewer","test@example.invalid","REVIEWER","Synthetic"):null;
        };}
        @Bean Endpoint endpoint(){return new Endpoint();}
    }
    @RestController static class Endpoint {
        @GetMapping("/api/accounts") String account(){return "authorized";}
        @PostMapping("/api/leads") String lead(@RequestBody String content){return "received";}
    }
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    @BeforeEach void configure(){mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();}
    @Test void missingTokenAndClientRoleCannotAuthenticate() throws Exception {
        mvc.perform(get("/api/accounts").header("X-Role","PLATFORM_ADMIN").header("X-Tenant-Id",UUID.randomUUID())).andExpect(status().isUnauthorized());
    }
    @Test void unavailableIdentityFailsClosed() throws Exception {
        mvc.perform(get("/api/accounts").header("Authorization","Bearer identity-down")).andExpect(status().isUnauthorized());
    }
    @Test void validTokenDoesNotLeakIntoNextRequest() throws Exception {
        mvc.perform(get("/api/accounts").header("Authorization","Bearer valid")).andExpect(status().isOk());
        mvc.perform(get("/api/accounts").header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
    }
    @Test void publicLeadStillHasBodyLimit() throws Exception {
        mvc.perform(post("/api/leads").contentType(MediaType.APPLICATION_JSON).content(new byte[1024*1024+1])).andExpect(status().isPayloadTooLarge());
    }
}
