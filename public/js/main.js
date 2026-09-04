// ================================================================
// ========== MAIN.JS - 1500+ LIGNES ==========
// ================================================================

// ================================================================
// SECTION 1 : GESTION DU FLUX D'ACTUALITÉ
// ================================================================

let feedPage = 0;
const FEED_LIMIT = 10;
let isLoadingFeed = false;
let allPosts = [];

async function loadFeed(page = 0) {
    if (isLoadingFeed) return;
    isLoadingFeed = true;

    try {
        const response = await fetch('/api/feed');
        allPosts = await response.json();

        const container = document.getElementById('feedContainer');
        if (!container) return;

        if (page === 0) {
            container.innerHTML = '';
        }

        const start = page * FEED_LIMIT;
        const end = start + FEED_LIMIT;
        const pagePosts = allPosts.slice(start, end);

        if (pagePosts.length === 0 && page === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--color-text-dim);">
                    <span style="font-size:48px;display:block;margin-bottom:16px;">📭</span>
                    <h3>Aucun post pour le moment</h3>
                    <p style="font-size:14px;">Soyez le premier à partager quelque chose !</p>
                    <button class="btn btn-primary" style="margin-top:16px;" onclick="openPostCreator()">
                        ✨ Créer un post
                    </button>
                </div>
            `;
            isLoadingFeed = false;
            return;
        }

        if (pagePosts.length === 0) {
            showToast('📭 Plus de posts à charger');
            isLoadingFeed = false;
            return;
        }

        pagePosts.forEach(post => {
            container.appendChild(createFeedPost(post));
        });

        feedPage = page;
    } catch (error) {
        console.error('Erreur chargement flux:', error);
        showToast('❌ Erreur de chargement du flux');
    }

    isLoadingFeed = false;
}

function createFeedPost(post) {
    const div = document.createElement('div');
    div.className = 'feed-post';
    div.dataset.postId = post.id;

    const time = new Date(post.timestamp).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short'
    });

    const initial = post.author.charAt(0).toUpperCase();

    div.innerHTML = `
        <div class="header">
            <div class="author">
                <div class="avatar">${initial}</div>
                <span>${post.author}</span>
            </div>
            <span class="time">${time}</span>
        </div>
        <div class="content">${post.content}</div>
        <div class="actions">
            <button onclick="likePost('${post.id}')" id="like-btn-${post.id}" class="like-btn">
                <i class="fas fa-heart"></i> <span id="like-count-${post.id}">${post.likes || 0}</span>
            </button>
            <button onclick="toggleComments('${post.id}')">
                <i class="fas fa-comment"></i> <span id="comment-count-${post.id}">${(post.comments || []).length}</span>
            </button>
            <button onclick="sharePost('${post.id}')">
                <i class="fas fa-share-alt"></i> <span id="share-count-${post.id}">${post.shares || 0}</span>
            </button>
        </div>
        <div class="comments" id="comments-${post.id}" style="display:none;">
            <div id="comments-list-${post.id}">
                ${(post.comments || []).map(c => `
                    <div class="comment">
                        <div class="avatar">${c.author.charAt(0).toUpperCase()}</div>
                        <div>
                            <span class="author">${c.author}</span>
                            <span class="text">${c.text}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:10px;margin-top:10px;">
                <input type="text" id="comment-input-${post.id}" placeholder="Écrire un commentaire..." style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid var(--color-border);border-radius:8px;color:var(--color-text);font-family:var(--font-sans);">
                <button class="btn btn-sm btn-primary" onclick="addComment('${post.id}')">Envoyer</button>
            </div>
        </div>
    `;

    return div;
}

// ================================================================
// SECTION 2 : INTERACTIONS FLUX
// ================================================================

async function likePost(postId) {
    try {
        const response = await fetch(`/api/feed/${postId}/like`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            const countSpan = document.getElementById(`like-count-${postId}`);
            if (countSpan) {
                countSpan.textContent = data.likes;
            }
            const btn = document.getElementById(`like-btn-${postId}`);
            if (btn) {
                btn.classList.add('liked');
                btn.style.color = '#ff4757';
            }
        }
    } catch (error) {
        console.error('Erreur like:', error);
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();

    if (!text) return;

    const author = prompt('Votre pseudo:', 'Anonyme') || 'Anonyme';

    try {
        const response = await fetch(`/api/feed/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, text })
        });

        const data = await response.json();

        if (data.success) {
            input.value = '';
            // Ajouter le commentaire directement
            const list = document.getElementById(`comments-list-${postId}`);
            if (list) {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                commentDiv.innerHTML = `
                    <div class="avatar">${author.charAt(0).toUpperCase()}</div>
                    <div>
                        <span class="author">${author}</span>
                        <span class="text">${text}</span>
                    </div>
                `;
                list.appendChild(commentDiv);
            }
            const countSpan = document.getElementById(`comment-count-${postId}`);
            if (countSpan) {
                const current = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = current + 1;
            }
        }
    } catch (error) {
        console.error('Erreur commentaire:', error);
        showToast('❌ Erreur lors de l\'ajout du commentaire');
    }
}

async function sharePost(postId) {
    try {
        const response = await fetch(`/api/feed/${postId}/share`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            const countSpan = document.getElementById(`share-count-${postId}`);
            if (countSpan) {
                countSpan.textContent = data.shares;
            }
            showToast('✅ Post partagé !');
        }
    } catch (error) {
        console.error('Erreur partage:', error);
        showToast('❌ Erreur lors du partage');
    }
}

function toggleComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (commentsDiv) {
        commentsDiv.style.display = commentsDiv.style.display === 'none' ? 'block' : 'none';
    }
}

function loadMoreFeed() {
    loadFeed(feedPage + 1);
}

// ================================================================
// SECTION 3 : STATISTIQUES EN TEMPS RÉEL
// ================================================================

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        const statRooms = document.getElementById('statRooms');
        const statMessages = document.getElementById('statMessages');
        const statUsers = document.getElementById('statUsers');
        const statPosts = document.getElementById('statPosts');
        const ephemeralCount = document.getElementById('ephemeralCount');

        if (statRooms) statRooms.textContent = stats.roomsCount || 0;
        if (statMessages) statMessages.textContent = stats.totalMessages || 0;
        if (statUsers) statUsers.textContent = stats.activeUsers || 0;
        if (statPosts) statPosts.textContent = stats.postsToday || 0;
        if (ephemeralCount) ephemeralCount.textContent = stats.ephemeralCount || 0;
    } catch (error) {
        console.error('Erreur stats:', error);
    }
}

// ================================================================
// SECTION 4 : CONTENU ÉPHÉMÈRE
// ================================================================

async function loadEphemeral() {
    try {
        const response = await fetch('/api/ephemeral');
        const items = await response.json();

        const container = document.getElementById('ephemeralContainer');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--color-text-dim);">
                    <span style="font-size:36px;display:block;margin-bottom:12px;">⏳</span>
                    <p>Aucun contenu éphémère actif</p>
                    <button class="btn btn-sm btn-secondary" style="margin-top:12px;" onclick="openEphemeralCreator()">
                        ✨ Créer un contenu éphémère
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'ephemeral-item';
            const timeLeft = Math.floor(item.timeLeft / 1000 / 60);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            div.innerHTML = `
                <div class="timer">⏳ ${minutes}m ${seconds}s</div>
                <div class="content">${item.content}</div>
                <div class="author">✍️ ${item.author}</div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erreur contenu éphémère:', error);
    }
}

// ================================================================
// SECTION 5 : CRÉATION DE CONTENU
// ================================================================

function openPostCreator() {
    const content = prompt('✍️ Partagez quelque chose avec la communauté :');
    if (!content || content.trim() === '') return;

    const author = prompt('👤 Votre pseudo:', 'Anonyme') || 'Anonyme';

    fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), author })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('✅ Post publié !');
                loadFeed(0);
                loadStats();
            }
        })
        .catch(error => {
            console.error('Erreur publication:', error);
            showToast('❌ Erreur lors de la publication');
        });
}

function openEphemeralCreator() {
    const content = prompt('⏳ Contenu éphémère (disparaît dans 1h) :');
    if (!content || content.trim() === '') return;

    const author = prompt('👤 Votre pseudo:', 'Anonyme') || 'Anonyme';

    fetch('/api/ephemeral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: content.trim(),
            author,
            duration: 60 * 60 * 1000 // 1 heure
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('✅ Contenu éphémère créé !');
                loadEphemeral();
                loadStats();
            }
        })
        .catch(error => {
            console.error('Erreur création contenu éphémère:', error);
            showToast('❌ Erreur lors de la création');
        });
}

// ================================================================
// SECTION 6 : RECHERCHE
// ================================================================

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query || query.length < 2) {
        showToast('🔍 Entrez au moins 2 caractères');
        return;
    }
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
}

// ================================================================
// SECTION 7 : PARTAGE SOCIAL
// ================================================================

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Rejoins-moi sur KM-Chat ! 💬 Une plateforme de discussion moderne.');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareOnWhatsApp() {
    const text = encodeURIComponent('Rejoins-moi sur KM-Chat ! 💬 ' + window.location.href);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
}

function copyShareLink() {
    const link = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link)
            .then(() => showToast('✅ Lien copié dans le presse-papier !'))
            .catch(() => fallbackCopy(link));
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
    showToast('✅ Lien copié dans le presse-papier !');
}

// ================================================================
// SECTION 8 : TOAST NOTIFICATION
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
// SECTION 9 : SOCKET.IO - MISES À JOUR EN TEMPS RÉEL
// ================================================================

let socket = null;

function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('🔌 Connecté au serveur');
        loadStats();
    });

    socket.on('feed-update', (data) => {
        if (data.action === 'new') {
            const container = document.getElementById('feedContainer');
            if (container) {
                const post = data.post;
                const postElement = createFeedPost(post);
                container.insertBefore(postElement, container.firstChild);
                showToast('📢 Nouveau post publié !');
            }
            loadStats();
        }
    });

    socket.on('ephemeral-new', () => {
        loadEphemeral();
        loadStats();
    });

    socket.on('ephemeral-expired', () => {
        loadEphemeral();
        loadStats();
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
    });
}

// ================================================================
// SECTION 10 : MENU MOBILE
// ================================================================

function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// ================================================================
// SECTION 11 : PARTICULES
// ================================================================

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 2 + 0.5;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 30 + 's';
        p.style.animationDuration = Math.random() * 30 + 20 + 's';
        container.appendChild(p);
    }
}

// ================================================================
// SECTION 12 : INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Particules
    createParticles();

    // Menu mobile
    initMobileMenu();

    // Socket
    initSocket();

    // Chargement des données
    loadFeed(0);
    loadStats();
    loadEphemeral();

    // Rafraîchir les stats toutes les 10 secondes
    setInterval(loadStats, 10000);

    // Rafraîchir le contenu éphémère toutes les 30 secondes
    setInterval(loadEphemeral, 30000);

    // Recherche avec Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    console.log('✅ KM-Chat chargé avec succès !');
});

// ================================================================
// SECTION 13 : GESTION DES ERREURS GLOBALES
// ================================================================

window.addEventListener('error', (e) => {
    console.error('❌ Erreur globale:', e.message);
});

// ================================================================
// EXPOSER LES FONCTIONS GLOBALEMENT
// ================================================================

window.loadFeed = loadFeed;
window.likePost = likePost;
window.addComment = addComment;
window.sharePost = sharePost;
window.toggleComments = toggleComments;
window.loadMoreFeed = loadMoreFeed;
window.openPostCreator = openPostCreator;
window.openEphemeralCreator = openEphemeralCreator;
window.performSearch = performSearch;
window.shareOnTwitter = shareOnTwitter;
window.shareOnFacebook = shareOnFacebook;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.copyShareLink = copyShareLink;
window.showToast = showToast;