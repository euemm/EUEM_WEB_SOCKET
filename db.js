import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const DEFAULT_PERMISSIONS = ['ssh:connect', 'ssh:data', 'ssh:disconnect', 'system:monitor'];

const dbConfig = {};

if (process.env.DATABASE_URL) {
	dbConfig.connectionString = process.env.DATABASE_URL;
} else {
	dbConfig.host = process.env.DB_HOST || 'localhost';
	dbConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
	dbConfig.user = process.env.DB_USER;
	dbConfig.password = process.env.DB_PASSWORD;
	dbConfig.database = process.env.DB_NAME || 'euem_db';
}

if (process.env.DB_SSL === 'true') {
	dbConfig.ssl = {
		rejectUnauthorized: false
	};
}

export const pool = new Pool(dbConfig);

export async function verifyDatabaseConnection() {
	const client = await pool.connect();
	try {
		await client.query('SELECT 1');
	} finally {
		client.release();
	}
}

export async function findUserByIdentifier(identifier) {
	if (!identifier) {
		return null;
	}

	const normalized = identifier.trim();
	if (!normalized) {
		return null;
	}

	const query = `
		SELECT
			id,
			email,
			password,
			is_verified,
			is_enabled
		FROM users
		WHERE email = $1
		LIMIT 1
	`;

	const { rows } = await pool.query(query, [normalized]);
	return rows[0] || null;
}

export function buildAuthProfile(record) {
	return {
		id: record.id,
		username: record.email,
		role: 'user',
		permissions: DEFAULT_PERMISSIONS,
		isVerified: record.is_verified,
		isEnabled: record.is_enabled
	};
}


