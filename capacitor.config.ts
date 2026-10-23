import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.examizo.app',
  appName: 'Examizo',
  webDir: 'out',
  
  // Server configuration - load from remote with aggressive caching
  server: {
    url: 'https://examizo.com',
    cleartext: false,
    androidScheme: 'https',
    // Allow navigation to these origins inside the app
    allowNavigation: [
      'examizo.com',
      '*.examizo.com',
      'accounts.google.com',
      'digilocker.meripehchaan.gov.in',
      'medizoserver.vercel.app',
      '*.cloudflare.com',
    ],
  },

  // Android-specific config
  android: {
    buildOptions: {
      keystorePath: '../android-app/keystore/examizo-release-key.jks',
      keystoreAlias: 'examizo',
      keystorePassword: 'Examizo@2026',
      keystoreAliasPassword: 'Examizo@2026',
      releaseType: 'APK',
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Override the default user agent
    overrideUserAgent: 'ExamizoApp/2.0.0 (Capacitor/Android)',
    appendUserAgent: 'ExamizoNative/2.0',
    backgroundColor: '#F8FAFC',
    // Aggressive WebView caching
    useLegacyBridge: false,
  },

  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#6366F1',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0F172A',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    App: {
      // Deep link handling
    },
  },
};

export default config;
