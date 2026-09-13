import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * @react-pdf/renderer est distribué uniquement en ESM : sans cette ligne,
   * `npm run dev` échoue avec « ESM packages need to be imported ».
   * Next le transpile alors comme le reste du code de l'application.
   */
  transpilePackages: ["@react-pdf/renderer"],

  /**
   * La page publique vivait sous /infos avant de devenir la racine du site.
   * Les liens déjà partagés dans le groupe continuent de fonctionner.
   */
  async redirects() {
    return [
      { source: "/infos", destination: "/", permanent: true },
      { source: "/infos/vision", destination: "/vision", permanent: true },
    ];
  },
};

export default nextConfig;
