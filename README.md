# SSH WebSocket Proxy Server

A production-ready WebSocket-to-SSH proxy server with authentication, authorization, session management, and Nginx reverse proxy support.

## Table of Contents

- [Features](#features)
- [Why This Server](#why-this-server)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [User Management](#user-management)
- [Authentication & Security](#authentication--security)
- [Deployment](#deployment)
- [Nginx Configuration](#nginx-configuration)
- [API Documentation](#api-documentation)
- [Client Examples](#client-examples)
- [PM2 Commands](#pm2-commands)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Features

- WebSocket-to-SSH proxy for browser-based SSH clients
- JWT-based authentication with HTTP-only cookies
- Role-based access control (RBAC) with granular permissions
- Session management with token refresh
- PM2 cluster mode for high availability
- Nginx reverse proxy support with configurable base path
- Connection pooling and rate limiting
- Heartbeat monitoring for connection health
- Comprehensive logging and monitoring
- Bcrypt password hashing
- Message size limits and timeout controls
- CORS configuration for cross-origin requests

## Why This Server

Browsers cannot make direct SSH connections because:
- SSH uses TCP sockets which browsers don't support
- Security restrictions prevent raw network access from JavaScript
- You need a server-side component to handle the SSH protocol

This server bridges that gap securely with enterprise-grade authentication and authorization.

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Generate password hash
npm run generate-hash

# Add a user
npm run user:add admin admin123 admin

# Start server
npm start
```

Server will be available at `http://localhost:8080`

### Production (Behind Nginx)

```bash
# Start in production mode (BASE_PATH=/ssh-ws)
npm run pm2:prod

# Configure Nginx (see Nginx Configuration section)
# Access at: http://your-domain.com/ssh-ws/
```

## Project Structure

```
EUEM_WEB_SOCKET/
├── examples/              # Client examples
│   ├── browser-client.html
│   └── client-example.js
├── server.js             # Main server file
├── ecosystem.config.cjs  # PM2 configuration
├── add-user.js          # User management script
├── generate-hash.js     # Password hash generator
├── package.json         # Dependencies
└── .env                 # Environment configuration
```

## Installation

### Prerequisites

- Node.js 14+ 
- npm or yarn
- PM2 (for production)
- Nginx (for reverse proxy)

### Setup Steps

1. Clone or download the repository

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Generate JWT secret:
```bash
# Generate a secure random key
openssl rand -base64 32
# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

5. Update `.env` with your JWT secret:
```bash
JWT_SECRET=your-generated-secret-here
```

6. Create users:
```bash
# Generate password hash
npm run generate-hash mypassword123

# Add user
npm run user:add username mypassword123
npm run user:add admin adminpass123 admin
```

7. Start the server:
```bash
# Development
npm start

# Production with PM2
npm run pm2:prod
```

## Environment Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# JWT Secret Key - MUST be changed in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=8080
# Base path for reverse proxy (e.g., '/ssh-ws' when behind nginx)
# Leave empty or unset for root path deployment
BASE_PATH=

# Connection Limits
MAX_CONNECTIONS=100
CONNECTION_TIMEOUT=30000
MESSAGE_SIZE_LIMIT=65536
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=10000
JWT_EXPIRES_IN=15m

# CORS Configuration
# CORS is set to allow all origins (*) by default since users can join from anywhere
# You can override this if needed by uncommenting and setting specific origins
# CORS_ORIGIN=http://localhost:3000,http://localhost:8080
CORS_CREDENTIALS=true
```

### Environment Variable Details

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `JWT_SECRET` | JWT signing secret | (default) | Random 32-char string |
| `PORT` | Server port | `8080` | `8080` |
| `BASE_PATH` | Base path for reverse proxy | `''` (empty) | `/ssh-ws` |
| `MAX_CONNECTIONS` | Max concurrent connections | `100` | `1000` |
| `CONNECTION_TIMEOUT` | SSH connection timeout (ms) | `30000` | `30000` |
| `MESSAGE_SIZE_LIMIT` | Max message size (bytes) | `65536` | `65536` |
| `HEARTBEAT_INTERVAL` | Heartbeat interval (ms) | `30000` | `30000` |
| `HEARTBEAT_TIMEOUT` | Heartbeat timeout (ms) | `10000` | `10000` |
| `JWT_EXPIRES_IN` | JWT token expiration | `15m` | `15m` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` (all) | `https://example.com` |
| `CORS_CREDENTIALS` | Allow credentials | `true` | `true` |

### CORS Configuration

**Default Configuration:**
- All origins allowed (`*`) by default since users can join from anywhere
- Credentials enabled for cookie support
- Works with any client location

**Restricting Origins (Optional):**
If you need to restrict access to specific origins, set CORS_ORIGIN in your `.env`:

```bash
# Allow specific origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Enable/disable credentials
CORS_CREDENTIALS=true
```

Note: When using CORS with credentials and specific origins, you cannot use `*`. The server will automatically handle this configuration.

## User Management

### Quick Commands

```bash
# Add user
npm run user:add username password [role]

# List users
npm run user:list

# Delete user
npm run user:delete username

# Generate password hash
npm run generate-hash password

# Help
npm run user:help
```

### User Roles

**Admin Role:**
- Permissions: `ssh:connect`, `ssh:data`, `ssh:disconnect`, `system:monitor`
- Description: Full access including system monitoring
- Use case: Server administrators, system operators

**User Role (Default):**
- Permissions: `ssh:connect`, `ssh:data`, `ssh:disconnect`
- Description: SSH operations only
- Use case: Regular users, developers

### Adding Users

```bash
# Add a regular user
npm run user:add alice mypassword123

# Add an admin user
npm run user:add bob secretpass admin

# List all users
npm run user:list
```

### CSV File Format

Users are stored in `cred.csv`:

```csv
username,password,role,permissions
admin,$2a$10$hash...,admin,"ssh:connect,ssh:data,ssh:disconnect,system:monitor"
user,$2a$10$hash...,user,"ssh:connect,ssh:data,ssh:disconnect"
```

**Important:** Never commit `cred.csv` to version control (already in .gitignore)

### User Management Best Practices

1. Use strong passwords (8+ characters, mixed case, numbers, symbols)
2. Never store plain text passwords (always use bcrypt hashes)
3. Apply principle of least privilege
4. Regular audits of user list and permissions
5. Remove unused accounts
6. Monitor access logs for authentication attempts
7. Change default passwords before production use

### Default Users

| Username | Password | Role  | Permissions |
|----------|----------|-------|-------------|
| admin    | admin123 | admin | Full access |
| user     | user123  | user  | SSH only    |

**IMPORTANT:** Change default passwords before production use!

## Authentication & Security

### JWT Authentication

- Short-lived tokens (15-minute expiration)
- Secure signing with JWT_SECRET
- Token-based authorization
- Automatic token refresh support

### Permission-Based Authorization

- Role-based access control
- Granular permissions per action
- Each operation requires specific permission

### Security Limits

- 64KB maximum message size per WebSocket frame
- Automatic rejection of oversized messages
- Connection termination on violations
- Max concurrent connections (configurable)

### Heartbeat Monitoring

- 30-second ping intervals
- 10-second timeout for pong response
- Automatic cleanup of dead connections

### Message Protocol

**Authentication:**
```json
{
  "type": "auth",
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "type": "auth_success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin",
    "permissions": ["ssh:connect", "ssh:data", "ssh:disconnect", "system:monitor"]
  }
}
```

**SSH Operations (require authentication):**
```json
{
  "type": "connect",
  "config": {
    "host": "example.com",
    "port": 22,
    "username": "sshuser",
    "authMethod": "password",
    "password": "sshpass"
  }
}
```

```json
{
  "type": "data",
  "data": "ls -la\n"
}
```

```json
{
  "type": "disconnect"
}
```

**System Monitoring (admin only):**
```json
{
  "type": "status"
}
```

**Heartbeat:**
```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": 1640995200000
}
```

### Error Handling

All errors are returned in standardized format:
```json
{
  "type": "error",
  "error": "Error message description"
}
```

Common error scenarios:
- `Authentication required` - Not authenticated
- `Permission denied` - Insufficient permissions
- `Message too large` - Exceeds size limit
- `Connection timeout` - SSH connection timeout
- `Heartbeat timeout` - Connection health check failed

### Production Security Checklist

1. Change JWT_SECRET to strong, random value
2. Use HTTPS/WSS for encrypted connections
3. Consider restricting CORS origins if needed (default is all origins)
4. Implement rate limiting (via Nginx)
5. Use IP whitelisting if needed
6. Enable firewall rules
7. Regular security audits
8. Monitor logs for suspicious activity
9. Keep dependencies updated
10. Use strong passwords for all users

**Note on CORS:** The server allows all origins by default (`*`) to enable users to connect from anywhere. If you need to restrict access, set `CORS_ORIGIN` in your `.env` file to a comma-separated list of allowed origins.

## Deployment

### Architecture

```
Browser Client (WebSocket)
    |
    | HTTP/WebSocket
    v
[Optional: Nginx Reverse Proxy]
    |
    | /ssh-ws/* -> http://localhost:8080/ssh-ws/*
    v
SSH WebSocket Server (Node.js + PM2)
    | - Authentication
    | - Authorization
    | - Session Management
    v
SSH Servers
```

### Development Deployment (No Nginx)

```bash
# Start server without base path
npm start
# or with PM2
npm run pm2:dev
```

Server available at:
- HTTP: `http://localhost:8080/`
- WebSocket: `ws://localhost:8080`

### Production Deployment (Behind Nginx)

1. Configure environment:
```bash
# In .env file
BASE_PATH=/ssh-ws
```

Or use PM2 production environment:
```bash
npm run pm2:prod
```

2. Configure Nginx (see Nginx Configuration section)

3. Start server:
```bash
npm run pm2:prod
```

4. Verify:
```bash
# Check server status
pm2 status

# Test HTTP endpoint
curl http://your-domain.com/ssh-ws/auth/status
```

Expected response: `{"authenticated":false}`

## Nginx Configuration

### Quick Configuration

Add this to your Nginx server block:

```nginx
location /ssh-ws/ {
    proxy_pass http://localhost:8080/ssh-ws/;
    proxy_http_version 1.1;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Standard headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts for WebSocket
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    
    # Cookie support
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    
    # Disable buffering
    proxy_buffering off;
    
    # Allow large messages
    client_max_body_size 64k;
}
```

### Complete Nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS (recommended)
    # return 301 https://$server_name$request_uri;
}

server {
    # Uncomment for HTTPS
    # listen 443 ssl http2;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;
    
    listen 80;
    server_name your-domain.com;
    
    # SSH WebSocket Server
    location /ssh-ws/ {
        proxy_pass http://localhost:8080/ssh-ws/;
        proxy_http_version 1.1;
        
        # WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
        
        # Cookie support
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
        
        # Buffering
        proxy_buffering off;
        
        # Message size
        client_max_body_size 64k;
    }
    
    # Optional: serve other content
    location / {
        root /var/www/html;
        index index.html;
    }
}
```

### HTTPS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ... rest of configuration
}
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=ssh_ws:10m rate=10r/s;

location /ssh-ws/ {
    limit_req zone=ssh_ws burst=20;
    # ... rest of config
}
```

### IP Whitelisting

```nginx
location /ssh-ws/ {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    # ... rest of config
}
```

### Testing Nginx Configuration

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
# or
sudo nginx -s reload

# Test endpoint
curl http://your-domain.com/ssh-ws/auth/status
```

### Root Path Deployment

If deploying at root path instead of `/ssh-ws`:

1. Set `BASE_PATH=` (empty) in environment
2. Use this Nginx config:

```nginx
location / {
    proxy_pass http://localhost:8080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_buffering off;
}
```

## API Documentation

### HTTP Endpoints

**Without BASE_PATH:**
- `POST /auth/login` - Authenticate user
- `POST /auth/logout` - Logout user
- `GET /auth/status` - Check authentication status
- `GET /` - Web interface

**With BASE_PATH (e.g., /ssh-ws):**
- `POST /ssh-ws/auth/login`
- `POST /ssh-ws/auth/logout`
- `GET /ssh-ws/auth/status`
- `GET /ssh-ws/`

### WebSocket Messages

**Client to Server:**
- `auth` - Authenticate with credentials
- `connect` - Establish SSH connection
- `data` - Send data to SSH session
- `disconnect` - Close SSH connection
- `ping` - Heartbeat ping
- `refresh_token` - Refresh JWT token
- `status` - Get server status

**Server to Client:**
- `auth_success` - Authentication successful
- `connected` - SSH connection established
- `data` - SSH session data
- `closed` - SSH connection closed
- `error` - Error message
- `pong` - Heartbeat response
- `token_refreshed` - Token refresh successful
- `status` - Server status response

## Client Examples

Client examples are located in the `examples/` directory.

### Browser Client

**Location:** `examples/browser-client.html`

A full-featured web interface with:
- User authentication
- SSH connection management
- Command execution
- Real-time output display

**How to use:**
1. Start the server
2. Open the file in a browser, or
3. Access through the server:
   - Local: `http://localhost:8080/`
   - Behind Nginx: `http://your-domain.com/ssh-ws/`

The browser client automatically detects the base path from the URL.

### Node.js Client

**Location:** `examples/client-example.js`

Demonstrates programmatic usage with:
- HTTP authentication
- WebSocket connection
- SSH operations
- Message handling

**How to use:**

```bash
# Local development
node examples/client-example.js

# Remote server with base path
BASE_URL=http://your-domain.com BASE_PATH=/ssh-ws node examples/client-example.js
```

**Example Code:**
```javascript
import WebSocket from 'ws';

const BASE_URL = 'http://your-domain.com';
const BASE_PATH = '/ssh-ws';
const WS_URL = BASE_URL.replace('http', 'ws') + BASE_PATH;

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    username: 'admin',
    password: 'admin123'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'auth_success') {
    // Connect to SSH
    ws.send(JSON.stringify({
      type: 'connect',
      config: {
        host: 'example.com',
        port: 22,
        username: 'sshuser',
        password: 'sshpass'
      }
    }));
  }
});
```

## PM2 Commands

### Starting the Server

```bash
# Start with current environment
npm run pm2:start

# Development mode (no base path)
npm run pm2:dev

# Production mode (with /ssh-ws base path)
npm run pm2:prod
```

### Controlling the Server

```bash
# Stop server
npm run pm2:stop

# Restart server
npm run pm2:restart

# Zero-downtime reload
npm run pm2:reload

# Remove from PM2
npm run pm2:delete
```

### Monitoring

```bash
# View logs
npm run pm2:logs

# Monitor resources
npm run pm2:monit

# View status
npm run pm2:status
```

### PM2 Environment Modes

**Development:**
```bash
pm2 start ecosystem.config.cjs --env development
```
- `BASE_PATH`: empty
- `MAX_CONNECTIONS`: 100
- `NODE_ENV`: development

**Production:**
```bash
pm2 start ecosystem.config.cjs --env production
```
- `BASE_PATH`: /ssh-ws
- `MAX_CONNECTIONS`: 1000
- `NODE_ENV`: production

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs ssh-websocket-server

# View specific log lines
pm2 logs ssh-websocket-server --lines 100

# Process status
pm2 status
```

### Health Checks

```bash
# Check server status
curl http://localhost:8080/auth/status

# With Nginx base path
curl http://your-domain.com/ssh-ws/auth/status
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log | grep ssh-ws

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### System Status

Use the WebSocket `status` message (admin only):
```json
{
  "type": "status"
}
```

Response includes:
- Active connections
- Max connections
- Authenticated status
- User info
- Server uptime
- Memory usage

## Troubleshooting

### Common Issues

#### 502 Bad Gateway

**Cause:** Backend server not running or not accessible

**Solution:**
```bash
# Check if server is running
pm2 status

# If not running, start it
npm run pm2:prod

# Check logs
pm2 logs ssh-websocket-server

# Restart if needed
npm run pm2:restart
```

#### 404 Not Found

**Cause:** Path mismatch between Nginx and server

**Solution:**
- Check server BASE_PATH: `pm2 logs | grep "Base path"`
- Verify Nginx location matches: `/ssh-ws/`
- Ensure both have trailing slashes

#### WebSocket Connection Failed

**Cause:** Missing WebSocket upgrade headers

**Solution:** Verify Nginx config has:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_http_version 1.1;
```

#### Authentication Not Working

**Cause:** Missing cookie headers

**Solution:** Add to Nginx config:
```nginx
proxy_set_header Cookie $http_cookie;
proxy_pass_header Set-Cookie;
```

#### Connection Timeout

**Cause:** Default timeouts too short

**Solution:** Increase timeouts in Nginx:
```nginx
proxy_read_timeout 86400;
proxy_send_timeout 86400;
proxy_connect_timeout 60;
```

#### User Not Found After Adding

**Solution:**
- Restart the server to load new users
- Check CSV file format and syntax
- Verify file permissions on `cred.csv`

#### JWT_SECRET Not Set

**Solution:**
- Generate a secure secret: `openssl rand -base64 32`
- Add to `.env` file: `JWT_SECRET=your-generated-secret`
- Restart server

### Troubleshooting Checklist

- [ ] Server is running with correct BASE_PATH
- [ ] Nginx configuration is valid (`nginx -t`)
- [ ] Nginx reloaded after config changes
- [ ] WebSocket upgrade headers present
- [ ] Timeouts set appropriately
- [ ] Cookie headers forwarded
- [ ] Firewall allows traffic on required ports
- [ ] CORS settings allow your origin
- [ ] SSL certificates valid (if using HTTPS)
- [ ] JWT_SECRET is set and secure
- [ ] Users exist in cred.csv with correct permissions
- [ ] File permissions on cred.csv are correct

### Debug Commands

```bash
# Check server configuration
pm2 logs ssh-websocket-server | grep "Base path"
pm2 logs ssh-websocket-server | grep "running on"

# Test server directly (bypass Nginx)
curl http://localhost:8080/ssh-ws/auth/status

# Test through Nginx
curl http://your-domain.com/ssh-ws/auth/status

# Check Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if port is in use
lsof -i :8080

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env)"

# List users
npm run user:list

# Test password hash
npm run generate-hash testpassword
```

### Performance Issues

If experiencing performance issues:

1. **Increase PM2 instances:**
```javascript
// ecosystem.config.cjs
instances: 'max', // Use all CPU cores
```

2. **Increase connection limits:**
```bash
# .env
MAX_CONNECTIONS=1000
```

3. **Enable Nginx caching (for static content):**
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
```

4. **Monitor resource usage:**
```bash
pm2 monit
```

## Backup and Restore

### Backup Critical Files

```bash
# Backup user credentials
cp cred.csv cred.csv.backup

# Backup environment configuration
cp .env .env.backup

# Backup PM2 configuration
pm2 save
```

### Restore

```bash
# Restore PM2 processes
pm2 resurrect

# Restore files
cp cred.csv.backup cred.csv
cp .env.backup .env

# Restart server
npm run pm2:restart
```

## Rolling Updates

Update without downtime:

```bash
# Pull latest code
git pull

# Install dependencies if needed
npm install

# Zero-downtime reload
npm run pm2:reload

# Or restart if reload doesn't work
npm run pm2:restart
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- Security best practices are maintained
- Documentation is updated
- Tests pass (if applicable)

## Support

For issues or questions:
1. Check this documentation
2. Review server logs: `pm2 logs ssh-websocket-server`
3. Verify Nginx config: `sudo nginx -t`
4. Test endpoints directly
5. Check firewall and network configuration
