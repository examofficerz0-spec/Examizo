package com.examizo.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import org.json.JSONObject;

/**
 * Examizo Native Android Application
 * 
 * Standalone offline-capable mobile app built with Capacitor 8.
 * Direct login screen on boot with proper system status bar margins, light mode,
 * and 1-tap Native Google Play Services Account Picker.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "ExamizoApp";
    private static final int RC_SIGN_IN = 9001;
    private static final String GOOGLE_SERVER_CLIENT_ID = "342748712178-6tqqq7neiln6vnj2ioofqn1qun9gr0gb.apps.googleusercontent.com";

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

        // Expose Native Google Play Services bridge to the web view
        webView.addJavascriptInterface(new NativeAuthBridge(), "AndroidNativeAuth");

        Log.d(TAG, "WebView configured with native caching, Google Play Services bridge, and light theme");
    }

    /**
     * Native JavaScript Interface allowing 1-tap Google Sign-In directly using Android OS accounts
     */
    public class NativeAuthBridge {
        @JavascriptInterface
        public void launchGoogleSignIn() {
            runOnUiThread(() -> {
                try {
                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(GOOGLE_SERVER_CLIENT_ID)
                        .requestEmail()
                        .requestProfile()
                        .build();

                    GoogleSignInClient client = GoogleSignIn.getClient(MainActivity.this, gso);
                    
                    // Clear previous sign-in cache so user can always see/select their on-device Google account
                    client.signOut().addOnCompleteListener(task -> {
                        Intent signInIntent = client.getSignInIntent();
                        startActivityForResult(signInIntent, RC_SIGN_IN);
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Failed to launch native Google Sign-In intent", e);
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String idToken = account.getIdToken();
                    String email = account.getEmail();
                    String name = account.getDisplayName();

                    WebView webView = getBridge().getWebView();
                    if (webView != null && idToken != null) {
                        String js = String.format(
                            "if (typeof window.handleNativeGoogleSignIn === 'function') { window.handleNativeGoogleSignIn(%s, %s, %s); }",
                            JSONObject.quote(idToken),
                            JSONObject.quote(email != null ? email : ""),
                            JSONObject.quote(name != null ? name : "")
                        );
                        webView.evaluateJavascript(js, null);
                    }
                }
            } catch (ApiException e) {
                Log.e(TAG, "Native Google Sign-In error code: " + e.getStatusCode(), e);
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.evaluateJavascript(
                        "if (typeof window.handleNativeGoogleError === 'function') { window.handleNativeGoogleError('" + e.getStatusCode() + "'); }",
                        null
                    );
                }
            }
        }
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
