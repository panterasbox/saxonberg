import { defineConfig } from "vitest/config";
import { callSecPlugin } from "@saxonberg/server/services/loader/vite-plugin";

export default defineConfig({
  plugins: [callSecPlugin()],
  test: { globals: true, environment: "node" },
});
