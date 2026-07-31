/**
 * SandboxCrossingExit — the wardrobe passage (docs/subsystems/sandbox.md,
 * Decision H): "a door is just an exit," kept literal. An `Exit`
 * subclass whose `applyTraversal` override runs the wire-body crossing
 * instead of a containment move — nothing material ever traverses.
 *
 * Two directions:
 *   - **`enter`** (the field-side door a Wardrobe fixture installs):
 *     `canTraverse` performs the DOOR GATE (the mover's own circle is
 *     always theirs — the self-home rule; a fixture linked to someone
 *     else's circle admits its host; guest grants ride the parcel grant
 *     surface); `applyTraversal` → `SandboxApi.enter`.
 *   - **`return`** (the in-circle way out, minted by `SandboxLogic`
 *     beside the entry room): `applyTraversal` → `SandboxApi.exit` —
 *     the parked field body never moved, so there is no destination to
 *     resolve; you simply wake up where you left.
 *
 * The target circle resolves LIVE through the carrying Wardrobe
 * (within-session ref, Pattern B — re-minted with the exit on every
 * placement): an unlinked wardrobe links on first enter.
 */

import Exit, { type TraversalGuard } from '../boundary/Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import { ContainmentError } from '../../api/containment';
import { SandboxApi } from '../../api/sandbox';
import { ParcelApi } from '../../api/parcel';
import { PlayerApi } from '../../api/player';
import type Avatar from '../../obj/Avatar';
import type Wardrobe from './Wardrobe';

export default class SandboxCrossingExit extends Exit {
  /** Which way this passage runs. */
  private crossingDirection: 'enter' | 'return' = 'enter';

  /** The carrying fixture (enter direction only; live within-session). */
  private wardrobe: Wardrobe | null = null;

  public getCrossingDirection(): 'enter' | 'return' {
    return this.crossingDirection;
  }

  public setCrossingDirection(value: 'enter' | 'return'): void {
    this.crossingDirection = value;
  }

  public getWardrobe(): Wardrobe | null {
    return this.wardrobe;
  }

  public setWardrobe(value: Wardrobe | null): void {
    this.wardrobe = value;
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
    return { ok: true };
  }

  /**
   * The crossing itself — Decision H's whole point — plus the async
   * authority gate: your own circle is always yours (unlinked fixtures
   * link on first enter — `Wardrobe.linkForEnterer`); someone else's
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
    const linked = this.wardrobe?.getLinkedSandboxPath() ?? '';
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
          'This wardrobe opens onto a circle that is not yours.'
        );
      }
    }
    const scope = this.wardrobe
      ? this.wardrobe.linkForEnterer(avatar)
      : `/home/${playerId}`;
    await SandboxApi.enter(avatar, scope);
    return true;
  }
}
