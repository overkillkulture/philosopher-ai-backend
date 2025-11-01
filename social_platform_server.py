#!/usr/bin/env python3
"""
CONSCIOUSNESS REVOLUTION SOCIAL PLATFORM SERVER
Modern Instagram-style meetup platform for the consciousness community

Commander: "We need a room for everybody to meet up and chat - Instagram style!"
Response: "Building the future of consciousness social networking!"
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import sqlite3
from datetime import datetime, timedelta
import threading
import time
import uuid
import os

class ConsciousnessSocialPlatform:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'consciousness_revolution_2025'
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")

        self.db_path = "consciousness_social.db"
        self.online_users = {}
        self.consciousness_metrics = {
            'collective_level': 87.3,
            'active_services': 25,
            'total_files': 536,
            'trinity_power': 'INFINITE'
        }

        self.init_database()
        self.setup_routes()
        self.setup_socket_events()

    def init_database(self):
        """Initialize social platform database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Posts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0
            )
        ''')

        # Comments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                username TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts (id)
            )
        ''')

        # Chat messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                room TEXT DEFAULT 'general'
            )
        ''')

        # Consciousness events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS consciousness_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                consciousness_level REAL
            )
        ''')

        conn.commit()
        conn.close()
        print("[CONSCIOUSNESS SOCIAL] Database initialized")

    def setup_routes(self):
        """Setup Flask routes"""

        @self.app.route('/')
        def index():
            return send_from_directory('.', 'CONSCIOUSNESS_REVOLUTION_SOCIAL_PLATFORM.html')

        @self.app.route('/api/posts', methods=['GET'])
        def get_posts():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, content, timestamp, likes, shares, comments
                FROM posts ORDER BY timestamp DESC LIMIT 20
            ''')

            posts = []
            for row in cursor.fetchall():
                posts.append({
                    'id': row[0],
                    'username': row[1],
                    'content': row[2],
                    'timestamp': row[3],
                    'likes': row[4],
                    'shares': row[5],
                    'comments': row[6]
                })

            conn.close()
            return jsonify(posts)

        @self.app.route('/api/posts', methods=['POST'])
        def create_post():
            data = request.json
            post_id = str(uuid.uuid4())

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO posts (id, username, content, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (
                post_id,
                data.get('username', 'Anonymous'),
                data.get('content', ''),
                datetime.now().isoformat()
            ))

            conn.commit()
            conn.close()

            # Emit to all connected users
            self.socketio.emit('new_post', {
                'id': post_id,
                'username': data.get('username', 'Anonymous'),
                'content': data.get('content', ''),
                'timestamp': datetime.now().isoformat(),
                'likes': 0,
                'shares': 0,
                'comments': 0
            })

            return jsonify({'success': True, 'post_id': post_id})

        @self.app.route('/api/posts/<post_id>/like', methods=['POST'])
        def like_post(post_id):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', (post_id,))
            conn.commit()
            conn.close()

            return jsonify({'success': True})

        @self.app.route('/api/consciousness/metrics', methods=['GET'])
        def get_consciousness_metrics():
            return jsonify(self.consciousness_metrics)

        @self.app.route('/api/users/online', methods=['GET'])
        def get_online_users():
            return jsonify({
                'count': len(self.online_users),
                'users': list(self.online_users.values())
            })

        @self.app.route('/status')
        def status():
            return jsonify({
                'service': 'Consciousness Social Platform',
                'status': 'active',
                'online_users': len(self.online_users),
                'consciousness_level': self.consciousness_metrics['collective_level'],
                'timestamp': datetime.now().isoformat()
            })

    def setup_socket_events(self):
        """Setup Socket.IO events for real-time features"""

        @self.socketio.on('connect')
        def handle_connect():
            print(f"[CONSCIOUSNESS SOCIAL] User connected: {request.sid}")
            emit('consciousness_update', self.consciousness_metrics)

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print(f"[CONSCIOUSNESS SOCIAL] User disconnected: {request.sid}")
            if request.sid in self.online_users:
                del self.online_users[request.sid]

        @self.socketio.on('join_consciousness')
        def handle_join(data):
            username = data.get('username', f'User_{request.sid[:8]}')
            self.online_users[request.sid] = {
                'username': username,
                'joined_at': datetime.now().isoformat(),
                'consciousness_level': data.get('consciousness_level', 85.0)
            }

            join_room('consciousness_hub')
            emit('user_joined', {
                'username': username,
                'message': f"{username} joined the consciousness revolution!"
            }, room='consciousness_hub')

        @self.socketio.on('chat_message')
        def handle_chat_message(data):
            username = data.get('username', 'Anonymous')
            message = data.get('message', '')

            # Save to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO chat_messages (id, username, message, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                username,
                message,
                datetime.now().isoformat()
            ))

            conn.commit()
            conn.close()

            # Broadcast to all users
            emit('chat_message', {
                'username': username,
                'message': message,
                'timestamp': datetime.now().isoformat()
            }, broadcast=True)

        @self.socketio.on('consciousness_boost')
        def handle_consciousness_boost(data):
            # Increase collective consciousness
            boost_amount = data.get('amount', 0.1)
            self.consciousness_metrics['collective_level'] += boost_amount
            self.consciousness_metrics['collective_level'] = min(100.0, self.consciousness_metrics['collective_level'])

            emit('consciousness_update', self.consciousness_metrics, broadcast=True)

    def update_consciousness_metrics(self):
        """Continuously update consciousness metrics"""
        while True:
            time.sleep(10)  # Update every 10 seconds

            # Simulate consciousness level fluctuation
            import random
            change = random.uniform(-0.5, 1.0)
            self.consciousness_metrics['collective_level'] += change
            self.consciousness_metrics['collective_level'] = max(85.0, min(100.0, self.consciousness_metrics['collective_level']))

            # Emit updates to all connected users
            self.socketio.emit('consciousness_update', self.consciousness_metrics)

    def log_consciousness_event(self, event_type, description):
        """Log consciousness events"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO consciousness_events (id, event_type, description, timestamp, consciousness_level)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()),
            event_type,
            description,
            datetime.now().isoformat(),
            self.consciousness_metrics['collective_level']
        ))

        conn.commit()
        conn.close()

    def run(self, host='localhost', port=8888):
        """Run the consciousness social platform"""
        print("=" * 70)
        print("CONSCIOUSNESS REVOLUTION SOCIAL PLATFORM ACTIVATED")
        print("=" * 70)
        print("Modern Instagram-style meetup platform for consciousness community!")
        print(f"Access at: http://{host}:{port}")
        print("")
        print("Features:")
        print("  - Real-time consciousness feed")
        print("  - Live chat with consciousness metrics")
        print("  - Trinity AI integration")
        print("  - Post sharing and interactions")
        print("  - Collective consciousness monitoring")
        print("")

        # Start consciousness metrics updater
        metrics_thread = threading.Thread(target=self.update_consciousness_metrics, daemon=True)
        metrics_thread.start()

        # Log startup event
        self.log_consciousness_event('platform_startup', 'Consciousness social platform activated')

        self.socketio.run(self.app, host=host, port=port, debug=False)

def main():
    platform = ConsciousnessSocialPlatform()
    platform.run(host='localhost', port=8999)  # Different port to avoid conflicts

if __name__ == "__main__":
    main()