import { PublicClientApplication, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { getMsalConfig, loginRequest } from '~/utils/msalConfig';

export const useMsal = () => {
  const config = useRuntimeConfig();
  const msalInstance = useState<PublicClientApplication | null>('msalInstance', () => null);
  const account = useState<AccountInfo | null>('msalAccount', () => null);
  const isAuthenticated = computed(() => account.value !== null);

  // Initialiser MSAL (côté client uniquement)
  const initMsal = async () => {
    if (process.server || msalInstance.value) return;

    const clientId = config.public.azureClientId as string;
    const tenantId = config.public.azureTenantId as string;

    if (!clientId || !tenantId) {
      console.error('Azure Client ID ou Tenant ID manquant');
      return;
    }

    const msalConfig = getMsalConfig(clientId, tenantId);
    const instance = new PublicClientApplication(msalConfig);

    await instance.initialize();

    // Vérifier si un compte est déjà connecté
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      account.value = accounts[0];
      instance.setActiveAccount(accounts[0]);
    }

    msalInstance.value = instance;
  };

  // Login
  const login = async () => {
    if (!msalInstance.value) {
      console.error('MSAL non initialisé');
      return;
    }

    try {
      const response: AuthenticationResult = await msalInstance.value.loginPopup(loginRequest);
      account.value = response.account;
      msalInstance.value.setActiveAccount(response.account);
      return response;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    if (!msalInstance.value) return;

    try {
      await msalInstance.value.logoutPopup();
      account.value = null;
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  };

  // Obtenir un token d'accès
  const getAccessToken = async (): Promise<string | null> => {
    if (!msalInstance.value || !account.value) {
      console.error('MSAL non initialisé ou utilisateur non connecté');
      return null;
    }

    try {
      const response = await msalInstance.value.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: account.value,
      });
      return response.accessToken;
    } catch (error) {
      console.error('Erreur acquireTokenSilent, tentative avec popup:', error);

      try {
        const response = await msalInstance.value.acquireTokenPopup({
          scopes: loginRequest.scopes,
          account: account.value,
        });
        return response.accessToken;
      } catch (popupError) {
        console.error('Erreur acquireTokenPopup:', popupError);
        return null;
      }
    }
  };

  return {
    msalInstance,
    account,
    isAuthenticated,
    initMsal,
    login,
    logout,
    getAccessToken,
  };
};
