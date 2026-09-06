/**
 * ⭐ The `weaves` beat is bounded and LITERAL — the mill floor works.
 *
 * A live drive found the mill shipping no producer at all: the weaver's
 * `consigns` beat carried from an empty stock forever, so no cloth ever
 * reached the general store and a customer could not buy any at any
 * price. The producer-annex edge the whole build leans on was inert.
 *
 * ⭐⭐ The reason a brain answers that rather than a faucet on the
 * finished goods: **cloth must exist because somebody worked fibre into
 * it.** The `delves` lesson from the metal chain says the other half —
 * *supply must not be a function of concurrency*, a smelter whose input
 * dries up on a quiet night is not an economy — and between them they
 * fix where the faucet may sit: at the mill's RAW INPUT (a bale, the
 * carts from the flax fields, the seam a real grower displaces), never
 * at its output.
 *
 * The assertions are on the SHAPE of the source, the `delves`/`farms`
 * precedent, because that is what keeps going wrong:
 *
 *   - every act is a literal player verb through `forceCommand`
 *     (`get`, `scutch`, `spin`, `weave`, `put`), so the hand is subject
 *     to exactly the rules a person is — an empty bale refuses it, too
 *     little line refuses it, a missing tool refuses it;
 *   - nothing clones a finished good;
 *   - every loop is bounded by `batch` AND carries a no-progress guard,
 *     so a declined act cannot grind the beat against a refusal;
 *   - the floor is the AUTHORED room, not "wherever the hand woke up";
 *   - ⚠ retting is NOT a stage — the one act whose craft is judgement
 *     stays a player's.
 *
 * What each verb then does is its own controller's contract, tested
 * there.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { brain as weaves } from '../weaves';

const SRC = readFileSync(
  fileURLToPath(new URL('../weaves.ts', import.meta.url)),
  'utf8',
);
/**
 * The source with its COMMENTS STRIPPED — what the file actually does.
 * A negative assertion ("never clones a finished good") reads the whole
 * file otherwise, and the doc comment that PROMISES not to clone says
 * `StuffApi.clone` in as many words. The prose is not the program.
 */
const CODE = SRC.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const BALE = YAML.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../../content/trade/textiles/thing/flax-bale.yaml',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { data: Record<string, unknown> };
const STORE = YAML.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../../content/trade/textiles/thing/bale-store.yaml',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { data: Record<string, unknown> };
const MILL_FLOOR = YAML.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../../content/trade/textiles/location/mill.yaml',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { data: Record<string, unknown> };
const SPINNER = YAML.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../../content/trade/textiles/agent/mill-spinner.yaml',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { data: Record<string, unknown> };

describe('the weaves beat is bounded and literal', () => {
  it('drives the literal verbs, and nothing else', () => {
    for (const verb of [
      "'get bale from bales'",
      "'scutch bale'",
      "'spin strick'",
      "'weave yarn'",
      "'put bolt in stock'",
    ]) {
      expect(SRC).toContain(`forceCommand(${verb})`);
    }
  });

  it('⭐⭐ never clones a finished good — cloth is WORKED, not spawned', () => {
    expect(CODE).not.toContain('StuffApi.clone');
    expect(CODE).not.toContain('singletonOrClone');
  });

  it('⚠⚠ does ONE act per beat, and stands off a hand that is mid-act', () => {
    // The acts are ENGAGEMENTS: a beat that fired four in a row earned
    // `engagement-conflict(busy)` and the batch was fiction.
    expect(CODE).toContain("hand.hasEngagement('hands')");
    // The shelving loop keeps its bound and its no-progress guard —
    // `put` is not an engagement, so it may run in the same beat.
    expect(CODE).toContain('>= before) break;');
    expect(SRC).toContain('const batch = positiveInt(ctx.config.batch');
  });

  it('⭐ only issues an act whose input it HOLDS', () => {
    // Naming a target it does not hold does not merely waste the beat —
    // it mis-resolves: `spin line` with no line found the bale.
    expect(CODE).toContain('held(hand, YARN) >= WEAVE_CHARGE');
    expect(CODE).toContain('held(hand, LINE) >= SPIN_CHARGE');
    expect(CODE).toContain('bale !== null && baleHasFibre(bale)');
  });

  it('measures a stack by QUANTITY, not by object count', () => {
    // Line and yarn are Globbable: two spins leave one bigger stack, and
    // a guard counting objects would read a working beat as a failure.
    expect(SRC).toContain('MixinApi.isGlobbable(item) ? item.getQuantity() : 1');
  });

  it('works the AUTHORED floor, not wherever the hand woke up', () => {
    expect(SRC).toContain('StuffApi.findByTemplatePath(floorPath)');
    expect(SRC).toContain('hand.teleport(floor as Stuff & Container)');
  });

  it('⚠⚠ does NOT ret — judgement stays the player\'s', () => {
    expect(CODE).not.toContain('pour bale into pit');
    expect(CODE).not.toContain('fill bale from pit');
    expect(weaves.label).toBe('weaves');
  });

  it('runs unwatched and is exempt from the ambient dial', () => {
    expect(weaves.presenceGated).toBe(false);
    expect(weaves.ambient).toBe(false);
  });
});

describe('the mill has an input, and it is at the RAW end', () => {
  it('⭐ the bale holds the retting PRODUCT — what `scutch` gates on', () => {
    // `scutch` wants a `fibre` material; flax-straw is what goes into a
    // pit, and the refusal for it is one of the trade's better lines.
    expect(BALE.data.interiorMaterial).toBe('/stuff/idea/material/textile/linen');
    expect(BALE.data.material).toBe('/stuff/idea/material/textile/linen');
    expect(Number(BALE.data.interiorAmount)).toBeGreaterThan(0);
  });

  it('⚠⚠ is kept on its OWN shelf, never in the stock the cart drains', () => {
    // A bale standing in the mill's OUTPUT stock would be carried to a
    // shop counter and sold as if it were cloth — `consigns` reads that
    // shelf. So the input has a shelf of its own, and nothing consigns
    // from it.
    const lines = STORE.data.stockLines as Array<{
      itemTemplatePath: string;
      par: number;
    }>;
    expect(lines.map((l) => l.itemTemplatePath)).toContain(
      '/trade/textiles/thing/flax-bale',
    );
    expect(lines[0]!.par).toBeGreaterThan(0);
    expect(STORE.data.prices).toEqual({}); // nothing is SOLD here
    // ⚠ And it must not answer to `stock`, or a hand told to draw from
    // the input shelf finds the one it is meant to be filling.
    expect(STORE.data.primaryKeyword).not.toBe('stock');
    expect(MILL_FLOOR.data.props).toContain('/trade/textiles/thing/bale-store');
    expect(MILL_FLOOR.data.props).toContain('/trade/textiles/thing/mill-stock');
  });

  it('⚠ does NOT ride the census spawn table', () => {
    // That faucet wants a `Circulating` class and scatters a good across
    // regions by material tag — right for a branded bottle reaching
    // shops, wrong for keeping two bales in one shed. Driven live first
    // and the sweep drew nothing, which was the sweep being right.
    expect(BALE.data.censusKey).toBeUndefined();
    expect(BALE.data.regionTarget).toBeUndefined();
    expect(BALE.data.container).toBeUndefined();
  });
});

describe('the mill floor is wired', () => {
  it('the spinner MAKES and the weaver CARRIES', () => {
    const behaviors = SPINNER.data.behaviors as Array<{
      brain: string;
      trigger: string;
      config?: Record<string, unknown>;
    }>;
    const beat = behaviors.find((b) => b.brain.endsWith('/weaves'));
    expect(beat, 'the spinner runs the producer beat').toBeTruthy();
    expect(beat!.config?.stock).toBe('/trade/textiles/thing/mill-stock');
    expect(beat!.config?.floor).toBe('/trade/textiles/location/mill');
    // ⚠ Ahead of the consigning beat's 120 s, or the cart arrives to an
    // empty shelf.
    const seconds = Number(/cadence:(\d+)s/.exec(beat!.trigger)?.[1]);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThan(120);
  });
});
