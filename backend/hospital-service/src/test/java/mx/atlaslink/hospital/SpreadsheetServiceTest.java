package mx.atlaslink.hospital;

import static org.assertj.core.api.Assertions.*;
import java.io.*;
import java.util.*;
import mx.atlaslink.common.ApiException;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class SpreadsheetServiceTest {
    private final SpreadsheetService sheets=new SpreadsheetService();
    private final UUID insurer=UUID.randomUUID();
    @Test void generatedTemplateCanBeImported(){
        var file=new MockMultipartFile("file","template.xlsx","application/octet-stream",sheets.template());
        var parsed=sheets.parse(file,List.of(Map.of("id",insurer,"code","AUREA")));assertThat(parsed.insurerId()).isEqualTo(insurer);assertThat(parsed.lines()).hasSize(1);assertThat(parsed.policy().coinsuranceRate()).isEqualByComparingTo("0.1");
    }
    @Test void formulaCellsAreRejectedWithoutEvaluation() throws Exception {
        byte[] malicious;try(var book=new XSSFWorkbook(new ByteArrayInputStream(sheets.template()));var out=new ByteArrayOutputStream()){book.getSheetAt(0).getRow(1).getCell(10).setCellFormula("1+1");book.write(out);malicious=out.toByteArray();}
        var file=new MockMultipartFile("file","formula.xlsx","application/octet-stream",malicious);assertThatThrownBy(()->sheets.parse(file,List.of(Map.of("id",insurer,"code","AUREA")))).isInstanceOf(ApiException.class).hasMessageContaining("fórmulas");
    }
    @Test void csvEscapesSpreadsheetInjection(){
        var account=Map.<String,Object>of("folio","=DANGEROUS()","patientReference","safe","lines",List.of(Map.of("code","LAB","description","+formula","quantity",1,"unitPrice",1,"total",1)));
        String csv=new String(sheets.export(account,"csv"),java.nio.charset.StandardCharsets.UTF_8);assertThat(csv).contains("\"'=DANGEROUS()\"").contains("\"'+formula\"");
    }
    @Test void multipleAccountsAreRejectedAtomically() throws Exception {
        byte[] invalid;try(var book=new XSSFWorkbook(new ByteArrayInputStream(sheets.template()));var out=new ByteArrayOutputStream()){var sheet=book.getSheetAt(0);sheet.copyRows(1,1,2,new org.apache.poi.ss.usermodel.CellCopyPolicy());sheet.getRow(2).getCell(0).setCellValue("OTHER");book.write(out);invalid=out.toByteArray();}
        var file=new MockMultipartFile("file","batch.xlsx","application/octet-stream",invalid);assertThatThrownBy(()->sheets.parse(file,List.of(Map.of("id",insurer,"code","AUREA")))) .isInstanceOf(ApiException.class).hasMessageContaining("coincidir");
    }
    @Test void aggregateZipExpansionRejectedBeforeWorkbookParsing() throws Exception {
        byte[] archive;
        try(var out=new ByteArrayOutputStream();var zip=new java.util.zip.ZipOutputStream(out)){
            // Each entry is below the 10 MB POI ceiling; their sum breaches our 12 MB budget.
            for(int i=0;i<3;i++){zip.putNextEntry(new java.util.zip.ZipEntry("part-"+i));zip.write(new byte[5*1024*1024]);zip.closeEntry();}
            zip.finish();archive=out.toByteArray();
        }
        assertThat(archive.length).isLessThan(SpreadsheetService.MAX_FILE_BYTES);
        var file=new MockMultipartFile("file","expansion.xlsx","application/octet-stream",archive);
        assertThatThrownBy(()->sheets.parse(file,List.of())).isInstanceOf(ApiException.class).hasMessageContaining("descomprimido");
    }
    @Test void hiddenExtraFormulaIsRejected() throws Exception {
        byte[] malicious;
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(sheets.template()));var out=new ByteArrayOutputStream()){
            var sheet=book.getSheetAt(0);sheet.getRow(1).createCell(18).setCellFormula("1+1");sheet.setColumnHidden(18,true);book.write(out);malicious=out.toByteArray();
        }
        var file=new MockMultipartFile("file","hidden.xlsx","application/octet-stream",malicious);
        assertThatThrownBy(()->sheets.parse(file,List.of(Map.of("id",insurer,"code","AUREA")))) .isInstanceOf(ApiException.class).hasMessageContaining("fórmulas");
    }
    @Test void csvNeutralizesPrefixesAfterWhitespaceAndEscapesQuotes(){
        for(String payload:List.of(" =HYPERLINK(\"https://example.invalid\")","\t+123","\r@SUM(1)","\n-1","-1")){
            var account=Map.<String,Object>of("folio",payload,"lines",List.of(Map.of("code","A")));
            String csv=new String(sheets.export(account,"csv"),java.nio.charset.StandardCharsets.UTF_8);
            assertThat(csv).contains("\"'"+payload.replace("\"","\"\"")+"\"");
        }
    }
}
