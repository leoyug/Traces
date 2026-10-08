import { defineConfig } from "astro/config";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import { preparePhotos } from "./scripts/photos/prepare.mjs";
import { localContentImport } from "./scripts/import/vite-plugin.mjs";

const require = createRequire(import.meta.url);

const prepareUploadedPhotos = () => ({
  name: "prepare-uploaded-photos",
  configureServer(server) {
    let timer;
    const schedule = (file) => {
      if (!file.includes("/public/media/photos/") && !file.includes("/src/content/photos/")) return;
      clearTimeout(timer);
      timer = setTimeout(() => { preparePhotos().catch((error) => server.config.logger.error(String(error))); }, 800);
    };
    server.watcher.on("add", schedule);
    server.watcher.on("change", schedule);
  },
});

export default defineConfig({
  output: "static",
  site: "https://incessantleo.com",
  integrations: process.env.NODE_ENV === "production" ? [] : [react(), keystatic(), localContentImport()],
  vite: {
    plugins: [prepareUploadedPhotos()],
    // Keep the local table adapter live during development while prebundling
    // the underlying CMS table library.
    optimizeDeps: { exclude: ["@keystar/ui/table"], include: ["@local/keystar-table"] },
    resolve: {
      alias: [
        { find: /^@keystar\/ui\/table$/, replacement: fileURLToPath(new URL("./src/admin/keystatic-table.js", import.meta.url)) },
        { find: /^@local\/keystar-table$/, replacement: require.resolve("@keystar/ui/table") },
      ],
    },
  },
});
