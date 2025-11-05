import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { Team } from '@microsoft/microsoft-graph-types';

interface GraphError extends Error {
  statusCode?: number;
}

interface EventData {
  message?: string;
  teamName?: string;
  teamId?: string;
  name?: string;
  description?: string;
  index?: number;
  total?: number;
  email?: string;
  error?: string;
  channelsCreated?: number;
  membersAdded?: number;
}

class DelegatedAuthenticationProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

const defaultChannels = [
  { displayName: 'Général', description: 'Canal général pour les discussions' },
  { displayName: '1-ADMINISTRATIF', description: 'Canal pour les sujets administratifs' },
  { displayName: '2-OPÉRATIONNEL', description: 'Canal pour les activités opérationnelles' },
  { displayName: '3-INFORMATIQUE', description: 'Canal pour les sujets informatiques et techniques' },
  { displayName: '4-DOSSIERS_DE_SUBVENTIONS', description: 'Canal pour la gestion des dossiers de subventions' },
];

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { teamName, ownerId, ownerEmail, members, accessToken } = body;

  if (!teamName || !accessToken) {
    throw createError({
      statusCode: 400,
      message: 'Team name and access token are required',
    });
  }

  // Get owner ID if not provided
  let finalOwnerId = ownerId;
  if (!finalOwnerId && ownerEmail) {
    try {
      const authProvider = new DelegatedAuthenticationProvider(accessToken);
      const graphClient = Client.initWithMiddleware({ authProvider });

      const users = await graphClient
        .api('/users')
        .filter(`mail eq '${ownerEmail}' or userPrincipalName eq '${ownerEmail}'`)
        .select('id')
        .get();

      if (users.value && users.value.length > 0) {
        finalOwnerId = users.value[0].id;
      } else {
        throw new Error('Owner not found');
      }
    } catch (error) {
      throw createError({
        statusCode: 400,
        message: 'Unable to find owner with provided email',
      });
    }
  }

  if (!finalOwnerId) {
    throw createError({
      statusCode: 400,
      message: 'Owner ID or email is required',
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Fonction helper pour envoyer un événement
      const sendEvent = (type: string, data: EventData) => {
        const event = JSON.stringify({ type, data }) + '\n';
        controller.enqueue(encoder.encode(event));
      };

      try {
        const authProvider = new DelegatedAuthenticationProvider(accessToken);
        const graphClient = Client.initWithMiddleware({ authProvider });

        sendEvent('start', { message: 'Démarrage de la création de l\'équipe...' });

        // Créer l'équipe avec le propriétaire
        sendEvent('progress', { message: 'Création de l\'équipe avec le propriétaire...' });

        const teamData = {
          'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
          displayName: teamName,
          description: `Équipe créée automatiquement: ${teamName}`,
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${finalOwnerId}')`,
              roles: ['owner'],
            },
          ],
        };

        let teamId: string | undefined;

        try {
          const response = await graphClient.api('/teams').post(teamData);
          teamId = response.id;
          sendEvent('team_created', { teamId, teamName });
        } catch (error) {
          const graphError = error as GraphError;

          // L'équipe existe peut-être déjà
          if (graphError.statusCode === 409 || graphError.message?.includes('already exists')) {
            sendEvent('progress', { message: 'Équipe existante détectée, recherche...' });

            const teams = await graphClient.api('/me/joinedTeams').get();
            const existingTeam = teams.value.find((team: Team) =>
              team.displayName === teamName ||
              team.displayName?.toLowerCase() === teamName.toLowerCase()
            );

            if (existingTeam) {
              teamId = existingTeam.id;
              sendEvent('team_found', {
                teamId,
                teamName,
                message: 'Équipe existante trouvée',
              });
            } else {
              throw new Error('Équipe existe mais non trouvée dans vos équipes');
            }
          } else {
            throw error;
          }
        }

        if (!teamId) {
          throw new Error('Team ID not available');
        }

        // Attendre que l'équipe soit provisionnée (2-3 minutes)
        sendEvent('pending', {
          message: 'Équipe en cours de provisionnement par Microsoft (2-3 minutes)...',
          teamId,
        });

        let retries = 0;
        const maxRetries = 36; // 3 minutes max (36 * 5s)
        let teamReady = false;

        while (retries < maxRetries && !teamReady) {
          try {
            await graphClient.api(`/teams/${teamId}`).get();
            teamReady = true;
            sendEvent('progress', { message: 'Équipe prête !' });
          } catch {
            retries++;
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
            if (retries % 6 === 0) {
              sendEvent('progress', {
                message: `Attente du provisionnement... (${Math.floor(retries / 6)} min)`,
              });
            }
          }
        }

        if (!teamReady) {
          throw new Error('Team provisioning timeout');
        }

        // Créer les canaux
        sendEvent('progress', { message: 'Création des canaux...' });

        let channelsCreated = 0;
        for (let i = 0; i < defaultChannels.length; i++) {
          const channel = defaultChannels[i];

          // Skip "Général" as it's created by default
          if (channel.displayName === 'Général') {
            sendEvent('channel_created', {
              name: channel.displayName,
              description: 'Canal par défaut',
              index: i + 1,
              total: defaultChannels.length,
            });
            channelsCreated++;
            continue;
          }

          try {
            await graphClient.api(`/teams/${teamId}/channels`).post({
              displayName: channel.displayName,
              description: channel.description,
            });

            channelsCreated++;
            sendEvent('channel_created', {
              name: channel.displayName,
              description: channel.description,
              index: i + 1,
              total: defaultChannels.length,
            });
          } catch (error) {
            console.error(`Error creating channel ${channel.displayName}:`, error);
            sendEvent('progress', {
              message: `Erreur lors de la création du canal ${channel.displayName}`,
            });
          }
        }

        // Ajouter les membres
        let membersAdded = 0;
        if (members && members.length > 0) {
          sendEvent('progress', { message: 'Ajout des membres...' });

          for (let i = 0; i < members.length; i++) {
            const member = members[i];

            try {
              await graphClient.api(`/teams/${teamId}/members`).post({
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${member.id}')`,
                roles: ['member'],
              });

              membersAdded++;
              sendEvent('member_added', {
                name: member.displayName,
                email: member.email,
                index: i + 1,
                total: members.length,
              });
            } catch (error) {
              console.error(`Error adding member ${member.email}:`, error);
              sendEvent('progress', {
                message: `Erreur lors de l'ajout du membre ${member.displayName}`,
              });
            }
          }
        }

        sendEvent('complete', {
          message: 'Équipe créée avec succès !',
          teamId,
          channelsCreated,
          membersAdded,
        });

        controller.close();
      } catch (error: any) {
        console.error('Error in stream:', error);
        const errorMsg = error.message || 'Une erreur est survenue';
        sendEvent('error', { message: errorMsg });
        controller.close();
      }
    },
  });

  return stream;
});
