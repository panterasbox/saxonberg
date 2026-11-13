/**
 * Window — a boundary of glass between two places: it passes light, sight,
 * sound and smell, and never a body.
 *
 * ⭐ A window INTO A PLACE is a way like any other (boundary build,
 * 2026-11): authored as `door:` on a cardinal exit on both sides, so `look
 * west` sees the hillside through it and `go west` is refused (*the west
 * window is not a way through*). ⭐ A window onto the SKY is not a boundary
 * at all — it is glass in the place's `enclosure:` (construction.md). A
 * window with nothing behind it is prose.
 *
 * Composition: `SoilableMixin(platform Boundary)` — the twin's `Sealable`
 * is the shutter; closing it zeroes everything.
 *
 * State:
 *   - `baseTransmissivity` (default 1.0) — the symmetric pass-through.
 *   - `directionalOverrides` (`{ aToB?, bToA? }`) — one-way glass: either
 *     side's value replaces the base for what flows FROM that side.
 *   - `colorTint` — the authored stained-glass colour, by word.
 *   - `glazeR/glazeG/glazeB` — the per-channel transmittance the `glaze`
 *     act writes; overrides `colorTint`. The light walk multiplies
 *     {@link Window.transmittanceColour} into what passes.
 */

import Boundary from './Boundary';
import { SoilableMixin, SOIL_BANDS } from '../../lib/cleanliness/Soilable';
import type {
  BoundaryChannel,
  BoundarySide,
  ChannelTable,
} from '../../lib/boundary/Conduit';
import type { ColorTag } from '../../lib/perception/Light';
import { Colour } from '../../lib/perception/Colour';
import type { FieldMeta } from '../../lib/mixin';

// ⭐ Soilable (cleanliness D19): every pane may grime — soot from the
// room's fires, the town's dirt — and a grimed pane passes less light.
const WindowBase = SoilableMixin(Boundary);

interface DirectionalOverrides {
  aToB?: number;
  bToA?: number;
}

export default class Window extends WindowBase {
  static fieldMeta: FieldMeta = {
    baseTransmissivity: { persistent: true },
    aToBOverride: { persistent: true },
    bToAOverride: { persistent: true },
    colorTint: { persistent: true },
    glazeR: { persistent: true },
    glazeG: { persistent: true },
    glazeB: { persistent: true },
  };

  /**
   * 0..1, default 1.0. The pass-through factor when the window is
   * open (modulo any directional override). Setter validates and
   * clamps the input — the hydrator's bracket-assign reaches it for
   * a templated Window.
   */
  /** ⭐ A window never passes a body, open or shut; the glass decides the rest. */
  protected override _channels: ChannelTable = {
    open: { movement: 0, light: 1, sight: 1, sound: 1, smell: 1 },
    shut: { movement: 0, light: 0, sight: 0, sound: 0, smell: 0 },
  };

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

  /**
   * The glaze transmittance the `glaze` act writes — three scalars per
   * the scalar-default rule, `null` on each when unglazed. Not
   * authorable (a content row tints by `colorTint`); the act copies a
   * blown pane's own `lightTransmittance()` here.
   */
  protected _glazeR: number | null = null;
  protected _glazeG: number | null = null;
  protected _glazeB: number | null = null;

  protected get glazeR(): number | null {
    return this._glazeR;
  }
  protected set glazeR(value: number | null) {
    this._glazeR = validateOverrideScalar(value as number | null, 'glazeR');
  }
  protected get glazeG(): number | null {
    return this._glazeG;
  }
  protected set glazeG(value: number | null) {
    this._glazeG = validateOverrideScalar(value as number | null, 'glazeG');
  }
  protected get glazeB(): number | null {
    return this._glazeB;
  }
  protected set glazeB(value: number | null) {
    this._glazeB = validateOverrideScalar(value as number | null, 'glazeB');
  }

  /**
   * The glaze colour, or `null` when this window has not been glazed.
   * A partial glaze (some channel null) is treated as unglazed — the
   * act always writes all three together.
   */
  public getGlazing(): Colour | null {
    if (this._glazeR === null || this._glazeG === null || this._glazeB === null) {
      return null;
    }
    return Colour.of(this._glazeR, this._glazeG, this._glazeB);
  }

  /**
   * ⭐ May a pane be set in this window now? Not when it is glazed already
   * — the `glaze` act overwrote a window's glass without a word (C14,
   * controller-liquidity W12). A partial glaze reads as unglazed, as
   * {@link getGlazing} does.
   */
  public canGlaze(): boolean {
    return this.getGlazing() === null;
  }

  /** Set (or clear, with `null`) the glaze colour — the `glaze` act's writer. */
  public setGlazing(colour: Colour | null): void {
    if (colour === null) {
      this._glazeR = null;
      this._glazeG = null;
      this._glazeB = null;
      return;
    }
    this._glazeR = colour.r;
    this._glazeG = colour.g;
    this._glazeB = colour.b;
  }

  /**
   * ⭐ The colour this window imparts to light passing through it, for
   * the {@link LightFilter} shape and the light walk. Glazing wins over
   * the authored `colorTint` word, which wins over clear; a shut window
   * passes no light, so it imparts no colour (`UNDYED`) — the walk has
   * already zeroed its flux via `transmissivity`.
   */
  public lightTransmittance(): Colour {
    if (!this.isOpen()) return Colour.UNDYED;
    const glazing = this.getGlazing();
    if (glazing) return glazing;
    if (this._colorTint) return Colour.fromTag(this._colorTint) ?? Colour.UNDYED;
    return Colour.UNDYED;
  }

  /**
   * What the glass passes: the base (or a one-way override for what flows
   * FROM side A or B), scaled by grime; nothing while the shutter is shut.
   */
  public override transmissivity(
    channel: BoundaryChannel,
    from: BoundarySide,
    to: BoundarySide,
  ): number {
    // ⭐ A window passes sight, light, sound and smell and never a body:
    // movement reads the table (0 open, 0 shut), the rest the glass.
    if (channel === 'movement') return super.transmissivity(channel, from, to);
    if (!this.isOpen()) return 0;
    const grime = this.grimeFactor();
    if (from === to) return this._baseTransmissivity * grime;
    const override = from === 'A' ? this._aToBOverride : this._bToAOverride;
    if (override !== null) return override * grime;
    return this._baseTransmissivity * grime;
  }

  /**
   * ⭐ A grimed pane passes less (cleanliness D19): `1 − 0.6 × band/3` —
   * soot from the room's fires, the weather side's dirt — so a filthy
   * window lets in 40 % of what a clean one does, and `wash window` brings
   * the light back. The one number the light walk reads, scaled in place.
   */
  private grimeFactor(): number {
    const rank = SOIL_BANDS.indexOf(this.soilBand());
    return 1 - 0.6 * (Math.max(0, rank) / 3);
  }

  /** The colour the glass gives light passing through it. */
  public override transmittanceColour(_from: BoundarySide, _to: BoundarySide): Colour {
    return this.lightTransmittance();
  }
}

/**
 * Validate a directional-override scalar — `null` or a number in
 * [0, 1]. Used by both `aToBOverride` and `bToAOverride` setters.
 */
function validateOverrideScalar(
  value: number | null,
  name: string
): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(
      `Window.${name} must be null or a finite number in [0, 1], got ${value}`
    );
  }
  return value;
}
