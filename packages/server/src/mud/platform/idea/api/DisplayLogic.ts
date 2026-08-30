// DisplayLogic — the hot-reloadable logic singleton behind DisplayApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Display, DisplaySource } from '../../../lib/display/Display';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import Location from '../../../lib/stuff/Location';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { CardApi } from '../../../api/card';
import { MqlApi } from '../../../api/mql';
import { PerceptionApi } from '../../../api/perception';
import { EmploymentApi } from '../../../api/employment';
import type { WatchTarget } from '@saxonberg/types';

const DisplayApiCallers = SecurityPolicies.FromModule('/api/display#DisplayApi');

/** The per-viewer focal-embed key the `watch` verb writes. */
const WATCH_KEY = 'cockpit.watch';

export type DisplayStuff = Stuff & Display;

/** How the driver reached the display — by hand (in reach) or by mind. */
export type DriveMode = 'hand' | 'mind';

export interface ResolvedDisplay {
  display: DisplayStuff;
  mode: DriveMode;
}

/**
 * DisplayLogic — the hot-reloadable logic singleton behind {@link DisplayApi}.
 *
 * Lives at `/platform/idea/api/display`. Stateless: what a screen shows
 * lives on the screen (`DisplayMixin._showing`); which viewers see it is
 * derived on every projection from the world (same room + perceives).
 *
 * **The projection rule** — *the display you can see shows X*: a stream
 * source writes every perceiving viewer's `cockpit.watch` (the same key
 * the personal `watch` verb writes, plus a `display` marker); a card
 * source is `CardApi.push`ed to every perceiving Interactive. No new wire
 * message — the onlooker's card is a fact the server pushes, never one
 * the client infers.
 *
 * @internal
 */
@Unshadowable
export class DisplayLogic extends ApiLogic {
  /** See {@link DisplayApi.mayDrive}. */
  @CallSecurity(DisplayApiCallers)
  public mayDrive(actor: Stuff, display: DisplayStuff): Promise<boolean> {
    return this.mayDriveImpl(actor, display);
  }

  // No intra-singleton self-calls through the gate: the public faces
  // forward to these impls.
  private async mayDriveImpl(actor: Stuff, display: DisplayStuff): Promise<boolean> {
    switch (display.getPairing()) {
      case 'held':
        return this.carries(actor, display);
      case 'remote': {
        const remotePath = display.getRemote();
        if (!remotePath) return false;
        return this.carriedByTemplate(actor, remotePath);
      }
      case 'staff': {
        const principal = display.getPrincipal();
        const business = principal ? StuffApi.findByTemplatePath(principal) : null;
        if (!business || !MixinApi.isOrganization(business)) return false;
        if (EmploymentApi.holdsPosition(actor, business)) return true;
        return EmploymentApi.isProprietorOf(actor, business);
      }
      case 'open':
        return PerceptionApi.canReach(actor, display);
    }
  }

  /**
   * See {@link DisplayApi.resolveFor}.
   *
   * ⭐ The ladder is ordered by REACH, and so is its cost: rung 1 walks
   * the actor's own inventory, rung 2 the actor's room, and only rung 3
   * — driving a screen in another room, which requires an attuned mind —
   * looks at the world at all. The local rungs answer almost every call.
   */
  @CallSecurity(DisplayApiCallers)
  public async resolveFor(actor: Stuff): Promise<ResolvedDisplay | null> {
    // 1. Held — a screen in your hand is yours to drive, whatever its
    //    pairing: the thief with the house tablet READS the sheet (the
    //    screen shows what it shows); the seat is what they lack, and the
    //    seat is checked where money moves, never here.
    for (const d of this.displaysWithin(actor)) {
      return { display: d, mode: 'hand' };
    }
    // 2. Paired and in sight — a screen in the room the actor may drive.
    //    `displaysAround` is already room-scoped, so the old
    //    `roomOf(d) === room` test is the walk's boundary, not a filter.
    for (const d of this.displaysAround(actor)) {
      if (await this.mayDriveImpl(actor, d)) return { display: d, mode: 'hand' };
    }
    // 3. Paired anywhere, by mind — the modem is the driver's attunement.
    //    The ONE global rung, and it is gated on the attunement first so
    //    an ordinary actor never pays for it.
    if (MixinApi.isActive(actor, 'AetherMixin')) {
      for (const d of this.allDisplays()) {
        if (d.getPairing() === 'open') continue;
        if (await this.mayDriveImpl(actor, d)) return { display: d, mode: 'mind' };
      }
    }
    return null;
  }

  /** See {@link DisplayApi.show}. */
  @CallSecurity(DisplayApiCallers)
  public show(display: DisplayStuff, source: DisplaySource): void {
    if (!display.acceptsSource(source)) {
      throw new Error(
        `DisplayApi.show: ${display.getPresentation()} does not show ${source.kind}s`,
      );
    }
    const previous = display.getShowing();
    display._setShowing(source);
    for (const viewer of this.viewersOfImpl(display)) {
      if (previous?.kind === 'stream' && source.kind !== 'stream') {
        this.clearWatch(viewer, display);
      }
      this.project(viewer, display, source);
    }
  }

  /** See {@link DisplayApi.clear}. */
  @CallSecurity(DisplayApiCallers)
  public clear(display: DisplayStuff): void {
    display._setShowing(null);
    for (const viewer of this.viewersOfImpl(display)) this.clearWatch(viewer, display);
  }

  /** See {@link DisplayApi.refresh}. */
  @CallSecurity(DisplayApiCallers)
  public refresh(display: DisplayStuff): void {
    const source = display.getShowing();
    if (!source) return;
    for (const viewer of this.viewersOfImpl(display)) this.project(viewer, display, source);
  }

  /** See {@link DisplayApi.refreshViewer}. */
  @CallSecurity(DisplayApiCallers)
  public refreshViewer(viewer: Stuff): void {
    if (!MixinApi.isHasInteractive(viewer)) return;
    const current = viewer.getClientState<WatchTarget | null>(WATCH_KEY) ?? null;
    const named = current?.display?.stuffId ?? null;
    let stillSeen = false;
    for (const d of this.displaysAround(viewer)) {
      const source = d.getShowing();
      if (!source) continue;
      if (!this.sees(viewer, d)) continue;
      if (d.stuffId === named) stillSeen = true;
      this.project(viewer, d, source);
    }
    // Walked out of the booth: the shared embed leaves the screen with you.
    if (named && !stillSeen) {
      viewer.setClientState(WATCH_KEY, null);
      viewer.pushClientStateUpdate(WATCH_KEY, null);
    }
  }

  /** See {@link DisplayApi.viewersOf}. */
  @CallSecurity(DisplayApiCallers)
  public viewersOf(display: DisplayStuff): (Stuff & HasInteractive)[] {
    return this.viewersOfImpl(display);
  }

  /**
   * Derived from the display's ROOM, not from the connection registry and
   * not from the world: a viewer is a `HasInteractive` Stuff with at
   * least one Interactive attached — the same fact `CardApi.push` needs —
   * in the display's room, perceiving it.
   *
   * ⚠ Room-scoped on purpose. `sees()` already requires the viewer to be
   * in the display's room, so the room's containment subtree is the
   * complete candidate set and a world scan was only ever a slower way to
   * reach the same answer — one paid on every `show`, `clear` and
   * `refresh`. See {@link subtreeOf}.
   */
  private viewersOfImpl(display: DisplayStuff): (Stuff & HasInteractive)[] {
    const room = this.roomOf(display);
    if (!room) return [];
    const out: (Stuff & HasInteractive)[] = [];
    for (const s of this.subtreeOf(room)) {
      if (!MixinApi.isHasInteractive(s)) continue;
      if (s.getInteractives().size === 0) continue;
      if (this.sees(s, display)) out.push(s);
    }
    return out;
  }

  // ---- internals --------------------------------------------------------

  private project(
    viewer: Stuff & HasInteractive,
    display: DisplayStuff,
    source: DisplaySource,
  ): void {
    if (source.kind === 'stream') {
      const target: WatchTarget = {
        ...source.target,
        display: { stuffId: display.stuffId, label: display.getPresentation() },
      };
      viewer.setClientState(WATCH_KEY, target);
      viewer.pushClientStateUpdate(WATCH_KEY, target);
      return;
    }
    for (const interactive of viewer.getInteractives()) {
      CardApi.push(interactive, source.cardId, {
        key: source.key,
        subjectId: source.subjectId,
        prose: source.prose,
        title: display.getPresentation(),
      });
    }
  }

  private clearWatch(viewer: Stuff & HasInteractive, display: DisplayStuff): void {
    const current = viewer.getClientState<WatchTarget | null>(WATCH_KEY) ?? null;
    if (current?.display?.stuffId !== display.stuffId) return;
    viewer.setClientState(WATCH_KEY, null);
    viewer.pushClientStateUpdate(WATCH_KEY, null);
  }

  /** Same room as the display's resting room, and perceives it. */
  private sees(viewer: Stuff, display: DisplayStuff): boolean {
    const room = this.roomOf(display);
    if (!room || this.roomOf(viewer) !== room) return false;
    return PerceptionApi.perceives(viewer, display);
  }

  private roomOf(stuff: Stuff): Stuff | null {
    let cur: Stuff | null = stuff;
    const guard = new Set<string>();
    while (cur && !guard.has(cur.stuffId)) {
      guard.add(cur.stuffId);
      if (cur instanceof Location) return cur;
      cur = MixinApi.isContainable(cur) ? (cur.getContainer() as Stuff | null) : null;
    }
    return null;
  }

  /** Is `item` somewhere inside `actor` (inventory, at any depth)? */
  private carries(actor: Stuff, item: Stuff): boolean {
    let cur: Stuff | null = MixinApi.isContainable(item)
      ? (item.getContainer() as Stuff | null)
      : null;
    const guard = new Set<string>();
    while (cur && !guard.has(cur.stuffId)) {
      if (cur.stuffId === actor.stuffId) return true;
      guard.add(cur.stuffId);
      cur = MixinApi.isContainable(cur) ? (cur.getContainer() as Stuff | null) : null;
    }
    return false;
  }

  private carriedByTemplate(actor: Stuff, templatePath: string): boolean {
    if (!MixinApi.isContainer(actor)) return false;
    const walk = (c: Stuff): boolean => {
      if (!MixinApi.isContainer(c)) return false;
      for (const item of c.getContents()) {
        const s = item as unknown as Stuff;
        if (s.getTemplatePath() === templatePath) return true;
        if (walk(s)) return true;
      }
      return false;
    };
    return walk(actor);
  }

  /**
   * Every Stuff in `host`'s containment subtree, stopping at a nested
   * `Location` (another room's business is its own). The bounded walk the
   * room-scoped reads share — O(room), where the honest alternative was
   * O(world) on the movement path.
   */
  private subtreeOf(host: Stuff): Stuff[] {
    const out: Stuff[] = [];
    const seen = new Set<string>();
    const walk = (h: Stuff): void => {
      if (!MixinApi.isContainer(h)) return;
      for (const item of h.getContents()) {
        const s = item as unknown as Stuff;
        if (s.isDestroyed() || seen.has(s.stuffId)) continue;
        seen.add(s.stuffId);
        out.push(s);
        // A room inside this one keeps its own occupants.
        if (s instanceof Location) continue;
        walk(s);
      }
    };
    walk(host);
    return out;
  }

  /** The displays inside `host` — its inventory, at any depth. */
  private displaysWithin(host: Stuff): DisplayStuff[] {
    return this.subtreeOf(host).filter((s): s is DisplayStuff =>
      MixinApi.isDisplay(s),
    );
  }

  /**
   * The displays `viewer` shares a room with — including one it carries
   * itself (the viewer is in the room, the tablet is in the viewer, so
   * both are in the room's subtree; the `held` rung stays unconditional).
   */
  private displaysAround(viewer: Stuff): DisplayStuff[] {
    const room = this.roomOf(viewer);
    if (!room) return [];
    return this.displaysWithin(room);
  }

  /**
   * ⚠ The one world-wide read, reached only by the by-mind rung of
   * {@link resolveFor} — driving a screen in another room, which no
   * room-local walk can answer. MQL system enumeration (null giver — a
   * viewer-blind engine sweep) rather than a bespoke `getAllObjects`
   * filter-loop: the sanctioned form, see antipatterns.md § *Bespoke
   * Object-Search Algorithms*.
   */
  private allDisplays(): DisplayStuff[] {
    const matches = MqlApi.resolveMany('world:[mixin.DisplayMixin]', {
      commandGiver: null,
      scope: 'world',
    });
    return matches.stuff.filter((s): s is DisplayStuff => MixinApi.isDisplay(s));
  }
}
