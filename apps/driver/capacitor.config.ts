import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.citysend.driver',
  appName: 'CitySend Driver',
  webDir:  'dist',

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor:    '#0f172a',
      showSpinner:        false,
    },
    StatusBar: {
      style: 'LIGHT',   // dark text for the light login screen; App.tsx switches per screen
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
