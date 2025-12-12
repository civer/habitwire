export default defineNuxtRouteMiddleware(async (to) => {
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
