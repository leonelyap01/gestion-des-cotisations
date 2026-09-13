"use client";

import { useEffect, useState } from "react";
import { Check, Palette, Save, Wallet } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Badge, Button, Card, Field, SectionTitle, Spinner } from "@/components/ui";
import { MONTH_NAMES, exerciseMonths } from "@/lib/cotisations";
import { formatAmount } from "@/lib/format";
import type { AccentKey, Settings } from "@/lib/types";

const ACCENTS: { key: AccentKey; label: string; swatch: string; bg: string }[] = [
  { key: "navy-gold", label: "Bleu marine & or", swatch: "#d9b64a", bg: "#0a0f1b" },
  { key: "emerald", label: "Vert émeraude & anthracite", swatch: "#10b981", bg: "#0c1210" },
  { key: "orange", label: "Orange & noir", swatch: "#f97316", bg: "#0b0b0c" },
];

export default function ParametresPage() {
  const { settings, saveSettings, loading } = useData();
  const [form, setForm] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Synchronise le formulaire dès que les paramètres sont chargés.
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (loading) return <Spinner />;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** Ouvre / ferme un mois de l'exercice. */
  function toggleMonth(month: number) {
    const next = form.active_months.includes(month)
      ? form.active_months.filter((m) => m !== month)
      : [...form.active_months, month].sort((a, b) => a - b);
    set("active_months", next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // On ne conserve que les mois compris dans la plage de l'exercice.
    const months = exerciseMonths(form);
    await saveSettings({
      ...form,
      monthly_amount: Number(form.monthly_amount) || 0,
      membership_fee: Number(form.membership_fee) || 0,
      active_months: form.active_months.filter((m) => months.includes(m)),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
          <p className="mt-1 text-sm text-muted">
            Montants, exercice, coordonnées de paiement et apparence.
          </p>
        </div>
        <Button type="submit" variant="primary" disabled={busy}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {busy ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        </Button>
      </div>

      {/* ---------- Association ---------- */}
      <Card className="p-5">
        <SectionTitle title="Association" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'association">
            <input
              className="field"
              value={form.association_name}
              onChange={(e) => set("association_name", e.target.value)}
            />
          </Field>
          <Field label="Devise" hint="Affichée sur tous les montants et rapports.">
            <input
              className="field"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {/* ---------- Identité visuelle ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Identité du comité"
          subtitle="Reprise sur la carte de membre, la page publique et les rapports."
        />

        <div className="flex flex-wrap items-start gap-5">
          <div className="shrink-0">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Logo
            </span>
            {/* Fichier du dépôt : remplacez public/logo-ucjea.jpg pour le changer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.logo_url || "/logo-ucjea.jpg"}
              alt="Logo du comité"
              className="h-20 w-auto rounded-lg border border-line bg-white p-1.5"
            />
          </div>

          <div className="grid min-w-64 flex-1 gap-4 sm:grid-cols-2">
            <Field label="Devise" hint="Affichée entre guillemets sur la carte.">
              <input
                className="field"
                value={form.motto}
                onChange={(e) => set("motto", e.target.value)}
                placeholder="L'avenir nous appartient"
              />
            </Field>
            <Field label="Ville / localité">
              <input
                className="field"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Aheoua, Côte d'Ivoire"
              />
            </Field>
            <Field label="Téléphone du comité">
              <input
                className="field"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="0142767290"
              />
            </Field>
            <Field
              label="Préfixe des cartes"
              hint={
                "Numéros de la forme " +
                (form.card_prefix || "UCJEA") +
                "-" +
                form.exercise_year +
                "-014"
              }
            >
              <input
                className="field uppercase"
                value={form.card_prefix}
                onChange={(e) => set("card_prefix", e.target.value.toUpperCase())}
                placeholder="UCJEA"
              />
            </Field>
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">
          Pour changer le logo, remplacez le fichier{" "}
          <code className="text-ink">public/logo-ucjea.jpg</code> du projet par votre
          nouvelle image, puis redéployez. Le médaillon circulaire est automatiquement
          détouré de la banderole pour l&apos;impression des cartes.
        </p>
      </Card>

      {/* ---------- Montants ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Montants"
          subtitle="Le droit d'adhésion est distinct de la cotisation et n'est dû qu'une seule fois."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cotisation mensuelle"
            hint={"Actuellement " + formatAmount(settings.monthly_amount, settings.currency)}
          >
            <input
              className="field"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={form.monthly_amount}
              onChange={(e) => set("monthly_amount", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Droit d'adhésion"
            hint={"Actuellement " + formatAmount(settings.membership_fee, settings.currency)}
          >
            <input
              className="field"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={form.membership_fee}
              onChange={(e) => set("membership_fee", Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">
          Modifier la cotisation mensuelle ne recalcule pas les paiements déjà
          enregistrés : chaque paiement conserve le montant en vigueur au moment de son
          enregistrement.
        </p>
      </Card>

      {/* ---------- Exercice ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Exercice en cours"
          subtitle="Plage de mois de la grille, et mois réellement ouverts aux cotisations."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Année">
            <input
              className="field"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              value={form.exercise_year}
              onChange={(e) => set("exercise_year", Number(e.target.value))}
            />
          </Field>
          <Field label="Premier mois">
            <select
              className="field"
              value={form.start_month}
              onChange={(e) => set("start_month", Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dernier mois">
            <select
              className="field"
              value={form.end_month}
              onChange={(e) => set("end_month", Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="mb-2.5 mt-5 text-xs font-medium uppercase tracking-wide text-muted">
          Mois ouverts
        </p>
        <div className="flex flex-wrap gap-2">
          {exerciseMonths(form).map((m) => {
            const open = form.active_months.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs transition " +
                  (open
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-muted hover:bg-surface-2")
                }
              >
                {MONTH_NAMES[m - 1]}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Un mois fermé apparaît dans la grille mais n&apos;est jamais compté comme un
          arriéré, ni dans le montant théorique.
        </p>

        {form.end_month < form.start_month && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
            Le dernier mois doit être postérieur au premier mois.
          </p>
        )}
      </Card>

      {/* ---------- Coordonnées de paiement ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Coordonnées de paiement"
          subtitle="Reprises automatiquement dans les rapports PDF et les messages WhatsApp."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Wave">
            <input
              className="field"
              value={form.pay_wave}
              onChange={(e) => set("pay_wave", e.target.value)}
              placeholder="07 00 00 00 00"
            />
          </Field>
          <Field label="MTN Mobile Money">
            <input
              className="field"
              value={form.pay_mtn}
              onChange={(e) => set("pay_mtn", e.target.value)}
              placeholder="05 00 00 00 00"
            />
          </Field>
          <Field label="Orange Money">
            <input
              className="field"
              value={form.pay_orange}
              onChange={(e) => set("pay_orange", e.target.value)}
              placeholder="07 00 00 00 00"
            />
          </Field>
        </div>
      </Card>

      {/* ---------- Apparence ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Apparence"
          subtitle="La couleur d'accent s'applique à l'application et aux rapports."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {ACCENTS.map((a) => {
            const selected = form.accent === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => {
                  set("accent", a.key);
                  // Aperçu immédiat, avant même l'enregistrement.
                  document.documentElement.dataset.accent = a.key;
                }}
                className={
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition " +
                  (selected ? "border-accent" : "border-line hover:bg-surface-2")
                }
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line"
                  style={{ background: a.bg }}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: a.swatch }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{a.label}</span>
                  {selected && (
                    <span className="mt-1 inline-block">
                      <Badge tone="accent">
                        <Palette size={11} /> Sélectionné
                      </Badge>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ---------- Rappel des règles appliquées ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Règles appliquées automatiquement"
          subtitle="Elles sont codées dans l'application et ne nécessitent aucun réglage."
        />
        <ul className="space-y-2.5 text-sm text-muted">
          <Rule>
            Un membre n&apos;est jamais redevable d&apos;un mois antérieur à son
            adhésion ; ces cases apparaissent grisées et sont exclues de son taux de
            recouvrement.
          </Rule>
          <Rule>
            Le droit d&apos;adhésion est distinct de la cotisation mensuelle et n&apos;est
            facturé qu&apos;une seule fois, à l&apos;arrivée du membre.
          </Rule>
          <Rule>
            Le taux de recouvrement d&apos;un membre se calcule uniquement sur les mois
            ouverts pendant lesquels il était effectivement membre.
          </Rule>
          <Rule>
            Le signalement « risque de retrait » ne vise que les membres présents dès le
            début de l&apos;exercice cumulant 3 mois d&apos;impayés consécutifs.
          </Rule>
        </ul>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-4">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Wallet size={16} className="text-accent" />
          Les modifications ne sont appliquées qu&apos;après enregistrement.
        </p>
        <Button type="submit" variant="primary" disabled={busy}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {busy ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check size={15} className="mt-0.5 shrink-0 text-accent" />
      <span>{children}</span>
    </li>
  );
}
