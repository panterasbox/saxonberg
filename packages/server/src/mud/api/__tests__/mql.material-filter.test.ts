/**
 * ⭐⭐ `[material.X]` — **what a thing is MADE OF**, as a query.
 *
 * Material tags are already the engine's vocabulary for *what kind of
 * stuff is this*: recipes match stock on them (`category: forgeable`),
 * the covering stack reads them, and the metal chain's whole ladder is
 * `metal` / `ferrous` / `forgeable` / `brittle`. Until this filter
 * existed the query language could not ask about any of it, so every
 * "find me something made of X" was a hand-rolled loop over a
 * hand-rolled reach.
 *
 * The three rules under test, in order of how easy each is to get
 * wrong:
 *
 *  1. it spans **every part**, not the bulk default — an axe is oak at
 *     the haft and iron at the head, and *"is there metal here"* must
 *     find it;
 *  2. it is *made of*, **never contains** — a waterskin is leather;
 *  3. a thing with no Material at all is `false`, never a throw.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from '../mql/resolver';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { Idea } from '../../lib/stuff/Idea';
import Thing from '../../lib/stuff/Thing';
import Material from '../../lib/material/Material';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { SensorMixin } from '../../lib/message/Sensor';
import type { MqlContext } from '../mql/types';
import type { Stuff } from '../../lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
/** Containable and keyworded, but NOT Tangible — it has no material concept. */
class TestToken extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(SensorMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))),
) {}

const STEEL = '/stuff/idea/material/alloy/steel';
const CAST_IRON = '/stuff/idea/material/alloy/cast-iron';
const OAK = '/stuff/idea/material/wood/oak';
const LEATHER = '/stuff/idea/material/organic/leather';

let ctx: MqlContext;
let room: TestRoom;
let bar: Thing;
let pig: Thing;
let axe: Thing;
let skin: Thing;
let blank: Thing;
let token: TestToken;

function material(path: string, tags: string[]): Material {
  const m = makeStuffAtPath(() => new Material(), path);
  m.setTags(tags);
  return m;
}

/**
 * A Thing standing in the room.
 *
 * ⚠ The seed is `peers` rather than a keyword: a bare `Thing` carries no
 * perception surface, so a keyword seed does not see it. The FILTER is
 * what is under test, and `peers` reaches the room's contents directly.
 */
function thing(materialPath: string | null): Thing {
  const t = makeStuff(() => new Thing());
  if (materialPath) {
    t.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath) as Material);
  }
  ContainmentApi.move(t as never, room as never);
  return t;
}

function ids(matches: { stuff: Stuff }[]): string[] {
  return matches.map((m) => m.stuff.stuffId);
}

beforeEach(() => {
  StuffApi.clearAll();
  material(STEEL, ['alloy', 'metal', 'ferrous', 'forgeable', 'magnetic']);
  material(CAST_IRON, ['alloy', 'metal', 'ferrous', 'brittle']);
  material(OAK, ['wood', 'mixture', 'organic', 'flammable']);
  material(LEATHER, ['organic', 'flexible']);

  room = makeStuff(() => new TestRoom());
  const giver = makeStuff(() => new TestGiver());
  ContainmentApi.move(giver as never, room as never);
  ctx = { commandGiver: giver as never, scope: 'here' };

  bar = thing(STEEL);
  pig = thing(CAST_IRON);
  // ⭐ An axe: oak at the haft, iron at the head. The case the bulk
  // default alone would answer "wood" to.
  axe = thing(OAK);
  axe.setMaterial(
    StuffApi.findByTemplatePath<Material>(CAST_IRON) as Material,
    'head',
  );
  // A waterskin: made of leather, holding water.
  skin = thing(LEATHER);
  // Tangible, but nobody authored a material on it.
  blank = thing(null);
  // …and a thing with no material CONCEPT at all.
  token = makeStuff(() => new TestToken());
  ContainmentApi.move(token as never, room as never);
});

afterEach(() => StuffApi.clearAll());

describe('[material.X] — the tag a thing is made of', () => {
  it('⭐ matches on an authored material tag', () => {
    expect(ids(resolve('peers:[material.forgeable]', ctx))).toEqual([bar.stuffId]);
  });

  it('⭐⭐ spans EVERY part, not just the bulk default', () => {
    // The axe is oak in bulk. Asking the bulk default alone would say
    // "wood" and miss the iron head — useless to every caller that has
    // ever wanted this filter.
    const metal = new Set(ids(resolve('peers:[material.metal]', ctx)));
    expect(metal.has(axe.stuffId)).toBe(true);
    expect(metal.has(bar.stuffId)).toBe(true);
    expect(metal.has(pig.stuffId)).toBe(true);
    // …and it is still honestly wood as well.
    expect(ids(resolve('peers:[material.wood]', ctx))).toEqual([axe.stuffId]);
  });

  it('⭐ the metal chain’s own question: what here cannot be forged', () => {
    const brittle = new Set(ids(resolve('peers:[material.brittle]', ctx)));
    expect(brittle.has(pig.stuffId)).toBe(true);
    expect(brittle.has(bar.stuffId)).toBe(false);
    // ⚠ The axe IS caught — its head is cast. That is correct and is
    // the point of spanning parts.
    expect(brittle.has(axe.stuffId)).toBe(true);
  });

  it('⚠⚠ MADE OF, never CONTAINS — a waterskin is leather', () => {
    expect(ids(resolve('peers:[material.organic]', ctx))).toContain(skin.stuffId);
    // What is in its bulk slot is a different question with a different
    // owner; folding it in here would be a lie that reads like a
    // convenience.
    expect(ids(resolve('peers:[material.water]', ctx))).toEqual([]);
  });

  it('⚠ no Material — and no material CONCEPT — are both FALSE, never a throw', () => {
    expect(() => resolve('peers:[material.metal]', ctx)).not.toThrow();
    const metal = new Set(ids(resolve('peers:[material.metal]', ctx)));
    // Tangible, nobody authored a material on it.
    expect(metal.has(blank.stuffId)).toBe(false);
    // Not Tangible at all — the `isTangible` guard, not an exception.
    expect(metal.has(token.stuffId)).toBe(false);
  });

  it('⚠ an unknown tag matches nothing, quietly', () => {
    expect(ids(resolve('peers:[material.unobtainium]', ctx))).toEqual([]);
  });

  it('composes with the other atoms, and with not', () => {
    const out = resolve('peers:[material.ferrous and not material.brittle]', ctx);
    expect(ids(out)).toEqual([bar.stuffId]);
  });

  it('⚠ an unknown NAMESPACE still names the ones that exist', () => {
    expect(() => resolve('peers:[substance.steel]', ctx)).toThrow(/material/);
  });
});
