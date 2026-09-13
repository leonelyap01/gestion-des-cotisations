/**
 * Applique supabase/schema.sql à la base PostgreSQL du projet Supabase.
 *
 * Usage (PowerShell) :
 *   $env:DATABASE_URL = "postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres"
 *   node scripts/setup-db.mjs
 *
 * Le mot de passe n'est jamais écrit dans un fichier du dépôt : il n'est lu
 * que depuis la variable d'environnement DATABASE_URL.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL manquant.\n" +
      'PowerShell : $env:DATABASE_URL = "postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres"',
  );
  process.exit(1);
}

// Les fichiers sont appliqués dans l'ordre ; tous sont idempotents.
const FILES = ["schema.sql", "annonces.sql", "cartes.sql", "roles.sql"];

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connecté à la base.");

for (const file of FILES) {
  const sql = fs.readFileSync(path.join("supabase", file), "utf8");
  await client.query(sql);
  console.log("Appliqué :", file);
}

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
);
console.log("Tables présentes :", rows.map((r) => r.table_name).join(", "));

await client.end();
