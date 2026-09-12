"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Copy, ShieldCheck } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import {
  RISK_THRESHOLD,
  fullName,
  joinLabel,
  sortStats,
} from "@/lib/cotisations";
import { arrearsAlert, monthList } from "@/lib/messages";
import { copyToClipboard, formatAmount } from "@/lib/format";

/**
 * Signalements.
 *
 * Deux listes distinctes, conformément à la règle métier n°4 :
 *  - « Risque de retrait » : uniquement les membres présents dès le début de
 *    l'exercice cumulant 3 mois d'impayés consécutifs.
 *  - « Arriérés importants » : les autres membres à 3 mois d'arriérés ou plus,
 *    arrivés en cours d'exercice — à relancer, mais sans procédure de retrait.
 */
export default function AlertesPage() {
  const { stats, settings, loading, members, logReport } = useData();
  const [copied, setCopied] = useState(false);
  const c = settings.currency;

  if (loading && members.length === 0) return <Spinner />;

  const atRisk = sortStats(stats.filter((s) => s.atRisk));
  const heavyArrears = sortStats(
    stats.filter((s) => s.member.active && !s.atRisk && s.dueMonths.length >= RISK_THRESHOLD),
  );
  const feeUnpaid = sortStats(
    stats.filter((s) => s.member.active && s.feeDue && !s.feePaid),
  );

  async function onCopyAlert() {
    const ok = await copyToClipboard(arrearsAlert(stats, settings));
    setCopied(ok);
    setTimeout(() => setCopied(false), 2200);
    if (ok) {
      await logReport("whatsapp-arrieres", "Message d'alerte arriérés copié", {
        concernes: atRisk.length + heavyArrears.length,
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alertes</h1>
          <p className="mt-1 text-sm text-muted">
            Suivi des situations à régulariser · exercice {settings.exercise_year}
          </p>
        </div>
        <Button variant="primary" onClick={() => void onCopyAlert()}>
          <Copy size={15} /> {copied ? "Copié !" : "Copier le message d'alerte"}
        </Button>
      </div>

      {/* ---------- Risque de retrait (règle métier n°4) ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger" />
            <h2 className="font-semibold">Risque de retrait du comité</h2>
            {atRisk.length > 0 && <Badge tone="danger">{atRisk.length}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            Membres présents depuis l&apos;ouverture de l&apos;exercice cumulant{" "}
            {RISK_THRESHOLD} mois d&apos;impayés <strong>consécutifs</strong> ou plus.
          </p>
        </div>

        {atRisk.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={32} />}
            title="Aucun membre signalé"
            description="Personne ne cumule trois mois d'impayés consécutifs depuis l'ouverture de l'exercice."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {atRisk.map((s) => (
              <li key={s.member.id}>
                <Link
                  href={`/membres/${s.member.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{fullName(s.member)}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Membre depuis {joinLabel(s.member)} · mois dus :{" "}
                      {monthList(s.dueMonths)}
                    </p>
                  </div>
                  <Badge tone="danger">
                    {s.longestUnpaidStreak} mois consécutifs
                  </Badge>
                  <span className="w-28 text-right text-sm tabular-nums text-due">
                    {formatAmount(s.outstanding, c)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- Arriérés importants hors procédure ---------- */}
      {heavyArrears.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Arriérés importants</h2>
            <p className="mt-1 text-sm text-muted">
              3 mois d&apos;arriérés ou plus, mais arrivés en cours d&apos;exercice : à
              relancer, sans procédure de retrait.
            </p>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {heavyArrears.map((s) => (
              <li key={s.member.id}>
                <Link
                  href={`/membres/${s.member.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{fullName(s.member)}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Membre depuis {joinLabel(s.member)} · mois dus :{" "}
                      {monthList(s.dueMonths)}
                    </p>
                  </div>
                  <Badge tone="due">{s.dueMonths.length} mois dus</Badge>
                  <span className="w-28 text-right text-sm tabular-nums text-due">
                    {formatAmount(s.outstanding, c)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Droits d'adhésion en attente ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <SectionTitle
            title="Droits d'adhésion en attente"
            subtitle={`${formatAmount(settings.membership_fee, c)} dus une seule fois, à l'arrivée.`}
          />
        </div>
        {feeUnpaid.length === 0 ? (
          <EmptyState title="Tous les droits d'adhésion sont réglés" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {feeUnpaid.map((s) => (
              <li key={s.member.id}>
                <Link
                  href={`/membres/${s.member.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1 truncate">{fullName(s.member)}</span>
                  <span className="text-xs text-muted">{joinLabel(s.member)}</span>
                  <Badge tone="due">{formatAmount(settings.membership_fee, c)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
