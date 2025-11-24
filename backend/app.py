from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import logging
from datetime import datetime
import platform
import socket
import time
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'devops-test-secret-key')
CORS(app, resources={r"/*": {"origins": "*"}})

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

visit_count = 0
chat_messages = []

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "devops-test-api",
        "version": "1.0.0"
    }), 200

@app.route('/api/info', methods=['GET'])
def get_info():
    global visit_count
    visit_count += 1

    return jsonify({
        "message": "DevOps Test Application",
        "hostname": socket.gethostname(),
        "platform": platform.system(),
        "python_version": platform.python_version(),
        "visit_count": visit_count,
        "environment": os.environ.get('FLASK_ENV', 'production'),
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/api/echo', methods=['POST'])
def echo():
    data = request.get_json()
    logger.info(f"Echo request received: {data}")
    return jsonify({
        "received": data,
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        "status": "running",
        "uptime": "N/A",
        "requests_processed": visit_count,
        "memory_usage": "N/A"
    }), 200

@app.route('/api/stream', methods=['GET'])
def stream_data():
    """Server-Sent Events (SSE) streaming endpoint"""
    def generate():
        logger.info("Starting SSE stream")
        for i in range(10):
            data = {
                "count": i + 1,
                "message": f"Streaming message {i + 1}",
                "timestamp": datetime.now().isoformat(),
                "hostname": socket.gethostname()
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(1)

        yield f"data: {json.dumps({'message': 'Stream complete', 'count': 10})}\n\n"
        logger.info("SSE stream completed")

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

@app.route('/api/stream/logs', methods=['GET'])
def stream_logs():
    """Stream simulated log entries"""
    def generate_logs():
        log_levels = ['INFO', 'DEBUG', 'WARN', 'ERROR']
        log_messages = [
            'Application started',
            'Database connection established',
            'Processing request',
            'Cache updated',
            'Request completed',
            'High memory usage detected',
            'Cleanup task started',
            'Configuration reloaded'
        ]

        for i in range(20):
            import random
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "level": random.choice(log_levels),
                "message": random.choice(log_messages),
                "service": socket.gethostname(),
                "index": i + 1
            }
            yield f"data: {json.dumps(log_entry)}\n\n"
            time.sleep(0.5)

    return Response(
        stream_with_context(generate_logs()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@app.route('/api/chat/messages', methods=['GET'])
def get_chat_messages():
    """Get chat message history"""
    return jsonify({"messages": chat_messages}), 200

@app.route('/api/chat/send', methods=['POST'])
def send_chat_message():
    """Send a chat message via HTTP"""
    data = request.get_json()
    message = {
        "id": len(chat_messages) + 1,
        "username": data.get('username', 'Anonymous'),
        "message": data.get('message', ''),
        "timestamp": datetime.now().isoformat()
    }
    chat_messages.append(message)

    # Emit to all connected WebSocket clients
    socketio.emit('new_message', message, namespace='/chat')

    return jsonify(message), 201

# WebSocket event handlers
@socketio.on('connect', namespace='/chat')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit('connection_response', {
        'status': 'connected',
        'sid': request.sid,
        'timestamp': datetime.now().isoformat()
    })

@socketio.on('disconnect', namespace='/chat')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('join', namespace='/chat')
def handle_join(data):
    username = data.get('username', 'Anonymous')
    room = data.get('room', 'general')
    join_room(room)
    logger.info(f"{username} joined room {room}")
    emit('user_joined', {
        'username': username,
        'room': room,
        'timestamp': datetime.now().isoformat()
    }, room=room)

@socketio.on('leave', namespace='/chat')
def handle_leave(data):
    username = data.get('username', 'Anonymous')
    room = data.get('room', 'general')
    leave_room(room)
    logger.info(f"{username} left room {room}")
    emit('user_left', {
        'username': username,
        'room': room,
        'timestamp': datetime.now().isoformat()
    }, room=room)

@socketio.on('send_message', namespace='/chat')
def handle_message(data):
    message = {
        'id': len(chat_messages) + 1,
        'username': data.get('username', 'Anonymous'),
        'message': data.get('message', ''),
        'room': data.get('room', 'general'),
        'timestamp': datetime.now().isoformat()
    }
    chat_messages.append(message)

    room = data.get('room', 'general')
    emit('new_message', message, room=room)
    logger.info(f"Message sent to room {room}: {message['message']}")

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "DevOps Test API",
        "version": "2.0.0",
        "features": ["REST API", "SSE Streaming", "WebSocket Chat"],
        "endpoints": [
            "/health - Health check",
            "/api/info - Application information",
            "/api/echo - Echo POST data",
            "/api/status - Service status",
            "/api/stream - SSE stream test",
            "/api/stream/logs - SSE log stream",
            "/api/chat/messages - Get chat messages",
            "/api/chat/send - Send chat message (POST)",
            "ws://host/socket.io - WebSocket connection"
        ]
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting DevOps Test Application on port {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', 'False') == 'True')
