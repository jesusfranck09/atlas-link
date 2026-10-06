package mx.atlaslink.hospital;

import java.io.*;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Local document generation. Never executes HTML, scripts or remote resources. */
@Service
public class PdfExportService {
    private final boolean demo;
    public PdfExportService(@Value("${atlas.demo-enabled:false}") boolean demo){this.demo=demo;}
    public byte[] export(Map<String,Object> account){
        try(var document=new PDDocument();var output=new ByteArrayOutputStream()){
            document.getDocumentInformation().setTitle("Atlas Link · Preauditoría "+value(account,"folio"));
            document.getDocumentInformation().setAuthor("Atlas Link");
            try(var writer=new Writer(document,demo)){
                writer.heading("Resumen de preauditoría");
                writer.line("Folio: "+value(account,"folio")+" | Referencia: "+value(account,"patientReference"));
                writer.line("Aseguradora: "+value(account,"insurer"));
                writer.line("Ingreso: "+value(account,"admissionDate")+" | Egreso: "+value(account,"dischargeDate"));
                writer.line("Estado: "+value(account,"status")+" | Carril: "+value(account,"lane"));
                writer.line("Estimación para revisión humana. No constituye autorización de pago ni formato oficial de una aseguradora.");
                if(account.get("evaluation") instanceof Map<?,?> evaluation){
                    writer.heading("Distribución estimada · MXN");
                    for(var entry:List.of(new String[]{"billedTotal","Total facturado"},new String[]{"tariffAdjustment","Ajuste contractual"},new String[]{"insurerEstimate","Estimación aseguradora"},new String[]{"patientEstimate","Estimación paciente"},new String[]{"unresolvedAmount","Responsabilidad pendiente"},new String[]{"excludedTotal","Exclusiones (incluidas en pendiente)"},new String[]{"deductible","Deducible (incluido en paciente)"},new String[]{"coinsurance","Coaseguro (incluido en paciente)"}))
                        writer.line(entry[1]+": "+amount(evaluation.get(entry[0])));
                    writer.line("Evaluación: "+value(evaluation,"id")+" | Convenio versión: "+value(evaluation,"agreementVersion")+" | Motor: "+value(evaluation,"engineVersion"));
                    writer.line("Evaluada: "+value(evaluation,"createdAt"));
                    if(evaluation.get("findings") instanceof List<?> findings&&!findings.isEmpty()){
                        writer.heading("Hallazgos de revisión");
                        for(Object object:findings)if(object instanceof Map<?,?> finding)writer.line(value(finding,"code")+" · "+value(finding,"message")+" | Importe: "+amount(finding.get("amount"))+" | Línea: "+value(finding,"lineId"));
                    }
                }
                writer.heading("Cargos y correcciones");
                if(account.get("lines") instanceof List<?> lines)for(Object object:lines)if(object instanceof Map<?,?> line){
                    writer.line(value(line,"code")+" · "+value(line,"description")+(Boolean.TRUE.equals(line.get("removed"))?" [RETIRADO]":""));
                    writer.line("Cantidad "+value(line,"quantity")+" × "+amount(line.get("unitPrice"))+" = "+amount(line.get("total"))+" | "+value(line,"status"));
                    if(line.get("justification")!=null)writer.line("Justificación: "+value(line,"justification"));
                }
            }
            document.save(output);return output.toByteArray();
        }catch(IOException e){throw new IllegalStateException("No se pudo generar el documento PDF.",e);}
    }
    private static String value(Map<?,?> map,String key){return Objects.toString(map.get(key),"—");}
    private static String amount(Object value){if(value==null)return "—";return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-MX")).format(new BigDecimal(value.toString()));}
    private static final class Writer implements AutoCloseable {
        private final PDDocument document;private final boolean demo;
        private final PDFont regular=new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private final PDFont bold=new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private PDPageContentStream stream;private float y;
        Writer(PDDocument document,boolean demo)throws IOException{this.document=document;this.demo=demo;newPage();}
        void newPage()throws IOException{
            if(stream!=null)stream.close();
            var page=new PDPage(PDRectangle.A4);document.addPage(page);stream=new PDPageContentStream(document,page);
            stream.setNonStrokingColor(24/255f,125/255f,112/255f);stream.addRect(42,782,30,30);stream.fill();
            text("A",bold,21,50,788);text("atlaslink.",bold,20,85,792);
            text(demo?"DEMOSTRACIÓN · DATOS SINTÉTICOS":"PREAUDITORÍA HOSPITALARIA",regular,8,42,765);
            text("Atlas Link · Documento de revisión · Página "+document.getNumberOfPages(),regular,8,42,28);y=733;
        }
        void heading(String text)throws IOException{y-=10;write(text,bold,14,20);y-=6;}
        void line(String text)throws IOException{write(text,regular,10,14);y-=4;}
        private void write(String input,PDFont font,float size,float leading)throws IOException{
            String safe=clean(input,font);var line=new StringBuilder();
            // Character wrapping also bounds unbroken ERP codes and long references.
            for(int i=0;i<safe.length();i++){
                char c=safe.charAt(i);String candidate=line.toString()+c;
                if(c=='\n'||font.getStringWidth(candidate)/1000*size>510){emit(line.toString(),font,size,leading);line.setLength(0);if(c=='\n')continue;}
                line.append(c);
            }
            if(!line.isEmpty())emit(line.toString(),font,size,leading);
        }
        private void emit(String value,PDFont font,float size,float leading)throws IOException{if(y<65)newPage();text(value,font,size,42,y);y-=leading;}
        private void text(String value,PDFont font,float size,float x,float baseline)throws IOException{
            stream.setNonStrokingColor(23/255f,52/255f,58/255f);stream.beginText();stream.setFont(font,size);stream.newLineAtOffset(x,baseline);stream.showText(clean(value,font));stream.endText();
        }
        private String clean(String value,PDFont font){var out=new StringBuilder();value.codePoints().forEach(cp->{if(cp=='\n'){out.append('\n');return;}if(Character.isISOControl(cp)){out.append(' ');return;}String ch=new String(Character.toChars(cp));try{font.getStringWidth(ch);out.append(ch);}catch(IllegalArgumentException|IOException e){out.append('?');}});return out.toString();}
        public void close()throws IOException{if(stream!=null)stream.close();}
    }
}
