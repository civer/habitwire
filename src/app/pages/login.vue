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

// Fetch auth settings
const { data: authSettings } = await useFetch<{
  allow_registration: boolean
  methods: string[]
  smtp_configured: boolean
}>('/api/v1/auth/settings')

const showPasswordForm = computed(() => authSettings.value?.methods.includes('password') ?? true)
const showMagicLink = computed(() => authSettings.value?.methods.includes('magic-link') ?? false)
const showRegister = computed(() => authSettings.value?.allow_registration ?? false)
const showForgotPassword = computed(() => authSettings.value?.smtp_configured ?? false)

// Current mode: 'password' or 'magic-link'
const authMode = ref<'password' | 'magic-link'>('password')

// Password login schema
const passwordSchema = z.object({
  username: z.string().min(1, t('validation.usernameRequired')),
  password: z.string().min(1, t('validation.passwordRequired'))
})

// Magic link schema
const magicLinkSchema = z.object({
  email: z.string().email(t('admin.invalidEmail'))
})

type PasswordSchema = z.output<typeof passwordSchema>
type MagicLinkSchema = z.output<typeof magicLinkSchema>

const passwordState = reactive({
  username: '',
  password: ''
})

const magicLinkState = reactive({
  email: ''
})

const loading = ref(false)
const magicLinkSent = ref(false)

async function onPasswordSubmit(event: FormSubmitEvent<PasswordSchema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/auth/login', {
      method: 'POST',
      body: event.data
    })
    await refreshSession()
    router.push('/')
  } catch (error) {
    toast.add({
      title: t('auth.loginFailed'),
      description: getErrorMessage(error, t('auth.invalidCredentials')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function onMagicLinkSubmit(event: FormSubmitEvent<MagicLinkSchema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/auth/magic-link/request', {
      method: 'POST',
      body: { email: event.data.email }
    })
    magicLinkSent.value = true
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

function switchToMagicLink() {
  authMode.value = 'magic-link'
  magicLinkSent.value = false
}

function switchToPassword() {
  authMode.value = 'password'
}
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <UCard class="w-full max-w-sm">
        <template #header>
          <div class="text-center">
            <h1 class="text-2xl font-bold">
              {{ $t('app.name') }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ $t('auth.signInPrompt') }}
            </p>
          </div>
        </template>

        <!-- Password Login Form -->
        <UForm
          v-if="authMode === 'password' && showPasswordForm"
          :schema="passwordSchema"
          :state="passwordState"
          class="space-y-4"
          @submit="onPasswordSubmit"
        >
          <UFormField
            :label="$t('auth.usernameOrEmail')"
            name="username"
          >
            <UInput
              v-model="passwordState.username"
              :placeholder="$t('auth.usernameOrEmail')"
              icon="i-lucide-user"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField
            :label="$t('auth.password')"
            name="password"
          >
            <UInput
              v-model="passwordState.password"
              type="password"
              :placeholder="$t('auth.password')"
              icon="i-lucide-lock"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            :loading="loading"
          >
            {{ $t('auth.loginButton') }}
          </UButton>

          <div
            v-if="showForgotPassword"
            class="text-center"
          >
            <NuxtLink
              to="/forgot-password"
              class="text-sm text-primary hover:underline"
            >
              {{ $t('auth.forgotPassword') }}
            </NuxtLink>
          </div>

          <div
            v-if="showMagicLink"
            class="text-center pt-2"
          >
            <button
              type="button"
              class="text-sm text-gray-500 hover:text-primary"
              @click="switchToMagicLink"
            >
              {{ $t('auth.useMagicLink') }}
            </button>
          </div>
        </UForm>

        <!-- Magic Link Form -->
        <div v-else-if="authMode === 'magic-link'">
          <!-- Success State -->
          <div
            v-if="magicLinkSent"
            class="text-center space-y-4"
          >
            <UIcon
              name="i-lucide-mail-check"
              class="w-16 h-16 text-primary mx-auto"
            />
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('auth.magicLinkSent') }}
            </p>
            <button
              type="button"
              class="text-sm text-primary hover:underline"
              @click="magicLinkSent = false"
            >
              {{ $t('auth.sendAnotherLink') }}
            </button>
          </div>

          <!-- Form -->
          <UForm
            v-else
            :schema="magicLinkSchema"
            :state="magicLinkState"
            class="space-y-4"
            @submit="onMagicLinkSubmit"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('auth.magicLinkDescription') }}
            </p>

            <UFormField
              :label="$t('admin.emailLabel')"
              name="email"
            >
              <UInput
                v-model="magicLinkState.email"
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
              {{ $t('auth.sendMagicLink') }}
            </UButton>

            <div
              v-if="showPasswordForm"
              class="text-center pt-2"
            >
              <button
                type="button"
                class="text-sm text-gray-500 hover:text-primary"
                @click="switchToPassword"
              >
                {{ $t('auth.usePassword') }}
              </button>
            </div>
          </UForm>
        </div>

        <template #footer>
          <div class="flex flex-col items-center gap-2">
            <NuxtLink
              v-if="showRegister"
              to="/register"
              class="text-sm text-primary hover:underline"
            >
              {{ $t('auth.dontHaveAccount') }}
            </NuxtLink>
            <LanguageSwitcher />
            <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
