package com.piyare.mobiletelecom.smsbridge;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
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
        info.setText("Use a dedicated PMT admin/staff account for this shop phone. The bridge keeps the session refreshed automatically, checks new order/repair events, and sends customer SMS from this phone's SIM.");
        info.setPadding(0, 20, 0, 20);
        root.addView(info);

        username = new EditText(this);
        username.setHint("PMT admin username");
        username.setSingleLine(true);
        username.setText(prefs.getString("username", ""));
        root.addView(username, new LinearLayout.LayoutParams(-1, -2));

        password = new EditText(this);
        password.setHint("PMT admin password");
        password.setSingleLine(true);
        password.setInputType(0x81);
        root.addView(password, new LinearLayout.LayoutParams(-1, -2));

        Button save = new Button(this);
        save.setText("Save & Start");
        root.addView(save, new LinearLayout.LayoutParams(-1, -2));

        status = new TextView(this);
        status.setPadding(0, 20, 0, 0);
        status.setText("Not running");
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        setContentView(root);
        save.setOnClickListener(v -> startBridge());

        if (getIntent().getBooleanExtra("autoStart", false) && hasCredentials()) {
            startBridge();
        }
    }

    private boolean hasCredentials() {
        return !prefs.getString("username", "").trim().isEmpty()
                && !prefs.getString("password", "").isEmpty();
    }

    private void startBridge() {
        String u = username.getText().toString().trim();
        String p = password.getText().toString();
        if (u.isEmpty() || p.length() < 10) {
            status.setText("Enter valid PMT credentials (password must be 10+ characters).");
            return;
        }
        prefs.edit().putString("username", u).putString("password", p).apply();

        if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.SEND_SMS}, SMS_PERMISSION);
            status.setText("Allow SMS permission, then the bridge will start.");
            return;
        }
        requestNotificationsIfNeeded();
        startBridgeService();
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
        status.setText("Bridge running — session auto-refresh is enabled.");
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                requestNotificationsIfNeeded();
                startBridgeService();
            } else {
                status.setText("SMS permission is required for automatic customer messages.");
            }
        }
    }
}
