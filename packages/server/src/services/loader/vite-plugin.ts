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
 * The plugin runs `enforce: 'pre'` so it sees raw TypeScript source
 * BEFORE Vite's TypeScript transform has its way with it. That matters
 * for class decorators: TS legacy decorator emission rewrites
 * `@CallSecurity export class Foo {}` into `let Foo = class Foo {};
 * Foo = __decorate(...); export { Foo };`, which the AST walker
 * wouldn't recognise as a class export (it'd see a variable decl
 * holding a class expression). Running pre lets the walker see the
 * untransformed `export class Foo {}` shape directly.
 *
 * The appended snippet uses `import.meta.url` and a regular import
 * statement; both pass through the downstream TS transform unchanged.
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
    enforce: 'pre',
    transform(code: string, id: string): string | null | undefined {
      if (!shouldTransform(id)) return null;
      const result = transformSource(code, id);
      if (result === code) return null;
      return result;
    },
  };
}
