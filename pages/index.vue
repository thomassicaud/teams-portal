<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-4xl font-bold text-blue-600 mb-4">Teams Portal - Nuxt.js</h1>

        <!-- Login Section -->
        <div v-if="!isAuthenticated" class="space-y-4">
          <p class="text-gray-600">Connectez-vous pour créer et gérer vos équipes Microsoft Teams</p>

          <button
            @click="handleLogin"
            :disabled="loginLoading"
            class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
          >
            <span v-if="loginLoading">Connexion en cours...</span>
            <span v-else>Se connecter avec Microsoft</span>
          </button>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">
              ℹ️ Cette application nécessite les permissions Microsoft 365 pour créer et gérer des équipes Teams.
            </p>
          </div>
        </div>

        <!-- Team Creation Form -->
        <div v-else class="space-y-6">
          <h2 class="text-2xl font-bold">Créer une nouvelle équipe</h2>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Team Name -->
            <div>
              <label class="block text-sm font-medium mb-2">Nom de l'équipe *</label>
              <input
                v-model="formData.teamName"
                type="text"
                required
                :disabled="loading"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Projet Marketing 2025"
              />
            </div>

            <!-- Owner Email -->
            <div>
              <label class="block text-sm font-medium mb-2">Email du propriétaire *</label>
              <input
                v-model="formData.ownerEmail"
                type="email"
                required
                :disabled="loading"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="proprietaire@entreprise.com"
              />
            </div>

            <!-- Members Section -->
            <div class="border-t pt-4">
              <h3 class="font-semibold mb-3">Membres de l'équipe</h3>

              <div class="flex gap-2 mb-3">
                <input
                  v-model="memberEmail"
                  type="email"
                  :disabled="loading"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="membre@entreprise.com"
                  @keydown.enter.prevent="addMember"
                />
                <button
                  type="button"
                  @click="addMember"
                  :disabled="loading || !memberEmail"
                  class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  + Ajouter
                </button>
              </div>

              <!-- Members List -->
              <div v-if="formData.members.length > 0" class="space-y-2">
                <div
                  v-for="(member, index) in formData.members"
                  :key="member.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p class="font-medium">{{ member.displayName }}</p>
                    <p class="text-sm text-gray-500">{{ member.email }}</p>
                  </div>
                  <button
                    type="button"
                    @click="removeMember(index)"
                    :disabled="loading"
                    class="text-red-600 hover:text-red-800 font-bold px-3 py-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <p v-else class="text-sm text-gray-500 italic">
                Aucun membre ajouté. Vous pouvez créer l'équipe sans membres.
              </p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="!formData.teamName || !formData.ownerEmail || loading"
              class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-lg"
            >
              <span v-if="loading">Création en cours...</span>
              <span v-else>✓ Créer l'équipe</span>
            </button>

            <!-- Status Messages -->
            <div v-if="status === 'success'" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <p class="text-green-800 font-semibold">✓ {{ message }}</p>
            </div>

            <div v-if="status === 'pending'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p class="text-yellow-800">⏳ {{ message }}</p>
            </div>

            <div v-if="status === 'error'" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-800">✕ {{ message }}</p>
            </div>
          </form>

          <!-- Logout -->
          <div class="border-t pt-4">
            <button
              @click="logout"
              class="text-gray-600 hover:text-gray-800"
            >
              Se déconnecter
            </button>
          </div>
        </div>

        <!-- Notifications Container -->
        <div id="notifications" class="fixed top-4 right-4 space-y-2 z-50"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TeamMember {
  id: string;
  email: string;
  displayName: string;
}

interface TeamFormData {
  teamName: string;
  ownerId: string;
  ownerEmail: string;
  members: TeamMember[];
}

const { account, isAuthenticated, login, logout: msalLogout, getAccessToken } = useMsal();

const loginLoading = ref(false);
const loading = ref(false);
const status = ref<'idle' | 'success' | 'error' | 'pending'>('idle');
const message = ref('');

const formData = ref<TeamFormData>({
  teamName: '',
  ownerId: '',
  ownerEmail: '',
  members: [],
});

const memberEmail = ref('');

// Simple toast notification
const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  const container = document.getElementById('notifications');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `p-4 rounded-lg shadow-lg text-white ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' : 'bg-blue-600'
  }`;
  toast.textContent = msg;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
};

const handleLogin = async () => {
  loginLoading.value = true;
  try {
    await login();
    showToast('Connexion réussie', 'success');
  } catch (error) {
    showToast('Erreur de connexion', 'error');
  } finally {
    loginLoading.value = false;
  }
};

const logout = async () => {
  await msalLogout();
  formData.value = {
    teamName: '',
    ownerId: '',
    ownerEmail: '',
    members: [],
  };
};

const addMember = async () => {
  if (!memberEmail.value || loading.value) return;

  const email = memberEmail.value.trim().toLowerCase();

  if (formData.value.members.some((m) => m.email === email)) {
    showToast('Membre déjà ajouté', 'error');
    return;
  }

  loading.value = true;

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Token non disponible');

    const response = await $fetch<any>(
      `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${email}' or userPrincipalName eq '${email}'&$select=id,displayName,mail,userPrincipalName`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.value && response.value.length > 0) {
      const user = response.value[0];
      formData.value.members.push({
        id: user.id,
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
      });
      memberEmail.value = '';
      showToast(`${user.displayName} ajouté`, 'success');
    } else {
      showToast('Utilisateur non trouvé', 'error');
    }
  } catch (error) {
    console.error('Error adding member:', error);
    showToast('Impossible d\'ajouter ce membre', 'error');
  } finally {
    loading.value = false;
  }
};

const removeMember = (index: number) => {
  formData.value.members.splice(index, 1);
  showToast('Membre retiré', 'info');
};

const handleSubmit = async () => {
  if (!formData.value.teamName || !formData.value.ownerEmail) return;

  loading.value = true;
  status.value = 'idle';

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Token non disponible');

    showToast('Démarrage de la création...', 'info');

    const response = await fetch('/api/teams/create-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData.value, accessToken }),
    });

    if (!response.ok) throw new Error('Erreur lors de la création');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        switch (event.type) {
          case 'start':
          case 'progress':
            showToast(event.data.message, 'info');
            break;
          case 'channel_created':
            showToast(`Canal: ${event.data.name} (${event.data.index}/${event.data.total})`, 'success');
            break;
          case 'member_added':
            showToast(`Membre: ${event.data.name} (${event.data.index}/${event.data.total})`, 'success');
            break;
          case 'complete':
            status.value = 'success';
            message.value = `Équipe créée ! ${event.data.channelsCreated} canaux, ${event.data.membersAdded} membres.`;
            showToast(message.value, 'success');
            formData.value = { teamName: '', ownerId: '', ownerEmail: '', members: [] };
            break;
          case 'pending':
            status.value = 'pending';
            message.value = event.data.message;
            break;
          case 'error':
            throw new Error(event.data.message);
        }
      }
    }
  } catch (error: any) {
    console.error('Error:', error);
    status.value = 'error';
    message.value = error.message || 'Une erreur est survenue';
    showToast(message.value, 'error');
  } finally {
    loading.value = false;
  }
};
</script>
