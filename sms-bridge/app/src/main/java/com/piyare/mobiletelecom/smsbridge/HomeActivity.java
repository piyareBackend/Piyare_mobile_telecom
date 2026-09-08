package com.piyare.mobiletelecom.smsbridge;

import android.app.Activity;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class HomeActivity extends Activity {
    private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String s,float size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);return t;}
    private android.graphics.drawable.GradientDrawable bg(String color,float radius){android.graphics.drawable.GradientDrawable g=new android.graphics.drawable.GradientDrawable();g.setColor(Color.parseColor(color));g.setCornerRadius(dp(radius));return g;}
    private String theme(){return getSharedPreferences("app_theme",MODE_PRIVATE).getString("theme","classic");}
    private int bgColor(){switch(theme()){case "paper":return Color.rgb(244,241,232);case "blueprint":return Color.rgb(235,242,250);default:return Color.rgb(247,248,250);}}
    private int textColor(){return theme().equals("blueprint")?Color.rgb(12,45,78):Color.rgb(17,24,39);}
    private int mutedColor(){return theme().equals("blueprint")?Color.rgb(70,95,120):Color.rgb(107,114,128);}
    private String surface(){return theme().equals("paper")?"#FFFDF5":theme().equals("blueprint")?"#F8FBFF":"#FFFFFF";}
    private LinearLayout card(String title,String sub,String action,View.OnClickListener click,boolean primary){
        LinearLayout c=new LinearLayout(this);c.setOrientation(LinearLayout.VERTICAL);c.setPadding(dp(20),dp(20),dp(20),dp(20));c.setBackground(bg(primary?(theme().equals("blueprint")?"#0B3558":"#111827"):surface(),18));c.setElevation(dp(3));
        TextView h=text(title,21,primary?Color.WHITE:textColor());h.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(h);
        TextView p=text(sub,14,primary?Color.rgb(220,228,236):mutedColor());p.setPadding(0,dp(7),0,dp(15));c.addView(p);
        TextView b=text(action,14,primary?Color.rgb(17,24,39):Color.WHITE);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setGravity(Gravity.CENTER);b.setPadding(dp(12),dp(11),dp(12),dp(11));b.setBackground(bg(primary?"#FFFFFF":"#2563EB",12));b.setOnClickListener(click);c.addView(b,new LinearLayout.LayoutParams(-1,dp(44)));
        return c;
    }
    private void loadLogo(ImageView view){new Thread(()->{try{HttpURLConnection c=(HttpURLConnection)new URL("https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/assets/logo.png").openConnection();c.setConnectTimeout(5000);c.setReadTimeout(8000);try(InputStream in=c.getInputStream()){android.graphics.Bitmap b=BitmapFactory.decodeStream(in);if(b!=null)runOnUiThread(()->view.setImageBitmap(b));}finally{c.disconnect();}}catch(Exception ignored){}} ,"pmt-home-logo").start();}
    private void settings(){
        final String[] names={"Classic","Paper Mono","Blueprint Draft"};final String[] values={"classic","paper","blueprint"};
        android.app.AlertDialog.Builder b=new android.app.AlertDialog.Builder(this);b.setTitle("PMT App Settings");
        b.setItems(names,(d,w)->{getSharedPreferences("app_theme",MODE_PRIVATE).edit().putString("theme",values[w]).apply();recreate();});
        b.setNeutralButton("App settings",(d,w)->{Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);i.setData(Uri.parse("package:"+getPackageName()));startActivity(i);});
        b.setNegativeButton("Close",null);b.show();
    }
    @Override public void onCreate(Bundle b){super.onCreate(b);
        ScrollView sv=new ScrollView(this);sv.setFillViewport(true);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(18),dp(14),dp(18),dp(28));root.setBackgroundColor(bgColor());sv.addView(root);
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);TextView brand=text("PMT",17,textColor());brand.setTypeface(Typeface.DEFAULT,Typeface.BOLD);top.addView(brand,new LinearLayout.LayoutParams(0,dp(44),1));TextView gear=text("⚙",26,textColor());gear.setGravity(Gravity.CENTER);gear.setOnClickListener(v->settings());top.addView(gear,new LinearLayout.LayoutParams(dp(48),dp(44)));root.addView(top);
        ImageView logo=new ImageView(this);logo.setAdjustViewBounds(true);logo.setPadding(dp(5),dp(5),dp(5),dp(5));loadLogo(logo);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(96),dp(96));lp.gravity=Gravity.CENTER_HORIZONTAL;lp.bottomMargin=dp(6);root.addView(logo,lp);
        TextView title=text("Piyare Mobile Telecom",25,textColor());title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);root.addView(title,new LinearLayout.LayoutParams(-1,-2));
        TextView sub=text("Shop operations & secure control",14,mutedColor());sub.setGravity(Gravity.CENTER);sub.setPadding(0,dp(5),0,dp(24));root.addView(sub);
        TextView section=text("Choose a workspace",13,mutedColor());section.setTypeface(Typeface.DEFAULT,Typeface.BOLD);section.setPadding(dp(3),0,0,dp(9));root.addView(section);
        LinearLayout sms=card("SMS Bridge","Dedicated shop SMS sender, login, permission and bridge service.","OPEN SMS BRIDGE",v->startActivity(new Intent(this,MainActivity.class)),true);LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2);cp.bottomMargin=dp(14);root.addView(sms,cp);
        LinearLayout admin=card("Admin Control Room","Dashboard, POS, products, inventory, orders, repairs, customers, website, analytics, media, backups, security and staff access.","OPEN ADMIN CONTROL",v->startActivity(new Intent(this,AdminActivity.class)),false);root.addView(admin,cp);
        LinearLayout billing=card("Quick Billing","Open the daily-use billing/POS screen directly without entering the full Control Room first.","OPEN BILLING",v->startActivity(new Intent(this,AdminActivity.class).putExtra("openBilling",true)),false);LinearLayout bp=new LinearLayout.LayoutParams(-1,-2);root.addView(billing,bp);
        TextView note=text("Theme: "+theme().replace("classic","Classic").replace("paper","Paper Mono").replace("blueprint","Blueprint Draft"),12,mutedColor());note.setPadding(dp(4),dp(20),dp(4),0);root.addView(note);
        setContentView(sv);
    }
}
