var map = L.map('map').setView([47.200578, -1.760997], 19);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 13,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// LAT LNG on click
map.on('click', function(e){
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`Lat: ${lat}<br>Lng: ${lng}`).openPopup();

    navigator.clipboard.writeText(`{"adresse": "N° ? Route de la Vièvre, Le Pellerin", "lat": ${lat}, "lng": ${lng}, "etat": "non_visite"},`);
});

// Code Couleur
const couleurs = {
    "non_visite": "gray",
    "faite" : "green",
    "a_repasser" : "orange",
    "absent" : "blue",
    "refus" : "red"
};

let maisons = [];
let markers = [];

function chargerMaisons(){
    console.log("Chargement depuis le fichier JSON");
    fetch('/secteur2')
        .then(res => res.json())
        .then(data => {
            maisons = data;
            afficherMaisons()
        });
}

// Fonction qui affiche les maisons sur la carte
function afficherMaisons(){
    markers.forEach(m => map.removeLayer(m)); // on retire les anciens markers
    markers = []

    maisons.forEach(maison =>{
        const marker = L.circleMarker([maison.lat, maison.lng], {
            radius: 8,
            color: couleurs[maison.etat],
            fillColor: couleurs[maison.etat],
            fillOpacity: 0.8
        }).addTo(map);

        marker.maison = maison;

        marker.bindPopup(getPopupContent(maison, marker));
        markers.push(marker);
    });
}

// Contenu popup
function getPopupContent(maison, marker){
    return `
        <strong>${maison.adresse}</strong><br>
        Etat : <strong>${maison.etat}</strong><br>
        <select onchange="changerEtat(this.value, ${maison.lat}, ${maison.lng})">
            <option value= "">--</option>
            <option value= "faite">Faite</option>
            <option value= "absent">Absent</option>
            <option value= "a_repasser">A repasser</option>
            <option value= "refus">Refus</option>
            <option value= "non_visite">Non visitée</option>
        </select>
    `;
}

// Gestion du changement d'etat
function changerEtat(nouvelEtat, lat, lng){
    maisons.forEach(maison =>{
        if(maison.lat === lat && maison.lng === lng){
            maison.etat = nouvelEtat;
        }
    });

    // Sauvegarde
    fetch('/secteur2', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(maisons)
    })
    .then(res => res.json())
    .then(data => console.log("Sauvegarde OK :", data))
    .catch(err => console.error("Erreur de sauvegarde :", err));

    // Rechargement des markers
    afficherMaisons();
}

// Chargement des maisons
chargerMaisons()

// Rafraîchissement automatique toutes les 30s (comme le dashboard),
// utile car plusieurs vendeurs mettent à jour la carte en même temps
// depuis le terrain.
setInterval(chargerMaisons, 30000);
