// ================================================================
// ========== MAIN.JS - FONCTIONS PRINCIPALES ==========
// ================================================================

// ================================================================
// GESTION DES THÈMES
// ================================================================

function setTheme(theme) {
    document.body.className = 'theme-' + theme;
    localStorage.setItem('kmchat-theme', theme);

    document.querySelectorAll('.theme-option').forEach(function(option) {
        option.classList.remove('active');
        if (option.dataset.theme === theme) {
            option.classList.add('active');
        }
    });

    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

function toggleThemeMenu() {
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('kmchat-theme') || 'noir';
    setTheme(savedTheme);
}

// ================================================================
// TOAST NOTIFICATIONS
// ================================================================

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(function() { toast.remove(); }, 500);
    }, 3000);
}

// ================================================================
// PARTAGE SOCIAL
// ================================================================

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Rejoins-moi sur KM-Chat ! 💬');
    window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank');
}

function shareOnWhatsApp() {
    const text = encodeURIComponent('Rejoins-moi sur KM-Chat ! 💬 ' + window.location.href);
    window.open('https://api.whatsapp.com/send?text=' + text, '_blank');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank');
}

function copyShareLink() {
    const link = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link)
            .then(function() { showToast('✅ Lien copié !'); })
            .catch(function() { fallbackCopy(link); });
    } else {
        fallbackCopy(link);
    }
}

function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('✅ Lien copié !');
}

// ================================================================
// STATS
// ================================================================

function loadStats() {
    fetch('/api/stats')
        .then(function(res) { return res.json(); })
        .then(function(stats) {
            const statRooms = document.getElementById('statRooms');
            const statMessages = document.getElementById('statMessages');
            const statUsers = document.getElementById('statUsers');
            const statPosts = document.getElementById('statPosts');
            const ephemeralCount = document.getElementById('ephemeralCount');

            if (statRooms) statRooms.textContent = stats.roomsCount || 0;
            if (statMessages) statMessages.textContent = stats.totalMessages || 0;
            if (statUsers) statUsers.textContent = stats.activeUsers || 0;
            if (statPosts) statPosts.textContent = stats.feedCount || 0;
            if (ephemeralCount) ephemeralCount.textContent = stats.ephemeralCount || 0;
        })
        .catch(function(error) { console.error('Erreur stats:', error); });
}

// ================================================================
// INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadSavedTheme();

    // Fermer le dropdown des thèmes en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        const selector = document.querySelector('.theme-selector');
        if (selector && !selector.contains(event.target)) {
            const dropdown = document.getElementById('themeDropdown');
            if (dropdown) {
                dropdown.classList.remove('open');
            }
        }
    });

    console.log('✅ KM-Chat chargé avec succès !');
});

// Exposer les fonctions globalement
window.setTheme = setTheme;
window.toggleThemeMenu = toggleThemeMenu;
window.shareOnTwitter = shareOnTwitter;
window.shareOnFacebook = shareOnFacebook;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.copyShareLink = copyShareLink;
window.showToast = showToast;
window.loadStats = loadStats;