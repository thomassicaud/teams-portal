import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { AccountInfo } from '@azure/msal-browser';
import { getMsalInstance } from './auth-config';

class CustomAuthenticationProvider implements AuthenticationProvider {
  constructor(private account: AccountInfo) {}

  async getAccessToken(): Promise<string> {
    const msalInstance = getMsalInstance();
    const request = {
      scopes: [
        'User.Read',
        'Group.ReadWrite.All',
        'Team.Create',
        'Channel.Create',
        'Files.ReadWrite.All',
      ],
      account: this.account,
    };

    try {
      const response = await msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      const response = await msalInstance.acquireTokenPopup(request);
      return response.accessToken;
    }
  }
}

export function createGraphClient(account: AccountInfo): Client {
  const authProvider = new CustomAuthenticationProvider(account);
  return Client.initWithMiddleware({ authProvider });
}