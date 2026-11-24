package com.masroofi.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import org.json.*;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class BankSmsReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
        try {
            JSONObject config = BankSmsStore.config(context);
            if (!config.optBoolean("enabled")) return;
            SmsMessage[] parts = Telephony.Sms.Intents.getMessagesFromIntent(intent);
            if (parts == null || parts.length == 0) return;
            String sender = parts[0].getOriginatingAddress();
            JSONArray allowed = config.optJSONArray("senders"); boolean matched = false;
            if (sender == null || allowed == null) return;
            for (int i = 0; i < allowed.length(); i++) if (sender.equalsIgnoreCase(allowed.getString(i).trim())) matched = true;
            if (!matched) return;
            StringBuilder body = new StringBuilder();
            for (SmsMessage part : parts) {
                if (!sender.equalsIgnoreCase(part.getOriginatingAddress())) return;
                body.append(part.getMessageBody());
            }
            BigDecimal amount = BankSmsParser.parse(body.toString());
            if (amount == null && !BankSmsParser.needsReview(body.toString())) return;
            long timestamp = parts[0].getTimestampMillis();
            if (timestamp < config.optLong("enabledAt")) return;
            JSONObject entry = new JSONObject();
            entry.put("id", BankSmsStore.hash(sender.toUpperCase(java.util.Locale.ROOT) + "|" + timestamp + "|" + body));
            entry.put("amount", amount == null ? "" : amount.toPlainString());
            entry.put("review", amount == null);
            if (amount == null) entry.put("preview", BankSmsParser.redact(body.toString()));
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
            dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
            entry.put("occurredAt", dateFormat.format(new Date(timestamp)));
            entry.put("categoryId", config.getString("categoryId"));
            entry.put("ownerKey", config.getString("ownerKey"));
            if (BankSmsStore.enqueue(context, entry)) notifySaved(context);
        } catch (Exception ignored) { BankSmsStore.error(context); }
    }
    private static void notifySaved(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel("bank_sms", "رسائل البنك", NotificationManager.IMPORTANCE_DEFAULT));
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return;
        PendingIntent pending = PendingIntent.getActivity(context, 41, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, "bank_sms") : new Notification.Builder(context);
        manager.notify(41, builder.setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("مصاريف: عملية بنكية جديدة").setContentText("حُفظت على الجهاز. افتح التطبيق لمزامنتها مع دفتر المصروفات.")
            .setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(pending).setAutoCancel(true).build());
    }
}
