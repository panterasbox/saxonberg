/**
 * Vite plugin that wires the call-security source transform into
 * Vitest's module pipeline.
 *
 * Usage in `vitest.config.ts`:
 *
 *     import { callSecPlugin } from './src/services/loader/vite-plugin';
 *     export default defineConfig({
 *       plugins: [callSecPlugin()],
 *       test: { ... }
 *     });
 *
 * The plugin runs `enforce: 'post'` so TypeScript transpilation has
 * already happened by the time we see the source — but the appended
 * snippet still uses `import.meta.url` and the import statement,
 * which Vite handles natively for ESM modules.
 *
 * The plugin's `transform` hook is the only entry point. Call-shape
 * matches Vite's plugin interface; no Vite-specific types imported,
 * so this file builds cleanly without the `vite` dev dependency.
 */

import { transformSource, shouldTransform } from './transform';

/**
 * Minimal shape for the Vite plugin contract — typed as `unknown`
 * fields where Vite expects them. Vite is structurally typed so it
 * won't complain about the missing field types.
 */
interface ViteLikePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  transform(code: string, id: string): string | null | undefined;
}

export function callSecPlugin(): ViteLikePlugin {
  return {
    name: 'callsec-stamp',
    enforce: 'post',
    transform(code: string, id: string): string | null | undefined {
      if (!shouldTransform(id)) return null;
      const result = transformSource(code, id);
      if (result === code) return null;
      return result;
    },
  };
}
