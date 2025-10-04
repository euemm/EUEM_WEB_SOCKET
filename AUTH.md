# Authentication and Security

This WebSocket server implements comprehensive authentication and security features.

## Features

### 1. JWT Authentication
- **Short-lived tokens**: 15-minute expiration
- **Secure signing**: Uses JWT_SECRET environment variable
- **Token-based auth**: Replace password auth with JWT tokens

### 2. Permission-Based Authorization
- **Role-based access**: Admin and User roles
- **Granular permissions**: Per-action authorization
- **Permission checking**: Each action requires specific permission

### 3. Message Size Limits
- **64KB limit**: Maximum message size per WebSocket frame
- **Automatic rejection**: Large messages are rejected immediately
- **Connection termination**: Violations result in connection closure

### 4. Heartbeat/Ping-Pong
- **30-second intervals**: Regular ping to check connection health
- **10-second timeout**: Missing pong response closes connection
- **Automatic cleanup**: Dead connections are terminated

## Default Users

### Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: 
  - `ssh:connect` - Connect to SSH servers
  - `ssh:data` - Send data to SSH sessions
  - `ssh:disconnect` - Disconnect SSH sessions
  - `system:monitor` - View server status

### Regular User
- **Username**: `user`
- **Password**: `user123`
- **Permissions**:
  - `ssh:connect` - Connect to SSH servers
  - `ssh:data` - Send data to SSH sessions
  - `ssh:disconnect` - Disconnect SSH sessions

## Message Protocol

### Authentication
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

### SSH Operations (require authentication)
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

### System Monitoring (admin only)
```json
{
  "type": "status"
}
```

### Heartbeat
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

## Security Considerations

### Production Deployment
1. **Change JWT_SECRET**: Set strong, random JWT_SECRET environment variable
2. **Use HTTPS/WSS**: Encrypt WebSocket connections
3. **Database storage**: Replace in-memory user store with database
4. **Rate limiting**: Implement connection rate limiting
5. **IP whitelisting**: Restrict access by IP address

### Environment Variables
```bash
export JWT_SECRET="your-super-secret-jwt-key-here"
export NODE_ENV="production"
```

### Connection Limits
- **Max connections**: 100 concurrent connections
- **Message size**: 64KB per message
- **Heartbeat timeout**: 10 seconds
- **Connection timeout**: 30 seconds

## Error Handling

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

## Client Implementation

See `client-example.js` for a complete client implementation demonstrating:
- Authentication flow
- SSH operations
- Heartbeat handling
- Error handling
