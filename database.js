// ================================================================
// ========== DATABASE.JS - GESTION DES DONNÉES ==========
// ================================================================

const fs = require('fs');
const path = require('path');

// ================================================================
// CONFIGURATION
// ================================================================

const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const FEED_FILE = path.join(DATA_DIR, 'feed.json');
const EPHEMERAL_FILE = path.join(DATA_DIR, 'ephemeral.json');

// ================================================================
// INITIALISATION DU DOSSIER DATA
// ================================================================

function initDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('📁 Dossier data créé');
    }

    // Créer les fichiers s'ils n'existent pas
    const files = [
        { path: ROOMS_FILE, default: {} },
        { path: MESSAGES_FILE, default: {} },
        { path: USERS_FILE, default: {} },
        { path: FEED_FILE, default: [] },
        { path: EPHEMERAL_FILE, default: [] }
    ];

    files.forEach(function(file) {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, JSON.stringify(file.default, null, 2));
            console.log('📄 Fichier créé:', path.basename(file.path));
        }
    });
}

// ================================================================
// FONCTIONS GÉNÉRIQUES DE LECTURE/ÉCRITURE
// ================================================================

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Erreur lecture fichier:', path.basename(filePath), error.message);
        return {};
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erreur écriture fichier:', path.basename(filePath), error.message);
        return false;
    }
}

// ================================================================
// ========== GESTION DES SALONS ==========
// ================================================================

function getRooms() {
    return readData(ROOMS_FILE);
}

function saveRooms(rooms) {
    return writeData(ROOMS_FILE, rooms);
}

function getRoom(roomId) {
    const rooms = getRooms();
    return rooms[roomId] || null;
}

function createRoom(roomId, roomData) {
    const rooms = getRooms();
    rooms[roomId] = {
        id: roomId,
        name: roomData.name || 'Salon sans nom',
        description: roomData.description || '',
        category: roomData.category || 'général',
        icon: roomData.icon || '💬',
        type: roomData.type || 'public',
        isDefault: roomData.isDefault || false,
        createdAt: new Date().toISOString(),
        createdBy: roomData.createdBy || 'anonyme',
        participants: roomData.participants || []
    };
    return saveRooms(rooms);
}

function updateRoom(roomId, updates) {
    const rooms = getRooms();
    if (!rooms[roomId]) return false;
    rooms[roomId] = { ...rooms[roomId], ...updates };
    return saveRooms(rooms);
}

function deleteRoom(roomId) {
    const rooms = getRooms();
    if (!rooms[roomId]) return false;
    delete rooms[roomId];
    return saveRooms(rooms);
}

function getAllRooms() {
    const rooms = getRooms();
    return Object.values(rooms);
}

function getRoomsByCategory(category) {
    const rooms = getRooms();
    return Object.values(rooms).filter(function(room) {
        return room.category === category;
    });
}

function getPublicRooms() {
    const rooms = getRooms();
    return Object.values(rooms).filter(function(room) {
        return room.type === 'public';
    });
}

// ================================================================
// ========== GESTION DES MESSAGES ==========
// ================================================================

function getMessages() {
    return readData(MESSAGES_FILE);
}

function saveMessages(messages) {
    return writeData(MESSAGES_FILE, messages);
}

function getRoomMessages(roomId) {
    const messages = getMessages();
    return messages[roomId] || [];
}

function addMessageToRoom(roomId, message) {
    const messages = getMessages();
    if (!messages[roomId]) {
        messages[roomId] = [];
    }
    messages[roomId].push(message);
    return saveMessages(messages);
}

function getLastMessages(roomId, limit) {
    const messages = getRoomMessages(roomId);
    return messages.slice(-limit || 50);
}

function deleteMessageFromRoom(roomId, messageId) {
    const messages = getMessages();
    if (!messages[roomId]) return false;
    const index = messages[roomId].findIndex(function(m) {
        return m.id === messageId;
    });
    if (index === -1) return false;
    messages[roomId].splice(index, 1);
    return saveMessages(messages);
}

function editMessageInRoom(roomId, messageId, newText) {
    const messages = getMessages();
    if (!messages[roomId]) return false;
    const message = messages[roomId].find(function(m) {
        return m.id === messageId;
    });
    if (!message) return false;
    message.text = newText;
    message.edited = true;
    message.editedAt = new Date().toISOString();
    return saveMessages(messages);
}

// ================================================================
// ========== GESTION DES UTILISATEURS ==========
// ================================================================

function getUsers() {
    return readData(USERS_FILE);
}

function saveUsers(users) {
    return writeData(USERS_FILE, users);
}

function getUser(username) {
    const users = getUsers();
    return users[username] || null;
}

function createUser(username, userData) {
    const users = getUsers();
    if (users[username]) return false;
    users[username] = {
        username: username,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: userData.status || 'online',
        avatar: userData.avatar || null,
        bio: userData.bio || '',
        stats: {
            messages: 0,
            rooms: 0,
            badges: []
        }
    };
    return saveUsers(users);
}

function updateUser(username, updates) {
    const users = getUsers();
    if (!users[username]) return false;
    users[username] = { ...users[username], ...updates };
    return saveUsers(users);
}

function updateUserStats(username, statUpdate) {
    const users = getUsers();
    if (!users[username]) return false;
    if (!users[username].stats) {
        users[username].stats = { messages: 0, rooms: 0, badges: [] };
    }
    users[username].stats = { ...users[username].stats, ...statUpdate };
    return saveUsers(users);
}

function getAllUsers() {
    const users = getUsers();
    return Object.values(users);
}

function getOnlineUsers() {
    const users = getUsers();
    return Object.values(users).filter(function(user) {
        return user.status === 'online';
    });
}

// ================================================================
// ========== GESTION DU FLUX D'ACTUALITÉ ==========
// ================================================================

function getFeed() {
    return readData(FEED_FILE);
}

function saveFeed(feed) {
    return writeData(FEED_FILE, feed);
}

function addFeedPost(post) {
    const feed = getFeed();
    feed.unshift(post); // Ajouter en premier
    // Limiter à 100 posts
    if (feed.length > 100) {
        feed.splice(100);
    }
    return saveFeed(feed);
}

function getFeedPosts(limit) {
    const feed = getFeed();
    return feed.slice(0, limit || 20);
}

function getFeedPost(postId) {
    const feed = getFeed();
    return feed.find(function(post) {
        return post.id === postId;
    });
}

function updateFeedPost(postId, updates) {
    const feed = getFeed();
    const index = feed.findIndex(function(post) {
        return post.id === postId;
    });
    if (index === -1) return false;
    feed[index] = { ...feed[index], ...updates };
    return saveFeed(feed);
}

function deleteFeedPost(postId) {
    const feed = getFeed();
    const index = feed.findIndex(function(post) {
        return post.id === postId;
    });
    if (index === -1) return false;
    feed.splice(index, 1);
    return saveFeed(feed);
}

// ================================================================
// ========== GESTION DU CONTENU ÉPHÉMÈRE ==========
// ================================================================

function getEphemeral() {
    return readData(EPHEMERAL_FILE);
}

function saveEphemeral(ephemeral) {
    return writeData(EPHEMERAL_FILE, ephemeral);
}

function addEphemeralContent(content) {
    const ephemeral = getEphemeral();
    ephemeral.push(content);
    // Nettoyer les contenus expirés
    const now = Date.now();
    const filtered = ephemeral.filter(function(item) {
        return item.expiresAt > now;
    });
    return saveEphemeral(filtered);
}

function getActiveEphemeral() {
    const ephemeral = getEphemeral();
    const now = Date.now();
    return ephemeral.filter(function(item) {
        return item.expiresAt > now;
    });
}

function removeEphemeralContent(id) {
    const ephemeral = getEphemeral();
    const index = ephemeral.findIndex(function(item) {
        return item.id === id;
    });
    if (index === -1) return false;
    ephemeral.splice(index, 1);
    return saveEphemeral(ephemeral);
}

// ================================================================
// ========== STATISTIQUES ==========
// ================================================================

function getStats() {
    const rooms = getRooms();
    const messages = getMessages();
    const users = getUsers();
    const feed = getFeed();
    const ephemeral = getEphemeral();

    let totalMessages = 0;
    for (var roomId in messages) {
        if (messages.hasOwnProperty(roomId)) {
            totalMessages += messages[roomId].length;
        }
    }

    let onlineUsers = 0;
    for (var username in users) {
        if (users.hasOwnProperty(username) && users[username].status === 'online') {
            onlineUsers++;
        }
    }

    const now = Date.now();
    const activeEphemeral = ephemeral.filter(function(item) {
        return item.expiresAt > now;
    });

    return {
        roomsCount: Object.keys(rooms).length,
        totalMessages: totalMessages,
        activeUsers: onlineUsers,
        feedCount: feed.length,
        ephemeralCount: activeEphemeral.length,
        totalUsers: Object.keys(users).length
    };
}

// ================================================================
// ========== SAUVEGARDE AUTOMATIQUE ==========
// ================================================================

// Sauvegarder toutes les données périodiquement (toutes les 5 minutes)
setInterval(function() {
    // Les données sont déjà sauvegardées à chaque modification
    // Mais on peut forcer un flush si nécessaire
    console.log('💾 Sauvegarde automatique des données effectuée');
}, 5 * 60 * 1000);

// ================================================================
// ========== INITIALISATION ==========
// ================================================================

// Initialiser le dossier data au démarrage
initDataDir();

console.log('✅ Base de données initialisée');

// ================================================================
// ========== EXPORT ==========
// ================================================================

module.exports = {
    // Salons
    getRooms,
    saveRooms,
    getRoom,
    createRoom,
    updateRoom,
    deleteRoom,
    getAllRooms,
    getRoomsByCategory,
    getPublicRooms,

    // Messages
    getMessages,
    saveMessages,
    getRoomMessages,
    addMessageToRoom,
    getLastMessages,
    deleteMessageFromRoom,
    editMessageInRoom,

    // Utilisateurs
    getUsers,
    saveUsers,
    getUser,
    createUser,
    updateUser,
    updateUserStats,
    getAllUsers,
    getOnlineUsers,

    // Feed
    getFeed,
    saveFeed,
    addFeedPost,
    getFeedPosts,
    getFeedPost,
    updateFeedPost,
    deleteFeedPost,

    // Éphémère
    getEphemeral,
    saveEphemeral,
    addEphemeralContent,
    getActiveEphemeral,
    removeEphemeralContent,

    // Stats
    getStats
};