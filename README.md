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
- PostgreSQL-backed credential storage with bcrypt verification
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

# Run database connectivity test (requires configured Postgres env vars)
npm test

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
├── db.js                # PostgreSQL integration
├── tests/               # Automated tests
│   └── db.test.js
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

5. Update `.env` with your JWT secret and database credentials:
```bash
JWT_SECRET=your-generated-secret-here
DB_HOST=localhost
DB_PORT=5432
DB_USER=euem
DB_PASSWORD=your-db-password
DB_NAME=euem_db
```

6. Create or update users directly in PostgreSQL (all passwords must be bcrypt hashes with cost 10):
```bash
docker exec -it postgres16 psql -U euem -d euem_db
INSERT INTO users (email, password, first_name, last_name, is_verified, is_enabled)
VALUES (
  'operator@example.com',
  '<bcrypt-hash>',
  'Ops',
  'User',
  TRUE,
  TRUE
);
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'operator@example.com' AND r.name = 'ADMIN';
```

> Tip: generate a bcrypt hash locally with `node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"`.

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

# Database Configuration
# Alternatively, provide DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_USER=euem
DB_PASSWORD=changeme
DB_NAME=euem_db
DB_SSL=false
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
| `DATABASE_URL` | Postgres connection string | — | `postgresql://user:pass@host:5432/db` |
| `DB_HOST` | Postgres host (when `DATABASE_URL` not set) | `localhost` | `postgres.internal` |
| `DB_PORT` | Postgres port | `5432` | `5432` |
| `DB_USER` | Postgres user | — | `euem` |
| `DB_PASSWORD` | Postgres password | — | `super-secret` |
| `DB_NAME` | Postgres database | `euem_db` | `euem_db` |
| `DB_SSL` | Enable SSL for Postgres | `false` | `true` |

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

## Database Integration

### Schema Overview

- `users`: stores operator accounts (email as unique identifier, bcrypt hash in `password`, verification and enablement flags).
- `roles`: global role definitions (`USER`, `ADMIN` seeded by the init script).
- `user_roles`: many-to-many join between users and roles.
- `verification_tokens`: email OTP store (not required for the signaling server, but available if you need email workflows).

> BCrypt hashes are stored directly in `users.password`. Each hash includes its own salt and cost factor (currently 10).

### Creating Users

1. Generate a bcrypt hash for the desired password:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('ChangeMe!123', 10))"
   ```
2. Insert the user and attach the appropriate role:
   ```sql
   INSERT INTO users (email, password, first_name, last_name, is_verified, is_enabled)
   VALUES ('operator@example.com', '<bcrypt-hash>', 'Ops', 'User', TRUE, TRUE);

   INSERT INTO user_roles (user_id, role_id)
   SELECT u.id, r.id
   FROM users u, roles r
   WHERE u.email = 'operator@example.com' AND r.name = 'ADMIN';
   ```

Any user with an enabled account can authenticate against the WebSocket signaling service; roles can be expanded later if you reintroduce fine-grained permissions.

### Local Verification

- Ensure the `.env` file contains the correct Postgres credentials.
- Run `npm test` to execute the connectivity smoke test in `tests/db.test.js`.
- On success, start the server (`npm start`) and authenticate using the inserted credentials.

### Operational Tips

- For automated provisioning, manage users through migrations or dedicated admin tooling that executes SQL INSERT/UPDATE/DELETE statements.
- Back up your Postgres database using standard tooling (`pg_dump`, snapshots). The signaling server no longer stores user data on disk.
- To disable a user quickly, set `is_enabled = FALSE`; authentication will immediately fail for that account.

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
- Verify the account exists in PostgreSQL: `SELECT email, is_enabled FROM users WHERE email = 'operator@example.com';`
- Ensure the password column contains a valid bcrypt hash (starts with `$2`)
- Confirm `is_enabled = TRUE` and the user has an entry in `user_roles`
- Review server logs for authentication failures

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
- [ ] Database credentials are correct and reachable
- [ ] Operator account exists in `users` with `is_enabled = TRUE`

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

# Inspect users in Postgres
docker exec -it postgres16 psql -U euem -d euem_db -c "SELECT email, is_enabled FROM users;"
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
# Backup operator database (example using docker)
docker exec postgres16 pg_dump -U euem -d euem_db > euem_db_$(date +%F).sql

# Backup environment configuration
cp .env .env.backup

# Backup PM2 configuration
pm2 save
```

### Restore

```bash
# Restore PM2 processes
pm2 resurrect

# Restore environment file
cp .env.backup .env

# Restore database backup
psql -h localhost -U euem -d euem_db < euem_db_backup.sql

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
