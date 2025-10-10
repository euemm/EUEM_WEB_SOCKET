import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { Client as SSHClient } from 'ssh2';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

// Load environment variables
dotenv.config();
const PORT = parseInt(process.env.PORT) || 8080;
const BASE_PATH = process.env.BASE_PATH || ''; // Base path for reverse proxy (e.g., '/ssh-ws')
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS) || 100;
const CONNECTION_TIMEOUT = parseInt(process.env.CONNECTION_TIMEOUT) || 30000; // 30 seconds
const MESSAGE_SIZE_LIMIT = parseInt(process.env.MESSAGE_SIZE_LIMIT) || 64 * 1024; // 64KB per message
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL) || 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT) || 10000; // 10 seconds
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// User store loaded from CSV
let users = new Map();

// Load users from CSV file
async function loadUsers() {
	const csvPath = path.join(__dirname, 'cred.csv');

	try {
		if (!fs.existsSync(csvPath)) {
			console.error('cred.csv file not found. Please create it with user credentials.');
			process.exit(1);
		}

		return new Promise((resolve, reject) => {
			const csvUsers = [];

			fs.createReadStream(csvPath)
				.pipe(csv())
				.on('data', (row) => {
					// Parse permissions from comma-separated string
					const permissions = row.permissions ? row.permissions.split(',').map(p => p.trim()) : [];

					csvUsers.push({
						username: row.username,
						password: row.password, // Should be bcrypt hashed
						role: row.role,
						permissions: permissions
					});
				})
				.on('end', () => {
					users = new Map(csvUsers.map(user => [user.username, user]));
					console.log(`Loaded ${users.size} users from cred.csv`);
					resolve();
				})
				.on('error', (error) => {
					console.error('Error reading cred.csv:', error);
					reject(error);
				});
		});
	} catch (error) {
		console.error('Failed to load users from CSV:', error);
		process.exit(1);
	}
}

// Create HTTP server
const app = express();

// CORS configuration - allow all origins since users can join from anywhere
const corsOptions = {
  origin: '*', // Allow all origins
  credentials: process.env.CORS_CREDENTIALS !== 'false', // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const server = createServer(app);

// Create WebSocket server with path support
const wss = new WebSocketServer({ 
  server,
  path: BASE_PATH ? `${BASE_PATH}` : undefined,
  maxPayload: MESSAGE_SIZE_LIMIT,
  perMessageDeflate: false // Disable compression for better performance
});

let activeConnections = 0;

// HTTP Authentication Routes
app.post(`${BASE_PATH}/auth/login`, async (req, res) => {
	try {
		const { username, password } = req.body;
		
		if (!username || !password) {
			return res.status(400).json({ error: 'Username and password required' });
		}

		const userData = users.get(username);
		if (!userData || !bcrypt.compareSync(password, userData.password)) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ 
				username: userData.username, 
				role: userData.role,
				permissions: userData.permissions 
			},
			JWT_SECRET,
			{ expiresIn: JWT_EXPIRES_IN }
		);

		// Set secure HTTP-only cookie
		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 15 * 60 * 1000 // 15 minutes
		};

		res.cookie('auth_token', token, cookieOptions);
		
		res.json({
			success: true,
			user: {
				username: userData.username,
				role: userData.role,
				permissions: userData.permissions
			}
		});

		console.log(`User ${username} authenticated via HTTP`);
	} catch (error) {
		console.error('HTTP authentication error:', error);
		res.status(500).json({ error: 'Authentication failed' });
	}
});

app.post(`${BASE_PATH}/auth/logout`, (req, res) => {
	res.clearCookie('auth_token');
	res.json({ success: true, message: 'Logged out successfully' });
});

app.get(`${BASE_PATH}/auth/status`, (req, res) => {
	try {
		const token = req.cookies.auth_token;
		
		if (!token) {
			return res.json({ authenticated: false });
		}

		const decoded = jwt.verify(token, JWT_SECRET);
		
		res.json({
			authenticated: true,
			user: {
				username: decoded.username,
				role: decoded.role,
				permissions: decoded.permissions
			}
		});
	} catch (error) {
		res.clearCookie('auth_token');
		res.json({ authenticated: false });
	}
});

// Serve a simple login page
app.get(`${BASE_PATH}/`, (req, res) => {
	res.send(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>SSH WebSocket Server</title>
			<style>
				body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
				.form-group { margin-bottom: 15px; }
				label { display: block; margin-bottom: 5px; }
				input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
				button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
				button:hover { background: #0056b3; }
				.status { margin-top: 20px; padding: 10px; border-radius: 4px; }
				.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
				.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
			</style>
		</head>
		<body>
			<h2>SSH WebSocket Server Login</h2>
			<form id="loginForm">
				<div class="form-group">
					<label for="username">Username:</label>
					<input type="text" id="username" name="username" required>
				</div>
				<div class="form-group">
					<label for="password">Password:</label>
					<input type="password" id="password" name="password" required>
				</div>
				<button type="submit">Login</button>
			</form>
			<div id="status"></div>
			<div id="userInfo" style="margin-top: 20px;"></div>
			
			<script>
				const BASE_PATH = '${BASE_PATH}';
				
				document.getElementById('loginForm').addEventListener('submit', async (e) => {
					e.preventDefault();
					const formData = new FormData(e.target);
					const data = Object.fromEntries(formData);
					
					try {
						const response = await fetch(BASE_PATH + '/auth/login', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(data)
						});
						
						const result = await response.json();
						
						if (result.success) {
							document.getElementById('status').innerHTML = '<div class="status success">Login successful!</div>';
							document.getElementById('userInfo').innerHTML = \`
								<h3>User Info:</h3>
								<p><strong>Username:</strong> \${result.user.username}</p>
								<p><strong>Role:</strong> \${result.user.role}</p>
								<p><strong>Permissions:</strong> \${result.user.permissions.join(', ')}</p>
								<button onclick="checkStatus()">Check Status</button>
								<button onclick="logout()">Logout</button>
							\`;
						} else {
							document.getElementById('status').innerHTML = '<div class="status error">Login failed: ' + result.error + '</div>';
						}
					} catch (error) {
						document.getElementById('status').innerHTML = '<div class="status error">Error: ' + error.message + '</div>';
					}
				});
				
				async function checkStatus() {
					try {
						const response = await fetch(BASE_PATH + '/auth/status');
						const result = await response.json();
						
						if (result.authenticated) {
							alert('Authenticated as: ' + result.user.username);
						} else {
							alert('Not authenticated');
						}
					} catch (error) {
						alert('Error checking status');
					}
				}
				
				async function logout() {
					try {
						await fetch(BASE_PATH + '/auth/logout', { method: 'POST' });
						document.getElementById('userInfo').innerHTML = '';
						document.getElementById('status').innerHTML = '<div class="status success">Logged out successfully</div>';
					} catch (error) {
						alert('Error logging out');
					}
				}
				
				// Check status on page load
				checkStatus();
			</script>
		</body>
		</html>
	`);
});

// Initialize server
async function startServer() {
	try {
		await loadUsers();
		
		server.listen(PORT, () => {
			const basePath = BASE_PATH || '';
			console.log(`SSH WebSocket proxy server running on http://localhost:${PORT}${basePath}`);
			console.log(`WebSocket server available at ws://localhost:${PORT}${basePath}`);
			console.log(`Base path: ${basePath || '(none - root path)'}`);
			console.log(`Max connections: ${MAX_CONNECTIONS}`);
			console.log(`Message size limit: ${MESSAGE_SIZE_LIMIT / 1024}KB`);
			console.log(`JWT token expires in: ${JWT_EXPIRES_IN}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

startServer();

wss.on('connection', (ws, req) => {
  // Check connection limit
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log('Connection limit reached, rejecting new connection');
    ws.close(1013, 'Server overloaded');
    return;
  }

  activeConnections++;
  console.log(`New WebSocket client connected (${activeConnections}/${MAX_CONNECTIONS})`);
  
  // Connection state
  let sshClient = null;
  let sshStream = null;
  let connectionTimeout = null;
  let isAuthenticated = false;
  let user = null;
  let heartbeatInterval = null;
  let heartbeatTimeout = null;
  let lastPong = Date.now();

  // Try to authenticate from cookie
  try {
    const cookies = req.headers.cookie;
    if (cookies) {
      const cookieMap = cookies.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      const token = cookieMap.auth_token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
          isAuthenticated = true;
          user = {
            username: decoded.username,
            role: decoded.role,
            permissions: decoded.permissions,
            token: token
          };
          console.log(`User ${decoded.username} authenticated via cookie`);
          
          // Send authentication success
          ws.send(JSON.stringify({
            type: 'auth_success',
            token,
            user: {
              username: decoded.username,
              role: decoded.role,
              permissions: decoded.permissions
            }
          }));
        }
      }
    }
  } catch (error) {
    console.log('Cookie authentication failed:', error.message);
  }

	// Start heartbeat
	startHeartbeat();

	ws.on('message', async (data) => {
		try {
			// Check message size
			if (data.length > MESSAGE_SIZE_LIMIT) {
				sendError(ws, 'Message too large');
				ws.close(1009, 'Message too large');
				return;
			}

			const message = JSON.parse(data.toString());
			console.log('Received message:', message.type);

			// Handle authentication first
			if (!isAuthenticated && message.type !== 'auth') {
				sendError(ws, 'Authentication required');
				return;
			}

			switch (message.type) {
        case 'auth':
          await handleAuth(ws, message);
          break;

        case 'refresh_token':
          if (!validateSession()) {
            sendError(ws, 'Session invalid');
            return;
          }
          await handleTokenRefresh(ws);
          break;

				case 'ping':
					handlePing(ws);
					break;

        case 'connect':
          if (!validateSession() || !checkPermission('ssh:connect')) {
            sendError(ws, 'Permission denied or session invalid');
            return;
          }
          console.log('Establishing SSH connection');
          // Set connection timeout
          connectionTimeout = setTimeout(() => {
            sendError(ws, 'Connection timeout');
            cleanupSSHConnection();
          }, CONNECTION_TIMEOUT);
          await handleSSHConnect(ws, message.config);
          break;

        case 'data':
          if (!validateSession() || !checkPermission('ssh:data')) {
            sendError(ws, 'Permission denied or session invalid');
            return;
          }
          if (sshStream) {
            sshStream.write(message.data);
          }
          break;

        case 'disconnect':
          if (!validateSession() || !checkPermission('ssh:disconnect')) {
            sendError(ws, 'Permission denied or session invalid');
            return;
          }
          cleanupSSHConnection();
          break;

        case 'status':
          if (!validateSession() || !checkPermission('system:monitor')) {
            sendError(ws, 'Permission denied or session invalid');
            return;
          }
          handleStatus(ws);
          break;

				default:
					console.log('Unknown message type:', message.type);
					sendError(ws, 'Unknown message type');
			}
		} catch (error) {
			console.error('Error processing message:', error);
			sendError(ws, error.message);
		}
	});

  // Token refresh handler
  async function handleTokenRefresh(ws) {
    try {
      if (!user || !user.token) {
        sendError(ws, 'No token to refresh');
        return;
      }

      // Generate new JWT token
      const newToken = jwt.sign(
        { 
          username: user.username, 
          role: user.role,
          permissions: user.permissions 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Update user token
      user.token = newToken;

      ws.send(JSON.stringify({
        type: 'token_refreshed',
        token: newToken
      }));

      console.log(`Token refreshed for user ${user.username}`);
    } catch (error) {
      console.error('Token refresh error:', error);
      sendError(ws, 'Token refresh failed');
    }
  }

  // Authentication handler
  async function handleAuth(ws, message) {
		try {
			const { username, password } = message;

			if (!username || !password) {
				sendError(ws, 'Username and password required');
				return;
			}

			const userData = users.get(username);
			if (!userData || !bcrypt.compareSync(password, userData.password)) {
				sendError(ws, 'Invalid credentials');
				return;
			}

			// Generate JWT token
			const token = jwt.sign(
				{
					username: userData.username,
					role: userData.role,
					permissions: userData.permissions
				},
				JWT_SECRET,
				{ expiresIn: JWT_EXPIRES_IN }
			);

      isAuthenticated = true;
      user = {
        ...userData,
        token: token
      };

      ws.send(JSON.stringify({
        type: 'auth_success',
        token,
        user: {
          username: userData.username,
          role: userData.role,
          permissions: userData.permissions
        }
      }));

			console.log(`User ${username} authenticated successfully`);
		} catch (error) {
			console.error('Authentication error:', error);
			sendError(ws, 'Authentication failed');
		}
	}

  // Token-based authentication
  function authenticateToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Validate user session and token
  function validateSession() {
    if (!isAuthenticated || !user) {
      return false;
    }

    // If user has a token, validate it
    if (user.token) {
      const decoded = authenticateToken(user.token);
      if (!decoded) {
        // Token expired or invalid
        isAuthenticated = false;
        user = null;
        sendError(ws, 'Token expired, please re-authenticate');
        return false;
      }
      // Update user data from token
      user.username = decoded.username;
      user.role = decoded.role;
      user.permissions = decoded.permissions;
    }

    return true;
  }

	// Permission checker
	function checkPermission(permission) {
		if (!isAuthenticated || !user) return false;
		return user.permissions.includes(permission);
	}

	// Heartbeat functions
	function startHeartbeat() {
		heartbeatInterval = setInterval(() => {
			if (ws.readyState === ws.OPEN) {
				ws.ping();

				// Check if pong was received within timeout
				heartbeatTimeout = setTimeout(() => {
					console.log('Heartbeat timeout, closing connection');
					ws.close(1001, 'Heartbeat timeout');
				}, HEARTBEAT_TIMEOUT);
			}
		}, HEARTBEAT_INTERVAL);
	}

	function handlePing(ws) {
		ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
	}

	function handleStatus(ws) {
		ws.send(JSON.stringify({
			type: 'status',
			data: {
				activeConnections,
				maxConnections: MAX_CONNECTIONS,
				authenticated: isAuthenticated,
				user: user ? { username: user.username, role: user.role } : null,
				uptime: process.uptime(),
				memoryUsage: process.memoryUsage()
			}
		}));
	}

	async function handleSSHConnect(ws, config) {
		// Validate configuration
		if (!config || !config.host || !config.username) {
			sendError(ws, 'Missing required SSH configuration (host, username)');
			return;
		}

		// Clean up existing connection if any
		if (sshClient) {
			cleanupSSHConnection();
		}

		console.log('Connecting to SSH server:', config.host);

		sshClient = new SSHClient();

		sshClient.on('ready', () => {
			console.log('SSH connection established');

			// Clear connection timeout
			if (connectionTimeout) {
				clearTimeout(connectionTimeout);
				connectionTimeout = null;
			}

			sshClient.shell((err, stream) => {
				if (err) {
					console.error('Shell error:', err);
					sendError(ws, err.message);
					return;
				}

				sshStream = stream;

				// Send connection success
				ws.send(JSON.stringify({ type: 'connected' }));

				// Forward SSH output to WebSocket
				stream.on('data', (data) => {
					ws.send(JSON.stringify({
						type: 'data',
						data: data.toString('utf-8')
					}));
				});

				stream.on('close', () => {
					console.log('SSH stream closed');
					ws.send(JSON.stringify({ type: 'closed' }));
					cleanupSSHConnection();
				});

				stream.stderr.on('data', (data) => {
					console.error('SSH stderr:', data.toString());
				});
			});
		});

		sshClient.on('error', (err) => {
			console.error('SSH connection error:', err);
			sendError(ws, err.message);
		});

		sshClient.on('close', () => {
			console.log('SSH connection closed');
		});

		// Connect to SSH server
		const connectionConfig = {
			host: config.host,
			port: config.port || 22,
			username: config.username,
		};

		// Add authentication method
		if (config.authMethod === 'password') {
			connectionConfig.password = config.password;
		} else if (config.authMethod === 'key') {
			connectionConfig.privateKey = config.privateKey;
		}

		try {
			sshClient.connect(connectionConfig);
		} catch (error) {
			console.error('Failed to connect:', error);
			sendError(ws, error.message);
		}
	}

	function sendError(ws, message) {
		try {
			ws.send(JSON.stringify({
				type: 'error',
				error: message
			}));
		} catch (error) {
			console.error('Failed to send error message:', error);
		}
	}

	// Handle pong responses
	ws.on('pong', () => {
		lastPong = Date.now();
		if (heartbeatTimeout) {
			clearTimeout(heartbeatTimeout);
			heartbeatTimeout = null;
		}
	});

	ws.on('close', () => {
		activeConnections--;
		console.log(`WebSocket client disconnected (${activeConnections}/${MAX_CONNECTIONS})`);
		cleanupSSHConnection();
	});

	function cleanupSSHConnection() {
		// Clear timeouts
		if (connectionTimeout) {
			clearTimeout(connectionTimeout);
			connectionTimeout = null;
		}
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = null;
		}
		if (heartbeatTimeout) {
			clearTimeout(heartbeatTimeout);
			heartbeatTimeout = null;
		}

		// Clean up SSH resources
		if (sshStream) {
			sshStream.removeAllListeners();
			sshStream.destroy();
			sshStream = null;
		}
		if (sshClient) {
			sshClient.removeAllListeners();
			sshClient.end();
			sshClient = null;
		}

		// Reset authentication state
		isAuthenticated = false;
		user = null;
	}

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
});

wss.on('error', (error) => {
	console.error('WebSocket server error:', error);
});

