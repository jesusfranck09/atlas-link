package mx.atlaslink.gateway;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import mx.atlaslink.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.assertj.core.api.Assertions.*;

class GatewayControllerTest {
    @Test void blocksInternalAndAmbiguousPaths(){
        for(String path:new String[]{"/internal/entitlement","/api/internal/entitlement","/api/../internal","/api/auth/%6de","/api//auth/me","/api/auth/me;x=1"})
            assertThatThrownBy(()->GatewayController.route(path,"GET")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->GatewayController.route("/api/users","DELETE")).isInstanceOf(ApiException.class);
    }
    @Test void routesOnlyContractEndpoints(){
        assertThat(GatewayController.route("/api/auth/me","GET")).isEqualTo("identity");
        assertThat(GatewayController.route("/api/leads","POST")).isEqualTo("control");
        assertThat(GatewayController.route("/api/accounts/import","POST")).isEqualTo("hospital");
        assertThat(GatewayController.route("/api/tenants/11111111-1111-1111-1111-111111111111/administrator","POST")).isEqualTo("control");
        assertThat(GatewayController.route("/api/agreements/preview","POST")).isEqualTo("hospital");
        assertThat(GatewayController.route("/api/accounts/page","GET")).isEqualTo("hospital");
        assertThat(GatewayController.route("/api/accounts/report","GET")).isEqualTo("hospital");
        assertThat(GatewayController.route("/api/accounts/11111111-1111-1111-1111-111111111111/evaluations/22222222-2222-2222-2222-222222222222","GET")).isEqualTo("hospital");
        assertThatThrownBy(()->GatewayController.route("/api/accounts/11111111-1111-1111-1111-111111111111/evaluations","POST")).isInstanceOf(ApiException.class);
    }
    @Test void preservesMultipartBytesAndDropsInternalHeaders()throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var observed=new AtomicReference<String>();var internal=new AtomicReference<String>();var auth=new AtomicReference<String>();
        server.createContext("/api/accounts/import",exchange->{
            observed.set(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
            internal.set(exchange.getRequestHeaders().getFirst("X-Internal-Key"));auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] answer="{\"ok\":true}".getBytes(StandardCharsets.UTF_8);exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(201,answer.length);exchange.getResponseBody().write(answer);exchange.close();
        });server.start();
        try {
            String base="http://127.0.0.1:"+server.getAddress().getPort();var gateway=new GatewayController(base,base,base);
            var request=new MockHttpServletRequest("POST","/api/accounts/import");request.setContentType("multipart/form-data; boundary=atlas");
            request.setContent("--atlas\r\nfile bytes\r\n--atlas--".getBytes(StandardCharsets.UTF_8));request.addHeader("Authorization","Bearer demo");request.addHeader("X-Internal-Key","forged");
            var result=gateway.forward(request);
            assertThat(result.getStatusCode().value()).isEqualTo(201);assertThat(observed.get()).isEqualTo("--atlas\r\nfile bytes\r\n--atlas--");
            assertThat(internal.get()).isNull();assertThat(auth.get()).isEqualTo("Bearer demo");assertThat(result.getHeaders().getCacheControl()).isEqualTo("no-store");
        }finally{server.stop(0);}
    }
    @Test void oversizedBodiesRejectedBeforeConnecting(){
        var gateway=new GatewayController("http://127.0.0.1:1","http://127.0.0.1:1","http://127.0.0.1:1");
        var request=new MockHttpServletRequest("POST","/api/accounts/import");request.setContent(new byte[GatewayController.MAX_BODY+1]);
        assertThatThrownBy(()->gateway.forward(request)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(413);
    }
}
