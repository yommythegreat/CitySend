import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.citysend.customer',
  appName: 'CitySend',
  webDir:  'dist',

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor:    '#ffffff',
      showSpinner:        false,
    },
    StatusBar: {
      style:           'Dark',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
