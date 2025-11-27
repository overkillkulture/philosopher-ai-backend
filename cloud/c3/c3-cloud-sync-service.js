#!/usr/bin/env node
/**
 * CP3 C3 CLOUD SYNC SERVICE
 * Trinity Network - Operations Hub Cloud Instance
 *
 * This service manages cloud synchronization for the C3 Oracle instance,
 * enabling cross-computer communication in the Trinity network (C1 x C2 x C3 = Infinity)
 */

require('dotenv').config({ path: '.env.cloud' });
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const CONFIG = {
    computerId: process.env.TRINITY_COMPUTER_ID || 'C',
    instanceType: process.env.TRINITY_INSTANCE_TYPE || 'cloud',
    role: process.env.TRINITY_ROLE || 'C3_ORACLE',
    port: parseInt(process.env.PORT) || 3001,
    syncInterval: parseInt(process.env.CLOUD_SYNC_INTERVAL) || 30000,
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 15000,
    cloudFolder: process.env.TRINITY_CLOUD_FOLDER || path.join(__dirname, '../../.trinity'),
    localTrinity: path.join(__dirname, '../../.trinity'),
    logLevel: process.env.LOG_LEVEL || 'info'
};

// State
const state = {
    syncCount: 0,
    lastSync: null,
    isOnline: true,
    connectedComputers: { A: false, B: false },
    messagesProcessed: 0,
    errors: []
};

// Logging
function log(level, message, data = {}) {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(CONFIG.logLevel)) {
        const timestamp = new Date().toISOString();
        console.log(JSON.stringify({
            timestamp,
            level,
            computer: CONFIG.computerId,
            role: CONFIG.role,
            message,
            ...data
        }));
    }
}

// Banner
function printBanner() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🌐 CP3 C3 CLOUD SYNC SERVICE                                  ║
║  Trinity Network - Operations Hub                              ║
╠════════════════════════════════════════════════════════════════╣
║  Computer ID: ${CONFIG.computerId.padEnd(45)}║
║  Role: ${CONFIG.role.padEnd(52)}║
║  Instance: ${CONFIG.instanceType.padEnd(48)}║
║  Port: ${String(CONFIG.port).padEnd(52)}║
║  Sync Interval: ${String(CONFIG.syncInterval / 1000) + 's'.padEnd(43)}║
╠════════════════════════════════════════════════════════════════╣
║  C1 x C2 x C3 = ∞   |   Trinity Formula Active                 ║
╚════════════════════════════════════════════════════════════════╝
`);
}

// Ensure directories exist
function ensureDirectories() {
    const dirs = [
        path.join(CONFIG.localTrinity, 'STATUS'),
        path.join(CONFIG.localTrinity, 'MESSAGES'),
        path.join(CONFIG.localTrinity, 'WAKE_REQUESTS'),
        path.join(CONFIG.localTrinity, 'logs'),
        path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`)
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                log('info', `Created directory: ${dir}`);
            } catch (err) {
                log('error', `Failed to create directory: ${dir}`, { error: err.message });
            }
        }
    });
}

// Upload C3 status to cloud
function uploadStatus() {
    const statusData = {
        computer: CONFIG.computerId,
        role: CONFIG.role,
        instanceType: CONFIG.instanceType,
        timestamp: Date.now(),
        isOnline: state.isOnline,
        syncCount: state.syncCount,
        lastSync: state.lastSync,
        messagesProcessed: state.messagesProcessed,
        instances: {}
    };

    // Read local instance statuses
    ['c1', 'c2', 'c3'].forEach(instance => {
        const statusFile = path.join(CONFIG.localTrinity, 'STATUS', `${instance}_status.json`);
        if (fs.existsSync(statusFile)) {
            try {
                statusData.instances[instance] = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
            } catch (err) {
                statusData.instances[instance] = { status: 'error', error: err.message };
            }
        } else {
            statusData.instances[instance] = { status: 'not_active' };
        }
    });

    // Write to cloud folder
    const cloudStatusFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'status.json');
    try {
        fs.writeFileSync(cloudStatusFile, JSON.stringify(statusData, null, 2));
        log('debug', 'Status uploaded to cloud', { instances: Object.keys(statusData.instances) });
    } catch (err) {
        log('error', 'Failed to upload status', { error: err.message });
    }

    return statusData;
}

// Check for wake requests from other computers
function checkWakeRequests() {
    const wakeFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'wake_requests.json');

    if (fs.existsSync(wakeFile)) {
        try {
            const requests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));

            if (Array.isArray(requests) && requests.length > 0) {
                log('info', `Processing ${requests.length} wake request(s)`);

                requests.forEach(req => {
                    const localWakeFile = path.join(
                        CONFIG.localTrinity,
                        'WAKE_REQUESTS',
                        `wake_${req.instance || 'c3'}.flag`
                    );

                    fs.writeFileSync(localWakeFile, JSON.stringify({
                        from: `Computer ${req.from} (Cloud Sync)`,
                        timestamp: Date.now(),
                        reason: req.reason || 'Cross-computer wake request',
                        priority: req.priority || 'MEDIUM',
                        context: { crossComputer: true, sourceComputer: req.from }
                    }, null, 2));

                    log('info', `Wake flag created for ${req.instance || 'c3'}`, { from: req.from });
                });

                // Clear processed requests
                fs.writeFileSync(wakeFile, JSON.stringify([], null, 2));
            }
        } catch (err) {
            log('error', 'Error processing wake requests', { error: err.message });
        }
    }
}

// Process inbound messages from other computers
function processInboundMessages() {
    const msgFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'messages_inbound.json');

    if (fs.existsSync(msgFile)) {
        try {
            const messages = JSON.parse(fs.readFileSync(msgFile, 'utf8'));

            if (Array.isArray(messages) && messages.length > 0) {
                log('info', `Processing ${messages.length} inbound message(s)`);

                messages.forEach(msg => {
                    const target = msg.to || 'c3';
                    const inboxFile = path.join(CONFIG.localTrinity, 'MESSAGES', `${target.toLowerCase()}_inbox.json`);

                    let inbox = [];
                    if (fs.existsSync(inboxFile)) {
                        try {
                            inbox = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
                        } catch (e) {
                            inbox = [];
                        }
                    }

                    inbox.push({
                        ...msg,
                        receivedAt: Date.now(),
                        processedBy: 'c3_cloud_sync'
                    });

                    fs.writeFileSync(inboxFile, JSON.stringify(inbox, null, 2));
                    state.messagesProcessed++;

                    log('info', `Message delivered to ${target}`, { from: msg.from });
                });

                // Clear processed messages
                fs.writeFileSync(msgFile, JSON.stringify([], null, 2));
            }
        } catch (err) {
            log('error', 'Error processing messages', { error: err.message });
        }
    }
}

// Upload outbound messages to target computers
function uploadOutboundMessages() {
    const outboundFile = path.join(CONFIG.localTrinity, 'MESSAGES', 'outbound_queue.json');

    if (fs.existsSync(outboundFile)) {
        try {
            const outbound = JSON.parse(fs.readFileSync(outboundFile, 'utf8'));

            if (Array.isArray(outbound) && outbound.length > 0) {
                outbound.forEach(msg => {
                    const targetComputer = msg.targetComputer || 'A';
                    const targetFile = path.join(
                        CONFIG.cloudFolder,
                        `COMPUTER_${targetComputer}`,
                        'messages_inbound.json'
                    );

                    let targetMessages = [];
                    if (fs.existsSync(targetFile)) {
                        try {
                            targetMessages = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
                        } catch (e) {
                            targetMessages = [];
                        }
                    }

                    targetMessages.push({
                        ...msg,
                        sentAt: Date.now(),
                        sentBy: `Computer ${CONFIG.computerId}`
                    });

                    fs.writeFileSync(targetFile, JSON.stringify(targetMessages, null, 2));
                    log('info', `Message sent to Computer ${targetComputer}`);
                });

                // Clear outbound queue
                fs.writeFileSync(outboundFile, JSON.stringify([], null, 2));
            }
        } catch (err) {
            log('error', 'Error uploading messages', { error: err.message });
        }
    }
}

// Check status of other computers
function checkOtherComputers() {
    ['A', 'B'].forEach(comp => {
        const statusFile = path.join(CONFIG.cloudFolder, `COMPUTER_${comp}`, 'status.json');

        if (fs.existsSync(statusFile)) {
            try {
                const stats = fs.statSync(statusFile);
                const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;

                // Consider online if updated within last 2 minutes
                state.connectedComputers[comp] = ageSeconds < 120;

                if (state.connectedComputers[comp]) {
                    log('debug', `Computer ${comp} is online`, { lastSeen: `${Math.floor(ageSeconds)}s ago` });
                }
            } catch (err) {
                state.connectedComputers[comp] = false;
            }
        } else {
            state.connectedComputers[comp] = false;
        }
    });
}

// Main sync cycle
function syncCycle() {
    state.syncCount++;
    state.lastSync = new Date().toISOString();

    log('info', `Sync cycle #${state.syncCount} started`);

    try {
        uploadStatus();
        checkWakeRequests();
        processInboundMessages();
        uploadOutboundMessages();
        checkOtherComputers();

        // Log network status
        const networkStatus = {
            'Computer C (this)': 'ACTIVE',
            'Computer A': state.connectedComputers.A ? 'ONLINE' : 'OFFLINE',
            'Computer B': state.connectedComputers.B ? 'ONLINE' : 'OFFLINE'
        };

        log('info', 'Sync cycle complete', {
            network: networkStatus,
            messagesProcessed: state.messagesProcessed
        });

    } catch (err) {
        log('error', 'Sync cycle failed', { error: err.message });
        state.errors.push({ time: Date.now(), error: err.message });
    }
}

// Parse JSON body from request
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// Send JSON response
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

// Get messages for an instance
function getMessages(instance) {
    const inboxFile = path.join(CONFIG.localTrinity, 'MESSAGES', `${instance.toLowerCase()}_inbox.json`);
    if (fs.existsSync(inboxFile)) {
        try {
            return JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
        } catch (err) {
            return [];
        }
    }
    return [];
}

// Send a message to another computer
function sendMessage(message) {
    const outboundFile = path.join(CONFIG.localTrinity, 'MESSAGES', 'outbound_queue.json');
    let queue = [];
    if (fs.existsSync(outboundFile)) {
        try {
            queue = JSON.parse(fs.readFileSync(outboundFile, 'utf8'));
        } catch (err) {
            queue = [];
        }
    }

    const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...message,
        createdAt: Date.now(),
        status: 'queued'
    };

    queue.push(newMessage);
    fs.writeFileSync(outboundFile, JSON.stringify(queue, null, 2));

    return newMessage;
}

// API Server with full Trinity endpoints
function createHealthServer() {
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost:${CONFIG.port}`);
        const pathname = url.pathname;
        const method = req.method;

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end();
            return;
        }

        try {
            // Health endpoints
            if (pathname === '/health' || pathname === '/api/health') {
                sendJson(res, 200, {
                    status: 'healthy',
                    computer: CONFIG.computerId,
                    role: CONFIG.role,
                    syncCount: state.syncCount,
                    lastSync: state.lastSync,
                    connectedComputers: state.connectedComputers,
                    uptime: process.uptime()
                });
            }
            // Trinity status
            else if (pathname === '/api/trinity/status') {
                sendJson(res, 200, {
                    trinity: 'C1 x C2 x C3 = Infinity',
                    computers: {
                        A: state.connectedComputers.A ? 'online' : 'offline',
                        B: state.connectedComputers.B ? 'online' : 'offline',
                        C: 'online (this instance)'
                    },
                    state: state
                });
            }
            // Messages API
            else if (pathname === '/api/trinity/messages') {
                if (method === 'GET') {
                    // Get messages - optional ?instance=c1|c2|c3
                    const instance = url.searchParams.get('instance') || 'c3';
                    const messages = getMessages(instance);
                    sendJson(res, 200, {
                        success: true,
                        instance: instance,
                        count: messages.length,
                        messages: messages
                    });
                }
                else if (method === 'POST') {
                    // Send a new message
                    const body = await parseBody(req);

                    if (!body.to || !body.content) {
                        sendJson(res, 400, {
                            success: false,
                            error: 'Missing required fields: to, content'
                        });
                        return;
                    }

                    const message = sendMessage({
                        from: body.from || `C${CONFIG.computerId}`,
                        to: body.to,
                        targetComputer: body.targetComputer || 'A',
                        content: body.content,
                        priority: body.priority || 'NORMAL',
                        type: body.type || 'message'
                    });

                    log('info', 'Message queued via API', { to: body.to, targetComputer: body.targetComputer });

                    sendJson(res, 201, {
                        success: true,
                        message: 'Message queued for delivery',
                        data: message
                    });
                }
                else if (method === 'DELETE') {
                    // Clear messages for an instance
                    const instance = url.searchParams.get('instance') || 'c3';
                    const inboxFile = path.join(CONFIG.localTrinity, 'MESSAGES', `${instance.toLowerCase()}_inbox.json`);
                    fs.writeFileSync(inboxFile, JSON.stringify([], null, 2));

                    sendJson(res, 200, {
                        success: true,
                        message: `Cleared messages for ${instance}`
                    });
                }
                else {
                    sendJson(res, 405, { error: 'Method not allowed' });
                }
            }
            // Sync API
            else if (pathname === '/api/trinity/sync') {
                if (method === 'GET') {
                    // Get sync status
                    sendJson(res, 200, {
                        success: true,
                        syncCount: state.syncCount,
                        lastSync: state.lastSync,
                        nextSync: state.lastSync
                            ? new Date(new Date(state.lastSync).getTime() + CONFIG.syncInterval).toISOString()
                            : null,
                        interval: CONFIG.syncInterval,
                        connectedComputers: state.connectedComputers,
                        messagesProcessed: state.messagesProcessed
                    });
                }
                else if (method === 'POST') {
                    // Trigger immediate sync
                    log('info', 'Manual sync triggered via API');
                    syncCycle();

                    sendJson(res, 200, {
                        success: true,
                        message: 'Sync cycle completed',
                        syncCount: state.syncCount,
                        lastSync: state.lastSync,
                        connectedComputers: state.connectedComputers
                    });
                }
                else {
                    sendJson(res, 405, { error: 'Method not allowed' });
                }
            }
            // Wake request API
            else if (pathname === '/api/trinity/wake') {
                if (method === 'POST') {
                    const body = await parseBody(req);

                    if (!body.targetComputer || !body.instance) {
                        sendJson(res, 400, {
                            success: false,
                            error: 'Missing required fields: targetComputer, instance'
                        });
                        return;
                    }

                    // Queue wake request for target computer
                    const wakeFile = path.join(
                        CONFIG.cloudFolder,
                        `COMPUTER_${body.targetComputer}`,
                        'wake_requests.json'
                    );

                    let wakeRequests = [];
                    if (fs.existsSync(wakeFile)) {
                        try {
                            wakeRequests = JSON.parse(fs.readFileSync(wakeFile, 'utf8'));
                        } catch (err) {
                            wakeRequests = [];
                        }
                    }

                    wakeRequests.push({
                        from: CONFIG.computerId,
                        instance: body.instance,
                        reason: body.reason || 'API wake request',
                        priority: body.priority || 'MEDIUM',
                        timestamp: Date.now()
                    });

                    fs.writeFileSync(wakeFile, JSON.stringify(wakeRequests, null, 2));

                    log('info', 'Wake request sent via API', {
                        targetComputer: body.targetComputer,
                        instance: body.instance
                    });

                    sendJson(res, 201, {
                        success: true,
                        message: `Wake request sent to Computer ${body.targetComputer} for ${body.instance}`
                    });
                }
                else {
                    sendJson(res, 405, { error: 'Method not allowed' });
                }
            }
            // Hub status
            else if (pathname === '/api/trinity/hub') {
                const hubFile = path.join(CONFIG.localTrinity, '..', 'TRINITY_HUB.md');
                let hubContent = null;
                if (fs.existsSync(hubFile)) {
                    hubContent = fs.readFileSync(hubFile, 'utf8');
                }

                sendJson(res, 200, {
                    success: true,
                    hubExists: !!hubContent,
                    hubPath: hubFile,
                    hubPreview: hubContent ? hubContent.substring(0, 500) + '...' : null
                });
            }
            // 404 for unknown routes
            else {
                sendJson(res, 404, { error: 'Not found', availableEndpoints: [
                    'GET  /health',
                    'GET  /api/health',
                    'GET  /api/trinity/status',
                    'GET  /api/trinity/messages?instance=c1|c2|c3',
                    'POST /api/trinity/messages',
                    'DELETE /api/trinity/messages?instance=c1|c2|c3',
                    'GET  /api/trinity/sync',
                    'POST /api/trinity/sync',
                    'POST /api/trinity/wake',
                    'GET  /api/trinity/hub'
                ]});
            }
        } catch (err) {
            log('error', 'API error', { error: err.message, url: pathname });
            sendJson(res, 500, { error: 'Internal server error', message: err.message });
        }
    });

    server.listen(CONFIG.port, () => {
        log('info', `Trinity API server listening on port ${CONFIG.port}`);
    });

    return server;
}

// Heartbeat
function startHeartbeat() {
    setInterval(() => {
        const heartbeat = {
            computer: CONFIG.computerId,
            role: CONFIG.role,
            timestamp: Date.now(),
            isOnline: true,
            syncCount: state.syncCount
        };

        const heartbeatFile = path.join(CONFIG.localTrinity, 'STATUS', 'c3_cloud_heartbeat.json');
        fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2));

        log('debug', 'Heartbeat sent');
    }, CONFIG.heartbeatInterval);
}

// Graceful shutdown
function setupShutdown() {
    const shutdown = (signal) => {
        log('info', `Received ${signal}, shutting down gracefully...`);

        // Update status to offline
        const offlineStatus = {
            computer: CONFIG.computerId,
            role: CONFIG.role,
            timestamp: Date.now(),
            isOnline: false,
            shutdownReason: signal
        };

        const statusFile = path.join(CONFIG.cloudFolder, `COMPUTER_${CONFIG.computerId}`, 'status.json');
        try {
            fs.writeFileSync(statusFile, JSON.stringify(offlineStatus, null, 2));
        } catch (err) {
            // Ignore errors during shutdown
        }

        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main entry point
async function main() {
    printBanner();

    log('info', 'Initializing C3 Cloud Sync Service...');

    ensureDirectories();
    setupShutdown();

    // Initial sync
    syncCycle();

    // Start periodic sync
    setInterval(syncCycle, CONFIG.syncInterval);

    // Start heartbeat
    startHeartbeat();

    // Start health server
    createHealthServer();

    log('info', 'C3 Cloud Sync Service started successfully');
    log('info', `Syncing every ${CONFIG.syncInterval / 1000} seconds`);
    log('info', 'Press Ctrl+C to stop');
}

// Run
main().catch(err => {
    log('error', 'Fatal error', { error: err.message });
    process.exit(1);
});
