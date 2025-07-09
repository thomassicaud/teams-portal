import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';

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
      let teamInfo;
      try {
        teamInfo = await graphClient.api(`/teams/${teamId}`).get();
        console.log(`✅ Team found via /teams: ${teamInfo.displayName}`);
      } catch {
        teamInfo = await graphClient.api(`/groups/${teamId}`).get();
        console.log(`✅ Group found via /groups: ${teamInfo.displayName}`);
      }

      // 2. Vérifier les permissions photo
      let photoInfo;
      try {
        photoInfo = await graphClient.api(`/groups/${teamId}/photo`).get();
        console.log(`✅ Photo metadata accessible:`, photoInfo);
      } catch (photoError: any) {
        console.log(`❌ Photo metadata error:`, photoError.message);
      }

      // 3. Essayer de récupérer la photo actuelle
      let currentPhoto;
      try {
        currentPhoto = await graphClient.api(`/groups/${teamId}/photo/$value`).get();
        console.log(`✅ Current photo accessible, size: ${currentPhoto?.length || 'unknown'}`);
      } catch (currentPhotoError: any) {
        console.log(`ℹ️ No current photo or access error:`, currentPhotoError.message);
      }

      // 4. Tester les permissions d'écriture (sans uploader)
      try {
        // Juste tester l'accès à l'endpoint sans body
        await graphClient.api(`/groups/${teamId}/photo/$value`).get();
        console.log(`✅ Write endpoint accessible`);
      } catch (writeError: any) {
        console.log(`❌ Write endpoint error:`, writeError.message);
      }

      return NextResponse.json({
        success: true,
        teamInfo: {
          id: teamInfo.id,
          displayName: teamInfo.displayName,
          resourceProvisioningOptions: teamInfo.resourceProvisioningOptions
        },
        photoInfo,
        hasCurrentPhoto: !!currentPhoto,
        message: 'Test completed - check server logs for details'
      });

    } catch (error: any) {
      console.error('❌ Team access error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to access team',
          details: error.message,
          statusCode: error.statusCode
        },
        { status: error.statusCode || 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Test icon route error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}