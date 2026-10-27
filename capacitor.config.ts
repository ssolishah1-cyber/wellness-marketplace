import type { CapacitorConfig } from "@capacitor/cli";
import app from "./app.config.json";

const config: CapacitorConfig = {
  appId: app.appId,
  appName: app.appName,
  webDir: "dist-native",
  backgroundColor: "#f1f5f0",
  ios: { contentInset: "never" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: false, backgroundColor: "#1c7a4b", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#ffffff", overlaysWebView: false },
    LocalNotifications: { iconColor: "#1c7a4b" },
  },
};

export default config;
