/**
 * Vite plugin that wires the call-security source transform into
 * Vitest's module pipeline.
 *
 * Usage in `vitest.config.ts`:
 *
 *     import { callSecPlugin } from './src/services/loader/vite-plugin.js';
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
 * wouldn't recognise as a class export. Running pre lets the walker
 * see the untransformed `export class Foo {}` shape directly.
 *
 * Plain JS to match the loader-hook + transform siblings (see their
 * file headers for the "why JS" rationale).
 */

import { transformSource, shouldTransform } from './transform.js';

/**
 * @returns {{name: string, enforce: 'pre', transform(code: string, id: string): string | null | undefined}}
 */
export function callSecPlugin() {
  return {
    name: 'callsec-stamp',
    enforce: 'pre',
    /**
     * @param {string} code
     * @param {string} id
     */
    transform(code, id) {
      if (!shouldTransform(id)) return null;
      const result = transformSource(code, id);
      if (result === code) return null;
      return result;
    },
  };
}
