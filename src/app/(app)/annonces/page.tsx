"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import { useData } from "@/components/DataProvider";
import { PostForm } from "@/components/PostForm";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  SectionTitle,
  Spinner,
} from "@/components/ui";
import { POST_CATEGORIES, categoryColor, excerpt, sortPosts } from "@/lib/posts";
import { copyToClipboard, formatDate } from "@/lib/format";
import type { Post } from "@/lib/types";

/**
 * Espace de rédaction des annonces affichées sur la page publique /infos.
 */
export default function AnnoncesPage() {
  const { posts, settings, updatePost, deletePost, logReport, loading, ready } =
    useData();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Post | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Post | null>(null);
  const [copied, setCopied] = useState<"lien" | "message" | null>(null);
  const [publicUrl, setPublicUrl] = useState("");

  // L'adresse publique dépend du domaine servant l'application.
  useEffect(() => {
    setPublicUrl(window.location.origin + "/infos");
  }, []);

  if (!ready || (loading && posts.length === 0)) return <Spinner />;

  const ordered = sortPosts(posts);
  const published = ordered.filter((p) => p.published);
  const drafts = ordered.filter((p) => !p.published);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(post: Post) {
    setEditing(post);
    setFormOpen(true);
  }

  async function copyLink() {
    if (await copyToClipboard(publicUrl)) {
      setCopied("lien");
      setTimeout(() => setCopied(null), 2200);
    }
  }

  async function copyShareMessage() {
    const message =
      "📣 *" +
      settings.association_name +
      "*\n\nRetrouvez toutes les informations et annonces du comité sur cette page :\n" +
      publicUrl +
      "\n\nAucun compte n'est nécessaire, la page est mise à jour régulièrement.";
    if (await copyToClipboard(message)) {
      setCopied("message");
      setTimeout(() => setCopied(null), 2200);
      await logReport("whatsapp-page-infos", "Lien de la page d'actualités partagé");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Annonces</h1>
          <p className="mt-1 text-sm text-muted">
            Ce que vous publiez ici apparaît sur la page publique, consultable par
            les membres sans connexion.
          </p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus size={16} /> Nouvelle annonce
        </Button>
      </div>

      {/* ---------- Partage de la page publique ---------- */}
      <Card className="p-5">
        <SectionTitle
          title="Page publique"
          subtitle="Partagez cette adresse dans le groupe WhatsApp du comité."
        />
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-muted">
            {publicUrl || "…"}
          </code>
          <Button onClick={() => void copyLink()}>
            <Copy size={15} /> {copied === "lien" ? "Copié !" : "Copier le lien"}
          </Button>
          <Button variant="primary" onClick={() => void copyShareMessage()}>
            <Copy size={15} />
            {copied === "message" ? "Copié !" : "Message WhatsApp"}
          </Button>
          <a
            href="/infos"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm text-ink transition hover:bg-surface-2"
          >
            <ExternalLink size={15} /> Ouvrir
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          Cette page est accessible à toute personne disposant du lien. N&apos;y
          publiez pas d&apos;information que vous ne diffuseriez pas dans le groupe :
          la liste des membres, les paiements et les rapports, eux, restent privés.
        </p>
      </Card>

      {/* ---------- Annonces publiées ---------- */}
      {ordered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone size={32} />}
            title="Aucune annonce pour l'instant"
            description="Publiez une première information : réunion, ouverture d'un mois, point de caisse, rappel de cotisation…"
            action={
              <Button variant="primary" onClick={openNew}>
                <Plus size={16} /> Rédiger la première annonce
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {published.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                onEdit={() => openEdit(post)}
                onDelete={() => setToDelete(post)}
                onTogglePin={() => void updatePost(post.id, { pinned: !post.pinned })}
                onToggleVisible={() =>
                  void updatePost(post.id, { published: !post.published })
                }
              />
            ))}
          </div>

          {drafts.length > 0 && (
            <div className="space-y-3">
              <h2 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">
                Brouillons — non visibles publiquement
              </h2>
              {drafts.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  onEdit={() => openEdit(post)}
                  onDelete={() => setToDelete(post)}
                  onTogglePin={() => void updatePost(post.id, { pinned: !post.pinned })}
                  onToggleVisible={() =>
                    void updatePost(post.id, { published: !post.published })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <PostForm open={formOpen} onClose={() => setFormOpen(false)} post={editing} />

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Supprimer cette annonce ?"
      >
        <p className="text-sm text-muted">
          L&apos;annonce{" "}
          <strong className="text-ink">{toDelete?.title}</strong> sera définitivement
          effacée et disparaîtra de la page publique.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (toDelete) await deletePost(toDelete.id);
              setToDelete(null);
            }}
          >
            <Trash2 size={15} /> Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PostRow({
  post,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleVisible,
}: {
  post: Post;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleVisible: () => void;
}) {
  const color = categoryColor(post.category);
  return (
    <Card
      className={"border-l-4 p-4 sm:p-5 " + (post.published ? "" : "opacity-70")}
      style={{ borderLeftColor: color }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <span
              className="rounded-full px-2.5 py-0.5 font-medium"
              style={{
                color,
                background: "color-mix(in srgb, " + color + " 14%, transparent)",
              }}
            >
              {POST_CATEGORIES[post.category]?.label}
            </span>
            <span className="text-muted">{formatDate(post.published_at)}</span>
            {post.pinned && <Badge tone="accent">Épinglée</Badge>}
            {!post.published && <Badge>Brouillon</Badge>}
          </div>

          <p className="font-medium leading-snug">{post.title}</p>
          {post.body.trim() && (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {excerpt(post.body)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <IconButton
            label={post.pinned ? "Ne plus épingler" : "Épingler"}
            onClick={onTogglePin}
          >
            {post.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </IconButton>
          <IconButton
            label={post.published ? "Repasser en brouillon" : "Publier"}
            onClick={onToggleVisible}
          >
            {post.published ? <EyeOff size={16} /> : <Eye size={16} />}
          </IconButton>
          <IconButton label="Modifier" onClick={onEdit}>
            <Pencil size={16} />
          </IconButton>
          <IconButton label="Supprimer" onClick={onDelete} danger>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "rounded-lg p-2 transition hover:bg-surface-2 " +
        (danger ? "text-muted hover:text-danger" : "text-muted hover:text-ink")
      }
    >
      {children}
    </button>
  );
}
