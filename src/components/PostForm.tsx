"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button, Field, Modal } from "./ui";
import { CoverPicker } from "./CoverPicker";
import { useData, type NewPost } from "./DataProvider";
import { POST_CATEGORIES, POST_CATEGORY_ORDER, categoryColor } from "@/lib/posts";
import { cashPointMessage } from "@/lib/messages";
import type { Post } from "@/lib/types";

/**
 * Rédaction d'une annonce publiée sur la page publique (racine du site).
 *
 * Une annonce non publiée reste un brouillon : elle n'est visible que dans
 * l'espace trésorier.
 */
export function PostForm({
  open,
  onClose,
  post,
}: {
  open: boolean;
  onClose: () => void;
  /** Annonce existante à modifier, ou undefined pour une création. */
  post?: Post;
}) {
  const { addPost, updatePost, dashboard, settings } = useData();
  const [form, setForm] = useState<NewPost>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      post
        ? {
            title: post.title,
            body: post.body,
            category: post.category,
            pinned: post.pinned,
            published: post.published,
            cover_path: post.cover_path,
          }
        : EMPTY,
    );
  }, [open, post]);

  const set = <K extends keyof NewPost>(key: K, value: NewPost[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    if (post) {
      await updatePost(post.id, form);
    } else {
      await addPost({ ...form, title: form.title.trim() });
    }
    setBusy(false);
    onClose();
  }

  /** Reprend le point de caisse chiffré comme corps de l'annonce. */
  function fillWithCashPoint() {
    // Le message WhatsApp est réutilisé tel quel, sans les astérisques de mise
    // en forme propres à WhatsApp.
    const text = cashPointMessage(dashboard, settings).replace(/\*/g, "");
    setForm((f) => ({
      ...f,
      title: f.title || "Point de caisse — exercice " + settings.exercise_year,
      body: text,
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={post ? "Modifier l'annonce" : "Nouvelle annonce"}
      wide
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Titre">
          <input
            className="field"
            required
            autoFocus
            maxLength={140}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Réunion mensuelle du 5 octobre"
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Catégorie
          </span>
          <div className="flex flex-wrap gap-2">
            {POST_CATEGORY_ORDER.map((c) => {
              const selected = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs transition " +
                    (selected ? "" : "border-line text-muted hover:bg-surface-2")
                  }
                  style={
                    selected
                      ? {
                          borderColor: categoryColor(c),
                          color: categoryColor(c),
                          background:
                            "color-mix(in srgb, " + categoryColor(c) + " 14%, transparent)",
                        }
                      : undefined
                  }
                >
                  {POST_CATEGORIES[c].label}
                </button>
              );
            })}
          </div>
        </div>

        <CoverPicker
          value={form.cover_path}
          onChange={(path) => set("cover_path", path)}
          prefix="annonces"
          label="Image de couverture (facultative)"
        />

        <Field
          label="Message"
          hint="Les retours à la ligne sont conservés tels quels sur la page publique."
        >
          <textarea
            className="field min-h-44 resize-y leading-relaxed"
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            placeholder={"Chers membres,\n\n…"}
          />
        </Field>

        <Button onClick={fillWithCashPoint} className="w-full sm:w-auto">
          <Calculator size={15} /> Pré-remplir avec le point de caisse
        </Button>

        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              checked={form.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            <span>
              Publier sur la page publique
              <span className="mt-0.5 block text-xs text-muted">
                Décochez pour conserver un brouillon visible de vous seul.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              checked={form.pinned}
              onChange={(e) => set("pinned", e.target.checked)}
            />
            <span>
              Épingler en haut de la page
              <span className="mt-0.5 block text-xs text-muted">
                Pour une information qui doit rester visible plusieurs semaines.
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} variant="ghost">
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy
              ? "Enregistrement…"
              : post
                ? "Enregistrer"
                : form.published
                  ? "Publier"
                  : "Enregistrer le brouillon"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const EMPTY: NewPost = {
  title: "",
  body: "",
  category: "info",
  pinned: false,
  published: true,
  cover_path: null,
};
