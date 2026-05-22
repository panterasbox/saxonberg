/**
 * Conduit — channel-specific pass-through interfaces a Boundary subclass
 * implements to participate in the Light / Sight / Movement walks.
 *
 * A `Boundary` connects two `Adornable` containers via a pair of
 * `BoundaryAnchor` fixtures. The pass-through behaviour for each
 * channel — does light leak? can you see through? can you walk
 * through? — is described by a `Conduit` interface implemented (or
 * not) by the concrete Boundary subclass. A Boundary may compose any
 * subset of the conduit interfaces; absent conduits mean "this
 * channel does not pass."
 *
 * Conduits are interfaces, not mixins — they are satisfied by direct
 * method implementation on the Boundary subclass (`Window`, `Door`).
 * The propagation walks consult them per call; conduits MUST NOT
 * cache: the boundary's own state (e.g., `Sealable.isOpen` for
 * shutters or doors) participates in transmissivity and changes at
 * runtime.
 *
 * Each method takes `from` / `to` side tags so a one-way channel can
 * encode directionality (one-way glass: `transmissivity('A','B') = 1`,
 * `transmissivity('B','A') = 0`).
 */

/** Stable kind tag for the conduit registry. */
export type ConduitKind = 'light' | 'sight' | 'movement' | 'sound';

/** Side tag for a Boundary's two anchors. */
export type BoundarySide = 'A' | 'B';

/**
 * Common base shape. All conduits carry a stable `conduitKind` so a
 * consumer (the light walk, the sight walk) can find its own conduit
 * on `boundary.getConduits()` by tag.
 */
export interface Conduit {
  readonly conduitKind: ConduitKind;
}

/**
 * Light pass-through. `transmissivity` is a 0..1 multiplier applied to
 * the contribution flowing from the `from` side to the `to` side.
 * Returning `0` short-circuits the propagation — the walker treats
 * the boundary as opaque for this direction.
 */
export interface LightConduit extends Conduit {
  readonly conduitKind: 'light';
  transmissivity(from: BoundarySide, to: BoundarySide): number;
}

/**
 * Line-of-sight predicate. v1 is boolean (you can see through, or you
 * cannot). Per-detail-level gating (read fine print through smoky
 * glass?) is a future refinement.
 */
export interface LineOfSight extends Conduit {
  readonly conduitKind: 'sight';
  canSeeThrough(from: BoundarySide, to: BoundarySide): boolean;
}

/**
 * Movement gate. `mode` is the locomotion mode (`'walk'`, `'run'`,
 * `'climb'`, …) — the same value `MobileMixin.traverse` carries.
 * Door's v1 implementation ignores `mode` and returns
 * `isOpen()`; future per-mode logic (hop a low fence, swim
 * across a moat) plugs in here without changing the protocol.
 */
export interface MovementConduit extends Conduit {
  readonly conduitKind: 'movement';
  canPassThrough(
    from: BoundarySide,
    to: BoundarySide,
    mode: string
  ): boolean;
}

/**
 * Sound conduit slot. Reserved for the future Sound subsystem; no v1
 * implementation ships. Defining the kind tag now keeps the registry
 * shape closed.
 */
export interface SoundConduit extends Conduit {
  readonly conduitKind: 'sound';
}
