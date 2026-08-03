/**
 * The trigger-agnostic effect spine — wave 1's acceptance criteria.
 *
 * The whole point of the wave is that **one parameter was doing four
 * jobs**, and nothing could pull them apart. So these tests are written
 * around the case that proves it: an effect whose origin, actor and
 * source are three *different* objects.
 *
 * AC 1 — an explicit context; no executor reads a bare caster.
 * AC 2 — provenance records specified-by and fired-by separately, dispel
 *        keys on the tag, and the accountability row names the ACTOR.
 * AC 3 — one authored spell definition, two triggers, no duplicated data.
 * AC 3a — `Arcane` exposes a SET of typed cells; a spell-carrying item
 *        DERIVES its footprint; a grid-filtered ward matches ANY cell.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MagicApi } from '../../../api/magic';
import { AdvancementApi } from '../../../api/advancement';
import { AccountabilityApi } from '../../../api/accountability';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import SpellCatalogue from '../../../obj/SpellCatalogue';
import Spell from '../../../obj/magic/Spell';
import GlowlightOrb from '../../../obj/magic/GlowlightOrb';
import { Template } from '../../stuff/Template';
import Thing from '../../stuff/Thing';
import { Character } from '../../character/Character';
import Species from '../../../obj/species/Species';
import Room from '../../../obj/location/Room';
import { ArcaneMixin } from '../Arcane';
import { EffectContexts } from '../EffectContext';
import { Suppressions } from '../Suppression';
import { MagicGrid } from '../Grid';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A magic item: nothing but `Thing` + the grid-footprint declaration. */
class TestWand extends ArcaneMixin(Thing) {}
class TestCharacter extends Character {}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  '../../../seeds/obj/magic/Spell',
);

let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;

/** Warm a real SpellCatalogue from the authored roster seeds. */
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
    .spyOn(Template, 'findDescendants')
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (!prefix.startsWith(Spell.TEMPLATE_PATH_PREFIX)) return [];
      return seeds.map((seed) => ({
        path: `${Spell.TEMPLATE_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, '/obj/SpellCatalogue');
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

function makeActor(sentient = true): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(sentient);
  stampTemplatePathForTest(species, `/obj/species/test/ctx-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/ctx-actor-${n}`);
  actor.installArcaneReserve();
  return actor;
}

function makeWand(spellId: string, maker: string): TestWand {
  const wand = makeStuff(() => new TestWand());
  stampTemplatePathForTest(wand, `/obj/test/wand-${seq++}`);
  wand.setCarriedSpellId(spellId);
  wand.setMakerId(maker);
  return wand;
}

function makeRoom(): Room {
  const room = makeStuff(() => new Room());
  stampTemplatePathForTest(room, `/obj/test/ctx-room-${seq++}`);
  return room;
}

/** The item path derives its actor from the execution context, never a
 * parameter — so a test must supply the context, not an argument. */
function actingAs(actor: unknown): void {
  vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
    actor,
  );
}

describe('EffectContext — the four separated jobs', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () =>
      makeStuff(() => new GlowlightOrb()),
    );
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  // ─────────────────────────── AC 1 ───────────────────────────

  it('AC1 — a cast collapses origin, actor and source onto one object', () => {
    const caster = makeActor();
    const ctx = EffectContexts.forCast(
      caster,
      { verb: 'create', noun: 'fire', spellId: 'firebolt' },
      1,
    );
    expect(ctx.origin).toBe(caster);
    expect(ctx.actor).toBe(caster);
    expect(ctx.source).toBe(caster);
    // …which is exactly why one `caster` parameter sufficed until items.
    expect(ctx.tag.specifiedBy).toBe(ctx.tag.firedBy);
  });

  it('AC1 — an item pulls origin, actor and source apart', () => {
    const user = makeActor();
    const wand = makeWand('firebolt', '/obj/test/the-maker');
    const battery = makeStuff(() => new TestWand());
    const ctx = EffectContexts.forItem(
      wand,
      user,
      { verb: 'create', noun: 'fire', spellId: 'firebolt' },
      1.5,
      { source: battery, specifiedBy: '/obj/test/the-maker' },
    );
    expect(ctx.origin).toBe(wand);
    expect(ctx.actor).toBe(user);
    expect(ctx.source).toBe(battery);
    expect(ctx.origin).not.toBe(ctx.actor);
    expect(ctx.source).not.toBe(ctx.origin);
  });

  it('AC1 — reachability measures from the ORIGIN, so a wand can reach where its user cannot', async () => {
    const here = makeRoom();
    const there = makeRoom();
    const user = makeActor();
    const victim = makeActor();
    ContainmentApi.move(user, here);
    ContainmentApi.move(victim, there);

    // A cast from `here` cannot touch a mark in `there` — unchanged.
    const refusedCast = await MagicApi.resolveCast(user, 'shove', victim);
    expect(refusedCast.reports.join(' ')).toMatch(/reach ends/);

    // The same working from a wand SET DOWN in `there` lands, because
    // the origin is the wand. This is "a wand pointed at a door".
    const wand = makeWand('shove', '/obj/test/the-maker');
    ContainmentApi.move(wand, there);
    actingAs(user);
    const out = await MagicApi.discharge(wand, victim);
    expect(out.ok).toBe(true);
    expect(out.reports.join(' ')).not.toMatch(/reach ends/);
  });

  it('AC1 — a self-effect targets the ACTOR, never the origin', async () => {
    const room = makeRoom();
    const user = makeActor();
    const wand = makeWand('veil', '/obj/test/the-maker');
    ContainmentApi.move(user, room);
    ContainmentApi.move(wand, room);
    actingAs(user);

    const out = await MagicApi.discharge(wand);
    expect(out.ok).toBe(true);
    // The veil settles on the person, not on the wand that fired it.
    const held = user.getConditions().find((c) => c.kind === 'sustained');
    expect(held).toBeTruthy();
    expect(held!.kind === 'sustained' && held!.realizes).toBe('cloak');
  });

  // ─────────────────────────── AC 2 ───────────────────────────

  it('AC2 — a wand-fired effect names the USER as firer and the MAKER as specifier', async () => {
    const room = makeRoom();
    const user = makeActor();
    const wand = makeWand('veil', '/obj/test/grand-artificer');
    ContainmentApi.move(user, room);
    ContainmentApi.move(wand, room);
    actingAs(user);

    await MagicApi.discharge(wand);
    const held = user.getConditions().find((c) => c.kind === 'sustained')!;
    expect(held.magicOrigin).toMatchObject({
      verb: 'create',
      noun: 'sense',
      spellId: 'veil',
      specifiedBy: '/obj/test/grand-artificer',
      firedBy: user.getTemplatePath(),
    });
    // The two are genuinely different — that is the whole decision.
    expect(held.magicOrigin.specifiedBy).not.toBe(held.magicOrigin.firedBy);
  });

  it('AC2 — the accountability row names the ACTOR; a wand cannot initiate harm', async () => {
    const room = makeRoom();
    const user = makeActor();
    const victim = makeActor();
    ContainmentApi.move(user, room);
    ContainmentApi.move(victim, room);
    const wand = makeWand('firebolt', '/obj/test/grand-artificer');
    ContainmentApi.move(wand, room);
    const rows = vi
      .spyOn(AccountabilityApi, 'record')
      .mockImplementation(() => undefined as never);
    actingAs(user);

    await MagicApi.discharge(wand, victim);
    expect(rows).toHaveBeenCalled();
    const row = rows.mock.calls[0]![0] as {
      initiator: string;
      killer: string;
      victim: string;
    };
    expect(row.initiator).toBe(user.getTemplatePath());
    expect(row.killer).toBe(user.getTemplatePath());
    // Never the wand — responsibility does not launder through an object.
    expect(row.initiator).not.toBe(wand.getTemplatePath());
  });

  it('AC2 — dispel keys on the tag, not on who fired it', async () => {
    const room = makeRoom();
    const caster = makeActor();
    const user = makeActor();
    ContainmentApi.move(caster, room);
    ContainmentApi.move(user, room);
    const wand = makeWand('veil', '/obj/test/grand-artificer');
    ContainmentApi.move(wand, room);
    actingAs(user);
    await MagicApi.discharge(wand);
    expect(
      user.getConditions().some((c) => c.kind === 'sustained'),
    ).toBe(true);

    // A different person dispels it: the tag is what dispel reads.
    actingAs(caster);
    const out = await MagicApi.resolveCast(caster, 'dispel', user);
    expect(out.reports.join(' ')).toMatch(/unravel/);
    expect(
      user.getConditions().some((c) => c.kind === 'sustained'),
    ).toBe(false);
  });

  it('AC2 — a legacy `caster` tag normalizes to both ids on hydrate', () => {
    const normalized = MagicGrid.normalizeProvenance({
      verb: 'create',
      noun: 'light',
      spellId: 'glowlight',
      caster: '/obj/Avatar/old',
    });
    expect(normalized).toEqual({
      verb: 'create',
      noun: 'light',
      spellId: 'glowlight',
      specifiedBy: '/obj/Avatar/old',
      firedBy: '/obj/Avatar/old',
    });
    // A corrupt blob drops the mark rather than poisoning a dispel scan.
    expect(MagicGrid.normalizeProvenance({ verb: 'nope' })).toBeUndefined();
    expect(MagicGrid.normalizeProvenance(null)).toBeUndefined();
  });

  it('AC2 — the hydrate seam normalizes tags riding the conditions collection', () => {
    const body = makeActor();
    body.setConditions([
      {
        kind: 'affliction',
        templatePath: '/obj/Condition/magic/dread',
        stage: 1,
        elapsed: 0,
        magicOrigin: {
          verb: 'destroy',
          noun: 'mind',
          spellId: 'dread',
          caster: '/obj/Avatar/old',
        },
      } as never,
    ]);
    const rec = body.conditions[0] as unknown as {
      magicOrigin: Record<string, string>;
    };
    expect(rec.magicOrigin.specifiedBy).toBe('/obj/Avatar/old');
    expect(rec.magicOrigin.firedBy).toBe('/obj/Avatar/old');
    expect(rec.magicOrigin.caster).toBeUndefined();
  });

  // ─────────────────────────── AC 3 ───────────────────────────

  it('AC3 — one authored spell, two triggers, no duplicated effect data', async () => {
    const room = makeRoom();
    const caster = makeActor();
    const user = makeActor();
    ContainmentApi.move(caster, room);
    ContainmentApi.move(user, room);
    const wand = makeWand('glowlight', '/obj/test/grand-artificer');
    ContainmentApi.move(wand, room);

    const cast = await MagicApi.resolveCast(caster, 'glowlight');
    actingAs(user);
    const fired = await MagicApi.discharge(wand);

    expect(cast.ok).toBe(true);
    expect(fired.ok).toBe(true);
    // Same authored effect, same prose — the item duplicates nothing.
    expect(fired.reports).toEqual(cast.reports);
    // The wand stores an id, never a copy of the effects.
    expect(wand.getCarriedSpellId()).toBe('glowlight');
    expect(wand.getDeclaredAddresses()).toEqual([]);
  });

  it('AC3 — an item ignores the casting profile wholesale', async () => {
    const room = makeRoom();
    const user = makeActor();
    const wand = makeWand('dispel', '/obj/test/grand-artificer'); // competent floor
    ContainmentApi.move(user, room);
    ContainmentApi.move(wand, room);
    // The user cannot cast it at all…
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('untrained');
    const refused = await MagicApi.prepareCast(user, 'dispel');
    expect(refused.ok).toBe(false);
    expect(refused.refusal).toMatch(/beyond your/);

    // …and can still fire the wand. The maker passed the gate, not them.
    actingAs(user);
    const out = await MagicApi.discharge(wand);
    expect(out.ok).toBe(true);
  });

  it('AC3 — firing an item credits no Transcript deed', async () => {
    const room = makeRoom();
    const user = makeActor();
    const wand = makeWand('glowlight', '/obj/test/grand-artificer');
    ContainmentApi.move(user, room);
    ContainmentApi.move(wand, room);
    const credit = vi
      .spyOn(AdvancementApi, 'recordSignature')
      .mockResolvedValue(undefined);
    actingAs(user);

    await MagicApi.discharge(wand);
    // Competence derives from deeds; firing a wand teaches nothing.
    expect(credit).not.toHaveBeenCalled();
  });

  // ─────────────────────────── AC 3a ───────────────────────────

  it('AC3a — a spell-carrying item DERIVES its footprint; changing the spell changes the address', () => {
    const wand = makeWand('firebolt', '/obj/test/maker');
    expect(wand.getArcaneFootprint()).toEqual([
      { verb: 'create', noun: 'fire' },
    ]);
    wand.setCarriedSpellId('glowlight');
    expect(wand.getArcaneFootprint()).toEqual([
      { verb: 'create', noun: 'light' },
    ]);
    // Nothing was copied, so nothing can drift.
    expect(wand.getDeclaredAddresses()).toEqual([]);
  });

  it('AC3a — a bespoke item DECLARES a set of typed cells, not a scalar', () => {
    const relic = makeStuff(() => new TestWand());
    relic.setDeclaredAddresses([
      { verb: 'create', noun: 'fire' },
      { verb: 'create', noun: 'light' },
    ]);
    const footprint = relic.getArcaneFootprint();
    expect(footprint).toHaveLength(2);
    expect(footprint[0]).toEqual({ verb: 'create', noun: 'fire' });
    expect(relic.hasArcaneNoun('light')).toBe(true);
    expect(relic.hasArcaneNoun('water')).toBe(false);
    // The two axes stay independently readable — the reason it is not a
    // scalar `'create-fire'` key.
    expect(relic.hasArcaneVerb('create')).toBe(true);
    expect(() =>
      relic.setDeclaredAddresses([{ verb: 'summon', noun: 'fire' } as never]),
    ).toThrow(/bad cell/);
  });

  it('AC3a — a grid-filtered ward suppresses a multi-cell item when ANY cell matches', () => {
    const relic = makeStuff(() => new TestWand());
    relic.setDeclaredAddresses([
      { verb: 'create', noun: 'fire' },
      { verb: 'perceive', noun: 'arcana' },
    ]);
    const noFire = Suppressions.validate({ nouns: ['fire'] });
    const noWater = Suppressions.validate({ nouns: ['water'] });

    expect(Suppressions.suppressesAny(noFire, relic.getArcaneFootprint())).toBe(
      true,
    );
    expect(Suppressions.suppressesAny(noWater, relic.getArcaneFootprint())).toBe(
      false,
    );
    expect(
      Suppressions.suppressesAny({ all: true }, relic.getArcaneFootprint()),
    ).toBe(true);
    // An empty footprint is suppressible by nothing — the legible failure
    // for an item naming a spell the catalogue does not know.
    expect(Suppressions.suppressesAny(noFire, [])).toBe(false);
  });

  it('AC3a — an item naming an unknown spell has an EMPTY footprint, never a stale one', () => {
    const wand = makeWand('firebolt', '/obj/test/maker');
    wand.setDeclaredAddresses([{ verb: 'control', noun: 'mind' }]);
    // A carried spell wins over a declaration…
    expect(wand.getArcaneFootprint()).toEqual([
      { verb: 'create', noun: 'fire' },
    ]);
    // …and a carried spell that does not resolve does NOT fall back to
    // the stale declaration.
    wand.setCarriedSpellId('no-such-spell');
    expect(wand.getArcaneFootprint()).toEqual([]);
  });
});
