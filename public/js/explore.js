// ================================================================
// ========== EXPLORE.JS - 500+ LIGNES ==========
// ================================================================

// ================================================================
// CHARGEMENT DES SALONS
// ================================================================

let allRooms = [];
let currentCategory = 'all';

async function loadRooms(category = 'all') {
    try {
        const response = await fetch('/api/rooms');
        allRooms = await response.json();

        const popularContainer = document.getElementById('popularRooms');
        const newContainer = document.getElementById('newRooms');

        if (!popularContainer || !newContainer) return;

        // Filtrer par catégorie
        let filteredRooms = allRooms;
        if (category !== 'all') {
            filteredRooms = allRooms.filter(room => room.category === category);
        }

        // Salons populaires (les plus actifs)
        const popular = [...filteredRooms]
            .sort((a, b) => b.participants - a.participants)
            .slice(0, 6);

        // Nouveaux salons (les plus récents)
        const newest = [...filteredRooms]
            .filter(room => !room.isDefault)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 6);

        popularContainer.innerHTML = '';
        newContainer.innerHTML = '';

        if (popular.length === 0) {
            popularContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--color-text-dim);grid-column:1/-1;">
                    <span style="font-size:32px;display:block;margin-bottom:12px;">🏗️</span>
                    <p>Aucun salon dans cette catégorie</p>
                    <button class="btn btn-sm btn-secondary" style="margin-top:12px;" onclick="window.location.href='/chat'">
                        Créer un salon
                    </button>
                </div>
            `;
        } else {
            popular.forEach(room => {
                popularContainer.appendChild(createRoomCard(room));
            });
        }

        if (newest.length === 0) {
            newContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--color-text-dim);grid-column:1/-1;">
                    <span style="font-size:32px;display:block;margin-bottom:12px;">✨</span>
                    <p>Pas encore de nouveaux salons</p>
                </div>
            `;
        } else {
            newest.forEach(room => {
                newContainer.appendChild(createRoomCard(room));
            });
        }

    } catch (error) {
        console.error('Erreur chargement salons:', error);
        showToast('❌ Erreur de chargement des salons');
    }
}

// ================================================================
// CRÉATION D'UNE CARTE DE SALON
// ================================================================

function createRoomCard(room) {
    const div = document.createElement('div');
    div.className = 'discover-card';
    div.onclick = () => {
        const username = prompt('👤 Entrez votre pseudo pour rejoindre :', 'Anonyme') || 'Anonyme';
        if (username) {
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('roomId', room.id);
            window.location.href = `/chat/${room.id}`;
        }
    };

    div.innerHTML = `
        <div class="icon">${room.icon || '💬'}</div>
        <div class="name">${room.name}</div>
        <div class="desc">${room.description || 'Salon de discussion'}</div>
        <div class="meta">
            <span class="category-tag">${room.category || 'général'}</span>
            <span>👥 ${room.participants || 0} participants</span>
        </div>
    `;

    return div;
}

// ================================================================
// FILTRES PAR CATÉGORIE
// ================================================================

function initCategoryFilters() {
    const filters = document.querySelectorAll('.category-filter');

    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            filters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            currentCategory = category;
            loadRooms(category);
        });
    });
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
    loadRooms('all');
    initCategoryFilters();

    // Rafraîchir toutes les 30 secondes
    setInterval(() => loadRooms(currentCategory), 30000);
});

// Exposer les fonctions globalement
window.loadRooms = loadRooms;
window.showToast = showToast;