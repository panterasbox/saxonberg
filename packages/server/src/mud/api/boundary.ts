import { SecurityApi } from './security';
/**
 * BoundaryApi — the public surface for installing and tearing down the
 * `Boundary` runtime triple (boundary + anchorA + anchorB).
 *
 * Why an Api: Boundary creation needs to construct two anchors, register
 * them in `StuffApi`, wire each anchor's side and back-reference, and
 * call `addFixture` on each host atomically. Doing that ad-hoc at every
 * call site is the kind of "raw setEnvironment + addContainable" rule
 * `docs/antipatterns.md` flags. The `Api` mediates the invariant.
 *
 * Two entry points:
 *   - `attachExistingBoundary({ boundary, hostA, hostB })` — the seed
 *     authoring path. Boundary is template-loaded (`Window`, `Door`)
 *     and the caller already holds the instance; the Api just installs
 *     the per-side anchors.
 *   - `create({ factory, hostA, hostB })` — convenience that combines
 *     `StuffApi.create(factory)` with `attachExistingBoundary`. Useful
 *     in tests and in code paths that programmatically build a
 *     boundary without a template.
 *
 * `destruct(boundary)` is the symmetric teardown: routes through
 * `StuffApi.destruct` so the proxy / shadow / lifecycle machinery
 * runs, and the Boundary's own `onDestruct` chain detaches and
 * destructs the anchors.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Boundary } from '../lib/boundary/Boundary';
import type { Adornable } from '../lib/boundary/Adornable';
import { BoundaryAnchor } from '../lib/boundary/BoundaryAnchor';
import { StuffApi } from './stuff';

export interface AttachExistingBoundaryOptions<T extends Boundary = Boundary> {
  boundary: T;
  hostA: Stuff & Adornable;
  hostB: Stuff & Adornable;
}

export interface CreateBoundaryOptions<T extends Boundary = Boundary> {
  factory: () => T;
  hostA: Stuff & Adornable;
  hostB: Stuff & Adornable;
}

export class BoundaryApi {
  /**
   * Install an already-constructed Boundary on two hosts: create the
   * two `BoundaryAnchor`s, wire `boundary.anchorA`/`anchorB`, and
   * call each host's `addFixture(anchor)`. Returns the boundary for
   * fluent chaining.
   *
   * Rejects when the boundary already has anchors wired (use
   * `destruct` first to migrate). Rejects `hostA === hostB`
   * (a Boundary connecting a room to itself has no use case in v1
   * and would confuse the `getOtherHost` walk).
   */
  public static attachExistingBoundary<T extends Boundary>(
    opts: AttachExistingBoundaryOptions<T>
  ): T {
    const { boundary, hostA, hostB } = opts;

    if (hostA === hostB) {
      throw new Error(
        'BoundaryApi.attachExistingBoundary: hostA and hostB must differ.'
      );
    }
    if (boundary.getAnchorA() || boundary.getAnchorB()) {
      throw new Error(
        'BoundaryApi.attachExistingBoundary: boundary already has anchors; ' +
          'destruct or detach the boundary first.'
      );
    }

    const anchorA = StuffApi.createSync(() => new BoundaryAnchor('A'));
    const anchorB = StuffApi.createSync(() => new BoundaryAnchor('B'));

    anchorA._setBoundary(boundary);
    anchorB._setBoundary(boundary);
    boundary._setAnchors(anchorA, anchorB);

    hostA.addFixture(anchorA);
    hostB.addFixture(anchorB);

    return boundary;
  }

  /**
   * Convenience: clone-or-construct a Boundary via `StuffApi.create`
   * (the canonical async creation path) and install it on two hosts
   * in one call. Mirrors the "factory + two endpoints" shape of
   * `Exitable.addBidirectionalExit`.
   */
  public static async create<T extends Boundary>(
    opts: CreateBoundaryOptions<T>
  ): Promise<T> {
    const { factory, hostA, hostB } = opts;
    const boundary = await StuffApi.create(factory);
    return this.attachExistingBoundary({ boundary, hostA, hostB });
  }

  /**
   * Tear down a Boundary and its anchors. Routes through
   * `StuffApi.destruct` so the proxy / shadow lifecycle runs; the
   * Boundary's own `onDestruct` detaches the anchors from each
   * host's `getFixtures()` and destructs them.
   */
  public static destruct(boundary: Boundary): void {
    StuffApi.destruct(boundary as unknown as Stuff);
  }
}

SecurityApi.decorateApiClass(BoundaryApi);
