<script setup lang="ts">
definePageMeta({
  middleware: ['admin']
})

// Redirect to users page
navigateTo('/admin/users', { replace: true })
</script>

<template>
  <div />
</template>
