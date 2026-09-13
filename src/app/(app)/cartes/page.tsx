"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  Copy,
  Hash,
  IdCard,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { Badge, Button, Card, Progress, SectionTitle, Spinner } from "@/components/ui";
import { fullName } from "@/lib/cotisations";
import {
  assignMissingCardNumbers,
  cardProgress,
  memberRole,
  verificationUrl,
} from "@/lib/cartes";
import {
  deletePhoto,
  logoMedallionDataUrl,
  photoUrl,
  toDataUrl,
  uploadPhoto,
} from "@/lib/storage";
import { copyToClipboard, downloadBlob, formatPercent, slugify } from "@/lib/format";
import type { Member } from "@/lib/types";

/**
 * Atelier des cartes de membre : collecte des photos, attribution des numéros
 * et génération du PDF prêt à imprimer.
 */
export default function CartesPage() {
  const { members, settings, supabase, updateMember, refresh, loading, ready, logReport } =
    useData();

  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Liens signés des portraits (le bucket est privé, rien n'est accessible
  // par simple URL).
  const loadPhotoUrls = useCallback(async () => {
    const entries = await Promise.all(
      members
        .filter((m) => m.photo_path)
        .map(async (m) => [m.id, await photoUrl(supabase, m.photo_path)] as const),
    );
    const map: Record<string, string> = {};
    for (const [id, url] of entries) if (url) map[id] = url;
    setUrls(map);
  }, [members, supabase]);

  useEffect(() => {
    void loadPhotoUrls();
  }, [loadPhotoUrls]);

  if (!ready || (loading && members.length === 0)) return <Spinner />;

  // Ordre alphabétique, comme partout ailleurs dans l'application.
  const rows = members
    .filter((m) => m.active)
    .sort((a, b) =>
      fullName(a).localeCompare(fullName(b), "fr", { sensitivity: "base" }),
    );

  const progress = cardProgress(members);
  const missingNumbers = members.filter((m) => m.active && !m.card_number).length;

  // ----- Actions ------------------------------------------------------------

  async function assignNumbers() {
    setBusy("numeros");
    const assignments = assignMissingCardNumbers(members, settings);
    for (const a of assignments) {
      await supabase.from("members").update({ card_number: a.card_number }).eq("id", a.id);
    }
    await refresh();
    setBusy(null);
  }

  async function onPhotoSelected(member: Member, file: File) {
    setBusy("photo-" + member.id);
    try {
      const path = await uploadPhoto(supabase, member.id, file);
      // L'ancien fichier n'a plus d'utilité une fois le nouveau enregistré.
      const previous = member.photo_path;
      await updateMember(member.id, { photo_path: path });
      if (previous && previous !== path) await deletePhoto(supabase, previous);
      await loadPhotoUrls();
    } catch (e) {
      alert(
        "La photo n'a pas pu être enregistrée : " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setBusy(null);
    }
  }

  async function removePhoto(member: Member) {
    setBusy("photo-" + member.id);
    await deletePhoto(supabase, member.photo_path);
    await updateMember(member.id, { photo_path: null });
    setUrls((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });
    setBusy(null);
  }

  /** Génère le PDF des cartes pour la liste de membres fournie. */
  async function generateCards(list: Member[], label: string, filename: string) {
    if (list.length === 0) return;
    setBusy("pdf");
    try {
      const [{ buildCartesPdf }, QRCode] = await Promise.all([
        import("@/lib/exports/carte"),
        import("qrcode"),
      ]);

      // Logo recadré sur son médaillon, préparé une fois pour toutes les cartes.
      const logo = await logoMedallionDataUrl(settings.logo_url || "/logo-ucjea.jpg");

      const photos: Record<string, string | null> = {};
      const qrCodes: Record<string, string | null> = {};

      for (const member of list) {
        photos[member.id] = urls[member.id] ? await toDataUrl(urls[member.id]) : null;
        qrCodes[member.id] = await QRCode.toDataURL(
          verificationUrl(origin, member.id),
          { margin: 0, width: 240, errorCorrectionLevel: "M" },
        );
      }

      const blob = await buildCartesPdf({
        members: list,
        settings,
        assets: { logo, photos, qrCodes },
      });
      downloadBlob(blob, filename);
      await logReport("pdf-cartes", label, { cartes: list.length });
    } catch (e) {
      alert(
        "La génération des cartes a échoué : " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setBusy(null);
    }
  }

  const base = slugify(settings.association_name) || "comite";
  const withNumber = members.filter((m) => m.active && m.card_number);

  async function copyPhotoRequest() {
    const message =
      "📢 *INFORMATION À L'ATTENTION DE TOUS LES MEMBRES*\n\n" +
      "Chers membres du " +
      settings.association_name +
      ", nous procédons actuellement à l'établissement des *cartes de membre*.\n\n" +
      "👉 Merci d'envoyer en privé une *photo récente et nette* de vous, nécessaire à la conception de votre carte.\n\n" +
      "NB : cette démarche concerne *tous les membres* du comité. Merci de transmettre votre photo dans les meilleurs délais afin que nous avancions rapidement.\n\n" +
      "Merci à tous pour votre compréhension et votre disponibilité.";
    if (await copyToClipboard(message)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      await logReport("whatsapp-photos", "Relance photos pour les cartes de membre");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cartes de membre</h1>
        <p className="mt-1 text-sm text-muted">
          Collecte des photos, attribution des numéros et impression des cartes ·
          exercice {settings.exercise_year}
        </p>
      </div>

      {/* ---------- Avancement ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          icon={<UserRound size={17} />}
          label="Membres actifs"
          value={String(progress.total)}
        />
        <MiniStat
          icon={<Hash size={17} />}
          label="Numéros attribués"
          value={progress.withNumber + " / " + progress.total}
          ratio={progress.total ? progress.withNumber / progress.total : 0}
        />
        <MiniStat
          icon={<Camera size={17} />}
          label="Photos reçues"
          value={progress.withPhoto + " / " + progress.total}
          ratio={progress.total ? progress.withPhoto / progress.total : 0}
        />
        <MiniStat
          icon={<BadgeCheck size={17} />}
          label="Cartes remises"
          value={progress.issued + " / " + progress.total}
          ratio={progress.total ? progress.issued / progress.total : 0}
        />
      </div>

      {/* ---------- Actions ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Production des cartes"
          subtitle="Format 54 × 85,6 mm, deux membres par page A4, recto et verso côte à côte."
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void assignNumbers()} disabled={busy !== null || missingNumbers === 0}>
            {busy === "numeros" ? <Loader2 size={15} className="animate-spin" /> : <Hash size={15} />}
            {missingNumbers === 0
              ? "Tous les numéros sont attribués"
              : "Attribuer les " + missingNumbers + " numéros manquants"}
          </Button>

          <Button
            variant="primary"
            disabled={busy !== null || withNumber.length === 0}
            onClick={() =>
              void generateCards(
                withNumber,
                "Cartes de membre (" + withNumber.length + ")",
                "cartes-membres-" + base + "-" + settings.exercise_year + ".pdf",
              )
            }
          >
            {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <IdCard size={15} />}
            Générer les {withNumber.length} cartes (PDF)
          </Button>

          <Button onClick={() => void copyPhotoRequest()}>
            <Copy size={15} /> {copied ? "Copié !" : "Message de relance photos"}
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted">
          Le QR code de chaque carte renvoie vers une page de vérification publique
          qui n&apos;affiche que le nom, le numéro, la fonction et le statut du membre
          — jamais ses cotisations.
        </p>
      </Card>

      {/* ---------- Liste des membres ---------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Membres</h2>
          <p className="mt-0.5 text-sm text-muted">
            Ajoutez la photo reçue en privé, puis générez la carte.
          </p>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {rows.map((member) => (
            <MemberCardRow
              key={member.id}
              member={member}
              photo={urls[member.id]}
              busy={busy === "photo-" + member.id}
              disabled={busy !== null}
              onPhoto={(file) => void onPhotoSelected(member, file)}
              onRemovePhoto={() => void removePhoto(member)}
              onToggleIssued={() =>
                void updateMember(member.id, {
                  card_issued_at: member.card_issued_at ? null : new Date().toISOString(),
                })
              }
              onGenerate={() =>
                void generateCards(
                  [member],
                  "Carte de " + fullName(member),
                  "carte-" + slugify(fullName(member)) + ".pdf",
                )
              }
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function MemberCardRow({
  member,
  photo,
  busy,
  disabled,
  onPhoto,
  onRemovePhoto,
  onToggleIssued,
  onGenerate,
}: {
  member: Member;
  photo?: string;
  busy: boolean;
  disabled: boolean;
  onPhoto: (file: File) => void;
  onRemovePhoto: () => void;
  onToggleIssued: () => void;
  onGenerate: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      {/* Vignette */}
      <div className="h-14 w-[42px] shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
        {busy ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={14} className="animate-spin text-muted" />
          </div>
        ) : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <UserRound size={16} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fullName(member)}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {memberRole(member)}
          {member.card_number ? " · " + member.card_number : " · numéro à attribuer"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {member.card_issued_at ? (
          <Badge tone="paid">Carte remise</Badge>
        ) : member.photo_path ? (
          <Badge tone="accent">Photo reçue</Badge>
        ) : (
          <Badge tone="due">Photo attendue</Badge>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhoto(file);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title={member.photo_path ? "Remplacer la photo" : "Ajouter la photo"}
          className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
        >
          <Camera size={16} />
        </button>

        {member.photo_path && (
          <button
            onClick={onRemovePhoto}
            disabled={disabled}
            title="Retirer la photo"
            className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        )}

        <button
          onClick={onToggleIssued}
          disabled={disabled}
          title={member.card_issued_at ? "Annuler la remise" : "Marquer la carte remise"}
          className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-paid disabled:opacity-40"
        >
          <Check size={16} />
        </button>

        <Button onClick={onGenerate} disabled={disabled || !member.card_number}>
          <IdCard size={15} />
          <span className="hidden sm:inline">Carte</span>
        </Button>
      </div>
    </li>
  );
}

function MiniStat({
  icon,
  label,
  value,
  ratio,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ratio?: number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-accent-soft p-2 text-accent">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
      {ratio !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <Progress value={ratio} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {formatPercent(ratio, 0)}
          </span>
        </div>
      )}
    </Card>
  );
}
