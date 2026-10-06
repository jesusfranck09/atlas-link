package mx.atlaslink.gateway;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import javax.sql.DataSource;
import mx.atlaslink.identity.TokenVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes=AtlasGatewayApplication.class,webEnvironment=SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class GatewayApplicationContextTest {
    @Autowired ApplicationContext context;
    @Autowired MockMvc http;
    @Test void gatewayHasOneSecurityChainAndNoGeneratedIdentityOrDatabase(){
        assertThat(context.getBeansOfType(SecurityFilterChain.class)).containsOnlyKeys("gatewayFilterChain");
        assertThat(context.getBeansOfType(UserDetailsService.class)).isEmpty();
        assertThat(context.getBeansOfType(TokenVerifier.class)).isEmpty();
        assertThat(context.getBeansOfType(DataSource.class)).isEmpty();
    }
    @Test void healthAndInternalDenyWorkInRealApplicationContext() throws Exception {
        http.perform(get("/actuator/health")).andExpect(status().isOk());
        http.perform(get("/internal/entitlement")).andExpect(status().isNotFound());
    }
}
