<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

interface LocaleInfo {
  code: string
  name: string
}

const availableLocales = computed<LocaleInfo[]>(() => {
  const result: LocaleInfo[] = []
  for (const l of locales.value) {
    if (typeof l !== 'string' && 'code' in l && 'name' in l && typeof l.name === 'string') {
      result.push({ code: l.code, name: l.name })
    }
  }
  return result
})

function switchLocale(code: string) {
  setLocale(code as 'en' | 'de')
}

const items = computed(() => [
  availableLocales.value.map(l => ({
    label: l.name,
    onSelect: () => switchLocale(l.code)
  }))
])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-globe"
      size="sm"
    >
      {{ availableLocales.find(l => l.code === locale)?.name }}
    </UButton>
  </UDropdownMenu>
</template>
