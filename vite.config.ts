// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Lovable's own build pipeline uses the default cloudflare-module preset.
  // Set NITRO_PRESET=node-server (see `bun run build:node`) to build a plain
  // Node.js server bundle instead, for self-hosting (e.g. the VPS deploy).
  ...(process.env.NITRO_PRESET ? { nitro: { preset: process.env.NITRO_PRESET } } : {}),
});
