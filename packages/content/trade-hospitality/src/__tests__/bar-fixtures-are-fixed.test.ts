/**
 * ⭐ **You cannot walk out of the bar carrying the bar.**
 *
 * A live drive of Dave's Bar picked up the BACK-BAR — with the house
 * tablet and the tip jar resting on it — plus the wash basin and four
 * stools, and left. Nothing refused any of it.
 *
 * ⚠ Encumbrance was never going to catch this. These masses (6–30 kg)
 * are well inside a person's lift, and the back-bar had no authored mass
 * at all. What stops you carrying off a back-bar is not that it is heavy
 * — it is that it is JOINERY. That distinction is `fixedInPlace`: an
 * agent may not pocket it, while a remodel, a `place` and an author
 * rearranging scenery all still move it.
 *
 * The rule lives on the classes, so a row that ships a genuinely
 * portable one authors `fixedInPlace: false` — and this test is the
 * tripwire for the next fixture that forgets.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Surface from '@saxonberg/server/mud/platform/thing/Surface';
import WaterFixture from '@saxonberg/server/mud/platform/thing/WaterFixture';
import Chair from '@saxonberg/server/mud/platform/thing/Chair';
import Stock from '@saxonberg/server/mud/platform/thing/Stock';
import BarStation from '../thing/BarStation';
import GlassRack from '../thing/GlassRack';
import IceBin from '../thing/IceBin';
import Tap from '../thing/Tap';

describe('the bar is furniture, not stock', () => {
  const cases: Array<[string, () => unknown]> = [
    ['the back-bar / the well', () => new BarStation()],
    ['a counter / shelf / workbench', () => new Surface()],
    ['the wash basin / the water tap', () => new WaterFixture()],
    ['a bar stool / bed / tub / armchair', () => new Chair()],
    ['the glass rack', () => new GlassRack()],
    ['the ice bin', () => new IceBin()],
    ['the beer tap', () => new Tap()],
    ["a shop's counter", () => new Stock()],
  ];

  for (const [what, make] of cases) {
    it(`${what} cannot be picked up`, async () => {
      const thing = await StuffApi.create(make as never);
      expect(
        (thing as unknown as { isFixedInPlace(): boolean }).isFixedInPlace(),
      ).toBe(true);
    });
  }

  // The other half: what SITS on the furniture is still yours to take.
  // A rule that froze the glasses too would be worse than the bug.
  it('the things ON the furniture are still takeable', async () => {
    const { default: ToolItem } = await import(
      '@saxonberg/server/mud/platform/thing/ToolItem'
    );
    const tool = await StuffApi.create(() => new ToolItem());
    expect(
      (tool as unknown as { isFixedInPlace(): boolean }).isFixedInPlace(),
    ).toBe(false);
  });
});
