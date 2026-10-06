package mx.atlaslink.common;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class ApiErrors {
    private static final Logger log=LoggerFactory.getLogger(ApiErrors.class);
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> domain(ApiException e) { return ResponseEntity.status(e.status).body(Map.of("code",e.code,"message",e.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) { return domain(ApiException.bad("Revisa los campos obligatorios y sus límites.")); }
    @ExceptionHandler({HttpMessageNotReadableException.class,IllegalArgumentException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalid(Exception e) { return domain(ApiException.bad("El formato de la solicitud no es válido.")); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> size(Exception e) { return domain(new ApiException(413,"FILE_TOO_LARGE","El archivo supera el límite de 2 MB.")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> constraint(Exception e) { return domain(ApiException.conflict("La operación entra en conflicto con un registro existente o una regla de integridad.")); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> other(Exception e) { log.error("Request failed: {}",e.getClass().getSimpleName()); return ResponseEntity.internalServerError().body(Map.of("code","INTERNAL_ERROR","message","No pudimos completar la operación. Intenta nuevamente.")); }
}
