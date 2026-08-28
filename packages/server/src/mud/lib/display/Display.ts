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
 * `DisplayLogic.resolveFor` walks that ladder.
 *
 * `show`/`clear` are gated to `DisplayLogic` — the projection to viewers
 * is the Api's job, and a bare field write would leave every viewer's
 * screen stale.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { WatchTarget, CardId } from '@saxonberg/types';
import type { Mml } from '../../api/mml';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

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
  /** DisplayLogic-only: set what the screen shows. */
  _setShowing(source: DisplaySource | null): void;
}

// The logic singleton at `/platform/idea/api/display` is the one writer:
// it projects to viewers, so a bare write would leave screens stale.
const DisplayLogicOnly = SecurityPolicies.FromTemplate(
  '/platform/idea/api/display',
);

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

    @CallSecurity(DisplayLogicOnly)
    _setShowing(source: DisplaySource | null): void {
      this._showing = source;
    }
  }
  return DisplayMixin;
}
