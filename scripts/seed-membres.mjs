/**
 * Import initial : les 24 membres et les 118 paiements relevés dans le registre
 * PDF « Comite_Jeunesse_Membres.pdf » (exercice 2026, Mars → Décembre).
 *
 * Le script est idempotent : il vide members / payments puis réinsère tout,
 * on peut donc le relancer sans créer de doublons.
 *
 * Usage (PowerShell) :
 *   $env:DATABASE_URL = "postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres"
 *   node scripts/seed-membres.mjs
 */

import pg from "pg";

const YEAR = 2026;

/**
 * [nom complet, mois d'adhésion, nombre de mois réglés à partir de mars]
 *
 * Les noms sont repris tels quels du registre : ils sont enregistrés dans le
 * champ « nom », le champ « prénoms » restant vide. Vous pouvez les scinder
 * ensuite depuis la fiche de chaque membre.
 */
const REGISTRE = [
  ["Abbé Alatin Serge", 3, [3, 4, 5, 6]],
  ["Abou Del", 3, [3, 4, 5, 6]],
  ["Adou Marina Prisca", 3, [3, 4, 5, 6, 7, 8, 9]],
  ["Affi Mathieu", 3, [3, 4, 5, 6, 7, 8]],
  ["Ahoua Ahoua Cédric", 3, [3, 4, 5]],
  ["Aka Elvis Evrard", 3, [3, 4, 5, 6]],
  ["Assi APIE Edwige", 3, [3, 4, 5, 6, 7, 8, 9]],
  ["Assi Jessika Mondésie", 3, [3, 4, 5, 6, 7, 8, 9]],
  ["Antou Alex Romeo", 3, [3, 4, 5, 6]],
  ["Atse Stéphane", 3, [3, 4, 5, 6, 7]],
  ["Kouadio Anon Guy Serge", 3, [3, 4, 5, 6, 7, 8]],
  // Arrivé en septembre : les mois de mars à août ne lui sont jamais réclamés.
  ["N'cho Bessekon Léandre", 9, []],
  ["N'depo Alex", 3, [3, 4]],
  ["N'depo Rosine", 3, [3, 4, 5, 6, 7, 8]],
  ["Seka Rock Hossyme", 3, [3]],
  ["Yapi Akoupo Leonel Xavier", 3, [3, 4, 5, 6, 7, 8]],
  ["Yapi Yapi Anicet", 3, [3, 4, 5, 6, 7, 8]],
  ["Yapo Apo Béatrice", 3, [3, 4, 5, 6, 7]],
  ["Yapo Serge Daniel", 3, [3, 4, 5, 6, 7, 8, 9]],
  ["Yapo Guy", 3, [3, 4, 5, 6, 7, 8, 9]],
  // Arrivé en septembre, droit d'adhésion dû, septembre réglé.
  ["Yapo Jean Landry", 9, [9]],
  ["Yapo Seka Mondesie", 3, [3, 4, 5, 6, 7, 8, 9]],
  ["Yapo Yapo Anauld", 3, [3, 4, 5, 6, 7, 8, 9]],
  ["Yapo Yapo Hagege Chomsky", 3, [3, 4, 5, 6, 7, 8]],
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// Paramètres de l'exercice en cours : mars → décembre, mois ouverts jusqu'à septembre.
await client.query(
  `update public.settings set
     association_name = $1,
     monthly_amount   = 1000,
     membership_fee   = 5000,
     exercise_year    = $2,
     start_month      = 3,
     end_month        = 12,
     active_months    = '{3,4,5,6,7,8,9}',
     accent           = 'emerald',
     updated_at       = now()
   where id = 1`,
  ["Comité Jeunesse Émergente", YEAR],
);

// Réimport complet (les paiements partent en cascade avec les membres).
await client.query("delete from public.members");

let paymentCount = 0;

for (const [name, joinMonth, paidMonths] of REGISTRE) {
  const feeDue = joinMonth > 3; // seuls les arrivants en cours d'exercice le doivent
  const { rows } = await client.query(
    `insert into public.members
       (last_name, first_name, phone, join_year, join_month,
        membership_fee_due, membership_fee_paid_at, active, notes)
     values ($1, '', '', $2, $3, $4, null, true, '')
     returning id`,
    [name, YEAR, joinMonth, feeDue],
  );
  const memberId = rows[0].id;

  for (const month of paidMonths) {
    await client.query(
      `insert into public.payments (member_id, year, month, amount, paid_at)
       values ($1, $2, $3, 1000, $4)
       on conflict (member_id, year, month) do nothing`,
      [memberId, YEAR, month, new Date(Date.UTC(YEAR, month - 1, 15)).toISOString()],
    );
    paymentCount++;
  }
}

const { rows: counts } = await client.query(
  `select (select count(*) from public.members)  as membres,
          (select count(*) from public.payments) as paiements`,
);

console.log("Membres importés   :", counts[0].membres);
console.log("Paiements importés :", counts[0].paiements, "(attendu : " + paymentCount + ")");

// Contrôle : soldés par mois, à comparer au registre PDF.
const { rows: perMonth } = await client.query(
  `select month, count(*) as soldes
     from public.payments where year = $1
    group by month order by month`,
  [YEAR],
);
console.log(
  "Soldés par mois :",
  perMonth.map((r) => r.month + "→" + r.soldes).join("  "),
);

await client.end();
