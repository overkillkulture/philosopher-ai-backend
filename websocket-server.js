// WebSocket Server for Real-Time Trinity Coordination
// Provides live updates for multi-instance coordination

const { Server } = require('socket.io');

class TrinityWebSocketServer {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
                credentials: true
            }
        });

        this.connections = new Map();
        this.setupEventHandlers();

        console.log('🌐 Trinity WebSocket Server initialized');
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[WebSocket] Client connected: ${socket.id}`);

            // Instance registration
            socket.on('register_instance', (data) => {
                const { instance_id, role, computer_name } = data;

                this.connections.set(socket.id, {
                    instance_id,
                    role,
                    computer_name,
                    socket_id: socket.id,
                    connected_at: new Date()
                });

                // Broadcast new instance to all clients
                this.io.emit('instance_registered', {
                    instance_id,
                    role,
                    computer_name,
                    timestamp: new Date().toISOString()
                });

                // Send current status to new client
                socket.emit('connection_confirmed', {
                    socket_id: socket.id,
                    active_instances: this.connections.size,
                    timestamp: new Date().toISOString()
                });

                console.log(`[WebSocket] Instance registered: ${instance_id} (${role})`);
            });

            // Heartbeat
            socket.on('heartbeat', (data) => {
                const connection = this.connections.get(socket.id);
                if (connection) {
                    connection.last_heartbeat = new Date();
                    connection.status = data.status || 'active';
                    connection.focus = data.focus;
                }
            });

            // Task events
            socket.on('task_claimed', (data) => {
                // Broadcast to all instances
                this.io.emit('task_claimed', {
                    task_id: data.task_id,
                    instance_id: data.instance_id,
                    task_name: data.task_name,
                    timestamp: new Date().toISOString()
                });

                console.log(`[WebSocket] Task claimed: ${data.task_name} by ${data.instance_id}`);
            });

            socket.on('task_updated', (data) => {
                this.io.emit('task_updated', {
                    task_id: data.task_id,
                    status: data.status,
                    progress: data.progress,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('task_completed', (data) => {
                this.io.emit('task_completed', {
                    task_id: data.task_id,
                    instance_id: data.instance_id,
                    result: data.result,
                    timestamp: new Date().toISOString()
                });

                console.log(`[WebSocket] Task completed: ${data.task_id}`);
            });

            // Timeline convergence updates
            socket.on('convergence_update', (data) => {
                this.io.emit('convergence_updated', {
                    percent: data.percent,
                    updated_by: data.instance_id,
                    timestamp: new Date().toISOString()
                });

                console.log(`[WebSocket] Convergence updated: ${data.percent}%`);
            });

            // State synchronization
            socket.on('state_sync', (data) => {
                this.io.emit('state_synced', {
                    key: data.key,
                    value: data.value,
                    updated_by: data.instance_id,
                    timestamp: new Date().toISOString()
                });
            });

            // Instance status updates
            socket.on('status_update', (data) => {
                const connection = this.connections.get(socket.id);
                if (connection) {
                    connection.status = data.status;
                    connection.focus = data.focus;
                }

                this.io.emit('instance_status_updated', {
                    instance_id: data.instance_id,
                    status: data.status,
                    focus: data.focus,
                    timestamp: new Date().toISOString()
                });
            });

            // Disconnect
            socket.on('disconnect', () => {
                const connection = this.connections.get(socket.id);
                if (connection) {
                    console.log(`[WebSocket] Instance disconnected: ${connection.instance_id}`);

                    this.io.emit('instance_disconnected', {
                        instance_id: connection.instance_id,
                        timestamp: new Date().toISOString()
                    });

                    this.connections.delete(socket.id);
                }
            });

            // Error handling
            socket.on('error', (error) => {
                console.error(`[WebSocket] Error on socket ${socket.id}:`, error);
            });
        });
    }

    // Broadcast methods (for use from REST API)
    broadcastTaskClaimed(taskData) {
        this.io.emit('task_claimed', {
            ...taskData,
            timestamp: new Date().toISOString()
        });
    }

    broadcastTaskUpdated(taskData) {
        this.io.emit('task_updated', {
            ...taskData,
            timestamp: new Date().toISOString()
        });
    }

    broadcastConvergenceUpdate(convergenceData) {
        this.io.emit('convergence_updated', {
            ...convergenceData,
            timestamp: new Date().toISOString()
        });
    }

    broadcastInstanceUpdate(instanceData) {
        this.io.emit('instance_status_updated', {
            ...instanceData,
            timestamp: new Date().toISOString()
        });
    }

    // Get active connections
    getActiveConnections() {
        return Array.from(this.connections.values());
    }

    // Get connection count
    getConnectionCount() {
        return this.connections.size;
    }

    // Broadcast custom event
    broadcast(event, data) {
        this.io.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { TrinityWebSocketServer };
