// db-setup: Apply supabase/schema.sql via SUPABASE_DB_URL
// If the variable is missing, print instructions for manual setup

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Auto-load .env.local or .env
for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  SUPABASE_DB_URL is not set.                                ║');
    console.log('║                                                              ║');
    console.log('║  To set up the database manually:                            ║');
    console.log('║  1. Open the Supabase Dashboard → SQL Editor                 ║');
    console.log('║  2. Paste the contents of supabase/schema.sql                ║');
    console.log('║  3. Click "Run"                                              ║');
    console.log('║                                                              ║');
    console.log('║  Alternatively, set SUPABASE_DB_URL in your .env.local       ║');
    console.log('║  to the Postgres connection string (Session pooler,          ║');
    console.log('║  found in Supabase Dashboard → Settings → Database)          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    process.exit(0);
  }

  const schemaPath = resolve(process.cwd(), 'supabase', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  try {
    // Dynamic import since pg is optional
    const { default: pg } = await import('pg');
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log('Connected to database. Applying schema...');

    await client.query(schema);
    console.log('✓ Schema applied successfully.');

    await client.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('\n✗ Failed to apply schema:', message);
    console.log('\nPlease paste supabase/schema.sql into the Supabase SQL Editor instead.');
    process.exit(1);
  }
}

main();
