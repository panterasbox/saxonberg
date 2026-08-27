/**
 * Whistle — composition smoke test, beside its content (the crossing's
 * carried whistle grants `blow` outward to its bearer).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Whistle from '../Whistle';
import { MixinApi } from '../../../../api/mixin';
import { Mixins } from '../../../../lib/mixin';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

describe('Whistle (composition)', () => {
  afterEach(() => StuffApi.clearAll());

  it('is Audible + Wearable + Detailed and carries blow', () => {
    const w = makeStuff(() => new Whistle());
    expect(MixinApi.isAudible(w as never)).toBe(true);
    expect(MixinApi.isWearable(w as never)).toBe(true);
    expect(MixinApi.hasMixin(w as never, Mixins.Detailed)).toBe(true);
    // A carried or worn whistle grants `blow` OUTWARD to its bearer —
    // the `environment` bucket under the directional model.
    expect(Whistle.commandContributions.environment).toContain('world/eternal/university-avenue/cmd/blow.yaml');
  });
});
