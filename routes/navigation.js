/**
 * NAVIGATION API ROUTES
 * Handles navigation state, room permissions, and user location tracking
 */

const express = require('express');
const router = express.Router();

// Middleware to verify JWT token
const verifyToken = require('../middleware/auth');

// In-memory storage for navigation state (would be Redis/DB in production)
const navigationState = new Map();
const userHistory = new Map();

/**
 * GET /api/nav/state
 * Get current user's navigation state
 */
router.get('/state', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const state = navigationState.get(userId) || {
            currentRoom: 'user-dashboard.html',
            history: [],
            lastVisited: new Date().toISOString()
        };

        res.json({
            success: true,
            state
        });
    } catch (error) {
        console.error('Error getting nav state:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get navigation state'
        });
    }
});

/**
 * POST /api/nav/state
 * Update user's current navigation state
 */
router.post('/state', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentRoom, previousRoom } = req.body;

        // Get existing state or create new
        let state = navigationState.get(userId) || {
            history: [],
            visitedRooms: new Set()
        };

        // Update state
        state.currentRoom = currentRoom;
        state.previousRoom = previousRoom;
        state.lastVisited = new Date().toISOString();

        // Add to history
        if (previousRoom && previousRoom !== currentRoom) {
            state.history.push({
                room: previousRoom,
                timestamp: new Date().toISOString()
            });

            // Keep only last 20 history items
            if (state.history.length > 20) {
                state.history = state.history.slice(-20);
            }
        }

        // Track visited rooms
        if (!state.visitedRooms) {
            state.visitedRooms = new Set();
        }
        state.visitedRooms.add(currentRoom);

        navigationState.set(userId, state);

        res.json({
            success: true,
            state: {
                ...state,
                visitedRooms: Array.from(state.visitedRooms)
            }
        });
    } catch (error) {
        console.error('Error updating nav state:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update navigation state'
        });
    }
});

/**
 * GET /api/nav/history
 * Get user's navigation history
 */
router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const state = navigationState.get(userId);
        const history = state?.history || [];

        res.json({
            success: true,
            history: history.slice(-limit).reverse()
        });
    } catch (error) {
        console.error('Error getting nav history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get navigation history'
        });
    }
});

/**
 * GET /api/nav/permissions
 * Check user's room access permissions
 */
router.get('/permissions', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const consciousnessLevel = user.consciousnessLevel || 93;
        const tier = user.tier || 'free';

        // Define room access requirements
        const roomPermissions = {
            // Public rooms (always accessible)
            'user-dashboard.html': { required: 0, tier: 'free' },
            'korpak-marketplace.html': { required: 0, tier: 'free' },
            'module-library.html': { required: 0, tier: 'free' },
            'training-academy.html': { required: 0, tier: 'free' },
            'community-forum.html': { required: 85, tier: 'free' },
            'social-hub.html': { required: 85, tier: 'free' },
            'arcade-hub.html': { required: 0, tier: 'free' },
            'help.html': { required: 0, tier: 'free' },

            // Personal rooms
            'workspace.html': { required: 85, tier: 'free' },
            'philosopher-ai-connected.html': { required: 85, tier: 'free' },
            'analytics-dashboard.html': { required: 90, tier: 'starter' },

            // Team rooms (high level required)
            'team-collaboration.html': { required: 100, tier: 'professional' },
            'command-center.html': { required: 110, tier: 'professional' }
        };

        // Check each room
        const permissions = {};
        for (const [room, requirements] of Object.entries(roomPermissions)) {
            const hasLevel = consciousnessLevel >= requirements.required;
            const hasTier = checkTierAccess(tier, requirements.tier);

            permissions[room] = {
                canAccess: hasLevel && hasTier,
                reason: !hasLevel
                    ? `Requires Level ${requirements.required}+`
                    : !hasTier
                    ? `Requires ${requirements.tier} tier`
                    : 'Accessible'
            };
        }

        res.json({
            success: true,
            permissions,
            userLevel: consciousnessLevel,
            userTier: tier
        });
    } catch (error) {
        console.error('Error getting permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get permissions'
        });
    }
});

/**
 * GET /api/nav/breadcrumbs
 * Get breadcrumb trail for current location
 */
router.get('/breadcrumbs', verifyToken, async (req, res) => {
    try {
        const currentRoom = req.query.room || 'user-dashboard.html';

        const roomInfo = {
            'user-dashboard.html': { name: 'Dashboard', icon: '🏠', category: 'Platform' },
            'korpak-marketplace.html': { name: 'KORPAK Marketplace', icon: '📦', category: 'KORPAKs' },
            'korpak-detail.html': { name: 'KORPAK Details', icon: '📦', category: 'KORPAKs' },
            'korpak-progress.html': { name: 'KORPAK Progress', icon: '📦', category: 'KORPAKs' },
            'module-library.html': { name: 'Module Library', icon: '🧩', category: 'Modules' },
            'training-academy.html': { name: 'Training Academy', icon: '🎓', category: 'Training' },
            'workspace.html': { name: 'Workspace', icon: '🛠️', category: 'Personal' },
            'community-forum.html': { name: 'Community', icon: '💬', category: 'Community' },
            'social-hub.html': { name: 'Social Hub', icon: '🌐', category: 'Community' },
            'arcade-hub.html': { name: 'Arcade', icon: '🎮', category: 'Arcade' },
            'philosopher-ai-connected.html': { name: 'Philosopher AI', icon: '🤖', category: 'Trinity' },
            'analytics-dashboard.html': { name: 'Analytics', icon: '📊', category: 'Analytics' }
        };

        const info = roomInfo[currentRoom] || { name: 'Platform', icon: '🌀', category: 'Platform' };

        const breadcrumbs = [
            { name: '100X Platform', icon: '🌀', url: 'user-dashboard.html' },
            { name: info.category, icon: info.icon, url: null },
            { name: info.name, icon: info.icon, url: currentRoom }
        ];

        res.json({
            success: true,
            breadcrumbs
        });
    } catch (error) {
        console.error('Error getting breadcrumbs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get breadcrumbs'
        });
    }
});

/**
 * GET /api/nav/rooms
 * Get list of all available rooms
 */
router.get('/rooms', verifyToken, async (req, res) => {
    try {
        const rooms = [
            {
                id: 'user-dashboard',
                name: 'Dashboard',
                icon: '🏠',
                url: 'user-dashboard.html',
                category: 'Platform',
                description: 'Your command center',
                status: 'active'
            },
            {
                id: 'korpak-marketplace',
                name: 'KORPAK Marketplace',
                icon: '📦',
                url: 'korpak-marketplace.html',
                category: 'KORPAKs',
                description: 'Browse complete mission packages',
                status: 'active'
            },
            {
                id: 'module-library',
                name: 'Module Library',
                icon: '🧩',
                url: 'module-library.html',
                category: 'Modules',
                description: 'Building blocks and tools',
                status: 'active'
            },
            {
                id: 'training-academy',
                name: 'Training Academy',
                icon: '🎓',
                url: 'training-academy.html',
                category: 'Training',
                description: 'Learn consciousness principles',
                status: 'active'
            },
            {
                id: 'workspace',
                name: 'Workspace',
                icon: '🛠️',
                url: 'workspace.html',
                category: 'Personal',
                description: 'Your private builder room',
                status: 'new'
            },
            {
                id: 'community-forum',
                name: 'Community',
                icon: '💬',
                url: 'community-forum.html',
                category: 'Community',
                description: 'Connect with builders',
                status: 'active'
            },
            {
                id: 'social-hub',
                name: 'Social Hub',
                icon: '🌐',
                url: 'social-hub.html',
                category: 'Community',
                description: 'Consciousness revolution social platform',
                status: 'new'
            },
            {
                id: 'arcade-hub',
                name: 'Arcade',
                icon: '🎮',
                url: 'arcade-hub.html',
                category: 'Arcade',
                description: 'Games and challenges',
                status: 'active'
            },
            {
                id: 'philosopher-ai',
                name: 'Philosopher AI',
                icon: '🤖',
                url: 'philosopher-ai-connected.html',
                category: 'Trinity',
                description: 'Trinity AI assistant',
                status: 'active'
            },
            {
                id: 'analytics-dashboard',
                name: 'Analytics',
                icon: '📊',
                url: 'analytics-dashboard.html',
                category: 'Analytics',
                description: 'Track your progress',
                status: 'active'
            },
            {
                id: 'team-collaboration',
                name: 'Team Collaboration',
                icon: '👥',
                url: 'team-collaboration.html',
                category: 'Team',
                description: 'Work with verified builders',
                status: 'locked',
                requiresLevel: 100
            }
        ];

        res.json({
            success: true,
            rooms
        });
    } catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get rooms'
        });
    }
});

// Helper function to check tier access
function checkTierAccess(userTier, requiredTier) {
    const tiers = ['free', 'starter', 'professional'];
    const userTierIndex = tiers.indexOf(userTier);
    const requiredTierIndex = tiers.indexOf(requiredTier);

    return userTierIndex >= requiredTierIndex;
}

module.exports = router;
