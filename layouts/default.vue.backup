<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-users" class="w-8 h-8 text-primary" />
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Teams Portal
            </h1>
          </div>

          <!-- User info & logout -->
          <div v-if="isAuthenticated && account" class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <UAvatar
                :alt="account.name || 'User'"
                size="sm"
              />
              <div class="hidden sm:block">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ account.name }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ account.username }}
                </p>
              </div>
            </div>
            <UButton
              icon="i-heroicons-arrow-right-on-rectangle"
              color="gray"
              variant="ghost"
              @click="logout"
            >
              Déconnexion
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          © 2025 Teams Portal - Créez et gérez vos équipes Microsoft Teams facilement
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { account, isAuthenticated, logout } = useMsal();
</script>
