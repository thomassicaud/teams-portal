// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  // Runtime config pour les variables d'environnement
  runtimeConfig: {
    public: {
      azureClientId: process.env.NUXT_PUBLIC_AZURE_CLIENT_ID || '',
      azureTenantId: process.env.NUXT_PUBLIC_AZURE_TENANT_ID || '',
    }
  },

  // Configuration de Tailwind avec Nuxt UI
  ui: {
    global: true,
    icons: ['heroicons', 'lucide']
  }
})
