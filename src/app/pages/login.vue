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

const schema = z.object({
  username: z.string().min(1, t('validation.usernameRequired')),
  password: z.string().min(1, t('validation.passwordRequired'))
})

type Schema = z.output<typeof schema>

const state = reactive({
  username: '',
  password: ''
})
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/auth/login', {
      method: 'POST',
      body: event.data
    })
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
              {{ $t('auth.signInPrompt') }}
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

          <UButton
            type="submit"
            block
            :loading="loading"
          >
            {{ $t('auth.loginButton') }}
          </UButton>
        </UForm>

        <template #footer>
          <div class="flex justify-center">
            <LanguageSwitcher />
          </div>
        </template>
      </UCard>
    </div>
  </UApp>
</template>
