/**
 * The `worn` projection and the dressed-impression line (textiles A1).
 *
 * Two things are under test and they are deliberately in one file,
 * because they are two readings of one subject: the card ENUMERATES the
 * worn stack, the prose SUMMARIZES it, and the rule that keeps them
 * from being the same surface twice is that the prose names no garment.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { WearableMixin } from '../Wearable';
import { SlottableMixin } from '../Slottable';
import { SlottedMixin } from '../Slotted';
import { ContainableMixin } from '../../spatial/Containable';
import { GradedMixin } from '../../craft/Graded';
import { DurableMixin } from '../../material/Durable';
import { WetMixin } from '../../wetness/Wet';
import Thing from '../../stuff/Thing';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { StuffApi } from '../../../api/stuff';
import { Mml } from '../../../api/mml';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A garment carrying the three facts the impression line folds over. */
class TestGarment extends WearableMixin(
  SlottableMixin(ContainableMixin(GradedMixin(DurableMixin(WetMixin(Thing))))),
) {}

/** A Slotted host with no body plan at all — a weapon rack. */
class Rack extends SlottedMixin(Thing) {}

const PLAN_PATH = '/stuff/idea/species/BodyPlan/worn-test-biped';

/** Base prose the augmenters fold into (`Mml.augment` no-ops on ''). */
const BASE = 'Somebody stands here.';

let uniq = 0;

function dressableCreature(): Creature {
  // ⚠ Each fixture gets its OWN species row: `Organism.getSpecies`
  // resolves through `findByTemplatePath`, which refuses a duplicated
  // singleton path.
  const suffix = `-${uniq++}`;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`worn-test-biped${suffix}`);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin' },
    { name: 'legs', accepts: 'WearableMixin' },
    { name: 'head', accepts: 'WearableMixin' },
    // Slotted-but-not-worn: a sheath holds a thing that is not clothing.
    { name: 'sheath', accepts: 'SlottableMixin' },
  ]);
  stampTemplatePathForTest(plan, PLAN_PATH + suffix);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/dressable${suffix}`);

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

function garment(
  body: Creature,
  keyword: string,
  slots: string[],
  opts: { grade?: string; condition?: number } = {},
): TestGarment {
  const g = makeStuff(() => new TestGarment());
  g.setShortDescription(`a ${keyword}`);
  g.setPrimaryKeyword(keyword);
  g.setSlotClaim(body.getSpecies()!.getBodyPlanPath(), slots);
  if (opts.grade) g.setGradeBand(opts.grade);
  if (opts.condition !== undefined) g.setCondition(opts.condition);
  return g;
}

describe('Slotted.wornStack — the body half', () => {
  afterEach(() => StuffApi.clearAll());

  it('reports worn occupants outermost-first (later-worn = outer)', () => {
    const body = dressableCreature();
    const shirt = garment(body, 'shirt', ['torso']);
    const trousers = garment(body, 'trousers', ['legs']);
    body.occupyAll(shirt, ['torso']);
    body.occupyAll(trousers, ['legs']);

    expect(body.wornStack().map((g) => g.getPrimaryKeyword())).toEqual([
      'trousers',
      'shirt',
    ]);
  });

  it('dedupes a garment that claims several slots', () => {
    const body = dressableCreature();
    const suit = garment(body, 'suit', ['torso', 'legs']);
    body.occupyAll(suit, ['torso', 'legs']);
    expect(body.wornStack()).toHaveLength(1);
  });

  it('a slotted occupant that is not Wearable is not WORN', () => {
    // ⚠ Worn ⊊ slotted. A sheathed sidearm and a cranial implant are
    // slotted; neither is clothing, and neither belongs on the body half
    // of the card.
    const body = dressableCreature();
    const notClothing = makeStuff(() =>
      new (class extends SlottableMixin(Thing) {})(),
    );
    body.occupy(notClothing, 'sheath');
    expect(body.wornStack()).toHaveLength(0);
  });

  it('a Slotted host with no body plan answers an empty stack', () => {
    const rack = makeStuff(() => new Rack());
    rack.setStaticSlots([{ name: 'peg:1', accepts: 'WearableMixin' }]);
    expect(rack.wornStack()).toHaveLength(0);
  });
});

describe('the dressed-impression line', () => {
  afterEach(() => StuffApi.clearAll());

  function impressionOf(body: Creature, viewer: Creature = body): string {
    return Mml.augment(BASE, body, viewer).slice(BASE.length).trim();
  }

  it('names no individual garment', () => {
    installV1QuantityMarshallers();
    const body = dressableCreature();
    const worn = [
      garment(body, 'shirt', ['torso'], { grade: 'fine' }),
      garment(body, 'trousers', ['legs'], { grade: 'fine' }),
      garment(body, 'hood', ['head'], { grade: 'fine' }),
    ];
    body.occupyAll(worn[0]!, ['torso']);
    body.occupyAll(worn[1]!, ['legs']);
    body.occupyAll(worn[2]!, ['head']);

    const line = impressionOf(body).toLowerCase();
    expect(line.length).toBeGreaterThan(0);
    // The whole point of the line: it summarizes, it does not enumerate.
    for (const g of worn) {
      expect(line).not.toContain(g.getPrimaryKeyword().toLowerCase());
    }
  });

  it('re-reads identically until the facts change, then re-rolls', () => {
    // ⭐ Seeded, not drawn. An unchanged person must not re-describe
    // themselves differently every glance — so twenty looks agree.
    installV1QuantityMarshallers();
    const body = dressableCreature();
    const shirt = garment(body, 'shirt', ['torso'], { grade: 'fair' });
    body.occupyAll(shirt, ['torso']);

    const first = impressionOf(body);
    for (let i = 0; i < 20; i++) expect(impressionOf(body)).toBe(first);

    // A changed outfit changes the facts digest, so the read may move —
    // and must still be a line about quality, not about the shirt.
    shirt.setGradeBand('masterful');
    const after = impressionOf(body);
    expect(after).not.toBe(first);
    expect(after.toLowerCase()).not.toContain('shirt');
  });

  it('different people in different outfits read differently', () => {
    // Variety across PEOPLE is where it belongs, not across glances.
    installV1QuantityMarshallers();
    const seen = new Set<string>();
    for (const band of ['poor', 'fair', 'fine', 'exceptional', 'masterful']) {
      for (let i = 0; i < 4; i++) {
        const body = dressableCreature();
        const g = garment(body, `piece-${band}-${i}`, ['torso'], { grade: band });
        body.occupyAll(g, ['torso']);
        seen.add(impressionOf(body));
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(10);
  });

  it('renders nothing on a Slotted host with no body plan', () => {
    const rack = makeStuff(() => new Rack());
    rack.setStaticSlots([{ name: 'peg:1', accepts: 'WearableMixin' }]);
    expect(Mml.augment(BASE, rack, rack)).toBe(BASE);
  });

  it('renders nothing on an undressed body', () => {
    const body = dressableCreature();
    expect(impressionOf(body)).toBe('');
  });

  it('a soaked stack reads as an upkeep complaint, contrasted', () => {
    installV1QuantityMarshallers();
    const body = dressableCreature();
    const cloak = garment(body, 'cloak', ['torso'], { grade: 'fine' });
    cloak.wet(1);
    body.occupyAll(cloak, ['torso']);
    const line = impressionOf(body);
    // Two clauses joined by the contrast conjunction — the *cause* is
    // readable ("soaked", "wet", "dripping", …), never a number.
    expect(line).toMatch(/, but /);
    expect(line).not.toMatch(/[0-9]/);
  });

  it('a low-condition stack reads as wear, not as a number', () => {
    installV1QuantityMarshallers();
    const body = dressableCreature();
    body.occupyAll(
      garment(body, 'smock', ['torso'], { grade: 'fair', condition: 0.1 }),
      ['torso'],
    );
    const line = impressionOf(body);
    expect(line.length).toBeGreaterThan(0);
    expect(line).not.toMatch(/[0-9]/);
  });
});
