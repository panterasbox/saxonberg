/**
 * PositionedMixin — a CRAFT's position on the chart (lat/lon) in an
 * Expanse.
 *
 * Two composers with no common pack ancestor, which is why it is kernel:
 * a `Ship` and the transport pack's `Boat`. ⭐ NOT an `ExpanseNode` — a
 * node is a point of the expanse's spherical GRAPH, relative to the
 * expanse (`SphericalCoordinatesMixin`), and its chart position is
 * derived through the expanse's origin (maritime review, 2026-10-13).
 * A craft's position is the chart's own: it is where the sailor plots.
 *
 * ⚠ Composed on NEITHER `ExitableVessel` (a wardrobe would claim a
 * position at sea) NOR `Mobile` (so would a swimmer). A person's position
 * is never theirs: it is the outermost positioned thing they are inside,
 * resolved by `ExpanseApi.positionOf`.
 *
 * It never shares a host with `CartesianCoordinatesMixin`: a room has a
 * cell, a node or a craft has a position — ⭐ except a MOVING PLACE (river
 * D4: a reach patch, a stopped ship's room at sea), whose coordinates are
 * decoration, as a band's are, never grid-indexed beyond its own zone.
 *
 * ⭐ **Two frames, one record** (river D18): a position is either on the
 * chart (`expanse` + `expansePosition`) or on a river's LINE (`line` +
 * `linePosition` — km from the mouth, m from river left). Never both: the
 * setters refuse the second half while the first is set, so a ship at a
 * river's mouth clears one before taking the other.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { GeoPosition, type GeoPositionRecord } from './GeoPosition';
import type { LinePositionRecord } from './LineFrame';

export interface Positioned {
  getExpansePosition(): GeoPosition | null;
  setExpansePosition(value: GeoPositionRecord | GeoPosition | null): void;
  getExpanse(): string | null;
  setExpanse(path: string | null): void;
  sightHeightFor(observer: unknown): number;
  getTargetHeightM(): number;
  getLine(): string | null;
  getLinePosition(): LinePositionRecord | null;
  placeOnLine(line: string | null, value: LinePositionRecord | null): void;
  framePath(): string | null;
}

export function PositionedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PositionedMixin extends Base implements Positioned {
    static _mixinName: string = 'PositionedMixin';

    static fieldMeta: FieldMeta = {
      expansePosition: { persistent: true, authorable: true },
      expanse: { persistent: true, authorable: true },
      line: { persistent: true, authorable: true },
      linePosition: { persistent: true, authorable: true },
    };

    /**
     * Where it is, as the plain record (persisted and authored as
     * `{ latDeg, lonDeg }`). `null` = nowhere in any expanse — a building
     * ashore, a boat on a deck.
     */
    protected expansePosition: GeoPositionRecord | null = null;

    /** The expanse row this position is in — an identity ref. */
    protected expanse: string | null = null;

    getExpansePosition(): GeoPosition | null {
      return this.expansePosition === null ? null : new GeoPosition(this.expansePosition);
    }

    setExpansePosition(value: GeoPositionRecord | GeoPosition | null): void {
      if (value !== null && this.linePosition !== null) {
        throw new Error(
          'PositionedMixin: a position is on the chart OR on a line, never both — clear the line half first',
        );
      }
      this.expansePosition = value === null ? null : new GeoPosition(value).toJSON();
    }

    /** The river (a `LineFrame` row path) this position is on, or `null`. */
    protected line: string | null = null;

    /** Where on that river: km from the mouth, m from river left. */
    protected linePosition: LinePositionRecord | null = null;

    getLine(): string | null { return this.line; }

    getLinePosition(): LinePositionRecord | null {
      return this.linePosition === null ? null : { ...this.linePosition };
    }

    /** Hydration setter — the record's own field, no invariant (see {@link placeOnLine}). */
    setLine(value: string | null): void {
      this.line = typeof value === 'string' && value !== '' ? value : null;
    }

    /** Hydration setter — the record's own field, no invariant (see {@link placeOnLine}). */
    setLinePosition(value: LinePositionRecord | null): void {
      this.linePosition =
        value && typeof value === 'object' && Number.isFinite(value.km) && Number.isFinite(value.across)
          ? { course: value.course, km: value.km, across: value.across }
          : null;
    }

    /**
     * Put it on a river's line (or off one, with `null`s). Refused while
     * a chart position is set — one frame at a time.
     */
    placeOnLine(line: string | null, value: LinePositionRecord | null): void {
      if (value !== null && this.expansePosition !== null) {
        throw new Error(
          'PositionedMixin: a position is on the chart OR on a line, never both — clear the chart half first',
        );
      }
      if (value !== null && !(Number.isFinite(value.km) && Number.isFinite(value.across))) {
        throw new Error(`PositionedMixin: a line position needs a finite km and across (got ${JSON.stringify(value)})`);
      }
      this.line = value === null ? null : line;
      this.linePosition = value === null ? null : { course: value.course, km: value.km, across: value.across };
    }

    /** The frame this position is in — the expanse's path or the river's. */
    framePath(): string | null {
      if (this.linePosition !== null) return this.line;
      return this.expansePosition !== null ? this.expanse : null;
    }

    getExpanse(): string | null { return this.expanse; }
    setExpanse(path: string | null): void { this.expanse = path ?? null; }

    /**
     * How high `observer`'s eye is when looking out from this thing,
     * meters — what the sea's horizon formula reads of an observer.
     *
     * @hook Invoked by `Expanse.contactsFrom` for the observing craft.
     *   Default `0` — an eye at the waterline. A Structure answers its
     *   deck or, for whoever holds the lookout seat, its masthead; a boat
     *   its own eye height.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sightHeightFor(_observer: unknown): number {
      return 0;
    }

    /**
     * How tall this thing stands as a TARGET, meters — what the horizon
     * formula reads of it when somebody else is looking.
     *
     * @hook Invoked by `Expanse.contactsFrom` for each candidate. Default
     *   `0`; a Structure answers its `heightM`, a boat its own.
     */
    getTargetHeightM(): number {
      return 0;
    }
  };
}
