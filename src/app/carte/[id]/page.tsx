import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * Vérification d'une carte de membre — cible du QR code imprimé sur la carte.
 *
 * Page publique : n'importe qui peut scanner une carte pour s'assurer qu'elle
 * est authentique. Elle n'affiche que ce qui figure déjà sur la carte, via la
 * fonction SQL verifier_carte : nom, numéro, fonction et statut. Les
 * cotisations, arriérés et coordonnées des membres restent inaccessibles.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vérification d'une carte de membre",
  robots: { index: false, follow: false },
};

interface CarteInfo {
  nom: string;
  numero: string;
  fonction: string;
  membre_actif: boolean;
  membre_depuis: number;
  association: string;
  devise: string;
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("verifier_carte", { carte_id: id });
  const carte = (Array.isArray(data) ? data[0] : null) as CarteInfo | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo-ucjea.jpg"
            alt=""
            width={96}
            height={76}
            className="h-auto w-24 rounded-lg"
            priority
          />
          {carte?.association && (
            <p className="mt-3 text-sm font-semibold">{carte.association}</p>
          )}
        </div>

        {!carte ? (
          <div className="card p-6 text-center">
            <ShieldAlert size={30} className="mx-auto text-due" />
            <h1 className="mt-3 font-semibold">Carte non reconnue</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ce code ne correspond à aucune carte de membre en cours de validité.
              Si la carte vous a été présentée comme authentique, signalez-le au
              bureau du comité.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div
              className={
                "flex items-center gap-2 px-5 py-3 text-sm font-medium " +
                (carte.membre_actif
                  ? "bg-paid-soft text-paid"
                  : "bg-due-soft text-due")
              }
            >
              {carte.membre_actif ? (
                <>
                  <BadgeCheck size={17} /> Carte valide — membre actif
                </>
              ) : (
                <>
                  <ShieldAlert size={17} /> Ce membre ne fait plus partie du comité
                </>
              )}
            </div>

            <div className="px-5 py-5">
              <h1 className="text-xl font-semibold tracking-tight">{carte.nom}</h1>
              <p className="mt-1 text-sm text-accent">{carte.fonction}</p>

              <dl className="mt-5 space-y-2.5 text-sm">
                <Row label="Numéro de carte" value={carte.numero} />
                <Row label="Membre depuis" value={String(carte.membre_depuis)} />
                <Row
                  label="Statut"
                  value={carte.membre_actif ? "Membre actif" : "Retiré du comité"}
                />
              </dl>

              {carte.devise && (
                <p className="mt-5 border-t border-line pt-4 text-center text-sm italic text-muted">
                  « {carte.devise} »
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          Page de vérification officielle. Aucune information financière n&apos;y est
          publiée.
          <br />
          <Link href="/infos" className="mt-1 inline-block hover:text-accent">
            Actualités du comité
          </Link>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
