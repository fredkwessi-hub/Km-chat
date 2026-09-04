// ================================================================
// ========== SERVER.JS - SERVEUR PRINCIPAL ==========
// ================================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const multer = require('multer');
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
// MULTER CONFIGURATION - UPLOAD FILES
// ================================================================
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Audio upload
const audioStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const audioDir = './uploads/audio';
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        cb(null, audioDir);
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webm';
        cb(null, uniqueName);
    }
});

const audioUpload = multer({ storage: audioStorage });

// ================================================================
// FICHIERS STATIQUES
// ================================================================
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

// Page Liste des salons
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Page de discussion individuelle (ROOM)
app.get('/room/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

// ================================================================
// UPLOAD ROUTES
// ================================================================

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }
    res.json({
        url: '/uploads/' + req.file.filename,
        type: req.file.mimetype,
        name: req.file.originalname
    });
});

app.post('/api/upload-audio', audioUpload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun audio uploadé' });
    }
    res.json({
        url: '/uploads/audio/' + req.file.filename
    });
});

// ================================================================
// SALONS PAR DÉFAUT
// ================================================================

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

    const topPosts = feedPosts.slice(0, 5).map(function(post) {
        return {
            id: post.id,
            content: post.content,
            author: post.author,
            likes: post.likes || 0,
            comments: (post.comments || []).length
        };
    });

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
            text: data.text || null,
            type: data.type || 'text',
            content: data.content || null,
            fileName: data.fileName || null,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        // Si c'est un sondage
        if (data.type === 'poll' && data.poll) {
            message.poll = {
                question: data.poll.question,
                options: data.poll.options,
                votes: data.poll.options.map(function() { return []; })
            };
        }

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

    // Créer un sondage
    socket.on('create-poll', function(data) {
        if (!currentRoom || !currentUser) return;

        const pollMessage = {
            id: 'poll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            username: currentUser,
            text: '📊 Sondage: ' + data.question,
            type: 'poll',
            poll: {
                question: data.question,
                options: data.options,
                votes: data.options.map(function() { return []; })
            },
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        const messages = roomMessages.get(currentRoom) || [];
        messages.push(pollMessage);
        roomMessages.set(currentRoom, messages);

        io.to(currentRoom).emit('new-message', pollMessage);
    });

    // Voter pour un sondage
    socket.on('vote-poll', function(data) {
        if (!currentRoom) return;
        const { messageId, optionIndex } = data;
        const messages = roomMessages.get(currentRoom);
        if (messages) {
            const message = messages.find(function(m) { return m.id === messageId; });
            if (message && message.type === 'poll' && message.poll) {
                // Enlever l'ancien vote de l'utilisateur
                message.poll.options.forEach(function(_, idx) {
                    message.poll.votes[idx] = message.poll.votes[idx].filter(function(u) {
                        return u !== currentUser;
                    });
                });
                message.poll.votes[optionIndex].push(currentUser);
                io.to(currentRoom).emit('poll-updated', { messageId: messageId, votes: message.poll.votes });
            }
        }
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