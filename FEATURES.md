# DevOps Test Application - Feature Documentation

## Protocols & Technologies

This application demonstrates multiple modern web protocols and technologies essential for DevOps testing:

### 1. REST API (HTTP/HTTPS)
Standard RESTful endpoints for CRUD operations and service information.

**Endpoints:**
- `GET /health` - Health check
- `GET /api/info` - System information  
- `GET /api/status` - Service status
- `POST /api/echo` - Echo test

### 2. Server-Sent Events (SSE)
Unidirectional real-time streaming from server to client.

**Endpoints:**
- `GET /api/stream` - Continuous data stream (10 messages)
- `GET /api/stream/logs` - Simulated log streaming (20 entries)

**Use Cases:**
- Live log tailing
- Real-time metrics
- Progress updates
- Event notifications

### 3. WebSocket Protocol
Bidirectional real-time communication for interactive features.

**Endpoint:**
- `ws://host/socket.io` - WebSocket connection

**Features:**
- Real-time chat
- Room-based messaging
- User presence
- Event broadcasting

**Events:**
- `connect` - Client connection
- `disconnect` - Client disconnection
- `join` - Join chat room
- `send_message` - Send chat message
- `new_message` - Receive chat message

## Testing Different Protocols

###SSE Stream Testing
```bash
# Test SSE stream
curl -N http://localhost:5000/api/stream

# Test log stream
curl -N http://localhost:5000/api/stream/logs
```

### WebSocket Testing
```javascript
// Using socket.io-client
const socket = io('http://localhost:5000/chat');

socket.on('connect', () => {
  socket.emit('join', { username: 'TestUser', room: 'general' });
});

socket.on('new_message', (message) => {
  console.log(message);
});

socket.emit('send_message', {
  username: 'TestUser',
  message: 'Hello!',
  room: 'general'
});
```

## DevOps Testing Scenarios

1. **Load Balancing Testing**
   - Multiple instances with WebSocket sticky sessions
   - SSE connection distribution
   - REST API round-robin

2. **Scalability Testing**
   - Horizontal scaling with concurrent WebSocket connections
   - SSE stream performance under load
   - Connection pooling

3. **High Availability**
   - WebSocket reconnection handling
   - SSE auto-retry on failure
   - Health check integration

4. **Monitoring & Observability**
   - Connection metrics
   - Stream throughput
   - Message latency
   - Error rates

## Container Considerations

- **WebSocket**: Requires sticky sessions in load balancers
- **SSE**: Keep-alive connections, adjust timeouts
- **Health Checks**: Should not count SSE/WebSocket connections as unhealthy
