import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthWrapper } from "@/components/AuthWrapper";

export const metadata: Metadata = {
  title: "Portail Teams",
  description: "Créateur automatique d'équipes Microsoft Teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <AuthWrapper>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
