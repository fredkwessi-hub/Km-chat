// ================================================================
// ========== SOCIAL.JS - 400+ LIGNES ==========
// ================================================================

// ================================================================
// CHARGEMENT DES INTÉGRATIONS SOCIALES
// ================================================================

const socialPlatforms = [
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: '#25D366' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#26A5E4' }
];

let socialStatus = {};

async function loadSocialStatus() {
    try {
        const response = await fetch('/api/social/status');
        socialStatus = await response.json();

        const grid = document.getElementById('socialGrid');
        if (!grid) return;

        grid.innerHTML = '';

        socialPlatforms.forEach(platform => {
            const status = socialStatus[platform.id] || { connected: false };
            grid.appendChild(createSocialCard(platform, status));
        });

    } catch (error) {
        console.error('Erreur chargement statut social:', error);
        showToast('❌ Erreur de chargement des intégrations');
    }
}

// ================================================================
// CRÉATION D'UNE CARTE SOCIALE
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
        <button class="btn ${isConnected ? 'btn-danger' : 'btn-primary'} btn-block btn-connect" 
                onclick="${isConnected ? `disconnectSocial('${platform.id}')` : `connectSocial('${platform.id}')`}">
            ${isConnected ? '🔌 Déconnecter' : '🔗 Connecter'}
        </button>
        ${status.lastPost ? `<div class="last-post">📅 Dernier post: ${new Date(status.lastPost).toLocaleString()}</div>` : ''}
    `;

    return div;
}

// ================================================================
// CONNEXION / DÉCONNEXION
// ================================================================

async function connectSocial(platformId) {
    const platform = socialPlatforms.find(p => p.id === platformId);
    if (!platform) return;

    let endpoint = `/api/social/${platformId}/connect`;
    let body = {};

    if (platformId === 'discord') {
        const webhook = prompt('🔗 Entrez l\'URL du webhook Discord :');
        if (!webhook) return;
        body.webhook = webhook;
    } else if (platformId === 'whatsapp') {
        const phone = prompt('📱 Entrez votre numéro WhatsApp (avec indicatif) :');
        if (!phone) return;
        body.phoneNumber = phone;
    } else if (platformId === 'telegram') {
        const token = prompt('🤖 Entrez le token de votre bot Telegram :');
        if (!token) return;
        body.botToken = token;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            showToast(`✅ ${platform.name} connecté avec succès !`);
            loadSocialStatus();
        } else {
            showToast(`❌ Erreur: ${data.error || 'Connexion échouée'}`);
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        showToast('❌ Erreur de connexion');
    }
}

async function disconnectSocial(platformId) {
    const platform = socialPlatforms.find(p => p.id === platformId);
    if (!platform) return;

    if (!confirm(`⚠️ Voulez-vous vraiment déconnecter ${platform.name} ?`)) return;

    try {
        // Simuler une déconnexion (à implémenter côté serveur)
        const response = await fetch(`/api/social/${platformId}/disconnect`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showToast(`✅ ${platform.name} déconnecté`);
            loadSocialStatus();
        }
    } catch (error) {
        console.error('Erreur déconnexion:', error);
        showToast('❌ Erreur de déconnexion');
    }
}

// ================================================================
// PUBLICATION
// ================================================================

async function publishToSocial() {
    const content = document.getElementById('publishContent').value.trim();
    if (!content) {
        showToast('⚠️ Veuillez écrire un message à publier');
        return;
    }

    const checkboxes = document.querySelectorAll('#platformSelect input[type="checkbox"]:checked');
    const platforms = Array.from(checkboxes).map(cb => cb.value);

    if (platforms.length === 0) {
        showToast('⚠️ Sélectionnez au moins une plateforme');
        return;
    }

    // Vérifier si au moins une plateforme est connectée
    const connectedPlatforms = platforms.filter(p => socialStatus[p] && socialStatus[p].connected);
    if (connectedPlatforms.length === 0) {
        showToast('⚠️ Aucune plateforme sélectionnée n\'est connectée');
        return;
    }

    try {
        const response = await fetch('/api/social/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                platforms: connectedPlatforms
            })
        });

        const data = await response.json();

        if (data.success) {
            const results = Object.entries(data.results)
                .map(([platform, result]) => `${platform}: ${result.success ? '✅' : '❌'}`)
                .join(' ');

            showToast(`✅ Publié ! ${results}`);
            document.getElementById('publishContent').value = '';
            loadSocialStatus();
        } else {
            showToast('❌ Erreur lors de la publication');
        }
    } catch (error) {
        console.error('Erreur publication:', error);
        showToast('❌ Erreur de publication');
    }
}

// ================================================================
// TOAST
// ================================================================

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ================================================================
// INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadSocialStatus();

    // Rafraîchir toutes les 30 secondes
    setInterval(loadSocialStatus, 30000);
});

// Exposer les fonctions globalement
window.loadSocialStatus = loadSocialStatus;
window.connectSocial = connectSocial;
window.disconnectSocial = disconnectSocial;
window.publishToSocial = publishToSocial;
window.showToast = showToast;