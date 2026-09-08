package com.piyare.mobiletelecom.smsbridge;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class HomeActivity extends Activity {
    private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String s,float size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);return t;}
    private GradientDrawable bg(String color,float radius){GradientDrawable g=new GradientDrawable();g.setColor(Color.parseColor(color));g.setCornerRadius(dp(radius));return g;}
    private LinearLayout card(String title,String sub,String action,View.OnClickListener click,boolean primary){
        LinearLayout c=new LinearLayout(this);c.setOrientation(LinearLayout.VERTICAL);c.setPadding(dp(20),dp(20),dp(20),dp(20));c.setBackground(bg(primary?"#111827":"#FFFFFF",18));c.setElevation(dp(3));
        TextView h=text(title,21,primary?Color.WHITE:Color.rgb(17,24,39));h.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(h);
        TextView p=text(sub,14,primary?Color.rgb(209,213,219):Color.rgb(107,114,128));p.setPadding(0,dp(7),0,dp(15));c.addView(p);
        TextView b=text(action,14,primary?Color.rgb(17,24,39):Color.WHITE);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setGravity(Gravity.CENTER);b.setPadding(dp(12),dp(11),dp(12),dp(11));b.setBackground(bg(primary?"#FFFFFF":"#2563EB",12));b.setOnClickListener(click);c.addView(b,new LinearLayout.LayoutParams(-1,dp(44)));
        return c;
    }
    @Override public void onCreate(Bundle b){super.onCreate(b);
        ScrollView sv=new ScrollView(this);sv.setFillViewport(true);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(22),dp(20),dp(28));root.setBackgroundColor(Color.rgb(247,248,250));sv.addView(root);
        ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.pmt_logo);logo.setAdjustViewBounds(true);logo.setPadding(dp(8),dp(8),dp(8),dp(8));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(88),dp(88));lp.gravity=Gravity.CENTER_HORIZONTAL;root.addView(logo,lp);
        TextView title=text("Piyare Mobile Telecom",25,Color.rgb(17,24,39));title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);root.addView(title,new LinearLayout.LayoutParams(-1,-2));
        TextView sub=text("Shop operations & secure control",14,Color.rgb(107,114,128));sub.setGravity(Gravity.CENTER);sub.setPadding(0,dp(5),0,dp(25));root.addView(sub);
        TextView section=text("Choose a workspace",13,Color.rgb(107,114,128));section.setTypeface(Typeface.DEFAULT,Typeface.BOLD);section.setPadding(dp(3),0,0,dp(9));root.addView(section);
        LinearLayout sms=card("SMS Bridge","Run the dedicated shop SMS sender, manage SMS permission and bridge credentials.","OPEN SMS BRIDGE",v->startActivity(new Intent(this,MainActivity.class)),true);LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2);cp.bottomMargin=dp(14);root.addView(sms,cp);
        LinearLayout admin=card("Admin Control Room","Full owner/staff control: Dashboard, POS, billing, products, inventory, orders, repairs, customers, coupons, website, analytics, media, backups, security and staff access.","OPEN ADMIN CONTROL",v->startActivity(new Intent(this,AdminActivity.class)),false);root.addView(admin,cp);
        TextView note=text("Admin uses the same secure server-side authentication and permission system as the production website. No admin password is stored in this Android app.",12,Color.rgb(107,114,128));note.setPadding(dp(4),dp(22),dp(4),0);root.addView(note);
        setContentView(sv);
    }
}
