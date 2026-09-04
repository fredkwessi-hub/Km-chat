// ================================================================
// ========== SERVER.JS - AVEC DATABASE ==========
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
app.use(express.static('public'));

// ================================================================
// ========== SALONS PAR DÉFAUT ==========
// ================================================================

const DEFAULT_ROOMS = [
    { id: 'welcome-001', name: '🏠 Accueil', description: 'Bienvenue sur KM-Chat !', category: 'général', icon: '🏠', isDefault: true },
    { id: 'general-001', name: '💬 Discussion Générale', description: 'Parlez de tout et de rien', category: 'général', icon: '💬', isDefault: true },
    { id: 'tech-001', name: '💻 Tech & Innovation', description: 'Actualités tech et innovations', category: 'technologie', icon: '💻', isDefault: true },
    { id: 'gaming-001', name: '🎮 Gaming', description: 'Jeux vidéo, e-sport et gaming', category: 'divertissement', icon: '🎮', isDefault: true },
    { id: 'art-001', name: '🎨 Art & Design', description: 'Créativité et inspiration', category: 'art', icon: '🎨', isDefault: true },
    { id: 'sports-001', name: '⚽ Sports', description: 'Toute l\'actualité sportive', category: 'sport', icon: '⚽', isDefault: true }
];

function initDefaultRooms() {
    const existingRooms = db.getRooms();
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
        }
    });
    console.log('✅ Salons par défaut initialisés');
}
initDefaultRooms();

// ================================================================
// ========== ROUTES API ==========
// ================================================================

// --- 1. ROUTES DES SALONS ---

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
        // Message de bienvenue
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

// --- 2. ROUTES DU FLUX D'ACTUALITÉ ---

// Récupérer le flux d'actualité
app.get('/api/feed', (req, res) => {
    const feed = db.getFeedPosts(50);
    res.json(feed);
});

// Ajouter un post dans le flux
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
    const post = db.getFeedPost(req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Post non trouvé' });
    }
    post.likes = (post.likes || 0) + 1;
    const success = db.updateFeedPost(req.params.id, { likes: post.likes });
    if (success) {
        res.json({ success: true, likes: post.likes });
    } else {
        res.status(500).json({ error: 'Erreur lors du like' });
    }
});

// Commenter un post
app.post('/api/feed/:id/comment', (req, res) => {
    const post = db.getFeedPost(req.params.id);
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
    const success = db.updateFeedPost(req.params.id, { comments: post.comments });
    if (success) {
        res.json({ success: true, comment: comment });
    } else {
        res.status(500).json({ error: 'Erreur lors du commentaire' });
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

// --- 3. ROUTES STATISTIQUES ---

app.get('/api/stats', (req, res) => {
    const stats = db.getStats();
    res.json(stats);
});

// --- 4. ROUTES DES TENDANCES ---

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
                content: post.content,
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

// --- 5. ROUTES DÉCOUVERTE ---

app.get('/api/discover', (req, res) => {
    const rooms = db.getPublicRooms();

    const newRooms = rooms
        .filter(function(room) { return !room.isDefault; })
        .sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
        .slice(0, 6)
        .map(function(room) {
            return {
                id: room.id,
                name: room.name,
                icon: room.icon,
                description: room.description,
                participants: room.participants ? room.participants.length : 0
            };
        });

    const categories = {};
    rooms.forEach(function(room) {
        if (!categories[room.category]) {
            categories[room.category] = 0;
        }
        categories[room.category]++;
    });

    res.json({
        newRooms: newRooms,
        categories: Object.entries(categories).map(function(entry) {
            return { name: entry[0], count: entry[1] };
        })
    });
});

// ================================================================
// ========== SOCKET.IO ==========
// ================================================================

io.on('connection', function(socket) {
    console.log('🔌 Nouvel utilisateur connecté:', socket.id);

    let currentUser = null;
    let currentRoom = null;

    socket.on('join-room', function(data) {
        const { roomId, username } = data;
        const room = db.getRoom(roomId);

        if (!room) {
            socket.emit('error', { message: 'Salon non trouvé' });
            return;
        }

        if (currentRoom) {
            socket.leave(currentRoom);
            const oldRoom = db.getRoom(currentRoom);
            if (oldRoom && oldRoom.participants) {
                oldRoom.participants = oldRoom.participants.filter(function(u) {
                    return u !== currentUser;
                });
                db.updateRoom(currentRoom, { participants: oldRoom.participants });
                io.to(currentRoom).emit('user-left', { username: currentUser });
                io.to(currentRoom).emit('update-participants', oldRoom.participants.length);
            }
        }

        currentRoom = roomId;
        currentUser = username;
        socket.join(roomId);

        if (!room.participants) room.participants = [];
        if (!room.participants.includes(username)) {
            room.participants.push(username);
            db.updateRoom(roomId, { participants: room.participants });
        }

        // Envoyer l'historique des messages
        const messages = db.getLastMessages(roomId, 50);
        socket.emit('load-messages', messages);
        io.to(roomId).emit('update-participants', room.participants.length);
        socket.to(roomId).emit('user-joined', { username: username });

        console.log('👤 ' + username + ' a rejoint ' + room.name);
    });

    // Envoyer un message
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

            // Simuler la réception
            setTimeout(function() {
                io.to(currentRoom).emit('message-delivered', message.id);
            }, 300);
            setTimeout(function() {
                io.to(currentRoom).emit('message-read', message.id);
            }, 600);
        }
    });

    // Déconnexion
    socket.on('disconnect', function() {
        if (currentRoom && currentUser) {
            const room = db.getRoom(currentRoom);
            if (room && room.participants) {
                room.participants = room.participants.filter(function(u) {
                    return u !== currentUser;
                });
                db.updateRoom(currentRoom, { participants: room.participants });
                io.to(currentRoom).emit('user-left', { username: currentUser });
                io.to(currentRoom).emit('update-participants', room.participants.length);
            }
            console.log('👤 ' + currentUser + ' a quitté');
        }
    });
});

// ================================================================
// ========== SERVEUR ==========
// ================================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log('========================================');
    console.log('✅ KM-Chat démarré avec succès !');
    console.log('========================================');
    console.log('🌐 http://localhost:' + PORT);
    console.log('📊 Base de données: ' + (process.env.DATABASE_URL || 'locale'));
    console.log('========================================');
});