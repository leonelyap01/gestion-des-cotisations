"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useData } from "./DataProvider";
import { deleteCover, uploadCover } from "@/lib/storage";
import { coverUrl } from "@/lib/media";

/**
 * Choix d'une image de couverture (annonce ou page « Notre vision »).
 *
 * L'image est recadrée en 16/9 et compressée dans le navigateur avant d'être
 * envoyée : une photo de téléphone de plusieurs mégaoctets descend à quelques
 * centaines de kilo-octets, ce qui compte pour les membres en connexion mobile.
 */
export function CoverPicker({
  value,
  onChange,
  prefix,
  label = "Image de couverture",
}: {
  /** Chemin actuel dans le bucket, ou null. */
  value: string | null;
  onChange: (path: string | null) => void;
  /** Dossier de rangement : « annonces » ou « vision ». */
  prefix: string;
  label?: string;
}) {
  const { supabase } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = coverUrl(value);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const path = await uploadCover(supabase, prefix, file);
      // L'ancienne image n'a plus d'utilité une fois la nouvelle en place.
      const previous = value;
      onChange(path);
      if (previous && previous !== path) await deleteCover(supabase, previous);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    const previous = value;
    onChange(null);
    if (previous) await deleteCover(supabase, previous);
    setBusy(false);
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
        {url ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="block aspect-video w-full object-cover"
            />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-muted transition hover:bg-surface hover:text-ink disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <ImagePlus size={22} />
            )}
            <span className="text-xs">
              {busy ? "Envoi en cours…" : "Ajouter une image"}
            </span>
            <span className="text-[11px] opacity-70">
              Recadrée automatiquement en 16/9
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />

      {url && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            <ImagePlus size={13} /> Remplacer
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-2 hover:text-danger disabled:opacity-50"
          >
            <Trash2 size={13} /> Retirer
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-danger">
          L&apos;image n&apos;a pas pu être envoyée : {error}
        </p>
      )}
    </div>
  );
}
