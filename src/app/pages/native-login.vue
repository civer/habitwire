<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const { isNative, getHostedUrl, mobileLogin, saveHostedConfig, testConnection } = useCapacitorApi()

// Redirect to login if not in Capacitor
if (!isNative) {
  navigateTo('/login')
}

const username = ref('')
const password = ref('')
const loading = ref(false)
const serverReachable = ref<boolean | null>(null)
const checkingServer = ref(true)

const loginSchema = z.object({
  username: z.string().min(1, t('validation.usernameRequired')),
  password: z.string().min(1, t('validation.passwordRequired'))
})

// Check if hosted server is reachable on mount
onMounted(async () => {
  const hostedUrl = getHostedUrl()
  if (hostedUrl) {
    serverReachable.value = await testConnection(hostedUrl)
  }
  checkingServer.value = false
})

async function onSubmit(event: FormSubmitEvent<{ username: string, password: string }>) {
  loading.value = true

  try {
    const hostedUrl = getHostedUrl()
    if (!hostedUrl) {
      toast.add({
        title: t('common.error'),
        description: t('nativeLogin.hostedUrlNotConfigured'),
        color: 'error'
      })
      return
    }

    const result = await mobileLogin(hostedUrl, event.data.username, event.data.password)

    // Save the API key
    await saveHostedConfig(result.api_key)

    toast.add({
      title: t('nativeLogin.loginSuccess'),
      color: 'success'
    })

    router.push('/')
  } catch (error) {
    toast.add({
      title: t('auth.loginFailed'),
      description: error instanceof Error ? error.message : t('auth.invalidCredentials'),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function useOwnServer() {
  navigateTo('/setup')
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
              {{ $t('nativeLogin.subtitle') }}
            </p>
          </div>
        </template>

        <!-- Loading state while checking server -->
        <div
          v-if="checkingServer"
          class="flex justify-center py-8"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin text-primary"
          />
        </div>

        <!-- Server unreachable warning -->
        <div
          v-else-if="serverReachable === false"
          class="space-y-4"
        >
          <UAlert
            color="warning"
            icon="i-lucide-wifi-off"
            :title="$t('nativeLogin.serverUnreachable')"
            :description="$t('nativeLogin.serverUnreachableDescription')"
          />
          <UButton
            block
            variant="outline"
            @click="useOwnServer"
          >
            {{ $t('nativeLogin.useOwnServer') }}
          </UButton>
        </div>

        <!-- Login form -->
        <UForm
          v-else
          :schema="loginSchema"
          :state="{ username, password }"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('auth.usernameOrEmail')"
            name="username"
          >
            <UInput
              v-model="username"
              :placeholder="$t('auth.usernameOrEmail')"
              icon="i-lucide-user"
              class="w-full"
              autocapitalize="none"
              autocorrect="off"
              autocomplete="username"
            />
          </UFormField>

          <UFormField
            :label="$t('auth.password')"
            name="password"
          >
            <UInput
              v-model="password"
              :placeholder="$t('auth.password')"
              type="password"
              icon="i-lucide-lock"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            :loading="loading"
          >
            {{ $t('auth.loginButton') }}
          </UButton>
        </UForm>

        <template #footer>
          <div class="flex flex-col items-center gap-3">
            <!-- Use own server link -->
            <button
              type="button"
              class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              @click="useOwnServer"
            >
              {{ $t('nativeLogin.useOwnServer') }}
            </button>

            <div class="flex items-center gap-3">
              <LanguageSwitcher />
              <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
