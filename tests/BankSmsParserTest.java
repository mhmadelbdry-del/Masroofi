package com.masroofi.app;
public class BankSmsParserTest {
  static int count = 0;
  static void check(String body, String amount) {
    java.math.BigDecimal actual = BankSmsParser.parse(body);
    if ((actual == null) != (amount == null) || (actual != null && actual.compareTo(new java.math.BigDecimal(amount)) != 0)) throw new AssertionError("Synthetic case " + count + " expected " + amount + " got " + actual);
    count++;
  }
  public static void main(String[] args) {
    check("خصم 125.50 جم من حساب ***0000 في 01/01 متجر تجريبي الرصيد المتاح جم 9999.00", "125.50");
    check("تم خصم ٢٥٠٫٧٥ ج.م من حساب تجريبي الرصيد المتاح ٤٠٠٠ جم", "250.75");
    check("Purchase of EGP 1,234.50 at TEST. Available balance EGP 9,999.00", "1234.50");
    check("You paid EGP 75.00 from your wallet at TEST", "75.00");
    check("تم دفع 45 جنيه من المحفظة لمتجر تجريبي", "45");
    check("تم شراء بمبلغ 80 جم الرصيد 900 جم", "80");
    check("Card debited EGP 60.00 balance EGP 400", "60");
    check("OTP 123456 for purchase EGP 40", null);
    check("تم تحويل 100 جم وتم خصم 100 جم", null);
    check("تم شحن المحفظة ودفع 100 جم", null);
    check("تم إيداع مبلغ 200 جم", null);
    check("Purchase EGP 200 declined", null);
    check("خصم 30 جم تم استرداد المبلغ", null);
    check("Purchase USD 10 EGP 500", null);
    check("Purchase EGP 0", null);
    check("Purchase EGP 1000001", null);
    check("Purchase EGP 1.234", null);
    check("Purchase EGP 1,23", null);
    check("Purchase EGP 50 and fee EGP 2", null);
    check("Balance EGP 50", null);
    check("تم خصم مبلغ غير معروف", null);
    check("عرض خصم 50 جم عند الشراء", null);
    check("Get a discount: purchase EGP 50", null);
    if (!BankSmsParser.needsReview("تم خصم مبلغ غير معروف")) throw new AssertionError("review");
    if (BankSmsParser.needsReview("تم تحويل 20 جم")) throw new AssertionError("transfer review");
    if (BankSmsParser.redact("خصم 22 جم حساب 0000").matches(".*[0-9].*")) throw new AssertionError("redaction");
    System.out.println("Parser synthetic cases passed: " + count + "; review and redaction checks passed");
  }
}
