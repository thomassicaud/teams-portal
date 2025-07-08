# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality

### Development Server
The application runs on Next.js 15 with Turbopack enabled for fast development builds.

## Architecture Overview

### Core Technology Stack
- **Next.js 15** with App Router
- **TypeScript 5** for type safety
- **Tailwind CSS 4** for styling
- **Microsoft Graph API** for Teams/SharePoint integration
- **Azure MSAL** for authentication

### Application Structure

#### Authentication Flow
- Uses Azure MSAL with `@azure/msal-browser` and `@azure/msal-react`
- Supports both minimal permissions (`User.Read`, `Files.ReadWrite.All`) and full permissions
- Full permissions require admin consent for Teams operations
- Authentication context wraps the entire application

#### Key Components Architecture
- **AuthWrapper + AuthProvider**: Handles Microsoft 365 authentication state
- **TeamCreationForm**: Main form for team creation workflow
- **ValidationSection**: Manages SharePoint folder structure creation
- **LoginButton**: Handles authentication UI

#### API Endpoints Pattern
All API routes follow the pattern `/api/teams/{action}/route.ts`:
- `create/route.ts`: Initial team creation (owner only)
- `finalize/route.ts`: Add channels and members after provisioning
- `validate/route.ts`: Create SharePoint folder structure
- `test-graph/route.ts`: Test Microsoft Graph connectivity

### Team Creation Workflow

#### Three-Phase Process
1. **Initial Creation**: Create team with owner only (returns pending state)
2. **Finalization**: Add channels and members after 2-3 minute provisioning delay
3. **Validation**: Create SharePoint folder structure after users initialize Files tabs

#### Channel Structure
Default channels created automatically:
- Général (default Teams channel)
- 1-ADMINISTRATIF
- 2-OPÉRATIONNEL  
- 3-INFORMATIQUE
- 4-DOSSIERS_DE_SUBVENTIONS

#### SharePoint Folder Structure
Each channel gets a predefined folder hierarchy:
- **1-ADMINISTRATIF**: Contrats/(Lot 1-3), Accord de prise en charge, Facturation
- **2-OPÉRATIONNEL**: Lot 1-3 with Cadrage Lancement, Analyse des besoins, Solutions
- **3-INFORMATIQUE**: Lot 1 with Audit, Restitutions

### Microsoft Graph Integration

#### Authentication Provider Pattern
Uses custom `DelegatedAuthenticationProvider` class that wraps access tokens for server-side API calls.

#### Graph Client Usage
- Client-side: Uses `CustomAuthenticationProvider` with MSAL account
- Server-side: Uses `DelegatedAuthenticationProvider` with access tokens from requests

#### Required Microsoft Graph Permissions
**Minimal (no admin consent)**:
- `User.Read`
- `Files.ReadWrite.All`

**Full functionality (admin consent required)**:
- `User.ReadBasic.All`
- `Group.ReadWrite.All`
- `Team.Create`
- `Channel.Create`
- `TeamMember.ReadWrite.All`
- `Sites.ReadWrite.All`

### Error Handling Patterns

#### Common Error Scenarios
- **Team not found**: Team still provisioning, requires 2-3 minute wait
- **License issues**: Users missing SharePoint licenses
- **Permission errors**: Admin consent required for team operations
- **Provisioning delays**: Teams API returns 202 Accepted for async operations

#### Retry Logic
- SharePoint folder creation includes retry mechanisms
- Network timeouts handled with progressive delays
- User-friendly error messages with actionable solutions

### Environment Configuration

#### Required Environment Variables
- `NEXT_PUBLIC_AZURE_CLIENT_ID`: Azure AD app registration client ID
- `NEXT_PUBLIC_AZURE_TENANT_ID`: Azure AD tenant ID

#### Azure AD App Registration Requirements
- **Application Type**: Single-page application (SPA)
- **Redirect URIs**: `http://localhost:3000` (development)
- **Supported account types**: Single tenant
- **API permissions**: See Microsoft Graph permissions above

### Development Notes

#### Browser Environment Constraints
- MSAL requires browser crypto support
- Multiple checks for `window`, `document`, and `crypto` objects
- Server-side rendering compatibility with client-side auth

#### Styling Architecture
- Uses Tailwind CSS 4 with custom configuration
- Geist font family (sans and mono variants)
- Responsive design with mobile-first approach

#### TypeScript Configuration
- Strict mode enabled
- Microsoft Graph types from `@microsoft/microsoft-graph-types`
- Custom type definitions for team creation workflow

### Testing and Debugging

#### Built-in Debug Tools
- `POST /api/test-graph` endpoint for testing Graph API connectivity
- Console logging throughout the team creation process
- Detailed error responses with stack traces in development

#### Common Development Issues
- **Crypto not available**: Ensure running in proper browser environment
- **Permission errors**: Check Azure AD app registration and consent
- **Team creation timeout**: Allow 2-3 minutes for Microsoft provisioning
- **Files tab initialization**: Users must click Files tab in each channel before folder creation