package com.piyare.mobiletelecom.smsbridge;

import android.content.Context;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

/** Native Android Keystore storage with recovery from stale/incompatible keys. */
final class SecureStore {
    private static final String STORE="AndroidKeyStore";
    private static final String ALIAS="pmt_sms_bridge_key_v3";
    private static final String PREFS="bridge_secure";
    private static final String KEY_PASSWORD="password";
    private static final String KEY_TOKEN="token";
    private static final int GCM_TAG_BITS=128;
    private SecureStore(){}
    static void putPassword(Context c,String v)throws Exception{put(c,KEY_PASSWORD,v);}
    static String getPassword(Context c)throws Exception{return get(c,KEY_PASSWORD);}
    static void putToken(Context c,String v)throws Exception{put(c,KEY_TOKEN,v);}
    static String getToken(Context c)throws Exception{return get(c,KEY_TOKEN);}
    static void clearTokenOnly(Context c){c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove(KEY_TOKEN).apply();}
    static void clearSecrets(Context c){c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().clear().apply();}
    static void reset(Context c){clearSecrets(c);deleteKey();}
    private static void put(Context c,String key,String value)throws Exception{
        try{putInternal(c,key,value);}catch(Exception first){deleteKey();clearSecrets(c);putInternal(c,key,value);}
    }
    private static void putInternal(Context c,String key,String value)throws Exception{
        byte[] iv=new byte[12];new java.security.SecureRandom().nextBytes(iv);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,getOrCreateKey(),new GCMParameterSpec(GCM_TAG_BITS,iv));
        byte[] ct=cipher.doFinal(String.valueOf(value==null?"":value).getBytes(StandardCharsets.UTF_8));
        String packed=Base64.encodeToString(iv,Base64.NO_WRAP)+"."+Base64.encodeToString(ct,Base64.NO_WRAP);
        if(!c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(key,packed).commit())throw new Exception("Could not save secure credentials");
    }
    private static String get(Context c,String key)throws Exception{
        String packed=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(key,"");
        if(packed.isEmpty())return "";
        String[] parts=packed.split("\\.",2);if(parts.length!=2)return "";
        try{
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,getOrCreateKey(),new GCMParameterSpec(GCM_TAG_BITS,Base64.decode(parts[0],Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);
        }catch(Exception bad){reset(c);return "";}
    }
    private static SecretKey getOrCreateKey()throws Exception{
        KeyStore ks=KeyStore.getInstance(STORE);ks.load(null);
        if(ks.containsAlias(ALIAS)){
            KeyStore.Entry e=ks.getEntry(ALIAS,null);
            if(e instanceof KeyStore.SecretKeyEntry)return((KeyStore.SecretKeyEntry)e).getSecretKey();
            try{ks.deleteEntry(ALIAS);}catch(Exception ignored){}
        }
        KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,STORE);
        g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return g.generateKey();
    }
    private static void deleteKey(){try{KeyStore ks=KeyStore.getInstance(STORE);ks.load(null);if(ks.containsAlias(ALIAS))ks.deleteEntry(ALIAS);}catch(Exception ignored){}}
}
