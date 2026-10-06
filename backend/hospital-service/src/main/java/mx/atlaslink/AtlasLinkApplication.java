package mx.atlaslink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude=UserDetailsServiceAutoConfiguration.class)
public class AtlasLinkApplication {
    public static void main(String[] args) { SpringApplication.run(AtlasLinkApplication.class, args); }
}
