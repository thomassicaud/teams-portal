'use client';

import { useEffect, useState } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const [hasCrypto, setHasCrypto] = useState(false);

  useEffect(() => {
    // Vérifier qu'on est bien côté client
    setIsClient(true);
    
    // Vérifier que crypto est disponible
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      setHasCrypto(true);
    } else {
      console.warn('Crypto API not available. HTTPS connection required for external access.');
    }
  }, []);

  // Affichage pendant la vérification
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si crypto n'est pas disponible, afficher un mode dégradé avec instructions
  if (!hasCrypto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-2xl mx-auto text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-yellow-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès réseau externe détecté
          </h2>
          <p className="text-gray-600 mb-4">
            L'authentification Microsoft 365 nécessite HTTPS pour l'accès externe. L'API Web Crypto n'est pas disponible via HTTP.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800 mb-4">
            <p className="font-semibold mb-2">🔧 Solutions rapides :</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <p className="font-medium">Option 1 - Accès local :</p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block mt-1">
                  http://localhost:3000
                </code>
              </div>
              <div>
                <p className="font-medium">Option 2 - Tunnel HTTPS :</p>
                <code className="bg-blue-100 px-2 py-1 rounded text-xs block mt-1">
                  npx ngrok http 3000
                </code>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-700">
            <p className="font-semibold mb-2">📋 Instructions pour tunnel HTTPS :</p>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Ouvrez un nouveau terminal</li>
              <li>Exécutez : <code className="bg-gray-200 px-1 rounded">npx ngrok http 3000</code></li>
              <li>Copiez l'URL HTTPS fournie (ex: https://abc123.ngrok.io)</li>
              <li>Accédez à cette URL depuis n'importe où</li>
            </ol>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Si tout est OK, afficher l'application normale
  return <>{children}</>;
}