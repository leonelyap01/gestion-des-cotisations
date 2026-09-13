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
--  Onglet « Notre vision » de la page publique.
--
--  Texte libre rédigé par le bureau depuis Paramètres. Tant qu'il est
--  vide, l'onglet n'apparaît pas sur la page publique.
-- ---------------------------------------------------------------------
alter table public.settings
  add column if not exists vision text not null default '',
  -- Chemin de l'image de couverture dans le bucket « couvertures »
  add column if not exists vision_cover text;

-- Image de couverture d'une annonce (facultative).
alter table public.posts
  add column if not exists cover_path text;

-- ---------------------------------------------------------------------
--  Images de couverture
--
--  Bucket PUBLIC : ces images s'affichent sur la page publique, donc pour
--  des visiteurs sans session. Rien de sensible n'y est déposé — les
--  portraits des membres restent, eux, dans le bucket privé « photos ».
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('couvertures', 'couvertures', true, 5242880)
on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists "couvertures_public_read" on storage.objects;
create policy "couvertures_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'couvertures');

drop policy if exists "couvertures_manage" on storage.objects;
create policy "couvertures_manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'couvertures') with check (bucket_id = 'couvertures');

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
