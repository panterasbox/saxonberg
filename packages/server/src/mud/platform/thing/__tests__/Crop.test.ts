/**
 * ⭐ A crop MAY steep (silk W4): Crop composes `SteepableMixin`, so a dye
 * crop whose row names `steepsInto` charges a bath, and a crop with none
 * is inert — `steep` declines it in words.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Crop from '../Crop';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

describe('Crop', () => {
  it('is Steepable, and steeps into what its row names', () => {
    const madder = makeStuff(() => new Crop());
    expect(MixinApi.isSteepable(madder)).toBe(true);
    (madder as unknown as { steepsInto: string }).steepsInto = '/trade/farming/idea/material/madder';
    expect(madder.getSteepsInto()).toBe('/trade/farming/idea/material/madder');
  });

  it('a crop with no steepsInto has nothing to give', () => {
    const carrot = makeStuff(() => new Crop());
    expect(carrot.getSteepsInto()).toBe('');
  });
});
