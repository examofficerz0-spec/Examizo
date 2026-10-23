import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.examizo.app',
  appName: 'Examizo',
  webDir: 'out',
  
  server: {
    androidScheme: 'https',
    cleartext: false,
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
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#3B82F6',
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
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
