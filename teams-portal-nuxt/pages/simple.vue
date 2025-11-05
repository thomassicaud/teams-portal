<template>
  <div style="padding: 20px; background: yellow;">
    <h1 style="color: red; font-size: 40px;">PAGE SIMPLE - SI VOUS VOYEZ CECI, NUXT FONCTIONNE</h1>
    <p style="font-size: 20px;">Compteur: {{ count }}</p>
    <button @click="count++" style="padding: 10px; font-size: 18px; background: blue; color: white;">
      Cliquer ici
    </button>
  </div>
</template>

<script setup>
const count = ref(0);
</script>
