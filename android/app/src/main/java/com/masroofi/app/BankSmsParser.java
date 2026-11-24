package com.masroofi.app;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.*;

/** Intentionally narrow EGP debit parser. No balance, OTP, credit or FX guesses. */
public final class BankSmsParser {
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
