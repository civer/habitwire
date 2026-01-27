import { Capacitor } from '@capacitor/core'

export default defineNuxtRouteMiddleware(async (to) => {
  const isNative = Capacitor.isNativePlatform()

  // Capacitor native app uses API key auth
  if (isNative) {
    const { isConfigured, isLoaded, loadConfig, isHostedMode } = useCapacitorApi()

    // Ensure config is loaded
    if (!isLoaded.value) {
      await loadConfig()
    }

    const hostedMode = isHostedMode()

    if (hostedMode) {
      // Hosted Mode: Login page instead of setup
      if (to.path === '/native-login' || to.path === '/setup') {
        return
      }

      if (!isConfigured.value) {
        return navigateTo('/native-login')
      }
    } else {
      // Self-Hosted Mode: setup page as before
      if (to.path === '/setup') {
        return
      }

      if (!isConfigured.value) {
        return navigateTo('/setup')
      }
    }

    return
  }

  // Web app uses session-based auth
  // Skip auth check for public auth pages
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/magic-link']
  if (publicPaths.includes(to.path)) {
    return
  }

  // Use nuxt-auth-utils session check
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
