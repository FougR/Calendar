const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// DATA_DIR permet de pointer vers un dossier persistant (ex: un Volume
// Railway monté sur /data). En local, par défaut, on reste dans le dossier
// du projet pour ne pas casser l'existant.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_PATH = path.join(DATA_DIR, 'secteur2.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

app.set('trust proxy', 1); // nécessaire derrière le proxy HTTPS de Railway/Render

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'change-moi-en-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 jours
    }
}));

// --- Middleware d'authentification ---
// Protège les pages principales et l'API de données. Laisse passer
// librement les fichiers statiques (css/js) et la page de login.
app.use((req, res, next) => {
    const estConnecte = req.session && req.session.user;
    const pagesProtegees = ['/', '/index.html', '/progression', '/progression.html'];
    const estApiProtegee = req.path.startsWith('/secteur2') || req.path === '/me';

    if (estConnecte) return next();
    if (pagesProtegees.includes(req.path)) return res.redirect('/login.html');
    if (estApiProtegee) return res.status(401).json({ error: 'Non authentifié' });
    return next();
});

app.use(express.static('public'));

// --- Authentification ---
function chargerUsers() {
    if (!fs.existsSync(USERS_PATH)) return [];
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

app.post('/login', (req, res) => {
    const { nom, motDePasse } = req.body;
    const users = chargerUsers();
    const user = users.find(u => u.nom.toLowerCase() === (nom || '').trim().toLowerCase());

    if (!user || !bcrypt.compareSync(motDePasse || '', user.hash)) {
        return res.status(401).json({ error: 'Nom ou mot de passe incorrect' });
    }

    req.session.user = { nom: user.nom };
    res.json({ ok: true, nom: user.nom });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

app.get('/me', (req, res) => {
    res.json({ nom: req.session.user.nom });
});

// --- Données du secteur ---
app.get('/secteur2', (req, res) => {
    fs.readFile(DATA_PATH, 'utf-8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Impossible de lire les données' });
        res.json(JSON.parse(data));
    });
});

app.post('/secteur2', (req, res) => {
    fs.writeFile(DATA_PATH, JSON.stringify(req.body, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Echec de l\'enregistrement' });
        res.json({ message: 'Données enregistrées' });
    });
});

// --- Pages ---
app.get('/progression', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'progression.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Données lues depuis : ${DATA_DIR}`);
});
