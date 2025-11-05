import { NextRequest } from 'next/server';
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { teamName, ownerId, members, accessToken } = body;

  if (!teamName || !ownerId || !accessToken) {
    return new Response(
      JSON.stringify({ error: 'Team name, owner ID, and access token are required' }),
      { status: 400 }
    );
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
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${ownerId}')`,
              roles: ['owner'],
            },
          ],
        };

        let teamId: string = '';

        try {
          await graphClient.api('/teams').post(teamData);

          sendEvent('pending', {
            message: 'Équipe en cours de provisioning par Microsoft (2-3 minutes)',
            teamName
          });

          controller.close();
          return;
        } catch (error: unknown) {
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
                message: `Équipe "${teamName}" trouvée`,
                teamId
              });
            } else {
              throw new Error('Team not found');
            }
          } else {
            throw error;
          }
        }

        // Attendre que l'équipe soit initialisée
        sendEvent('progress', { message: 'Initialisation de l\'équipe...' });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Créer les canaux un par un
        sendEvent('progress', { message: 'Création des canaux...' });

        let channelsCreated = 0;
        for (const channel of defaultChannels.slice(1)) {
          try {
            const channelData = {
              displayName: channel.displayName,
              description: channel.description,
              membershipType: 'standard',
            };

            await graphClient
              .api(`/teams/${teamId}/channels`)
              .post(channelData);

            channelsCreated++;
            sendEvent('channel_created', {
              name: channel.displayName,
              description: channel.description,
              index: channelsCreated,
              total: defaultChannels.length - 1
            });

            // Petit délai pour que l'utilisateur voie la progression
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Failed to create channel ${channel.displayName}:`, error);
            sendEvent('channel_error', {
              name: channel.displayName,
              error: 'Échec de création'
            });
          }
        }

        // Ajouter les membres un par un
        if (members && members.length > 0) {
          sendEvent('progress', { message: 'Ajout des membres...' });

          let membersAdded = 0;
          for (const member of members) {
            try {
              const memberData = {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${member.id}')`,
                roles: ['member'],
              };

              await graphClient
                .api(`/teams/${teamId}/members`)
                .post(memberData);

              membersAdded++;
              sendEvent('member_added', {
                name: member.displayName,
                email: member.email,
                index: membersAdded,
                total: members.length
              });

              // Petit délai pour que l'utilisateur voie la progression
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Failed to add member ${member.email}:`, error);
              sendEvent('member_error', {
                name: member.displayName,
                error: 'Échec d\'ajout'
              });
            }
          }

          sendEvent('complete', {
            message: 'Équipe créée avec succès !',
            teamId,
            channelsCreated,
            membersAdded,
            teamName
          });
        } else {
          sendEvent('complete', {
            message: 'Équipe créée avec succès !',
            teamId,
            channelsCreated,
            membersAdded: 0,
            teamName
          });
        }

      } catch (error) {
        console.error('Error in stream:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        sendEvent('error', { message: errorMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
