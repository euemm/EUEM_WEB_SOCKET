import WebSocket from 'ws';

// Configuration - adjust these for your environment
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const BASE_PATH = process.env.BASE_PATH || '';
const WS_URL = BASE_URL.replace('http', 'ws') + BASE_PATH;
const HTTP_URL = BASE_URL + BASE_PATH;

console.log('Connecting to WebSocket at:', WS_URL);
console.log('Using HTTP API at:', HTTP_URL);

const ws = new WebSocket(WS_URL);

// Authentication credentials
const credentials = {
  username: 'admin',  // or 'user'
  password: 'admin123'  // or 'user123'
};

let isAuthenticated = false;

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Try to authenticate via HTTP first (this will set a cookie)
  authenticateViaHTTP();
});

// Function to authenticate via HTTP and get cookie
async function authenticateViaHTTP() {
  try {
    console.log('Attempting HTTP authentication...');
    
    const response = await fetch(HTTP_URL + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify(credentials)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('HTTP authentication successful!');
      console.log('User:', result.user);
      
      // Now WebSocket should be automatically authenticated via cookie
      // Wait a moment for the WebSocket to process the cookie
      setTimeout(() => {
        if (!isAuthenticated) {
          console.log('WebSocket not authenticated via cookie, trying manual auth...');
          // Fallback to manual WebSocket authentication
          ws.send(JSON.stringify({
            type: 'auth',
            username: credentials.username,
            password: credentials.password
          }));
        }
      }, 1000);
    } else {
      console.error('HTTP authentication failed:', result.error);
      // Fallback to manual WebSocket authentication
      ws.send(JSON.stringify({
        type: 'auth',
        username: credentials.username,
        password: credentials.password
      }));
    }
  } catch (error) {
    console.error('HTTP authentication error:', error);
    // Fallback to manual WebSocket authentication
    ws.send(JSON.stringify({
      type: 'auth',
      username: credentials.username,
      password: credentials.password
    }));
  }
}

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  switch (message.type) {
    case 'auth_success':
      console.log('Authentication successful!');
      console.log('Token:', message.token);
      console.log('User:', message.user);
      isAuthenticated = true;
      
      // Now you can perform SSH operations
      // Example: Connect to SSH server
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'connect',
          config: {
            host: 'localhost',
            port: 22,
            username: 'testuser',
            authMethod: 'password',
            password: 'testpass'
          }
        }));
      }, 1000);
      break;
      
    case 'connected':
      console.log('SSH connection established');
      
      // Send some data
      ws.send(JSON.stringify({
        type: 'data',
        data: 'ls -la\n'
      }));
      break;
      
    case 'data':
      console.log('SSH output:', message.data);
      break;
      
    case 'error':
      console.error('Error:', message.error);
      break;
      
    case 'ping':
      // Respond to ping
      ws.send(JSON.stringify({ type: 'ping' }));
      break;
      
    case 'pong':
      console.log('Received pong');
      break;
      
    case 'status':
      console.log('Server status:', message.data);
      break;
      
    case 'token_refreshed':
      console.log('Token refreshed:', message.token);
      break;
      
    default:
      console.log('Unknown message type:', message.type, message);
  }
});

ws.on('close', () => {
  console.log('Connection closed');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Send ping every 30 seconds
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
