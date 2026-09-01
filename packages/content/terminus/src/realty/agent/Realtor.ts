/**
 * Realtor — Ricky, and the two dialogue effects that make a realty
 * office more than a room with a desk in it (residences D14).
 *
 * A plat book is a subdivision's own offer sheet; there is one per
 * subdivision and no reason for a buyer to know that. The realty office
 * fronts **every** book at once — browse the lot supply of the whole
 * city from one counter — and it does so by enumerating the live books,
 * not by holding a list somebody has to maintain. A second subdivision
 * anywhere appears here with no code change; that is the acceptance.
 *
 * ⭐⭐ **The purchase fires AS THE BUYER, and that is the whole design.**
 * The dialogue substrate's intrinsic `dispatch` effect runs a command as
 * the NPC — right for a property manager granting a lease out of their
 * employer's stock, and WRONG here: a realtor does not buy your house
 * for you. So `realty-buy` opens a prompt on the BUYER's own Interactive
 * (the listing, then a confirmation), and on their yes runs
 * `title buy <lot>` as them. Their affordances, their validators, their
 * money, their ascent gate, their title. The choice is the consent, and
 * a refusal is theirs to see.
 *
 * The raw `title` verb is untouched — it stays the operator surface, and
 * works at both desks, because the venue predicate is the DESK and not
 * a room constant.
 *
 * Rentals never appear here: leasing is a landlord's act at their own
 * building (Walter, at Seznick House). A realty office sells ground.
 */

import NPC from "@saxonberg/server/mud/lib/npc/NPC";
import { PopulatesMixin } from "@saxonberg/server/mud/lib/stuff/Populates";
import {
  DialogueEffectRegistry,
  type DialogueEffectHandler,
} from "@saxonberg/server/mud/lib/npc/DialogueEffects";
import { MqlApi } from "@saxonberg/server/mud/api/mql";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { CommandApi } from "@saxonberg/server/mud/api/command";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import { PromptApi } from "@saxonberg/server/mud/api/prompt";
import { Money } from "@saxonberg/server/mud/lib/banking/Money";
import { Currency } from "@saxonberg/server/mud/lib/banking/Currency";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";

/** What the realty desk reads off a plat book — duck-typed, never imported. */
interface BookShape extends Stuff {
  getLabel(): string;
  getPriceMinor(): number;
  getAreaM2(): number;
  getLandUse(): string;
  lotExtents(): Promise<string[]>;
}

/** One unsold lot, as the office describes it. */
interface Offer {
  book: string;
  leaf: string;
  extent: string;
  priceMinor: number;
  areaM2: number;
  use: string;
}

const TOPIC = "civics.title";

export default class Realtor extends PopulatesMixin(NPC) {
  /**
   * Register the two effects once the NPC is live — the
   * `BankCounter.postRegister` shape. A live fixture in the world is
   * what makes a domain effect real; there is no module-scope
   * registration and no boot import.
   */
  override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    DialogueEffectRegistry.register("realty-list", Realtor.LIST_EFFECT);
    DialogueEffectRegistry.register("realty-buy", Realtor.BUY_EFFECT);
  }

  /** Every unsold lot in every live plat book, cheapest first. */
  static async offers(): Promise<Offer[]> {
    // MQL by class name with a duck-check — the same read `title list`
    // does, and the reason a new subdivision needs no code here.
    const books = MqlApi.resolveMany("world:[class.PlatBook]", {
      commandGiver: null,
      scope: "world",
    }).stuff.filter(
      (s): s is BookShape =>
        typeof (s as Partial<BookShape>).lotExtents === "function" &&
        typeof (s as Partial<BookShape>).getLabel === "function",
    );

    const out: Offer[] = [];
    for (const book of books) {
      for (const extent of await book.lotExtents()) {
        const record = await ParcelApi.coveringParcelOf(extent);
        if (record && record.getExtent() === extent) continue; // sold
        out.push({
          book: book.getLabel(),
          leaf: extent.slice(extent.lastIndexOf("/") + 1),
          extent,
          priceMinor: book.getPriceMinor(),
          areaM2: book.getAreaM2(),
          use: String(book.getLandUse()),
        });
      }
    }
    return out.sort((a, b) => a.priceMinor - b.priceMinor);
  }

  /** One offer, said the way a realtor says it. */
  static describe(offer: Offer): string {
    const price = Money.of(offer.priceMinor, Currency.compact()).render();
    const area = Quantity.of(offer.areaM2, "m²").tag("lot");
    return `${offer.book} ${offer.leaf} — ${area}, zoned ${offer.use}, ${price}`;
  }

  /** `realty-list` — the cross-book listing, messaged to the buyer. */
  static LIST_EFFECT: DialogueEffectHandler = {
    async apply({ npc, player }) {
      const offers = await Realtor.offers();
      if (offers.length === 0) {
        MessageApi.scene(npc)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`"Nothing on the books today," ${Mml.actor(npc)} says. "Come back when somebody subdivides."`,
          )
          .send();
        return;
      }
      const lines = offers.map((o) => `  ${Realtor.describe(o)}`);
      MessageApi.scene(player)
        .topic(TOPIC)
        .toSelf(
          Mml.text(
            `\nOn the books today:\n${lines.join("\n")}\n\nAsk about buying and I'll walk you through it.\n`,
          ),
        )
        .send();
    },
  };

  /**
   * `realty-buy` — pick a lot, confirm the price, and buy it AS
   * YOURSELF. Every gate the typed verb has still fires; the realtor
   * only saved you the walk to the plat book.
   */
  static BUY_EFFECT: DialogueEffectHandler = {
    async apply({ npc, player }) {
      const interactive = MixinApi.isHasInteractive(player)
        ? [...player.getInteractives()][0]
        : undefined;
      const offers = await Realtor.offers();
      if (offers.length === 0) {
        MessageApi.scene(npc)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`"Nothing on the books today. I'd be selling you air."`,
          )
          .send();
        return;
      }
      // No live client (an NPC-to-NPC beat, a scripted run) — say the
      // listing and stop. The purchase needs a person's yes.
      if (!interactive) {
        await Realtor.LIST_EFFECT.apply({ npc, player, effect: {} });
        return;
      }

      const picked = await PromptApi.choice(
        interactive,
        "Which lot?",
        offers
          .map((o) => ({ label: Realtor.describe(o), response: o.extent }))
          .concat([{ label: "None today", response: "" }]),
      );
      if (!picked) return;
      const offer = offers.find((o) => o.extent === picked);
      if (!offer) return;

      const price = Money.of(offer.priceMinor, Currency.compact()).render();
      const yes = await PromptApi.confirm(
        interactive,
        `Buy ${offer.book} ${offer.leaf} for ${price}?`,
        "no",
      );
      if (!yes) {
        MessageApi.scene(npc)
          .topic(TOPIC)
          .toSelf(Mml.compose`"No hurry. The ground isn't going anywhere."`)
          .send();
        return;
      }

      // ⭐ AS THE BUYER. Not `dispatch` (which runs as the NPC) — the
      // command runs with the player's own affordances, validators,
      // money and ascent gate, and refuses to THEM if it refuses.
      if (!MixinApi.isCommandGiver(player)) return;
      await CommandApi.forceCommand(player, `title buy ${offer.leaf}`);
    },
  };
}
