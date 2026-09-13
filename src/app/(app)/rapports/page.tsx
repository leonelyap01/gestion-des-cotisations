"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  History,
  MessageCircle,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from "@/components/ui";
import {
  MONTH_NAMES,
  currentOpenMonth,
  exerciseMonths,
  sortStats,
} from "@/lib/cotisations";
import {
  arrearsAlert,
  cashPointMessage,
  monthlyReminder,
  newMonthAnnouncement,
} from "@/lib/messages";
import {
  copyToClipboard,
  downloadBlob,
  formatDateTime,
  slugify,
} from "@/lib/format";
import { toArrayBuffer, toDataUrl } from "@/lib/storage";

type MessageKey = "reminder" | "newMonth" | "arrears" | "cashPoint";

export default function RapportsPage() {
  const { settings, stats, payments, dashboard, reports, logReport, loading, members } =
    useData();

  const [busy, setBusy] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<MessageKey | null>(null);
  const [reminderMonth, setReminderMonth] = useState<number>(
    currentOpenMonth(settings) ?? settings.start_month,
  );
  const [nextMonth, setNextMonth] = useState<number>(
    Math.min((currentOpenMonth(settings) ?? settings.start_month) + 1, settings.end_month),
  );

  if (loading && members.length === 0) return <Spinner />;

  const rows = sortStats(stats.filter((s) => s.member.active));
  const year = settings.exercise_year;
  const base = slugify(settings.association_name) || "comite";

  // ----- Exports de fichiers -------------------------------------------------

  async function exportGrillePdf() {
    setBusy("pdf-grille");
    try {
      const { buildGrillePdf } = await import("@/lib/exports/pdf");
      const logo = await toDataUrl(settings.logo_url || "/logo-ucjea.jpg");
      const blob = await buildGrillePdf({ rows, settings, payments, dashboard, logo });
      downloadBlob(blob, `grille-cotisations-${base}-${year}.pdf`);
      await logReport("pdf-grille", `Grille de cotisations ${year} (PDF)`, {
        membres: rows.length,
      });
    } finally {
      setBusy(null);
    }
  }

  async function exportGrilleDocx() {
    setBusy("docx-grille");
    try {
      const { buildGrilleDocx } = await import("@/lib/exports/docx");
      const logo = await toArrayBuffer(settings.logo_url || "/logo-ucjea.jpg");
      const blob = await buildGrilleDocx({ rows, settings, payments, dashboard, logo });
      downloadBlob(blob, `grille-cotisations-${base}-${year}.docx`);
      await logReport("docx-grille", `Grille de cotisations ${year} (Word)`, {
        membres: rows.length,
      });
    } finally {
      setBusy(null);
    }
  }

  async function exportCaissePdf() {
    setBusy("pdf-caisse");
    try {
      const { buildCaissePdf } = await import("@/lib/exports/pdf");
      const logo = await toDataUrl(settings.logo_url || "/logo-ucjea.jpg");
      const blob = await buildCaissePdf({ dashboard, settings, stats: rows, logo });
      downloadBlob(blob, `point-de-caisse-${base}-${year}.pdf`);
      await logReport("pdf-caisse", `Point de caisse ${year} (PDF)`, {
        percu: dashboard.collected,
        theorique: dashboard.expected,
      });
    } finally {
      setBusy(null);
    }
  }

  // ----- Messages WhatsApp ---------------------------------------------------

  const messages: Record<MessageKey, { title: string; hint: string; text: string }> = {
    reminder: {
      title: "Rappel de cotisation",
      hint: "Pour le mois sélectionné.",
      text: monthlyReminder(settings, reminderMonth),
    },
    newMonth: {
      title: "Ouverture d'un nouveau mois",
      hint: "À envoyer quand un mois s'ouvre.",
      text: newMonthAnnouncement(settings, nextMonth),
    },
    arrears: {
      title: "Alerte arriérés (3 mois et plus)",
      hint: "Liste nominative des membres concernés.",
      text: arrearsAlert(stats, settings),
    },
    cashPoint: {
      title: "Point de caisse résumé",
      hint: "Synthèse chiffrée à partager au groupe.",
      text: cashPointMessage(dashboard, settings),
    },
  };

  async function copyMessage(key: MessageKey) {
    const ok = await copyToClipboard(messages[key].text);
    if (!ok) return;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
    await logReport("whatsapp-" + key, messages[key].title + " — message copié");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
        <p className="mt-1 text-sm text-muted">
          Exports imprimables et messages prêts à partager · exercice {year}
        </p>
      </div>

      {/* ---------- Exports de fichiers ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Documents"
          subtitle="Mise en page professionnelle, imprimable en paysage."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <ExportTile
            icon={<FileText size={18} />}
            title="Grille de cotisations (PDF)"
            description="Liste des membres et suivi mois par mois, A4 paysage."
            busy={busy === "pdf-grille"}
            onClick={exportGrillePdf}
          />
          <ExportTile
            icon={<FileSpreadsheet size={18} />}
            title="Grille de cotisations (Word)"
            description="Même document au format .docx, modifiable avant diffusion."
            busy={busy === "docx-grille"}
            onClick={exportGrilleDocx}
          />
          <ExportTile
            icon={<FileText size={18} />}
            title="Point de caisse (PDF)"
            description="Synthèse théorique / perçu à partager avec les membres."
            busy={busy === "pdf-caisse"}
            onClick={exportCaissePdf}
          />
        </div>
        {rows.length === 0 && (
          <p className="mt-3 text-xs text-muted">
            Aucun membre actif : les documents générés seront vides.
          </p>
        )}
      </Card>

      {/* ---------- Messages WhatsApp ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Messages WhatsApp"
          subtitle="Copiez, puis collez directement dans la conversation du comité."
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Mois du rappel
            <select
              className="field mt-1.5"
              value={reminderMonth}
              onChange={(e) => setReminderMonth(Number(e.target.value))}
            >
              {exerciseMonths(settings).map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m - 1]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Mois à annoncer
            <select
              className="field mt-1.5"
              value={nextMonth}
              onChange={(e) => setNextMonth(Number(e.target.value))}
            >
              {exerciseMonths(settings).map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m - 1]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3">
          {(Object.keys(messages) as MessageKey[]).map((key) => (
            <div key={key} className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <MessageCircle size={15} className="text-accent" />
                    {messages[key].title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{messages[key].hint}</p>
                </div>
                <Button
                  variant={copiedKey === key ? "primary" : "outline"}
                  onClick={() => void copyMessage(key)}
                >
                  {copiedKey === key ? <Check size={15} /> : <Copy size={15} />}
                  {copiedKey === key ? "Copié !" : "Copier"}
                </Button>
              </div>
              <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted">
                {messages[key].text}
              </pre>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">
          Le message individuel personnalisé (nom + mois dus) se trouve sur la fiche de
          chaque membre.
        </p>
      </Card>

      {/* ---------- Historique ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <History size={17} className="text-muted" />
            <h2 className="font-semibold">Historique des rapports générés</h2>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            60 dernières générations, tous formats confondus.
          </p>
        </div>
        {reports.length === 0 ? (
          <EmptyState
            title="Aucun rapport généré pour l'instant"
            description="Chaque export ou message copié sera enregistré ici avec sa date."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-sm">{r.label}</span>
                <Badge tone={r.kind.startsWith("whatsapp") ? "accent" : "neutral"}>
                  {r.kind.startsWith("whatsapp") ? "Message" : "Document"}
                </Badge>
                <span className="shrink-0 text-xs text-muted">
                  {formatDateTime(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ExportTile({
  icon,
  title,
  description,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  busy: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      onClick={() => void onClick()}
      disabled={busy}
      className="flex flex-col items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-left transition hover:border-accent/50 hover:bg-surface disabled:opacity-60"
    >
      <span className="rounded-lg bg-accent-soft p-2 text-accent">{icon}</span>
      <span className="font-medium">{title}</span>
      <span className="text-xs leading-relaxed text-muted">{description}</span>
      <span className="mt-1 text-xs text-accent">
        {busy ? "Génération en cours…" : "Télécharger"}
      </span>
    </button>
  );
}
