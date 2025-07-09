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
    const { teamName, members, accessToken } = body;

    if (!teamName || !accessToken) {
      return NextResponse.json(
        { error: 'Team name and access token are required' },
        { status: 400 }
      );
    }

    const authProvider = new DelegatedAuthenticationProvider(accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    console.log(`Searching for team "${teamName}" to finalize...`);

    // Search for the team using multiple methods with retry logic
    let foundTeam = null;
    let searchError = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Helper function to search with retry
    const searchWithRetry = async (searchFn: () => Promise<any>, methodName: string) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`${methodName} (attempt ${attempt}/${maxRetries})...`);
          return await searchFn();
        } catch (error: any) {
          console.error(`${methodName} attempt ${attempt} failed:`, error.message || error);
          
          if (attempt < maxRetries) {
            const delay = 2000 * attempt; // Progressive delay: 2s, 4s, 6s
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
    };
    
    console.log('Method 1: Searching in joined teams...');
    try {
      const joinedTeams = await searchWithRetry(
        () => graphClient.api('/me/joinedTeams').get(),
        'Method 1'
      );
      
      console.log(`Found ${joinedTeams.value.length} joined teams`);
      
      foundTeam = joinedTeams.value.find((team: any) => {
        const match = team.displayName === teamName || 
                     team.displayName.toLowerCase() === teamName.toLowerCase();
        if (match) {
          console.log(`Found team in joined teams: ${team.displayName}`);
        }
        return match;
      });
      
    } catch (error) {
      console.error('Method 1 failed after retries:', error);
      searchError = error;
    }
    
    if (!foundTeam) {
      console.log('Method 2: Searching in member groups...');
      try {
        const groups = await searchWithRetry(
          () => graphClient.api('/me/memberOf').get(),
          'Method 2'
        );
        
        console.log(`Found ${groups.value.length} member groups`);
        
        foundTeam = groups.value.find((group: any) => {
          const isTeam = group.resourceProvisioningOptions && 
                        group.resourceProvisioningOptions.includes('Team');
          
          // Check if displayName exists and is not null
          if (!group.displayName) {
            return false;
          }
          
          const nameMatch = group.displayName === teamName || 
                           group.displayName.toLowerCase() === teamName.toLowerCase();
          
          if (isTeam && nameMatch) {
            console.log(`Found team in member groups: ${group.displayName}`);
            return true;
          }
          return false;
        });
        
      } catch (error) {
        console.error('Method 2 failed after retries:', error);
        searchError = error;
      }
    }
    
    if (!foundTeam) {
      console.log('Method 3: Searching all groups...');
      try {
        const allGroups = await graphClient
          .api('/groups')
          .filter(`displayName eq '${teamName}'`)
          .get();
        
        console.log(`Found ${allGroups.value.length} groups with matching name`);
        
        foundTeam = allGroups.value.find((group: any) => {
          const isTeam = group.resourceProvisioningOptions && 
                        group.resourceProvisioningOptions.includes('Team');
          if (isTeam) {
            console.log(`Found team in all groups: ${group.displayName}`);
            return true;
          }
          return false;
        });
        
      } catch (error) {
        console.error('Method 3 failed:', error);
        searchError = error;
      }
    }
    
    // Method 4: Search with partial name matching (fallback)
    if (!foundTeam) {
      console.log('Method 4: Searching with partial matching...');
      try {
        const allGroups = await graphClient
          .api('/groups')
          .get();
        
        console.log(`Searching through ${allGroups.value.length} groups for partial matches`);
        
        foundTeam = allGroups.value.find((group: any) => {
          if (!group.displayName) return false;
          
          const isTeam = group.resourceProvisioningOptions && 
                        group.resourceProvisioningOptions.includes('Team');
          const nameMatch = group.displayName.toLowerCase().includes(teamName.toLowerCase()) ||
                           teamName.toLowerCase().includes(group.displayName.toLowerCase());
          
          if (isTeam && nameMatch) {
            console.log(`Found potential team match: ${group.displayName} (searching for: ${teamName})`);
            return true;
          }
          return false;
        });
        
      } catch (error) {
        console.error('Method 4 failed:', error);
        searchError = error;
      }
    }
    
    if (!foundTeam) {
      let errorMessage = `Team "${teamName}" not found. `;
      
      if (searchError) {
        const errorMsg = searchError instanceof Error ? searchError.message : 'Unknown error';
        if (errorMsg.includes('fetch failed') || errorMsg.includes('network')) {
          errorMessage += `Network error occurred: ${errorMsg}. This is usually temporary - please try again in a moment.`;
        } else if (errorMsg.includes('timeout')) {
          errorMessage += `Request timed out: ${errorMsg}. Microsoft services may be experiencing delays.`;
        } else {
          errorMessage += `Search error: ${errorMsg}. The team may still be provisioning.`;
        }
      } else {
        errorMessage += `The team may still be provisioning. Please wait 2-3 minutes after creation and try again.`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          retryRecommended: true,
          waitTime: (searchError as any)?.message?.includes('fetch failed') ? 30 : 120 // seconds
        },
        { status: 404 }
      );
    }

    const teamId = foundTeam.id;
    console.log(`Found team "${teamName}" with ID: ${teamId}`);

    // Try to add members to the team
    let membersAdded = 0;
    if (members && members.length > 0) {
      console.log(`Attempting to add ${members.length} members to team...`);
      
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
          console.log(`Successfully added member: ${member.email}`);
        } catch (error) {
          console.error(`Failed to add member ${member.email}:`, error);
          console.log(`Member ${member.email} should be added manually in Teams`);
          // Continue with other members even if one fails
        }
      }
    } else {
      console.log('No members to add');
    }

    // First, get existing channels to check what's already there
    console.log('Checking existing channels...');
    const existingChannelsResponse = await graphClient
      .api(`/teams/${teamId}/channels`)
      .get();
    
    const existingChannelNames = existingChannelsResponse.value.map((ch: any) => ch.displayName);
    console.log(`Found existing channels: ${existingChannelNames.join(', ')}`);

    // Create additional channels (skip "General" as it's created automatically)
    let successfulChannels = [];
    
    for (const channel of defaultChannels.slice(1)) {
      try {
        // Check if channel already exists
        if (existingChannelNames.includes(channel.displayName)) {
          console.log(`Channel ${channel.displayName} already exists, skipping creation`);
          successfulChannels.push({ displayName: channel.displayName, existing: true });
          continue;
        }

        console.log(`Creating channel: ${channel.displayName}`);
        
        // Wait a bit between channel creations to avoid conflicts
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const channelData = {
          displayName: channel.displayName,
          description: channel.description,
          membershipType: 'standard',
        };

        const createdChannel = await graphClient
          .api(`/teams/${teamId}/channels`)
          .post(channelData);
          
        successfulChannels.push(createdChannel);
        console.log(`Successfully created channel: ${channel.displayName}`);
      } catch (error: any) {
        if (error.statusCode === 400 && error.message?.includes('already existed')) {
          // Canal créé entre-temps, ce n'est pas grave
          console.log(`Channel ${channel.displayName} was created during our process, marking as existing`);
          successfulChannels.push({ displayName: channel.displayName, existing: true });
        } else {
          console.error(`Failed to create channel ${channel.displayName}:`, error);
        }
        // Continue with next channel
      }
    }

    // Distinguer les canaux créés des existants
    const newChannels = successfulChannels.filter((ch: any) => !ch.existing);
    const existingChannels = successfulChannels.filter((ch: any) => ch.existing);
    
    console.log(`Team finalization completed. New channels: ${newChannels.length}, Existing channels: ${existingChannels.length}, Members added: ${membersAdded}`);

    let message = `Équipe "${teamName}" finalisée avec succès !\n`;
    
    if (newChannels.length > 0) {
      message += `✅ ${newChannels.length} nouveaux canaux créés\n`;
    }
    
    if (existingChannels.length > 0) {
      message += `ℹ️ ${existingChannels.length} canaux existaient déjà\n`;
    }
    
    message += `👥 ${membersAdded} membres ajoutés`;

    return NextResponse.json({
      success: true,
      teamId,
      channelsCreated: newChannels.length,
      channelsExisting: existingChannels.length,
      totalChannels: successfulChannels.length,
      membersAdded,
      totalMembers: members?.length || 0,
      message: message.trim(),
    });

  } catch (error) {
    console.error('Error finalizing team:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to finalize team',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}