import fetch from 'node-fetch';
import fs from 'fs';

var adresses = [];
const numéro = ['2','2B', '3', '4', '5', '6', '6B', '7', '8', '8B', '10', '10B',
    '11', '12', '13', '14', '15', '16', '16B', '17', '18', '18A', '19',
    '21', '22', '22B', '23', '24', '24B', '25', '26', '26B', '27', '27B', '28', '28B', '29', '29B', '30', '30B',
    '31', '31B', '32', '33', '34', '35', '35B', '36', '37', '37B', '38', '39', '40', '40B',
    '41', '42', '42B', '43', '44', '44B', '45', '46', '47', '47B', '48', '49', '50', '50B',
    '51', '52', '53', '54', '55', '56', '57', '58', '58B', '59', '60',
    '61', '62', '63', '64', '65', '66', '67', '68', '69', '70',
    '71', '72', '73', '74', '76', '77', '78', '79', '79B', '80',
    '81', '82', '83A', '83B', '84', '85A', '85B', '86', '87', '88', '88B', '89', '90',
    '91', '92', '93', '94', '95', '97'
]

numéro.forEach(element => {
    adresses.push(`${element} rue de la Jaunaie, Le Pellerin`)
});

console.log(adresses)

const secteur = "rue_de_la_jaunaie";
const delay = 1000; // délai pour respecter les règles de Nominatim

const resultats = [];

async function geocoder(adresse) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adresse)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TestTournéeCalendrierPompiers/1.0 (fougr672@gmail.com)' }
  });
  const data = await res.json();
  if (data[0]) {
    return {
      adresse,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      etat: "non_visité"
    };
  } else {
    console.warn(`Pas trouvé : ${adresse}`);
    return null;
  }
}

(async () => {
  for (const adresse of adresses) {
    const maison = await geocoder(adresse);
    if (maison) resultats.push(maison);
    await new Promise(r => setTimeout(r, delay)); // pause 1s pour éviter le blocage
  }

  fs.writeFileSync(`${secteur}.json`, JSON.stringify(resultats, null, 2));
  console.log(`Fichier secteurs/${secteur}.json généré avec ${resultats.length} maisons`);
})();