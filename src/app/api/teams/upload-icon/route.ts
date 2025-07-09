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
    const formData = await request.formData();
    const teamId = formData.get('teamId') as string;
    const accessToken = formData.get('accessToken') as string;
    const imageFile = formData.get('image') as File;

    if (!teamId || !accessToken || !imageFile) {
      return NextResponse.json(
        { error: 'Team ID, access token, and image file are required' },
        { status: 400 }
      );
    }

    // Validation du fichier
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 4MB' },
        { status: 400 }
      );
    }

    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!supportedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use JPG, PNG, or GIF' },
        { status: 400 }
      );
    }

    console.log(`Uploading team icon for team: ${teamId}`);

    const authProvider = new DelegatedAuthenticationProvider(accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    // Convertir le fichier en buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Vérifier d'abord que l'équipe existe
      console.log(`Checking if team ${teamId} exists...`);
      
      try {
        const team = await graphClient
          .api(`/teams/${teamId}`)
          .get();
        console.log(`Team found: ${team.displayName}`);
      } catch (teamError) {
        console.log(`Team not found via /teams endpoint, trying /groups...`);
        
        const group = await graphClient
          .api(`/groups/${teamId}`)
          .get();
        console.log(`Group found: ${group.displayName}`);
      }

      // Upload de l'icône via Microsoft Graph
      // Utiliser l'endpoint PUT avec Content-Type approprié
      console.log(`Uploading photo for team/group: ${teamId}, size: ${buffer.length} bytes`);
      
      const response = await graphClient
        .api(`/groups/${teamId}/photo/$value`)
        .header('Content-Type', imageFile.type)
        .put(buffer);

      console.log(`Team icon upload response:`, response);
      console.log(`Team icon uploaded successfully for team: ${teamId}`);

      return NextResponse.json({
        success: true,
        message: 'Icône de l\'équipe mise à jour avec succès',
        teamId,
        fileName: imageFile.name,
        fileSize: imageFile.size,
      });

    } catch (uploadError: any) {
      console.error('Error uploading team icon:', uploadError);
      
      // Gestion spécifique des erreurs Microsoft Graph
      if (uploadError.statusCode === 404) {
        return NextResponse.json(
          { 
            error: 'Équipe non trouvée. Assurez-vous que l\'équipe existe et est complètement provisionnée.',
            details: 'Attendez quelques minutes après la création de l\'équipe avant d\'ajouter une icône.'
          },
          { status: 404 }
        );
      }

      if (uploadError.statusCode === 403) {
        return NextResponse.json(
          { 
            error: 'Permissions insuffisantes pour modifier l\'icône de l\'équipe',
            details: 'Vous devez être propriétaire de l\'équipe pour modifier son icône.'
          },
          { status: 403 }
        );
      }

      if (uploadError.statusCode === 413) {
        return NextResponse.json(
          { 
            error: 'Fichier trop volumineux',
            details: 'La taille de l\'image dépasse la limite autorisée par Microsoft Teams.'
          },
          { status: 413 }
        );
      }

      // Erreur générique
      return NextResponse.json(
        { 
          error: 'Échec de l\'upload de l\'icône',
          details: uploadError.message || 'Erreur inconnue lors de l\'upload'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in upload-icon route:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur serveur lors de l\'upload de l\'icône',
        details: error.message || 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}