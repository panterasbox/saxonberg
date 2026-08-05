/**
 * **The paragraph withholds what the name withholds.**
 *
 * The derived short name exists so an unidentified item does not
 * announce itself. The long description sat outside that: it was the
 * authored paragraph, always, and authors write those for the
 * *identified* item. `a crooked beaded wand` over "A finger-length rod
 * of pale ash… it throws fire" is a name doing its job above prose
 * undoing it — and the author had no reason to suspect they leaked
 * anything, which is what makes it a substrate problem rather than a
 * content problem.
 *
 * So the **class** owns the unidentified prose (one paragraph per
 * descriptor bank, `{descriptor}` interpolated so it agrees with the
 * name above it) and the **item** owns the identified prose. Which one
 * you get is a fact about the reader.
 *
 * ⚠ The gate is `knowsTrueType`, which is deliberately narrower than
 * "shows a type name": a **believed** name reads as knowledge from the
 * inside and is not knowledge. Revealing the authored paragraph to a
 * misidentified reader would contradict the very name the curse
 * planted, and false information is only worse than none while it
 * stays uncontradicted.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { RecognitionApi } from '../../../api/recognition';
import { Appearance } from '../Appearance';
import { DescriptorBank } from '../DescriptorBank';
import { IdentifiableMixin } from '../Identifiable';
import { VisibleMixin } from '../../description/Visible';
import { DetailedMixin } from '../../description/Detailed';
import { ContainableMixin } from '../../spatial/Containable';
import { BeliefStoreMixin, IDENTIFICATION } from '../../belief/BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Viewer extends BeliefStoreMixin(PerceptionMixin(SensorMixin(Idea))) {}
class Wand extends IdentifiableMixin(VisibleMixin(ContainableMixin(Idea))) {}

const BANKS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../content/arcane-descriptors/content/descriptor-banks',
);

const AUTHORED_LONG =
  'A finger-length rod of pale ash, banded with tarnished brass. ' +
  'A pull on it throws a lance of true flame.';

let seq = 0;

/** Warm the real authored banks — the sync read path production uses. */
function installBanks(): void {
  const banks = readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const doc = YAML.parse(readFileSync(join(BANKS_DIR, f), 'utf-8')) as Record<
        string,
        unknown
      >;
      const bank = new DescriptorBank();
      bank.key = f.replace(/\.yaml$/, '');
      bank.primary = (doc.primary as string[]) ?? [];
      bank.secondary = (doc.secondary as string[]) ?? [];
      bank.primaryAxis = (doc.primaryAxis as string) ?? '';
      bank.secondaryAxis = (doc.secondaryAxis as string) ?? '';
      bank.unidentifiedLong = ((doc.unidentifiedLong as string) ?? '').trim();
      bank.unidentifiedDetails =
        (doc.unidentifiedDetails as Record<string, string>) ?? {};
      return bank;
    });
  DescriptorBank.primeCache(banks);
}

function makeWand(descriptorClass = 'wand'): Wand {
  const w = makeStuffAtPath(() => new Wand(), `/obj/test/wand-${seq++}`);
  w.setShortDescription('a wand');
  w.setLongDescription(AUTHORED_LONG);
  w.setIdentifiedName('a wand of firebolt');
  w.setDescriptorClass(descriptorClass);
  return w;
}

/** `getLongFor` through the proxy, as a render path would reach it. */
function longFor(viewer: Stuff, item: Wand): string {
  return (item as unknown as { getLongFor(v: Stuff): string }).getLongFor(viewer);
}

describe('the unidentified long description', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
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

  it('⭐ an unidentified item shows the CLASS prose, never the authored paragraph', () => {
    const viewer = makeStuff(() => new Viewer());
    const wand = makeWand();
    const shown = longFor(viewer as unknown as Stuff, wand);
    expect(shown).not.toContain('lance of true flame');
    expect(shown).not.toBe(AUTHORED_LONG);
    expect(shown).toContain('Whatever a maker bound into it');
  });

  it('identifying it reveals the authored paragraph', () => {
    const viewer = makeStuff(() => new Viewer());
    const wand = makeWand();
    viewer.know(IDENTIFICATION, wand.getTemplatePath()!, { typeKnown: true });
    expect(longFor(viewer as unknown as Stuff, wand)).toBe(AUTHORED_LONG);
    // …and the name reveals in the same breath, which is the invariant
    // that matters: the two halves cannot disagree.
    expect(RecognitionApi.describe(viewer as unknown as Stuff, wand)).toBe(
      'a wand of firebolt',
    );
  });

  it('the paragraph AGREES with the name — `{descriptor}` is interpolated', () => {
    const viewer = makeStuff(() => new Viewer());
    const wand = makeWand();
    const { generation, progress } = Appearance.currentGeneration();
    const descriptor = wand.renderAppearance(generation, progress);
    expect(descriptor.length).toBeGreaterThan(0);
    expect(longFor(viewer as unknown as Stuff, wand)).toContain(descriptor);
    // No token survives into the rendered prose.
    expect(longFor(viewer as unknown as Stuff, wand)).not.toContain('{');
  });

  it('⭐ `{a}` resolves the article against the word actually DRAWN', () => {
    // Half of a bank is vowel-initial, so an authored "a" is one draw
    // away from being a typo at all times — and the draw rotates on a
    // schedule, so it would appear months after the prose was written.
    // Same `articleFor` the derived name uses; they cannot disagree.
    const viewer = makeStuff(() => new Viewer());
    const bank = DescriptorBank.cached('wand')!;
    const wand = makeWand();

    bank.primary = ['opal'];
    bank.secondary = [];
    Appearance.clearMemo();
    expect(longFor(viewer as unknown as Stuff, wand)).toContain('An opal rod');

    bank.primary = ['beaded'];
    Appearance.clearMemo();
    expect(longFor(viewer as unknown as Stuff, wand)).toContain('A beaded rod');
  });

  it('⚠ a BELIEVED name keeps the class prose — the curse is not contradicted', () => {
    // A cursed identify plants confidence, not knowledge. Handing over
    // the authored paragraph here would tell the reader, in the very
    // next line, that the name they were given is wrong.
    const viewer = makeStuff(() => new Viewer());
    const wand = makeWand();
    viewer.know(IDENTIFICATION, wand.getTemplatePath()!, {
      typeKnown: true,
      believedName: 'a wand of light',
    });
    expect(RecognitionApi.describe(viewer as unknown as Stuff, wand)).toBe(
      'a wand of light',
    );
    expect(longFor(viewer as unknown as Stuff, wand)).not.toBe(AUTHORED_LONG);
    expect(RecognitionApi.knowsTrueType(viewer as unknown as Stuff, wand)).toBe(
      false,
    );
  });

  it('⚠ a PRIOR-generation record keeps the class prose — it hedges, so must the prose', () => {
    const viewer = makeStuff(() => new Viewer());
    const wand = makeWand();
    const { generation } = Appearance.currentGeneration();
    viewer.know(IDENTIFICATION, wand.getTemplatePath()!, {
      typeKnown: true,
      learnedGeneration: generation - 5,
    });
    expect(RecognitionApi.knowsTrueType(viewer as unknown as Stuff, wand)).toBe(
      false,
    );
    expect(longFor(viewer as unknown as Stuff, wand)).not.toBe(AUTHORED_LONG);
  });

  it('silence FALLS THROUGH — a class with no prose must not blank the item', () => {
    // The no-regression case, and the reason this is a fallback rather
    // than a replacement: an item whose bank authors nothing keeps
    // exactly the description it had before any of this existed.
    const viewer = makeStuff(() => new Viewer());
    const bank = DescriptorBank.cached('wand')!;
    bank.unidentifiedLong = '';
    const wand = makeWand();
    expect(longFor(viewer as unknown as Stuff, wand)).toBe(AUTHORED_LONG);
  });

  it('an item with no descriptor class is untouched by any of this', () => {
    const viewer = makeStuff(() => new Viewer());
    const plain = makeWand('');
    expect(longFor(viewer as unknown as Stuff, plain)).toBe(AUTHORED_LONG);
  });

  it('a non-identifiable host keeps the viewer-blind default', () => {
    // `getLongFor` lands on Visible for everything in the world; the
    // override is the exception, not the rule.
    class Rock extends VisibleMixin(ContainableMixin(Idea)) {}
    const viewer = makeStuff(() => new Viewer());
    const rock = makeStuff(() => new Rock());
    rock.setLongDescription('A rock.');
    expect(
      (rock as unknown as { getLongFor(v: Stuff): string }).getLongFor(
        viewer as unknown as Stuff,
      ),
    ).toBe('A rock.');
  });
});

/**
 * **The detail keys, which leak harder than the prose.**
 *
 * A detail is authored for the identified item and names the part by
 * what it *does* — `sigil`, `scorch`, `focus-lens`. The key alone gives
 * the answer away before the text is read, and unlike prose the key is
 * **parsed**: `look at sigil on wand` either resolves or it does not,
 * and which one it does is a free identification oracle. Exactly the
 * D34 shape as a flat wand dropping `zap` from its affordance list.
 *
 * ⚠ The fallthrough **inverts** relative to `unidentifiedLong`. Silence
 * there falls back to the authored paragraph, because an item with no
 * description is broken. Silence here shows nothing: an item with no
 * examinable parts is an ordinary item, so hiding costs nothing and
 * leaking costs everything.
 */
describe('the unidentified detail tree', () => {
  class DetailedWand extends IdentifiableMixin(
    DetailedMixin(VisibleMixin(ContainableMixin(Idea))),
  ) {}

  function makeDetailed(descriptorClass = 'wand'): DetailedWand {
    const w = makeStuffAtPath(
      () => new DetailedWand(),
      `/obj/test/dwand-${seq++}`,
    );
    w.setShortDescription('a wand');
    w.setIdentifiedName('a wand of firebolt');
    w.setDescriptorClass(descriptorClass);
    w.setDetail(['sigil', 'glyph'], 'The firebolt glyph, cut deep.');
    w.setDetail(['grip'], 'Ash worn smooth, and warm even now.');
    return w;
  }

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBanks();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    DescriptorBank.clearCache();
    vi.restoreAllMocks();
  });

  it('⭐ the KEYS are the leak — an unidentified item offers only its class\'s', () => {
    const viewer = makeStuff(() => new Viewer()) as unknown as Stuff;
    const wand = makeDetailed();
    const ids = wand.getDetailIds(undefined, viewer) ?? [];
    expect(ids).not.toContain('sigil');
    expect(ids).not.toContain('glyph');
    expect(ids).toContain('grip'); // the bank's generic part
    expect(ids).toContain('tip');
  });

  it('the authored TEXT is unreachable even by exact key', () => {
    const viewer = makeStuff(() => new Viewer()) as unknown as Stuff;
    const wand = makeDetailed();
    expect(wand.getDetailFor(viewer, 'sigil')).toBeNull();
    expect(wand.hasDetail('sigil', undefined, viewer)).toBe(false);
    // …and the shared key reads the CLASS's text, not the item's.
    expect(wand.getDetailFor(viewer, 'grip')).toContain('carried far more');
    expect(wand.getDetailFor(viewer, 'grip')).not.toContain('warm even now');
  });

  it('identifying it hands over the authored parts', () => {
    const viewer = makeStuff(() => new Viewer());
    const wand = makeDetailed();
    viewer.know(IDENTIFICATION, wand.getTemplatePath()!, { typeKnown: true });
    const v = viewer as unknown as Stuff;
    expect(wand.getDetailIds(undefined, v)).toContain('sigil');
    expect(wand.getDetailFor(v, 'sigil')).toContain('firebolt glyph');
    expect(wand.getDetailFor(v, 'grip')).toContain('warm even now');
  });

  it('⚠ silence FAILS CLOSED — the opposite of the prose fallthrough', () => {
    // An item with no examinable parts is an ordinary item. Falling
    // through to the authored tree here would re-open the whole leak.
    const viewer = makeStuff(() => new Viewer()) as unknown as Stuff;
    const bank = DescriptorBank.cached('wand')!;
    bank.unidentifiedDetails = {};
    const wand = makeDetailed();
    expect(wand.getDetailIds(undefined, viewer)).toEqual([]);
    expect(wand.getDetailFor(viewer, 'sigil')).toBeNull();
  });

  it('no descriptor class ⇒ not playing this game; details pass through', () => {
    // Same guard, same place, as `renderAppearance`: an item with no
    // bank has no derived appearance, so its own short description IS
    // its unidentified look and its own details are its own.
    const viewer = makeStuff(() => new Viewer()) as unknown as Stuff;
    const plain = makeDetailed('');
    expect(plain.getDetailIds(undefined, viewer)).toContain('sigil');
  });

  it('the AUTHORING read is unfiltered — no viewer, nothing to withhold from', () => {
    // Hydration, the composer and MQL system mode all read viewer-blind.
    const wand = makeDetailed();
    expect(wand.getDetailIds()).toContain('sigil');
    expect(wand.getDetail('sigil')).toContain('firebolt glyph');
  });

  it('a non-identifiable Detailed host is completely untouched', () => {
    class Door extends DetailedMixin(VisibleMixin(ContainableMixin(Idea))) {}
    const viewer = makeStuff(() => new Viewer()) as unknown as Stuff;
    const door = makeStuff(() => new Door());
    door.setDetail(['handle'], 'A brass handle.');
    expect(door.getDetailIds(undefined, viewer)).toEqual(['handle']);
    expect(door.getDetailFor(viewer, 'handle')).toBe('A brass handle.');
  });
});

/**
 * ⚠ The **fourth** surface, and the one only a live drive found.
 *
 * `wrapDetailKeysAugmenter` anchors any word in the finished prose that
 * matches a detail key. The unidentified scroll's *class* prose says
 * "in a hurried hand" — and the scroll has an authored `hand` detail —
 * so the paragraph came back with `<detail key="hand">hand</detail>` in
 * it. Nothing was revealed by the text; the **anchor** did it, by
 * asserting that this thing has a part called that.
 *
 * Tests could not have caught it: it needs prose and keys authored
 * independently, in the same world, to collide.
 */
describe('the detail-key augmenter', () => {
  class Scroll extends IdentifiableMixin(
    DetailedMixin(VisibleMixin(ContainableMixin(Idea))),
  ) {}

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBanks();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    DescriptorBank.clearCache();
    vi.restoreAllMocks();
  });

  function makeScroll(): Scroll {
    const s = makeStuffAtPath(() => new Scroll(), `/obj/test/scroll-${seq++}`);
    s.setShortDescription('a scroll');
    s.setIdentifiedName('a scroll of remove curse');
    s.setDescriptorClass('scroll');
    // The collision: the class prose contains the word "hand", and the
    // ITEM has a detail keyed `hand`.
    s.setDetail(['hand'], 'A clean liturgical hand.');
    return s;
  }

  it('⭐ does not anchor an AUTHORED key inside the class prose', () => {
    const viewer = makeStuff(() => new Viewer()) as unknown as Stuff;
    const scroll = makeScroll();
    const markup = (
      scroll as unknown as { getMarkupLong(v: Stuff): string }
    ).getMarkupLong(viewer);
    expect(markup).toContain('hurried hand');
    expect(markup).not.toContain('detail key="hand"');
  });

  it('…and DOES anchor it once you know what the thing is', () => {
    const viewer = makeStuff(() => new Viewer());
    const scroll = makeScroll();
    scroll.setLongDescription('Vellum, and a practised hand.');
    viewer.know(IDENTIFICATION, scroll.getTemplatePath()!, { typeKnown: true });
    const markup = (
      scroll as unknown as { getMarkupLong(v: Stuff): string }
    ).getMarkupLong(viewer as unknown as Stuff);
    expect(markup).toContain('detail key="hand"');
  });
});
