<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

definePageMeta({
  middleware: ['admin']
})

const { t } = useI18n()
const toast = useToast()

interface SettingsResponse {
  settings: Record<string, unknown>
}

const { data: settingsData, refresh: refreshSettings } = await useFetch<SettingsResponse>('/api/v1/admin/settings')

// Form state
const formState = reactive({
  host: '',
  port: 587,
  user: '',
  password: '',
  from: '',
  secure: false
})

// Test email state
const testEmail = ref('')
const testLoading = ref(false)

// Watch for changes from server
watch(
  () => settingsData.value?.settings,
  (settings) => {
    if (!settings) return
    formState.host = (settings['email.smtp.host'] as string) ?? ''
    formState.port = (settings['email.smtp.port'] as number) ?? 587
    formState.user = (settings['email.smtp.user'] as string) ?? ''
    formState.password = (settings['email.smtp.password'] as string) ?? ''
    formState.from = (settings['email.smtp.from'] as string) ?? ''
    formState.secure = (settings['email.smtp.secure'] as boolean) ?? false
  },
  { immediate: true }
)

const schema = z.object({
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535),
  user: z.string().optional(),
  password: z.string().optional(),
  from: z.string().email(t('admin.invalidEmail')).optional().or(z.literal('')),
  secure: z.boolean()
})

type Schema = z.output<typeof schema>

const saving = ref(false)
const clearing = ref(false)

// Check if SMTP is configured (has host and from)
const isSmtpConfigured = computed(() => {
  return !!(formState.host && formState.from)
})

async function clearSmtpConfig() {
  clearing.value = true
  try {
    await $fetch('/api/v1/admin/settings', {
      method: 'PUT',
      body: {
        'email.smtp.host': null,
        'email.smtp.port': 587,
        'email.smtp.user': null,
        'email.smtp.password': null,
        'email.smtp.from': null,
        'email.smtp.secure': false
      }
    })
    await refreshSettings()
    toast.add({
      title: t('admin.smtpCleared'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    clearing.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    await $fetch('/api/v1/admin/settings', {
      method: 'PUT',
      body: {
        'email.smtp.host': event.data.host || null,
        'email.smtp.port': event.data.port,
        'email.smtp.user': event.data.user || null,
        'email.smtp.password': event.data.password || null,
        'email.smtp.from': event.data.from || null,
        'email.smtp.secure': event.data.secure
      }
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
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testLoading.value = true
  try {
    const response = await $fetch<{ success: boolean, error?: string, email_sent?: boolean }>('/api/v1/admin/settings/email/test', {
      method: 'POST',
      body: testEmail.value ? { email: testEmail.value } : {}
    })

    if (response.success) {
      if (response.email_sent) {
        toast.add({
          title: t('admin.testEmailSent'),
          color: 'success'
        })
      } else {
        toast.add({
          title: t('admin.connectionSuccess'),
          color: 'success'
        })
      }
    } else {
      toast.add({
        title: t('admin.connectionFailed'),
        description: response.error,
        color: 'error'
      })
    }
  } catch (error) {
    toast.add({
      title: t('admin.connectionFailed'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    testLoading.value = false
  }
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
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
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
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center bg-primary/10 text-primary"
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
        <!-- SMTP Settings -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('admin.smtpSettings') }}
            </h2>
          </template>

          <UForm
            :schema="schema"
            :state="formState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField
                :label="$t('admin.smtpHost')"
                name="host"
              >
                <UInput
                  v-model="formState.host"
                  placeholder="smtp.example.com"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('admin.smtpPort')"
                name="port"
              >
                <UInput
                  v-model="formState.port"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField
                :label="$t('admin.smtpUser')"
                name="user"
              >
                <UInput
                  v-model="formState.user"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('admin.smtpPassword')"
                name="password"
              >
                <UInput
                  v-model="formState.password"
                  type="password"
                  :placeholder="formState.password === '***' ? $t('admin.passwordUnchanged') : ''"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField
              :label="$t('admin.smtpFrom')"
              name="from"
              :description="$t('admin.smtpFromDescription')"
            >
              <UInput
                v-model="formState.from"
                type="email"
                placeholder="noreply@example.com"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">
                  {{ $t('admin.smtpSecure') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ $t('admin.smtpSecureDescription') }}
                </p>
              </div>
              <USwitch v-model="formState.secure" />
            </div>

            <div class="flex justify-end gap-2">
              <UButton
                v-if="isSmtpConfigured"
                variant="outline"
                color="error"
                :loading="clearing"
                @click="clearSmtpConfig"
              >
                {{ $t('admin.clearSmtp') }}
              </UButton>
              <UButton
                type="submit"
                :loading="saving"
              >
                {{ $t('common.save') }}
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Test Connection -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('admin.testConnection') }}
            </h2>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('admin.testConnectionDescription') }}
            </p>

            <UFormField
              :label="$t('admin.testEmailLabel')"
              :description="$t('admin.testEmailDescription')"
            >
              <UInput
                v-model="testEmail"
                type="email"
                :placeholder="$t('admin.testEmailPlaceholder')"
                class="w-full"
              />
            </UFormField>

            <UButton
              :loading="testLoading"
              @click="testConnection"
            >
              {{ testEmail ? $t('admin.sendTestEmail') : $t('admin.testConnectionButton') }}
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
