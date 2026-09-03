/**
 * The anchored front door, end to end (TPA reform W4, AC18).
 *
 * ⭐ Two front doors, complementary rather than redundant: `cast
 * teleport` is arcana's **see-it-and-go** (the ordinary `reachable`
 * scope, a short hop across a room you are looking at); `teleport` is
 * the **anchored** door — the long hop to somewhere you are not, priced
 * by the same one cost function through the same one spell row.
 *
 * ⚠ And the anchored hop REFUSES a short pool rather than
 * overchannelling into it. Overchannelling is a fair price for a
 * firebolt you chose to force; paying it to travel would make strain the
 * ordinary cost of getting anywhere.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import TeleportController from '../idea/cmd/movement/TeleportController';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import SpellCatalogue from '@saxonberg/server/mud/platform/idea/SpellCatalogue';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { MANA_RESERVE_KEY } from '@saxonberg/server/mud/lib/magic/Caster';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { bearerOf } from '@saxonberg/server/mud/lib/encumbrance/__tests__/encumbrance-fixtures';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

class TestCharacter extends Character {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return 'expert';
  }
}

const SPELL_CLASS = '/platform/idea/magic/Spell';
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_SEEDS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../arcane-library/content/stuff/idea/magic/Spell',
);

let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;
let notes: Array<Record<string, unknown>> = [];
const elevations = new Map<Stuff, number | null>();

async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map(
      (f) =>
        (
          YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), 'utf-8')) as {
            data: Record<string, unknown>;
          }
        ).data,
    );
  const spy = vi
    .spyOn(Template, 'findByClass')
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (prefix !== SPELL_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(
      catalogueSingleton,
      '/platform/idea/SpellCatalogue',
    );
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

function room(elevation: number | null): SingletonCartesianLocation {
  const r = makeStuff(() => new SingletonCartesianLocation());
  stampTemplatePathForTest(r, `/platform/location/test/anch-${seq++}`);
  elevations.set(r as unknown as Stuff, elevation);
  return r;
}

function caster(): TestCharacter {
  const c = bearerOf(() => new TestCharacter(), 70);
  const species = c.getSpecies()!;
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(c, `/platform/agent/test/anch-caster-${seq++}`);
  c.installArcaneReserve();
  return c;
}

function ctx(giver: Stuff, location: Stuff): CommandContext {
  notes = [];
  return {
    commandGiver: giver,
    location,
    note: (n: Record<string, unknown>) => notes.push(n),
  } as unknown as CommandContext;
}

async function go(giver: Stuff, from: Stuff, raw: string): Promise<void> {
  const ctrl = makeStuff(() => new TeleportController());
  await ctrl.execute(
    { destination: { stuff: null, raw } } as CommandModel as never,
    ctx(giver, from),
  );
}

describe('the anchored front door — off the network entirely', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    elevations.clear();
    catalogueSingleton = null;
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    vi.spyOn(ZoneApi, 'elevationFor').mockImplementation(
      async (scope) => elevations.get(scope as unknown as Stuff) ?? null,
    );
    vi.spyOn(BiomeApi, 'resolveGravityFor').mockResolvedValue(
      Quantity.of(9.81, 'm/s²'),
    );
    vi.spyOn(AccessApi, 'heldExtents').mockResolvedValue([]);
    // No engagement capacity → the controller's degenerate fallback
    // resolves the cast inline, the same seam `CastController` uses for
    // a bare fixture. The scheduler's own arm has its own suite; what
    // is under test here is the anchored door and the price.
    vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(false as never);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('AC18 — a caster pays from their OWN pool, and lands', async () => {
    const c = caster();
    const here = room(0);
    const there = room(0);
    ContainmentApi.move(c as never, here as never);
    vi.spyOn(MqlApi, 'resolveMany').mockImplementation(
      (raw: string, o: { scope: string }) =>
        (o.scope === 'reachable' && raw === 'summit'
          ? { stuff: [there], raw }
          : { stuff: [], raw }) as never,
    );

    const before = c.getMana()!.current.rawValue();
    await go(c as unknown as Stuff, here as unknown as Stuff, 'summit');
    for (const n of notes) expect(n).not.toMatchObject({ kind: 'controller-rejected' });

    expect(
      (
        c as unknown as { getContainer(): { getTemplatePath(): string } }
      ).getContainer().getTemplatePath(),
    ).toBe(there.getTemplatePath());
    // A level hop is the authored survey FLOOR — 40 τ — off the caster's
    // own reserve. No terminal, no fare, no registration.
    expect(before - c.getMana()!.current.rawValue()).toBeCloseTo(40, 6);
  });

  it('AC18 — a SHORT pool refuses, rather than overchannelling into strain', async () => {
    const c = caster();
    const here = room(0);
    const summit = room(2000);
    ContainmentApi.move(c as never, here as never);
    vi.spyOn(MqlApi, 'resolveMany').mockImplementation(
      (raw: string, o: { scope: string }) =>
        (o.scope === 'reachable' && raw === 'summit'
          ? { stuff: [summit], raw }
          : { stuff: [], raw }) as never,
    );

    const before = c.getMana()!.current.rawValue();
    await go(c as unknown as Stuff, here as unknown as Stuff, 'summit');

    // 70 kg up 2 km is over a megajoule of τ — far past any pool.
    expect((c as unknown as { getContainer(): unknown }).getContainer()).toBe(
      here,
    );
    expect(c.getMana()!.current.rawValue()).toBe(before);
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' && n.reason === 'insufficient-mana',
      ),
    ).toBe(true);
  });

  it('a NON-caster gets the honest answer: no gift, and no gate here either', async () => {
    const c = caster();
    const here = room(0);
    const there = room(0);
    ContainmentApi.move(c as never, here as never);
    // A body with no faculty at all.
    const mundane = bearerOf(() => new TestCharacter(), 70);
    stampTemplatePathForTest(
      mundane,
      `/platform/agent/test/anch-mundane-${seq++}`,
    );
    ContainmentApi.move(mundane as never, here as never);
    vi.spyOn(MqlApi, 'resolveMany').mockImplementation(
      (raw: string, o: { scope: string }) =>
        (o.scope === 'reachable' && raw === 'summit'
          ? { stuff: [there], raw }
          : { stuff: [], raw }) as never,
    );

    await go(mundane as unknown as Stuff, here as unknown as Stuff, 'summit');
    expect(
      (mundane as unknown as { getContainer(): unknown }).getContainer(),
    ).toBe(here);
    expect(
      notes.some(
        (n) => n.kind === 'controller-rejected' && n.reason === 'no-faculty',
      ),
    ).toBe(true);
  });
});
