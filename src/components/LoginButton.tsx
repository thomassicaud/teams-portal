'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getMsalInstance, loginRequest } from '@/lib/auth-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, RefreshCw } from 'lucide-react';

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
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm py-1.5 px-3">
          {account.name}
        </Badge>
        <Button
          onClick={forceReauth}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Renouveler permissions
        </Button>
        <Button
          onClick={logout}
          variant="destructive"
          size="default"
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={login}
      size="lg"
      className="gap-2"
    >
      <LogIn className="h-5 w-5" />
      Se connecter avec Microsoft 365
    </Button>
  );
}