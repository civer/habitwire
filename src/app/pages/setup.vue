<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const { isNative, saveConfig, testConnection, validateApiKey, isHostedMode } = useCapacitorApi()

const hostedMode = isHostedMode()

// Redirect to login if not in Capacitor
if (!isNative) {
  navigateTo('/login')
}

const step = ref<'server' | 'apikey'>('server')
const serverUrl = ref('')
const apiKey = ref('')
const loading = ref(false)
const testingConnection = ref(false)

const serverSchema = z.object({
  serverUrl: z.string()
    .min(1, t('setup.serverUrlRequired'))
    .url(t('setup.serverUrlInvalid'))
    .refine(url => url.startsWith('https://') || url.startsWith('http://localhost'), {
      message: t('setup.httpsRequired')
    })
})

const apiKeySchema = z.object({
  apiKey: z.string()
    .min(1, t('setup.apiKeyRequired'))
    .regex(/^hw_/, t('setup.apiKeyInvalidFormat'))
})

async function onServerSubmit(event: FormSubmitEvent<{ serverUrl: string }>) {
  testingConnection.value = true

  try {
    // Remove trailing slash
    const url = event.data.serverUrl.replace(/\/$/, '')
    serverUrl.value = url

    const isConnected = await testConnection(url)

    if (!isConnected) {
      toast.add({
        title: t('setup.connectionFailed'),
        description: t('setup.connectionFailedDescription'),
        color: 'error'
      })
      return
    }

    toast.add({
      title: t('setup.connectionSuccess'),
      color: 'success'
    })
    step.value = 'apikey'
  } finally {
    testingConnection.value = false
  }
}

async function onApiKeySubmit(event: FormSubmitEvent<{ apiKey: string }>) {
  loading.value = true

  try {
    const isValid = await validateApiKey(serverUrl.value, event.data.apiKey)

    if (!isValid) {
      toast.add({
        title: t('setup.apiKeyInvalid'),
        description: t('setup.apiKeyInvalidDescription'),
        color: 'error'
      })
      return
    }

    await saveConfig(serverUrl.value, event.data.apiKey)

    toast.add({
      title: t('setup.setupComplete'),
      color: 'success'
    })

    router.push('/')
  } finally {
    loading.value = false
  }
}

function goBack() {
  step.value = 'server'
}
</script>

<template>
  <UApp>
    <UNotifications />
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <UCard class="w-full max-w-sm">
        <template #header>
          <div class="text-center">
            <h1 class="text-2xl font-bold">
              {{ $t('app.name') }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ step === 'server' ? $t('setup.connectToServer') : $t('setup.enterApiKey') }}
            </p>
          </div>
        </template>

        <!-- Step 1: Server URL -->
        <UForm
          v-if="step === 'server'"
          :schema="serverSchema"
          :state="{ serverUrl }"
          class="space-y-4"
          @submit="onServerSubmit"
        >
          <div>
            <label class="block text-sm font-medium mb-1">
              {{ $t('setup.serverUrl') }}
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {{ $t('setup.serverUrlHint') }}
            </p>
            <UFormField name="serverUrl">
              <UInput
                v-model="serverUrl"
                :placeholder="$t('setup.serverUrlPlaceholder')"
                icon="i-lucide-server"
                class="w-full"
                type="url"
                autocapitalize="none"
                autocorrect="off"
              />
            </UFormField>
          </div>

          <UButton
            type="submit"
            block
            :loading="testingConnection"
          >
            {{ $t('setup.testConnection') }}
          </UButton>
        </UForm>

        <!-- Step 2: API Key -->
        <UForm
          v-else
          :schema="apiKeySchema"
          :state="{ apiKey }"
          class="space-y-4"
          @submit="onApiKeySubmit"
        >
          <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              <UIcon
                name="i-lucide-server"
                class="inline-block mr-1"
              />
              {{ serverUrl }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">
              {{ $t('setup.apiKey') }}
            </label>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {{ $t('setup.apiKeyHint') }}
            </p>
            <UFormField name="apiKey">
              <UInput
                v-model="apiKey"
                :placeholder="$t('setup.apiKeyPlaceholder')"
                icon="i-lucide-key"
                class="w-full"
                type="password"
                autocapitalize="none"
                autocorrect="off"
              />
            </UFormField>
          </div>

          <div class="flex gap-2">
            <UButton
              variant="outline"
              @click="goBack"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              type="submit"
              block
              :loading="loading"
            >
              {{ $t('setup.connect') }}
            </UButton>
          </div>
        </UForm>

        <template #footer>
          <div class="flex flex-col items-center gap-3">
            <!-- Back to hosted login button (only in hosted mode) -->
            <button
              v-if="hostedMode"
              type="button"
              class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              @click="navigateTo('/native-login')"
            >
              {{ $t('setup.backToHostedLogin') }}
            </button>

            <div class="flex items-center gap-3">
              <LanguageSwitcher />
              <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
