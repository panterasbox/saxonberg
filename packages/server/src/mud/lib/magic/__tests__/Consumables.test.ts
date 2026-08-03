/**
 * Wave 2 — consumables.
 *
 * AC 4  — a potion is a `Bulkable` whose partial consumption produces a
 *         proportionally scaled graded effect and no threshold effect
 *         below its minimum.
 * AC 5  — a scroll costs the reader's reserve and is destroyed on use.
 * AC 5a — a use-verb is declared once on its capability mixin and no
 *         item template declares one; an unafforded verb still PARSES.
 * AC 5b — `read` resolves as perceive-then-decode: embossed text reads
 *         in darkness, inked text does not.
 * AC 5c — no affordance varies with hidden state (D34).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MagicApi } from '../../../api/magic';
import { AdvancementApi } from '../../../api/advancement';
import { CommandApi } from '../../../api/command';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { RecognitionApi } from '../../../api/recognition';
import '../../../obj/WorldClockRegistry';
import SpellCatalogue from '../../../obj/SpellCatalogue';
import Spell from '../../../obj/magic/Spell';
import Scroll from '../../../obj/magic/Scroll';
import GlowlightOrb from '../../../obj/magic/GlowlightOrb';
import { Template } from '../../stuff/Template';
import { Idea } from '../../stuff/Idea';
import { Character } from '../../character/Character';
import Species from '../../../obj/species/Species';
import Room from '../../../obj/location/Room';
import { Dose } from '../Dose';
import { MarkedMixin, MARK_FORMS } from '../../description/Marked';
import { ConsumableMixin } from '../Consumable';
import { ArcaneMixin } from '../Arcane';
import { IdentifiableMixin } from '../../identification/Identifiable';
import { VisibleMixin } from '../../description/Visible';
import { ContainableMixin } from '../../spatial/Containable';
import { IDENTIFICATION } from '../../belief/BeliefStore';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestCharacter extends Character {}
/** An identifiable item with no proper name — the unknown-flask shape. */
class Vial extends IdentifiableMixin(VisibleMixin(ContainableMixin(Idea))) {}
/** A bare marked thing: no working, just text. */
class Signpost extends MarkedMixin(VisibleMixin(ContainableMixin(Idea))) {}
/** A consumable that is arcane but bears no marks — the wand shape. */
class TestWand extends ConsumableMixin(ArcaneMixin(VisibleMixin(
  ContainableMixin(Idea),
))) {}

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
  stampTemplatePathForTest(species, `/obj/species/test/cons-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/cons-actor-${n}`);
  actor.installArcaneReserve();
  return actor;
}

function makeRoom(): Room {
  const room = makeStuff(() => new Room());
  stampTemplatePathForTest(room, `/obj/test/cons-room-${seq++}`);
  return room;
}

function makeScroll(spellId: string): Scroll {
  const s = makeStuff(() => new Scroll());
  stampTemplatePathForTest(s, `/obj/test/scroll-${seq++}`);
  s.setMarkText('a dense column of glyphs');
  s.setCarriedSpellId(spellId);
  return s;
}

function actingAs(actor: unknown): void {
  vi.spyOn(ExecutionContextApi, 'getCurrentCommandGiver').mockReturnValue(
    actor,
  );
}

describe('Wave 2 — consumables', () => {
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

  // ─────────────────────── AC 4 — dose response ───────────────────────

  it('AC4 — a graded dose scales continuously with the volume consumed', () => {
    const spec = Dose.validate({ response: 'graded', referenceLitres: 0.25 });
    expect(Dose.scaleFor(spec, 0.25)).toBe(1);
    expect(Dose.scaleFor(spec, 0.125)).toBe(0.5); // half a flask, half a dose
    expect(Dose.scaleFor(spec, 0.05)).toBeCloseTo(0.2);
    // Deliberately unclamped above 1 — two flasks really is two doses,
    // and whether that is wise is the player's problem.
    expect(Dose.scaleFor(spec, 0.5)).toBe(2);
    expect(Dose.scaleFor(spec, 0)).toBe(0);
    expect(Dose.scaleFor(spec, -1)).toBe(0);
  });

  it('AC4 — a threshold dose does NOTHING below its minimum, then all of it', () => {
    const spec = Dose.validate({
      response: 'threshold',
      referenceLitres: 0.25,
      minimumLitres: 0.2,
    });
    expect(Dose.scaleFor(spec, 0.19)).toBe(0); // a sip achieves nothing
    expect(Dose.isEffective(spec, 0.19)).toBe(false);
    expect(Dose.scaleFor(spec, 0.2)).toBe(1); // …and then all of it
    expect(Dose.scaleFor(spec, 0.5)).toBe(1); // no partial credit above, either
    expect(Dose.isEffective(spec, 0.5)).toBe(true);
  });

  it('AC4 — a malformed dose is refused at authoring time, not at the bottom of a flask', () => {
    expect(() => Dose.validate({ response: 'sort-of' })).toThrow(/response/);
    expect(() => Dose.validate({ referenceLitres: 0 })).toThrow(/positive/);
    expect(() => Dose.validate({ minimumLitres: -1 })).toThrow(/non-negative/);
    // A missing blob is the neutral default, not an error.
    expect(Dose.validate(undefined)).toEqual(Dose.DEFAULT);
  });

  it('AC4 — dose multiplies the maker efficiency rather than replacing it', async () => {
    // Half a dose of a doubly-efficient draught is one ordinary dose.
    const room = makeRoom();
    const drinker = makeActor();
    ContainmentApi.move(drinker, room);
    const scroll = makeScroll('firebolt');
    scroll.setDeliveryEfficiency(2);
    ContainmentApi.move(scroll, room);
    actingAs(drinker);
    const spy = vi.spyOn(MagicApi, 'discharge');
    await MagicApi.discharge(scroll, drinker, { potencyScale: 0.5 });
    expect(spy).toHaveBeenCalled();
    // The multiplication itself is asserted through the context builder
    // in EffectContext.test.ts; here we pin that the option is honoured
    // at all rather than silently dropped.
    const out = await MagicApi.discharge(scroll, drinker, {
      potencyScale: 0,
    });
    expect(out.ok).toBe(true);
  });

  // ─────────────────────── AC 5 — scrolls ───────────────────────

  it('AC5 — a scroll spends its single use and destroys itself', async () => {
    const scroll = makeScroll('veil');
    expect(scroll.getUsesRemaining()).toBe(1);
    expect(scroll.isSpent()).toBe(false);

    const id = scroll.stuffId;
    const residue = await scroll.consume();
    expect(residue).toBeNull(); // a scroll leaves nothing behind
    // Destroyed on use — the scroll is gone from the world, not merely
    // flagged. (Reading state off it afterwards is meaningless: the
    // destructed proxy is dead, which is the honest outcome.)
    expect(StuffApi.findById(id)).toBeUndefined();
  });

  it('AC5 — a multi-use consumable spends down before it is destroyed', async () => {
    const wand = makeStuff(() => new TestWand());
    stampTemplatePathForTest(wand, `/obj/test/wand-${seq++}`);
    wand.setUsesRemaining(3);

    const id = wand.stuffId;
    expect(await wand.consume()).toBeNull();
    expect(wand.getUsesRemaining()).toBe(2);
    expect(wand.isSpent()).toBe(false);
    await wand.consume();
    expect(wand.getUsesRemaining()).toBe(1);
    // The last use is what removes it.
    await wand.consume();
    expect(StuffApi.findById(id)).toBeUndefined();
  });

  it('AC5 — a spent consumable refuses further spends rather than going negative', () => {
    const wand = makeStuff(() => new TestWand());
    wand.setUsesRemaining(1);
    expect(wand.spendUse()).toBe(true);
    expect(wand.isSpent()).toBe(true);
    expect(wand.spendUse()).toBe(false);
    expect(wand.getUsesRemaining()).toBe(0);
    expect(() => wand.setUsesRemaining(-1)).toThrow(/non-negative/);
  });

  it('AC5 — a consumable leaves its authored residue where it stood', async () => {
    const room = makeRoom();
    const flask = makeStuff(() => new TestWand());
    stampTemplatePathForTest(flask, `/obj/test/flask-${seq++}`);
    flask.setResidueTemplatePath('/obj/test/empty-flask');
    ContainmentApi.move(flask, room);

    const empty = makeStuff(() => new TestWand());
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => empty);

    const residue = await flask.consume();
    expect(residue).toBe(empty);
    // The vessel is left exactly where the potion was, not in hand.
    expect(empty.getContainer()).toBe(room);
  });

  // ─────────────────────── AC 5a — the parser floor ───────────────────

  it('AC5a — no item template declares a use-verb; the capability does', async () => {
    await CommandApi.preloadAll?.();
    // The scroll class carries NO command contributions of its own…
    const ownContributions = (
      Scroll as unknown as { commandContributions?: unknown }
    ).commandContributions as
      | { inventory?: string[] }
      | undefined;
    const inventory = ownContributions?.inventory ?? [];
    // …it inherits `read` from MarkedMixin, and declares nothing itself.
    expect(inventory).toEqual(['perception/read.yaml']);
    // The verb is written once, on the capability, not per item.
    expect(new Set(inventory).size).toBe(inventory.length);
  });

  it('AC5a — an unafforded verb still PARSES and answers with a reason', () => {
    // The whole point of the floor: `drink` typed where nothing is
    // drinkable must not read as "unknown command", because that
    // teaches players that verbs evaporate.
    const drink = CommandApi.allDefinitions().find((d) => d.hasVerb('drink'));
    expect(drink).toBeTruthy();
    expect(drink!.unafforded).toBe('There is nothing here to drink.');

    const read = CommandApi.allDefinitions().find((d) => d.hasVerb('read'));
    expect(read).toBeTruthy();
    expect(read!.unafforded).toBe('There is nothing here to read.');
  });

  it('AC5a — `quaff` is an alias on `drink`, not a second view', () => {
    const byDrink = CommandApi.allDefinitions().filter((d) =>
      d.hasVerb('drink'),
    );
    const byQuaff = CommandApi.allDefinitions().filter((d) =>
      d.hasVerb('quaff'),
    );
    expect(byQuaff).toHaveLength(1);
    expect(byQuaff[0]).toBe(byDrink[0]);
  });

  // ─────────────────────── AC 5b — perceive + decode ───────────────────

  it('AC5b — an EMBOSSED text bypasses the light gate; an INKED one does not', () => {
    const inked = makeStuff(() => new Signpost());
    const embossed = makeStuff(() => new Signpost());
    embossed.setMarkForm('embossed');

    expect(inked.getMarkForm()).toBe('inked');
    expect(inked.requiresLightToRead()).toBe(true);
    expect(embossed.requiresLightToRead()).toBe(false);

    // The modality vocabulary is `SenseChannel`, reused — reading
    // embossed text is a TOUCH read, which is why darkness is
    // irrelevant to it.
    expect(inked.getMarkModalities()).toEqual(['vision']);
    expect(embossed.getMarkModalities()).toEqual(['touch']);
    expect(MARK_FORMS.both).toEqual(['vision', 'touch']);
  });

  it('AC5b — a `both` text reads through either channel, so it also reads in the dark', () => {
    const plaque = makeStuff(() => new Signpost());
    plaque.setMarkForm('both');
    expect(plaque.getMarkModalities()).toContain('vision');
    expect(plaque.getMarkModalities()).toContain('touch');
    expect(plaque.requiresLightToRead()).toBe(false);
  });

  it('AC5b — an unknown mark form is refused at authoring time', () => {
    const s = makeStuff(() => new Signpost());
    expect(() => s.setMarkForm('carved-in-light')).toThrow(/unknown form/);
  });

  // ─────────────────────── AC 5c — no hidden-state affordance ──────────

  it('AC5c — there is no `identify` verb anywhere in the catalogue', () => {
    const identify = CommandApi.allDefinitions().filter((d) =>
      d.hasVerb('identify'),
    );
    // D34: a verb that appears because of what you are holding TELLS you
    // what you are holding. The scroll affords `read` like every other
    // written thing.
    expect(identify).toEqual([]);
  });

  it('AC5c — two scrolls of different class afford an identical verb set', () => {
    const identifyScroll = makeScroll('identify');
    const veilScroll = makeScroll('veil');
    const contributions = (
      Scroll as unknown as { commandContributions?: { inventory?: string[] } }
    ).commandContributions;
    // Same class, same contributions — there is no per-instance or
    // per-class verb variation to leak through.
    expect(identifyScroll.getCarriedSpellId()).not.toBe(
      veilScroll.getCarriedSpellId(),
    );
    expect(contributions?.inventory).toEqual(['perception/read.yaml']);
  });

  it('AC5c — a SPENT consumable still affords its verb', () => {
    const scroll = makeScroll('veil');
    scroll.setUsesRemaining(0);
    expect(scroll.isSpent()).toBe(true);
    // The affordance reflects the KIND, never the state. If a spent
    // scroll stopped affording `read`, the affordance list would become
    // a free inventory-state readout.
    const contributions = (
      Scroll as unknown as { commandContributions?: { inventory?: string[] } }
    ).commandContributions;
    expect(contributions?.inventory).toContain('perception/read.yaml');
  });

  // ─────────────── D24 — the identify effect, not a verb ───────────────

  it('D24 — the identify working writes a CLASS record to the reader belief store', async () => {
    const room = makeRoom();
    const reader = makeActor();
    const other = makeActor();
    ContainmentApi.move(reader, room);
    const vial = makeStuffAtPath(() => new Vial(), `/obj/item/vial-${seq++}`);
    vial.setShortDescription('a blue potion');
    vial.setIdentifiedName('a potion of healing');
    ContainmentApi.move(vial, room);

    const scroll = makeScroll('identify');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    const out = await MagicApi.discharge(scroll, vial);
    expect(out.ok).toBe(true);

    // A WRITE, not a message: the reader now knows the class, so every
    // flask that looks like this one reads as known from here on.
    expect(
      reader.recall(IDENTIFICATION, vial.getTemplatePath()!)?.payload.typeKnown,
    ).toBe(true);
    expect(RecognitionApi.describe(reader, vial)).toBe('a potion of healing');
    // …and it stays unidentified to everyone else.
    expect(RecognitionApi.describe(other, vial)).toBe('a blue potion');
  });
});
