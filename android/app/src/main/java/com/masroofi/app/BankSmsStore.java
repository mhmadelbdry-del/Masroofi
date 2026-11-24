package com.masroofi.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** Private encrypted queue. Raw SMS bodies and account/card numbers are never persisted. */
final class BankSmsStore {
    private static final String ALIAS = "raqeeb-bank-sms-v1";
    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences("bank_sms", Context.MODE_PRIVATE); }
    static synchronized JSONObject config(Context c) throws JSONException { return new JSONObject(prefs(c).getString("config", "{}")); }
    static synchronized JSONArray queue(Context c) throws Exception {
        String value = prefs(c).getString("queue", "");
        if (value.isEmpty()) return new JSONArray();
        String[] parts = value.split(":");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
        return new JSONArray(new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8));
    }
    private static javax.crypto.SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if (ks.containsAlias(ALIAS)) return (javax.crypto.SecretKey) ks.getKey(ALIAS, null);
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return gen.generateKey();
    }
    private static void saveQueue(Context c, JSONArray q) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        String value = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(q.toString().getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        if (!prefs(c).edit().putString("queue", value).commit()) throw new Exception("Storage unavailable");
    }
    static synchronized void configure(Context c, JSONObject config) throws Exception {
        JSONObject old = config(c);
        if (!old.optString("ownerKey").equals(config.optString("ownerKey")) && queue(c).length() > 0) throw new Exception("Pending transactions belong to another account. Disable and clear them first.");
        if (!prefs(c).edit().putString("config", config.toString()).commit()) throw new Exception("Storage unavailable");
    }
    static synchronized boolean enqueue(Context c, JSONObject entry) throws Exception {
        JSONArray q = queue(c);
        for (int i = 0; i < q.length(); i++) if (q.getJSONObject(i).getString("id").equals(entry.getString("id"))) return false;
        if (q.length() >= 500) { prefs(c).edit().putBoolean("overflow", true).commit(); return false; }
        q.put(entry); saveQueue(c, q); return true;
    }
    static synchronized void acknowledge(Context c, String ownerKey, String id) throws Exception {
        if (!config(c).optString("ownerKey").equals(ownerKey)) throw new Exception("Account changed");
        JSONArray old = queue(c), next = new JSONArray();
        for (int i = 0; i < old.length(); i++) if (!old.getJSONObject(i).getString("id").equals(id)) next.put(old.get(i));
        saveQueue(c, next);
    }
    static synchronized void disable(Context c) throws Exception {
        if (!prefs(c).edit().clear().commit()) throw new Exception("Storage unavailable");
    }
    static synchronized void error(Context c) { prefs(c).edit().putBoolean("error", true).commit(); }
    static boolean hasError(Context c) { return prefs(c).getBoolean("error", false) || prefs(c).getBoolean("overflow", false); }
    static String hash(String text) throws Exception {
        byte[] bytes = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder s = new StringBuilder(); for (byte b : bytes) s.append(String.format("%02x", b & 255)); return s.toString();
    }
}
