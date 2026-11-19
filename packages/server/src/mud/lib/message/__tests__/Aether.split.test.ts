/**
 * Residual AetherMixin = attunement, perceiving only. Transmission left
 * for `CommsMixin`; hosting left for `AetherHostMixin` (aether-devices
 * D2). The ESP modalities and the `isAether` predicate stay.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { AetherMixin } from '../Aether';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class AetherActor extends AetherMixin(Idea) {}

describe('residual AetherMixin (attunement, post-split)', () => {
  it('no longer exposes the comms transmission method', () => {
    const a = makeStuff(() => new AetherActor());
    expect((a as unknown as { tell?: unknown }).tell).toBeUndefined();
  });

  it('no longer declares the comms command contributions (single source)', () => {
    expect(
      (AetherActor as unknown as { commandContributions?: unknown })
        .commandContributions,
    ).toBeUndefined();
  });

  it('keeps the ESP perception modalities', () => {
    expect(
      (AetherActor as unknown as { _grantsModalities?: readonly string[] })
        ._grantsModalities,
    ).toEqual(['verbal-esp', 'emotive-esp']);
  });

  it('isAether narrows a composed actor (attunement is composition here)', () => {
    const a = makeStuff(() => new AetherActor());
    expect(MixinApi.isAether(a)).toBe(true);
  });

  it('no longer hosts software — hosting is AetherHostMixin (D2)', () => {
    const a = makeStuff(() => new AetherActor());
    expect(MixinApi.isAetherHost(a)).toBe(false);
    expect((a as unknown as { hostApp?: unknown }).hostApp).toBeUndefined();
  });
});
