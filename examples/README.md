# Client Examples

This directory contains example client implementations for the SSH WebSocket Server.

## Files

### browser-client.html
A complete browser-based client with a user interface.

**Features:**
- User authentication
- SSH connection management
- Interactive command execution
- Real-time output display
- Status monitoring

**Usage:**
1. Start the server (see main README.md)
2. Open the file directly in a browser, or
3. Access through the server at:
   - `http://localhost:8080/` (development)
   - `http://your-domain.com/ssh-ws/` (production behind Nginx)

The client automatically detects the base path from the URL.

### client-example.js
A Node.js client implementation demonstrating programmatic usage.

**Features:**
- HTTP authentication
- WebSocket connection
- SSH operations
- Message handling
- Heartbeat support

**Usage:**

```bash
# Install dependencies first (from project root)
npm install

# Run locally
node examples/client-example.js

# Run against remote server
BASE_URL=http://your-domain.com BASE_PATH=/ssh-ws node examples/client-example.js
```

**Configuration:**

The client uses environment variables:
- `BASE_URL` - Server URL (default: `http://localhost:8080`)
- `BASE_PATH` - Base path if behind reverse proxy (default: empty)

Example:
```bash
export BASE_URL=https://your-domain.com
export BASE_PATH=/ssh-ws
node examples/client-example.js
```

## Creating Your Own Client

Both examples demonstrate the complete authentication and communication flow. Use them as a starting point for your own implementation.

### Basic Flow

1. **Connect to WebSocket**
   ```javascript
   const ws = new WebSocket('ws://localhost:8080');
   ```

2. **Authenticate**
   ```javascript
   ws.send(JSON.stringify({
     type: 'auth',
     username: 'admin',
     password: 'admin123'
   }));
   ```

3. **Wait for auth_success**
   ```javascript
   ws.on('message', (data) => {
     const message = JSON.parse(data);
     if (message.type === 'auth_success') {
       // Now you can perform SSH operations
     }
   });
   ```

4. **Connect to SSH**
   ```javascript
   ws.send(JSON.stringify({
     type: 'connect',
     config: {
       host: 'example.com',
       port: 22,
       username: 'sshuser',
       password: 'sshpass'
     }
   }));
   ```

5. **Send commands**
   ```javascript
   ws.send(JSON.stringify({
     type: 'data',
     data: 'ls -la\n'
   }));
   ```

See the main README.md for complete API documentation.

