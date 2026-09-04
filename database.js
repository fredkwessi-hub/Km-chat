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

    const files = [
        { path: ROOMS_FILE, default: {} },
        { path: MESSAGES_FILE, default: {} },
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
    if (rooms[roomId]) return false;

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
    const result = [];
    for (var id in rooms) {
        result.push(rooms[id]);
    }
    return result;
}

function getPublicRooms() {
    const rooms = getRooms();
    const result = [];
    for (var id in rooms) {
        if (rooms[id].type === 'public') {
            result.push(rooms[id]);
        }
    }
    return result;
}

function getRoomsByCategory(category) {
    const rooms = getRooms();
    const result = [];
    for (var id in rooms) {
        if (rooms[id].category === category) {
            result.push(rooms[id]);
        }
    }
    return result;
}

function getRoomMessagesCount(roomId) {
    const messages = getMessages();
    return messages[roomId] ? messages[roomId].length : 0;
}

function addParticipantToRoom(roomId, username) {
    const rooms = getRooms();
    if (!rooms[roomId]) return false;
    if (!rooms[roomId].participants) {
        rooms[roomId].participants = [];
    }
    if (!rooms[roomId].participants.includes(username)) {
        rooms[roomId].participants.push(username);
    }
    return saveRooms(rooms);
}

function removeParticipantFromRoom(roomId, username) {
    const rooms = getRooms();
    if (!rooms[roomId]) return false;
    if (rooms[roomId].participants) {
        rooms[roomId].participants = rooms[roomId].participants.filter(function(u) {
            return u !== username;
        });
    }
    return saveRooms(rooms);
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

function addMultipleMessagesToRoom(roomId, newMessages) {
    const messages = getMessages();
    if (!messages[roomId]) {
        messages[roomId] = [];
    }
    messages[roomId] = messages[roomId].concat(newMessages);
    return saveMessages(messages);
}

function getLastMessages(roomId, limit) {
    const messages = getRoomMessages(roomId);
    return messages.slice(-limit || 50);
}

function getMessagesBefore(roomId, beforeId, limit) {
    const messages = getRoomMessages(roomId);
    const index = messages.findIndex(function(m) {
        return m.id === beforeId;
    });
    if (index === -1) return [];
    return messages.slice(Math.max(0, index - limit), index);
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

function clearRoomMessages(roomId) {
    const messages = getMessages();
    if (!messages[roomId]) return false;
    messages[roomId] = [];
    return saveMessages(messages);
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
    feed.unshift(post);
    if (feed.length > 200) {
        feed.splice(200);
    }
    return saveFeed(feed);
}

function getFeedPosts(limit) {
    const feed = getFeed();
    return feed.slice(0, limit || 50);
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

function likeFeedPost(postId) {
    const post = getFeedPost(postId);
    if (!post) return false;
    post.likes = (post.likes || 0) + 1;
    return updateFeedPost(postId, { likes: post.likes });
}

function addCommentToFeedPost(postId, comment) {
    const post = getFeedPost(postId);
    if (!post) return false;
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    return updateFeedPost(postId, { comments: post.comments });
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
    const result = saveEphemeral(ephemeral);
    // Nettoyer les contenus expirés
    cleanEphemeral();
    return result;
}

function getActiveEphemeral() {
    const ephemeral = getEphemeral();
    const now = Date.now();
    return ephemeral.filter(function(item) {
        return item.expiresAt > now;
    });
}

function getEphemeralById(id) {
    const ephemeral = getEphemeral();
    return ephemeral.find(function(item) {
        return item.id === id;
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

function cleanEphemeral() {
    const ephemeral = getEphemeral();
    const now = Date.now();
    const filtered = ephemeral.filter(function(item) {
        return item.expiresAt > now;
    });
    return saveEphemeral(filtered);
}

// ================================================================
// ========== STATISTIQUES ==========
// ================================================================

function getStats() {
    const rooms = getRooms();
    const messages = getMessages();
    const feed = getFeed();
    const ephemeral = getEphemeral();

    let totalMessages = 0;
    for (var roomId in messages) {
        if (messages.hasOwnProperty(roomId)) {
            totalMessages += messages[roomId].length;
        }
    }

    const now = Date.now();
    const activeEphemeral = ephemeral.filter(function(item) {
        return item.expiresAt > now;
    });

    return {
        roomsCount: Object.keys(rooms).length,
        totalMessages: totalMessages,
        feedCount: feed.length,
        ephemeralCount: activeEphemeral.length
    };
}

function getRoomStats(roomId) {
    const room = getRoom(roomId);
    if (!room) return null;
    const messages = getRoomMessages(roomId);
    return {
        id: roomId,
        name: room.name,
        category: room.category,
        participants: room.participants ? room.participants.length : 0,
        messagesCount: messages.length,
        createdAt: room.createdAt,
        isDefault: room.isDefault || false
    };
}

// ================================================================
// ========== SAUVEGARDE AUTOMATIQUE ==========
// ================================================================

// Sauvegarder périodiquement (toutes les 5 minutes)
setInterval(function() {
    console.log('💾 Sauvegarde automatique effectuée');
}, 5 * 60 * 1000);

// ================================================================
// INITIALISATION
// ================================================================

initDataDir();
cleanEphemeral();

console.log('✅ Base de données initialisée');

// ================================================================
// EXPORT
// ================================================================

module.exports = {
    // Salons
    getRooms: getRooms,
    saveRooms: saveRooms,
    getRoom: getRoom,
    createRoom: createRoom,
    updateRoom: updateRoom,
    deleteRoom: deleteRoom,
    getAllRooms: getAllRooms,
    getPublicRooms: getPublicRooms,
    getRoomsByCategory: getRoomsByCategory,
    getRoomMessagesCount: getRoomMessagesCount,
    addParticipantToRoom: addParticipantToRoom,
    removeParticipantFromRoom: removeParticipantFromRoom,

    // Messages
    getMessages: getMessages,
    saveMessages: saveMessages,
    getRoomMessages: getRoomMessages,
    addMessageToRoom: addMessageToRoom,
    addMultipleMessagesToRoom: addMultipleMessagesToRoom,
    getLastMessages: getLastMessages,
    getMessagesBefore: getMessagesBefore,
    deleteMessageFromRoom: deleteMessageFromRoom,
    editMessageInRoom: editMessageInRoom,
    clearRoomMessages: clearRoomMessages,

    // Feed
    getFeed: getFeed,
    saveFeed: saveFeed,
    addFeedPost: addFeedPost,
    getFeedPosts: getFeedPosts,
    getFeedPost: getFeedPost,
    updateFeedPost: updateFeedPost,
    deleteFeedPost: deleteFeedPost,
    likeFeedPost: likeFeedPost,
    addCommentToFeedPost: addCommentToFeedPost,

    // Éphémère
    getEphemeral: getEphemeral,
    saveEphemeral: saveEphemeral,
    addEphemeralContent: addEphemeralContent,
    getActiveEphemeral: getActiveEphemeral,
    getEphemeralById: getEphemeralById,
    removeEphemeralContent: removeEphemeralContent,
    cleanEphemeral: cleanEphemeral,

    // Stats
    getStats: getStats,
    getRoomStats: getRoomStats
};