/**
 * PrintingMixin — an instrument that runs a document off onto paper (paper
 * D2, D17, D22): the press and the printer. What they share is the run:
 * the covenant asked first, blank sheets drawn from the instrument (or the
 * printer's hands), the pages frozen as an edition, and each copy a sheet
 * bound to it.
 *
 * ⚠ A pack `lib/` mixin — only ever inherited, by two of this pack's own
 * classes (the CLAUDE.md pack-lib rule).
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EditionTeaching } from '@saxonberg/server/mud/lib/document/Edition';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';

/** What a run did, in words. */
export type RunOutcome = { ok: true; line: string; copies: Stuff[] } | { ok: false; reason: string; line: string };

/** What a run prints. */
export interface RunRequest {
  source: string;
  title: string;
  pages: string[];
  teaches?: EditionTeaching[];
  copies: number;
  by: Stuff;
}

export interface Printing {
  runOff(req: RunRequest): Promise<RunOutcome>;
}

export function PrintingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PrintingMixin extends Base implements Printing {
    static _mixinName = 'PrintingMixin';

    /** @hook Litres of ink a printed page takes; 0 = none drawn (a printer's toner is its own). */
    protected inkPerPageL(): number {
      return 0;
    }

    /** A blank: an unbound, unwritten, dry sheet with no words on it. */
    private isBlank(s: Stuff): s is Sheet {
      return s instanceof Sheet && s.getBoundTo() === '' && s.getMarkText() === '' && !s.isWaterleaf() && !s.isPulped();
    }

    /** Blank sheets in the instrument first, else in the printer's hands. */
    private blanks(by: Stuff): Sheet[] {
      const self = this as unknown as Stuff;
      const from = (h: Stuff): Sheet[] => (MixinApi.isContainer(h) ? h.getContents().filter((c) => this.isBlank(c)) : []) as Sheet[];
      const here = from(self);
      return here.length > 0 ? here : from(by);
    }

    /** The ink to hand: a vessel of ink in the instrument, the room or the printer's hands. */
    private inkPot(by: Stuff): Stuff | null {
      const self = this as unknown as Stuff;
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      for (const h of [self, by, room]) {
        if (h === null || !MixinApi.isContainer(h)) continue;
        const pot = h.getContents().find((c) => {
          if (!MixinApi.isBulkable(c) || !c.hasInteriorBulk()) return false;
          return c.getBulkMaterial('interior')?.hasTag('ink') === true && c.getBulkAmount('interior').rawValue() > 0;
        });
        if (pot !== undefined) return pot;
      }
      return null;
    }

    public async runOff(req: RunRequest): Promise<RunOutcome> {
      const self = this as unknown as Stuff;
      // ⭐ The covenant first (D22): a medieval quarter keeps the press idle.
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (MixinApi.isTool(self) && room !== null) {
        const refused = await self.admittedAt(room);
        if (refused !== null) return { ok: false, reason: 'covenant-refuses', line: refused };
      }
      const n = Math.max(1, Math.floor(req.copies));
      const sheetsNeeded = n * req.pages.length;
      const blanks = this.blanks(req.by);
      const have = blanks.reduce((k, s) => k + s.getQuantity(), 0);
      if (have < sheetsNeeded) {
        return { ok: false, reason: 'no-paper', line: `There is paper for ${have} ${have === 1 ? 'sheet' : 'sheets'}; the run wants ${sheetsNeeded}. Put a ream in ${self.getPresentation()}.` };
      }
      const inkL = this.inkPerPageL() * sheetsNeeded;
      const pot = inkL > 0 ? this.inkPot(req.by) : null;
      if (inkL > 0 && (pot === null || !MixinApi.isBulkable(pot) || pot.getBulkAmount('interior').rawValue() + 1e-9 < inkL)) {
        return { ok: false, reason: 'no-ink', line: `There is not enough ink to hand for the run — the balls want printing ink.` };
      }
      const edition = await DocumentApi.freezeEdition({
        source: req.source,
        pages: req.pages,
        title: req.title,
        ...(req.teaches && req.teaches.length > 0 ? { teaches: req.teaches } : {}),
      });
      if (pot !== null && MixinApi.isBulkable(pot)) {
        pot.setBulkAmount('interior', Quantity.of(pot.getBulkAmount('interior').rawValue() - inkL, 'L'));
      }
      const copies: Stuff[] = [];
      for (let page = 0; page < req.pages.length; page++) {
        let left = n;
        while (left > 0) {
          const stack = blanks.find((b) => !b.isDestroyed() && b.getQuantity() > 0 && b.getBoundTo() === '');
          if (stack === undefined) break;
          const take = Math.min(left, stack.getQuantity());
          const run = (take === stack.getQuantity() ? stack : await stack.split(take)) as unknown as Sheet;
          run.bindTo(edition, page);
          if (MixinApi.isContainer(req.by)) ContainmentApi.move(run, req.by);
          copies.push(run);
          left -= take;
        }
      }
      return {
        ok: true,
        line: `${n} ${n === 1 ? 'copy' : 'copies'} of ${req.title} ${n === 1 ? 'comes' : 'come'} off ${self.getPresentation()}${req.pages.length > 1 ? `, ${req.pages.length} pages each` : ''}.`,
        copies,
      };
    }
  };
}
