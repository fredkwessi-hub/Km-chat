// ================================================================
// ========== EXPLORE.JS - PAGE EXPLORER ==========
// ================================================================

let allRooms = [];
let currentFilter = 'all';

function createRoomCard(room) {
    const div = document.createElement('div');
    div.className = 'room-card';
    div.dataset.category = room.category || 'général';

    // ==== CORRECTION : Redirection vers /room/ ====
    div.onclick = function() {
        const username = prompt('👤 Entrez votre pseudo :', 'Anonyme') || 'Anonyme';
        if (username) {
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('roomId', room.id);
            window.location.href = '/room/' + room.id;
        }
    };

    div.innerHTML = `
        <div class="icon">${room.icon || '💬'}</div>
        <div class="name">${room.name}</div>
        <div class="desc">${room.description || 'Salon de discussion'}</div>
        <div class="meta">
            <span class="category">${room.category || 'général'}</span>
            <span class="participants">👥 ${room.participants || 0}</span>
        </div>
    `;

    return div;
}

function loadRooms(category) {
    fetch('/api/rooms')
        .then(function(res) { return res.json(); })
        .then(function(rooms) {
            allRooms = rooms;
            const popularContainer = document.getElementById('popularRooms');
            const newContainer = document.getElementById('newRooms');
            if (!popularContainer || !newContainer) return;

            let filteredRooms = rooms;
            if (category !== 'all') {
                filteredRooms = rooms.filter(function(room) {
                    return room.category === category;
                });
            }

            const popular = filteredRooms.slice().sort(function(a, b) {
                return b.participants - a.participants;
            }).slice(0, 6);

            const newest = filteredRooms.slice().filter(function(room) {
                return !room.isDefault;
            }).slice(0, 6);

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
                popular.forEach(function(room) {
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
                newest.forEach(function(room) {
                    newContainer.appendChild(createRoomCard(room));
                });
            }
        })
        .catch(function(error) {
            console.error('Erreur chargement salons:', error);
            showToast('❌ Erreur de chargement des salons');
        });
}

function initFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(function(filter) {
        filter.addEventListener('click', function() {
            filters.forEach(function(f) { f.classList.remove('active'); });
            this.classList.add('active');
            const category = this.dataset.filter;
            currentFilter = category;
            loadRooms(category);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadRooms('all');
    initFilters();
    setInterval(function() { loadRooms(currentFilter); }, 30000);
    console.log('✅ Page Explorer chargée');
});

window.loadRooms = loadRooms;