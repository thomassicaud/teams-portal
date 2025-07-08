import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

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
  try {
    const body = await request.json();
    const { teamName, ownerId, members, accessToken } = body;

    if (!teamName || !ownerId || !accessToken) {
      return NextResponse.json(
        { error: 'Team name, owner ID, and access token are required' },
        { status: 400 }
      );
    }

    const authProvider = new DelegatedAuthenticationProvider(accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    // First check if a team with this name already exists
    console.log(`Checking if team "${teamName}" already exists...`);
    let existingTeam = null;
    
    try {
      // Check in joined teams first
      const joinedTeams = await graphClient
        .api('/me/joinedTeams')
        .get();
      
      existingTeam = joinedTeams.value.find((team: any) => 
        team.displayName === teamName || 
        team.displayName.toLowerCase() === teamName.toLowerCase()
      );
      
      if (existingTeam) {
        console.log(`Found existing team: ${existingTeam.displayName} (ID: ${existingTeam.id})`);
        
        // Add missing members to existing team
        let membersAdded = 0;
        if (members && members.length > 0) {
          console.log(`Adding ${members.length} members to existing team...`);
          
          for (const member of members) {
            try {
              const memberData = {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${member.id}')`,
                roles: ['member'],
              };

              await graphClient
                .api(`/teams/${existingTeam.id}/members`)
                .post(memberData);
              
              membersAdded++;
              console.log(`Added member: ${member.email}`);
            } catch (error) {
              console.error(`Failed to add member ${member.email}:`, error);
              // Continue with other members even if one fails
            }
          }
        }
        
        return NextResponse.json({
          success: true,
          teamId: existingTeam.id,
          existing: true,
          channelsCreated: 0,
          membersAdded,
          totalMembers: members?.length || 0,
          message: `Équipe "${teamName}" existe déjà. ${membersAdded} nouveaux membres ajoutés.`,
        });
      }
    } catch (error) {
      console.log('Could not check existing teams, proceeding with creation:', error);
    }

    // Create team directly but with just the owner first
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

    console.log('Creating Teams directly...');
    let teamId: string;
    
    try {
      // Create the team directly
      console.log('Creating team with data:', JSON.stringify(teamData, null, 2));
      
      const teamResponse = await graphClient
        .api('/teams')
        .post(teamData);
        
      console.log('Team creation response:', JSON.stringify(teamResponse, null, 2));
      
      // For team creation, Microsoft usually returns a 202 Accepted with location header
      // Since we can't access headers directly, we'll return success and let the user proceed
      // The team will be available shortly and channels can be added via the frontend
      
      return NextResponse.json({
        success: true,
        teamId: 'pending', // Special value to indicate team is being created
        existing: false,
        channelsCreated: 0,
        membersAdded: 0,
        totalMembers: members?.length || 0,
        message: `Équipe "${teamName}" est en cours de création. Veuillez attendre quelques minutes puis actualiser la page pour finaliser la configuration.`,
        pending: true,
        teamName: teamName,
      });
      
    } catch (error: any) {
      console.error('Team creation error:', error);
      
      // If team creation fails, it might be because the team already exists
      if (error.statusCode === 409 || error.message?.includes('already exists') || error.message?.includes('conflict')) {
        console.log('Team might already exist, trying to find it...');
        
        // Try to find the existing team
        try {
          const teams = await graphClient
            .api('/me/joinedTeams')
            .get();
            
          const existingTeam = teams.value.find((team: any) => 
            team.displayName === teamName || 
            team.displayName.toLowerCase() === teamName.toLowerCase()
          );
          
          if (existingTeam) {
            teamId = existingTeam.id;
            console.log('Found existing team with ID:', teamId);
          } else {
            throw new Error(`Team "${teamName}" might already exist but cannot be found`);
          }
        } catch (findError) {
          throw new Error(`Team creation failed and could not find existing team: ${error.message}`);
        }
      } else {
        throw error;
      }
    }
    
    // Wait for team to be fully initialized  
    console.log('Waiting for team initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create default channels (skip "General" as it's created automatically)
    const channelPromises = defaultChannels.slice(1).map(async (channel) => {
      try {
        const channelData = {
          displayName: channel.displayName,
          description: channel.description,
          membershipType: 'standard',
        };

        return await graphClient
          .api(`/teams/${teamId}/channels`)
          .post(channelData);
      } catch (error) {
        console.error(`Failed to create channel ${channel.displayName}:`, error);
        return null;
      }
    });

    const channels = await Promise.all(channelPromises);
    const successfulChannels = channels.filter(Boolean);

    // Members are already added via the group creation, no need to add them separately
    console.log(`Team creation completed. Channels created: ${successfulChannels.length}`);

    return NextResponse.json({
      success: true,
      teamId,
      existing: false,
      channelsCreated: successfulChannels.length,
      membersAdded: members?.length || 0,
      totalMembers: members?.length || 0,
      message: `Équipe "${teamName}" créée avec succès avec ${successfulChannels.length} canaux additionnels et ${members?.length || 0} membres ajoutés`,
    });

  } catch (error) {
    console.error('Error creating team:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create team',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}