'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMsalInstance } from '@/lib/auth-config';

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
      setValidationStatus('error');
      setValidationMessage('Non authentifié');
      return;
    }

    setValidating(true);
    setValidationStatus('idle');
    setValidationMessage('');

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

      setValidationStatus('success');
      setValidationMessage(`✅ Test réussi ! Utilisateur: ${result.user}`);
    } catch (error: any) {
      console.error('Connectivity test failed:', error);
      setValidationStatus('error');
      setValidationMessage(`❌ Test de connectivité échoué: ${error.message}`);
    } finally {
      setValidating(false);
    }
  };

  const validateAndCreateFolders = async () => {
    if (!account) {
      setValidationStatus('error');
      setValidationMessage('Non authentifié');
      return;
    }

    setValidating(true);
    setValidationStatus('idle');
    setValidationMessage('');

    try {
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
            } else {
              message += `\n\n⏱️ L'équipe peut encore être en cours de provisioning. Attendez ${Math.ceil(waitTime/60)} minutes et réessayez.`;
            }
          }
          
          setValidationMessage(message);
          return;
        }
        throw new Error(result.error || 'Erreur lors de la validation');
      }

      setValidationComplete(true);
      setValidationStatus('success');
      setValidationMessage(result.message);
    } catch (error: any) {
      console.error('Error during validation:', error);
      setValidationStatus('error');
      
      let message = error instanceof Error ? error.message : 'Erreur lors de la validation';
      
      // Handle specific error types
      if (message.includes('Network error') || message.includes('fetch failed')) {
        message += '\n\n⚡ Problème réseau temporaire. Réessayez dans quelques secondes.';
      } else if (message.includes('timeout') || message.includes('timed out')) {
        message += '\n\n⏱️ Délai d\'attente dépassé. Les services Microsoft peuvent être lents. Réessayez dans 1-2 minutes.';
      } else if (message.includes('license')) {
        message += '\n\n⚠️ Problème de licence Office 365. Vérifiez que tous les utilisateurs ont les bonnes licences.';
      }
      
      setValidationMessage(message);
    } finally {
      setValidating(false);
    }
  };

  const openTeamsLink = () => {
    const teamsUrl = `https://teams.microsoft.com/l/team/${teamId}/conversations?groupId=${teamId}&tenantId=${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`;
    window.open(teamsUrl, '_blank');
  };

  // Étape 3 : Configuration terminée
  if (validationComplete && validationStatus === 'success') {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          ✅ Configuration terminée !
        </h3>
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800 mb-2">
            L'équipe Teams a été créée avec succès et la structure de dossiers SharePoint est en place.
          </p>
          <div className="text-green-700 text-sm whitespace-pre-line">
            {validationMessage}
          </div>
          
          {validationMessage.includes('❌') && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ Certains canaux ont échoué.</strong> 
              </p>
              <div className="mt-2 text-yellow-700 text-sm">
                <p><strong>Solutions possibles :</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Vérifiez que tous les utilisateurs ont une licence Office 365 avec SharePoint</li>
                  <li>Attendez quelques minutes et réessayez (les licences peuvent prendre du temps à se synchroniser)</li>
                  <li>Créez les dossiers manuellement dans SharePoint si nécessaire</li>
                  <li>Contactez l'administrateur IT pour vérifier les licences</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            onClick={openTeamsLink}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ouvrir dans Teams
          </button>
          {validationMessage.includes('❌') && (
            <button
              onClick={() => {
                setValidationComplete(false);
                setValidationStatus('idle');
                setValidationMessage('');
                setFilesInitialized(true); // Go back to step 2
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Réessayer la création des dossiers
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Créer une nouvelle équipe
          </button>
        </div>
      </div>
    );
  }

  // Étape 2 : Validation des fichiers initialisés
  if (filesInitialized) {
    return (
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Étape finale : Créer la structure de dossiers
        </h3>
        
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
          <p className="text-green-800 mb-2">
            ✅ <strong>Parfait !</strong> Les onglets "Fichiers" ont été initialisés.
          </p>
          <p className="text-green-700 text-sm">
            Vous pouvez maintenant créer la structure de dossiers standardisée dans chaque canal.
          </p>
        </div>

        {validationMessage && (
          <div className={`p-3 rounded-md mb-4 ${
            validationStatus === 'success' ? 'bg-green-100 text-green-800' : 
            validationStatus === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {validationMessage}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={validateAndCreateFolders}
            disabled={validating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {validating ? 'Création des dossiers en cours...' : 'Créer la structure de dossiers SharePoint'}
          </button>
          <button
            onClick={testGraphConnectivity}
            disabled={validating}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            🔍 Test connectivité
          </button>
          <button
            onClick={openTeamsLink}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ouvrir dans Teams
          </button>
        </div>
      </div>
    );
  }

  // Étape 1 : Initialisation des onglets Fichiers
  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Étape 1 : Initialiser les onglets "Fichiers"
      </h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <p className="text-blue-800 mb-3">
          <strong>Action requise :</strong> Pour créer la structure de dossiers SharePoint, vous devez d'abord initialiser les onglets "Fichiers" :
        </p>
        <ol className="list-decimal list-inside text-blue-800 space-y-2 mb-3">
          <li><strong>Vérifier que l'équipe apparaît dans Teams</strong> (si ce n'est pas le cas, attendez 1-2 minutes)</li>
          <li><strong>Ouvrir Microsoft Teams</strong> (bouton ci-dessous)</li>
          <li><strong>Accéder à votre équipe</strong> nouvellement créée</li>
          <li><strong>Pour chaque canal</strong> (Général, Administratif, Opérationnel, Informatique, Dossiers Subventions) :
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Cliquer sur le canal</li>
              <li>Cliquer sur l'onglet <strong>"Fichiers"</strong></li>
              <li>Attendre que l'onglet se charge complètement</li>
            </ul>
          </li>
          <li><strong>Revenir ici</strong> et cliquer sur "J'ai initialisé tous les onglets Fichiers"</li>
        </ol>
        <div className="bg-blue-100 border border-blue-300 rounded p-3 mt-3">
          <p className="text-blue-800 text-sm">
            <strong>💡 Astuce :</strong> Cette étape est nécessaire pour que SharePoint crée les bibliothèques de documents de chaque canal.
          </p>
        </div>
      </div>

      {validationMessage && validationStatus === 'error' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-yellow-800 whitespace-pre-line">
            {validationMessage}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => window.open('https://teams.microsoft.com', '_blank')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Ouvrir Teams
        </button>
        <button
          onClick={() => setFilesInitialized(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          J'ai initialisé tous les onglets "Fichiers"
        </button>
      </div>
    </div>
  );
}