package com.masroofi.app;

import android.Manifest;
import android.content.pm.PackageManager;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.*;

@CapacitorPlugin(name = "BankSms", permissions = {
    @Permission(alias = "sms", strings = {Manifest.permission.RECEIVE_SMS}),
    @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class BankSmsPlugin extends Plugin {
    @PluginMethod public void requestAccess(PluginCall call) { requestPermissionForAlias("sms", call, "smsResult"); }
    @PermissionCallback private void smsResult(PluginCall call) {
        JSObject result = new JSObject(); result.put("granted", getPermissionState("sms") == PermissionState.GRANTED); call.resolve(result);
    }
    @PluginMethod public void requestNotifications(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 33) { call.resolve(); return; }
        requestPermissionForAlias("notifications", call, "notificationsResult");
    }
    @PermissionCallback private void notificationsResult(PluginCall call) { call.resolve(); }
    @PluginMethod public void getStatus(PluginCall call) {
        try {
            JSONObject cfg = BankSmsStore.config(getContext());
            JSObject out = new JSObject(cfg.toString());
            out.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
            out.put("pending", BankSmsStore.queue(getContext()).length());
            out.put("storageWarning", BankSmsStore.hasError(getContext())); call.resolve(out);
        } catch (Exception e) { call.reject("Cannot read bank SMS settings or queue"); }
    }
    @PluginMethod public void configure(PluginCall call) {
        try {
            if (getPermissionState("sms") != PermissionState.GRANTED) { call.reject("SMS permission required"); return; }
            JSArray senders = call.getArray("senders"); String owner = call.getString("ownerKey"), category = call.getString("categoryId");
            if (senders == null || senders.length() == 0 || senders.length() > 20 || owner == null || owner.length() > 300 || category == null || !category.matches("[a-fA-F0-9-]{36}")) { call.reject("Invalid settings"); return; }
            for (int i = 0; i < senders.length(); i++) {
                String sender = senders.getString(i).trim();
                if (sender.length() == 0 || sender.length() > 40 || sender.contains("*")) { call.reject("Enter exact bank sender ids"); return; }
            }
            JSONObject cfg = new JSONObject(); cfg.put("enabled", true); cfg.put("senders", senders); cfg.put("ownerKey", owner); cfg.put("categoryId", category);
            JSONObject old = BankSmsStore.config(getContext());
            cfg.put("enabledAt", old.optString("ownerKey").equals(owner) && old.optBoolean("enabled") ? old.optLong("enabledAt") : System.currentTimeMillis());
            BankSmsStore.configure(getContext(), cfg); call.resolve();
        } catch (Exception e) { call.reject("Cannot save settings. Check for transactions belonging to another account."); }
    }
    @PluginMethod public void getPending(PluginCall call) {
        try {
            String owner = call.getString("ownerKey", "");
            if (!BankSmsStore.config(getContext()).optString("ownerKey").equals(owner)) { call.reject("Account mismatch"); return; }
            JSObject out = new JSObject(); out.put("entries", BankSmsStore.queue(getContext())); call.resolve(out);
        } catch (Exception e) { call.reject("Cannot read pending transactions"); }
    }
    @PluginMethod public void acknowledge(PluginCall call) {
        try { BankSmsStore.acknowledge(getContext(), call.getString("ownerKey", ""), call.getString("id", "")); call.resolve(); }
        catch (Exception e) { call.reject("Cannot confirm transaction sync"); }
    }
    @PluginMethod public void disable(PluginCall call) {
        try { BankSmsStore.disable(getContext()); call.resolve(); }
        catch (Exception e) { call.reject("Cannot clear SMS data"); }
    }
}
