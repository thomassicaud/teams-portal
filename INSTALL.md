# 🚀 Installation rapide - Teams Portal Nuxt

## Étapes à suivre :

### 1. Arrêtez le serveur en cours
```bash
# Appuyez sur Ctrl+C dans le terminal où npm run dev tourne
```

### 2. Pull les derniers changements
```bash
git pull
```

### 3. Nettoyez le cache Nuxt
```bash
rm -rf .nuxt .output node_modules/.cache
```

### 4. Réinstallez les dépendances (si nécessaire)
```bash
npm install
```

### 5. Relancez le serveur
```bash
npm run dev
```

### 6. Videz le cache du navigateur
- **Chrome/Edge** : Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
- **Firefox** : Ctrl+Shift+Del puis supprimez le cache

### 7. Allez sur http://localhost:3000

Vous devriez voir :
- 🚀 Titre bleu "Teams Portal - Nuxt.js"
- Un bouton bleu avec un compteur
- Fond gris avec carte blanche

## Si ça ne marche toujours pas :

1. Vérifiez que vous êtes sur la bonne branche :
```bash
git branch --show-current
# Doit afficher : claude/nuxt-011CUprFw5NFn6p4951EQeX7
```

2. Vérifiez que les fichiers existent :
```bash
ls -la pages/
# Doit afficher : index.vue, simple.vue, test.vue
```

3. Ouvrez la console du navigateur (F12) et envoyez-moi les erreurs
