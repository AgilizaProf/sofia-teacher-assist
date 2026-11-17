import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import { defineConfig as defineViteConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

/**
 * Dois jeitos de montar o app:
 *  - Na Vercel (a Vercel define VERCEL=1 no build) ou com DEPLOY_TARGET=vercel:
 *    build próprio, sem nada do Lovable, servido pelo Nitro.
 *  - Em qualquer outro lugar (o Lovable): a configuração do Lovable, igual a antes.
 * Assim o app continua publicando no Lovable até a virada.
 */
const isVercel = !!process.env.VERCEL || process.env.DEPLOY_TARGET === "vercel";

const vercelConfig = defineViteConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    nitro({ preset: "vercel" }),
    viteReact(),
  ],
  resolve: {
    alias: { "@": "/src" },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: { host: "::", port: 8080 },
});

const lovableConfig = defineLovableConfig({
  plugins: [tailwindcss(), tsconfigPaths()],
  vite: {
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    build: {
      outDir: "dist",
    },
  },
});

export default isVercel ? vercelConfig : lovableConfig;
