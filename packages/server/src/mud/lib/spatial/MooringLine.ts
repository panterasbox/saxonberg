/**
 * MooringLineMixin — ⭐ **a line that holds a ship to the shore** (harbors
 * P6): one end at her bitts, aboard; the other ashore, round a bollard.
 *
 * The shape is the rope's own — a line has two ends, each in a room — and
 * the diving trade's on master (`Lifeline.makeFast` mints its free end into
 * another container). What this protocol adds is the second use of that
 * end: made fast round a FIXTURE rather than put in a person's hands.
 *
 * - **`makeFastRound(bollard, ship)`** keeps the line where it is (on her
 *   deck) and has the composer mint its end beside the bollard — a real
 *   thing on the quay (`mintMooringEnd`), so `look` on the quay sees it.
 * - **The end leaving the bollard casts the line off** (`endLifted`):
 *   somebody lifts it off and the ship is told (`Moorer.lineCastOff`); her
 *   last line off and she is no longer moored.
 * - **`castOffMooring()`** brings the end in from aboard — the ship's own
 *   act when she sails — and tells her nothing (she asked).
 *
 * ⚠ Which line is fast to what is RUNTIME (a live ref), like the diving
 * line's end: the ship keeps the fact that she is moored and re-makes her
 * lines fast when she loads (`Ship.onRestored`).
 *
 * The cordage seam: when `Rope` lands it composes this protocol in place of
 * `Lifeline` (harbors-plan § Deferred seams).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';

/** What a mooring line is made fast FOR — the ship it holds. */
export interface Moorer {
  /** Her name, as a line's end ashore reads it (`the Hesper`). */
  getName(): string;
  /** One of her lines was cast off from ashore — her mooring may be gone. */
  lineCastOff(line: Stuff & MooringLine): void;
}

export interface MooringLine {
  /** How long the line is, m — whether it reaches from her rail to the quay. */
  lineLengthM(): number;
  /** Made fast round a bollard ashore now? */
  isMadeFast(): boolean;
  /** The bollard its end is round, or `null`. */
  madeFastTo(): Stuff | null;
  /** The ship it holds, or `null`. */
  mooredBy(): Moorer | null;
  /**
   * ⭐ Make the line fast round `bollard`: its end goes ashore beside the
   * bollard. `false` when the composer has no end to put there.
   */
  makeFastRound(bollard: Stuff, ship: Moorer): Promise<boolean>;
  /** Bring the end in from aboard — the ship's own act; she is not told. */
  castOffMooring(): Promise<void>;
  /** ⭐ The end was lifted off the bollard ashore: the line is off, and the ship is told. */
  endLifted(): Promise<void>;
}

export function MooringLineMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class MooringLineMixin extends Base implements MooringLine {
    static _mixinName: string = 'MooringLineMixin';

    /** What the line is fast round, and for whom (runtime live refs). */
    private _mooring: { bollard: Stuff; ship: Moorer; end: Stuff } | null = null;

    /** @hook The line's length, m. Default: none — a line that reaches nothing. */
    public lineLengthM(): number {
      return 0;
    }

    public isMadeFast(): boolean {
      return this.liveMooring() !== null;
    }

    public madeFastTo(): Stuff | null {
      return this.liveMooring()?.bollard ?? null;
    }

    public mooredBy(): Moorer | null {
      return this.liveMooring()?.ship ?? null;
    }

    public async makeFastRound(bollard: Stuff, ship: Moorer): Promise<boolean> {
      await this.castOffMooring();
      const end = await this.mintMooringEnd(bollard, ship);
      if (end === null) return false;
      this._mooring = { bollard, ship, end };
      return true;
    }

    public async castOffMooring(): Promise<void> {
      const m = this._mooring;
      this._mooring = null;
      if (m !== null && !m.end.isDestroyed()) StuffApi.destruct(m.end);
    }

    public async endLifted(): Promise<void> {
      const m = this._mooring;
      if (m === null) return;
      await this.castOffMooring();
      m.ship.lineCastOff(this as unknown as Stuff & MooringLine);
    }

    /**
     * Mint the line's end beside `bollard` — a thing in the bollard's room,
     * made fast round it, that calls {@link endLifted} when it leaves.
     *
     * @hook The composer's end (its own row). Default: no end — the line
     *   cannot be made fast.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async mintMooringEnd(_bollard: Stuff, _ship: Moorer): Promise<Stuff | null> {
      return null;
    }

    /** The mooring, unless its end has gone some way the line was not told of. */
    private liveMooring(): { bollard: Stuff; ship: Moorer; end: Stuff } | null {
      const m = this._mooring;
      if (m === null) return null;
      if (m.end.isDestroyed() || m.bollard.isDestroyed()) {
        this._mooring = null;
        return null;
      }
      return m;
    }
  };
}
