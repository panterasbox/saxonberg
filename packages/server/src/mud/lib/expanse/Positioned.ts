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
  };
}
