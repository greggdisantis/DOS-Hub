import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('No DATABASE_URL found');
  process.exit(1);
}

const conn = await createConnection(url);
const [rows] = await conn.query('SHOW COLUMNS FROM users');
const cols = rows.map(r => r.Field);
console.log('Users columns:', cols.join(', '));
console.log('isEmployee present:', cols.includes('isEmployee'));
await conn.end();
