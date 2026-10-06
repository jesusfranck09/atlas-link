package mx.atlaslink.hospital;

import mx.atlaslink.identity.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

@Configuration
public class HospitalConfiguration {
    @Bean TokenVerifier tokens(@Value("${atlas.identity-url:http://127.0.0.1:8091}") String url) { return new RemoteIdentity(url); }
}
