import dotenv from 'dotenv';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool, verifyDatabaseConnection } from '../db.js';

dotenv.config();

const hasDatabaseConfig = Boolean(
	process.env.DATABASE_URL ||
	(
		process.env.DB_HOST &&
		process.env.DB_PORT &&
		process.env.DB_USER &&
		process.env.DB_PASSWORD &&
		process.env.DB_NAME
	)
);

test('database connection can be established', { skip: hasDatabaseConfig ? false : 'Database configuration not provided' }, async () => {
	await verifyDatabaseConnection();
	const result = await pool.query('SELECT 1 AS value');
	assert.equal(result.rows[0].value, 1);
});

test.after(async () => {
	await pool.end();
});


