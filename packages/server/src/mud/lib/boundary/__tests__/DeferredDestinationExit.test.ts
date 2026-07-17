/**
 * DeferredDestinationExit — the eager-exit / deferred-destination contract.
 *
 * The map-relevant guarantees: describing the exit (direction + destination
 * template path) is eager and never materializes the far side; the live
 * destination is faulted in only on `resolveDestination()`, cached, and
 * re-materialized after a reap.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import DeferredDestinationExit from '../DeferredDestinationExit';
import CartesianLocation from '../../location/CartesianLocation';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

const DEST_TEMPLATE = '/zone/dest-class';

/** A concrete deferred exit: counts fault-ins, materializes a fixed target. */
class TestDeferredExit extends DeferredDestinationExit {
  public computeCount = 0;
  constructor(
    source: Stuff & Container,
    private target: Stuff & Container,
  ) {
    super({ direction: 'north', source, destinationTemplatePath: DEST_TEMPLATE });
  }
  protected override async computeDestination(): Promise<Stuff & Container> {
    this.computeCount++;
    return this.target;
  }
}

describe('DeferredDestinationExit', () => {
  let source: Stuff & Container;
  let target: Stuff & Container;
  let exit: TestDeferredExit;

  beforeEach(() => {
    StuffApi.clearAll();
    source = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/src',
    ) as unknown as Stuff & Container;
    target = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/dest-instance',
    ) as unknown as Stuff & Container;
    exit = makeStuff(() => new TestDeferredExit(source, target)) as TestDeferredExit;
  });
  afterEach(() => StuffApi.clearAll());

  it('describes the edge eagerly without materializing the destination', () => {
    expect(exit.getDirection()).toBe('north');
    // The accurate destination *class* template — a real path, not a
    // placeholder — readable for look/mapping with zero fault-ins.
    expect(exit.getDestinationTemplatePath()).toBe(DEST_TEMPLATE);
    expect(exit.computeCount).toBe(0);
  });

  it('getDestination() throws before materialization', () => {
    expect(() => exit.getDestination()).toThrow(/not materialized/);
  });

  it('resolveDestination() faults in once and caches', async () => {
    const first = await exit.resolveDestination();
    expect(first).toBe(target);
    expect(exit.computeCount).toBe(1);
    // Cached — a second resolve does not re-compute, and the sync getter works.
    expect(await exit.resolveDestination()).toBe(target);
    expect(exit.getDestination()).toBe(target);
    expect(exit.computeCount).toBe(1);
  });

  it('re-materializes after the destination is reaped', async () => {
    await exit.resolveDestination();
    expect(exit.computeCount).toBe(1);

    StuffApi.destruct(target);
    // A fresh instance stands in for the re-materialized clone.
    const reborn = makeStuffAtPath(
      () => new CartesianLocation(),
      '/zone/dest-instance-2',
    ) as unknown as Stuff & Container;
    (exit as unknown as { target: Stuff & Container }).target = reborn;

    const again = await exit.resolveDestination();
    expect(again).toBe(reborn);
    expect(exit.computeCount).toBe(2); // re-computed after the reap
  });
});
