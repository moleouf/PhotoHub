require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURATION — Mettez vos identifiants Google Cloud ici
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Noms personnalisés pour chaque compte (optionnel)
const ACCOUNT_LABELS = [
  'Compte 1', 'Compte 2', 'Compte 3', 'Compte 4', 'Compte 5',
  'Compte 6', 'Compte 7', 'Compte 8', 'Compte 9', 'Compte 10',
  'Compte 11', 'Compte 12', 'Compte 13', 'Compte 14', 'Compte 15', 'Compte 16', 'Compte 17'
];

const TOKENS_FILE = path.join(__dirname, 'tokens', 'accounts.json');

// ============================================================

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Charger les tokens sauvegardés
function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

// Sauvegarder les tokens
function saveTokens(tokens) {
  fs.mkdirSync(path.dirname(TOKENS_FILE), { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// Créer un client OAuth2
function createOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

// Générer l'URL d'autorisation Google
app.get('/auth/login', (req, res) => {
  const accountIndex = parseInt(req.query.account) || 0;
  req.session.pendingAccount = accountIndex;

  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/photoslibrary.readonly',
	  'https://www.googleapis.com/auth/photoslibrary',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'select_account consent',
    include_granted_scopes: true
  });

  res.redirect(url);
});

// Callback OAuth
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const accountIndex = req.session.pendingAccount || 0;

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Récupérer les infos du compte
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const allTokens = loadTokens();
    allTokens[accountIndex] = {
      tokens,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
      label: ACCOUNT_LABELS[accountIndex] || `Compte ${accountIndex + 1}`
    };
    saveTokens(allTokens);

    res.redirect('/?connected=' + accountIndex);
  } catch (err) {
    console.error('Erreur OAuth:', err);
    res.redirect('/?error=auth_failed');
  }
});

// API — Liste des comptes connectés
app.get('/api/accounts', (req, res) => {
  const allTokens = loadTokens();
  const accounts = [];

  for (let i = 0; i < 17; i++) {
    if (allTokens[i]) {
      accounts.push({
        index: i,
        email: allTokens[i].email,
        name: allTokens[i].name,
        picture: allTokens[i].picture,
        label: allTokens[i].label || ACCOUNT_LABELS[i] || `Compte ${i + 1}`,
        connected: true
      });
    } else {
      accounts.push({
        index: i,
        label: ACCOUNT_LABELS[i] || `Compte ${i + 1}`,
        connected: false
      });
    }
  }

  res.json(accounts);
});

// API — Photos d'un compte ou de tous les comptes
app.get('/api/photos', async (req, res) => {
  const accountParam = req.query.account;
  const pageToken = req.query.pageToken || null;
  const allTokens = loadTokens();

  let accountIndices = [];
  if (accountParam === 'all') {
    accountIndices = Object.keys(allTokens).map(Number);
  } else {
    accountIndices = [parseInt(accountParam)];
  }

  const allPhotos = [];
  const errors = [];

  for (const idx of accountIndices) {
    const accountData = allTokens[idx];
    if (!accountData) continue;

    try {
      const oauth2Client = createOAuthClient();
      oauth2Client.setCredentials(accountData.tokens);

      // Rafraîchir le token si nécessaire
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Mettre à jour les tokens sauvegardés
      allTokens[idx].tokens = credentials;
      saveTokens(allTokens);

      const params = { pageSize: 50 };
      if (pageToken && accountParam !== 'all') params.pageToken = pageToken;

      const response = await axios.get('https://photoslibrary.googleapis.com/v1/mediaItems', {
        headers: { Authorization: `Bearer ${credentials.access_token}` },
        params
      });

      const photos = (response.data.mediaItems || []).map(item => ({
        ...item,
        accountIndex: idx,
        accountEmail: accountData.email,
        accountLabel: accountData.label || ACCOUNT_LABELS[idx] || `Compte ${idx + 1}`,
        accountPicture: accountData.picture
      }));

      allPhotos.push(...photos);
    } catch (err) {
      console.error(`Erreur compte ${idx}:`, JSON.stringify(err.response?.data));
      errors.push({ index: idx, error: err.message });
    }
  }

  // Trier par date décroissante
  allPhotos.sort((a, b) => {
    const dateA = new Date(a.mediaMetadata?.creationTime || 0);
    const dateB = new Date(b.mediaMetadata?.creationTime || 0);
    return dateB - dateA;
  });

  res.json({ photos: allPhotos, errors });
});

// API — Déconnecter un compte
app.delete('/api/accounts/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  const allTokens = loadTokens();
  delete allTokens[idx];
  saveTokens(allTokens);
  res.json({ success: true });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`\n✅ PhotoHub démarré !`);
  console.log(`👉 Ouvrez votre navigateur sur : http://localhost:${PORT}\n`);
});
