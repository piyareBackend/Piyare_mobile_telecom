package com.piyare.mobiletelecom.smsbridge;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.*;
import android.telephony.SmsManager;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class SmsBridgeService extends Service {
    private static final String API = "https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/api";
    private static final String CHANNEL = "pmt_sms_bridge";
    private static final int NOTIFICATION_ID = 77;
    private volatile boolean running = true;
    private android.content.SharedPreferences prefs;
    private long lastStatusAt = 0L;

    @Override public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("bridge", MODE_PRIVATE);
        createChannel();
        startForeground(NOTIFICATION_ID, notification("PMT SMS Bridge running"));
        new Thread(this::loop, "pmt-sms-loop").start();
    }

    private void createChannel() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "PMT SMS Bridge", NotificationManager.IMPORTANCE_LOW));
        }
    }

    private Notification notification(String text) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL)
                : new Notification.Builder(this);
        return b.setContentTitle("PMT SMS Bridge")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setOngoing(true)
                .build();
    }

    private void setStatus(String text) {
        if (System.currentTimeMillis() - lastStatusAt < 5000) return;
        lastStatusAt = System.currentTimeMillis();
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.notify(NOTIFICATION_ID, notification(text));
        } catch (Exception ignored) {}
    }

    private void loop() {
        while (running) {
            try {
                boolean baseline = !prefs.getBoolean("baseline_done", false);
                pollOrders(baseline);
                pollRepairs(baseline);
                if (baseline) prefs.edit().putBoolean("baseline_done", true).apply();
                setStatus("Connected — checking every 15 seconds");
            } catch (SecurityException e) {
                setStatus("SMS permission is required");
            } catch (Exception e) {
                setStatus("Waiting for PMT server; will retry");
            }
            try { Thread.sleep(15000); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
        }
    }

    private JSONObject get(String action) throws Exception {
        String token = loadToken();
        if (token.isEmpty()) token = loginAndStoreToken();
        JSONObject d = rawGet(action, token);
        if (isUnauthorized(d)) {
            SecureStore.clearTokenOnly(this);
            token = loginAndStoreToken();
            d = rawGet(action, token);
        }
        if (isUnauthorized(d)) throw new IOException("PMT bridge account is not authorized");
        return d;
    }

    private JSONObject rawGet(String action, String token) throws Exception {
        URL u = new URL(API + "?action=" + URLEncoder.encode(action, "UTF-8")
                + "&token=" + URLEncoder.encode(token, "UTF-8"));
        HttpURLConnection c = (HttpURLConnection) u.openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(10000);
        c.setRequestProperty("Accept", "application/json");
        c.setRequestMethod("GET");
        int code = c.getResponseCode();
        InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
        String text = read(in);
        c.disconnect();
        try { return new JSONObject(text); }
        catch (Exception e) { throw new IOException("PMT returned invalid JSON (HTTP " + code + ")"); }
    }

    private String loadToken() throws Exception {
        String token = SecureStore.getToken(this);
        if (!token.isEmpty()) return token;
        // One-time migration from the old plaintext bridge preference.
        String legacy = prefs.getString("token", "");
        if (!legacy.isEmpty()) {
            SecureStore.putToken(this, legacy);
            prefs.edit().remove("token").apply();
            return legacy;
        }
        return "";
    }

    private String loadPassword() throws Exception {
        String password = SecureStore.getPassword(this);
        if (!password.isEmpty()) return password;
        // One-time migration from v2.0. The plaintext value is removed immediately.
        String legacy = prefs.getString("password", "");
        if (!legacy.isEmpty()) {
            SecureStore.putPassword(this, legacy);
            prefs.edit().remove("password").apply();
            return legacy;
        }
        return "";
    }

    private String loginAndStoreToken() throws Exception {
        String username = prefs.getString("username", "").trim();
        String password = loadPassword();
        if (username.isEmpty() || password.length() < 10) throw new IOException("Bridge credentials are not configured");
        JSONObject request = new JSONObject();
        request.put("action", "adminLogin");
        request.put("username", username);
        request.put("password", password);
        JSONObject d = rawPost(request);
        String token = d.optString("token", "");
        if (!d.optBoolean("ok", false) || token.isEmpty()) {
            throw new IOException(d.optString("message", "PMT login failed"));
        }
        SecureStore.putToken(this, token);
        return token;
    }

    private JSONObject rawPost(JSONObject payload) throws Exception {
        URL u = new URL(API);
        HttpURLConnection c = (HttpURLConnection) u.openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(10000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
        c.setRequestProperty("Accept", "application/json");
        byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
        OutputStream out = c.getOutputStream();
        out.write(body); out.flush(); out.close();
        int code = c.getResponseCode();
        InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
        String text = read(in);
        c.disconnect();
        try { return new JSONObject(text); }
        catch (Exception e) { throw new IOException("PMT returned invalid JSON (HTTP " + code + ")"); }
    }

    private String read(InputStream in) throws Exception {
        if (in == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toString(StandardCharsets.UTF_8.name());
    }

    private boolean isUnauthorized(JSONObject d) {
        if (d == null) return true;
        String code = d.optString("code", "");
        String error = d.optString("error", "");
        String message = d.optString("message", "");
        return "UNAUTHORIZED".equalsIgnoreCase(code)
                || "Forbidden".equalsIgnoreCase(error)
                || "Forbidden".equalsIgnoreCase(message);
    }

    private void pollOrders(boolean baseline) throws Exception {
        JSONObject d = get("orders");
        JSONArray a = d.optJSONArray("items");
        if (a == null) a = d.optJSONArray("data");
        if (a == null) return;
        android.content.SharedPreferences.Editor edit = prefs.edit();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            String id = o.optString("id", "");
            String phone = o.optString("phone", "");
            String status = o.optString("status", "Pending");
            if (id.isEmpty() || phone.isEmpty()) continue;

            boolean pos = id.startsWith("PMT-POS-");
            String stateKey = "order_state:" + id;
            String previous = prefs.getString(stateKey, "");
            if (baseline) {
                edit.putString(stateKey, status);
                continue;
            }

            String eventKey = "order_sent:" + id;
            boolean alreadySent = prefs.getBoolean(eventKey, false);
            boolean activeOrder = "Confirmed".equalsIgnoreCase(status)
                    || "Processing".equalsIgnoreCase(status)
                    || "Shipped".equalsIgnoreCase(status)
                    || "Delivered".equalsIgnoreCase(status)
                    || "Completed".equalsIgnoreCase(status);
            // If the bridge was offline while Confirmed -> Processing/Shipped happened,
            // the customer still needs the one confirmation message. A single event key
            // prevents duplicates on later status changes.
            boolean shouldSend = pos
                    ? !alreadySent
                    : activeOrder && !alreadySent
                        && !"Rejected".equalsIgnoreCase(status)
                        && !"Cancelled".equalsIgnoreCase(status);
            if (!shouldSend) {
                edit.putString(stateKey, status);
                continue;
            }

            String name = o.optString("customer", "Customer");
            double total = o.optDouble("total", 0);
            String msg = pos
                    ? "Piyare Mobile Telecom: Bill " + id + " generated for " + name + ". Total ₹" + money(total) + ". Thank you."
                    : "Piyare Mobile Telecom: Order " + id + " is confirmed. Total ₹" + money(total) + ". Thank you, " + name + ".";

            // Do not advance the event state when the handset/carrier rejected dispatch.
            // The unchanged state makes the next poll retry automatically.
            if (send(phone, msg)) {
                edit.putBoolean(eventKey, true);
                edit.putString(stateKey, status);
            }
        }
        edit.apply();
    }

    private void pollRepairs(boolean baseline) throws Exception {
        JSONObject d = get("repairs");
        JSONArray a = d.optJSONArray("items");
        if (a == null) a = d.optJSONArray("data");
        if (a == null) return;
        android.content.SharedPreferences.Editor edit = prefs.edit();
        for (int i = 0; i < a.length(); i++) {
            JSONObject r = a.optJSONObject(i);
            if (r == null) continue;
            String id = r.optString("id", "");
            String phone = r.optString("phone", "");
            String status = r.optString("status", "Pending");
            String name = r.optString("name", "Customer");
            if (id.isEmpty() || phone.isEmpty()) continue;

            String key = "repair_state:" + id;
            String previous = prefs.getString(key, "");
            if (baseline) {
                edit.putString(key, status);
                continue;
            }
            if (status.equalsIgnoreCase(previous)
                    || "Pending".equalsIgnoreCase(status)
                    || "Cancelled".equalsIgnoreCase(status)) {
                continue;
            }

            String eventKey = "repair_sent:" + id + ":" + status;
            if (prefs.getBoolean(eventKey, false)) {
                edit.putString(key, status);
                continue;
            }

            String msg = "Piyare Mobile Telecom: Hello " + name + ", your repair " + id + " status is " + status + ".";
            if ("Ready".equalsIgnoreCase(status)) msg += " Your device is ready for pickup.";
            if ("Completed".equalsIgnoreCase(status)) msg += " Thank you for choosing us.";

            if (send(phone, msg)) {
                edit.putBoolean(eventKey, true);
                edit.putString(key, status);
            }
            // On failure the previous status remains, so this event is retried.
        }
        edit.apply();
    }

    private boolean send(String phone, String message) {
        try {
            String p = phone.replaceAll("\\D", "");
            if (p.length() == 10) p = "+91" + p;
            if (p.length() < 12) return false;
            if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) return false;
            SmsManager sms = SmsManager.getDefault();
            ArrayList<String> parts = sms.divideMessage(message);
            if (parts.size() <= 1) sms.sendTextMessage(p, null, message, null, null);
            else sms.sendMultipartTextMessage(p, null, parts, null, null);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String money(double n) { return String.format(Locale.US, "%.2f", n); }

    @Override public int onStartCommand(Intent i, int flags, int startId) { return START_STICKY; }
    @Override public android.os.IBinder onBind(Intent i) { return null; }
    @Override public void onDestroy() { running = false; super.onDestroy(); }
}
