/**
 * TitleTransferController — `title transfer <parcel> to <player>` (the flat
 * `transfer` verb until controllers-are-io W8 — the parcel registry's book
 * is the title's, and a ship's title is shares in her register, so both
 * forms stay one subcommand). Moves a parcel title to another player under
 * **bilateral consent** (the receiver must accept, because a title carries
 * liability).
 *
 * Flow: resolve the parcel by path (longest-prefix covering) → gate to the
 * current owner via `AccessApi.canMutateZone` (refuse a non-owner giver) →
 * resolve the receiver (an online Avatar) → ask the receiver to accept via
 * `PromptApi.confirm` on their Interactive (decline/timeout → abort) → on
 * accept, `ParcelApi.transfer(extent, {kind:'player', …})`, which appends a
 * `transfer` chain-of-title event (from = current owner, actor from
 * context) before updating the current-state row — never a destructive
 * overwrite. Title-only; `sell` (payment-coupled) is deferred.
 *
 * ⭐ **A ship's shares** are the verb's second
 * form, read off the parcel phrase (`<n> shares of <ship>`). A ship is
 * owned by her company, and her shares are the units of its cap table
 * (`CapTableMixin`): the verb finds her in the register, the register
 * names her owning company, and the units move on THAT table.
 *
 *   - `title transfer <n> shares of <ship> from <holder> for <price>` — run by
 *     the BUYER (the money primitive pays from the acting principal, so the
 *     buyer is the one who acts); the holder confirms on their own
 *     Interactive; on yes the table's one sale act moves the units and the
 *     money together, or neither (`CapTable.sellUnits`).
 *   - `title transfer <n> shares of <ship> to <person>` — a GIFT by the holder:
 *     title only, the receiver's consent, the parcel flow's shape.
 *
 * Under the table's `consent` term every other holder is asked too, and
 * one who cannot be asked (offline, or an organization) holds the move
 * up. Nobody but a holder can be the `from`; the table refuses the rest.
 * This controller only asks and says: the table decides.
 *
 * ⭐ **Which register**: the one kept by the government whose
 * law runs where the act is done (`GovernmentApi.subjectTo` of the room —
 * aboard, the flag state's). A bill of sale is made under the flag she is
 * entered under; nothing walks every register looking for her name.
 */

import { TitleControllerBase, type TitleModel } from "./TitleControllerBase";
import type { CommandContext } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { AccessApi } from "../../../../api/access";
import { ParcelApi } from "../../../../api/parcel";
import { PlayerApi } from "../../../../api/player";
import { PromptApi } from "../../../../api/prompt";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { GovernmentApi } from "../../../../api/government";
import { BankingApi, Money } from "../../../../api/banking";
import { ExpanseApi } from "../../../../api/expanse";
import Ship from "../../Ship";
import ShipRegister, { type ShipEntry } from "../../ShipRegister";
import type { CapTable, CapTableResult, UnitHolder } from "../../../../lib/employment/CapTable";

const TOPIC = "shell.result";

/** `16 shares of the gull` — the register's form of the verb. */
const SHARES_PHRASE = /^(\d+)\s+shares?\s+(?:of|in)\s+(.+)$/i;

interface TransferModel extends TitleModel {
  parcel?: string;
  recipient?: MqlOneResult | string;
  /** Shares bought: whose they are. */
  holder?: MqlOneResult | string;
  /** Shares bought: what the buyer pays for them. */
  price?: string;
  /** Group-recipient widening (sandbox build): a managed-group NAME. */
  group?: string;
}

export default class TitleTransferController extends TitleControllerBase<TransferModel> {
  async execute(model: TransferModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;

    const parcelPath = (model.parcel ?? "").trim();
    // ⭐ `<n> shares of <ship>` — the register's form, not a parcel.
    const shares = SHARES_PHRASE.exec(parcelPath);
    if (shares) {
      return this.transferShares(model, context, Number(shares[1]), shares[2]!.trim());
    }
    if (!parcelPath) {
      return this.fail(
        context,
        "Name the parcel to transfer (by its path).",
        "no-parcel",
      );
    }
    // ⭐ `for <price>` is the sale (controller-liquidity W7c); a parcel's
    // title moves here as title only — land is sold off the plat book.
    if (model.price !== undefined) {
      return this.fail(context, "A parcel's title is handed over here, not sold — land is sold at the plat book.", "no-sale");
    }
    const parcel = await ParcelApi.coveringParcelOf(parcelPath);
    if (!parcel) {
      return this.fail(
        context,
        `No parcel covers ${parcelPath}.`,
        "no-parcel",
      );
    }

    const parcelZone = await this.resolveZone(parcel.getZonePath());
    if (!parcelZone || !(await AccessApi.canMutateZone(giver, parcelZone))) {
      return this.fail(
        context,
        `You don't own ${parcel.getExtent()}.`,
        "not-owner",
      );
    }

    // GROUP recipient (sandbox build, the ONE widening): a group has no
    // avatar to say yes — the governor's act IS the acceptance, and the
    // chain-of-title entry records it. The membership-vs-consent
    // asymmetry is deliberate: pushing a title onto a PERSON needs
    // their yes; granting one to a GROUP is a governance act the giver
    // already holds the authority for (the canMutateZone gate above).
    if (model.group) {
      const groupName = model.group.trim();
      if (!groupName) {
        return this.fail(context, "Transfer to which group?", "no-receiver");
      }
      const owner = { kind: "group" as const, name: groupName };
      const ref = await ParcelApi.resolveOwnerRef(owner);
      if (!ref) {
        return this.fail(
          context,
          `No managed group named '${groupName}'.`,
          "no-receiver",
        );
      }
      await ParcelApi.transfer(parcel.getExtent(), { ...owner, ref });
      this.send(
        context,
        Mml.compose`\nTransferred the title to ${parcel.getExtent()} to the ${groupName} group.\n`,
      );
      return;
    }

    const resolved =
      model.recipient && typeof model.recipient === "object"
        ? (model.recipient as MqlOneResult)
        : null;
    const receiver = resolved?.stuff ?? null;
    if (!receiver || !PlayerApi.isAvatarStuff(receiver)) {
      return this.fail(context, "Transfer a title to whom?", "no-receiver");
    }
    if (receiver === giver) {
      return this.fail(
        context,
        "You already hold that title.",
        "self-transfer",
      );
    }
    // ⚠ The PERSON (`getIdentityPath()`): every player shares one lineage,
    // so a title keyed on the template path was every player's
    // (controller-liquidity D11; `AccessRegistry.subjectOwnsAsPlayer`
    // compares against the identity).
    const receiverPath = receiver.getIdentityPath();
    if (!receiverPath) {
      return this.fail(
        context,
        "That player has no durable identity to hold a title.",
        "no-identity",
      );
    }

    // Bilateral consent — the receiver must accept on their own Interactive.
    const interactive = MixinApi.isHasInteractive(receiver)
      ? [...receiver.getInteractives()][0]
      : undefined;
    if (!interactive) {
      return this.fail(
        context,
        `${receiver.getPresentation()} must be online to accept a title.`,
        "receiver-offline",
      );
    }

    const accepted = await interactive.promptConfirm(
      `Accept title to ${parcel.getExtent()}? It carries liability.`,
      "no",
    );
    if (!accepted) {
      return this.fail(
        context,
        `${receiver.getPresentation()} declined the title to ${parcel.getExtent()}.`,
        "declined",
      );
    }

    await ParcelApi.transfer(parcel.getExtent(), {
      kind: "player",
      templatePath: receiverPath,
    });
    this.send(
      context,
      Mml.compose`\nTransferred the title to ${parcel.getExtent()} to ${receiver.getPresentation()}.\n`,
    );
  }

  /**
   * ⭐ Shares of a ship change hands: bought from a
   * holder (`from … for …`, the buyer acting, the holder consenting) or
   * given by one (`to …`, the receiver consenting) — on her company's table.
   */
  private async transferShares(
    model: TransferModel,
    context: CommandContext,
    n: number,
    shipName: string,
  ): Promise<void> {
    const giver = context.commandGiver as Stuff;
    const found = await this.entryHere(context, shipName);
    if (found === null) {
      return this.fail(context, `No register kept here has a ship named ${shipName.replace(/^the\s+/i, "")}.`, "no-such-ship");
    }
    const { entry, ship, table } = found;
    if (table === null) {
      return this.fail(context, `The ${entry.name} has no company with a table of owners — nobody holds her shares.`, "no-table");
    }
    const self = giver.getIdentityPath() ?? "";
    if (self === "") return this.fail(context, "You have no durable identity to hold a share.", "no-identity");
    const person = (ref: MqlOneResult | string | undefined): Stuff | null =>
      ref && typeof ref === "object" ? (ref as MqlOneResult).stuff ?? null : null;
    const holderOf = (who: Stuff, path: string): UnitHolder => ({ kind: "player", path, name: who.getPresentation() });

    // ⭐ `for <price>` is the sale (controller-liquidity W7c): the giver
    // buys from the holder named by `from`; without a price it is a gift.
    if (model.price !== undefined) {
      // ── bought: the giver is the buyer; the holder is asked ──
      const holder = person(model.holder);
      if (holder === null) return this.fail(context, "Bought from whom? `from <holder> for <price>`.", "no-holder");
      const price = Number(model.price.trim());
      if (!Number.isInteger(price) || price < 0) {
        return this.fail(context, "Name your price in whole coin — `for 40`.", "bad-price");
      }
      if (holder === giver) return this.fail(context, "They are your own shares.", "self-transfer");
      const seller = holderOf(holder, holder.getIdentityPath() ?? "");
      const buyer = holderOf(giver, self);
      const held = table.unitsHeldBy(seller);
      if (held < n) {
        return this.fail(
          context,
          held === 0
            ? `${holder.getPresentation()} holds none of the ${entry.name}'s shares.`
            : `${holder.getPresentation()} holds only ${held} of the ${entry.name}'s shares.`,
          "not-a-holder",
        );
      }
      const accepted = await this.ask(holder, `Sell ${n} of your shares in the ${entry.name} to ${giver.getPresentation()} for ${price}?`);
      if (accepted === null) return this.fail(context, `${holder.getPresentation()} must be online to sell shares.`, "holder-offline");
      if (!accepted) return this.fail(context, `${holder.getPresentation()} will not sell.`, "declined");
      const consented = await this.consents(context, table, seller, `${seller.name} sells ${n} shares in the ${entry.name} to ${buyer.name} for ${price}. Do you consent?`);
      if (consented === null) return;
      const moved = await table.sellUnits({
        seller,
        buyer,
        units: n,
        priceMinor: price,
        reason: `${n} shares of the ${entry.name}`,
        consentedBy: consented,
      });
      if (!moved.ok) return this.refused(context, moved);
      await ship?.refreshOwners();
      this.send(context, Mml.compose`\nYou buy ${String(n)} of the ${entry.name}'s shares from ${Mml.actor(holder)} for ${Money.of(price, BankingApi.compactCurrency()).render()}. ${this.ownersWords(moved)}\n`);
      this.tellOther(holder, `${giver.getPresentation()} buys ${n} of your shares in the ${entry.name} for ${price}.`);
      return;
    }

    if (person(model.holder) !== null) {
      return this.fail(context, "Name your price in whole coin — `for 40`.", "bad-price");
    }
    const receiver = person(model.recipient);
    if (receiver === null || !PlayerApi.isAvatarStuff(receiver)) {
      return this.fail(context, "Shares to whom — or from whom, and for what?", "no-receiver");
    }
    if (receiver === giver) return this.fail(context, "They are already yours.", "self-transfer");
    // ── given: the giver is the holder; the receiver is asked ──
    const from = holderOf(giver, self);
    const to = holderOf(receiver, receiver.getIdentityPath() ?? "");
    const held = table.unitsHeldBy(from);
    if (held < n) {
      return this.fail(
        context,
        held === 0 ? `You hold none of the ${entry.name}'s shares.` : `You hold only ${held} of the ${entry.name}'s shares.`,
        "not-a-holder",
      );
    }
    const accepted = await this.ask(receiver, `Accept ${n} shares in the ${entry.name} from ${giver.getPresentation()}?`);
    if (accepted === null) return this.fail(context, `${receiver.getPresentation()} must be online to accept shares.`, "receiver-offline");
    if (!accepted) return this.fail(context, `${receiver.getPresentation()} declined the shares.`, "declined");
    const consented = await this.consents(context, table, from, `${from.name} gives ${n} shares in the ${entry.name} to ${to.name}. Do you consent?`);
    if (consented === null) return;
    const moved = await table.giveUnits({ from, to, units: n, consentedBy: consented });
    if (!moved.ok) return this.refused(context, moved);
    await ship?.refreshOwners();
    this.send(context, Mml.compose`\nYou give ${String(n)} of the ${entry.name}'s shares to ${Mml.actor(receiver)}. ${this.ownersWords(moved)}\n`);
    this.tellOther(receiver, `${giver.getPresentation()} gives you ${n} shares in the ${entry.name}.`);
  }

  /**
   * Under the table's `consent` term, ask every other holder — the ones
   * the table names. `null` (said) when one will not, or cannot be asked
   * (offline; an organization has nobody to ask here). `[]` under `free`.
   */
  private async consents(
    context: CommandContext,
    table: Stuff & CapTable,
    from: UnitHolder,
    question: string,
  ): Promise<UnitHolder[] | null> {
    const out: UnitHolder[] = [];
    for (const h of table.consentNeededFrom(from)) {
      const who = h.kind === "player" ? StuffApi.findByIdentityPath<Stuff>(h.path).find((x) => !x.isDestroyed()) ?? null : null;
      const yes = who === null ? null : await this.ask(who, question);
      if (yes === null) {
        this.fail(context, `Her shares move only with every holder's consent, and ${h.name ?? h.path} cannot be asked just now.`, "needs-consent");
        return null;
      }
      if (!yes) {
        this.fail(context, `${h.name ?? h.path} does not consent.`, "declined");
        return null;
      }
      out.push(h);
    }
    return out;
  }

  /** Ask `who` on their own Interactive; `null` when they have none (offline). */
  private async ask(who: Stuff, label: string): Promise<boolean | null> {
    const interactive = MixinApi.isHasInteractive(who) ? [...who.getInteractives()][0] : undefined;
    if (!interactive) return null;
    try {
      return await interactive.promptConfirm(label, "no");
    } catch {
      return false;
    }
  }

  /**
   * The register kept where this act is done, the ship entered in it under
   * `shipName`, and her company's table — the governments over the
   * giver's room, nearest first, each asked by the register it names
   * (`Government.shipRegister`); then the ship by her handle (stood up if
   * she sleeps), who stands up her company. `null` when none of them has
   * her.
   */
  private async entryHere(
    context: CommandContext,
    shipName: string,
  ): Promise<{ entry: ShipEntry; ship: Ship | null; table: (Stuff & CapTable) | null } | null> {
    const scope = context.location;
    if (!scope) return null;
    for (const g of await GovernmentApi.subjectTo(scope)) {
      if (!g.shipRegister) continue;
      const register = await StuffApi.singleton<Stuff>(g.shipRegister).catch(() => null);
      if (!(register instanceof ShipRegister)) continue;
      const entry = await register.entryNamed(shipName);
      if (entry === null) continue;
      const craft = await ExpanseApi.standUpCraft(entry.key);
      const ship = craft instanceof Ship ? craft : null;
      const table = ship === null ? null : await ship.company();
      // ⚠ The company the register names is the title: a ship whose own
      // company is another is not to be traded through this entry.
      if (table !== null && table.getIdentityPath() !== entry.owner) {
        console.warn(`TitleTransferController: the ${entry.name}'s register names '${entry.owner}', her company is '${table.getIdentityPath()}'`);
        return { entry, ship, table: null };
      }
      return { entry, ship, table };
    }
    return null;
  }

  /** A refusal from the table, said and noted. */
  private refused(context: CommandContext, result: CapTableResult & { ok: false }): void {
    this.fail(context, result.reason, result.code);
  }

  /** *Her owners now: …* */
  private ownersWords(result: CapTableResult & { ok: true }): string {
    const parts = result.rows.map((x) => `${x.holder.name ?? x.holder.path.split("/").pop() ?? x.holder.path} ${x.units}`);
    return `Her company's owners now: ${parts.join(", ")}.`;
  }

  private tellOther(who: Stuff, text: string): void {
    try {
      MessageApi.scene(who).topic(TOPIC).toSelf(Mml.compose`${text}`).send();
    } catch {
      // decoration
    }
  }
}
