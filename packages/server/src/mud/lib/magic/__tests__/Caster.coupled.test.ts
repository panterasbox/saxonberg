/**
 * AC 7 and AC 10 — the two wave-3 criteria that cross subsystems.
 *
 * **AC 10 — mana recovery consumes satiation and hydration.** The magic
 * tree contained no reference to either, anywhere, so a caster refilled
 * their pool from nothing: **a caster violated the first law by
 * resting**. Closing it made mana the second consumer of metabolism's
 * coupled-recovery keystone (D10) rather than a parallel mechanism —
 * two integrators draining the same tanks in the same window without
 * seeing each other is exactly the bug the keystone exists to prevent.
 *
 * **AC 7 — the endpoint takes the reaction.** Momentum is conserved
 * (arcane-science content rule 7), and *whatever launched it* is the
 * origin. For a cast and for a focus that is the caster, so they are
 * displaced; for a braced charged item it is the item, so the user is
 * not. The three classes get their opposite ergonomics from ONE line
 * (D6) rather than from three special cases.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MagicApi } from '../../../api/magic';
import { AdvancementApi } from '../../../api/advancement';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import SpellCatalogue from '../../../platform/idea/SpellCatalogue';
import Spell from '../../../platform/idea/magic/Spell';
import Wand from '../../../../../../content/arcana/src/thing/Wand';
import { Template } from '../../stuff/Template';
import { Character } from '../../character/Character';
import Species from '../../../platform/idea/species/Species';
import Room from '../../../platform/location/Room';
import { Quantity } from '../../quantity';
import { Postures } from '../../slot/Postured';
import { MANA_RESERVE_KEY } from '../Caster';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

class TestCharacter extends Character {}

const SCALE = 12;
let real = 0;
let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  '../../../../../../content/arcane-library/content/stuff/idea/magic/Spell',
);

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
    stampTemplatePathForTest(catalogueSingleton, '/platform/idea/SpellCatalogue');
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

function makeCaster(): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/coupled-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/coupled-${n}`);
  actor.installArcaneReserve();
  return actor;
}

function makeRoom(): Room {
  const room = makeStuff(() => new Room());
  stampTemplatePathForTest(room, `/obj/test/coupled-room-${seq++}`);
  return room;
}

function actingAs(actor: unknown): void {
  vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
    actor,
  );
}

const Q = (n: number) => Quantity.of(n, '%');
const mana = (c: TestCharacter) => c.getMana()!.current.rawValue();
const sat = (c: TestCharacter) => c.getReserve('satiation')!.current.rawValue();
const hyd = (c: TestCharacter) => c.getReserve('hydration')!.current.rawValue();

/** Advance game-time, poking every body so their clocks stay in lockstep. */
function advanceAll(cs: TestCharacter[], gameSec: number, chunk = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunk, remaining);
    real += (s / SCALE) * 1000;
    for (const c of cs) c.getMana();
    remaining -= s;
  }
}

describe('AC10 — mana recovery spends satiation and hydration', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('a well-fed caster refills, and PAYS for it out of both tanks', () => {
    const c = makeCaster();
    c.setPosture(Postures.Lie);
    c.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-80, 'pt'));
    const manaBefore = mana(c);
    const satBefore = sat(c);
    const hydBefore = hyd(c);

    advanceAll([c], 12000);

    expect(mana(c)).toBeGreaterThan(manaBefore);
    // The first law, enforced: the pool did not refill from nothing.
    expect(sat(c)).toBeLessThan(satBefore);
    expect(hyd(c)).toBeLessThan(hydBefore);
  });

  it('a STARVED caster does not refill — recovery halts on an empty pool', () => {
    const starved = makeCaster();
    starved.setPosture(Postures.Lie);
    starved.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-80, 'pt'));
    starved.adjustReserve('satiation', Q(-100));
    starved.adjustReserve('hydration', Q(-100));
    const before = mana(starved);

    advanceAll([starved], 12000);

    // Nothing to pay with, nothing recovered. Resting is not a
    // perpetual-motion machine.
    expect(mana(starved)).toBeCloseTo(before, 1);
  });

  it('the BODY is paid first — a caster still rebuilds endurance while starving its gift', () => {
    const c = makeCaster();
    c.setPosture(Postures.Lie);
    c.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-80, 'pt'));
    c.adjustReserve('endurance', Q(-60));
    // Barely any fuel — enough for one consumer, not two.
    c.adjustReserve('satiation', Q(-98));
    c.adjustReserve('hydration', Q(-90));
    const endBefore = c.getReserve('endurance')!.current.rawValue();

    advanceAll([c], 6000);

    // Body before gift: the fuel-priority ordering is the honest one.
    // You do not recover your magic while starving.
    expect(c.getReserve('endurance')!.current.rawValue()).toBeGreaterThan(
      endBefore,
    );
  });

  it('a NON-caster declares no mana consumer and is entirely unaffected', () => {
    const n = seq++;
    const species = makeStuff(() => new Species());
    species.setSentient(true); // no faculty profile, no innate mixin
    stampTemplatePathForTest(species, `/stuff/idea/species/test/mundane-${n}`);
    const mundane = makeStuff(() => new TestCharacter());
    mundane.setSpecies(species);
    stampTemplatePathForTest(mundane, `/obj/test/mundane-${n}`);

    const consumers = mundane.coupledConsumers();
    expect(consumers.map((c) => c.key)).toEqual(['endurance']);
    // …and a caster's list is the body's PLUS mana, in that order.
    const caster = makeCaster();
    expect(caster.coupledConsumers().map((c) => c.key)).toEqual([
      'endurance',
      'mana',
    ]);
  });
});

describe('AC7 — the endpoint takes the reaction', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    await installCatalogue();
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('a caster CASTING shove is displaced by their own working', () => {
    // A deliberate behaviour change to the shipped spell: it previously
    // pushed off nothing at all, which conserved no momentum. Required
    // by arcane-science content rule 7.
    const room = makeRoom();
    const caster = makeCaster();
    const mark = makeCaster();
    ContainmentApi.move(caster, room);
    ContainmentApi.move(mark, room);
    caster.setPosture(Postures.Stand);
    mark.setPosture(Postures.Stand);

    return MagicApi.resolveCast(caster, 'shove', mark).then((out) => {
      expect(out.ok).toBe(true);
      // The mark goes down…
      expect(mark.getPosture()).toBe(Postures.Lie);
      // …and the caster is staggered. Graded, not a knockdown: soft
      // recoverable entropy, never a cliff.
      expect(caster.getPosture()).toBe(Postures.Kneel);
    });
  });

  it('a caster firing a braced CHARGED item is NOT displaced — the item is the endpoint', async () => {
    const room = makeRoom();
    const user = makeCaster();
    const mark = makeCaster();
    ContainmentApi.move(user, room);
    ContainmentApi.move(mark, room);
    user.setPosture(Postures.Stand);
    mark.setPosture(Postures.Stand);

    const wand = makeStuff(() => new Wand());
    stampTemplatePathForTest(wand, `/obj/test/wand-${seq++}`);
    wand.setCarriedSpellPath('/stuff/idea/magic/Spell/shove');
    wand.setCapacityKJ(1000);
    ContainmentApi.move(wand, user);
    actingAs(user);

    const out = await MagicApi.discharge(wand, mark);
    expect(out.ok).toBe(true);
    expect(mark.getPosture()).toBe(Postures.Lie);
    // The wand absorbed it. This is the whole of D6, and it is why
    // kinetic charged items have to be braced rather than handheld —
    // the shell is what the reaction runs through.
    expect(user.getPosture()).toBe(Postures.Stand);
  });

  it('a charged item SPENDS its own tank, and a flat one fails audibly', async () => {
    const room = makeRoom();
    const user = makeCaster();
    ContainmentApi.move(user, room);
    const wand = makeStuff(() => new Wand());
    stampTemplatePathForTest(wand, `/obj/test/wand-${seq++}`);
    wand.setCarriedSpellPath('/stuff/idea/magic/Spell/glowlight'); // costs 10
    wand.setCapacityKJ(25);
    ContainmentApi.move(wand, user);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () =>
      makeStuff(() => new Room()),
    );
    actingAs(user);

    const before = wand.getStoredKJ();
    const first = await MagicApi.discharge(wand);
    expect(first.ok).toBe(true);
    expect(wand.getStoredKJ()).toBeLessThan(before);

    // Drain it flat, then fire again.
    await MagicApi.discharge(wand);
    const flat = await MagicApi.discharge(wand);
    expect(flat.ok).toBe(false);
    // Fails AUDIBLY — never silently, and never by ceasing to afford
    // the verb (D34: that would make the affordance list a charge meter).
    expect(flat.refusal).toMatch(/spent|click/i);
  });


});
