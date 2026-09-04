// ================================================================
// ========== SERVER.JS - SERVEUR PRINCIPAL ==========
// ================================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
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
app.use(express.static('public'));

// ================================================================
// ROUTES PAGES HTML
// ================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/explore', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'explore.html'));
});

app.get('/trends', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trends.html'));
});

app.get('/social', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'social.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/chat/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// ================================================================
// SALONS PAR DÉFAUT
// ================================================================

// Stockage en mémoire
const rooms = new Map();
const roomMessages = new Map();

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
    DEFAULT_ROOMS.forEach(function(room) {
        if (!rooms.has(room.id)) {
            rooms.set(room.id, {
                id: room.id,
                name: room.name,
                description: room.description,
                category: room.category,
                icon: room.icon,
                type: 'public',
                isDefault: true,
                createdAt: new Date(),
                participants: []
            });
            roomMessages.set(room.id, []);

            const welcomeMsg = {
                id: 'welcome-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                username: 'KM-Chat',
                text: '👋 Bienvenue dans le salon ' + room.name + ' ! ' + room.description,
                type: 'text',
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            roomMessages.get(room.id).push(welcomeMsg);
        }
    });
    console.log('✅ Salons par défaut initialisés');
}
initDefaultRooms();

// ================================================================
// ROUTES API - SALONS
// ================================================================

app.get('/api/rooms', (req, res) => {
    const roomList = [];
    rooms.forEach(function(room, id) {
        if (room.type === 'public') {
            const messages = roomMessages.get(id) || [];
            roomList.push({
                id: id,
                name: room.name,
                description: room.description,
                category: room.category,
                icon: room.icon,
                participants: room.participants ? room.participants.length : 0,
                isDefault: room.isDefault || false,
                messagesCount: messages.length
            });
        }
    });
    roomList.sort(function(a, b) {
        return b.participants - a.participants;
    });
    res.json(roomList);
});

app.get('/api/rooms/category/:category', (req, res) => {
    const { category } = req.params;
    const roomList = [];
    rooms.forEach(function(room, id) {
        if (room.type === 'public' && room.category === category) {
            roomList.push({
                id: id,
                name: room.name,
                description: room.description,
                category: room.category,
                icon: room.icon,
                participants: room.participants ? room.participants.length : 0
            });
        }
    });
    res.json(roomList);
});

app.get('/api/room/:id', (req, res) => {
    const room = rooms.get(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Salon non trouvé' });
    }
    const messages = roomMessages.get(req.params.id) || [];
    res.json({
        id: req.params.id,
        name: room.name,
        description: room.description,
        category: room.category,
        icon: room.icon,
        participants: room.participants ? room.participants.length : 0,
        messages: messages.slice(-50)
    });
});

app.post('/api/rooms', (req, res) => {
    const { name, description, category, icon } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Le nom du salon est requis' });
    }

    const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    rooms.set(roomId, {
        id: roomId,
        name: name.trim(),
        description: description || '',
        category: category || 'général',
        icon: icon || '💬',
        type: 'public',
        isDefault: false,
        createdAt: new Date(),
        participants: []
    });
    roomMessages.set(roomId, []);

    const welcomeMsg = {
        id: 'welcome-' + Date.now(),
        username: 'KM-Chat',
        text: '🎉 Bienvenue dans le salon ' + name.trim() + ' !',
        type: 'text',
        timestamp: new Date().toISOString(),
        isSystem: true
    };
    roomMessages.get(roomId).push(welcomeMsg);

    res.json({ success: true, roomId: roomId });
});

app.delete('/api/rooms/:id', (req, res) => {
    const room = rooms.get(req.params.id);
    if (!room) {
        return res.status(404).json({ error: 'Salon non trouvé' });
    }
    if (room.isDefault) {
        return res.status(403).json({ error: 'Impossible de supprimer un salon par défaut' });
    }
    rooms.delete(req.params.id);
    roomMessages.delete(req.params.id);
    res.json({ success: true });
});

// ================================================================
// ROUTES API - FLUX D'ACTUALITÉ
// ================================================================

const feedPosts = [];

app.get('/api/feed', (req, res) => {
    res.json(feedPosts);
});

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

    feedPosts.unshift(post);
    if (feedPosts.length > 200) {
        feedPosts.pop();
    }

    io.emit('feed-update', { post: post, action: 'new' });
    res.json({ success: true, postId: post.id });
});

app.post('/api/feed/:id/like', (req, res) => {
    const post = feedPosts.find(function(p) { return p.id === req.params.id; });
    if (!post) {
        return res.status(404).json({ error: 'Post non trouvé' });
    }
    post.likes = (post.likes || 0) + 1;
    res.json({ success: true, likes: post.likes });
});

app.post('/api/feed/:id/comment', (req, res) => {
    const post = feedPosts.find(function(p) { return p.id === req.params.id; });
    if (!post) {
        return res.status(404).json({ error: 'Post non trouvé' });
    }
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
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    res.json({ success: true, comment: comment });
});

app.post('/api/feed/:id/share', (req, res) => {
    const post = feedPosts.find(function(p) { return p.id === req.params.id; });
    if (!post) {
        return res.status(404).json({ error: 'Post non trouvé' });
    }
    post.shares = (post.shares || 0) + 1;
    res.json({ success: true, shares: post.shares });
});

app.delete('/api/feed/:id', (req, res) => {
    const index = feedPosts.findIndex(function(p) { return p.id === req.params.id; });
    if (index === -1) {
        return res.status(404).json({ error: 'Post non trouvé' });
    }
    feedPosts.splice(index, 1);
    io.emit('feed-update', { postId: req.params.id, action: 'delete' });
    res.json({ success: true });
});

// ================================================================
// ROUTES API - STATISTIQUES
// ================================================================

app.get('/api/stats', (req, res) => {
    let totalMessages = 0;
    roomMessages.forEach(function(messages) {
        totalMessages += messages.length;
    });

    res.json({
        roomsCount: rooms.size,
        totalMessages: totalMessages,
        activeUsers: io.engine.clientsCount || 0,
        feedCount: feedPosts.length,
        ephemeralCount: 0
    });
});

// ================================================================
// ROUTES API - TENDANCES
// ================================================================

app.get('/api/trends', (req, res) => {
    // Top rooms
    const topRooms = [];
    rooms.forEach(function(room, id) {
        const messages = roomMessages.get(id) || [];
        topRooms.push({
            id: id,
            name: room.name,
            icon: room.icon,
            participants: room.participants ? room.participants.length : 0,
            count: messages.length
        });
    });
    topRooms.sort(function(a, b) { return b.count - a.count; });

    // Top posts
    const topPosts = feedPosts.slice(0, 5).map(function(post) {
        return {
            id: post.id,
            content: post.content,
            author: post.author,
            likes: post.likes || 0,
            comments: (post.comments || []).length
        };
    });

    // Top users
    const userStats = {};
    feedPosts.forEach(function(post) {
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
        topRooms: topRooms.slice(0, 5),
        topPosts: topPosts,
        trendingUsers: topUsers
    });
});

// ================================================================
// ROUTES API - INTÉGRATIONS SOCIALES
// ================================================================

app.get('/api/social/status', (req, res) => {
    res.json({
        twitter: { connected: false },
        facebook: { connected: false },
        instagram: { connected: false },
        whatsapp: { connected: false },
        linkedin: { connected: false }
    });
});

app.post('/api/social/:platform/connect', (req, res) => {
    const { platform } = req.params;
    res.json({
        success: true,
        message: platform + ' connecté avec succès',
        platform: platform
    });
});

app.post('/api/social/:platform/disconnect', (req, res) => {
    const { platform } = req.params;
    res.json({
        success: true,
        message: platform + ' déconnecté',
        platform: platform
    });
});

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
// ROUTES API - CONTENU ÉPHÉMÈRE
// ================================================================

const ephemeralContent = [];

app.get('/api/ephemeral', (req, res) => {
    const now = Date.now();
    const active = ephemeralContent.filter(function(item) {
        return item.expiresAt > now;
    });
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

    ephemeralContent.push(ephContent);

    // Nettoyer les contenus expirés
    const now = Date.now();
    for (let i = ephemeralContent.length - 1; i >= 0; i--) {
        if (ephemeralContent[i].expiresAt < now) {
            ephemeralContent.splice(i, 1);
        }
    }

    io.emit('ephemeral-new', ephContent);
    res.json({ success: true, id: id, expiresAt: expiresAt });
});

// ================================================================
// SOCKET.IO - COMMUNICATION EN TEMPS RÉEL
// ================================================================

io.on('connection', function(socket) {
    console.log('🔌 Nouvel utilisateur connecté:', socket.id);

    let currentUser = null;
    let currentRoom = null;

    socket.on('join-room', function(data) {
        const { roomId, username } = data;
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Salon non trouvé' });
            return;
        }

        if (currentRoom) {
            socket.leave(currentRoom);
            const oldRoom = rooms.get(currentRoom);
            if (oldRoom && oldRoom.participants) {
                oldRoom.participants = oldRoom.participants.filter(function(u) {
                    return u !== currentUser;
                });
                io.to(currentRoom).emit('update-participants', oldRoom.participants.length);
            }
        }

        currentRoom = roomId;
        currentUser = username;
        socket.join(roomId);

        if (!room.participants) room.participants = [];
        if (!room.participants.includes(username)) {
            room.participants.push(username);
        }

        const messages = roomMessages.get(roomId) || [];
        socket.emit('load-messages', messages);
        io.to(roomId).emit('update-participants', room.participants.length);
        socket.to(roomId).emit('user-joined', { username: username });

        console.log('👤 ' + username + ' a rejoint ' + room.name);
    });

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

        const messages = roomMessages.get(currentRoom) || [];
        messages.push(message);
        roomMessages.set(currentRoom, messages);

        io.to(currentRoom).emit('new-message', message);

        setTimeout(function() {
            io.to(currentRoom).emit('message-delivered', message.id);
        }, 300);
        setTimeout(function() {
            io.to(currentRoom).emit('message-read', message.id);
        }, 600);
    });

    socket.on('typing', function() {
        if (!currentRoom || !currentUser) return;
        socket.to(currentRoom).emit('user-typing', { username: currentUser });
    });

    socket.on('stop-typing', function() {
        if (!currentRoom || !currentUser) return;
        socket.to(currentRoom).emit('user-stop-typing', { username: currentUser });
    });

    socket.on('disconnect', function() {
        if (currentRoom && currentUser) {
            const room = rooms.get(currentRoom);
            if (room && room.participants) {
                room.participants = room.participants.filter(function(u) {
                    return u !== currentUser;
                });
                io.to(currentRoom).emit('user-left', { username: currentUser });
                io.to(currentRoom).emit('update-participants', room.participants.length);
            }
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
    console.log('📊 ' + rooms.size + ' salons disponibles');
    console.log('📝 ' + feedPosts.length + ' posts dans le flux');
    console.log('👥 ' + io.engine.clientsCount + ' utilisateurs en ligne');
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