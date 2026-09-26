/**
 * SandboxCrossing — the sandbox's player door
 * (docs/subsystems/sandbox.md): a placeable, ownable fixture whose
 * presence in a room installs the crossing passage. Content over the
 * boundary substrate — the only sandbox-specific machinery is the
 * `SandboxCrossingExit` it carries.
 *
 * The class is the MECHANISM; a wardrobe is one skin of it. Skins are
 * sibling TEMPLATES differing only in data — the shipped one is
 * `/platform/thing/sandbox/wardrobe`, and a turbolift, a mirror or a drafting
 * table are new template rows, not new classes. That is why nothing
 * skin-specific may live here: `passageDirection` is a field for
 * exactly this reason, so a turbolift installs an exit called
 * "turbolift" rather than one called "wardrobe".
 *
 * A `Thing`-tier fixture (Chattel identity rides the Thing base), with
 * one persistent field:
 *
 *   - `linkedSandboxPath` (identity ref, a path string; `''` = unlinked): the
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

import { PostRegistrationMixin } from '../../../lib/stuff/PostRegistration';
import Thing from '../../../lib/stuff/Thing';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { TemplatePaths } from '../../../lib/paths';
import { ChattelApi } from '../../../api/chattel';
import { SandboxApi } from '../../../api/sandbox';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type Avatar from '../../agent/Avatar';
import SandboxCrossingExit from '../../../lib/sandbox/SandboxCrossingExit';
import type { FieldMeta } from '../../../lib/mixin';
import type { Chattel } from '../../../lib/chattel/Chattel';

/** Fallback exit label when a skin declares none. */
const DEFAULT_PASSAGE_DIRECTION = 'crossing';

/**
 * ⭐ `PostRegistrationMixin` for one reason: the crossing's passage exit
 * is a clone of a row now, and a clone is async while `onMoved` is not.
 */
const SandboxCrossingBase = PostRegistrationMixin(Thing);

export default class SandboxCrossing extends SandboxCrossingBase {
  static fieldMeta: FieldMeta = {
    linkedSandboxPath: { persistent: true, runtimeState: true },
    passageDirection: { persistent: true },
  };

  /**
   * The circle this door opens onto (identity ref, a path string; empty =
   * unlinked, links on first enter). persisted.
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

  /**
   * The crossing's own passage exit — a clone of
   * `/platform/idea/exits/sandbox-crossing`, minted once at
   * `postRegister` and rebound into each room the fixture lands in.
   * Runtime-only.
   */
  private passage: SandboxCrossingExit | null = null;

  /** Mint the passage exit. See {@link onMoved}. */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    this.passage ??= await StuffApi.clone<SandboxCrossingExit>(
      TemplatePaths.sandboxCrossingExit,
    );
    // Already placed (the fixture was moved before it registered): wire
    // the passage into where it is.
    const env = this.getContainer() as (Stuff & Container) | null;
    if (env) this.onMoved(null, env);
  }

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
    const owner = await (this as unknown as Stuff & Chattel)
      .chattelOwner()
      .catch(
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
      // ⭐ ONE exit, minted at `postRegister` and REBOUND — the same
      // shape a vessel's `in`/`out` pair uses, and for the same reason:
      // this exit MOVES WITH ITS HOST. The fixture is carried from room
      // to room and its doorway goes along.
      //
      // ⚠ It was going to be a fresh clone per placement, which made
      // this sync witness async and left `this.passage` unset for a
      // tick — six sandbox tests read it immediately and found
      // `undefined`. Pre-minting keeps the witness honest.
      const exit = this.passage;
      if (!exit) return;
      // ⚠ The ROOM installs, not the fixture: `bind` is gated on the
      // caller being party to the edge, and a crossing is a Thing, not
      // an Exitable. Binding it from here was refused outright.
      void to.installExit<SandboxCrossingExit>(
        exit,
        {
          direction: this.getPassageDirection(),
          source: to,
          // The real destination is the crossing itself; the path is
          // presentation-level only (an unlinked door names the wire).
          destinationPath: this.linkedSandboxPath || '/home',
          oneWay: true,
          messageOut: '{{ mover }} steps into {{ exit }} and is gone.',
        },
        (e) => {
          e.setCrossingDirection('enter');
          e.setCrossing(this);
        },
      );
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
    // ⭐ The exit SURVIVES the move. It is this crossing's own passage,
    // minted once at `postRegister` and rebound into each room the
    // fixture lands in — the same lifecycle a vessel's `in`/`out` pair
    // has, and the reason `Exit.rebind` exists.
    //
    // ⚠ It used to be destructed here and re-minted by the next
    // placement, which is impossible now: a clone is async and this
    // runs inside a sync containment witness. (Destructing it also
    // meant the FIRST move — from nowhere into a room — threw the
    // freshly-minted passage away before it was ever installed.)
    // The crossing's own destruct still takes it: the exit is
    // `{ ref: 'instance' }` on a field the destruct cascade walks.
  }
}
