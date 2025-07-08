# Portail Teams

> Application web pour la création automatisée d'équipes Microsoft Teams avec structure de dossiers SharePoint personnalisée.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Microsoft Graph](https://img.shields.io/badge/Microsoft%20Graph-API-orange?logo=microsoft)](https://docs.microsoft.com/en-us/graph/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure des dossiers](#-structure-des-dossiers)
- [API Endpoints](#-api-endpoints)
- [Dépannage](#-dépannage)
- [Contribution](#-contribution)
- [Licence](#-licence)

## 🎯 Vue d'ensemble

Portail Teams est une application Next.js qui automatise la création d'équipes Microsoft Teams avec une structure de dossiers SharePoint prédéfinie. L'application intègre l'authentification Microsoft 365 et utilise Microsoft Graph API pour :

- Créer des équipes Teams avec propriétaires et membres
- Générer automatiquement des canaux personnalisés
- Créer une structure de dossiers hiérarchique dans SharePoint
- Gérer les permissions et l'accès aux ressources

## ✨ Fonctionnalités

### 🔐 Authentification
- **OAuth2 Microsoft 365** avec MSAL.js
- **Permissions déléguées** pour l'accès aux ressources utilisateur
- **Gestion des tokens** automatique avec renouvellement

### 👥 Gestion des équipes
- **Création d'équipes** avec nom personnalisé
- **Ajout de propriétaires** et membres via recherche email
- **Canaux automatiques** : Général, 1-ADMINISTRATIF, 2-OPÉRATIONNEL, 3-INFORMATIQUE, 4-DOSSIERS_DE_SUBVENTIONS
- **Validation en temps réel** des utilisateurs Office 365

### 📁 Structure SharePoint
- **Dossiers hiérarchiques** automatiques par canal
- **Gestion des conflits** et détection des doublons
- **Retry logic** pour la robustesse réseau
- **Messages d'erreur** contextuels et solutions

### 🔄 Workflow utilisateur
- **Interface guidée** en 3 étapes
- **Initialisation des onglets Fichiers** requis
- **Feedback temps réel** sur la progression
- **Boutons d'action** contextuels

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── teams/
│   │   │   ├── create/route.ts      # Création initiale d'équipe
│   │   │   ├── finalize/route.ts    # Finalisation (canaux + membres)
│   │   │   └── validate/route.ts    # Création structure SharePoint
│   │   └── test-graph/route.ts      # Test connectivité Graph API
│   ├── layout.tsx                   # Layout racine avec AuthProvider
│   └── page.tsx                     # Page principale
├── components/
│   ├── TeamCreationForm.tsx         # Formulaire de création
│   ├── ValidationSection.tsx        # Section validation et dossiers
│   └── LoginButton.tsx             # Bouton de connexion
├── contexts/
│   └── AuthContext.tsx             # Contexte d'authentification
└── lib/
    ├── auth-config.ts              # Configuration MSAL
    └── graph-client.ts             # Client Microsoft Graph
```

## 🔧 Prérequis

### Technologies
- **Node.js** 18+ 
- **npm** ou **yarn**
- **Git**

### Services Microsoft
- **Tenant Azure AD** avec droits administrateur
- **Licences Office 365** avec SharePoint
- **Application Azure AD** enregistrée

## 🚀 Installation

### 1. Cloner le repository
```bash
git clone https://github.com/thomassicaud/teamas-portal/
cd teams-portal
```

### 2. Installer les dépendances
```bash
npm install
# ou
yarn install
```

### 3. Configuration environnement
```bash
cp .env.example .env.local
```

### 4. Lancer en développement
```bash
npm run dev
# ou
yarn dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env.local` avec :

```env
# Azure AD Configuration
NEXT_PUBLIC_AZURE_CLIENT_ID=votre-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=votre-tenant-id

# Application Settings
NEXT_PUBLIC_APP_NAME="Portail Teams"
```

### Azure AD App Registration

1. **Aller dans Azure Portal** → Azure Active Directory → App registrations
2. **Créer une nouvelle application** :
   - Name: `Portail Teams`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `Single-page application (SPA)` → `http://localhost:3000`

3. **Configurer les permissions API** :
   ```
   Microsoft Graph (Delegated):
   - User.Read
   - User.ReadBasic.All
   - Group.ReadWrite.All
   - Group.Read.All
   - Team.Create
   - Team.ReadBasic.All
   - Channel.Create
   - TeamMember.ReadWrite.All
   - Files.ReadWrite.All
   - Sites.ReadWrite.All
   ```

4. **Consentement administrateur** requis pour les permissions d'équipe

### Permissions minimales de test
Pour les tests sans consentement admin :
```typescript
scopes: ['User.Read', 'Files.ReadWrite.All']
```

## 📖 Utilisation

### Workflow complet

1. **Authentification**
   - Cliquer sur "Se connecter"
   - Accepter les permissions Microsoft 365

2. **Création d'équipe**
   - Saisir le nom de l'équipe
   - Rechercher et valider le propriétaire
   - Ajouter des membres (optionnel)
   - Cliquer sur "Créer l'équipe Teams"

3. **Attente du provisioning**
   - L'équipe est créée en mode "pending"
   - Attendre 2-3 minutes pour le provisioning Microsoft
   - Cliquer sur "Finaliser la configuration"

4. **Initialisation des fichiers**
   - Ouvrir Microsoft Teams
   - Aller dans chaque canal de l'équipe
   - Cliquer sur l'onglet "Fichiers" de chaque canal
   - Retourner dans l'application

5. **Création des dossiers**
   - Cliquer sur "J'ai initialisé tous les onglets Fichiers"
   - Cliquer sur "Créer la structure de dossiers SharePoint"

### Gestion d'erreurs

- **Erreurs réseau** : Retry automatique avec délais progressifs
- **Erreurs de licence** : Messages explicites avec solutions
- **Permissions manquantes** : Redirection vers l'administrateur
- **Timeouts** : Recommandations d'attente

## 📁 Structure des dossiers

### Administratif
```
Administratif/
├── Contrats/
│   ├── Lot 1/
│   ├── Lot 2/
│   └── Lot 3/
├── Accord de prise en charge/
└── Facturation/
```

### Opérationnel
```
Opérationnel/
├── Lot 1/
│   ├── Cadrage Lancement/
│   ├── Analyse des besoins/
│   └── Solutions/
├── Lot 2/
└── Lot 3/
```

### Informatique
```
Informatique/
└── Lot 1/
    ├── Audit/
    └── Restitutions/
```

### Personnalisation

Modifier la structure dans `/src/app/api/teams/validate/route.ts` :

```typescript
const channelFolderStructures = {
  'NomCanal': [
    'Dossier1/Sous-dossier1',
    'Dossier1/Sous-dossier2',
    'Dossier2',
  ],
};
```

## 🔌 API Endpoints

### `POST /api/teams/create`
Création initiale d'une équipe avec le propriétaire uniquement.

**Body:**
```json
{
  "teamName": "string",
  "ownerId": "string", 
  "ownerEmail": "string",
  "members": "TeamMember[]",
  "accessToken": "string"
}
```

**Response:**
```json
{
  "pending": true,
  "teamName": "string",
  "message": "string"
}
```

### `POST /api/teams/finalize`
Finalisation avec ajout de canaux et membres.

**Body:**
```json
{
  "teamName": "string",
  "members": "TeamMember[]",
  "accessToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "teamId": "string",
  "channelsCreated": "number",
  "membersAdded": "number",
  "message": "string"
}
```

### `POST /api/teams/validate`
Création de la structure de dossiers SharePoint.

**Body:**
```json
{
  "teamId": "string",
  "accessToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "channelsProcessed": "number",
  "totalFoldersCreated": "number",
  "details": "ChannelResult[]",
  "message": "string"
}
```

### `POST /api/test-graph`
Test de connectivité Microsoft Graph (debug).

## 🐛 Dépannage

### Erreurs courantes

#### "Approbation administrateur requise"
**Cause:** Permissions nécessitant un consentement admin
**Solution:** 
1. Utiliser un compte administrateur
2. Ou demander à l'admin d'approuver l'application
3. Ou réduire les permissions en mode test

#### "Team not found"
**Cause:** Équipe encore en provisioning ou recherche échouée
**Solutions:**
1. Attendre 2-3 minutes supplémentaires
2. Vérifier que l'équipe apparaît dans Microsoft Teams
3. Réessayer la finalisation

#### "Failed to get license information"
**Cause:** Licences Office 365 insuffisantes
**Solutions:**
1. Vérifier les licences SharePoint des utilisateurs
2. Contacter l'administrateur IT
3. Créer les dossiers manuellement si nécessaire

#### "Invalid hostname for this tenancy"
**Cause:** Configuration Azure AD incorrecte
**Solutions:**
1. Vérifier le TENANT_ID dans la configuration
2. Contrôler les URLs de redirection
3. Vérifier l'enregistrement d'application

### Logs et debug

#### Activer les logs détaillés
```typescript
// Dans auth-config.ts
export const msalConfig = {
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => console.log(message),
      logLevel: LogLevel.Verbose
    }
  }
};
```

#### Test de connectivité
Utiliser le bouton "🔍 Test connectivité" pour diagnostiquer les problèmes réseau.

#### Vérification des permissions
```bash
# Vérifier les permissions accordées
curl -H "Authorization: Bearer {token}" \
  "https://graph.microsoft.com/v1.0/me/oauth2PermissionGrants"
```

## 📚 Ressources utiles

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-overview)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Teams API Reference](https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview)
- [SharePoint API Reference](https://docs.microsoft.com/en-us/graph/api/resources/sharepoint)

## 🤝 Contribution

### Développement

1. **Fork** le projet
2. **Créer une branche** : `git checkout -b feature/nouvelle-fonctionnalite`
3. **Commit** : `git commit -m 'feat: ajouter nouvelle fonctionnalité'`
4. **Push** : `git push origin feature/nouvelle-fonctionnalite`
5. **Pull Request**

### Standards de code

- **TypeScript** strict mode
- **ESLint** + **Prettier** 
- **Conventional Commits**
- **Tests unitaires** pour les nouvelles fonctionnalités

### Commit convention
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: formatage
refactor: refactoring
test: tests
chore: maintenance
```

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).

## 👥 Auteurs

- **Développement initial** - [thomassicaud](https://github.com/thomassicaud)

## 🙏 Remerciements

- Équipe Microsoft Graph pour l'excellente API
- Communauté Next.js pour les bonnes pratiques
- Contributeurs et testeurs du projet

---

Pour toute question ou support, contacter : [support@agencesi.tech](mailto:support@agencesi.tech)
