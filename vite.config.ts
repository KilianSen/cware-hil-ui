import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Base "./" so the built assets load no matter what path the static bundle is
// served from (root, a sub-path, or straight off the filesystem).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
