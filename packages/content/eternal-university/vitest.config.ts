import { defineConfig } from "vitest/config";
import { callSecPlugin } from "@saxonberg/server/services/loader/vite-plugin";

/**
 * The pack's own suite — its tests travel with its code
 * (`src/**\/__tests__/`) and run under the same call-security stamp
 * plugin as the kernel's (content-packs, the capability rung).
 */
export default defineConfig({
  plugins: [callSecPlugin()],
  test: {
    globals: true,
    environment: "node",
  },
});
