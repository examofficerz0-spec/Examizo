import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.examizo.app',
  appName: 'Examizo',
  webDir: 'out',
  
  server: {
    url: 'https://www.examizo.com/login',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: ['www.examizo.com', '*.examizo.com', 'accounts.google.com'],
  },

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
    overrideUserAgent: 'ExamizoApp/2.0.0 (Capacitor/Android)',
    appendUserAgent: 'ExamizoNative/2.0',
    backgroundColor: '#FFFFFF',
    useLegacyBridge: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#2563EB',
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
