<script setup lang="ts">
const { t } = useI18n()

const showInstallPrompt = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

onMounted(() => {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return
  }

  // Check if dismissed recently (within 7 days)
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
    return
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    showInstallPrompt.value = true
  })
})

async function install() {
  if (!deferredPrompt.value) return

  await deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    showInstallPrompt.value = false
  }
  deferredPrompt.value = null
}

function dismiss() {
  showInstallPrompt.value = false
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showInstallPrompt"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
    >
      <UCard>
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <UIcon
              name="i-lucide-download"
              class="w-5 h-5 text-primary"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-sm">
              {{ t('pwa.installTitle') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {{ t('pwa.installDescription') }}
            </p>
            <div class="flex gap-2 mt-3">
              <UButton
                size="sm"
                @click="install"
              >
                {{ t('pwa.install') }}
              </UButton>
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                @click="dismiss"
              >
                {{ t('pwa.later') }}
              </UButton>
            </div>
          </div>
          <button
            class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            :aria-label="t('common.cancel')"
            @click="dismiss"
          >
            <UIcon
              name="i-lucide-x"
              class="w-4 h-4"
            />
          </button>
        </div>
      </UCard>
    </div>
  </Transition>
</template>
