import { WebSocketServer } from 'ws';
import { Client as SSHClient } from 'ssh2';

const PORT = 8080;
const MAX_CONNECTIONS = 100;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

const wss = new WebSocketServer({
	port: PORT,
	maxPayload: 1024 * 1024, // 1MB max payload
	perMessageDeflate: false // Disable compression for better performance
});

let activeConnections = 0;

console.log(`SSH WebSocket proxy server running on ws://localhost:${PORT}`);
console.log(`Max connections: ${MAX_CONNECTIONS}`);

wss.on('connection', (ws) => {
	// Check connection limit
	if (activeConnections >= MAX_CONNECTIONS) {
		console.log('Connection limit reached, rejecting new connection');
		ws.close(1013, 'Server overloaded');
		return;
	}

	activeConnections++;
	console.log(`New WebSocket client connected (${activeConnections}/${MAX_CONNECTIONS})`);

	let sshClient = null;
	let sshStream = null;
	let connectionTimeout = null;

	ws.on('message', async (data) => {
		try {
			const message = JSON.parse(data.toString());
			console.log('Received message:', message.type);

			switch (message.type) {
				case 'connect':
					console.log('Establishing SSH connection');
					// Set connection timeout
					connectionTimeout = setTimeout(() => {
						sendError(ws, 'Connection timeout');
						cleanupSSHConnection();
					}, CONNECTION_TIMEOUT);
					await handleSSHConnect(ws, message.config);
					break;

				case 'data':
					if (sshStream) {
						sshStream.write(message.data);
					}
					break;

				case 'disconnect':
					cleanupSSHConnection();
					break;

				default:
					console.log('Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('Error processing message:', error);
			sendError(ws, error.message);
		}
	});

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

	ws.on('close', () => {
		activeConnections--;
		console.log(`WebSocket client disconnected (${activeConnections}/${MAX_CONNECTIONS})`);
		cleanupSSHConnection();
	});

	function cleanupSSHConnection() {
		// Clear connection timeout
		if (connectionTimeout) {
			clearTimeout(connectionTimeout);
			connectionTimeout = null;
		}

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
	}

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
});

wss.on('error', (error) => {
	console.error('WebSocket server error:', error);
});

