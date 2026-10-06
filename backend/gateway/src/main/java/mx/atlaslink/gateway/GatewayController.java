package mx.atlaslink.gateway;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.*;
import mx.atlaslink.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class GatewayController {
    static final int MAX_BODY=2*1024*1024+65536;
    private final String identity,control,hospital;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
    public GatewayController(@Value("${atlas.identity-url}") String identity,@Value("${atlas.control-url}") String control,@Value("${atlas.hospital-url}") String hospital) {
        this.identity=base(identity);this.control=base(control);this.hospital=base(hospital);
    }
    private String base(String value){URI u=URI.create(value);if(!Set.of("http","https").contains(u.getScheme())||u.getHost()==null||u.getRawQuery()!=null||u.getUserInfo()!=null)throw new IllegalArgumentException("Invalid upstream URL");return value.replaceAll("/$","");}
    static String route(String path,String method) {
        if(path.contains("%")||path.contains(";")||path.contains("..")||path.contains("//"))throw ApiException.missing();
        String uuid="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
        if((method.equals("GET")&&Set.of("/api/auth/me","/api/auth/demo-profiles","/api/users").contains(path))
            ||(method.equals("POST")&&Set.of("/api/auth/login","/api/auth/logout","/api/users").contains(path))
            ||(method.equals("PATCH")&&path.matches("/api/users/"+uuid)))return "identity";
        if((method.equals("GET")&&Set.of("/api/tenants","/api/licenses","/api/leads").contains(path))
            ||(method.equals("POST")&&(Set.of("/api/tenants","/api/leads").contains(path)||path.matches("/api/tenants/"+uuid+"/administrator")))
            ||(method.equals("PATCH")&&path.matches("/api/licenses/"+uuid)))return "control";
        if((method.equals("GET")&&(Set.of("/api/dashboard","/api/accounts","/api/accounts/page","/api/accounts/report","/api/accounts/template","/api/insurers","/api/agreements","/api/agreements/template","/api/audit").contains(path)
                ||path.matches("/api/accounts/"+uuid+"(/export|/evaluations(/"+uuid+")?)?")))
            ||(method.equals("POST")&&(Set.of("/api/accounts","/api/accounts/import","/api/agreements","/api/agreements/preview","/api/agreements/import").contains(path)
                ||path.matches("/api/accounts/"+uuid+"/(claim|evaluate|ready|send|outcome)")||path.matches("/api/agreements/"+uuid+"/publish")))
            ||(method.equals("PATCH")&&path.matches("/api/accounts/"+uuid+"/lines/"+uuid)))return "hospital";
        throw ApiException.missing();
    }
    @RequestMapping("/api/**")
    public ResponseEntity<byte[]> forward(HttpServletRequest request)throws IOException {
        String target=switch(route(request.getRequestURI(),request.getMethod())){case "identity"->identity;case "control"->control;default->hospital;};
        if(request.getContentLengthLong()>MAX_BODY)throw new ApiException(413,"FILE_TOO_LARGE","La solicitud supera el límite permitido.");
        byte[] body=request.getInputStream().readNBytes(MAX_BODY+1);
        if(body.length>MAX_BODY)throw new ApiException(413,"FILE_TOO_LARGE","La solicitud supera el límite permitido.");
        String query=request.getQueryString();
        var upstream=HttpRequest.newBuilder(URI.create(target+request.getRequestURI()+(query==null?"":"?"+query)))
            .timeout(Duration.ofSeconds(25)).method(request.getMethod(),body.length==0?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofByteArray(body));
        for(String name:List.of("Authorization","Content-Type","Accept","Idempotency-Key")) {
            String value=request.getHeader(name);if(value!=null)upstream.header(name,value);
        }
        try {
            var response=http.send(upstream.build(),HttpResponse.BodyHandlers.ofByteArray());
            var headers=new HttpHeaders();headers.setCacheControl("no-store");
            for(String name:List.of("Content-Type","Content-Disposition","Retry-After"))response.headers().firstValue(name).ifPresent(value->headers.set(name,value));
            return ResponseEntity.status(response.statusCode()).headers(headers).body(response.body());
        }catch(HttpTimeoutException e){throw new ApiException(504,"SERVICE_TIMEOUT","El servicio tardó demasiado. Intenta nuevamente.");}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new ApiException(503,"SERVICE_UNAVAILABLE","La solicitud fue interrumpida. Intenta nuevamente.");}
        catch(IOException e){throw new ApiException(503,"SERVICE_UNAVAILABLE","El servicio no está disponible en este momento.");}
    }
    @RequestMapping({"/internal","/internal/**"}) public void internal(){throw ApiException.missing();}
}
