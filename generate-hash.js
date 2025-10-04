import bcrypt from 'bcryptjs';

// Utility script to generate bcrypt hashes for passwords
// Usage: node generate-hash.js <password>

const password = process.argv[2];

if (!password) {
  console.log('Usage: node generate-hash.js <password>');
  console.log('Example: node generate-hash.js mypassword123');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(`Password: ${password}`);
console.log(`Hash: ${hash}`);

// Verify the hash
const isValid = bcrypt.compareSync(password, hash);
console.log(`Verification: ${isValid ? 'Valid' : 'Invalid'}`);
