/**
 * ⭐⭐ `butcher` over a BODY — the dressed yield, and the refusals in the
 * order they are spoken.
 *
 * The carcass chain's half of butchery. Three claims:
 *
 *  1. **The yield is the animal's**, dressed off the body's own mass and
 *     the condition it died in — so a bullock gives far more than a ewe
 *     for one reason, that it is far more animal, and a beast in poor
 *     flesh dresses out light. The retired stockyard verb read a module
 *     table that was the same for a hen and a bullock.
 *  2. **A live animal is told which act it wants**, and it is told last:
 *     everything permanently true of the animal is said first, and *it is
 *     still alive* is said last because it is the one thing the player can
 *     change. The old order refused `butcher ewe` with *"is not a
 *     carcass"* before reading anything, which taught nobody anything.
 *  3. **A counted line is left alone.** A hen's row says *two cuts of
 *     meat* with no share, and a dressed reading of it would hand out
 *     grams.
 */

import '@saxonberg/server/test-bootstrap';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import ButcherController from '../ButcherController';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import Corpse from '@saxonberg/server/mud/platform/agent/Corpse';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type {
  CommandContext,
  ModelData,
} from '@saxonberg/server/mud/api/command';
import type {
  MqlManyResult,
  MqlOneResult,
} from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const MEAT = '/stuff/thing/items/_test/stew-meat';
const HIDE = '/trade/ranching/thing/_test/hide';
const SHEEP = '/stuff/idea/species/_test/sheep';
const COW = '/stuff/idea/species/_test/cow';
const HEN = '/stuff/idea/species/_test/hen';
const DOG = '/stuff/idea/species/_test/collie';
const PERSON = '/stuff/idea/species/_test/person';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomDressing';
}
class TestGiver extends NamedMixin(ContainableMixin(ContainerMixin(Idea))) {
  static _mixinName = 'TestGiverDressing';
}
/**
 * ⭐⭐ A body that CAN hold a name — the kept-animal shape.
 *
 * `Creature` does not compose `NamedMixin`, so neither a `Corpse` nor a
 * `Livestock` can hold a name at all; a `KeptAnimal` can, because naming
 * is the promotion that makes an animal a pet. That asymmetry is what the
 * named refusal rests on, and it is structural rather than a convention
 * anybody has to keep.
 */
class NamedBody extends NamedMixin(Corpse) {
  static _mixinName = 'NamedBodyDressing';
}

/** A bladed thing — the edge is the affordance, never the class. */
class TestKnife extends ConstructedMixin(ContainableMixin(Good)) {
  static _mixinName = 'TestKnifeDressing';
}

let notes: { kind: string; reason?: string }[];
let room: TestRoom;
let giver: TestGiver;
let knife: TestKnife;
let minted: Stuff[];

function ctx(): CommandContext {
  notes = [];
  return {
    commandGiver: giver as unknown as Stuff,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
  } as unknown as CommandContext;
}

function model(body: Stuff | null): ModelData {
  return {
    body: { stuff: body, raw: 'body' } as unknown as MqlOneResult,
    blade: { stuff: [knife] } as unknown as MqlManyResult,
    block: { stuff: [] } as unknown as MqlManyResult,
  } as unknown as ModelData;
}

function reasons(): string[] {
  return notes.map((n) => n.reason ?? '').filter(Boolean);
}

function sceneStub(): unknown {
  const leg: Record<string, unknown> = {};
  leg.toSelf = () => leg;
  leg.toPeers = () => leg;
  leg.send = () => undefined;
  leg.topic = () => leg;
  return leg;
}

function species(
  path: string,
  lines: Parameters<Species['setButcheryYield']>[0],
  sentient = false,
): Species {
  const s = makeStuffAtPath(() => new Species(), path) as Species;
  s.setSentient(sentient);
  s.setButcheryYield(lines);
  return s;
}

/** A body of `speciesPath`, massing `kg`, that died at `flesh` condition. */
function body(speciesPath: string, kg: number, flesh: number | null): Corpse {
  const c = makeStuff(() => new Corpse());
  c.setLifecycleState('dead');
  c.setMass(Quantity.of(kg, 'kg'));
  c.setConditionAtDeath(flesh);
  c.setSpecies(StuffApi.findByTemplatePath(speciesPath) as unknown as Species);
  ContainmentApi.move(c as unknown as Stuff, room);
  return c;
}

/** Sum of the masses of everything the act laid down in the room. */
function cutMasses(): number[] {
  return minted
    .filter((c) => MixinApi.isTangible(c))
    .map((c) => (c as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue());
}

beforeAll(() => {
  installV1QuantityMarshallers();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

beforeEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  minted = [];
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  vi.spyOn(MessageApi, 'scene').mockReturnValue(sceneStub() as never);
  vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined as never);

  // A cut material and the two cut rows, stood up as a clone stub: the
  // rows themselves are content and this test is about the arithmetic.
  const flesh = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('flesh');
    m.setTags(['meat', 'food']);
    return m;
  }, '/stuff/idea/material/_test/dressing-flesh') as unknown as Material;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const cut = makeStuff(() => new Provision());
    cut.setShortDescription(path.split('/').pop() ?? 'cut');
    cut.setMaterial(flesh);
    cut.setMass(Quantity.of(1, 'kg'));
    minted.push(cut as unknown as Stuff);
    return cut as never;
  }) as unknown as typeof StuffApi.clone);

  room = makeStuff(() => new TestRoom());
  giver = makeStuff(() => {
    const g = new TestGiver();
    g.setName('Iris');
    return g;
  });
  ContainmentApi.move(giver as unknown as Stuff, room);
  knife = makeStuff(() => new TestKnife());
  knife.setConstructionForm('bladed');
  ContainmentApi.move(knife as unknown as Stuff, room);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
});

describe('the yield is the animal\'s', () => {
  it('⭐⭐ a dressed line arrives as real kilograms off the body\'s mass', async () => {
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const ewe = body(SHEEP, 70, 55);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(ewe as unknown as Stuff), ctx());

    expect(minted.length).toBeGreaterThan(0);
    const total = cutMasses().reduce((a, b) => a + b, 0);
    // 70 kg x 0.40 x finish(55) ≈ 23 kg, times the skill factor an
    // untrained hand gets. The claim is that it is KILOGRAMS OF THIS
    // ANIMAL rather than a fixed row mass.
    expect(total).toBeGreaterThan(5);
    expect(total).toBeLessThan(70 * 0.4);
  });

  it('⭐⭐ a bullock gives far more than a ewe — same verb, same hand (AC3)', async () => {
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);
    species(COW, [{ cut: MEAT, units: 12, fraction: 0.42 }]);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body(SHEEP, 70, 55) as unknown as Stuff), ctx());
    const ewe = cutMasses().reduce((a, b) => a + b, 0);

    minted = [];
    await ctrl.execute(model(body(COW, 550, 55) as unknown as Stuff), ctx());
    const cow = cutMasses().reduce((a, b) => a + b, 0);

    expect(cow).toBeGreaterThan(ewe * 7);
  });

  it('⭐⭐ a beast that died in good flesh dresses out heavier (AC3)', async () => {
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body(SHEEP, 70, 20) as unknown as Stuff), ctx());
    const thin = cutMasses().reduce((a, b) => a + b, 0);

    minted = [];
    await ctrl.execute(model(body(SHEEP, 70, 95) as unknown as Stuff), ctx());
    const finished = cutMasses().reduce((a, b) => a + b, 0);

    expect(finished).toBeGreaterThan(thin);
  });

  it('⚠ a body with no stamped condition is an unremarkable one, not a perfect one', async () => {
    // A person's corpse, a fixture, anything that died with no `flesh`
    // reserve. It must not read as 100.
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body(SHEEP, 70, null) as unknown as Stuff), ctx());
    const unstamped = cutMasses().reduce((a, b) => a + b, 0);

    minted = [];
    await ctrl.execute(model(body(SHEEP, 70, 55) as unknown as Stuff), ctx());
    const stamped55 = cutMasses().reduce((a, b) => a + b, 0);

    minted = [];
    await ctrl.execute(model(body(SHEEP, 70, 100) as unknown as Stuff), ctx());
    const perfect = cutMasses().reduce((a, b) => a + b, 0);

    expect(unstamped).toBeCloseTo(stamped55, 1);
    expect(unstamped).toBeLessThan(perfect);
  });

  it('⭐ a COUNTED line is left alone — a hen is not dressed by share', async () => {
    // Nobody weighs a chicken carcass and takes shares off it. A dressed
    // reading of a 2.5 kg bird would hand out grams.
    species(HEN, [{ cut: MEAT, units: 2 }]);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body(HEN, 2.5, 55) as unknown as Stuff), ctx());

    expect(minted.length).toBeGreaterThan(0);
    // The row's own authored mass stands: the stub mints 1 kg cuts and
    // nothing rewrites them.
    for (const kg of cutMasses()) expect(kg).toBe(1);
  });

  it('⭐ a hide does not care what condition the beast was in', async () => {
    species(SHEEP, [
      { cut: HIDE, units: 1, fraction: 0.08, conditioned: false },
    ]);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(body(SHEEP, 70, 10) as unknown as Stuff), ctx());
    const starved = cutMasses().reduce((a, b) => a + b, 0);

    minted = [];
    await ctrl.execute(model(body(SHEEP, 70, 100) as unknown as Stuff), ctx());
    const finished = cutMasses().reduce((a, b) => a + b, 0);

    expect(starved).toBeCloseTo(finished, 2);
  });
});

describe('the refusals, in the order they are spoken', () => {
  it('⚠⚠ a LIVE animal is told which act it wants, and told last', async () => {
    // The old order refused this with "is not a carcass" before reading
    // anything about the animal, which taught nobody anything.
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const ewe = body(SHEEP, 70, 55);
    ewe.setLifecycleState('alive');

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(ewe as unknown as Stuff), ctx());

    expect(reasons()).toContain('still-alive');
    expect(minted).toEqual([]);
  });

  it('⭐ a live animal with NO yield is refused for that instead', async () => {
    // The more specific truth wins: *there is nothing on it worth
    // cutting* is permanently true of a collie and *it is alive* is not.
    species(DOG, []);
    const collie = body(DOG, 20, 55);
    collie.setLifecycleState('alive');

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(collie as unknown as Stuff), ctx());

    expect(reasons()).toContain('no-yield');
    expect(reasons()).not.toContain('still-alive');
  });

  it('⚠ a live SENTIENT thing is refused before anything else is read', async () => {
    species(PERSON, [{ cut: MEAT, units: 8, fraction: 0.4 }], true);
    const somebody = body(PERSON, 70, 55);
    somebody.setLifecycleState('alive');

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(somebody as unknown as Stuff), ctx());

    expect(reasons()).toContain('sentient-corpse');
    expect(reasons()).not.toContain('still-alive');
  });

  it('⭐⭐ a live NAMED animal is refused for being named', async () => {
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const moss = makeStuff(() => new NamedBody());
    moss.setLifecycleState('alive');
    moss.setMass(Quantity.of(70, 'kg'));
    moss.setSpecies(
      StuffApi.findByTemplatePath(SHEEP) as unknown as Species,
    );
    moss.setName('Moss');
    ContainmentApi.move(moss as unknown as Stuff, room);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(moss as unknown as Stuff), ctx());

    expect(reasons()).toContain('named-animal');
    expect(reasons()).not.toContain('still-alive');
  });

  it('⚠⚠ a BODY cannot be named at all — the check is structural', async () => {
    // `Creature` composes no `NamedMixin`, so a `Corpse` has nowhere to
    // put a name and the mint stamps none. A dead pet's body therefore
    // butchers, which is a recorded deferred seam rather than something
    // pretended away: the refusal lives on the LIVING animal, where the
    // decision actually is.
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const dead = body(SHEEP, 70, 55);
    expect(MixinApi.isNamed(dead as unknown as Stuff)).toBe(false);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(dead as unknown as Stuff), ctx());

    expect(reasons()).not.toContain('named-animal');
    expect(minted.length).toBeGreaterThan(0);
  });

  it('⚠ …and a named BODY is still not refused, because death is not a pet', async () => {
    // Even where the host could hold one: the gate reads `isAlive()`
    // first, so a body is a body. Keeping the name on a corpse would mean
    // a dead pet could never be dealt with at all.
    species(SHEEP, [{ cut: MEAT, units: 12, fraction: 0.4 }]);
    const moss = makeStuff(() => new NamedBody());
    moss.setLifecycleState('dead');
    moss.setMass(Quantity.of(70, 'kg'));
    moss.setSpecies(
      StuffApi.findByTemplatePath(SHEEP) as unknown as Species,
    );
    moss.setName('Moss');
    ContainmentApi.move(moss as unknown as Stuff, room);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(moss as unknown as Stuff), ctx());

    expect(reasons()).not.toContain('named-animal');
  });

  it('a thing that is not an organism at all says so', async () => {
    const chair = makeStuff(() => new Provision());
    ContainmentApi.move(chair as unknown as Stuff, room);

    const ctrl = makeStuff(() => new ButcherController());
    await ctrl.execute(model(chair as unknown as Stuff), ctx());

    expect(reasons()).toContain('not-a-carcass');
  });
});
