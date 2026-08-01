# Mortality — requirements

The dying arc: the missing other half of every risk system in the game.
Nine subsystems can kill a character and nothing can bring one back — seven
sites write `lifecycleState = 'dead'`, three of them byte-identical
copy-pasted helpers, and **no non-test code anywhere writes back to
`'alive'`**. Worse, `Avatar` carries the dead state through the
self-persistence spine, so a player who dies today is **bricked
permanently**. This build ships the transition driver that
`Vitals.getConditionBand` already documents as deferred ("the deferred
driver owns transitions"), and the recovery arc that makes death an
experience rather than a penalty screen.

Seeded by [mortality-slate](../slates/builds/mortality-slate.md); the
design authority is
[mortal-vessel-slate](../slates/deferred-rpg/mortal-vessel-slate.md), whose
moderation/prison half stays unbuilt. Substrate:
[vitals.md](../subsystems/vitals.md), [harm.md](../subsystems/harm.md),
[race.md](../subsystems/race.md),
[sandbox.md](../subsystems/sandbox.md) (**the Forkable substrate**).

## Goals

- **Dying is a rescuable state with a clock**, not an instant transition.
  Every lethal driver enters it; the clock, not the threshold, kills.
- **A dying body can be stabilized by another character** through the
  already-shipped medic loop, making a non-combat Discipline decide a
  fight's outcome for the first time.
- **One transition path.** The seven duplicated death flips collapse to a
  single call that every driver uses.
- **A player who dies is never stuck.** The bricking defect is fixed: dead
  state cannot outlive a session as an unrecoverable snapshot.
- **The corpse is a persistent, separate forensic object** whose lifecycle
  is independent of whether the player ever returns — it decays, degrades
  as evidence, holds the loadout, and can be examined.
- **A corpse can never be reanimated**, enforced by protocol rather than by
  policy.
- **The dead participate.** A shade retains full platform function and roams
  the ordinary map wherever the general public may go, perceptible to the
  attuned in proportion to their awareness competence.
- **Death is an experience, and the engine owns only its two edges** — the
  transition out (corpse + shade) and the transition back (a new body).
  What happens between them is content's, built on shipped systems.
- **Content can build the other world without engine work** — a
  shade-perception axis exists and is unused by this build.
- **Death feeds its two ledgers.** A chronicle deed at every death; an
  accountability row from every driver, not just combat.

## Non-goals

- **Parcels, land use, zoning, per-location extent.** Two builds are live
  (farming/stewardship; residences/property). Not touched, not read for
  policy. The shade's mobility rule is deliberately designed to need none
  of them.
- **The residence spine.** Consumed read-only; the residences build owns it.
- **Any underworld place, ghost-only content, or the Hades journey.** The
  *axis* ships; nothing is authored on it. → a follow-on underworld /
  resurrection-service content build.
- **The resurrection business.** Needs no engine work once the route
  registry exists (employment, retail, banking, attendant queues all
  shipped). → the same follow-on.
- **The full medic vertical** (clinic, pharmacopoeia, surgery, diagnosis
  surface) → [health-vertical-slate](../slates/builds/health-vertical-slate.md).
- **Disease / contagion** → [disease-slate](../slates/builds/disease-slate.md).
- **A route / terms vocabulary.** Deliberately not built — see the
  two-transitions decision. The passage ladder (trial, bargain, Orpheus
  quest) is content calling `reembody`, not data in a schema.
- **The patron-mint economy, the coroner/scrapper labor economy, courts
  adjudication, permadeath, the moderation/prison skin** — mortal-vessel's,
  unbuilt.
- **Corpse remains** (bones, ash) after terminal decay.
- **Spectating the living world beyond ordinary shade perception.**
- **The in-circle death arc** — no sandbox shade, no sandbox passage. The
  full arc cannot be rehearsed inside a holodeck; a circle death ejects.
  → slated.
- **New Apis.** Death rides `ConditionApi`, `SpeciesApi`, `ChronicleApi`,
  `AccountabilityApi`, `ConnectionApi`, `PersistableApi`, `ChattelApi`,
  `PerceptionApi`.
- **New cast.** NPCs are expensive carves; this is a systems build.

## Surface decisions

### Death is the sandbox crossing run backwards

The sandbox forks the *person* out of the body and discards the body. Death
forks the *body* out of the person and discards the person's claim on it —
the same `ForkableMixin` protocol (`lib/persistence/Forkable.ts`), with a
complementary slice family.

| | sandbox (shipped) | death (this build) |
|---|---|---|
| fork slices | `Presentation`, `Embodiment`, `ClientState`, `Environment`, `Alias` — the **shell** | `Vitals`, `Trauma`, `CauseOfDeath`, anatomy — the **material / forensic record** |
| merge allowlist | epistemic only (`Contacts`) | **none** |

The material family is **fork-only by construction**. Forkable's own
contract states the rule this build inherits: *"Material slices simply have
no merge path back; there is no 'trusted mixin' escape."* Adding a
`mergeSlice_` for any material slice is the single edit that would silently
undo the design; it is an antipattern entry, not a future option.

### A corpse is a `Creature` — the tier already exists for this

No `Corpse` class. `lib/creature/Creature.ts` is documented as the corpse
tier ("a bare `Creature` is a valid non-agent body (a frog, **a corpse**, a
test fixture)") and already composes everything needed: `Container` +
`Containable` (holds the loadout, can be hauled), `Vitals` + `Organism` +
`BodyPlanSlots` (the wound map), `Thermal` (algor mortis as a passive
drift — already tested in `Thermal.corpse.test.ts`).

### The doctrinal split — one rule, two mechanisms

race.md's **death ≠ destruction** rule holds; what varies is whether an
identity has to leave.

- **NPCs, creatures, beasts** — unchanged: the same Stuff becomes the
  corpse. Zero new machinery.
- **PCs** — the identity must leave, so the body splits: a new `Creature`
  takes the material slices and the loadout, and the drained Avatar is
  destructed.

`ConditionApi.die()` is one call either way, branching on whether the host
carries a player identity. Both paths end with a persistent Creature-tier
body in the world. **race.md is amended at sweep time**, not silently
contradicted.

### Dying is a condition with a clock; the driver supplies the window

Generalize the pattern Respiration already runs (a condition row
accumulating `elapsed` on reconcile, lethal at a threshold) into one
`dying` condition. It inherits persistence and reconcile-on-read for free.
**No parallel timer, no scheduler tick.**

The window is **supplied by the driver that knows the physics** —
exsanguination is minutes, hypothermia is not — following the shipped
`RESPIRATION_DEFAULTS.ANOXIA_LETHAL_SEC` precedent, with a default for
drivers that don't care. Same rule as consent below: the producer that knows
the fact supplies it.

**Accepted consequence:** a dying character nobody reads does not progress
until someone reads them, and the gap resolves retroactively on discovery.
"Died alone in the woods" resolves when found, not in real time. This is the
same bargain metabolism and harm already take; the alternative is a tick per
dying body.

`getConditionBand()` grows `dying` between `critical` and `dead`.
Consciousness needs no change — a dying body reads `unconscious` through the
shipped derivation, so animate verbs stop dispatching for free.

### Who gets a dying window

**Any Organism with vitals** — not gated on sentience, so a vet stabilizing
a dying animal is the same loop (and pays off directly for the pets/ranching
line). Combat's non-sentient **cull is untouched**: `handleDown`'s
three-case branch stays exactly as shipped.

### Stabilization rides the shipped medic loop

`treat` with a dressing already arrests a bleed and mints a graded
`ActSignature` against `medicine` competence. This build adds only the seam
where a successful treatment **clears the `dying` condition**, dropping the
body to `critical` — rescued, not healed. `assess` on a dying body reports
how long they have and what is killing them, **sharpened by competence**
(a novice reads "they're dying") — competence buys information, never
outcomes.

### The shade walks; it never phases

A shade is a `WireBody` sibling: an Avatar subclass, `shouldPersist() →
false`, registered with `PlayerApi` (below), `getIdentityPath()` →
`/obj/Avatar/<playerId>`, carrying the five shell slices the sandbox already
forks.

Mobility rule: **a shade goes anywhere an ordinary member of the public
could walk, and nowhere else.** This needs no new access model and no
contact with parcels — a shade is a baseline vessel with **no keys, no
credential wallet, no gear**, so the shipped `Lockable` / credential
machinery confines it to the commons automatically. Ordinary exits,
ordinary traversal gates, ordinary refusals. No wall-phasing, ever.

### The shade is an Avatar subclass — activations differ, composition doesn't

No parallel ghost stack. The sandbox already wrote the reason: *"the
crossing must preserve the whole verb surface … re-deriving it as a parallel
stack would be drift by construction."* A lighter class would start missing
verbs immediately.

| | Avatar | Shade |
|---|---|---|
| persistence | captures to `holder_snapshots` | `shouldPersist() → false` |
| `PlayerApi` registry | registered | **registered**, after the old Avatar is destructed |
| identity | `/obj/Avatar/<playerId>` | same (threaded) |
| material verbs | allowed | refused by `requiresEmbodied` |
| lifecycle state | `alive` | `undead` |
| attunement | cranial implant, or born-attuned species | intrinsic, no object |

**`undead` is a shipped state that means exactly this.**
`SpeciesLogic.isAnimate` reads `state === 'alive' || state === 'undead'` for
Animalia, so an undead shade passes `requiresAnimate` — it walks and speaks
— while being unambiguously not a living body. race.md shipped the state and
nothing uses it today; the shade is its first consumer. A separate
bodiless-self state would only earn its keep if a *material* undead (a lich)
later needs distinguishing, and species-level `lifecycleStates` can draw
that line then without a migration.

**The shade IS registered with `PlayerApi`** — unlike `WireBody`, whose
non-registration exists *because the parked field avatar keeps the slot*. In
death there is no field avatar; it is destructed. An unregistered shade would
drop out of `who`, `tell`, presence, and channel audiences
(`ChannelCatalogue.audienceFor` enumerates `PlayerApi.getAllAvatars()`),
breaking function-over-form — the design's one hard floor. Registration
happens **after** the old Avatar is destructed (see the ordering constraint).

**Attunement is intrinsic, not hardware.** `Species.intrinsicMixins`
already supports it (*"A born-attuned species declares `['AetherMixin']`"*)
and `installDefaultLoadout` keys off `MixinApi.isActive(this,
"AetherMixin")`, not off owning an implant. The shade activates the mixin
directly — no gear, no slot occupancy, and the honest expression of "the
ghost is still on the network."

### The survival drivers must gate on "is a living body," not "is not dead"

`Metabolic.ts:807`, `Respiration.ts:327` and `ThermalRegulation.ts:277` all
guard on `getLifecycleState() === 'dead'`. An `undead` shade therefore gets
hungry, suffocates, freezes, and **can die a second time**.

The three guards change to `!isAlive()`, which is what they already mean.
This is a **latent defect independent of ghosts** — any undead NPC authored
today starves to death — so it is a fix, not a carve-out for shades.

### A shade can structurally hold, and is stopped at the verb layer

The shade inherits `Container` + `Slotted` + `BodyPlanSlots` from `Creature`
and keeps them. It holds nothing because it is **minted empty**, because
`requiresEmbodied` refuses `get`/`take`/`wear`/`wield`, and because it has
**no keys and no credential wallet** — which is exactly what confines it to
the commons.

The mixins stay rather than being stripped: deferred ghost-fabric content
will want a shade to carry ghost-side objects, and removing containment
forecloses that. Revoking the verb is the capability-revocation model
(mortal-vessel Thesis 4) and the same lever the prison skin reuses — cheap
to keep, expensive to re-add.

Vitals come with the tier and are **meaningless but inert** on a shade — not
special-cased, so `assess` on a ghost reads as nothing useful rather than
throwing. `LoadBearing`'s own doc already shrugs at the analogous case
("dead is irrelevant").

### Material action is gated by `requiresEmbodied`

A new validator, sibling of the shipped `requiresAnimate` /
`requiresConscious`, tagged on material verbs and absent from platform ones.
This *is* function-over-form (mortal-vessel Thesis 2) expressed as a verb
tag: embodied acts refuse, platform acts (chat, forums, vote, watch, DM,
`look`, `who`) ride the Participant untouched. The same lever serves the
prison skin later.

### Shade perceptibility — network presence, not spirit-fabric

**The aether is the internet and nothing more.** A shade is perceptible
because *being dead doesn't log you off* — the Participant never left the
network — not because ghosts interact with an aether field. This is the
shipped doctrine, not a new law, and it explains detection without
mysticism.

Attunement is **universal** (`Avatar.installDefaultLoadout`: implant or
born-attuned), so attunement alone gates nobody. The dial is the
**awareness Discipline** over the shipped concealment/detection face on
`PerceptionApi`: everyone attuned gets *something*; competence sharpens it
from a prickle to a name. Banding stays presentation, never security — safe
here precisely because a shade has no material powers, so being unseen
grants nothing exploitable.

If a genuine other-fabric is ever wanted, its home is **magic** (`Effect`
iff gated Api) or the in-fiction science of a resurrection service — never
the aether.

### The other world is an overlay on the same map

The shade roams the ordinary world. The deliverable is a **shade-perception
axis** — content authorable as perceivable-only-by-shades, keyed through the
existing perception seam. **This build authors nothing on it.** Dedicated
ghost places are later content; the poignancy of proximity (standing in the
tavern you can't drink in) is what the populated-places rule buys, and it
costs one predicate and a hook rather than a second world.

### The system is two transitions; everything between them is content

The engine owns exactly two events:

- **`ConditionApi.die(...)`** — living body → corpse + shade.
- **`ConditionApi.reembody(shade, container)`** — shade → new body. Gated,
  and **callable by content**.

There is **no route type, no terms vocabulary, and no registry.** Being a
ghost is a content-authoring space, and a schema written before that content
exists would constrain it rather than serve it — the moment an author wants
a term the interface didn't anticipate, the abstraction is in the way.
Anything a passage might charge or restore is already expressible with
shipped systems: a resurrection business charges through banking, an altar
takes an item through containment, a quest gates on whatever it likes, and
each finishes by calling `reembody`. Diminishment, when it is designed, will
ride a condition or a trait — not a field invented today.

**The floor stays in the engine**, because "no content is available" must
never strand a player — that is the snapshot defect's failure class wearing
a third costume. One `passage` verb, no arguments, afforded by the shade,
calling `reembody` at the wake point. One controller, one Api method.

`reembody` **never consults the corpse** (see the corpse invariant above).

### The wake point

The floor route wakes at `AppSettingKeys.defaultStartLocation`, read-only,
with a named seam where "wake at your residence" plugs in later. Zero
coupling to the live residences build.

### The shade is minted lazily

Death always produces the corpse and leaves the identity unembodied. **The
shade is minted when an Interactive next attaches**, so a death with nobody
connected does not mint a body nobody is standing in.

### Logout and disconnect: the shade is a view, the arc position is the state

The shade is transient — destructed on disconnect, exactly as `WireBody` is
reaped. What is durable is the **arc position on the identity**: died at T,
awaiting passage, corpse at ⟨ref⟩, carried on the identity's
`holder_snapshots` record (`PASS (unmarked)` in the sandbox policy table,
already materialized on login).

**This is not the bricking defect wearing a new hat, and the distinction is
load-bearing.** Persisting `lifecycleState: 'dead'` **on a body** is a dead
end with no exit — that is the bug. Persisting **arc position on the
identity** always has `passage` as an exit — that is the design. A build
that blurs these reintroduces the defect.

What follows:

- **Logging out is not an escape hatch.** A player who dies, logs out, and
  logs back in returns **as a ghost**. Without the durable marker,
  disconnecting would be free resurrection and death would cost nothing.
- **The shade reappears at its corpse** if the corpse still exists,
  otherwise at the wake point. Derived from the corpse ref — no new
  persistence.
- **No passage route may require the corpse to exist.** A corpse that
  decayed while the player was offline must never strand them; that is the
  bricking failure mode in a new costume, and it gets its own regression
  test.
- The corpse decays and can be looted while the player is away — mortal
  vessel's two clocks, working as designed.

### The dying clock runs while disconnected

`dying` is **exempt from the linkdead freeze and from the far-past gap
guard**, both of which the surrounding code applies by default (the `Vitals`
conditions reconcile freezes on `linkdead` at four sites; metabolism
documents *"presence (linkdead → freeze the clock); logout state rides the
far-past guard"*). Inheriting either would make **disconnecting a cure for
dying**.

The far-past guard exists because huge elapsed gaps produce absurd results;
for dying, a huge gap produces the *correct* result. The exploit is worse
than the unfairness, and the answer to "I crashed while bleeding out" is a
medic, not a network stack.

*(Near-miss, recorded because it is closed only by accident: a dying player
crossing into a circle would get a healthy wire body, since conditions are
not a fork slice. Unreachable — dying reads `unconscious`, so `go wardrobe`
fails `requiresAnimate`.)*

### Dying in a sandbox circle

A wire body's death is **real inside the circle and discarded with it** —
which is the point of a holodeck, and means a lethal trap can actually be
tested:

- The corpse is minted **circle-scoped**: born in the circle, dies with the
  discard. It persists until then, so an author can re-enter and examine
  what they made — testability without an in-circle arc.
- The player **ejects to the parked field body**, untouched. No shade, no
  passage, no real body minted from inside a circle — that is the boundary
  the sandbox exists to hold.
- **Exit must not assume the parked body is alive.** If the field body died
  while its player was parked, exit composes normally and the player exits
  **as a shade**. No protection rule; just an exit path that checks.

### Circle-marked rows cannot produce a crime

The PM policy table classifies `accountability_events` and `chronicles` as
**PASS (mark)** — *"persists with the epistemic wire mark (`circleScope`
recorded, **never filtered**)"* — and `deriveBlame` has no notion of
`circleScope`. So a killing staged inside a private circle its owner
controls lands a **real crime row on a real identity**: forgeable evidence.

The hole predates this build, but this build is what makes it matter — death
becomes the ledger's biggest producer, wired to eight new drivers. **In
scope: `deriveBlame` ignores circle-marked rows.** One predicate, in the
consumer, where derive-on-read re-legislates history without rewriting a
row — which is what that ledger was built for.

Death's writes are **not** special-cased to dodge the policy table; the
table is the sandbox's contract and bypassing it is the drift it exists to
prevent. Chronicle keeps writing the marked deed — readouts already lens the
mark, and "you died in a holodeck" is a true thing about you.

### What survives a new body

The durable ledgers key on `getIdentityPath()`, **not on the object** —
`ChronicleLogic`, `TraitLogic`, `BeliefStoreLogic`, `AdvancementLogic`,
`RenownLogic`, `AccessRegistry`. So chronicle, transcript/competence,
traits, beliefs, renown, authority, bank accounts, chattel and parcel titles
survive a brand-new body **with no carrying mechanism at all**; `WireBody`
proved this deliberately. The fork protocol carries only the shell.

Lost by design — this is the stake, not a leak: **gear** (to the corpse),
**vitals and wounds** (reset — that *is* rebirth), **location,
engagements, posture, combat state**.

### Corpse custody, decay, and looting

- **No chattel row on the corpse itself.** `ChattelMixin` composes at the
  `Thing` tier; a Creature carries none. Only the items on it are titled —
  they already are. Custody of a *body* is a different concept whose home is
  the deferred coroner economy.
- **Looting is not an accountability event.** The chattel chain-of-title
  already records who took what, unspoofably, in the right ledger; a courts
  build reads that. Minting an accountability kind for theft would duplicate
  an existing record and force a "what is theft" ruling this build has no
  business making.
- **Decay is staged and degrades forensic readability first** (vitals-slate:
  *"evidence degrades — forensic difficulty rises with time since death"*).
  At the terminal stage the corpse simply stops vetoing `canEvict` and the
  residency sweep collects it — no force-destruct, no new lifecycle. Items
  on it evacuate to the room via chattel's shipped behavior.

### Blame: one call, caller-supplied facts

`ConditionApi.die(host, cause, opts?)` always writes the death fact and the
chronicle deed. **Killer and consent ride in as caller-supplied fields** —
combat passes them, hypothermia does not. This collapses seven copies of the
flip *without* violating accountability's producers-not-a-chokepoint rule:
the ledger still never infers consent, because the producer that knows it
supplies it.

## Constraints

- **The snapshot must never record death.** `holder_snapshots` is keyed by
  `templatePath` = the identity. A dying Avatar's autosave writing a `dead`
  lifecycle is the live bricking defect. Capture-or-suppress must happen
  **before** the flip, and the shade must never capture (`shouldPersist() →
  false`, the `WireBody.ts:97` precedent).
- **`byTemplatePath` collision.** The old Avatar must be unstamped or
  destructed **before** the new body registers at the same identity path.
- **Death inside a sandbox circle.** A wire body's death must not kill the
  field body — a circle death ejects to the parked body, discarded like
  everything else in the circle. Writes follow the shipped PM policy table,
  never a bespoke suppression.
- **`dying` must opt out of the two freezes** the surrounding code applies
  by default (linkdead, far-past gap). Copying the adjacent condition code
  introduces the disconnect-cures-death exploit silently — this is the
  build's most likely quiet defect.
- **The durable death marker lives on the identity, never as a `dead`
  lifecycle on a persisted body.** The second form is the bricking defect.
- **Multiplexed Interactives.** A player with two connections needs a
  `ConnectionApi.transfer` per interactive under an omni root, as
  `SandboxLogic` already does.
- **No new Apis**, no new module categories, no new `no-restricted-syntax`
  exceptions. Ask before any of the three.
- **`import type` only across the mudlib boundary** — `pnpm lint:imports`
  is CI-gating and the exception registry is empty.
- **Sequencing.** The bricking fix is the first landable slice; it must not
  wait on the corpse, the shade, or the passage.
- **Inter-Stuff contract**: methods, never fields. New code goes on the new
  pattern.
- Combat's shipped behavior — the two-stage death, the coup, the
  non-sentient cull, byte-identical blame derivation — is **regression
  surface, not scope**.
- **`undead` becomes load-bearing for the first time.** race.md shipped the
  state unused; anything that branches on lifecycle must be audited for the
  assumption that non-`alive` means `dead`. The three survival guards are
  the known cases, not necessarily the only ones.
- **A registered avatar is no longer necessarily a living body.** The shade
  holds the `PlayerApi` slot while its player is dead, so anything
  enumerating `getAllAvatars()` and assuming a living body needs the same
  sweep as the `undead` guards — same class of assumption, different surface.
- **The `passage` verb goes in `charactergen`**, which already owns the
  moment a body comes into existence for an identity (`enroll`'s
  commit/spawn atomicity) and the identity verbs (`chronicle`, `competence`,
  `traits`). **No new module category** — that needs explicit sign-off and
  is not needed here.

## Acceptance criteria

- No non-test code writes `setLifecycleState('dead')` outside the single
  transition path (`Growing.ts`'s plant path excepted, or migrated).
- A character driven below a fatal threshold by **each** of the shipped
  drivers (exsanguination, electrocution, hypothermia, hyperthermia,
  asphyxiation, starvation, dehydration, toxin, combat) enters `dying`, not
  `dead`, and dies only when its window elapses. Covered by tests per
  driver.
- A second character stabilizes a dying one with `treat`, clearing `dying`;
  the outcome is graded by `medicine` competence and mints an
  `ActSignature`. `assess` reports the remaining window at competence-scaled
  fidelity.
- **A player can die and play again in the same session.** An end-to-end
  test covers death → corpse → shade → `passage` → new body, including that
  the new body carries the shell slices and that chronicle, transcript,
  renown, contacts and chattel titles survive.
- **A dead player who logs out and back in is not stuck** — a regression
  test pins the bricking defect closed.
- **A shade who logs out and back in returns a shade**, not a living body —
  logout is not an escape hatch — and reappears at its corpse when one
  survives.
- **A dying character who disconnects still dies on schedule**: a test pins
  `dying` against both the linkdead freeze and the far-past gap guard.
- **The passage completes with the corpse destroyed/evicted** — no route
  depends on the corpse existing.
- A wire body's death in a circle mints a circle-scoped corpse, leaves the
  field body untouched, and ejects the player to it; a player whose **field
  body died while parked** exits as a shade.
- **A death staged inside a circle produces no crime**: `deriveBlame`
  ignores circle-marked rows, pinned by a test, with the existing
  field-side blame regression unchanged.
- A corpse persists as a `Creature` with the cause stamp, the wound map, and
  the loadout; it cools toward ambient; it decays through stages that degrade
  forensic readability; at terminal decay it permits eviction and its items
  evacuate.
- **No material slice implements `mergeSlice_`** — asserted by a test, and
  recorded in `docs/antipatterns.md`.
- A shade traverses to a public room and is **refused** at a locked/
  credentialed boundary, by the ordinary machinery (no bespoke check).
- A shade is refused every `requiresEmbodied` verb and served every platform
  verb — chat, forums, `look`, `who` — in the same test.
- **A shade does not starve, suffocate, freeze, or die a second time.** A
  test drives a long elapsed gap against an `undead` host and asserts the
  metabolic, respiratory and thermal drivers all no-op; the three guards
  read `!isAlive()`.
- A shade is animate (walks, speaks), is attuned **with no implant
  occupying a slot**, and holds nothing — while still composing
  `Container`/`Slotted`, so ghost-side carriage stays possible later.
- A shade is perceptible to an attuned observer at fidelity scaled by
  awareness competence, and the shade-perception axis is exercised by a test
  fixture (no authored content).
- `passage` re-embodies a shade at the wake point, and a test calls
  `ConditionApi.reembody` **directly with a different container** — proving
  content can drive the transition without going through the verb.
- **`reembody` completes with no corpse in the world** (the corpse
  destroyed or evicted first).
- Death mints a chronicle deed and an `accountability_events` row **from a
  non-combat driver** (the ledger's current gap), and combat's blame
  derivation is unchanged — pinned by the existing regression.
- Docs: `docs/subsystems/mortality.md` exists; `race.md` amended for the
  doctrinal split; `vitals.md`, `harm.md`, `sandbox.md` (the reverse
  crossing), `chronicle.md`, `accountability.md`, `chattel.md` updated where
  the build changed their truth; `CLAUDE.md`'s subsystem map gains a
  one-line pointer.
- `pnpm test`, `pnpm lint`, `pnpm lint:imports`, `pnpm lint:gates`,
  `pnpm lint:boundary`, `pnpm lint:module-scope` all green.

## Cross-references

- **Seeding slate** — [mortality-slate](../slates/builds/mortality-slate.md)
- **Design authority** —
  [mortal-vessel-slate](../slates/deferred-rpg/mortal-vessel-slate.md)
  (Theses 6–8 here; Theses 4–5, moderation/prison, unbuilt)
- **Substrate** — [vitals.md](../subsystems/vitals.md) ·
  [harm.md](../subsystems/harm.md) · [race.md](../subsystems/race.md) ·
  [tails/vitals-slate](../slates/tails/vitals-slate.md) (§ Layer 6, and *the
  corpse is a forensic record*)
- **Machinery reused** — [sandbox.md](../subsystems/sandbox.md) (Forkable,
  the wire-body crossing) ·
  [persistence.md](../subsystems/persistence.md) ·
  [connection.md](../subsystems/connection.md) ·
  [residency.md](../subsystems/residency.md) (`canEvict`) ·
  [perception.md](../subsystems/perception.md) +
  [concealment.md](../subsystems/concealment.md) ·
  [advancement.md](../subsystems/advancement.md) (the `medicine` and
  `awareness` Disciplines) · [credential.md](../subsystems/credential.md) +
  [boundary.md](../subsystems/boundary.md) (what confines a shade)
- **Ledgers fed** — [chronicle.md](../subsystems/chronicle.md) ·
  [accountability.md](../subsystems/accountability.md) ·
  [chattel.md](../subsystems/chattel.md)
- **Downstream, deferred** —
  [health-vertical-slate](../slates/builds/health-vertical-slate.md) ·
  [disease-slate](../slates/builds/disease-slate.md) · the underworld /
  resurrection-service content build (unslated as yet)
