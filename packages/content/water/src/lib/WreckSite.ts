/**
 * WreckSiteMixin — ⭐ **the water over a ship that went down**.
 *
 * A ship that sinks keeps her rooms — the wreck IS the ship, at the bottom
 * where she went down, cargo in her hold and title intact. What the water
 * owes her is a SURFACE over her and a way down to her, and that is a stop:
 * the sea's stop over her position (`SeaStop`, with a column from the
 * depth) or the river's (`ReachStop`, whose floor IS the bed). This mixin is
 * what both say about the wrecks they lie over:
 *
 * - **the record** — `wrecks`, persisted with the stop (by its position),
 *   one entry per ship: her durable handle, her name and the word her way
 *   is known by;
 * - **the way into her** — on the bed (the stop's own bed band at sea, the
 *   stop itself on a river) a way named for her (the berth rule: her name,
 *   lowercased, `the` stripped) leads onto her deck;
 * - **the way out of her** — her deck's `up` leads back to that bed, so a
 *   person still aboard when she went down swims out of her and up the
 *   column to the surface.
 *
 * Everything is re-wired whenever the stop or her deck stands again — the
 * ways are runtime, the record is not.
 *
 * ⚠ No chart knows where she lies until somebody charts her (the deferred
 * `charted` seam): a wreck is found by being over it.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { ColumnTarget } from '../idea/exits/ColumnExit';
import type ColumnExit from '../idea/exits/ColumnExit';
import type SeaPatchExit from '../idea/exits/SeaPatchExit';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';

export const WRECK_SITE_MIXIN = 'WreckSiteMixin';

/** The exit kinds the ways are cloned from (the water pack's own). */
const WRECK_WAY_KIND = '/system/water/idea/exits/sea-patch';
const COLUMN_EXIT_KIND = '/system/water/idea/exits/column';

/** One wreck lying under this water. */
export interface WreckRecord {
  /** Her handle — her identity (minted `<kind row>/<serial>`, or her row). */
  ship: string;
  /** Her name as she went down. */
  name: string;
  /** The word her way is known by (`go hesper`). */
  word: string;
  /** Her deck's row — the way's face, describable with nothing loaded. */
  deck: string;
}

/** A ship as the water asks of her, by shape (the kernel's `Voyaging` + `Structure` surface). */
export interface WreckedShip {
  getName(): string;
  getDurableHandle(): string | null;
  getTemplatePath(): string | null;
  getEntrance(): string | null;
  watchRoom(): Promise<(Stuff & Container) | null>;
}

export interface WreckSite {
  getWrecks(): WreckRecord[];
  /** ⭐ A ship has gone down under this water: recorded, and her ways wired. */
  markWreck(ship: WreckedShip): Promise<void>;
  /** Re-wire every wreck's ways — at a stand-up, at a bud. */
  wireWrecks(): Promise<void>;
  /** Install the way into each wreck on `bed`, when it has none. */
  wireWreckWaysOn(bed: Stuff & Container): Promise<void>;
}

type SiteHost = Stuff & Container & Exitable & Persistable;

export function WreckSiteMixin<TBase extends MixinConstructor<SiteHost>>(Base: TBase) {
  return class WreckSiteMixin extends Base implements WreckSite {
    static _mixinName: string = WRECK_SITE_MIXIN;

    static fieldMeta: FieldMeta = {
      wrecks: { persistent: true },
    };

    /** The wrecks lying under this water. */
    public wrecks: WreckRecord[] = [];

    public getWrecks(): WreckRecord[] {
      return this.wrecks.map((w) => ({ ...w }));
    }

    public async markWreck(ship: WreckedShip): Promise<void> {
      const handle = ship.getDurableHandle() ?? ship.getTemplatePath() ?? '';
      const deck = ship.getEntrance() ?? '';
      if (handle === '' || deck === '') return;
      if (!this.wrecks.some((w) => w.ship === handle)) {
        // ⚠ DERIVED (magic), named here: the way to her wreck is named for
        // the first word of her name.
        const word = ship.getName().replace(/^the\s+/i, '').trim().toLowerCase().split(/\s+/)[0] || 'wreck';
        this.wrecks = [...this.wrecks, { ship: handle, name: ship.getName(), word, deck }];
        const self = this as unknown as SiteHost;
        await PersistableApi.capture(self, self.getPersistenceKey() ?? undefined).catch((err) =>
          console.warn('WreckSite: the stop was not kept:', err),
        );
      }
      await this.wireWrecks();
    }

    /**
     * @hook Override: where the ways into the wrecks go, stood up — the
     *   stop's bed. Default: the stop itself (a river stop's floor IS the
     *   bed).
     */
    public async wreckBed(): Promise<(Stuff & Container) | null> {
      return this as unknown as Stuff & Container;
    }

    /**
     * @hook Override: which way of this water's column her deck's `up`
     *   leads to. Default: the stop itself (`surface`).
     */
    public wreckUpTarget(): ColumnTarget {
      return 'surface';
    }

    public async wireWrecks(): Promise<void> {
      if (this.wrecks.length === 0) return;
      const bed = await this.wreckBed();
      if (bed !== null) await this.wireWreckWaysOn(bed);
      for (const w of this.wrecks) {
        try {
          const ship = await ExpanseApi.standUpCraft(w.ship);
          const deck = ship !== null && MixinApi.isVoyaging(ship) ? await ship.watchRoom() : null;
          if (deck === null || !MixinApi.isExitable(deck) || deck.getExit('up')) continue;
          const self = this as unknown as Stuff;
          const surfacePath = self.getDurableHandle() ?? self.getTemplatePath() ?? '';
          const target = this.wreckUpTarget();
          await (deck as unknown as SiteHost).installExit<ColumnExit>(
            COLUMN_EXIT_KIND,
            { direction: 'up', source: deck as unknown as SiteHost, destinationPath: surfacePath, media: ['water'] },
            (e) => e.configureColumn(surfacePath, target, self as unknown as Stuff & Container),
          );
        } catch (err) {
          console.warn(`WreckSite: the way out of ${w.name} was not wired:`, err);
        }
      }
    }

    public async wireWreckWaysOn(bed: Stuff & Container): Promise<void> {
      if (!MixinApi.isExitable(bed)) return;
      const on = bed as unknown as SiteHost;
      for (const w of this.wrecks) {
        if (on.getExit(w.word)) continue;
        try {
          await on.installExit<SeaPatchExit>(
            WRECK_WAY_KIND,
            { direction: w.word, source: on, destinationPath: w.deck, media: ['water'] },
            (e) => e.configureSea('wreck', w.ship),
          );
        } catch (err) {
          console.warn(`WreckSite: the way into ${w.name} was not wired:`, err);
        }
      }
    }
  };
}
