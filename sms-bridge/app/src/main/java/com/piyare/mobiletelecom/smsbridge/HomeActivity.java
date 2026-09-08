package com.piyare.mobiletelecom.smsbridge;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
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
    private String theme(){return getSharedPreferences("app_theme",MODE_PRIVATE).getString("theme","classic");}
    private int bgColor(){switch(theme()){case "paper":return Color.rgb(244,241,232);case "blueprint":return Color.rgb(235,242,250);default:return Color.rgb(247,248,250);}}
    private int textColor(){return theme().equals("blueprint")?Color.rgb(12,45,78):theme().equals("paper")?Color.rgb(48,43,34):Color.rgb(17,24,39);}
    private int mutedColor(){return theme().equals("blueprint")?Color.rgb(70,95,120):theme().equals("paper")?Color.rgb(105,98,84):Color.rgb(107,114,128);}
    private String surface(){return theme().equals("paper")?"#FFFDF5":theme().equals("blueprint")?"#F8FBFF":"#FFFFFF";}

    // Compact shortcut card: near-square, responsive, and still uses the existing action button/navigation.
    private LinearLayout card(String title,String sub,String action,View.OnClickListener click,boolean primary){
        LinearLayout c=new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.setPadding(dp(12),dp(12),dp(12),dp(12));
        c.setMinimumHeight(dp(164));
        c.setBackground(bg(primary?(theme().equals("blueprint")?"#0B3558":theme().equals("paper")?"#2F2A20":"#111827"):surface(),10));
        c.setElevation(dp(2));

        TextView h=text(title,17,primary?Color.WHITE:textColor());
        h.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        h.setGravity(Gravity.CENTER);
        h.setMaxLines(2);
        c.addView(h,new LinearLayout.LayoutParams(-1,dp(44)));

        TextView p=text(sub,11.5f,primary?Color.rgb(220,228,236):mutedColor());
        p.setGravity(Gravity.CENTER);
        p.setMaxLines(3);
        p.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams pp=new LinearLayout.LayoutParams(-1,0,1);
        pp.topMargin=dp(2);
        pp.bottomMargin=dp(8);
        c.addView(p,pp);

        TextView b=text(action,11.5f,primary?Color.rgb(17,24,39):Color.WHITE);
        b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        b.setGravity(Gravity.CENTER);
        b.setContentDescription(action);
        b.setPadding(dp(8),dp(7),dp(8),dp(7));
        b.setBackground(bg(primary?"#FFFFFF":"#2563EB",8));
        b.setOnClickListener(click);
        c.addView(b,new LinearLayout.LayoutParams(-1,dp(38)));
        return c;
    }

    private void styleLogo(ImageView v){v.setImageResource(R.drawable.logo);v.setScaleType(ImageView.ScaleType.CENTER_INSIDE);v.setBackground(bg("#FFFFFF",12));v.setClipToOutline(true);}
    private TextView iconButton(String glyph,String label,View.OnClickListener click){TextView b=text(glyph,21,textColor());b.setGravity(Gravity.CENTER);b.setContentDescription(label);b.setBackground(bg(theme().equals("blueprint")?"#DCEBFA":theme().equals("paper")?"#E9E1CF":"#FFFFFF",12));b.setElevation(dp(1));b.setOnClickListener(click);return b;}
    private void settings(){final String[] names={"Classic","Paper Mono","Blueprint Draft"};final String[] values={"classic","paper","blueprint"};android.app.AlertDialog.Builder b=new android.app.AlertDialog.Builder(this);b.setTitle("PMT App Theme");b.setItems(names,(d,w)->{getSharedPreferences("app_theme",MODE_PRIVATE).edit().putString("theme",values[w]).apply();recreate();});b.setNeutralButton("App settings",(d,w)->{Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);i.setData(Uri.parse("package:"+getPackageName()));startActivity(i);});b.setNegativeButton("Close",null);b.show();}

    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        ScrollView sv=new ScrollView(this);
        sv.setFillViewport(true);
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(16),dp(12),dp(16),dp(24));
        root.setBackgroundColor(bgColor());
        sv.addView(root);

        LinearLayout top=new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView brand=text("PMT",17,textColor());
        brand.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        top.addView(brand,new LinearLayout.LayoutParams(0,dp(48),1));
        TextView gear=iconButton("⚙","Settings",v->settings());
        top.addView(gear,new LinearLayout.LayoutParams(dp(46),dp(46)));
        root.addView(top);

        ImageView logo=new ImageView(this);styleLogo(logo);
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(88),dp(88));
        lp.gravity=Gravity.CENTER_HORIZONTAL;lp.bottomMargin=dp(6);root.addView(logo,lp);
        TextView title=text("Piyare Mobile Telecom",24,textColor());
        title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));
        TextView sub=text("Shop operations & secure control",13.5f,mutedColor());
        sub.setGravity(Gravity.CENTER);sub.setPadding(0,dp(4),0,dp(22));root.addView(sub);
        TextView section=text("Choose a workspace",12.5f,mutedColor());
        section.setTypeface(Typeface.DEFAULT,Typeface.BOLD);section.setPadding(dp(2),0,0,dp(8));root.addView(section);

        // Two-column responsive shortcut grid. Cards stay compact instead of becoming wide rows.
        LinearLayout row1=new LinearLayout(this);row1.setOrientation(LinearLayout.HORIZONTAL);row1.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams half=new LinearLayout.LayoutParams(0,-2,1);half.setMargins(0,0,dp(6),dp(10));
        row1.addView(card("SMS Bridge","Shop SMS sender and bridge service.","OPEN SMS BRIDGE",v->startActivity(new Intent(this,MainActivity.class)),true),half);
        LinearLayout.LayoutParams half2=new LinearLayout.LayoutParams(0,-2,1);half2.setMargins(dp(6),0,0,dp(10));
        row1.addView(card("Admin Control","Dashboard, POS, products and operations.","OPEN ADMIN CONTROL",v->startActivity(new Intent(this,AdminActivity.class)),false),half2);
        root.addView(row1);

        LinearLayout row2=new LinearLayout(this);row2.setOrientation(LinearLayout.HORIZONTAL);row2.setGravity(Gravity.LEFT);
        LinearLayout.LayoutParams third=new LinearLayout.LayoutParams(0,-2,1);third.setMargins(0,0,dp(6),dp(12));
        row2.addView(card("Quick Billing","Open the daily billing/POS screen directly.","OPEN BILLING",v->startActivity(new Intent(this,AdminActivity.class).putExtra("openBilling",true)),false),third);
        LinearLayout spacer=new LinearLayout(this);row2.addView(spacer,new LinearLayout.LayoutParams(0,dp(164),1));
        LinearLayout spacer2=new LinearLayout(this);row2.addView(spacer2,new LinearLayout.LayoutParams(0,dp(164),1));
        root.addView(row2);

        TextView note=text("Theme: "+theme().replace("classic","Classic").replace("paper","Paper Mono").replace("blueprint","Blueprint Draft"),12,mutedColor());
        note.setGravity(Gravity.CENTER);note.setPadding(dp(4),dp(4),dp(4),0);root.addView(note);
        setContentView(sv);
    }
}
