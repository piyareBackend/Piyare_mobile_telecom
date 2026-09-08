package com.piyare.mobiletelecom.smsbridge;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class AdminActivity extends Activity {
    private static final String ADMIN_URL="https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/admin/";
    private WebView web;
    @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(0xFF111827);
        FrameLayout root=new FrameLayout(this);web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(true);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setLoadWithOverviewMode(false);s.setUseWideViewPort(false);s.setMediaPlaybackRequiresUserGesture(false);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();String host=u.getHost();if(host!=null&&host.equals("piyare-mobile-telecom.sadab-notes-backup.workers.dev"))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}});
        web.setWebChromeClient(new WebChromeClient());web.loadUrl(ADMIN_URL);
    }
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
