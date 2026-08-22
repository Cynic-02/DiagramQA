/**
 * Align the Prisma datasource provider with whatever DATABASE_URL actually is.
 *
 * Prisma does not allow env() for `provider`, so the schema has to be
 * rewritten before `prisma generate` runs. This script is scheme-driven
 * rather than "always switch to postgres", so it is safe to run in the
 * normal build on every machine:
 *
 *   DATABASE_URL=postgres://...  -> provider = "postgresql"   (Vercel/Neon)
 *   DATABASE_URL=file:./dev.db   -> provider = "sqlite"       (local dev)
 *
 * Without this wired into `build`, a production deploy generates a SQLite
 * client and every query against Neon fails at runtime.
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const url = process.env.DATABASE_URL || '';

let target;
if (/^postgres(ql)?:\/\//i.test(url)) target = 'postgresql';
else if (/^file:/i.test(url)) target = 'sqlite';
else if (/^mysql:\/\//i.test(url)) target = 'mysql';

if (!target) {
  // No usable DATABASE_URL at build time (e.g. `prisma generate` run bare).
  // Leave the schema untouched rather than guessing wrong.
  console.log('prepare-db: DATABASE_URL missing or unrecognised - leaving provider as-is.');
  process.exit(0);
}

try {
  const content = fs.readFileSync(schemaPath, 'utf8');
  const match = content.match(/provider\s*=\s*"(sqlite|postgresql|mysql)"/);

  if (!match) {
    console.error('prepare-db: no datasource provider found in schema.prisma');
    process.exit(1);
  }

  if (match[1] === target) {
    console.log('prepare-db: provider already "' + target + '".');
    process.exit(0);
  }

  fs.writeFileSync(
    schemaPath,
    content.replace(match[0], 'provider = "' + target + '"'),
    'utf8'
  );
  console.log('prepare-db: switched provider "' + match[1] + '" -> "' + target + '".');
} catch (e) {
  console.error('prepare-db failed:', e);
  process.exit(1);
}
