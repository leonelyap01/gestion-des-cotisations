"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Field } from "@/components/ui";
import { HOME_AFTER_LOGIN, PUBLIC_HOME } from "@/lib/routes";

/**
 * Connexion du trésorier (Supabase Auth, email + mot de passe).
 *
 * Il n'y a volontairement pas de formulaire d'inscription : les comptes du
 * bureau sont créés à la main depuis le tableau de bord Supabase, et
 * l'inscription publique doit être désactivée (voir README).
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Adresse e-mail ou mot de passe incorrect."
          : err.message,
      );
      setBusy(false);
      return;
    }

    const next = params.get("suivant") || HOME_AFTER_LOGIN;
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Wallet size={22} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Gestion des cotisations
          </h1>
          <p className="mt-1 text-sm text-muted">Espace trésorier</p>
        </div>

        {!configured ? (
          <div className="card p-5 text-sm text-muted">
            Les clés Supabase ne sont pas encore renseignées dans{" "}
            <code className="text-ink">.env.local</code>. Consultez le README.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card space-y-4 p-5">
            <Field label="Adresse e-mail">
              <input
                type="email"
                required
                autoComplete="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tresorier@exemple.com"
              />
            </Field>

            <Field label="Mot de passe">
              <input
                type="password"
                required
                autoComplete="current-password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-muted">
          Accès réservé au bureau du comité.
        </p>

        <p className="mt-3 text-center text-sm">
          <Link href={PUBLIC_HOME} className="text-muted hover:text-accent">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
