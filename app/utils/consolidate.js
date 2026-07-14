import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve('supabase/migrations');
const outputFile = path.resolve('supabase/consolidated_migrations.sql');

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort(); // Sorts them alphabetically/chronologically

let consolidatedSql = '-- ==========================================================\n';
consolidatedSql += '-- OPUSZEN CONSOLIDATED DATABASE MIGRATIONS\n';
consolidatedSql += '-- Apply this entire file in Supabase Dashboard SQL Editor\n';
consolidatedSql += '-- ==========================================================\n\n';

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  consolidatedSql += `-- ----------------------------------------------------------\n`;
  consolidatedSql += `-- Migration File: ${file}\n`;
  consolidatedSql += `-- ----------------------------------------------------------\n`;
  consolidatedSql += content;
  consolidatedSql += '\n\n';
}

fs.writeFileSync(outputFile, consolidatedSql, 'utf8');
console.log(`Successfully consolidated ${files.length} migrations into: ${outputFile}`);
