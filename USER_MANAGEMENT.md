# User Management Guide

This guide explains how to add, modify, and manage user accounts for the SSH WebSocket server.

## Quick Start

### Add a New User
```bash
# Add a regular user
npm run user:add alice mypassword123

# Add an admin user
npm run user:add bob secretpass admin
```

### List All Users
```bash
npm run user:list
```

### Delete a User
```bash
npm run user:delete olduser
```

### Generate Password Hash
```bash
npm run generate-hash mypassword123
```

## User Management Methods

### Method 1: Command Line Tool (Recommended)

The `add-user.js` script provides a complete user management interface:

```bash
# Show help
node add-user.js

# Add users
node add-user.js add <username> <password> [role]

# List users
node add-user.js list

# Delete users
node add-user.js delete <username>

# Generate password hash
node add-user.js hash <password>
```

### Method 2: Manual CSV Editing

1. **Generate password hash:**
   ```bash
   npm run generate-hash yourpassword123
   ```

2. **Edit `cred.csv` file:**
   ```csv
   username,password,role,permissions
   admin,$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi,admin,"ssh:connect,ssh:data,ssh:disconnect,system:monitor"
   user,$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi,user,"ssh:connect,ssh:data,ssh:disconnect"
   newuser,$2a$10$1CY250sZcfg9VH5BwjX1GuyHDNsC2tXhtHEbca7jT4.4CDUvA3a9K,user,"ssh:connect,ssh:data,ssh:disconnect"
   ```

3. **Restart the server** to load new users

## User Roles

### Admin Role
- **Permissions**: `ssh:connect`, `ssh:data`, `ssh:disconnect`, `system:monitor`
- **Description**: Full access including system monitoring
- **Use case**: Server administrators, system operators

### User Role (Default)
- **Permissions**: `ssh:connect`, `ssh:data`, `ssh:disconnect`
- **Description**: SSH operations only
- **Use case**: Regular users, developers

## CSV File Format

The `cred.csv` file contains user credentials in the following format:

```csv
username,password,role,permissions
```

### Fields
- **username**: Unique identifier for the user
- **password**: bcrypt hashed password (NOT plain text)
- **role**: User role (`admin` or `user`)
- **permissions**: Comma-separated list of permissions

### Example
```csv
username,password,role,permissions
admin,$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi,admin,"ssh:connect,ssh:data,ssh:disconnect,system:monitor"
alice,$2a$10$1CY250sZcfg9VH5BwjX1GuyHDNsC2tXhtHEbca7jT4.4CDUvA3a9K,user,"ssh:connect,ssh:data,ssh:disconnect"
```

## NPM Scripts

The following npm scripts are available for user management:

```bash
# User management
npm run user:add <username> <password> [role]  # Add user
npm run user:list                              # List all users
npm run user:delete <username>                 # Delete user
npm run user:help                              # Show help

# Password utilities
npm run generate-hash <password>               # Generate password hash
```

## Security Best Practices

### Password Security
1. **Use strong passwords**: At least 8 characters with mixed case, numbers, and symbols
2. **Never store plain text passwords**: Always use bcrypt hashes
3. **Regular password updates**: Change passwords periodically
4. **Unique passwords**: Don't reuse passwords across systems

### User Management
1. **Principle of least privilege**: Give users only necessary permissions
2. **Regular audits**: Review user list and permissions regularly
3. **Remove unused accounts**: Delete accounts for users who no longer need access
4. **Monitor access**: Check server logs for authentication attempts

### File Security
1. **Protect CSV file**: Ensure `cred.csv` has proper file permissions
2. **Backup securely**: Store backups of user data securely
3. **Version control**: Don't commit `cred.csv` to version control (already in .gitignore)

## Examples

### Adding Multiple Users
```bash
# Add development team
npm run user:add developer1 devpass123
npm run user:add developer2 devpass456
npm run user:add developer3 devpass789

# Add admin user
npm run user:add sysadmin adminpass123 admin

# List all users
npm run user:list
```

### Changing User Role
```bash
# Delete user
npm run user:delete olduser

# Add with new role
npm run user:add olduser newpassword123 admin
```

### Password Reset
```bash
# Generate new hash
npm run generate-hash newpassword123

# Edit cred.csv manually to replace the password hash
# Or delete and re-add user
npm run user:delete username
npm run user:add username newpassword123
```

## Troubleshooting

### Common Issues

1. **User not found after adding**
   - Restart the server to load new users
   - Check CSV file format and syntax

2. **Authentication fails**
   - Verify password hash is correct
   - Check username spelling
   - Ensure CSV file is readable

3. **Permission denied**
   - Check user role and permissions
   - Verify CSV file permissions

4. **CSV parsing errors**
   - Check for special characters in usernames
   - Ensure proper CSV formatting
   - Use the command line tool instead of manual editing

### Validation
```bash
# Check if user exists
npm run user:list | grep username

# Test password hash
npm run generate-hash testpass
# Copy the hash and test manually if needed
```

## Default Users

The server comes with these default users:

| Username | Password | Role  | Permissions |
|----------|----------|-------|-------------|
| admin    | admin123 | admin | Full access |
| user     | user123  | user  | SSH only    |
| test     | (hashed) | user  | SSH only    |

**Important**: Change default passwords before production use!

## Production Considerations

1. **Change default passwords**: Never use default passwords in production
2. **Use strong JWT secrets**: Set a secure `JWT_SECRET` environment variable
3. **Enable HTTPS**: Use secure connections for production
4. **Regular backups**: Backup user data regularly
5. **Monitor access**: Set up logging and monitoring for authentication events
