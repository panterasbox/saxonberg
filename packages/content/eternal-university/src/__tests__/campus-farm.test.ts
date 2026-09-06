/**
 * ⭐⭐⭐ **AC 62 — the campus farm needs ZERO pack code**, and this is
 * the test that says so.
 *
 * D33's falsifiable claim is that a locality can bind the farm and byre
 * archetypes with no TypeScript at all. If it can, the mechanism /
 * expression cut was right, and we find that out here — cheaply, on a
 * small teaching unit — long before anybody builds a valley.
 *
 * ⚠ **Failing this is a DESIGN FINDING to report, not a problem to code
 * around.** If binding an archetype ever needs `src/`, the archetype is
 * the wrong shape.
 *
 * The check is a fact about the FILES rather than about behaviour,
 * deliberately: behaviour can be made to work with a helper, and the
 * claim is precisely that no helper exists.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const PACK = fileURLToPath(new URL('../../', import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const FARM_DIRS = [
  `${PACK}content/world/eternal/campus-farm`,
  `${PACK}content/world/eternal/campus-field`,
];

describe('the campus farm', () => {
  it('⭐⭐⭐ is ENTIRELY yaml — no pack code anywhere in it (AC 62)', () => {
    const files = FARM_DIRS.flatMap(walk);
    expect(files.length).toBeGreaterThan(8);
    for (const f of files) expect(f.endsWith('.yaml')).toBe(true);
  });

  it('⭐ and the classes it names belong to the TRADES, not to this pack', () => {
    const classes = new Set<string>();
    for (const f of FARM_DIRS.flatMap(walk)) {
      const doc = parse(readFileSync(f, 'utf8')) as { class?: string };
      if (doc?.class) classes.add(doc.class);
    }
    // ⭐ The field is farming's class; everything else is the platform's.
    expect(classes).toContain('/trade/farming/location/Field');
    for (const cls of classes) {
      expect(
        cls.startsWith('/platform/') || cls.startsWith('/trade/'),
      ).toBe(true);
    }
  });

  it('⭐⭐ binds BOTH archetypes — a mixed farmstead satisfies farm AND byre', () => {
    // The reason there are two archetypes rather than one: a holding
    // that only grows crops must not fail a byre slot. A mixed farm
    // answers both, which gives this unit two bindings to prove.
    const yard = parse(
      readFileSync(`${FARM_DIRS[0]}/location/yard.yaml`, 'utf8'),
    ) as { data: { props: string[] } };
    const props = yard.data.props.join(' ');
    // byre: shelter, enclosure, water, feed, muck
    for (const bound of ['byre', 'yard-wall', 'trough', 'hay-barn', 'midden']) {
      expect(props).toContain(bound);
    }
    // farm: storage, water, traction, groundwork, market
    for (const bound of ['hay-barn', 'trough', 'plough', 'spade', 'handcart']) {
      expect(props).toContain(bound);
    }
  });

  it('⭐ the WATER slot is answered by a THING, and the archetype names none', () => {
    // The divergence slot's whole demonstration: this place answers with
    // a pipe from uphill; another would answer with a well or a pond,
    // and the archetype would be equally satisfied either way.
    const farm = parse(
      readFileSync(
        `${PACK}../trade-farming/content/archetypes/farm.yaml`,
        'utf8',
      ),
    ) as { capabilities: Array<Record<string, unknown>> };
    const water = farm.capabilities.find((c) => c.key === 'water');
    expect(water).toBeDefined();
    expect(water!.default).toBeUndefined();
  });

  it('⭐⭐⭐ rung ZERO: a labourer’s post with no gate on it (AC 63)', () => {
    // No parcel, no lot, no capital, no prerequisite. You go to the farm
    // and work, and the acts you do for the wage are the same acts a
    // holder does on their own ground.
    const unit = parse(
      readFileSync(`${FARM_DIRS[0]}/idea/farm-unit.yaml`, 'utf8'),
    ) as { data: { positions: Array<Record<string, unknown>> } };
    const post = unit.data.positions.find((p) => p.key === 'labourer');
    expect(post).toBeDefined();
    expect(post!.confers).toEqual([]);
    expect(post!.wageRate).toBeGreaterThan(0);
  });
});

/**
 * ⭐⭐ **The ground the farm sits on is AUTHORED, and the citation is
 * live.** `trade-farming` ships the `GroundCharacter` class and no dirt;
 * the venue writes the dirt. This asserts the two ends meet — the zone
 * cites a row, and the row exists — because the whole authored layer was
 * unreachable until a cold boot said so, and a broken citation is
 * silent in exactly the same way.
 */
describe('the college ground', () => {
  const read = (p: string): Record<string, unknown> =>
    parse(readFileSync(p, 'utf8')) as Record<string, unknown>;

  it('⭐ the field\'s zone cites a ground model, and the model is shipped', () => {
    const zone = read(`${PACK}content/world/eternal/campus-field.yaml`);
    const cited = (zone.data as Record<string, unknown>).groundCharacter;
    expect(cited).toBe('/world/eternal/campus-field/idea/ground');

    const row = read(`${PACK}content/world/eternal/campus-field/idea/ground.yaml`);
    expect(row.class).toBe('/trade/farming/idea/GroundCharacter');
  });

  it('⭐⭐ and it teaches infield/outfield — a pin near, a lean far', () => {
    const data = read(`${PACK}content/world/eternal/campus-field/idea/ground.yaml`)
      .data as { pins: Record<string, Record<string, unknown>>; bands: unknown[] };
    const field = read(
      `${PACK}content/world/eternal/campus-field/location/home-field.yaml`,
    ).data as { groundSpotX: number; groundSpotY: number };

    // The pin sits on the home field's OWN spot: the ground nearest the
    // yard is the ground two centuries of muck went on.
    const key = `${field.groundSpotX},${field.groundSpotY}`;
    expect(Object.keys(data.pins)).toContain(key);
    expect(data.pins[key]!.topsoilM).toBeGreaterThan(0.25);
    // And the far end is leaned, never pinned — it is the ground the
    // seed dealt, wearing its neglect.
    expect(data.bands.length).toBeGreaterThanOrEqual(2);
  });
});
