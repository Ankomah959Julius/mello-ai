import pkg from 'pg';
const { Pool } = pkg;
import config from './environment.js';

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('[ERROR] Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const query = async (text, params) => {
  return pool.query(text, params);
};

export default pool;
