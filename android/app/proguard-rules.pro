# Keep Capacitor core & plugins
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.PluginMethod class * { *; }

# Keep Webkit & Javascript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova plugins if any
-keep class org.apache.cordova.** { *; }

# Keep models & config
-keep class com.examizo.app.** { *; }

# Don't warn on missing optional classes
-dontwarn com.google.android.gms.**
-dontwarn androidx.core.app.NotificationManagerCompat
