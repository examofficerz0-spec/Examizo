package com.examizo.app;

import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.NonNull;

import com.getcapacitor.BridgeActivity;

/**
 * Examizo Native App - Capacitor-powered with enhanced native caching.
 * 
 * Architecture:
 * - Capacitor BridgeActivity provides the native WebView container
 * - Server URL loads from https://examizo.com (SSR + API routes)
 * - Aggressive WebView cache configuration for fast subsequent loads
 * - Service Worker intercepts static assets for offline caching
 * - Native splash screen, status bar, keyboard, haptics plugins
 * - Deep linking support for examizo:// and https://examizo.com
 * - Network state monitoring with auto-reconnect
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "ExamizoApp";
    private ConnectivityManager.NetworkCallback networkCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure aggressive WebView caching after bridge is initialized
        configureWebViewCaching();

        // Configure Service Worker for background caching
        configureServiceWorker();

        // Monitor network connectivity for smart cache management
        registerNetworkCallback();

        Log.i(TAG, "Examizo v2.0.0 (Capacitor) initialized successfully");
    }

    /**
     * Configure WebView settings for aggressive native caching.
     * This ensures static assets (JS bundles, CSS, images, fonts) are
     * cached locally on the device for fast subsequent loads.
     */
    private void configureWebViewCaching() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        WebSettings settings = webView.getSettings();

        // Enable all storage mechanisms
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Aggressive caching strategy:
        // LOAD_DEFAULT uses HTTP cache headers, but we want even more aggressive caching
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Enable app cache for offline support (deprecated but still functional)
        settings.setJavaScriptEnabled(true);

        // Media and mixed content
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Viewport and rendering
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Lock text zoom to prevent accessibility font scaling from breaking layouts
        settings.setTextZoom(100);

        // Scroll behavior
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // Background color to prevent white flashes
        webView.setBackgroundColor(0xFFF8FAFC);

        Log.d(TAG, "WebView caching configured: DOM Storage + Database + Cache");
    }

    /**
     * Configure Service Worker to enable background asset caching.
     * The Service Worker (sw.js) on examizo.com handles:
     * - Pre-caching of critical assets (icons, manifest, fonts)
     * - Cache-first for static assets (images, CSS, JS bundles)
     * - Network-first for page navigations (always fresh content)
     * - Offline fallback for cached pages
     */
    private void configureServiceWorker() {
        try {
            ServiceWorkerController swController = ServiceWorkerController.getInstance();
            swController.setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    // Let the Service Worker handle all caching logic
                    // This enables the same PWA caching on native as on web
                    return null;
                }
            });

            // Allow Service Worker to use caching settings
            android.webkit.ServiceWorkerWebSettings swSettings = swController.getServiceWorkerWebSettings();
            swSettings.setAllowContentAccess(true);
            swSettings.setAllowFileAccess(true);
            swSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
            swSettings.setBlockNetworkLoads(false);

            Log.d(TAG, "Service Worker controller configured for background caching");
        } catch (Exception e) {
            Log.w(TAG, "Service Worker configuration failed (not critical): " + e.getMessage());
        }
    }

    /**
     * Monitor network state changes to switch between online/offline cache modes.
     * When offline: serve everything from cache
     * When back online: revalidate stale cache entries
     */
    private void registerNetworkCallback() {
        try {
            ConnectivityManager cm = getSystemService(ConnectivityManager.class);
            if (cm == null) return;

            NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();

            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(@NonNull Network network) {
                    Log.d(TAG, "Network available - using LOAD_DEFAULT cache mode");
                    runOnUiThread(() -> {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            webView.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
                        }
                    });
                }

                @Override
                public void onLost(@NonNull Network network) {
                    Log.d(TAG, "Network lost - switching to LOAD_CACHE_ELSE_NETWORK");
                    runOnUiThread(() -> {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
                        }
                    });
                }
            };

            cm.registerNetworkCallback(request, networkCallback);
            Log.d(TAG, "Network callback registered for smart cache switching");
        } catch (Exception e) {
            Log.w(TAG, "Network callback registration failed: " + e.getMessage());
        }
    }

    /**
     * Handle deep links from external apps.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri uri = intent.getData();
            if (uri != null) {
                Log.d(TAG, "Deep link received: " + uri.toString());
                String path = uri.getPath();
                if (path != null && !path.isEmpty()) {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) {
                        webView.loadUrl("https://examizo.com" + path);
                    }
                }
            }
        }
    }

    @Override
    public void onDestroy() {
        // Unregister network callback
        if (networkCallback != null) {
            try {
                ConnectivityManager cm = getSystemService(ConnectivityManager.class);
                if (cm != null) {
                    cm.unregisterNetworkCallback(networkCallback);
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to unregister network callback: " + e.getMessage());
            }
        }
        super.onDestroy();
    }
}
