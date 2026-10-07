/**
 * ⭐⭐⭐ A carcass REDUCES — a side can be worked to order.
 *
 * Take the loin to sell and leave the rest hanging, which is how a shop
 * behaves. It also gives partial breakdown and trimming with **no second
 * verb**, and makes the lens-4 choice real: prime to the inn, or keep it.
 *
 * ⚠ Two lists, because the two things differ: a MUSCLE is gone from the
 * animal, while a hide or the offal is a LINE that has been taken.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Corpse from '../Corpse';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

const LOIN = '/stuff/idea/material/tissue/muscles/loin';
const SHANK = '/stuff/idea/material/tissue/muscles/shank';
const HIDE = '/trade/ranching/thing/hide';

describe('Corpse — the reducing carcass', () => {
  it('⭐ starts whole', () => {
    const body = makeStuff(() => new Corpse());
    expect(body.hasTissue(LOIN)).toBe(true);
    expect(body.hasLine(HIDE)).toBe(true);
    expect(body.getTakenTissues()).toEqual([]);
  });

  it('⭐⭐ a taken muscle cannot be taken again', () => {
    const body = makeStuff(() => new Corpse());
    body.markTissuesTaken([LOIN]);
    expect(body.hasTissue(LOIN)).toBe(false);
    // ⭐ And the rest of the animal is untouched — that is the point.
    expect(body.hasTissue(SHANK)).toBe(true);
  });

  it('a taken line cannot be taken again, and lines are separate from tissues', () => {
    const body = makeStuff(() => new Corpse());
    body.markLineTaken(HIDE);
    expect(body.hasLine(HIDE)).toBe(false);
    expect(body.hasTissue(HIDE)).toBe(true); // a different question
  });

  it('marking is idempotent — butchering twice does not double the list', () => {
    const body = makeStuff(() => new Corpse());
    body.markTissuesTaken([LOIN, LOIN]);
    body.markTissuesTaken([LOIN]);
    body.markLineTaken(HIDE);
    body.markLineTaken(HIDE);
    expect(body.getTakenTissues()).toEqual([LOIN]);
    expect(body.getTakenLines()).toEqual([HIDE]);
  });
});
