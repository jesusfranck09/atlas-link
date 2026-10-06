package mx.atlaslink.hospital;

import mx.atlaslink.common.ApiException;
import mx.atlaslink.identity.Actor;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/agreements")
public class AgreementImportController {
    private final AgreementSpreadsheetService spreadsheets;private final AgreementService agreements;private final AccountService accounts;
    public AgreementImportController(AgreementSpreadsheetService spreadsheets,AgreementService agreements,AccountService accounts){this.spreadsheets=spreadsheets;this.agreements=agreements;this.accounts=accounts;}
    @GetMapping("/template") ResponseEntity<byte[]> template(@AuthenticationPrincipal Actor actor){actor.require("HOSPITAL_ADMIN");return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).header(HttpHeaders.CACHE_CONTROL,"no-store").header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=atlas-link-tabulador.xlsx").body(spreadsheets.template());}
    @PostMapping(value="/preview",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) Object preview(@AuthenticationPrincipal Actor actor,@RequestPart("file") MultipartFile file){actor.require("HOSPITAL_ADMIN");accounts.requireActiveLicense(actor);return spreadsheets.preview(file);}
    @PostMapping(value="/import",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) Object upload(@AuthenticationPrincipal Actor actor,@RequestPart("file") MultipartFile file,@RequestParam String name,@RequestParam String insurerId,@RequestParam String validFrom,@RequestParam String validTo,@RequestParam String expectedHash,@RequestParam(required=false) String highRiskThreshold){
        actor.require("HOSPITAL_ADMIN");accounts.requireActiveLicense(actor);var preview=spreadsheets.preview(file);
        if(!preview.valid())throw ApiException.bad("El tabulador contiene errores; revisa la vista previa. No se guardó ningún concepto.");
        if(!preview.checksum().equals(expectedHash))throw ApiException.conflict("El archivo cambió después de la vista previa. Vuelve a revisarlo antes de confirmar.");
        var rules=new LinkedHashMap<String,Object>(preview.rules());
        if(highRiskThreshold!=null&&!highRiskThreshold.isBlank()){if(highRiskThreshold.length()>32)throw ApiException.bad("Umbral de revisión inválido.");try{rules.put("highRiskThreshold",new BigDecimal(highRiskThreshold));}catch(NumberFormatException e){throw ApiException.bad("Umbral de revisión inválido.");}}
        return agreements.create(actor,Map.of("name",name,"insurerId",insurerId,"validFrom",validFrom,"validTo",validTo,"rules",rules));
    }
}
