<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { isNative, config, clearConfig, saveConfig, testConnection, validateApiKey } = useCapacitorApi()

// Redirect to settings if not in Capacitor
if (!isNative) {
  navigateTo('/settings')
}

const showDisconnectModal = ref(false)
const editing = ref<'url' | 'key' | null>(null)
const newServerUrl = ref('')
const newApiKey = ref('')
const loading = ref(false)

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

function startEditUrl() {
  newServerUrl.value = config.value.serverUrl || ''
  editing.value = 'url'
}

function startEditKey() {
  newApiKey.value = ''
  editing.value = 'key'
}

function cancelEdit() {
  editing.value = null
  newServerUrl.value = ''
  newApiKey.value = ''
}

async function onUrlSubmit(event: FormSubmitEvent<{ serverUrl: string }>) {
  loading.value = true

  try {
    const url = event.data.serverUrl.replace(/\/$/, '')
    const isConnected = await testConnection(url)

    if (!isConnected) {
      toast.add({
        title: t('setup.connectionFailed'),
        description: t('setup.connectionFailedDescription'),
        color: 'error'
      })
      return
    }

    // Also validate that the existing API key works with the new server
    if (config.value.apiKey) {
      const isValid = await validateApiKey(url, config.value.apiKey)
      if (!isValid) {
        toast.add({
          title: t('setup.apiKeyInvalid'),
          description: t('serverSettings.apiKeyNotValidForServer'),
          color: 'error'
        })
        return
      }
    }

    await saveConfig(url, config.value.apiKey || '')

    toast.add({
      title: t('serverSettings.serverUrlUpdated'),
      color: 'success'
    })

    editing.value = null
  } finally {
    loading.value = false
  }
}

async function onApiKeySubmit(event: FormSubmitEvent<{ apiKey: string }>) {
  loading.value = true

  try {
    const isValid = await validateApiKey(config.value.serverUrl || '', event.data.apiKey)

    if (!isValid) {
      toast.add({
        title: t('setup.apiKeyInvalid'),
        description: t('setup.apiKeyInvalidDescription'),
        color: 'error'
      })
      return
    }

    await saveConfig(config.value.serverUrl || '', event.data.apiKey)

    toast.add({
      title: t('serverSettings.apiKeyUpdated'),
      color: 'success'
    })

    editing.value = null
  } finally {
    loading.value = false
  }
}

async function disconnect() {
  await clearConfig()
  showDisconnectModal.value = false
  router.push('/setup')
}

function maskApiKey(key: string | null): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}
</script>

<template>
  <div class="py-6">
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <UButton
          variant="ghost"
          icon="i-lucide-arrow-left"
          @click="router.push('/settings')"
        />
        <h1 class="text-lg font-bold">
          {{ $t('serverSettings.title') }}
        </h1>
      </div>

      <UCard>
        <div class="space-y-6">
          <!-- Server URL -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="font-medium">
                {{ $t('setup.serverUrl') }}
              </p>
              <UButton
                v-if="editing !== 'url'"
                variant="ghost"
                size="xs"
                icon="i-lucide-pencil"
                @click="startEditUrl"
              >
                {{ $t('serverSettings.change') }}
              </UButton>
            </div>

            <div
              v-if="editing !== 'url'"
              class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <p class="text-sm text-gray-600 dark:text-gray-400 break-all">
                {{ config.serverUrl }}
              </p>
            </div>

            <UForm
              v-else
              :schema="serverSchema"
              :state="{ serverUrl: newServerUrl }"
              class="space-y-3"
              @submit="onUrlSubmit"
            >
              <UFormField name="serverUrl">
                <UInput
                  v-model="newServerUrl"
                  :placeholder="$t('setup.serverUrlPlaceholder')"
                  icon="i-lucide-server"
                  class="w-full"
                  type="url"
                />
              </UFormField>
              <div class="flex gap-2">
                <UButton
                  variant="outline"
                  size="sm"
                  @click="cancelEdit"
                >
                  {{ $t('common.cancel') }}
                </UButton>
                <UButton
                  type="submit"
                  size="sm"
                  :loading="loading"
                >
                  {{ $t('common.save') }}
                </UButton>
              </div>
            </UForm>
          </div>

          <USeparator />

          <!-- API Key -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="font-medium">
                {{ $t('setup.apiKey') }}
              </p>
              <UButton
                v-if="editing !== 'key'"
                variant="ghost"
                size="xs"
                icon="i-lucide-pencil"
                @click="startEditKey"
              >
                {{ $t('serverSettings.change') }}
              </UButton>
            </div>

            <div
              v-if="editing !== 'key'"
              class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <p class="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {{ maskApiKey(config.apiKey) }}
              </p>
            </div>

            <UForm
              v-else
              :schema="apiKeySchema"
              :state="{ apiKey: newApiKey }"
              class="space-y-3"
              @submit="onApiKeySubmit"
            >
              <UFormField name="apiKey">
                <UInput
                  v-model="newApiKey"
                  :placeholder="$t('setup.apiKeyPlaceholder')"
                  icon="i-lucide-key"
                  class="w-full"
                  type="password"
                />
              </UFormField>
              <div class="flex gap-2">
                <UButton
                  variant="outline"
                  size="sm"
                  @click="cancelEdit"
                >
                  {{ $t('common.cancel') }}
                </UButton>
                <UButton
                  type="submit"
                  size="sm"
                  :loading="loading"
                >
                  {{ $t('common.save') }}
                </UButton>
              </div>
            </UForm>
          </div>

          <USeparator />

          <!-- Disconnect -->
          <div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-red-600 dark:text-red-400">
                  {{ $t('serverSettings.disconnect') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('serverSettings.disconnectDescription') }}
                </p>
              </div>
              <UButton
                color="error"
                variant="outline"
                @click="showDisconnectModal = true"
              >
                {{ $t('serverSettings.disconnect') }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Disconnect Confirmation Modal -->
      <UModal v-model:open="showDisconnectModal">
        <template #content>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">
                {{ $t('serverSettings.disconnectConfirmTitle') }}
              </h3>
            </template>

            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('serverSettings.disconnectConfirmDescription') }}
            </p>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  variant="outline"
                  @click="showDisconnectModal = false"
                >
                  {{ $t('common.cancel') }}
                </UButton>
                <UButton
                  color="error"
                  @click="disconnect"
                >
                  {{ $t('serverSettings.disconnect') }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </div>
</template>
