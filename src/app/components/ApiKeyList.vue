<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { ApiKeyResponse } from '~/types/api'

const { t } = useI18n()
const toast = useToast()

const { data: keys, refresh } = await useFetch<ApiKeyResponse[]>('/api/v1/keys')

async function deleteKey(id: string) {
  try {
    await $fetch(`/api/v1/keys/${id}`, { method: 'DELETE' })
    await refresh()
    toast.add({
      title: t('settings.apiKeys.deleteSuccess'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error, t('settings.apiKeys.deleteError')),
      color: 'error'
    })
  }
}

function formatDate(date: string | null) {
  if (!date) return t('common.never')
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div
    v-if="!keys?.length"
    class="text-center py-8 text-gray-500"
  >
    {{ t('settings.apiKeys.empty') }}
  </div>

  <div
    v-else
    class="divide-y divide-gray-200 dark:divide-gray-800"
  >
    <div
      v-for="key in keys"
      :key="key.id"
      class="flex items-center justify-between py-3"
    >
      <div>
        <p class="font-medium">
          {{ key.name }}
        </p>
        <p class="text-sm text-gray-500">
          {{ t('settings.apiKeys.lastUsed') }}: {{ formatDate(key.last_used) }}
        </p>
      </div>

      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        size="sm"
        @click="deleteKey(key.id)"
      />
    </div>
  </div>
</template>
