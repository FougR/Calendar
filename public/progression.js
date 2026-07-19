// Config des états : couleur + libellé humain
const ETATS = {
    non_visite:  { label: "Non visitée", color: "#9e9e9e" },
    faite:       { label: "Faite",       color: "#2ecc71" },
    a_repasser:  { label: "À repasser",  color: "#f39c12" },
    absent:      { label: "Absent",      color: "#3498db" },
    refus:       { label: "Refus",       color: "#e74c3c" },
};

let chartInstance = null;

function chargerDonnees(){
    fetch('/secteur2')
        .then(res => res.json())
        .then(maisons => afficherStats(maisons))
        .catch(err => console.error("Erreur de chargement :", err));
}

function afficherStats(maisons){
    const total = maisons.length;

    // Comptage par état (avec fallback si un état inconnu apparaît)
    const counts = {};
    Object.keys(ETATS).forEach(e => counts[e] = 0);

    maisons.forEach(m => {
        const etat = ETATS[m.etat] ? m.etat : 'non_visite';
        counts[etat]++;
    });

    // --- Barre de progression globale ---
    // "Visitée" = tout ce qui n'est pas non_visite
    const visitees = total - counts.non_visite;
    const pctVisite = total ? Math.round((visitees / total) * 100) : 0;

    document.getElementById('pct-visite').textContent = `${pctVisite}%`;
    document.getElementById('progress-fill').style.width = `${pctVisite}%`;

    // Légende de la barre = répartition détaillée en %
    const legendEl = document.getElementById('progress-legend');
    legendEl.innerHTML = Object.entries(ETATS).map(([key, cfg]) => {
        const pct = total ? Math.round((counts[key] / total) * 100) : 0;
        return `<span class="legend-item">
            <span class="legend-dot" style="background:${cfg.color}"></span>
            ${cfg.label} : ${counts[key]} (${pct}%)
        </span>`;
    }).join('');

    // --- Cartes stats ---
    const statsGrid = document.getElementById('stats-grid');
    const cartes = [
        { value: total, label: "Total maisons", color: "#333" },
        ...Object.entries(ETATS).map(([key, cfg]) => ({
            value: counts[key],
            label: cfg.label,
            color: cfg.color
        }))
    ];
    statsGrid.innerHTML = cartes.map(c => `
        <div class="stat-card" style="border-left-color:${c.color}">
            <div class="stat-value">${c.value}</div>
            <div class="stat-label">${c.label}</div>
        </div>
    `).join('');

    // --- Graphique (doughnut) ---
    const ctx = document.getElementById('chart').getContext('2d');
    const labels = Object.values(ETATS).map(e => e.label);
    const data = Object.keys(ETATS).map(key => counts[key]);
    const colors = Object.values(ETATS).map(e => e.color);

    if(chartInstance){
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16 }
                }
            }
        }
    });
}

chargerDonnees();

// Rafraîchit automatiquement toutes les 30s (utile si plusieurs personnes font la tournée en même temps)
setInterval(chargerDonnees, 30000);
