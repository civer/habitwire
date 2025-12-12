<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const toast = useToast()

const open = ref(false)
const loading = ref(false)
const newKey = ref<string | null>(null)

const schema = z.object({
  name: z.string().min(1, 'Name is required')
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: ''
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const result = await $fetch('/api/v1/keys', {
      method: 'POST',
      body: event.data
    })
    newKey.value = result.key
    state.name = ''
    emit('created')
  } catch (error) {
    toast.add({
      title: t('apiKeys.error'),
      description: getErrorMessage(error, t('apiKeys.createError')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function copyKey() {
  if (newKey.value) {
    navigator.clipboard.writeText(newKey.value)
    toast.add({
      title: t('apiKeys.copiedToClipboard'),
      color: 'success'
    })
  }
}

function closeModal() {
  open.value = false
  newKey.value = null
}
</script>

<template>
  <UModal v-model:open="open">
    <UButton
      icon="i-lucide-plus"
      :label="$t('apiKeys.create')"
      @click="open = true"
    />

    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ $t('apiKeys.create') }}
          </h3>
        </template>

        <!-- Show key after creation -->
        <div
          v-if="newKey"
          class="space-y-4"
        >
          <UAlert
            color="warning"
            icon="i-lucide-alert-triangle"
            :title="$t('apiKeys.saveKey')"
            :description="$t('apiKeys.saveKeyDescription')"
          />

          <div class="flex gap-2">
            <UInput
              :model-value="newKey"
              readonly
              class="flex-1 w-full font-mono text-sm"
            />
            <UButton
              icon="i-lucide-copy"
              @click="copyKey"
            />
          </div>

          <UButton
            block
            color="neutral"
            @click="closeModal"
          >
            {{ $t('apiKeys.done') }}
          </UButton>
        </div>

        <!-- Create form -->
        <UForm
          v-else
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            label="Name"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              placeholder="e.g. CLI Access"
              class="w-full"
              autofocus
            />
          </UFormField>

          <div class="flex gap-2 pt-4">
            <UButton
              type="submit"
              :loading="loading"
              class="flex-1"
            >
              Create
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="closeModal"
            >
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
