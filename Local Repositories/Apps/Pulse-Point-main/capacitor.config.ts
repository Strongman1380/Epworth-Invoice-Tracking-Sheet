
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.094603cc60e741a38d5d706dcee0a0d6',
  appName: 'pulse-point',
  webDir: 'dist',
  server: {
    url: 'https://094603cc-60e7-41a3-8d5d-706dcee0a0d6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e293b',
      showSpinner: false
    }
  }
};

export default config;
