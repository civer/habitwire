import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEYS = {
  SERVER_URL: 'habitwire_server_url',
  API_KEY: 'habitwire_api_key'
} as const

interface CapacitorConfig {
  serverUrl: string | null
  apiKey: string | null
}

const config = ref<CapacitorConfig>({
  serverUrl: null,
  apiKey: null
})

const isLoaded = ref(false)

export function useCapacitorApi() {
  const isNative = Capacitor.isNativePlatform()
  const isConfigured = computed(() => !!config.value.serverUrl && !!config.value.apiKey)

  async function loadConfig(): Promise<CapacitorConfig> {
    if (!isNative) {
      return { serverUrl: null, apiKey: null }
    }

    const [serverUrlResult, apiKeyResult] = await Promise.all([
      Preferences.get({ key: STORAGE_KEYS.SERVER_URL }),
      Preferences.get({ key: STORAGE_KEYS.API_KEY })
    ])

    config.value = {
      serverUrl: serverUrlResult.value,
      apiKey: apiKeyResult.value
    }
    isLoaded.value = true

    return config.value
  }

  async function saveConfig(serverUrl: string, apiKey: string): Promise<void> {
    if (!isNative) {
      return
    }

    await Promise.all([
      Preferences.set({ key: STORAGE_KEYS.SERVER_URL, value: serverUrl }),
      Preferences.set({ key: STORAGE_KEYS.API_KEY, value: apiKey })
    ])

    config.value = { serverUrl, apiKey }
  }

  async function clearConfig(): Promise<void> {
    if (!isNative) {
      return
    }

    await Promise.all([
      Preferences.remove({ key: STORAGE_KEYS.SERVER_URL }),
      Preferences.remove({ key: STORAGE_KEYS.API_KEY })
    ])

    config.value = { serverUrl: null, apiKey: null }
  }

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!config.value.serverUrl || !config.value.apiKey) {
      throw new Error('Capacitor API not configured')
    }

    const url = `${config.value.serverUrl}${path}`
    const headers = new Headers(options.headers)
    headers.set('Authorization', `ApiKey ${config.value.apiKey}`)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `Request failed: ${response.status}`)
    }

    return response.json()
  }

  async function testConnection(serverUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${serverUrl}/api/v1/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function validateApiKey(serverUrl: string, apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${serverUrl}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  return {
    isNative,
    isConfigured,
    isLoaded: readonly(isLoaded),
    config: readonly(config),
    loadConfig,
    saveConfig,
    clearConfig,
    apiFetch,
    testConnection,
    validateApiKey
  }
}
