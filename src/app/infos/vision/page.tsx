import Link from "next/link";
import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { getPublicSettings } from "@/lib/public-data";
import { coverUrl } from "@/lib/media";

/**
 * Onglet « Notre vision » : le texte rédigé par le bureau depuis
 * Paramètres → Notre vision. Les sauts de ligne sont conservés tels quels,
 * ce qui permet d'écrire des paragraphes et des listes à la main.
 */

export const metadata: Metadata = {
  title: "Notre vision",
};

export default async function VisionPage() {
  const settings = await getPublicSettings();
  const vision = settings?.vision?.trim() ?? "";

  return (
    <main className="py-8">
      {!vision ? (
        <div className="card px-6 py-14 text-center">
          <Compass size={30} className="mx-auto text-muted" />
          <p className="mt-3 font-medium">Vision à venir</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Le bureau n&apos;a pas encore publié la vision du comité.
          </p>
          <Link
            href="/infos"
            className="mt-5 inline-block text-sm text-accent hover:underline"
          >
            Voir les actualités
          </Link>
        </div>
      ) : (
        <article className="card overflow-hidden">
          {coverUrl(settings?.vision_cover) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl(settings?.vision_cover)!}
              alt=""
              className="block max-h-72 w-full object-cover"
              style={{ aspectRatio: "16 / 9" }}
            />
          )}

          <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5 text-accent">
            <Compass size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Notre vision
            </h2>
          </div>

          {settings?.motto && (
            <p className="mt-4 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              « {settings.motto} »
            </p>
          )}

          <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-muted sm:text-base">
            {vision}
          </div>
          </div>
        </article>
      )}
    </main>
  );
}
