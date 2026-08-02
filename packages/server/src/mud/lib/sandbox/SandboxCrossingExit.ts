/**
 * SandboxCrossingExit — the crossing passage (docs/subsystems/sandbox.md,
 * Decision H): "a door is just an exit," kept literal. An `Exit`
 * subclass whose `applyTraversal` override runs the wire-body crossing
 * instead of a containment move — nothing material ever traverses.
 *
 * Two directions:
 *   - **`enter`** (the field-side door a SandboxCrossing installs):
 *     `canTraverse` performs the DOOR GATE (the mover's own circle is
 *     always theirs — the self-home rule; a fixture linked to someone
 *     else's circle admits its host; guest grants ride the parcel grant
 *     surface); `applyTraversal` → `SandboxApi.enter`.
 *   - **`return`** (the in-circle way out, minted by `SandboxLogic`
 *     beside the entry room): `applyTraversal` → `SandboxApi.exit` —
 *     the parked field body never moved, so there is no destination to
 *     resolve; you simply wake up where you left.
 *
 * The target circle resolves LIVE through the carrying fixture
 * (within-session instance ref — re-minted with the exit on every
 * placement): an unlinked, unowned door opens onto whoever enters.
 */

import Exit, { type TraversalGuard } from '../boundary/Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import { ContainmentError } from '../../api/containment';
import { SandboxApi } from '../../api/sandbox';
import { ParcelApi } from '../../api/parcel';
import { PlayerApi } from '../../api/player';
import type Avatar from '../../obj/Avatar';
import type SandboxCrossing from './SandboxCrossing';

export default class SandboxCrossingExit extends Exit {
  /** Which way this passage runs. */
  private crossingDirection: 'enter' | 'return' = 'enter';

  /** The carrying fixture (enter direction only; live within-session). */
  private crossing: SandboxCrossing | null = null;

  /**
   * A crossing has NO spatial destination — that is Decision H's whole
   * point: the body never moves, so there is nowhere for a traversal to
   * resolve to. The `destinationPath` the fixture stamps
   * (`/home/<id>`, or bare `/home` while unlinked) is *presentation*:
   * it names the wire in the exit listing. It is not a room.
   *
   * Anything that walks the exit graph structurally rather than
   * traversing it — the vision flux walk, and by the same shape sound,
   * pathfinding, `reachable` — must therefore skip this exit. Left
   * unmarked, the light walk followed `/home` and landed on the
   * HomeZone *Idea*, whose `getContents` does not exist: one lamp in
   * the wire alcove and `look` threw for everyone standing in it
   * (found live — the light was the first consumer to actually follow
   * an exit out of that room).
   *
   * `getObviousExits` still lists it, because a player must be able to
   * SEE the crossing passage; this predicate is the seam a structural
   * walker checks instead of assuming every listed exit leads to a
   * room.
   */
  public override hasSpatialDestination(): boolean {
    return false;
  }

  public getCrossingDirection(): 'enter' | 'return' {
    return this.crossingDirection;
  }

  public setCrossingDirection(value: 'enter' | 'return'): void {
    this.crossingDirection = value;
  }

  public getCrossing(): SandboxCrossing | null {
    return this.crossing;
  }

  public setCrossing(value: SandboxCrossing | null): void {
    this.crossing = value;
  }

  /**
   * The sync half of the door gate: person-shape checks (an
   * implant-less thing or a throwaway guest cannot cross). The
   * async authority gate (owner / use-grant) runs in
   * `applyTraversal`, where awaiting the registry is possible;
   * refusals there ride the ordinary ContainmentError prose path.
   */
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string
  ): TraversalGuard {
    const base = super.canTraverse(mover, mode);
    if (!base.ok) return base;
    if (this.crossingDirection === 'return') return { ok: true };
    if (!PlayerApi.isAvatarStuff(mover)) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'Only a person with an implant can step onto the wire.',
      };
    }
    if (!(mover as unknown as Avatar).getPlayerId()) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'A guest cannot cross onto the wire.',
      };
    }
    // Already inside? Refuse HERE, in the door's own prose, rather than
    // letting `SandboxApi.enter` throw its guard up through the
    // dispatcher as "Something went wrong in GoController". Cloning a
    // crossing inside your own circle and walking into it is the
    // obvious thing to try — the recursion is correctly refused either
    // way, but a player should meet a closed door, not a stack trace.
    if (
      SandboxApi.liveSessionForPlayer(
        (mover as unknown as Avatar).getPlayerId()
      ) !== null
    ) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'You are already on the wire; this door goes nowhere new.',
      };
    }
    return { ok: true };
  }

  /**
   * The crossing itself — Decision H's whole point — plus the async
   * authority gate: your own circle is always yours (unlinked fixtures
   * link on first enter — `SandboxCrossing.linkForEnterer`); someone else's
   * circle admits its title holder and use-grant holders
   * (`ParcelApi.hasUseGrant`, the shipped lease surface).
   */
  public override async applyTraversal(
    mover: Stuff & Containable
  ): Promise<boolean> {
    if (this.crossingDirection === 'return') {
      await SandboxApi.exit(mover as unknown as Avatar);
      return true;
    }
    const avatar = mover as unknown as Avatar;
    const playerId = avatar.getPlayerId();
    // An UNOWNED fixture never links (a public booth opens onto each
    // enterer's own circle); an owned one is gated below.
    const linked = this.crossing
      ? (await this.crossing.ownerPlayerId()) === null
        ? ''
        : this.crossing.getLinkedSandboxPath()
      : '';
    const own = linked === '' || linked === `/home/${playerId}`;
    if (!own) {
      const moverPath = mover.getTemplatePath() ?? '';
      const owner = ParcelApi.selfHomeOwnerOf(linked);
      const isOwner =
        owner?.kind === 'player' && owner.templatePath === moverPath;
      const hasGrant =
        !isOwner && (await ParcelApi.hasUseGrant(linked, moverPath));
      if (!isOwner && !hasGrant) {
        throw new ContainmentError(
          'This door opens onto a circle that is not yours.'
        );
      }
    }
    const scope = this.crossing
      ? await this.crossing.linkForEnterer(avatar)
      : `/home/${playerId}`;
    await SandboxApi.enter(avatar, scope);
    return true;
  }
}
