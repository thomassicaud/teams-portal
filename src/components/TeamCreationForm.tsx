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
}

interface TeamFormData {
  teamName: string;
  ownerId: string;
  ownerEmail: string;
  members: TeamMember[];
}

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
      const newMember: TeamMember = {
        id: user.id,
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
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
      toast.success('Membre ajouté', {
        description: `${newMember.displayName} a été ajouté à l'équipe`,
        duration: 3000,
      });
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

    toast.loading('Création de l\'équipe en cours...', {
      id: 'create-team',
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
          id: 'create-team',
          description: 'L\'équipe est en cours de création par Microsoft (2-3 min)',
          duration: 5000,
        });
      } else {
        setCreatedTeamId(result.teamId);
        setStatus('success');
        setMessage(result.message);
        toast.success('Équipe créée avec succès !', {
          id: 'create-team',
          description: `L'équipe "${formData.teamName}" a été créée`,
          duration: 4000,
        });

        // Upload de l'icône si fournie
        if (selectedImage) {
          await uploadTeamImage(result.teamId, selectedImage);
        }
      }
    } catch (error) {
      console.error('Error creating team:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la création de l\'équipe';
      setMessage(errorMsg);
      setStatus('error');
      toast.error('Échec de création', {
        id: 'create-team',
        description: errorMsg,
        duration: 5000,
      });
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

    toast.loading('Finalisation en cours...', {
      id: 'finalize-team',
      description: 'Ajout des canaux et membres',
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
      toast.success('Équipe finalisée !', {
        id: 'finalize-team',
        description: `${result.channelsCreated || 0} canaux et ${result.membersAdded || 0} membres ajoutés`,
        duration: 5000,
      });

      // Upload de l'icône si fournie
      if (selectedImage) {
        await uploadTeamImage(result.teamId, selectedImage);
      }
    } catch (error) {
      console.error('Error finalizing team:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la finalisation de l\'équipe';
      setMessage(errorMsg);
      setStatus('error');
      toast.error('Échec de finalisation', {
        id: 'finalize-team',
        description: errorMsg,
        duration: 5000,
      });
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
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium">{member.displayName}</span>
                        <span className="text-sm text-muted-foreground">{member.email}</span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
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