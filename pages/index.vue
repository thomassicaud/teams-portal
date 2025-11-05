<template>
  <div style="padding: 50px; background: #f0f0f0; min-height: 100vh;">
    <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h1 style="color: #2563eb; font-size: 36px; margin-bottom: 20px;">🚀 Teams Portal - Nuxt.js</h1>
      <p style="font-size: 18px; color: #666; margin-bottom: 30px;">Application de création et gestion d'équipes Microsoft Teams</p>

      <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 30px;">
        <p style="color: #1e40af; margin: 0;">✓ Si vous voyez cette page, Nuxt.js fonctionne correctement !</p>
      </div>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="font-size: 24px; margin-bottom: 15px;">Fonctionnalités</h2>
        <ul style="line-height: 2; color: #374151;">
          <li>✅ Authentification Microsoft 365</li>
          <li>✅ Création d'équipes Teams</li>
          <li>✅ Ajout de membres</li>
          <li>✅ Notifications en temps réel</li>
        </ul>
      </div>

      <button
        @click="counter++"
        style="background: #2563eb; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600;"
      >
        Compteur: {{ counter }} (cliquez-moi)
      </button>

      <div v-if="counter > 0" style="margin-top: 20px; padding: 15px; background: #d1fae5; border-radius: 8px;">
        <p style="color: #065f46; margin: 0;">🎉 Vous avez cliqué {{ counter }} fois ! La réactivité Vue fonctionne !</p>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px;">
          <strong>Mode:</strong> {{ isDev ? '🔧 Développement' : '🚀 Production' }} |
          <strong>Framework:</strong> Nuxt.js {{ nuxtVersion }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const counter = ref(0);
const isDev = process.dev;
const nuxtVersion = '3.x';

console.log('✅ Page index.vue chargée correctement');
console.log('Counter initial:', counter.value);
</script>
