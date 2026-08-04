/**
 * **Remove curse, and what a blessing actually means.**
 *
 * Two claims are under test, and the second is the one that is easy to
 * get backwards.
 *
 * 1. `adjust-blessing` is the first effect kind that writes an *item's*
 *    durable state (every other kind addresses a creature or the
 *    world), and `remove-curse` is `control · arcana` over it — NOT
 *    `destroy · arcana`. A curse here is not another caster's working
 *    laid over the thing; it is the thing's own potency one notch down,
 *    so lifting it changes a parameter of something that remains
 *    itself. `dispel` therefore cannot reach it, and that is correct.
 *
 * 2. **Blessed means efficient, not benevolent.** A blessing amplifies
 *    whatever the item already does. There is no band that means
 *    "safe", which is what keeps the two hidden axes (what it IS, what
 *    band it sits at) independent and both necessary.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MagicApi } from '../../../api/magic';
import { MixinApi } from '../../../api/mixin';
import { AdvancementApi } from '../../../api/advancement';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import SpellCatalogue from '../../../obj/SpellCatalogue';
import Spell from '../../../obj/magic/Spell';
import Scroll from '../../../obj/magic/Scroll';
import Wand from '../../../obj/magic/Wand';
import { Blessing } from '../Blessing';
import { MagicEffects, EFFECT_KINDS } from '../Effect';
import { Template } from '../../stuff/Template';
import { Character } from '../../character/Character';
import Species from '../../../obj/species/Species';
import Room from '../../../obj/location/Room';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestCharacter extends Character {}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  '../../../seeds/obj/magic/Spell',
);

let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;

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

function makeActor(): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(species, `/obj/species/test/rc-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/rc-actor-${n}`);
  actor.installArcaneReserve();
  return actor;
}

function makeRoom(): Room {
  const room = makeStuff(() => new Room());
  stampTemplatePathForTest(room, `/obj/test/rc-room-${seq++}`);
  return room;
}

function makeWand(band: string): Wand {
  const w = makeStuff(() => new Wand());
  stampTemplatePathForTest(w, `/obj/test/rc-wand-${seq++}`);
  w.setCarriedSpellId('firebolt');
  w.setBlessingBand(band);
  return w;
}

function makeScroll(spellId: string): Scroll {
  const s = makeStuff(() => new Scroll());
  stampTemplatePathForTest(s, `/obj/test/rc-scroll-${seq++}`);
  s.setMarkText('a spiral of pressed characters');
  s.setCarriedSpellId(spellId);
  return s;
}

function actingAs(actor: unknown): void {
  vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
    actor,
  );
}

describe('adjust-blessing — the item-state effect kind', () => {
  it('is in the closed union, and a zero displacement will not parse', () => {
    expect(EFFECT_KINDS).toContain('adjust-blessing');
    expect(() =>
      MagicEffects.validate({ kind: 'adjust-blessing', steps: 1 }),
    ).not.toThrow();
    // A working that costs mana to do nothing is an authoring slip, and
    // it is cheap to refuse at parse time rather than at cast time.
    expect(() =>
      MagicEffects.validate({ kind: 'adjust-blessing', steps: 0 }),
    ).toThrow();
    expect(() =>
      MagicEffects.validate({ kind: 'adjust-blessing', steps: 'up' }),
    ).toThrow();
    // The ceiling is authored, so a typo in it is caught at parse time
    // rather than silently meaning "unbounded".
    expect(() =>
      MagicEffects.validate({
        kind: 'adjust-blessing',
        steps: 1,
        limit: 'holy',
      }),
    ).toThrow();
  });

  it('NEEDS a mark, so a misaimed reading refuses before it is spent', () => {
    // It acts ON something. Without the shape gate this reaches the
    // executor, refuses there, and leaves the scroll already consumed.
    expect(
      MagicEffects.needsTarget({ kind: 'adjust-blessing', steps: 1 }),
    ).toBe(true);
  });
});

describe('remove-curse — control·arcana over an item', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('is CONTROL, not DESTROY — dispel occupies the other cell', async () => {
    const spell = await MagicApi.spellById('remove-curse');
    expect(spell).not.toBeNull();
    // The grid cell is the design claim in machine-readable form. A
    // curse is the item's own potency displaced, so lifting it changes
    // a parameter of a thing that remains itself.
    expect(spell!.verb).toBe('control');
    expect(spell!.noun).toBe('arcana');
    const dispel = await MagicApi.spellById('dispel');
    expect(dispel!.verb).toBe('destroy');
    // …and `control` is the dearer verb, which is why the cure costs
    // more than the unbinding it is often mistaken for.
    expect(spell!.cost).toBeGreaterThan(dispel!.cost);
  });

  it('lifts a curse, and the item is no longer cursed afterwards', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    const wand = makeWand('cursed');
    ContainmentApi.move(wand, room);
    const scroll = makeScroll('remove-curse');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    expect(wand.getBlessing().isCursed()).toBe(true);
    const out = await MagicApi.discharge(scroll, wand, { source: reader });
    expect(out.ok).toBe(true);
    expect(wand.getBlessingBand()).toBe('uncursed');
    expect(wand.getBlessing().isCursed()).toBe(false);
  });

  it('REVEALS the band whether or not it moved — a paid detector', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    // An ordinary wand: the working reaches, finds nothing below, and
    // still tells you where it sat. That makes remove-curse a BUC
    // detector — a *paid* one, at the dearest verb on the price list,
    // which is the same shape D24 gives identify.
    const wand = makeWand('uncursed');
    ContainmentApi.move(wand, room);
    expect(wand.isBlessingKnown()).toBe(false);
    const scroll = makeScroll('remove-curse');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    const out = await MagicApi.discharge(scroll, wand, { source: reader });
    expect(out.ok).toBe(true);
    expect(wand.isBlessingKnown()).toBe(true);
    expect(wand.getBlessingBucket()).toBe('uncursed');
    // It clamps rather than erroring — the outcome must not depend on
    // hidden state before the caster has paid.
    expect(wand.getBlessingBand()).toBe('uncursed');
    expect(out.reports.join(' ')).toMatch(/[Nn]othing was holding/);
  });

  it('is a CURE, not a buff — it stops at ordinary', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    // The hole a test found: `steps: +1` with no ceiling BLESSES an
    // ordinary item, and the right play becomes reading one of these
    // over everything you own. The authored `limit: uncursed` is what
    // makes it restore rather than improve.
    const wand = makeWand('uncursed');
    ContainmentApi.move(wand, room);
    const scroll = makeScroll('remove-curse');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    await MagicApi.discharge(scroll, wand, { source: reader });
    expect(wand.getBlessingBand()).toBe('uncursed');
  });

  it('leaves an already-BLESSED item alone — a ceiling never demotes', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    const wand = makeWand('blessed');
    ContainmentApi.move(wand, room);
    const scroll = makeScroll('remove-curse');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    // The second hole the ceiling opened: clamping toward `uncursed`
    // would drag a blessed wand DOWN to ordinary. A cure must never
    // move something backwards — undoing a blessing is a different
    // working, and this one is not it.
    await MagicApi.discharge(scroll, wand, { source: reader });
    expect(wand.getBlessingBand()).toBe('blessed');
  });

  it('refuses a thing with no effect axis, and leaks nothing doing it', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    // A scroll is not Blessable — there is no model for what a blessed
    // one-shot would mean, so it does not carry the field. Refusing is
    // honest and leaks nothing: being un-blessable is a fact about the
    // CLASS, which anybody can see.
    const rock = makeScroll('firebolt');
    ContainmentApi.move(rock, room);
    expect(MixinApi.isBlessable(rock)).toBe(false);
    const scroll = makeScroll('remove-curse');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    const out = await MagicApi.discharge(scroll, rock, { source: reader });
    expect(out.reports.join(' ')).toMatch(/no working in it to shift/);
  });
});

describe('blessed means EFFICIENT, not BENEVOLENT', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('scale runs cursed → blessed as LESS effect → MORE effect', () => {
    // The axis is amoral by construction: it interpolates a magnitude
    // and carries no opinion about who benefits.
    const lo = Blessing.scale(Blessing.of('cursed'), 0.6, 1.4);
    const mid = Blessing.scale(Blessing.of('uncursed'), 0.6, 1.4);
    const hi = Blessing.scale(Blessing.of('blessed'), 0.6, 1.4);
    expect(lo).toBeLessThan(mid);
    expect(mid).toBeLessThan(hi);
    // Ordinary sits exactly in the middle, so the two authored ends fix
    // the whole axis and nobody has to author the midpoint.
    expect(mid).toBeCloseTo(1.0);
  });

  it('a blessed item delivers MORE of what it does; a cursed one less', async () => {
    const room = makeRoom();
    const actor = makeActor();
    ContainmentApi.move(actor, room);
    actingAs(actor);

    // Same wand, same spell, same maker — one field apart. The blessing
    // multiplies into the delivered magnitude alongside the maker's own
    // efficiency, so a blessed wand of dread would be a BETTER wand of
    // dread. There is no band here that means "safe".
    const potencies: Record<string, number> = {};
    for (const band of ['cursed', 'uncursed', 'blessed']) {
      const wand = makeWand(band);
      ContainmentApi.move(wand, room);
      potencies[band] = Blessing.scale(wand.getBlessing(), 0.6, 1.4);
    }
    expect(potencies.cursed!).toBeLessThan(potencies.uncursed!);
    expect(potencies.uncursed!).toBeLessThan(potencies.blessed!);
  });

  it('the shipped magic-item classes carry the axis; nothing else does', () => {
    // Scoped to items with an effect axis to displace, which is the
    // only thing the model is defined against. A cursed sword or chair
    // stays UNBUILT rather than guessed at.
    const wand = makeWand('uncursed');
    expect(MixinApi.isBlessable(wand)).toBe(true);
    const scroll = makeScroll('firebolt');
    expect(MixinApi.isBlessable(scroll)).toBe(false);
  });
});
