# Repair slate — assemblies, part two

> **Status: PARTIAL** — W0–W6 built and merged (MR !375, 2026-10-18;
> the mend per part at the hand's band, the families, the name on the
> part, the paid mend as somebody's work, the tinker and the cobbler —
> [crafting.md § The lifecycle](../../subsystems/crafting.md),
> [assembly.md](../../subsystems/assembly.md),
> [retail.md](../../subsystems/retail.md), [vocations.md](../../vocations.md)).
> ⚠ **W7 (building upkeep by layer) did not ship** — the paint build
> (MR !513) put a different model in its place
> ([painting.md § 2](../../subsystems/painting.md)); its spec lives in
> [repair-plan.md § W7](../../plans/repair-plan.md). The moulds
> conversation (2026-10-16) → [moulding-slate](./moulding-slate.md),
> its own later build; this build took one seam from it — a cast part is
> mended under the discipline its mould credits (shipped). — opened
> 2026-10-16, the day after the assembly build (MR !361) merged. *Repair*
> is the framing device; the build is **assemblies, part two**: what a
> mend asks of the hand that does it, who is paid to do it for you, which
> things are made of parts at all, where a named thing's identity lives
> when its parts are replaced, and how every act of upkeep reaches the
> PART it is really about.
> **Left:** **building upkeep by layer** (§ 0 — materials in hand, by
> that layer's trade, at the hand's band; re-grounded against the paint
> build's `Faced` + `Durable` model) · **a working cast into a part**
> (§ 0, § 6 — where a working lives when its shell is a thing of parts;
> `recharge` reaches the whole today) · **the upkeep census** (§ 7) ·
> **the cordwainer/cobbler charter** (§ 4 — a polity's to enact, tier C)
> **Size:** a wave — rides the next building-fabric build (masonry ·
> brickmaking · structures already route lime mortar, repointing and the
> spall to it).

Supersedes GitLab issue **#39** (*C1 — the repair shop, content pass*),
whose premise — *the mechanic shipped, add a shop, no engine changes* — is
wrong in a useful way: a shop over today's verb sells something with no
skill in it. See § 1.

---

## 0. The rulings (the owner, 2026-10-16)

> *Shipped:* **a bad repair is possible** →
> [crafting.md § The lifecycle](../../subsystems/crafting.md)
> (`MEND_BY_BAND`); **the mixin composes on the FAMILIES** →
> [assembly.md § Host placement](../../subsystems/assembly.md);
> **a seat is AUTHORED only** → superseded by the code: there is no
> seat — a name is `Named`'s and rides the part line
> ([assembly.md § A name](../../subsystems/assembly.md)).
>
> And, agreed the same day on the slate's proposals: **botched mends
> COMPOUND** (§ 3) · a **working cast into a part authors its seat**, and
> a **reforged seat is named by the smith** (Narsil's rule, § 6) · a
> service is **priced by the diagnosis**, not by mass (§ 4) · the **first
> mender is a tinker on the road**, a city cobbler the second (§ 4) ·
> tailoring's **`alter` stays its own act** (§ 9).
>
> ⭐⭐ **Building UPKEEP is in; ERECTION gets its own design** (2026-10-16):
> a building's walls and roof are layers (the rubber build's model), each
> weathers at its material's pace, and `maintain` replaces what time took
> — materials in hand, by that layer's trade, at the hand's band. It waits
> on rubber's layers reaching master; erection → structures-slate.

---

## 1. What `repair` is today

*The 2026-10-16 snapshot (one generic mend for anyone; the paid arm
mending as the customer) is superseded by the build — see
[crafting.md § The lifecycle](../../subsystems/crafting.md),
[assembly.md § `repair`](../../subsystems/assembly.md) and
[retail.md § A priced service is performed by a PERSON](../../subsystems/retail.md).*

Upkeep outside `repair`, for the census in § 7: `sharpen` (keenness, the
whetstone), `maintain` (a building's fabric — residence pack), `recharge`
(an arcane shell — arcana pack), re-firing (a `repair` rung), re-packing
a pump (`get` + `fit`), re-stringing a bow and re-wicking a lantern (part
wear, `fit`).

---

## 2. Mending is the MAKER'S knowledge

*Shipped — per part, under the trade that made the part, by the part's
material's instrument:
[crafting.md § The lifecycle](../../subsystems/crafting.md).*

## 3. The failure mode — derived from the band

*Shipped — `MEND_BY_BAND`, compounding, read by `look` and `analyze
condition`: [crafting.md § The lifecycle](../../subsystems/crafting.md);
the diagnosis the paid mend quotes from:
[retail.md § A priced service is performed by a PERSON](../../subsystems/retail.md).*

## 4. The mender — a vocation above the trades

*Shipped — the tinker on his round and the piece-rate cobbler
([vocations.md](../../vocations.md)); the paid mend is the on-shift hand's
([retail.md](../../subsystems/retail.md)).*

Open: whether the cordwainer/cobbler split is a **charter** (a guild
rule a polity enacts — lens 7, governance, tier C) rather than anything
the engine knows. ⭐ Recommendation: the engine knows nothing of it; a
polity may enact it.

---

## 5. ⭐⭐ One class per kind — the mixin's test is the recipe

*Shipped — the nine `Assembled*` twins retired into the families, a
thing with no bill is one piece and every method is total on it,
`lint:bills` arm 7a–7d, Durable beneath:
[assembly.md § Host placement](../../subsystems/assembly.md) and
§ History.*

## 6. ⭐⭐ Identity seated in a part — Excalibur and the ship of Theseus

*Superseded by the code — there is no seat: a name is `Named`'s, rides
the part line, goes with a drawn blade, and Narsil's rule is history
(`nameLost`, the reforger's right derived from it):
[assembly.md § A name — Named's, living in the part that bears it](../../subsystems/assembly.md).
What remains is the working:*

✅ **A working cast into a part authors its seat** (lens 2: the spell is
the author's act). ✅ **A broken seat reforged is named by the smith** —
Narsil's rule: the old name stays with whoever remembers it, and the
reforged blade is whatever the smith calls it.

## 7. ⭐⭐ Upkeep reaches the part

*The substrate shipped — a line carries its part's own condition, grade,
keenness, name and mends, and `fit` moves it both ways:
[assembly.md § A line carries its part's own state](../../subsystems/assembly.md).*

Then every upkeep act routes to its part:

| act | reaches | today |
|---|---|---|
| `sharpen` | the keen part (the blade, the scythe's edge, the axe bit) | the whole `Weapon` only |
| `repair` | the worn part, by its recipe's discipline (§ 2) | the whole, by its material |
| re-string · re-wick · re-pack · re-sole · re-handle | `fit` of a consumable part | shipped for the string, wick, pane; the pump's packing is an OCCUPANT not a part (`pump.md`) |
| re-fire | the vessel's own joints | shipped |
| `recharge` | the shell a working is held in — the seat (§ 6) | the whole |
| `maintain` | a building's fabric | ⚠ out of scope: a building is not an assembly here |

Census to finish: every verb that restores state, and which part it is
really about.

---

## 8. Lens pass (first cut)

1. **Pedagogy** — mending is the maker's knowledge read backwards; the
   Discipline it exercises is the trade's own, at a lower bar for
   diagnosis and a higher one for a clean result. Derivable: a split haft
   is a carpenter's problem, a cracked head a smith's.
2. **Creative expression** — the ordinary case is rows (a recipe gives
   the bill; a bill of one is derived); the bespoke case is a seat and a
   name on an instance, no code.
3. **3a immersion / 3b participation** — a re-hilted heirloom is still
   the heirloom; and the economy has a mender-shaped hole: every worn
   thing, and nobody whose job it is.
4. **Values** — the ruling (§ 0) is a values call: *care* is a skill, so
   cheap care is worse care. Grain, not law: a polity may license menders
   (§ 4).
5. **Continuity** — a part outlives the whole it was in; a seat outlives
   every part around it.
6. **Economy** — produces restored condition and a second-hand parts
   market; consumes stock, time, and the salvage yard's output; paid by
   whoever owns the worn thing. The demand was there first (the engine
   wears everything every use).
7. **Governance** — the only judgment of a person is the band, which is
   measured not decided. The cordwainer/cobbler line is a polity's to
   enact, tier C.

## 9. Closed (2026-10-16)

*`alter` stays tailoring's own act — shipped
([textiles.md](../../subsystems/textiles.md)).*

Still to be decided at requirements, as product surface: the exact
failure table (§ 3 is a proposal), the upkeep census (§ 7), and where
the tinker walks.

## Cross-references

- GitLab **#39** — superseded by this slate.
- [assembly.md](../../subsystems/assembly.md) — the model this extends.
- [assembly-slate](./assembly-slate.md) — its tail (furniture as
  hosts, casks that are not Vats) rides with § 5.
- [crafting.md](../../subsystems/crafting.md) § the lifecycle — the two
  wear axes, `repair`, `salvage`.
- [retail.md](../../subsystems/retail.md) § the priced SERVICE — `Tariff`.
- [vocations.md](../../vocations.md) — the five criteria; the *maintain*
  link of the chain walk.
- [uncertainty.md](../../uncertainty.md) — why a bad repair is derived,
  never rolled.
- [magic-items.md](../../subsystems/magic-items.md) — the shell a working
  is held in.
- [carpentry-slate](../builds/carpentry-slate.md) — the edge and the hand a haft
  is mended with.
