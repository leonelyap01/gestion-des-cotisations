/**
 * Contrôle des rôles et des droits d'accès (lecture seule).
 *
 * Usage (PowerShell) :
 *   $env:DATABASE_URL = "postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres"
 *   node scripts/check-roles.mjs
 */

import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const comptes = await client.query(
  "select email, role, display_name from public.app_users order by role, email",
);
console.log("Comptes du bureau :");
if (comptes.rowCount === 0) console.log("   (aucun)");
for (const r of comptes.rows) {
  console.log("   " + (r.email ?? "—") + "  →  " + r.role);
}

const policies = await client.query(
  `select tablename, policyname
     from pg_policies
    where schemaname = 'public'
    order by tablename, policyname`,
);
console.log("\nRègles RLS actives :");
for (const p of policies.rows) console.log("   " + p.tablename + " · " + p.policyname);

const fns = await client.query(
  `select proname from pg_proc
    where proname in ('mon_role','est_tresorier','maj_carte','verifier_carte','enregistrer_nouveau_compte')
    order by proname`,
);
console.log("\nFonctions :", fns.rows.map((f) => f.proname).join(", ") || "aucune");

const trg = await client.query(
  "select tgname from pg_trigger where tgname = 'on_auth_user_created'",
);
console.log(
  "Déclencheur nouveaux comptes :",
  trg.rowCount ? "présent" : "ABSENT",
);

// ---------------------------------------------------------------------
//  Simulation : ce que voit réellement un compte « communication »
//
//  Tout se passe dans une transaction annulée à la fin : la base n'est
//  jamais modifiée. On endosse le rôle PostgreSQL « authenticated » et on
//  se fait passer pour un compte du bureau, exactement comme le fait
//  Supabase à partir du jeton de session.
// ---------------------------------------------------------------------
const cobaye = comptes.rows[0];
if (cobaye) {
  const { rows: ids } = await client.query(
    "select user_id from public.app_users where email = $1",
    [cobaye.email],
  );
  const uid = ids[0].user_id;

  await client.query("begin");
  await client.query(
    "update public.app_users set role = 'communication' where user_id = $1",
    [uid],
  );
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: uid, role: "authenticated" }),
  ]);

  const compte = async (table) => {
    try {
      const { rows } = await client.query("select count(*)::int as n from public." + table);
      return rows[0].n + " ligne(s)";
    } catch (e) {
      return "refusé (" + e.message.split("\n")[0] + ")";
    }
  };

  console.log("\nVu par un compte « communication » :");
  console.log("   payments  →", await compte("payments"), "  (attendu : 0)");
  console.log("   members   →", await compte("members"), "  (attendu : la liste complète)");
  console.log("   posts     →", await compte("posts"));
  console.log("   settings  →", await compte("settings"));

  // Écriture directe sur un membre : doit être refusée.
  let ecriture = "autorisée (PROBLÈME)";
  try {
    const r = await client.query(
      "update public.members set last_name = last_name where id = (select id from public.members limit 1)",
    );
    ecriture = r.rowCount === 0 ? "bloquée par RLS (0 ligne modifiée)" : "autorisée (PROBLÈME)";
  } catch {
    ecriture = "refusée";
  }
  console.log("   écriture directe sur members →", ecriture);

  // Écriture d'un champ de carte via maj_carte : doit passer.
  let carte = "échec";
  try {
    await client.query(
      "select public.maj_carte((select id from public.members limit 1), '{\"role\":\"Test\"}'::jsonb)",
    );
    carte = "autorisée";
  } catch (e) {
    carte = "refusée (" + e.message.split("\n")[0] + ")";
  }
  console.log("   maj_carte (champs de carte) →", carte, "  (attendu : autorisée)");

  await client.query("rollback");

  // --- Contrôle de non-régression : le trésorier garde tous ses droits ---
  await client.query("begin");
  await client.query(
    "update public.app_users set role = 'tresorier' where user_id = $1",
    [uid],
  );
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: uid, role: "authenticated" }),
  ]);

  console.log("\nVu par un compte « trésorier » :");
  console.log("   payments  →", await compte("payments"), "  (attendu : tous les paiements)");
  console.log("   members   →", await compte("members"));

  let ecritureT = "refusée (PROBLÈME)";
  try {
    const r = await client.query(
      "update public.members set last_name = last_name where id = (select id from public.members limit 1)",
    );
    ecritureT = r.rowCount > 0 ? "autorisée" : "bloquée (PROBLÈME)";
  } catch (e) {
    ecritureT = "refusée (" + e.message.split("\n")[0] + ")";
  }
  console.log("   écriture sur members →", ecritureT, "  (attendu : autorisée)");

  await client.query("rollback");
  console.log("\nTransactions annulées : aucune donnée modifiée.");
}

await client.end();
