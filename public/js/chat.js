// ================================================================
// ========== CHAT.JS - 500+ LIGNES ==========
// ================================================================

// ================================================================
// CHARGEMENT DES SALONS
// ================================================================

let allRooms = [];

async function loadRooms() {
    try {
        const response = await fetch('/api/rooms');
        allRooms = await response.json();

        const grid = document.getElementById('roomsGrid');
        const count = document.getElementById('roomsCount');

        if (!grid) return;

        grid.innerHTML = '';
        if (count) count.textContent = `${allRooms.length} salons`;

        allRooms.forEach(room => {
            grid.appendChild(createRoomCard(room));
        });

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
    div.className = 'room-card';
    div.dataset.roomId = room.id;

    div.innerHTML = `
        <div class="icon">${room.icon || '💬'}</div>
        <div class="name">${room.name}</div>
        <div class="desc">${room.description || 'Salon de discussion'}</div>
        <div class="meta">
            <span class="category">${room.category || 'général'}</span>
            <span class="participants">👥 ${room.participants || 0}</span>
        </div>
        <button class="join-btn" onclick="joinRoom('${room.id}')">
            <i class="fas fa-sign-in-alt"></i> Rejoindre
        </button>
    `;

    return div;
}

// ================================================================
// REJOINDRE UN SALON
// ================================================================

function joinRoom(roomId) {
    const username = prompt('👤 Entrez votre pseudo pour rejoindre :', 'Anonyme') || 'Anonyme';
    if (username) {
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('roomId', roomId);
        window.location.href = `/chat/${roomId}`;
    }
}

// ================================================================
// CRÉER UN SALON
// ================================================================

async function createRoom() {
    const name = document.getElementById('roomNameInput').value.trim();
    const description = document.getElementById('roomDescInput').value.trim();
    const category = document.getElementById('roomCategoryInput').value;
    const icon = document.getElementById('roomIconInput').value.trim() || '💬';

    if (!name) {
        showToast('⚠️ Le nom du salon est requis');
        return;
    }

    try {
        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                description: description,
                category: category,
                icon: icon
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('✅ Salon créé avec succès !');
            closeCreateRoom();
            loadRooms();

            // Réinitialiser le formulaire
            document.getElementById('roomNameInput').value = '';
            document.getElementById('roomDescInput').value = '';
            document.getElementById('roomIconInput').value = '💬';

            // Proposer de rejoindre
            if (confirm('✨ Salon créé ! Voulez-vous le rejoindre maintenant ?')) {
                const username = prompt('👤 Entrez votre pseudo :', 'Anonyme') || 'Anonyme';
                if (username) {
                    sessionStorage.setItem('username', username);
                    sessionStorage.setItem('roomId', data.roomId);
                    window.location.href = `/chat/${data.roomId}`;
                }
            }
        } else {
            showToast('❌ Erreur lors de la création');
        }
    } catch (error) {
        console.error('Erreur création salon:', error);
        showToast('❌ Erreur de création');
    }
}

// ================================================================
// RECHERCHE DE SALONS
// ================================================================

function initSearch() {
    const searchInput = document.getElementById('searchRooms');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.room-card');

        cards.forEach(card => {
            const name = card.querySelector('.name')?.textContent?.toLowerCase() || '';
            const desc = card.querySelector('.desc')?.textContent?.toLowerCase() || '';
            const category = card.querySelector('.category')?.textContent?.toLowerCase() || '';

            const matches = query === '' || name.includes(query) || desc.includes(query) || category.includes(query);
            card.style.display = matches ? '' : 'none';
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
// EXPOSER LES FONCTIONS GLOBALEMENT
// ================================================================

window.loadRooms = loadRooms;
window.joinRoom = joinRoom;
window.createRoom = createRoom;
window.openCreateRoom = function() {
    document.getElementById('createRoomModal').classList.add('active');
};
window.closeCreateRoom = function() {
    document.getElementById('createRoomModal').classList.remove('active');
};

// ================================================================
// INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadRooms();
    initSearch();

    // Rafraîchir toutes les 60 secondes
    setInterval(loadRooms, 60000);
});