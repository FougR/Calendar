(async function () {
    try {
        const res = await fetch('/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await res.json();

        const style = document.createElement('style');
        style.textContent = `
            #auth-bar{
                position:fixed;
                bottom:10px;
                left:10px;
                z-index:1000;
                background:#fff;
                border:1px solid rgba(0,0,0,0.15);
                border-radius:8px;
                padding:6px 10px;
                font-family: system-ui, sans-serif;
                font-size:13px;
                display:flex;
                align-items:center;
                gap:8px;
                box-shadow:0 1px 3px rgba(0,0,0,0.2);
            }
            #auth-bar button{
                border:none;
                background:#eee;
                border-radius:6px;
                padding:4px 8px;
                font-size:12px;
                cursor:pointer;
            }
            #auth-bar button:hover{ background:#ddd; }
        `;
        document.head.appendChild(style);

        const bar = document.createElement('div');
        bar.id = 'auth-bar';
        bar.innerHTML = `<span>👤 ${data.nom}</span><button id="logout-btn">Déconnexion</button>`;
        document.body.appendChild(bar);

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login.html';
        });
    } catch (err) {
        console.error('Erreur auth-ui :', err);
    }
})();
