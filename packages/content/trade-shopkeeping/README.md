# trade-shopkeeping

The shopkeeper's trade, a **capability pack**: the front of house for
anybody peddling consumer goods over a counter — the general store, the
bakery's bread counter, the market stall, the cash-and-carry.

⭐ **The line this pack exists to draw.** The kernel provides
*businesses, corporations, money, an economy*. A content pack provides a
*trade*. Selling over a counter is a trade, so the counter, the shelf and
the shop's own `house` subcommands ship here — not in the kernel, where
they were until the trades-and-labor build.

- **The counter** — `Stock`, the instanceable twin. Its *mechanism* stays
  kernel substrate (`@saxonberg/server/mud/lib/retail/Stock`) because the
  kernel reads it: the price index, the credit ladder's rung 0, the wage
  engine's par read and four controllers all narrow on the base, and a
  kernel module may never import a pack. What ships here is the class a
  row names, and the verbs it affords.
- **The brokerage shelf** — `ConsignmentShelf`, custody plus a sale
  layer, for goods a consignor put up rather than the shop bought.
- **The brains** — `stocks` (the keeper who walks to the supplier and
  buys the shortfall on terms) and `consigns` (the producer's hand who
  walks their goods to a shop and lists them).
- **`house price` / `house par` / `house stock`** — the shop's three
  subcommands, contributed as stanzas on the platform's shipped `house`
  view, the way `house freight` is haulage's.
- **The stall** — the business seed a rented market stall mints from.
- **The `shop` archetype** — so a store in a new locality is authored
  with rows and no pack code.

⚠ **Attendance stays kernel.** `AttendantMixin` is the storefront queue,
and a bank counter, a ticket window and a clinic desk all attend. A shop
is a *consumer* of it, not its owner.
