package com.piyare.mobiletelecom.smsbridge;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    static final int SMS_PERMISSION=100;
    static final int NOTIFICATION_PERMISSION=101;
    private static final String API="https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/api";
    private static final String WEBSITE_LOGO="https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/assets/logo.png";
    private static final String UPDATE_MANIFEST="https://raw.githubusercontent.com/piyareBackend/Piyare_mobile_telecom_v2/main/sms-bridge/latest-version.json";
    private static final int VERSION_CODE=8;
    private android.content.SharedPreferences prefs;
    private EditText username,password;
    private TextView status;
    private Button login,test;

    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        prefs=getSharedPreferences("bridge",MODE_PRIVATE);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(28,20,28,28);
        ImageView logo=new ImageView(this);logo.setImageResource(com.piyare.mobiletelecom.smsbridge.R.drawable.pmt_logo);logo.setContentDescription("Piyare Mobile Telecom");logo.setAdjustViewBounds(true);logo.setPadding(8,8,8,8);root.addView(logo,new LinearLayout.LayoutParams(-1,130));
        loadWebsiteLogo(logo);
        TextView title=new TextView(this);title.setText("PMT SMS Bridge");title.setTextSize(25);title.setTextColor(Color.BLACK);title.setGravity(Gravity.CENTER);root.addView(title,new LinearLayout.LayoutParams(-1,-2));
        TextView info=new TextView(this);info.setText("Dedicated shop SMS sender. Sign in with a PMT staff account. Credentials stay on this device and survive normal app updates.");info.setPadding(0,12,0,18);root.addView(info);
        username=new EditText(this);username.setHint("PMT staff username");username.setSingleLine(true);username.setText(prefs.getString("username",""));root.addView(username,new LinearLayout.LayoutParams(-1,-2));
        password=new EditText(this);password.setHint("PMT staff password");password.setSingleLine(true);password.setInputType(0x81);root.addView(password,new LinearLayout.LayoutParams(-1,-2));
        login=new Button(this);login.setText("LOGIN & START BRIDGE");root.addView(login,new LinearLayout.LayoutParams(-1,-2));
        test=new Button(this);test.setText("TEST LOGIN");root.addView(test,new LinearLayout.LayoutParams(-1,-2));
        Button permission=new Button(this);permission.setText("GRANT SMS PERMISSION");permission.setOnClickListener(v->requestSmsPermission());root.addView(permission,new LinearLayout.LayoutParams(-1,-2));
        Button settings=new Button(this);settings.setText("OPEN APP SETTINGS");settings.setOnClickListener(v->openAppSettings());root.addView(settings,new LinearLayout.LayoutParams(-1,-2));
        Button update=new Button(this);update.setText("CHECK FOR UPDATE");update.setOnClickListener(v->checkForUpdate());root.addView(update,new LinearLayout.LayoutParams(-1,-2));
        Button reset=new Button(this);reset.setText("RESET BRIDGE CREDENTIALS");reset.setOnClickListener(v->{SecureStore.reset(this);prefs.edit().clear().apply();username.setText("");password.setText("");status.setText("Bridge credentials reset. Enter the PMT staff account again.");});root.addView(reset,new LinearLayout.LayoutParams(-1,-2));
        status=new TextView(this);status.setPadding(0,18,0,0);root.addView(status,new LinearLayout.LayoutParams(-1,-2));
        setContentView(root);
        login.setOnClickListener(v->loginAndStart(false));
        test.setOnClickListener(v->loginAndStart(true));
        updatePermissionStatus();
        checkForUpdateQuietly();
    }

    private void loginAndStart(boolean testOnly){
        String u=username.getText().toString().trim(),p=password.getText().toString();
        if(u.isEmpty()||p.isEmpty()){status.setText("Enter PMT username and password.");return;}
        if(checkSelfPermission(Manifest.permission.SEND_SMS)!=PackageManager.PERMISSION_GRANTED){status.setText("SMS permission is not allowed. Tap GRANT SMS PERMISSION first.");requestSmsPermission();return;}
        login.setEnabled(false);test.setEnabled(false);status.setText("Testing PMT login…");
        new Thread(()->{
            try{
                JSONObject req=new JSONObject();req.put("action","adminLogin");req.put("username",u);req.put("password",p);
                JSONObject d=post(req);boolean ok=d.optBoolean("ok",false);String msg=d.optString("message",d.optString("error","Unknown server response"));
                if(!ok)throw new Exception(msg);
                SecureStore.putPassword(this,p);
                prefs.edit().putString("username",u).remove("token").apply();
                SecureStore.clearTokenOnly(this);
                runOnUiThread(()->{status.setText(testOnly?"LOGIN OK. Credentials are securely saved.":"LOGIN OK. Starting automatic SMS bridge…");if(!testOnly){requestNotificationsIfNeeded();startBridgeService();}});
            }catch(Exception e){runOnUiThread(()->status.setText("LOGIN FAILED: "+safeMessage(e)));}
            finally{runOnUiThread(()->{login.setEnabled(true);test.setEnabled(true);});}
        },"pmt-login-test").start();
    }

    private String safeMessage(Exception e){String m=e==null?"Unknown error":String.valueOf(e.getMessage());return m==null||m.trim().isEmpty()?e.getClass().getSimpleName():m;}

    private JSONObject post(JSONObject payload)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(API).openConnection();c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","text/plain;charset=utf-8");c.setRequestProperty("Accept","application/json");
        byte[] body=payload.toString().getBytes(StandardCharsets.UTF_8);try(OutputStream out=c.getOutputStream()){out.write(body);out.flush();}
        int code=c.getResponseCode();InputStream in=code<400?c.getInputStream():c.getErrorStream();String text=read(in);c.disconnect();if(text.isEmpty())throw new Exception("Empty PMT server response (HTTP "+code+")");return new JSONObject(text);
    }
    private String read(InputStream in)throws Exception{if(in==null)return "";ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;while((n=in.read(buf))>0)out.write(buf,0,n);in.close();return out.toString(StandardCharsets.UTF_8.name());}

    private void loadWebsiteLogo(ImageView view){new Thread(()->{try{HttpURLConnection c=(HttpURLConnection)new URL(WEBSITE_LOGO).openConnection();c.setConnectTimeout(6000);c.setReadTimeout(8000);c.setUseCaches(true);try(InputStream in=c.getInputStream()){final android.graphics.Bitmap b=BitmapFactory.decodeStream(in);if(b!=null)runOnUiThread(()->view.setImageBitmap(b));}finally{c.disconnect();}}catch(Exception ignored){}} ,"pmt-logo-loader").start();}

    private void requestSmsPermission(){if(checkSelfPermission(Manifest.permission.SEND_SMS)==PackageManager.PERMISSION_GRANTED){updatePermissionStatus();return;}requestPermissions(new String[]{Manifest.permission.SEND_SMS},SMS_PERMISSION);}
    private void updatePermissionStatus(){if(status==null)return;if(checkSelfPermission(Manifest.permission.SEND_SMS)==PackageManager.PERMISSION_GRANTED)status.setText("SMS permission: ALLOWED. Test login or start the bridge.");else status.setText("SMS permission: NOT ALLOWED. Tap GRANT SMS PERMISSION.");}
    private void openAppSettings(){Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);i.setData(Uri.parse("package:"+getPackageName()));startActivity(i);}
    private void requestNotificationsIfNeeded(){if(android.os.Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFICATION_PERMISSION);}
    private void startBridgeService(){Intent i=new Intent(this,SmsBridgeService.class);if(android.os.Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);}

    private void checkForUpdateQuietly(){new Thread(()->{try{JSONObject j=new JSONObject(read(new URL(UPDATE_MANIFEST).openStream()));int latest=j.optInt("versionCode",VERSION_CODE);if(latest>VERSION_CODE)runOnUiThread(()->status.setText("Update available: v"+j.optString("versionName","new")+". Tap CHECK FOR UPDATE."));}catch(Exception ignored){}} ,"pmt-update-check").start();}
    private void checkForUpdate(){new Thread(()->{try{JSONObject j=new JSONObject(read(new URL(UPDATE_MANIFEST).openStream()));int latest=j.optInt("versionCode",VERSION_CODE);String notes=j.optString("releaseNotes","");if(latest>VERSION_CODE){String page=j.optString("updatePage","");runOnUiThread(()->{status.setText("Update available: v"+j.optString("versionName","new")+"\n"+notes);if(!page.isEmpty())startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(page)));});}else runOnUiThread(()->status.setText("PMT SMS Bridge is up to date (v2.6)."));}catch(Exception e){runOnUiThread(()->status.setText("Update check failed: "+safeMessage(e)));}} ,"pmt-update-check-manual").start();}

    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grants){super.onRequestPermissionsResult(requestCode,permissions,grants);if(requestCode==SMS_PERMISSION){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)status.setText("SMS permission: ALLOWED. Tap TEST LOGIN.");else status.setText("SMS permission was not granted. Open App Settings and check SMS permission if available.");}}
}
