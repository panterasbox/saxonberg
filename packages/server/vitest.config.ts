import { defineConfig } from "vitest/config";
import { callSecPlugin } from "./src/mud/lib/security/vite-plugin-callsec";

export default defineConfig({
  // Plugin runs `enforce: 'post'` so it sees source after Vite's TS
  // transform. Appends a ModuleRegistry.stamp(...) call to every
  // `mud/**` module, giving every exported class a tamper-resistant
  // module-id used by `FromModule(...)` and `ApiOnly` policies.
  plugins: [callSecPlugin()],
  test: {
    globals: true,
    environment: "node",
  },
});
