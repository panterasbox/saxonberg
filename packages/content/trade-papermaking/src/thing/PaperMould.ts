/**
 * PaperMould — a wooden frame with a wire face (paper W2): dipped in the
 * vat it comes up with a wet sheet lying on the wire, and the vatman
 * COUCHES the sheet off it onto the post — a felt on the press bed — before
 * dipping again.
 *
 * ⭐ The mould affords `couch` (the act is the mould's: turn it over and
 * press it down so the sheet lets go of the wire).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';
import { Placement } from '@saxonberg/server/mud/lib/spatial/Placement';

const COUCH = ['trade/papermaking/cmd/papermaking/couch.yaml'];

/** What couching did, in words. */
export type CouchOutcome = { ok: true; line: string; sheet: Sheet } | { ok: false; reason: string; line: string };

export default class PaperMould extends PlacingMixin(Good) {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: COUCH,
    peers: COUCH,
    environment: COUCH,
  };

  /** The wet sheet on the wire, or `null`. */
  public sheetOnWire(): Sheet | null {
    return (this.getPlaced(Placement.ON).find((s) => s instanceof Sheet) as Sheet | undefined) ?? null;
  }

  /**
   * ⭐ Couch the sheet onto `post` (a press bed, a board): it lands ON it, on
   * the sheets already couched there — wet sheets of the same making stack
   * into one post.
   */
  public couchOnto(post: Stuff): CouchOutcome {
    const self = this as unknown as Stuff;
    const sheet = this.sheetOnWire();
    if (sheet === null) {
      return { ok: false, reason: 'nothing-on-wire', line: `There is no sheet on ${self.getPresentation()}. Dip it in the vat first.` };
    }
    if (!MixinApi.isPlacing(post)) {
      return { ok: false, reason: 'not-a-post', line: `You cannot couch a sheet onto ${post.getPresentation()}.` };
    }
    ContainmentApi.move(sheet, post, Placement.ON);
    return { ok: true, line: `You turn ${self.getPresentation()} over onto ${post.getPresentation()} and press it down; the wet sheet lets go of the wire.`, sheet };
  }
}
