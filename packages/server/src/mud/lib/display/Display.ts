/**
 * DisplayMixin — a screen: a Thing that SHOWS one source to everyone who
 * can see it (D12). A tablet, a wall TV, the terminal's departures board
 * — one mixin, output optical, the difference is data.
 *
 * Two axes, deliberately separate, because the first cut of this mixin
 * fused them and `sourcePolicy: 'any' | 'cards' | 'streams'` was the
 * seam — a PERMISSION field whose values were RENDERING kinds:
 *
 *  - **what it shows** — a `DisplaySource`, carrying its own
 *    `DisplayKind` (`video` | `card` | `prose`). The kind decides which
 *    client component renders it; the screen does not decide, and does
 *    not need to know. What it shows is a runtime fact — a screen is
 *    dark on boot.
 *  - **what it will admit** — `shows: DisplayKind[]`, a policy over
 *    kinds. A departures board is `shows: ['prose']`; a screen with no
 *    row narrowing it admits all three.
 *
 * Who may DRIVE it is the `pairing` policy:
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
import type { HasInteractive } from '../connection/HasInteractive';
import Location from '../stuff/Location';
import { Mml } from '../../api/mml';
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

/**
 * ⭐ **How the content manifests** — the axis the first cut of this mixin
 * did not model at all. A screen's contents reach a player three ways,
 * and they are different *client components*, not different data:
 *
 *  - `video` — an embed the client renders (live or recorded; which of
 *    the two is a property of the content, and organising it into
 *    networks or guides is a later ADDRESSING layer that changes
 *    nothing here);
 *  - `card`  — an app: controls and feedback, on the card rail;
 *  - `prose` — ordinary game text, read off the screen.
 *
 * The kind is carried, explicit and total, so the arms are exhaustive
 * rather than "the two we built plus a fudge". A screen no longer
 * declares *"I do cards"*: it shows content, and the content knows how
 * it manifests.
 */
export type DisplayKind = 'video' | 'card' | 'prose';
export const DISPLAY_KINDS: readonly DisplayKind[] = ['video', 'card', 'prose'];

/** What a display shows. */
export type DisplaySource =
  | { kind: 'video'; target: WatchTarget; label: string }
  | {
      kind: 'card';
      cardId: CardId;
      subjectId?: string;
      key: string;
      /** The prose the driver's command emitted — rides the card. */
      prose?: Mml;
    }
  | { kind: 'prose'; body: Mml };

/** Public shape provided by DisplayMixin. */
export interface Display {
  getPairing(): DisplayPairing;
  setPairing(p: DisplayPairing): void;
  /** The kinds this screen admits — a policy OVER kinds, not the mechanism. */
  getShows(): DisplayKind[];
  setShows(kinds: DisplayKind[]): void;
  /** The Business path the `staff` policy checks, or `''`. */
  getPrincipal(): string;
  setPrincipal(path: string): void;
  /** The paired remote's template path (`remote` pairing), or `''`. */
  getRemote(): string;
  setRemote(path: string): void;
  getShowing(): DisplaySource | null;
  /** Whether the policy admits this source kind. */
  acceptsSource(source: DisplaySource): boolean;
  /**
   * ⭐ The PROSE arm: what `viewer` reads off this screen right now, or
   * `null` when it is dark. Resolved at READ time and per viewer, which
   * is why prose needs no projection — see `project`.
   *
   * The default renders the showing source: a prose body verbatim, a
   * video or card as the one-line "Showing: …" a look already gave. A
   * host whose board is COMPUTED rather than driven overrides this —
   * the TPA terminal's departures, which annotate against the reader's
   * own travel credential and could never have been one shared payload.
   */
  readScreen(viewer: Stuff): Promise<Mml | null>;

  /** The pairing policy: may `actor` drive this screen? */
  mayDrive(actor: Stuff): Promise<boolean>;
  /** Is this screen somewhere inside `actor` (inventory, at any depth)? */
  isCarriedBy(actor: Stuff): boolean;
  /** The connected viewers who see it (same room, perceives). */
  viewersOf(): (Stuff & HasInteractive)[];

  /**
   * Show `source`, and project it to every viewer who sees the screen —
   * for the arms that HAVE a projection. Prose does not; it is read.
   */
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
      shows: { persistent: true, authorable: true },
      principal: { persistent: true, authorable: true, authorPicker: 'Template' },
      remote: { persistent: true, authorable: true, authorPicker: 'Template' },
    };

    pairing: DisplayPairing = 'open';
    /**
     * Every kind, unless a row narrows it. The default is TOTAL rather
     * than an `'any'` sentinel: a fourth kind would otherwise have to
     * teach the sentinel about itself.
     */
    shows: DisplayKind[] = [...DISPLAY_KINDS];
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
    getShows(): DisplayKind[] {
      return this.shows;
    }
    setShows(kinds: DisplayKind[]): void {
      for (const k of kinds) {
        if (!DISPLAY_KINDS.includes(k)) {
          throw new Error(`Display.shows: unknown kind '${String(k)}'`);
        }
      }
      this.shows = [...kinds];
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
      return this.shows.includes(source.kind);
    }

    async readScreen(_viewer: Stuff): Promise<Mml | null> {
      const source = this._showing;
      if (!source) return null;
      switch (source.kind) {
        case 'prose':
          return source.body;
        case 'video':
          return Mml.compose`Showing: ${source.label}.`;
        case 'card':
          return Mml.compose`Showing: the ${source.cardId} card.`;
      }
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
        if (previous?.kind === 'video' && source.kind !== 'video') {
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
        // getInteractives() is undefined on an avatar mid-teardown —
        // and this walk runs inside command dispatch (a display refresh
        // rides look/move), so an unguarded read crashes the COMMAND.
        if ((s.getInteractives()?.size ?? 0) === 0) continue;
        if (this.sees(s)) out.push(s);
      }
      return out;
    }

    // ---- internals -----------------------------------------------------

    /**
     * The three arms, exhaustively. Each is a different CLIENT COMPONENT
     * reached by a different channel — which is precisely the axis that
     * has to be carried rather than inferred.
     */
    private project(viewer: Stuff & HasInteractive, source: DisplaySource): void {
      const self = this as unknown as Stuff;
      switch (source.kind) {
        case 'video': {
          const target: WatchTarget = {
            ...source.target,
            display: { stuffId: self.stuffId, label: self.getPresentation() },
          };
          viewer.setClientState(WATCH_KEY, target);
          viewer.pushClientStateUpdate(WATCH_KEY, target);
          return;
        }
        case 'card': {
          for (const interactive of viewer.getInteractives()) {
            CardApi.push(interactive, source.cardId, {
              key: source.key,
              subjectId: source.subjectId,
              prose: source.prose,
              title: self.getPresentation(),
            });
          }
          return;
        }
        case 'prose':
          // ⭐ **Prose has no projection, and that is the finding.** The
          // other two arms push because the client holds a component that
          // must be told; prose is ordinary game text the client already
          // renders, and what a screen says is READ OFF IT —
          // `readScreen(viewer)`, at look time, per viewer. Pushing it
          // would spam the room on every refresh AND would flatten a
          // per-viewer board into one shared payload — which is the bug
          // the departures board actually had. The prose arm is thinner
          // than a mechanism: it is the display declining to use one.
          return;
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
