/**
 * The Hearthworks' one class: the cellar row names it at its pack path,
 * and ⭐⭐ there is nothing bespoke left in it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import SealedCellar from '../location/SealedCellar';

const PACK = fileURLToPath(new URL('../../', import.meta.url));

describe('SealedCellar (hearthworks)', () => {
  it('composes NO Reserve — a shut stone room starves a fire by being one', () => {
    // ⭐⭐ The fire build. `ReservedMixin` was the one thing this class
    // was FOR: an authored `%` air budget, and the only room in the game
    // that had one. A scope's air derives from its own OPENINGS now, so
    // this cellar starves a fire because it is a shut stone room — and
    // ⛔ the four Terminus cellars that authored the identical budget and
    // silently dropped it (no `ReservedMixin` anywhere in a
    // `SingletonCartesianLocation` chain) behave the same way, which
    // they never did before. What remains here is the granite, which is
    // a fact about cellars rather than a number somebody typed.
    expect(MixinApi.hasMixin(SealedCellar, Mixins.Reserved)).toBe(false);
  });

  it('is the class the cellar row names, at the pack path', () => {
    const row = parse(
      readFileSync(`${PACK}content/world/terminus/hearthworks/location/cellar.yaml`, 'utf8'),
    ) as { class: string };
    expect(row.class).toBe('/world/terminus/hearthworks/location/SealedCellar');
  });
});
