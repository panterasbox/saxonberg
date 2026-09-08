/**
 * What is actually installed in the world the suite is talking to.
 *
 * A file declares the packs its flow needs (`declareFile({ packs })`)
 * and the harness checks them before the first session opens, so a
 * flow that would have exercised NOTHING because its trade is absent
 * fails immediately and says which pack is missing — rather than
 * failing twenty commands later on "I don't understand 'ret'".
 *
 * ⚠⚠ **There is no pack-roster read an ordinary player can make**, and
 * this build does not add one. `pack status` is restricted to the
 * executive (`requiresPackInstaller`), and no HTTP route lists packs.
 * Inventing an endpoint would be the engine change the requirements
 * rule out ("nothing about the engine changes"), so the check reads the
 * best evidence available and SAYS WHICH:
 *
 *   1. `WIRE_PACKS` — an explicit list. The operator's own assertion,
 *      and what owned boot sets from the `SAXONBERG_PACKS` it used.
 *   2. `WIRE_SERVER_LOG` — the booted server's log, parsed for the
 *      installer's own `PackApi: '<id>' installed` lines. **This is a
 *      true read of the world**, and owned boot always has one.
 *   3. The workspace roster — every `@saxonberg/content-*` dependency
 *      in the root `package.json`, which is what a default boot
 *      installs. INFERRED, and any failure message says so.
 *
 * Tier 3 can be wrong in exactly one direction: it can believe a pack
 * is present when the attached server booted with a narrowed
 * `SAXONBERG_PACKS`. That misses a check; it never invents a failure.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { allFiles, currentFile } from './registry';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..', '..');

type Source = 'declared' | 'boot log' | 'workspace (inferred)';

let cached: { packs: Set<string>; source: Source } | null = null;

function fromWorkspace(): Set<string> {
  const raw = readFileSync(join(REPO_ROOT, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw) as { dependencies?: Record<string, string> };
  const ids = Object.keys(pkg.dependencies ?? {})
    .filter((n) => n.startsWith('@saxonberg/content-'))
    .map((n) => n.slice('@saxonberg/content-'.length));
  return new Set(ids);
}

function fromBootLog(path: string): Set<string> | null {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const ids = [...text.matchAll(/PackApi: '([^']+)' installed/g)].map(
    (m) => m[1]!
  );
  return ids.length > 0 ? new Set(ids) : null;
}

/** The installed pack set, and where the answer came from. */
export function installedPacks(): { packs: Set<string>; source: Source } {
  if (cached) return cached;
  const declared = process.env.WIRE_PACKS;
  if (declared && declared.trim()) {
    cached = {
      packs: new Set(declared.split(',').map((s) => s.trim()).filter(Boolean)),
      source: 'declared',
    };
    return cached;
  }
  const logPath = process.env.WIRE_SERVER_LOG;
  if (logPath) {
    const fromLog = fromBootLog(resolve(REPO_ROOT, logPath));
    if (fromLog) {
      cached = { packs: fromLog, source: 'boot log' };
      return cached;
    }
  }
  cached = { packs: fromWorkspace(), source: 'workspace (inferred)' };
  return cached;
}

/**
 * Fail the running file if a pack it declared is absent. Called by
 * `Session.open`, so no file can skip it by forgetting.
 */
export async function assertPacksPresent(): Promise<void> {
  const rec = currentFile();
  if (!rec || rec.packs.length === 0) return;
  const { packs, source } = installedPacks();
  const missing = rec.packs.filter((p) => !packs.has(p));
  if (missing.length === 0) return;
  throw new Error(
    `wire: ${rec.file} needs pack(s) [${missing.join(', ')}] and the ` +
      `world does not have them (read from: ${source}). ` +
      (source === 'workspace (inferred)'
        ? `⚠ That reading is inferred from the workspace, not read off ` +
          `the world — set WIRE_PACKS to assert the truth. `
        : '') +
      `Boot with those packs, or fix the file's packs: declaration.`
  );
}

/** Every pack any declared file asked for — used by the run report. */
export function declaredPacks(): string[] {
  const all = new Set<string>();
  for (const f of allFiles()) for (const p of f.packs) all.add(p);
  return [...all].sort();
}
