# Libations slate — the bar's supply chain, and putting things where they go

> **Status: PARTIAL** — built 2026-08-28 (MR !206): the supply chain,
> the menu, the trade packs and the corpo re-cut →
> [crafting.md](../../subsystems/crafting.md) ·
> [retail.md](../../subsystems/retail.md)
> **Left:** metered water + power on the P&L (the supply design pack) ·
> the ice machine and the bar's first socket (the lounge's `mana-main`
> feeds the terminal, not the bar) · carbonation going flat · a glassware
> supplier · menu v2's line (dairy / egg / the blender) · the generic
> drain's remaining direction (Part 7)
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
[supply design pack](../builds/supply-design-pack.md) (planner-ready, unbuilt):
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
