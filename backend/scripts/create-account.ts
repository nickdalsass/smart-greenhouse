/**
 * Create a greenhouse login account.
 *
 *   cd backend && pnpm exec tsx scripts/create-account.ts "My Greenhouse" 'secret'
 */
import { hashPassword } from "../src/auth.js";
import pool from "../src/db.js";
import { loadEnv } from "../src/loadEnv.js";

loadEnv();

const name = process.argv[2]?.trim();
const password = process.argv[3];

if (!name || password == null || password === "") {
  console.error(
    'usage: pnpm exec tsx scripts/create-account.ts "Greenhouse Name" \'password\'',
  );
  process.exit(1);
}

const passwordHash = await hashPassword(password);
try {
  const { rows } = await pool.query<{ id: number; greenhouse_name: string }>(
    `INSERT INTO accounts (greenhouse_name, password_hash)
     VALUES ($1, $2)
     RETURNING id, greenhouse_name`,
    [name, passwordHash],
  );
  console.log(`created account #${rows[0].id}: ${rows[0].greenhouse_name}`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
