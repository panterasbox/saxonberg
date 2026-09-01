/**
 * The Sunken Delve — the concealment/traps demonstrator, driven end-to-end
 * over the REAL authored seed YAMLs (loaded from disk, so a seed typo in a
 * class path / delivery / concealment is caught here). Stands up the whole
 * sphere fresh per test from a single anchor (`singleton(vestibule)` cascades
 * every room + clones every trap + secret), then drives the real seams:
 *
 *   - CONTENT DISCIPLINE (the required check): a zero-awareness mover walks
 *     the plainly-visible exit chain to the far vault — the real traps wound
 *     and redirect along the way but never gate — and reaches it WITHOUT
 *     discovering any secret (no critical content behind a perception wall);
 *   - care↔speed over the real corridor traps: a walk springs the hidden
 *     dart a sneak avoids; a run springs the subtle blade a walk avoids;
 *   - armor mitigates: a steel-plate-booted foot takes strictly less (or no)
 *     trauma than a bare one (the covering stack, for free);
 *   - fly clears the ground spike pit;
 *   - `search` reveals the concealed secret exit + the hidden cache (absent
 *     before, present + traversable/openable after);
 *   - `disarm` a found trap (found-gated).
 *
 * Deterministic — every spring/avoid is a pure function of discovery +
 * perception + medium; no RNG. Mongo faked (in-memory store), scene stubbed.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import YAML from 'yaml';
import Trap from '../../../platform/thing/Trap';
import { HazardDelivery } from '../../../lib/hazard/HazardDelivery';
import SearchController from '../../../platform/idea/cmd/perception/SearchController';
import DisarmController from '../../../platform/idea/cmd/device/DisarmController';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../../lib/stuff/Thing';
import Exit from '../../../lib/boundary/Exit';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { SensorMixin } from '../../../lib/message/Sensor';
import { BeliefStoreMixin } from '../../../lib/belief/BeliefStore';
import { WearableMixin } from '../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { Construction } from '../../../lib/material/Construction';
import Material from '../../../lib/material/Material';
import { Quantity } from '../../../lib/quantity';
import { Postures } from '../../../lib/slot/Postured';
import { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { LocomotionApi } from '../../../api/locomotion';
import { AdvancementApi } from '../../../api/advancement';
import { SpeciesApi } from '../../../api/species';
import { BiomeApi } from '../../../api/biome';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { CommandApi, type CommandContext } from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import Location from '../../../lib/stuff/Location';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { EventApi } from '../../../api/event';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../platform/idea/Condition';
import type Interactive from '../../../platform/idea/Interactive';

const PH = PersistentHydrator.templatePath;
// The trap rows are the generic-objects pack's (content-packs wave 3).
const SEEDS = fileURLToPath(new URL('../../../../../../content/generic-objects/content', import.meta.url));
/** The newbie-wilds content now ships as a pack; resolve its root the way
 *  the installer does (module resolution of the workspace package). */
const WILDS = join(
  dirname(createRequire(import.meta.url).resolve('@saxonberg/content-newbie-wilds/package.json')),
  'content',
);

type Doc = Record<string, unknown> & { path: string; class: string };

/** Read one seed YAML → a store Doc at the given template path. */
function seedDoc(file: string, path: string): Doc {
  const parsed = YAML.parse(readFileSync(file, 'utf-8')) as Record<
    string,
    unknown
  >;
  return {
    path,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

/** Load every `*.yaml` in `dir`, mapping each to a template path under `prefix`. */
function loadSeedDir(dir: string, prefix: string): Doc[] {
  const out: Doc[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isFile() || !entry.endsWith('.yaml')) continue;
    const leaf = entry.replace(/\.yaml$/, '');
    out.push(seedDoc(full, `${prefix}/${leaf}`));
  }
  return out;
}

/** The whole in-memory store: PH + the delve zone + its rooms + the generic
 *  trap objects (now homed in `/stuff/thing/traps/`) + a treeline stub. */
function trapsStore(): Doc[] {
  return [
    { path: PH, class: PH, data: {} },
    // The delve zone — now a sub-area of the newbie-wilds locality.
    seedDoc(
      join(WILDS, 'world', 'newbie-wilds', 'delve.yaml'),
      '/world/newbie-wilds/delve',
    ),
    // The delve's rooms + fixtures (the hidden cache, the vault reward).
    ...loadSeedDir(
      join(WILDS, 'world', 'newbie-wilds', 'delve'),
      '/world/newbie-wilds/delve',
    ),
    // The generic trap objects, cloned into the corridors via `props`.
    ...loadSeedDir(join(SEEDS, 'stuff', 'thing', 'traps'), '/stuff/thing/traps'),
    // The treeline the vestibule's back-out exit cascades — stubbed as a bare
    // void (the real treeline, with its wolf, is never stood up by a test).
    {
      path: '/world/newbie-wilds/crossroads/treeline',
      class: '/platform/location/VoidLocation',
      hydratorClass: PH,
      data: { shortDescription: 'the treeline' },
    },
  ];
}

/** Install an in-memory (offline) PersistenceManager over `docs`. */
function installStore(docs: Doc[]): void {
  const store = docs.map((d, i) => ({ _id: String(i + 1), ...d }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => false,
    save: vi.fn(async () => '1'),
    find: vi.fn(async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    }),
    findById: vi.fn(
      async (_c: string, id: string) => store.find((d) => d._id === id) ?? null,
    ),
  } as unknown as PersistenceManager);
}

// A delver: Mobile (traverses + springs traps) + Sensor + BeliefStore (records
// discovery) over Creature (anatomy the delivery lands a foot-site against).
// NOT Engaged — so `search` / `disarm` take their synchronous fallback (no
// scheduler needed; the durative interrupt path is covered by the unit tests).
class Delver extends BeliefStoreMixin(MobileMixin(SensorMixin(Creature))) {
  static _mixinName = 'TrapDelver';
  protected override handleMessage(): void {}
  protected override handleEnvelope(): void {}
}

// A steel-plate boot — a Constructed Wearable covering the feet.
class DemoBoot extends WearableMixin(SlottableMixin(ConstructedMixin(Thing))) {
  static _mixinName = 'DemoTrapBoot';
}

const FEET = ['body.leg.left.foot', 'body.leg.right.foot'];
let n = 0;
let bodyplanPath = '';
let sharedSpecies: Species;

function footedBodyPlan(): BodyPlan {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('demo-biped');
  plan.setSlots([
    {
      name: 'feet',
      accepts: 'WearableMixin',
      covers: ['body.leg.left.foot', 'body.leg.right.foot'],
    },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.left.foot', parent: 'body.leg.left', tissues: [] },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.right.foot', parent: 'body.leg.right', tissues: [] },
  ]);
  stampTemplatePathForTest(plan, bodyplanPath);
  return plan;
}

let delverCounter = 0;
function delver(): Delver {
  const c = makeStuff(() => new Delver());
  c.setSpecies(sharedSpecies);
  stampTemplatePathForTest(c, `/platform/agent/Avatar/delver-${n}-${++delverCounter}`);
  return c;
}

/** Warm a delver's `awareness` band into the sync detection cache. */
async function warm(c: Delver, band: string): Promise<void> {
  vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue(band as never);
  vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined as never);
  await PerceptionApi.preloadForSenseGate(c);
}

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setName('steel');
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, `/stuff/idea/material/alloy/steel-td-${n}-${++delverCounter}`);
  return m;
}

function bootOn(c: Delver): void {
  const boot = makeStuff(() => new DemoBoot());
  boot.setSlotClaim(bodyplanPath, ['feet']);
  boot.setMaterial(steel());
  boot.setConstruction(Construction.of('plate'));
  c.occupy(boot, 'feet');
}

function wound(m: Creature): Trauma | undefined {
  return m.getConditions().find((x) => x.kind === 'trauma') as
    | Trauma
    | undefined;
}

// --- room / trap / secret accessors over the stood-up real zone -----------
function room(leaf: string): Stuff & Location {
  return StuffApi.findByTemplatePath(
    `/world/newbie-wilds/delve/${leaf}`,
  ) as unknown as Stuff & Location;
}
function trapIn(leaf: string): Trap {
  return (room(leaf) as unknown as { getContents(): Stuff[] })
    .getContents()
    .find((c): c is Trap => c instanceof Trap)!;
}
/** The concealed non-trap Thing in a room (the hidden cache). */
function cacheIn(leaf: string): Stuff {
  return (room(leaf) as unknown as { getContents(): Stuff[] })
    .getContents()
    .find(
      (c) =>
        !(c instanceof Trap) &&
        MixinApi.isConcealable(c) &&
        c.getConcealment() !== 'obvious',
    )!;
}

// --- command drivers (real controllers) -----------------------------------
function ctx(actor: Delver, location: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    interactive: {} as Interactive,
    location: location as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}
function targetOf(giver: Delver, raw: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: giver as never,
    scope: 'reachable',
  });
  const bound: MqlOneResult = { stuff: r.stuff, raw };
  if (r.via) bound.via = r.via;
  return bound;
}

beforeEach(async () => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  installStore(trapsStore());
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    for (const m of ['topic', 'toSelf', 'toPeers', 'to', 'send']) {
      b[m] = () => b;
    }
    return b as never;
  });
  // The arrival flow's respiration/atmosphere reassess resolves the biome
  // chain (async, detached from the traverse) — short-circuit it.
  vi.spyOn(BiomeApi, 'resolveAtmosphereFor').mockResolvedValue('air' as never);
  // Movement fires events → bootstrap the registry.
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  n++;
  delverCounter = 0;
  bodyplanPath = `/stuff/idea/species/BodyPlan/traps-biped-${n}`;
  sharedSpecies = makeStuff(() => new Species());
  sharedSpecies.setBodyPlan(footedBodyPlan());
  stampTemplatePathForTest(sharedSpecies, `/stuff/idea/species/traps/biped-${n}`);
  // Stand the whole sphere up from a single anchor (cascades every room +
  // clones every trap + secret).
  await StuffApi.singleton('/world/newbie-wilds/delve/vestibule');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('The Sunken Delve — real-seed standup', () => {
  it('stands up the whole sphere: rooms, traps, secrets, obvious reward', () => {
    for (const leaf of [
      'vestibule',
      'corridor-1',
      'corridor-2',
      'corridor-3',
      'vault',
      'pit-below',
    ]) {
      expect(room(leaf)).toBeTruthy();
    }
    // Three distinct authored trap points (zero new classes — field combos).
    const dart = trapIn('corridor-1');
    expect(dart.getConcealment()).toBe('hidden');
    expect(dart.getDelivery().channel).toBe('point');
    expect(dart.getDelivery().hasToxin()).toBe(true);
    expect(dart.getTraverseConsequence()).toBe('none');

    const pit = trapIn('corridor-2');
    expect(pit.getConcealment()).toBe('hidden');
    expect(pit.getDelivery().channel).toBe('point');
    expect(pit.getTraverseConsequence()).toBe('drop');
    expect(pit.getDropDestination()).toBe('/world/newbie-wilds/delve/pit-below');
    expect(pit.isGroundTriggered()).toBe(true);

    const blade = trapIn('corridor-3');
    expect(blade.getConcealment()).toBe('subtle');
    expect(blade.getDelivery().channel).toBe('edge');
    expect(blade.getTraverseConsequence()).toBe('trip');

    // The secret shortcut exit (concealed) + the hidden cache (concealed).
    const secret = (room('corridor-1') as unknown as {
      getExit(d: string): Exit | undefined;
    }).getExit('east')!;
    expect(secret.isConcealed()).toBe(true);
    expect(cacheIn('corridor-1').getTemplatePath()).toBe(
      '/world/newbie-wilds/delve/hidden-cache',
    );
  });
});

describe('The Sunken Delve — content discipline (the required invariant)', () => {
  it('a zero-awareness mover reaches the vault WITHOUT discovering any secret', async () => {
    const m = delver(); // never warmed → capacity 0 (untrained floor)
    ContainmentApi.move(m, room('vestibule') as never);

    const exit = (r: string, dir: string): Exit =>
      (room(r) as unknown as { getExit(d: string): Exit }).getExit(dir);

    // vestibule -> corridor-1 (the hidden dart springs: wounded, not blocked)
    await m.traverse(exit('vestibule', 'north'), 'walk');
    expect(m.getContainer()).toBe(room('corridor-1'));
    expect(trapIn('corridor-1').getHazardState()).toBe('sprung');

    // corridor-1 -> corridor-2 (the hidden pit springs: DROP to the pit-below)
    await m.traverse(exit('corridor-1', 'north'), 'walk');
    expect(m.getContainer()).toBe(room('pit-below'));
    expect(trapIn('corridor-2').getHazardState()).toBe('sprung');

    // recover: climb up (the pit is spent — re-crossing does not re-drop)
    await m.traverse(exit('pit-below', 'up'), 'walk');
    expect(m.getContainer()).toBe(room('corridor-2'));

    // corridor-2 -> corridor-3 (the subtle blade trips: knocked prone)
    await m.traverse(exit('corridor-2', 'north'), 'walk');
    expect(m.getContainer()).toBe(room('corridor-3'));
    expect(m.getPosture()).toBe(Postures.Lie);
    m.setPosture(Postures.Stand); // pick yourself up

    // corridor-3 -> the vault: the destination is REACHED
    await m.traverse(exit('corridor-3', 'north'), 'walk');
    expect(m.getContainer()).toBe(room('vault'));

    // ...and NO secret was discovered along the plainly-visible path.
    const secret = (room('corridor-1') as unknown as {
      getExit(d: string): Exit;
    }).getExit('east');
    expect(PerceptionApi.hasDiscovered(m, secret as never)).toBe(false);
    expect(PerceptionApi.hasDiscovered(m, cacheIn('corridor-1') as never)).toBe(
      false,
    );
    // The OBVIOUS reward is plainly perceivable — no perception wall on it.
    const reward = (room('vault') as unknown as {
      getContents(): Stuff[];
    })
      .getContents()
      .find((c) => c instanceof Thing && !(c instanceof Trap))!;
    expect(PerceptionApi.perceives(m, reward)).toBe(true);
  });
});

describe('The Sunken Delve — care↔speed over the real corridor traps', () => {
  it('a WALK springs the hidden corridor dart (novice capacity 3 < 4)', async () => {
    const m = delver();
    ContainmentApi.move(m, makeStuff(() => new Location()) as never);
    await warm(m, 'novice');
    const dart = trapIn('corridor-1');
    dart.resolveTraversal(m, 'walk');
    expect(dart.getHazardState()).toBe('sprung');
    expect(wound(m)).toBeDefined();
  });

  it('a SNEAK avoids that same hidden dart (novice 3 + 2 >= 4)', async () => {
    const m = delver();
    ContainmentApi.move(m, makeStuff(() => new Location()) as never);
    await warm(m, 'novice');
    const dart = trapIn('corridor-1');
    dart.resolveTraversal(m, 'sneak');
    expect(dart.isArmed()).toBe(true); // stepped around it
    expect(wound(m)).toBeUndefined();
  });

  it('a WALK avoids the subtle corridor blade (novice 3 >= 2)', async () => {
    const m = delver();
    ContainmentApi.move(m, makeStuff(() => new Location()) as never);
    await warm(m, 'novice');
    const blade = trapIn('corridor-3');
    blade.resolveTraversal(m, 'walk');
    expect(blade.isArmed()).toBe(true);
    expect(wound(m)).toBeUndefined();
  });

  it('a RUN springs that same subtle blade (novice 3 - 2 = 1 < 2)', async () => {
    const m = delver();
    ContainmentApi.move(m, makeStuff(() => new Location()) as never);
    await warm(m, 'novice');
    const blade = trapIn('corridor-3');
    blade.resolveTraversal(m, 'run');
    expect(blade.getHazardState()).toBe('sprung');
    expect(wound(m)).toBeDefined();
  });
});

describe('The Sunken Delve — armor + medium', () => {
  it('armor mitigates: a plate-booted foot takes strictly less than a bare one', () => {
    // Two identically-configured traps mirroring the corridor dart's edge
    // delivery (one-shot springs, so a fair bare-vs-booted comparison needs
    // one trap each — the covering stack does the rest, for free).
    const spec = { channel: 'edge' as const, energy: 2, siteSelector: FEET };
    const freshTrap = (): Trap => {
      const t = makeStuff(() => new Trap());
      t.setDelivery(new HazardDelivery(spec));
      t.setConcealment('hidden');
      stampTemplatePathForTest(t, `/obj/test/armor-trap-${n}-${++delverCounter}`);
      return t;
    };

    const bare = delver();
    ContainmentApi.move(bare, makeStuff(() => new Location()) as never);
    freshTrap().resolveTraversal(bare, 'walk');

    const shod = delver();
    bootOn(shod);
    ContainmentApi.move(shod, makeStuff(() => new Location()) as never);
    freshTrap().resolveTraversal(shod, 'walk');

    const bw = wound(bare);
    const sw = wound(shod);
    // The bare foot is cut; the plate boot deflects it entirely (or at least
    // strictly reduces the wound) — the covering stack, mitigating for free.
    expect(bw).toBeDefined();
    expect(sw === undefined || sw.severity < bw!.severity).toBe(true);
  });

  it('a bare foot IS wounded walking the real corridor dart', async () => {
    const m = delver();
    ContainmentApi.move(m, room('vestibule') as never);
    const exit = (room('vestibule') as unknown as {
      getExit(d: string): Exit;
    }).getExit('north');
    await m.traverse(exit, 'walk');
    expect(wound(m)).toBeDefined();
    expect(wound(m)!.site.startsWith('body.leg')).toBe(true);
    expect(trapIn('corridor-1').getHazardState()).toBe('sprung');
  });

  it('fly clears the ground spike pit (air medium)', () => {
    const m = delver();
    ContainmentApi.move(m, room('corridor-2') as never);
    vi.spyOn(LocomotionApi, 'modeOf').mockReturnValue({
      getMedium: () => 'air',
    } as never);
    const pit = trapIn('corridor-2');
    pit.resolveTraversal(m, 'fly');
    expect(pit.isArmed()).toBe(true); // flew over it — never sprang
    expect(wound(m)).toBeUndefined();
    expect(m.getContainer()).toBe(room('corridor-2')); // no drop
  });
});

describe('The Sunken Delve — search reveals the secrets', () => {
  it('search turns up the concealed shortcut exit AND the hidden cache', async () => {
    const m = delver();
    ContainmentApi.move(m, room('corridor-1') as never);
    const secret = (room('corridor-1') as unknown as {
      getExit(d: string): Exit;
    }).getExit('east');
    const cache = cacheIn('corridor-1');

    // Before: neither the secret exit nor the cache is in the mover's world.
    expect(PerceptionApi.perceives(m, secret as never)).toBe(false);
    expect(PerceptionApi.perceives(m, cache)).toBe(false);
    expect(
      (room('corridor-1') as unknown as {
        obviousExitsFor(v: Stuff): Exit[];
      }).obviousExitsFor(m as never),
    ).not.toContain(secret);
    expect(targetOf(m, 'east').stuff).toBeNull();

    // Search the corridor — the broad scan (untrained + searchBonus 4 reaches
    // `hidden` = 4) discovers both. Not Engaged → resolves synchronously.
    await makeStuff(() => new SearchController()).execute(
      {},
      ctx(m, room('corridor-1'), 'search'),
    );

    // After: both are discovered, present, and usable.
    expect(PerceptionApi.hasDiscovered(m, secret as never)).toBe(true);
    expect(PerceptionApi.hasDiscovered(m, cache)).toBe(true);
    expect(PerceptionApi.perceives(m, secret as never)).toBe(true);
    expect(PerceptionApi.perceives(m, cache)).toBe(true);
    expect(
      (room('corridor-1') as unknown as {
        obviousExitsFor(v: Stuff): Exit[];
      }).obviousExitsFor(m as never),
    ).toContain(secret);
    // The revealed shortcut resolves as a walkable target.
    expect(targetOf(m, 'east').stuff).not.toBeNull();
  });
});

describe('The Sunken Delve — disarm is found-gated', () => {
  it('cannot disarm the dart until it is found, then can', async () => {
    const m = delver();
    ContainmentApi.move(m, room('corridor-1') as never);
    const dart = trapIn('corridor-1');
    const tgt = (): MqlOneResult =>
      ({ stuff: dart as unknown as Stuff, raw: 'dart' }) as MqlOneResult;

    // Undiscovered — you can't defuse what you can't see.
    await makeStuff(() => new DisarmController()).execute(
      { target: tgt() },
      ctx(m, room('corridor-1'), 'disarm'),
    );
    expect(dart.isArmed()).toBe(true);

    // Discover it, then disarm succeeds (sync — the delver isn't Engaged).
    PerceptionApi.recordDiscovery(m, dart as unknown as Stuff);
    await makeStuff(() => new DisarmController()).execute(
      { target: tgt() },
      ctx(m, room('corridor-1'), 'disarm'),
    );
    expect(dart.getHazardState()).toBe('disarmed');
  });
});
