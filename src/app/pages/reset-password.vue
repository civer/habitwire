<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()

const token = computed(() => route.query.token as string)

// Redirect if no token
if (!token.value) {
  navigateTo('/login')
}

const schema = z.object({
  password: z.string().min(8, t('auth.passwordMinLength')),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: t('auth.passwordMismatch'),
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const state = reactive({
  password: '',
  confirmPassword: ''
})
const loading = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = null
  try {
    await $fetch('/api/v1/auth/password-reset/verify', {
      method: 'POST',
      body: {
        token: token.value,
        password: event.data.password
      }
    })
    success.value = true
    toast.add({
      title: t('auth.passwordResetSuccess'),
      color: 'success'
    })
  } catch (err) {
    error.value = getErrorMessage(err, t('auth.resetTokenInvalid'))
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/login')
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
              {{ $t('auth.setNewPassword') }}
            </p>
          </div>
        </template>

        <!-- Success State -->
        <div
          v-if="success"
          class="text-center space-y-4"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-16 h-16 text-green-500 mx-auto"
          />
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t('auth.passwordResetSuccess') }}
          </p>
          <UButton
            block
            @click="goToLogin"
          >
            {{ $t('auth.loginButton') }}
          </UButton>
        </div>

        <!-- Error State -->
        <div
          v-else-if="error"
          class="text-center space-y-4"
        >
          <UIcon
            name="i-lucide-x-circle"
            class="w-16 h-16 text-red-500 mx-auto"
          />
          <p class="text-gray-600 dark:text-gray-400">
            {{ error }}
          </p>
          <NuxtLink
            to="/forgot-password"
            class="text-sm text-primary hover:underline"
          >
            {{ $t('auth.requestNewLink') }}
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
          <UFormField
            :label="$t('auth.newPassword')"
            name="password"
          >
            <UInput
              v-model="state.password"
              type="password"
              :placeholder="$t('auth.newPassword')"
              icon="i-lucide-lock"
              class="w-full"
              autofocus
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
            {{ $t('auth.resetPasswordButton') }}
          </UButton>
        </UForm>

        <template #footer>
          <div class="flex flex-col items-center gap-2">
            <LanguageSwitcher />
            <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
