document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('nom').value;
    const motDePasse = document.getElementById('motDePasse').value;
    const errorEl = document.getElementById('error');
    errorEl.textContent = '';

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, motDePasse })
        });

        if (res.ok) {
            window.location.href = '/';
        } else {
            const data = await res.json();
            errorEl.textContent = data.error || 'Erreur de connexion';
        }
    } catch (err) {
        errorEl.textContent = 'Erreur réseau, réessaie.';
    }
});
