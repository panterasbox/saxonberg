/**
 * SandboxCrossing — the sandbox's player door
 * (docs/subsystems/sandbox.md): a placeable, ownable fixture whose
 * presence in a room installs the crossing passage. Content over the
 * boundary substrate — the only sandbox-specific machinery is the
 * `SandboxCrossingExit` it carries.
 *
 * The class is the MECHANISM; a wardrobe is one skin of it. Skins are
 * sibling TEMPLATES differing only in data — the shipped one is
 * `/obj/sandbox/wardrobe`, and a turbolift, a mirror or a drafting
 * table are new template rows, not new classes. That is why nothing
 * skin-specific may live here: `passageDirection` is a field for
 * exactly this reason, so a turbolift installs an exit called
 * "turbolift" rather than one called "wardrobe".
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
import { ChattelApi } from '../../api/chattel';
import { SandboxApi } from '../../api/sandbox';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type Avatar from '../../obj/Avatar';
import SandboxCrossingExit from './SandboxCrossingExit';

/** Fallback exit label when a skin declares none. */
const DEFAULT_PASSAGE_DIRECTION = 'crossing';

export default class SandboxCrossing extends Thing {
  static persistentFields: string[] = [
    'linkedSandboxPath',
    'passageDirection',
  ];

  /**
   * The circle this door opens onto (Pattern A path string; empty =
   * unlinked, links on first enter). @runtimeState persisted.
   */
  protected linkedSandboxPath: string = '';

  /**
   * The exit label this fixture installs. Skin-specific data, not a
   * constant: the wardrobe template says `wardrobe`, a turbolift says
   * `turbolift`, and the player types what they see.
   */
  protected passageDirection: string = DEFAULT_PASSAGE_DIRECTION;

  public getPassageDirection(): string {
    return this.passageDirection || DEFAULT_PASSAGE_DIRECTION;
  }

  public setPassageDirection(value: string): void {
    this.passageDirection = value;
  }

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
   * Resolve the circle scope this door opens onto for `avatar`, linking
   * the fixture if this is the first entry through an OWNED one.
   *
   * Two shapes, and the difference is ownership:
   *
   *   - **Owned** (chattel-stamped — someone bought or crafted it): the
   *     first entry links the door to its OWNER's circle, permanently.
   *     That is what makes "sell empty" work (the buyer's first entry
   *     links *their* circle) and it is why a guest walking into your
   *     hall can't re-point your wardrobe at their own space by getting
   *     there first.
   *   - **Unowned** (a fixture standing in a commons — the wire alcove,
   *     a library, a campus nook): it NEVER links. Every enterer goes
   *     to their own circle. A public wardrobe is a phone booth, not a
   *     claim: character creation is already the grant
   *     (`selfHomeOwnerOf`), so the honest behavior for a door nobody
   *     owns is "this opens onto yours."
   */
  public async linkForEnterer(avatar: Avatar): Promise<string> {
    if (this.linkedSandboxPath !== '') return this.linkedSandboxPath;
    const ownerId = await this.ownerPlayerId();
    if (ownerId === null) {
      // Public booth: no link, no claim — your own circle.
      return `/home/${avatar.getPlayerId()}`;
    }
    this.linkedSandboxPath = `/home/${ownerId}`;
    return this.linkedSandboxPath;
  }

  /**
   * The playerId of this fixture's chattel owner, or `null` when the
   * fixture is unowned (never stamped — a commons fixture).
   */
  public async ownerPlayerId(): Promise<string | null> {
    if (!this.getChattelId()) return null;
    const owner = await ChattelApi.ownerOf(this as unknown as Stuff).catch(
      () => null
    );
    if (owner?.kind !== 'player') return null;
    return owner.templatePath.split('/').filter(Boolean).pop() ?? null;
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
            direction: this.getPassageDirection(),
            source: to,
            // The real destination is the crossing itself; the path is
            // presentation-level only (an unlinked door names the wire).
            destinationPath: this.linkedSandboxPath || '/home',
            oneWay: true,
            messageOut: '{{ mover }} steps into {{ exit }} and is gone.',
          })
      );
      exit.setCrossingDirection('enter');
      exit.setCrossing(this);
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
          console.error('[sandbox] crossing-destroy reap failed:', err)
        );
      }
    }
    this.teardownPassage(this.getContainer());
    super.onDestruct();
  }

  private teardownPassage(room: (Stuff & Container) | null): void {
    if (!this.passage) return;
    if (room && MixinApi.isExitable(room)) {
      room.removeExit(this.getPassageDirection());
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
