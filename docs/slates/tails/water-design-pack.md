# Water design pack — physics everywhere, weather nowhere

> **Status: PARTIAL** — the rain→soil edge, the ∞-tap/no-metering
> decision, the supply-failure vocabulary, the well/cistern depth tier,
> the rights/quota rivalry axis, and the contamination counterplay
> ladder (including its no-visible-tell ruling) all shipped 2026-09-02 →
> [watershed.md](../../subsystems/watershed.md), which is the live
> reference.
> **Left:** the bathroom's modelled function (`bathe`, gated on water
> availability — waits on room-condition) · "running water" as a
> residence-ladder rung feature (waits on the residence-ladder pack) ·
> ⭐⭐ **plumbing the city** — every tap names its main, and a tap served
> by TWO mains (§ below, opened by the pump build 2026-10-10)
> **Size:** a tail

See also: [power-utility-slate](../builds/power-utility-slate.md) (water is named there
as *"the obvious sibling — design once, instantiate per utility"*; this pack
**declines the billing half**) · [stewardship-doctrine § the recurring-charge
call](../../stewardship-doctrine.md) (**what may and may not recur**) ·
substrates that already carry water: [bulk](../../subsystems/bulk.md) ·
[metabolism](../../subsystems/metabolism.md) (the `hydration` reserve) ·
[mortality](../../subsystems/mortality.md) (dehydration) ·
[husbandry](../../subsystems/husbandry.md) + [smallholding](../../subsystems/smallholding.md)
(soil moisture, Liebig) · [fire](../../subsystems/fire.md) (`douse`, phase
change) · [weather](../../subsystems/weather.md) (⭐ **the missing edge**) ·
[room-condition](../builds/room-condition-design-pack.md) (the cleaning half) ·
[disease-slate](../builds/disease-slate.md) (⭐⭐ the contamination payoff).

---

## Part 4 — Cleaning needs water AVAILABLE, not SPENT

[room-condition](../builds/room-condition-design-pack.md)'s care loop (`wash` /
`wipe` / `bathe`) currently assumes water from nowhere. The fix must not
reintroduce the errand Part 1 protects:

> ⭐⭐ **Water is a PRECONDITION on the room, not a consumable on the act.**
> Where there is a tap, `wash` simply works — zero friction, zero accounting.
> Where there is not, you need a filled vessel.

Two things fall out for nothing:

1. **The bathroom finally has a modelled function** — room-condition's own
   open question 2, answered: the tub/basin is *the fixture that makes `bathe`
   available*, which is a real function without a needs-bar.
2. ⭐ **"Running water" becomes a residence-ladder rung feature**, which is
   exactly how housing actually improved historically, and a far better
   distinction between rungs than a `prestige` number. A dorm has a corner
   tap; a frontier lot has a standpipe in the yard; the gap between them is
   *the errand*, and closing it is what buying a better place buys.

---

## Interop map

- **[Room-condition](../builds/room-condition-design-pack.md)** — the cleaning
  precondition; the bathroom's function; Snow's map gains its mechanism.
- **[Residence ladder](./residence-ladder-design-pack.md)** — running water as
  a rung feature.
- **[Vocations](../../vocations.md)** — *water / sewer worker* is a listed
  **GAP**; supply failure is what gives it work orders.

---

## ⬅ Offered by the drilling build (2026-10-08): a dumped liquid is not a discharge

The drilling build needed the third leg of *every way of getting rid of
it is visible to somebody* — **pour the fraction nobody buys into the
river** — and could not build it. Recorded here because the finding is
the water pack's, not drilling's.

> ⛔ **No shipped verb turns a poured liquid into an outfall load.**
> `SpillController` makes a puddle on the floor; `PourController` is
> `BulkableApi.transfer` between vessels; a `Shore` is not `Bulkable` at
> all. Contamination reaches a reach exactly one way:
> `WatercourseCatalogue.contaminationAt` sums the **authored**
> `dischargeLoadPerSecond` of objects on `WATERWORK_CLASSES`
> (`Conduit`, `ControlStructure`) — a number on a row, not an act.

So a discharge today is a **fact an author declares about a fixture**,
and nothing a player does can create one. That is a real hole under the
*contamination counterplay* half this pack already shipped: the
counterplay exists and the **player-side cause** does not.

**The shape drilling designed and then withdrew**, offered as a
starting point rather than a recommendation:

- an optional **sump** on `Conduit` (`interiorBulk` on the row), with
  `dischargeLoad()` deriving `{load, kind}` from what is actually in the
  sump when one is authored, and the authored figure staying the default
  when none is;
- a new `ContaminantKind` **`'hydrocarbon'`** with its own
  survival-per-hop, so an oil fraction travels differently from sewage;
- `pour <fraction> into <outfall>` then being a real discharge the
  existing `contaminationAt` carries downstream, with the no-sensory-tell
  ruling this pack already made doing exactly the work it was written for.

⚠ **Why drilling did not build it.** A new member of the water system's
contaminant vocabulary plus a new derived-load path on a water class is a
**cross-cutting capability**, and a trade build may not solve one — the
standing rule, independent of how small the diff looks. The general case
is worse than the fixture case and wants deciding here: *can you pour
something into a river from a bank at all, and if so what does the bank
know about it?* A sump on a fixture answers the narrow question and
leaves the broad one, which is the usual tell that the narrow answer is
the wrong place to start.

**What it costs to leave it:** drilling's AC 9 ships with its dump leg
**unmet and recorded**; storing and flaring both work with no code, so
the waste is still disposable and still visible — just never into water.

---

## ⭐⭐ Plumbing the city — every tap names its main (opened by the pump build, 2026-10-10)

The pump build shipped the LINK and one tap on it: `WaterFixture.suppliedBy`
names the main a tap is plumbed to, `Conduit.supplyStateNow()` answers the
sync subset of the six words, and the **market standpipe** is the first tap
in the realm that knows what feeds it — switch the Wharfside intake's pump
off and it says *"Nothing comes out of it: it has been shut off."*

⚠ **It is one tap.** Every other tap in Terminus — Duncan Hall, the dorm
taps, the bar basin — is still its own source and runs whatever the mains
are doing. What is left:

1. **Plumb the rest of the city.** One authorable field per tap
   (`suppliedBy`), so the work is content — but it is a CONTENT decision
   about which main serves which district, and it wants making all at once
   rather than tap by tap.
2. ⭐ **A tap served by two mains.** The Cold Fell aqueduct also serves
   `/world/terminus`. In the fiction, the intake stopping should not dry a
   tap the aqueduct also feeds — the rule wants to be *a tap is served while
   ANY main serving it delivers*, which makes `suppliedBy` a list or makes
   the extent the join (a tap asks which mains serve its path —
   `StorageNode.serves(path)` is the shipped precedent, still with no
   production caller). ⚠ Today the single-main link only reads right
   because of item 3.
3. **The aqueduct is switched off** — its row never sets `on: true`, so it
   reports *NOT delivering — shut off*. Turning it on moves the river's draw
   ledger (fishing reads it), which is why the pump build did not do it
   blind. ⭐ The user's call: this and item 2 belong to **the content/lore
   pass over placeholder content once systems are built**, not to a systems
   build.
4. **Taps do not feel an overdraw.** The intake lifts 0.73 of the 1.2 m³/s
   asked of it (its pump wants ~98 kW, the industrial band gives 60 —
   deliberate), and that is legible in `analyze water intake` and nowhere
   else: a tap is on or off, because domestic demand is not modelled (this
   pack's own ∞-tap ruling). If an overdraw should ever reach a tap, it is
   `overdrawn` in the async report, never a sync refusal.
5. **The Hinkley tank answers no `supplyReport`** — `analyze water tank`
   says *carries no water anywhere* before and after the pump build. A
   `StorageNode` implementing `SupplyReporting` / `SupplyServing` is the
   second implementer the pump build named and did not ship.
6. ⚠ **A power cut at a pump reads `off`** (*"it has been shut off"*): the
   six words have no *unpowered*, and a seventh is a design conversation.

See [pump.md](../../subsystems/pump.md) § *The city, and the tap that reads
its main* and [watershed.md](../../subsystems/watershed.md) § *The pump build*.

