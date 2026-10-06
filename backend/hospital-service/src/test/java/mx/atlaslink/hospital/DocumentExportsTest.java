package mx.atlaslink.hospital;

import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DocumentExportsTest {
    @Test void pdfContainsFinancialMeaningAndNeverEmbeddedScripts()throws Exception{
        var account=new HashMap<String,Object>();account.put("folio","QA-PDF-001");account.put("patientReference","PAC-SINTÉTICO");account.put("insurer","Áurea Demo");
        account.put("evaluation",Map.of("billedTotal",1000,"tariffAdjustment",100,"insurerEstimate",600,"patientEstimate",200,"unresolvedAmount",100,"deductible",100,"coinsurance",100,"excludedTotal",100,"findings",List.of(Map.of("code","EXCLUDED","message","Responsabilidad por confirmar","amount",100))));
        account.put("lines",List.of(Map.of("code","HAB-DIA","description","Habitación 😀","quantity",1,"unitPrice",1000,"total",1000,"status","FLAGGED")));
        byte[] bytes=new PdfExportService(true).export(account);
        assertTrue(new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).startsWith("%PDF-"));
        try(var pdf=Loader.loadPDF(bytes)){
            String text=new PDFTextStripper().getText(pdf);assertTrue(text.contains("QA-PDF-001"));assertTrue(text.contains("Responsabilidad pendiente"));assertTrue(text.contains("No constituye autorización de pago"));assertTrue(text.contains("DATOS SINTÉTICOS"));assertTrue(text.contains("Habitación"));
            assertNull(pdf.getDocumentCatalog().getOpenAction());assertNull(pdf.getDocumentCatalog().getNames());
        }
    }
    @Test void longAccountsPaginateWithoutTruncatingLastLine()throws Exception{
        var lines=new ArrayList<Map<String,Object>>();for(int i=0;i<160;i++)lines.add(Map.of("code","COD-"+i,"description","Descripción larga ".repeat(10),"quantity",1,"unitPrice",1,"total",1));
        try(var pdf=Loader.loadPDF(new PdfExportService(false).export(Map.of("folio","LARGA","lines",lines)))){assertTrue(pdf.getNumberOfPages()>2);String text=new PDFTextStripper().getText(pdf);assertTrue(text.contains("COD-159"));assertFalse(text.contains("DATOS SINTÉTICOS"));}
    }
}
