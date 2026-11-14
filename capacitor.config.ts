import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tyn.track',
  appName: 'Tyn',
  webDir: 'out',
  android: {
    backgroundColor: '#0D110F',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_tyn',
      iconColor: '#274E3C',
    },
  },
};

export default config;

