<script setup lang="ts">
import { getErrorMessage } from '~/types/error'

definePageMeta({
  middleware: ['admin']
})

const { t } = useI18n()
const toast = useToast()

interface SettingsResponse {
  settings: Record<string, unknown>
  smtp_configured: boolean
}

const { data: settingsData, refresh: refreshSettings } = await useFetch<SettingsResponse>('/api/v1/admin/settings')

const smtpConfigured = computed(() => settingsData.value?.smtp_configured ?? false)

// Local state
const allowRegistration = ref(false)
const requireEmailVerification = ref(false)
const authMethods = ref<string[]>(['password'])

// Watch for changes from server
watch(
  () => settingsData.value?.settings,
  (settings) => {
    if (!settings) return
    allowRegistration.value = (settings['auth.allowRegistration'] as boolean) ?? false
    requireEmailVerification.value = (settings['auth.requireEmailVerification'] as boolean) ?? false
    authMethods.value = (settings['auth.methods'] as string[]) ?? ['password']
  },
  { immediate: true }
)

const saving = ref(false)

async function saveSetting(key: string, value: unknown) {
  saving.value = true
  try {
    await $fetch('/api/v1/admin/settings', {
      method: 'PUT',
      body: { [key]: value }
    })
    await refreshSettings()
    toast.add({
      title: t('admin.settingsSaved'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
    // Revert on error
    await refreshSettings()
  } finally {
    saving.value = false
  }
}

function toggleAuthMethod(method: string) {
  // Don't allow enabling magic-link without SMTP configured
  if (method === 'magic-link' && !smtpConfigured.value && !authMethods.value.includes('magic-link')) {
    return
  }

  const newMethods = [...authMethods.value]
  const index = newMethods.indexOf(method)

  if (index === -1) {
    newMethods.push(method)
  } else {
    // Don't allow removing the last method
    if (newMethods.length <= 1) {
      toast.add({
        title: t('common.error'),
        description: t('admin.atLeastOneMethod'),
        color: 'error'
      })
      return
    }
    newMethods.splice(index, 1)
  }

  authMethods.value = newMethods
  saveSetting('auth.methods', newMethods)
}
</script>

<template>
  <div class="py-6">
    <div class="flex flex-col md:flex-row gap-6">
      <!-- Left Navigation -->
      <nav class="md:w-48 flex-shrink-0">
        <h1 class="hidden md:block text-lg font-bold mb-4 px-3">
          {{ $t('admin.title') }}
        </h1>
        <ul class="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          <li>
            <NuxtLink
              to="/admin/users"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <UIcon
                name="i-lucide-users"
                class="w-4 h-4 mr-2"
              />
              {{ $t('admin.users') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/settings"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center bg-primary/10 text-primary"
            >
              <UIcon
                name="i-lucide-settings"
                class="w-4 h-4 mr-2"
              />
              {{ $t('common.settings') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/email"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <UIcon
                name="i-lucide-mail"
                class="w-4 h-4 mr-2"
              />
              {{ $t('admin.email') }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Right Content -->
      <div class="flex-1 min-w-0 space-y-6">
        <!-- Registration Settings -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('admin.registrationSettings') }}
            </h2>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('admin.allowRegistration') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('admin.allowRegistrationDescription') }}
                </p>
              </div>
              <USwitch
                v-model="allowRegistration"
                :disabled="saving"
                @update:model-value="(v) => saveSetting('auth.allowRegistration', v)"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('admin.requireEmailVerification') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('admin.requireEmailVerificationDescription') }}
                </p>
                <p
                  v-if="!smtpConfigured && !requireEmailVerification"
                  class="text-sm text-amber-600 dark:text-amber-400 mt-1"
                >
                  {{ $t('admin.emailVerificationRequiresSmtp') }}
                </p>
              </div>
              <USwitch
                v-model="requireEmailVerification"
                :disabled="saving || (!smtpConfigured && !requireEmailVerification)"
                @update:model-value="(v) => saveSetting('auth.requireEmailVerification', v)"
              />
            </div>
          </div>
        </UCard>

        <!-- Auth Methods -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('admin.authMethods') }}
            </h2>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('admin.passwordAuth') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('admin.passwordAuthDescription') }}
                </p>
              </div>
              <USwitch
                :model-value="authMethods.includes('password')"
                :disabled="saving"
                @update:model-value="toggleAuthMethod('password')"
              />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('admin.magicLinkAuth') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('admin.magicLinkAuthDescription') }}
                </p>
                <p
                  v-if="!smtpConfigured && !authMethods.includes('magic-link')"
                  class="text-sm text-amber-600 dark:text-amber-400 mt-1"
                >
                  {{ $t('admin.magicLinkRequiresSmtp') }}
                </p>
              </div>
              <USwitch
                :model-value="authMethods.includes('magic-link')"
                :disabled="saving || (!smtpConfigured && !authMethods.includes('magic-link'))"
                @update:model-value="toggleAuthMethod('magic-link')"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
