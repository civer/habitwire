export default defineNuxtRouteMiddleware(async () => {
  const { data: user } = await useFetch('/api/v1/auth/me')

  if (!user.value?.user?.is_admin) {
    return navigateTo('/')
  }
})
