/**
 * Window — first user of the `Boundary` substrate.
 *
 * Composition: `SealableMixin(Boundary)` (Boundary already provides
 * `Visible + Perceptible + Thing`). The `Sealable.isOpen` flag is the
 * shutter state — closing the shutters zeroes both `LightConduit`
 * transmissivity and `LineOfSight`.
 *
 * State:
 *   - `baseTransmissivity` (default 1.0) — the symmetric, both-directions
 *     pass-through factor when the window is open.
 *   - `directionalOverrides` (optional `{ aToB?, bToA? }`) — one-way
 *     glass. Either side's value, when present, replaces
 *     `baseTransmissivity` for light flowing FROM that side. Set
 *     `bToA = 0` to make a window through which A's light reaches B
 *     but not vice versa.
 *   - `colorTint` (optional ColorTag) — stained glass. Atmospheric
 *     only; does not propagate elsewhere.
 *
 * Template authoring follows the "option (b)" in the plan: `Window`
 * is template-loadable like `Door` (`class: '/lib/perception/Window'`,
 * `hydratorClass: '/lib/persistence/PersistentHydrator'`); seed code
 * calls `BoundaryApi.attachExistingBoundary({ boundary, hostA, hostB })`
 * to wire the per-side anchors after clone time. Mirrors how
 * `addBidirectionalExit({ door })` wires a templated Door.
 *
 * Persistence is hydrate-only — there's no v1 use case for a
 * Window's configuration mutating at runtime; only the
 * `Sealable.isOpen` shutter state changes. Anchors are rebuilt at
 * load time by the seed code.
 */

import { Boundary } from './Boundary';
import { SealableMixin } from '../spatial/Sealable';
import type {
  Conduit,
  LightConduit,
  LineOfSight,
  BoundarySide,
} from './Conduit';
import type { ColorTag } from '../perception/Light';

const WindowBase = SealableMixin(Boundary);

interface DirectionalOverrides {
  aToB?: number;
  bToA?: number;
}

/**
 * Window does not declare `implements LightConduit, LineOfSight` on
 * the class itself because the two interfaces have incompatible
 * `conduitKind` literal-type fields. Instead, the conduit registry
 * exposes them via the lightweight wrappers below — the host Window
 * provides the method implementations the wrappers delegate to.
 */
export class Window extends WindowBase {
  static persistentFields = [
    'baseTransmissivity',
    'aToBOverride',
    'bToAOverride',
    'colorTint',
  ];

  /**
   * 0..1, default 1.0. The pass-through factor when the window is
   * open (modulo any directional override). Setter validates and
   * clamps the input — the hydrator's bracket-assign reaches it for
   * a templated Window.
   */
  protected _baseTransmissivity: number = 1.0;

  protected get baseTransmissivity(): number {
    return this._baseTransmissivity;
  }

  protected set baseTransmissivity(value: number) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(
        `Window.baseTransmissivity must be a finite number, got ${typeof value}`
      );
    }
    if (value < 0 || value > 1) {
      throw new RangeError(
        `Window.baseTransmissivity must be in [0, 1], got ${value}`
      );
    }
    this._baseTransmissivity = value;
  }

  public getBaseTransmissivity(): number {
    return this._baseTransmissivity;
  }

  public setBaseTransmissivity(value: number): void {
    this.baseTransmissivity = value;
  }

  /**
   * Optional one-way pass-through factor for light flowing from side
   * A to side B. `null` means "no override; use baseTransmissivity."
   * Set to `0` for the dark side of one-way glass (A→B blocked).
   * Stored as a scalar (number | null) per the scalar-default rule;
   * the structured `DirectionalOverrides` shape lives only at the
   * runtime API layer.
   */
  protected _aToBOverride: number | null = null;
  /** Optional one-way pass-through factor for light flowing from side B to side A. */
  protected _bToAOverride: number | null = null;

  protected get aToBOverride(): number | null {
    return this._aToBOverride;
  }
  protected set aToBOverride(value: number | null) {
    this._aToBOverride = validateOverrideScalar(value, 'aToBOverride');
  }
  protected get bToAOverride(): number | null {
    return this._bToAOverride;
  }
  protected set bToAOverride(value: number | null) {
    this._bToAOverride = validateOverrideScalar(value, 'bToAOverride');
  }

  /**
   * Read the directional overrides as the structured runtime shape.
   * Returns `null` when neither side has an override; otherwise an
   * object with only the present sides populated. Symmetric with the
   * pre-flatten public API.
   */
  public getDirectionalOverrides(): DirectionalOverrides | null {
    if (this._aToBOverride === null && this._bToAOverride === null) return null;
    const out: DirectionalOverrides = {};
    if (this._aToBOverride !== null) out.aToB = this._aToBOverride;
    if (this._bToAOverride !== null) out.bToA = this._bToAOverride;
    return out;
  }

  /**
   * Write the directional overrides from a structured runtime shape.
   * The setter decomposes into the two stored scalars; null clears
   * both sides.
   */
  public setDirectionalOverrides(value: DirectionalOverrides | null): void {
    if (value === null || value === undefined) {
      this._aToBOverride = null;
      this._bToAOverride = null;
      return;
    }
    if (typeof value !== 'object') {
      throw new TypeError(
        'Window.setDirectionalOverrides: expected null or an object with optional aToB / bToA.'
      );
    }
    this.aToBOverride = value.aToB ?? null;
    this.bToAOverride = value.bToA ?? null;
  }

  /** Atmospheric tint applied to light flowing through this window. */
  protected _colorTint: ColorTag | null = null;

  protected get colorTint(): ColorTag | null {
    return this._colorTint;
  }

  protected set colorTint(value: ColorTag | null | undefined) {
    if (value === null || value === undefined) {
      this._colorTint = null;
      return;
    }
    if (typeof value !== 'string') {
      throw new TypeError(
        `Window.colorTint must be a string ColorTag or null, got ${typeof value}`
      );
    }
    this._colorTint = value;
  }

  public getColorTint(): ColorTag | null {
    return this._colorTint;
  }

  public setColorTint(value: ColorTag | null): void {
    this.colorTint = value;
  }

  // --- Conduit surface --------------------------------------------------

  /**
   * Conduit registry. A Window advertises both LightConduit and
   * LineOfSight. The two are surfaced as wrappers that delegate to
   * `this.transmissivity` / `this.canSeeThrough`.
   */
  public override getConduits(): readonly Conduit[] {
    return [lightConduitFor(this), lineOfSightFor(this)];
  }

  public transmissivity(from: BoundarySide, to: BoundarySide): number {
    if (!this.getIsOpen()) return 0;
    if (from === to) return this._baseTransmissivity;
    const override = from === 'A' ? this._aToBOverride : this._bToAOverride;
    if (override !== null) return override;
    return this._baseTransmissivity;
  }

  public canSeeThrough(from: BoundarySide, to: BoundarySide): boolean {
    return this.transmissivity(from, to) > 0;
  }
}

/**
 * Validate a directional-override scalar — `null` or a number in
 * [0, 1]. Used by both `aToBOverride` and `bToAOverride` setters.
 */
function validateOverrideScalar(
  value: number | null,
  name: 'aToBOverride' | 'bToAOverride'
): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(
      `Window.${name} must be null or a finite number in [0, 1], got ${value}`
    );
  }
  return value;
}

/**
 * Wrap the host Window's `transmissivity` in a LightConduit-shaped
 * record. The wrapper rebadges the kind tag at the top of the
 * registry walk so consumers can `find(c => c.conduitKind === 'light')`.
 */
function lightConduitFor(window: Window): LightConduit {
  return {
    conduitKind: 'light',
    transmissivity(from, to) {
      return window.transmissivity(from, to);
    },
  };
}

function lineOfSightFor(window: Window): LineOfSight {
  return {
    conduitKind: 'sight',
    canSeeThrough(from, to) {
      return window.canSeeThrough(from, to);
    },
  };
}
