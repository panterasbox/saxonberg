/**
 * ⚠⚠ **Every key a shipped zone row authors must be declared in some
 * zone class's `fieldMeta` — because the failure is SILENT.**
 *
 * `fieldMeta` is what the Hydrator reflects through. An undeclared key
 * in a `data:` block is not an error and not a warning: it is discarded,
 * and the zone comes up as though the author had written nothing. This
 * has now cost two separate things:
 *
 *  - `deposit:` was authored on Rejection's region zone, a plain
 *    `CartesianZone`, and vanished. `Working.getDeposit()` answered
 *    `null`, `facesOf()` returned nothing, and `hew west` said *"you
 *    can't cut 'west' here"* in a room whose own prose says there is
 *    green in the face. Found by DRIVING — no unit test could have
 *    caught it, because every fixture set the field on the object.
 *  - `address:` was the documented step 2 of `AddressLogic`'s resolve
 *    (*"spatial-zone fallthrough"*), and **no zone class had ever
 *    declared it**, so the `source: 'zone'` branch of a shipped enum was
 *    unreachable and every zone-scoped address silently resolved to
 *    nothing.
 *
 * A test that only checked the two fields we just added would pass
 * forever while the next one rotted the same way, so this reads the
 * SHIPPED ROWS and checks every key they use.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Zone } from '../Zone';
import { SpatialZone } from '../SpatialZone';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import type { AnyConstructor } from '../../../api/mixin';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', '..', '..', '..', '..', 'content');

/**
 * The fields a given zone class can actually carry — ⭐ **derived from
 * the row's OWN class, never from a list here.**
 *
 * An earlier cut enumerated four zone classes and immediately reported
 * two false offenders, because `WikiNamespaceZone` declares `protection`
 * and was not in the list. That is the same mistake in miniature that
 * this test exists to catch, so it does not get to make it: resolve the
 * class the row names and ask `MixinApi.getAllFieldMeta`, which walks the
 * chain exactly as the Hydrator does.
 */
async function fieldsOf(classPath: string): Promise<Set<string> | null> {
  try {
    const ctor = (await StuffApi.loadClassByPath(classPath)) as AnyConstructor;
    return new Set(Object.keys(MixinApi.getAllFieldMeta(ctor)));
  } catch {
    return null; // Unresolvable class — `lint:instanceable`'s problem.
  }
}

/** Every shipped `.yaml` under every pack's `content/`. */
function shippedRows(): Array<{ file: string; doc: Record<string, unknown> }> {
  const out: Array<{ file: string; doc: Record<string, unknown> }> = [];
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules') continue;
        walk(full, `${rel}/${entry}`);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      try {
        const doc = YAML.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
        if (doc && typeof doc === 'object') out.push({ file: `${rel}/${entry}`, doc });
      } catch {
        // A row that does not parse is another gate's problem.
      }
    }
  };
  for (const pack of readdirSync(CONTENT)) {
    const content = join(CONTENT, pack, 'content');
    try {
      if (statSync(content).isDirectory()) walk(content, pack);
    } catch {
      // No content dir — a capability pack that ships only `src/`.
    }
  }
  return out;
}

describe('a zone row cannot author a field the hydrator will discard', () => {
  it('⭐ every key on every shipped ZONE row is declared in fieldMeta', async () => {
    const offenders: string[] = [];
    let checked = 0;

    for (const { file, doc } of shippedRows()) {
      const cls = typeof doc.class === 'string' ? doc.class : '';
      if (!/Zone$/.test(cls)) continue;
      const data = doc.data as Record<string, unknown> | undefined;
      if (!data) continue;
      const declared = await fieldsOf(cls);
      if (declared === null) continue;
      checked += 1;
      for (const key of Object.keys(data)) {
        if (!declared.has(key)) offenders.push(`${file}: ${key}`);
      }
    }

    // ⚠ A scan that matched nothing would pass identically (testing.md
    // check 1). Rejection alone ships four zone rows.
    expect(checked).toBeGreaterThanOrEqual(4);
    expect(offenders, `undeclared zone keys:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('⚠ the two that were silently discarded are declared now', async () => {
    const declared = (await fieldsOf('/platform/idea/location/CartesianZone'))!;
    // `deposit` — vanished off a plain CartesianZone; cost a live drive.
    expect(declared.has('deposit')).toBe(true);
    // `address` — AddressLogic's documented step 2, unreachable until now.
    expect(declared.has('address')).toBe(true);
  });

  it('⭐ and the resolver step they feed reads them off a SpatialZone', () => {
    const meta = (SpatialZone as unknown as { fieldMeta: Record<string, unknown> })
      .fieldMeta;
    // On SpatialZone rather than Zone, for the reason stocks/favours are:
    // a FolderZone is a namespace root, and "the street address of /wiki"
    // is not a question.
    expect(meta.address).toBeDefined();
    expect(meta.deposit).toBeDefined();
    const base = (Zone as unknown as { fieldMeta: Record<string, unknown> }).fieldMeta;
    expect(base.address).toBeUndefined();
    expect(base.deposit).toBeUndefined();
  });
});
