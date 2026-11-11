/**
 * The shipped condition roster, stood in for a suite (load-on-use W6).
 *
 * A running world loads every condition row with its first body
 * (`VitalsMixin.onCreate` → `ConditionApi.conditions().ensureRoster()`), and
 * every sync condition read throws when its row is cold. A suite has no
 * store, so one that lets a body starve, drown or take a chill stands the
 * PLATFORM's shipped rows in from disk — the same rows, hydrated by the
 * kernel's own applier — rather than the read quietly answering nothing, as
 * it did before the roster stopped booting.
 *
 * A path a suite has already made (a fabricated toxin) is left alone.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Condition from '../../../platform/idea/Condition';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

const ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'idea', 'Condition',
);
const CONDITION_CLASS = '/platform/idea/Condition';

let shipped: Array<{ path: string; data: Record<string, unknown> }> | null = null;

/** Every shipped platform condition row, read once per suite file. */
function rows(): Array<{ path: string; data: Record<string, unknown> }> {
  if (shipped) return shipped;
  const out: Array<{ path: string; data: Record<string, unknown> }> = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}${entry}/`);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      const doc = YAML.parse(readFileSync(full, 'utf8')) as { class?: string; data?: Record<string, unknown> };
      if (doc?.class !== CONDITION_CLASS) continue;
      out.push({ path: `/platform/idea/Condition/${prefix}${entry.slice(0, -'.yaml'.length)}`, data: doc.data ?? {} });
    }
  };
  walk(ROOT, '');
  shipped = out;
  return out;
}

/** Stand every shipped platform condition in, unless a suite already made one at its path. */
export async function standShippedConditions(): Promise<void> {
  const applier = makeStuff(() => new TemplateApplier());
  for (const { path, data } of rows()) {
    if (StuffApi.findByTemplatePath(path)) continue;
    const c = makeStuffAtPath(() => new Condition(), path);
    await applier.apply(c, data, { mode: 'mint' });
  }
}

/**
 * Stand a BLANK condition at each path — a row that is there and authors
 * nothing (no progression, no signs, no behavior). For a suite that proves a
 * cascade lands its afflictions, not what the shipped rows then do with
 * them: what such a suite read before the roster stopped booting.
 */
export function standBlankConditions(...paths: string[]): void {
  for (const path of paths) {
    if (StuffApi.findByTemplatePath(path)) continue;
    makeStuffAtPath(() => new Condition(), path);
  }
}

/** Every shipped platform condition path under `prefix` (`metabolism/`). */
export function shippedConditionPaths(prefix = ''): string[] {
  return rows()
    .map((r) => r.path)
    .filter((p) => p.startsWith(`/platform/idea/Condition/${prefix}`));
}
