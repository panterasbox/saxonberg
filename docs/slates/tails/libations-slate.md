# Libations slate — the bar's supply chain, and putting things where they go

> **Status: PARTIAL** — built 2026-08-28 (MR !206): the supply chain,
> the menu, the trade packs and the corpo re-cut →
> [crafting.md](../../subsystems/crafting.md) ·
> [retail.md](../../subsystems/retail.md)
> **Left:** metered water + power on the P&L (the supply design pack) ·
> the ice machine and the bar's first socket (the lounge's `mana-main`
> feeds the terminal, not the bar) · carbonation going flat · a glassware
> supplier · menu v2's line (dairy / egg / the blender) · the generic
> drain's remaining direction (Part 7) · ⭐ **the whiskey tails** (§ below
> — salvaged from the two whiskey plans at their sweep, 2026-10-06):
> coopering · a sherry-seasoned cask · whisky colour · `vat-malts` ·
> cask-strength and dilution · the grappa/pomace schedule
> **Size:** a tail

Seeds and neighbours: [daves-bar-slate](../builds/daves-bar-slate.md) (the
experience — this slate builds its supply half),
[supply-chain-slate](./supply-chain-slate.md) (⭐ *the magic is four
lines and the fix is a deletion*; the store is the hinge; a business
cannot buy; the martini end to end), [corpos-slate](../builds/corpos-slate.md)
(the mark + the approval vector; the roster this slate re-cuts),
[retail-slate](../builds/retail-slate.md), [content-packs-slate](../builds/content-packs-slate.md)
(*pack = a trade*; *every trade ships a showroom*; *seed backwards from
sinks*), [pack-seams-slate](./pack-seams-slate.md) (annex knows host,
never the reverse), [vocations.md](../../vocations.md) (a link exists
iff someone could make a living at it). Substrate:
[retail.md](../../subsystems/retail.md), [banking.md](../../subsystems/banking.md),
[employment.md](../../subsystems/employment.md), [crafting.md](../../subsystems/crafting.md),
[bulk.md](../../subsystems/bulk.md), [corpo.md](../../subsystems/corpo.md),
[behavior.md](../../subsystems/behavior.md), [activity.md](../../subsystems/activity.md),
[content-packs.md](../../subsystems/content-packs.md) (the capability rung).

---

> **Parts 0–9 and 11–13 shipped (MR !206, then fermentation MR !215 and logistics)** and are cut from this slate. Where each lives now: the three axes (trade = process · brand = mark · corpo = capital) and *a corpo pack is capital + the mark* → [corpo.md](../../subsystems/corpo.md); the stub trades + the drain rule → [content-packs.md](../../subsystems/content-packs.md); the distributor (independent — `distribution/idea/business.yaml` has no `parentOrganization`), consignment by an outfit's hand, the `Bottle`/`Crate` presets → [retail.md § The distributor](../../subsystems/retail.md); the house account in the wallet, `house par` / `house stock`, the `restocks` brain → [employment.md](../../subsystems/employment.md); the 24-line menu, the glass pool, technique, ice, garnish, the tap, `muddle`/`wash` → [crafting.md](../../subsystems/crafting.md); the `bar`/`cellar`/`warehouse` bundles + the `hospitality` venue archetype → [furnishing.md](../../subsystems/furnishing.md); the display substrate → [display.md](../../subsystems/display.md). Crowsfoot now DISTILS (the `cellars` brain's `distills:` on `crowsfoot-hand.yaml`) rather than standing at a floor → [maturation.md](../../subsystems/maturation.md).

## Part 7 — ⭐ Putting things where they go: the generic drain

Not this build, but named so the drain has a direction — the rest of
`generic-objects` by the same rule: `arms/` + `armor/` → the smithing
trade (what it makes) with a future armoury; `gear/{anvil,smiths-hammer}`
→ trade-smithing (already its stations' twins); `items/{cuts, logs,
rations}` → hearth-cooking / a butchery trade / forestry as each arrives;
`instrument/` → a scientific-instruments trade (the instrumentation
slate); `crop/`, `seed/`, `plant/`, `pot/`, `bed/` → farming; `clothes/`
→ textiles (the cosmetics slate's chain); `traps/` → the trapping /
security trade; `room/`, `exits/`, `surface/`, `fixture/` → the platform
or a builder's trade. What remains commons is short: `Coin`, `Key`,
`PaymentCard`, `AetherImplant`, `Corpse`, water, air, salt-water.

---

## Part 10 — Water and power: utilities, not supply chains

> **User: "the bar's going to need a water source too but I'm not sure
> how much of that we're prepared to deal with this build."**

The line that keeps this small: **a bottle comes from a trade; water
comes down a pipe.** Utilities have their own model already — the
[supply design pack](supply-design-pack.md) (planner-ready, unbuilt):
*coverage is legal, connection is physical*; a source answers *"is
anything coming out right now, and if not, why not"*; the recurring
charge rides the stewardship doctrine. The bar must not get a bespoke
meter ahead of the pack that meters every tap in the world at once.

The bar's water: ice, dilution and soda, **washing the glass pool**,
coffee. What ships for that is one row — an `UnboundedSourceMixin` tap,
exactly what the dorm tap and the Hinkley standpipe are. Infinite,
unmetered, honest about being a utility.

| | this build | when |
|---|---|---|
| **water** | a **tap** behind the bar at the shipped tier: unbounded, unmetered, the dorm's shape | metered by the supply design pack, with every other tap |
| **ice** | **bought.** Bagged ice from the distributor, kept in an insulated **ice bin** (the thermos shape); a line on the par manifest like any other bought thing | the ice machine returns when the socket does |
| **power** | **none.** Buying ice removes the ice machine — the only powered fixture the menu introduced — so the bar draws no power in v1 | the socket, the supply design pack |
| **the bill** | **named, not built:** water and power are recurring utility charges the P&L is *known* to be missing | they land on the P&L when the supply pack ships |


---

## Open (for requirements)

- Menu v2's line: dairy / egg / tropical fruit wait on ranching and a
  produce trade with a climate; the blender, like the ice machine, is a
  powered station and waits on the socket.

---

## ⭐ The whiskey tails (salvaged at the sweep, 2026-10-06)

From the two whiskey plans, both retired at the sweep — their own
deferred-seams headings said *"leave as slates, not plan text"*, so these
live here now. The shipped halves are
[fractionation.md](../../subsystems/fractionation.md) and
[maturation.md](../../subsystems/maturation.md).

**⭐⭐ Coopering — and it is the biggest of them.** Making, charring and
seasoning a cask. The styles build made `MaturingMixin.imparts` a
**vessel-authored** field, which turned "which barrel" into a decision a
distiller buys — so the cooper's product is now a thing with a market and
no producer. ⚠ The real prize is **`imparts` as a DEPLETING reservoir**:
a cask's second fill should give less than its first (first-fill vs
refill is the whole economics of barrel trading), and that is the RGO
law's reservoir/recharge shape applied to a vessel instead of to ground.
Today `imparts` does not deplete and the plan recorded it as a known
coarseness.

**A sherry-seasoned cask** — vessel *history* writing `imparts`. The same
mechanism as coopering, one step further: what the cask held last changes
what it gives next.

**Whisky colour** — appearance as a function of `imparts`. Today a dram's
colour is the material's and a 90-day charred-cask whisky looks exactly
like a 23-day plain-cask one, which the nose can tell apart and the eye
cannot.

**`vat-malts`** — a vatted malt (two malts, peated × unpeated). ⭐ The
styles build shipped `vat-whisky` and deliberately did NOT ship this:
*one recipe proves the mechanism, and the second is a row somebody adds
when they want it.* It is one row.

**Cask-strength and dilution** — ⚠ blocked on a real constraint:
`BulkableApi.transfer` declines a cross-material pour, so **water cannot
be poured into whisky**. Reducing to bottling strength therefore needs a
recipe (the vatting shape) rather than a pour, exactly as blending did.

**The grappa / pomace schedule** — cut from the whiskey build because
the pomace *material* is tagged `solid` and bulk is liquid in v1. Nothing
was lost: the grappa recipe had never run either.
