-- =====================================================================
--  Gestion des cotisations - Comite Jeunesse Emergente
--  Schema PostgreSQL a executer dans Supabase > SQL Editor
--  (copier / coller l'integralite de ce fichier, puis "Run")
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PARAMETRES DE L'ASSOCIATION (une seule ligne, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                integer primary key default 1,
  association_name  text    not null default 'Comité Jeunesse Émergente',
  currency          text    not null default 'FCFA',

  -- Montants configurables
  monthly_amount    numeric(12,2) not null default 1000,   -- cotisation mensuelle
  membership_fee    numeric(12,2) not null default 5000,   -- droit d'adhesion (une seule fois)

  -- Exercice en cours
  exercise_year     integer not null default extract(year from now())::int,
  start_month       integer not null default 3,            -- Mars
  end_month         integer not null default 12,           -- Decembre
  -- Mois "ouverts" : seuls ces mois sont exigibles / comptes dans le theorique
  active_months     integer[] not null default '{3,4,5,6,7,8,9,10,11,12}',

  -- Coordonnees de paiement affichees sur les rapports et les messages
  pay_wave          text default '',
  pay_mtn           text default '',
  pay_orange        text default '',

  -- Theme : 'navy-gold' | 'emerald' | 'orange'
  accent            text not null default 'emerald',

  updated_at        timestamptz not null default now(),
  -- Garde-fou : interdit toute ligne autre que id = 1
  constraint settings_single_row check (id = 1)
);

-- Ligne de parametres par defaut
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. MEMBRES
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id                     uuid primary key default gen_random_uuid(),
  last_name              text    not null,                 -- Nom
  first_name             text    not null default '',      -- Prenoms
  phone                  text    default '',               -- Utile pour WhatsApp

  -- Date d'adhesion : un membre peut rejoindre en cours d'exercice.
  -- Aucun mois anterieur a ce repere ne peut lui etre reclame (regle metier n.1).
  join_year              integer not null,
  join_month             integer not null check (join_month between 1 and 12),

  -- Droit d'adhesion : du une seule fois (regle metier n.2)
  membership_fee_due     boolean not null default true,
  membership_fee_paid_at timestamptz,                      -- null = non regle

  active                 boolean not null default true,    -- false = a quitte le comite
  notes                  text default '',
  created_at             timestamptz not null default now()
);

create index if not exists members_name_idx on public.members (last_name, first_name);

-- ---------------------------------------------------------------------
-- 3. PAIEMENTS (un enregistrement = un mois solde par un membre)
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members (id) on delete cascade,
  year       integer not null,
  month      integer not null check (month between 1 and 12),
  amount     numeric(12,2) not null default 0,
  paid_at    timestamptz not null default now(),           -- date d'enregistrement
  created_at timestamptz not null default now(),
  -- Un mois ne peut etre solde qu'une fois par membre
  unique (member_id, year, month)
);

create index if not exists payments_period_idx on public.payments (year, month);

-- ---------------------------------------------------------------------
-- 4. HISTORIQUE DES RAPPORTS GENERES
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,          -- 'pdf-grille' | 'docx-grille' | 'pdf-caisse' | 'whatsapp-...'
  label      text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reports_created_idx on public.reports (created_at desc);

-- =====================================================================
--  SECURITE : Row Level Security
--  Les donnees de la caisse sont partagees par tous les comptes du bureau
--  qui ont ete crees manuellement dans Supabase. Les visiteurs anonymes
--  n'ont aucun acces.
--
--  IMPORTANT : desactivez l'inscription publique dans
--  Supabase > Authentication > Sign In / Providers > Email
--  > "Allow new users to sign up" = OFF
-- =====================================================================
alter table public.settings enable row level security;
alter table public.members  enable row level security;
alter table public.payments enable row level security;
alter table public.reports  enable row level security;

drop policy if exists "settings_authenticated" on public.settings;
create policy "settings_authenticated" on public.settings
  for all to authenticated using (true) with check (true);

drop policy if exists "members_authenticated" on public.members;
create policy "members_authenticated" on public.members
  for all to authenticated using (true) with check (true);

drop policy if exists "payments_authenticated" on public.payments;
create policy "payments_authenticated" on public.payments
  for all to authenticated using (true) with check (true);

drop policy if exists "reports_authenticated" on public.reports;
create policy "reports_authenticated" on public.reports
  for all to authenticated using (true) with check (true);
