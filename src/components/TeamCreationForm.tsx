'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createGraphClient } from '@/lib/graph-client';
import { getMsalInstance } from '@/lib/auth-config';
import { LoginButton } from './LoginButton';
import { ValidationSection } from './ValidationSection';

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
        setMessage('Utilisateur non trouvé');
        setStatus('error');
        return;
      }

      const user = users.value[0];
      const newMember: TeamMember = {
        id: user.id,
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
      };

      if (formData.members.some(m => m.id === newMember.id)) {
        setMessage('Cet utilisateur est déjà dans la liste');
        setStatus('error');
        return;
      }

      setFormData(prev => ({
        ...prev,
        members: [...prev.members, newMember],
      }));
      setMemberEmail('');
      setStatus('idle');
      setMessage('');
    } catch (error) {
      console.error('Error finding user:', error);
      setMessage('Erreur lors de la recherche de l\'utilisateur');
      setStatus('error');
    }
  };

  const removeMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
    }));
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
        setMessage('Propriétaire non trouvé');
        setStatus('error');
        return;
      }

      const user = users.value[0];
      setFormData(prev => ({
        ...prev,
        ownerId: user.id,
      }));
      setStatus('idle');
      setMessage('');
    } catch (error) {
      console.error('Error finding owner:', error);
      setMessage('Erreur lors de la recherche du propriétaire');
      setStatus('error');
    }
  };

  const createTeam = async () => {
    if (!account || !formData.teamName.trim() || !formData.ownerId) {
      setMessage('Veuillez remplir tous les champs requis');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Get fresh access token
      const graphClient = createGraphClient(account);
      const tokenResponse = await graphClient.api('/me').get(); // This will trigger token acquisition
      
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
      } else {
        setCreatedTeamId(result.teamId);
        setStatus('success');
        setMessage(result.message);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setMessage(error instanceof Error ? error.message : 'Erreur lors de la création de l\'équipe');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const finalizeTeam = async () => {
    if (!account || !pendingTeamName) {
      setMessage('Données manquantes pour finaliser l\'équipe');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

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
    } catch (error) {
      console.error('Error finalizing team:', error);
      setMessage(error instanceof Error ? error.message : 'Erreur lors de la finalisation de l\'équipe');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Créer une nouvelle équipe Teams
        </h2>
        <LoginButton />
      </div>

      <div className="space-y-6">
        {/* Team Name */}
        <div>
          <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
            Nom de l'équipe *
          </label>
          <input
            type="text"
            id="teamName"
            value={formData.teamName}
            onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Entrez le nom de l'équipe"
          />
        </div>

        {/* Owner */}
        <div>
          <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Email du propriétaire *
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              id="ownerEmail"
              value={formData.ownerEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="proprietaire@example.com"
            />
            <button
              type="button"
              onClick={searchOwner}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Rechercher
            </button>
          </div>
          {formData.ownerId && (
            <p className="text-sm text-green-600 mt-1">✓ Propriétaire trouvé</p>
          )}
        </div>

        {/* Members */}
        <div>
          <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-2">
            Ajouter des membres
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="email"
              id="memberEmail"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="membre@example.com"
            />
            <button
              type="button"
              onClick={addMember}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Ajouter
            </button>
          </div>

          {formData.members.length > 0 && (
            <div className="border border-gray-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Membres ajoutés ({formData.members.length})
              </h4>
              <div className="space-y-2">
                {formData.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <div>
                      <span className="font-medium">{member.displayName}</span>
                      <span className="text-gray-600 ml-2">({member.email})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3 rounded-md ${
            status === 'success' ? 'bg-green-100 text-green-800' : 
            status === 'error' ? 'bg-red-100 text-red-800' : 
            status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {/* Pending Team Section */}
        {status === 'pending' && pendingTeamName && (
          <div className="border border-yellow-300 rounded-md p-4 bg-yellow-50">
            <h3 className="text-lg font-medium text-yellow-800 mb-3">
              Équipe en cours de création
            </h3>
            <p className="text-yellow-700 mb-4">
              L'équipe "<strong>{pendingTeamName}</strong>" est en cours de provisioning par Microsoft Teams. 
              Cela peut prendre quelques minutes.
            </p>
            <div className="space-y-3">
              <div className="bg-yellow-100 border border-yellow-200 rounded p-3">
                <p className="text-yellow-800 text-sm mb-2">
                  <strong>Instructions :</strong>
                </p>
                <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
                  <li>Attendez 2-3 minutes pour le provisioning</li>
                  <li>Vérifiez que l'équipe apparaît dans Microsoft Teams</li>
                  <li>Cliquez sur "Finaliser la configuration" ci-dessous</li>
                </ol>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={finalizeTeam}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Vérification en cours...' : 'Finaliser la configuration'}
                </button>
                <button
                  onClick={() => window.open('https://teams.microsoft.com', '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Ouvrir Teams
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Button */}
        {status !== 'pending' && (
          <button
            onClick={createTeam}
            disabled={loading || !formData.teamName.trim() || !formData.ownerId}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Création en cours...' : 'Créer l\'équipe Teams'}
          </button>
        )}

        {/* Validation Section */}
        {createdTeamId && status === 'success' && (
          <ValidationSection teamId={createdTeamId} />
        )}

      </div>
    </div>
  );
}