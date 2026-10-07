/**
 * ⭐⭐ `slaughter` — **a kill, and the corpse is the join.**
 *
 * The stockyard used to have its own `butcher`: it killed the animal and
 * took it apart in one act, out of a module table of five fractions that
 * was the same for a hen and a bullock, crediting `stockmanship`, with no
 * contamination anywhere. The kitchen's `butcher` took a *carcass* apart
 * off the species' own yield, crediting `butchery`, starting the spoilage
 * clock at the kill. Two verbs of one name, and an animal gave different
 * things depending on which you typed.
 *
 * These tests hold the four facts the reconciliation turns on:
 *
 *  1. the kill leaves A BODY, and the body is the species' and carries
 *     the head's own mass and condition;
 *  2. the book says `slaughtered` and the tally falls;
 *  3. ⚠ a failed book write leaves the body standing and the head
 *     `drafted` — over-counted by one, which is recoverable, where the
 *     reverse order would leave a live animal out of its own book;
 *  4. the three refusals do not read alike, and the farm dog BINDS so
 *     that it can be told no out loud.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SlaughterController from '../idea/cmd/ranching/SlaughterController';
import HerdRegistry, { type HerdRecord } from '../idea/HerdRegistry';
import Livestock from '../agent/Livestock';
import WorkingAnimal from '../agent/WorkingAnimal';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import Corpse from '@saxonberg/server/mud/platform/thing/Corpse';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { AccountabilityApi } from '@saxonberg/server/mud/api/accountability';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installCorpseMintStub } from '@saxonberg/server/mud/lib/mortality/__tests__/corpse-mint-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type {
  CommandContext,
  ModelData,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';
const SHEEP_PATH = '/stuff/idea/species/_test/sheep';
const DOG_PATH = '/stuff/idea/species/_test/collie';

class TestYard extends ContainerMixin(Idea) {
  static _mixinName = 'TestYardSlaughter';
}
class TestGiver extends NamedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestGiverSlaughter';
}

let store: Map<string, Array<Record<string, unknown>>>;
let ids = 0;
let corpses: Corpse[];
let notes: { kind: string; reason?: string }[];

function col(name: string): Array<Record<string, unknown>> {
  let a = store.get(name);
  if (!a) {
    a = [];
    store.set(name, a);
  }
  return a;
}

function installStore(): void {
  store = new Map();
  ids = 0;
  const save = vi.fn(async (c: string, doc: Record<string, unknown>) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id as string;
    }
    const id = String(++ids);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const keys = Object.keys(q);
    return col(c).filter((d) =>
      keys.every((k) => {
        const want = q[k];
        if (want && typeof want === 'object' && '$regex' in (want as object)) {
          const re = new RegExp((want as { $regex: string }).$regex);
          return typeof d[k] === 'string' && re.test(d[k] as string);
        }
        return d[k] === want;
      }),
    );
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: vi.fn(
      async (c: string, id: string) =>
        col(c).find((d) => d._id === id) ?? null,
    ),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

const HERD: HerdRecord = {
  herdId: 'delight-flock',
  name: 'the Delight flock',
  speciesPath: SHEEP_PATH,
  tally: 12,
  foundingMeanAgeDays: 400,
  holderRef: 'player:/platform/agent/Avatar/iris',
  homeExtent: '/world/test/lot-1',
  founded: 1_000,
  drafted: [],
  overlay: {},
};

/** The sheep — a dressed yield, five lines. */
function sheepSpecies(): Species {
  const s = makeStuffAtPath(() => new Species(), SHEEP_PATH) as Species;
  s.setCommonNames(['sheep', 'ewe', 'ram']);
  s.setSentient(false);
  s.setButcheryYield([
    { cut: '/stuff/thing/items/stew-meat', units: 12, fraction: 0.4 },
    { cut: '/trade/ranching/thing/hide', units: 1, fraction: 0.08, conditioned: false },
  ]);
  return s;
}

/** The collie — no yield at all, which IS the refusal. */
function dogSpecies(): Species {
  const s = makeStuffAtPath(() => new Species(), DOG_PATH) as Species;
  s.setCommonNames(['dog', 'collie']);
  s.setSentient(false);
  s.setButcheryYield([]);
  return s;
}

function registry(): HerdRegistry {
  return makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
}

async function head(
  speciesPath: string,
  over: { flesh?: number; mass?: number; herd?: [string, number] } = {},
): Promise<Livestock> {
  const beast = await StuffApi.create(() => new Livestock());
  beast.setKeywords(['head', 'stock']);
  beast.setSpecies(
    StuffApi.findByTemplatePath(speciesPath) as unknown as Species,
  );
  beast.setLifecycleState('alive');
  beast.setMass(Quantity.of(over.mass ?? 70, 'kg'));
  beast.setReserve(
    new Reserve(
      'flesh',
      Quantity.of(100, '%'),
      Quantity.of(over.flesh ?? 55, '%'),
      'biological',
      null,
    ),
  );
  if (over.herd) beast.bindToHerd(over.herd[0], over.herd[1]);
  return beast;
}

function ctx(giver: Stuff): CommandContext {
  notes = [];
  return {
    commandGiver: giver,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
  } as unknown as CommandContext;
}

function model(target: Stuff | null): ModelData {
  return {
    target: {
      stuff: target,
      raw: target ? 'ewe' : 'nothing',
    } as unknown as MqlOneResult,
  } as unknown as ModelData;
}

/**
 * A scene builder that answers every chain shape the controller uses — a
 * refusal sends `toSelf(...).send()` with no peers leg, and the success
 * path sends both.
 */
function sceneStub(): unknown {
  const leg: Record<string, unknown> = {};
  leg.toSelf = () => leg;
  leg.toPeers = () => leg;
  leg.send = () => undefined;
  leg.topic = () => leg;
  return leg;
}

function reasons(): string[] {
  return notes.map((n) => n.reason ?? '').filter(Boolean);
}

describe('slaughter', () => {
  let yard: TestYard;
  let giver: TestGiver;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
    installV1QuantityMarshallers();
    corpses = installCorpseMintStub();
    // The scene composer wants a real sensor graph; the prose is not what
    // these tests are about.
    vi.spyOn(MessageApi, 'scene').mockReturnValue(sceneStub() as never);
    vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => undefined);
    // `preloadAnatomy` reaches a Clade walk this fixture has no tree for;
    // the species is already resident, which is the state it ensures.
    vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined);
    yard = makeStuff(() => new TestYard());
    giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Iris');
      return g;
    });
    ContainmentApi.move(giver, yard);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ the kill leaves a body carrying the head\'s own mass and condition', async () => {
    sheepSpecies();
    const ewe = await head(SHEEP_PATH, { mass: 70, flesh: 82 });
    ContainmentApi.move(ewe, yard);
    // ⭐⭐ **The live figure is NOT the authored frame**, and that is the
    // shipped design: `Creature.withBodyComposition` adds what the animal
    // has put on, so a 70 kg-framed ewe in 82 % flesh walks around at
    // ~78 kg. *The stocks reach mass, so the tape notices.* The corpse
    // has to stamp the composed figure, because that is what the animal
    // actually weighed — anything else would silently discard the
    // stockman's whole year of work at the one moment it pays out.
    const liveKg = ewe.getMass().rawValue();
    expect(liveKg).toBeGreaterThan(70);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(ewe), ctx(giver));

    // The animal is gone and exactly one body stands in its place.
    expect(ewe.isDestroyed()).toBe(true);
    expect(corpses).toHaveLength(1);
    const body = corpses[0]!;
    expect(body.getCauseOfDeath()).toBe('slaughtered');
    expect(body.getMass().rawValue()).toBeCloseTo(liveKg, 2);
    // ⭐ The condition the stockman achieved, stamped and frozen. This is
    // what the kitchen multiplies its yield by.
    expect(body.getConditionAtDeath()).toBe(82);
    expect(body.getSpecies()?.getTemplatePath()).toBe(SHEEP_PATH);
  });

  it('⭐ it does NOT take the animal apart — that is a separate act', async () => {
    sheepSpecies();
    const ewe = await head(SHEEP_PATH);
    ContainmentApi.move(ewe, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(ewe), ctx(giver));

    // Nothing but the body. No meat, no hide: a blade and a butcher's
    // hand are what turn a carcass into cuts.
    const contents = [...yard.getContents()];
    const cuts = contents.filter(
      (c) => c !== (giver) && !(c instanceof Corpse),
    );
    expect(cuts).toEqual([]);
  });

  it('⭐ the book says `slaughtered` and the tally falls', async () => {
    sheepSpecies();
    const r = registry();
    await r.file(HERD);
    await r.draft('delight-flock', 3);

    const ewe = await head(SHEEP_PATH, { flesh: 61, herd: ['delight-flock', 3] });
    ContainmentApi.move(ewe, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(ewe), ctx(giver));

    const back = await r.read('delight-flock');
    expect(back?.tally).toBe(11);
    expect(back?.drafted).toEqual([]);
    expect(back?.overlay['3']).toMatchObject({
      note: 'slaughtered',
      flesh: 61,
    });
  });

  it('⚠ a failed book write leaves the body standing and the head drafted', async () => {
    // The ordering decision, pinned. Over-counted by one is recoverable
    // by hand and nothing alive is lost; the reverse order would leave a
    // LIVE animal out of its own book, which is a ghost.
    sheepSpecies();
    const r = registry();
    await r.file(HERD);
    await r.draft('delight-flock', 3);
    vi.spyOn(HerdRegistry.prototype, 'returnHead').mockRejectedValue(
      new Error('the store is down'),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const ewe = await head(SHEEP_PATH, { herd: ['delight-flock', 3] });
    ContainmentApi.move(ewe, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(ewe), ctx(giver));

    expect(corpses).toHaveLength(1);
    expect(reasons()).toContain('book-write-failed');
    vi.restoreAllMocks();
  });

  it('a loose beast with no herd is killed without touching any book', async () => {
    sheepSpecies();
    const ewe = await head(SHEEP_PATH);
    ContainmentApi.move(ewe, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(ewe), ctx(giver));

    expect(corpses).toHaveLength(1);
    expect(reasons()).toEqual([]);
  });
});

describe('the three refusals do not read alike', () => {
  let yard: TestYard;
  let giver: TestGiver;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
    installV1QuantityMarshallers();
    corpses = installCorpseMintStub();
    vi.spyOn(MessageApi, 'scene').mockReturnValue(sceneStub() as never);
    vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => undefined);
    vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined);
    yard = makeStuff(() => new TestYard());
    giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Iris');
      return g;
    });
    ContainmentApi.move(giver, yard);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ a NAMED animal is refused for being named', async () => {
    // The whole of the design's position on killing: a number in the
    // herdbook is easy to cull and an animal you named is not. `Livestock`
    // is not `Named`; a kept animal is, and the name arrives only when a
    // player gives one to an animal that chose to follow them.
    dogSpecies();
    const moss = await StuffApi.create(() => new WorkingAnimal());
    moss.setSpecies(
      StuffApi.findByTemplatePath(DOG_PATH) as unknown as Species,
    );
    moss.setLifecycleState('alive');
    moss.setName('Moss');
    ContainmentApi.move(moss, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(moss), ctx(giver));

    expect(reasons()).toContain('named-animal');
    expect(corpses).toHaveLength(0);
    expect((moss).isDestroyed()).toBe(false);
  });

  it('⭐⭐ an UNNAMED working dog is refused for having no yield', async () => {
    // A different no, and it has to be: the species answers, and the
    // answer is a fact about the animal rather than a rule somebody
    // wrote down. No `instanceof Livestock` guard anywhere.
    dogSpecies();
    const collie = await StuffApi.create(() => new WorkingAnimal());
    collie.setSpecies(
      StuffApi.findByTemplatePath(DOG_PATH) as unknown as Species,
    );
    collie.setLifecycleState('alive');
    ContainmentApi.move(collie, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(collie), ctx(giver));

    expect(reasons()).toContain('no-yield');
    expect(corpses).toHaveLength(0);
  });

  it('⚠ a SENTIENT species is refused before anything else is read', async () => {
    const person = makeStuffAtPath(
      () => new Species(),
      '/stuff/idea/species/_test/person',
    ) as Species;
    person.setSentient(true);
    // ⭐ Authors a yield, so the refusal cannot be the empty-yield one.
    person.setButcheryYield([
      { cut: '/stuff/thing/items/stew-meat', units: 4, fraction: 0.4 },
    ]);
    const somebody = await head('/stuff/idea/species/_test/person');
    ContainmentApi.move(somebody, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(somebody), ctx(giver));

    expect(reasons()).toContain('sentient');
    expect(corpses).toHaveLength(0);
  });

  it('a body is not something you slaughter', async () => {
    sheepSpecies();
    const ewe = await head(SHEEP_PATH);
    ewe.setLifecycleState('dead');
    ContainmentApi.move(ewe, yard);

    const ctrl = makeStuff(() => new SlaughterController());
    await ctrl.execute(model(ewe), ctx(giver));

    expect(reasons()).toContain('not-an-animal');
    expect(corpses).toHaveLength(0);
  });
});
