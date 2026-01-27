<script setup lang="ts">
import { getErrorMessage } from '~/types/error'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { fetch: refreshSession } = useUserSession()
const runtimeConfig = useRuntimeConfig()

const token = computed(() => route.query.token as string)

const loading = ref(true)
const error = ref<string | null>(null)

// Verify token on mount
onMounted(async () => {
  if (!token.value) {
    error.value = t('auth.magicLinkInvalid')
    loading.value = false
    return
  }

  try {
    await $fetch('/api/v1/auth/magic-link/verify', {
      method: 'POST',
      body: { token: token.value }
    })
    await refreshSession()
    router.push('/')
  } catch (err) {
    error.value = getErrorMessage(err, t('auth.magicLinkInvalid'))
    loading.value = false
  }
})
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
          </div>
        </template>

        <!-- Loading State -->
        <div
          v-if="loading"
          class="text-center space-y-4 py-8"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-16 h-16 text-primary mx-auto animate-spin"
          />
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t('auth.verifyingMagicLink') }}
          </p>
        </div>

        <!-- Error State -->
        <div
          v-else-if="error"
          class="text-center space-y-4 py-4"
        >
          <UIcon
            name="i-lucide-x-circle"
            class="w-16 h-16 text-red-500 mx-auto"
          />
          <p class="text-gray-600 dark:text-gray-400">
            {{ error }}
          </p>
          <NuxtLink
            to="/login"
            class="text-sm text-primary hover:underline"
          >
            {{ $t('auth.backToLogin') }}
          </NuxtLink>
        </div>

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
