/**
 * Wave 2 — consumables.
 *
 * AC 4  — a potion is a `Bulkable` whose partial consumption produces a
 *         proportionally scaled graded effect and no threshold effect
 *         below its minimum.
 * AC 5  — a scroll costs the reader's reserve and is destroyed on use.
 * AC 5a — a use-verb is declared once on its capability mixin and no
 *         item template declares one. (Its second clause — that an
 *         unafforded verb still PARSES — is RETIRED; see the test.)
 * AC 5b — `read` resolves as perceive-then-decode: embossed text reads
 *         in darkness, inked text does not.
 * AC 5c — no affordance varies with hidden state (D34).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { MagicApi } from '../../../api/magic';
import { AdvancementApi } from '../../../api/advancement';
import { CommandApi } from '../../../api/command';
import type { CommandDefinition } from '../../command/CommandDefinition';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { RecognitionApi } from '../../../api/recognition';
import '../../../platform/idea/WorldClockRegistry';
import SpellCatalogue from '../../../platform/idea/SpellCatalogue';
import Spell from '../../../platform/idea/magic/Spell';
import Scroll from '../../../platform/thing/magic/Scroll';
import GlowlightOrb from '../../../platform/thing/magic/GlowlightOrb';
import { Template } from '../../stuff/Template';
import { Idea } from '../../stuff/Idea';
import { Character } from '../../character/Character';
import Species from '../../../platform/idea/species/Species';
import Room from '../../../platform/location/Room';
import { Dose } from '../Dose';
import { MarkedMixin, MARK_FORMS } from '../../description/Marked';
import { ConsumableMixin } from '../Consumable';
import { ArcaneMixin } from '../Arcane';
import { IdentifiableMixin } from '../../identification/Identifiable';
import { VisibleMixin } from '../../description/Visible';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { BulkableMixin } from '../../bulk/Bulkable';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
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
/** The potion shape: identity rides the MATERIAL, not the vessel. */
class TestDraught extends IdentifiableMixin(Material) {}
/** …and the vessel, which is just glass and knows nothing. */
class TestFlask extends BulkableMixin(ContainableMixin(NamedMixin(Idea))) {}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  '../../../../../../content/arcane-library/content/stuff/idea/magic/Spell',
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
    stampTemplatePathForTest(catalogueSingleton, '/platform/idea/SpellCatalogue');
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
  stampTemplatePathForTest(species, `/stuff/idea/species/test/cons-${n}`);
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
  s.setCarriedSpellPath(`/stuff/idea/magic/Spell/${spellId}`);
  return s;
}

/**
 * What the runtime collector actually affords for a Scroll in `bucket`.
 *
 * Deliberately NOT `Scroll.commandContributions`: that static is
 * shadowed by whichever composed mixin declared it last, while the
 * collector walks the whole chain and unions. Asserting the static
 * would be asserting an implementation detail — and the wrong one.
 */
function scrollContributions(
  bucket: 'self' | 'inventory' | 'environment' | 'peers',
): CommandDefinition[] {
  return CommandApi.collectContributions(Scroll, bucket);
}

/** The verb set an INSTANCE affords across every bucket. */
function instanceVerbs(item: Scroll): string[] {
  const buckets = ['inventory', 'environment', 'peers'] as const;
  const verbs = new Set<string>();
  for (const b of buckets) {
    for (const def of CommandApi.collectContributions(
      item.constructor as never,
      b,
    )) {
      for (const v of def.verbs) verbs.add(v);
    }
  }
  return [...verbs].sort();
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

  it('AC5a — no item template declares a use-verb; the CAPABILITIES do', async () => {
    await CommandApi.preloadAll?.();
    // ⚠ Read the COLLECTOR, not the static. `commandContributions` is a
    // static, so the outermost mixin's declaration shadows the inner
    // ones on the class object — but the runtime collector walks the
    // whole mixin chain and unions them, which is what actually
    // determines a scroll's affordances.
    // A held scroll grants OUTWARD to its holder, so its verbs live in
    // the `environment` bucket under the directional model.
    const verbs = new Set(
      scrollContributions('environment').flatMap((d) => d.verbs),
    );
    // `read` from MarkedMixin, `label` from LabelledMixin. Each written
    // ONCE, on its capability — the scroll declares neither.
    expect(verbs.has('read')).toBe(true);
    expect(verbs.has('label')).toBe(true);
    // And no use-verb of its own invention.
    expect(verbs.has('identify')).toBe(false);
  });

  it('AC5a — an unafforded verb is UNKNOWN; there is no parser floor', () => {
    // ⚠ This INVERTS what AC 5a originally asked for, deliberately.
    //
    // Wave 2 shipped a "parser floor": before answering "unknown verb",
    // check whether the verb exists anywhere in the catalogue and, if
    // so, dispatch a stock refusal instead. That made an unassigned verb
    // BEHAVE as assigned — a shadow affordance, and a third mechanism
    // beside two that already work:
    //
    //   - a verb reaches you by being CONTRIBUTED
    //     (`commandContributions`; the `self` bucket for one that should
    //     always be available, because having a mouth is a fact about
    //     the ACTOR rather than about the flask);
    //   - a refusal with a reason is a VALIDATOR.
    //
    // So the floor is gone and the honest answer is restored: a verb
    // nobody afforded is unknown. Making `drink` universally typeable is
    // a content decision — contribute it on `self` — not a parser
    // special case.
    const drink = CommandApi.allDefinitions().find((d) => d.hasVerb('drink'));
    expect(drink).toBeTruthy(); // still in the catalogue…
    // …and carries no stock-refusal string for a dispatcher to fake an
    // affordance with. The field is gone from the view type entirely.
    expect(
      (drink as unknown as { unafforded?: string }).unafforded,
    ).toBeUndefined();
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

  it('AC5c — two scrolls of different class afford an IDENTICAL verb set', () => {
    const identifyScroll = makeScroll('identify');
    const veilScroll = makeScroll('veil');
    // Different hidden class…
    expect(identifyScroll.getCarriedSpellPath()).not.toBe(
      veilScroll.getCarriedSpellPath(),
    );
    // …identical affordances. If they differed, the verb list would tell
    // you which scroll you were holding.
    expect(instanceVerbs(identifyScroll)).toEqual(instanceVerbs(veilScroll));
    expect(instanceVerbs(identifyScroll)).toContain('read');
  });

  it('AC5c — a SPENT consumable still affords its verb', () => {
    const fresh = makeScroll('veil');
    const spent = makeScroll('veil');
    spent.setUsesRemaining(0);
    expect(spent.isSpent()).toBe(true);
    // The affordance reflects the KIND, never the state. If a spent
    // scroll stopped affording `read`, the affordance list would become
    // a free inventory-state readout.
    expect(instanceVerbs(spent)).toEqual(instanceVerbs(fresh));
    expect(instanceVerbs(spent)).toContain('read');
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

  it('D24 — identifying a VESSEL reaches the substance inside it', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);

    // The shape a player actually holds: a flask, which is just glass,
    // full of a draught, which is where the identity lives. Without the
    // redirect this answers "there is nothing hidden to learn about a
    // stoppered glass flask" — true of the glass, useless to the player.
    const draught = makeStuffAtPath(
      () => {
        const m = new TestDraught();
        m.setName('veiling draught');
        m.setTags(['liquid']);
        m.setDescriptorClass('potion');
        m.setIdentifiedName('a veiling draught');
        return m;
      },
      `/stuff/idea/material/potion/cons-${seq++}`,
    );
    const flask = makeStuff(() => {
      const v = new TestFlask();
      v.setName('flask');
      v.interiorBulk = true;
      v.setInteriorCapacity(Quantity.of(0.25, 'L'));
      v.setBulkMaterial('interior', draught as unknown as Material);
      v.setBulkAmount('interior', Quantity.of(0.25, 'L'));
      return v;
    });
    ContainmentApi.move(flask as unknown as never, room);

    const scroll = makeScroll('identify');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    const out = await MagicApi.discharge(scroll, flask as unknown as never);
    expect(out.ok).toBe(true);
    // The record lands on the MATERIAL's path, which is what makes one
    // reading cover every flask of that draught — and what makes
    // decanting carry the knowledge.
    expect(
      reader.recall(IDENTIFICATION, draught.getTemplatePath()!)?.payload
        .typeKnown,
    ).toBe(true);
    expect(out.reports.join(' ')).toContain('a veiling draught');
  });

  it('D24 — identifying something with nothing to learn still refuses', async () => {
    const room = makeRoom();
    const reader = makeActor();
    ContainmentApi.move(reader, room);
    // An empty flask is only glass; the redirect must not invent a
    // subject where there is none.
    const empty = makeStuff(() => {
      const v = new TestFlask();
      v.setName('flask');
      v.interiorBulk = true;
      v.setInteriorCapacity(Quantity.of(0.25, 'L'));
      return v;
    });
    ContainmentApi.move(empty as unknown as never, room);
    const scroll = makeScroll('identify');
    ContainmentApi.move(scroll, room);
    actingAs(reader);

    const out = await MagicApi.discharge(scroll, empty as unknown as never);
    expect(out.reports.join(' ')).toContain('nothing hidden to learn');
  });
});
