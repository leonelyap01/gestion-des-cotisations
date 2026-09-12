"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Minus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { MemberForm } from "@/components/MemberForm";
import { Badge, Button, Card, Modal, Progress, SectionTitle, Spinner } from "@/components/ui";
import {
  MONTH_NAMES,
  cellStatus,
  exerciseMonths,
  fullName,
  joinLabel,
  paymentKey,
} from "@/lib/cotisations";
import { individualReminder } from "@/lib/messages";
import { copyToClipboard, formatAmount, formatDate, formatPercent } from "@/lib/format";
import type { CellStatus } from "@/lib/types";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    settings,
    statsById,
    paymentIndex,
    togglePayment,
    toggleMembershipFee,
    deleteMember,
    loading,
  } = useData();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = statsById.get(params.id);

  if (loading && !stats) return <Spinner />;

  if (!stats) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted">Ce membre est introuvable.</p>
        <Link href="/membres" className="mt-3 inline-block text-sm text-accent hover:underline">
          Retour à la liste des membres
        </Link>
      </Card>
    );
  }

  const { member } = stats;
  const c = settings.currency;
  const year = settings.exercise_year;

  async function onCopyMessage() {
    const ok = await copyToClipboard(individualReminder(stats!, settings));
    setCopied(ok);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="space-y-5">
      <Link
        href="/membres"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Membres
      </Link>

      {/* ---------- En-tête de la fiche ---------- */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{fullName(member)}</h1>
            <p className="mt-1 text-sm text-muted">
              Membre depuis {joinLabel(member)}
              {member.phone && " · " + member.phone}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {stats.atRisk && (
                <Badge tone="danger">
                  <AlertTriangle size={11} /> Signalé — {stats.longestUnpaidStreak} mois
                  consécutifs impayés
                </Badge>
              )}
              {!member.active && <Badge>Retiré du comité</Badge>}
              {stats.foundingMember && <Badge tone="accent">Présent dès l&apos;ouverture</Badge>}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setEditOpen(true)}>
              <Pencil size={15} /> Modifier
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          </div>
        </div>

        {member.notes && (
          <p className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-sm text-muted">
            {member.notes}
          </p>
        )}
      </Card>

      {/* ---------- Indicateurs ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Mois soldés" value={`${stats.paidMonths} / ${stats.eligibleMonths}`} />
        <MiniStat
          label="Mois dus"
          value={String(stats.dueMonths.length)}
          tone={stats.dueMonths.length > 0 ? "due" : "paid"}
        />
        <MiniStat label="Reste à percevoir" value={formatAmount(stats.outstanding, c)} />
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Recouvrement</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">
            {formatPercent(stats.recoveryRate)}
          </p>
          <div className="mt-2.5">
            <Progress value={stats.recoveryRate} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Calculé uniquement sur les mois où il/elle était membre.
          </p>
        </Card>
      </div>

      {/* ---------- Droit d'adhésion ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Droit d'adhésion"
          subtitle={
            stats.feeDue
              ? `Dû une seule fois · ${formatAmount(settings.membership_fee, c)}`
              : "Non réclamé à ce membre"
          }
        />
        {stats.feeDue ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface-2 p-3.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={stats.feePaid}
              onChange={(e) => void toggleMembershipFee(member.id, e.target.checked)}
            />
            <span className="flex-1">
              {stats.feePaid ? "Réglé" : "Non réglé"}
              {stats.feePaid && member.membership_fee_paid_at && (
                <span className="ml-2 text-muted">
                  le {formatDate(member.membership_fee_paid_at)}
                </span>
              )}
            </span>
            {stats.feePaid ? <Badge tone="paid">Soldé</Badge> : <Badge tone="due">En attente</Badge>}
          </label>
        ) : (
          <p className="text-sm text-muted">
            Ce membre n&apos;est pas redevable du droit d&apos;adhésion.
          </p>
        )}
      </Card>

      {/* ---------- Historique mois par mois ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Historique des cotisations {year}</h2>
          <p className="mt-0.5 text-sm text-muted">
            Cochez un mois pour l&apos;enregistrer comme soldé. Les mois précédant
            l&apos;adhésion ne sont jamais réclamés.
          </p>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {exerciseMonths(settings).map((month) => {
            const payment = paymentIndex.get(paymentKey(member.id, year, month));
            const status = cellStatus(member, month, settings, Boolean(payment));
            return (
              <li key={month} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      "text-sm " + (status === "not_member" ? "text-muted" : "font-medium")
                    }
                  >
                    {MONTH_NAMES[month - 1]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{statusHint(status, payment?.paid_at)}</p>
                </div>

                <StatusChip status={status} />

                {status === "not_member" ? (
                  <span className="w-24 text-right text-xs text-muted">—</span>
                ) : (
                  <button
                    onClick={() => void togglePayment(member.id, month, !payment)}
                    className={
                      "w-24 rounded-lg border px-2 py-1.5 text-xs transition " +
                      (payment
                        ? "border-paid/40 bg-paid-soft text-paid hover:bg-paid/20"
                        : "border-line text-muted hover:bg-surface-2 hover:text-ink")
                    }
                  >
                    {payment ? (
                      <span className="inline-flex items-center gap-1">
                        <Check size={12} /> Soldé
                      </span>
                    ) : (
                      "Marquer soldé"
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ---------- Message individuel ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Message WhatsApp personnalisé"
          subtitle="Prêt à copier-coller, avec le nom et le nombre de mois dus."
          action={
            <Button variant="primary" onClick={() => void onCopyMessage()}>
              <Copy size={15} /> {copied ? "Copié !" : "Copier"}
            </Button>
          }
        />
        <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-4 text-sm leading-relaxed text-muted">
          {individualReminder(stats, settings)}
        </pre>
      </Card>

      <MemberForm open={editOpen} onClose={() => setEditOpen(false)} member={member} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer ce membre ?"
      >
        <p className="text-sm text-muted">
          La fiche de <strong className="text-ink">{fullName(member)}</strong> et tous ses
          paiements enregistrés seront définitivement effacés. Pour conserver
          l&apos;historique, préférez le passage en « membre retiré » depuis le
          formulaire de modification.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await deleteMember(member.id);
              router.push("/membres");
            }}
          >
            <Trash2 size={15} /> Supprimer définitivement
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function statusHint(status: CellStatus, paidAt?: string): string {
  switch (status) {
    case "not_member":
      return "Non membre à cette période";
    case "paid":
      return "Enregistré le " + formatDate(paidAt);
    case "due":
      return "Mois ouvert, non soldé";
    case "upcoming":
      return "Mois pas encore ouvert";
  }
}

function StatusChip({ status }: { status: CellStatus }) {
  switch (status) {
    case "paid":
      return <Badge tone="paid">Soldé</Badge>;
    case "due":
      return <Badge tone="due">Dû</Badge>;
    case "upcoming":
      return <Badge>À venir</Badge>;
    case "not_member":
      return (
        <Badge>
          <Minus size={11} /> Non membre
        </Badge>
      );
  }
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "paid" | "due";
}) {
  const colors: Record<string, string> = {
    neutral: "text-ink",
    paid: "text-paid",
    due: "text-due",
  };
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={"mt-1 text-xl font-semibold tracking-tight " + colors[tone]}>{value}</p>
    </Card>
  );
}
