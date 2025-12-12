// Type augmentation for nuxt-auth-utils
// See: https://github.com/atinux/nuxt-auth-utils#extend-session
declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    displayName?: string | null
  }

  interface UserSession {
    // Add your own fields
  }

  interface SecureSessionData {
    // Add your own fields
  }
}

export {}
