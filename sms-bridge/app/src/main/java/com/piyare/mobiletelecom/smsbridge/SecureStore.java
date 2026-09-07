package com.piyare.mobiletelecom.smsbridge;

import android.content.Context;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Native Android Keystore wrapper for bridge secrets with recovery from stale/corrupt keys. */
final class SecureStore {
    private static final String STORE = "AndroidKeyStore";
    private static final String ALIAS = "pmt_sms_bridge_key_v1";
    private static final String PREFS = "bridge_secure";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_TOKEN = "token";
    private static final int GCM_TAG_BITS = 128;

    private SecureStore() {}

    static void putPassword(Context context, String value) throws Exception { put(context, KEY_PASSWORD, value); }
    static String getPassword(Context context) throws Exception { return get(context, KEY_PASSWORD); }
    static void putToken(Context context, String value) throws Exception { put(context, KEY_TOKEN, value); }
    static String getToken(Context context) throws Exception { return get(context, KEY_TOKEN); }

    static void clearTokenOnly(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_TOKEN).apply();
    }

    static void clearSecrets(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }

    private static void put(Context context, String key, String value) throws Exception {
        byte[] iv = new byte[12];
        new java.security.SecureRandom().nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
        byte[] ciphertext = cipher.doFinal(String.valueOf(value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
        String packed = Base64.encodeToString(iv, Base64.NO_WRAP) + "." + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(key, packed).apply();
    }

    private static String get(Context context, String key) throws Exception {
        String packed = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, "");
        if (packed.isEmpty()) return "";
        String[] parts = packed.split("\\.", 2);
        if (parts.length != 2) return "";
        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        try {
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception badKeyOrCiphertext) {
            // A package update/device restore can leave an unreadable old Keystore key.
            // Clear only this bridge's encrypted preferences and recreate the key on next put.
            clearSecrets(context);
            deleteKey();
            return "";
        }
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance(STORE);
        ks.load(null);
        if (ks.containsAlias(ALIAS)) {
            KeyStore.Entry entry = ks.getEntry(ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            try { ks.deleteEntry(ALIAS); } catch (Exception ignored) {}
        }
        KeyGenerator generator = KeyGenerator.getInstance("AES", STORE);
        generator.init(256);
        return generator.generateKey();
    }

    private static void deleteKey() {
        try {
            KeyStore ks = KeyStore.getInstance(STORE);
            ks.load(null);
            if (ks.containsAlias(ALIAS)) ks.deleteEntry(ALIAS);
        } catch (Exception ignored) {}
    }
}
