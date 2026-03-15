const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || '';

// Neon requires SSL even locally; suppress pg deprecation warning about sslmode
const needsSsl = connectionString.includes('neon.tech') || process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

module.exports = { pool };
