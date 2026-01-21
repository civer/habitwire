import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  const { config } = useCapacitorApi()

  // Intercept all $fetch requests to add server URL and API key
  globalThis.$fetch = $fetch.create({
    onRequest({ options, request }) {
      // Only intercept API requests
      if (typeof request === 'string' && request.startsWith('/api/')) {
        // Prepend server URL
        if (config.value.serverUrl) {
          options.baseURL = config.value.serverUrl
        }

        // Add API key header
        if (config.value.apiKey) {
          const headers = new Headers(options.headers as HeadersInit)
          headers.set('Authorization', `ApiKey ${config.value.apiKey}`)
          options.headers = headers
        }
      }
    }
  })
})
