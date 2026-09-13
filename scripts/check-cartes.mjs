/**
 * Contrôle de l'installation du module « cartes de membre » (lecture seule).
 *
 * Usage (PowerShell) :
 *   $env:DATABASE_URL = "postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres"
 *   node scripts/check-cartes.mjs
 */

import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const cols = await client.query(
  `select table_name, column_name
     from information_schema.columns
    where table_schema = 'public'
      and column_name in ('card_number','role','photo_path','card_issued_at',
                          'motto','city','phone','logo_url','card_prefix')
    order by table_name, column_name`,
);
console.log("Colonnes ajoutées :");
for (const r of cols.rows) console.log("   " + r.table_name + "." + r.column_name);

const buckets = await client.query("select id, public from storage.buckets order by id");
console.log(
  "Buckets :",
  buckets.rows.map((b) => b.id + (b.public ? " (public)" : " (privé)")).join(", ") || "aucun",
);

const s = await client.query(
  "select association_name, motto, city, phone, logo_url, card_prefix from settings where id = 1",
);
console.log("Identité :", s.rows[0]);

const fn = await client.query(
  "select proname from pg_proc where proname = 'verifier_carte'",
);
console.log("Fonction QR :", fn.rowCount ? "verifier_carte présente" : "ABSENTE");

await client.end();
