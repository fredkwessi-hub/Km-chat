// ================================================================
// ========== SERVER.JS - SERVEUR PRINCIPAL ==========
// ================================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ================================================================
// MIDDLEWARE
// ================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================================================
// ROUTES PAGES HTML
// ================================================================

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page Explorer
app.get('/explore', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'explore.html'));
});

// Page Tendances
app.get('/trends', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trends.html'));
});

// Page Social
app.get('/social', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'social.html'));
});

// Page Salons
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Page Salon avec ID
app.get('/chat/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// ================================================================
// FICHIERS STATIQUES
// ================================================================
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use(express.static('public'));

// ================================================================
// SALONS PAR DÉFAUT
// ================================================================

const DEFAULT_ROOMS = [
    { id: 'welcome-001', name: '🏠 Accueil', description: 'Bienvenue sur KM-Chat !', category: 'général', icon: '🏠', isDefault: true },
    { id: 'general-001', name: '💬 Discussion Générale', description: 'Parlez de tout et de rien', category: 'général', icon: '💬', isDefault: true },
    { id: 'tech-001', name: '💻 Tech & Innovation', description: 'Actualités tech et innovations', category: 'technologie', icon: '💻', isDefault: true },
    { id: 'gaming-001', name: '🎮 Gaming', description: 'Jeux vidéo, e-sport et gaming', category: 'divertissement', icon: '🎮', isDefault: true },
    { id: 'art-001', name: '🎨 Art & Design', description: 'Créativité et inspiration', category: 'art', icon: '🎨', isDefault: true },
    { id: 'sports-001', name: '⚽ Sports', description: 'Toute l\'actualité sportive', category: 'sport', icon: '⚽', isDefault: true },
    { id: 'music-001', name: '🎵 Musique', description: 'Partagez vos playlists', category: 'divertissement', icon: '🎵', isDefault: true },
    { id: 'movies-001', name: '🎬 Cinéma & Séries', description: 'Films, séries et critiques', category: 'divertissement', icon: '🎬', isDefault: true },
    { id: 'lifestyle-001', name: '🌿 Lifestyle', description: 'Bien-être et mode de vie', category: 'lifestyle', icon: '🌿', isDefault: true },
    { id: 'social-001', name: '🌍 Actualités', description: 'Actualités mondiales', category: 'social', icon: '🌍', isDefault: true }
];

function initDefaultRooms() {
    const existingRooms = db.getRooms();
    var hasChanges = false;

    DEFAULT_ROOMS.forEach(function(room) {
        if (!existingRooms[room.id]) {
            db.createRoom(room.id, {
                name: room.name,
                description: room.description,
                category: room.category,
                icon: room.icon,
                isDefault: room.isDefault,
                createdBy: 'KM-Chat'
            });

            // Ajouter un message de bienvenue
            const welcomeMsg = {
                id: 'welcome-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                username: 'KM-Chat',
                text: '👋 Bienvenue dans le salon ' + room.name + ' ! ' + room.description,
                type: 'text',
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            db.addMessageToRoom(room.id, welcomeMsg);
            hasChanges = true;
        }
    });

    if (hasChanges) {
        console.log('✅ Salons par défaut initialisés');
    }
}
initDefaultRooms();

// ================================================================
// ROUTES API - SALONS
// ================================================================

// Récupérer tous les salons publics
app.get('/api/rooms', (req, res) => {
    const rooms = db.getPublicRooms();
    const roomsWithData = rooms.map(function(room) {
        const messages = db.getRoomMessages(room.id);
        return {
            id: room.id,
            name: room.name,
            description: room.description,
            category: room.category,
            icon: room.icon,
            participants: room.participants ? room.participants.length : 0,
            isDefault: room.isDefault || false,
            messagesCount: messages.length
        };
    });
    roomsWithData.sort(function(a, b) {
        return b.participants - a.participants;
    });
    res.json(roomsWithData);
});

// Récupérer les salons par catégorie
app.get('/api/rooms/category/:category', (req, res) => {
    const { category } = req.params;
    const rooms = db.getRoomsByCategory(category);
    const roomsWithData = rooms.map(function(room) {
        return {
            id: room.id,
            name: room.name,
            description: room.description,
            category: room.category,
            icon: room.icon,
            participants: room.participants ? room.participants.length : 0
        };
    });
    res.json(roomsWithData);
});

// Récupérer un salon par ID
app.get('/api/room/:id', (req, res) => {
    const room = db.getRoom(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Salon non trouvé' });
    }
    const messages = db.getLastMessages(req.params.id, 50);
    res.json({
        id: req.params.id,
        name: room.name,
        description: room.description,
        category: room.category,
        icon: room.icon,
        participants: room.participants ? room.participants.length : 0,
        messages: messages
    });
});

// Créer un salon
app.post('/api/rooms', (req, res) => {
    const { name, description, category, icon } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Le nom du salon est requis' });
    }

    const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    const success = db.createRoom(roomId, {
        name: name.trim(),
        description: description || '',
        category: category || 'général',
        icon: icon || '💬',
        type: 'public',
        isDefault: false,
        createdBy: 'anonyme'
    });

    if (success) {
        const welcomeMsg = {
            id: 'welcome-' + Date.now(),
            username: 'KM-Chat',
            text: '🎉 Bienvenue dans le salon ' + name.trim() + ' !',
            type: 'text',
            timestamp: new Date().toISOString(),
            isSystem: true
        };
        db.addMessageToRoom(roomId, welcomeMsg);
        res.json({ success: true, roomId: roomId });
    } else {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// Supprimer un salon
app.delete('/api/rooms/:id', (req, res) => {
    const room = db.getRoom(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Salon non trouvé' });
    }
    if (room.isDefault) {
        return res.status(403).json({ error: 'Impossible de supprimer un salon par défaut' });
    }
    const success = db.deleteRoom(req.params.id);
    if (success) {
        db.clearRoomMessages(req.params.id);
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ================================================================
// ROUTES API - FLUX D'ACTUALITÉ
// ================================================================

// Récupérer le flux
app.get('/api/feed', (req, res) => {
    const feed = db.getFeedPosts(50);
    res.json(feed);
});

// Ajouter un post
app.post('/api/feed', (req, res) => {
    const { content, type, author } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Le contenu est requis' });
    }

    const post = {
        id: 'post-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        content: content.trim(),
        type: type || 'text',
        author: author || 'Anonyme',
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: [],
        shares: 0
    };

    const success = db.addFeedPost(post);
    if (success) {
        io.emit('feed-update', { post: post, action: 'new' });
        res.json({ success: true, postId: post.id });
    } else {
        res.status(500).json({ error: 'Erreur lors de la publication' });
    }
});

// Liker un post
app.post('/api/feed/:id/like', (req, res) => {
    const success = db.likeFeedPost(req.params.id);
    if (success) {
        const post = db.getFeedPost(req.params.id);
        res.json({ success: true, likes: post.likes });
    } else {
        res.status(404).json({ error: 'Post non trouvé' });
    }
});

// Commenter un post
app.post('/api/feed/:id/comment', (req, res) => {
    const { author, text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Le commentaire est requis' });
    }

    const comment = {
        id: 'c' + Date.now(),
        author: author || 'Anonyme',
        text: text.trim(),
        timestamp: new Date().toISOString()
    };

    const success = db.addCommentToFeedPost(req.params.id, comment);
    if (success) {
        res.json({ success: true, comment: comment });
    } else {
        res.status(404).json({ error: 'Post non trouvé' });
    }
});

// Partager un post
app.post('/api/feed/:id/share', (req, res) => {
    const post = db.getFeedPost(req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Post non trouvé' });
    }
    post.shares = (post.shares || 0) + 1;
    const success = db.updateFeedPost(req.params.id, { shares: post.shares });
    if (success) {
        res.json({ success: true, shares: post.shares });
    } else {
        res.status(500).json({ error: 'Erreur lors du partage' });
    }
});

// Supprimer un post
app.delete('/api/feed/:id', (req, res) => {
    const success = db.deleteFeedPost(req.params.id);
    if (success) {
        io.emit('feed-update', { postId: req.params.id, action: 'delete' });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Post non trouvé' });
    }
});

// ================================================================
// ROUTES API - STATISTIQUES
// ================================================================

app.get('/api/stats', (req, res) => {
    const stats = db.getStats();
    res.json(stats);
});

// ================================================================
// ROUTES API - TENDANCES
// ================================================================

app.get('/api/trends', (req, res) => {
    const rooms = db.getPublicRooms();
    const feed = db.getFeedPosts(100);

    // Top rooms
    const topRooms = rooms
        .map(function(room) {
            const messages = db.getRoomMessages(room.id);
            return {
                id: room.id,
                name: room.name,
                icon: room.icon,
                participants: room.participants ? room.participants.length : 0,
                count: messages.length
            };
        })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 5);

    // Top posts
    const topPosts = feed
        .map(function(post) {
            return {
                id: post.id,
                content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
                author: post.author,
                likes: post.likes || 0,
                comments: (post.comments || []).length
            };
        })
        .sort(function(a, b) { return b.likes - a.likes; })
        .slice(0, 5);

    // Top users
    const userStats = {};
    feed.forEach(function(post) {
        if (!userStats[post.author]) {
            userStats[post.author] = { posts: 0, likes: 0 };
        }
        userStats[post.author].posts++;
        userStats[post.author].likes += (post.likes || 0);
    });

    const topUsers = Object.entries(userStats)
        .map(function(entry) {
            return {
                username: entry[0],
                posts: entry[1].posts,
                likes: entry[1].likes
            };
        })
        .sort(function(a, b) { return (b.posts + b.likes) - (a.posts + a.likes); })
        .slice(0, 5);

    res.json({
        topRooms: topRooms,
        topPosts: topPosts,
        trendingUsers: topUsers
    });
});

// ================================================================
// ROUTES API - CONTENU ÉPHÉMÈRE
// ================================================================

// Créer du contenu éphémère
app.post('/api/ephemeral', (req, res) => {
    const { content, author, duration } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Le contenu est requis' });
    }

    const id = 'eph-' + Date.now();
    const expiresAt = Date.now() + (duration || 60 * 60 * 1000);

    const ephContent = {
        id: id,
        content: content.trim(),
        type: 'text',
        author: author || 'Anonyme',
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
    };

    const success = db.addEphemeralContent(ephContent);
    if (success) {
        io.emit('ephemeral-new', ephContent);
        res.json({ success: true, id: id, expiresAt: expiresAt });
    } else {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// Récupérer le contenu éphémère actif
app.get('/api/ephemeral', (req, res) => {
    const active = db.getActiveEphemeral();
    const now = Date.now();
    const result = active.map(function(item) {
        return {
            id: item.id,
            content: item.content,
            type: item.type,
            author: item.author,
            expiresAt: item.expiresAt,
            timeLeft: item.expiresAt - now
        };
    });
    res.json(result);
});

// ================================================================
// ROUTES API - INTÉGRATIONS SOCIALES
// ================================================================

// Statut des intégrations
app.get('/api/social/status', (req, res) => {
    res.json({
        twitter: { connected: false },
        facebook: { connected: false },
        instagram: { connected: false },
        whatsapp: { connected: false },
        linkedin: { connected: false }
    });
});

// Connecter une plateforme
app.post('/api/social/:platform/connect', (req, res) => {
    const { platform } = req.params;
    res.json({
        success: true,
        message: platform + ' connecté avec succès',
        platform: platform
    });
});

// Déconnecter une plateforme
app.post('/api/social/:platform/disconnect', (req, res) => {
    const { platform } = req.params;
    res.json({
        success: true,
        message: platform + ' déconnecté',
        platform: platform
    });
});

// Publier sur les réseaux sociaux
app.post('/api/social/publish', (req, res) => {
    const { content, platforms } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Le contenu est requis' });
    }

    const results = {};
    const selectedPlatforms = platforms || ['twitter', 'facebook', 'whatsapp'];

    selectedPlatforms.forEach(function(platform) {
        results[platform] = {
            success: true,
            message: 'Publié sur ' + platform,
            timestamp: new Date().toISOString()
        };
    });

    res.json({
        success: true,
        results: results,
        message: 'Publication envoyée sur ' + selectedPlatforms.length + ' plateforme(s)'
    });
});

// ================================================================
// SOCKET.IO - COMMUNICATION EN TEMPS RÉEL
// ================================================================

io.on('connection', function(socket) {
    console.log('🔌 Nouvel utilisateur connecté:', socket.id);

    let currentUser = null;
    let currentRoom = null;
    let typingTimeout = null;

    // --- REJOINDRE UN SALON ---
    socket.on('join-room', function(data) {
        const { roomId, username } = data;
        const room = db.getRoom(roomId);

        if (!room) {
            socket.emit('error', { message: 'Salon non trouvé' });
            return;
        }

        // Quitter l'ancien salon
        if (currentRoom) {
            socket.leave(currentRoom);
            db.removeParticipantFromRoom(currentRoom, currentUser);
            io.to(currentRoom).emit('user-left', { username: currentUser });
            const oldRoom = db.getRoom(currentRoom);
            io.to(currentRoom).emit('update-participants', oldRoom ? oldRoom.participants.length : 0);
        }

        currentRoom = roomId;
        currentUser = username;
        socket.join(roomId);

        // Ajouter le participant
        db.addParticipantToRoom(roomId, username);

        // Envoyer l'historique des messages
        const messages = db.getLastMessages(roomId, 50);
        socket.emit('load-messages', messages);

        // Mettre à jour les participants
        const updatedRoom = db.getRoom(roomId);
        io.to(roomId).emit('update-participants', updatedRoom ? updatedRoom.participants.length : 0);
        socket.to(roomId).emit('user-joined', { username: username });

        console.log('👤 ' + username + ' a rejoint ' + room.name);
    });

    // --- ENVOYER UN MESSAGE ---
    socket.on('send-message', function(data) {
        if (!currentRoom || !currentUser) return;

        const message = {
            id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            username: currentUser,
            text: data.text,
            type: data.type || 'text',
            content: data.content || null,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        const success = db.addMessageToRoom(currentRoom, message);
        if (success) {
            io.to(currentRoom).emit('new-message', message);

            // Simuler les statuts de message
            setTimeout(function() {
                io.to(currentRoom).emit('message-delivered', message.id);
            }, 300);
            setTimeout(function() {
                io.to(currentRoom).emit('message-read', message.id);
            }, 600);
        }
    });

    // --- INDICATEUR DE SAISIE ---
    socket.on('typing', function() {
        if (!currentRoom || !currentUser) return;
        socket.to(currentRoom).emit('user-typing', { username: currentUser });
    });

    socket.on('stop-typing', function() {
        if (!currentRoom || !currentUser) return;
        socket.to(currentRoom).emit('user-stop-typing', { username: currentUser });
    });

    // --- DÉCONNEXION ---
    socket.on('disconnect', function() {
        if (currentRoom && currentUser) {
            db.removeParticipantFromRoom(currentRoom, currentUser);
            io.to(currentRoom).emit('user-left', { username: currentUser });
            const room = db.getRoom(currentRoom);
            io.to(currentRoom).emit('update-participants', room ? room.participants.length : 0);
            console.log('👤 ' + currentUser + ' a quitté');
        }
    });
});

// ================================================================
// LANCEMENT DU SERVEUR
// ================================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log('========================================');
    console.log('✅ KM-Chat démarré avec succès !');
    console.log('========================================');
    console.log('🌐 http://localhost:' + PORT);
    console.log('📊 Base de données: locale');
    console.log('========================================');
});

// ================================================================
// GESTION DES ERREURS
// ================================================================

process.on('uncaughtException', function(err) {
    console.error('❌ Erreur non capturée:', err.message);
});

process.on('unhandledRejection', function(reason, promise) {
    console.error('❌ Promesse non gérée:', reason);
});