/**
 * Node `module.register` loader hook for the tsx dev + production paths.
 *
 * Runs in a worker thread under Node's customisation hooks API. tsx
 * also installs a loader (for TS → JS compilation); ours chains via
 * `nextLoad`. Order: our hook runs LAST in the chain so we see the
 * already-compiled JS source. We append the call-security stamp at
 * the bottom and return the modified source.
 *
 * Bootstrap sequence in `index.ts`:
 *
 *     import { register } from 'node:module';
 *     register('./services/loader/loader-hook.js', import.meta.url);
 *     // ...all subsequent game-code imports happen here.
 *
 * Plain JS by necessity: `module.register()` only accepts a JS module
 * URL — the registration URL is loaded BEFORE the loader chain it's
 * extending is fully active, so tsx can't transpile a TS hook for us.
 *
 * The hook intercepts every `.ts` / `.js` file under `mud/`,
 * appending the same `__callSecModuleApi.stamp(...)` snippet the
 * Vite plugin appends in tests. Files outside the mud tree pass
 * through unchanged.
 */

import { transformSource, shouldTransform } from './transform.js';

/**
 * Node calls this after our hook is registered. Chain through to the
 * upstream loader (e.g. tsx) so TS gets compiled, then post-process
 * the resulting source with our transform.
 *
 * @param {string} url
 * @param {object} context
 * @param {(url: string, context: object) => Promise<{source?: string | ArrayBuffer | Uint8Array, format: string, shortCircuit?: boolean}>} nextLoad
 * @returns {Promise<{source?: string | ArrayBuffer | Uint8Array, format: string, shortCircuit?: boolean}>}
 */
export async function load(url, context, nextLoad) {
  const upstream = await nextLoad(url, context);
  if (!shouldTransform(url)) return upstream;

  // Source might be undefined (Node sometimes defers source loading).
  const raw = upstream.source;
  if (raw === undefined || raw === null) return upstream;

  const sourceStr =
    typeof raw === 'string'
      ? raw
      : new TextDecoder('utf-8').decode(raw);

  const transformed = transformSource(sourceStr, url);
  if (transformed === sourceStr) return upstream;

  return {
    ...upstream,
    source: transformed,
  };
}
