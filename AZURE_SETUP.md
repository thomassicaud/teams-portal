# Configuration Azure AD pour Teams Portal

## Créer une App Registration dans Azure AD

### 1. Accéder au portail Azure
- Allez sur https://portal.azure.com
- Connectez-vous avec votre compte Microsoft 365

### 2. Créer l'App Registration
1. Recherchez **"Azure Active Directory"** ou **"Microsoft Entra ID"**
2. Dans le menu, cliquez sur **"App registrations"**
3. Cliquez sur **"+ New registration"**

### 3. Configurer l'application
```
Nom : Teams Portal Creator (ou votre choix)
Supported account types : Accounts in this organizational directory only (Single tenant)
Redirect URI :
  - Type: Single-page application (SPA)
  - URL: http://localhost:3000
```

4. Cliquez sur **"Register"**

### 4. Récupérer les IDs
Sur la page "Overview" de votre nouvelle app, notez :
- **Application (client) ID** : UUID format (ex: 12345678-1234-1234-1234-123456789abc)
- **Directory (tenant) ID** : UUID format (ex: 87654321-4321-4321-4321-cba987654321)

### 5. Configurer les permissions API
1. Dans le menu de gauche, cliquez sur **"API permissions"**
2. Cliquez sur **"+ Add a permission"**
3. Sélectionnez **"Microsoft Graph"**
4. Choisissez **"Delegated permissions"**
5. Ajoutez ces permissions :

**Permissions minimales (sans admin consent) :**
- User.Read
- Files.ReadWrite.All

**Permissions complètes (admin consent requis) :**
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

6. Cliquez sur **"Add permissions"**
7. Si vous avez les droits admin, cliquez sur **"Grant admin consent for [Your Organization]"**
   (Si non, demandez à votre admin IT de le faire)

### 6. Vérifier la configuration Redirect URI
1. Dans le menu, cliquez sur **"Authentication"**
2. Vérifiez que la Redirect URI est bien configurée :
   - Platform: Single-page application
   - Redirect URIs: http://localhost:3000
3. Pour la production, ajoutez votre URL de production (ex: https://yourdomain.com)

### 7. Configuration supplémentaire (optionnel)
Dans **"Authentication"**, activez :
- ✅ Access tokens (used for implicit flows)
- ✅ ID tokens (used for implicit and hybrid flows)

---

## Créer le fichier .env.local

Dans le dossier racine du projet, créez un fichier `.env.local` avec :

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=your-application-client-id-here
NEXT_PUBLIC_AZURE_TENANT_ID=your-directory-tenant-id-here
```

Remplacez les valeurs par celles récupérées à l'étape 4.

---

## Redémarrer le serveur de développement

Après avoir créé `.env.local` :

```bash
# Arrêtez le serveur actuel (Ctrl+C)
npm run dev
```

---

## Vérification

1. Ouvrez http://localhost:3000
2. Cliquez sur "Se connecter avec Microsoft 365"
3. Une popup devrait s'ouvrir pour vous authentifier
4. Acceptez les permissions demandées
5. Vous devriez être redirigé vers l'application

---

## Erreurs courantes

### "AADSTS900144: The request body must contain the following parameter: 'client_id'"
➜ Le fichier `.env.local` n'existe pas ou les variables sont vides

### "AADSTS700016: Application not found"
➜ Le Client ID est incorrect

### "AADSTS90002: Tenant not found"
➜ Le Tenant ID est incorrect

### "AADSTS65001: The user or administrator has not consented"
➜ Permissions pas encore accordées, cliquez "Accept" dans la popup

---

## Permissions expliquées

| Permission | Utilité | Admin requis ? |
|------------|---------|----------------|
| User.Read | Lire le profil utilisateur | ❌ Non |
| Files.ReadWrite.All | Accéder à SharePoint | ❌ Non |
| Group.ReadWrite.All | Créer et gérer les groupes Teams | ✅ Oui |
| Team.Create | Créer des équipes Teams | ✅ Oui |
| Channel.Create | Créer des canaux | ✅ Oui |
| TeamMember.ReadWrite.All | Ajouter/retirer des membres | ✅ Oui |
| Sites.ReadWrite.All | Créer des dossiers SharePoint | ✅ Oui |

---

## Support

Si vous avez des questions :
- Documentation Microsoft : https://learn.microsoft.com/en-us/azure/active-directory/develop/
- MSAL.js : https://github.com/AzureAD/microsoft-authentication-library-for-js
