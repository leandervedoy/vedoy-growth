// PGlite executes real PostgreSQL RLS/PLpgSQL against synthetic fixtures in memory.
// It does not start GoTrue/PostgREST or connect to any hosted Supabase database.
// Install @electric-sql/pglite@0.5.13 in an isolated directory, then run:
// GROWTH_TEST_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node tests/sql/run-launch-tests.mjs
import { readFile } from 'node:fs/promises';

const { PGlite } = await import(process.env.GROWTH_TEST_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    -- Emulate legacy broad default grants: the migration must explicitly remove them.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  const migration = await readFile(new URL('../../supabase/migrations/20261029010545_growth_launch_registration.sql', import.meta.url), 'utf8');
  const tests = await readFile(new URL('./growth_launch_registration.test.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(tests);
  const result = await db.query('select count(*)::int as remaining_test_users from auth.users');
  if (result.rows[0].remaining_test_users !== 0) throw new Error('Test fixtures did not roll back');
  console.log('PASS: launch migration; signup defaults/validation; independent consent; owner RLS; immutable audit; erasure; rollback.');
} finally {
  await db.close();
}
