-- =====================================================================
--  Cartes de membre et identité visuelle du comité
--
--  Ajoute :
--   - les champs de la carte sur chaque membre (numéro, fonction, photo)
--   - les champs d'identité du comité (devise, ville, téléphone, logo)
--   - un espace de stockage privé pour les photos des membres
--   - la fonction de vérification publique appelée par le QR code
--
--  À exécuter dans Supabase > SQL Editor, ou via node scripts/setup-db.mjs.
--  Idempotent : relançable sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Champs « carte de membre »
-- ---------------------------------------------------------------------
alter table public.members
  add column if not exists card_number   text,           -- ex. UCJEA-2026-014
  add column if not exists role          text default '',-- fonction dans le bureau
  add column if not exists photo_path    text,           -- chemin dans le bucket photos
  add column if not exists card_issued_at timestamptz;   -- carte remise au membre

-- Un numéro de carte ne peut désigner qu'un seul membre.
create unique index if not exists members_card_number_key
  on public.members (card_number)
  where card_number is not null;

-- ---------------------------------------------------------------------
-- 2. Identité visuelle du comité
-- ---------------------------------------------------------------------
alter table public.settings
  add column if not exists motto       text default '',      -- devise
  add column if not exists city        text default '',      -- ville / localité
  add column if not exists phone       text default '',      -- contact du comité
  -- Chemin du logo servi par l'application (fichier du dépôt, dossier public/)
  add column if not exists logo_url    text default '/logo-ucjea.jpg',
  add column if not exists card_prefix text default 'UCJEA'; -- préfixe des numéros

-- Renseigne l'identité du comité si elle ne l'a jamais été.
update public.settings
   set motto       = coalesce(nullif(motto, ''), 'L''avenir nous appartient'),
       city        = coalesce(nullif(city, ''), 'Aheoua, Côte d''Ivoire'),
       logo_url    = coalesce(nullif(logo_url, ''), '/logo-ucjea.jpg'),
       card_prefix = coalesce(nullif(card_prefix, ''), 'UCJEA')
 where id = 1;

-- Nom complet du comité, tel qu'il figure sur la carte de membre.
update public.settings
   set association_name = 'Comité Jeunesse Émergente d''Aheoua'
 where id = 1 and association_name = 'Comité Jeunesse Émergente';

-- ---------------------------------------------------------------------
-- 3. Stockage des photos des membres
--
--    Bucket privé : un portrait n'est jamais accessible par simple URL.
--    L'application y accède par lien signé, uniquement avec une session
--    authentifiée. Le logo, lui, est un fichier du dépôt (public/).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

drop policy if exists "photos_manage" on storage.objects;
create policy "photos_manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos') with check (bucket_id = 'photos');

-- ---------------------------------------------------------------------
-- 4. Vérification publique d'une carte (cible du QR code)
--
--    La table members reste fermée aux visiteurs anonymes. Cette fonction
--    est la seule porte d'entrée publique, et elle ne renvoie QUE ce qui
--    est déjà imprimé sur la carte : nom, numéro, fonction, statut.
--    Aucune donnée de cotisation, d'arriéré ou de téléphone n'en sort.
-- ---------------------------------------------------------------------
create or replace function public.verifier_carte(carte_id uuid)
returns table (
  nom           text,
  numero        text,
  fonction      text,
  membre_actif  boolean,
  membre_depuis integer,
  association   text,
  devise        text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    trim(m.last_name || ' ' || m.first_name) as nom,
    m.card_number                            as numero,
    coalesce(nullif(m.role, ''), 'Membre')   as fonction,
    m.active                                 as membre_actif,
    m.join_year                              as membre_depuis,
    s.association_name                       as association,
    coalesce(s.motto, '')                    as devise
  from public.members m
  cross join public.settings s
  where m.id = carte_id
    and s.id = 1
    -- Une carte non émise n'est pas vérifiable.
    and m.card_number is not null;
$$;

revoke all on function public.verifier_carte(uuid) from public;
grant execute on function public.verifier_carte(uuid) to anon, authenticated;
