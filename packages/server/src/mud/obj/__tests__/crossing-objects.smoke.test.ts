/**
 * Crossing content classes — composition smoke test. Confirms each thin
 * class carries the capabilities its verbs and seeds rely on.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Whistle from '../../domain/eternal/university-avenue/Whistle';
import Paddle from '../Paddle';
import Thermos from '../Thermos';
import Beacon from '../Beacon';
import LitterBin from '../LitterBin';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { StuffApi } from '../../api/stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('crossing content classes (composition)', () => {
  afterEach(() => StuffApi.clearAll());

  it('Whistle is Audible + Wearable + Detailed and carries blow', () => {
    const w = makeStuff(() => new Whistle());
    expect(MixinApi.isAudible(w as never)).toBe(true);
    expect(MixinApi.isWearable(w as never)).toBe(true);
    expect(MixinApi.hasMixin(w as never, Mixins.Detailed)).toBe(true);
    expect(Whistle.commandContributions.inventory).toContain('domain/eternal/university-avenue/commands/blow.yaml');
  });

  it('Paddle is Wieldable + Detailed with no carried verb', () => {
    const p = makeStuff(() => new Paddle());
    expect(MixinApi.isWieldable(p as never)).toBe(true);
    expect(MixinApi.hasMixin(p as never, Mixins.Detailed)).toBe(true);
  });

  it('Thermos is a Detailed Flask (Thermal + Sealable + Bulkable)', () => {
    const t = makeStuff(() => new Thermos());
    expect(MixinApi.hasMixin(t as never, Mixins.Detailed)).toBe(true);
    expect(MixinApi.isSealable(t as never)).toBe(true);
    expect(MixinApi.hasMixin(t as never, Mixins.Bulkable)).toBe(true);
    expect(MixinApi.hasMixin(t as never, Mixins.Thermal)).toBe(true);
  });

  it('Beacon is Switchable + Propertied + Detailed', () => {
    const b = makeStuff(() => new Beacon());
    expect(MixinApi.isSwitchable(b as never)).toBe(true);
    expect(MixinApi.hasMixin(b as never, Mixins.Propertied)).toBe(true);
    expect(MixinApi.hasMixin(b as never, Mixins.Detailed)).toBe(true);
  });

  it('LitterBin is a Detailed Container', () => {
    const bin = makeStuff(() => new LitterBin());
    expect(MixinApi.isContainer(bin as never)).toBe(true);
    expect(MixinApi.hasMixin(bin as never, Mixins.Detailed)).toBe(true);
  });
});
