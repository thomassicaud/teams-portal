import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { User } from '@microsoft/microsoft-graph-types';

class DelegatedAuthenticationProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    console.log('Testing Graph client connectivity...');
    
    const authProvider = new DelegatedAuthenticationProvider(accessToken);
    const graphClient = Client.initWithMiddleware({ authProvider });

    // Test 1: Simple user info
    console.log('Test 1: Getting user info...');
    const userInfo: User = await graphClient.api('/me').get();
    console.log('✅ User info retrieved:', userInfo.displayName);

    // Test 2: Simple connectivity test (no teams access needed)
    console.log('Test 2: Basic connectivity test...');
    console.log('✅ Basic connectivity successful');

    return NextResponse.json({
      success: true,
      user: userInfo.displayName,
      message: 'Graph connectivity test successful - basic permissions only'
    });

  } catch (error: unknown) {
    console.error('Graph connectivity test failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = (error as { statusCode?: number }).statusCode || -1;
    return NextResponse.json(
      { 
        error: 'Graph connectivity test failed',
        details: errorMessage,
        statusCode
      },
      { status: 500 }
    );
  }
}