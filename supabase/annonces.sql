-- =====================================================================
--  Annonces publiques
--
--  Ajoute la table des actualités affichées sur la page publique /infos,
--  accessible aux membres sans connexion.
--
--  À exécuter dans Supabase > SQL Editor (ou via node scripts/setup-db.mjs,
--  qui applique schema.sql puis ce fichier). Le script est idempotent.
-- =====================================================================

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null default '',
  -- 'info' | 'annonce' | 'evenement' | 'urgent'
  category     text not null default 'info',
  -- Épinglée : remonte en tête de la page publique
  pinned       boolean not null default false,
  -- Brouillon (false) = visible uniquement dans l'espace trésorier
  published    boolean not null default true,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists posts_public_idx
  on public.posts (published, pinned desc, published_at desc);

alter table public.posts enable row level security;

-- Lecture publique : uniquement les annonces publiées.
drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts
  for select to anon, authenticated
  using (published = true);

-- Le bureau (comptes authentifiés) voit et gère tout, brouillons compris.
drop policy if exists "posts_manage" on public.posts;
create policy "posts_manage" on public.posts
  for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------
--  La page publique affiche le nom de l'association, les montants en
--  vigueur et les coordonnées de paiement : ces informations sont déjà
--  diffusées à tous les membres, la lecture des paramètres devient donc
--  publique. Les tables members, payments et reports, elles, restent
--  strictement réservées aux comptes authentifiés.
-- ---------------------------------------------------------------------
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select to anon, authenticated
  using (true);
