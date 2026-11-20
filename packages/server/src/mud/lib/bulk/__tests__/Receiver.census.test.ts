/**
 * ⭐ Census (2) of the matter-model-overlaps build: every site that picks
 * where a DRIP or a VAPOR goes (plan § Grounding #3 and #5, D10, D16).
 *
 * Each of these answers *where does what leaves this thing go?* with its
 * own little chain. After the build there is one answer for each: the drip
 * (`Containable.dripSlots` + `BulkableApi.drip` — in, then on, then the
 * floor) and the vent (`BiomeApi.vent` — the chamber, then the room's air).
 *
 * Drip half (W2 lowers `DRIP_RECEIVER_CEILING` to zero)
 * - `Bulkable.seepReceiver` (definition + the weep's callers)
 * - `Percolating.percolatesInto` (declaration, definition) and its
 *   overrides/callers: trade-fuel `Ash.percolatesInto`, `Ash.onPercolated`,
 *   trade-sugar `SugarLoaf.onPercolated`
 * - `Mould.drainsInto` (declaration, definition, `creditDrainings`) and
 *   its readers in `Percolating` and `Thermal.crystallizeIfOver`
 * - `Thermal.drainLiquorInto`
 *
 * Vapor half (W6 lowers `VAPOR_RECEIVER_CEILING` to zero)
 * - `Thermal.routeVolatile` (definition + caller)
 * - the open-pour arm in `BulkableLogic.transfer` that adds a volatile's
 *   vapor straight to the room (`room.addAtmosphereContent(`)
 * - trade-fuel `Retort.receiveVolatiles`' structural
 *   `typeof receiver.receive` test
 * - `Compounding` (a volatile compound stirred in the open) and
 *   `CleanserUse` (a solvent wash) — each adds its vapor to the room's
 *   air by hand (found at W0)
 *
 * ⭐ Census-then-ratchet (docs/lint-family.md): each ceiling is today's
 * count; it may fall and never rise.
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** ⭐ W2 lowers this to 0; never raise it. */
const DRIP_RECEIVER_CEILING = 16;
/** ⭐ W6 lowers this to 0; never raise it. */
const VAPOR_RECEIVER_CEILING = 6;

const HERE = dirname(fileURLToPath(import.meta.url));
const MUD = join(HERE, '..', '..', '..');
const PACKS = join(MUD, '..', '..', '..', 'content');

interface Signature {
  readonly file: string;
  readonly pattern: RegExp;
}

const DRIP: readonly Signature[] = [
  { file: join(MUD, 'lib/bulk/Bulkable.ts'), pattern: /\bseepReceiver\s*\(/g },
  { file: join(MUD, 'lib/material/Percolating.ts'), pattern: /\b(percolatesInto|drainsInto)\s*\(/g },
  { file: join(MUD, 'lib/mould/Mould.ts'), pattern: /\bdrainsInto\s*\(/g },
  { file: join(MUD, 'lib/thermal/Thermal.ts'), pattern: /\b(drainsInto|drainLiquorInto)\s*\(/g },
  { file: join(PACKS, 'trade-fuel/src/thing/Ash.ts'), pattern: /\bpercolatesInto\s*\(/g },
  { file: join(PACKS, 'trade-sugar/src/thing/SugarLoaf.ts'), pattern: /\bpercolatesInto\s*\(/g },
];

const VAPOR: readonly Signature[] = [
  { file: join(MUD, 'lib/thermal/Thermal.ts'), pattern: /\brouteVolatile\s*\(/g },
  { file: join(MUD, 'platform/idea/api/BulkableLogic.ts'), pattern: /\broom\.addAtmosphereContent\s*\(/g },
  { file: join(PACKS, 'trade-fuel/src/thing/Retort.ts'), pattern: /typeof\s+receiver\.receive\b/g },
  { file: join(MUD, 'lib/material/Compounding.ts'), pattern: /\broom\.addAtmosphereContent\s*\(/g },
  { file: join(MUD, 'lib/cleanliness/CleanserUse.ts'), pattern: /\bouter\.addAtmosphereContent\s*\(/g },
];

/** Source text with comments removed — a site named in prose is not a site. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function census(sigs: readonly Signature[]): { total: number; bySite: string[] } {
  const bySite: string[] = [];
  let total = 0;
  for (const s of sigs) {
    const n = (code(s.file).match(s.pattern) ?? []).length;
    total += n;
    if (n > 0) bySite.push(`${s.file.slice(s.file.indexOf('/src/') + 1)} ${s.pattern.source} ×${n}`);
  }
  return { total, bySite };
}

describe('census (2): who picks where a drip or a vapor goes', () => {
  it('⭐ the drip half holds at or below its ceiling', () => {
    const { total, bySite } = census(DRIP);
    expect(total, bySite.join('\n')).toBeLessThanOrEqual(DRIP_RECEIVER_CEILING);
  });

  it('⭐ the vapor half holds at or below its ceiling', () => {
    const { total, bySite } = census(VAPOR);
    expect(total, bySite.join('\n')).toBeLessThanOrEqual(VAPOR_RECEIVER_CEILING);
  });
});
