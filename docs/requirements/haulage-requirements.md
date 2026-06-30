# Cart & haulage — requirements

A **cart** is a wheeled `Vessel` you **hitch** yourself to and **pull**,
letting you move cargo that would crush you to carry. It is the
long-deferred *"hinge"* of the encumbrance build — the
[encumbrance slate](../slates/tails/encumbrance-slate.md)'s headline
deferred tail (*"cart/conveyance propulsion handoff"*) and coupling-row
#3 (*"dragged cart: mass leaves your body onto the wheels"*). It sits at
the seam between [encumbrance.md](../subsystems/encumbrance.md) (the
gauge it taxes) and [conveyance.md](../subsystems/conveyance.md) (the
follow-me relationship it inverts).

The headline is small on purpose: **most of the cart already works.** A
cart's cargo lives in the *cart's* container, which the encumbrance
tree-walk never visits — so offloading onto a cart removes the weight
for free, today, with zero new code. `Vessel` already declares a cart to
be the same category as a bag or a chest, *"carry / drag / ride /
can't-budge emergent from mass vs. capacity."* What this build adds is
the one missing piece: **the cost of moving the cart itself**, modeled
as a single attenuated term, plus the verbs and the tow.

## Goals

- **Carts are authorable** as a `Vessel` carrying one new authored
  number — `draftFactor`, the rolling-resistance × mechanical-advantage
  coupling (the `transmissionFactor` analog, for *pushing* rather than
  *containing*). A four-wheel cart sets it low (~0.03); a dragged sledge
  high (~0.35); the continuum from *cart* to *drag* to *can't-budge* is
  emergent from `draftFactor × total mass` vs. the hauler's capacity.
- **`hitch <cart>` / `unhitch`** couple and release a hauler from a cart
  (the `mount` / `dismount` analog). The cart **stays a room object**
  while hitched — others see it, load it, unload it; a live ref records
  the coupling. Hitching **occupies the hauler's hand(s)** per the
  cart's handedness — you cannot wield or loose-carry while *hand*-hauling.
- **Animal-hauling** — `hitch <cart> to <mount>` harnesses a draft
  creature (the horse you ride or lead) as the hauler in your place. The
  **hauler can be any `Creature`**, so a draft animal bears the cart's
  draft on *its* gauge — a big beast budges a cart a person couldn't —
  while you, mounted, bear **nothing** from the cart. Hands-occupation is
  a property of *hand*-hauling (self-hitch) only: it keys on "am *I* the
  hauler," so harnessing a horse leaves your hands free to ride and
  wield. A mounted/driven move tows the cart on the **horse's** traverse,
  alongside the existing conveyance ripple that carries you.
- **While hitched, the hauler's `getBorneBurden()` includes the cart's
  draft load** as one extra term:
  `draftLoad = (cartSelfMass + cartEffectiveContents) × draftFactor`,
  where `cartEffectiveContents` is the cart's contents run through the
  *same* weighted burden tree-walk (so a bag-of-holding inside the cart
  still weighs ~0). The **entire existing consequence ladder** —
  capacity ratio, climb/swim/fly locomotion veto, traversal endurance
  drain — then applies through that one term, unchanged.
- **The cart tows along** on the hauler's traverse: when the hauler
  walks to the next room, the cart (with its cargo, as a unit) arrives
  with them.
- **Two move-time gates**, both diegetic, both checked at the hitched
  hauler's traverse:
  - **Terrain** — a wheeled cart refuses exits it physically can't take
    (climb / swim / fly, and authored non-wheel-passable boundaries like
    stairs / stiles). The hauler's move is **blocked** ("you can't drag
    the cart up the stairs — unhitch it first"), not silently abandoned.
  - **Breakaway** — if `draftLoad` exceeds the hauler's **strain
    ceiling**, the move is vetoed ("the cart won't budge"). This is the
    one place a load gates *walking* (plain encumbrance never does).
- **Demo content**: a `handcart` template under the encumbrance gear
  seeds, exercising the full hitch → load → haul → gated-move loop, plus
  the acceptance scenarios below.

## Non-goals

- **Propulsion as a separate gauge.** Explicitly rejected in favor of
  the unified draft-burden term (see *Surface decisions*). No
  `PropulsionApi`, no drag-force physics, no second cockpit bar.
- **Riding *in* / *on* the cart.** This is the inverse of conveyance —
  the cart follows the actor on the ground, the actor is not a
  `Mountable` occupant. A cart that is *also* a ridable `Drivable` is a
  future composition, not v1.
- **Pack animals & porters carrying load *on the beast*** (slate model
  #4) — distinct from a draft animal *pulling a cart*, which **is** in
  scope (see Goals). Routing cargo mass onto another `Creature`'s own
  carry gauge (a mule's back) is plain containment-onto-a-bearer +
  following; there is no `PorterMixin`, and a mule balking is
  npc-behavior. Out of scope, lands on
  [npc-behavior](../slates/builds/npc-behavior-slate.md). The line:
  haulage moves *the cart's draft* onto the animal; pack-carrying would
  move *cargo mass* onto the animal — a different coupling we don't build.
- **Multi-hauler carts** (two animals / people on one heavy cart; draft
  splitting across haulers). A cart has one hauler in v1. Deferred
  exactly as multi-controller vehicles are in conveyance.md.
- **Movement-speed effects.** Endurance tax is the v1 cost; a slow-while-
  laden speed term rides later, only if/when a speed representation
  exists (slate confirms speed is a tail).
- **The cart's *container* capacity** (does the cargo physically *fit*?).
  That is the other gauge — existing `Bulkable` / container limits and
  the [collision-slate](../slates/deferred-rpg/collision-slate.md)
  decomposition. The cart uses what's there; we add no fit-checking.
- **Cart construction / crafting / durability** (axle breaks under
  overload, wheels wear). Out; the breakaway veto is the only
  overload consequence in v1.
- **Augment-conferred capacity, gravity margins, tissue-derived mass,
  numeric tuning of `draftFactor` magnitudes.** Other encumbrance tails;
  magnitudes are content dials per the slate's standing rule.

## Surface decisions

### The cart cost is a draft-burden *term*, not a propulsion gauge

**Question:** the slate sketched the dragged-cart cost as *propulsion* —
*"you stop paying encumbrance and start paying a new cost that isn't
encumbrance at all (drag × terrain)."* Build it as a parallel gauge, or
fold it into the existing one?

**Decision:** fold it in. While hitched, `draftLoad` is added to
`getBorneBurden()` as a single effective-kg term. **Reasoning:** a
parallel propulsion gauge would re-implement all three consequences the
encumbrance ladder already owns (over-capacity → drain, heavy →
locomotion veto). The draft *is* a load your body must move; `draftFactor`
is precisely the slate's "placement coupling" concept extended to the
wheel (mass × coupling = effective burden, the wind-chill trick the
slate already adopts). One new term; zero new consequence wiring. The net
fantasy is identical — the cargo's *true* weight was never on your books
(it's in the cart's container); the attenuated `draftLoad` is the only
thing you still bear.

### Coupling: cart in the room, live-ref tow

**Question:** while you pull it, does the cart live *in your slots*
(max reuse — the existing burden walk and conveyance ripple would handle
it for free) or *in the room*, coupled by a live ref?

**Decision:** in the room, coupled by a live ref on the hauler. **Reasoning:**
a cart is not "inside your pockets" — it is a room feature others must
see and load. The slot model would make the cart contained-by-the-hauler,
which is wrong for a big shared object. The cost is a new burden term + a
new tow hook + the gates; we pay that to keep the world honest. The live
ref obeys the [ref-shapes.md](../subsystems/ref-shapes.md) Pattern-B
cleanup rules (R2.x): the coupling clears on either side's destroy /
logout.

### Hitching occupies the hauler's hands

**Question:** is pulling a cart hands-free (harness model) or does it
claim your hands?

**Decision:** hands occupied, per the cart's handedness (1 or 2 hands).
**Reasoning:** realistic, and it creates a real beat — *drop the cart to
draw your weapon*. It reuses the embodiment/slot precedent the
encumbrance build already leans on (loose-carry occupies hands). Because
the cart stays in the room rather than slotting onto the hauler, the
hand-occupation is enforced as a derived consequence of the hauling ref
(the loose-carry-claims-hands precedent), not by parking the cart in a
hand slot — exact mechanism is the planner's call.

### Overload surfaces at move time, never at hitch time

**Question:** refuse the hitch when the cart is too heavy, or let the
hitch succeed and surface the cost on the first step?

**Decision:** hitching always succeeds (you can always grab a handle).
All cost is at traverse: over the strain ceiling → breakaway veto ("won't
budge"); over capacity but under ceiling → you move, but drain hard and
have climb/swim/fly gated. **Reasoning:** mirrors `get` exactly — you can
lift an over-capacity item that then taxes you; only *over the ceiling*
does the lift fail. The breakaway is the cart's analog of the lift gate,
relocated to the first step (you don't lift a cart, you start it rolling).

### Terrain ownership: the conveyance declares, the boundary answers

**Question** (the slate's tabled one): does the cart declare its needs
("level floor, wheel-passable") and the boundary answer, or does the
boundary declare a max draggable bulk?

**Decision:** conveyance-declares, boundary-answers — and it reuses the
**existing `Exit.media` gate almost entirely**, not a new axis. The cart
declares a passage mode (`wheeled` — the existing ground-medium vehicular
mode, see [locomotion.md](../subsystems/locomotion.md)); the tow gate
asks `LocomotionApi.exitAllowsMode(exit, 'wheeled')`, the same exit-side
`media` gate that already governs walk / climb / swim / fly. That gives
the bulk of the terrain constraint **for free**:

- A ground passage (`media: ['ground']`) already admits `wheeled` → the
  cart rolls through, no new code.
- A ladder (`['vertical']`), a ford (`['water']`), open air (`['air']`)
  admit only climb / swim / fly **by medium** → the cart is refused, no
  new code. (These exits already refuse *walking* too — a ladder is
  climb-only today, cart or no cart; the cart simply inherits the gate.)

The **one residue** the media gate cannot express is an exit that admits
*walking* but must refuse *wheels* — stairs, a stile, a turnstile, a
narrow door (all `media: ['ground']`, so `wheeled` is wrongly admitted;
medium can't separate them because both want `ground`). For these, a
single **default-true wheel-passability bit on the exit**, flipped false
by the author, blocks the cart while leaving walk intact. Finer terrain
(passage width, slope, max draggable bulk per boundary) is a deferred
tail; exact field name is the planner's call. **Reasoning:** "what's
cart-traversable" is then mostly an *existing authored property*
(`Exit.media`), reusing the machinery the whole locomotion system
already runs on — only the walk-yes / wheel-no exceptions cost a new
flag.

### Where the new behavior lives

**Question** (the slate's "where does the gauge live"): new mixins, or
methods on existing classes?

**Decision, as principles for the planner:**
- **Cart side — a new mixin** in the conveyance/spatial family (carries
  `draftFactor`, `handedness`, the wheel-passability *need*; provides
  `getDraftLoad()` and the coupling accessors). Composes on `Vessel`.
- **Hauler side — a live ref**, read by `getBorneBurden()` for the draft
  term. Default-to-no-new-mixin (the slate's standing rule); add a thin
  hauler mixin only if the ref genuinely needs a home.
- **The tow + gates** live in the **conveyance ripple region of
  `Mobile.traverse`** (where occupant-follow already lives) and the
  **`LocomotionApi` veto layer** (where the overload veto already lives —
  the layer explicitly allowed to read encumbrance). The **raw
  containment move stays encumbrance-free** — the cart tow is its own
  seam, reached only when hitched, exactly as the encumbrance doc
  requires of `Mobile.traverse`.

### Animal-hauling: the hauler is any Creature, gate the traverser

**Question:** a horse pulls the cart while you ride it — how does that
compose with mounting?

**Decision:** three things make it fall out of the same model:
- **`HaulerMixin` is composed where it's earned, not on the `Creature`
  base** — on the player `Character` stack (every player self-hauls) and
  on a dedicated **`HaulingCreature`** class (`HaulerMixin(Creature)`)
  that draft beasts are authored from. Most creatures never haul, so the
  base stays clean (the encumbrance doc's *"compose the mixin, not the
  class tree"* rule). A draft animal bears the cart's draft on *its* own
  gauge; you, the rider, are coupled to the horse by the *existing* mount
  slot and bear nothing from the cart. Three orthogonal couplings, one
  per link: `player —(mount slot)→ horse —(hauling ref)→ cart
  —(container)→ cargo`.
- **`hitch <cart> to <mount>`** is a second target form that harnesses
  the named creature as the hauler instead of the giver. Hands-occupation
  keys on *"am I the hauler"* (`isHauling(self)`), so harnessing a horse
  leaves the rider's hands free — the hand-tax is intrinsic to *hand*-
  hauling (self-hitch), not to the hauling relationship. A harnessed
  animal claims no hands.
- **The move-time gates evaluate the *traversing host*.** On a
  mounted/driven move the horse is what actually traverses (ride is
  passthrough), so the breakaway/terrain gates must read the **horse's**
  hauling state + strain ceiling, not the commanding rider's — otherwise
  the rider's pre-check (`isHauling(rider) == false`) would wave a cart
  up the stairs. The tow then fires on the horse's `Mobile.traverse`
  alongside the existing conveyance ripple that carries the rider.

**Reasoning:** the relationships are genuinely orthogonal axes, so the
substrate composes without special cases; the only real work is the
capability's home (`Creature`), the `to <mount>` verb form, and gating
the host rather than the rider. **Reserved:** two animals on one cart
(multi-hauler / draft-split) stays a non-goal.

## Constraints

- **`Mobile.traverse` / `LocomotionControllerBase` carry no *encumbrance*
  code** (encumbrance.md's red-flag rule). The cart tow + breakaway +
  terrain checks are *conveyance/locomotion* concerns that *read* the
  draft term and strain ceiling; they live in the conveyance ripple
  region and the locomotion veto layer, never bolted onto the raw move
  primitive. A plain creature with no cart reaches none of it —
  walked-vs-towed exclusion is structural, not a coded check.
- **No new weight field.** Draft is derived from existing
  `Tangible.mass` (cart frame) + the existing weighted burden tree-walk
  (cart contents) × `draftFactor`. Effective-kg and true-mass share
  `Quantity<'kg'>`; the discipline note from the slate applies (don't add
  a true mass to a burden).
- **Live-ref hygiene.** The hauling coupling is a Pattern-B live ref;
  R2.1–R2.4 cleanup must clear it on cart destruct, hauler destruct,
  hauler logout/linkdead, and `unhitch`. Cite
  [ref-shapes.md](../subsystems/ref-shapes.md).
- **Go through the Api layer.** Coupling/decoupling and any containment
  motion of the cart route through the existing primitives
  (`ContainmentApi.move` for the tow, `SlotApi`/the slot surface if a
  real hand claim is used) — never raw field writes
  ([antipatterns.md](../subsystems/antipatterns.md)).
- **Module taxonomy.** The cart-side capability is a mixin in an existing
  `lib/<subsystem>` (conveyance/slot or spatial — planner's call), not a
  new free-floating module; no new module category.
- **Soft tax, not a hard gate** (house style): the only hard points are
  the two diegetic move-time vetoes, surfaced as `controller-rejected`
  notes + scene lines on the dispatch-response envelope, never as modal
  rules.

## Acceptance criteria

- A `handcart` template exists, authored as a `Vessel` with a
  `draftFactor`, and is the worked example in the subsystem doc.
- **Free offload**: loading cargo into a cart (existing `put X in cart`)
  drops it off the hauler's `getBorneBurden()` with no haulage code —
  covered by a test asserting borne burden before/after.
- **Hitch/unhitch**: `hitch <cart>` sets the coupling and occupies the
  hauler's hand(s) (wield/loose-carry refused while hauling); `unhitch`
  clears both. Tested.
- **Draft term**: while hitched, `getBorneBurden()` rises by exactly
  `(cartSelfMass + cartEffectiveContents) × draftFactor`; a bag-of-holding
  inside the cart contributes ~0 (the tree-walk recursion is honored).
  Tested across an empty cart, a loaded cart, and a cart holding a
  low-transmission container.
- **Consequence reuse**: an over-capacity (but under-ceiling) loaded cart
  raises `getLoadRatio()` and gates climb/swim/fly + drains endurance on
  traverse — all through the existing ladder, no new consequence code.
  Tested. **Endurance specifically**: drain rides the existing
  `engageAround` traversal drain via the draft term, so a cart whose
  `draftLoad` sits under `LIGHT_LOAD_FLOOR` (the well-wheeled, level-path
  common case) **drains nothing** — only a sledge / overloaded / bad-
  coupling cart taxes endurance. Tested at both ends (light cart → zero
  drain; heavy cart → drain).
- **Exhaustion lowers the budge threshold** (emergent, no new code): the
  breakaway veto reads the strain ceiling, which the endurance margin
  shaves — so a cart that rolled when fresh can hit "won't budge" once
  the hauler is winded. Worth a test to lock the interaction; recovery
  itself stays metabolism's (the build only drains).
- **Tow**: a hitched hauler's traverse moves the cart and its cargo to
  the destination as a unit. Tested.
- **Terrain gate**: a hitched hauler is blocked (diegetic decline) at
  (a) any exit whose `media` doesn't admit `wheeled` — a ladder / ford /
  air exit, refused for free by the existing `exitAllowsMode` gate — and
  (b) a `media: ['ground']` exit explicitly marked non-wheel-passable
  (stairs). Both paths tested; the (a) path asserts *no new gate code*.
- **Breakaway gate**: a `draftLoad` over the strain ceiling vetoes the
  move ("won't budge") while leaving the hitch intact. Tested.
- **Live-ref cleanup**: destroying the cart, or the hauler logging out,
  clears the coupling on both sides (no dangling ref). Tested.
- **Animal-hauling**: a `HaulingCreature` draft animal exists as demo
  content; `hitch <cart> to <horse>` makes the **horse** the hauler. The
  cart's draft lands on the horse's `getBorneBurden()`, **not** the
  rider's (assert the mounted rider's burden is unchanged), and the
  horse's larger capacity budges a cart over a human's ceiling. Tested.
- **Ridden-haul tow + gate**: while mounted on a hauling horse, a move
  tows the cart on the **horse's** traverse (cart + cargo + rider all
  arrive); the terrain/breakaway gates evaluate the **horse** as the
  traverser (a stairs/over-ceiling exit is declined even though the
  commanding rider isn't the hauler). Tested.
- **Acceptance roster** (the slate's, now runnable):
  ```
  > put chest in cart            # 60 kg chest onto a handcart
  You load the chest onto the cart.        (your burden ~unchanged; the
                                            chest left your books)
  > hitch cart
  You take hold of the cart.               (hands occupied)
  > north                                  # level, wheel-passable exit
  You head north, pulling the cart.        (cart + chest arrive with you)
  > up                                     # a staircase
  You can't drag the cart up the stairs.   (status = declined, terrain)
  > put anvil in cart ; north              # now over the strain ceiling
  The cart won't budge.                    (status = declined, breakaway)
  ```
- **Subsystem docs updated**: the cart/haulage model is documented — the
  draft-term-in-burden, the live-ref tow, the two gates — graduated into
  [encumbrance.md](../subsystems/encumbrance.md) and/or
  [conveyance.md](../subsystems/conveyance.md) (placement is the
  planner's/sweep's call), and the encumbrance slate's "cart hinge" tail
  is retired.

## Cross-references

- **Seeding slate**: [encumbrance-slate.md](../slates/tails/encumbrance-slate.md)
  ("The cart is the hinge"; coupling table; the tabled terrain-ownership
  and gauge-placement questions resolved above).
- **Subsystem docs**: [encumbrance.md](../subsystems/encumbrance.md) (the
  gauge + consequence ladder + `transmissionFactor` precedent),
  [conveyance.md](../subsystems/conveyance.md) (the ripple, the
  mount/dismount verb shape this inverts), [spatial.md](../subsystems/spatial.md)
  / [boundary.md](../subsystems/boundary.md) (the move primitive + the
  exit/boundary the terrain gate reads), [ref-shapes.md](../subsystems/ref-shapes.md)
  (Pattern-B live-ref cleanup).
- **Adjacent (non-goal) slates**: [npc-behavior](../slates/builds/npc-behavior-slate.md)
  (a porter/mule balking), [collision-slate](../slates/deferred-rpg/collision-slate.md)
  (the cart's container-capacity gauge).
