// ================================================================
// ========== TRENDS.JS - 400+ LIGNES ==========
// ================================================================

// ================================================================
// CHARGEMENT DES TENDANCES
// ================================================================

async function loadTrends() {
    try {
        const response = await fetch('/api/trends');
        const data = await response.json();

        // Salons populaires
        const topRoomsContainer = document.getElementById('topRooms');
        if (topRoomsContainer) {
            topRoomsContainer.innerHTML = '';
            data.topRooms.forEach((room, index) => {
                topRoomsContainer.appendChild(createTrendItem({
                    rank: index + 1,
                    name: `${room.icon || '💬'} ${room.name}`,
                    meta: `${room.participants || 0} participants • ${room.count || 0} messages`,
                    value: `${room.count || 0}`,
                    type: 'room'
                }));
            });
        }

        // Posts populaires
        const topPostsContainer = document.getElementById('topPosts');
        if (topPostsContainer) {
            topPostsContainer.innerHTML = '';
            data.topPosts.forEach((post, index) => {
                topPostsContainer.appendChild(createTrendItem({
                    rank: index + 1,
                    name: post.content,
                    meta: `par ${post.author} • ${post.likes || 0} likes`,
                    value: `${post.likes || 0}`,
                    type: 'post'
                }));
            });
        }

        // Utilisateurs influents
        const topUsersContainer = document.getElementById('topUsers');
        if (topUsersContainer) {
            topUsersContainer.innerHTML = '';
            if (data.trendingUsers && data.trendingUsers.length > 0) {
                data.trendingUsers.forEach(user => {
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
                        <p>Aucun utilisateur actif pour le moment</p>
                    </div>
                `;
            }
        }

        // Statistiques
        const statsContainer = document.getElementById('trendStats');
        if (statsContainer) {
            const statsResponse = await fetch('/api/stats');
            const stats = await statsResponse.json();

            statsContainer.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div style="background:rgba(255,255,255,0.02);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:var(--color-text);">${stats.roomsCount || 0}</div>
                        <div style="font-size:11px;color:var(--color-text-dim);">Salons</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:var(--color-text);">${stats.totalMessages || 0}</div>
                        <div style="font-size:11px;color:var(--color-text-dim);">Messages</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:var(--color-text);">${stats.activeUsers || 0}</div>
                        <div style="font-size:11px;color:var(--color-text-dim);">En ligne</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.02);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:var(--color-text);">${stats.feedCount || 0}</div>
                        <div style="font-size:11px;color:var(--color-text-dim);">Posts</div>
                    </div>
                </div>
            `;
        }

    } catch (error) {
        console.error('Erreur chargement tendances:', error);
        showToast('❌ Erreur de chargement des tendances');
    }
}

// ================================================================
// CRÉATION D'UN ÉLÉMENT DE TENDANCE
// ================================================================

function createTrendItem(data) {
    const div = document.createElement('div');
    div.className = 'trend-item';

    let rankClass = '';
    if (data.rank === 1) rankClass = 'top1';
    else if (data.rank === 2) rankClass = 'top2';
    else if (data.rank === 3) rankClass = 'top3';

    div.innerHTML = `
        <span class="rank ${rankClass}">#${data.rank}</span>
        <div class="info">
            <div class="name">${data.name}</div>
            <div class="meta">${data.meta}</div>
        </div>
        <span class="trend-value up">📈 ${data.value}</span>
    `;

    if (data.type === 'room') {
        div.onclick = () => {
            const username = prompt('👤 Entrez votre pseudo :', 'Anonyme') || 'Anonyme';
            if (username) {
                const roomId = data._id || data.id;
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('roomId', roomId);
                window.location.href = `/chat/${roomId}`;
            }
        };
    }

    return div;
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
    loadTrends();

    // Rafraîchir toutes les 60 secondes
    setInterval(loadTrends, 60000);
});

// Exposer les fonctions globalement
window.loadTrends = loadTrends;
window.showToast = showToast;