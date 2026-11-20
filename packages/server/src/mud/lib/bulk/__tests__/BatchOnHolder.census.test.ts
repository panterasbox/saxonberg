/**
 * ⭐ Census (1) of the matter-model-overlaps build: every site that reads
 * or writes `Graded` / `Crafted` on a Bulkable HOLDER as if it were the
 * holder's BATCH (plan § Grounding #7, D1–D3).
 *
 * A batch's grade and maker are facts about the CONTENTS, so they ride the
 * slot's `BulkPayload`; a vessel's own `Graded`/`Crafted` face is the
 * vessel's — a cooper's cask stays the cooper's whatever ferments in it.
 * Today the two are one field, and these are the sites that conflate them:
 *
 * Writers onto the holder
 * - `BulkableLogic` — `carryBatchIdentity`, `carryTopUpGrade`
 * - `CraftingLogic` — `vessel.stamp(` at the end of a by-hand build
 * - `Maturing` — `stampBatchMark`, `applyBatchGrade`, the `setGrade`
 *   witness and its `batchInputBand`
 * - trade-sugar `Copper` — `regrade`
 * - `Mould.creditDrainings` — `into.setGrade(`
 * - trade-fuel `Ash.onPercolated` — `into.setGrade(`
 * - `Comminuting` — the sack's `setGradeBand` / `setMaker`
 * - `Fractionating` — the run's restamp `self.setGrade(capped)`
 *
 * Readers of the holder as the batch
 * - `Thermal.concentrateIfReached` — `v.getGrade()`
 * - `Mould.carryPayload` (the cast takes the MOULD's grade) and
 *   `Mould.bandsBelowFine`
 * - trade-potash `IronPot.setCake` — `self.getGrade()`
 * - `Fractionating` — the run charge's band and maker off `self`
 * - the two verdict augmenters (`CraftVessel`, `GradedReceptacle`) —
 *   `host.renderVerdict(viewer)` on a used holder
 *
 * (W1 removed `ConditionReading`'s `thing.getGrade().renderBandWord()`
 * from the list: once no batch writes a vessel's grade, that line reads
 * the thing's OWN making — *"as it stands, it is fine work"* — which is
 * what it was always for.)
 *
 * ⭐ Census-then-ratchet (docs/lint-family.md): the ceiling is today's
 * count; it may fall and never rise. W1 lowers it to ZERO. A site that W1
 * keeps because it now correctly reads the holder's OWN grade (not the
 * batch's) leaves this list with its signature deleted and one line in
 * W1's build note saying why — never a ceiling raise.
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** ⭐ The ceiling. W1 lowered it to 0; never raise it. */
const BATCH_ON_HOLDER_CEILING = 0;

const HERE = dirname(fileURLToPath(import.meta.url));
const MUD = join(HERE, '..', '..', '..');
const PACKS = join(MUD, '..', '..', '..', 'content');

/** One site signature: a file and the code pattern that marks the site. */
interface Signature {
  readonly file: string;
  readonly pattern: RegExp;
}

const SIGNATURES: readonly Signature[] = [
  { file: join(MUD, 'platform/idea/api/BulkableLogic.ts'), pattern: /\bcarryBatchIdentity\s*\(/g },
  { file: join(MUD, 'platform/idea/api/BulkableLogic.ts'), pattern: /\bcarryTopUpGrade\s*\(/g },
  { file: join(MUD, 'platform/idea/api/CraftingLogic.ts'), pattern: /\bvessel\.stamp\s*\(/g },
  { file: join(MUD, 'lib/maturation/Maturing.ts'), pattern: /\bstampBatchMark\s*\(/g },
  { file: join(MUD, 'lib/maturation/Maturing.ts'), pattern: /\bapplyBatchGrade\s*\(/g },
  { file: join(MUD, 'lib/maturation/Maturing.ts'), pattern: /\bbatchInputBand\b/g },
  { file: join(PACKS, 'trade-sugar/src/thing/Copper.ts'), pattern: /\bregrade\s*\(/g },
  { file: join(MUD, 'lib/mould/Mould.ts'), pattern: /\binto\.setGrade\s*\(/g },
  { file: join(MUD, 'lib/mould/Mould.ts'), pattern: /\bbandsBelowFine\s*\(/g },
  { file: join(MUD, 'lib/mould/Mould.ts'), pattern: /\bcast\.setGrade\(mould\.getGrade\(\)\)/g },
  { file: join(PACKS, 'trade-fuel/src/thing/Ash.ts'), pattern: /\binto\.setGrade\s*\(/g },
  { file: join(MUD, 'lib/craft/Comminuting.ts'), pattern: /\bsack\.(setGradeBand|setMaker)\s*\(/g },
  { file: join(MUD, 'lib/fractionation/Fractionating.ts'), pattern: /\bself\.setGrade\(capped\)/g },
  { file: join(MUD, 'lib/fractionation/Fractionating.ts'), pattern: /\bself\.(getGradeBand|getMaker)\(\)/g },
  { file: join(MUD, 'lib/thermal/Thermal.ts'), pattern: /\bisGraded\(v\)\s*\?\s*v\.getGrade\(\)/g },
  { file: join(PACKS, 'trade-potash/src/thing/IronPot.ts'), pattern: /\bisGraded\(self\)\s*\?\s*self\.getGrade\(\)/g },
  { file: join(MUD, 'platform/thing/CraftVessel.ts'), pattern: /\bhost\.renderVerdict\(viewer\)/g },
  { file: join(MUD, 'platform/thing/GradedReceptacle.ts'), pattern: /\bhost\.renderVerdict\(viewer\)/g },
];

/** Source text with comments removed — a site named in prose is not a site. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function census(): { total: number; bySite: string[] } {
  const bySite: string[] = [];
  let total = 0;
  for (const s of SIGNATURES) {
    const n = (code(s.file).match(s.pattern) ?? []).length;
    total += n;
    if (n > 0) bySite.push(`${s.file.slice(s.file.indexOf('/src/') + 1)} ${s.pattern.source} ×${n}`);
  }
  return { total, bySite };
}

describe('census (1): the holder read or written as its batch', () => {
  it('⭐ holds at or below its ceiling', () => {
    const { total, bySite } = census();
    expect(total, bySite.join('\n')).toBeLessThanOrEqual(BATCH_ON_HOLDER_CEILING);
  });
});
