/**
 * Escape battery — TRANSPORT DIRECTION: the connection lifecycle's
 * write half crosses the boundary INBOUND only.
 *
 * Adversarial shape: circle context calls a mutating transport hook on
 * a field-resident body. `@hook` methods are public and deliberately
 * UNGATEABLE (a subclass's `super.onLinkdead()` is author code, so no
 * `@CallSecurity` can sit on one), and `Avatar.onLinkdead` does real
 * work — presence emit, save, and outright destruction of a guest. A
 * SYMMETRIC boundary exemption therefore handed in-circle content a
 * way to force any of that on someone standing in the field.
 *
 * The engine's own use is the opposite direction and stays allowed: a
 * socket closes in FIELD context while its holder is a circle-resident
 * vessel, so the connection layer must be able to reach in.
 *
 * Fails if `#INBOUND_TRANSPORT_METHODS` is folded back into the
 * symmetric `#BOUNDARY_EXEMPT_METHODS` set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { Idea } from '../../../stuff/Idea';

const SCOPE = '/home/transport-tester';

/**
 * A minimal host carrying the transport surface by NAME — the boundary
 * check keys on the method name, not on a mixin, so this is enough to
 * exercise the rule without dragging a whole Avatar in.
 */
class FakeHost extends Idea {
  public linkdeadCount = 0;
  public attachedCount = 0;

  public onLinkdead(): void {
    this.linkdeadCount++;
  }

  public onConnectionAttached(): void {
    this.attachedCount++;
  }

  /** A read on the same seam — symmetric, and must STAY symmetric. */
  public isConnected(): boolean {
    return true;
  }
}

/** Mint a Stuff stamped with `scope` (the test-allowlisted seam). */
async function mintIn<T extends Idea>(
  scope: string | null,
  make: () => T
): Promise<T> {
  return (await ExecutionContextApi.runRoot(
    null,
    'test.mint',
    () => StuffApi.create(make),
    scope === null ? undefined : { circleScope: scope }
  )) as T;
}

describe('sandbox-escape: transport direction', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('DENIES a circle caller invoking a mutating hook on a field body', async () => {
    const fieldHost = await mintIn(null, () => new FakeHost());

    expect(() =>
      ExecutionContextApi.runRoot(
        null,
        'in-circle',
        () => fieldHost.onLinkdead(),
        { circleScope: SCOPE }
      )
    ).toThrow(SecurityError);

    // …and the hook did not run. The point is not the throw, it is
    // that no presence event / save / destruct happened out there.
    expect(
      ExecutionContextApi.runRoot(
        null,
        'read',
        () => fieldHost.linkdeadCount,
        { circleScope: OMNI_SCOPE }
      )
    ).toBe(0);
  });

  it('DENIES the socket-attach hook outbound too', async () => {
    const fieldHost = await mintIn(null, () => new FakeHost());

    expect(() =>
      ExecutionContextApi.runRoot(
        null,
        'in-circle',
        () => fieldHost.onConnectionAttached(),
        { circleScope: SCOPE }
      )
    ).toThrow(SecurityError);
  });

  it('ALLOWS the engine reaching INTO a circle (the crossing needs it)', async () => {
    const vessel = await mintIn(SCOPE, () => new FakeHost());

    // Field context — a socket closing while its holder is a vessel.
    ExecutionContextApi.runRoot(null, 'connection-layer', () => {
      vessel.onLinkdead();
      vessel.onConnectionAttached();
    });

    expect(
      ExecutionContextApi.runRoot(
        null,
        'read',
        () => vessel.linkdeadCount,
        { circleScope: OMNI_SCOPE }
      )
    ).toBe(1);
  });

  it('keeps the READ half symmetric (delivery reads both ways)', async () => {
    const vessel = await mintIn(SCOPE, () => new FakeHost());
    const fieldHost = await mintIn(null, () => new FakeHost());

    // Field → circle: the delivery redirect asks a vessel for its state.
    expect(
      ExecutionContextApi.runRoot(null, 'field', () => vessel.isConnected())
    ).toBe(true);

    // Circle → field: `forwardingTargets` asks the parked body too.
    expect(
      ExecutionContextApi.runRoot(
        null,
        'in-circle',
        () => fieldHost.isConnected(),
        { circleScope: SCOPE }
      )
    ).toBe(true);
  });

  it('DENIES circle-A reaching into circle-B (inbound means FROM the field)', async () => {
    const otherVessel = await mintIn('/home/somebody-else', () => new FakeHost());

    expect(() =>
      ExecutionContextApi.runRoot(
        null,
        'in-circle',
        () => otherVessel.onLinkdead(),
        { circleScope: SCOPE }
      )
    ).toThrow(SecurityError);
  });
});
