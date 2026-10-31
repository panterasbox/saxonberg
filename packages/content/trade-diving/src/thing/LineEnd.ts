/**
 * LineEnd — ⭐ **the free end of a lifeline, in somebody's hands**
 * (underwater C1). Made fast to a diver, or caught by a swimmer it was
 * heaved to: it is how the person on the end is ON the line. Holding it
 * is what lets them `tug`; letting go of it (dropping it) is letting go
 * of the line.
 *
 * Minted by its `Lifeline` when the line is made fast, and gone when the
 * line is cast off — a runtime object, never authored into the world.
 *
 * ⭐ Or made fast round a BOLLARD on a quay (harbors P6): a ship's line,
 * ashore. Lifting it off the bollard (`get`, or anything that moves it
 * away) casts the line off, and the ship it held is told.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { TetherEndMixin } from '@saxonberg/server/mud/lib/spatial/TetherEnd';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type Lifeline from './Lifeline';
import type { LineOutcome } from './Lifeline';

export default class LineEnd extends TetherEndMixin(Good) {
  static commandContributions: CommandContributions = {
    self: [],
    // Whoever holds the end (item → holder) can signal up it.
    environment: ['trade/diving/cmd/diving/tug.yaml', 'trade/diving/cmd/diving/lash.yaml'],
    peers: [],
  };

  /** The line this is the end of (runtime live ref). */
  private _line: Lifeline | null = null;

  public attachTo(line: Lifeline): void {
    this._line = line;
    // ⭐ The end of a hose is a hose's end (found by the underwater browser
    // walk: a suited diver typed `tug hose` and was told they had no line).
    if (line.getKind() === 'hose') {
      this.setShortDescription('end of an air hose');
      this.setKeywords([...this.getKeywords(), 'hose', 'air hose', 'hose end']);
    }
  }

  /** The bollard this end is made fast round, ashore (runtime; harbors P6). */
  private _roundBollard: Stuff | null = null;

  /**
   * ⭐ Made fast round `bollard`, the line coming ashore from `shipName`
   * (harbors P6). The end lies beside the bollard; the quay's `look` reads
   * whose line it is.
   */
  public roundBollard(line: Lifeline, bollard: Stuff, shipName: string): void {
    this._line = line;
    this._lashedTo = bollard;
    this._roundBollard = bollard;
    if (shipName) {
      this.setShortDescription(`line from ${shipName}`);
      // ⚠ Never her bare name (harbors drive run 5): the way aboard is named
      // for her, and a line end answering to `hesper` took `go hesper` the
      // moment the player had just looked at it (attention breaks the tie).
      // Her name only as the phrase a player says of the line.
      const name = shipName.replace(/^the\s+/i, '').toLowerCase();
      this.setKeywords([...this.getKeywords(), `${name} line`, `${name}'s line`]);
      this.setLongDescription(
        `A mooring line comes ashore from ${shipName}, made fast round ${bollard.getPresentation()} with a round turn and two half hitches.`,
      );
    }
  }

  /** The bollard it is made fast round, or `null`. */
  public getRoundBollard(): Stuff | null {
    const b = this._roundBollard;
    return b !== null && !b.isDestroyed() ? b : null;
  }

  /**
   * ⭐ Lifted off the bollard — taken up, or carried away: the line is off,
   * and the ship it held is told (harbors P6).
   */
  public onMoved(_from: (Stuff & Container) | null, to: (Stuff & Container) | null): void {
    const bollard = this._roundBollard;
    if (bollard === null) return;
    const shore = MixinApi.isContainable(bollard) ? bollard.getContainer() : null;
    if (to !== null && to === shore) return;
    this._roundBollard = null;
    this._lashedTo = null;
    // ⚠ Gone with the quay (a room reaped, the line brought in from aboard)
    // is not somebody lifting it: the ship keeps her mooring and makes fast
    // again when the quay is next used.
    if (to === null) return;
    const line = this.getLine();
    if (line === null) return;
    if (to.isAgent?.()) {
      try {
        MessageApi.scene(to)
          .topic('act.deed')
          .toSelf(Mml.compose`You lift the line off ${Mml.thing(bollard)}, and let it go; it falls slack into the water along her side.`)
          .send();
      } catch {
        // decoration
      }
    }
    void line.endLifted();
  }

  public getLine(): Lifeline | null {
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
   * Whoever has the end in hand — or the thing it is lashed to, while
   * the end lies beside it — or null.
   */
  public getHolder(): Stuff | null {
    const at = this.getContainer() as Stuff | null;
    if (at !== null && at.isAgent?.()) return at;
    const load = this._lashedTo;
    if (load === null || load.isDestroyed()) return null;
    return MixinApi.isContainable(load) && load.getContainer() === at ? load : null;
  }

  /** The thing this end is lashed to, if any (not a person). */
  public getLashedTo(): Stuff | null {
    return this.getHolder() === this._lashedTo ? this._lashedTo : null;
  }

  /**
   * ⭐ Make the end fast to `load`, here beside you: the end leaves your
   * hands and whoever holds the line can haul the load up on it.
   */
  public lashTo(by: Stuff, load: Stuff): LineOutcome {
    if (this.getLine() === null) return { ok: false, reason: 'no-line', line: 'The end is not fast to anything.' };
    if (this.getContainer() !== by) return { ok: false, reason: 'not-holding', line: 'You are not holding the end.' };
    if (load === by || load.isAgent?.() || !MixinApi.isContainable(load)) {
      return { ok: false, reason: 'not-a-load', line: 'You cannot lash the line to that.' };
    }
    const place = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (place === null || load.getContainer() !== place) {
      return { ok: false, reason: 'out-of-reach', line: `${load.getPresentation()} is not here.` };
    }
    ContainmentApi.move(this, place as Stuff & Container);
    this._lashedTo = load;
    return { ok: true, line: `You make the end of the line fast to ${load.getPresentation()}.` };
  }

  /** Keep the end with the load it is lashed to (the haul moves both). */
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
