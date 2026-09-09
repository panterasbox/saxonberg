/**
 * ⭐⭐ Tariff — **a priced list of SERVICES**, and the one kernel
 * primitive Movement IV needed.
 *
 * The `Menu`'s sibling. A `Menu` prices **recipes** (make me this) and the
 * retail `Stock` counter prices **items** (sell me that). Neither can
 * price *doing something to a thing you already have*, and that is what a
 * repair shop, a clinic and a necropolis sell.
 *
 * ⚠ **The gap this closes was total.** No shipped priced key resolved to
 * anything but a recipe or a stock line, so paying for a repair, a
 * treatment or a burial had **no path at all** — and the one paid service
 * in the whole tree (the TPA fare) was pack code rather than content. The
 * wreckage a fight leaves could not become anybody's work, which is the
 * whole of "the violent players need the non-violent ones".
 *
 * A tariff is a fixture in a room, exactly like a menu — a slate on a
 * wall, a board by the door. It composes {@link PricedOfferMixin} for the
 * price map and adds one thing: **what each priced key MEANS**, from a
 * closed kernel vocabulary. `order repair` at one smithy and `order
 * repair` at another do the same thing for different money, which is what
 * makes a competitive market for these services possible at all.
 *
 * ⭐ **A second clinic is a `Tariff` row and a `Business` row.** That is
 * the second-instance test, and it is why the vocabulary is closed and
 * the orchestration is the kernel's: a venue that could define its own
 * service kinds would need pack code, and then a second one would need
 * pack code too.
 *
 * ⚠ Not on `Business`: prices live on fixtures (retail.md), and a
 * business with two counters prices them differently.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { PricedOfferMixin } from '../../lib/commerce/PricedOffer';
import { MqlApi } from '../../api/mql';
import type { CommandContext, CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';

/**
 * ⭐ **The closed vocabulary of what a priced key can DO.** Kernel-owned
 * on purpose: the orchestration for each lives in `OrderController`, so
 * a venue authors rows and never code.
 *
 * - `repair` — mend a damaged thing the customer is carrying.
 * - `treatment` — the house treats what is wrong with the customer.
 * - `burial` — inter a corpse (the necropolis).
 *
 * ⚠⚠ **`revive` is deliberately NOT here, and the reason is doctrine
 * rather than an oversight.** A paid revival was the obvious third
 * service, and it is unbuildable as an `order`: `requiresEmbodied` names
 * *buy* as one of the embodied acts a shade loses, and its own docstring
 * says why — *"Death costs embodied agency and the price of coming back;
 * it never costs a seat as a person."* A shade cannot purchase anything.
 *
 * That leaves two routes, and **both are real design this build should
 * not decide in passing**: a third-party payer (somebody buys your
 * revival for you), which `BankingLogic.settle` cannot express because it
 * derives the payer from execution context — and letting one player
 * initiate a debit against another is a consent question in its own
 * right; or an option on the shade's own `passage`, which is the
 * mortality subsystem's decision. → mortality-slate.
 *
 * ⭐ The clinic still has a product: a wounded person walks in and buys
 * `treatment`, where the customer and the patient are the same body,
 * which is exactly the shape the payer rule allows.
 */
export const SERVICE_KINDS = ['repair', 'treatment', 'burial'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

const TariffBase = PricedOfferMixin(DetailedMixin(Thing));

export default class Tariff extends TariffBase {
  static fieldMeta: FieldMeta = {
    services: { persistent: true, authorable: true },
  };

  /**
   * Offer key → what it does. A key priced but not mapped here is
   * inert — which `lint:unconsumed-seams`' spirit says is worth catching,
   * so `OrderController` reports an unknown service by name rather than
   * silently declining.
   */
  public services: Record<string, string> = {};

  /** The commerce surface, exactly the `Menu`'s: read it, order off it. */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/retail/menu.yaml', 'platform/cmd/retail/order.yaml'],
    environment: [
      'platform/cmd/retail/menu.yaml',
      'platform/cmd/retail/order.yaml',
    ],
  };

  /** What kind of service `key` is, or null when the key is not a service. */
  public serviceFor(key: string): ServiceKind | null {
    const kind = this.services[key];
    return SERVICE_KINDS.includes(kind as ServiceKind)
      ? (kind as ServiceKind)
      : null;
  }

  /** Every priced key that names a real service. */
  public serviceKeys(): string[] {
    return this.pricedKeys().filter((k) => this.serviceFor(k) !== null);
  }

  /**
   * The tariff an `order` works off — the affording fixture, else the one
   * among the room's occupants. The `CommerceMenu.resolveIn` shape,
   * because a tariff IS a menu of a different kind and resolving it
   * differently would be a second rule to remember.
   */
  static resolveIn(context: CommandContext): Tariff | null {
    const source = context.commandSource;
    if (source instanceof Tariff) return source;
    const peers = MqlApi.resolveMany('peers', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    });
    return peers.stuff.find((s): s is Tariff => s instanceof Tariff) ?? null;
  }
}
