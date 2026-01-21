<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { config, clearConfig, testConnection, validateApiKey } = useCapacitorApi()

const showDisconnectModal = ref(false)
const verifying = ref(false)

async function verifyConnection() {
  verifying.value = true

  try {
    const serverOk = await testConnection(config.value.serverUrl || '')
    if (!serverOk) {
      toast.add({
        title: t('serverSettings.verifyFailed'),
        description: t('serverSettings.serverNotReachable'),
        color: 'error'
      })
      return
    }

    const authOk = await validateApiKey(config.value.serverUrl || '', config.value.apiKey || '')
    if (!authOk) {
      toast.add({
        title: t('serverSettings.verifyFailed'),
        description: t('serverSettings.apiKeyNoLongerValid'),
        color: 'error'
      })
      return
    }

    toast.add({
      title: t('serverSettings.verifySuccess'),
      color: 'success'
    })
  } finally {
    verifying.value = false
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
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ $t('serverSettings.title') }}
      </h2>
    </template>

    <div class="space-y-6">
      <!-- Server URL -->
      <div>
        <p class="font-medium mb-2">
          {{ $t('setup.serverUrl') }}
        </p>
        <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400 break-all">
            {{ config.serverUrl }}
          </p>
        </div>
      </div>

      <!-- API Key -->
      <div>
        <p class="font-medium mb-2">
          {{ $t('setup.apiKey') }}
        </p>
        <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {{ maskApiKey(config.apiKey) }}
          </p>
        </div>
      </div>

      <USeparator />

      <!-- Verify Connection -->
      <div>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">
              {{ $t('serverSettings.verifyConnection') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('serverSettings.verifyConnectionDescription') }}
            </p>
          </div>
          <UButton
            variant="outline"
            icon="i-lucide-check-circle"
            :loading="verifying"
            @click="verifyConnection"
          >
            {{ $t('serverSettings.verify') }}
          </UButton>
        </div>
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
  </UCard>
</template>
