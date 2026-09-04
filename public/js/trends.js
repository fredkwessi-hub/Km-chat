// ================================================================
// ========== TRENDS.JS - PAGE TENDANCES ==========
// ================================================================

// ================================================================
// CHARGEMENT DES TENDANCES
// ================================================================

function createTrendItem(data) {
    const div = document.createElement('div');
    div.className = 'trend-item';
    div.onclick = function() {
        if (data.type === 'room') {
            const username = prompt('👤 Entrez votre pseudo pour rejoindre :', 'Anonyme') || 'Anonyme';
            if (username) {
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('roomId', data.id);
                window.location.href = '/chat/' + data.id;
            }
        }
    };

    let rankClass = '';
    if (data.rank === 1) rankClass = 'gold';
    else if (data.rank === 2) rankClass = 'silver';
    else if (data.rank === 3) rankClass = 'bronze';

    div.innerHTML = `
        <span class="rank ${rankClass}">#${data.rank}</span>
        <div class="info">
            <div class="name">${data.name}</div>
            <div class="meta">${data.meta}</div>
        </div>
        <span class="value">📈 ${data.value}</span>
    `;

    return div;
}

function loadTrends() {
    fetch('/api/trends')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            // Top rooms
            const topRoomsContainer = document.getElementById('topRooms');
            if (topRoomsContainer) {
                topRoomsContainer.innerHTML = '';
                if (data.topRooms && data.topRooms.length > 0) {
                    data.topRooms.forEach(function(room, index) {
                        topRoomsContainer.appendChild(createTrendItem({
                            rank: index + 1,
                            name: (room.icon || '💬') + ' ' + room.name,
                            meta: (room.participants || 0) + ' participants • ' + (room.count || 0) + ' messages',
                            value: room.count || 0,
                            type: 'room',
                            id: room.id
                        }));
                    });
                } else {
                    topRoomsContainer.innerHTML = `
                        <div style="text-align:center;padding:30px;color:var(--color-text-dim);">
                            <p>Aucun salon actif pour le moment</p>
                        </div>
                    `;
                }
            }

            // Top posts
            const topPostsContainer = document.getElementById('topPosts');
            if (topPostsContainer) {
                topPostsContainer.innerHTML = '';
                if (data.topPosts && data.topPosts.length > 0) {
                    data.topPosts.forEach(function(post, index) {
                        topPostsContainer.appendChild(createTrendItem({
                            rank: index + 1,
                            name: post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content,
                            meta: 'par ' + post.author + ' • ' + (post.likes || 0) + ' likes',
                            value: post.likes || 0,
                            type: 'post',
                            id: post.id
                        }));
                    });
                } else {
                    topPostsContainer.innerHTML = `
                        <div style="text-align:center;padding:30px;color:var(--color-text-dim);">
                            <p>Aucun post populaire pour le moment</p>
                        </div>
                    `;
                }
            }

            // Top users
            const topUsersContainer = document.getElementById('topUsers');
            if (topUsersContainer) {
                topUsersContainer.innerHTML = '';
                if (data.trendingUsers && data.trendingUsers.length > 0) {
                    data.trendingUsers.forEach(function(user) {
                        const div = document.createElement('div');
                        div.className = 'user-item';
                        const initial = user.username.charAt(0).toUpperCase();
                        div.innerHTML = `
                            <div class="avatar">${initial}</div>
                            <span class="username">${user.username}</span>
                            <span class="score">${user.posts || 0} posts</span>
                        `;
                        topUsersContainer.appendChild(div);
                    });
                } else {
                    topUsersContainer.innerHTML = `
                        <div style="text-align:center;padding:20px;color:var(--color-text-dim);">
                            <p>Aucun utilisateur actif</p>
                        </div>
                    `;
                }
            }
        })
        .catch(function(error) {
            console.error('Erreur chargement tendances:', error);
            showToast('❌ Erreur de chargement des tendances');
        });
}

// ================================================================
// STATS MINI
// ================================================================

function loadMiniStats() {
    fetch('/api/stats')
        .then(function(res) { return res.json(); })
        .then(function(stats) {
            const statRooms = document.getElementById('statRooms');
            const statMessages = document.getElementById('statMessages');
            const statUsers = document.getElementById('statUsers');
            const statPosts = document.getElementById('statPosts');

            if (statRooms) statRooms.textContent = stats.roomsCount || 0;
            if (statMessages) statMessages.textContent = stats.totalMessages || 0;
            if (statUsers) statUsers.textContent = stats.activeUsers || 0;
            if (statPosts) statPosts.textContent = stats.feedCount || 0;
        })
        .catch(function(error) { console.error('Erreur stats:', error); });
}

// ================================================================
// INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadTrends();
    loadMiniStats();

    // Rafraîchir toutes les 60 secondes
    setInterval(loadTrends, 60000);
    setInterval(loadMiniStats, 60000);

    console.log('✅ Page Tendances chargée');
});

// Exposer les fonctions globalement
window.loadTrends = loadTrends;
window.loadMiniStats = loadMiniStats;