<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { fetch: refreshSession } = useUserSession()
const runtimeConfig = useRuntimeConfig()

// Fetch auth settings to check if registration is allowed
const { data: authSettings } = await useFetch<{
  allow_registration: boolean
  methods: string[]
}>('/api/v1/auth/settings')

// Redirect if registration is disabled
if (!authSettings.value?.allow_registration) {
  navigateTo('/login')
}

const schema = z.object({
  username: z.string().min(1, t('validation.usernameRequired')),
  email: z.string().email(t('admin.invalidEmail')).optional().or(z.literal('')),
  password: z.string().min(8, t('auth.passwordMinLength')),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: t('auth.passwordMismatch'),
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const state = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/auth/register', {
      method: 'POST',
      body: {
        username: event.data.username,
        email: event.data.email || undefined,
        password: event.data.password
      }
    })
    await refreshSession()
    router.push('/')
  } catch (error) {
    toast.add({
      title: t('auth.registrationFailed'),
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
              {{ $t('auth.createAccount') }}
            </p>
          </div>
        </template>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('auth.username')"
            name="username"
          >
            <UInput
              v-model="state.username"
              :placeholder="$t('auth.username')"
              icon="i-lucide-user"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField
            :label="$t('admin.emailLabel')"
            name="email"
            :description="$t('auth.emailOptional')"
          >
            <UInput
              v-model="state.email"
              type="email"
              :placeholder="$t('admin.emailLabel')"
              icon="i-lucide-mail"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('auth.password')"
            name="password"
          >
            <UInput
              v-model="state.password"
              type="password"
              :placeholder="$t('auth.password')"
              icon="i-lucide-lock"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('auth.confirmPassword')"
            name="confirmPassword"
          >
            <UInput
              v-model="state.confirmPassword"
              type="password"
              :placeholder="$t('auth.confirmPassword')"
              icon="i-lucide-lock"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            :loading="loading"
          >
            {{ $t('auth.registerButton') }}
          </UButton>
        </UForm>

        <template #footer>
          <div class="flex flex-col items-center gap-2">
            <NuxtLink
              to="/login"
              class="text-sm text-primary hover:underline"
            >
              {{ $t('auth.alreadyHaveAccount') }}
            </NuxtLink>
            <LanguageSwitcher />
            <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
