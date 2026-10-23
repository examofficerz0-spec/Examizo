package com.examizo.app;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Examizo Native Android Application
 * 
 * Standalone offline-capable mobile app built with Capacitor 8.
 * Direct login screen on boot with proper system status bar margins and light mode.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "ExamizoApp";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure the system status bar has dedicated top margin & light icons
        configureSystemBars();

        // Configure WebView settings for optimal native performance
        configureWebView();

        Log.i(TAG, "Examizo Native App initialized successfully");
    }

    private void configureSystemBars() {
        try {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            
            // Clean white status bar matching light mode
            window.setStatusBarColor(0xFFFFFFFF);

            // Set dark notification icons (time, battery, wifi) on the white status bar
            View decorView = window.getDecorView();
            WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(true);
            }

            // Ensure app content starts BELOW the system status bar
            WindowCompat.setDecorFitsSystemWindows(window, true);
        } catch (Exception e) {
            Log.w(TAG, "Status bar configuration note: " + e.getMessage());
        }
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

        // Enable local disk caching to minimize server load
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Enable third-party cookies for secure sessions and Google authentication
        android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // JavaScript and Viewport
        settings.setJavaScriptEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Lock text zoom to 100%
        settings.setTextZoom(100);

        // Scroll and background appearance (light theme)
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setBackgroundColor(0xFFFFFFFF);

        Log.d(TAG, "WebView configured with native caching, third-party cookies, and light theme");
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            String currentUrl = webView.getUrl();
            // Don't navigate back into auth if already on dashboard or login root
            if (currentUrl != null && !currentUrl.endsWith("/login") && !currentUrl.endsWith("/dashboard")) {
                webView.goBack();
                return;
            }
        }
        super.onBackPressed();
    }
}
