<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { UserResponse } from '~/types/api'

const { t } = useI18n()
const toast = useToast()

const categoryKey = ref(0)
const apiKeyKey = ref(0)
const activeSection = ref<'general' | 'display' | 'categories' | 'api' | 'security'>('general')

const { data: userData, refresh: refreshUser } = await useFetch<UserResponse>('/api/v1/auth/me')
const allowBackfill = ref(userData.value?.user?.settings?.allowBackfill ?? false)
const groupByCategory = ref(userData.value?.user?.settings?.groupByCategory ?? true)
const skippedBreaksStreak = ref(userData.value?.user?.settings?.skippedBreaksStreak ?? false)
const desktopDaysToShow = ref(userData.value?.user?.settings?.desktopDaysToShow ?? 14)
const weekStartsOn = ref<'monday' | 'sunday'>(userData.value?.user?.settings?.weekStartsOn ?? 'monday')

watch(() => userData.value?.user?.settings?.allowBackfill, (newVal) => {
  allowBackfill.value = newVal ?? false
})

watch(() => userData.value?.user?.settings?.groupByCategory, (newVal) => {
  groupByCategory.value = newVal ?? true
})

watch(() => userData.value?.user?.settings?.skippedBreaksStreak, (newVal) => {
  skippedBreaksStreak.value = newVal ?? false
})

watch(() => userData.value?.user?.settings?.desktopDaysToShow, (newVal) => {
  desktopDaysToShow.value = newVal ?? 14
})

watch(() => userData.value?.user?.settings?.weekStartsOn, (newVal) => {
  weekStartsOn.value = newVal ?? 'monday'
})

async function updateSetting(key: string, value: boolean | number | string, previousValue?: boolean | number | string) {
  try {
    await $fetch('/api/v1/auth/settings', {
      method: 'PUT',
      body: { [key]: value }
    })
    await refreshUser()
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
    // Revert on error
    if (key === 'allowBackfill') allowBackfill.value = previousValue as boolean ?? !value
    if (key === 'groupByCategory') groupByCategory.value = previousValue as boolean ?? !value
    if (key === 'skippedBreaksStreak') skippedBreaksStreak.value = previousValue as boolean ?? !value
    if (key === 'desktopDaysToShow') desktopDaysToShow.value = previousValue as number ?? 14
    if (key === 'weekStartsOn') weekStartsOn.value = previousValue as 'monday' | 'sunday' ?? 'monday'
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
  <div class="py-6">
    <div class="flex flex-col md:flex-row gap-6">
      <!-- Left Navigation -->
      <nav class="md:w-48 flex-shrink-0">
        <h1 class="hidden md:block text-lg font-bold mb-4 px-3">
          {{ $t('common.settings') }}
        </h1>
        <ul class="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          <li>
            <button
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              :class="activeSection === 'general' ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="activeSection = 'general'"
            >
              <UIcon
                name="i-lucide-sliders-horizontal"
                class="w-4 h-4 mr-2 inline-block"
              />
              {{ $t('settings.general') }}
            </button>
          </li>
          <li>
            <button
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              :class="activeSection === 'display' ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="activeSection = 'display'"
            >
              <UIcon
                name="i-lucide-layout-grid"
                class="w-4 h-4 mr-2 inline-block"
              />
              {{ $t('settings.display') }}
            </button>
          </li>
          <li>
            <button
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              :class="activeSection === 'categories' ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="activeSection = 'categories'"
            >
              <UIcon
                name="i-lucide-folder"
                class="w-4 h-4 mr-2 inline-block"
              />
              {{ $t('categories.title') }}
            </button>
          </li>
          <li>
            <button
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              :class="activeSection === 'api' ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="activeSection = 'api'"
            >
              <UIcon
                name="i-lucide-key"
                class="w-4 h-4 mr-2 inline-block"
              />
              {{ $t('apiKeys.title') }}
            </button>
          </li>
          <li>
            <button
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              :class="activeSection === 'security' ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="activeSection = 'security'"
            >
              <UIcon
                name="i-lucide-shield"
                class="w-4 h-4 mr-2 inline-block"
              />
              {{ $t('settings.security') }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- Right Content -->
      <div class="flex-1 min-w-0">
        <!-- General Settings -->
        <UCard v-if="activeSection === 'general'">
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

        <!-- Display Settings -->
        <UCard v-if="activeSection === 'display'">
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('settings.display') }}
            </h2>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('settings.desktopDaysToShow') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('settings.desktopDaysToShowDescription') }}
                </p>
              </div>
              <USelect
                v-model="desktopDaysToShow"
                :items="[
                  { label: '7', value: 7 },
                  { label: '14', value: 14 },
                  { label: '21', value: 21 },
                  { label: '28', value: 28 }
                ]"
                class="w-20"
                @update:model-value="(v) => updateSetting('desktopDaysToShow', v, desktopDaysToShow)"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('settings.weekStartsOn') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('settings.weekStartsOnDescription') }}
                </p>
              </div>
              <USelect
                v-model="weekStartsOn"
                :items="[
                  { label: $t('habits.weekdays.mon'), value: 'monday' },
                  { label: $t('habits.weekdays.sun'), value: 'sunday' }
                ]"
                class="w-24"
                @update:model-value="(v) => updateSetting('weekStartsOn', v, weekStartsOn)"
              />
            </div>
          </div>
        </UCard>

        <!-- Categories Section -->
        <UCard v-if="activeSection === 'categories'">
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
        <UCard v-if="activeSection === 'api'">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                {{ $t('apiKeys.title') }}
              </h2>
              <ApiKeyModal @created="refreshApiKeys" />
            </div>
          </template>

          <ApiKeyList :key="apiKeyKey" />
        </UCard>

        <!-- Security Section -->
        <UCard v-if="activeSection === 'security'">
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('settings.security') }}
            </h2>
          </template>

          <PasswordChangeForm />
        </UCard>
      </div>
    </div>
  </div>
</template>
