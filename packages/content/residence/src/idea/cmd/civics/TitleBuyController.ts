/**
 * TitleBuyController — `title buy <lot>`: the land sale, the whole
 * transaction.
 *
 * ## Why a verb of its own, and not `buy`
 *
 * `buy` is retail: it hands over an ITEM off a `PricedOffer` and
 * chattel-stamps it. Land is real property on a different registry
 * (`parcel.md` vs `chattel.md`), so routing it through `buy` would mean
 * a lot behaving like stock on a shelf.
 *
 * And it is deliberately NOT a verb conferred by the Registry counter.
 * The shipped rule is that a commerce object affords only its COMMERCE
 * verbs, and working verbs ride the instrument — so hanging a bespoke
 * land-sale verb off a piece of furniture would be the venue antipattern.
 * `title` is the diegetic word, and one dispatch verb with subcommands is
 * the house pattern (`government`, `office`, `bank`).
 *
 * ## The sale is the book's

`PlatBook.sell(extent, buyer, desk)` is the whole transaction, check-then-act:
every refusal (sold, identity, the ascent gate, the district owner, the
registry's area/zoning checks) before the money leg, the money before any
write, the ground best-effort after the title (controller-liquidity W13,
C1 — this verb used to settle, then let `subdivide` throw). This
controller finds the book that offers the lot and tells the answer.

## It knows no locality

The subdivisions are content: which lots exist, what they cost, how big
they are, what stands on one, what use it is stamped with — all authored
on the plat book and its `PlatWarren`. A second subdivision anywhere in
the world is a seed file and no change here. The venue is the DESK
(residences P6), bound off the view.

⚠ Inside a sandbox circle this whole path is refused twice over —
`subdivide` and `transfer` both carry `assertFieldMutation`, and the
`parcels` collection is REFUSE in the PM policy table. A title minted in
a holodeck would be a real title.
 */

import { TitleBookControllerBase, type TitleBookModel } from './TitleBookControllerBase';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Money } from '@saxonberg/server/mud/lib/banking/Money';
import type PlatBook from '../../PlatBook';
import type { SaleAnswer } from '../../PlatBook';

const TOPIC = 'act.deed';

export default class TitleBuyController extends TitleBookControllerBase {
  async execute(model: TitleBookModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const desk = this.deskOf(model, context, 'buy');
    if (!desk) return;

    // Which subdivision sells it? The desk names its books; this
    // controller knows none of them by name.
    const raw = model.lot ?? '';
    let book: PlatBook | null = null;
    let extent: string | null = null;
    for (const b of await this.booksAt(desk)) {
      const candidate = b.extentFor(raw);
      if (candidate) {
        book = b;
        extent = candidate;
        break;
      }
    }
    if (!book || !extent) {
      this.reject(
        context,
        Mml.compose`No such lot. Ask for the plat book with \`title list\`.`,
        'unknown-lot',
        `'${raw}' is in no plat book`,
      );
      return;
    }

    const answer = await book.sell(extent, giver, desk);
    if (!answer.ok) {
      this.reject(context, TitleBuyController.refusalWords(answer), answer.reason, answer.detail);
      return;
    }

    const leaf = extent.slice(extent.lastIndexOf('/') + 1);
    const where = book.getLabel();
    // Which side of the road it is on — the gate is a compass point, so the
    // deed has to say which.
    const gate = answer.gateSide ? ` The gate is on the ${answer.gateSide} side.` : '';

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        answer.firstTime
          ? Mml.compose`The registrar writes the row, blots it, and turns the book around for you to see. ${leaf} in ${where} is yours.${gate}`
          : Mml.compose`The registrar writes the row and turns the book around. ${leaf} in ${where} is yours again.${gate}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} buys a lot in ${where}.`)
      .send();
  }

  /** What the registrar says to a refused sale. */
  protected static refusalWords(answer: Extract<SaleAnswer, { ok: false }>): Mml {
    switch (answer.reason) {
      case 'already-sold':
        return Mml.compose`That lot has already been sold.`;
      case 'no-durable-identity':
        return Mml.compose`The registrar cannot find you in the book at all.`;
      case 'ascent-condition':
        return Mml.compose`The registrar looks over your record and shakes their head: the home you already hold (${answer.ascent?.leaf ?? ''}) is ${answer.ascent?.band ?? ''}. Put your own house in order first.`;
      case 'no-district-owner':
        return Mml.compose`The district has no owner of record to subdivide under.`;
      case 'zoning':
        return Mml.compose`The registrar checks the survey and will not write it: that lot does not fit the district's plan.`;
      case 'insufficient-funds':
        return Mml.compose`You can't cover ${Money.of(answer.priceMinor, BankingApi.compactCurrency()).render()} for that lot.`;
      case 'unknown-lot':
        return Mml.compose`No such lot. Ask for the plat book with \`title list\`.`;
    }
  }
}
