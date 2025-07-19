'use client';

import { useAuth } from '@/contexts/AuthContext';
import { TeamCreationForm } from '@/components/TeamCreationForm';
import { LoginButton } from '@/components/LoginButton';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Portail Teams</h1>
          <p className="text-gray-600 mt-2">Créateur automatique d&apos;équipes Microsoft Teams</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {isAuthenticated ? (
          <TeamCreationForm />
        ) : (
          <div className="text-center">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Connexion requise
              </h2>
              <p className="text-gray-600 mb-6">
                Connectez-vous avec votre compte Microsoft 365 pour commencer à créer des équipes Teams.
              </p>
              <LoginButton />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}