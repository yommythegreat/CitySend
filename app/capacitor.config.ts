import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.citysend.customer',
  appName: 'CitySend',
  webDir:  'dist',

  plugins: {
    SplashScreen: {
      // App.tsx hides the splash as soon as the first real screen paints, so
      // there's no fixed wait. setupCapacitor() has a safety timeout.
      launchAutoHide:     false,
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
