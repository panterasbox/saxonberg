import { defineConfig } from "vitest/config";
import { callSecPlugin } from "./src/services/loader/vite-plugin";

export default defineConfig({
  // Plugin runs `enforce: 'post'` so it sees source after Vite's TS
  // transform. Appends a `ModuleApi.stamp(...)` call to every `mud/**`
  // module, giving every exported class a tamper-resistant module-id
  // used by `FromModule(...)` and `ApiOnly` policies.
  plugins: [callSecPlugin()],
  test: {
    globals: true,
    environment: "node",
    // Pre-load the four singleton-Stuff registries so their module-load
    // side effects register their classes with the corresponding Api
    // facades. Production gets these via BootstrapManager; tests
    // would otherwise hit "Registry class not registered" on first
    // touch. See `test-setup-registries.ts` for the rationale.
    setupFiles: ["./src/test-setup-registries.ts"],
  },
});
