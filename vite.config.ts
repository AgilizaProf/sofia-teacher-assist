import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
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
