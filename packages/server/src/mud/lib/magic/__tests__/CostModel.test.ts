/**
 * The computed cost through the two doors (TPA reform W3, AC2/AC5/AC5b).
 *
 * Three claims, and the first is the one that protects everything else:
 *
 * - **The flat arm did not move.** A spell with no `costModel` cannot
 *   reach the second line of `costOf`, and `dispel` still costs exactly
 *   what it always cost. That is the assertion the whole seam rests on.
 * - **Self only.** The `relocate` executor lands on `ctx.actor` and has
 *   no flag to say otherwise, so a caster cannot send a third party —
 *   enforced structurally, not by a check.
 * - **The item door is honest.** A teleport-bearing item charges
 *   `costOf` — the authored floor PLUS the `mgh` to the item's own
 *   destination — not the flat authored number. Reading `spell.cost`
 *   there would have undercharged every use.
 *
 * ⚠ No teleport ITEM ships. The door is proved with a fixture, because
 * a code path that is wrong is wrong whether or not a row exercises it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import type { CompetenceBandName } from '../../advancement/CompetenceBand';
import { StuffApi } from '../../../api/stuff';
import { ZoneApi } from '../../../api/zone';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { ExecutionContextApi } from '../../../api/execution-context';
import '../../../platform/idea/WorldClockRegistry';
import SpellCatalogue from '../../../platform/idea/SpellCatalogue';
import { Template } from '../../stuff/Template';
import Thing from '../../stuff/Thing';
import Species from '../../../platform/idea/species/Species';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import { Character } from '../../character/Character';
import { ArcaneMixin } from '../Arcane';
import { ChargedMixin } from '../Charged';
import { IdentifiableMixin } from '../../identification/Identifiable';
import { ReservedMixin } from '../../reserve';
import { Quantity } from '../../quantity';
import { MANA_RESERVE_KEY } from '../Caster';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { bearerOf } from '../../encumbrance/__tests__/encumbrance-fixtures';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

class TestWand extends IdentifiableMixin(
  ChargedMixin(ReservedMixin(ArcaneMixin(Thing))),
) {}

let testBand: CompetenceBandName = 'expert';
class TestCharacter extends Character {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return testBand;
  }
}

const SPELL_CLASS = '/platform/idea/magic/Spell';
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_SEEDS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../content/arcane-library/content/stuff/idea/magic/Spell',
);

let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;
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

function room(elevation: number | null): Stuff & Container {
  const r = makeStuff(() => new SingletonCartesianLocation());
  stampTemplatePathForTest(r, `/platform/location/test/cost-${seq++}`);
  elevations.set(r as unknown as Stuff, elevation);
  return r as unknown as Stuff & Container;
}

/**
 * A caster with real MASS — the `m` in `m·g·Δh`. `bearerOf` wires a
 * fresh body plan authoring `baseMass`; the faculty profile on top is
 * what makes it a caster.
 */
function caster(massKg = 70): TestCharacter {
  const n = seq++;
  const c = bearerOf(() => new TestCharacter(), massKg);
  const species = c.getSpecies()!;
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(c, `/platform/agent/test/cost-caster-${n}`);
  c.installArcaneReserve();
  return c;
}

function manaOf(c: TestCharacter): number {
  return c.getMana()?.current.rawValue() ?? 0;
}

describe('the computed cost — the two doors', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    elevations.clear();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    testBand = 'expert';
    vi.spyOn(ZoneApi, 'elevationFor').mockImplementation(
      async (scope) => elevations.get(scope as unknown as Stuff) ?? null,
    );
    vi.spyOn(BiomeApi, 'resolveGravityFor').mockResolvedValue(
      Quantity.of(9.81, 'm/s²'),
    );
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  // ─────────────────────────── AC2 ───────────────────────────

  it('the FLAT arm did not move — dispel still costs exactly 20', async () => {
    const c = caster();
    const here = room(0);
    ContainmentApi.move(c as never, here as never);
    const mark = makeStuff(() => new Thing());
    ContainmentApi.move(mark as never, here as never);

    const before = manaOf(c);
    const out = await c.resolveCast('dispel', mark as unknown as Stuff);
    expect(out.ok).toBe(true);
    // The authored `cost: 20`, unchanged and unadorned. A spell with no
    // `costModel` cannot reach the second line of `costOf`.
    expect(before - manaOf(c)).toBeCloseTo(20, 6);
  });

  it('prepareCast previews the FULL price without spending anything', async () => {
    const c = caster();
    ContainmentApi.move(c as never, room(0) as never);
    const up = room(500);

    const before = manaOf(c);
    const prep = await c.prepareCast('teleport', up as unknown as Stuff);
    expect(prep.refusal ?? '').toBe('');
    expect(prep.ok).toBe(true);
    // The authored 40 τ floor + m·g·Δh, and nothing spent.
    expect(prep.costTau).toBeGreaterThan(40);
    expect(manaOf(c)).toBe(before);
  });

  it('the floor is a floor: a level hop costs the authored survey only', async () => {
    const c = caster();
    ContainmentApi.move(c as never, room(120) as never);
    const level = room(120);
    const prep = await c.prepareCast('teleport', level as unknown as Stuff);
    expect(prep.costTau).toBeCloseTo(40, 6);
  });

  // ─────────────────────────── AC5 ───────────────────────────

  it('AC5 — a cast moves the CASTER, never a third party', async () => {
    const c = caster();
    const here = room(0);
    ContainmentApi.move(c as never, here as never);
    const bystander = caster();
    ContainmentApi.move(bystander as never, here as never);
    const there = room(0);

    // The mark names the DESTINATION; the traveller is always the actor.
    const out = await c.resolveCast('teleport', there as unknown as Stuff);
    expect(out.ok).toBe(true);
    expect((c as unknown as { getContainer(): unknown }).getContainer()).toBe(
      there,
    );
    // The bystander did not move, and there is no argument that could
    // have moved them: `relocate` reads `ctx.actor` and nothing else.
    expect(
      (bystander as unknown as { getContainer(): unknown }).getContainer(),
    ).toBe(here);
  });

  // ─────────────────────────── AC5b ───────────────────────────

  it('AC5b — the item door charges costOf, not the flat cost, and moves the WIELDER', async () => {
    const wielder = caster();
    const here = room(0);
    ContainmentApi.move(wielder as never, here as never);
    const summit = room(500);

    // A wand whose working carries its OWN destination — the portable
    // survey. `to` is what makes a wand attuned to a mountaintop hold
    // fewer charges than one attuned to a valley, with nobody tuning it.
    const wand = makeStuff(() => new TestWand());
    stampTemplatePathForTest(wand, `/platform/thing/test/wand-${seq++}`);
    wand.setCarriedSpellPath(`${SPELL_PATH_PREFIX}teleport`);
    wand.setMakerId('test');
    wand.setCapacityTau(100000);
    ContainmentApi.move(wand as never, wielder as never);

    // The item door reads the actor from the execution context.
    vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
      wielder as never,
    );
    const summitPath = `/platform/location/test/summit-${seq++}`;
    stampTemplatePathForTest(summit as unknown as Stuff, summitPath);
    vi.spyOn(StuffApi, 'singletonOrClone').mockResolvedValue(
      summit as unknown as Stuff,
    );
    // The wand's working is the teleport row with ONE difference: its
    // `relocate` carries a `to`. That IS the portable survey — a wand
    // holds one place, the network holds many, shared.
    const spell = catalogueSingleton!.getSpellNamed('teleport')!;
    const attuned = {
      ...spell,
      effects: [{ kind: 'relocate' as const, to: summitPath }],
    };
    const realAt = catalogueSingleton!.getSpellAt.bind(catalogueSingleton!);
    vi.spyOn(catalogueSingleton!, 'getSpellAt').mockImplementation((path) =>
      path === `${SPELL_PATH_PREFIX}teleport` ? attuned : realAt(path),
    );

    const beforeCharge = wand.getStoredTau();
    const beforeMana = manaOf(wielder);
    const out = await wand.dischargeAt();
    expect(out.refusal ?? '').toBe('');
    expect(out.ok).toBe(true);

    const spent = beforeCharge - wand.getStoredTau();
    // ⚠ Not 40. Under `costModel: potential` the authored number is the
    // FLOOR, so a flat `spell.cost` read here would have undercharged
    // every use of the wand — by the whole physics term.
    expect(spent).toBeGreaterThan(40);
    // …and the shell paid for itself: the wielder's own pool is untouched.
    expect(manaOf(wielder)).toBe(beforeMana);
    // The WIELDER moved, not the wand: `EffectContext` separates actor
    // from origin, so a self-effect through an item lands on the person.
    expect(
      (wielder as unknown as { getContainer(): unknown }).getContainer(),
    ).toBe(summit);
  });
});
