package mx.atlaslink.control;

import mx.atlaslink.identity.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

@Configuration
public class ControlConfiguration {
    @Bean TokenVerifier verifier(@Value("${atlas.identity-url}") String url){return new RemoteIdentity(url);}
}
