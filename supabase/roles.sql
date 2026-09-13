-- =====================================================================
--  Rôles et droits d'accès
--
--  Deux profils :
--   - « tresorier »     : accès complet (caisse, membres, cotisations,
--                         rapports, annonces, cartes, paramètres)
--   - « communication » : annonces et cartes de membre uniquement.
--                         Aucun accès aux cotisations, aux paiements ni
--                         aux montants de la caisse.
--
--  Les droits sont appliqués par la base (Row Level Security), pas
--  seulement par l'interface : même en interrogeant l'API directement,
--  un compte « communication » ne peut pas lire les paiements.
--
--  À exécuter dans Supabase > SQL Editor, ou via node scripts/setup-db.mjs.
--  Idempotent : relançable sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table des comptes du bureau
-- ---------------------------------------------------------------------
create table if not exists public.app_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text not null default '',
  role         text not null default 'communication'
               check (role in ('tresorier', 'communication')),
  created_at   timestamptz not null default now()
);

-- Les comptes déjà existants au moment de l'installation sont trésoriers :
-- on ne verrouille jamais l'accès de la personne qui installe le module.
insert into public.app_users (user_id, email, role)
select u.id, u.email, 'tresorier'
  from auth.users u
on conflict (user_id) do nothing;

-- Tout nouveau compte créé dans Supabase arrive avec le profil le plus
-- restreint ; le trésorier le promeut ensuite depuis Paramètres.
create or replace function public.enregistrer_nouveau_compte()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (user_id, email, role)
  values (new.id, new.email, 'communication')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.enregistrer_nouveau_compte();

-- ---------------------------------------------------------------------
-- 2. Rôle du compte connecté
--
--    SECURITY DEFINER : la fonction lit app_users même quand les règles
--    RLS de cette table s'appliqueraient au demandeur. Un compte inconnu
--    n'obtient aucun rôle, donc aucun droit.
-- ---------------------------------------------------------------------
create or replace function public.mon_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.app_users where user_id = auth.uid();
$$;

grant execute on function public.mon_role() to authenticated;

create or replace function public.est_tresorier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
     where user_id = auth.uid() and role = 'tresorier'
  );
$$;

grant execute on function public.est_tresorier() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Droits sur la table des comptes
-- ---------------------------------------------------------------------
alter table public.app_users enable row level security;

-- Chaque compte connecté voit la composition du bureau (pour savoir qui fait
-- quoi), mais seul un trésorier peut changer un rôle.
drop policy if exists "app_users_read" on public.app_users;
create policy "app_users_read" on public.app_users
  for select to authenticated using (true);

drop policy if exists "app_users_write" on public.app_users;
create policy "app_users_write" on public.app_users
  for all to authenticated
  using ((select public.est_tresorier()))
  with check ((select public.est_tresorier()));

-- ---------------------------------------------------------------------
-- 4. Caisse : réservée au trésorier
-- ---------------------------------------------------------------------
drop policy if exists "payments_authenticated" on public.payments;
drop policy if exists "payments_tresorier" on public.payments;
create policy "payments_tresorier" on public.payments
  for all to authenticated
  using ((select public.est_tresorier()))
  with check ((select public.est_tresorier()));

-- ---------------------------------------------------------------------
-- 5. Membres : lecture par tout le bureau (les cartes en ont besoin),
--    écriture réservée au trésorier.
--
--    Le profil « communication » modifie les champs de la carte via la
--    fonction maj_carte ci-dessous, qui ne touche à rien d'autre.
-- ---------------------------------------------------------------------
drop policy if exists "members_authenticated" on public.members;
drop policy if exists "members_read" on public.members;
create policy "members_read" on public.members
  for select to authenticated using (true);

drop policy if exists "members_write" on public.members;
create policy "members_write" on public.members
  for all to authenticated
  using ((select public.est_tresorier()))
  with check ((select public.est_tresorier()));

-- ---------------------------------------------------------------------
-- 6. Paramètres : lecture pour tous, modification par le trésorier
--    (ils portent les montants de la cotisation et du droit d'adhésion).
-- ---------------------------------------------------------------------
drop policy if exists "settings_authenticated" on public.settings;
drop policy if exists "settings_write" on public.settings;
create policy "settings_write" on public.settings
  for all to authenticated
  using ((select public.est_tresorier()))
  with check ((select public.est_tresorier()));
-- « settings_public_read » (cartes.sql / annonces.sql) couvre la lecture.

-- ---------------------------------------------------------------------
-- 7. Annonces, rapports et photos : ouverts aux deux profils.
--    Les politiques existantes (« to authenticated ») conviennent déjà.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 8. Mise à jour des champs de carte
--
--    Seule porte d'écriture sur members pour le profil « communication ».
--    Elle ne peut modifier que quatre colonnes : numéro de carte, fonction,
--    photo et date de remise. Les montants, la date d'adhésion et le droit
--    d'adhésion lui restent inaccessibles.
-- ---------------------------------------------------------------------
create or replace function public.maj_carte(membre_id uuid, patch jsonb)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat public.members;
begin
  if public.mon_role() is null then
    raise exception 'Accès refusé : compte sans rôle attribué.';
  end if;

  update public.members m
     set card_number = case when patch ? 'card_number'
                            then nullif(patch ->> 'card_number', '')
                            else m.card_number end,
         role        = case when patch ? 'role'
                            then coalesce(patch ->> 'role', '')
                            else m.role end,
         photo_path  = case when patch ? 'photo_path'
                            then nullif(patch ->> 'photo_path', '')
                            else m.photo_path end,
         card_issued_at = case when patch ? 'card_issued_at'
                               then nullif(patch ->> 'card_issued_at', '')::timestamptz
                               else m.card_issued_at end
   where m.id = membre_id
  returning * into resultat;

  if resultat.id is null then
    raise exception 'Membre introuvable.';
  end if;

  return resultat;
end;
$$;

revoke all on function public.maj_carte(uuid, jsonb) from public;
grant execute on function public.maj_carte(uuid, jsonb) to authenticated;
