/**
 * The Hearthworks' one class: the cellar row names it at its pack path,
 * and it composes the Reserve slot the fire model's air budget reads.
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
  it('composes a Reserve so an authored air budget can starve a fire', () => {
    expect(MixinApi.hasMixin(SealedCellar, Mixins.Reserved)).toBe(true);
  });

  it('is the class the cellar row names, at the pack path', () => {
    const row = parse(
      readFileSync(`${PACK}content/world/terminus/hearthworks/location/cellar.yaml`, 'utf8'),
    ) as { class: string };
    expect(row.class).toBe('/world/terminus/hearthworks/location/SealedCellar');
  });
});
