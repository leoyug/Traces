import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import { preparePhotos } from "./scripts/photos/prepare.mjs";
import { localContentImport } from "./scripts/import/vite-plugin.mjs";

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
  vite: { plugins: [prepareUploadedPhotos()] },
});
