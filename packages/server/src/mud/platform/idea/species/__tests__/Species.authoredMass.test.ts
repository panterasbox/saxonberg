/**
 * ⚠⚠ **An animal that masses nothing is a silent, world-wide failure,
 * and the realm shipped in exactly that state.**
 *
 * `Creature.getMass()` seeds from the species' `adultMass` and falls back
 * to the body plan's `baseMass`. Of the four shipped body plans only
 * `biped` ever authored one — so **every quadruped and every bird in the
 * game massed zero**, and four subsystems read that number: encumbrance
 * for carry capacity, metabolism for the Kleiber basal drain, thermal for
 * thermal mass, and ranching for what comes off a carcass.
 *
 * Nothing threw. `butcher` on a healthy cow answered *"there was less on
 * it than you hoped"* — the zero-yield branch, reporting a true fact
 * about a body that weighed nothing — and every unit test passed, because
 * a fixture hands the mass straight in.
 *
 * ⭐ So this reads from the READER's end, like the zone-field gate beside
 * it: walk the shipped species rows and insist each one arrives at a real
 * mass by SOME route. A new species with no number fails here rather than
 * two subsystems away.
 *
 * ⚠ Plants, fungi and the `sessile` plan are deliberately exempt: a
 * sessile body genuinely has no whole-organism mass, which is what
 * `BodyPlan.baseMass = 0` is documented to mean.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', '..', '..', '..', '..', '..', 'content');

interface Row {
  file: string;
  path: string;
  doc: Record<string, unknown>;
}

/** Every shipped `.yaml` under every pack's `content/`, with its row path. */
function shippedRows(): Row[] {
  const out: Row[] = [];
  const walk = (dir: string, rel: string, rowRel: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules') continue;
        walk(full, `${rel}/${entry}`, `${rowRel}/${entry}`);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      try {
        const doc = YAML.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
        if (doc && typeof doc === 'object') {
          out.push({
            file: `${rel}/${entry}`,
            path: `${rowRel}/${entry}`.replace(/\.yaml$/, ''),
            doc,
          });
        }
      } catch {
        // A row that does not parse is another gate's problem.
      }
    }
  };
  for (const pack of readdirSync(CONTENT)) {
    const content = join(CONTENT, pack, 'content');
    try {
      if (statSync(content).isDirectory()) walk(content, pack, '');
    } catch {
      // No content dir — a capability pack that ships only `src/`.
    }
  }
  return out;
}

function dataOf(row: Row): Record<string, unknown> {
  return (row.doc.data ?? {}) as Record<string, unknown>;
}

describe('every animal species arrives at a real mass', () => {
  it('⭐⭐ no shipped animal species resolves to a body that weighs nothing', () => {
    const rows = shippedRows();

    // The body plans, and what each one gives a body that does not say.
    const planMass = new Map<string, number>();
    for (const row of rows) {
      if (!row.path.includes('/species/BodyPlan/')) continue;
      const base = dataOf(row).baseMass;
      planMass.set(row.path, typeof base === 'number' ? base : 0);
    }
    expect(planMass.size).toBeGreaterThan(0);

    const offenders: string[] = [];
    let checked = 0;

    for (const row of rows) {
      const cls = typeof row.doc.class === 'string' ? row.doc.class : '';
      if (cls !== '/platform/idea/species/Species') continue;
      // Only ANIMALS have a whole-organism liveweight to state.
      if (!row.path.includes('/species/animalia/')) continue;
      const data = dataOf(row);
      const planPath = data._bodyPlanPath;
      if (typeof planPath !== 'string') continue;
      // A sessile body has no whole-organism mass, by documented design.
      if (planPath.endsWith('/sessile')) continue;

      checked += 1;
      const own = data.adultMass;
      const fromSpecies = typeof own === 'number' && own > 0;
      const fromPlan = (planMass.get(planPath) ?? 0) > 0;
      if (!fromSpecies && !fromPlan) {
        offenders.push(
          `${row.file}: neither an adultMass of its own nor a baseMass on ${planPath}`,
        );
      }
    }

    expect(checked).toBeGreaterThan(10);
    expect(offenders).toEqual([]);
  });
});
