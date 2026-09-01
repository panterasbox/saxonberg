/**
 * Whistle — composition smoke test, beside its content (the crossing's
 * carried whistle grants `blow` outward to its bearer).
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Whistle from '../thing/Whistle';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

describe('Whistle (composition)', () => {
  afterEach(() => StuffApi.clearAll());

  it('is Audible + Wearable + Detailed and carries blow', () => {
    const w = makeStuff(() => new Whistle());
    expect(MixinApi.isAudible(w as never)).toBe(true);
    expect(MixinApi.isWearable(w as never)).toBe(true);
    expect(MixinApi.hasMixin(w as never, Mixins.Detailed)).toBe(true);
    // A carried or worn whistle grants `blow` OUTWARD to its bearer —
    // the `environment` bucket under the directional model.
    expect(Whistle.commandContributions.environment).toContain('world/terminus/university-avenue/cmd/blow.yaml');
  });
});
