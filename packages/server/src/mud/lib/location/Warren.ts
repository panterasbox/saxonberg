/**
 * Warren — abstract base for the MultiLocation elastic-graph substrate.
 *
 * A Warren is an incorporeal `Idea` (identity + state, no physical
 * presence) that coordinates a group of live `Location` instances cloned
 * from ONE room template. The graph **buds** new instances when it fills
 * and **merges** them back when it empties. The Warren is a
 * *coordinator, not a containment tier*: member Locations stay ordinary
 * roots (`getContainer()` → `null`); the Warren tracks them in its own
 * Pattern-B set and consults that set for routing and landing.
 *
 * This base owns the **mechanism**, shared by every consumer (lounge,
 * future dungeon/desert):
 *   - the member set (R2.3 prune-on-read, R2.4 symmetric cleanup),
 *   - **host designation + migration** — exactly one live member is the
 *     host once the graph is non-empty; on a forced host destruction the
 *     role migrates to a survivor and the dependent wiring re-points,
 *   - `spawnMember` / `reapMember`, hub exit wiring (with the
 *     `Exitable.onDestruct` asymmetry teardown), `getHost()` (the reusable
 *     placement kernel), `teardown`, ref discipline.
 *
 * Subclasses supply the **policy** (the abstract hooks): which template to
 * clone (`createMember`), where arrivals go (`admitArrival`), the hub
 * topology (`attachmentFor`), the population reconcile loop (`reconcile`),
 * and host-only fixture wiring (`wireHostFixtures` / `unwireHostFixtures`).
 *
 * What a Warren is NOT: a container (members are roots), a telepresence
 * device (it is one template in many instances, not one actor in many
 * rooms), or a persisted entity (the graph reconstitutes lazily on the
 * next first-landing). See
 * [docs/requirements/multilocation-lounge-requirements.md].
 *
 * Instance fields use TypeScript `private` (not `#`): every Stuff is
 * wrapped in the call-security Proxy and method dispatch runs through the
 * proxy receiver, so `#`-private slots are unreachable from `this`.
 */

import { Idea } from '../stuff/Idea';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Exitable } from '../boundary/Exitable';
import type { WarrenMember } from './WarrenMember';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';

/** Host-side hub topology for one member: the direction host→member. */
export interface Attachment {
  direction: string;
  opposite?: string;
}

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

export abstract class Warren extends Idea {
  /**
   * The member set. Truth of membership — a Location is a member iff it
   * is here, regardless of whether it composes `WarrenMemberMixin`.
   * Transient (instance refs). R2.3 prune-on-read in `getMembers`.
   */
  private _members: Set<MemberStuff> = new Set();

  /**
   * Host-side hub topology per member, so teardown/migration can find
   * and destruct the exact exits that wire each member to the host.
   */
  private _attachments: Map<MemberStuff, Attachment> = new Map();

  /** The current host member, or null when the graph is empty / lost. */
  private _hostMember: MemberStuff | null = null;

  /**
   * Self-seating fixtures (by template path) that follow this warren's
   * host. Populated by `registerFixture` when a `FixtureMixin` seats into
   * the host (`seatIn` → this Warren); re-resolved on host (re)designation
   * so a fixture that cascade-died with the old host is revived into the
   * new one. Paths, not live refs — a host-seated fixture is destructed
   * with its host, so a live ref would dangle; the path revives it.
   */
  private _fixturePaths: Set<string> = new Set();

  /** Coalescing flag for `notifyPopulationChange` → `reconcile`. */
  private _reconcilePending = false;

  /**
   * In-flight `getHost()` resolution. Coalesces concurrent landings onto
   * one host creation so a burst of first-landings yields exactly one
   * host (not one per caller).
   */
  private _hostInFlight: Promise<MemberStuff> | null = null;

  /**
   * Serialization chain for member creation. `createMember` clones the
   * SAME (non-singleton) room template, and `StuffApi.clone` rejects two
   * concurrent clones of one path (its cycle guard). Routing every member
   * clone through this chain keeps them strictly sequential per Warren so
   * concurrent buds never collide.
   */
  private _memberCreateChain: Promise<unknown> = Promise.resolve();

  // ───────────────────────── member set ──────────────────────────

  /**
   * Register `m` as a member. Idempotent. The SOLE writer of the
   * Pattern-B back-ref (alongside `removeMember`): when `m` composes
   * `WarrenMemberMixin`, stamps `m.setWarren(this)`. A plain-`Location`
   * member just lives in the set.
   *
   * Single-warren guard (Q2b): a member already owned by a DIFFERENT
   * Warren is rejected — it stays where it is and we warn. The declared
   * seed path can *initiate* a membership but never *re-home* an owned
   * one; the owner always wins.
   *
   * Returns true when `m` is a member of this Warren after the call.
   */
  public addMember(m: MemberStuff): boolean {
    if (this._members.has(m)) return true;
    if (MixinApi.isWarrenMember(m)) {
      const current = (m as unknown as WarrenMember).getWarren();
      if (current !== null && (current as unknown) !== (this as unknown)) {
        console.warn(
          `Warren.addMember: ${m.stuffId} is already owned by another ` +
            `Warren (${(current as unknown as Stuff).stuffId}); the owner ` +
            `wins — refusing to re-home, staying put.`,
        );
        return false;
      }
    }
    this._members.add(m);
    if (MixinApi.isWarrenMember(m)) {
      (m as unknown as WarrenMember).setWarren(this as unknown as Stuff & Warren);
    }
    return true;
  }

  /**
   * Drop `m` from the member set. Clears the back-ref iff it still names
   * us (R2.2 symmetric). When `m` was the host and survivors remain, the
   * host role is lost and re-designated lazily on the next `getHost()`.
   * Returns true when `m` was present.
   */
  public removeMember(m: MemberStuff): boolean {
    const had = this._members.delete(m);
    this._attachments.delete(m);
    if (
      MixinApi.isWarrenMember(m) &&
      ((m as unknown as WarrenMember).getWarren() as unknown) === (this as unknown)
    ) {
      (m as unknown as WarrenMember).setWarren(null);
    }
    if (had && this._hostMember === m) {
      // Host lost. Re-designation + exit re-wiring happens in getHost()
      // (the kernel), which migrates to a survivor on next access.
      this._hostMember = null;
    }
    return had;
  }

  /** Membership predicate. */
  public hasMember(m: MemberStuff): boolean {
    return this._members.has(m);
  }

  /**
   * Live members, R2.3-pruned. A destructed member is dropped from the
   * set on read (defends against any destruct path that bypassed the
   * R2.4 cleanup).
   */
  public getMembers(): MemberStuff[] {
    const out: MemberStuff[] = [];
    for (const m of [...this._members]) {
      if ((m as Stuff).isDestroyed()) {
        this._members.delete(m);
        this._attachments.delete(m);
        if (this._hostMember === m) this._hostMember = null;
        continue;
      }
      out.push(m);
    }
    return out;
  }

  /** Sync host check (no clone). True iff `room` is the current host. */
  public isCurrentHost(room: MemberStuff): boolean {
    return this._hostMember === room && !room.isDestroyed();
  }

  /**
   * The current host member (or null when empty / lost), pruned. For
   * subclass policy (`reconcile`) that must skip the host. Does NOT
   * create one — use `getHost()` for the create-if-absent kernel.
   */
  protected getCurrentHost(): MemberStuff | null {
    if (this._hostMember && this._hostMember.isDestroyed()) {
      this._hostMember = null;
    }
    return this._hostMember;
  }

  // ───────────────────────── host kernel ──────────────────────────

  /**
   * The reusable placement kernel. Returns the current host, creating
   * the graph's first instance (which becomes host) when empty, or
   * migrating the role to a survivor when the prior host was force-
   * destroyed. Both avatar sign-in (`startLocation`) and future
   * item-spawn share this.
   */
  public async getHost(): Promise<MemberStuff> {
    if (this._hostMember && !this._hostMember.isDestroyed()) {
      return this._hostMember;
    }
    // Coalesce concurrent landings onto one host resolution.
    if (this._hostInFlight) return this._hostInFlight;
    const run = this._resolveHost().finally(() => {
      this._hostInFlight = null;
    });
    this._hostInFlight = run;
    return run;
  }

  // TypeScript `private` (not `#`): a `#`-private method called through
  // the Stuff call-security proxy would throw (the proxy receiver isn't
  // the raw class instance the brand check expects).
  private async _resolveHost(): Promise<MemberStuff> {
    if (this._hostMember && !this._hostMember.isDestroyed()) {
      return this._hostMember;
    }
    const survivors = this.getMembers();
    if (survivors.length > 0) {
      // Host lost (force-destroyed) but members survive — migrate.
      await this.migrateHost(survivors[0]!);
      return this._hostMember!;
    }
    // Empty graph: create the first member; it becomes host.
    const first = await this.createMemberSerialized();
    this.addMember(first); // idempotent — a self-registering clone is already in.
    await this.designateHost(first);
    return first;
  }

  /**
   * Create one member through the per-Warren serialization chain so two
   * concurrent creations never clone the same template path at once.
   */
  protected async createMemberSerialized(): Promise<MemberStuff> {
    const run = this._memberCreateChain.then(
      () => this.createMember(),
      () => this.createMember(),
    );
    this._memberCreateChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Make `m` the host and wire its host-only fixtures. No exit changes
   * to other members (a fresh host has no satellites yet). Re-seats any
   * registered self-seating fixtures last — a no-op on the first-ever
   * designation (none registered yet), but it revives fixtures that died
   * with a previously lost host when the graph stands up fresh.
   */
  protected async designateHost(m: MemberStuff): Promise<void> {
    this._hostMember = m;
    await this.wireHostFixtures(m);
    await this.reseatFixtures();
  }

  /**
   * Register a self-seating fixture so it re-seats when the host migrates
   * or the graph stands back up. Called by `FixtureMixin.seatSelf` when
   * its `seatIn` target is this Warren. Stores the fixture's template path
   * — the durable handle that survives the fixture's death-with-host; a
   * path-less fixture can't be revived and is logged.
   */
  public registerFixture(fixture: Stuff & Containable): void {
    const path = fixture.getTemplatePath();
    if (!path) {
      console.warn(
        `Warren.registerFixture: ${fixture.stuffId} has no template path; ` +
          `it won't re-seat on host migration.`,
      );
      return;
    }
    this._fixturePaths.add(path);
  }

  /**
   * Re-seat each registered fixture into the current host. A fixture seated
   * in a host usually cascade-dies when that host is force-destroyed:
   * re-resolving its singleton clones a fresh one whose `postRegister`
   * self-seats into the now-current host (and re-registers here,
   * idempotently). When a fixture instead survived (evacuated elsewhere
   * rather than cascade-destructed), the explicit move relocates it. Either
   * way it lands in the current host. Safe to call with an empty registry.
   */
  private async reseatFixtures(): Promise<void> {
    const host = this._hostMember;
    if (!host) return;
    for (const path of [...this._fixturePaths]) {
      try {
        const fixture = await StuffApi.singleton<Stuff & Containable>(path);
        ContainmentApi.move(fixture, host);
      } catch (err) {
        console.warn(
          `Warren.reseatFixtures: ${path} failed to re-seat:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  /**
   * Migrate the host role to `newHost` after the prior host was force-
   * destroyed. The dead host's outbound hub exits were destructed by its
   * own `Exitable.onDestruct`, but the satellite-side inverses were left
   * BLOCKED (the asymmetry) — so for each survivor we explicitly remove
   * and destruct the dead exit toward the old host, then re-point every
   * other survivor's hub exit at `newHost`, swap the host-only fixtures,
   * and update the host pointer.
   */
  protected async migrateHost(newHost: MemberStuff): Promise<void> {
    const survivors = this.getMembers();
    // 1. Tear down each survivor's now-dead exit toward the old host.
    for (const s of survivors) {
      const att = this._attachments.get(s);
      if (!att) continue;
      const backDir = att.opposite ?? NavigationApi.invertDirection(att.direction);
      if (backDir && MixinApi.isExitable(s)) {
        const dead = s.getExit(backDir);
        if (dead) {
          s.removeExit(backDir);
          StuffApi.destruct(dead as unknown as Stuff);
        }
      }
      this._attachments.delete(s);
    }
    // 2. Promote and re-wire.
    this._hostMember = newHost;
    for (const s of survivors) {
      if (s === newHost) continue;
      await this.wireHubExit(s);
    }
    // 3. Swap host-only fixtures (Dave's, campus, …) onto the new host.
    await this.unwireHostFixtures();
    await this.wireHostFixtures(newHost);
    // 4. Re-seat self-seating fixtures: each was seated in the dead host
    // and cascade-died with it; reviving its singleton self-seats it into
    // `newHost` (now the current host).
    await this.reseatFixtures();
  }

  // ──────────────────────── spawn / reap ──────────────────────────

  /**
   * Clone a fresh satellite (via the policy `createMember`), ensure it
   * is registered, and wire its hub exit to the current host. Returns
   * the new member.
   */
  protected async spawnMember(): Promise<MemberStuff> {
    const m = await this.createMemberSerialized();
    this.addMember(m); // idempotent — a self-registering clone is already in.
    await this.wireHubExit(m);
    return m;
  }

  /**
   * Destruct a member, draining any occupants to the host first and
   * tearing down BOTH sides of its hub exit. **Never reaps the host.**
   *
   * Order is load-bearing for the exit-teardown asymmetry: remove +
   * destruct the host-side exit FIRST (which clears the member-side
   * inverse pointer via `Exit.onDestruct`), so the member's own
   * `Exitable.onDestruct` doesn't try to block an already-dead inverse.
   */
  protected reapMember(m: MemberStuff): void {
    if (m === this._hostMember) return; // never reap the host
    if (!this._members.has(m)) return;
    const host = this._hostMember;
    // Drain occupants to the host so nobody is stranded.
    if (host) {
      for (const occ of this.occupantsOf(m)) {
        try {
          ContainmentApi.move(occ as unknown as Stuff & import('../spatial/Containable').Containable, host);
        } catch (err) {
          console.error(`Warren.reapMember: failed to drain ${occ.stuffId}`, err);
        }
      }
    }
    this.unwireHubExit(m);
    this.removeMember(m);
    StuffApi.destruct(m as unknown as Stuff);
  }

  // ─────────────────────── exit wiring ────────────────────────────

  /**
   * Wire a bidirectional hub exit between the current host and `m`,
   * recording the host-side direction so teardown can find it. No-op
   * when `m` IS the host or there is no host yet.
   */
  protected async wireHubExit(m: MemberStuff): Promise<void> {
    const host = this._hostMember;
    if (!host || host === m) return;
    const hostEx = this.requireExitable(host);
    const memberEx = this.requireExitable(m);
    const att = this.attachmentFor(m);
    // Live-ref hub exit (an instance ref): host and member are non-singleton
    // clones of one template (a shared templatePath), so path resolution
    // would be ambiguous — hold the live refs directly.
    await hostEx.addBidirectionalExit(memberEx, att.direction, {
      opposite: att.opposite,
      keepLiveDestination: true,
    });
    this._attachments.set(m, att);
  }

  /**
   * Tear down the host-side half of `m`'s hub exit and destruct that
   * Exit object (the asymmetry fix — `removeExit` alone leaks the Exit
   * and leaves a blocked dead entry). The member-side half is left to
   * `m`'s own `Exitable.onDestruct` when `m` is being reaped; when this
   * is called for a still-living `m` the member-side inverse is cleared
   * by the host-exit's `Exit.onDestruct`.
   */
  protected unwireHubExit(m: MemberStuff): void {
    const att = this._attachments.get(m);
    this._attachments.delete(m);
    const host = this._hostMember;
    if (!host || !att || !MixinApi.isExitable(host)) return;
    const exit = host.getExit(att.direction);
    if (exit) {
      host.removeExit(att.direction);
      StuffApi.destruct(exit as unknown as Stuff);
    }
  }

  // ─────────────────── population / reconcile ─────────────────────

  /**
   * A member's `HasInteractive` population changed. Coalesces a
   * `reconcile()` onto a microtask so a burst of arrivals/departures
   * runs the policy once. Event-driven — no polling.
   */
  public notifyPopulationChange(_room: MemberStuff): void {
    if (this._reconcilePending) return;
    this._reconcilePending = true;
    queueMicrotask(() => {
      this._reconcilePending = false;
      void this.reconcile().catch((err) => {
        console.error(`Warren.reconcile failed for ${this.stuffId}`, err);
      });
    });
  }

  /** Count of `HasInteractive` occupants in a member room. */
  protected occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    return m
      .getContents()
      .filter((c) => MixinApi.isHasInteractive(c)) as unknown as (Stuff &
      Container)[];
  }

  // ───────────────────────── teardown ─────────────────────────────

  /**
   * Tear the whole graph down — destruct every member (host last) and
   * clear all state. Used on shutdown / HMR; the Warren `Idea` itself
   * persists only as a definition and the graph reconstitutes lazily.
   */
  public teardown(): void {
    const host = this._hostMember;
    for (const m of this.getMembers()) {
      if (m === host) continue;
      try {
        StuffApi.destruct(m as unknown as Stuff);
      } catch (err) {
        console.error(`Warren.teardown: failed to destruct ${m.stuffId}`, err);
      }
    }
    if (host && !host.isDestroyed()) {
      try {
        StuffApi.destruct(host as unknown as Stuff);
      } catch (err) {
        console.error(`Warren.teardown: failed to destruct host ${host.stuffId}`, err);
      }
    }
    this._members.clear();
    this._attachments.clear();
    this._hostMember = null;
    // Fixture paths are durable identity, not graph state, but a torn-down
    // graph reconstitutes from its boot root (which re-registers), so drop
    // them too rather than re-seat into a stale host on the next stand-up.
    this._fixturePaths.clear();
  }

  /**
   * R2.4 framework cleanup — tear the graph down when the Warren itself
   * destructs so no member is orphaned.
   */
  static cleanupOnDestruct(stuff: Stuff): void {
    (stuff as unknown as Warren).teardown();
  }

  // ───────────────────── policy hooks (abstract) ──────────────────

  /** Clone one fresh member instance (the room template). */
  protected abstract createMember(): Promise<MemberStuff>;

  /**
   * Seat an arrival when the host is over capacity — re-route it to an
   * eligible satellite or bud a new one. Called by the member-side
   * over-capacity witness. The sync prefix (before the first `await`)
   * should perform the move when an eligible satellite already exists,
   * so the re-seat completes within the triggering move (single sense).
   */
  abstract admitArrival(host: MemberStuff, actor: Stuff): Promise<void>;

  /** Host-side hub topology for a new member. */
  protected abstract attachmentFor(m: MemberStuff): Attachment;

  /** Population-reactive reconcile (bud-high / merge-low). */
  protected abstract reconcile(): Promise<void>;

  /** Wire the host-only fixtures (external neighbors). */
  protected abstract wireHostFixtures(host: MemberStuff): Promise<void>;

  /** Remove the host-only fixtures from whatever previously held them. */
  protected abstract unwireHostFixtures(): Promise<void>;

  /**
   * Narrow a room to an Exitable container, failing early when it isn't.
   * A Warren that wires hub/fixture exits requires its rooms to compose
   * `ExitableMixin`; a non-Exitable room is a composition error worth
   * surfacing loudly rather than papering over with a cast.
   */
  protected requireExitable(m: MemberStuff): ExitableContainer {
    if (!MixinApi.isExitable(m)) {
      throw new Error(
        `Warren: room ${m.stuffId} must compose ExitableMixin to be wired ` +
          `into the hub, but it does not.`,
      );
    }
    return m as ExitableContainer;
  }
}
