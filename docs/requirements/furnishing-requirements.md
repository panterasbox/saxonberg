# Furnishing — owner-based persistence and the furnishable residence

A residence you **furnish with goods you own**, that stay where you put
them. Today a room persists its *contents* in its own record, so a chair
you carry into your dorm becomes, durably, part of the room — indexed
under the room, restored by the room, and gone with the room. That is
wrong in three directions at once: it loses the connection between a good
and its owner, it means a guest's dropped possessions ride a stranger's
record, and it makes "move house" impossible in principle.

This build introduces the second persistence scope — **owned chattel
persists with its owner, carrying a `place`** — and the **furnishable
residence** that consumes it: a multi-room, leased, empty-at-move-in
floorplan whose character is the objects you played for.

It also gives that residence its first *mechanical* reason to exist.
Sleep is this game's logout state, and the shipped rest model already
recovers by `posture × restQuality` on a reconcile-on-read clock — so
**a bed you own is recovery you keep while you are away**, and a bedroom
is the archetype that has an internal function before anyone furnishes
it (D10).

The engine work is deliberately small, because the title half already
shipped. [Chattel](../subsystems/chattel.md) landed with the general
store: per-instance `_chattelId`, a gated registry, `ownerOf`,
`stamp`/`transfer`/`release`, and an append-only chain-of-title. What is
missing is not *who owns this* but **where the owner keeps it** — and
that gap is what makes a furnished home impossible today.

**Residence-generic, not apartment-specific.** The substrate is a
*furnishable residence*; an apartment is its first consumer and a
suburb house ([Hinkley Hills](https://gitlab.com/panterasbox/saxonberg),
build-2, in flight) is intended to be its second without re-deriving
anything. Build-2 explicitly non-goals house interiors, furnishing and
chattel-title and defers them here, so this doc owes it a substrate
rather than an apartment.

Seeded by [property-slate](../slates/builds/property-slate.md) §I
(chattel & persistence — the capability-vs-relation correction, the
seed-then-persist handoff), §J (custody vs. title verbs), §K (rent vs.
own, the lease). Rides the shipped
[persistence spine](../subsystems/persistence.md) `(scope, key)` model,
[residence](../subsystems/residence.md) (the dorm — the simple rung and
every content precedent here), [chattel](../subsystems/chattel.md),
[parcel](../subsystems/parcel.md) (`subdivide`/`grantUse`/`revokeUse`/
`hasUseGrant`/`retire`, all shipped), and
[residency](../subsystems/residency.md).

## Goals

- **Owned chattel persists with its owner, not with whatever room it is
  standing in.** Each owned good carries a **`place`** — a residence room
  identity, `inventory`, or `storage`. A host's content-capture **skips
  owner-stamped goods** (they persist owner-side); the owner's record
  carries them wherever they sit. The two scopes compose over one spine
  and never both own the same field.
- **`storage` is owned-but-unplaced, and it is the default.** No
  warehouse object, no homeless special case. Eviction and lease-end
  force `place → storage` and **never destruct** a good that is titled to
  someone. Moving house is re-placing from storage.
- **A guest's dropped possessions stay theirs.** Dropping an owned good in
  someone else's residence keeps it titled to the dropper and persisting
  on the dropper's record, with `place` naming the foreign room. It
  re-appears there when that room next materializes — "I left my book at
  a friend's" — and is recoverable by its owner. The host's record never
  carries it.
- **`ownerOf` gains the parcel rung.** Resolution becomes
  `stamp ?? parcel-extent ?? authorOf`: a good whose template path falls
  under a parcel's extent resolves to **that parcel's owner**. So a
  landlord owns the fixtures in a unit they let, and a fixture carried
  off stays titled to the parcel — displacement is theft, recoverable —
  while every good outside a parcel extent keeps today's author fallback
  unchanged.
- **A furnishable residence is a multi-room leased floorplan.**
  Provisioning mints a unit sub-parcel of the building parcel, grants the
  tenant a lease (the dorm's shipped use-grant), and materializes the
  unit's rooms **empty of movable goods** — only built-in fixtures, seeded
  from `populates:` through the shipped seed-then-persist handoff. Access
  follows the lease.
- **Four room archetypes ship as template rows: bedroom, kitchen,
  bathroom, living.** Each is a distinct template path over one generic
  room class, differing in prose and in the built-in fixtures it seeds.
  They are content, editable without code.
- **Sleeping in your own bed recovers you across the offline gap.**
  Logging out at rest on a posture-bearing bed means the metabolic
  reconcile that runs on your next login integrates the elapsed hours at
  *that bed's* `restQuality` — so a residence has a mechanical reason to
  exist beyond storage. This requires the bed you slept on to survive the
  round-trip: **you wake where you slept**, not merely in the posture you
  left in.
- **The kitchen makes the shipped cooking loop local.** Standing heat, a
  water tap, a work surface and a larder, all authored from parts that
  already ship — so `cook` works in your own home with no errand, and
  the archetype is a *bundle* rather than a behavior. Its built-ins are
  the landlord's under D5; the pot is the tenant's.
- **The bathroom reads as complete while modelling almost nothing.** A
  toilet that is deliberately pure prose, a basin that is real water,
  and a tub that is a posture-bearing host authoring `restQuality` and
  `warmth` — three fixtures at three levels of detail, chosen by what
  the world reads (D13).
- **A room can be posted.** A room-level designation field says what the
  sign on the door says — unisex, gendered, staff-only, whatever the
  fiction posts — as an opaque string the engine never enforces and no
  movement or access check ever reads (D14).
- **The bedroom's bed is the substrate's first real rest surface.** The
  shipped dorm `Bed` is a `Surfaced` prop you cannot lie on, and nothing
  in the world authors `restQuality` but a campfire log. The bedroom
  archetype seeds a `Postured` bed with a `lie` slot and an authored
  `restQuality`, which is what makes the archetype non-decorative on day
  one.
- **A room can carry room-level state.** Room state is a first-class part
  of a room's record, not merely its contents — so an archetype that later
  earns behavior has somewhere to keep it, without a migration.
- **Furnishing rides the shipped containment verbs, made title-aware.**
  Placing an owned good sets its `place`; taking it back returns it.
  Custody and title stay separate axes, and no verb ever changes what a
  thing *is*.
- **A `docs/subsystems/` page** documents owner-based persistence (the
  `place` model, storage, the skip rule, the re-placement overlay) and the
  furnishable residence as the rich rung, cross-linked with the dorm.

## Non-goals

- **The residence *ladder*.** No ascent rule, no rung gating, no
  condition model. Stewardship makes "the condition of what you already
  hold" the binding gate for moving up, and there is no condition model
  anywhere — that is the
  [stewardship build](../slates/builds/stewardship-slate.md)'s own work.
  This build ships **a rung**, and guarantees only that a room *can carry*
  the state stewardship will define.
- **Earned rest quality.** A bed's `restQuality` here is an **authored
  constant** on the template row — a four-poster is simply better than a
  cot. Making it *derive* from anything you maintain (bedding freshness,
  tidiness, how dark and quiet the room is, whether the window was left
  open) is the same aggregation as every other condition read, and it
  needs the condition model this build explicitly does not ship. The
  seam is D11's: those inputs are named, and their home is fixed, but
  none of them moves a number in v1.
- **Sleep as a real in-world state.** No `sleep` verb, no sleeping
  condition, no unconsciousness, no dreams, no sleep debt, no forced or
  interrupted sleep, no waking someone. D10 is deliberately the *smaller*
  claim: the shipped rest model does not stop at disconnect. An actual
  modelled sleep state is a vitals/condition question and would arrive
  with the same machinery stewardship needs.
- **Room-general cadences.** Energy draw, debris accumulation, air
  quality and pests are named and homed in D11 because a room is the
  wrong place to discover them late — but nothing here *runs* on a
  cadence. This build ships the field seam (D7) sized to hold them and
  the reasoning for where each lives.
- **Spoilage and preservation.** Nothing rots. `ptomaine.yaml` ships a
  food-poisoning condition with no producer, and it keeps having none
  after this build. A larder is a chest that is nearer the stove.
  Spoilage belongs to the food and its container, never to the kitchen
  (D12), and it needs the condition model — so it lands with
  stewardship, not here.
- **Washing, hygiene and sterility.** No `wash` verb, no cleanliness
  gauge on bodies or items, no in-world producer for
  `dressingQuality`, and `Condition.contagion` stays exactly as shipped
  (*"reserved, no consumer v1"*). The bathroom's real function is a
  precondition for the medic vertical, it is a short bridge, and it
  still needs the condition model and a verb — so it defers with
  spoilage (D13).
- **Toilet function.** Stated as a non-goal rather than merely omitted,
  because "the toilet does nothing" is a **decision** (D13) and the next
  person to read the archetype should not mistake it for unfinished
  work.
- **The bathroom debate.** Public-accommodation access is a legislature
  obstacle course belonging to civics content. A private residential
  bathroom raises no access question; this build takes no position that
  could constrain that design. D14 ships the field it will consume and
  nothing else — no enforcement, no vocabulary, no locality rule.
- **Enforcing a posted designation, in any mode.** No norm reaction, no
  witness response, no locality rule, no `AccessApi` predicate. The
  designation is written and readable; every consequence of ignoring one
  belongs to the layer that models consequences (D14).
- **New cooking surface of any kind.** No new recipes, no new food
  materials, no `kitchen`-only verb, no change to `cook` / `mix` /
  `heat` / `plate` / the gather walk. The kitchen archetype is
  **authored entirely from shipped parts**; if it needs engine work,
  something is wrong with it.
- **Metered utilities.** Water is unmetered (the dorm's
  `UnboundedReceptacle`, ∞ by design) and the range's fuel reserve is
  not billed to anyone. Sub-allowances and metering are the economy
  layer's, with the rest of rent economics.
- **Land use.** The closed vocabulary typing what a parcel admits is
  stewardship's. Room archetypes here are content identity, not a typed
  gate on what may be placed where; a bathroom that accepts a chest
  freezer is silly but permitted in v1.
- **Room archetype *classes* and their behavior.** Archetypes ship as
  template rows over one class. Promoting a bedroom to `class:
  /lib/residence/Bedroom` later is a one-line template edit — the
  template path is the stable identity — so nothing here forecloses it and
  nothing here pays for it early.
- **Real-world parity / the mirror.** Driving in-game room state from
  real-world sensor feeds is a product thesis of its own, with an
  anti-cheat surface (an assertion the kernel did not witness) that wants
  its own design. It gets a slate; it does not get requirements here.
  This build's only obligation to it is the room-level-state goal above.
- **`claim` and `sell` verbs.** [chattel.md](../subsystems/chattel.md)
  calls a player-facing trade surface "a thin later add" over the shipped
  `transfer` primitive, and retail already ships `buy`/`consign`/
  `reclaim`. Furnishing needs neither.
- **Prose-on-owned-items personalization.** Annotating *your* furniture
  ("my film-school desk") is a whole-document write on expressive prose
  fields — a follow-on slice that needs this build first.
- **Rent economics.** Payment schedules, metered sub-allowances, sublease
  markets, the proprietor-as-Business P&L. The lease *relationship*
  (use-grant + revert) is in scope; the economics are the economy layer's
  (property §K).
- **Owned homes.** The rung above the lease — title to the shell rather
  than a use-grant. The custody/title axis already carries it; this build
  is the top *leased* rung.
- **Co-lease / roommates.** One leaseholder per unit in v1; a use-grant of
  a use-grant (property §K sublet) defers.
- **Fungible-good ownership.** Coins, bulk materials and globs stay
  owned-by-possession — `ChattelApi` already refuses to stamp a glob, and
  nothing here changes that.
- **The sandbox portal as content.** A `SandboxCrossing` is already
  chattel-identified and placeable, so a furnished residence can contain
  one the day this ships. Seeding a residential skin of it is a content
  act, not this build's.

## Surface decisions

### D1 — `place` is a field on the good, not a registry

Where an owned good lives is a **property of the good**, carried in its
persisted state: `place: string` — a room identity, `'inventory'`, or
`'storage'` (the default). It is not a second registry.

The reasoning is the property-slate §I guardrail applied one turn on.
Ownership is a *relation* and therefore lives in a registry
(`ChattelRegistry`, shipped). But *where the owner keeps it* is not a
relation between two principals — it is an attribute of the good, one
value, always present, changing on the same acts that move custody. A
registry would buy nothing and would need reconciling against the
containment tree it duplicates.

Writes are gated to the same authority that already gates chattel: the
good's `place` is set through the chattel logic singleton, never
author- or player-writable as data, so it cannot be forged into someone
else's residence.

### D2 — Host capture skips owner-stamped goods

`captureContainer` filters goods whose `ownerOf` resolves to an explicit
**stamp**; they persist owner-side. Unstamped contents — fixtures, litter,
the dorm's bed — capture host-side exactly as today.

This is the one place the two scopes touch, and the filter keys on the
*stamp*, not on `ownerOf` as a whole. That matters because D5 gives
fixtures a parcel-derived owner: a fixture is *owned* but not *stamped*,
so it keeps riding the room's record where it belongs. Only goods that
have actually changed hands move to the owner scope.

For a dorm room and for Avatar the rule is a no-op — neither holds
stamped goods today — so the change is additive and the existing
behavior is regression-tested, not re-derived.

### D3 — Materialize routes by `place`; storage is not cloned

Restoring an owner's goods routes on `place`:

- `'inventory'` → cloned into the owner's own container, as today.
- `'storage'` → **not cloned at all.** The good is live in the registry
  and in the owner's record, and has no presence in the world. This is
  what makes storage free: it is the absence of a placement, not a place.
- a **room identity** → deferred to that room. The good is cloned and
  placed when the room materializes (D4), not when the owner logs in.

The third case is the one that makes "my chair is in my living room while
I am at work" true, and it is why `place` names a room rather than the
owner naming a container.

### D4 — The room re-placement overlay, ordered after fixtures

A residence room, on materialize, does two things in order: restore its
own record (its **fixtures**, host-keyed, via the shipped seed-then-persist
handoff), then **overlay** the owned chattel whose `place` names it —
cloned as the *owner* principal and placed.

Order is load-bearing: fixtures first means a placed good can rest on a
surface that exists. The room captures nothing owner-side on the way down;
the owner's record is authoritative for chattel, and a room going dormant
simply forgets furniture it never owned.

### D5 — `ownerOf` gains the parcel rung, between stamp and author

Resolution becomes three rungs, total:

```
ownerOf(item) =
  explicit stamp                                     // changed hands
  ?? (templatePath under a parcel extent → that parcel's owner)
  ?? authorOf(templatePath)                          // shipped fallback
```

The shipped two-rung chain (`stamp ?? authorOf`) is right for a good that
exists anywhere in the world, and wrong for a *fixture in a let unit*: it
makes the landlord a content builder. A tenancy needs a landlord who is a
person in the fiction, and the parcel is exactly that person.

Keying on **template path rather than location** is what makes theft
recoverable: an authored fixture stays titled to its parcel even when
carried out of it, so displacement is custody without title and the owner
can recover. Only an explicit stamp transfers it.

The rung is inserted *above* the author fallback, so every good outside a
parcel extent resolves exactly as it does today — no restamp, no
migration, no change to the general store.

### D6 — Archetypes are template rows now; classes when they earn it

Bedroom, kitchen, bathroom and living ship as four template paths over
one generic residence-room class. What distinguishes them is prose and
their `populates:` fixture set — both already declarative data on the
shipped spine.

They are not classes yet because nothing they would do belongs to the
*room*: cooking is conferred by the hearth and the pot, not by the
kitchen (`cook.yaml` — "reachable heat where the recipe wants it, the
pot, and the ingredients"), which is the shipped instrument-confers-verb
rule. A class earns its place when an archetype carries behavior its
contents cannot, and the anticipated case — a bedroom whose state mirrors
something outside the game — is exactly that. It is deferred, not denied.

The promotion path costs nothing: `class:` is a field on the template
row, so a bedroom becomes `class: /lib/residence/Bedroom` by editing one
line, with the template path unchanged as its identity. This is the
`SandboxCrossing` lesson taken forward — the class is the mechanism,
skins are rows — with the difference that these rows are expected to
*stop* being skins.

### D7 — Rooms carry room-level state, not only contents

A residence room's persisted record carries **declared fields of its
own**, not merely a container slice. v1 declares little, but the shape is
established, so an archetype that later carries condition (stewardship)
or an external reading (the mirror) has somewhere to put it without a
spine change or a migration.

This is the single forward-compatibility obligation this build accepts,
and it is nearly free — `persistentFields` on the room class is the
existing mechanism.

### D8 — Furnishing is the shipped verbs made title-aware

No new furnish verb. `put`/`drop`/`place` an owned good → custody moves
via `ContainmentApi`, title stays, `place` is stamped to the room.
`get`/`take` → custody returns, `place` follows to `inventory`. Taking a
good you do not hold title to is **theft** — custody without title,
permitted and recoverable, not blocked.

Function is fixed by the backing class throughout: these verbs move
custody and `place`, never what a thing *is*.

### D9 — The lease is the dorm's lease; revert evicts to storage

Provisioning and revert reuse the shipped parcel surface unchanged
(`subdivide` → `grantUse`; `revokeUse` → `retire`). The one addition is
the eviction rule from D1: ending a lease forces every owned good placed
under the unit to `storage` — intact, titled, recoverable — **before**
the shell reverts. The unit re-lets empty; the ex-tenant's furniture
waits for their next address.

### D10 — Sleep is logout, and logout does not suspend the body

**The question.** A bedroom is the one archetype that already has an
internal function, because sleep is this game's logout state. What does
that function actually consist of?

**The answer: nothing new. The shipped rest model simply does not stop
at disconnect.** Metabolism already recovers by
`posture × restQuality`, reconciled on read from a persisted
`metabolicClockStamp` against `WorldClockApi.getNow()`, sub-stepped at
`STEP_SEC: 60` and capped at `MAX_STEPS: 720` (≈12 game-hours). A player
who logs out lying on a good bed and returns tomorrow gets that
integration at that bed's multiplier. A player who logs out standing in
the street gets it at 1.0. **The delta between those two is the entire
mechanic** — and it is the reason a residence is worth having before
condition, decoration or the ladder exist.

**Parity, not a bonus.** The rule is that offline time is treated the
same as online time, not better. There is no sleep bonus to farm, no
reason to log out strategically beyond "sleep somewhere good," and the
existing `MAX_STEPS` cap plus recovery's self-capping at full endurance
means a week away earns exactly what a night away earns. Absence is
never punished either — logging out badly placed is the *absence* of the
bed's multiplier, never a penalty below the floor. (This is the same
posture the mirror slate takes toward sensor silence, arrived at
independently.)

**The one piece of real work: occupancy must round-trip.**
`PosedMixin` persists `posture`, so an avatar restores *lying*. But
`getOccupiedHost()` is a live scan over slot occupancy
(`SlotApi.findOccupiedHost`), so the *bed* is gone — and
`currentRestQuality()` therefore reads 1.0 on the very reconcile that
was supposed to pay out. Sleep-as-logout is not free; it is this.

The fix rides D4's existing ordering. The occupied host and slot name
are captured owner-side (they are facts about the sleeper, not about
someone else's furniture), and re-occupied on materialize **after** the
room's fixtures have restored — the same "fixtures first, then the
overlay" rule, extended one step. A bed that no longer exists, no longer
admits the posture, or is already occupied degrades to the room floor:
you wake in the room, standing, at 1.0. Never an error, never a
teleport.

**Why not a `sleep` verb.** `lie` on a bed already is the act; a second
verb for the same body state would be a synonym with a mood attached
(project memory: `prefer-subcommands-over-verbs`). A real sleep *state*
— distinct from lying down, with its own condition, its own
interruptions and its own vulnerability — is a genuinely different and
larger thing, and it is a non-goal above.

### D11 — Room-general surfaces: named, homed, not yet running

Every room, not just a bedroom, plausibly carries **energy draw, debris
on the floor, air quality, and pests**. They are settled here because
choosing their home late is what forces a migration, and because two of
them turn out not to be their own systems at all.

| Surface | Home | Why |
|---|---|---|
| **Energy draw** | the *fixture*, aggregated by the room | A lamp knows its own draw; a room does not have a wattage. This is the instrument-confers rule applied to consumption, and it is how a metered sub-allowance would later bill without the room knowing anything new. |
| **Debris** | a room-level field (D7) | The one genuinely room-general quantity — it accumulates on the floor, not on any object, and it is the natural first tenant of the declared-fields seam. |
| **Air quality** | `AtmosphericMixin` on `Location`, **shipped** | `_temperature`, `_humidity` and `_atmosphere` already exist and are already read by thermal and respiration. Air quality is a fourth reading on an existing face, not a new room concern. |
| **Pests** | **emergent — no field at all** | Pests are what happens when debris and food sit long enough in a space that admits them. Modelling them as their own room cadence would double-count the two inputs that actually cause them, and would make the fix ("clean up") arbitrary rather than causal. |

None of these runs in v1: each wants a cadence, and a cadence over an
unmaintained quantity is a condition model. What ships is the seam and
the placement. The bedroom is where they will first *matter* — debris
and air are exactly the inputs a derived `restQuality` would read — which
is why they are decided alongside D10 rather than after it.

### D12 — The kitchen is a bundle, and that is the finding

**The question.** The bedroom turned out to have an internal function
already (D10). Does the kitchen?

**The answer: no — and the codebase says so out loud.** `CookPot.yaml`,
shipped: *"Portable capital: reachable heat + a pot is a kitchen,
anywhere."* Cooking is conferred by the instruments — reachable heat
where the recipe wants it, the pot, the ingredients (`cook.yaml`, the
shipped affordance rule). A kitchen *room* confers nothing, and no
future kitchen function is visible that would change that (see the
spoilage note below, which is the strongest candidate and still fails).

So the kitchen is the archetype that **proves D6**: bedroom is the one
that will eventually earn a class, kitchen is the one that never will.
Having both in the same build is what makes the "template rows now,
classes when they earn it" rule checkable rather than asserted.

**What it delivers instead: the errand collapse.** A kitchen is worth
having because it makes the shipped cooking loop *local* — standing
heat, plumbed water, a work surface, and food in reach, in the home you
already live in. That is exactly the value shape the dorm already
demonstrates with one fixture: the tap exists so that "filling a
watering can needs no errand." The kitchen is that argument, four times
over, and every piece of it already ships:

| Fixture | Shipped part | Note |
|---|---|---|
| range | `/obj/Oven` (`FurnaceMixin` + `Reserved` + `Thermal` + `LightSource`, 500 K, lit with `ignite`) | a residential skin of the Hearthworks cookhouse hearth |
| tap | `UnboundedReceptacle`, `interiorMaterial: /lib/material/bulk/water` | the dorm's exact fixture; water is unmetered here (rent economics is a non-goal) |
| counter | `Surfaced` work surface | the dorm desk's shape; `placeOn` already works |
| larder | `/obj/Chest` skin | **open/closed already means something**: the craft gather walk descends one level into *open* room containers, so an open larder is ingredients in reach and a closed one is storage |

**Built-ins are the landlord's; the pot is yours.** This is D5's best
demonstration, because a kitchen is precisely what a landlord fits out
and a tenant argues about. The range, tap, counter and larder are
authored fixtures under the unit's parcel extent, so `ownerOf` resolves
them to the landlord and carrying one off is theft-recoverable. The
`CookPot` is a movable the tenant owns — its own docstring already calls
it *portable capital*, and portable capital is chattel. The dorm sets
the precedent exactly: university-owned bed/desk/footlocker/tap, plus a
watering can and a starter pot you keep.

Note the two guards are independent and both shipped: the pantry chest
is 90 kg — *"a fixture by encumbrance (the anvil rule): nobody walks off
with the pantry"* — and D5 adds title on top. Physical and legal, and
neither needs the other.

**The one thing the kitchen room genuinely owns: you run a fire
indoors.** This is the real difference from every other archetype, and
it is entirely shipped. `FireLogic` computes
`ventilated = isSkyExposed(room) || openNeighboursOf(room).length > 0`;
a scope holding a finite `air` reserve with a lit fire and no
ventilation burns **incomplete** — smoke and carbon monoxide, the medium
turns un-breathable, `RespirationMixin` takes the CO on as a metabolism
burden, and the fire self-smothers. `SealedCellar` is the shipped
lesson, in a cellar, where nobody lives.

**The decision: the kitchen authors an `air` reserve.** One YAML block,
copied from `cellar.yaml`, no code. The reasoning: it is the only
mechanic in this build that is genuinely *about the room* rather than
its contents; it makes the unit's interior doorways mean something; it
is true, and it is the best thing a kitchen has ever taught anybody. It
is also forgiving by construction — *any* open neighbour ventilates, an
apartment kitchen has a doorway, and the failure mode of getting it
wrong is "the stove went out and the room stinks," not death by
accident. The escape hatch is symmetrical: deleting the block restores
`airReserveOf → null` → "open air (unlimited)", with nothing else
touched.

**Spoilage is named, and homed away from the room.**
`seeds/lib/metabolism/conditions/ptomaine.yaml` ships today — food
poisoning *"from spoiled food"*, with a full toxin behavior and **no
producer anywhere in the world**. Preservation is the kitchen's most
anticipated future system and the thing that would make a larder more
than a chest. It is still not a kitchen function: **spoilage belongs to
the food, modulated by the container it sits in** (open counter vs.
closed larder vs. a cold store), which is the same shape as D11's pest
answer and the same reason. So even the kitchen's best future does not
promote it to a class. It lands with the condition model — spoilage is
decay without transmission, and its clock starts at an act.

### D13 — The bathroom is presence, and the tub is its one affordance

**The question.** The bedroom has a function (D10); the kitchen has
none and is a bundle (D12). What is the bathroom?

**The answer: a third kind — presence.** The toilet paradox is that a
residence *without* one reads broken and every player will look for it,
while modelling what a toilet is *for* would be the worst return on
effort in the corpus. Both halves are true at once, and the resolution
is to satisfy the first and refuse the second, **on purpose and in
writing**, so that nobody later mistakes the absence of a mechanic for
an oversight and "fixes" it.

So the toilet is a `Detailed` fixture with prose and **no affordance at
all**. That is the finished design, not a stub.

**The general rule it forces — the LOD ladder.** A fixture is modelled
to the depth at which the world actually reads it, and no deeper. The
bathroom is where that rule has to be stated because it is the only room
whose fixtures sit at three different rungs at once:

| Fixture | Rung | Why there |
|---|---|---|
| toilet | **prose only** | read as scenery; its function is never invoked |
| basin | **real water** — the dorm tap's `UnboundedReceptacle` | filling and pouring are shipped acts, so a basin that isn't a water source is a worse lie than one that is |
| tub | **a real affordance** — `Postured` | it is the one thing in the room a body does something in |

**The tub is the bathroom's bed.** `PosturedMixin` already carries two
authored attributes: `restQuality`, read by metabolism's coupled
recovery, and `warmth`, read by `ThermalRegulation` off the host whose
posture slot the body occupies. A campfire log-seat authors both. A tub
is exactly that shape — get in, recover, get warm — and it needs **zero
code**, precisely like the bedroom's bed. This is what keeps the
bathroom from being decoration.

One honest caveat: `warmth` is a *constant* slot attribute refreshed on
occupy/leave, deliberately piecewise-constant between discrete events.
An authored-warm tub is therefore "always warm," which is the same small
lie the shipped campfire seat already tells. The alternative — `warmth:
0` until hot water is modelled — buys accuracy nobody asked for and
costs the room its only affordance. Author the warmth; if metered
utilities ever arrive, the number is one field.

**Washing is enabling, and it is deferred with two seams already cut.**
The bathroom's real future is not hygiene-for-its-own-sake but hygiene
as a **precondition for other people's work** — the nurse who must wash.
Two shipped facts make that bridge unusually short:

- `DressingMixin.dressingQuality` — *"0 (filthy) .. 1 (clean/sterile)"* —
  is consumed by `treat` (outcome = competence band × dressing quality)
  and is **authored per template with no producer in the world**. An act
  at a basin that sets it is nearly the whole feature.
- `Condition.contagion` is present and explicitly *"reserved, no
  consumer v1"*. Handwashing is the chain of infection, and the chain of
  infection is that field.

Both are the `ptomaine` shape from D12: a consumer with no producer,
waiting on the condition model. Washing also **adds a verb**, which
D12's authored-not-coded constraint forbids. Deferred — but the two
seams are named here so the eventual build knows it is a bridge, not a
subsystem.

And when it lands it still does not belong to the room: cleanliness is
an attribute of the *item* and the *body*, modulated by the fixture you
use — the same argument as spoilage (D12) and pests (D11). **Two of the
three non-bedroom archetypes will never earn a class**, which is the
strongest evidence D6 could ask for.

**Water by address tier, not by archetype.** Which water fixture a
bathroom gets is a property of *where the residence is*: a tap in
Terminus, a pump or a hauled bucket on the frontier. The archetype
declares that it has a water source, and the tier picks which. This is
decided now rather than later because build-2's Hinkley Hills house is
this substrate's intended second consumer and must not inherit
municipal plumbing by accident. v1 ships the tap; the finite,
regenerating source that would make a frontier pump mechanically
different is already named as deferred in `UnboundedSource`'s own
docstring, and that is where the tier distinction will eventually bite.

**The interior lock.** The bathroom is the one room in a home that locks
from the inside. `Lockable` ships, so the door can carry it as authored
detail — but with one leaseholder per unit (co-lease is a non-goal) it
has no mechanical consequence in v1. It is recorded because it is the
exact seam co-lease, guests, and the prison's panopticon would consume,
and because its absence would otherwise look like an oversight.

**Whose bathroom it is** — unisex, gendered, staff-only — is a real
thing a room needs to be able to say, and D14 gives it the field. What
the field is *not* is a gate.

**Not the bathroom debate.** That design is an obstacle course for a
legislature, and it is entirely about **public accommodation** — a
private residential bathroom raises no access question whatsoever. It
belongs to civics content, is deliberately untouched here, and this
build takes no position that could constrain it. D14 exists so that
build inherits a seam instead of a migration.

### D14 — A room can be *posted*. The kernel reads the sign; it never
enforces it

**The question.** A bathroom should be able to say whether it is unisex
or gendered. What carries that, and what reads it?

**The answer: a posted designation on the room, opaque to the engine.**
A room-level field — `unrestricted` by default — holding *what the sign
on the door says*. The kernel's entire job is to make it visible and
queryable. **Nothing in movement, `AccessApi`, or any exit ever consults
it.**

**Why the kernel must not enforce it — from the shipped types, not from
delicacy.** To gate entry the engine would have to pick an identity axis,
and it ships exactly two, deliberately kept apart:

- `SexedMixin` — *"Sexed is biology, not gender."* Its valid set is
  derived from the host species' `sexDeterminationSystem`: `xy` yields
  `['male', 'female', 'intersex']`, `monoecious` yields
  `['male-and-female']`, `hermaphroditic-simultaneous` yields
  `['hermaphrodite']`, `none` yields `[]`.
- `GenderedMixin` — pronouns and social presentation: `he/she/they/it/ze`,
  self-set, and the shipped Avatar default is `they`.

**Neither axis partitions in two.** A hard rule on either would
immediately have to answer *what about `they`*, *what about a monoecious
species*, *what about a creature whose species declares no sex at all* —
and whatever it answered would be a **position, compiled into the
engine, for every locality forever**. A platform that hands its
legislature real questions cannot pre-answer this one in C-code. The
kernel stays neutral because the data does not split, which is a
stronger reason than taste.

**What does the enforcing, then.** The layers that already model
compliance, in ascending hardness:

| Mode | Mechanism | Status |
|---|---|---|
| **norm** | nobody stops you; people *react* — reactions, regard, renown all ship | free today |
| **witness** | someone sees, and says something | free today |
| **law / policy** | a locality declares a rule; the three-tier kernel/law/policy resolve, as civics' `charter` already does | the public build's |
| **wall** | a locked door and a credential — `Lockable` + the credential substrate | shipped, and **identity-blind** |

The wall rung is the honest one: an author who genuinely wants a room
nobody may enter *locks it and issues keys*. Physical exclusion is a
physical object, and it never asks who you are — only what you carry.

**An open label, not an enum of identities.** The field holds a string
the fiction posts, not a closed set the engine understands. This is what
keeps the defamiliarization route open: species-as-race-allegory is the
corpus's standing doctrine, and a designation vocabulary that is *not*
the real-world one is what makes the legislature's argument playable
rather than a re-enactment. That is the public-accommodation design's
call to make; this build's only obligation is not to foreclose it, and
an opaque string forecloses nothing.

**It belongs to rooms, not to bathrooms.** A staff room, a members'
club, a ward and a private study are all posted; the bathroom is merely
the room that made the omission obvious. So the field lands as D7
room-level state on the residence-room base — the same generalization
D11 made for debris — and the residential answer is `unrestricted`,
read by nothing.

## Constraints

- **No furnishing subsystem in the module sense.** No `FurnishingApi` /
  `ApartmentApi` / `lib/apartment/`. The engine work belongs to the
  existing possession and persistence spines; the building, floorplan,
  fixtures and door are **content** over the shipped `Warren`, parcel and
  persistence substrates — the dorm's precedent, which needed almost no
  dorm-specific code.
- **No `OwnableMixin` / `PossessableMixin`.** Ownership is a relation
  (property-slate §I). `ChattelMixin` already carries only the good's
  *identity* and is the settled resolution of that guardrail; nothing here
  adds an ownership capability.
- **`place` writes go through the chattel gate**, never a public setter
  and never author-writable data.
- **Actor from `ExecutionContextApi`, never a parameter** — every
  title-aware verb derives its acting principal from context (project
  memory: `gated-api-actor-from-context`).
- **No `Named` on generic residence objects** — rooms, fixtures, doors and
  generic furniture take `Visible.shortDescription`; proper names only for
  proper names (project memory: `named-mixin-proper-names-only`).
- **Dorm and Avatar persistence must not regress.** Owner-based
  persistence is strictly additive — a new owner-side scope beside the
  host-side one — and the dorm's room records and Avatar's inventory keep
  byte-identical behavior. This is a named regression test, not an
  assumption.
- **`ownerOf`'s existing callers must not change behavior.** The parcel
  rung is inserted between the two shipped rungs; the general store and
  every current consumer resolve identically for goods outside a parcel
  extent.
- **Globs stay out.** `ChattelApi` refuses to stamp a `Globbable`; a
  fungible stack has no `place`.
- **Go through the Api layer** — persistence via the spine, title and
  `place` via `ChattelApi`, custody via `ContainmentApi` (project memory:
  `no-logic-module-imports`).
- **`clone()` is not modified.** `place` is instance state carried by the
  spine, not a clone-time injection.
- **Metabolism is not modified.** D10 changes *what the reconcile sees*
  (a restored bed), never how it integrates. No new recovery term, no
  offline multiplier, no second clock — `metabolicClockStamp`,
  `STEP_SEC` and `MAX_STEPS` stay exactly as shipped, and the cap stays
  the thing that makes a long absence bounded.
- **Occupancy restore is best-effort and never throws.** A missing,
  changed, or occupied bed degrades to the room floor. Restoring a
  player must not be able to fail because their furniture moved — the
  same posture the spine already takes to a `fitsSlot` veto during
  restore.
- **Re-occupancy respects the shipped slot contract.** Restoring goes
  through `SlotApi`'s occupy path so `fitsSlot`, capacity and
  `onSlotReleased` witnesses behave identically to a live `lie` — it is
  not a raw write into the host's slot map.
- **`restQuality` stays authored data.** Beds carry it as a template
  field; nothing in this build derives it.
- **The posted designation is opaque to the engine.** It is never
  compared against `getPronouns()` or `getSex()`, never consulted by
  `AccessApi`, a movement validator, an exit, or a locomotion check, and
  it is not a closed enum. A grep for the field name must find the
  declaration, its accessors, its tests and its prose — and no consumer.
  This is the constraint that keeps the kernel out of the identity
  business, and it is the one D14 is for.
- **The kitchen is authored, not coded.** Every fixture in D12 is an
  existing class with a new seed row (`Oven`, `UnboundedReceptacle`,
  `Chest`, a `Surfaced` counter) and the air reserve is a copied YAML
  block. No new mixin, no new class, no new verb — this is the check
  that D6's "archetypes are template rows" claim is real.
- **Dormancy must not run the kitchen.** Fuel drain, air consumption and
  smoke are *tick-driven*, not reconcile-on-read, so a dormant unit's
  range burns no fuel and suffocates nobody, and a unit that wakes with
  a lit range resumes from where it stopped. This is the expected
  behavior, not a defect to correct — but it is a named test, because
  the opposite (a tenant returning to an empty fuel reserve after a week
  away) would be a silent tax on being offline and would contradict
  D10's parity rule.

## Acceptance criteria

- **`place` round-trips.** An owned good carries a `place`; setting it is
  gated; it survives capture/restore; a glob cannot carry one.
- **The skip rule holds and is a no-op where it should be.** A room
  containing a *stamped* good does not capture it in its own record; a
  room containing an unstamped fixture does. A dorm room and an Avatar
  with no stamped goods capture and restore **byte-identically to
  today** — named regression tests.
- **Storage is the absence of a placement.** A good with `place =
  storage` is not cloned into the world on materialize, remains titled and
  recoverable, and eviction never destructs it.
- **The furnish loop persists.** Lease a unit → it materializes empty of
  movable goods → place owned furniture across its rooms → after dormancy
  and a restart the unit reconstitutes with the same goods in the same
  rooms, and its fixtures respawn separately.
- **The guest-drop leak is closed.** A visitor's dropped good is titled to
  the visitor, rides the visitor's record, names the foreign room as its
  `place`, re-appears there on that room's next materialize, and never
  appears in the host's record.
- **`ownerOf` is three rungs and is total.** A stamped good resolves to
  its stamp; an unstamped good under a parcel extent resolves to that
  parcel's owner; an unstamped good outside any extent resolves to its
  author; neither → `null`. Existing consumers are regression-tested
  unchanged.
- **Fixture displacement is theft, recoverable.** Carrying a let unit's
  fixture out of the unit leaves it titled to the parcel owner; the owner
  can recover it; only an explicit stamp transfers it.
- **Four archetypes exist as content.** Bedroom, kitchen, bathroom and
  living each seed their own fixture set from `populates:`, are editable
  without code, and share one room class.
- **Rooms carry room-level state.** A residence room declares and
  round-trips at least one field of its own, distinct from its contents —
  the seam D7 exists to establish.
- **You wake where you slept.** Log out lying on a bedroom bed; after
  dormancy and a restart, the avatar restores *on that bed*, in that
  posture, and `getOccupiedHost()` returns it. Restoring after the bed
  has been sold, moved or destroyed leaves the avatar in the room,
  standing, with no error raised — a named test for each degradation.
- **Sleeping somewhere good pays, and only that.** Two identical avatars
  logged out for the same elapsed game-time — one on a `restQuality` bed,
  one on the floor — reconcile to *different* recovery, in the bed's
  favor, and the difference is exactly the multiplier. A third logged out
  for a week reconciles to no more than the `MAX_STEPS` cap allows, and
  no avatar recovers past full. Recovery on the floor is not below the
  no-residence baseline.
- **A posted room says so and stops there.** A room's designation
  round-trips as room-level state and is readable; a character whose
  pronouns or sex differ from anything the sign says walks in and out
  freely, with no denial, no note and no message. Two named tests: the
  field persists, and **entry is unaffected** — the second being the one
  that pins D14's whole point.
- **The tub is a real rest surface, and it is warm.** Getting into a
  bathroom tub occupies a posture slot, and metabolism's coupled
  recovery reads its `restQuality` while `ThermalRegulation` reads its
  `warmth` — the same two reads the campfire seat already exercises,
  asserted here over the new fixture.
- **The toilet does nothing, deliberately.** A named test asserts the
  toilet fixture exposes no affordance — it is `Detailed` prose and
  composes no capability mixin. The test exists so the decision is
  enforced rather than remembered.
- **The water source is chosen by tier, not by archetype.** The bathroom
  and kitchen resolve their water fixture from the unit's address tier;
  the archetype row declares that a water source exists and does not
  name a tap. A second tier authored in a test fixture yields a
  different fixture with the archetype row unchanged.
- **You can cook at home, with no engine change.** In a leased unit's
  kitchen: `ignite` the range, `cook` a learned dish using the larder's
  ingredients and your own pot, and eat it — start to finish, with the
  only new artifacts being seed rows. A named test asserts the archetype
  adds **zero** new classes, mixins or verbs.
- **The larder's lid is load-bearing.** Ingredients in an *open* larder
  are reachable by the craft gather walk; the same larder closed, they
  are not — the shipped behavior, pinned here because the archetype now
  depends on it.
- **The kitchen ventilates or it doesn't.** A lit range in a kitchen
  whose door is open burns complete and clean. The same range with every
  boundary closed burns incomplete, fills the room with smoke and CO,
  makes the medium un-breathable, and self-smothers — and opening the
  door recovers the air and clears the smoke. Three named tests, all
  over shipped `FireLogic` behavior.
- **Kitchen built-ins are the landlord's, the pot is the tenant's.** The
  range, tap, counter and larder resolve through `ownerOf` to the parcel
  owner and are recoverable if carried out; the cook pot is tenant
  chattel that leaves with the tenant and survives eviction into
  storage.
- **The bedroom bed is lieable.** The bedroom archetype's bed is
  `Postured` with a `lie` slot and an authored `restQuality > 1`, and
  `lie on bed` works the day the archetype seeds — distinguishing it from
  the shipped dorm `Bed`, which is a `Surfaced` prop and stays one.
- **Multi-room and lease-gated.** A unit's rooms connect within the unit;
  the front door gates on the lease; a non-leaseholder cannot enter.
- **Revert evicts to storage.** Ending a lease returns the tenant's goods
  to storage intact and titled, reverts the shell clean, and the unit
  re-lets empty. Re-provisioning a different unit and re-placing from
  storage furnishes the new one.
- **Function is fixed** — no title or custody verb changes a good's class.
- **Full server suite green**, and a `docs/subsystems/` page documents
  owner-based persistence, the furnishable residence, the archetypes, and
  the deferred seams (condition/stewardship, land use, archetype classes,
  the mirror, rent economics, owned homes, co-lease).

## Cross-references

- Seeding slate:
  [property-slate](../slates/builds/property-slate.md) §I (chattel &
  persistence, the seed-then-persist handoff), §J (custody vs. title),
  §K (rent vs. own, the lease)
- Boundary: [stewardship-slate](../slates/builds/stewardship-slate.md) —
  owns condition, land use, and the residence ladder's gate; this build
  ships a rung and the seam, never the ladder
- Sibling rung: [residence.md](../subsystems/residence.md) — the dorm,
  the `(scope, key)` spine, `seedBornWith`, and every content precedent
  (`DormWarren` / `DormRoom` / `DormDoor`)
- Substrates: [chattel.md](../subsystems/chattel.md) (title, the registry,
  `ownerOf`), [persistence.md](../subsystems/persistence.md) (the spine),
  [parcel.md](../subsystems/parcel.md) (subdivide / lease / retire),
  [residency.md](../subsystems/residency.md) (dormancy),
  [containment / spatial.md](../subsystems/spatial.md) (custody)
- Sleep-as-logout (D10): [posture.md](../subsystems/posture.md)
  (`Postured` / `Posed`, the posture-bearing slot, `restQuality`),
  [slot.md](../subsystems/slot.md) (occupancy, `fitsSlot`, capacity),
  [metabolism.md](../subsystems/metabolism.md) (reconcile-on-read,
  coupled recovery), [connection.md](../subsystems/connection.md)
  (what logout actually does), [vitals.md](../subsystems/vitals.md)
- The kitchen (D12): [crafting.md](../subsystems/crafting.md) (`cook`,
  the gather walk, `Recipe` docs, the Hearthworks cookhouse this is the
  domestic sibling of), [fire.md](../subsystems/fire.md) (`FurnaceMixin`,
  fuel reserves, the complete/incomplete burn and the ventilation
  lesson `SealedCellar` teaches), [bulk.md](../subsystems/bulk.md) (the
  tap, `fill`/`pour`), [metabolism.md](../subsystems/metabolism.md)
  (meal chemistry, `ptomaine` awaiting a producer),
  [respiration.md](../subsystems/respiration.md) (CO as a burden),
  [retail.md](../subsystems/retail.md) (where ingredients come from)
- The bathroom (D13): [posture.md](../subsystems/posture.md)
  (`restQuality` + `warmth` on the posture-bearing host — the tub),
  [thermal.md](../subsystems/thermal.md) (`ThermalRegulation` reads the
  seat's warmth), [harm.md](../subsystems/harm.md) (`DressingMixin`,
  `treat`, and the sterility axis awaiting a producer),
  [boundary.md](../subsystems/boundary.md) (`Lockable` — the interior
  lock), [address.md](../subsystems/address.md) (the tier that picks the
  water fixture). Absorbs the *residential* half of the unwritten
  bathroom design (the toilet paradox, the LOD ladder,
  washing-as-enabling, taps-vs-pumps); its public-accommodation half
  stays unwritten and out of scope.
- The posted designation (D14): [race.md](../subsystems/race.md) and
  `lib/character/Sexed.ts` + `lib/character/Gendered.ts` (the two
  identity axes the corpus keeps apart, and the reason neither can gate
  a door), [access.md](../subsystems/access.md) (the predicate surface
  this field is deliberately *not* added to),
  [credential.md](../subsystems/credential.md) +
  [boundary.md](../subsystems/boundary.md) (the wall rung — lock and
  key, identity-blind), [civics.md](../subsystems/civics.md) (the
  `charter` field's precedent: an inert seam a later law layer resolves)
- Room-general surfaces (D11): [thermal.md](../subsystems/thermal.md) and
  [respiration.md](../subsystems/respiration.md) (the shipped
  `AtmosphericMixin` readings air quality joins),
  [light.md](../subsystems/light.md) (`AmbientLit`, now composed on
  `Location` — the precedent for a room-general reading)
- In flight: build-2's Hinkley Hills — the suburb house is this
  substrate's intended second consumer; it defers house interiors,
  furnishing and chattel-title here
- Follow-on: the mirror / real-world-parity slate (to be captured);
  prose-on-owned-items personalization
