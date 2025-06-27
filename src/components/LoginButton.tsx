'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getMsalInstance, loginRequest } from '@/lib/auth-config';

export function LoginButton() {
  const { login, logout, isAuthenticated, account } = useAuth();

  const forceReauth = async () => {
    try {
      const msalInstance = getMsalInstance();
      await msalInstance.loginPopup({
        ...loginRequest,
        prompt: 'consent',
        account: account || undefined,
      });
      // Reload page to refresh auth state
      window.location.reload();
    } catch (error) {
      console.error('Re-authentication failed:', error);
    }
  };

  if (isAuthenticated && account) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Connecté en tant que {account.name}
        </span>
        <button
          onClick={forceReauth}
          className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
        >
          Renouveler permissions
        </button>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
    >
      Se connecter avec Microsoft 365
    </button>
  );
}