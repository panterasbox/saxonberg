/**
 * ⭐⭐ **The road walk** — the requirements' stress test, and the reason it
 * exists is worth stating plainly.
 *
 * The user's instruction at the slate: *"one good thing you could do to
 * stress test it is the old eternal city rooms descriptions (the roads and
 * streets). each describes a different kind of paving and I wonder how that
 * content would stand up to our floor design."*
 *
 * Four rooms, three of which describe stone and one of which describes a
 * made dirt road, and the two claims the design has to satisfy:
 *
 *   1. **Each reads as its own prose already says** — the crossing's swept
 *      flags, the square's cobbles, the yard's setts, Hinkley's graded dirt.
 *   2. ⭐ **The two cobbled ones read the SAME as each other, and nobody
 *      chose it.** Same material, same construction, same answer — which is
 *      AC 17, and the whole argument for the kind being derived rather than
 *      authored. If an author had to pick a kind, two authors would pick
 *      differently for the same stone and the world would be quietly
 *      inconsistent in a way no test could name.
 *
 * ⚠ This is a CONTENT test: it reads the shipped rows off disk and folds
 * them the way `FloorMixin.getGroundKind()` does. It deliberately does not
 * boot a world — the live reading is the wire drive's job (step 20), and a
 * content golden proves the content, never the engine.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import {
  GROUND_CLASS_PRECEDENCE,
  GROUND_KIND_FOLD,
  GROUND_TAG_CLASSES,
  type GroundKind,
  type GroundMaterialClass,
} from '@saxonberg/server/mud/lib/ground/GroundKind';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', 'content');
const PACKS = join(HERE, '..', '..', '..');
const MATERIALS = join(
  PACKS,
  'base-library', 'content', 'stuff', 'idea', 'material',
);

interface Row {
  class?: string;
  data?: Record<string, unknown>;
}

function row(abs: string): Row {
  return parse(readFileSync(abs, 'utf8')) as Row;
}

/** A material row's tags, by its template path. */
function tagsOf(materialPath: string): string[] {
  const rel = materialPath.replace('/stuff/idea/material/', '') + '.yaml';
  const doc = parse(readFileSync(join(MATERIALS, rel), 'utf8')) as {
    data: { tags: string[] };
  };
  return doc.data.tags;
}

function classOf(tags: readonly string[]): GroundMaterialClass | null {
  const found = new Set<GroundMaterialClass>();
  for (const t of tags) {
    const c = GROUND_TAG_CLASSES[t.toLowerCase()];
    if (c) found.add(c);
  }
  for (const c of GROUND_CLASS_PRECEDENCE) if (found.has(c)) return c;
  return null;
}

/** The fold, exactly as the mixin runs it. */
function fold(input: {
  materialClass: GroundMaterialClass | null;
  onGrade: boolean;
  worked: boolean;
  standingWater: boolean;
}): GroundKind {
  if (input.materialClass === null) return 'contrived';
  for (const r of GROUND_KIND_FOLD) {
    if (r.materialClass !== input.materialClass) continue;
    if (r.onGrade !== undefined && r.onGrade !== input.onGrade) continue;
    if (r.worked !== undefined && r.worked !== input.worked) continue;
    if (
      r.standingWater !== undefined &&
      r.standingWater !== input.standingWater
    ) {
      continue;
    }
    return r.kind;
  }
  return 'contrived';
}

interface Reading {
  material: string;
  kind: GroundKind;
}

/** A floor ROW (rung 1) — the crossing, the yard. */
function fromFloorRow(rel: string): Reading {
  const d = row(join(CONTENT, rel)).data!;
  const material = d._materialPath as string;
  return {
    material,
    kind: fold({
      materialClass: classOf(tagsOf(material)),
      onGrade: (d.onGrade as boolean) ?? true,
      worked: (d.worked as boolean) ?? false,
      standingWater: false,
    }),
  };
}

/** A room's `floor:` SPEC (rung 2) — the square, the lane. */
function fromFloorSpec(abs: string): Reading {
  const spec = row(abs).data!.floor as {
    material: string;
    worked?: boolean;
    onGrade?: boolean;
  };
  return {
    material: spec.material,
    kind: fold({
      materialClass: classOf(tagsOf(spec.material)),
      // Both rooms are sky-exposed outdoor city rooms, so the derivation
      // answers `true` — which is exactly why neither authors it.
      onGrade: spec.onGrade ?? true,
      worked: spec.worked ?? false,
      standingWater: false,
    }),
  };
}

const CROSSING = 'world/terminus/university-avenue/thing/crossing-paving.yaml';
const YARD_PAVING = 'world/terminus/goods-yards/thing/yard-paving.yaml';
const SQUARE = join(CONTENT, 'world/terminus/market/square.yaml');
const LANE = join(
  PACKS,
  'hinkley-hills', 'content', 'world', 'terminus', 'hinkley-hills',
  'location', 'lane.yaml',
);

describe('the road walk — each road reads as its own prose', () => {
  it('the university crossing: swept granite flags → set-paving', () => {
    const r = fromFloorRow(CROSSING);
    expect(r.material).toBe('/stuff/idea/material/rock/granite');
    expect(r.kind).toBe('set-paving');
  });

  it('the goods yards: granite setts → set-paving', () => {
    const r = fromFloorRow(YARD_PAVING);
    expect(r.material).toBe('/stuff/idea/material/rock/granite');
    expect(r.kind).toBe('set-paving');
  });

  it('the market square: cobbles, from three words on the room → set-paving', () => {
    const r = fromFloorSpec(SQUARE);
    expect(r.material).toBe('/stuff/idea/material/rock/granite');
    expect(r.kind).toBe('set-paving');
  });

  it("Hinkley's lane: a MADE road of graded dirt → beaten-floor", () => {
    const r = fromFloorSpec(LANE);
    expect(r.material).toBe('/stuff/idea/material/earth/loam');
    expect(r.kind).toBe('beaten-floor');
  });
});

describe('⭐ AC 17 — the same ground reads the same, unchosen', () => {
  it('the square and the goods yards agree, from DIFFERENT rungs', () => {
    // One is a floor row with a gutter detail on it; the other is three
    // words on the room. Same material, same construction, same answer —
    // and no `kind:` field exists anywhere for either of them to disagree
    // with the other about.
    const square = fromFloorSpec(SQUARE);
    const yard = fromFloorRow(YARD_PAVING);
    expect(square.material).toBe(yard.material);
    expect(square.kind).toBe(yard.kind);
  });

  it('…and the dirt road does NOT agree with them, for the right reason', () => {
    // Different matter, not a different opinion.
    expect(fromFloorSpec(LANE).kind).not.toBe(fromFloorSpec(SQUARE).kind);
  });
});

describe('the details the roads own', () => {
  it("the crossing's worn diagonal track is a detail OF THE FLOOR", () => {
    const d = row(join(CONTENT, CROSSING)).data!;
    const details = d.details as Record<string, { keywords: string[] }>;
    expect(Object.keys(details)).toContain('track');
    expect(details.track!.keywords).toContain('track');
    // …and the floor answers to the room's own word for it.
    expect(d.keywords as string[]).toContain('underfoot');
  });

  it("⭐ the yard's gutter MOVED from the room onto the paving", () => {
    const paving = row(join(CONTENT, YARD_PAVING)).data!;
    const yard = row(join(CONTENT, 'world/terminus/goods-yards/yard.yaml')).data!;
    const pavingDetails = paving.details as Record<string, unknown>;
    const yardDetails = yard.details as Record<string, unknown>;
    expect(Object.keys(pavingDetails)).toContain('gutter');
    // A gutter is a feature of paving, not of the space above it.
    expect(Object.keys(yardDetails)).not.toContain('gutter');
  });

  it('every road floor answers to both `floor` and `ground`', () => {
    // `lint:ground` clause (d) enforces this across every floor row; asserted
    // here too because these four rooms are the drive's step 20.
    for (const rel of [CROSSING, YARD_PAVING]) {
      const kw = row(join(CONTENT, rel)).data!.keywords as string[];
      expect(kw).toContain('floor');
      expect(kw).toContain('ground');
    }
  });
});
