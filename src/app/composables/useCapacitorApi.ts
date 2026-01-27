import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const STORAGE_KEYS = {
  SERVER_URL: 'habitwire_server_url',
  API_KEY: 'habitwire_api_key',
  AUTH_MODE: 'habitwire_auth_mode'
} as const

type AuthMode = 'hosted' | 'self-hosted'

interface CapacitorConfig {
  serverUrl: string | null
  apiKey: string | null
  authMode: AuthMode | null
}

const config = ref<CapacitorConfig>({
  serverUrl: null,
  apiKey: null,
  authMode: null
})

const isLoaded = ref(false)

export function useCapacitorApi() {
  const isNative = Capacitor.isNativePlatform()
  const isConfigured = computed(() => !!config.value.serverUrl && !!config.value.apiKey)

  async function loadConfig(): Promise<CapacitorConfig> {
    if (!isNative) {
      return { serverUrl: null, apiKey: null, authMode: null }
    }

    const [serverUrlResult, apiKeyResult, authModeResult] = await Promise.all([
      Preferences.get({ key: STORAGE_KEYS.SERVER_URL }),
      Preferences.get({ key: STORAGE_KEYS.API_KEY }),
      Preferences.get({ key: STORAGE_KEYS.AUTH_MODE })
    ])

    config.value = {
      serverUrl: serverUrlResult.value,
      apiKey: apiKeyResult.value,
      authMode: authModeResult.value as AuthMode | null
    }
    isLoaded.value = true

    return config.value
  }

  async function saveConfig(serverUrl: string, apiKey: string, authMode: AuthMode = 'self-hosted'): Promise<void> {
    if (!isNative) {
      return
    }

    await Promise.all([
      Preferences.set({ key: STORAGE_KEYS.SERVER_URL, value: serverUrl }),
      Preferences.set({ key: STORAGE_KEYS.API_KEY, value: apiKey }),
      Preferences.set({ key: STORAGE_KEYS.AUTH_MODE, value: authMode })
    ])

    config.value = { serverUrl, apiKey, authMode }
  }

  async function clearConfig(): Promise<void> {
    if (!isNative) {
      return
    }

    await Promise.all([
      Preferences.remove({ key: STORAGE_KEYS.SERVER_URL }),
      Preferences.remove({ key: STORAGE_KEYS.API_KEY }),
      Preferences.remove({ key: STORAGE_KEYS.AUTH_MODE })
    ])

    config.value = { serverUrl: null, apiKey: null, authMode: null }
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

  function isHostedMode(): boolean {
    const runtimeConfig = useRuntimeConfig()
    // Environment variables can come as strings, so handle both cases
    const hostedMode = runtimeConfig.public.hostedMode
    return hostedMode === true || String(hostedMode) === 'true'
  }

  function getHostedUrl(): string {
    const runtimeConfig = useRuntimeConfig()
    return runtimeConfig.public.hostedUrl as string || ''
  }

  interface MobileLoginResponse {
    user: {
      id: string
      username: string
      display_name: string | null
      email: string | null
      email_verified: boolean
      is_admin: boolean
    }
    api_key: string
  }

  async function mobileLogin(serverUrl: string, username: string, password: string): Promise<MobileLoginResponse> {
    const response = await fetch(`${serverUrl}/api/v1/auth/mobile-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `Login failed: ${response.status}`)
    }

    return response.json()
  }

  async function saveHostedConfig(apiKey: string): Promise<void> {
    const hostedUrl = getHostedUrl()
    if (!hostedUrl) {
      throw new Error('Hosted URL not configured')
    }
    await saveConfig(hostedUrl, apiKey, 'hosted')
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
    validateApiKey,
    isHostedMode,
    getHostedUrl,
    mobileLogin,
    saveHostedConfig
  }
}
