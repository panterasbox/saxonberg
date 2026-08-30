/**
 * DisplayMixin — a screen: a Thing that SHOWS one source to everyone who
 * can see it (D12). A tablet, a wall TV, the terminal's departures board
 * — one mixin, output optical, the difference is data.
 *
 * A display shows a `DisplaySource`: a **stream** (the focal embed the
 * `watch` verb already writes per viewer) or a **card** (pushed through
 * the card rail's one birth path). What it shows is a runtime fact — a
 * screen is dark on boot. Who may DRIVE it is the `pairing` policy:
 *
 *  - `held`   — whoever carries it;
 *  - `remote` — whoever carries the paired remote (`remote` names it);
 *  - `staff`  — whoever holds a position at `principal` (a Business path)
 *               or proprietors it — the house tablet's "signed in as";
 *  - `open`   — anyone in reach (the terminal's board).
 *
 * ⚠ **A display confers no money authority.** A thief holding the house
 * tablet can read the stock sheet — the sheet is what the screen shows —
 * but `wallet use house` and a house-stamped `buy` refuse them; money
 * authority is only ever the wallet's, and the wallet's is the position's.
 *
 * The **modem** is a predicate on the DRIVER, never a mixin on the screen
 * (`MixinApi.isActive(driver, 'AetherMixin')`): a slot-less Thing can never
 * have an active `AetherMixin`, and a display hosts no updates. Driving
 * *by mind* needs the driver's active attunement and works from anywhere
 * (`staff`/`held`/`remote` pairings); driving *by hand* needs reach.
 * A controller walks that ladder (`CommandController.resolveScreen`).
 *
 * ⭐ **There is no `DisplayApi`.** A display drives itself: `show`,
 * `clear`, `refresh`, `mayDrive` and `viewersOf` are all fundamentally
 * about ONE screen's own state, and CLAUDE.md is explicit that an Api
 * exists to *orchestrate* while "a read or mutation that belongs to ONE
 * object lives on that object". Fanning out to N viewers is not the
 * test — `victim.afflict(...)` dispatches widely and still lives on the
 * victim. The first cut of this subsystem shipped a seven-method
 * `DisplayApi` + `DisplayLogic` pair built by pattern-matching the shape
 * of other subsystems; it was deleted.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { WatchTarget, CardId } from '@saxonberg/types';
import type { Mml } from '../../api/mml';
import type { HasInteractive } from '../connection/HasInteractive';
import Location from '../stuff/Location';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { CardApi } from '../../api/card';
import { PerceptionApi } from '../../api/perception';
import { EmploymentApi } from '../../api/employment';

/** The per-viewer focal-embed key the `watch` verb writes. */
const WATCH_KEY = 'cockpit.watch';

export type DisplayPairing = 'remote' | 'held' | 'staff' | 'open';
export const DISPLAY_PAIRINGS: readonly DisplayPairing[] = [
  'remote',
  'held',
  'staff',
  'open',
];

export type DisplaySourcePolicy = 'any' | 'cards' | 'streams';
export const DISPLAY_SOURCE_POLICIES: readonly DisplaySourcePolicy[] = [
  'any',
  'cards',
  'streams',
];

/** What a display shows. A stream is the focal embed; a card is pushed. */
export type DisplaySource =
  | { kind: 'stream'; target: WatchTarget; label: string }
  | {
      kind: 'card';
      cardId: CardId;
      subjectId?: string;
      key: string;
      /** The prose the driver's command emitted — rides the card. */
      prose?: Mml;
    };

/** Public shape provided by DisplayMixin. */
export interface Display {
  getPairing(): DisplayPairing;
  setPairing(p: DisplayPairing): void;
  getSourcePolicy(): DisplaySourcePolicy;
  setSourcePolicy(p: DisplaySourcePolicy): void;
  /** The Business path the `staff` policy checks, or `''`. */
  getPrincipal(): string;
  setPrincipal(path: string): void;
  /** The paired remote's template path (`remote` pairing), or `''`. */
  getRemote(): string;
  setRemote(path: string): void;
  getShowing(): DisplaySource | null;
  /** Whether the policy admits this source kind. */
  acceptsSource(source: DisplaySource): boolean;

  /** The pairing policy: may `actor` drive this screen? */
  mayDrive(actor: Stuff): Promise<boolean>;
  /** Is this screen somewhere inside `actor` (inventory, at any depth)? */
  isCarriedBy(actor: Stuff): boolean;
  /** The connected viewers who see it (same room, perceives). */
  viewersOf(): (Stuff & HasInteractive)[];

  /** Show `source`, and project it to every viewer who sees the screen. */
  show(source: DisplaySource): void;
  /** Darken it; every projected viewer's embed clears. */
  clear(): void;
  /** Re-project what it shows to everyone who sees it now. */
  refresh(): void;
  /**
   * Re-sync ONE viewer: project when they see a lit screen, clear their
   * shared embed when they no longer see it. The arrival/departure half.
   */
  refreshFor(viewer: Stuff): void;
}

export function DisplayMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class DisplayMixin extends Base implements Display {
    static _mixinName = 'DisplayMixin';

    static fieldMeta: FieldMeta = {
      pairing: { persistent: true, authorable: true },
      sourcePolicy: { persistent: true, authorable: true },
      principal: { persistent: true, authorable: true, authorPicker: 'Template' },
      remote: { persistent: true, authorable: true, authorPicker: 'Template' },
    };

    pairing: DisplayPairing = 'open';
    sourcePolicy: DisplaySourcePolicy = 'any';
    principal = '';
    remote = '';

    /** Runtime only — a screen is dark on boot. */
    private _showing: DisplaySource | null = null;

    getPairing(): DisplayPairing {
      return this.pairing;
    }
    setPairing(p: DisplayPairing): void {
      if (!DISPLAY_PAIRINGS.includes(p)) {
        throw new Error(`Display.pairing: unknown pairing '${String(p)}'`);
      }
      this.pairing = p;
    }
    getSourcePolicy(): DisplaySourcePolicy {
      return this.sourcePolicy;
    }
    setSourcePolicy(p: DisplaySourcePolicy): void {
      if (!DISPLAY_SOURCE_POLICIES.includes(p)) {
        throw new Error(`Display.sourcePolicy: unknown policy '${String(p)}'`);
      }
      this.sourcePolicy = p;
    }
    getPrincipal(): string {
      return this.principal;
    }
    setPrincipal(path: string): void {
      this.principal = path ?? '';
    }
    getRemote(): string {
      return this.remote;
    }
    setRemote(path: string): void {
      this.remote = path ?? '';
    }
    getShowing(): DisplaySource | null {
      return this._showing;
    }
    acceptsSource(source: DisplaySource): boolean {
      const policy = this.sourcePolicy;
      if (policy === 'any') return true;
      return policy === 'cards' ? source.kind === 'card' : source.kind === 'stream';
    }

    // ---- driving -------------------------------------------------------

    async mayDrive(actor: Stuff): Promise<boolean> {
      switch (this.pairing) {
        case 'held':
          return this.isCarriedBy(actor);
        case 'remote': {
          if (!this.remote) return false;
          return this.carriedByTemplate(actor, this.remote);
        }
        case 'staff': {
          const business = this.principal
            ? StuffApi.findByTemplatePath(this.principal)
            : null;
          if (!business || !MixinApi.isOrganization(business)) return false;
          if (EmploymentApi.holdsPosition(actor, business)) return true;
          return EmploymentApi.isProprietorOf(actor, business);
        }
        case 'open':
          return PerceptionApi.canReach(actor, this as unknown as Stuff);
      }
    }

    isCarriedBy(actor: Stuff): boolean {
      let cur: Stuff | null = MixinApi.isContainable(this as unknown as Stuff)
        ? ((this as unknown as { getContainer(): Stuff | null }).getContainer())
        : null;
      const guard = new Set<string>();
      while (cur && !guard.has(cur.stuffId)) {
        if (cur.stuffId === actor.stuffId) return true;
        guard.add(cur.stuffId);
        cur = MixinApi.isContainable(cur) ? (cur.getContainer() as Stuff | null) : null;
      }
      return false;
    }

    // ---- showing -------------------------------------------------------

    show(source: DisplaySource): void {
      if (!this.acceptsSource(source)) {
        throw new Error(
          `Display.show: ${(this as unknown as Stuff).getPresentation()} does not show ${source.kind}s`,
        );
      }
      const previous = this._showing;
      this._showing = source;
      for (const viewer of this.viewersOf()) {
        if (previous?.kind === 'stream' && source.kind !== 'stream') {
          this.clearWatch(viewer);
        }
        this.project(viewer, source);
      }
    }

    clear(): void {
      this._showing = null;
      for (const viewer of this.viewersOf()) this.clearWatch(viewer);
    }

    refresh(): void {
      const source = this._showing;
      if (!source) return;
      for (const viewer of this.viewersOf()) this.project(viewer, source);
    }

    refreshFor(viewer: Stuff): void {
      if (!MixinApi.isHasInteractive(viewer)) return;
      const source = this._showing;
      if (source && this.sees(viewer)) {
        this.project(viewer as Stuff & HasInteractive, source);
        return;
      }
      // Walked away from a shared embed: it leaves the screen with you.
      this.clearWatch(viewer as Stuff & HasInteractive);
    }

    /**
     * Derived from the screen's ROOM, not from the connection registry
     * and not from the world: a viewer is a `HasInteractive` Stuff with
     * at least one Interactive attached — the same fact `CardApi.push`
     * needs — in this screen's room, perceiving it.
     *
     * ⚠ Room-scoped on purpose. `sees()` already requires the viewer to
     * be in this room, so the room's containment subtree is the complete
     * candidate set; a world scan was only ever a slower way to the same
     * answer, paid on every `show`, `clear` and `refresh`.
     */
    viewersOf(): (Stuff & HasInteractive)[] {
      const room = this.roomOf(this as unknown as Stuff);
      if (!room) return [];
      const out: (Stuff & HasInteractive)[] = [];
      for (const s of this.subtreeOf(room)) {
        if (!MixinApi.isHasInteractive(s)) continue;
        if (s.getInteractives().size === 0) continue;
        if (this.sees(s)) out.push(s);
      }
      return out;
    }

    // ---- internals -----------------------------------------------------

    private project(viewer: Stuff & HasInteractive, source: DisplaySource): void {
      const self = this as unknown as Stuff;
      if (source.kind === 'stream') {
        const target: WatchTarget = {
          ...source.target,
          display: { stuffId: self.stuffId, label: self.getPresentation() },
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
          title: (this as unknown as Stuff).getPresentation(),
        });
      }
    }

    private clearWatch(viewer: Stuff & HasInteractive): void {
      const self = this as unknown as Stuff;
      const current = viewer.getClientState<WatchTarget | null>(WATCH_KEY) ?? null;
      if (current?.display?.stuffId !== self.stuffId) return;
      viewer.setClientState(WATCH_KEY, null);
      viewer.pushClientStateUpdate(WATCH_KEY, null);
    }

    /** Same room as this screen's resting room, and perceives it. */
    private sees(viewer: Stuff): boolean {
      const self = this as unknown as Stuff;
      const room = this.roomOf(self);
      if (!room || this.roomOf(viewer) !== room) return false;
      return PerceptionApi.perceives(viewer, self);
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

    /**
     * Every Stuff in `host`'s containment subtree, stopping at a nested
     * `Location` (another room's business is its own).
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
          if (s instanceof Location) continue;
          walk(s);
        }
      };
      walk(host);
      return out;
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
  }
  return DisplayMixin;
}
