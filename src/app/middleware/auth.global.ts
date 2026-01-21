import { Capacitor } from '@capacitor/core'

export default defineNuxtRouteMiddleware(async (to) => {
  const isNative = Capacitor.isNativePlatform()

  // Capacitor native app uses API key auth
  if (isNative) {
    // Skip auth check for setup page
    if (to.path === '/setup') {
      return
    }

    const { isConfigured, isLoaded, loadConfig } = useCapacitorApi()

    // Ensure config is loaded
    if (!isLoaded.value) {
      await loadConfig()
    }

    // Redirect to setup if not configured
    if (!isConfigured.value) {
      return navigateTo('/setup')
    }

    return
  }

  // Web app uses session-based auth
  // Skip auth check for login page
  if (to.path === '/login') {
    return
  }

  // Use nuxt-auth-utils session check
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
