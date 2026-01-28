const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rbac_os',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

// Test connection
pool.query('SELECT NOW()')
    .then(() => console.log('✓ Database connected'))
    .catch(err => console.error('✗ Database connection failed:', err.message));

module.exports = pool;
