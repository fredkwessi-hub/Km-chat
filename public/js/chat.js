// ================================================================
// ========== CHAT.JS - PAGE DES SALONS ==========
// ================================================================

// ================================================================
// CHARGEMENT DES SALONS
// ================================================================

let allRooms = [];

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
        <button class="join-btn" onclick="joinRoom('${room.id}'); event.stopPropagation();">
            <i class="fas fa-sign-in-alt"></i> Rejoindre
        </button>
    `;

    // Cliquer sur la carte (hors bouton) pour voir les détails
    div.addEventListener('click', function() {
        const username = prompt('👤 Entrez votre pseudo :', 'Anonyme') || 'Anonyme';
        if (username) {
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('roomId', room.id);
            window.location.href = '/chat/' + room.id;
        }
    });

    return div;
}

function loadRooms() {
    fetch('/api/rooms')
        .then(function(res) { return res.json(); })
        .then(function(rooms) {
            allRooms = rooms;

            const grid = document.getElementById('roomsGrid');
            const count = document.getElementById('roomsCount');

            if (!grid) return;

            grid.innerHTML = '';
            if (count) count.textContent = allRooms.length + ' salons';

            if (allRooms.length === 0) {
                grid.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:var(--color-text-dim);grid-column:1/-1;">
                        <span style="font-size:48px;display:block;margin-bottom:16px;">🏗️</span>
                        <h3 style="font-weight:400;color:var(--color-text-secondary);">Aucun salon pour le moment</h3>
                        <p style="font-size:14px;color:var(--color-text-dim);">Soyez le premier à créer un salon !</p>
                        <button class="btn btn-primary" style="margin-top:16px;" onclick="openCreateModal()">
                            ✨ Créer un salon
                        </button>
                    </div>
                `;
                return;
            }

            allRooms.forEach(function(room) {
                grid.appendChild(createRoomCard(room));
            });
        })
        .catch(function(error) {
            console.error('Erreur chargement salons:', error);
            showToast('❌ Erreur de chargement des salons');
        });
}

// ================================================================
// REJOINDRE UN SALON
// ================================================================

function joinRoom(roomId) {
    const username = prompt('👤 Entrez votre pseudo :', 'Anonyme') || 'Anonyme';
    if (username) {
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('roomId', roomId);
        window.location.href = '/chat/' + roomId;
    }
}

// ================================================================
// CRÉER UN SALON
// ================================================================

function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    // Réinitialiser le formulaire
    document.getElementById('roomNameInput').value = '';
    document.getElementById('roomDescInput').value = '';
    document.getElementById('roomIconInput').value = '💬';
}

// Fermer le modal en cliquant à l'extérieur
document.getElementById('createModal').addEventListener('click', function(e) {
    if (e.target === this) closeCreateModal();
});

function createRoom() {
    const name = document.getElementById('roomNameInput').value.trim();
    const description = document.getElementById('roomDescInput').value.trim();
    const category = document.getElementById('roomCategoryInput').value;
    const icon = document.getElementById('roomIconInput').value.trim() || '💬';

    if (!name) {
        showToast('⚠️ Le nom du salon est requis');
        return;
    }

    showToast('📤 Création du salon...');

    fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            description: description,
            category: category,
            icon: icon
        })
    })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('✅ Salon créé avec succès !');
                closeCreateModal();
                loadRooms();

                // Proposer de rejoindre
                if (confirm('✨ Salon créé ! Voulez-vous le rejoindre maintenant ?')) {
                    const username = prompt('👤 Entrez votre pseudo :', 'Anonyme') || 'Anonyme';
                    if (username) {
                        sessionStorage.setItem('username', username);
                        sessionStorage.setItem('roomId', data.roomId);
                        window.location.href = '/chat/' + data.roomId;
                    }
                }
            } else {
                showToast('❌ Erreur lors de la création');
            }
        })
        .catch(function(error) {
            console.error('Erreur création salon:', error);
            showToast('❌ Erreur de création');
        });
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

        cards.forEach(function(card) {
            const name = card.querySelector('.name')?.textContent?.toLowerCase() || '';
            const desc = card.querySelector('.desc')?.textContent?.toLowerCase() || '';
            const category = card.querySelector('.category')?.textContent?.toLowerCase() || '';

            const matches = query === '' || name.includes(query) || desc.includes(query) || category.includes(query);
            card.style.display = matches ? '' : 'none';
        });
    });
}

// ================================================================
// INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadRooms();
    initSearch();

    // Rafraîchir toutes les 60 secondes
    setInterval(loadRooms, 60000);

    console.log('✅ Page Salons chargée');
});

// Exposer les fonctions globalement
window.loadRooms = loadRooms;
window.joinRoom = joinRoom;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.createRoom = createRoom;