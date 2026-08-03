import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Le dossier parent (`Purity ONE/`) a son propre package-lock.json à côté
  // de celui-ci — Turbopack devinait la mauvaise racine de workspace et ça
  // cassait la résolution de certaines routes en dev (ex: /login rendait un
  // 404 alors que le build de production le générait très bien).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
