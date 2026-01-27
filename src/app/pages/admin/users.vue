<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { getErrorMessage } from '~/types/error'

definePageMeta({
  middleware: ['admin']
})

const { t } = useI18n()
const toast = useToast()

interface User {
  id: string
  username: string
  email: string | null
  email_verified: boolean
  is_admin: boolean
  display_name: string | null
  created_at: string
  updated_at: string
}

interface UsersResponse {
  users: User[]
}

const { data: usersData, refresh: refreshUsers } = await useFetch<UsersResponse>('/api/v1/admin/users')

// Modal state
const isModalOpen = ref(false)
const editingUser = ref<User | null>(null)
const modalLoading = ref(false)

// Delete confirmation
const deleteConfirmOpen = ref(false)
const userToDelete = ref<User | null>(null)
const deleteLoading = ref(false)

// Form schema
const createSchema = z.object({
  username: z.string().min(1, t('validation.usernameRequired')),
  email: z.string().email(t('admin.invalidEmail')).optional().or(z.literal('')),
  password: z.string().min(8, t('auth.passwordMinLength')).optional().or(z.literal('')),
  display_name: z.string().optional(),
  is_admin: z.boolean()
})

const editSchema = z.object({
  username: z.string().min(1, t('validation.usernameRequired')),
  email: z.string().email(t('admin.invalidEmail')).optional().or(z.literal('')),
  display_name: z.string().optional(),
  is_admin: z.boolean(),
  email_verified: z.boolean()
})

type CreateSchema = z.output<typeof createSchema>
type EditSchema = z.output<typeof editSchema>

const formState = reactive({
  username: '',
  email: '',
  password: '',
  display_name: '',
  is_admin: false,
  email_verified: false
})

function openCreateModal() {
  editingUser.value = null
  formState.username = ''
  formState.email = ''
  formState.password = ''
  formState.display_name = ''
  formState.is_admin = false
  formState.email_verified = false
  isModalOpen.value = true
}

function openEditModal(user: User) {
  editingUser.value = user
  formState.username = user.username
  formState.email = user.email || ''
  formState.password = ''
  formState.display_name = user.display_name || ''
  formState.is_admin = user.is_admin
  formState.email_verified = user.email_verified
  isModalOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<CreateSchema | EditSchema>) {
  modalLoading.value = true
  try {
    if (editingUser.value) {
      // Update existing user
      await $fetch(`/api/v1/admin/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: {
          username: event.data.username,
          email: event.data.email || null,
          display_name: event.data.display_name || null,
          is_admin: event.data.is_admin,
          email_verified: (event.data as EditSchema).email_verified
        }
      })
      toast.add({
        title: t('admin.userUpdated'),
        color: 'success'
      })
    } else {
      // Create new user
      const createData = event.data as CreateSchema
      await $fetch('/api/v1/admin/users', {
        method: 'POST',
        body: {
          username: createData.username,
          email: createData.email || null,
          password: createData.password || undefined,
          display_name: createData.display_name || null,
          is_admin: createData.is_admin
        }
      })
      toast.add({
        title: t('admin.userCreated'),
        color: 'success'
      })
    }
    isModalOpen.value = false
    await refreshUsers()
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    modalLoading.value = false
  }
}

function confirmDelete(user: User) {
  userToDelete.value = user
  deleteConfirmOpen.value = true
}

async function deleteUser() {
  if (!userToDelete.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/v1/admin/users/${userToDelete.value.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: t('admin.userDeleted'),
      color: 'success'
    })
    deleteConfirmOpen.value = false
    await refreshUsers()
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    deleteLoading.value = false
  }
}

async function sendPasswordReset(user: User) {
  if (!user.email) {
    toast.add({
      title: t('common.error'),
      description: t('admin.userNoEmail'),
      color: 'error'
    })
    return
  }

  try {
    await $fetch(`/api/v1/admin/users/${user.id}/reset-password`, {
      method: 'POST'
    })
    toast.add({
      title: t('admin.passwordResetSent'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: t('common.error'),
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <div class="py-6">
    <div class="flex flex-col md:flex-row gap-6">
      <!-- Left Navigation -->
      <nav class="md:w-48 flex-shrink-0">
        <h1 class="hidden md:block text-lg font-bold mb-4 px-3">
          {{ $t('admin.title') }}
        </h1>
        <ul class="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          <li>
            <NuxtLink
              to="/admin/users"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center bg-primary/10 text-primary"
            >
              <UIcon
                name="i-lucide-users"
                class="w-4 h-4 mr-2"
              />
              {{ $t('admin.users') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/settings"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <UIcon
                name="i-lucide-settings"
                class="w-4 h-4 mr-2"
              />
              {{ $t('common.settings') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/email"
              class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <UIcon
                name="i-lucide-mail"
                class="w-4 h-4 mr-2"
              />
              {{ $t('admin.email') }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Right Content -->
      <div class="flex-1 min-w-0">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                {{ $t('admin.users') }}
              </h2>
              <UButton
                icon="i-lucide-plus"
                @click="openCreateModal"
              >
                {{ $t('admin.createUser') }}
              </UButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b dark:border-gray-700">
                  <th class="text-left py-3 px-2 font-medium">
                    {{ $t('auth.username') }}
                  </th>
                  <th class="text-left py-3 px-2 font-medium hidden sm:table-cell">
                    {{ $t('admin.emailLabel') }}
                  </th>
                  <th class="text-left py-3 px-2 font-medium hidden md:table-cell">
                    {{ $t('admin.role') }}
                  </th>
                  <th class="text-left py-3 px-2 font-medium hidden lg:table-cell">
                    {{ $t('admin.createdAt') }}
                  </th>
                  <th class="text-right py-3 px-2 font-medium">
                    {{ $t('admin.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in usersData?.users"
                  :key="user.id"
                  class="border-b dark:border-gray-800 last:border-0"
                >
                  <td class="py-3 px-2">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ user.username }}</span>
                      <UBadge
                        v-if="user.is_admin"
                        color="primary"
                        variant="subtle"
                        size="xs"
                      >
                        Admin
                      </UBadge>
                    </div>
                    <div class="text-xs text-gray-500 sm:hidden">
                      {{ user.email || '-' }}
                    </div>
                  </td>
                  <td class="py-3 px-2 hidden sm:table-cell">
                    <div class="flex items-center gap-1">
                      <span>{{ user.email || '-' }}</span>
                      <UIcon
                        v-if="user.email && user.email_verified"
                        name="i-lucide-check-circle"
                        class="w-4 h-4 text-green-500"
                        :title="$t('admin.emailVerified')"
                      />
                    </div>
                  </td>
                  <td class="py-3 px-2 hidden md:table-cell">
                    {{ user.is_admin ? $t('admin.roleAdmin') : $t('admin.roleUser') }}
                  </td>
                  <td class="py-3 px-2 hidden lg:table-cell text-gray-500">
                    {{ formatDate(user.created_at) }}
                  </td>
                  <td class="py-3 px-2 text-right">
                    <UDropdownMenu
                      :items="[
                        [{
                          label: $t('admin.editUser'),
                          icon: 'i-lucide-pencil',
                          onSelect: () => openEditModal(user)
                        }],
                        [{
                          label: $t('admin.sendPasswordReset'),
                          icon: 'i-lucide-mail',
                          disabled: !user.email,
                          onSelect: () => sendPasswordReset(user)
                        }],
                        [{
                          label: $t('admin.deleteUser'),
                          icon: 'i-lucide-trash-2',
                          color: 'error' as const,
                          onSelect: () => confirmDelete(user)
                        }]
                      ]"
                    >
                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-more-vertical"
                        size="sm"
                      />
                    </UDropdownMenu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="isModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ editingUser ? $t('admin.editUser') : $t('admin.createUser') }}
            </h3>
          </template>

          <UForm
            :schema="editingUser ? editSchema : createSchema"
            :state="formState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              :label="$t('auth.username')"
              name="username"
            >
              <UInput
                v-model="formState.username"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('admin.emailLabel')"
              name="email"
            >
              <UInput
                v-model="formState.email"
                type="email"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="!editingUser"
              :label="$t('auth.password')"
              name="password"
              :description="$t('admin.passwordOptional')"
            >
              <UInput
                v-model="formState.password"
                type="password"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('admin.displayName')"
              name="display_name"
            >
              <UInput
                v-model="formState.display_name"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center justify-between">
              <span class="font-medium">{{ $t('admin.isAdmin') }}</span>
              <USwitch v-model="formState.is_admin" />
            </div>

            <div
              v-if="editingUser"
              class="flex items-center justify-between"
            >
              <span class="font-medium">{{ $t('admin.emailVerified') }}</span>
              <USwitch v-model="formState.email_verified" />
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton
                color="neutral"
                variant="ghost"
                @click="isModalOpen = false"
              >
                {{ $t('common.cancel') }}
              </UButton>
              <UButton
                type="submit"
                :loading="modalLoading"
              >
                {{ $t('common.save') }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model:open="deleteConfirmOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ $t('admin.deleteUser') }}
            </h3>
          </template>

          <p>{{ $t('admin.deleteUserConfirm', { username: userToDelete?.username }) }}</p>
          <p class="text-sm text-gray-500 mt-2">
            {{ $t('admin.deleteUserWarning') }}
          </p>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              color="neutral"
              variant="ghost"
              @click="deleteConfirmOpen = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              color="error"
              :loading="deleteLoading"
              @click="deleteUser"
            >
              {{ $t('admin.deleteUser') }}
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
