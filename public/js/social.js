// ================================================================
// ========== SOCIAL.JS - PAGE INTÉGRATIONS SOCIALES ==========
// ================================================================

// ================================================================
// CONFIGURATION DES PLATEFORMES
// ================================================================

const socialPlatforms = [
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: '#25D366' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' }
];

let socialStatus = {};

// ================================================================
// CHARGEMENT DES INTÉGRATIONS
// ================================================================

function createSocialCard(platform, status) {
    const div = document.createElement('div');
    div.className = 'social-card';

    const isConnected = status.connected || false;

    div.innerHTML = `
        <span class="icon">${platform.icon}</span>
        <div class="name">${platform.name}</div>
        <div class="desc">Connectez votre compte ${platform.name}</div>
        <div class="status ${isConnected ? 'connected' : 'disconnected'}">
            ${isConnected ? '✅ Connecté' : '⛔ Déconnecté'}
        </div>
        <button class="btn ${isConnected ? 'btn-danger' : 'btn-success'} btn-block btn-connect" 
                onclick="${isConnected ? 'disconnectSocial(\'' + platform.id + '\')' : 'connectSocial(\'' + platform.id + '\')'}">
            ${isConnected ? '🔌 Déconnecter' : '🔗 Connecter'}
        </button>
        ${status.lastPost ? '<div class="last-post">📅 Dernier post: ' + new Date(status.lastPost).toLocaleString() + '</div>' : ''}
    `;

    return div;
}

function loadSocialStatus() {
    fetch('/api/social/status')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            socialStatus = data;

            const grid = document.getElementById('socialGrid');
            if (!grid) return;

            grid.innerHTML = '';

            socialPlatforms.forEach(function(platform) {
                const status = socialStatus[platform.id] || { connected: false };
                grid.appendChild(createSocialCard(platform, status));
            });
        })
        .catch(function(error) {
            console.error('Erreur chargement statut social:', error);
            showToast('❌ Erreur de chargement des intégrations');
        });
}

// ================================================================
// CONNEXION / DÉCONNEXION
// ================================================================

function connectSocial(platformId) {
    const platform = socialPlatforms.find(function(p) { return p.id === platformId; });
    if (!platform) return;

    showToast('🔗 Connexion à ' + platform.name + '...');

    fetch('/api/social/' + platformId + '/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('✅ ' + platform.name + ' connecté avec succès !');
                loadSocialStatus();
            } else {
                showToast('❌ Erreur: ' + (data.error || 'Connexion échouée'));
            }
        })
        .catch(function(error) {
            console.error('Erreur connexion:', error);
            showToast('❌ Erreur de connexion');
        });
}

function disconnectSocial(platformId) {
    const platform = socialPlatforms.find(function(p) { return p.id === platformId; });
    if (!platform) return;

    if (!confirm('⚠️ Voulez-vous vraiment déconnecter ' + platform.name + ' ?')) return;

    fetch('/api/social/' + platformId + '/disconnect', { method: 'POST' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('✅ ' + platform.name + ' déconnecté');
                loadSocialStatus();
            }
        })
        .catch(function(error) {
            console.error('Erreur déconnexion:', error);
            showToast('❌ Erreur de déconnexion');
        });
}

// ================================================================
// PUBLICATION
// ================================================================

function publishToSocial() {
    const content = document.getElementById('publishContent').value.trim();
    if (!content) {
        showToast('⚠️ Veuillez écrire un message à publier');
        return;
    }

    const checkboxes = document.querySelectorAll('#platformSelect input[type="checkbox"]:checked');
    const platforms = Array.from(checkboxes).map(function(cb) { return cb.value; });

    if (platforms.length === 0) {
        showToast('⚠️ Sélectionnez au moins une plateforme');
        return;
    }

    // Vérifier si au moins une plateforme est connectée
    const connectedPlatforms = platforms.filter(function(p) {
        return socialStatus[p] && socialStatus[p].connected;
    });

    if (connectedPlatforms.length === 0) {
        showToast('⚠️ Aucune plateforme sélectionnée n\'est connectée');
        return;
    }

    showToast('📤 Publication en cours...');

    fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: content,
            platforms: connectedPlatforms
        })
    })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                const results = Object.entries(data.results)
                    .map(function(item) {
                        const platform = item[0];
                        const result = item[1];
                        return platform + ': ' + (result.success ? '✅' : '❌');
                    })
                    .join(' ');

                showToast('✅ Publié ! ' + results);
                document.getElementById('publishContent').value = '';
                loadSocialStatus();
            } else {
                showToast('❌ Erreur lors de la publication');
            }
        })
        .catch(function(error) {
            console.error('Erreur publication:', error);
            showToast('❌ Erreur de publication');
        });
}

// ================================================================
// INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadSocialStatus();

    // Rafraîchir toutes les 30 secondes
    setInterval(loadSocialStatus, 30000);

    console.log('✅ Page Social chargée');
});

// Exposer les fonctions globalement
window.loadSocialStatus = loadSocialStatus;
window.connectSocial = connectSocial;
window.disconnectSocial = disconnectSocial;
window.publishToSocial = publishToSocial;