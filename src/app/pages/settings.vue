<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { UserResponse } from '~/types/api'

const { t: _t } = useI18n()
const toast = useToast()

const categoryKey = ref(0)
const apiKeyKey = ref(0)

const { data: userData, refresh: refreshUser } = await useFetch<UserResponse>('/api/v1/auth/me')
const allowBackfill = ref(userData.value?.user?.settings?.allowBackfill ?? false)
const groupByCategory = ref(userData.value?.user?.settings?.groupByCategory ?? true)
const skippedBreaksStreak = ref(userData.value?.user?.settings?.skippedBreaksStreak ?? false)

watch(() => userData.value?.user?.settings?.allowBackfill, (newVal) => {
  allowBackfill.value = newVal ?? false
})

watch(() => userData.value?.user?.settings?.groupByCategory, (newVal) => {
  groupByCategory.value = newVal ?? true
})

watch(() => userData.value?.user?.settings?.skippedBreaksStreak, (newVal) => {
  skippedBreaksStreak.value = newVal ?? false
})

async function updateSetting(key: string, value: boolean) {
  try {
    await $fetch('/api/v1/auth/settings', {
      method: 'PUT',
      body: { [key]: value }
    })
    await refreshUser()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error, 'Failed to update settings'),
      color: 'error'
    })
    // Revert on error
    if (key === 'allowBackfill') allowBackfill.value = !value
    if (key === 'groupByCategory') groupByCategory.value = !value
    if (key === 'skippedBreaksStreak') skippedBreaksStreak.value = !value
  }
}

function refreshCategories() {
  categoryKey.value++
}

function refreshApiKeys() {
  apiKeyKey.value++
}
</script>

<template>
  <div class="py-6 max-w-2xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold">
      {{ $t('common.settings') }}
    </h1>

    <!-- General Settings Section -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ $t('settings.general') }}
        </h2>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">
              {{ $t('settings.groupByCategory') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('settings.groupByCategoryDescription') }}
            </p>
          </div>
          <USwitch
            v-model="groupByCategory"
            @update:model-value="(v) => updateSetting('groupByCategory', v)"
          />
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">
              {{ $t('settings.allowBackfill') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('settings.allowBackfillDescription') }}
            </p>
          </div>
          <USwitch
            v-model="allowBackfill"
            @update:model-value="(v) => updateSetting('allowBackfill', v)"
          />
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">
              {{ $t('settings.skippedBreaksStreak') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('settings.skippedBreaksStreakDescription') }}
            </p>
          </div>
          <USwitch
            v-model="skippedBreaksStreak"
            @update:model-value="(v) => updateSetting('skippedBreaksStreak', v)"
          />
        </div>
      </div>
    </UCard>

    <!-- Categories Section -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ $t('categories.title') }}
          </h2>
          <CategoryModal @created="refreshCategories" />
        </div>
      </template>

      <CategoryList :key="categoryKey" />
    </UCard>

    <!-- API Keys Section -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            API Keys
          </h2>
          <ApiKeyModal @created="refreshApiKeys" />
        </div>
      </template>

      <ApiKeyList :key="apiKeyKey" />
    </UCard>

    <!-- Password Section -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ $t('auth.changePassword') }}
        </h2>
      </template>

      <PasswordChangeForm />
    </UCard>
  </div>
</template>
