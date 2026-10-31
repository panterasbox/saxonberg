/**
 * BerthKeeperMixin — ⭐ **a landing somebody keeps a book for** (harbors P7):
 * a harbor quay, where a ship comes alongside only when the harbormaster
 * has given her the berth, and leaves only once she is cleared.
 *
 * The kernel's half of the harbor. The ship (`Ship.steer`, `Ship.castOff`)
 * asks the landing she is coming to or leaving through this protocol and
 * nothing else — the book, its criteria and its rates are whoever composes
 * it (the transport pack's `HarborQuay`, which asks its `Harbor`). A
 * river's public landing (`Quay`, `Shore`) does not compose it and keeps
 * first-come: any ship may lie there and go.
 *
 * ⛔ The harbor detains the SHIP, never the people: nothing here is asked
 * when somebody goes ashore or comes aboard.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface BerthKeeper {
  /**
   * ⭐ May `ship` come alongside here now? `null` when she may; otherwise
   * why not, in the words her master is told (*"Hail the harbor office
   * first"*). Asked before her course is laid, so a refusal is instant.
   */
  admit(ship: Stuff, nowS: number): Promise<string | null>;
  /** She has made fast here: her time alongside starts. */
  madeFast(ship: Stuff, nowS: number): Promise<void>;
  /** May `ship` leave? `null` when she is cleared; otherwise why not. */
  clearance(ship: Stuff, nowS: number): Promise<string | null>;
  /** She has cast off: the berth is free. */
  release(ship: Stuff, nowS: number): Promise<void>;
  /** How deep the water lies at the berth, m (a mud berth), or `null` when nobody says. */
  berthDepthM(): number | null;
}

export function BerthKeeperMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class BerthKeeperMixin extends Base implements BerthKeeper {
    static _mixinName: string = 'BerthKeeperMixin';

    /** @hook Override: the keeper's criteria. Default: any ship may come. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async admit(_ship: Stuff, _nowS: number): Promise<string | null> {
      return null;
    }

    /** @hook Override: the book's entry. Default: nothing kept. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async madeFast(_ship: Stuff, _nowS: number): Promise<void> {
      return;
    }

    /** @hook Override: what must be settled first. Default: nothing. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async clearance(_ship: Stuff, _nowS: number): Promise<string | null> {
      return null;
    }

    /** @hook Override: the book's entry closed. Default: nothing kept. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async release(_ship: Stuff, _nowS: number): Promise<void> {
      return;
    }

    /** @hook Override: the berth's depth. Default: nobody says. */
    public berthDepthM(): number | null {
      return null;
    }
  };
}
