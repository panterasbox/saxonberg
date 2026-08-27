/**
 * Window — first user of the `Boundary` substrate.
 *
 * Composition: `SealableMixin(Boundary)` (Boundary already provides
 * `Visible + Perceptible + Thing`). The `Sealable.open` flag is the
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
 * is template-loadable like `Door` (`class: '/platform/thing/Window'`,
 * `hydratorClass: '/platform/idea/persistence/PersistentHydrator'`); seed code
 * calls `BoundaryApi.attachExistingBoundary({ boundary, hostA, hostB })`
 * to wire the per-side anchors after clone time. Mirrors how
 * `addBidirectionalExit({ door })` wires a templated Door.
 *
 * Persistence is hydrate-only — there's no v1 use case for a
 * Window's configuration mutating at runtime; only the
 * `Sealable.open` shutter state changes. Anchors are rebuilt at
 * load time by the seed code.
 */

import { Boundary } from '../../lib/boundary/Boundary';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { StuffApi } from '../../api/stuff';
import { BoundaryApi } from '../../api/boundary';
import { MixinApi } from '../../api/mixin';
import type { Adornable } from '../../lib/boundary/Adornable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  Conduit,
  LightConduit,
  LineOfSight,
  BoundarySide,
} from '../../lib/boundary/Conduit';
import type { SmellConduit } from '../../lib/boundary/SmellConduit';
import type { SoundConduit } from '../../lib/boundary/SoundConduit';
import type { ColorTag } from '../../lib/perception/Light';
import type { FieldMeta } from '../../lib/mixin';

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
export default class Window extends WindowBase {
  static fieldMeta: FieldMeta = {
    baseTransmissivity: { persistent: true },
    aToBOverride: { persistent: true },
    bToAOverride: { persistent: true },
    colorTint: { persistent: true },
    attachedHosts: { persistent: true },
  };

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
    return [
      lightConduitFor(this),
      lineOfSightFor(this),
      smellConduitFor(this),
      soundConduitFor(this),
    ];
  }

  public transmissivity(from: BoundarySide, to: BoundarySide): number {
    if (!this.isOpen()) return 0;
    if (from === to) return this._baseTransmissivity;
    const override = from === 'A' ? this._aToBOverride : this._bToAOverride;
    if (override !== null) return override;
    return this._baseTransmissivity;
  }

  public canSeeThrough(from: BoundarySide, to: BoundarySide): boolean {
    return this.transmissivity(from, to) > 0;
  }

  /**
   * Persistent declarative-content field carrying the templatePaths
   * of the two hosts this Window connects, identity refs per
   * ref-shapes.md. The setter resolves both paths via
   * `StuffApi.singleton` (lazy-clones absent hosts) and installs the
   * per-side anchors via `BoundaryApi.attachExistingBoundary`.
   *
   * Idempotency: if the Window's anchors are already installed AND
   * their hosts match the declared paths (in either order — the
   * boundary is undirected), no-op. Mismatch (different hosts or
   * half-attached corruption) throws with diagnostics.
   *
   * NOTE: this field is only meaningful for template-shaped hosts —
   * `getTemplatePath()`-comparable. Test fixtures created via
   * `makeStuff` (no template path) MUST use `makeStuffAtPath` so the
   * idempotency comparison has something stable to match against.
   *
   * Per declarative-content-slate § attachedHosts.
   */
  protected _attachedHosts: [string, string] | null = null;

  public getAttachedHosts(): [string, string] | null {
    return this._attachedHosts === null
      ? null
      : [this._attachedHosts[0], this._attachedHosts[1]];
  }

  /**
   * Setter with side effect. Stores the value, resolves both hosts
   * via `StuffApi.singleton`, and installs anchors via
   * `BoundaryApi.attachExistingBoundary`. Idempotent on the happy
   * path; throws on conflict / half-attach / same-host.
   */
  public async setAttachedHosts(value: [string, string]): Promise<void> {
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      typeof value[0] !== 'string' ||
      typeof value[1] !== 'string'
    ) {
      throw new TypeError(
        `Window.setAttachedHosts: expected [string, string], got ${JSON.stringify(value)}`
      );
    }
    if (value[0] === value[1]) {
      throw new Error(
        `Window.setAttachedHosts: hostA path and hostB path must differ ('${value[0]}').`
      );
    }
    // Idempotency check via existing anchors.
    const anchorA = this.getAnchorA();
    const anchorB = this.getAnchorB();
    if (anchorA && anchorB) {
      const hostA = anchorA.getAdornedTo();
      const hostB = anchorB.getAdornedTo();
      const pathA = (hostA as unknown as Stuff | null)?.getTemplatePath() ?? null;
      const pathB = (hostB as unknown as Stuff | null)?.getTemplatePath() ?? null;
      const matchesForward = pathA === value[0] && pathB === value[1];
      const matchesReverse = pathA === value[1] && pathB === value[0];
      if (matchesForward || matchesReverse) {
        this._attachedHosts = [value[0], value[1]];
        return;
      }
      const tag =
        (this as unknown as Stuff).getTemplatePath() ??
        (this as unknown as Stuff).stuffId;
      throw new Error(
        `Window.setAttachedHosts: ${tag} already attached to ('${pathA}', ` +
          `'${pathB}'); refusing to re-attach to ('${value[0]}', ` +
          `'${value[1]}'). Destruct the boundary first via BoundaryApi.`
      );
    }
    if (anchorA || anchorB) {
      const tag =
        (this as unknown as Stuff).getTemplatePath() ??
        (this as unknown as Stuff).stuffId;
      throw new Error(
        `Window.setAttachedHosts: ${tag} is half-attached ` +
          `(anchorA=${anchorA ? 'set' : 'null'}, anchorB=${
            anchorB ? 'set' : 'null'
          }). This is a corruption; fix by destructing the boundary ` +
          `and re-cloning.`
      );
    }
    // Fresh attach. Resolve both hosts lazily.
    const hostA = await StuffApi.singleton<Stuff & Adornable>(value[0]);
    const hostB = await StuffApi.singleton<Stuff & Adornable>(value[1]);
    if (
      !MixinApi.isAdornable(hostA as Stuff) ||
      !MixinApi.isAdornable(hostB as Stuff)
    ) {
      throw new TypeError(
        `Window.setAttachedHosts: both hosts must compose AdornableMixin ` +
          `(hostA=${value[0]}, hostB=${value[1]}).`
      );
    }
    BoundaryApi.attachExistingBoundary({
      boundary: this,
      hostA,
      hostB,
    });
    this._attachedHosts = [value[0], value[1]];
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

function smellConduitFor(window: Window): SmellConduit {
  return {
    conduitKind: 'smell',
    // Closed shutter blocks smell; open window passes the host's
    // transmissivity (mirrors the light-side gating).
    transmissivity(from, to) {
      return window.transmissivity(from, to);
    },
  };
}

function soundConduitFor(window: Window): SoundConduit {
  return {
    conduitKind: 'sound',
    // Closed shutter blocks sound; open window transmits with the
    // same factor as light. Acoustic specifics (frequency-dependent
    // attenuation, glass-vs-paper) are future polish.
    transmissivity(from, to) {
      return window.transmissivity(from, to);
    },
  };
}
