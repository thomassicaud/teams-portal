'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMsalInstance } from '@/lib/auth-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, FolderTree, AlertCircle, Loader2, ExternalLink, RotateCcw, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ValidationSectionProps {
  teamId: string;
}

export function ValidationSection({ teamId }: ValidationSectionProps) {
  const { account } = useAuth();
  const [validating, setValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [filesInitialized, setFilesInitialized] = useState(false);
  
  // Reset completion state if teamId changes
  React.useEffect(() => {
    setValidationComplete(false);
    setValidationStatus('idle');
    setValidationMessage('');
    setFilesInitialized(false);
  }, [teamId]);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testGraphConnectivity = async () => {
    if (!account) {
      toast.error('Non authentifié', {
        description: 'Vous devez être connecté pour tester la connectivité',
      });
      return;
    }

    setValidating(true);

    toast.loading('Test de connectivité...', {
      id: 'test-connectivity',
    });

    try {
      const tokenRequest = {
        scopes: ['User.Read'],
        account: account,
      };

      const msalInstance = getMsalInstance();
      const authResult = await msalInstance.acquireTokenSilent(tokenRequest);
      const accessToken = authResult.accessToken;

      const response = await fetch('/api/test-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Test de connectivité échoué');
      }

      toast.success('Test réussi !', {
        id: 'test-connectivity',
        description: `Utilisateur connecté : ${result.user}`,
        duration: 3000,
      });
    } catch (error: unknown) {
      console.error('Connectivity test failed:', error);
      toast.error('Test échoué', {
        id: 'test-connectivity',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        duration: 4000,
      });
    } finally {
      setValidating(false);
    }
  };

  const validateAndCreateFolders = async () => {
    if (!account) {
      toast.error('Non authentifié', {
        description: 'Vous devez être connecté pour créer la structure',
      });
      return;
    }

    setValidating(true);
    setValidationStatus('idle');
    setValidationMessage('');

    toast.loading('Création de la structure de dossiers...', {
      id: 'create-folders',
      description: 'Cela peut prendre quelques instants',
    });

    try{
      // Get fresh access token
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

      const response = await fetch('/api/teams/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId, accessToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Si l'équipe n'est pas trouvée, proposer de réessayer
        if (response.status === 404) {
          setValidationStatus('error');

          let message = result.error || 'Équipe non trouvée';

          if (result.retryRecommended) {
            const waitTime = result.waitTime || 120;
            if (waitTime <= 60) {
              message += `\n\n⚡ Erreur réseau temporaire. Réessayez dans ${waitTime} secondes.`;
              toast.warning('Équipe non trouvée', {
                id: 'create-folders',
                description: `Réessayez dans ${waitTime} secondes`,
                duration: 5000,
              });
            } else {
              message += `\n\n⏱️ L'équipe peut encore être en cours de provisioning. Attendez ${Math.ceil(waitTime/60)} minutes et réessayez.`;
              toast.warning('Équipe en provisioning', {
                id: 'create-folders',
                description: `Attendez ${Math.ceil(waitTime/60)} minutes et réessayez`,
                duration: 6000,
              });
            }
          } else {
            toast.error('Équipe non trouvée', {
              id: 'create-folders',
              description: result.error || 'Impossible de trouver l\'équipe',
              duration: 5000,
            });
          }

          setValidationMessage(message);
          return;
        }
        throw new Error(result.error || 'Erreur lors de la validation');
      }

      setValidationComplete(true);
      setValidationStatus('success');
      setValidationMessage(result.message);
      toast.success('Structure créée !', {
        id: 'create-folders',
        description: `${result.channelsSuccess || 0}/${result.channelsProcessed || 0} canaux configurés avec succès`,
        duration: 5000,
      });
    } catch (error: unknown) {
      console.error('Error during validation:', error);
      setValidationStatus('error');

      let message = error instanceof Error ? error.message : 'Erreur lors de la validation';
      let toastDescription = message;

      // Handle specific error types
      if (message.includes('Network error') || message.includes('fetch failed')) {
        message += '\n\n⚡ Problème réseau temporaire. Réessayez dans quelques secondes.';
        toastDescription = 'Problème réseau temporaire';
      } else if (message.includes('timeout') || message.includes('timed out')) {
        message += '\n\n⏱️ Délai d\'attente dépassé. Les services Microsoft peuvent être lents. Réessayez dans 1-2 minutes.';
        toastDescription = 'Délai dépassé - Réessayez dans 1-2 minutes';
      } else if (message.includes('license')) {
        message += '\n\n⚠️ Problème de licence Office 365. Vérifiez que tous les utilisateurs ont les bonnes licences.';
        toastDescription = 'Problème de licence Office 365';
      }

      toast.error('Échec de création', {
        id: 'create-folders',
        description: toastDescription,
        duration: 6000,
      });

      setValidationMessage(message);
    } finally {
      setValidating(false);
    }
  };

  const testIconAccess = async () => {
    if (!account) return;

    try {
      const tokenRequest = {
        scopes: ['User.Read', 'Group.ReadWrite.All', 'Files.ReadWrite.All'],
        account: account,
      };

      const msalInstance = getMsalInstance();
      const authResult = await msalInstance.acquireTokenSilent(tokenRequest);
      const accessToken = authResult.accessToken;

      const response = await fetch('/api/teams/test-icon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId, accessToken }),
      });

      const result = await response.json();
      
      console.log('🔍 Test icône résultat:', result);
      
      if (response.ok) {
        alert(`✅ Test réussi!\n\nÉquipe: ${result.teamInfo.displayName}\nPhoto actuelle: ${result.hasCurrentPhoto ? 'Oui' : 'Non'}\n\nVoir console pour détails`);
      } else {
        alert(`❌ Test échoué: ${result.error}\n\nDétails: ${result.details}`);
      }
    } catch (error) {
      console.error('Erreur test icône:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const openTeamsLink = () => {
    const teamsUrl = `https://teams.microsoft.com/l/team/${teamId}/conversations?groupId=${teamId}&tenantId=${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`;
    window.open(teamsUrl, '_blank');
  };

  // Étape 3 : Configuration terminée
  if (validationComplete && validationStatus === 'success') {
    return (
      <Card className="border-green-500 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Configuration terminée !
          </CardTitle>
          <CardDescription className="text-green-700">
            L&apos;équipe Teams a été créée avec succès et la structure de dossiers SharePoint est en place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-100 border-green-200">
            <AlertDescription className="text-green-700 text-sm whitespace-pre-line">
              {validationMessage}
            </AlertDescription>
          </Alert>

          {validationMessage.includes('❌') && (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-800" />
              <AlertDescription>
                <p className="text-yellow-800 font-semibold mb-2">Certains canaux ont échoué</p>
                <div className="text-yellow-700 text-sm">
                  <p className="font-medium mb-1">Solutions possibles :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Vérifiez que tous les utilisateurs ont une licence Office 365 avec SharePoint</li>
                    <li>Attendez quelques minutes et réessayez (les licences peuvent prendre du temps à se synchroniser)</li>
                    <li>Créez les dossiers manuellement dans SharePoint si nécessaire</li>
                    <li>Contactez l&apos;administrateur IT pour vérifier les licences</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={openTeamsLink}
              variant="default"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir dans Teams
            </Button>
            {validationMessage.includes('❌') && (
              <Button
                onClick={() => {
                  setValidationComplete(false);
                  setValidationStatus('idle');
                  setValidationMessage('');
                  setFilesInitialized(true);
                }}
                variant="secondary"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Réessayer la création des dossiers
              </Button>
            )}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Créer une nouvelle équipe
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Étape 2 : Validation des fichiers initialisés
  if (filesInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Étape finale : Créer la structure de dossiers
          </CardTitle>
          <CardDescription>
            Les onglets &quot;Fichiers&quot; ont été initialisés. Créez maintenant la structure standardisée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="text-green-800 font-semibold">Parfait !</p>
              <p className="text-green-700 text-sm mt-1">
                Vous pouvez maintenant créer la structure de dossiers standardisée dans chaque canal.
              </p>
            </AlertDescription>
          </Alert>

          {validationMessage && (
            <Alert
              variant={validationStatus === 'error' ? 'destructive' : 'default'}
              className={validationStatus === 'success' ? 'bg-green-50 border-green-200' : ''}
            >
              <AlertDescription className="whitespace-pre-line">
                {validationMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={validateAndCreateFolders}
              disabled={validating}
              variant="default"
              className="gap-2"
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création des dossiers en cours...
                </>
              ) : (
                <>
                  <FolderTree className="h-4 w-4" />
                  Créer la structure de dossiers SharePoint
                </>
              )}
            </Button>
            <Button
              onClick={testGraphConnectivity}
              disabled={validating}
              variant="outline"
              className="gap-2"
            >
              <FileCheck className="h-4 w-4" />
              Test connectivité
            </Button>
            <Button
              onClick={openTeamsLink}
              variant="secondary"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir dans Teams
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Étape 1 : Initialisation des onglets Fichiers
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Étape 1 : Initialiser les onglets &quot;Fichiers&quot;
        </CardTitle>
        <CardDescription>
          Action requise pour créer la structure de dossiers SharePoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <p className="font-semibold text-blue-800 mb-3">
              Pour créer la structure de dossiers SharePoint, vous devez d&apos;abord initialiser les onglets &quot;Fichiers&quot; :
            </p>
            <ol className="list-decimal list-inside text-blue-800 space-y-2">
              <li><strong>Vérifier que l&apos;équipe apparaît dans Teams</strong> (si ce n&apos;est pas le cas, attendez 1-2 minutes)</li>
              <li><strong>Ouvrir Microsoft Teams</strong> (bouton ci-dessous)</li>
              <li><strong>Accéder à votre équipe</strong> nouvellement créée</li>
              <li><strong>Pour chaque canal</strong> (Général, 1-ADMINISTRATIF, 2-OPÉRATIONNEL, 3-INFORMATIQUE, 4-DOSSIERS_DE_SUBVENTIONS) :
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
                  <li>Cliquer sur le canal</li>
                  <li>Cliquer sur l&apos;onglet <strong>&quot;Fichiers&quot;</strong></li>
                  <li>Attendre que l&apos;onglet se charge complètement</li>
                </ul>
              </li>
              <li><strong>Revenir ici</strong> et cliquer sur &quot;J&apos;ai initialisé tous les onglets Fichiers&quot;</li>
            </ol>
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mt-3">
              <p className="text-blue-800 text-sm flex items-start gap-2">
                <span className="text-lg">💡</span>
                <span><strong>Astuce :</strong> Cette étape est nécessaire pour que SharePoint crée les bibliothèques de documents de chaque canal.</span>
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {validationMessage && validationStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">
              {validationMessage}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => window.open('https://teams.microsoft.com', '_blank')}
            variant="default"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir Teams
          </Button>
          <Button
            onClick={() => setFilesInitialized(true)}
            variant="secondary"
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            J&apos;ai initialisé tous les onglets &quot;Fichiers&quot;
          </Button>
          <Button
            onClick={testIconAccess}
            variant="outline"
            className="gap-2"
          >
            <FileCheck className="h-4 w-4" />
            Tester accès icône
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}