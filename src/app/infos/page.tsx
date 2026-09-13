import type { Metadata } from "next";
import { POST_CATEGORIES, categoryColor, sortPosts } from "@/lib/posts";
import { getPublishedPosts } from "@/lib/public-data";
import { formatDate } from "@/lib/format";

/** Onglet « Actualités » : les annonces publiées par le bureau. */

export const metadata: Metadata = {
  title: "Actualités",
};

export default async function ActualitesPage() {
  const posts = sortPosts(await getPublishedPosts());

  return (
    <main className="py-8">
      {posts.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="font-medium">Aucune actualité pour le moment</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Les informations et annonces du bureau apparaîtront sur cette page.
            Pensez à l&apos;ajouter à vos favoris.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <article
                className="card overflow-hidden border-l-4 p-5 sm:p-6"
                style={{ borderLeftColor: categoryColor(post.category) }}
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span
                    className="rounded-full px-2.5 py-0.5 font-medium"
                    style={{
                      color: categoryColor(post.category),
                      background:
                        "color-mix(in srgb, " +
                        categoryColor(post.category) +
                        " 14%, transparent)",
                    }}
                  >
                    {POST_CATEGORIES[post.category]?.label ?? "Information"}
                  </span>
                  <time className="text-muted" dateTime={post.published_at}>
                    {formatDate(post.published_at)}
                  </time>
                  {post.pinned && <span className="text-muted">· Épinglée</span>}
                </div>

                <h2 className="text-lg font-semibold leading-snug sm:text-xl">
                  {post.title}
                </h2>

                {post.body.trim() && (
                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {post.body}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
