/**
 * BrainMoves — ⭐ how a brain moves its body (B107): one step, a walk to a
 * place, and whether the brain knows a place at all. Bound into every
 * `BrainContext` (`go` · `goTo` · `knows`) by the two builders —
 * `BehavedMixin`'s and combat's — so a brain never chooses how.
 *
 * ⭐ A brain is its body's PLAYER: a host that gives commands walks by the
 * `go` verb, exactly as a player does (`executeCommand` — walking is its
 * own act); a host with no verbs (a beast) crosses by the traversal,
 * because an animal has nothing to type.
 *
 * ⭐ A walk is PLANNED, never authored: the kernel router
 * (`NavigationApi.routeBetween`, on foot) within what the row says the
 * brain knows — `knows:`, an extent prefix (absent: the world). It
 * replaced the authored `ways:` lists and `Mobile.walkRoute` (R2-D8's
 * hoist of five brains' copies): moving a kiln or adding a door rewrote
 * every list that crossed it, a room no list named was one the worker
 * silently never visited, and a second venue had to author its own.
 * ⚠ Blocked means blocked: a step that does not land stops the walk where
 * it stands, and the next beat tries again.
 */
import type { Stuff } from '../stuff/Stuff';
import type { BrainContext } from './brain';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';
import { LocomotionApi } from '../../api/locomotion';

/**
 * How many places a brain's walk may search — a PERFORMANCE bound, never a
 * knowledge one (the row's `knows:` is that). Unattended, so it is not the
 * `navigation.attendedSearchBudget` dial; it was `consigns`' own, which
 * walks cross-district.
 */
const WALK_SEARCH_BUDGET = 150;

export class BrainMoves {
  private readonly extent: string | null;

  constructor(
    private readonly host: Stuff,
    config: Record<string, unknown>,
  ) {
    this.extent = typeof config.knows === 'string' && config.knows !== '' ? config.knows : null;
  }

  /** The three context members, bound to this host. */
  public members(): Pick<BrainContext, 'go' | 'goTo' | 'knows'> {
    return {
      go: (direction) => this.go(direction),
      goTo: (place) => this.goTo(place),
      knows: (place) => this.knows(place),
    };
  }

  /** Does the row say the brain knows the place at `place`? */
  public knows(place: string): boolean {
    return this.extent === null || place.startsWith(this.extent);
  }

  /** One visible step; `true` when it moved. */
  public async go(direction: string): Promise<boolean> {
    const host = this.host;
    if (!MixinApi.isMobile(host) || !MixinApi.isContainable(host)) return false;
    const before = host.getContainer();
    if (before === null) return false;
    if (MixinApi.isCommandGiver(host)) {
      await host.executeCommand(`go ${direction}`);
    } else {
      // A beast: no verbs, so the body's own crossing.
      if (!MixinApi.isExitable(before)) return false;
      const exit = before.getExits().get(direction);
      if (!exit) return false;
      await LocomotionApi.traverseWithDefault(host, exit);
    }
    return host.getContainer() !== before;
  }

  /** Walk to `place` over a planned route; `true` once it stands there. */
  public async goTo(place: string): Promise<boolean> {
    const here = this.placeOf();
    if (here === '') return false;
    if (here === place) return true;
    if (!this.knows(place)) return false;
    const outcome = await NavigationApi.routeBetween(
      here,
      place,
      { mode: 'walk', medium: 'ground' },
      this.extent === null ? {} : { extent: this.extent },
      WALK_SEARCH_BUDGET,
    );
    const plan = outcome.ok ? outcome.plans[0] : undefined;
    if (!plan) return false;
    for (const leg of plan.legs) {
      // ⚠ The plan is a hypothesis; the ground has the last word.
      if (!(await this.go(leg.dir)) || this.placeOf() !== leg.to) return false;
    }
    return this.placeOf() === place;
  }

  private placeOf(): string {
    return MixinApi.isContainable(this.host)
      ? (this.host.getContainer()?.getTemplatePath() ?? '')
      : '';
  }
}
