import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import Thing from '../../stuff/Thing';
import { AdornmentMixin } from '../Adornment';
import CartesianLocation from '../../location/CartesianLocation';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestAdornment extends AdornmentMixin(Thing) {}

/**
 * `residency.md` has promised this veto since the residency build —
 * *"`Exit` / `Adornment` | its source room / wall is alive"* — and
 * `Adornment` never implemented it. Presence cannot stand in: the sweep's
 * presence walk reads `getDeepContents()`, and a fixture is not contents,
 * so a warm room says nothing about the sconce on its wall (or, after the
 * ground build, the floor under its feet).
 */
describe('AdornmentMixin.canEvict', () => {
  const ctx = { idleMs: 60_000, reason: 'idle' as const };

  it('an unattached fixture is ordinary cullable clutter', () => {
    const fx = makeStuff(() => new TestAdornment());
    expect(fx.getAdornedTo()).toBeNull();
    expect(fx.canEvict(ctx).ok).toBe(true);
  });

  it('a fixture of a live host vetoes, with a reason', () => {
    const room = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestAdornment());
    fx.setAdornedTo(room);

    const verdict = fx.canEvict(ctx);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe('fixture of a live host');
  });

  it('a fixture whose host is destroyed falls through to super', async () => {
    const room = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestAdornment());
    fx.setAdornedTo(room);
    expect(fx.canEvict(ctx).ok).toBe(false);

    const { StuffApi } = await import('../../../api/stuff');
    await StuffApi.destruct(room);

    // The back-ref still points at the husk; the veto lifts because the
    // host is gone, which is what lets a room's fixtures cull WITH it.
    expect(fx.canEvict(ctx).ok).toBe(true);
  });
});
