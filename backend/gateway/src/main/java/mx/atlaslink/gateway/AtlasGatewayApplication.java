package mx.atlaslink.gateway;

import mx.atlaslink.common.ApiErrors;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.context.annotation.Import;

@Import(ApiErrors.class)
@SpringBootApplication(exclude={DataSourceAutoConfiguration.class,FlywayAutoConfiguration.class,UserDetailsServiceAutoConfiguration.class})
public class AtlasGatewayApplication {
    public static void main(String[] args){SpringApplication.run(AtlasGatewayApplication.class,args);}
}
