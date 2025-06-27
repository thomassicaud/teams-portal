import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Initialize MSAL instance only on client-side
let msalInstance: PublicClientApplication | null = null;

export const getMsalInstance = (): PublicClientApplication => {
  // Multiple checks to ensure we're really in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.crypto) {
    throw new Error('MSAL can only be used in browser environment with crypto support');
  }
  
  if (!msalInstance) {
    try {
      msalInstance = new PublicClientApplication(msalConfig);
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      throw new Error('MSAL initialization failed - crypto not available');
    }
  }
  
  return msalInstance;
};

// Configuration avec permissions minimales (pas de consentement admin requis)
export const loginRequestMinimal = {
  scopes: [
    'User.Read',
    'Files.ReadWrite.All',
  ],
};

// Configuration complète (consentement admin requis)
export const loginRequest = {
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
};