import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('info');
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [echoInput, setEchoInput] = useState('');
  const [echoResponse, setEchoResponse] = useState(null);
  const [streamData, setStreamData] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamLogs, setStreamLogs] = useState([]);
  const [isStreamingLogs, setIsStreamingLogs] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const eventSourceRef = useRef(null);
  const logSourceRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchHealth();
    fetchInfo();
    fetchStatus();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (logSourceRef.current) {
        logSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamLogs]);

  const fetchHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      setHealthStatus(response.data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealthStatus({ status: 'unhealthy' });
    }
  };

  const fetchInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/info`);
      setInfo(response.data);
    } catch (err) {
      setError('Failed to fetch info. Make sure the backend is running.');
      console.error('Error fetching info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/status`);
      setStatus(response.data);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const handleEcho = async (e) => {
    e.preventDefault();
    if (!echoInput.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/api/echo`, {
        message: echoInput
      });
      setEchoResponse(response.data);
      setEchoInput('');
    } catch (err) {
      setError('Failed to send echo request');
      console.error('Error sending echo:', err);
    }
  };

  const startStream = () => {
    if (isStreaming) return;

    setStreamData([]);
    setIsStreaming(true);
    eventSourceRef.current = new EventSource(`${API_URL}/api/stream`);

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStreamData(prev => [...prev, data]);

      if (data.message === 'Stream complete') {
        eventSourceRef.current.close();
        setIsStreaming(false);
      }
    };

    eventSourceRef.current.onerror = (err) => {
      console.error('EventSource error:', err);
      eventSourceRef.current.close();
      setIsStreaming(false);
    };
  };

  const startLogStream = () => {
    if (isStreamingLogs) return;

    setStreamLogs([]);
    setIsStreamingLogs(true);
    logSourceRef.current = new EventSource(`${API_URL}/api/stream/logs`);

    logSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStreamLogs(prev => [...prev, data]);
    };

    logSourceRef.current.onerror = (err) => {
      console.error('Log stream error:', err);
      logSourceRef.current.close();
      setIsStreamingLogs(false);
    };

    setTimeout(() => {
      if (logSourceRef.current) {
        logSourceRef.current.close();
        setIsStreamingLogs(false);
      }
    }, 12000);
  };

  const connectWebSocket = () => {
    if (socketRef.current && socketRef.current.connected) return;

    socketRef.current = io(`${API_URL}/chat`, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current.emit('join', { username, room: 'general' });
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('new_message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socketRef.current.on('user_joined', (data) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        username: 'System',
        message: `${data.username} joined the chat`,
        timestamp: data.timestamp
      }]);
    });
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isConnected) return;

    socketRef.current.emit('send_message', {
      username,
      message: chatInput,
      room: 'general'
    });

    setChatInput('');
  };

  const refreshData = () => {
    fetchInfo();
    fetchStatus();
    fetchHealth();
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>DevOps Test Application</h1>
          <p>Streaming, WebSocket Chat & REST API Testing</p>
          {healthStatus && (
            <div className={`health-badge ${healthStatus.status === 'healthy' ? 'healthy' : 'unhealthy'}`}>
              {healthStatus.status === 'healthy' ? '✓' : '✗'} {healthStatus.status}
            </div>
          )}
        </header>

        {error && <div className="error-message">{error}</div>}

        <div className="tabs">
          <button className={activeTab === 'info' ? 'tab active' : 'tab'} onClick={() => setActiveTab('info')}>Info</button>
          <button className={activeTab === 'echo' ? 'tab active' : 'tab'} onClick={() => setActiveTab('echo')}>Echo</button>
          <button className={activeTab === 'stream' ? 'tab active' : 'tab'} onClick={() => setActiveTab('stream')}>SSE Stream</button>
          <button className={activeTab === 'logs' ? 'tab active' : 'tab'} onClick={() => setActiveTab('logs')}>Log Stream</button>
          <button className={activeTab === 'chat' ? 'tab active' : 'tab'} onClick={() => setActiveTab('chat')}>WebSocket Chat</button>
        </div>

        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="content-grid">
              <div className="card">
                <h2>Application Info</h2>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : info ? (
                  <div className="info-content">
                    <div className="info-item"><strong>Message:</strong> {info.message}</div>
                    <div className="info-item"><strong>Hostname:</strong> {info.hostname}</div>
                    <div className="info-item"><strong>Platform:</strong> {info.platform}</div>
                    <div className="info-item"><strong>Python Version:</strong> {info.python_version}</div>
                    <div className="info-item"><strong>Environment:</strong> {info.environment}</div>
                    <div className="info-item"><strong>Visit Count:</strong> {info.visit_count}</div>
                    <div className="info-item"><strong>Timestamp:</strong> {new Date(info.timestamp).toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="no-data">No data available</div>
                )}
              </div>

              <div className="card">
                <h2>Service Status</h2>
                {status ? (
                  <div className="info-content">
                    <div className="info-item"><strong>Status:</strong> <span className="status-badge">{status.status}</span></div>
                    <div className="info-item"><strong>Requests Processed:</strong> {status.requests_processed}</div>
                  </div>
                ) : (
                  <div className="no-data">Loading status...</div>
                )}
                <button onClick={refreshData} className="btn-secondary" style={{marginTop: '20px'}}>Refresh Data</button>
              </div>
            </div>
          )}

          {activeTab === 'echo' && (
            <div className="card">
              <h2>Echo Test</h2>
              <form onSubmit={handleEcho} className="echo-form">
                <input
                  type="text"
                  placeholder="Enter a message to echo..."
                  value={echoInput}
                  onChange={(e) => setEchoInput(e.target.value)}
                  className="echo-input"
                />
                <button type="submit" className="btn-primary">Send Echo</button>
              </form>
              {echoResponse && (
                <div className="echo-response">
                  <h3>Response:</h3>
                  <pre>{JSON.stringify(echoResponse, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stream' && (
            <div className="card">
              <h2>Server-Sent Events (SSE) Stream</h2>
              <button onClick={startStream} disabled={isStreaming} className="btn-primary">
                {isStreaming ? 'Streaming...' : 'Start Stream'}
              </button>
              <div className="stream-container">
                {streamData.map((item, index) => (
                  <div key={index} className="stream-item">
                    <strong>#{item.count}</strong>: {item.message}
                    {item.hostname && <span className="hostname"> ({item.hostname})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="card">
              <h2>Live Log Stream (SSE)</h2>
              <button onClick={startLogStream} disabled={isStreamingLogs} className="btn-primary">
                {isStreamingLogs ? 'Streaming Logs...' : 'Start Log Stream'}
              </button>
              <div className="log-container">
                {streamLogs.map((log, index) => (
                  <div key={index} className={`log-entry log-${log.level.toLowerCase()}`}>
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</span>
                    <span className="log-message">{log.message}</span>
                    <span className="log-service">({log.service})</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="card">
              <h2>WebSocket Chat</h2>
              <div className="chat-status">
                {isConnected ? (
                  <span className="connected">● Connected as {username}</span>
                ) : (
                  <button onClick={connectWebSocket} className="btn-primary">Connect to Chat</button>
                )}
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`chat-message ${msg.username === username ? 'own-message' : ''}`}>
                    <div className="message-header">
                      <strong>{msg.username}</strong>
                      <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="message-text">{msg.message}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              {isConnected && (
                <form onSubmit={sendChatMessage} className="chat-input-form">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="chat-input"
                  />
                  <button type="submit" className="btn-primary">Send</button>
                </form>
              )}
            </div>
          )}
        </div>

        <footer className="footer">
          <p>DevOps Assessment Project | React + Flask + WebSocket + SSE</p>
          <p>Test containerization, orchestration, and real-time protocols</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
