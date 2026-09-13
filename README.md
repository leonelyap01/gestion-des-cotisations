# Gestion des cotisations — Comité Jeunesse Émergente d'Aheoua

Application web de suivi des cotisations mensuelles : membres, grille mois par mois,
tableau de bord financier, cartes de membre, rapports PDF/Word et messages WhatsApp
prêts à l'emploi.

Utilisable au téléphone comme au bureau, avec une base de données hébergée : rien
n'est perdu entre deux sessions.

---

## Sommaire

1. [Ce que fait l'application](#1-ce-que-fait-lapplication)
2. [Règles métier appliquées](#2-règles-métier-appliquées)
3. [Mise en route](#3-mise-en-route)
4. [Comptes et rôles](#4-comptes-et-rôles)
5. [Déploiement sur Netlify](#5-déploiement-sur-netlify)
6. [Guide d'utilisation](#6-guide-dutilisation)
7. [Organisation du code](#7-organisation-du-code)
8. [Scripts disponibles](#8-scripts-disponibles)
9. [Sécurité](#9-sécurité)

---

## 1. Ce que fait l'application

| Page | Contenu |
|---|---|
| **Tableau de bord** | Théorique attendu, réellement perçu, manque à gagner, taux de recouvrement global et par mois, évolution mensuelle (barres), répartition soldés / non soldés (donut). |
| **Membres** | Ajout, modification, suppression, historique complet. Recherche et filtres : à jour, 1 / 2 / 3+ mois d'arriérés, n'ayant jamais soldé, ayant soldé au moins un mois, signalés, droit d'adhésion impayé, membres retirés. |
| **Cotisations** | La grille : une ligne par membre, une colonne par mois. Un clic marque un mois soldé (la date d'enregistrement est conservée). |
| **Alertes** | Membres signalés en vue d'un retrait, arriérés importants, droits d'adhésion en attente. |
| **Annonces** | Rédaction des actualités publiées sur la page publique, brouillons, épinglage, partage du lien. |
| **Cartes de membre** | Collecte des photos, attribution des numéros, génération du PDF des cartes prêt à découper. |
| **Rapports** | Export PDF et Word de la grille (A4 paysage), PDF du point de caisse, 4 messages WhatsApp, historique daté des générations. |
| **Paramètres** | Accès du bureau (rôles des comptes), texte de « Notre vision », identité du comité (devise, ville, contact, préfixe des cartes), montants, exercice, mois ouverts, coordonnées Wave / MTN / Orange, couleur d'accent. |
| **`/infos`** *(publique)* | Espace membres, consultable **sans compte** : onglet Actualités et onglet Notre vision. |
| **`/carte/…`** *(publique)* | Vérification d'une carte de membre — cible du QR code imprimé sur les cartes. |

**Stack** : Next.js 15 (App Router) · TailwindCSS 4 · Supabase (PostgreSQL + Auth) ·
Recharts · @react-pdf/renderer · docx.

---

## 2. Règles métier appliquées

Ces quatre règles sont codées dans [`src/lib/cotisations.ts`](src/lib/cotisations.ts)
et couvertes par 18 tests automatisés (`npm test`).

1. **Aucun mois antérieur à l'adhésion n'est dû.** Ces cases apparaissent grisées et
   hachurées (« non membre à cette période »), ne sont jamais cliquables, et
   n'entrent ni dans le montant théorique ni dans le taux de recouvrement.
2. **Le droit d'adhésion est distinct de la cotisation** et n'est facturé qu'une
   seule fois, à l'arrivée du membre. Il se coche indépendamment des mois.
3. **Le taux de recouvrement d'un membre** se calcule uniquement sur les mois
   ouverts pendant lesquels il était effectivement membre.
4. **Le signalement « risque de retrait »** ne vise que les membres présents dès le
   premier mois de l'exercice cumulant **3 mois d'impayés consécutifs**. Les
   arrivants en cours d'année à 3 mois d'arriérés apparaissent dans une liste
   séparée, « Arriérés importants », sans procédure de retrait.

Un **mois fermé** (non coché dans Paramètres → Mois ouverts) apparaît dans la grille
mais n'est jamais compté comme un arriéré : c'est ainsi qu'on ouvre les mois au fur
et à mesure de l'année.

---

## 3. Mise en route

### Prérequis

- [Node.js](https://nodejs.org) 20 ou plus récent
- Un projet [Supabase](https://supabase.com) (gratuit)

### Installation

```bash
npm install
```

### Variables d'environnement

Copiez `.env.local.example` en `.env.local` et renseignez les deux clés publiques
du projet Supabase (*Project Settings → API Keys*) :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

Ces deux valeurs sont conçues pour être publiques : l'accès aux données est protégé
par les règles RLS de la base, pas par le secret de la clé.

### Base de données

Deux possibilités, au choix.

**A. Depuis l'interface Supabase** — ouvrez *SQL Editor* et exécutez les quatre
fichiers du dossier [`supabase/`](supabase), dans l'ordre, en cliquant
sur **Run** après chacun : [`schema.sql`](supabase/schema.sql) (cotisations),
[`annonces.sql`](supabase/annonces.sql) (page publique),
[`cartes.sql`](supabase/cartes.sql) (cartes de membre et identité du comité),
[`roles.sql`](supabase/roles.sql) (comptes et droits d'accès).

**B. En ligne de commande** — avec le mot de passe de la base :

```bash
node scripts/setup-db.mjs
```

(après avoir défini `DATABASE_URL`, voir [Scripts](#8-scripts-disponibles))

### Lancement

```bash
npm run dev
```

L'application est disponible sur http://localhost:3000.

---

## 4. Comptes et rôles

### Les deux profils

| Profil | Accès |
|---|---|
| **Trésorier** | Tout : tableau de bord, membres, cotisations, alertes, rapports, annonces, cartes, paramètres. |
| **Communication** | Annonces et cartes de membre uniquement. Les cotisations, les paiements et les montants de la caisse lui sont **refusés par la base de données**, pas seulement masqués à l'écran. |

Un compte Communication peut : rédiger et publier les annonces, collecter les
photos, attribuer les numéros de carte, renseigner la fonction d'un membre et
générer les cartes. Il peut lire la liste des membres — les cartes en ont besoin —
mais ne peut modifier aucune autre donnée les concernant.

### Créer un compte

L'application ne propose volontairement **aucun formulaire d'inscription** : les
comptes se créent à la main, pour que personne ne puisse s'inscrire seul.

1. Ouvrez votre projet sur [supabase.com](https://supabase.com).
2. **Authentication → Users → Add user → Create new user**.
3. Saisissez l'adresse e-mail et un mot de passe, cochez **Auto Confirm User**,
   puis validez.
4. Le nouveau compte apparaît aussitôt dans l'application, sous
   **Paramètres → Accès du bureau**, avec le profil **Communication**.
5. Pour en faire un trésorier, changez son profil dans la liste déroulante.

> Le tout premier compte — celui qui a installé l'application — est trésorier
> d'office. Les suivants arrivent toujours avec le profil le plus restreint.

### Verrouiller les inscriptions

**Authentication → Sign In / Providers → Email** : désactivez
**« Allow new users to sign up »**. Sans cela, n'importe qui pourrait créer un
compte et accéder aux annonces et aux cartes.

---

## 5. Déploiement sur Netlify

1. Poussez le projet sur GitHub (voir [Scripts](#8-scripts-disponibles)).
2. Sur [app.netlify.com/start/repos](https://app.netlify.com/start/repos),
   choisissez le dépôt `gestion-des-cotisations`.
3. Netlify détecte Next.js automatiquement ; les réglages de
   [`netlify.toml`](netlify.toml) s'appliquent (commande `npm run build`, Node 22).
4. Avant de lancer le premier déploiement, ouvrez **Add environment variables** et
   ajoutez les deux mêmes clés que dans `.env.local` :

   | Clé | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxxxxxxx` |

5. **Deploy**. Chaque `git push` redéploiera le site automatiquement.

> Sur téléphone, ouvrez l'adresse Netlify puis « Ajouter à l'écran d'accueil » :
> l'application se comporte alors comme une application installée.

---

## 6. Guide d'utilisation

### Enregistrer un paiement

Page **Cotisations**, cliquez sur la case du membre à l'intersection du mois. Elle
passe au vert et la date d'enregistrement est conservée. Un second clic annule.

Le même geste est possible depuis la fiche d'un membre, où chaque mois affiche sa
date d'enregistrement.

### Ajouter un membre en cours d'année

Page **Membres → Ajouter un membre**. Le champ décisif est le **mois d'adhésion** :
tous les mois antérieurs seront automatiquement grisés et ne lui seront jamais
réclamés.

Laissez « Ce membre doit le droit d'adhésion » coché pour un nouvel arrivant ;
décochez-le pour un membre fondateur qui l'avait déjà réglé.

### Ouvrir un nouveau mois

Page **Paramètres → Mois ouverts**, cliquez sur le mois concerné, puis
**Enregistrer**. Le mois devient exigible pour tous les membres déjà présents.
Page **Rapports**, copiez ensuite le message « Ouverture d'un nouveau mois ».

### Relancer un membre

Sur sa fiche, en bas, un message WhatsApp personnalisé est déjà rédigé avec son nom,
ses mois dus et le total à régler. Bouton **Copier**, puis collez dans WhatsApp.

### Publier une actualité pour les membres

Page **Annonces → Nouvelle annonce**. Donnez un titre, choisissez une catégorie
(Information, Annonce, Événement, Urgent), rédigez le message — les retours à la
ligne sont conservés tels quels.

- **Publier sur la page publique** décoché = brouillon, visible de vous seul.
- **Épingler** remonte l'annonce en tête de page, pour une information qui doit
  rester visible plusieurs semaines.
- **Pré-remplir avec le point de caisse** insère la synthèse chiffrée du moment
  (théorique, perçu, manque à gagner, détail par mois) dans le corps du message.

Les membres consultent tout cela sur **`/infos`** — par exemple
`https://votre-site.netlify.app/infos` — sans aucun compte. Le bouton **Message
WhatsApp** de la page Annonces copie un texte tout prêt contenant ce lien, à coller
dans le groupe.

> **Ce qui est public et ce qui ne l'est pas.** La page `/infos` expose uniquement :
> les annonces publiées, le nom de l'association, les montants en vigueur et les
> coordonnées de paiement. La liste des membres, les paiements, les arriérés et les
> rapports ne sont **jamais** accessibles sans connexion — la base les refuse au
> niveau des règles RLS, pas seulement dans l'interface. En revanche, tout ce que
> *vous* écrivez dans une annonce devient visible de quiconque possède le lien :
> n'y nommez personne à propos de ses impayés.

### Établir les cartes de membre

Page **Cartes de membre**. Le tableau de bord du haut suit l'avancement : numéros
attribués, photos reçues, cartes remises.

1. **Relancer** — le bouton « Message de relance photos » copie une annonce prête à
   coller dans le groupe, demandant à chacun d'envoyer sa photo en privé.
2. **Ajouter les photos** — pour chaque membre, l'icône appareil photo ouvre la
   galerie du téléphone. L'image est recadrée au format portrait et compressée
   automatiquement : une photo de 4 Mo devient quelques dizaines de kilo-octets.
3. **Attribuer les numéros** — un bouton numérote d'un coup tous les membres qui
   n'ont pas encore de carte, par ordre alphabétique, au format
   `UCJEA-2026-014`. Les numéros déjà attribués ne changent jamais.
4. **Imprimer** — « Générer les cartes (PDF) » produit un fichier A4 : deux membres
   par page, recto et verso côte à côte, à la taille réelle d'une carte bancaire
   (54 × 85,6 mm). Imprimez à **100 %**, sans mise à l'échelle, puis découpez.
5. **Suivre la remise** — la coche verte marque la carte comme remise au membre.

La **fonction** imprimée sur la carte (Président, Trésorier, Porte-parole du
Président…) se renseigne dans la fiche du membre, onglet Membres.

Le **QR code** de chaque carte renvoie vers `/carte/<identifiant>`, une page
publique qui affiche le nom, le numéro, la fonction et le statut du titulaire —
rien d'autre. C'est ce qui permet de vérifier une carte présentée en réunion.

> **Photos et vie privée.** Les portraits sont stockés dans un espace **privé** :
> ils ne sont accessibles par aucune URL publique, seulement depuis l'application
> une fois connecté. Ils n'apparaissent ni sur `/infos`, ni sur la page de
> vérification des cartes.

### Publier la vision du comité

Page **Paramètres → Notre vision**. Rédigez le texte, enregistrez : un onglet
**Notre vision** apparaît aussitôt sur la page publique, à côté des actualités,
à l'adresse `/infos/vision`.

Les retours à la ligne sont conservés — vous pouvez écrire des paragraphes ou
une liste à puces. La devise du comité est reprise en tête de la page.

Tant que le texte est vide, l'onglet n'apparaît pas : la page publique reste
sur les seules actualités.

### Produire les documents

Page **Rapports** : la grille en PDF ou Word et le point de caisse en PDF se
téléchargent en un clic. Chaque génération est datée dans l'historique en bas de
page.

---

## 7. Organisation du code

```
src/
├── app/
│   ├── (app)/              Pages protégées par l'authentification
│   │   ├── page.tsx            Tableau de bord
│   │   ├── membres/            Liste + fiche individuelle
│   │   ├── cotisations/        La grille mensuelle
│   │   ├── alertes/            Signalements
│   │   ├── annonces/           Rédaction des actualités publiques
│   │   ├── cartes/             Atelier des cartes de membre
│   │   ├── rapports/           Exports et messages
│   │   └── parametres/         Réglages
│   ├── infos/              ★ Espace public : mise en page + onglets
│   │   ├── page.tsx            Onglet Actualités
│   │   └── vision/             Onglet Notre vision
│   ├── carte/[id]/         ★ Vérification publique d'une carte (QR code)
│   ├── login/              Connexion
│   ├── layout.tsx
│   └── globals.css         Thème sombre, 3 palettes, styles d'impression
├── components/
│   ├── DataProvider.tsx    Chargement des données + mutations Supabase
│   ├── AppShell.tsx        Navigation (latérale sur PC, barre basse sur mobile)
│   ├── MemberForm.tsx      Formulaire membre
│   ├── PostForm.tsx        Formulaire d'une annonce
│   ├── PublicTabs.tsx      Onglets de l'espace public
│   ├── dashboard/Charts.tsx
│   └── ui/                 Boutons, cartes, badges, fenêtres modales
├── lib/
│   ├── cotisations.ts      ★ Toutes les règles métier (fonctions pures)
│   ├── cotisations.test.ts   Les 18 tests de ces règles
│   ├── messages.ts         Messages WhatsApp
│   ├── posts.ts            Catégories et tri des annonces
│   ├── public-data.ts      Lectures de l'espace public (mutualisées)
│   ├── cartes.ts           Numérotation et fonctions des cartes
│   ├── storage.ts          Photos des membres et recadrage du logo
│   ├── format.ts           Montants, dates, téléchargement, presse-papier
│   ├── types.ts
│   ├── exports/            PDF (@react-pdf), Word (docx) et cartes
│   └── supabase/           Clients navigateur et serveur
├── middleware.ts           Redirige vers /login (sauf /infos et /carte/…)
scripts/                    Mise en place de la base et import initial
supabase/schema.sql         Tables, index et règles RLS
supabase/annonces.sql       Table des annonces + lecture publique
supabase/cartes.sql         Cartes, identité du comité, stockage des photos
supabase/roles.sql          Comptes du bureau, rôles et droits d'accès
public/logo-ucjea.jpg       Logo du comité (remplacer ce fichier pour le changer)
```

Le fichier à connaître est **`src/lib/cotisations.ts`** : il ne contient que des
fonctions pures, sans React ni réseau. Tout calcul de cotisation passe par lui, ce
qui rend les règles vérifiables d'un seul coup d'œil — et par `npm test`.

---

## 8. Scripts disponibles

```bash
npm run dev      # développement (http://localhost:3000)
npm run build    # build de production
npm start        # démarre le build de production
npm test         # les 18 tests des règles métier
npm run lint
```

Les deux scripts de base de données lisent le mot de passe depuis la variable
d'environnement `DATABASE_URL` — il n'est écrit dans aucun fichier du dépôt.

Sous PowerShell :

```powershell
$env:DATABASE_URL = "postgresql://postgres:MOT_DE_PASSE@db.xxxxxxxx.supabase.co:5432/postgres"
node scripts/setup-db.mjs        # applique les quatre fichiers de supabase/
node scripts/check-cartes.mjs    # vérifie l'installation du module cartes
node scripts/check-roles.mjs     # vérifie les droits de chaque profil
node scripts/seed-membres.mjs    # réimporte les 24 membres du registre 2026
```

`seed-membres.mjs` **efface puis réimporte** les membres et paiements : ne le
relancez pas une fois que vous avez commencé à saisir des paiements dans
l'application.

### Publier sur GitHub

```bash
git add -A
git commit -m "Mise à jour"
git push
```

---

## 9. Sécurité

- `members`, `payments` et `reports` sont protégées par **Row Level Security** :
  sans session authentifiée, aucune ligne n'est lisible ni modifiable.
- Les droits de chaque profil sont appliqués **par la base**, pas par
  l'interface : un compte Communication qui interrogerait directement l'API
  Supabase n'obtiendrait aucun paiement. Vous pouvez le vérifier vous-même avec
  `node scripts/check-roles.mjs`, qui simule chaque profil dans une transaction
  annulée.
- Trois exceptions sont publiques, et volontairement : les annonces **publiées**
  (les brouillons restent privés) ; la ligne de paramètres, qui ne contient que le
  nom du comité, sa devise, ses contacts et les montants déjà diffusés à tous ; et
  la vérification d'une carte, limitée au nom, au numéro, à la fonction et au
  statut du titulaire.
- Les **photos des membres** sont dans un espace de stockage privé : aucune URL
  publique n'y donne accès, l'application passe par des liens signés valables une
  heure et réservés aux comptes authentifiés.
- La vérification d'une carte passe par une fonction SQL dédiée
  (`verifier_carte`) : la table des membres, elle, reste fermée aux visiteurs
  anonymes.
- Le middleware renvoie vers `/login` toute requête non authentifiée, à
  l'exception de la page publique `/infos`.
- `.env.local` est ignoré par Git ; il ne contient de toute façon que les deux clés
  publiques.
- **Le mot de passe de la base de données ne doit jamais être placé dans un fichier
  du projet** ni partagé par messagerie. S'il a circulé, changez-le dans
  *Supabase → Project Settings → Database → Reset database password*.
- Laissez l'inscription publique désactivée (étape 4 ci-dessus) : c'est ce qui
  empêche un inconnu de se créer un compte et d'ouvrir la caisse.
