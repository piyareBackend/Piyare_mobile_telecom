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
import android.view.ViewGroup;

public class MainActivity extends Activity {
    static final int SMS_PERMISSION=100;
    android.content.SharedPreferences prefs;
    EditText token;
    @Override public void onCreate(Bundle b){super.onCreate(b);
        prefs=getSharedPreferences("bridge",MODE_PRIVATE);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(32,32,32,32);
        TextView title=new TextView(this);title.setText("PMT SMS Bridge");title.setTextSize(24);title.setTextColor(Color.BLACK);root.addView(title);
        TextView info=new TextView(this);info.setText("Keep this shop Android phone powered and connected. The bridge checks PMT orders/repairs and sends customer SMS automatically from this phone's SIM. Enter an active PMT admin session token once.");info.setPadding(0,20,0,20);root.addView(info);
        token=new EditText(this);token.setHint("PMT admin session token");token.setText(prefs.getString("token",""));root.addView(token,new LinearLayout.LayoutParams(-1,-2));
        Button save=new Button(this);save.setText("Save & Start");root.addView(save,new LinearLayout.LayoutParams(-1,-2));
        TextView status=new TextView(this);status.setPadding(0,20,0,0);status.setText("Not running");root.addView(status,new LinearLayout.LayoutParams(-1,-2));
        setContentView(root);
        save.setOnClickListener(v->{String t=token.getText().toString().trim();if(t.isEmpty()){status.setText("Enter a token first");return;}prefs.edit().putString("token",t).apply();if(checkSelfPermission(Manifest.permission.SEND_SMS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.SEND_SMS},SMS_PERMISSION);startService(new Intent(this,SmsBridgeService.class));status.setText("Bridge running");});
    }
}
