"use client";

import { useEffect, useState } from "react";
import { Button, Field, Modal } from "./ui";
import { useData, type NewMember } from "./DataProvider";
import { MONTH_NAMES } from "@/lib/cotisations";
import { formatAmount } from "@/lib/format";
import type { Member } from "@/lib/types";

/**
 * Formulaire d'ajout / modification d'un membre.
 *
 * Le mois d'adhésion est le champ structurant : il détermine à partir de quand
 * la personne devient redevable (règle métier n°1) et si le droit d'adhésion
 * lui est réclamé (règle métier n°2).
 */
export function MemberForm({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  /** Membre existant à modifier, ou undefined pour une création. */
  member?: Member;
}) {
  const { settings, addMember, updateMember } = useData();
  const [form, setForm] = useState<NewMember>(emptyMember(settings.exercise_year, settings.start_month));
  const [busy, setBusy] = useState(false);

  // Réinitialise le formulaire à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setForm(
      member
        ? {
            last_name: member.last_name,
            first_name: member.first_name,
            phone: member.phone ?? "",
            join_year: member.join_year,
            join_month: member.join_month,
            membership_fee_due: member.membership_fee_due,
            membership_fee_paid_at: member.membership_fee_paid_at,
            active: member.active,
            notes: member.notes ?? "",
          }
        : emptyMember(settings.exercise_year, settings.start_month),
    );
  }, [open, member, settings.exercise_year, settings.start_month]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.last_name.trim()) return;
    setBusy(true);
    if (member) {
      await updateMember(member.id, form);
    } else {
      await addMember({ ...form, last_name: form.last_name.trim() });
    }
    setBusy(false);
    onClose();
  }

  const set = <K extends keyof NewMember>(key: K, value: NewMember[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? "Modifier le membre" : "Nouveau membre"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom">
            <input
              className="field"
              required
              autoFocus
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              placeholder="KOUASSI"
            />
          </Field>
          <Field label="Prénoms">
            <input
              className="field"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              placeholder="Aya Grace"
            />
          </Field>
        </div>

        <Field label="Téléphone" hint="Facultatif — sert aux messages WhatsApp.">
          <input
            className="field"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="07 00 00 00 00"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mois d'adhésion"
            hint="Aucun mois antérieur ne lui sera réclamé."
          >
            <select
              className="field"
              value={form.join_month}
              onChange={(e) => set("join_month", Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Année d'adhésion">
            <input
              className="field"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              value={form.join_year}
              onChange={(e) => set("join_year", Number(e.target.value))}
            />
          </Field>
        </div>

        {/* ---- Droit d'adhésion (règle métier n°2) ---- */}
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Droit d&apos;adhésion · {formatAmount(settings.membership_fee, settings.currency)}
          </p>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              checked={form.membership_fee_due}
              onChange={(e) => set("membership_fee_due", e.target.checked)}
            />
            <span>
              Ce membre doit le droit d&apos;adhésion
              <span className="mt-0.5 block text-xs text-muted">
                Décochez pour un membre fondateur qui l&apos;a déjà réglé
                antérieurement.
              </span>
            </span>
          </label>

          {form.membership_fee_due && (
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={Boolean(form.membership_fee_paid_at)}
                onChange={(e) =>
                  set(
                    "membership_fee_paid_at",
                    e.target.checked ? new Date().toISOString() : null,
                  )
                }
              />
              <span>Droit d&apos;adhésion déjà réglé</span>
            </label>
          )}
        </div>

        <Field label="Notes">
          <textarea
            className="field min-h-20 resize-y"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Remarques éventuelles…"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          <span>
            Membre actif
            <span className="ml-1 text-muted">
              (décocher = retiré du comité, conservé dans l&apos;historique)
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose} variant="ghost">
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Enregistrement…" : member ? "Enregistrer" : "Ajouter le membre"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function emptyMember(year: number, month: number): NewMember {
  return {
    last_name: "",
    first_name: "",
    phone: "",
    join_year: year,
    join_month: month,
    membership_fee_due: true,
    membership_fee_paid_at: null,
    active: true,
    notes: "",
  };
}
