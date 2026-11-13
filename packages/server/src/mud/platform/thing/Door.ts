/**
 * Door — a way's boundary with a BOLT: a door, a gate, a hatch, a grating,
 * a gangway. ("Door" is this project's generic word for a barred closure —
 * the exits-map key is `door:`.)
 *
 * ⭐ One door, two sides (boundary build, 2026-11): each place's exit is a
 * side of it, so it is shut, locked and named the same from both. The lock
 * is the door's; a key that fits it opens it from either side — except the
 * side named by {@link Door.freeFrom}, which opens with no key (a thumb-turn
 * inside, a keyhole out: a guest let into a house is never trapped in it).
 *
 * Composition: `LockableMixin(platform Boundary)` — the twin's `Sealable`
 * plus the bolt. What it passes is its row's channel table (all open, all
 * shut by default); a door on a weight ({@link Door.closesBehind}) also
 * lets a body through while shut, if it is not locked.
 *
 * Wired transitively when an exit declares `door:` — each side that
 * authors it attaches to the one row singleton (`Exitable._applyExitSpec`).
 * A door made by code (a holding's keyed door, a ship's gangway) is minted
 * and owned by the code that made it.
 */

import Boundary from './Boundary';
import { LockableMixin } from '../../lib/boundary/Lockable';
import type { FieldMeta } from '../../lib/mixin';
import type { VetoResult } from '../../lib/errors';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryChannel, BoundarySide } from '../../lib/boundary/Conduit';
import { MixinApi } from '../../api/mixin';

const DoorBase = LockableMixin(Boundary);

export default class Door extends DoorBase {
  static fieldMeta: FieldMeta = {
    closesBehind: { persistent: true, authorable: true },
    freeFrom: { ref: 'identity:relation', persistent: true, authorable: true },
  };

  /**
   * ⭐ **A door that swings shut behind you** — a workshop's door on a
   * weight. Shut, it still lets anybody through who may pass (a locked one
   * still refuses), and it is shut again after them: the room keeps its
   * heat, and nobody has to remember to close it. The potter's shop needed
   * exactly this (the ceramics browser walk): two open doorways cost more
   * heat than any stove gives, and green ware froze on the boards of a
   * shop whose prose said it was warm. An authored flag, so a second
   * workshop is a row, not code.
   */
  public closesBehind = false;

  /** See {@link Door.closesBehind}. */
  public override swingsShut(): boolean {
    return this.closesBehind;
  }

  public setClosesBehind(value: boolean): void {
    this.closesBehind = value === true;
  }

  /**
   * ⭐ **The side that opens with no key** — the identity path of the PLACE
   * on that side (`''` = keyed from both sides, as every authored door was
   * before 2026-11). A holding's doors are free from inside, so a guest let
   * in is never trapped and leaving your own house needs no key; the code
   * that mints them sets it. Owner's call, 2026-11-09.
   */
  public freeFrom = '';

  public getFreeFrom(): string {
    return this.freeFrom;
  }

  public setFreeFrom(path: string | null): void {
    if (path !== null && typeof path !== 'string') {
      throw new TypeError(`Door.freeFrom must be a place's path, got ${typeof path}`);
    }
    this.freeFrom = path ?? '';
  }

  /**
   * The key fits — or the mover stands on the free side. ⭐ The free side is
   * read off where the mover IS (its container's identity path), never off
   * which exit it asked: both sides are one door.
   */
  public override opensFor(mover: Stuff): boolean {
    if (this.freeFrom !== '' && MixinApi.isContainable(mover)) {
      const here = mover.getContainer() as Stuff | null;
      if (here && here.getIdentityPath() === this.freeFrom) return true;
    }
    return super.opensFor(mover);
  }

  /**
   * ⭐⭐⭐ **The one word a room's exit listing uses for this door's
   * state** — and it said `closed` about a LOCKED door until a lens pass
   * caught it.
   *
   * Both exit listings (`LookController`, `SenseController`) rendered
   * `(university gate, closed)` for the realm's one locked gate, so the
   * bolt was **invisible until you walked into it**. That is an
   * immersion betrayal of exactly the documented kind — the fiction
   * asserts a locked door and the prose does not back it — and it is a
   * governance one too: a refusal you cannot see coming has no appeal.
   *
   * ⚠⚠ **It also existed TWICE**, as the same four lines in two
   * controllers, which is why it is a method here rather than a fix in
   * two places: *two copies of one sentence* drift, and the test beside
   * this asserts the two renderings are equal.
   *
   * ⭐ `locked` wins over `open`/`closed` because the gates rank the
   * same way — `Exit.canTraverse` refuses a locked door BEFORE it
   * refuses a shut one, so a door that is somehow both reports the
   * answer a player would actually meet.
   *
   * ⚠ Not viewer-aware, deliberately: a thrown bolt is a physical fact
   * anybody standing there can see. What a viewer may NOT know is
   * whether their key fits it, and that stays a question only the act
   * answers.
   */
  /**
   * ⭐ A locked door does not open (water-supply D12): until this hook, `open`
   * on a locked door swung it wide and only the traverse refused — a locked
   * chest opened outright. Unlock it first; the bolt is the gate.
   */
  public override canOpen(_by: Stuff): VetoResult {
    if (this.isLocked()) return { ok: false, reason: "It's locked." };
    return { ok: true };
  }

  public override stateWord(): 'locked' | 'open' | 'closed' {
    if (this.isLocked()) return 'locked';
    return this.isOpen() ? 'open' : 'closed';
  }

  /**
   * ⭐ A door on a weight (or a latch) lets a body through while shut — and
   * is shut again after them (`closesBehind`). ⚠ The bolt is NOT read here:
   * `Exit.canTraverse` asks the lock first and refuses whoever it does not
   * open for, so a key-holder walks through their own latched front door
   * and a stranger is refused at it — exactly the keyed ways' old rule.
   */
  public override transmissivity(
    channel: BoundaryChannel,
    from: BoundarySide,
    to: BoundarySide,
  ): number {
    if (channel === 'movement' && !this.isOpen() && this.closesBehind) {
      return 1;
    }
    return super.transmissivity(channel, from, to);
  }
}
