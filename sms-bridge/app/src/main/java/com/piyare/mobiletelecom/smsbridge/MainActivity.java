package com.piyare.mobiletelecom.smsbridge;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;

public class MainActivity extends Activity {
    static final int SMS_PERMISSION = 100;
    static final int NOTIFICATION_PERMISSION = 101;
    private android.content.SharedPreferences prefs;
    private EditText username, password;
    private TextView status;
    private Button save;

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("bridge", MODE_PRIVATE);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 32, 32, 32);

        TextView title = new TextView(this);
        title.setText("PMT SMS Bridge");
        title.setTextSize(24);
        title.setTextColor(Color.BLACK);
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("Dedicated shop sender: sign in with a PMT staff account that can view orders and repairs. Credentials are stored with Android Keystore protection. SMS are sent automatically from this phone's SIM.");
        info.setPadding(0, 20, 0, 20);
        root.addView(info);

        username = new EditText(this);
        username.setHint("PMT bridge username");
        username.setSingleLine(true);
        username.setText(prefs.getString("username", ""));
        root.addView(username, new LinearLayout.LayoutParams(-1, -2));

        password = new EditText(this);
        password.setHint("PMT bridge password");
        password.setSingleLine(true);
        password.setInputType(0x81);
        root.addView(password, new LinearLayout.LayoutParams(-1, -2));

        save = new Button(this);
        save.setText("Save & Start");
        root.addView(save, new LinearLayout.LayoutParams(-1, -2));

        Button permission = new Button(this);
        permission.setText("Grant SMS Permission");
        permission.setOnClickListener(v -> requestSmsPermission());
        root.addView(permission, new LinearLayout.LayoutParams(-1, -2));

        Button settings = new Button(this);
        settings.setText("Open App Settings");
        settings.setOnClickListener(v -> openAppSettings());
        root.addView(settings, new LinearLayout.LayoutParams(-1, -2));

        status = new TextView(this);
        status.setPadding(0, 20, 0, 0);
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        setContentView(root);
        save.setOnClickListener(v -> startBridge());
        updatePermissionStatus();

        if (getIntent().getBooleanExtra("autoStart", false) && hasCredentials()
                && checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) startBridgeService();
    }

    private boolean hasCredentials() {
        try {
            String u = prefs.getString("username", "").trim();
            return !u.isEmpty() && !SecureStore.getPassword(this).isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private void startBridge() {
        String u = username.getText().toString().trim();
        String p = password.getText().toString();
        if (u.isEmpty() || p.isEmpty()) {
            status.setText("Enter your PMT username and password.");
            return;
        }
        if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            status.setText("SMS permission is required. Tap Grant SMS Permission, then tap Save & Start again.");
            requestSmsPermission();
            return;
        }
        saveCredentialsAndStart(u, p);
    }

    private void saveCredentialsAndStart(String u, String p) {
        try {
            String oldUser = prefs.getString("username", "").trim();
            boolean accountChanged = !oldUser.equalsIgnoreCase(u);
            SecureStore.putPassword(this, p);
            prefs.edit().putString("username", u).remove("token").apply();
            SecureStore.clearTokenOnly(this);
            if (accountChanged) resetEventState();
        } catch (Exception e) {
            status.setText("Secure storage failed. Tap Open App Settings, clear PMT SMS Bridge storage, reopen it and try again.");
            return;
        }
        requestNotificationsIfNeeded();
        startBridgeService();
    }

    private void requestSmsPermission() {
        if (checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
            status.setText("SMS permission is already allowed. Tap Save & Start.");
            return;
        }
        requestPermissions(new String[]{Manifest.permission.SEND_SMS}, SMS_PERMISSION);
    }

    private void updatePermissionStatus() {
        if (checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
            status.setText("SMS permission: Allowed. Enter credentials and tap Save & Start.");
        } else {
            status.setText("SMS permission: Not allowed. Tap Grant SMS Permission.");
        }
    }

    private void openAppSettings() {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i.setData(Uri.parse("package:" + getPackageName()));
        startActivity(i);
    }

    private void resetEventState() {
        android.content.SharedPreferences.Editor e = prefs.edit().putBoolean("baseline_done", false).remove("token");
        for (String key : prefs.getAll().keySet()) {
            if (key.startsWith("order_state:") || key.startsWith("order_sent:")
                    || key.startsWith("repair_state:") || key.startsWith("repair_sent:")) e.remove(key);
        }
        e.apply();
    }

    private void requestNotificationsIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION);
        }
    }

    private void startBridgeService() {
        Intent i = new Intent(this, SmsBridgeService.class);
        if (android.os.Build.VERSION.SDK_INT >= 26) startForegroundService(i);
        else startService(i);
        status.setText("Bridge started. It will authenticate and process automatic SMS in the background.");
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                status.setText("SMS permission allowed. Tap Save & Start to securely save credentials and start the bridge.");
            } else {
                status.setText("SMS permission was not granted. Use Open App Settings if Android no longer shows the permission dialog.");
            }
        }
    }

    @Override protected void onResume() {
        super.onResume();
        if (status != null) updatePermissionStatus();
    }
}
