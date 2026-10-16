# Repair slate — assemblies, part two

> **Status: UNBUILT** — requirements + plan written (2026-10-16).
> ⏸ **ON HOLD until dairy ships** (build-2): dairy brings the kernel
> MOULD system. The moulds conversation happened (2026-10-16) →
> [moulding-slate](./moulding-slate.md), its own later build; this build
> takes one seam from it — a cast part is mended under the discipline
> its mould credits (plan D1). — opened 2026-10-16, the day after the assembly
> build (MR !361) merged. *Repair* is the framing device; the build is
> **assemblies, part two**: what a mend asks of the hand that does it,
> who is paid to do it for you, which things are made of parts at all,
> where a named thing's identity lives when its parts are replaced, and
> how every act of upkeep reaches the PART it is really about.
> **Left:** ✅ three rulings so far (§ 0: *a bad repair is possible*;
> *the mixin composes on the FAMILIES*; *seats are AUTHORED only* — the
> owner, 2026-10-16) · the per-part gate on the maker's discipline ·
> the failure mode, deterministic · the paid service performed by a
> person · the mender as a vocation · ⭐ **one class per kind** (retire the
> narrow `Assembled*` subclasses; the mixin's test is *we write a recipe
> for it*) · ⭐ **identity seated in a part** (Excalibur, Narsil, the
> grandfather's axe) · ⭐ **upkeep reaches the part** (hone a loose blade
> and keep the edge when it is hafted)
> **Size:** a build — the assembly tail's seams ride along where they
> touch (furniture as hosts, casks that are not Vats).

Supersedes GitLab issue **#39** (*C1 — the repair shop, content pass*),
whose premise — *the mechanic shipped, add a shop, no engine changes* — is
wrong in a useful way: a shop over today's verb sells something with no
skill in it. See § 1.

---

## 0. The rulings (the owner, 2026-10-16)

> ⭐⭐ **A bad repair is possible.**
>
> ⭐⭐ **`AssembledMixin` composes on the FAMILIES** we write recipes for
> (`Tool`, `Weapon`, `Garment`, `Vat`, `Lamp`, `Chair`, `Receptacle`,
> `Shield`…), not on `Good` — § 5.
>
> ⭐⭐ **A seat is AUTHORED only** — never earned — § 6.
>
> And, agreed the same day on the slate's proposals: **botched mends
> COMPOUND** (§ 3) · a **working cast into a part authors its seat**, and
> a **reforged seat is named by the smith** (Narsil's rule, § 6) · a
> service is **priced by the diagnosis**, not by mass (§ 4) · the **first
> mender is a tinker on the road**, a city cobbler the second (§ 4) ·
> tailoring's **`alter` stays its own act** (§ 9).

`repair.yaml`'s help promises *"Restores fully — gear never obsoletes, it
asks for care."* The second half stands; the first becomes **conditional
on the hand**. A competent mend restores fully, so *gear never obsoletes*
still holds for anyone who learns or pays; an unskilled one does not.
That is what makes skill the thing a customer buys.

⚠ **Possible, never rolled.** [uncertainty.md](../../uncertainty.md)
bans the resolutional draw — *roll to decide what the world IS, never
what your action DID*. A bad repair is **derived** from the hand's band,
the instrument and the part, never drawn. Two novices mending the same
haft get the same haft.

---

## 1. What `repair` is today (2026-10-16)

One platform verb, `repair` (alias `mend`), `requires: DurableMixin`,
three paths:

1. **Generic wear** (`CraftingApi.repair`, `CraftingLogic.repairImpl`) —
   cost mass = mass × deficit × `crafting.repair.costFactor` (0.6),
   doubled broken; the gate is chosen by the item's MATERIAL (metal →
   reachable heat ≥ 900 K; else a `mending` tool); then
   `setCondition(1)`, **for anyone**. Competence never enters. The only
   thing that can go wrong is the instrument's control floor lowering
   the grade.
2. **Assembly's rungs** (shipped in !361, `repairAssemblyRungs`) — a
   failed part is refused, **named only above the joint's band** (below
   it: *"something about the staves"* — diagnosis is a skill); a slack
   joint is tightened, gated on its instrument and band; a spent cask
   re-fires on the band of its OWN joints. **The only part of repair that
   asks anything of a person.**
3. **The paid service** — `order repair <item>` against a `Tariff`
   (`retail.md` § the priced SERVICE; shipped at the Hearthworks smithy
   and the Rejection shed). `OrderController.performService` calls
   `CraftingApi.repair({ item })` with **no maker**, so the maker falls
   back to the acting author — **the customer**. You pay the house and
   then mend it yourself at its forge. No smith, no band, no wage for
   skill. (A `Menu` order resolves the on-shift hand —
   `makerMode: 'fulfilling-bartender'`; the tariff's repair arm does not.)

Against [vocations.md](../../vocations.md)'s five criteria, generic
repair fails **2** (*a gated capability — if anyone can do it, it is a
chore*) and **5** (*a failure mode*), and the paid arm fails **4** in
spirit (a business is paid; nobody is paid for skill). Lens 1 finds
nothing to learn.

Upkeep outside `repair`, for the census in § 7: `sharpen` (keenness, the
whetstone), `maintain` (a building's fabric — residence pack), `recharge`
(an arcane shell — arcana pack), re-firing (a `repair` rung), re-packing
a pump (`get` + `fit`), re-stringing a bow and re-wicking a lantern (part
wear, `fit`).

---

## 2. Mending is the MAKER'S knowledge

> **The hand that can re-seat a haft is the hand that knows how hafts
> seat.** A mend is gated by the discipline of the recipe that made the
> PART being mended, read per part — never by a `repair` skill, and never
> by the whole's material.

The cask re-fire already does this (*"the band of the vessel's own
joints, never a Discipline the kernel names"*). Generalized:

- **Wear on a part** is restored under that part's recipe's discipline
  and instrument: the pick's iron head at the forge by smithing, its ash
  haft by carpentry with an edge. Today's material switch routes the
  whole pick one way.
- **A joint** is re-made under the joint row's own gate (shipped).
- **A monolith** (§ 5) is one part, so its own recipe's discipline.

⭐ This is what makes the vocation in § 4 exist: a pick needs TWO trades
to mend well, so most owners cannot self-serve all of it.

## 3. The failure mode — derived from the band

A proposal to argue with, not a table to ship:

| band | restores to | and |
|---|---|---|
| untrained | ~0.6 | the part loses a grade band; a joint it touches is left slack |
| novice | ~0.75 | loses a grade band |
| competent | 1.0 | — |
| proficient / expert | 1.0 | cheaper in stock (the `RECOVERY_BY_BAND` shape salvage already uses) |

✅ **Botched mends compound** — an amateur's mend of an amateur's mend
sinks lower each time (the ceiling applies to what is there, not to
new) — which is what makes a second-hand buyer's inspection worth
anything — ⭐ lens 1 says it should be *readable* on the
thing either way (`look` names a botched mend, `analyze` the band it was
done at), so a buyer of second-hand gear can tell.

⭐⭐ **The decision this creates is the job:** *repair · replace a part ·
salvage · sell*. Which is cheapest depends on what failed (diagnosis),
which joints undo cleanly (reversibility, shipped), and what parts are to
hand. That decision, made well for somebody else, is § 4.

## 4. The mender — a vocation above the trades

History drew the line in law: the medieval **cordwainer** made shoes and
the **cobbler** mended them (and was barred from making new); the
**tinker** mended pots for every household on the road; a **botcher**
mended clothes. The mender's capital is:

- **diagnosis across kinds** — assembly's naming rung, read across many
  trades' joints;
- **a drawer of parts** — fed by salvage and the second-hand market,
  which is where a part-for-part economy *starts*;
- **knowing what undoes** — reversibility, already a joint field.

Five criteria: demand is universal (every `Durable` wears, the engine
drains it every use); the gate is the band across several trades; the
loop repeats forever; it is paid by players and NPC businesses with
budgets; and § 3 is its failure mode. Its lower rung — mending for wages
at a smith's bench — is a chore; the upper rung — judging, sourcing,
undercutting a new purchase — is the job.

⚠ **The paid service must be performed by a person.** `order repair`
resolves the on-shift hand (the `Menu`'s `makerMode`), and THAT hand's
band sets the outcome. A cold shop with nobody on shift cannot mend.
That one change is what turns a `Tariff` into a repair shop.

Open: whether the cordwainer/cobbler split is a **charter** (a guild
rule a polity enacts — lens 7, governance, tier C) rather than anything
the engine knows. ⭐ Recommendation: the engine knows nothing of it; a
polity may enact it.

---

## 5. ⭐⭐ One class per kind — the mixin's test is the recipe

**The owner's direction (2026-10-16):** *no* `Sword` beside
`AssembledSword`, `Tool` beside `AssembledTool`. Decide which things are
made, write their recipes, and the test of whether a class composes
`AssembledMixin` is **whether we write recipes for it** — which should be
most things.

This reverses the third review pass of !361, which split
`AssembledTool` / `AssembledWeapon` / `AssembledLauncher` /
`AssembledGarment` / `AssembledChair` (and `Cask`, `Lantern`, two pack
ones) off the families. ⭐ **Both shapes satisfy the antipattern that
drove that pass** — *a mixin composed on a broad family, then guarded
back down*. The tell was the GUARDS (`isAssembly()`, nine of them). The
split removed the guards by narrowing the host; this removes them by
making the family **honest** — every member has a bill, so no caller
needs to ask.

### ⭐ A monolith is an assembly of one

What makes every member honest is that a thing made in one piece — a
whetstone, a cast pot, a fired bowl, a rivet — is a **bill of one**: one
part, itself, no joints. Derived from the recipe, never authored. Then
every method is total with no guard:

- wear routes to the one part; `repair` reads its recipe's discipline;
- `salvage` by joints finds none and goes straight to the melt;
- `fit haft to whetstone` is refused in words — *it is one piece*.

Census (2026-10-16): 66 rows name plain `Tool`, 7 `AssembledTool`; 7
plain `Weapon` (sword, dagger, belt-knife, clasp-knife, whip, poker, the
oak waster), 4 `AssembledWeapon`; 21 plain `Garment`, 1 assembled. Many
of the plain ones are plainly made of parts today and simply have no
bill yet: the smith's hammer, scythe, auger, billhook, mallet, sledge,
tongs, sextant, barometer — and the **sword** (blade · guard · grip ·
pommel, tang through and peened).

✅ **Decided: the families** (§ 0). The narrow `Assembled*` subclasses
retire into them; `Cask` and `Lantern` fold back into `Vat` and `Lamp`
by the same rule (a carboy is a vat of one part).

✅ **Found vs made is therefore a DATA line, not a class line** (lens 2:
the ordinary case needs no code). A found thing in a family — a stone
picked up as a hammer, a stick as a staff — has no recipe and is a bill
of one derived from nothing: total, unread, harmless. A found thing
outside every family (an apple) never composes the mixin at all.

Still open:

- **`lint:bills` arm 7** flips from *bill ⇔ the class composes it* to
  *every row of a composing class has a bill or a recipe of one input*.
- **Durable beneath** stays required (`repair.yaml`'s `requires`), which
  means the families all compose `Durable`.

## 6. ⭐⭐ Identity seated in a part — Excalibur and the ship of Theseus

The owner's worry: approach a named artifact as a product of its parts
and the **ship of Theseus** arrives — replace the blade, then the hilt,
and is it still Excalibur? That pushes back toward a separate class for
artifacts, which is the split § 5 rejects.

⭐ The fiction has already answered this, and the answer is a **part**:

- **Narsil** is broken, and its shards are carried for an age as an
  heirloom; reforged, the blade is renamed **Andúril**. The name followed
  the blade, and the reforging changed it.
- *"This is my grandfather's axe — my father replaced the head and I
  replaced the handle."* The joke works because everyone knows the
  identity lives *somewhere*, and it is not the parts list.
- Relics are the same claim: *a piece of* the true cross.

**Proposal:** an instance may carry a **seat** — the part its identity,
name and anything worked into it (an enchantment, a curse, a maker's
legend) belong to. The whole is *Excalibur* while the seat is in it;
re-hilt it and it still is; draw the blade from the hilt and the name
goes with the blade, and the hilt is just a hilt. An ordinary sword has
no seat and is simply the sum of its parts — the shipped behaviour.

- Lens 3a: the fiction cannot betray itself — a re-hilted Excalibur is
  still Excalibur, and a hilt cannot pretend to be.
- Lens 5: the seat survives the epoch — the test is *does the new object
  answer the same commands*.
- [magic-items.md](../../subsystems/magic-items.md): a working is
  already held by a physical shell; the seat is where it is held.

✅ **Decided: AUTHORED only** (§ 0). A row (or an author's instance)
names its seat; nothing earns one — no name settles on a long-held part,
and an ordinary sword never acquires a seat by being kept. Earned names
are not this build's and not a seat.

✅ **A working cast into a part authors its seat** (lens 2: the spell is
the author's act). ✅ **A broken seat reforged is named by the smith** —
Narsil's rule: the old name stays with whoever remembers it, and the
reforged blade is whatever the smith calls it.

## 7. ⭐⭐ Upkeep reaches the part

> **What you do to a whole is done to one of its parts, and what was done
> to a part before it was fitted stays with it.**

The owner's example: hone an assembled sword, and you can also hone the
blade on its own before it is hafted — and the edge you put on the loose
blade is still there when it is.

Today a fitted part is a **line** on the whole (assembly D3: no child
objects), and only *wear* is per line. Keenness lives on the whole
(`KeenMixin` on `Weapon`), so a loose blade has no edge to keep. The
build's substrate change: **a part line carries the state its part
carries** — condition, keenness, grade, temper, a seat — and fitting or
drawing a part moves that state with it.

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

Every question this slate opened is answered (§ 0); requirements
proceeds from here. ⭐ The one the slate had not recommended: **`alter`
stays tailoring's own act** — it changes *whom* a garment fits, not its
condition, so it is neither a repair rung nor a `fit` of a part.

Still to be decided at requirements, as product surface: the exact
failure table (§ 3 is a proposal), the upkeep census (§ 7), and where
the tinker walks.

## Cross-references

- GitLab **#39** — superseded by this slate.
- [assembly.md](../../subsystems/assembly.md) — the model this extends.
- [assembly-slate](../tails/assembly-slate.md) — its tail (furniture as
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
- [carpentry-slate](./carpentry-slate.md) — the edge and the hand a haft
  is mended with.
