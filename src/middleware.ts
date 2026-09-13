import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware d'authentification.
 *
 * Il rafraîchit la session Supabase à chaque requête et renvoie vers /login
 * tout visiteur non authentifié. Seul le trésorier (et les éventuels comptes
 * du bureau créés dans Supabase) peut donc atteindre l'application.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sans configuration Supabase, on laisse passer : la page affichera le
  // message d'installation plutôt qu'une boucle de redirection.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");
  // Pages publiques : les actualités destinées aux membres, et la vérification
  // d'une carte de membre (cible du QR code imprimé sur les cartes).
  const isPublic =
    pathname === "/infos" ||
    pathname.startsWith("/infos/") ||
    pathname.startsWith("/carte/");

  if (!user && !isLogin && !isPublic) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("suivant", pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && isLogin) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques et les images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
