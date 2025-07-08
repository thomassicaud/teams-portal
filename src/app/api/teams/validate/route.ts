import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

class DelegatedAuthenticationProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

// Structure de dossiers personnalisée par canal
const channelFolderStructures = {
  'Général': [
    'Administration',
    'Communication',
    'Archive',
  ],
  'General': [ // Canal créé automatiquement par Teams (en anglais)
    'Administration',
    'Communication',
    'Archive',
  ],
  '1-ADMINISTRATIF': [
    '1-Contrats/1-Lot_1',
    '1-Contrats/2-Lot_2', 
    '1-Contrats/3-Lot_3',
    '2-Accord de prise en charge',
    '3-Facturation',
  ],
  '2-OPÉRATIONNEL': [
    '1-Lot_1/Cadrage Lancement',
    '1-Lot_1/Analyse des besoins',
    '1-Lot_1/Solutions',
    '2-Lot_2',
    '3-Lot_3',
  ],
  '3-INFORMATIQUE': [
    '1-Lot_1/Audit',
    '1-Lot_1/Restitutions',
  ],
  '4-DOSSIERS_DE_SUBVENTIONS': [
    // Pas de sous-dossiers spécifiés
  ],
};

// Helper function for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${operationName} (attempt ${attempt}/${maxRetries})...`);
      return await operation();
    } catch (error: any) {
      const errorMsg = error.message || error;
      console.error(`${operationName} attempt ${attempt} failed:`, errorMsg);
      
      if (attempt < maxRetries && (
        errorMsg.includes('fetch failed') || 
        errorMsg.includes('network') || 
        errorMsg.includes('timeout') ||
        error.statusCode === 429 || // Rate limit
        error.statusCode >= 500 // Server errors
      )) {
        const delay = 2000 * attempt; // Progressive delay: 2s, 4s, 6s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Operation failed after ${maxRetries} attempts`);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, accessToken } = body;

    if (!teamId || !accessToken) {
      return NextResponse.json(
        { error: 'Team ID and access token are required' },
        { status: 400 }
      );
    }

    const authProvider = new DelegatedAuthenticationProvider(accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    // Get all channels in the team with retry
    console.log('Fetching team channels...');
    let channelsResponse;
    try {
      channelsResponse = await retryOperation(
        () => graphClient.api(`/teams/${teamId}/channels`).get(),
        'Get team channels'
      );
      console.log('Successfully fetched channels');
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      throw error;
    }

    const channels = channelsResponse.value;
    console.log(`Found ${channels.length} channels to process`);

    // For each channel, create the folder structure in SharePoint
    const folderPromises = channels.map(async (channel: any) => {
      try {
        console.log(`Processing channel: ${channel.displayName}`);
        
        // Get the folder structure for this specific channel
        const folderStructure = channelFolderStructures[channel.displayName as keyof typeof channelFolderStructures];
        
        if (!folderStructure) {
          console.log(`No folder structure defined for channel: ${channel.displayName}`);
          return {
            channelName: channel.displayName,
            foldersCreated: 0,
            totalFolders: 0,
            error: 'No folder structure defined for this channel',
          };
        }

        // Get the SharePoint site and drive for this channel with retry
        let driveResponse;
        try {
          console.log(`Getting files folder for channel ${channel.displayName} (ID: ${channel.id})`);
          driveResponse = await retryOperation(
            () => graphClient.api(`/teams/${teamId}/channels/${channel.id}/filesFolder`).get(),
            `Get files folder for channel ${channel.displayName}`
          );
          console.log(`Successfully got files folder for ${channel.displayName}`);
        } catch (error: any) {
          console.error(`Error getting files folder for ${channel.displayName}:`, error);
          if (error.message && error.message.includes('license information')) {
            console.log(`Skipping channel ${channel.displayName} due to license restrictions`);
            return {
              channelName: channel.displayName,
              foldersCreated: 0,
              totalFolders: folderStructure.length,
              error: 'Accès restreint - licence Office 365 requise pour ce canal',
            };
          }
          throw error;
        }

        const siteId = driveResponse.parentReference.siteId;
        const driveId = driveResponse.parentReference.driveId;
        
        // Use the channel display name as the folder path (SharePoint creates folders with channel names)
        const channelFolderPath = channel.displayName;
        console.log(`Channel folder path: ${channelFolderPath}`);

        console.log(`Creating ${folderStructure.length} folders in channel ${channel.displayName}`);
        
        // Get the correct channel folder name from the driveResponse
        // The webUrl contains the full path, we need to extract the channel folder name
        const urlParts = driveResponse.webUrl.split('/');
        const actualChannelFolderName = urlParts[urlParts.length - 1];
        console.log(`Actual channel folder name from URL: ${actualChannelFolderName}`);
        console.log(`Full webUrl: ${driveResponse.webUrl}`);

        // Create folders sequentially to handle nested structures properly
        let successfulFolders = 0;
        
        for (const folderPath of folderStructure) {
          try {
            // Handle nested folders (e.g., "Contrats/Lot 1")
            const pathParts = folderPath.split('/');
            let currentPath = '';
            
            for (let i = 0; i < pathParts.length; i++) {
              const folderName = pathParts[i];
              const parentPath = currentPath;
              currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
              
              try {
                const folderData = {
                  name: folderName,
                  folder: {},
                  '@microsoft.graph.conflictBehavior': 'fail', // Fail instead of rename to detect existing folders
                };

                // Create folders inside the specific channel folder
                // Use the actual channel folder name extracted from webUrl
                const fullPath = parentPath 
                  ? `${actualChannelFolderName}/${parentPath}`
                  : actualChannelFolderName;
                
                const apiPath = parentPath 
                  ? `/sites/${siteId}/drives/${driveId}/root:/${fullPath}:/children`
                  : `/sites/${siteId}/drives/${driveId}/root:/${actualChannelFolderName}:/children`;

                await retryOperation(
                  () => graphClient.api(apiPath).post(folderData),
                  `Create folder ${currentPath} in channel ${channel.displayName}`
                );

                console.log(`Created folder: ${actualChannelFolderName}/${currentPath}`);
                
                // Only count the final folder in nested structures
                if (i === pathParts.length - 1) {
                  successfulFolders++;
                }
                
              } catch (error: any) {
                if (error.statusCode === 409 || error.code === 'nameAlreadyExists') {
                  // Folder already exists, this is OK
                  console.log(`Folder already exists: ${actualChannelFolderName}/${currentPath}`);
                  if (i === pathParts.length - 1) {
                    successfulFolders++;
                  }
                } else {
                  console.error(`Failed to create folder ${actualChannelFolderName}/${currentPath}:`, error);
                  break; // Stop creating nested folders if parent creation fails
                }
              }
              
              // Small delay between folder creations
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error(`Failed to create folder path ${folderPath}:`, error);
          }
        }

        return {
          channelName: channel.displayName,
          foldersCreated: successfulFolders,
          totalFolders: folderStructure.length,
        };
      } catch (error) {
        console.error(`Failed to process channel ${channel.displayName}:`, error);
        return {
          channelName: channel.displayName,
          error: error instanceof Error ? error.message : 'Unknown error',
          foldersCreated: 0,
          totalFolders: channelFolderStructures[channel.displayName as keyof typeof channelFolderStructures]?.length || 0,
        };
      }
    });

    const results = await Promise.all(folderPromises);

    const totalFoldersCreated = results.reduce((sum, result) => sum + result.foldersCreated, 0);
    const totalFoldersExpected = results.reduce((sum, result) => sum + result.totalFolders, 0);

    // Create detailed message with breakdown by channel
    const successChannels = results.filter(r => !r.error);
    const failedChannels = results.filter(r => r.error);
    
    let detailMessage = `Structure de dossiers créée avec succès !\n\n`;
    
    successChannels.forEach(result => {
      detailMessage += `✅ ${result.channelName}: ${result.foldersCreated}/${result.totalFolders} dossiers créés\n`;
    });
    
    if (failedChannels.length > 0) {
      detailMessage += `\n⚠️ Erreurs:\n`;
      failedChannels.forEach(result => {
        detailMessage += `❌ ${result.channelName}: ${result.error}\n`;
      });
    }

    return NextResponse.json({
      success: true,
      teamId,
      channelsProcessed: results.length,
      channelsSuccess: successChannels.length,
      channelsFailed: failedChannels.length,
      totalFoldersCreated,
      totalFoldersExpected,
      details: results,
      message: detailMessage.trim(),
    });

  } catch (error: any) {
    console.error('Error creating folder structure:', error);
    
    let errorMessage = 'Failed to create folder structure';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        errorMessage = 'Network error occurred while creating folders. This is usually temporary - please try again in a moment.';
        statusCode = 503; // Service Temporarily Unavailable
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out while creating folders. Microsoft services may be experiencing delays. Please try again.';
        statusCode = 504; // Gateway Timeout
      } else if (error.message.includes('license information')) {
        errorMessage = 'License access error. Please ensure all users have proper Office 365 licenses and try again.';
        statusCode = 403; // Forbidden
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        retryRecommended: statusCode >= 500 || errorMessage.includes('Network error'),
        technical: error instanceof Error ? error.message : String(error)
      },
      { status: statusCode }
    );
  }
}