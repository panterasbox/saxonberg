/**
 * ShipController — **`ship <goods> to <destination>`**, the carriage
 * verb.
 *
 * ⚠⚠ It is a NEW VERB, and that was a reversal. The requirements first
 * said *"`consign` already works there, so no new verb"*, lifted from
 * one line of the settlement model without checking what retail's
 * `consign` does. **The two acts share an English word and nothing
 * else**: `consign <thing> --ask <coin>` creates a priced listing with a
 * commission split and a consignor account paid on resale; this creates
 * a bill of lading — a destination, a custody chain, no price, no buyer.
 *
 * ⭐⭐ And the decisive objection was not tidiness. A `--to` that
 * excludes `--ask` makes ***"ship it to Rejection and sell it there"***
 * unexpressible — which is the transport spread, the arbitrage, the
 * thing this whole build exists to create. `ship` then `consign` at the
 * far end **composes**.
 *
 * Afforded by the depot counter's own `commandContributions`, never by a
 * core mixin: you can `ship` where there is a shipping desk.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import DepotCounter from '../../../thing/DepotCounter';

const TOPIC = 'act.deed';

interface ShipModel extends CommandModel {
  /** The goods — a discrete thing you are holding or can reach. */
  goods?: MqlOneResult;
  /** `to <destination>` — a place name, or a durable path. */
  destination?: string;
  /** `--worth <coin>` — the declared value, for the paper. */
  worth?: number;
}

export default class ShipController extends CommandController<ShipModel> {
  async execute(model: ShipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const desk = DepotCounter.resolveIn(context);
    if (!desk) {
      return this.fail(
        context,
        "There's no shipping desk here.",
        'no-desk',
      );
    }

    const goods = model.goods?.stuff ?? null;
    if (!goods || !MixinApi.isContainable(goods)) {
      return this.fail(
        context,
        `There's no '${model.goods?.raw ?? 'goods'}' here to send.`,
        'no-goods',
      );
    }

    // ⚠ A fungible stack cannot be consigned for carriage, for the same
    // reason it cannot be the subject of a gig: a merging stack has no
    // stable identity, so nothing could say WHICH litres arrived. Put it
    // in a crate — which is what the bill of lading is for.
    if (MixinApi.isGlobbable(goods)) {
      return this.fail(
        context,
        'Loose goods have no identity to put on a bill — crate them first, ' +
          'and the bill will say what is in the crate.',
        'fungible-goods',
      );
    }

    const raw = (model.destination ?? '').trim();
    if (raw.length === 0) {
      return this.fail(context, 'Ship it where?', 'no-destination');
    }
    const destination = AddressApi.resolvePlace(
      raw,
      giver,
      context.location?.getTemplatePath() ?? '',
    );
    if (destination.length === 0) {
      return this.fail(
        context,
        `Nobody here has heard of '${raw}'. The clerk ships to places ` +
          `by name — try the name of a town or district.`,
        'unknown-destination',
      );
    }

    const shipper = giver.getIdentityPath() ?? '';
    const out = await desk.accept({
      goods: goods as Stuff & Containable,
      destination,
      shipper,
      declaredValueMinor: Math.max(0, Math.round(Number(model.worth ?? 0))),
      via: 'ship',
    });
    if (!out.ok) {
      return this.fail(context, `They won't take it: ${out.reason}.`, 'refused');
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The clerk takes ${Mml.thing(goods)}, writes it into the book, and hands you the counterfoil. It is the carrier's problem now, and the paper says so.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} hands ${Mml.thing(goods)} over the shipping desk.`,
      )
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
