package mx.atlaslink.hospital;

import java.io.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;

class AgreementSpreadsheetTest {
    private final AgreementSpreadsheetService spreadsheets=new AgreementSpreadsheetService(new SpreadsheetService());
    private MockMultipartFile file(byte[] bytes){return new MockMultipartFile("file","tabulador.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes);}
    @Test void templateHasStableHashAndValidTypedRules(){
        byte[] bytes=spreadsheets.template();var preview=spreadsheets.preview(file(bytes));assertTrue(preview.valid());assertEquals(1,preview.rowCount());assertTrue(preview.errors().isEmpty());assertEquals(64,preview.checksum().length());assertEquals(preview.checksum(),spreadsheets.preview(file(bytes)).checksum());AgreementService.validateRules(preview.rules());
    }
    @Test void reportsDuplicateAndInvalidPrecisionByRowWithoutAcceptingPartialData()throws Exception{
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(spreadsheets.template()));var out=new ByteArrayOutputStream()){
            var row=book.getSheetAt(0).createRow(2);row.createCell(0).setCellValue("HAB-DIA");row.createCell(1).setCellValue("3.14159");row.createCell(3).setCellValue("maybe");book.write(out);
            var preview=spreadsheets.preview(file(out.toByteArray()));assertFalse(preview.valid());assertTrue(preview.errors().stream().anyMatch(e->e.row()==3&&e.column().equals("code")));assertTrue(preview.errors().stream().anyMatch(e->e.row()==3&&e.column().equals("unitPrice")));assertTrue(preview.errors().stream().anyMatch(e->e.column().equals("excluded")));
        }
    }
    @Test void formulasOutsideVisibleColumnsAreRejected()throws Exception{
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(spreadsheets.template()));var out=new ByteArrayOutputStream()){
            var sheet=book.getSheetAt(0);sheet.getRow(1).createCell(8).setCellFormula("1+1");sheet.setColumnHidden(8,true);book.write(out);var preview=spreadsheets.preview(file(out.toByteArray()));assertFalse(preview.valid());assertTrue(preview.errors().stream().anyMatch(e->e.message().contains("fórmulas")));
        }
    }
}
