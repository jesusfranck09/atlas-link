package mx.atlaslink.identity;

import java.time.Duration;
import java.net.http.HttpClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.*;

public final class RemoteIdentity implements TokenVerifier {
    private final RestClient client;
    public RemoteIdentity(String identityUrl) { client=client(identityUrl); }
    public static RestClient client(String url) {
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build());
        factory.setReadTimeout(Duration.ofSeconds(3));
        return RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }
    @Override public Actor verify(String token) { return client.get().uri("/api/auth/me").header("Authorization","Bearer "+token).retrieve().body(Actor.class); }
    public static String authorization() { return ((ServletRequestAttributes)RequestContextHolder.currentRequestAttributes()).getRequest().getHeader("Authorization"); }
}
