module.exports = {
  apps: [{
    name: 'ssh-websocket-server',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 8080,
      BASE_PATH: '',
      MAX_CONNECTIONS: 100,
      CONNECTION_TIMEOUT: 30000,
      MESSAGE_SIZE_LIMIT: 65536,
      HEARTBEAT_INTERVAL: 30000,
      HEARTBEAT_TIMEOUT: 10000,
      JWT_EXPIRES_IN: '15m'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
      BASE_PATH: '/ssh-ws',
      MAX_CONNECTIONS: 1000,
      CONNECTION_TIMEOUT: 30000,
      MESSAGE_SIZE_LIMIT: 65536,
      HEARTBEAT_INTERVAL: 30000,
      HEARTBEAT_TIMEOUT: 10000,
      JWT_EXPIRES_IN: '15m'
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Advanced settings
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Health monitoring
    health_check_grace_period: 3000,
    
    // Cluster settings
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Environment variables
    merge_logs: true,
    time: true
  }],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/ssh-websocket-server.git',
      path: '/var/www/ssh-websocket-server',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
