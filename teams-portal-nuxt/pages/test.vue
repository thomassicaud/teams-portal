<template>
  <div class="p-8">
    <h1 class="text-4xl font-bold text-blue-600">Test Page</h1>
    <p class="mt-4">Si vous voyez ceci, Nuxt fonctionne !</p>
    <UButton class="mt-4" @click="count++">Clicked {{ count }} times</UButton>
  </div>
</template>

<script setup lang="ts">
const count = ref(0);
</script>
