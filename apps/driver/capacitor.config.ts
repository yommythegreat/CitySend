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
      style:           'Light',   // white icons on dark background
      backgroundColor: '#0f172a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // iOS: always-on background location for active deliveries
    },
  },
}

export default config
