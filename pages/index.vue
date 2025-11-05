<template>
  <div>
    <!-- Login Section -->
    <div v-if="!isAuthenticated" class="flex items-center justify-center min-h-[60vh]">
      <UCard class="w-full max-w-md">
        <template #header>
          <div class="text-center">
            <UIcon name="i-heroicons-users" class="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 class="text-2xl font-bold">Bienvenue sur Teams Portal</h2>
            <p class="text-gray-500 dark:text-gray-400 mt-2">
              Connectez-vous pour créer et gérer vos équipes Microsoft Teams
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UButton
            block
            size="lg"
            icon="i-heroicons-arrow-right-on-rectangle"
            :loading="loginLoading"
            @click="handleLogin"
          >
            Se connecter avec Microsoft
          </UButton>

          <UAlert
            icon="i-heroicons-information-circle"
            color="blue"
            variant="soft"
            title="Permissions requises"
            description="Cette application nécessite les permissions Microsoft 365 pour créer et gérer des équipes Teams."
          />
        </div>
      </UCard>
    </div>

    <!-- Team Creation Form -->
    <div v-else>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-user-group" class="w-6 h-6 text-primary" />
            <h2 class="text-xl font-bold">Créer une nouvelle équipe</h2>
          </div>
        </template>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Team Name -->
          <UFormGroup label="Nom de l'équipe" required>
            <UInput
              v-model="formData.teamName"
              size="lg"
              placeholder="Ex: Projet Marketing 2025"
              :disabled="loading"
            />
          </UFormGroup>

          <!-- Owner Email -->
          <UFormGroup label="Email du propriétaire" required>
            <UInput
              v-model="formData.ownerEmail"
              type="email"
              size="lg"
              placeholder="proprietaire@entreprise.com"
              :disabled="loading"
            />
          </UFormGroup>

          <!-- Members Section -->
          <UDivider label="Membres de l'équipe" />

          <div class="space-y-3">
            <div class="flex gap-2">
              <UInput
                v-model="memberEmail"
                type="email"
                size="lg"
                placeholder="membre@entreprise.com"
                class="flex-1"
                :disabled="loading"
                @keydown.enter.prevent="addMember"
              />
              <UButton
                icon="i-heroicons-plus"
                size="lg"
                @click="addMember"
                :disabled="loading || !memberEmail"
              >
                Ajouter
              </UButton>
            </div>

            <!-- Members List -->
            <div v-if="formData.members.length > 0" class="space-y-2">
              <div
                v-for="(member, index) in formData.members"
                :key="member.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <UAvatar
                    :alt="member.displayName"
                    size="sm"
                    :src="member.photoUrl"
                  />
                  <div>
                    <p class="text-sm font-medium">{{ member.displayName }}</p>
                    <p class="text-xs text-gray-500">{{ member.email }}</p>
                  </div>
                </div>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="red"
                  variant="ghost"
                  size="sm"
                  @click="removeMember(index)"
                  :disabled="loading"
                />
              </div>
            </div>

            <UAlert
              v-else
              icon="i-heroicons-information-circle"
              color="gray"
              variant="soft"
              description="Aucun membre ajouté. Vous pouvez créer l'équipe sans membres et les ajouter plus tard."
            />
          </div>

          <!-- Image Upload -->
          <UFormGroup label="Image de l'équipe (optionnel)">
            <div class="space-y-3">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleImageSelect"
              />
              <UButton
                icon="i-heroicons-photo"
                variant="outline"
                @click="fileInput?.click()"
                :disabled="loading"
              >
                Choisir une image
              </UButton>

              <div v-if="selectedImage" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <UIcon name="i-heroicons-photo" class="w-5 h-5 text-primary" />
                <span class="text-sm flex-1">{{ selectedImage.name }}</span>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click="selectedImage = null"
                />
              </div>
            </div>
          </UFormGroup>

          <!-- Submit Button -->
          <UButton
            type="submit"
            block
            size="lg"
            icon="i-heroicons-check-circle"
            :loading="loading"
            :disabled="!formData.teamName || !formData.ownerEmail"
          >
            Créer l'équipe
          </UButton>

          <!-- Status Messages -->
          <UAlert
            v-if="status === 'success'"
            icon="i-heroicons-check-circle"
            color="green"
            :title="message"
          />

          <UAlert
            v-if="status === 'pending'"
            icon="i-heroicons-clock"
            color="yellow"
            :title="message"
          />

          <UAlert
            v-if="status === 'error'"
            icon="i-heroicons-exclamation-circle"
            color="red"
            :title="message"
          />
        </form>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

interface TeamFormData {
  teamName: string;
  ownerId: string;
  ownerEmail: string;
  members: TeamMember[];
}

const { account, isAuthenticated, login, getAccessToken } = useMsal();
const toast = useToast();

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
const selectedImage = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const handleLogin = async () => {
  loginLoading.value = true;
  try {
    await login();
    toast.add({
      title: 'Connexion réussie',
      description: 'Vous êtes maintenant connecté',
      color: 'green',
    });
  } catch (error) {
    toast.add({
      title: 'Erreur de connexion',
      description: 'Impossible de se connecter à Microsoft',
      color: 'red',
    });
  } finally {
    loginLoading.value = false;
  }
};

const addMember = async () => {
  if (!memberEmail.value || loading.value) return;

  const email = memberEmail.value.trim().toLowerCase();

  // Check for duplicates
  if (formData.value.members.some((m) => m.email === email)) {
    toast.add({
      title: 'Membre déjà ajouté',
      description: 'Ce membre est déjà dans la liste',
      color: 'orange',
    });
    return;
  }

  loading.value = true;

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Token non disponible');
    }

    // Search for user in Microsoft Graph
    const response = await $fetch<any>(`https://graph.microsoft.com/v1.0/users?$filter=mail eq '${email}' or userPrincipalName eq '${email}'&$select=id,displayName,mail,userPrincipalName`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.value && response.value.length > 0) {
      const user = response.value[0];

      // Try to get user photo
      let photoUrl: string | undefined;
      try {
        const photoBlob = await $fetch<Blob>(`https://graph.microsoft.com/v1.0/users/${user.id}/photo/$value`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          responseType: 'blob',
        });

        photoUrl = URL.createObjectURL(photoBlob);
      } catch {
        // Photo not available
      }

      formData.value.members.push({
        id: user.id,
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
        photoUrl,
      });

      memberEmail.value = '';

      toast.add({
        title: 'Membre ajouté',
        description: `${user.displayName} a été ajouté à l'équipe`,
        color: 'green',
      });
    } else {
      toast.add({
        title: 'Utilisateur non trouvé',
        description: 'Aucun utilisateur trouvé avec cet email',
        color: 'red',
      });
    }
  } catch (error) {
    console.error('Error adding member:', error);
    toast.add({
      title: 'Erreur',
      description: 'Impossible d\'ajouter ce membre',
      color: 'red',
    });
  } finally {
    loading.value = false;
  }
};

const removeMember = (index: number) => {
  formData.value.members.splice(index, 1);
  toast.add({
    title: 'Membre retiré',
    description: 'Le membre a été retiré de la liste',
    color: 'gray',
  });
};

const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedImage.value = target.files[0];
  }
};

const handleSubmit = async () => {
  if (!formData.value.teamName || !formData.value.ownerEmail) return;

  loading.value = true;
  status.value = 'idle';

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Token non disponible');
    }

    // Call streaming API
    const response = await fetch('/api/teams/create-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData.value,
        accessToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la création de l\'équipe');
    }

    // Read stream
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
            toast.add({
              title: event.data.message,
              color: 'blue',
              timeout: 2000,
            });
            break;

          case 'channel_created':
            toast.add({
              title: `Canal créé: ${event.data.name}`,
              description: `${event.data.index}/${event.data.total}`,
              color: 'green',
              timeout: 2000,
            });
            break;

          case 'member_added':
            toast.add({
              title: `Membre ajouté: ${event.data.name}`,
              description: `${event.data.index}/${event.data.total}`,
              color: 'green',
              timeout: 2000,
            });
            break;

          case 'complete':
            status.value = 'success';
            message.value = `Équipe créée avec succès ! ${event.data.channelsCreated} canaux et ${event.data.membersAdded} membres ajoutés.`;
            toast.add({
              title: 'Équipe créée !',
              description: message.value,
              color: 'green',
            });
            // Reset form
            formData.value = {
              teamName: '',
              ownerId: '',
              ownerEmail: '',
              members: [],
            };
            selectedImage.value = null;
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
    console.error('Error creating team:', error);
    status.value = 'error';
    message.value = error.message || 'Une erreur est survenue';
    toast.add({
      title: 'Erreur',
      description: message.value,
      color: 'red',
    });
  } finally {
    loading.value = false;
  }
};
</script>
