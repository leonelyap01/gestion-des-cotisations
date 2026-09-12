import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * @react-pdf/renderer est distribué uniquement en ESM : sans cette ligne,
   * `npm run dev` échoue avec « ESM packages need to be imported ».
   * Next le transpile alors comme le reste du code de l'application.
   */
  transpilePackages: ["@react-pdf/renderer"],
};

export default nextConfig;
