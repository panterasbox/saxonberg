/**
 * ⭐⭐ The colour model, and the one claim it exists to make true.
 *
 * `Dyed.ts` and `Dyestuff.ts` have said *"overdyeing is arithmetic —
 * blue over yellow IS green"* since they shipped, and until this model
 * landed it was false: `getColorTag()` returned the dominant
 * application's key string and overdyeing was max-by-strength. These
 * tests are what stop that being true again.
 *
 * ⚠ The shipped dye numbers are duplicated here as literals ON PURPOSE.
 * A test that read the YAML would pass whatever the rows happened to
 * say; the point is that THESE positions produce THOSE words, so a row
 * edited to something that no longer reads as its own prose fails here.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { Colour } from '../Colour';

/** The shipped positions — see `trade-dyeing/.../dyestuff/*.yaml`. */
const MADDER_ALUM = Colour.of(0.74, 0.1, 0.14);
const MADDER_IRON = Colour.of(0.34, 0.1, 0.2);
const WELD_ALUM = Colour.of(0.88, 0.78, 0.14);
const WOAD = Colour.of(0.12, 0.4, 0.75);

/**
 * What `DyeController` actually applies. A mordant dye on a full bath
 * is `fullness · exhaust(0.5) · 1.6` = **0.8**. Testing at any other
 * strength would be testing a bath nobody has.
 */
const MORDANT_BATH = 0.8;

/**
 * ⭐ The vat's real recurrence, from `DyeController.priorDepth`: each
 * dip is `0.35 + (deepest so far · 0.5)`, so depth climbs
 * 0.35 → 0.525 → 0.61 → 0.66 … and **asymptotes at 0.7**. A vat you
 * can never quite exhaust is the point of a vat.
 */
function vatDepthAfter(dips: number): number {
  let deepest = 0;
  for (let i = 0; i < dips; i++) {
    deepest = Math.max(deepest, Math.min(1, 0.35 + deepest * 0.5));
  }
  return deepest;
}

describe('⭐⭐ overdyeing is arithmetic', () => {
  it('blue over yellow IS green — the claim the docs always made', () => {
    // Weld first (a mordant bath), then woad built up in the vat, which
    // is the historical order: you dye yellow and then dip for green.
    const yellow = WELD_ALUM.atStrength(MORDANT_BATH);
    const blue = WOAD.atStrength(vatDepthAfter(8));
    expect(Colour.stack([yellow, blue]).nearestTag()).toBe('green');
  });

  it('⭐⭐ and it takes a DEEP vat — three dips is still olive', () => {
    /*
     * ⭐ MEASURED, not assumed, and it is the best thing the model
     * does. Green is not one dip away: weld over a shallow vat is a
     * yellow-green, and the dyer's answer is to go back in. That is
     * exactly how Lincoln green was made — repeated dipping — and a
     * lookup table could not have produced it, because a table would
     * have had to author "olive" and "green" as two outcomes and pick
     * one at authoring time.
     */
    const yellow = WELD_ALUM.atStrength(MORDANT_BATH);
    const shallow = Colour.stack([yellow, WOAD.atStrength(vatDepthAfter(1))]);
    const three = Colour.stack([yellow, WOAD.atStrength(vatDepthAfter(3))]);
    const deep = Colour.stack([yellow, WOAD.atStrength(vatDepthAfter(8))]);

    expect(shallow.nearestTag()).not.toBe('green');
    expect(three.nearestTag()).not.toBe('green');
    expect(deep.nearestTag()).toBe('green');
    // ⚠ And it walks there — each dip is nearer the green, so the dyer
    // gets feedback rather than a cliff.
    expect(three.lightness()).toBeLessThan(shallow.lightness());
    expect(deep.lightness()).toBeLessThan(three.lightness());
  });

  it('order does not change the colour — filters commute', () => {
    const a = Colour.stack([
      WELD_ALUM.atStrength(MORDANT_BATH),
      WOAD.atStrength(vatDepthAfter(3)),
    ]);
    const b = Colour.stack([
      WOAD.atStrength(vatDepthAfter(3)),
      WELD_ALUM.atStrength(MORDANT_BATH),
    ]);
    expect(a.toHex()).toBe(b.toHex());
  });

  it('red over blue is a purple nobody authored', () => {
    const tag = Colour.stack([
      MADDER_ALUM.atStrength(MORDANT_BATH),
      WOAD.atStrength(vatDepthAfter(3)),
    ]).nearestTag();
    expect(['purple', 'violet', 'indigo', 'maroon']).toContain(tag);
  });
});

describe('the single dyes read as their own prose', () => {
  it('madder + alum is a red', () => {
    expect(MADDER_ALUM.atStrength(MORDANT_BATH).nearestTag()).toBe('red');
  });

  it('weld + alum is a yellow', () => {
    expect(WELD_ALUM.atStrength(MORDANT_BATH).nearestTag()).toBe('yellow');
  });

  it('⚠ madder + iron is the DARK one — the mordant changes the pigment', () => {
    const alum = MADDER_ALUM.atStrength(MORDANT_BATH);
    const iron = MADDER_IRON.atStrength(MORDANT_BATH);
    // Not "the same red, darker" as a filter model would give: the
    // metal ion is part of the chromophore, so they are two pigments.
    expect(iron.nearestTag()).not.toBe(alum.nearestTag());
    /*
     * ⚠ LIGHTNESS, not saturation — measured the hard way. Both
     * pigments absorb green equally hard, so their `saturation()` (the
     * max channel deviation) is identical to the last decimal. What
     * actually separates them is that iron transmits far less red.
     * The first draft asserted saturation and failed, which is the
     * whole reason the two reads are separate methods.
     */
    expect(iron.lightness()).toBeLessThan(alum.lightness());
    expect(iron.depth()).toBeCloseTo(alum.depth(), 6);
  });

  it('⭐ a vat BUILDS — each dip is nearer blue than the last', () => {
    const tags = [1, 2, 3, 4].map((n) => WOAD.atStrength(vatDepthAfter(n)));
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i]!.depth()).toBeGreaterThan(tags[i - 1]!.depth());
    }
    // ⚠ And a shallow dip is a PALE blue, not "grey". The pale band in
    // the palette is what makes that answerable — the reachable region
    // of a natural-dye economy is light, so the words have to be there.
    expect(WOAD.atStrength(vatDepthAfter(1)).nearestTag()).toBe('pale blue');
    expect(WOAD.atStrength(1).nearestTag()).toBe('blue');
  });
});

describe('fading is desaturation, and it falls out', () => {
  it('walks continuously back toward undyed as strength drops', () => {
    const strengths = [0.8, 0.6, 0.4, 0.2, 0.05];
    const depths = strengths.map((s) => MADDER_ALUM.atStrength(s).depth());
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]!).toBeLessThan(depths[i - 1]!);
    }
  });

  it('⭐ strength 0 is the IDENTITY — a mordanted, undyed piece shows nothing', () => {
    const nothing = MADDER_ALUM.atStrength(0);
    expect(nothing.depth()).toBe(0);
    // Which is exactly why the mordant's zero-strength entry can sit on
    // the stack as a marker without colouring the cloth.
    expect(Colour.stack([nothing]).toHex()).toBe(Colour.UNDYED.toHex());
  });
});

describe('the arithmetic itself', () => {
  it('UNDYED is the identity for `over`', () => {
    expect(MADDER_ALUM.over(Colour.UNDYED).toHex()).toBe(MADDER_ALUM.toHex());
    expect(Colour.stack([]).toHex()).toBe(Colour.UNDYED.toHex());
  });

  it('⚠ RGB would get the headline case wrong — the reason for the model', () => {
    /*
     * Guards the design, not the code. Additive mixing of a blue and a
     * yellow is white and byte-multiplication is black; the subtractive
     * product is the only one of the three that is green. If someone
     * "simplifies" this to RGB later, this is the sentence they meet.
     */
    const yellow = Colour.of(1, 1, 0.15);
    const blue = Colour.of(0.15, 0.5, 1);
    const mixed = yellow.over(blue);
    expect(mixed.g).toBeGreaterThan(mixed.r);
    expect(mixed.g).toBeGreaterThan(mixed.b);
    // Additive would have driven every channel UP instead.
    expect(mixed.r).toBeLessThan(yellow.r);
  });

  it('clamps out of range and treats NaN as opaque rather than propagating', () => {
    expect(Colour.of(2, -1, Number.NaN).toHex()).toBe('#ff0000');
  });

  it('dimming walks toward grey, because scotopic vision is colourless', () => {
    const lit = MADDER_ALUM.atStrength(MORDANT_BATH);
    const dim = lit.dimmed(0.3);
    const dark = lit.dimmed(0);
    expect(dim.depth()).toBeGreaterThan(0);
    // Fully dark: all three channels equal — no hue survives.
    expect(dark.r).toBeCloseTo(dark.g, 6);
    expect(dark.g).toBeCloseTo(dark.b, 6);
    expect(lit.dimmed(1).toHex()).toBe(lit.toHex());
  });

  it('toHex is a well-formed six-digit colour', () => {
    expect(Colour.UNDYED.toHex()).toBe('#ffffff');
    expect(MADDER_ALUM.toHex()).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('⚠⚠ toHex GAMMA-ENCODES — linear light is not a display byte', () => {
    /*
     * The whole model composes in linear light, because that is the
     * domain where filters multiply. Display bytes carry the sRGB
     * transfer. `Math.round(t * 255)` conflates the two and renders
     * everything far too dark — and the symptom would have been
     * invisible, because "the cloth looks muddy" is exactly what a
     * natural-dye palette is SUPPOSED to look like.
     *
     * Half the photons through is 0xBC, not 0x80.
     */
    expect(Colour.of(0.5, 0.5, 0.5).toHex()).toBe('#bcbcbc');
    // The endpoints are fixed points of the transfer either way, which
    // is exactly why the bug hid: every test that used toHex as an
    // equality fingerprint still passed.
    expect(Colour.of(1, 1, 1).toHex()).toBe('#ffffff');
    expect(Colour.of(0, 0, 0).toHex()).toBe('#000000');
  });
});

describe('⚠⚠ the palette does not drift from the client', () => {
  it('every word this palette can emit is in the shared vocabulary', () => {
    /*
     * The failure this exists to stop is SILENT: `MmlRenderer`'s
     * `paletteFor` falls through to `neutral` for a token it does not
     * know, so a colour word added here and forgotten there renders
     * grey with nothing raised. `DYE_COLOR_TAGS` lives in
     * `@saxonberg/types` precisely so both ends can be checked, and
     * this is the server end.
     */
    expect([...Colour.tags()].sort()).toEqual([...Colour.sharedTags()].sort());
  });

  it('every shared word is reachable — no dead vocabulary', () => {
    // The other direction: a word nobody can ever be named is a word
    // the client maps for nothing, and it hides a palette gap.
    const emitted = new Set(Colour.tags());
    for (const tag of Colour.sharedTags()) expect(emitted.has(tag)).toBe(true);
  });
});
