import { defineConfig } from "vitest/config";
import { callSecPlugin } from "@saxonberg/server/services/loader/vite-plugin";

/**
 * The pack's own suite — its tests travel with its code
 * (`src/**\/__tests__/`) and run under the same call-security stamp
 * plugin as the kernel's, so a pack class is stamped here exactly as it
 * is in the server (content-packs, the capability rung). `pnpm -r test`
 * picks this up; `pnpm test:near` routes a changed pack file here.
 *
 * The settings mirror the server's `sharedTest` (globals on, node env)
 * by value: vite loads a config by bundling it, and a bare import of
 * the server's `vitest.config.ts` would be left external for Node to
 * load as TypeScript, which it cannot.
 */
export default defineConfig({
  plugins: [callSecPlugin()],
  test: {
    globals: true,
    environment: "node",
  },
});
