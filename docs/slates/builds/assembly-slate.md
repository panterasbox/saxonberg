# Assembly slate — build a thing from its parts, and the joint is the epoch

> **Status: UNBUILT** — and ⭐ `crafting.md` already names the gap and
> defers it **deliberately**: *"**Assembly** (output properties emerge from
> components) is a genuinely different model, **still deferred — not
> faked**."* What this slate adds is the **epoch argument**, which changes
> the priority: ⭐⭐⭐ **you cannot build a factory until you can build a
> thing from parts.**
> **Left:** the `Joint` **ROW** vocabulary (condition · operation ·
> strength · reversibility · signature) · `AssembledMixin` on the whole ·
> the **bill on the KIND, history on the INSTANCE** split · **lossy
> disassembly** · the derived-property rules (grade · composite material
> response · **localized wear**) · one new verb · and ⚠ the **per-instance
> persistence of a non-singleton owned clone**, which is an open question
> with a shipped constraint (below).
> **Size:** a build — and **the cask is its exemplar**, the way the
> freezer compartment is `Chamber`'s first honest composer.

Opened 2026-10-09 out of a coopering design pass that turned out not to be
about barrels. The owner's framing:

> *"Barrels are special because they're **assembled**, and all of our
> crafting is based on physical or chemical processes — there's no 'build
> an object from its parts', and there's no notion of crafting finished
> goods or parts for finished goods. That's what cooperage really needs
> and it's way farther reaching than barrels. **It's epoch defining.**"*

---

## 1. ⭐⭐⭐ The structural statement

> **Transformation destroys identity. Assembly preserves it.**

Every craft that ships is the first kind: ore becomes metal, flax becomes
thread becomes cloth, sand becomes glass, milk becomes cheese, grain
becomes flour becomes bread. **The inputs lose their identity in the
output.**

A cask is staves, hoops and heads, and **after assembly the staves are
still staves** — which is exactly why it can be **repaired**. A repairable
object is one whose parts remain distinguishable.

### ⭐⭐ The proof is in our own corpus

**We shipped the glass bottle and not the wooden cask.** Same slot in the
economy; a bottle is blown or moulded (a *transformation*) and the glass
build solved it completely, deposits and all. The cask is **assembled**,
so it has rows and no maker.

⭐ And the container slot has an epoch ladder worth keeping, because the
owner raised the siblings:

| | how it is made | what it is |
|---|---|---|
| **cask** | ⭐ **assembled** | reusable, and it **imparts** — the vessel has a history |
| **bottle** | **formed** (ships) | reusable, **inert** — the deposit loop |
| **can** | **formed + seamed** | ⭐ **disposable** — and **where the deposit loop dies** |

### ⭐⭐⭐ And the cheapest proof the model is missing is `Durable`

**Wear with no parts means every failure is TOTAL.** Today an axe wears
out. In fact **an axe is a head and a haft, and the haft is what breaks** —
which is the difference between a repair and a replacement, and between a
smith and a woodworker. We ship `repair` and it can only ever be generic.

⭐ The cask shows it three ways: a **slack hoop** (re-drive it), a
**sprung stave** (replace it), a **dried head** (re-seat it). **Three
parts, three failures, three repairs.**

---

## 2. ⭐⭐⭐ Why it is epoch-defining: the axis is the JOINT

A factory is an assembly of assemblies; **interchangeable parts is *the*
industrial innovation**; and the division of labour means nothing unless
the thing divided is an assembly. So without this model there is no door
to the industrial epoch — bigger furnaces and more chemistry, and still
never a factory.

And the ladder is not in the parts:

| epoch | the joint | what it gives |
|---|---|---|
| **medieval** | wedged · pegged · **hooped** · lashed · riveted · forge-welded | reversible with effort, **every joint bespoke** |
| ⭐⭐ **industrial** | **the threaded fastener** — a bolt and a nut | **standardized, reversible, interchangeable** |
| **modern** | welded · press-fit · glued · moulded-in-one | often **irreversible** |

> ⭐⭐⭐⭐ **The standard screw thread is `logistics-slate` D11's
> canonical case.** *"A standard is an agreement about a slot dimension,
> and its benefit is arithmetic, not a rule."* **A thread IS a slot
> dimension**, and the benefit is exactly arithmetic: any bolt fits any
> nut. Whitworth, 1841.

---

## 3. Prior art — and the factory games are the WRONG model

⚠ Worth stating first because it is counterintuitive. **Factorio and
Satisfactory have deep crafting trees and no assembly.** Their recipes are
N inputs → M outputs with a time, the parts are **fungible and
identityless**, and once a gear becomes a belt the gear is *gone*. They
are about **throughput and rate-matching**, not objects. Excellent prior
art for **tree depth** and for § 4's scale question; silent on joining.

**The right prior art is the games where parts keep their identity:**

| | what it contributes |
|---|---|
| ⭐⭐⭐ **Dwarf Fortress** | **material AND maker survive assembly** — a steel axe *«made by Urist»* with a copper handle, and the whole's quality reads off its components. **Our model, shipped, in the game most famous for it** |
| ⭐⭐⭐ **KSP / Besiege** | **attachment nodes with SIZES that must match**, and **joints that snap under load** — the standardized thread made playable, with a joint strength |
| ⭐⭐⭐ **Galaxy Trucker** | tiles whose **connectors must match** (single/double/universal), and a badly joined ship **comes apart.** The join as a pure type-match, on a board |
| ⭐⭐ **Escape from Tarkov** | the thousand-part end — ⭐ **the compatibility rules ARE the content** |
| ⭐ **Bannerlord** | the shallow usable version: blade, guard, grip, pommel, and properties **derive from the combination** |
| ⭐ **BattleTech** | the join condition as a **capacity constraint** — which is `Slotted`'s `capacity` already |
| ⚠ **Minecraft** | the join as **relative position in a grid.** Cheap and legible, and **wrong for us** — the pattern is a puzzle, not a physics |

---

## 4. ⭐⭐⭐ The scale question dissolves: DECISIONS per assembly

The owner: *"a game with a library of 50 possible parts is different than
one with 1000 possible parts and one isn't necessarily better than the
other."* True — and `vocations.md` says what decides it: *"a chain link
with no decision in it produces **procedure, not emergence.**"*

> **The part count is not the question. The question is how many parts
> carry a DECISION.**

A cask has **thirty staves and one decision** (the wood). A gun has
**twenty parts and twenty decisions**. So the measure is **decisions per
assembly**, and thirty identical staves count as one.

⭐ A thousand parts with fifty decisions is fine. Fifty parts with fifty
decisions is fine. ⛔ **A thousand decisions is not** — and that is a
content-scaling rule, not an engine limit.

---

## 5. The JOINT carries five fields

The owner: *"the `+` there isn't just a one dimensional operation like
addition — it's a whole class of join conditions and operations."*

1. **a condition** — may these be joined? (type, size, count, capacity)
2. **an operation** — the act, with a tool and a skill: drive · wedge ·
   rivet · stitch · weld · **hoop** · bolt · splice · glue
3. **a strength** — what force breaks it (`materials-response`)
4. ⭐ **a reversibility** — undoable or not, at what cost, destructively or
   not. **This is what § 8 reads.**
5. ⭐⭐⭐ **a signature** — and this one was not expected:

> **An assembled object has a MAKER PER JOINT.** A cask raised by an
> apprentice and re-hooped by a master carries both — **`provenance.md`'s
> deepest possible consumer**, and `CreditRouting` is already the
> multi-maker case. Repair becomes visible *in the provenance*, not just
> in the prose: **the object remembers who fixed it.**

---

## 6. ⭐⭐⭐ Architecture — the joint is a ROW, and `Operation` is the precedent

The pattern ships three times:

- `Placement` — *"a member is a ROW"*, warmed by `PlacementCatalogue`,
  *"so a capability pack ships a way of sitting with no kernel edit"*
- `Reading` — rows at `<root>/idea/reading/<channel>`; *"a trade adds a
  reading with no platform file changed and no new verb"*
- ⭐⭐⭐ **`harm.md`'s surgery**: *"an **interruptible** act over a **data
  `Operation` catalogue** (5 rows today)"*, one verb `operate`, on a
  `SurgicalKit` instrument

> **So: `Joint` rows at `<root>/idea/Joint/<name>`, one verb, the method
> as data.**

**And the host side, deliberately small:**

- ⭐ **`AssembledMixin` on the WHOLE** — the bill, the derived properties,
  the localized wear.
- ⛔ **No `PartMixin`.** A stave is a `Good`; it *becomes* a part by being
  joined. **The relation is data on the composite, not a new kind of
  thing** — the object-versus-field lesson applied before the mistake.
- ⚠ **`Slotted` is the right shape and the wrong semantics.** It is *named
  occupancy positions*, and nine of ten composers are a chair, a coat
  rack, a door, a saddle. **A slot's occupant is independent; a part is
  constitutive** — and the tell is `crafting.md`'s own line: *output
  properties emerge from components.* **A coat rack with no coats is still
  a coat rack. A hammer with no haft is not a hammer.** A sibling, not a
  widening.
- ⚠ **The hard part is the derived properties**: grade (weakest-link —
  ships), **composite material response** (several materials under
  `f(mechanism, material, construction)` — genuinely new), mass (a sum),
  and **localized wear**.

### ⭐⭐ And surgery is a precedent, not an analogy

**A body is an assembly whose joins are surgical.** `augmentation.md`'s
Wave 2 *install/remove procedure* **is a join operation** — with a
professional requirement and a cost, which is exactly how the owner
priced implant removal (→ [content-declaration-slate § 3.8](./content-declaration-slate.md)).
**Amputation is a disjoin; a prosthetic is a join; an implant is a join
with an epoch stamp.** ⭐ So assembly's second consumer is not a trade at
all, and `Operation`'s five rows are the first `Joint` catalogue wearing a
different name.

---

## 7. ⭐⭐⭐ The verb space is three verbs, and only one is new

**`salvage` and `repair` both ship** as platform crafting verbs with
controllers, afforded by instruments (the anvil, `MendingTool`, the
needle-case). **No `join`/`fit`/`assemble` verb exists anywhere.**

- ⭐⭐⭐ **`salvage` IS disassembly, and reversibility decides the
  yield.** Is taking a cask apart the same act as breaking a lamp for
  scrap? **Yes — because reversibility is a property of the JOINT, not of
  the verb.** A hooped cask yields **staves**; a welded frame yields
  **scrap.** Same verb, different row, different outcome. Honest physics
  rather than a vocabulary decision.
- **`repair` ships and gets BETTER.** Today it says *worn out*; with parts
  it says **which part failed** — *the haft is split* — then fixes or
  replaces it. The refusal-is-the-progression-UI doctrine arriving in an
  existing verb.
- ⚠ **Tightening a slack hoop is NOT a fourth verb.** Nothing consumed,
  nothing swapped, function restored — **that is `repair` at its cheapest
  rung**, and getting it free is correct. (`adjust` was considered and is
  for operating a *control*; a hoop is not one.)
- ⚠⚠ **The new verb needs a collision check, not an assertion.**
  **`join` is almost certainly taken socially** (a party, a channel), and
  the [verb-collision ladder](../../subsystems/command-spec.md) demands
  evaluating both sides. **`fit`** reads better (*fit a new haft*) but
  `Fitting` is already a class; **`set`** is the cooper's own word for
  driving a hoop. Run the ladder on all three.

---

## 8. ⭐⭐⭐ Tools — the requirement belongs to the JOINT

A cask needs a driver and a croze; a wedged axe head needs a hammer; a
bolt needs a spanner. **Each `Joint` row declares what it needs** — which
is `instrumentation.md`'s *instrument affords the verb* plus
`crafting.md`'s skeleton already resolving **tools-by-capability** rather
than by name. **No new mechanism.**

### ⭐⭐⭐ And "some by hand, some not" is a ladder that decides which trades can TRAVEL

| rung | joins | where you can do it |
|---|---|---|
| **by hand** | lash · tie · peg · cork · **splice** | **anywhere**, from prehistory |
| **a hand tool** | wedge · rivet · **hoop** · bolt · stitch | **anywhere you can carry the tool** |
| **a machine / fixed plant** | press · thread · weld · mould-in-one | ⭐⭐ **only on premises** |

> ⭐⭐⭐ **This is why the ship's four craftsmen exist.** A cooper can set
> a hoop on a pitching deck. Nobody can press a bearing out there. **The
> portability of the JOIN decides the portability of the TRADE.**

⭐ It generalizes: what a travelling tinker can practise, what needs a
town, what needs a city — which the settlement model and the logistics
cost surface would both read. ⚠ And note it is `comms.md`'s portability
ladder (*a place you go to → an object you carry → a device you operate →
an organ*) in an unrelated subsystem: **same axis, second consumer**,
which is the first real sign it is a true one.

⭐⭐ **And the economic consequence is the industrial revolution's social
story in one line:** a machine-rung join is a **natural monopoly at the
shop that owns the machine.** So the epoch transition is **joins migrating
from the hand to the premises** — *the factory is not a bigger workshop;
it is where the joints live now.*

### ⭐⭐ The bootstrap constraint

**A tool is itself an assembly** — a hammer is a head and a haft — so
building tools needs tools, which is circular unless:

> ⭐ **The by-hand rung must be able to produce the hand-tool rung's
> tools.** (It can: you wedge a haft by mauling it against a stone.)

⚠ Write it down, because **the first author who puts a hammer behind a
hammer has broken the tree's root.**

---

## 9. ⭐⭐⭐ Persistence — the bill is the KIND's, the history is the INSTANCE's

The owner's challenge, and it found a real hole: *"a crafted barrel and a
cloned barrel need to be the same barrel — the player can see all the
mixins on an object. 'A barrel' and 'a barrel' with different mixin comps
is telling."*

⭐ **Composition is per-CLASS**, so two clones of one row are identical by
construction, and recipes output a template path. ⚠ **So the real risk is
somebody authoring a SECOND ROW for the crafted version** — and the rule
is: **a recipe's output must name the authored row, never a crafted-only
variant.**

⚠⚠ **But "spawned stock has no history" does not survive the follow-up**:
*"spawning a barrel also spawns all of its parts, given someone can
disassemble it."* An empty bill yields **nothing**, so a spawned barrel
would salvage into nothing while a crafted one yields thirty staves — a
**behavioural** divergence discovered at use time, which is worse than a
compositional one.

| | what it says | where it lives |
|---|---|---|
| **the bill** | *a cask is 30 oak staves, 6 hoops, 2 heads* | ⭐ **the ROW**, authored once |
| **the history** | *whose staves, what grade, who hooped it, which was replaced* | the **instance** record |

> `salvage` reads the **kind** for *what comes out* and the **instance**
> for *whose and what grade.* **A spawned barrel yields thirty generic oak
> staves at default grade** — identical behaviour, and the only thing
> missing is provenance detail, which is **honestly** missing because
> nobody knows who made it.

⭐⭐ **And the recipe's bill and the object's default bill are ONE
declaration**, authored on the row: the recipe reads it to know what to
consume, salvage reads it to know what to yield. **No second list to keep
in sync.**

### ⭐⭐⭐ And the precedent is `BodyPlan` — butchery already does this

`butchery.md`: *"**A share, because ONE plan serves every size of
animal**"*, with **cuts that CLAIM muscles**, one plan serving a canary
and an ox.

> **A BodyPlan is a default bill of materials, and butchery is
> disassembly-by-declared-plan.** Assembly is the same shape with a
> different host — reviewed, shipped, and already answering *what comes
> off this when you take it apart.*

### ⭐⭐⭐ Parts are a BILL, not a bag

Thirty stave objects inside every barrel in the realm is **30× the object
count for nothing**, since nobody is looking at them.

> **Thirty staves is a line on a record, not thirty objects.**

And `salvage` **mints them on the way out** — `DeferredDestinationExit`'s
materialize-on-traversal applied to matter, and `mining.md`'s *seeded,
never drawn* `Deposit` in spirit. Replacing one stave: mint (or destroy)
the failed one, consume a new one, amend the record.

⭐⭐ **And the cost is a feature: you cannot inspect a stave while it is
inside the barrel.** You cannot in life either — you see the barrel. So
*which stave is bad* is a **diagnosis** rather than a lookup, the same
epistemic shape as the navigator's plot and the laundress's stain.

---

## 10. ⭐⭐⭐ Disassembly economics — and the fix is entropy, not a rule

⚠⚠ **The arbitrage is real.** If the chandler sells barrels at *P* and
thirty staves are worth more, **spawned barrels are a stave mine** — and
worse than the usual vendor arbitrage, because floor stock's price is
*authored* rather than set by a production cost.

> **Disassembly must be LOSSY.** You do not get thirty staves out of a
> cask. You get **some staves, some broken staves, and some firewood** —
> at a rate from **the joint's reversibility × the salvager's
> competence.**

⭐ **And the precedent is the glass build's own resolution: *entropy paid
in colour*** — recycling made lossy in a **quality** dimension, with
cullet one-way-toward-green. **Salvage already costs grade by established
doctrine.**

**Three consequences, all good:**

- ⭐ **The arbitrage dies by arithmetic**, so nobody must remember a rule.
- ⭐⭐ **The cooper gets a second income** — he recovers more from a broken
  cask than you do, so *bring it to him* is a real transaction.
- ⭐⭐⭐ **Repair becomes strictly better than rebuild**, because replacing
  one stave disturbs one joint and taking it apart disturbs all of them.
  **The mechanism rewards the minimal intervention** — which is what a
  craftsman does and what `stewardship-doctrine.md` already prefers.

### ⭐⭐⭐ And the deeper effect: floor stock is a PRICE CEILING on its parts

> **Nobody will ever pay more for a stave than (barrel price ÷ recoverable
> staves).**

⭐⭐ **So an author who prices a spawned barrel cheap has silently capped
the stave market** — and generally, **every spawned assembled good sets a
ceiling on every part it contains.** A pricing decision with reach nobody
would expect, made by somebody filling a shop.

⭐ Which argues floor stock must be designed to **retreat**: priced
generously *and* shrinking as real producers appear, or the bootstrap
permanently caps every market downstream of it. ⚠ Check against what the
economic-bootstrap build actually does rather than assuming.

### ⭐⭐⭐ And loss is what keeps the RGO in the chain

> **Without loss, barrels → staves → barrels is a closed loop and
> forestry is OPTIONAL.**

Conservation makes the parts market a **sink** rather than a cycle, and
the sink is why anyone ever rives another stave.

---

## 11. ⚠⚠ The one open question with a shipped constraint

**Where does per-instance state on a non-singleton owned clone live?**

| | where it goes |
|---|---|
| **the bill** (the kind) | ✅ **the template row.** Authored content, no runtime state |
| **the history** | ✅ **`authoring_events`**, keyed on the durable `_chattelId` — *the bill of materials IS an authoring event*, so **no new collection** (and memory is firm: *no new Mongo collections*, *an index before a collection*) |
| **the fill count / spentness** | ⚠ **a persistent instance field** — hot, small, and nobody wants its history, only its value |

⚠⚠ **And the obvious home is ruled out.** `holder_snapshots` is
`{scope, owner, state}` where **`scope` is the host's *singleton*
`templatePath`** — so **five hundred barrels sharing one row cannot each
have a record there.** That is the **Avatar shared-templatePath
collision** exactly, which *"cost a SHARED BANK ACCOUNT and a dead labor
market, invisibly to the suite."*

Remaining candidates, none verified: **the owner's furnishing / estate
slice** (`furnishing.md` is *owner-based persistence*, so a placed object
may persist as part of what holds it) · **a purpose Document** · or
**nothing**.

⭐⭐⭐ **And the line that decides whether a barrel persists at all is
OWNERSHIP:** *floor stock is ephemeral and re-spawns from its row at boot;
an owned barrel persists.* Which is what `chattel.md` is for, and it means
**a shop full of spawned barrels costs nothing in Mongo** — also the right
economics of storage.

---

## 12. The lens pass — and almost none of it is about barrels

- **1 Pedagogy** — ⭐⭐⭐ assembly teaches what transformation cannot:
  **a system's behaviour comes from how its parts are CONNECTED, not only
  what they are made of.** And localized failure teaches **diagnosis** —
  *which part broke* — which is how you fix anything, ever.
- **2 Creative expression** — the strongest hit. *Personalization is a
  derivative of supply-chain depth*, and **assembly doubles the depth of
  every chain** by putting a part market under every goods market.
  ⭐⭐ And the bespoke case is remarkable: **an author ships a PART, and
  every assembly whose joint accepts it can use it** — no verb, no class,
  no recipe. **The cheapest content contribution in the game.**
- **3a Immersion** — ⭐ the object tells its own history: a cask with one
  new stave, a hammer with a replacement haft of different wood.
  **Repair becomes visible**, which a transformation can never be.
- **3b Participation** — ⭐⭐ **a player can supply an industry they do
  not practise.** And a polity that agrees a thread pitch has done
  something arithmetic and real.
- **4 Values** — ⭐⭐ **repair versus replace**, a genuine undecidable:
  the engine prices both exactly and cannot say which, because the answer
  depends on whether the object's history is worth anything to you.
  ⭐ The charred cask sharpens it — **a rejuvenated cask is cheaper and
  makes worse whisky.**
- **5 Continuity** — ⭐⭐⭐ § 2. And the test passes: **`fit` answers the
  same command whether the method is a hoop or a bolt.**
- **6 Economy** — § 10, plus **interchangeability becomes an economic
  fact rather than flavour.**
- **7 Governance** — ⭐⭐⭐ **who certifies a standard?** A thread pitch,
  a cask capacity — and the historical office is **the GAUGER**, an excise
  officer whose entire job was *measuring your casks to tax their
  contents.* **A standard with a revenue motive gets an enforcer**, and
  the gauger is a governance seat whose whole function is verifying an
  agreement about a slot dimension.

---

## 13. Coopering — the exemplar

⚠ **Raised first as a tail and it is not one.** It is the **first
consumer of a missing half of the crafting model** — and the cask is the
best possible first assembly: **many identical parts, one joining method,
one fastener that tightens everything at once**, three localized failures,
and **nine shipped consumers waiting.**

**The state of things.** Casks ship as **rows** of `/platform/thing/Vat` —
`category: cask`, `_materialPath: oak`, `interiorCapacity: 50`,
`closure: liquidTight` — and the distilling pack's **charred cask** is
emphatic that *"the cask matters, and a second one is a ROW rather than a
line of code,"* with `imparts` deliberately on the **vessel**.
⛔ **And nobody makes them.** No recipe, no staves, no hoops — **the
lamp-oil pattern.** ⚠ Worse, the charred cask's own argument appeals to
*"this barrel's own history"* and **there is no fill counter**: the
reasoning is right and the state it reasons about does not exist.

**What coopering actually is:**

1. ⭐⭐⭐ **held by COMPRESSION, not fasteners** — staves forced into a
   ring by driven hoops; no glue, no nails
2. ⭐⭐ **staves must be RIVEN, not sawn** — split *along* the grain, so a
   sawn stave leaks. ⭐ And riving is **forestry's** act: `fell` →
   cross-cut a bolt → **rive.** A third thing a bole becomes
3. **bending needs heat and water**, both shipped

### ⭐⭐⭐ The three grades are a CAPABILITY ladder, not a quality one

| the cooper | holds | |
|---|---|---|
| **wet** | liquid — beer, wine, spirits, oil | `liquidTight` ✅ ships |
| **dry-tight** | fine dry goods — flour, powder | ⭐ a band to add |
| **slack** | nails, apples, dry bulk — **leaks freely, nobody cares** | ⭐ a band to add |

> ⭐⭐ **A slack cask is not a bad wet cask — it is a different product.**
> Competence decides *what you can make at all*, which is a different
> shape from `Grade`: the apprentice is not making inferior barrels, he is
> making barrels for nails.

### ⭐⭐⭐ The cask is a depleting asset, and the cooper sells RECHARGE

First-fill, second, third — then **spent**. ⭐ And the cooper's real
service is **shaving and re-charring the inside**, which restores it.

> **Re-charring a spent cask is literally recharging a depleted
> reservoir** — the only maintainable depleting asset in the realm, and
> the only place maintenance restores a **flavour** rather than a
> function.

⭐ So a distiller's cask inventory **depreciates** on books nobody keeps,
and most of coopering is **maintenance** — re-hooping, replacing a stave,
re-heading — which is `stewardship-doctrine.md`'s own ordering.

### ⭐⭐⭐ The demand census — and the cask is the realm's first STANDARD

**distilling** (and `maturation.md`'s `MaturingMixin` is **on the
VESSEL** — the cask *is* the mechanism) · **brewing** (cask, keg,
cask-conditioning, cask-ale) · **winemaking** · **trade-fuel**
(oil-cask, lamp-oil-cask, both spawned) · **milling** (flour) · **salt and
fish** · **ship's water** · **tanning** · **whaling**. **Nine, one of them
a shipped subsystem.**

> ⭐⭐⭐ **And the barrel is the pre-industrial unit of freight.**
> *Tonnage* comes from *tuns.* So the cask is where the realm's first
> **standard** comes from, and the benefit is exactly D11's arithmetic: a
> hold of identical casks stows without waste and a hold of assorted ones
> does not.

---

## 14. Open questions

1. ⚠⚠ **Per-instance persistence of a non-singleton owned clone** — § 11.
   The one thing here with a shipped answer not in hand.
2. ⭐⭐ **The derived-property rules**, which are the genuinely hard part —
   especially **composite material response**.
3. ⭐ **The first `Joint` rows**, and how few a cask needs (lean: **one** —
   the hoop).
4. ⭐ **How many decisions should a cask carry?** (§ 4. Lean: **one**, the
   wood — and the charred/plain choice is a *second row*, not a second
   decision.)
5. ⚠ **The verb name**, via the collision ladder (§ 7).
6. **Does `Vat` compose `Crafted`/`Grade`?** It would need to.
7. ⭐ **Is the three-rung portability ladder general?** If it holds it
   answers *where can this trade be practised*, which the settlement model
   and the logistics cost surface both want.

## 15. Sequencing

> **assembly (cask as exemplar) → coopering → whaling**

⭐ Whaling is **not blocked** — casks exist as rows, so it could ship on
spawned casks exactly as the Oil Works ships on spawned lamp-oil. ⚠ **But
that reproduces the defect whaling was chosen to fix**, and whaling's best
economic material depends on the cask being a made thing: the **full ship**
as a progress bar, the **leaky cask**, and the cooper's **delayed
attributable failure** (oil lost for three years, blame assigned at
settlement).

⚠⚠ **And the industrial-epoch verticals have a prerequisite nobody had
named:** plastics, the retort's products and the factory all sit behind
this. **You cannot build a factory until you can build a thing from
parts.**

---

## Cross-references

- [crafting.md](../../subsystems/crafting.md) — the deferral this slate
  drives (*"still deferred — not faked"*), the craft-resolve skeleton,
  tools-by-capability, weakest-link grade
- [butchery.md](../../subsystems/butchery.md) — ⭐ `BodyPlan` as the
  default-bill precedent, and disassembly-by-declared-plan
- [harm.md](../../subsystems/harm.md) — ⭐ the `Operation` catalogue: the
  row-plus-one-verb-plus-instrument shape `Joint` copies
- [slot.md](../../subsystems/slot.md) — occupancy, and why it is a sibling
- [provenance.md](../../subsystems/provenance.md) — the maker per joint,
  and `CreditRouting`
- [chattel.md](../../subsystems/chattel.md) ·
  [persistence.md](../../subsystems/persistence.md) — § 11's constraint
- [glass.md](../../subsystems/glass.md) ·
  [glass-slate](./glass-slate.md) — *entropy paid in colour*, and the
  bottle we shipped instead of the cask
- [logistics-slate](./logistics-slate.md) — **D11**, the standard as an
  agreement about a slot dimension
- [content-declaration-slate](./content-declaration-slate.md) — `Epoch`,
  and § 3.8's implant-as-a-join
- [destructive-distillation-slate](./destructive-distillation-slate.md) ·
  [navigable-water-slate](./navigable-water-slate.md) § 7 — what sits
  behind this
