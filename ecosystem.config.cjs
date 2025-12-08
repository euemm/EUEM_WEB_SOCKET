module.exports = {
	apps: [{
		// ============================================
		// APPLICATION IDENTIFICATION
		// ============================================
		
		// Application name for PM2 process identification
		// Used to identify this process in PM2 commands (pm2 restart websocket-server)
		name: 'websocket-server',
		
		// Entry point script to execute
		// The main server file that PM2 will run
		script: 'server.js',
		
		// ============================================
		// PROCESS SCALING & EXECUTION MODE
		// ============================================
		
		// Number of application instances to run
		// 1 = single process (recommended for WebSocket servers to avoid connection state issues)
		// 'max' = one instance per CPU core (use with cluster mode for load balancing)
		// Using 1 for WebSocket servers to maintain connection state consistency
		instances: 1,
		
		// Execution mode: 'fork' = single process, 'cluster' = load-balanced cluster
		// 'fork' mode: Single Node.js process (lower memory overhead, simpler debugging)
		// 'cluster' mode: Multiple processes sharing the same port (requires instances > 1)
		// Using 'fork' for WebSocket servers to avoid connection state fragmentation
		exec_mode: 'fork',
		
		// ============================================
		// ENVIRONMENT VARIABLES
		// ============================================
		
		// Path to .env file containing application environment variables
		// PM2 will load variables from this file and make them available to the application
		// All application config (PORT, JWT_SECRET, DB settings, etc.) should be in .env
		// The server.js already uses dotenv.config(), but this ensures PM2 also loads them
		env_file: './.env',
		
		// Production environment variables
		// Only PM2-specific or override variables should be here
		// Application variables (PORT, JWT_SECRET, DB_*, etc.) come from .env file
		env_production: {
			// Node.js environment mode
			// 'production' enables production optimizations and disables debug features
			NODE_ENV: 'production'
		},
		
		// ============================================
		// LOGGING CONFIGURATION
		// ============================================
		
		// Combined log file path (stdout + stderr merged into one file)
		// All application output (both normal and error) goes here when merge_logs is true
		log_file: './logs/combined.log',
		
		// Standard output log file path
		// Normal application output (console.log, etc.) goes here
		out_file: './logs/out.log',
		
		// Error output log file path
		// Error output (console.error, uncaught exceptions) goes here
		error_file: './logs/error.log',
		
		// Log date format for timestamps in log files
		// Format: YYYY-MM-DD HH:mm:ss Z (year-month-day hour:minute:second timezone)
		log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
		
		// Log file format type
		// 'json' = structured JSON format (easier for log parsing tools)
		// 'raw' = plain text format (easier for human reading)
		log_type: 'json',
		
		// Merge stdout and stderr into combined log file
		// true = all logs go to log_file in addition to separate out_file/error_file
		// false = logs only go to their respective files
		merge_logs: true,
		
		// Maximum size of each log file before rotation (10MB)
		// When a log file reaches this size, PM2 creates a new file and archives the old one
		max_size: '10M',
		
		// Number of rotated log files to retain
		// PM2 keeps the last 10 rotated log files, then deletes older ones
		// Prevents unlimited disk space consumption from logs
		retain: 10,
		
		// ============================================
		// PROCESS MANAGEMENT & RESTART BEHAVIOR
		// ============================================
		
		// Automatically restart application if it crashes or exits
		// true = PM2 will restart the process if it stops unexpectedly
		// false = PM2 will leave the process stopped after a crash
		autorestart: true,
		
		// File watching for auto-restart on code changes
		// false = disabled (production: saves CPU/memory, prevents accidental restarts)
		// true = enabled (development: auto-restart when files change)
		watch: false,
		
		// Restart application if memory usage exceeds this limit
		// 512M = restart if process uses more than 512 megabytes of RAM
		// Prevents memory leaks from consuming all available system memory
		// Set based on your server's available memory and expected load
		max_memory_restart: '512M',
		
		// Minimum uptime before considering process stable (10 seconds)
		// If process crashes before this time, it's considered unstable
		// Prevents restart loops from processes that crash immediately on startup
		min_uptime: '10s',
		
		// Maximum number of restarts within min_uptime period
		// After 10 restarts within 10 seconds, PM2 stops trying to restart
		// Prevents infinite restart loops that consume system resources
		max_restarts: 10,
		
		// Delay between restarts in milliseconds (4000ms = 4 seconds)
		// PM2 waits this long before attempting to restart after a crash
		// Prevents rapid restart cycles that consume CPU and memory
		restart_delay: 4000,
		
		// Health monitoring grace period in milliseconds (3000ms = 3 seconds)
		// Time to wait before marking process as unhealthy after restart
		// Allows process time to initialize before health checks begin
		health_check_grace_period: 3000,
		
		// ============================================
		// PROCESS TERMINATION & STARTUP TIMEOUTS
		// ============================================
		
		// Time to wait for graceful shutdown before force-killing (5000ms = 5 seconds)
		// When stopping/restarting, PM2 sends SIGTERM and waits for graceful shutdown
		// After this timeout, PM2 force-kills the process with SIGKILL if still running
		kill_timeout: 5000,
		
		// Time to wait for application to start listening (8000ms = 8 seconds)
		// PM2 waits this long for the server to start listening on its port
		// Prevents premature failure detection during slow startup (e.g., DB connection)
		listen_timeout: 8000,
		
		// Disable timestamp prefix in PM2 logs (reduces overhead)
		// false = PM2 doesn't add its own timestamp prefix
		// Logs will still have timestamps from log_date_format and application code
		time: false,
		
		// ============================================
		// NODE.JS RUNTIME OPTIMIZATION
		// ============================================
		
		// Node.js command-line arguments for production optimization
		// --optimize-for-size: Optimize V8 for smaller memory footprint (trades speed for memory)
		// --gc-interval=100: Run garbage collection every 100ms (more frequent GC, trades CPU for memory)
		// These flags help reduce memory usage in production environments
		node_args: '--optimize-for-size --gc-interval=100'
	}],

	// ============================================
	// PM2 DEPLOYMENT CONFIGURATION
	// ============================================
	
	// PM2 deployment configuration for automated deployments
	// Use: pm2 deploy production setup (first time) or pm2 deploy production (updates)
	deploy: {
		production: {
			// SSH username for connecting to production server
			// Change to your server's SSH user (e.g., 'ubuntu', 'deploy', 'root')
			user: 'node',
			
			// Server hostname or IP address for deployment
			// Change to your actual production server address
			host: 'your-server.com',
			
			// Git branch to deploy from
			// PM2 will checkout this branch before deploying
			ref: 'origin/main',
			
			// Git repository URL for cloning/updating code
			// Change to your actual repository URL (SSH format recommended)
			repo: 'git@github.com:username/ssh-websocket-server.git',
			
			// Deployment path on the server
			// Directory where PM2 will clone/update the code
			// Ensure this directory exists and user has write permissions
			path: '/var/www/ssh-websocket-server',
			
			// Commands to run after code deployment
			// 1. Install production dependencies (no dev dependencies)
			// 2. Reload PM2 with production environment
			// Add any other post-deployment tasks here (e.g., database migrations)
			'post-deploy': 'npm install --production && pm2 reload ecosystem.config.cjs --env production',
			
			// Commands to run before first deployment setup
			// Runs once when you execute 'pm2 deploy production setup'
			// Use for initial server setup (e.g., creating directories, setting permissions)
			'pre-setup': ''
		}
	}
};
