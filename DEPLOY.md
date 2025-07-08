# 🚀 Guide de Déploiement Docker - Portail Teams

## 📋 Prérequis

### Logiciels requis
- **Docker** 20.10+ ([Installation](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ (inclus avec Docker Desktop)
- **Git** pour cloner le repository

### Configuration Azure AD
- Application Azure AD enregistrée
- Client ID et Tenant ID disponibles
- Permissions Microsoft Graph configurées

## 🔧 Configuration Rapide

### 1. Cloner le projet
```bash
git clone https://github.com/thomassicaud/teams-portal.git
cd teams-portal
```

### 2. Configuration des variables d'environnement

#### Pour la production :
```bash
# Copier le fichier exemple
cp .env.production.example .env.production

# Éditer avec vos valeurs
nano .env.production
```

**Contenu du .env.production :**
```env
NEXT_PUBLIC_AZURE_CLIENT_ID=votre-client-id-azure
NEXT_PUBLIC_AZURE_TENANT_ID=votre-tenant-id-azure
NEXT_PUBLIC_APP_NAME=Portail Teams
```

### 3. Déploiement avec Docker Compose

#### Option A : Déploiement simple
```bash
# Construire et lancer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

#### Option B : Reconstruction forcée
```bash
# Reconstruire l'image et relancer
docker-compose up --build -d
```

## 🐳 Commandes Docker Utiles

### Gestion des conteneurs
```bash
# Voir le statut
docker-compose ps

# Arrêter l'application
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Redémarrer
docker-compose restart
```

### Logs et debug
```bash
# Logs en temps réel
docker-compose logs -f portail-teams

# Accéder au conteneur
docker-compose exec portail-teams sh

# Voir les ressources utilisées
docker stats
```

### Gestion des images
```bash
# Lister les images
docker images

# Supprimer l'image locale
docker rmi portail-teams_portail-teams

# Nettoyer les images inutilisées
docker image prune
```

## 🌐 Déploiement sur un Serveur

### Configuration du reverse proxy (Nginx)

#### 1. Installer Nginx
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### 2. Configuration Nginx
```nginx
# /etc/nginx/sites-available/portail-teams
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Activer la configuration
```bash
sudo ln -s /etc/nginx/sites-available/portail-teams /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Configuration HTTPS avec Let's Encrypt
```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat SSL
sudo certbot --nginx -d votre-domaine.com

# Renouvellement automatique
sudo crontab -e
# Ajouter : 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Configuration Avancée

### Variables d'environnement complètes
```env
# .env.production
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id
NEXT_PUBLIC_APP_NAME=Portail Teams

# Configuration optionnelle
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0

# Pour HTTPS en production
NEXTAUTH_URL=https://votre-domaine.com
```

### Docker Compose pour production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  portail-teams:
    build: .
    container_name: portail-teams-prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Utilisation du fichier de production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Vérification du Déploiement

### 1. Santé de l'application
```bash
# Vérifier que l'app répond
curl http://localhost:3000

# Vérifier les logs
docker-compose logs portail-teams
```

### 2. Test de fonctionnalité
1. **Accéder à l'application** : http://votre-domaine.com
2. **Tester la connexion** Microsoft 365
3. **Vérifier la création d'équipe** (avec un compte de test)

### 3. Monitoring
```bash
# Ressources utilisées
docker stats portail-teams-app

# Espace disque
docker system df

# État des conteneurs
docker ps
```

## ⚠️ Résolution de Problèmes

### Problèmes courants

#### 1. Application ne démarre pas
```bash
# Vérifier les logs
docker-compose logs portail-teams

# Vérifier la configuration
docker-compose config
```

#### 2. Erreurs de permissions Azure
- Vérifier les variables d'environnement
- Contrôler les permissions dans Azure AD
- Vérifier l'URL de redirection

#### 3. Problèmes de réseau
```bash
# Vérifier les ports
netstat -tlnp | grep 3000

# Vérifier la connectivité
docker-compose exec portail-teams ping google.com
```

#### 4. Performance lente
```bash
# Allouer plus de mémoire
docker-compose up -d --scale portail-teams=1 -m 1g

# Optimiser l'image
docker-compose build --no-cache
```

## 🔒 Sécurité

### Bonnes pratiques
1. **Variables d'environnement** : Ne jamais commiter les fichiers .env
2. **HTTPS** : Toujours utiliser HTTPS en production
3. **Firewall** : Limiter l'accès aux ports nécessaires
4. **Mise à jour** : Maintenir Docker et l'application à jour

### Fichiers à protéger
```bash
# Permissions restrictives
chmod 600 .env.production
chmod 600 docker-compose.prod.yml
```

## 📊 Maintenance

### Mise à jour de l'application
```bash
# Récupérer les dernières modifications
git pull

# Reconstruire et redéployer
docker-compose up --build -d

# Nettoyer les anciens conteneurs
docker system prune
```

### Sauvegarde (si applicable)
```bash
# Sauvegarder la configuration
tar -czf portail-teams-backup-$(date +%Y%m%d).tar.gz .env.production docker-compose.yml

# Automatiser avec cron
0 2 * * 0 cd /path/to/portail-teams && tar -czf backup-$(date +\%Y\%m\%d).tar.gz .env.production
```

## 📞 Support

### En cas de problème
1. **Vérifier les logs** : `docker-compose logs -f`
2. **Consulter la documentation** : README.md
3. **Issues GitHub** : [Créer une issue](https://github.com/thomassicaud/teams-portal/issues)

### Informations utiles à fournir
- Version de Docker : `docker --version`
- Logs du conteneur : `docker-compose logs`
- Configuration (sans les secrets) : `docker-compose config`