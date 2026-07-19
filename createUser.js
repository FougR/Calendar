// createUser.js
//
// Crée (ou met à jour) un compte vendeur avec mot de passe hashé.
//
// Usage :
//   node createUser.js "Nom Prénom" "motDePasse"
//
// En local, écrit dans ./users.json
// Sur Railway, écrit dans le dossier pointé par DATA_DIR (le Volume
// persistant) si la variable d'environnement est définie.

const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const USERS_PATH = path.join(DATA_DIR, 'users.json');

const [, , nom, motDePasse] = process.argv;

if (!nom || !motDePasse) {
    console.error('Usage : node createUser.js "Nom Prénom" "motDePasse"');
    process.exit(1);
}

let users = [];
if (fs.existsSync(USERS_PATH)) {
    users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

const hash = bcrypt.hashSync(motDePasse, 10);
const existant = users.find(u => u.nom.toLowerCase() === nom.toLowerCase());

if (existant) {
    existant.hash = hash;
    console.log(`🔄 Mot de passe mis à jour pour "${nom}".`);
} else {
    users.push({ nom, hash });
    console.log(`✅ Utilisateur "${nom}" créé.`);
}

fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
console.log(`Fichier : ${USERS_PATH}`);
