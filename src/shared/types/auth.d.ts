// Type augmentation for nuxt-auth-utils
// See: https://github.com/atinux/nuxt-auth-utils#extend-session
declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    displayName?: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface UserSession {
    // Add your own fields
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SecureSessionData {
    // Add your own fields
  }
}

export {}
