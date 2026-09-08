package com.piyare.mobiletelecom.smsbridge;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class AdminActivity extends Activity {
    private static final String ADMIN_URL="https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/admin/";
    private static final int FILE_PICKER=701;
    private WebView web;
    private ValueCallback<Uri[]> uploadCallback;
    @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(0xFF111827);
        FrameLayout root=new FrameLayout(this);web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(true);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setLoadWithOverviewMode(false);s.setUseWideViewPort(false);s.setMediaPlaybackRequiresUserGesture(false);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();String host=u.getHost();if(host!=null&&host.equals("piyare-mobile-telecom.sadab-notes-backup.workers.dev"))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}});
        web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){if(uploadCallback!=null)uploadCallback.onReceiveValue(null);uploadCallback=cb;try{Intent i=params.createIntent();i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,FILE_PICKER);return true;}catch(Exception e){uploadCallback=null;return false;}}});
        web.loadUrl(ADMIN_URL);
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==FILE_PICKER&&uploadCallback!=null){Uri[] r=null;if(resultCode==RESULT_OK&&data!=null){Uri u=data.getData();if(u!=null)r=new Uri[]{u};else if(data.getClipData()!=null){int n=data.getClipData().getItemCount();r=new Uri[n];for(int i=0;i<n;i++)r[i]=data.getClipData().getItemAt(i).getUri();}}uploadCallback.onReceiveValue(r);uploadCallback=null;}}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(uploadCallback!=null){uploadCallback.onReceiveValue(null);uploadCallback=null;}if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
