/**
 * Node `module.register` loader hook for the production tsx path.
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
 *     register('./mud/lib/security/loader-hook.js', import.meta.url);
 *     // ...all subsequent game-code imports happen here.
 *
 * The hook intercepts every `.ts` / `.js` file under `mud/`,
 * appending the same `__callSecModuleApi.stamp(...)` snippet the
 * Vite plugin appends in tests. Files outside the mud tree pass
 * through unchanged.
 *
 * If the spike outcome reveals tsx incompatibility (rare but
 * possible), the fallback is the same: this file becomes a no-op,
 * Vitest stamps via the plugin, and tsx switches to a build-time
 * codegen step. Document the divergence here when it lands.
 */

import { transformSource, shouldTransform } from './transform.js';

/** Node loader-hook context types — minimal shape, not from `node`. */
interface LoadHookContext {
  format?: string;
  importAttributes?: Record<string, string>;
  conditions?: string[];
}

interface LoadHookResult {
  source?: string | ArrayBuffer | Uint8Array | undefined;
  format: string;
  shortCircuit?: boolean;
}

type NextLoad = (
  url: string,
  context: LoadHookContext
) => Promise<LoadHookResult>;

/**
 * Node calls this after our hook is registered. Chain through to the
 * upstream loader (e.g. tsx) so TS gets compiled, then post-process
 * the resulting source with our transform.
 */
export async function load(
  url: string,
  context: LoadHookContext,
  nextLoad: NextLoad
): Promise<LoadHookResult> {
  const upstream = await nextLoad(url, context);
  if (!shouldTransform(url)) return upstream;

  // Source might be undefined (Node sometimes defers source loading).
  const raw = upstream.source;
  if (raw === undefined || raw === null) return upstream;

  const sourceStr =
    typeof raw === 'string'
      ? raw
      : new TextDecoder('utf-8').decode(raw as ArrayBuffer | Uint8Array);

  const transformed = transformSource(sourceStr, url);
  if (transformed === sourceStr) return upstream;

  return {
    ...upstream,
    source: transformed,
  };
}
