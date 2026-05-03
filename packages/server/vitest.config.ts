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
  },
});
