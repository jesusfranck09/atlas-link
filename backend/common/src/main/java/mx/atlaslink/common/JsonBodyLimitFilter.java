package mx.atlaslink.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.web.filter.OncePerRequestFilter;

/** Enforces the JSON byte budget even when Content-Length is absent (chunked HTTP). */
public final class JsonBodyLimitFilter extends OncePerRequestFilter {
    static final int MAX_BYTES=1024*1024;
    private final ObjectMapper json;
    public JsonBodyLimitFilter(ObjectMapper json){this.json=json;}

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String type=request.getContentType();
        return type==null||!type.toLowerCase(Locale.ROOT).contains("json");
    }

    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws IOException,ServletException {
        if(request.getContentLengthLong()>MAX_BYTES){reject(response);return;}
        byte[] bytes=request.getInputStream().readNBytes(MAX_BYTES+1);
        if(bytes.length>MAX_BYTES){reject(response);return;}
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public int getContentLength(){return bytes.length;}
            @Override public long getContentLengthLong(){return bytes.length;}
            @Override public ServletInputStream getInputStream(){
                var input=new ByteArrayInputStream(bytes);
                return new ServletInputStream(){
                    @Override public int read(){return input.read();}
                    @Override public int read(byte[] target,int offset,int length){return input.read(target,offset,length);}
                    @Override public boolean isFinished(){return input.available()==0;}
                    @Override public boolean isReady(){return true;}
                    @Override public void setReadListener(ReadListener listener){throw new IllegalStateException("Synchronous JSON input only");}
                };
            }
            @Override public BufferedReader getReader(){return new BufferedReader(new InputStreamReader(getInputStream(),StandardCharsets.UTF_8));}
        },response);
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(413);response.setContentType("application/json");
        json.writeValue(response.getOutputStream(),Map.of("code","PAYLOAD_TOO_LARGE","message","La solicitud JSON supera el límite de 1 MB."));
    }
}
