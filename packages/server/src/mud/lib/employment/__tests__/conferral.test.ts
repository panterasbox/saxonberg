/**
 * Phase 3 — capability grant: an on-shift Position confers its `confers`
 * mixins on the holder via the augment substrate, so a gated `MakerMixin`
 * goes active only while on shift. This is the Maker-leak fix:
 * `MixinApi.isMaker` (now routed through `isActive`) selects only the
 * on-shift bartender; an off-shift or never-employed maker is inert.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { MakerMixin } from '../../craft/Maker';
import { EmployedMixin } from '../Employed';
import BusinessEntity from '../../../platform/idea/Business';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

const BUSINESS = '/world/lounge/idea/business';

// A maker that is also employable — the real `Crafter` shape (MakerMixin +
// EmployedMixin), minus the heavy Character body chain.
class MakerWorker extends MakerMixin(EmployedMixin(Idea)) {
  static _mixinName = 'MakerWorker';
}

function seedBusiness(): void {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, confers: ['MakerMixin'] },
  ];
}

function employ(w: MakerWorker, status: 'on-shift' | 'off-shift'): void {
  w.employments = [
    {
      organizationPath: BUSINESS,
      positionKey: 'bartender',
      status,
      hiredAt: 0,
      onShiftSince: status === 'on-shift' ? 1 : null,
    },
  ];
}

describe('employment → capability conferral (the Maker leak fix)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    seedBusiness();
  });

  it('composes MakerMixin but is inert when never employed', () => {
    const w = makeStuff(() => new MakerWorker());
    expect(MixinApi.hasMixin(w, Mixins.Maker)).toBe(true); // composed
    expect(MixinApi.isMaker(w)).toBe(false); // but not active
    expect(MixinApi.isActive(w, Mixins.Maker)).toBe(false);
  });

  it('goes active — a valid maker — while on shift', () => {
    const w = makeStuff(() => new MakerWorker());
    employ(w, 'on-shift');
    expect(MixinApi.isMaker(w)).toBe(true);
    expect(MixinApi.isActive(w, Mixins.Maker)).toBe(true);
    const active = MixinApi.getActiveMixins(w).map(
      (m) => m._mixinName ?? m.name,
    );
    expect(active).toContain('MakerMixin');
  });

  it('goes inert again when off shift', () => {
    const w = makeStuff(() => new MakerWorker());
    employ(w, 'off-shift');
    expect(MixinApi.isMaker(w)).toBe(false);
    const active = MixinApi.getActiveMixins(w).map(
      (m) => m._mixinName ?? m.name,
    );
    expect(active).not.toContain('MakerMixin');
  });
});
