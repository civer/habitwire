<script setup lang="ts">
import { getErrorMessage } from '~/types/error'
import type { UserResponse } from '~/types/api'

const { t } = useI18n()
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
      description: getErrorMessage(error, t('errors.logoutFailed')),
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
    <UHeader :toggle="false">
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <UIcon
            name="i-lucide-target"
            class="w-6 h-6 text-primary"
          />
          <span class="font-bold text-lg">{{ $t('app.name') }}</span>
        </NuxtLink>
      </template>

      <template #right>
        <LanguageSwitcher />
        <UColorModeButton />

        <UDropdownMenu :items="userMenuItems">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-user"
          />
        </UDropdownMenu>
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <slot />
      </UContainer>
    </UMain>
  </UApp>
</template>
