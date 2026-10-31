/**
 * LineEnd — ⭐ **the free end of a line, in somebody's hands** (underwater
 * C1; kernel since cordage D1). Made fast to a diver, caught by a swimmer
 * it was heaved to, or tied to a load on the bed: it is how the person on
 * the end is ON the line. Holding it is what lets them `tug`; tying it to
 * something beside them leaves the line fast to that.
 *
 * Minted by its `Line` when the line is made fast, and gone when the line
 * is cast off — a runtime object, never authored into the world. A rope's
 * end is a `RopeEnd` (it can be climbed); a hose's is this.
 */

import Good from './Good';
import { TetherEndMixin } from '../../lib/spatial/TetherEnd';
import { TieableMixin, type TieOutcome } from '../../lib/spatial/Tieable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import type { CommandContributions } from '../../api/command';
import type Line from '../../lib/spatial/Line';
import type { LineOutcome } from '../../lib/spatial/Line';

export default class LineEnd extends TieableMixin(TetherEndMixin(Good)) {
  static commandContributions: CommandContributions = {
    self: [],
    // Whoever holds the end (item → holder) can signal up it and tie it to
    // a load; a tied end lying beside its load can be untied by anybody there.
    environment: ['platform/cmd/inventory/tug.yaml', 'platform/cmd/inventory/tie.yaml'],
    peers: ['platform/cmd/inventory/untie.yaml'],
  };

  /** The line this is the end of (runtime live ref). */
  private _line: Line | null = null;

  public attachTo(line: Line): void {
    this._line = line;
    const words = line.endWords();
    if (words !== null) {
      this.setShortDescription(words.short);
      this.setKeywords([...this.getKeywords(), ...words.keywords]);
    }
  }

  public getLine(): Line | null {
    const l = this._line;
    return l !== null && !l.isDestroyed() ? l : null;
  }

  /**
   * ⭐ The line's far end (river W16): whoever or whatever has the line
   * itself — the tender carrying it, the boat it lies in. What the water
   * asks of a painter in a walker's hand.
   */
  public override tetheredTo(): Stuff | null {
    const line = this.getLine();
    return line === null ? null : (line.getContainer() as Stuff | null);
  }

  /** What the end is made fast to, when it is not in anybody's hands (runtime). */
  private _lashedTo: Stuff | null = null;

  /**
   * Whoever has the end in hand — or the thing it is tied to, while the
   * end lies beside it — or null.
   */
  public getHolder(): Stuff | null {
    const at = this.getContainer() as Stuff | null;
    if (at !== null && at.isAgent?.()) return at;
    const load = this._lashedTo;
    if (load === null || load.isDestroyed()) return null;
    return MixinApi.isContainable(load) && load.getContainer() === at ? load : null;
  }

  /** The thing this end is tied to, if any (not a person). */
  public getLashedTo(): Stuff | null {
    return this.getHolder() === this._lashedTo ? this._lashedTo : null;
  }

  /**
   * ⭐ `tie end to <load>` — make the end fast to `load`, here beside you:
   * the end leaves your hands and whoever holds the line can haul the load
   * up on it.
   */
  public override async tieTo(by: Stuff, load: Stuff, knot: string | null): Promise<TieOutcome> {
    void knot;
    if (this.getLine() === null) return { ok: false, reason: 'no-line', line: 'The end is not fast to anything.' };
    if (this.getContainer() !== by) return { ok: false, reason: 'not-holding', line: 'You are not holding the end.' };
    if (load === by || load.isAgent?.() || !MixinApi.isContainable(load)) {
      return { ok: false, reason: 'not-a-load', line: 'You cannot tie the line to that.' };
    }
    const place = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (place === null || load.getContainer() !== place) {
      return { ok: false, reason: 'out-of-reach', line: `${load.getPresentation()} is not here.` };
    }
    ContainmentApi.move(this, place as Stuff & Container);
    this._lashedTo = load;
    return { ok: true, line: `You make the end of the line fast to ${load.getPresentation()}.` };
  }

  /**
   * `untie end` — take the end back off the load it was tied to; or, for
   * the person it is made fast to, get off the line.
   */
  public override async untieBy(by: Stuff): Promise<TieOutcome> {
    const line = this.getLine();
    if (line !== null && this.getContainer() === by) {
      await line.castOff();
      return { ok: true, line: 'You cast off the end of the line; you are off it.' };
    }
    const load = this.getLashedTo();
    if (load === null) return { ok: false, reason: 'not-tied', line: 'The end is not tied to anything.' };
    if (!MixinApi.isContainer(by)) return { ok: false, reason: 'no-hands', line: 'You have no hands to take it in.' };
    this._lashedTo = null;
    ContainmentApi.move(this, by as Stuff & Container);
    return { ok: true, line: `You cast the end of the line off ${load.getPresentation()} and take it up.` };
  }

  /** Keep the end with the load it is tied to (the haul moves both). */
  public followLoad(): void {
    const load = this._lashedTo;
    const at = load !== null && !load.isDestroyed() && MixinApi.isContainable(load) ? load.getContainer() : null;
    if (at !== null && at !== this.getContainer()) ContainmentApi.move(this, at as Stuff & Container);
  }

  /** ⭐ A tug up the line, from whoever holds this end. */
  public tug(by: Stuff): LineOutcome {
    const line = this.getLine();
    if (line === null) return { ok: false, reason: 'no-line', line: 'The end is not fast to anything.' };
    if (this.getHolder() !== by) return { ok: false, reason: 'not-holding', line: 'You are not holding the end.' };
    return line.tugBy(by);
  }
}
