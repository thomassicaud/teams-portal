import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { Team, Group, ProfilePhoto } from '@microsoft/microsoft-graph-types';

interface GroupWithTeamInfo extends Group {
  resourceProvisioningOptions?: string[];
}

class DelegatedAuthenticationProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

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

    console.log(`Testing icon access for team: ${teamId}`);

    try {
      // 1. Vérifier l'équipe/groupe
      let teamInfo: Team | Group;
      try {
        teamInfo = await graphClient.api(`/teams/${teamId}`).get();
        console.log(`✅ Team found via /teams: ${teamInfo.displayName}`);
      } catch {
        teamInfo = await graphClient.api(`/groups/${teamId}`).get();
        console.log(`✅ Group found via /groups: ${teamInfo.displayName}`);
      }

      // 2. Vérifier les permissions photo
      let photoInfo: ProfilePhoto | undefined;
      try {
        photoInfo = await graphClient.api(`/groups/${teamId}/photo`).get();
        console.log(`✅ Photo metadata accessible:`, photoInfo);
      } catch (photoError: unknown) {
        const errorMessage = photoError instanceof Error ? photoError.message : 'Unknown error';
        console.log(`❌ Photo metadata error:`, errorMessage);
      }

      // 3. Essayer de récupérer la photo actuelle
      let currentPhoto: ArrayBuffer | undefined;
      try {
        currentPhoto = await graphClient.api(`/groups/${teamId}/photo/$value`).get();
        console.log(`✅ Current photo accessible, size: ${currentPhoto?.byteLength || 'unknown'}`);
      } catch (currentPhotoError: unknown) {
        const errorMessage = currentPhotoError instanceof Error ? currentPhotoError.message : 'Unknown error';
        console.log(`ℹ️ No current photo or access error:`, errorMessage);
      }

      // 4. Tester les permissions d'écriture (sans uploader)
      try {
        // Juste tester l'accès à l'endpoint sans body
        await graphClient.api(`/groups/${teamId}/photo/$value`).get();
        console.log(`✅ Write endpoint accessible`);
      } catch (writeError: unknown) {
        const errorMessage = writeError instanceof Error ? writeError.message : 'Unknown error';
        console.log(`❌ Write endpoint error:`, errorMessage);
      }

      return NextResponse.json({
        success: true,
        teamInfo: {
          id: teamInfo.id,
          displayName: teamInfo.displayName,
          resourceProvisioningOptions: (teamInfo as GroupWithTeamInfo).resourceProvisioningOptions
        },
        photoInfo,
        hasCurrentPhoto: !!currentPhoto,
        message: 'Test completed - check server logs for details'
      });

    } catch (error: unknown) {
      console.error('❌ Team access error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = (error as { statusCode?: number }).statusCode || 500;
      return NextResponse.json(
        { 
          error: 'Failed to access team',
          details: errorMessage,
          statusCode
        },
        { status: statusCode }
      );
    }

  } catch (error: unknown) {
    console.error('❌ Test icon route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}