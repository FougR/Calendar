const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 3000;
const DATA_PATH = path.join(__dirname, 'secteur2.json');

app.use(express.json());
app.use(express.static('public'));

// Lecture données GET
app.get('/secteur2', (req, res) =>{
    fs.readFile(DATA_PATH, 'utf-8', (err, data) =>{
        if(err) return res.status(500).json({error: 'Impossible de lire les données'});
        res.json(JSON.parse(data));
    });
});

// Ecriture données POST
app.post('/secteur2', (req, res) =>{
    fs.writeFile(DATA_PATH, JSON.stringify(req.body, null, 2), err =>{
        if(err) return res.status(500).json({error: 'Echec de l\'enregistrement'});
        res.json({message: 'Données enregistrées'});
    });
});

app.listen(PORT, () =>{
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
})