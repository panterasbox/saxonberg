/**
 * PositionedMixin — a thing with a geographic position in an Expanse.
 *
 * Three composers with no common pack ancestor, which is why it is
 * kernel: an `ExpanseNode` (authored, still), a `Structure` (a building's
 * position does not change; a ship's does — *one field is the whole
 * difference*), and the transport pack's `Boat`.
 *
 * ⚠ Composed on NEITHER `ExitableVessel` (a wardrobe would claim a
 * position at sea) NOR `Mobile` (so would a swimmer). A person's position
 * is never theirs: it is the outermost positioned thing they are inside,
 * resolved by `ExpanseApi.positionOf`.
 *
 * It never shares a host with `CartesianCoordinatesMixin`: a room has a
 * cell, a node or a craft has a position.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { GeoPosition, type GeoPositionRecord } from './GeoPosition';

export interface Positioned {
  getExpansePosition(): GeoPosition | null;
  setExpansePosition(value: GeoPositionRecord | GeoPosition | null): void;
  getExpanse(): string | null;
  setExpanse(path: string | null): void;
  sightHeightFor(observer: unknown): number;
  getTargetHeightM(): number;
}

export function PositionedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PositionedMixin extends Base implements Positioned {
    static _mixinName: string = 'PositionedMixin';

    static fieldMeta: FieldMeta = {
      expansePosition: { persistent: true, authorable: true },
      expanse: { persistent: true, authorable: true },
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
      this.expansePosition = value === null ? null : new GeoPosition(value).toJSON();
    }

    getExpanse(): string | null { return this.expanse; }
    setExpanse(path: string | null): void { this.expanse = path ?? null; }

    /**
     * How high `observer`'s eye is when looking out from this thing,
     * metres — what the sea's horizon formula reads of an observer.
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
     * How tall this thing stands as a TARGET, metres — what the horizon
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
