// generateSecteurs.js
//
// Génère les fichiers JSON des secteurs à partir d'un export CSV de la
// Base Adresse Nationale (BAN) d'une commune.
//
// Usage :
//   1) Lister les rues présentes dans le CSV (pour préparer la config) :
//        node generateSecteurs.js adresses.csv --liste
//
//   2) Générer les secteurs définis dans un fichier de config :
//        node generateSecteurCSV.js adresses.csv secteur_config.json
//        node generateSecteurCSV.js adresses.csv secteur_config.json --out mes_secteurs
//
// Format du fichier de config : { "nom_du_secteur": ["Rue A", "Rue B"], ... }
//
// Sortie : un fichier <dossier>/<nom_du_secteur>.json par secteur, au format
// attendu par l'appli : { adresse, lat, lng, etat }.
// Si le fichier existe déjà, les états déjà saisis (faite, absent...) sont
// conservés pour les adresses qui n'ont pas changé.

const fs = require('fs');
const path = require('path');

// ---------- Utilitaires ----------

// Les exports BAN ont parfois un encodage mixte (UTF-8 et Windows-1252 dans
// la même ligne). On décode donc champ par champ : UTF-8 d'abord, et
// Windows-1252 si le champ n'est pas de l'UTF-8 valide.
const utf8Strict = new TextDecoder('utf-8', { fatal: true });
const cp1252 = new TextDecoder('windows-1252');

function decoderChamp(buf) {
    try {
        return utf8Strict.decode(buf);
    } catch {
        return cp1252.decode(buf);
    }
}

// Découpe un Buffer sur un octet séparateur (sans le convertir en texte avant)
function decouper(buf, sep) {
    const parts = [];
    let debut = 0;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] === sep) {
            parts.push(buf.subarray(debut, i));
            debut = i + 1;
        }
    }
    parts.push(buf.subarray(debut));
    return parts;
}

// Minuscules, sans accents, espaces/apostrophes normalisés : sert à comparer
// les noms de rue sans se soucier de la casse ni des accents.
function normaliser(str) {
    return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[’']/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// ---------- Lecture du CSV ----------

function lireCsv(fichier) {
    const brut = fs.readFileSync(fichier);
    const lignes = decouper(brut, 0x0a)
        .map(l => (l.length && l[l.length - 1] === 0x0d ? l.subarray(0, l.length - 1) : l))
        .filter(l => l.length > 0);

    const entetes = decouper(lignes[0], 0x3b).map(decoderChamp);
    const col = nom => {
        const i = entetes.indexOf(nom);
        if (i === -1) throw new Error(`Colonne "${nom}" introuvable : ce fichier ressemble-t-il à un export BAN ?`);
        return i;
    };
    const iNumero = col('numero'), iRep = col('rep'), iVoie = col('nom_voie');
    const iCommune = col('nom_commune'), iLon = col('lon'), iLat = col('lat');

    const adresses = [];
    let ignorees = 0;
    for (const ligne of lignes.slice(1)) {
        const c = decouper(ligne, 0x3b).map(decoderChamp);
        const lat = parseFloat(c[iLat]);
        const lng = parseFloat(c[iLon]);
        if (!c[iVoie] || isNaN(lat) || isNaN(lng)) { ignorees++; continue; }
        adresses.push({
            numero: parseInt(c[iNumero], 10) || 0,
            rep: c[iRep] || '',
            voie: c[iVoie],
            commune: c[iCommune],
            lat, lng
        });
    }
    return { adresses, ignorees };
}

// "3" + "bis" -> "3 bis" ; "3" + "b" -> "3B"
function formaterAdresse(a) {
    let num = String(a.numero);
    if (a.rep) num += a.rep.length === 1 ? a.rep.toUpperCase() : ` ${a.rep.toLowerCase()}`;
    return `${num} ${a.voie}, ${a.commune}`;
}

function comparer(a, b) {
    return normaliser(a.voie).localeCompare(normaliser(b.voie), 'fr')
        || a.numero - b.numero
        || a.rep.localeCompare(b.rep);
}

// ---------- Commandes ----------

function commandeListe(adresses) {
    const parRue = new Map();
    for (const a of adresses) parRue.set(a.voie, (parRue.get(a.voie) || 0) + 1);
    const rues = [...parRue.entries()].sort((x, y) => normaliser(x[0]).localeCompare(normaliser(y[0]), 'fr'));
    console.log(`${rues.length} rues, ${adresses.length} adresses (${adresses[0].commune}) :\n`);
    rues.forEach(([rue, n]) => console.log(`  ${String(n).padStart(3)}  ${rue}`));
}

function commandeGenerer(adresses, fichierConfig, dossierSortie) {
    const config = JSON.parse(fs.readFileSync(fichierConfig, 'utf-8'));

    const parRue = new Map(); // nom normalisé -> adresses
    for (const a of adresses) {
        const k = normaliser(a.voie);
        if (!parRue.has(k)) parRue.set(k, []);
        parRue.get(k).push(a);
    }

    fs.mkdirSync(dossierSortie, { recursive: true });
    const ruesUtilisees = new Set();
    const ruesInconnues = [];
    const ruesEnDouble = [];

    for (const [nomSecteur, rues] of Object.entries(config)) {
        let selection = [];
        for (const rue of rues) {
            const k = normaliser(rue);
            if (!parRue.has(k)) { ruesInconnues.push(`${rue}  (secteur "${nomSecteur}")`); continue; }
            if (ruesUtilisees.has(k)) ruesEnDouble.push(`${rue}  (secteur "${nomSecteur}")`);
            ruesUtilisees.add(k);
            selection = selection.concat(parRue.get(k));
        }
        selection.sort(comparer);

        const sortie = path.join(dossierSortie, `${nomSecteur}.json`);
        const anciens = new Map();
        if (fs.existsSync(sortie)) {
            for (const m of JSON.parse(fs.readFileSync(sortie, 'utf-8'))) anciens.set(m.adresse, m.etat);
        }

        const maisons = selection.map(a => {
            const adresse = formaterAdresse(a);
            return { adresse, lat: a.lat, lng: a.lng, etat: anciens.get(adresse) || 'non_visite' };
        });

        fs.writeFileSync(sortie, JSON.stringify(maisons, null, 2));
        console.log(`✅ ${sortie} : ${maisons.length} maisons (${rues.length} rue(s))`);
    }

    if (ruesInconnues.length) {
        console.log('\n⚠️  Rues de la config introuvables dans le CSV (vérifie l\'orthographe avec --liste) :');
        ruesInconnues.forEach(r => console.log(`   - ${r}`));
    }
    if (ruesEnDouble.length) {
        console.log('\n⚠️  Rues présentes dans plusieurs secteurs :');
        ruesEnDouble.forEach(r => console.log(`   - ${r}`));
    }

    const nonAffectees = [...parRue.entries()].filter(([k]) => !ruesUtilisees.has(k));
    if (nonAffectees.length) {
        const nb = nonAffectees.reduce((s, [, v]) => s + v.length, 0);
        console.log(`\n⚠️  ${nonAffectees.length} rue(s) (${nb} adresses) ne sont dans aucun secteur :`);
        nonAffectees.forEach(([, v]) => console.log(`   - ${v[0].voie} (${v.length})`));
    } else {
        console.log('\n👍 Toutes les rues du CSV sont affectées à un secteur.');
    }
}

// ---------- Point d'entrée ----------

function main() {
    const args = process.argv.slice(2);
    const iOut = args.indexOf('--out');
    let dossierSortie = 'secteurs';
    if (iOut !== -1) {
        dossierSortie = args[iOut + 1];
        args.splice(iOut, 2);
    }
    const liste = args.includes('--liste');
    const [fichierCsv, fichierConfig] = args.filter(a => a !== '--liste');

    if (!fichierCsv || (!liste && !fichierConfig)) {
        console.error('Usage :');
        console.error('  node generateSecteurs.js <fichier.csv> --liste');
        console.error('  node generateSecteurs.js <fichier.csv> <config.json> [--out dossier]');
        process.exit(1);
    }

    const { adresses, ignorees } = lireCsv(fichierCsv);
    if (ignorees) console.log(`(${ignorees} ligne(s) ignorée(s) : rue ou coordonnées manquantes)\n`);

    if (liste) commandeListe(adresses);
    else commandeGenerer(adresses, fichierConfig, dossierSortie);
}

try {
    main();
} catch (err) {
    console.error('Erreur :', err.message);
    process.exit(1);
}