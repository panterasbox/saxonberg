/**
 * Stock — the general-store counter: a container fixture that holds the
 * shelf goods, prices them (via `PricedOfferMixin`, Law 1: worth on the
 * offer), and attends its customers (via `AttendantMixin`, the storefront
 * lease). One fixture, the `BankCounter` precedent (a `Vessel` that composes
 * its capability). The `buy` verb resolves this fixture as both the shelf
 * and the attend point.
 *
 * Stock is authored declaratively: `stockLines` names each line
 * (`itemTemplatePath` + `par` + optional `brandKey`), the shelf inventory is
 * `populates`-cloned into the container, and `prices` is keyed by the item
 * template path (the offer key). A buy moves one shelf item to the buyer;
 * the reset sweep (see `ResettableMixin`) tops each line back to `par`.
 */

import { Vessel } from "../lib/stuff/Vessel";
import { DetailedMixin } from "../lib/description/Detailed";
import { PricedOfferMixin } from "../lib/commerce/PricedOffer";
import { AttendantMixin } from "../lib/attendant/Attendant";
import { ResettableMixin } from "../lib/residency/Resettable";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { MqlApi } from "../api/mql";
import { ContainmentApi } from "../api/containment";
import { MixinApi } from "../api/mixin";
import { StuffApi } from "../api/stuff";
import type { CommandContext, CommandContributions } from "../api/command";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type { Containable } from "../lib/spatial/Containable";
import type { FieldMeta } from "../lib/mixin";

/** One authored stock line: what to shelve, how deep, and any brand. */
export interface StockLine {
  /** The good's clone-source template path (the offer key too). */
  itemTemplatePath: string;
  /** The target shelf depth the reset sweep tops back up to. */
  par: number;
  /** Optional brand key (an independent shelf mark). */
  brandKey?: string;
}

const StockBase = ResettableMixin(
  AttendantMixin(PricedOfferMixin(DetailedMixin(PostRegistrationMixin(Vessel)))),
);

export default class Stock extends StockBase {
  static fieldMeta: FieldMeta = {
    stockLines: { persistent: true, authorable: true },
  };

  /** Boot-stock the shelf to par (then the reset sweep maintains it). */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    await this.reset();
  }

  /** The authored stock lines (what the store carries). */
  public stockLines: StockLine[] = [];

  /**
   * Resolve the store counter a `buy` command works off: the affording
   * fixture itself, or a `Stock` reachable from the giver (the `Menu`
   * precedent).
   */
  static resolveIn(context: CommandContext): Stock | null {
    const source = context.commandSource;
    if (source instanceof Stock) return source;
    const peers = MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    });
    return peers.stuff.find((s): s is Stock => s instanceof Stock) ?? null;
  }

  static commandContributions: CommandContributions = {
    self: [],
    peers: ["retail/buy.yaml"],
    environment: ["retail/buy.yaml"],
  };

  /** The buyable goods currently on the shelf. */
  offeredItems(): (Stuff & Containable)[] {
    return (this as unknown as Stuff & Container).getContents();
  }

  /** Resolve a shelf good by keyword, or null. */
  resolveBuy(keyword: string): (Stuff & Containable) | null {
    for (const item of this.offeredItems()) {
      if (MixinApi.isPerceptible(item) && item.hasKeyword(keyword)) {
        return item;
      }
    }
    return null;
  }

  /** The authored par depth for a line (by item template path). */
  parFor(itemTemplatePath: string): number {
    return (
      this.stockLines.find((l) => l.itemTemplatePath === itemTemplatePath)
        ?.par ?? 0
    );
  }

  /** The shelf count currently on hand for a line (by item template path). */
  onHand(itemTemplatePath: string): number {
    let n = 0;
    for (const item of this.offeredItems()) {
      if (item.getTemplatePath() === itemTemplatePath) n++;
    }
    return n;
  }

  /**
   * Reset (repop): top each stock line back to its authored par by cloning
   * fresh goods from the line's template into the shelf. Notional restock —
   * items, never money (Law 2). The shelf clones are author-owned until
   * bought (they resolve via the chattel author fallback).
   */
  override async reset(): Promise<void> {
    for (const line of this.stockLines) {
      const need = line.par - this.onHand(line.itemTemplatePath);
      for (let i = 0; i < need; i++) {
        const item = await StuffApi.clone<Stuff & Containable>(
          line.itemTemplatePath,
        );
        ContainmentApi.move(item, this as unknown as Stuff & Container);
      }
    }
  }

  /** The shop restocks while browsed — repop-ing a watched room is fine. */
  override resetsWhilePresent(): boolean {
    return true;
  }

  override getLong(): string {
    const base = super.getLong();
    const lines = this.stockLines
      .map((l) => {
        const price = this.priceFor(l.itemTemplatePath);
        const name = l.itemTemplatePath.split("/").pop() ?? l.itemTemplatePath;
        return price != null ? `${name} (${price})` : name;
      })
      .join(", ");
    return lines.length > 0 ? `${base} On the shelves: ${lines}.` : base;
  }
}
