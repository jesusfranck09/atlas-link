package mx.atlaslink.hospital;

import mx.atlaslink.common.ApiException;
import java.io.*;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Stateless preview. Reparse the exact confirmed workbook before transactional create. */
@Service
public class AgreementSpreadsheetService {
    private static final String[] COLUMNS={"code","unitPrice","maxQuantity","excluded"};
    private final SpreadsheetService safety;
    public AgreementSpreadsheetService(SpreadsheetService safety){this.safety=safety;}
    public record Issue(int row,String column,String message){}
    public record Preview(boolean valid,String checksum,int rowCount,List<Issue> errors,Map<String,Object> rules,List<Map<String,Object>> sample){}
    public Preview preview(MultipartFile file){
        if(!Objects.toString(file.getOriginalFilename(),"").toLowerCase(Locale.ROOT).endsWith(".xlsx")||file.isEmpty()||file.getSize()>SpreadsheetService.MAX_FILE_BYTES)throw ApiException.bad("Carga un tabulador .xlsx de hasta 2 MB.");
        byte[] bytes=safety.boundedPackage(file);
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))){
            if(book.getNumberOfSheets()!=1)throw ApiException.bad("El tabulador debe tener una sola hoja.");
            var sheet=book.getSheetAt(0);int count=sheet.getLastRowNum();
            if(count<1||count>1000)throw ApiException.bad("El tabulador admite entre 1 y 1000 conceptos.");
            var issues=new ArrayList<Issue>();
            for(Row row:sheet)for(Cell cell:row){
                if(cell.getCellType()==CellType.FORMULA)issue(issues,row.getRowNum()+1,cell.getColumnIndex()<4?COLUMNS[cell.getColumnIndex()]:"extra","No se permiten fórmulas.");
                if(cell.getColumnIndex()>=4&&cell.getCellType()!=CellType.BLANK)issue(issues,row.getRowNum()+1,"extra","No se permiten columnas adicionales.");
            }
            for(int c=0;c<4;c++)if(!COLUMNS[c].equals(text(sheet.getRow(0),c)))issue(issues,1,COLUMNS[c],"Encabezado esperado: "+COLUMNS[c]+".");
            var tariffs=new LinkedHashMap<String,BigDecimal>();var quantities=new LinkedHashMap<String,BigDecimal>();var excluded=new ArrayList<String>();var sample=new ArrayList<Map<String,Object>>();
            for(int r=1;r<=count;r++){
                var row=sheet.getRow(r);String code=text(row,0).toUpperCase(Locale.ROOT);
                int before=issues.size();
                if(!code.matches("[A-Z0-9_.-]{1,40}"))issue(issues,r+1,"code","Código obligatorio, máximo 40 caracteres: letras, números, punto, guion o guion bajo.");
                if(tariffs.containsKey(code))issue(issues,r+1,"code","Código repetido en el tabulador.");
                BigDecimal price=decimal(text(row,1),false,2,r+1,"unitPrice",issues);
                String maximum=text(row,2);BigDecimal quantity=maximum.isBlank()?null:decimal(maximum,true,3,r+1,"maxQuantity",issues);
                String flag=text(row,3).toLowerCase(Locale.ROOT);boolean isExcluded="true".equals(flag);
                if(!Set.of("","true","false").contains(flag))issue(issues,r+1,"excluded","Usa TRUE o FALSE; vacío equivale a FALSE.");
                if(issues.size()==before&&price!=null){
                    tariffs.put(code,price);if(quantity!=null)quantities.put(code,quantity);if(isExcluded)excluded.add(code);
                    if(sample.size()<12){var entry=new LinkedHashMap<String,Object>();entry.put("code",code);entry.put("unitPrice",price);entry.put("maxQuantity",quantity);entry.put("excluded",isExcluded);sample.add(entry);}
                }
            }
            Map<String,Object> rules=Map.of("tariffs",tariffs,"maxQuantities",quantities,"excludedCodes",excluded);
            return new Preview(issues.isEmpty(),HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)),count,List.copyOf(issues),rules,List.copyOf(sample));
        }catch(ApiException e){throw e;}catch(Exception e){throw ApiException.bad("El tabulador no es un XLSX válido o excede los límites de lectura.");}
    }
    public byte[] template(){
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var sheet=book.createSheet("Tabulador");var header=sheet.createRow(0);var style=book.createCellStyle();var font=book.createFont();font.setBold(true);style.setFont(font);style.setFillForegroundColor(IndexedColors.LIGHT_TURQUOISE.getIndex());style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            for(int c=0;c<4;c++){var cell=header.createCell(c);cell.setCellValue(COLUMNS[c]);cell.setCellStyle(style);sheet.setColumnWidth(c,24*256);}
            var row=sheet.createRow(1);row.createCell(0).setCellValue("HAB-DIA");row.createCell(1).setCellValue(4500);row.createCell(2).setCellValue(10);row.createCell(3).setCellValue(false);sheet.createFreezePane(0,1);book.write(out);return out.toByteArray();
        }catch(IOException e){throw new IllegalStateException(e);}
    }
    private static void issue(List<Issue> errors,int row,String column,String message){if(errors.size()<100)errors.add(new Issue(row,column,message));}
    private static BigDecimal decimal(String value,boolean positive,int scale,int row,String column,List<Issue> errors){try{var number=new BigDecimal(value);if(number.scale()>scale||number.signum()<0||(positive&&number.signum()==0)||number.compareTo(new BigDecimal("9999999999.99"))>0)throw new NumberFormatException();return number;}catch(Exception e){issue(errors,row,column,"Decimal "+(positive?"positivo":"no negativo")+", máximo "+scale+" decimales y 9999999999.99.");return null;}}
    private static String text(Row row,int c){if(row==null||row.getCell(c)==null)return "";var cell=row.getCell(c);if(cell.getCellType()==CellType.FORMULA)return "";if(cell.getCellType()==CellType.NUMERIC)return org.apache.poi.ss.util.NumberToTextConverter.toText(cell.getNumericCellValue());return new DataFormatter(Locale.ROOT).formatCellValue(cell).strip();}
}
