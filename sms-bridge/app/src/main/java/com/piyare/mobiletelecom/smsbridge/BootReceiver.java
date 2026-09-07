package com.piyare.mobiletelecom.smsbridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) return;
        android.content.SharedPreferences prefs = context.getSharedPreferences("bridge", Context.MODE_PRIVATE);
        String username = prefs.getString("username", "").trim();
        if (username.isEmpty()) return;
        try {
            String password = SecureStore.getPassword(context);
            // One-time migration from the old v2.0 plaintext preference.
            if (password.isEmpty()) {
                String legacy = prefs.getString("password", "");
                if (!legacy.isEmpty()) {
                    SecureStore.putPassword(context, legacy);
                    prefs.edit().remove("password").apply();
                    password = legacy;
                }
            }
            if (password.length() < 10) return;
        } catch (Exception ignored) {
            return;
        }
        Intent service = new Intent(context, SmsBridgeService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service);
            else context.startService(service);
        } catch (Exception ignored) {}
    }
}
