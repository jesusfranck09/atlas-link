package mx.atlaslink.hospital;

import mx.atlaslink.common.ApiException;
import java.io.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.zip.ZipInputStream;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SpreadsheetService {
    static final int MAX_FILE_BYTES=2*1024*1024;
    static final long MAX_EXPANDED_BYTES=12*1024*1024;
    public static final String[] COLUMNS={"folio","patientReference","insurerCode","admissionDate","dischargeDate","policyNumber","diagnosis","code","description","category","quantity","unitPrice","deductible","coinsuranceRate","coinsuranceCap","coverageAvailable"};
    public SpreadsheetService(){ZipSecureFile.setMinInflateRatio(.02);ZipSecureFile.setMaxEntrySize(10*1024*1024);ZipSecureFile.setMaxTextSize(10*1024*1024);ZipSecureFile.setMaxFileCount(100);}
    public AccountInput parse(MultipartFile file,List<Map<String,Object>> insurers){
        String name=Objects.toString(file.getOriginalFilename(),"");
        if(!name.toLowerCase(Locale.ROOT).endsWith(".xlsx")||file.isEmpty()||file.getSize()>MAX_FILE_BYTES)throw ApiException.bad("Carga un archivo .xlsx de hasta 2 MB.");
        // Validate aggregate expansion before POI allocates the workbook object graph.
        // Per-entry POI limits alone do not bound the sum of all package parts.
        byte[] bytes=boundedPackage(file);
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))){
            if(book.getNumberOfSheets()!=1)throw ApiException.bad("La plantilla admite una hoja y una cuenta.");
            var sheet=book.getSheetAt(0);if(sheet.getLastRowNum()<1||sheet.getLastRowNum()>1000)throw ApiException.bad("La hoja debe contener entre1 y1000 cargos.");
            for(Row row:sheet)for(Cell cell:row){
                if(cell.getCellType()==CellType.FORMULA)throw ApiException.bad("La plantilla no admite fórmulas.");
                if(cell.getColumnIndex()>=COLUMNS.length&&cell.getCellType()!=CellType.BLANK)throw ApiException.bad("La plantilla no admite columnas adicionales.");
            }
            var headers=sheet.getRow(0);for(int col=0;col<COLUMNS.length;col++)if(!COLUMNS[col].equals(text(headers,col)))throw ApiException.bad("Columna "+(col+1)+": se esperaba "+COLUMNS[col]+".");
            var first=sheet.getRow(1);var insurerCode=required(first,2,2);UUID insurerId=insurers.stream().filter(i->insurerCode.equals(i.get("code"))).findFirst().map(i->UUID.fromString(i.get("id").toString())).orElseThrow(()->ApiException.bad("Fila2: código de aseguradora desconocido."));
            String folio=required(first,0,2),patient=required(first,1,2);LocalDate admission=date(first,3),discharge=date(first,4);
            var policy=new AccountInput.Policy(decimal(first,12,false),decimal(first,13,false),decimal(first,14,false),decimal(first,15,false));
            var lines=new ArrayList<AccountInput.Line>();
            for(int i=1;i<=sheet.getLastRowNum();i++){
                Row row=sheet.getRow(i);if(row==null)throw ApiException.bad("Fila "+(i+1)+": fila vacía.");
                for(int col:new int[]{0,1,2,3,4,5,6,12,13,14,15})if(!text(first,col).equals(text(row,col)))throw ApiException.bad("Fila "+(i+1)+", "+COLUMNS[col]+": debe coincidir con el encabezado de la cuenta.");
                lines.add(new AccountInput.Line(required(row,7,i+1),required(row,8,i+1),required(row,9,i+1),decimal(row,10,true),decimal(row,11,true)));
            }
            return new AccountInput(folio,patient,insurerId,admission,discharge,emptyNull(text(first,5)),emptyNull(text(first,6)),policy,lines);
        }catch(ApiException e){throw e;}catch(Exception e){throw ApiException.bad("El archivo no es una plantilla XLSX válida o excede los límites de lectura.");}
    }
    byte[] boundedPackage(MultipartFile file){
        try(var input=file.getInputStream()){
            byte[] bytes=input.readNBytes(MAX_FILE_BYTES+1);
            if(bytes.length>MAX_FILE_BYTES)throw ApiException.bad("Carga un archivo .xlsx de hasta 2 MB.");
            var names=new HashSet<String>();long expanded=0;
            try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))){
                byte[] buffer=new byte[8192];
                for(var entry=zip.getNextEntry();entry!=null;entry=zip.getNextEntry()){
                    if(!names.add(entry.getName())||names.size()>100)throw ApiException.bad("El archivo XLSX excede los límites de estructura.");
                    for(int count=zip.read(buffer);count!=-1;count=zip.read(buffer)){
                        expanded+=count;
                        if(expanded>MAX_EXPANDED_BYTES)throw ApiException.bad("El archivo XLSX excede el límite de contenido descomprimido.");
                    }
                }
            }
            if(!names.contains("[Content_Types].xml")||!names.contains("xl/workbook.xml"))throw ApiException.bad("El archivo no es una plantilla XLSX válida.");
            return bytes;
        }catch(ApiException e){throw e;}catch(IOException e){throw ApiException.bad("El archivo no es una plantilla XLSX válida.");}
    }
    public byte[] template(){
        try(var book=new XSSFWorkbook();var output=new ByteArrayOutputStream()){
            var sheet=book.createSheet("Cuenta");var row=sheet.createRow(0);for(int i=0;i<COLUMNS.length;i++)row.createCell(i).setCellValue(COLUMNS[i]);
            String[] values={"DEMO-NUEVA-001","PAC-SINTETICO-001","AUREA","2026-09-20","2026-09-22","POL-DEMO-001","Z00.0","HAB-DIA","Habitación estándar","ESTANCIA","2","4500","1000","0.10","5000","500000"};
            var example=sheet.createRow(1);for(int i=0;i<values.length;i++){var cell=example.createCell(i);if(i>=10)cell.setCellValue(new BigDecimal(values[i]).doubleValue());else cell.setCellValue(values[i]);}
            var font=book.createFont();font.setBold(true);var style=book.createCellStyle();style.setFont(font);style.setFillForegroundColor(IndexedColors.LIGHT_TURQUOISE.getIndex());style.setFillPattern(FillPatternType.SOLID_FOREGROUND);for(var cell:row)cell.setCellStyle(style);sheet.createFreezePane(0,1);for(int i=0;i<COLUMNS.length;i++)sheet.setColumnWidth(i,Math.max(15,COLUMNS[i].length()+2)*256);book.write(output);return output.toByteArray();
        }catch(IOException e){throw new IllegalStateException(e);}
    }
    public byte[] export(Map<String,Object> account,String format){
        String[] headers={"Folio","Referencia seudónima","Código","Descripción","Categoría","Cantidad","Precio unitario MXN","Total MXN","Estado","Justificación"};
        Object linesObject=account.get("lines");if(!(linesObject instanceof List<?> lines))throw new IllegalStateException("Missing lines");
        var rows=new ArrayList<List<String>>();rows.add(List.of(headers));
        for(Object obj:lines){if(!(obj instanceof Map<?,?> line)||Boolean.TRUE.equals(line.get("removed")))continue;rows.add(List.of(value(account,"folio"),value(account,"patientReference"),value(line,"code"),value(line,"description"),value(line,"category"),value(line,"quantity"),value(line,"unitPrice"),value(line,"total"),value(line,"status"),value(line,"justification")));}
        if(format.equals("csv")){var out=new StringBuilder("\uFEFF");for(var row:rows){out.append(row.stream().map(SpreadsheetService::csv).reduce((a,b)->a+","+b).orElse("")).append("\r\n");}return out.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);}
        if(!format.equals("xlsx"))throw ApiException.bad("Formato admitido: csv o xlsx.");
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var sheet=book.createSheet("Preauditoría demo");int index=0;for(var data:rows){var row=sheet.createRow(index++);for(int i=0;i<data.size();i++)row.createCell(i).setCellValue(data.get(i));}sheet.createFreezePane(0,1);for(int i=0;i<headers.length;i++)sheet.setColumnWidth(i,24*256);
            var notice=book.createSheet("Alcance");notice.createRow(0).createCell(0).setCellValue("Preauditoría estimada. No constituye autorización de pago ni formato oficial de una aseguradora.");notice.createRow(1).createCell(0).setCellValue("Importes en MXN. Datos de demostración. El hospital realiza el envío externo.");book.write(out);return out.toByteArray();
        }catch(IOException e){throw new IllegalStateException(e);}
    }
    private static String value(Map<?,?> map,String key){return Objects.toString(map.get(key),"");}
    private static String csv(String value){String stripped=value.stripLeading();String safe=(!stripped.isEmpty()&&"=+@-".indexOf(stripped.charAt(0))>=0)||value.startsWith("\t")||value.startsWith("\r")?"'"+value:value;return "\""+safe.replace("\"","\"\"")+"\"";}
    private static String text(Row row,int column){if(row==null)return "";Cell cell=row.getCell(column);if(cell==null)return "";if(cell.getCellType()==CellType.FORMULA)throw ApiException.bad("No se permiten fórmulas en la plantilla.");if(cell.getCellType()==CellType.NUMERIC)return org.apache.poi.ss.util.NumberToTextConverter.toText(cell.getNumericCellValue());return new DataFormatter(Locale.ROOT).formatCellValue(cell).strip();}
    private static String required(Row row,int column,int number){var value=text(row,column);if(value.isBlank()||value.length()>200)throw ApiException.bad("Fila "+number+", "+COLUMNS[column]+": valor obligatorio o demasiado largo.");return value;}
    private static BigDecimal decimal(Row row,int column,boolean required){String value=text(row,column);if(value.isBlank()&&!required)return null;try{return new BigDecimal(value);}catch(Exception e){throw ApiException.bad("Fila "+(row.getRowNum()+1)+", "+COLUMNS[column]+": debe ser un decimal.");}}
    private static LocalDate date(Row row,int column){try{return LocalDate.parse(text(row,column));}catch(Exception e){throw ApiException.bad("Fila2, "+COLUMNS[column]+": usa YYYY-MM-DD.");}}
    private static String emptyNull(String value){return value.isBlank()?null:value;}
}
