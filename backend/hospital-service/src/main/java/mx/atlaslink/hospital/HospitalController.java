package mx.atlaslink.hospital;

import mx.atlaslink.common.*;
import mx.atlaslink.identity.Actor;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class HospitalController {
    private final AccountService accounts;
    private final AgreementService agreements;
    private final SpreadsheetService spreadsheets;
    private final Validator validator;
    private final PdfExportService pdf;
    public HospitalController(AccountService accounts,AgreementService agreements,SpreadsheetService spreadsheets,Validator validator,PdfExportService pdf){this.accounts=accounts;this.agreements=agreements;this.spreadsheets=spreadsheets;this.validator=validator;this.pdf=pdf;}
    @GetMapping("/dashboard") Object dashboard(@AuthenticationPrincipal Actor actor){return accounts.dashboard(actor);}
    @GetMapping("/accounts") Object list(@AuthenticationPrincipal Actor actor,@RequestParam(required=false) String status,@RequestParam(required=false) String lane,@RequestParam(required=false) String search){return accounts.list(actor,status,lane,search);}
    @GetMapping("/accounts/page") Object page(@AuthenticationPrincipal Actor actor,@RequestParam(required=false) String status,@RequestParam(required=false) String lane,@RequestParam(required=false) String search,@RequestParam(defaultValue="0") int offset,@RequestParam(defaultValue="25") int limit){return accounts.page(actor,status,lane,search,offset,limit);}
    @GetMapping("/accounts/report") Object report(@AuthenticationPrincipal Actor actor,@RequestParam(required=false) String from,@RequestParam(required=false) String to,@RequestParam(required=false) UUID insurerId){return accounts.report(actor,from,to,insurerId);}
    @GetMapping("/accounts/{id}") Object detail(@AuthenticationPrincipal Actor actor,@PathVariable UUID id){return accounts.detail(actor,id);}
    @GetMapping("/accounts/{id}/evaluations") Object evaluations(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestParam(defaultValue="0") int offset,@RequestParam(defaultValue="50") int limit){return accounts.evaluations(actor,id,offset,limit);}
    @GetMapping("/accounts/{id}/evaluations/{evaluationId}") Object evaluation(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@PathVariable UUID evaluationId){return accounts.evaluation(actor,id,evaluationId);}
    @GetMapping("/insurers") Object insurers(@AuthenticationPrincipal Actor actor){return accounts.insurers(actor);}
    @PostMapping("/accounts") Object create(@AuthenticationPrincipal Actor actor,@Valid @RequestBody AccountInput input,@RequestHeader(value="Idempotency-Key",required=false) String key){return accounts.create(actor,input,key);}
    @PostMapping("/accounts/{id}/claim") Object claim(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestBody Map<String,Object> input){return accounts.claim(actor,id,Input.version(input));}
    @PostMapping("/accounts/{id}/evaluate") Object evaluate(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestBody Map<String,Object> input){return accounts.evaluate(actor,id,Input.version(input));}
    @PatchMapping("/accounts/{id}/lines/{lineId}") Object correct(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@PathVariable UUID lineId,@RequestBody Map<String,Object> input){return accounts.correct(actor,id,lineId,input);}
    @PostMapping("/accounts/{id}/ready") Object ready(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestBody Map<String,Object> input){return accounts.ready(actor,id,input);}
    @PostMapping("/accounts/{id}/send") Object send(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestBody Map<String,Object> input){return accounts.send(actor,id,Input.version(input));}
    @PostMapping("/accounts/{id}/outcome") Object outcome(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestBody Map<String,Object> input){return accounts.outcome(actor,id,input);}
    @GetMapping("/accounts/{id}/export") ResponseEntity<byte[]> export(@AuthenticationPrincipal Actor actor,@PathVariable UUID id,@RequestParam(defaultValue="xlsx") String format){var account=accounts.exportData(actor,id);return download(format.equals("pdf")?pdf.export(account):spreadsheets.export(account,format),"atlas-"+id+"."+format,format);}
    @GetMapping("/accounts/template") ResponseEntity<byte[]> template(@AuthenticationPrincipal Actor actor){actor.require("HOSPITAL_ADMIN","BILLING","REVIEWER");return download(spreadsheets.template(),"atlas-link-plantilla.xlsx","xlsx");}
    @PostMapping(value="/accounts/import",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) Object upload(@AuthenticationPrincipal Actor actor,@RequestPart("file") MultipartFile file,@RequestHeader(value="Idempotency-Key",required=false) String key){actor.require("HOSPITAL_ADMIN","BILLING","REVIEWER");var input=spreadsheets.parse(file,accounts.insurers(actor));if(!validator.validate(input).isEmpty())throw ApiException.bad("La plantilla contiene campos fuera de los límites permitidos; revisa cantidades, póliza y precios.");return accounts.create(actor,input,key);}
    @GetMapping("/agreements") Object agreements(@AuthenticationPrincipal Actor actor){return agreements.list(actor);}
    @PostMapping("/agreements") Object agreement(@AuthenticationPrincipal Actor actor,@RequestBody Map<String,Object> input){return agreements.create(actor,input);}
    @PostMapping("/agreements/{id}/publish") Object publish(@AuthenticationPrincipal Actor actor,@PathVariable UUID id){return agreements.publish(actor,id);}
    @GetMapping("/audit") Object audit(@AuthenticationPrincipal Actor actor){return accounts.audit(actor);}
    private ResponseEntity<byte[]> download(byte[] bytes,String filename,String format){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(filename).build().toString()).header(HttpHeaders.CACHE_CONTROL,"no-store").contentType(MediaType.parseMediaType(format.equals("pdf")?"application/pdf":format.equals("csv")?"text/csv;charset=UTF-8":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(bytes);}
}
