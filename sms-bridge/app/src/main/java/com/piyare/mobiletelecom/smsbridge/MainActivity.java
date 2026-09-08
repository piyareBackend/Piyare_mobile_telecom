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
import android.widget.ScrollView;
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
    private static final int VERSION_CODE=10;
    private android.content.SharedPreferences prefs;
    private EditText username,password;
    private TextView status;
    private Button login,test;
    private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}

    @Override public void onCreate(Bundle b){
        super.onCreate(b);prefs=getSharedPreferences("bridge",MODE_PRIVATE);
        ScrollView sv=new ScrollView(this);sv.setFillViewport(true);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(18),dp(10),dp(18),dp(22));root.setBackgroundColor(Color.rgb(248,248,248));sv.addView(root);
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);TextView back=label("‹",34);back.setGravity(Gravity.CENTER);back.setOnClickListener(v->goHome());top.addView(back,new LinearLayout.LayoutParams(dp(48),dp(46)));TextView heading=label("SMS Bridge",20);heading.setGravity(Gravity.CENTER);top.addView(heading,new LinearLayout.LayoutParams(0,dp(46),1));TextView gear=label("⚙",25);gear.setGravity(Gravity.CENTER);gear.setOnClickListener(v->showSettings());top.addView(gear,new LinearLayout.LayoutParams(dp(48),dp(46)));root.addView(top);
        ImageView logo=new ImageView(this);logo.setAdjustViewBounds(true);logo.setPadding(dp(5),dp(5),dp(5),dp(5));loadWebsiteLogo(logo);LinearLayout.LayoutParams ilp=new LinearLayout.LayoutParams(dp(88),dp(88));ilp.gravity=Gravity.CENTER_HORIZONTAL;root.addView(logo,ilp);
        TextView title=label("PMT SMS Bridge",24);title.setGravity(Gravity.CENTER);title.setTypeface(null,android.graphics.Typeface.BOLD);root.addView(title);
        TextView info=label("Dedicated shop SMS sender. Sign in with a PMT staff account. Credentials stay securely on this device.",13);info.setGravity(Gravity.CENTER);info.setTextColor(Color.rgb(100,100,100));info.setPadding(0,dp(5),0,dp(18));root.addView(info);
        username=new EditText(this);username.setHint("PMT staff username");username.setSingleLine(true);username.setText(prefs.getString("username",""));root.addView(username,new LinearLayout.LayoutParams(-1,dp(52)));
        password=new EditText(this);password.setHint("PMT staff password");password.setSingleLine(true);password.setInputType(0x81);LinearLayout.LayoutParams pp=new LinearLayout.LayoutParams(-1,dp(52));pp.topMargin=dp(8);root.addView(password,pp);
        login=new Button(this);login.setText("LOGIN & START BRIDGE");LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(50));lp.topMargin=dp(12);root.addView(login,lp);
        test=new Button(this);test.setText("TEST LOGIN");root.addView(test,new LinearLayout.LayoutParams(-1,dp(50)));
        status=label("",13);status.setTextColor(Color.rgb(90,90,90));status.setPadding(0,dp(14),0,0);root.addView(status,new LinearLayout.LayoutParams(-1,-2));setContentView(sv);
        login.setOnClickListener(v->loginAndStart(false));test.setOnClickListener(v->loginAndStart(true));
        if(checkSelfPermission(Manifest.permission.SEND_SMS)==PackageManager.PERMISSION_GRANTED)status.setText("SMS permission: allowed.");else status.setText("SMS permission is required only to start the bridge.");
    }
    private TextView label(String s,float size){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(Color.rgb(20,20,20));return t;}
    private void goHome(){startActivity(new Intent(this,HomeActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();}
    private void showSettings(){
        android.app.AlertDialog.Builder b=new android.app.AlertDialog.Builder(this);b.setTitle("SMS Bridge Settings");
        String[] items={"Grant SMS permission","Open Android app settings","Check for update","Reset bridge credentials"};
        b.setItems(items,(d,w)->{if(w==0)requestSmsPermission();else if(w==1)openAppSettings();else if(w==2)checkForUpdate();else{SecureStore.reset(this);prefs.edit().clear().apply();username.setText("");password.setText("");status.setText("Bridge credentials reset.");}});b.setNegativeButton("Close",null);b.show();
    }
    private void loginAndStart(boolean testOnly){
        String u=username.getText().toString().trim(),p=password.getText().toString();if(u.isEmpty()||p.isEmpty()){status.setText("Enter PMT username and password.");return;}
        if(!testOnly&&checkSelfPermission(Manifest.permission.SEND_SMS)!=PackageManager.PERMISSION_GRANTED){status.setText("Grant SMS permission first.");requestSmsPermission();return;}
        login.setEnabled(false);test.setEnabled(false);status.setText("Testing PMT login…");
        new Thread(()->{try{JSONObject req=new JSONObject();req.put("action","adminLogin");req.put("username",u);req.put("password",p);JSONObject d=post(req);boolean ok=d.optBoolean("ok",false);String msg=d.optString("message",d.optString("error","Unknown server response"));if(!ok)throw new Exception(msg);SecureStore.putPassword(this,p);prefs.edit().putString("username",u).apply();runOnUiThread(()->{status.setText(testOnly?"LOGIN OK. Credentials are securely saved.":"LOGIN OK. Starting automatic SMS bridge…");if(!testOnly){requestNotificationsIfNeeded();startBridgeService();}});}catch(Exception e){runOnUiThread(()->status.setText("LOGIN FAILED: "+safeMessage(e)));}finally{runOnUiThread(()->{login.setEnabled(true);test.setEnabled(true);});}},"pmt-login-test").start();
    }
    private String safeMessage(Exception e){String m=e==null?"Unknown error":String.valueOf(e.getMessage());return m==null||m.trim().isEmpty()?e.getClass().getSimpleName():m;}
    private JSONObject post(JSONObject payload)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(API).openConnection();c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","text/plain;charset=utf-8");c.setRequestProperty("Accept","application/json");byte[] body=payload.toString().getBytes(StandardCharsets.UTF_8);try(OutputStream out=c.getOutputStream()){out.write(body);out.flush();}int code=c.getResponseCode();InputStream in=code<400?c.getInputStream():c.getErrorStream();String text=read(in);c.disconnect();if(text.isEmpty())throw new Exception("Empty PMT server response (HTTP "+code+")");return new JSONObject(text);}
    private String read(InputStream in)throws Exception{if(in==null)return "";ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;while((n=in.read(buf))>0)out.write(buf,0,n);in.close();return out.toString(StandardCharsets.UTF_8.name());}
    private void loadWebsiteLogo(ImageView view){new Thread(()->{try{HttpURLConnection c=(HttpURLConnection)new URL(WEBSITE_LOGO).openConnection();c.setConnectTimeout(6000);c.setReadTimeout(8000);try(InputStream in=c.getInputStream()){android.graphics.Bitmap b=BitmapFactory.decodeStream(in);if(b!=null)runOnUiThread(()->view.setImageBitmap(b));}finally{c.disconnect();}}catch(Exception ignored){}} ,"pmt-logo-loader").start();}
    private void requestSmsPermission(){if(checkSelfPermission(Manifest.permission.SEND_SMS)==PackageManager.PERMISSION_GRANTED){status.setText("SMS permission: allowed.");return;}requestPermissions(new String[]{Manifest.permission.SEND_SMS},SMS_PERMISSION);}
    private void openAppSettings(){Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);i.setData(Uri.parse("package:"+getPackageName()));startActivity(i);}
    private void requestNotificationsIfNeeded(){if(android.os.Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFICATION_PERMISSION);}
    private void startBridgeService(){Intent i=new Intent(this,SmsBridgeService.class);if(android.os.Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);}
    private void checkForUpdate(){new Thread(()->{try{JSONObject j=new JSONObject(read(new URL(UPDATE_MANIFEST).openStream()));int latest=j.optInt("versionCode",VERSION_CODE);String notes=j.optString("releaseNotes","");if(latest>VERSION_CODE)runOnUiThread(()->status.setText("Update available: v"+j.optString("versionName","new")+" — "+notes));else runOnUiThread(()->status.setText("PMT Mobile App is up to date."));}catch(Exception e){runOnUiThread(()->status.setText("Update check failed: "+safeMessage(e)));}},"pmt-update-check").start();}
    @Override public void onBackPressed(){goHome();}
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grants){super.onRequestPermissionsResult(requestCode,permissions,grants);if(requestCode==SMS_PERMISSION){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)status.setText("SMS permission: allowed.");else status.setText("SMS permission was not granted.");}}
}
