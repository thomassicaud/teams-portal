# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-27

### Added
- 🎉 Version initiale du Portail Teams
- ✨ Authentification Microsoft 365 avec MSAL.js
- ✨ Création automatique d'équipes Teams avec canaux personnalisés
- ✨ Structure de dossiers SharePoint hiérarchique automatique
- ✨ Gestion des propriétaires et membres d'équipe
- ✨ Interface utilisateur guidée en 3 étapes
- ✨ Retry logic pour la robustesse réseau
- ✨ Gestion d'erreurs contextuelles avec solutions
- ✨ Support des canaux : Général, 1-ADMINISTRATIF, 2-OPÉRATIONNEL, 3-INFORMATIQUE, 4-DOSSIERS_DE_SUBVENTIONS

### Technical
- 🏗️ Architecture Next.js 15 avec TypeScript
- 🏗️ Microsoft Graph API integration
- 🏗️ Tailwind CSS pour le styling
- 🏗️ API endpoints RESTful pour la création d'équipes
- 🏗️ Système de validation en temps réel
- 🏗️ Logs détaillés pour le debugging

### Folder Structures
- 📁 **Administratif**: Contrats/{Lot 1,2,3}, Accord de prise en charge, Facturation
- 📁 **Opérationnel**: Lot 1/{Cadrage Lancement, Analyse des besoins, Solutions}, Lot 2, Lot 3
- 📁 **Informatique**: Lot 1/{Audit, Restitutions}
- 📁 **Dossiers Subventions**: Structure vide

### Bug Fixes
- 🐛 Résolution des doublons de dossiers lors de la création
- 🐛 Gestion correcte des espaces dans les noms de dossiers SharePoint
- 🐛 Fix des erreurs "Invalid hostname for this tenancy"
- 🐛 Amélioration de la gestion des erreurs de licence Office 365
- 🐛 Correction des timeouts réseau avec retry automatique

### Documentation
- 📚 README.md complet avec guide d'installation
- 📚 Documentation des API endpoints
- 📚 Guide de dépannage détaillé
- 📚 Instructions de configuration Azure AD
- 📚 Guide de contribution avec standards de code

## [Unreleased]

### Planned
- 🔮 Interface d'administration pour modifier les structures de dossiers
- 🔮 Templates de structures personnalisables
- 🔮 Audit trail des créations d'équipes
- 🔮 Intégration avec Azure DevOps pour les projets
- 🔮 Notifications par email lors de la création
- 🔮 Dashboard de monitoring des équipes créées

---

## Types de changements
- `Added` pour les nouvelles fonctionnalités
- `Changed` pour les modifications de fonctionnalités existantes
- `Deprecated` pour les fonctionnalités qui seront supprimées
- `Removed` pour les fonctionnalités supprimées
- `Fixed` pour les corrections de bugs
- `Security` pour les corrections de sécurité