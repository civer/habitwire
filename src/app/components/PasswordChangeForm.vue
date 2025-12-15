<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

const { t } = useI18n()
const toast = useToast()

const loading = ref(false)

const schema = z.object({
  current_password: z.string().min(1, t('validation.required', { field: t('auth.currentPassword') })),
  new_password: z.string().min(8, t('auth.passwordMinLength')),
  confirm_password: z.string().min(1, t('validation.required', { field: t('auth.confirmPassword') }))
}).refine(data => data.new_password === data.confirm_password, {
  message: t('auth.passwordMismatch'),
  path: ['confirm_password']
})

type Schema = z.output<typeof schema>

const state = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/v1/auth/password', {
      method: 'PUT',
      body: {
        current_password: event.data.current_password,
        new_password: event.data.new_password
      }
    })
    toast.add({
      title: t('auth.passwordChanged'),
      color: 'success'
    })
    state.current_password = ''
    state.new_password = ''
    state.confirm_password = ''
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error, t('auth.passwordChangeFailed')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField
      :label="$t('auth.currentPassword')"
      name="current_password"
      required
    >
      <UInput
        v-model="state.current_password"
        type="password"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('auth.newPassword')"
      name="new_password"
      required
    >
      <UInput
        v-model="state.new_password"
        type="password"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('auth.confirmPassword')"
      name="confirm_password"
      required
    >
      <UInput
        v-model="state.confirm_password"
        type="password"
        class="w-full"
      />
    </UFormField>

    <UButton
      type="submit"
      :loading="loading"
    >
      {{ $t('auth.changePassword') }}
    </UButton>
  </UForm>
</template>
