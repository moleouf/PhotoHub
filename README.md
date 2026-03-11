# 📷 PhotoHub — Guide d'installation

Galerie unifiée pour accéder à vos 14 comptes Google Photos en un seul endroit.

---

## 🛠️ Prérequis

- **Node.js** installé sur votre ordinateur
  → Télécharger sur : https://nodejs.org (version LTS recommandée)

---

## ⚙️ Étape 1 — Configuration Google Cloud

1. Allez sur https://console.cloud.google.com
2. Ouvrez votre projet existant
3. Menu → **APIs & Services** → **Identifiants**
4. Cliquez sur votre **ID Client OAuth 2.0**
5. Dans "URI de redirection autorisés", ajoutez :
   ```
   http://localhost:3000/auth/callback
   ```
6. Sauvegardez et copiez votre **Client ID** et **Client Secret**

---

## ⚙️ Étape 2 — Configurer l'application

Ouvrez le fichier `server.js` et remplacez ces deux lignes :

```javascript
const GOOGLE_CLIENT_ID = 'VOTRE_CLIENT_ID_ICI';
const GOOGLE_CLIENT_SECRET = 'VOTRE_CLIENT_SECRET_ICI';
```

Par vos vraies valeurs, par exemple :

```javascript
const GOOGLE_CLIENT_ID = '123456789-abcdef.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'GOCSPX-xxxxxxxxxxxxxx';
```

> Vous pouvez aussi personnaliser les noms des comptes dans le tableau `ACCOUNT_LABELS` :
> ```javascript
> const ACCOUNT_LABELS = ['Perso', 'Travail', 'Famille', ...];
> ```

---

## ⚙️ Étape 3 — Installer et démarrer

Ouvrez un terminal dans le dossier `photohub` et exécutez :

```bash
# Installer les dépendances (une seule fois)
npm install

# Démarrer l'application
npm start
```

Puis ouvrez votre navigateur sur : **http://localhost:3000**

---

## 🔐 Étape 4 — Connecter vos 14 comptes

Dans l'interface :

1. Cliquez sur **"+ Compte X"** dans la barre de gauche
2. Google s'ouvre → choisissez le bon compte Gmail
3. Autorisez l'accès aux photos
4. Répétez pour chacun de vos 14 comptes

**Les tokens sont sauvegardés** dans le dossier `tokens/` — vous n'avez pas à vous reconnecter à chaque fois !

---

## ✅ C'est tout !

Une fois vos comptes connectés :
- **"Toutes les photos"** affiche toutes vos photos en même temps
- Cliquez sur un compte dans la barre pour filtrer
- Cliquez sur une photo pour l'agrandir

---

## ❓ Problèmes fréquents

**"Accès bloqué" par Google** → Dans Google Cloud Console, ajoutez vos 14 adresses email comme "Utilisateurs test" dans OAuth → Écran de consentement

**Les photos ne chargent pas** → Vérifiez que l'API "Google Photos Library API" est bien activée dans votre projet Cloud

**Le serveur ne démarre pas** → Vérifiez que Node.js est bien installé : `node --version`

---

## 🔒 Sécurité

- L'application tourne **uniquement en local** sur votre ordinateur
- Vos tokens sont stockés dans `tokens/accounts.json` — ne partagez jamais ce fichier
- Personne d'autre n'a accès à vos photos
