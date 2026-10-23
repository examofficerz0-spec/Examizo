package com.examizo.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Examizo Native Android Application
 * 
 * Standalone offline-capable mobile app built with Capacitor 8.
 * All core user experiences (Dashboard, Practice Quizzes, Mock Tests,
 * Leaderboard, and Profile) run 100% locally on the device from local assets.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "ExamizoApp";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure WebView settings for optimal native performance
        configureWebView();

        Log.i(TAG, "Examizo Native App v2.0.0 initialized successfully");
    }

    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        WebSettings settings = webView.getSettings();

        // Enable DOM and Local Storage for offline persistence
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // JavaScript and Viewport
        settings.setJavaScriptEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Lock text zoom to 100%
        settings.setTextZoom(100);

        // Scroll and background appearance
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setBackgroundColor(0xFF0F172A);

        Log.d(TAG, "WebView configured for local offline execution");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
    }
}
