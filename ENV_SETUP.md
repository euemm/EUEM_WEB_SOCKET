# Environment Setup

This document explains how to configure environment variables for the WebSocket server.

## Environment Variables

The server uses environment variables for configuration. Create a `.env` file in the project root with the following variables:

### Required Variables

```bash
# JWT Secret Key - MUST be changed in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Optional Variables (with defaults)

```bash
# Server Configuration
PORT=8080
MAX_CONNECTIONS=100
CONNECTION_TIMEOUT=30000
MESSAGE_SIZE_LIMIT=65536
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=10000
JWT_EXPIRES_IN=15m

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
CORS_CREDENTIALS=true
```

## Setup Instructions

### 1. Create Environment File

Copy the example file:
```bash
cp env.example .env
```

### 2. Update JWT Secret

**IMPORTANT**: Generate a strong, random JWT secret for production:

```bash
# Generate a random secret (32 characters)
openssl rand -base64 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Update your `.env` file:
```bash
JWT_SECRET=your-generated-secret-here
```

### 3. Customize Configuration (Optional)

Edit `.env` to adjust server settings:

```bash
# Example production configuration
PORT=8080
MAX_CONNECTIONS=1000
CONNECTION_TIMEOUT=30000
MESSAGE_SIZE_LIMIT=65536
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=10000
JWT_EXPIRES_IN=15m
```

## Security Notes

### Production Deployment

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Use strong JWT secrets** - At least 32 characters, randomly generated
3. **Set environment variables directly** - Don't rely on `.env` files in production
4. **Use HTTPS/WSS** - Encrypt WebSocket connections
5. **Restrict access** - Use firewalls and IP whitelisting

### Environment Variable Priority

1. **System environment variables** (highest priority)
2. **PM2 ecosystem configuration**
3. **`.env` file**
4. **Default values** (lowest priority)

## PM2 Configuration

The PM2 ecosystem file (`ecosystem.config.cjs`) includes environment variables for both development and production modes.

### Development Mode
```bash
npm run pm2:dev
```

### Production Mode
```bash
npm run pm2:prod
```

## Docker Deployment

For Docker deployments, pass environment variables:

```bash
docker run -e JWT_SECRET=your-secret -e PORT=8080 your-app
```

Or use a `.env` file:
```bash
docker run --env-file .env your-app
```

## Troubleshooting

### Common Issues

1. **JWT_SECRET not set**: Server will use default value (not secure for production)
2. **Port already in use**: Change PORT in `.env` file
3. **Permission denied**: Check file permissions on `.env` file

### Verification

Check if environment variables are loaded:
```bash
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
```

## Examples

### Development
```bash
# .env
JWT_SECRET=dev-secret-key
PORT=8080
MAX_CONNECTIONS=10
```

### Production
```bash
# .env
JWT_SECRET=super-secure-random-key-32-chars-long
PORT=8080
MAX_CONNECTIONS=1000
CONNECTION_TIMEOUT=30000
MESSAGE_SIZE_LIMIT=65536
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=10000
JWT_EXPIRES_IN=15m
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=true
```

### Staging
```bash
# .env
JWT_SECRET=staging-secret-key
PORT=8081
MAX_CONNECTIONS=100
CORS_ORIGIN=http://localhost:3000,http://staging.yourdomain.com
CORS_CREDENTIALS=true
```

## CORS Configuration

### Development (Default)
- **Automatic localhost support**: All localhost and 127.0.0.1 origins are allowed
- **Credentials enabled**: Cookies and authentication headers are allowed
- **Flexible origins**: Any origin is allowed in development mode

### Production
- **Restricted origins**: Only origins specified in `CORS_ORIGIN` are allowed
- **Secure credentials**: Cookies only work with allowed origins
- **Strict validation**: Unknown origins are blocked

### Configuration Options

```bash
# Allow specific origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Enable/disable credentials (cookies, authorization headers)
CORS_CREDENTIALS=true
```

### Common Development Origins
The server automatically allows these common development origins:
- `http://localhost:3000` (React default)
- `http://localhost:3001` (Alternative React port)
- `http://localhost:8080` (Vue default)
- `http://localhost:8081` (Alternative port)
- `http://127.0.0.1:*` (All localhost variants)

### Testing CORS
```bash
# Test from browser console
fetch('http://localhost:8080/auth/status', {
  credentials: 'include'
}).then(r => r.json()).then(console.log);

# Test with curl
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8080/auth/login
```

Remember to restart the server after changing environment variables!
