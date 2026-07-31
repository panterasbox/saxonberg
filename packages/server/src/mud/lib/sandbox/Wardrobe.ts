/**
 * Wardrobe — the sandbox's player door (docs/subsystems/sandbox.md):
 * a placeable, ownable fixture whose presence in a room installs the
 * crossing passage. Content over the boundary substrate — the only
 * sandbox-specific machinery is the `SandboxCrossingExit` it carries.
 * Skins (wardrobe / turbolift / mirror / drafting table) are sibling
 * templates differing only in `Visible`/`Detailed` data.
 *
 * A `Thing`-tier fixture (Chattel identity rides the Thing base), with
 * one persistent field:
 *
 *   - `linkedSandboxPath` (Pattern A path string; `''` = unlinked): the
 *     circle this door opens onto. An unlinked wardrobe links on first
 *     enter to that enterer's own circle (`/home/<playerId>`) — the
 *     authoring ladder, literally: clone one, place it, step in.
 *
 * Lifecycle:
 *   - **Move** — nothing to configure: `onMoved` re-seats the passage
 *     exit into the new room (the door is wherever the fixture is).
 *   - **Sell empty** — clearing the link (`clearLink`) hands the buyer
 *     a fresh-linking fixture (their first entry links their circle).
 *   - **Sell furnished** — keep the link; the circle's parcel title
 *     transfers via the shipped `ParcelApi.transfer`.
 *   - **Destroy** — `onDestruct` reaps any wire bodies in the linked
 *     circle's live session (occupants re-attach to parked avatars —
 *     the non-event eviction) and orphans the zone (re-bindable; any
 *     new fixture may carry the same path — doors are concurrent).
 */

import Thing from '../stuff/Thing';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { SandboxApi } from '../../api/sandbox';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type Avatar from '../../obj/Avatar';
import SandboxCrossingExit from './SandboxCrossingExit';

/** The passage's direction label in a room's exit list. */
const PASSAGE_DIRECTION = 'wardrobe';

export default class Wardrobe extends Thing {
  static persistentFields: string[] = ['linkedSandboxPath'];

  /**
   * The circle this door opens onto (Pattern A path string; empty =
   * unlinked, links on first enter). @runtimeState persisted.
   */
  protected linkedSandboxPath: string = '';

  /** The installed passage exit (runtime-only; re-minted per placement). */
  private passage: SandboxCrossingExit | null = null;

  public getLinkedSandboxPath(): string {
    return this.linkedSandboxPath;
  }

  public setLinkedSandboxPath(value: string): void {
    this.linkedSandboxPath = value;
  }

  /** Sell-empty seam: clear the link so the buyer's first entry re-links. */
  public clearLink(): void {
    this.linkedSandboxPath = '';
  }

  /**
   * Resolve (and if unlinked, ESTABLISH) the circle scope for an
   * enterer — first enter links the door to that person's own circle.
   */
  public linkForEnterer(avatar: Avatar): string {
    if (this.linkedSandboxPath === '') {
      this.linkedSandboxPath = `/home/${avatar.getPlayerId()}`;
    }
    return this.linkedSandboxPath;
  }

  /**
   * Containment witness — the door is wherever the fixture is: tear
   * the passage out of the old room, install it into the new one
   * (when the new host is an Exitable room).
   */
  public onMoved(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    this.teardownPassage(from);
    if (to && MixinApi.isExitable(to)) {
      // Constructor-form identity (the same shape addBidirectionalExit
      // builds with): `bind()` is participant-gated to Exitable rooms,
      // and the fixture is the installer here.
      const exit = StuffApi.createSync(
        () =>
          new SandboxCrossingExit({
            direction: PASSAGE_DIRECTION,
            source: to,
            // The real destination is the crossing itself; the path is
            // presentation-level only (an unlinked door names the wire).
            destinationPath: this.linkedSandboxPath || '/home',
            oneWay: true,
            messageOut: '{{ mover }} steps into {{ exit }} and is gone.',
          })
      );
      exit.setCrossingDirection('enter');
      exit.setWardrobe(this);
      void to.addExit(exit);
      this.passage = exit;
    }
  }

  /**
   * Destroy: reap any wire bodies in the linked circle's live session
   * (safe — occupants re-attach at their parked avatars), orphan the
   * zone (dormancy → eviction picks it up; the circle re-binds when
   * any new fixture links its path), and remove the passage.
   */
  public override onDestruct(): void {
    const linked = this.linkedSandboxPath;
    if (linked) {
      const session = SandboxApi.sessionForScope(linked);
      if (session) {
        // Fire-and-forget (onDestruct is synchronous); closeSession
        // exits every occupant then discards.
        void SandboxApi.closeSession(linked).catch((err) =>
          console.error('[sandbox] wardrobe-destroy reap failed:', err)
        );
      }
    }
    this.teardownPassage(this.getContainer());
    super.onDestruct();
  }

  private teardownPassage(room: (Stuff & Container) | null): void {
    if (!this.passage) return;
    if (room && MixinApi.isExitable(room)) {
      room.removeExit(PASSAGE_DIRECTION);
    }
    if (!this.passage.isDestroyed()) {
      try {
        StuffApi.destruct(this.passage as unknown as Stuff);
      } catch {
        // best-effort teardown; the exit is unreachable once removed
      }
    }
    this.passage = null;
  }
}
