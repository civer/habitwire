import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  // Configure StatusBar
  if (Capacitor.getPlatform() === 'android') {
    await StatusBar.setBackgroundColor({ color: '#22c55e' })
  }
  await StatusBar.setStyle({ style: Style.Light })

  // Load stored config
  const { loadConfig } = useCapacitorApi()
  await loadConfig()

  // Hide splash screen after initialization
  await SplashScreen.hide()
})
