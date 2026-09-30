# Rubber slate — the first technology

> **Status: UNBUILT** — and it is the case that proves the **epoch
> on-ramp** ([inquiry-slate § From law to technology](./inquiry-slate.md)).
> The material row ships, fully specified, and ⚠ **nothing in the entire
> content tree is made of it.**
> **Left:** latex as a tap (→ [tapping-slate](./tapping-slate.md)) ·
> sulfur as a deposit row + material · the **crosslinking `Law`** and its
> honest evaluator · `vulcanize` as a recipe gated on that law ·
> ebonite as the over-range product · the consumer rows (boot · glove ·
> mat · gasket · hose · elastic) · ⚠ the epoch on-ramp itself, which is
> inquiry's build and blocks this one.
> **Size:** a build — small in rows, but it lands the first
> knowledge-gated recipe and the first synthetic material, so it carries
> two precedents.

Opened 2026-09-25, out of *"we have other epochs in our toolchain so the
absence of rubber is a real content gap."* That correction is the slate:
**criterion 1 of [vocations.md](../../vocations.md) — a vocation exists
iff unmet demand — is CIRCULAR when all the demand is authored.** If the
world only ships medieval, criterion 1 refuses every post-medieval
material forever, and the tree can only grow the way it already grew.

---

## ⚠ The measured gap

| | |
|---|---|
| rows stamping `epoch: medieval` | **8** |
| rows stamping any other epoch | **0** |
| readers of `ToolMixin.epoch` | **0** (its declared first reader, the land-use covenant, has not shipped) |
| things made of `organic/rubber` | **0** |

⭐ And the rubber row is not a stub. It is fully specified — density,
specific heat, hardness, toughness, `electricalConductivity: 1.0e-13`,
`tags: [organic, elastomer, insulating, synthetic]` — and its own comment
names its purpose: *"the insulator of the roster: a rubber sole or glove
breaks the path to ground… the counterplay the electricity model
teaches."* The word **vulcanized** is in the first line: an 1839
industrial process, sitting in a world where every authored tool says
`medieval`.

⚠ **Stated accurately:** the electricity counterplay is *reachable*
today. `electricity.md` lists **rubber / leather / wool** as insulating
layers and `armor/leather-boots` ships. Rubber is the **best** insulator,
not the only one. The gap is real but it is a quality gap, not an
unreachable-feature gap — do not oversell it.

---

## ⭐⭐⭐ Why rubber is the right first technology

Better than magic, which is inquiry's own showcase, for four reasons:

1. **Vulcanization is the canonical technology you cannot have without
   theory.** Raw latex is sticky, melts in heat and perishes in cold. The
   *material* is useless until a *process* exists. Nothing in the
   medieval kit is like this.
2. ⭐ **Its law is an honest function of fields the engine already
   carries.** Sulfur crosslinks the polymer; `hardness` and `toughness`
   move as a function of **sulfur fraction × temperature × time**, with a
   real optimum. That satisfies inquiry's hard requirement — *a law is an
   emergent consequence of an honest function, never authored* — using
   `Material`'s own shipped mechanical axes.
3. ⭐⭐ **Over-applying it produces a DIFFERENT REAL MATERIAL, not a
   failure.** Push the sulfur fraction high and you get **ebonite**: hard,
   brittle, black — and historically one of the first electrical
   insulators in its own right. That is the *physical* analogue of
   inquiry's **evidential range** and its overreach paper, which that
   slate calls its soul: a model correct in-range and wrong beyond it,
   where being wrong teaches you something instead of just failing.
4. **It is the game's first SYNTHETIC material** — its own row says so.
   Every shipped chain *refines* (ore → bloom → ingot; grain → flour →
   bread). This one **transforms**: two natural inputs and a temperature
   give properties neither input has. A genuinely different lesson.

---

## The chain

### Supply

| piece | state |
|---|---|
| **latex** | ⭐ resin's mechanism *exactly* — a **wound response**, `behaviour: accrue`, a `production:` block on a species row. → [tapping-slate](./tapping-slate.md) builds the act; rubber adds one tree. |
| **sulfur** | ⚠ does not ship — only `alloy/sulfurous-iron`. The extraction census already priced this shape for gems and precious metals: **a deposit row + a material, not an RGO family.** Cheap, and volcanic/quarry sourcing is honest. |
| **heat** | ships — the `Oven` family; `brine-hearth` is the exemplar (an `Oven` row whose `ContainerMixin` lets `ThermalMixin.heatSourceK()` read the fire with no new coupling) |
| **`vulcanize`** | a **recipe**, gated on the crosslinking `Law`. Not a verb — crafting resolves it. |

### Demand — and most of it needs no new mechanism

- ⭐⭐ **Waterproofing and insulation are FREE.** Textiles' governing idea
  is *"a garment's purpose is which channel it intercepts… armor-ness is
  not a class; it is **material + construction form**,"* and *"the
  covering walk asks the material and the form and never asks what class
  they are."* **So a rubber boot is a `Garment` whose material is
  rubber.** No new class, no new kind, no new mechanism — the slot exists
  and nothing is in it.
- **Gaskets and seals.** ⭐ The mine pump is already slated — mining's
  Left owns *"everything below the water table — shaft/hoist/pump."* A
  pump is the first object in this world that genuinely needs a seal.
- **Tubing and hose** — brewing, the hearthworks, the medic vertical.
- **Elastic** — textiles again (fit is two numbers and a stamp).
- **Tyres** — logistics, where *a vehicle is a room that moves* and tyres
  are a term on the cost surface. Furthest out; do not scope it here.

---

## Lens pass (2026-09-25)

Run against [design-lenses.md](../../design-lenses.md). Two findings
changed the design: a fork resolved under lens 2, and a **new invariant**
under lens 6.

### 1 · Pedagogy — Disciplines exercised; what is derivable

⭐ **`chemistry` and `physics` both ship as Disciplines** (ISCED-F 0531
and 0533), so the first question has a real answer. Tapping credits
`silviculture`; sulfur credits `smelting`; **vulcanization credits
`chemistry`.**

⭐⭐ And that is a first: `chemistry.yaml` today describes a purely
**reading** discipline — *"the discipline behind every composition read
the instrumentation ladder offers"* — and **rubber gives chemistry its
first MAKING face.** Reading a composition and changing one are the two
halves; only one was built.

⭐⭐⭐ **The chemistry row also independently states the conferral rule**,
which settles how the gate must work: *"⚠ It buys RESOLUTION, never
access… what the band decides is how narrowly the answer is bracketed…
not a permission."* So **the epoch gate must be a HELD LAW, not a
Discipline band.** A content author wrote that constraint down before
this design existed, and it agrees with
[advancement-slate](./advancement-slate.md).

**Derivable:** yes, strongly. `hardness` and `toughness` as
f(sulfur fraction × temperature × time), with a real optimum and a real
over-range product. A player who has internalized it predicts *more
sulfur → harder and less elastic; too much → brittle* and is right,
without looking anything up.

⚠ **The honest limit, written down rather than papered over:** the engine
models materials at the **bulk-property** scale and has no polymers. So
what a player recovers is **the curve, not the molecular mechanism** —
this teaches *materials empiricism*, not organic chemistry. That is what
Goodyear actually did, and recovering a relationship before its mechanism
is how science genuinely proceeds, so it is honest. But it is a smaller
claim than "teaches chemistry" and the slate should not make the bigger
one.

### 2 · Expression — what an author composes with no code

⭐⭐⭐ **The strongest score available on this lens, because a material is
a COLOR and not an item.** Adding rubber does not add a rubber boot; it
makes **every existing garment, tool and vessel row re-makeable in
rubber**. The effect is multiplicative, not additive — *"variety comes
from combination and permutation, not from enumeration"* — and it needs
no code, because textiles' covering walk *"asks the material and the form
and never asks what class they are."*

⭐ **Fork resolved by this lens.** Are vulcanization grades one material
with a parameter, or several materials? **Several** — latex · rubber ·
ebonite as three `Material` rows, with `Grade` riding the crafted object
as usual. The metal chain already set this precedent when the extraction
build made **the sulfur decide the MATERIAL**, and the multi-row answer
is what lets an author name, price, trade and describe each one. *Lens 2
chose this limb; I am not asking.*

**Bespoke:** an elastomer family (neoprene, gutta-percha) is more rows
with different crosslink curves — the system suggests the extension,
which is the lens's best outcome rather than merely its passing one.

### 3 · Immersion — what the sim affords without scripting

⭐⭐ **The first person to make rubber boots changes what is survivable in
the substation.** That is a world event caused by a player rather than by
a patch, and nothing scripts it: `electricity.md` already resolves
grounding and insulation **emergently from the graph, never scripted**, so
a new insulating material simply propagates.

No gauge anywhere — a boot does not report an insulation percentage, it
breaks the path to ground and you are not hurt.

⚠ **The risk on this lens is the recipe reading as a spreadsheet**
(sulfur %, temperature, time). Mitigation, and it is the tasting
precedent: **the products describe themselves in words** — tacky and
weeping under-cured, hard and black and ringing when tapped for ebonite —
and the plotted curve is *earned legibility* the player opts into, never
the default surface.

### 4 · Values — the choice forced; who confers standing

⭐⭐⭐ **The best thing in this design, and it is not the material.**

> **You worked out vulcanization. Do you PUBLISH or HOLD?**

Publish and the law becomes a teachable good, the realm advances, and the
authorship ledger records that you were first. Hold it and you have a
monopoly on the only real insulator in the world. **No dominant option**,
and it is the historically exact choice — Goodyear published and died in
debt while others patented.

It rides shipped machinery end to end: `provenance` → producer standing ·
the library as teachable goods · guilds as the natural holders of a
mystery.

**Who confers standing:** the library (first discoverer), the authoring
ledger, and renown per scope. ⚠ **Check that money cannot reach the
mint** — it cannot: money buys the **goods**, and can buy a **lesson**
(the capability), but the first-discoverer record is not purchasable.
Passing here is not incidental; the publish/hold choice is precisely
where a careless design would have let a rich player buy the credit.

### 5 · Epochs — what changes, what must not

| epoch | rubber |
|---|---|
| prehistory | ⭐ latex + a second plant sap — Mesoamerican rubber balls are a real pre-Columbian elastomer |
| medieval | latex is a curiosity; no process |
| **industrial** | **vulcanization — this slate** |
| modern | synthetic rubber from petrochemical feedstock |
| future | re-parameterized, not rewritten |

⭐⭐ **The mechanism holds: it is always *crosslink a polymer to change
its mechanical properties*.** What changes across five epochs is the
**feedstock** (a tree, then petroleum) and the precision of control —
dynamics, not mechanics.

⭐ **Which is exactly the bridge to oil and plastics: synthetic rubber is
the same LAW with a different feedstock.** So lens 5 is doing real work
here rather than rubber-stamping — it is the evidence that the epoch
on-ramp is modelled at the right altitude, because one `Law` covers both
the natural and the synthetic material.

### 6 · Economy & governance

**Produces:** an insulating / waterproof / sealing material · a new
garment line · a capability (the mine pump) · ⭐ and **knowledge as a
good**. **Consumes:** latex (seasonal tapping labour) · sulfur · fuel ·
time. **Who pays:** whoever buys boots, and the mine that wants to work
below the water table.

⭐ **Sulfur as a smelting byproduct turns a waste stream into an input**,
which is the healthiest possible answer to *what does it consume*.

**Did the demand exist first?** ⭐⭐ **Yes, and demonstrably** —
`electricity.md` named rubber boots as its counterplay, and the material
row was written for that purpose, *before anyone proposed producing
rubber*. **A documented consumer with no producer** is the honest
justification this lens asks for, and it is the same shape as the
extraction census's orphan roots. ⚠ It is also the correction that opened
this slate: the demand test cannot be run as if demand were a fact, when
we are the ones authoring it.

#### ⚠⚠ Who can be wronged — and the invariant this pass produced

Rubber judges a person in exactly one place: **the knowledge gate.**
*"You cannot vulcanize this."* The criterion is readable (you do not hold
the crosslinking law) and the refusal names it. So far so good.

> ⭐⭐⭐ **But lens 4's best feature is lens 6's biggest risk.** If a guild
> works vulcanization out and refuses to teach it, a player is refused a
> capability on a criterion they can **read** but cannot **lift by their
> own effort**. That is the shape of *a bare COUNT as a permanent gate* —
> a bar that nothing lifts — arriving by a different road.

The answer is **not** to forbid holding a secret, which would destroy the
lens-4 choice that makes the design good. It is:

> **INVARIANT: cold discovery must ALWAYS remain open.** The law is a
> true relationship in the world; **a monopoly on it can only ever be a
> HEAD START, never a lock.** A guild holds the *shortcut*, never the
> *law*.

⚠ This must be stated because the natural implementation — a `Law` row
somebody *owns* — breaks it silently. The gate asks *do you hold this
law*, and there must always be a route to holding it that runs through an
instrument and your own measurements.

**Entrenchment tiers** ([measurement.md](../../measurement.md) § layer 3):

- **Tier B** (whoever ships the code) — **that cold discovery stays
  open.** It is an engine property, not a polity choice, and the AGPL is
  the check.
- **Tier C** (the polity) — **whether a guild may bind its members not to
  teach.** That is a real political question, it is the kind of thing
  guilds and courts exist to fight about, and the engine should have no
  opinion.

⭐ That split is what the lens is for: the engine guarantees the
*possibility*, the polity argues about the *practice*.

---

## Decided

1. **Rubber is the epoch on-ramp's first consumer**, and this slate does
   not ship before it. ⚠ That is a real dependency, not a courtesy.
2. **`vulcanize` is a RECIPE, not a verb.** Crafting resolves it; the
   refusal comes from the knowledge gate, not from a controller.
3. **Ebonite ships with rubber**, not later. The over-range product is
   what makes the law worth understanding rather than memorizing, and it
   costs one material row.
4. **No new pack for the consumers.** Boots and gloves are `Garment`
   rows; gaskets belong to whoever builds the pump.
5. ⛔ **Tyres, vehicles, oil, gas and plastics are NOT in scope.** They
   are the next epoch's argument and they inherit this one's mechanism.
6. ⭐ **latex · rubber · ebonite are three `Material` rows**, not one
   parameterized material — the metal chain's precedent (the sulfur
   decides the material) and lens 2's answer. `Grade` rides the crafted
   object as usual.
7. ⭐⭐⭐ **Cold discovery stays open, always** (tier B). A monopoly on the
   crosslinking law is a head start, never a lock — see the lens pass.
8. **The gate is a HELD LAW, never a `chemistry` band** — `chemistry.yaml`
   says it itself: *the band buys resolution, never access.*

## Open

1. **Where sulfur comes from** — a volcanic deposit is the honest source
   and this realm has no volcano authored. Alternatives: a quarry band
   (sulfur occurs in evaporite and limestone country, which the extraction
   build already built), or a smelting byproduct (⭐ `sulfurous-iron`
   already exists, so roasting sulfide ore is a live path and would tie
   rubber to the metal chain). **Lean: the smelting byproduct** — it needs
   no new geology and it makes two trades interdependent.
2. **How many laws vulcanization requires.** One (crosslinking) is
   cleanest. ⚠ Inquiry's own open question — catalogue granularity — bites
   here first.
3. **Does understanding the law let `analyze` show the CURVE?** Inquiry
   asks this generally; rubber is where it would first pay, because the
   sulfur-fraction optimum is exactly what a practitioner wants plotted.
   *(Lean: yes — earned legibility, and it is a reward that costs the
   designer nothing.)*
4. **Whether the realm starts knowing it.** A content pack may ship a
   world that already holds laws. ⭐ Terminus runs a substation, so
   Terminus arguably should. Decide with the locality, not here.

---

## ⚠ What this slate is really arguing

The material was specified, the insulation model named it by name, and
the garment model resolves it with zero new code — **and nothing is made
of it.** That is the same shape as
[tapping](./tapping-slate.md), where the act protocol, the tap vocabulary
and the evaporator were all built and did not know about each other.

> **The substrate keeps running ahead of the content.** Both slates are
> mostly authoring passes over machinery that already exists — which is
> cheap, and is also the reason the gaps are invisible until somebody
> asks a content question.

**Next, and deliberately after** — both written 2026-09-25, and both
inherit the on-ramp rather than needing their own:
[destructive-distillation](./destructive-distillation-slate.md) (⭐ the
collier already does it, and **plastics turns out NOT to be blocked on
oil** — the first plastic is coal tar's) and
[drilling](./drilling-slate.md) (⭐ the first extraction that does not
expand the map). ⭐⭐ Rubber's own law is what both of them extend: **the
polymer family is one `Law`, and a player who has the curve can predict a
material they have never made.**

---

See also: [inquiry-slate](./inquiry-slate.md) (**the blocker**) ·
[tapping-slate](./tapping-slate.md) (the act) ·
[electricity.md](../../subsystems/electricity.md) (the named consumer) ·
[textiles.md](../../subsystems/textiles.md) (the free consumer) ·
[advancement-slate](./advancement-slate.md) (why conferral is not the gate)
