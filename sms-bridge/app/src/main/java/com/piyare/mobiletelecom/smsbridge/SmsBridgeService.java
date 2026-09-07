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
    private static final String API="https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/api";
    private static final String CHANNEL="pmt_sms_bridge";
    private volatile boolean running=true;
    private android.content.SharedPreferences prefs;

    @Override public void onCreate(){super.onCreate();prefs=getSharedPreferences("bridge",MODE_PRIVATE);createChannel();startForeground(77,notification("PMT SMS Bridge running"));new Thread(this::loop,"pmt-sms-loop").start();}
    private void createChannel(){NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel(CHANNEL,"PMT SMS Bridge",NotificationManager.IMPORTANCE_LOW));}
    private Notification notification(String text){Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);return b.setContentTitle("PMT SMS Bridge").setContentText(text).setSmallIcon(android.R.drawable.stat_notify_more).setOngoing(true).build();}
    private void loop(){while(running){try{pollOrders();pollRepairs();}catch(Exception ignored){}try{Thread.sleep(15000);}catch(InterruptedException e){Thread.currentThread().interrupt();break;}}}
    private String get(String action)throws Exception{
        String token=prefs.getString("token","");if(token.isEmpty())return "{}";
        URL u=new URL(API+"?action="+URLEncoder.encode(action,"UTF-8")+"&token="+URLEncoder.encode(token,"UTF-8"));HttpURLConnection c=(HttpURLConnection)u.openConnection();c.setConnectTimeout(8000);c.setReadTimeout(10000);c.setRequestProperty("Accept","application/json");InputStream in=c.getResponseCode()<400?c.getInputStream():c.getErrorStream();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;while((n=in.read(buf))>0)out.write(buf,0,n);return out.toString(StandardCharsets.UTF_8.name());
    }
    private void pollOrders()throws Exception{
        JSONObject d=new JSONObject(get("orders"));JSONArray a=d.optJSONArray("items");if(a==null)return;
        for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o==null)continue;String id=o.optString("id"),phone=o.optString("phone"),status=o.optString("status","Pending");if(id.isEmpty()||phone.isEmpty())continue;
            boolean pos=id.startsWith("PMT-POS-");boolean webConfirmed=!pos&&"Confirmed".equalsIgnoreCase(status);if(!pos&&!webConfirmed)continue;
            String key="order:"+id;String old=prefs.getString(key,"");if("sent".equals(old))continue;
            String name=o.optString("customer","Customer");double total=o.optDouble("total",0);String msg=pos?"Piyare Mobile Telecom: Bill "+id+" generated for "+name+". Total ₹"+money(total)+". Thank you.":"Piyare Mobile Telecom: Order "+id+" is confirmed for "+name+". Total ₹"+money(total)+". Thank you.";
            if(send(phone,msg))prefs.edit().putString(key,"sent").apply();
        }
    }
    private void pollRepairs()throws Exception{
        JSONObject d=new JSONObject(get("repairs"));JSONArray a=d.optJSONArray("items");if(a==null)return;
        for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r==null)continue;String id=r.optString("id"),phone=r.optString("phone"),status=r.optString("status","Pending"),name=r.optString("name","Customer");if(id.isEmpty()||phone.isEmpty())continue;
            if("Pending".equalsIgnoreCase(status)||"Cancelled".equalsIgnoreCase(status))continue;
            String key="repair:"+id+":"+status;if(prefs.getBoolean(key,false))continue;
            String msg="Piyare Mobile Telecom: Hello "+name+", your repair "+id+" status is "+status+".";if("Ready".equalsIgnoreCase(status))msg+=" Your device is ready for pickup.";if("Completed".equalsIgnoreCase(status))msg+=" Thank you for choosing us.";
            if(send(phone,msg))prefs.edit().putBoolean(key,true).apply();
        }
    }
    private boolean send(String phone,String message){try{String p=phone.replaceAll("\\D","");if(p.length()==10)p="+91"+p;if(Build.VERSION.SDK_INT>=23&&checkSelfPermission(Manifest.permission.SEND_SMS)!=PackageManager.PERMISSION_GRANTED)return false;SmsManager.getDefault().sendTextMessage(p,null,message,null,null);return true;}catch(Exception e){return false;}}
    private String money(double n){return String.format(Locale.US,"%.2f",n);}
    @Override public int onStartCommand(Intent i,int flags,int startId){return START_STICKY;}
    @Override public android.os.IBinder onBind(Intent i){return null;}
    @Override public void onDestroy(){running=false;super.onDestroy();}
}
