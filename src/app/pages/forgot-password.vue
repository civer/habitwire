<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()

const schema = z.object({
  email: z.string().email(t('admin.invalidEmail'))
})

type Schema = z.output<typeof schema>

const state = reactive({
  email: ''
})
const loading = ref(false)
const submitted = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/auth/password-reset/request', {
      method: 'POST',
      body: { email: event.data.email }
    })
    submitted.value = true
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
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
              {{ $t('auth.resetPassword') }}
            </p>
          </div>
        </template>

        <!-- Success State -->
        <div
          v-if="submitted"
          class="text-center space-y-4"
        >
          <UIcon
            name="i-lucide-mail-check"
            class="w-16 h-16 text-primary mx-auto"
          />
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t('auth.resetEmailSent') }}
          </p>
          <NuxtLink
            to="/login"
            class="text-sm text-primary hover:underline"
          >
            {{ $t('auth.backToLogin') }}
          </NuxtLink>
        </div>

        <!-- Form State -->
        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('auth.resetPasswordDescription') }}
          </p>

          <UFormField
            :label="$t('admin.emailLabel')"
            name="email"
          >
            <UInput
              v-model="state.email"
              type="email"
              :placeholder="$t('admin.emailLabel')"
              icon="i-lucide-mail"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UButton
            type="submit"
            block
            :loading="loading"
          >
            {{ $t('auth.sendResetLink') }}
          </UButton>
        </UForm>

        <template #footer>
          <div class="flex flex-col items-center gap-2">
            <NuxtLink
              to="/login"
              class="text-sm text-primary hover:underline"
            >
              {{ $t('auth.backToLogin') }}
            </NuxtLink>
            <LanguageSwitcher />
            <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
