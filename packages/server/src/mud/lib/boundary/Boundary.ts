/**
 * Boundary — the ONE thing standing in a way between two places.
 *
 * ⭐⭐ **Each place's exit is a SIDE of it.** A door between the bank and the
 * pump house is one object: shut it from either side and it is shut on
 * both, lock it from inside and the bank finds it locked, and both places
 * call it by the same name. Before the boundary build (2026-11) there were
 * four models of this — a door hung on an exit, an anchor pair surfacing a
 * window as a fixture on each room, exits with a lock of their own, and a
 * window that wired its own hosts — and they did not agree (a door locked
 * from one side was open from the other). See `docs/subsystems/boundary.md`.
 *
 * What a boundary passes is DATA: a channel table (`channels:` on the row,
 * one table open and one shut; vocabulary in `Conduit.ts`) read by
 * {@link transmissivity}. The light, sound and smell walks iterate a
 * place's exits and ask each side's boundary; a side with no boundary is an
 * open way (*an open way has nothing in it*).
 *
 * The sides are weak instance refs: a boundary is a row singleton (an
 * authored `door:`) or owned by the code that minted it (a holding's keyed
 * door, a ship's gangway), never by either side. When a side's exit dies,
 * its slot self-heals to null.
 *
 * This is the abstract base (`lib/`); rows instance `platform/thing/Boundary`
 * (a curtain), `Door` (anything with a bolt) or `Window`.
 */

import Thing from '../stuff/Thing';
import type { EvictionContext, Stuff } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type Exit from './Exit';
import {
  BOUNDARY_CHANNELS,
  type BoundaryChannel,
  type BoundaryOpening,
  type BoundarySide,
  type ChannelTable,
  type ChannelValues,
} from './Conduit';
import type { FieldMeta } from '../mixin';
import { Colour } from '../perception/Colour';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

const FromBoundaryLogic = SecurityPolicies.FromModule(
  '/platform/idea/api/BoundaryLogic#BoundaryLogic',
);

/** All open, nothing shut — a door's numbers, and the base's. */
const DEFAULT_CHANNELS: ChannelTable = {
  open: { movement: 1, light: 1, sight: 1, sound: 1, smell: 1 },
  shut: { movement: 0, light: 0, sight: 0, sound: 0, smell: 0 },
};

/** A doorway's size when a row names none: a man-sized door. */
const DEFAULT_OPENING: BoundaryOpening = { width: 1, height: 2 };

const BoundaryBase = Thing;

export class Boundary extends BoundaryBase {
  static fieldMeta: FieldMeta = {
    sideA: { ref: 'instance', lifetime: 'weak' },
    sideB: { ref: 'instance', lifetime: 'weak' },
    channels: { persistent: true, authorable: true },
    opening: { persistent: true, authorable: true },
  };

  protected sideA: Exit | null = null;
  protected sideB: Exit | null = null;
  protected _channels: ChannelTable = cloneTable(DEFAULT_CHANNELS);
  protected _opening: BoundaryOpening = { ...DEFAULT_OPENING };

  /** Host-internal accessor pairs — the Hydrator reflects `channels`/`opening` by name. */
  protected get channels(): ChannelTable {
    return this._channels;
  }
  protected set channels(value: ChannelTable) {
    this.setChannels(value);
  }
  protected get opening(): BoundaryOpening {
    return this._opening;
  }
  protected set opening(value: BoundaryOpening) {
    this.setOpening(value);
  }

  // --- sides ---------------------------------------------------------------

  /** The two sides, A first; either may be empty. */
  public getSides(): readonly [Exit | null, Exit | null] {
    return [this.sideA, this.sideB];
  }

  /** Which side `exit` is, or null if it is not one of mine. */
  public sideOf(exit: Exit): BoundarySide | null {
    if (exit === this.sideA) return 'A';
    if (exit === this.sideB) return 'B';
    return null;
  }

  /** The side across from `exit`, or null (not mine, or the far side is unbuilt). */
  public otherSide(exit: Exit): Exit | null {
    if (exit === this.sideA) return this.sideB;
    if (exit === this.sideB) return this.sideA;
    return null;
  }

  /**
   * BoundaryLogic-only seam: take `exit` as a side. Refuses a third side and
   * a side that is already mine twice over. Idempotent for a side already
   * attached.
   */
  @CallSecurity(FromBoundaryLogic)
  public _attachSide(exit: Exit): void {
    if (exit === this.sideA || exit === this.sideB) return;
    if (!this.sideA) {
      this.sideA = exit;
      return;
    }
    if (!this.sideB) {
      this.sideB = exit;
      return;
    }
    throw new Error(
      `Boundary: ${this.tag()} already has two sides; a way has only two.`,
    );
  }

  /** BoundaryLogic-only seam: let `exit` go. Idempotent. */
  @CallSecurity(FromBoundaryLogic)
  public _detachSide(exit: Exit): void {
    if (exit === this.sideA) this.sideA = null;
    if (exit === this.sideB) this.sideB = null;
  }

  // --- channels ------------------------------------------------------------

  public getChannels(): ChannelTable {
    return cloneTable(this._channels);
  }

  /**
   * Phase-1 setter for `channels:`. Merges over the class's defaults, so a
   * row names only what differs. ⚠ An unknown channel key, or a value
   * outside 0..1, throws — a misspelt `ligth:` must not read as dark.
   */
  public setChannels(value: Partial<Record<'open' | 'shut', ChannelValues>>): void {
    if (value === null || typeof value !== 'object') {
      throw new TypeError(`Boundary.channels must be an object with open/shut tables.`);
    }
    const next = cloneTable(this._channels);
    for (const [state, table] of Object.entries(value)) {
      if (state !== 'open' && state !== 'shut') {
        throw new TypeError(
          `Boundary.channels: '${state}' is not a state (open | shut).`,
        );
      }
      if (table === null || typeof table !== 'object') {
        throw new TypeError(`Boundary.channels.${state} must be a table.`);
      }
      for (const [ch, v] of Object.entries(table)) {
        if (!(BOUNDARY_CHANNELS as readonly string[]).includes(ch)) {
          throw new TypeError(
            `Boundary.channels.${state}: '${ch}' is not a channel ` +
              `(${BOUNDARY_CHANNELS.join(' | ')}).`,
          );
        }
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
          throw new RangeError(
            `Boundary.channels.${state}.${ch} must be a number in [0, 1], got ${String(v)}.`,
          );
        }
        next[state][ch as BoundaryChannel] = v;
      }
    }
    this._channels = next;
  }

  /**
   * Open, for a boundary with nothing to shut. The platform twin composes
   * `Sealable`, whose `isOpen` replaces this.
   */
  public isOpen(): boolean {
    return true;
  }

  /**
   * ⭐ How much of `channel` passes from side `from` to side `to`, 0..1 —
   * the one question every walk asks. Reads the open or shut table by
   * {@link isOpen}. Subclasses refine it (`Door`: a door on a weight lets
   * you through shut; `Window`: glazing, grime and one-way glass).
   */
  public transmissivity(
    channel: BoundaryChannel,
    _from: BoundarySide,
    _to: BoundarySide,
  ): number {
    const table = this.isOpen() ? this._channels.open : this._channels.shut;
    return table[channel] ?? 0;
  }

  /**
   * The colour this boundary gives light passing `from` → `to`. White
   * (`UNDYED`) here; a stained `Window` answers its glazing.
   */
  public transmittanceColour(_from: BoundarySide, _to: BoundarySide): Colour {
    return Colour.UNDYED;
  }

  /** The colour of light arriving INTO `nearSide`'s place. */
  public colourInto(nearSide: Exit): Colour {
    const near = this.sideOf(nearSide) ?? 'A';
    return this.transmittanceColour(near === 'A' ? 'B' : 'A', near);
  }

  /** What passes INTO `nearSide`'s place from across the way. */
  public transmissivityInto(channel: BoundaryChannel, nearSide: Exit): number {
    const near = this.sideOf(nearSide) ?? 'A';
    return this.transmissivity(channel, near === 'A' ? 'B' : 'A', near);
  }

  /** Whether a body can cross this way while it is open — false for a window. */
  public passesBodiesWhenOpen(): boolean {
    return (this._channels.open.movement ?? 0) > 0;
  }

  /**
   * ⭐ Whether a way swings shut behind whoever passes (a workshop door on a
   * weight). False here; `Door` answers its `closesBehind`.
   */
  public swingsShut(): boolean {
    return false;
  }

  // --- opening -------------------------------------------------------------

  public getOpening(): BoundaryOpening {
    return { ...this._opening };
  }

  public setOpening(value: BoundaryOpening): void {
    if (
      value === null ||
      typeof value !== 'object' ||
      !isPositive(value.width) ||
      !isPositive(value.height)
    ) {
      throw new TypeError(
        `Boundary.opening must be { width, height } in metres, both positive; got ${JSON.stringify(value)}.`,
      );
    }
    this._opening = { width: value.width, height: value.height };
  }

  // --- words ---------------------------------------------------------------

  /**
   * The one word a way's listing uses for this boundary's state. `Door`
   * adds `locked`, which outranks both because the traverse refuses a
   * locked door before a shut one.
   */
  public stateWord(): 'locked' | 'open' | 'closed' {
    return this.isOpen() ? 'open' : 'closed';
  }

  /**
   * Authored keywords plus the tokens of the short description, so a
   * `heavy oak door` answers to `oak` and `door` without re-listing them.
   *
   * ⚠ **DERIVED (magic), named here:** the description's tokens are not
   * authored keywords; this override folds them in, and MQL reads them only
   * through this Perceptible interface. The boundary is a candidate in its
   * own right (MQL's `here` pool lists it once, beside its way), so `wash
   * window` and `open door` bind it, and `open north` reaches it through
   * `MqlApi.effectiveTarget`.
   */
  override getKeywords(viewer?: Stuff): string[] {
    const base = super.getKeywords(viewer);
    const nameTokens = this.shortDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return Array.from(new Set([...base, ...nameTokens]));
  }

  // --- residency -----------------------------------------------------------

  /** A boundary lives while a way through it does. */
  public override canEvict(context: EvictionContext): VetoResult {
    for (const side of [this.sideA, this.sideB]) {
      if (!side || side.isDestroyed()) continue;
      const src = side.getSource() as Stuff | null;
      if (src && !src.isDestroyed()) {
        return { ok: false, reason: 'boundary of a live way' };
      }
    }
    return super.canEvict(context);
  }

  private tag(): string {
    return this.getTemplatePath() ?? this.stuffId;
  }
}

function cloneTable(t: ChannelTable): ChannelTable {
  return { open: { ...t.open }, shut: { ...t.shut } };
}

function isPositive(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}
