package mx.atlaslink.common;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;

class JsonBodyLimitFilterTest {
    private final JsonBodyLimitFilter filter=new JsonBodyLimitFilter(new ObjectMapper());
    @Test void validJsonIsUnchanged() throws Exception {
        var request=new MockHttpServletRequest("POST","/api/accounts");
        byte[] body="{\"folio\":\"H-001\"}".getBytes(StandardCharsets.UTF_8);request.setContentType("application/json");request.setContent(body);
        var called=new AtomicBoolean();
        filter.doFilter(request,new MockHttpServletResponse(),(wrapped,response)->{
            assertThat(wrapped.getInputStream().readAllBytes()).isEqualTo(body);
            assertThat(wrapped.getContentLengthLong()).isEqualTo(body.length);called.set(true);
        });
        assertThat(called).isTrue();
    }
    @Test void oversizedDeclaredBodyNeverReachesController() throws Exception {
        var request=new MockHttpServletRequest("POST","/api/leads");request.setContentType("application/json");request.setContent(new byte[JsonBodyLimitFilter.MAX_BYTES+1]);
        var response=new MockHttpServletResponse();var called=new AtomicBoolean();
        filter.doFilter(request,response,(req,res)->called.set(true));
        assertThat(response.getStatus()).isEqualTo(413);assertThat(called).isFalse();assertThat(response.getContentAsString()).contains("PAYLOAD_TOO_LARGE");
    }
    @Test void chunkedJsonCannotBypassLimit() throws Exception {
        var request=new MockHttpServletRequest("POST","/api/accounts"){
            @Override public long getContentLengthLong(){return -1;}
            @Override public int getContentLength(){return -1;}
        };
        request.setContentType("application/json;charset=UTF-8");request.setContent(new byte[JsonBodyLimitFilter.MAX_BYTES+1]);
        var response=new MockHttpServletResponse();var called=new AtomicBoolean();
        filter.doFilter(request,response,(req,res)->called.set(true));
        assertThat(response.getStatus()).isEqualTo(413);assertThat(called).isFalse();
    }
    @Test void multipartUsesItsOwnServletLimits() throws Exception {
        var request=new MockHttpServletRequest("POST","/api/accounts/import");request.setContentType("multipart/form-data; boundary=abc");
        filter.doFilter(request,new MockHttpServletResponse(),(wrapped,response)->assertThat((HttpServletRequest)wrapped).isSameAs(request));
    }
}
