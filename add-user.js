import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Available roles and permissions
const ROLES = {
  admin: {
    permissions: ['ssh:connect', 'ssh:data', 'ssh:disconnect', 'system:monitor']
  },
  user: {
    permissions: ['ssh:connect', 'ssh:data', 'ssh:disconnect']
  }
};

function generatePasswordHash(password) {
  return bcrypt.hashSync(password, 10);
}

function readUsersFromCSV() {
  const csvPath = path.join(__dirname, 'cred.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('cred.csv file not found. Please create it first.');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const header = lines[0];
  const users = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim()) {
      // Parse CSV line properly (handle quoted permissions)
      const parts = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      const [username, password, role, permissions] = parts;
      users.push({
        username: username.trim(),
        password: password.trim(),
        role: role.trim(),
        permissions: permissions ? permissions.replace(/"/g, '').trim() : ''
      });
    }
  }

  return { header, users };
}

function writeUsersToCSV(header, users) {
  const csvPath = path.join(__dirname, 'cred.csv');
  const csvContent = [header, ...users.map(user => 
    `${user.username},${user.password},${user.role},"${user.permissions}"`
  )].join('\n') + '\n';

  fs.writeFileSync(csvPath, csvContent);
  console.log(`Users saved to ${csvPath}`);
}

function addUser(username, password, role = 'user') {
  // Validate inputs
  if (!username || !password) {
    console.error('Username and password are required');
    return false;
  }

  if (!ROLES[role]) {
    console.error(`Invalid role. Available roles: ${Object.keys(ROLES).join(', ')}`);
    return false;
  }

  // Read existing users
  const { header, users } = readUsersFromCSV();

  // Check if user already exists
  if (users.find(user => user.username === username)) {
    console.error(`User '${username}' already exists`);
    return false;
  }

  // Generate password hash
  const passwordHash = generatePasswordHash(password);
  const userPermissions = ROLES[role].permissions.join(',');

  // Add new user
  users.push({
    username,
    password: passwordHash,
    role,
    permissions: userPermissions
  });

  // Write back to CSV
  writeUsersToCSV(header, users);

  console.log(`User '${username}' added successfully with role '${role}'`);
  console.log(`Permissions: ${userPermissions}`);
  return true;
}

function listUsers() {
  const { users } = readUsersFromCSV();
  
  console.log('\nCurrent users:');
  console.log('='.repeat(80));
  console.log('Username'.padEnd(20) + 'Role'.padEnd(10) + 'Permissions');
  console.log('='.repeat(80));
  
  users.forEach(user => {
    console.log(
      user.username.padEnd(20) + 
      user.role.padEnd(10) + 
      user.permissions
    );
  });
  
  console.log('='.repeat(80));
  console.log(`Total users: ${users.length}`);
}

function deleteUser(username) {
  const { header, users } = readUsersFromCSV();
  
  const userIndex = users.findIndex(user => user.username === username);
  if (userIndex === -1) {
    console.error(`User '${username}' not found`);
    return false;
  }
  
  users.splice(userIndex, 1);
  writeUsersToCSV(header, users);
  
  console.log(`User '${username}' deleted successfully`);
  return true;
}

// Command line interface
const command = process.argv[2];
const username = process.argv[3];
const password = process.argv[4];
const role = process.argv[5];

switch (command) {
  case 'add':
    if (!username || !password) {
      console.log('Usage: node add-user.js add <username> <password> [role]');
      console.log('Roles: admin, user');
      process.exit(1);
    }
    addUser(username, password, role || 'user');
    break;

  case 'list':
    listUsers();
    break;

  case 'delete':
    if (!username) {
      console.log('Usage: node add-user.js delete <username>');
      process.exit(1);
    }
    deleteUser(username);
    break;

  case 'hash':
    if (!username) {
      console.log('Usage: node add-user.js hash <password>');
      process.exit(1);
    }
    const hash = generatePasswordHash(username); // username is actually password here
    console.log(`Password: ${username}`);
    console.log(`Hash: ${hash}`);
    console.log(`Verification: ${bcrypt.compareSync(username, hash) ? 'Valid' : 'Invalid'}`);
    break;

  default:
    console.log('SSH WebSocket Server User Management');
    console.log('====================================');
    console.log('');
    console.log('Usage:');
    console.log('  node add-user.js add <username> <password> [role]  - Add new user');
    console.log('  node add-user.js list                              - List all users');
    console.log('  node add-user.js delete <username>                 - Delete user');
    console.log('  node add-user.js hash <password>                   - Generate password hash');
    console.log('');
    console.log('Roles:');
    console.log('  admin - Full access including system monitoring');
    console.log('  user  - SSH operations only (default)');
    console.log('');
    console.log('Examples:');
    console.log('  node add-user.js add alice mypassword123');
    console.log('  node add-user.js add bob secretpass admin');
    console.log('  node add-user.js list');
    console.log('  node add-user.js delete olduser');
    console.log('  node add-user.js hash mypassword123');
}
