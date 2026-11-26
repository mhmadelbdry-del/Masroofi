
import java.nio.file.*; import java.util.*; import java.util.regex.*; import java.math.BigDecimal;
public class Harness {
  static final String D="[0-9\\u0660-\\u0669\\u06f0-\\u06f9]";
  static final String CUR="(?:EGP|LE|E£|ج\\.?\\s?م\\.?|جنيه(?:ا|اً)?)";
  static final String N="(?:"+D+"{1,3}(?:[,\\u066c]"+D+"{3})+|"+D+"+)(?:[.\\u066b]"+D+"{1,2})?";
  static final String BAL="available|remaining|balance|الرصيد|رصيد|المتاح";
  static final String TEMP="(?:(?!"+BAL+").)";
  static final String NOTD="[0-9\\u0660-\\u0669\\u06f0-\\u06f9.,\\u066b\\u066c]";
  static final String MONEY="(?:"+CUR+"\\s*"+N+"(?!"+NOTD+")|(?<!"+NOTD+")"+N+"\\s*"+CUR+")";
  static final String DEBIT="(?:\\b(?:purchase|purchased|paid|payment of|debited|spent)\\b|(?:تم\\s+)?(?:خصم|دفع)|شراء)";
  static final String EXCL="(?:\\b(?:otp|verification|declined|failed|reversed|reversal|refunded|refund|credited|received|deposit|withdrawal|transfer|top.?up|recharge|cash.?in|due|outstanding|offer|discount|cashback|promotion|bonus)\\b|رمز|كود|تحقق|مرفوض|فشل|إلغاء|الغاء|استرداد|إيداع|ايداع|إضافة|اضافة|تحويل|سحب|شحن|تغذية|مستحق|خصومات|عرض|عروض|استمتع|وفر|توفير|كاش\\s*باك)";
  static final String FX="(?:\\b(?:USD|EUR|GBP|SAR|AED)\\b|دولار|يورو|ريال|درهم)";
  static final String TRIGGER="(?is)^(?=.*"+DEBIT+")(?!.*"+EXCL+")(?!.*"+FX+")(?="+TEMP+"*?"+MONEY+")(?!"+TEMP+"*?"+MONEY+TEMP+"*?"+MONEY+").*$";
  static final String EXA="(?is)^"+TEMP+"*?"+CUR+"\\s*("+N+")(?!"+NOTD+")";
  static final String EXB="(?is)^"+TEMP+"*?(?<!"+NOTD+")("+N+")\\s*"+CUR;
  static String g1(String re,String s){Matcher m=Pattern.compile(re).matcher(s);return m.find()?m.group(1):"";}
  static String pipeline(String s){
    if(!Pattern.compile(TRIGGER).matcher(s).matches()) return null;
    String a=g1(EXA,s), b=g1(EXB,s); String amt=a+b; if(amt.isEmpty())return null;
    return amt;
  }
  static String norm(String t){return BankSmsParser.normalize(t).replace(",","");}
  public static void main(String[] x) throws Exception {
    if(x.length>0&&x[0].equals("print")){System.out.println("TRIGGER\t"+TRIGGER);System.out.println("EXA\t"+EXA);System.out.println("EXB\t"+EXB);return;}
    List<String> c=new ArrayList<>(Files.readAllLines(Paths.get("corpus.txt")));
    int bad=0,n=0;
    for(String s:c){ if(s.isBlank()||s.startsWith("#"))continue; n++;
      BigDecimal o=BankSmsParser.parse(s); String p=pipeline(s); String pn=p==null?null:new BigDecimal(norm(p)).stripTrailingZeros().toPlainString();
      String on=o==null?null:o.stripTrailingZeros().toPlainString();
      boolean ok=Objects.equals(on,pn); if(!ok)bad++;
      System.out.println((ok?"OK   ":"DIFF ")+"oracle="+on+" macro="+pn+" raw="+p+"  | "+s);
    }
    System.out.println("cases="+n+" mismatches="+bad);
  }
}




/** Intentionally narrow EGP debit parser. No balance, OTP, credit or FX guesses. */
final class BankSmsParser {
    private static final String N = "(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\\.[0-9]{1,2})?";
    private static final Pattern MONEY = Pattern.compile("(?:EGP|LE|E£|ج\\.?\\s?م\\.?|جنيه(?:ا|اً)?)\\s*(" + N + ")(?![0-9.,])|(?<![0-9.,])(" + N + ")\\s*(?:EGP|LE|E£|ج\\.?\\s?م\\.?|جنيه(?:ا|اً)?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern DEBIT = Pattern.compile("\\b(purchase|purchased|paid|payment of|debited|spent)\\b|(?:تم\\s+)?(?:خصم|دفع)|شراء", Pattern.CASE_INSENSITIVE);
    private static final Pattern EXCLUDE = Pattern.compile("\\b(otp|verification|declined|failed|reversed|reversal|refunded|refund|credited|received|deposit|withdrawal|transfer|top.?up|recharge|cash.?in|due|outstanding|offer|discount|cashback|promotion|bonus)\\b|رمز|كود|تحقق|مرفوض|فشل|إلغاء|الغاء|استرداد|إيداع|ايداع|إضافة|اضافة|تحويل|سحب|شحن|تغذية|مستحق|خصومات|عرض|عروض|استمتع|وفر|توفير|كاش\\s*باك", Pattern.CASE_INSENSITIVE);
    public static BigDecimal parse(String body) {
        if (body == null || body.length() > 5000) return null;
        String s = normalize(body);
        if (EXCLUDE.matcher(s).find() || !DEBIT.matcher(s).find()) return null;
        if (Pattern.compile("(?i)\\b(USD|EUR|GBP|SAR|AED)\\b|دولار|يورو|ريال|درهم").matcher(s).find()) return null;
        // Ignore balance sections, but never select a number from one.
        s = s.split("(?i)available|remaining|balance|الرصيد|رصيد|المتاح", 2)[0];
        Matcher m = MONEY.matcher(s);
        if (!m.find()) return null;
        String value = m.group(1) != null ? m.group(1) : m.group(2);
        if (m.find()) return null; // More than one pre-balance amount is ambiguous.
        try {
            BigDecimal amount = new BigDecimal(value.replace(",", ""));
            return amount.signum() > 0 && amount.compareTo(new BigDecimal("1000000")) <= 0 ? amount : null;
        } catch (NumberFormatException e) { return null; }
    }
    public static boolean needsReview(String body) {
        if (body == null || body.length() > 5000) return false;
        String text = normalize(body);
        return !EXCLUDE.matcher(text).find() && DEBIT.matcher(text).find();
    }
    public static String redact(String text) {
        return normalize(text).replaceAll("[0-9]+(?:[.,/:-][0-9]+)*", "#").substring(0, Math.min(normalize(text).replaceAll("[0-9]+(?:[.,/:-][0-9]+)*", "#").length(), 600));
    }
    static String normalize(String text) {
        StringBuilder s = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (c >= '٠' && c <= '٩') c = (char) ('0' + c - '٠');
            if (c >= '۰' && c <= '۹') c = (char) ('0' + c - '۰');
            if (c == '٫') c = '.';
            if (c == '٬') c = ',';
            if (c != '\u200f' && c != '\u200e') s.append(c);
        }
        return s.toString().replace('\u00a0', ' ');
    }
}
