import { defineConfig } from "vitest/config";
import { callSecPlugin } from "@saxonberg/server/services/loader/vite-plugin";

/**
 * The pack's own suite — its tests travel with its code
 * (`src/**\/__tests__/`) and run under the same call-security stamp
 * plugin as the kernel's, so a pack class is stamped here exactly as it
 * is in the server (content-packs, the capability rung).
 */
export default defineConfig({
  plugins: [callSecPlugin()],
  test: {
    globals: true,
    environment: "node",
  },
});
