# Gestion des cotisations — Comité Jeunesse Émergente

Application web de suivi des cotisations mensuelles : membres, grille mois par mois,
tableau de bord financier, rapports PDF/Word et messages WhatsApp prêts à l'emploi.

Utilisable au téléphone comme au bureau, avec une base de données hébergée : rien
n'est perdu entre deux sessions.

---

## Sommaire

1. [Ce que fait l'application](#1-ce-que-fait-lapplication)
2. [Règles métier appliquées](#2-règles-métier-appliquées)
3. [Mise en route](#3-mise-en-route)
4. [Créer le compte trésorier](#4-créer-le-compte-trésorier)
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
| **Rapports** | Export PDF et Word de la grille (A4 paysage), PDF du point de caisse, 4 messages WhatsApp, historique daté des générations. |
| **Paramètres** | Montants, exercice, mois ouverts, coordonnées Wave / MTN / Orange, couleur d'accent. |

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

**A. Depuis l'interface Supabase** — ouvrez *SQL Editor*, collez tout le contenu de
[`supabase/schema.sql`](supabase/schema.sql) et cliquez sur **Run**.

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

## 4. Créer le compte trésorier

L'application ne propose volontairement **aucun formulaire d'inscription** : les
comptes sont créés à la main, pour que personne ne puisse s'inscrire seul et accéder
à la caisse.

1. Ouvrez votre projet sur [supabase.com](https://supabase.com).
2. **Authentication → Users → Add user → Create new user**.
3. Saisissez votre adresse e-mail et un mot de passe, cochez **Auto Confirm User**,
   puis validez.
4. **Authentication → Sign In / Providers → Email** : désactivez
   **« Allow new users to sign up »**.

Vous pouvez répéter l'étape 2 pour ajouter d'autres membres du bureau : ils
partageront la même caisse.

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
│   │   ├── rapports/           Exports et messages
│   │   └── parametres/         Réglages
│   ├── login/              Connexion
│   ├── layout.tsx
│   └── globals.css         Thème sombre, 3 palettes, styles d'impression
├── components/
│   ├── DataProvider.tsx    Chargement des données + mutations Supabase
│   ├── AppShell.tsx        Navigation (latérale sur PC, barre basse sur mobile)
│   ├── MemberForm.tsx      Formulaire membre
│   ├── dashboard/Charts.tsx
│   └── ui/                 Boutons, cartes, badges, fenêtres modales
├── lib/
│   ├── cotisations.ts      ★ Toutes les règles métier (fonctions pures)
│   ├── cotisations.test.ts   Les 18 tests de ces règles
│   ├── messages.ts         Messages WhatsApp
│   ├── format.ts           Montants, dates, téléchargement, presse-papier
│   ├── types.ts
│   ├── exports/            PDF (@react-pdf) et Word (docx)
│   └── supabase/           Clients navigateur et serveur
├── middleware.ts           Redirige vers /login si pas de session
scripts/                    Mise en place de la base et import initial
supabase/schema.sql         Tables, index et règles RLS
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
node scripts/setup-db.mjs        # crée les tables et les règles RLS
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

- Toutes les tables sont protégées par **Row Level Security** : sans session
  authentifiée, aucune ligne n'est lisible ni modifiable.
- Le middleware renvoie vers `/login` toute requête non authentifiée.
- `.env.local` est ignoré par Git ; il ne contient de toute façon que les deux clés
  publiques.
- **Le mot de passe de la base de données ne doit jamais être placé dans un fichier
  du projet** ni partagé par messagerie. S'il a circulé, changez-le dans
  *Supabase → Project Settings → Database → Reset database password*.
- Laissez l'inscription publique désactivée (étape 4 ci-dessus) : c'est ce qui
  empêche un inconnu de se créer un compte et d'ouvrir la caisse.
