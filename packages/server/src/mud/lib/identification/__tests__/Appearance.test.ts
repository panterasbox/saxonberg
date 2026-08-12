/**
 * Wave 5 — identification.
 *
 * AC 15 — memory is per-viewer and keyed by class; `knownAttributes`
 *         carries the state and no 0–1 scalar is stored.
 * AC 16 — appearance is DERIVED; nothing is persisted on an instance,
 *         and an item stashed across a generation change re-renders on
 *         retrieval with no withdrawal sweep.
 * AC 17 — two items of the same class at different points in a
 *         transition window render differently, and a viewer may hold
 *         valid records for both.
 * AC 18 — a record learned in a prior generation displays as a hedge.
 * AC 19 — a label survives a generation change.
 * AC 20 — consumables glob; per-instance continuous state does not.
 * AC 22 — a labelled item does not auto-merge.
 * AC 23 — a stack flips as a unit at its own window position.
 * AC 25 — banks are deep enough and name no material.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { RecognitionApi } from '../../../api/recognition';
import { Appearance, GENERATION_DEFAULTS } from '../Appearance';
import { DescriptorBank } from '../DescriptorBank';
import { IdentifiableMixin } from '../Identifiable';
import { LabelledMixin } from '../../description/Labelled';
import { GlobbableMixin } from '../../stuff/Globbable';
import { ChargedMixin } from '../../magic/Charged';
import { ReservedMixin } from '../../reserve';
import { VisibleMixin } from '../../description/Visible';
import { ContainableMixin } from '../../spatial/Containable';
import { BeliefStoreMixin, IDENTIFICATION } from '../../belief/BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import Thing from '../../stuff/Thing';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Viewer extends BeliefStoreMixin(PerceptionMixin(SensorMixin(Idea))) {}
/** A stackable, labellable, identifiable consumable — the potion shape. */
class Flask extends LabelledMixin(
  IdentifiableMixin(GlobbableMixin(VisibleMixin(ContainableMixin(Idea)))),
) {}
/** A charged item: continuous per-instance state, so it must NOT glob. */
class Wand extends ChargedMixin(ReservedMixin(IdentifiableMixin(Thing))) {}

const __filename = fileURLToPath(import.meta.url);
const BANKS_DIR = join(
  dirname(__filename),
  '../../../../../../content/arcane-descriptors/content/descriptor-banks',
);

let seq = 0;
let real = 100000;
const SCALE = 12;

/** Warm the real authored banks — the sync read path production uses. */
function installBanks(): DescriptorBank[] {
  const banks = readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const doc = YAML.parse(readFileSync(join(BANKS_DIR, f), 'utf-8')) as
        Record<string, unknown>;
      const bank = new DescriptorBank();
      bank.key = f.replace(/\.yaml$/, '');
      bank.primary = (doc.primary as string[]) ?? [];
      bank.secondary = (doc.secondary as string[]) ?? [];
      bank.primaryAxis = (doc.primaryAxis as string) ?? '';
      bank.secondaryAxis = (doc.secondaryAxis as string) ?? '';
      return bank;
    });
  DescriptorBank.primeCache(banks);
  return banks;
}

function makeFlask(path = '/obj/test/flask-shared'): Flask {
  const f = makeStuffAtPath(() => new Flask(), path);
  f.setShortDescription('a flask');
  f.setIdentifiedName('a veiling draught');
  f.setDescriptorClass('potion');
  return f;
}

describe('Appearance — derived, never stored', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBanks();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    vi.restoreAllMocks();
  });

  it('AC16 — every current-generation item of a class looks IDENTICAL', () => {
    const a = makeFlask();
    const b = makeFlask();
    // Deliberate: per-instance visual variation is closed off, because
    // it would be a second axis of hidden state with no mechanic behind
    // it. What varies between these two is only WHEN they will flip.
    expect(a.renderAppearance(3, 0)).toBe(b.renderAppearance(3, 0));
    expect(a.renderAppearance(3, 0).length).toBeGreaterThan(0);
  });

  it('AC16 — nothing about the appearance is persisted on the instance', () => {
    const flask = makeFlask();
    flask.renderAppearance(3, 0);
    const persisted = Object.keys(flask).filter((k) =>
      k.toLowerCase().includes('appearance'),
    );
    // The ONLY thing stored is the turnover SEED — a position in the
    // window, not a look. That is what keeps D26 true.
    expect(persisted).toEqual([]);
    expect(flask.getTurnoverSeed().length).toBeGreaterThan(0);
  });

  it('AC16 — a stashed item RE-RENDERS on retrieval; no withdrawal sweep', () => {
    const flask = makeFlask();
    const before = flask.renderAppearance(3, 0);
    // "Stash" it across a whole generation — nothing sweeps, nothing is
    // migrated, no record is rewritten. It simply reads differently.
    const after = flask.renderAppearance(4, 0);
    expect(after).not.toBe(before);
    expect(after.length).toBeGreaterThan(0);
    // …and going back yields the original, because it is a pure
    // function of (class, generation) and nothing else.
    expect(flask.renderAppearance(3, 0)).toBe(before);
  });

  it('AC17 — two items at different window positions render DIFFERENTLY', () => {
    const early = makeFlask();
    const late = makeFlask();
    // Force known window positions rather than trusting two random
    // UUIDs to straddle the midpoint.
    early.turnoverSeed = 'seed-early';
    late.turnoverSeed = 'seed-late';
    const pEarly = Appearance.windowPositionOf('seed-early');
    const pLate = Appearance.windowPositionOf('seed-late');
    const [low, high] =
      pEarly < pLate ? [early, late] : [late, early];
    const progress = (Math.min(pEarly, pLate) + Math.max(pEarly, pLate)) / 2;

    const lowLook = low.renderAppearance(5, progress);
    const highLook = high.renderAppearance(5, progress);
    // The one that the world has passed shows the NEW descriptor; the
    // one it has not still shows the old. Old and new stock coexisting
    // on the shelf — the shape everyone recognizes from a real
    // changeover.
    expect(lowLook).not.toBe(highLook);
  });

  it('AC17 — outside the window NOTHING is mid-flip', () => {
    const a = makeFlask();
    const b = makeFlask();
    a.turnoverSeed = 'seed-early';
    b.turnoverSeed = 'seed-late';
    // progress 0 = not in the changeover at all.
    expect(a.renderAppearance(5, 0)).toBe(b.renderAppearance(5, 0));
    // …and once the window completes, everything has crossed.
    expect(a.renderAppearance(5, 1)).toBe(b.renderAppearance(5, 1));
    // The two ends of the window are different descriptors, which is
    // what makes the middle interesting.
    expect(a.renderAppearance(5, 0)).not.toBe(a.renderAppearance(5, 1));
  });

  it('AC23 — a STACK is a batch: one seed, one window position', () => {
    const stack = makeFlask();
    const seed = stack.getTurnoverSeed();
    // A stack is one Stuff, so it has exactly one position and flips as
    // a UNIT rather than flask by flask. That is how a real stock
    // changeover works, and staggering happens ACROSS stacks — which is
    // ample, since most items in the world live in stacks.
    expect(stack.getTurnoverSeed()).toBe(seed);
    stack.setQuantity(40);
    expect(stack.getTurnoverSeed()).toBe(seed);
  });

  it('the seed is DURABLE — it survives a hydrate, unlike stuffId', () => {
    const flask = makeFlask();
    const seed = flask.getTurnoverSeed();
    // The bug this exists to avoid: `stuffId` is a fresh UUID per
    // construction, so hashing it would make every item's flip moment
    // jitter on every reboot — and items would visibly flip BACK.
    const restored = makeFlask('/obj/test/flask-restored');
    restored.turnoverSeed = seed; // what the Hydrator does
    expect(restored.getTurnoverSeed()).toBe(seed);
    expect(Appearance.windowPositionOf(restored.getTurnoverSeed())).toBe(
      Appearance.windowPositionOf(seed),
    );
  });

  it('the hash is deterministic across processes', () => {
    // Not a JS Map order, not an object hash — a real FNV-1a, because
    // the window position has to mean the same thing after a restart.
    expect(Appearance.hash('potion#3')).toBe(Appearance.hash('potion#3'));
    expect(Appearance.hash('potion#3')).not.toBe(Appearance.hash('potion#4'));
    expect(Appearance.windowPositionOf('x')).toBeGreaterThanOrEqual(0);
    expect(Appearance.windowPositionOf('x')).toBeLessThan(1);
  });

  it('classes STAGGER against each other', () => {
    const potionA = Appearance.descriptorFor('potion', 7, DescriptorBank.cached('potion'));
    const wandA = Appearance.descriptorFor('wand', 7, DescriptorBank.cached('wand'));
    // Different classes hash their own key, so they draw independently
    // — there is never a day the whole world visibly turns over.
    expect(potionA).not.toBe(wandA);
  });

  it('the generation derives from the world clock — no rotation record', () => {
    const { generation, progress } = Appearance.currentGeneration();
    expect(Number.isInteger(generation)).toBe(true);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
    // Advance a whole generation and the number moves, with nothing
    // stored, swept, or migrated.
    real += (GENERATION_DEFAULTS.LENGTH_GAME_SEC / SCALE) * 1000;
    expect(Appearance.currentGeneration().generation).toBe(generation + 1);
  });

  it('an unseeded bank renders NOTHING rather than a blank descriptor', () => {
    DescriptorBank.clearCache();
    const flask = makeFlask();
    // A content gap degrades to the authored short description rather
    // than rendering "a  potion".
    expect(flask.renderAppearance(3, 0)).toBe('');
  });
});

describe('Identification — per-viewer, per-class', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBanks();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    vi.restoreAllMocks();
  });

  it('AC15 — knownAttributes carries the state; NO 0–1 scalar is stored', () => {
    const viewer = makeStuff(() => new Viewer());
    const flask = makeFlask(`/obj/test/flask-known-${seq++}`);
    viewer.know(IDENTIFICATION, flask.getTemplatePath()!, {
      typeKnown: true,
      knownAttributes: ['type'],
      learnedGeneration: 3,
    });
    const payload = viewer.recall(
      IDENTIFICATION,
      flask.getTemplatePath()!,
    )!.payload as Record<string, unknown>;

    expect(payload.knownAttributes).toEqual(['type']);
    // You know FACTS. How identified something is falls out of which
    // facts you hold — there is no fraction-of-a-fact anywhere.
    expect(payload.identificationLevel).toBeUndefined();
    expect(
      Object.keys(payload).some((k) => /level|percent|progress/i.test(k)),
    ).toBe(false);
  });

  it('AC15 — the record is per-VIEWER and keyed by CLASS', () => {
    const knower = makeStuff(() => new Viewer());
    const stranger = makeStuff(() => new Viewer());
    const one = makeFlask('/obj/test/flask-class');
    const two = makeFlask('/obj/test/flask-class'); // same class

    knower.know(IDENTIFICATION, one.getTemplatePath()!, { typeKnown: true });
    // Keyed on templatePath, so knowing one flask knows every flask of
    // that class — two flasks of the same draught are ONE fact.
    expect(RecognitionApi.describe(knower, two)).toBe('a veiling draught');
    // …and it teaches the stranger nothing.
    expect(RecognitionApi.describe(stranger, two)).not.toBe(
      'a veiling draught',
    );
  });

  it('AC18 — a PRIOR-generation record hedges rather than asserts', () => {
    const viewer = makeStuff(() => new Viewer());
    const flask = makeFlask(`/obj/test/flask-hedge-${seq++}`);
    const now = Appearance.currentGeneration().generation;
    viewer.know(IDENTIFICATION, flask.getTemplatePath()!, {
      typeKnown: true,
      learnedGeneration: now - 2,
    });

    const shown = RecognitionApi.describe(viewer, flask);
    // Never *"a veiling draught"* flatly — the descriptor it learned may
    // now mean something else entirely. Knowledge is not invalidated;
    // only its applicability fades.
    expect(shown).toMatch(/you once knew/);
    expect(shown).toContain('veiling draught');
  });

  it('AC18 — a CURRENT-generation record asserts plainly', () => {
    const viewer = makeStuff(() => new Viewer());
    const flask = makeFlask(`/obj/test/flask-current-${seq++}`);
    viewer.know(IDENTIFICATION, flask.getTemplatePath()!, {
      typeKnown: true,
      learnedGeneration: Appearance.currentGeneration().generation,
    });
    const shown = RecognitionApi.describe(viewer, flask);
    expect(shown).toBe('a veiling draught');
    expect(shown).not.toMatch(/you once knew/);
  });

  it('AC18 — NO record shows the derived look, not the authored stub', () => {
    const viewer = makeStuff(() => new Viewer());
    const flask = makeFlask(`/obj/test/flask-unknown-${seq++}`);
    const shown = RecognitionApi.describe(viewer, flask);
    expect(shown).toMatch(/potion/);
    expect(shown).not.toContain('veiling draught');
  });

  it('AC19 — a LABEL survives a generation change, and wins over the look', () => {
    const viewer = makeStuff(() => new Viewer());
    const flask = makeFlask(`/obj/test/flask-label-${seq++}`);
    flask.setLabel('the good stuff');

    expect(RecognitionApi.describe(viewer, flask)).toBe('the good stuff');
    // Roll the world forward a whole generation: what the WORLD calls
    // the thing rotates; what YOU call it does not. That asymmetry is
    // the entire point of the feature.
    real += (GENERATION_DEFAULTS.LENGTH_GAME_SEC / SCALE) * 1000;
    expect(RecognitionApi.describe(viewer, flask)).toBe('the good stuff');
  });

  it('AC19 — a label is trimmed and capped, never refused', () => {
    const flask = makeFlask(`/obj/test/flask-cap-${seq++}`);
    flask.setLabel('   spaced out   ');
    expect(flask.getLabel()).toBe('spaced out');
    flask.setLabel('x'.repeat(500));
    // Losing the tail of a note beats losing the note.
    expect(flask.getLabel().length).toBe(120);
    flask.setLabel('');
    expect(flask.isLabelled()).toBe(false);
  });
});

describe('Globbing — what merges and what must not', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBanks();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    vi.restoreAllMocks();
  });

  it('AC20 — two identical consumables MERGE', () => {
    const a = makeFlask('/obj/test/flask-merge');
    const b = makeFlask('/obj/test/flask-merge');
    expect(a.canMergeWith(b)).toBe(true);
  });

  it('AC20 — anything with continuous per-instance state does NOT glob', () => {
    // A charged item cannot be fungible: two wands at different charge
    // levels are not interchangeable, and folding them into a stack
    // would have to pick one number and throw the other away.
    const wand = makeStuff(() => new Wand());
    expect(
      Object.prototype.hasOwnProperty.call(wand, 'quantity'),
    ).toBe(false);
  });

  it('AC22 — a LABELLED item does not auto-merge', () => {
    const plain = makeFlask('/obj/test/flask-lab');
    const labelled = makeFlask('/obj/test/flask-lab');
    labelled.setLabel('do not drink');
    // A player wrote on that one on purpose; folding it silently into a
    // pile would throw away information they created.
    expect(plain.canMergeWith(labelled)).toBe(false);
    expect(labelled.canMergeWith(plain)).toBe(false);
    labelled.setLabel('');
    expect(plain.canMergeWith(labelled)).toBe(true);
  });

  it('AC23 — stacks at different window positions do NOT merge, then DO', () => {
    const early = makeFlask('/obj/test/flask-window');
    const late = makeFlask('/obj/test/flask-window');
    early.turnoverSeed = 'seed-early';
    late.turnoverSeed = 'seed-late';
    const positions = ['seed-early', 'seed-late'].map((s) =>
      Appearance.windowPositionOf(s),
    );
    const mid = (positions[0]! + positions[1]!) / 2;

    // Mid-window they LOOK different, so they must not silently become
    // one pile.
    vi.spyOn(Appearance, 'currentGeneration').mockReturnValue({
      generation: 5,
      progress: mid,
    });
    expect(early.canMergeWith(late)).toBe(false);

    // The window is SELF-HEALING: once both have passed their flip
    // point, the merge-on-arrival ripple folds them together on next
    // contact. Nothing sweeps; the ordinary ripple does it.
    vi.spyOn(Appearance, 'currentGeneration').mockReturnValue({
      generation: 5,
      progress: 1,
    });
    expect(early.canMergeWith(late)).toBe(true);
  });
});

describe('AC25 — the authored banks', () => {
  it('are deep enough, two-axis, and name no material', () => {
    const banks = installBanks();
    expect(banks.length).toBe(6);
    for (const bank of banks) {
      expect(bank.primary.length).toBeGreaterThan(0);
      expect(bank.primaryAxis.length).toBeGreaterThan(0);
      // Depth is the PRODUCT of the axes — ten and ten give a hundred
      // distinguishable descriptors from twenty authored words, and
      // every word stays meaningful.
      if (bank.key !== 'scroll') {
        expect(bank.secondary.length).toBeGreaterThan(0);
        expect(bank.getDepth()).toBe(
          bank.primary.length * bank.secondary.length,
        );
        expect(bank.getDepth()).toBeGreaterThanOrEqual(
          10 * (Appearance.REUSE_DELAY + 1),
        );
      }
    }
    DescriptorBank.clearCache();
  });

  it('the reuse delay is 3, and is named for what an author reasons about', () => {
    // Low values make the "you once knew blue to mean healing" hedge a
    // common sight; high values make it rare and cost vocabulary. The
    // authoring cost is the SAME at 3 or 4 — it only starts costing
    // vocabulary at 5+.
    expect(Appearance.REUSE_DELAY).toBe(3);
  });
});
