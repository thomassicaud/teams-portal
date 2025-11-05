'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createGraphClient } from '@/lib/graph-client';
import { getMsalInstance } from '@/lib/auth-config';
import { LoginButton } from './LoginButton';
import { ValidationSection } from './ValidationSection';
import { ImageUpload } from './ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Loader2, Users, CheckCircle2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

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

// Liste des canaux par défaut créés
const DEFAULT_CHANNELS = [
  { name: 'Général', description: 'Canal général' },
  { name: '1-ADMINISTRATIF', description: 'Sujets administratifs' },
  { name: '2-OPÉRATIONNEL', description: 'Activités opérationnelles' },
  { name: '3-INFORMATIQUE', description: 'Sujets informatiques' },
  { name: '4-DOSSIERS_DE_SUBVENTIONS', description: 'Dossiers de subventions' },
];

export function TeamCreationForm() {
  const { account } = useAuth();
  const [formData, setFormData] = useState<TeamFormData>({
    teamName: '',
    ownerId: '',
    ownerEmail: '',
    members: [],
  });
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState('');
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [pendingTeamName, setPendingTeamName] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Helper function to fetch user photo
  const getUserPhoto = async (userId: string): Promise<string | undefined> => {
    if (!account) return undefined;

    try {
      console.log('Fetching photo for user:', userId);

      // Get MSAL instance and access token
      const msalInstance = getMsalInstance();
      const request = {
        scopes: ["User.ReadBasic.All", "User.Read"],
        account: account,
      };

      const response = await msalInstance.acquireTokenSilent(request);

      // Fetch photo directly using fetch API
      const photoResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`,
        {
          headers: {
            'Authorization': `Bearer ${response.accessToken}`,
          },
        }
      );

      if (!photoResponse.ok) {
        console.log('No photo available for user:', userId);
        return undefined;
      }

      // Convert response to blob then to base64
      const photoBlob = await photoResponse.blob();
      console.log('Photo blob received:', photoBlob.size, 'bytes');

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          console.log('Photo converted to base64, length:', result.length);
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('Error reading blob:', error);
          reject(error);
        };
        reader.readAsDataURL(photoBlob);
      });
    } catch (error) {
      console.log('Error fetching photo for user:', userId, error);
      return undefined;
    }
  };

  const addMember = async () => {
    if (!memberEmail.trim() || !account) return;

    try {
      const graphClient = createGraphClient(account);

      // Search for user by email
      const users = await graphClient
        .api('/users')
        .filter(`mail eq '${memberEmail}' or userPrincipalName eq '${memberEmail}'`)
        .get();

      if (users.value.length === 0) {
        toast.error('Utilisateur non trouvé', {
          description: `Aucun utilisateur trouvé avec l'email ${memberEmail}`,
        });
        return;
      }

      const user = users.value[0];

      // Fetch user photo
      const photoUrl = await getUserPhoto(user.id);

      const newMember: TeamMember = {
        id: user.id,
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
        photoUrl,
      };

      if (formData.members.some(m => m.id === newMember.id)) {
        toast.warning('Utilisateur déjà ajouté', {
          description: `${newMember.displayName} est déjà dans la liste`,
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        members: [...prev.members, newMember],
      }));
      setMemberEmail('');

      // Custom toast with user photo - Nuxt UI style
      toast.custom((t) => (
        <div className="bg-[#d1fae5] p-4 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px] relative overflow-hidden">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={newMember.displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#059669]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#059669] flex items-center justify-center text-white font-semibold text-lg border-2 border-[#6ee7b7]">
              {newMember.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="font-semibold text-[#065f46]">Membre ajouté</div>
            <div className="text-sm text-[#065f46] opacity-90">{newMember.displayName} a été ajouté à l&apos;équipe</div>
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="text-[#065f46] hover:bg-[#059669]/10 rounded p-1 transition-colors opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Progress bar timer */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-[#059669] opacity-60 rounded-b-xl origin-left"
            style={{
              animation: 'shrink-width 3s linear forwards'
            }}
          />
        </div>
      ), { duration: 3000 });
    } catch (error) {
      console.error('Error finding user:', error);
      toast.error('Erreur de recherche', {
        description: 'Impossible de rechercher l\'utilisateur',
      });
    }
  };

  const removeMember = (memberId: string) => {
    const member = formData.members.find(m => m.id === memberId);
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
    }));
    if (member) {
      toast.info('Membre retiré', {
        description: `${member.displayName} a été retiré de l'équipe`,
        duration: 2000,
      });
    }
  };

  const searchOwner = async () => {
    if (!formData.ownerEmail.trim() || !account) return;

    try {
      const graphClient = createGraphClient(account);

      const users = await graphClient
        .api('/users')
        .filter(`mail eq '${formData.ownerEmail}' or userPrincipalName eq '${formData.ownerEmail}'`)
        .get();

      if (users.value.length === 0) {
        toast.error('Propriétaire non trouvé', {
          description: `Aucun propriétaire trouvé avec l'email ${formData.ownerEmail}`,
        });
        return;
      }

      const user = users.value[0];
      setFormData(prev => ({
        ...prev,
        ownerId: user.id,
      }));
      toast.success('Propriétaire trouvé', {
        description: `${user.displayName} sera le propriétaire de l'équipe`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error finding owner:', error);
      toast.error('Erreur de recherche', {
        description: 'Impossible de rechercher le propriétaire',
      });
    }
  };

  const createTeam = async () => {
    if (!account || !formData.teamName.trim() || !formData.ownerId) {
      toast.error('Formulaire incomplet', {
        description: 'Veuillez remplir le nom de l\'équipe et rechercher un propriétaire',
      });
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    // Étape 1: Authentification
    toast.loading('Authentification en cours...', {
      id: 'auth-step',
      description: 'Acquisition du token d\'accès Microsoft',
    });

    try {
      // Get fresh access token
      const graphClient = createGraphClient(account);
      await graphClient.api('/me').get(); // This will trigger token acquisition

      // Extract the token from the auth provider
      const tokenRequest = {
        scopes: [
          'User.Read',
          'Group.ReadWrite.All',
          'Team.Create',
          'Channel.Create',
          'Files.ReadWrite.All',
        ],
        account: account,
      };

      const msalInstance = getMsalInstance();
      const authResult = await msalInstance.acquireTokenSilent(tokenRequest);
      const accessToken = authResult.accessToken;

      toast.success('Authentification réussie', {
        id: 'auth-step',
        description: 'Token d\'accès obtenu',
        duration: 2000,
      });

      // Étape 2: Création de l'équipe
      toast.loading('Création de l\'équipe...', {
        id: 'create-step',
        description: `Création de "${formData.teamName}" avec le propriétaire`,
      });

      const response = await fetch('/api/teams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          accessToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de l\'équipe');
      }

      if (result.pending) {
        setPendingTeamName(result.teamName);
        setStatus('pending');
        setMessage(result.message);
        toast.info('Équipe en provisioning', {
          id: 'create-step',
          description: 'L\'équipe est en cours de création par Microsoft (2-3 min)',
          duration: 5000,
        });
      } else {
        setCreatedTeamId(result.teamId);
        setStatus('success');
        setMessage(result.message);

        toast.success('Équipe créée !', {
          id: 'create-step',
          description: `Équipe "${formData.teamName}" initialisée`,
          duration: 3000,
        });

        // Étape 3: Afficher les canaux créés
        if (result.channelsCreated && result.channelsCreated > 0) {
          // Simuler l'affichage progressif des canaux créés
          for (let i = 0; i < Math.min(DEFAULT_CHANNELS.length, result.channelsCreated); i++) {
            const channel = DEFAULT_CHANNELS[i];
            setTimeout(() => {
              toast.success(`Canal créé: ${channel.name}`, {
                description: channel.description,
                duration: 2500,
              });
            }, i * 300); // 300ms entre chaque canal
          }
        }

        // Étape 4: Afficher les membres ajoutés
        if (formData.members.length > 0 && result.membersAdded) {
          const startDelay = (result.channelsCreated || 0) * 300;
          for (let i = 0; i < Math.min(formData.members.length, result.membersAdded); i++) {
            const member = formData.members[i];
            setTimeout(() => {
              toast.success(`Membre ajouté: ${member.displayName}`, {
                description: member.email,
                duration: 2500,
              });
            }, startDelay + i * 300);
          }
        }

        // Étape 5: Upload de l'icône si fournie
        const totalDelay = ((result.channelsCreated || 0) + (result.membersAdded || 0)) * 300;
        if (selectedImage) {
          setTimeout(async () => {
            toast.loading('Upload de l\'icône...', {
              id: 'icon-upload',
              description: 'Personnalisation de l\'icône de l\'équipe',
            });

            try {
              await uploadTeamImage(result.teamId, selectedImage);
              toast.success('Icône uploadée', {
                id: 'icon-upload',
                description: 'L\'icône de l\'équipe a été mise à jour',
                duration: 3000,
              });
            } catch {
              toast.warning('Icône non uploadée', {
                id: 'icon-upload',
                description: 'L\'équipe a été créée mais l\'icône n\'a pas pu être uploadée',
                duration: 3000,
              });
            }
          }, totalDelay);
        }
      }
    } catch (error) {
      console.error('Error creating team:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la création de l\'équipe';
      setMessage(errorMsg);
      setStatus('error');
      toast.error('Échec de création', {
        id: 'create-step',
        description: errorMsg,
        duration: 5000,
      });
      toast.dismiss('auth-step');
      toast.dismiss('icon-upload');
    } finally {
      setLoading(false);
    }
  };

  const finalizeTeam = async () => {
    if (!account || !pendingTeamName) {
      toast.error('Impossible de finaliser', {
        description: 'Données manquantes pour finaliser l\'équipe',
      });
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    // Étape 1: Authentification pour finalisation
    toast.loading('Authentification en cours...', {
      id: 'finalize-auth',
      description: 'Acquisition des permissions pour finaliser l\'équipe',
    });

    try {
      // Get fresh access token
      const tokenRequest = {
        scopes: [
          'User.Read',
          'User.ReadBasic.All',
          'Group.ReadWrite.All',
          'Group.Read.All',
          'Team.Create',
          'Team.ReadBasic.All',
          'Channel.Create',
          'TeamMember.ReadWrite.All',
          'Files.ReadWrite.All',
          'Sites.ReadWrite.All',
        ],
        account: account,
      };

      const msalInstance = getMsalInstance();
      const authResult = await msalInstance.acquireTokenSilent(tokenRequest);
      const accessToken = authResult.accessToken;

      toast.success('Authentification réussie', {
        id: 'finalize-auth',
        description: 'Permissions obtenues',
        duration: 2000,
      });

      // Étape 2: Recherche de l'équipe et ajout des canaux/membres
      const memberCount = formData.members.length;
      toast.loading('Finalisation en cours...', {
        id: 'finalize-step',
        description: `Ajout des canaux et ${memberCount} membre${memberCount > 1 ? 's' : ''}`,
      });

      const response = await fetch('/api/teams/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamName: pendingTeamName,
          members: formData.members,
          accessToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la finalisation de l\'équipe');
      }

      setCreatedTeamId(result.teamId);
      setPendingTeamName(null);
      setStatus('success');
      setMessage(result.message);

      const channelsCreated = result.channelsCreated || 0;
      const membersAdded = result.membersAdded || 0;

      toast.success('Finalisation terminée !', {
        id: 'finalize-step',
        description: `Équipe "${pendingTeamName}" finalisée`,
        duration: 3000,
      });

      // Étape 3: Afficher les canaux créés
      if (channelsCreated > 0) {
        // Simuler l'affichage progressif des canaux créés
        for (let i = 0; i < Math.min(DEFAULT_CHANNELS.length, channelsCreated); i++) {
          const channel = DEFAULT_CHANNELS[i];
          setTimeout(() => {
            toast.success(`Canal créé: ${channel.name}`, {
              description: channel.description,
              duration: 2500,
            });
          }, i * 300); // 300ms entre chaque canal
        }
      }

      // Étape 4: Afficher les membres ajoutés
      if (formData.members.length > 0 && membersAdded > 0) {
        const startDelay = channelsCreated * 300;
        for (let i = 0; i < Math.min(formData.members.length, membersAdded); i++) {
          const member = formData.members[i];
          setTimeout(() => {
            toast.success(`Membre ajouté: ${member.displayName}`, {
              description: member.email,
              duration: 2500,
            });
          }, startDelay + i * 300);
        }
      }

      // Étape 5: Upload de l'icône si fournie
      const totalDelay = (channelsCreated + membersAdded) * 300;
      if (selectedImage) {
        setTimeout(async () => {
          toast.loading('Upload de l\'icône...', {
            id: 'finalize-icon',
            description: 'Personnalisation de l\'icône de l\'équipe',
          });

          try {
            await uploadTeamImage(result.teamId, selectedImage);
            toast.success('Icône uploadée', {
              id: 'finalize-icon',
              description: 'L\'icône de l\'équipe a été mise à jour',
              duration: 3000,
            });
          } catch {
            toast.warning('Icône non uploadée', {
              id: 'finalize-icon',
              description: 'L\'équipe a été finalisée mais l\'icône n\'a pas pu être uploadée',
              duration: 3000,
            });
          }
        }, totalDelay);
      }
    } catch (error) {
      console.error('Error finalizing team:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la finalisation de l\'équipe';
      setMessage(errorMsg);
      setStatus('error');
      toast.error('Échec de finalisation', {
        id: 'finalize-step',
        description: errorMsg,
        duration: 5000,
      });
      toast.dismiss('finalize-auth');
      toast.dismiss('finalize-icon');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour upload de l'icône d'équipe
  const uploadTeamImage = async (teamId: string, imageFile: File) => {
    if (!account) {
      console.error('No account available for image upload');
      return;
    }

    console.log('Starting image upload for team:', teamId);
    console.log('Image file:', imageFile.name, imageFile.size, imageFile.type);

    setImageUploading(true);

    toast.loading('Upload de l\'icône...', {
      id: 'upload-icon',
    });

    try {
      // Get fresh access token
      const tokenRequest = {
        scopes: [
          'User.Read',
          'Group.ReadWrite.All',
          'Files.ReadWrite.All',
        ],
        account: account,
      };

      const msalInstance = getMsalInstance();
      const authResult = await msalInstance.acquireTokenSilent(tokenRequest);
      const accessToken = authResult.accessToken;

      console.log('Access token acquired for image upload');

      // Préparer FormData pour l'upload
      const formData = new FormData();
      formData.append('teamId', teamId);
      formData.append('accessToken', accessToken);
      formData.append('image', imageFile);

      console.log('Sending upload request to /api/teams/upload-icon');

      const response = await fetch('/api/teams/upload-icon', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'upload de l\'icône');
      }

      console.log('Icon uploaded successfully:', result);
      toast.success('Icône mise à jour !', {
        id: 'upload-icon',
        description: 'L\'icône de l\'équipe a été mise à jour avec succès',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error uploading team icon:', error);
      toast.error('Échec de l\'upload', {
        id: 'upload-icon',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        duration: 4000,
      });
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <CardTitle className="text-2xl">Créer une nouvelle équipe Teams</CardTitle>
            <CardDescription className="mt-2">
              Remplissez le formulaire ci-dessous pour créer automatiquement une équipe avec sa structure complète
            </CardDescription>
          </div>
          <LoginButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Name */}
        <div className="space-y-2">
          <label htmlFor="teamName" className="text-sm font-medium">
            Nom de l&apos;équipe *
          </label>
          <Input
            type="text"
            id="teamName"
            value={formData.teamName}
            onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
            placeholder="Entrez le nom de l'équipe"
          />
        </div>

        {/* Team Image Upload */}
        <ImageUpload
          onImageSelect={setSelectedImage}
          selectedImage={selectedImage}
        />

        {/* Owner */}
        <div className="space-y-2">
          <label htmlFor="ownerEmail" className="text-sm font-medium">
            Email du propriétaire *
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              id="ownerEmail"
              value={formData.ownerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
              placeholder="proprietaire@example.com"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={searchOwner}
              variant="secondary"
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Rechercher
            </Button>
          </div>
          {formData.ownerId && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Propriétaire trouvé
            </div>
          )}
        </div>

        {/* Members */}
        <div className="space-y-3">
          <label htmlFor="memberEmail" className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ajouter des membres
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              id="memberEmail"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="membre@example.com"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={addMember}
              variant="default"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>

          {formData.members.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membres ajoutés ({formData.members.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formData.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* User photo */}
                      {member.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.photoUrl}
                          alt={member.displayName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Member info */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{member.displayName}</span>
                        <span className="text-sm text-muted-foreground truncate">{member.email}</span>
                      </div>
                      {/* Remove button */}
                      <Button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <Alert variant={status === 'error' ? 'destructive' : 'default'} className={
            status === 'success' ? 'border-green-500 bg-green-50 text-green-800' :
            status === 'pending' ? 'border-yellow-500 bg-yellow-50 text-yellow-800' :
            ''
          }>
            <AlertDescription className="whitespace-pre-line">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Team Section */}
        {status === 'pending' && pendingTeamName && (
          <Card className="border-yellow-500 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Équipe en cours de création
              </CardTitle>
              <CardDescription className="text-yellow-700">
                L&apos;équipe &quot;<strong>{pendingTeamName}</strong>&quot; est en cours de provisioning par Microsoft Teams.
                Cela peut prendre quelques minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-100 border-yellow-200">
                <AlertDescription>
                  <p className="font-semibold text-yellow-800 mb-2">Instructions :</p>
                  <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
                    <li>Attendez 2-3 minutes pour le provisioning</li>
                    <li>Vérifiez que l&apos;équipe apparaît dans Microsoft Teams</li>
                    <li>Cliquez sur &quot;Finaliser la configuration&quot; ci-dessous</li>
                  </ol>
                </AlertDescription>
              </Alert>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={finalizeTeam}
                  disabled={loading || imageUploading}
                  variant="default"
                  className="gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Vérification en cours...' : imageUploading ? 'Upload de l\'icône...' : 'Finaliser la configuration'}
                </Button>
                <Button
                  onClick={() => window.open('https://teams.microsoft.com', '_blank')}
                  variant="secondary"
                  className="gap-2"
                >
                  Ouvrir Teams
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Button */}
        {status !== 'pending' && (
          <>
            <Separator />
            <Button
              onClick={createTeam}
              disabled={loading || imageUploading || !formData.teamName.trim() || !formData.ownerId}
              className="w-full gap-2"
              size="lg"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Création en cours...' : imageUploading ? 'Upload de l\'icône...' : 'Créer l\'équipe Teams'}
            </Button>
          </>
        )}

        {/* Validation Section */}
        {createdTeamId && status === 'success' && (
          <>
            <Separator />
            <ValidationSection teamId={createdTeamId} />
          </>
        )}

      </CardContent>
    </Card>
  );
}