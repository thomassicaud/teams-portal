import { Configuration, LogLevel, RedirectRequest } from '@azure/msal-browser';

export const getMsalConfig = (clientId: string, tenantId: string): Configuration => {
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
          if (containsPii) return;
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              break;
            case LogLevel.Warning:
              console.warn(message);
              break;
            default:
              break;
          }
        },
        logLevel: LogLevel.Warning,
      },
    },
  };
};

// Scopes minimaux (pas d'admin consent requis)
export const minimalScopes = ['User.Read', 'Files.ReadWrite.All'];

// Scopes complets (admin consent requis)
export const fullScopes = [
  'User.Read',
  'User.ReadBasic.All',
  'Group.ReadWrite.All',
  'Team.Create',
  'Channel.Create',
  'TeamMember.ReadWrite.All',
  'Sites.ReadWrite.All',
  'Files.ReadWrite.All',
];

export const loginRequest: RedirectRequest = {
  scopes: fullScopes,
  prompt: 'select_account',
};
