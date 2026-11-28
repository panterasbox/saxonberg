/**
 * check-scaling — ⭐ the square-cube honesty check (organism-biology D12).
 *
 * Every species with a tissue-bearing body is read against four limits a
 * body's own numbers decide, from rows already authored — its adult mass,
 * its plan's modules, its organs' apparatus, its gaits, its thermal
 * strategy, its habitat:
 *
 *  - **bone** — mass³ over bone: `adultMass^(1/3) / boneShare`, the load a
 *    skeleton carries against its cross-section (EXEMPT in water, which
 *    holds a whale up);
 *  - **diffusion** — a body breathing air only through `tracheae` or
 *    `skin` heavier than diffusion can serve;
 *  - **flight** — a body with a `fly` gait heavier than a wing lifts;
 *  - **heat** — an endotherm too small to keep its heat.
 *
 * A species over a limit must say what pays for it — `pays: [{ limit, by }]`
 * (a whale's water, a dragon's magic) — and the dossier shows it. The gate
 * counts **species over a limit with no payer**; the ceiling is 0. It never
 * refuses a creature at runtime: an author may make any animal, and the
 * world is honest about what holds it up.
 *
 *   tsx scripts/check-scaling.ts --lint     # CI gate (lint:scaling)
 *   tsx scripts/check-scaling.ts --report   # every species' four indices
 */

import { allRows, bodyPlanRows, rowPathOf } from './check-anatomy';

/** Species over a limit with no payer — measured 0 at organism-biology W10. */
export const UNPAID_CEILING = 0;

/** The limits. ⚠ Tuned so a body the real world holds up passes. */
const BONE_INDEX_MAX = 150; // a large ox ~ 80; an elephant would be ~ 140
const DIFFUSION_MASS_MAX_KG = 0.1; // the largest insects are tens of grams
const FLIGHT_MASS_MAX_KG = 15; // the great bustard flies at ~ 18 kg, barely
const HEAT_MASS_MIN_KG = 0.002; // the smallest shrews are ~ 2 g

export type ScalingLimit = 'bone' | 'diffusion' | 'flight' | 'heat';

export interface ScalingRead {
  species: string;
  file: string;
  over: ScalingLimit[];
  unpaid: ScalingLimit[];
  bone: number;
}

export function readScaling(): ScalingRead[] {
  const plans = new Map(bodyPlanRows().map((r) => [r.path, r]));
  const planData = new Map(allRows().filter((r) => r.cls === '/platform/idea/species/BodyPlan').map((r) => [rowPathOf(r.file) ?? '', r.doc as Record<string, unknown>]));
  const out: ScalingRead[] = [];
  for (const row of allRows()) {
    if (row.cls !== '/platform/idea/species/Species') continue;
    const d = row.doc as Record<string, unknown>;
    const planPath = typeof d._bodyPlanPath === 'string' ? d._bodyPlanPath : '';
    const body = plans.get(planPath)?.body ?? null;
    const mass = typeof d.adultMass === 'number' ? d.adultMass : 0;
    if (!body || !(mass > 0)) continue;
    const tissues = body.resolvedTissues();
    if (tissues.length === 0) continue;
    const boneShare = tissues.filter((t) => /\/(bone|cartilage|chitin|shell)$/.test(t.tissuePath)).reduce((a, t) => a + t.share, 0);
    const gaits = body.gaits();
    const inWater = d.habitat !== undefined || (gaits.length > 0 && gaits.every((g) => g === 'swim'));
    const air = body.breathing().filter((b) => b.medium === 'air');
    const ecto = planData.get(planPath)?.thermalStrategy === 'ectotherm';
    const bone = boneShare > 0 ? Math.cbrt(mass) / boneShare : Infinity;
    const over: ScalingLimit[] = [];
    if (!inWater && bone > BONE_INDEX_MAX) over.push('bone');
    if (air.length > 0 && air.every((b) => b.apparatus === 'tracheae' || b.apparatus === 'skin') && mass > DIFFUSION_MASS_MAX_KG) over.push('diffusion');
    if (gaits.includes('fly') && mass > FLIGHT_MASS_MAX_KG) over.push('flight');
    if (!ecto && mass < HEAT_MASS_MIN_KG) over.push('heat');
    const paid = new Set(((d.pays as { limit?: string }[] | undefined) ?? []).map((p) => p?.limit));
    out.push({ species: rowPathOf(row.file) ?? row.file, file: row.file, over, unpaid: over.filter((l) => !paid.has(l)), bone });
  }
  return out;
}

function main(): void {
  const reads = readScaling();
  const unpaid = reads.filter((r) => r.unpaid.length > 0);
  if (process.argv.includes('--report')) {
    for (const r of reads) console.log(`${r.species}  bone ${r.bone.toFixed(1)}  over [${r.over.join(', ')}]  unpaid [${r.unpaid.join(', ')}]`);
  }
  if (unpaid.length > UNPAID_CEILING) {
    console.error(
      `lint:scaling: ✗ species over a square-cube limit with nothing paying for it: ${unpaid.length}, above the ceiling of ${UNPAID_CEILING}.\n\n` +
        unpaid.map((r) => `  ✗ ${r.file}  over: ${r.unpaid.join(', ')}`).join('\n') +
        `\n\nAuthor \`pays: [{ limit, by }]\` on the species — what holds it up (water, a lighter bone, magic). The ceiling is 0.`,
    );
    process.exit(1);
  }
  console.log(`lint:scaling: ${reads.length} species read; species over a limit with no payer ${unpaid.length} / ceiling ${UNPAID_CEILING} ✔`);
}

if (process.argv[1] && /check-scaling\.ts$/.test(process.argv[1])) main();
