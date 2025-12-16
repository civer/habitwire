<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { UserResponse } from '~/types/api'

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const router = useRouter()
const toast = useToast()

const { data: user } = await useFetch<UserResponse>('/api/v1/auth/me')

async function logout() {
  try {
    await $fetch('/api/v1/auth/logout', { method: 'POST' })
    router.push('/login')
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

const userMenuItems = computed(() => [
  [{
    label: user.value?.user?.username || '',
    slot: 'account',
    disabled: true
  }],
  [{
    label: t('common.settings'),
    icon: 'i-lucide-settings',
    to: '/settings'
  }],
  [{
    label: t('auth.logout'),
    icon: 'i-lucide-log-out',
    onSelect: logout
  }]
])
</script>

<template>
  <UApp>
    <!-- Skip link for keyboard navigation -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
    >
      {{ $t('common.skipToContent') }}
    </a>

    <UHeader :toggle="false">
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
          :aria-label="$t('app.name')"
        >
          <UIcon
            name="i-lucide-target"
            class="w-6 h-6 text-primary"
            aria-hidden="true"
          />
          <span class="font-bold text-lg">{{ $t('app.name') }}</span>
          <span class="text-xs text-gray-400 dark:text-gray-500">v{{ runtimeConfig.public.version }}</span>
        </NuxtLink>
      </template>

      <template #right>
        <LanguageSwitcher />
        <UColorModeButton :aria-label="$t('common.toggleColorMode')" />

        <UDropdownMenu :items="userMenuItems">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-user"
            :aria-label="$t('common.userMenu')"
          />
        </UDropdownMenu>
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <main
          id="main-content"
          tabindex="-1"
        >
          <slot />
        </main>
      </UContainer>
    </UMain>

    <!-- PWA Install Prompt -->
    <PwaInstallPrompt />
  </UApp>
</template>
