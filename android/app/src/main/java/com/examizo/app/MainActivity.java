package com.examizo.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Examizo Native Android Application
 * 
 * Configured with proper system bar margins:
 * - Content starts below the Android status bar / notification center (fitsSystemWindows)
 * - Status bar background colored #0F172A with clear light icons
 * - Standalone offline-capable mobile app running directly on device
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "ExamizoApp";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Configure status bar margins so the notification control center NEVER overlaps app content
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(0xFF0F172A); // Dark slate matching header theme

        // 2. Ensure Android decor fits system windows (normal app status bar margin)
        WindowCompat.setDecorFitsSystemWindows(window, true);

        View root = findViewById(android.R.id.content);
        if (root != null) {
            root.setFitsSystemWindows(true);
        }

        // 3. Configure light icons for status bar on dark background
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = window.getDecorView();
            decor.setSystemUiVisibility(0);
        }

        // 4. Configure WebView settings
        configureWebView();

        Log.i(TAG, "Examizo Native App initialized with proper status bar margins");
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
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
    }
}
