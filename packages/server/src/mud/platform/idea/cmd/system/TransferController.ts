/**
 * TransferController — the `transfer <parcel> to <player>` verb (the
 * `system` category). Moves a parcel title to another player under
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
 * ⭐ **A ship's shares** (harbors P15) are the verb's second form, read off
 * the parcel phrase (`<n> shares of <ship>`):
 *
 *   - `transfer <n> shares of <ship> from <holder> for <price>` — run by
 *     the BUYER (the money primitive pays from the acting principal, so the
 *     buyer is the one who acts); the holder confirms on their own
 *     Interactive; on yes the shares move in the register and the buyer's
 *     payment settles to the holder's account — and if the payment fails,
 *     the shares move back. Money and shares together, or neither.
 *   - `transfer <n> shares of <ship> to <person>` — a GIFT by the holder:
 *     title only, the receiver's consent, the parcel flow's shape.
 *
 * Nobody but a holder can be the `from`; the register refuses the rest.
 *
 * ⭐ **Which register** (review 1): the one kept by the government whose
 * law runs where the act is done (`GovernmentApi.subjectTo` of the room —
 * aboard, the flag state's). A bill of sale is lodged with the register
 * that keeps her, so it is made under that flag; nothing walks every
 * register looking for her name.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { AccessApi } from "../../../../api/access";
import { ParcelApi } from "../../../../api/parcel";
import { PlayerApi } from "../../../../api/player";
import { PromptApi } from "../../../../api/prompt";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import { Zone } from "../../../../lib/zone/Zone";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { GovernmentApi } from "../../../../api/government";
import { BankingApi, Money } from "../../../../api/banking";
import Ship from "../../Ship";
import ShipRegister, { SHARES_PER_SHIP, type ShipEntry } from "../../ShipRegister";

const TOPIC = "shell.result";

/** `16 shares of the gull` — the register's form of the verb (harbors P15). */
const SHARES_PHRASE = /^(\d+)\s+shares?\s+(?:of|in)\s+(.+)$/i;

interface TransferModel extends CommandModel {
  parcel?: string;
  recipient?: MqlOneResult | string;
  /** Shares bought: whose they are (harbors P15). */
  holder?: MqlOneResult | string;
  /** Shares bought: what the buyer pays for them. */
  price?: string;
  /** Group-recipient widening (sandbox build): a managed-group NAME. */
  group?: string;
}

export default class TransferController extends CommandController<TransferModel> {
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
    const receiverPath = receiver.getTemplatePath();
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
   * ⭐ Shares of a ship change hands (harbors P15): bought from a holder
   * (`from … for …`, the buyer acting, the holder consenting) or given by
   * one (`to …`, the receiver consenting).
   */
  private async transferShares(
    model: TransferModel,
    context: CommandContext,
    n: number,
    shipName: string,
  ): Promise<void> {
    const giver = context.commandGiver as Stuff;
    if (!Number.isInteger(n) || n <= 0 || n > SHARES_PER_SHIP) {
      return this.fail(context, `A share is a sixty-fourth of her: name a whole number from 1 to ${SHARES_PER_SHIP}.`, "bad-share-count");
    }
    const found = await this.entryHere(context, shipName);
    if (found === null) {
      return this.fail(context, `No register kept here has a ship named ${shipName.replace(/^the\s+/i, "")}.`, "no-such-ship");
    }
    const { register, entry } = found;
    const self = giver.getIdentityPath() ?? "";
    if (self === "") return this.fail(context, "You have no durable identity to hold a share.", "no-identity");
    const person = (ref: MqlOneResult | string | undefined): Stuff | null =>
      ref && typeof ref === "object" ? (ref as MqlOneResult).stuff ?? null : null;

    const holder = person(model.holder);
    if (holder !== null) {
      // ── bought: the giver is the buyer; the holder is asked ──
      const price = Number((model.price ?? "").trim());
      if (!Number.isInteger(price) || price < 0) {
        return this.fail(context, "Name your price in whole coin — `for 40`.", "bad-price");
      }
      if (holder === giver) return this.fail(context, "They are your own shares.", "self-transfer");
      const from = holder.getIdentityPath() ?? "";
      const held = entry.shares.find((h) => h.holder.kind === "player" && h.holder.path === from)?.shares ?? 0;
      if (held < n) {
        return this.fail(
          context,
          held === 0
            ? `${holder.getPresentation()} holds none of the ${entry.name}'s shares.`
            : `${holder.getPresentation()} holds only ${held} of the ${entry.name}'s shares.`,
          "not-a-holder",
        );
      }
      const sellerAccount = await BankingApi.primaryAccountIdOf(from);
      if (price > 0 && !sellerAccount) {
        return this.fail(context, `${holder.getPresentation()} has no account to be paid into.`, "seller-no-account");
      }
      const accepted = await this.ask(holder, `Sell ${n} of your shares in the ${entry.name} to ${giver.getPresentation()} for ${price}?`);
      if (accepted === null) return this.fail(context, `${holder.getPresentation()} must be online to sell shares.`, "holder-offline");
      if (!accepted) return this.fail(context, `${holder.getPresentation()} will not sell.`, "declined");
      const seller = { kind: "player" as const, path: from, name: holder.getPresentation() };
      const buyer = { kind: "player" as const, path: self, name: giver.getPresentation() };
      const moved = await register.transferShares(entry.name, seller, buyer, n);
      if (!moved.ok) return this.fail(context, moved.reason, "register-refused");
      if (price > 0) {
        try {
          await BankingApi.settle(
            {
              amount: Money.of(price, BankingApi.compactCurrency()),
              reason: `${n} shares of the ${entry.name}`,
              presented: false,
              payeeAccountId: sellerAccount!,
              category: "transfer",
            },
            { kind: "credential" },
          );
        } catch (err) {
          // ⭐ Money and shares together or neither: the shares go back.
          const back = await register.transferShares(entry.name, buyer, seller, n);
          if (!back.ok) console.error(`TransferController: ${n} shares of ${entry.key} moved but were not paid for and could not move back — ${back.reason}`);
          return this.fail(
            context,
            `Your payment did not clear (${err instanceof Error ? err.message : String(err)}); the shares stay ${holder.getPresentation()}'s.`,
            "unpaid",
          );
        }
      }
      await this.refreshShip(entry.key);
      this.send(context, Mml.compose`\nYou buy ${String(n)} of the ${entry.name}'s shares from ${Mml.actor(holder)} for ${Money.of(price, BankingApi.compactCurrency()).render()}. ${this.ownersWords(moved.entry.shares)}\n`);
      this.tellOther(holder, `${giver.getPresentation()} buys ${n} of your shares in the ${entry.name} for ${price}.`);
      return;
    }

    const receiver = person(model.recipient);
    if (receiver === null || !PlayerApi.isAvatarStuff(receiver)) {
      return this.fail(context, "Shares to whom — or from whom, and for what?", "no-receiver");
    }
    if (receiver === giver) return this.fail(context, "They are already yours.", "self-transfer");
    // ── given: the giver is the holder; the receiver is asked ──
    const held = entry.shares.find((h) => h.holder.kind === "player" && h.holder.path === self)?.shares ?? 0;
    if (held < n) {
      return this.fail(
        context,
        held === 0 ? `You hold none of the ${entry.name}'s shares.` : `You hold only ${held} of the ${entry.name}'s shares.`,
        "not-a-holder",
      );
    }
    const to = receiver.getIdentityPath() ?? "";
    const accepted = await this.ask(receiver, `Accept ${n} shares in the ${entry.name} from ${giver.getPresentation()}?`);
    if (accepted === null) return this.fail(context, `${receiver.getPresentation()} must be online to accept shares.`, "receiver-offline");
    if (!accepted) return this.fail(context, `${receiver.getPresentation()} declined the shares.`, "declined");
    const moved = await register.transferShares(
      entry.name,
      { kind: "player", path: self, name: giver.getPresentation() },
      { kind: "player", path: to, name: receiver.getPresentation() },
      n,
    );
    if (!moved.ok) return this.fail(context, moved.reason, "register-refused");
    await this.refreshShip(entry.key);
    this.send(context, Mml.compose`\nYou give ${String(n)} of the ${entry.name}'s shares to ${Mml.actor(receiver)}. ${this.ownersWords(moved.entry.shares)}\n`);
    this.tellOther(receiver, `${giver.getPresentation()} gives you ${n} shares in the ${entry.name}.`);
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
   * The register kept where this act is done, and the ship entered in it
   * under `shipName` — the governments over the giver's room, nearest
   * first, each asked by the register it names (`Government.shipRegister`).
   * `null` when none of them has her.
   */
  private async entryHere(
    context: CommandContext,
    shipName: string,
  ): Promise<{ register: ShipRegister; entry: ShipEntry } | null> {
    const scope = context.location;
    if (!scope) return null;
    for (const g of await GovernmentApi.subjectTo(scope)) {
      if (!g.shipRegister) continue;
      const register = await StuffApi.singleton<Stuff>(g.shipRegister).catch(() => null);
      if (!(register instanceof ShipRegister)) continue;
      const entry = await register.entryNamed(shipName);
      if (entry !== null) return { register, entry };
    }
    return null;
  }

  /** A live ship reads her register again (who answers for her may have changed). */
  private async refreshShip(handle: string): Promise<void> {
    // A ship is filed at her handle — her identity (review 1).
    for (const live of StuffApi.findByIdentityPath<Stuff>(handle)) {
      if (live instanceof Ship && !live.isDestroyed()) await live.refreshRegistry();
    }
  }

  /** *The register now shows: …* */
  private ownersWords(shares: ReadonlyArray<{ holder: { path: string; name?: string }; shares: number }>): string {
    const parts = shares.map((h) => `${h.holder.name ?? h.holder.path.split("/").pop() ?? h.holder.path} ${h.shares}`);
    return `The register now shows: ${parts.join(", ")}.`;
  }

  private tellOther(who: Stuff, text: string): void {
    try {
      MessageApi.scene(who).topic(TOPIC).toSelf(Mml.compose`${text}`).send();
    } catch {
      // decoration
    }
  }

  /** Resolve a zone Stuff from its templatePath, or null. */
  private async resolveZone(path: string): Promise<Zone | null> {
    if (!path) return null;
    try {
      const z = await StuffApi.singleton<Stuff>(path);
      return z instanceof Zone ? z : null;
    } catch {
      return null;
    }
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: "controller-rejected", reason, detail });
  }
}
