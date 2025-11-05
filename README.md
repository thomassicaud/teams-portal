# Teams Portal - Nuxt.js + Nuxt UI

Application de création et gestion d'équipes Microsoft Teams, construite avec **Nuxt 3** et **Nuxt UI**.

## 🎨 Stack Technologique

- **Nuxt 3** - Framework Vue.js full-stack
- **Nuxt UI** - Bibliothèque de composants UI moderne
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling utility-first
- **Microsoft Graph API** - Intégration Teams/SharePoint
- **Azure MSAL** - Authentification Microsoft 365

## 🚀 Fonctionnalités

- ✅ Authentification Microsoft 365 avec MSAL
- ✅ Création d'équipes Teams avec propriétaire et membres
- ✅ Création automatique de 5 canaux standards
- ✅ Ajout de membres avec photos utilisateur
- ✅ Notifications en temps réel avec streaming
- ✅ Upload d'image pour l'équipe
- ✅ Design moderne avec Nuxt UI
- ✅ Mode sombre/clair
- ✅ Responsive design

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Un compte Azure AD avec une application enregistrée

## 🔧 Installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configuration Azure AD**

Créez un fichier `.env` à la racine du projet :

```env
NUXT_PUBLIC_AZURE_CLIENT_ID=votre-client-id
NUXT_PUBLIC_AZURE_TENANT_ID=votre-tenant-id
```

3. **Configurer l'application Azure AD**

Dans le portail Azure :
- Type d'application : **Single-page application (SPA)**
- URI de redirection : `http://localhost:3000` (développement)
- Permissions API Microsoft Graph :
  - `User.Read`
  - `User.ReadBasic.All`
  - `Group.ReadWrite.All`
  - `Team.Create`
  - `Channel.Create`
  - `TeamMember.ReadWrite.All`
  - `Sites.ReadWrite.All`
  - `Files.ReadWrite.All`

⚠️ **Important** : Les permissions Teams nécessitent un consentement administrateur.

## 🏃 Développement

Démarrer le serveur de développement :

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 🏗️ Build

Build pour la production :

```bash
npm run build
```

Prévisualiser le build :

```bash
npm run preview
```

## 📁 Structure du Projet

```
teams-portal-nuxt/
├── app/
│   └── app.vue               # Point d'entrée de l'application
├── components/               # Composants Vue réutilisables
├── composables/
│   └── useMsal.ts           # Composable pour l'authentification MSAL
├── layouts/
│   └── default.vue          # Layout principal
├── pages/
│   └── index.vue            # Page d'accueil avec formulaire
├── plugins/
│   └── msal.client.ts       # Plugin d'initialisation MSAL
├── server/
│   └── api/
│       └── teams/
│           └── create-stream.post.ts  # API de streaming
├── utils/
│   └── msalConfig.ts        # Configuration MSAL
└── nuxt.config.ts           # Configuration Nuxt
```

## 🔄 Workflow de Création d'Équipe

1. **Authentification** : L'utilisateur se connecte avec Microsoft 365
2. **Formulaire** : Saisie du nom, propriétaire, membres (optionnel)
3. **Streaming en temps réel** :
   - Création de l'équipe avec le propriétaire
   - Attente du provisionnement Microsoft (2-3 min)
   - Création des 5 canaux standards
   - Ajout des membres
4. **Notifications** : Chaque étape affiche une notification en temps réel

## 🎨 Design avec Nuxt UI

Le projet utilise les composants Nuxt UI :

- **UCard** - Cartes avec header/footer
- **UButton** - Boutons avec icônes et loading states
- **UInput** - Champs de formulaire
- **UFormGroup** - Groupes de formulaire avec labels
- **UAlert** - Messages d'alerte colorés
- **UAvatar** - Avatars avec photos utilisateur
- **UNotifications** - Système de toast notifications
- **UDivider** - Séparateurs
- **UIcon** - Icônes (Heroicons)

## 🔐 Sécurité

- Les tokens d'accès ne sont jamais stockés côté client
- Les appels API Graph se font via le serveur Nuxt
- MSAL gère automatiquement le refresh des tokens
- Support HTTPS en production

## 🆚 Migration depuis Next.js

Ce projet remplace l'ancienne version Next.js + shadcn/ui. Principales différences :

| Next.js (ancien) | Nuxt.js (nouveau) |
|------------------|-------------------|
| React | Vue.js |
| shadcn/ui | Nuxt UI |
| App Router | Pages + Layouts |
| API Routes | Server Routes |
| useState | ref/reactive |
| useEffect | onMounted/watch |

## 📝 Scripts Disponibles

```bash
npm run dev      # Serveur de développement
npm run build    # Build production
npm run preview  # Prévisualiser le build
npm run generate # Générer site statique (SSG)
```

## 🐛 Dépannage

### Erreur "MSAL non initialisé"
- Vérifiez que les variables d'environnement sont correctement définies
- Assurez-vous d'être en mode client (pas SSR)

### Erreur "Permission denied"
- Vérifiez que le consentement administrateur a été accordé
- Vérifiez les permissions dans Azure AD

### Erreur "Team not found"
- L'équipe est en cours de provisionnement (2-3 minutes)
- Attendez quelques instants puis réessayez

## 📄 Licence

MIT

## 👨‍💻 Auteur

Teams Portal - 2025
