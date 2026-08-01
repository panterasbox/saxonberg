# Mortality slate — dying, the corpse, the shade, the passage

> **Status: BUILT 2026-07-31** — graduated to
> [../../subsystems/mortality.md](../../subsystems/mortality.md), which is
> now the source of truth for anything shipped. This slate is kept for its
> **design rationale** and its still-open surface (the re-embodiment
> service's lore, the underworld, the coroner economy). The **build-scoped**
> mortality substrate: dying as a rescuable state, stabilization, the corpse
> as a persistent forensic object, and the shade → passage → new-body
> recovery arc.
>
> **This slate does not re-litigate the design.** The settled shape lives in
> [deferred-rpg/mortal-vessel-slate](../deferred-rpg/mortal-vessel-slate.md)
> — the three-layer self, function-over-form, the death arc, the opt-in
> passage, and the prison↔Hades unification. That slate is the **design
> authority**; this one is the extract that a requirements doc can be
> written against, plus the mechanism decisions its theses left open.
> Mortal-vessel keeps its **moderation / prison half**, which this build does
> not touch.
>
> **The one-line justification:** nine subsystems can kill a character and
> nothing can bring one back. Every risk system in the game is writing checks
> nothing cashes — the flagship [never-half-grown](../../vision.md) violation.

See also — the substrate this drives:
[vitals.md](../../subsystems/vitals.md) (the Agent/Creature/Character split,
`VitalsMixin`, the death seams) · [harm.md](../../subsystems/harm.md)
(`ConditionApi.inflict`, the five trauma behaviors, **the medic vertical as
shipped**) · [race.md](../../subsystems/race.md) (the `lifecycleState`
machine, `getCauseOfDeath`, the death ≠ destruction rule) ·
[tails/vitals-slate](../tails/vitals-slate.md) (**§ Layer 6 — Death &
lifecycle**, which defers exactly this driver, and *the corpse is a forensic
record*). The machinery it reuses:
[sandbox.md](../../subsystems/sandbox.md) (**the Forkable substrate + the
wire-body crossing** — read § *The crossing (as built)*) ·
[persistence.md](../../subsystems/persistence.md) (the self-persistence
spine, `shouldPersist`) · [connection.md](../../subsystems/connection.md)
(`ConnectionApi.transfer`, the Interactive handoff). The ledgers it feeds:
[chronicle.md](../../subsystems/chronicle.md) ·
[accountability.md](../../subsystems/accountability.md) ·
[chattel.md](../../subsystems/chattel.md). Downstream:
[health-vertical-slate](./health-vertical-slate.md) (the full clinic — this
build ships only the first-aid seam) ·
[combat.md](../../subsystems/combat.md) (produces the death *event* only).

---

## The gap (verified 2026-07-31)

Death is one-way, and the transition is written **seven** times.

| Site | Cause |
|---|---|
| `lib/thermal/ThermalRegulation.ts:536` (`applyDeath`) | hypothermia (`:480`) / hyperthermia (`:493`) |
| `lib/respiration/Respiration.ts:549` (`applyDeath`) | the asphyxiation family |
| `lib/metabolism/Metabolic.ts:804` (`applyDeath`) | starvation / dehydration / toxin |
| `lib/vitals/Vitals.ts:757` | exsanguination |
| `lib/vitals/Vitals.ts:775` | electrocution |
| `obj/api/CombatLogic.ts:2864` (`killImpl`) | slain / the coup |
| `lib/husbandry/Growing.ts:630` | plants *(farming's — out of scope)* |

The first three are **byte-identical four-line helpers**, independently
reinvented in three subsystems (`if already dead return; setCauseOfDeath;
setLifecycleState('dead')`); `killImpl` is a fourth copy. **Non-test writes
back to `'alive'`: zero.** Every `setLifecycleState('alive')` in the tree is
a test priming a fixture.

Two findings that raise the priority:

- **Dead players are bricked, permanently.** `Avatar.ts:1003`/`:1013` carry
  `lifecycleState` through capture/materialize, so a player who dies today
  reloads dead on every subsequent login, with `requiresAnimate` refusing
  `say`/`go`/`get` forever. This is a live trap on the snapshot spine, not
  merely a missing feature.
- **The seam is already marked and waiting.** `Vitals.ts:385` documents that
  `getConditionBand()` can read `critical` from a floored vital "with NO
  lifecycle transition (**the deferred driver owns transitions**)", and
  vitals-slate § Layer 6 defers the transition flow by name. This build is
  the driver that comment is addressed to.

### What already exists to build on

- `getConsciousness()` → `conscious | unconscious | dead` (`Vitals.ts:102`)
  is **derived and recoverable**, and `requiresConscious` /
  `requiresAnimate` already gate verbs on it. The unconsciousness waypoint
  is free.
- `CombatantState.down` + `handleDown` (`CombatLogic.ts:2814`) + the
  interruptible `Coup` — but **`down` is session-scoped**; it evaporates
  with the fight and has no meaning outside combat. There is no down state
  in the world.
- **The medic loop shipped**: `treat` / `undress` (`cmd/medical/`),
  `assess` (`cmd/perception/`), `DressingMixin`, the `medicine` Discipline,
  competence-graded outcomes minting `ActSignature` deeds. Stabilization
  does not need inventing.
- `accountability_events` has a `death` kind and `deriveBlame` branches on
  it — but **only combat writes it**. The other drivers write nothing.
- Corpses are referenced in comments across six files (`Creature.ts:92` —
  "a corpse cools toward ambient (algor mortis) as a passive drift") and
  implemented nowhere. Algor mortis comes free from `ThermalMixin` the
  moment a body stops regulating (`lib/thermal/__tests__/Thermal.corpse.test.ts`).
- **The rebirth choreography is shipped with a holodeck skin on it**:
  `SandboxLogic` mints a fresh vessel and `ConnectionApi.transfer`s the
  player into it (`api/connection.ts:116`).

---

## The keystone — death is the sandbox crossing run backwards

The sandbox forks the **person** out of the body and discards the body.
Death forks the **body** out of the person and discards the person's claim
on it. One protocol (`ForkableMixin`, `lib/persistence/Forkable.ts`),
complementary slice families:

| | sandbox (shipped) | death (this build) |
|---|---|---|
| fork slices | `Presentation`, `Embodiment`, `ClientState`, `Environment`, `Alias` — the **shell** | `Vitals`, `Trauma`, `CauseOfDeath`, anatomy — the **material / forensic record** |
| merge allowlist | epistemic only (`Contacts`) | **none** |

That last cell is the load-bearing one. Forkable's own doc states the rule
this build reuses verbatim: *"Material slices simply have no merge path
back; there is no 'trusted mixin' escape."* So **the corpse cannot be
reanimated because nothing implements a `mergeSlice_` for it** — the
un-reanimatability is enforced by *protocol*, not by a policy a later build
can forget. The corpse gets the real wound map, the real afflictions, the
real cause stamp, and cools toward ambient on its own; it persists and
decays **independent of whether the player ever comes back**, which is what
makes forensics a real discipline with real law-enforcement applications
rather than a flavor string.

New slice authors: the material family (`forkSlice_Vitals`,
`forkSlice_Trauma`, …) is **fork-only by construction**. Adding a
`mergeSlice_` for any of them is the one edit that would silently undo this
design; it belongs in the antipatterns sweep, not in a mixin.

---

## The three objects at death

1. **The corpse** — a new Stuff. Takes the material fork slices; takes the
   loadout by ordinary containment (worn + carried). Its own lifecycle:
   a decay clock (reconcile-on-read), algor mortis via `ThermalMixin`,
   custody through the chattel chain-of-title, `canEvict` for the eventual
   residency sweep, autopsy as *assessment pointed at a non-agent with
   deeper access* (vitals-slate § *The corpse is a forensic record*).
   **Never a vessel.**
2. **The shade** — a near-sibling of `WireBody` (`lib/sandbox/WireBody.ts`):
   an Avatar subclass, `shouldPersist() → false`, holding the `PlayerApi`
   slot (it is the player's only body while dead — an unregistered shade
   would drop out of `who`/`tell`/presence, breaking function-over-form),
   `getIdentityPath()` → `/obj/Avatar/<playerId>` so every
   identity-keyed producer keeps attributing to the **player**, not the
   vessel. Takes the same five shell slices the sandbox already forks, so
   you are recognizably *you* — your layout, your aliases, your name — with
   no material affordances. **Diminished by construction**, which is the
   pull back to embodiment that mortal-vessel § Thesis 6 asks for, achieved
   without a single "you feel cold and empty" string.

   **Composition is Avatar's; only activations differ** — persistence off,
   material verbs revoked, `lifecycleState: 'undead'`
   (race.md shipped the state unused; the shade is its first consumer —
   animate per `isAnimate`, unambiguously not a living body), attunement
   **intrinsic** rather than a cranial implant. A shade keeps
   `Container`/`Slotted` and holds nothing anyway: minted empty, verbs
   revoked, no keys. The capability stays so ghost-side carriage is
   possible later; only the verb is taken.

   **The shade is not confined.** It roams the ordinary map as an
   **overlay** — anywhere an ordinary member of the public could walk, and
   nowhere else. This needs no new access model and never touches parcels:
   a shade is a baseline vessel with **no keys, no credential wallet, no
   gear**, so the shipped `Lockable` / credential machinery confines it to
   the commons for free. **The shade walks; it never phases.** Death is an
   experience, not a waiting room — the poignancy is standing in the tavern
   you can't drink in.
3. **The new body** at the passage — a freshly minted Avatar registered at
   the identity path, the shade's slices merged back, the shade destructed.

The old Avatar object is forked twice, drained, and destructed.

### The doctrinal split — one rule, two mechanisms

race.md says **death ≠ destruction — a corpse is the same Stuff, never
routed through `StuffApi.destruct`.** Draining a PC's Avatar into two forks
and destructing it reads like a violation. The resolution splits on
**whether an identity has to leave**:

- **NPCs, creatures, beasts** — unchanged shipped doctrine: the same Stuff
  becomes the corpse. Nothing needs to walk away. Zero new machinery,
  forensics intact.
- **PCs** — the identity must leave, so the body splits and the corpse takes
  the material half.

`ConditionApi.die()` is one call either way; it branches on whether the host
carries a player identity. The invariant that actually matters — *a dead
body persists in the world as a complete forensic record, not a puff of
smoke* — holds identically in both. Mortal-vessel § Thesis 8 already draws
PC-vs-NPC as an axis, so this sits on an existing line rather than cutting a
new one.

**race.md must be amended at sweep time**, not silently contradicted.

---

## What survives a new body, and what is lost on purpose

The reassuring result, verified: the durable ledgers key on
`getIdentityPath()`, **not on the object**.

| Logic | keys on |
|---|---|
| `ChronicleLogic:28`, `TraitLogic:38`, `BeliefStoreLogic:35`, `AdvancementLogic:48`, `RenownLogic:64` | `getIdentityPath()` |
| `AccessRegistry:304/312/376` | `getIdentityPath()` |

So chronicle, transcript / competence, traits, beliefs, renown, authority,
bank accounts, chattel titles and parcel titles survive a brand-new body
**with no carrying mechanism at all**. `WireBody` proved this deliberately.
The fork protocol only has to carry the shell.

Lost, by design — this is the stake, not a leak:

- **gear** → the corpse (the recovery-cost dial's first notch);
- **vitals and wounds** → reset (that *is* rebirth);
- **location, engagements, posture, combat state** → gone.

---

## Dying as a state with a clock

Death becomes a **two-stage** transition everywhere, matching what combat
already does at the coup: crossing a fatal threshold enters **dying**, and
the clock — not the threshold — kills.

**Mechanism (decided):** generalize the pattern Respiration already runs — a
condition row accumulating `elapsed` on reconcile, lethal at a threshold —
into one `dying` condition. It inherits persistence and reconcile-on-read
for free, and `treat` clearing it is a small change rather than a new
subsystem. **No parallel timer, no scheduler tick.**

The consequence, accepted explicitly: **a dying character nobody reads does
not progress until someone reads them**, and the gap resolves retroactively
on discovery. "Died alone in the woods" is resolved when found, not in real
time. This is the same bargain metabolism and harm already take, and it is
the honest one — the alternative is a tick per dying body.

`getConditionBand()` grows `dying` between `critical` and `dead`.
Consciousness needs no change: a dying body reads `unconscious` through the
shipped derivation, so animate verbs stop dispatching for free.

## Stabilization — the minimal medic seam

This is where a Discipline pays off in a life-or-death way, and it rides
**entirely on shipped machinery**: `treat` with a dressing already arrests a
bleed and mints a graded `ActSignature` against `medicine` competence. The
build adds only the seam where a successful treatment **clears the `dying`
condition** and drops the body back to `critical` — rescued, not healed.

Two rails from the house doctrine apply verbatim:

- **Competence buys information, not outcomes.** `assess` on a dying body
  tells a proficient medic *how long they have* and *what is killing them*;
  a novice reads "they're dying." Neither gets a better roll.
- **"Use fighting" becomes a real role.** The medic is the answer to a
  downed ally, which is the first time a non-combat Discipline decides a
  fight's outcome.

The full clinic — pharmacopoeia, surgery, the aid post — is
[health-vertical-slate](./health-vertical-slate.md)'s, and is **deferred**.

## Death when nobody comes

Already driven by seven sites; this build makes it *mean* something. The
`dying` clock expires → `ConditionApi.die(host, cause, opts?)` →
corpse + shade + the two ledger writes.

## Recovery — shade → passage → new body

- **The shade** as above: the Participant intact, embodiment gone. Platform
  acts (chat, forums, vote, watch) ride the Participant and are **never**
  severed — mortal-vessel § Thesis 2 is a hard floor, and the client already
  models it (world pane dark, platform frame lit).
- **Perceptibility is network presence, not spirit-fabric.** A shade is
  perceptible because *being dead doesn't log you off* — the Participant
  never left the network. **The aether is the internet and nothing more**;
  it is not a ghost-field, and a mystical reading of it is a standing
  correction, not a design option. Attunement is universal
  (`Avatar.installDefaultLoadout`), so the real dial is the **awareness
  Discipline** over the shipped concealment/detection face: everyone gets a
  prickle, competence gets a name. Safe to band precisely *because* a shade
  has no material powers, so being unseen grants nothing exploitable. A
  genuine other-fabric, if ever wanted, belongs to **magic** or to a
  resurrection service's in-fiction science.
- **The other world is an overlay.** The system deliverable is a
  **shade-perception axis** — content authorable as perceivable-only-by-
  shades — and *nothing authored on it*. That converts the underworld from
  a future rewrite into future content, for about one predicate and a hook.
  Dedicated ghost places come later.
- **The engine owns two transitions; the between is content.** `die`
  (body → corpse + shade) and `reembody` (shade → new body). **No route
  type, no terms vocabulary, no registry** — a schema written before the
  content exists constrains it rather than serving it, and the first author
  who wants an unanticipated term is blocked by the abstraction. Anything a
  passage might charge or restore is already expressible: banking charges,
  containment gives and takes, a quest gates however it likes, each
  finishing with `reembody`. A resurrection *business* therefore needs **no
  engine work** (employment, retail, banking, attendant queues all shipped).
  The engine keeps only **the floor** — one argument-less `passage` verb —
  because "no content is available" must never strand a player. Everything
  richer is content and is **slated, not built**; saying so is what keeps
  the pre-merge sweep from reading the floor as a miss.
- **The wake point** consumes the shipped residence spine
  ([residence.md](../../subsystems/residence.md), `startLocation` /
  `AppSettingKeys.defaultStartLocation`) **read-only**. The residences build
  owns that surface.

## The two ledgers death feeds

- **Chronicle** — the append-only identity ledger is *for* this, and death
  is its most important event. A `deed` at the transition; the passage and
  the rebirth are their own entries. Currently there is no death entry
  anywhere in the tree.
- **Accountability** — `accountability_events` already has a `death` kind
  and derives blame on read; it is under-fed because only combat writes it.
  **`ConditionApi.die` always writes the death fact and the chronicle deed;
  killer and consent ride in as caller-supplied fields** — combat passes
  them, hypothermia does not. This kills the seven copies of the flip
  *without* violating accountability's producers-not-a-chokepoint rule: the
  ledger still never infers consent, because the producer that knows it is
  the one that supplies it.

---

## Three hazards this design creates

Named here because each is a defect someone will otherwise ship:

1. **The snapshot must not record death.** `holder_snapshots` is keyed by
   `templatePath` = the identity. A dying Avatar's autosave writing a `dead`
   lifecycle is exactly the live bricking bug above. Capture-or-suppress has
   to happen **before** the flip, and the shade must never capture
   (`shouldPersist() → false`, `WireBody.ts:97`).
2. **`byTemplatePath` collision.** The old Avatar must be unstamped or
   destructed **before** the new body registers at the same identity path.
3. **Dying inside a circle.** A wire body's death must not kill the field
   body — a circle death ejects to the parked body, discarded like
   everything else in there. One line, but unstated it will be built wrong.

4. **The disconnect cure.** Conditions **freeze while linkdead** — the
   shipped pattern, four times in the `Vitals` reconcile, plus metabolism's
   far-past guard for logout. If `dying` inherits the code next to it,
   **disconnecting cures death**. It must opt out of both. This is the
   build's most likely quiet defect, because the wrong version is what
   copying the surrounding lines produces.
5. **Persisting death the wrong way, twice.** The durable fact is **arc
   position on the identity** (died at T, awaiting passage), never
   `lifecycleState: 'dead'` on a persisted body. The first always has
   `passage` as an exit; the second is the bricking defect. And it *must*
   be durable — without it, logging out is free resurrection.

Plus the standing one: **multiplexed Interactives.** A player with two
connections needs a `ConnectionApi.transfer` per interactive under an omni
root, as `SandboxLogic` already does.

### A latent defect the shade exposes

The survival drivers gate on `getLifecycleState() === 'dead'`
(`Metabolic.ts:807`, `Respiration.ts:327`, `ThermalRegulation.ts:277`) when
what they mean is *"is this a living body?"* So an `undead` host gets
hungry, suffocates, freezes, and **can die a second time** — which means
**any undead NPC authored today starves to death**. The shade is what
surfaces it; the fix (`!isAlive()`) is a correction, not a carve-out. More
broadly, `undead` going load-bearing means anything branching on lifecycle
needs auditing for the assumption that non-`alive` means `dead`.

### A hole this build inherits rather than creates

The PM policy table classifies `accountability_events` and `chronicles` as
**PASS (mark)** — *"persists with the epistemic wire mark (`circleScope`
recorded, **never filtered**)"* — and `deriveBlame` has no notion of
`circleScope`. A killing staged in a private circle its owner controls
therefore lands a **real crime row on a real identity**: forgeable evidence.
It predates this build; this build is what makes it matter, since death
becomes the ledger's biggest producer. The fix is one predicate in the
consumer — derive-on-read re-legislating history without rewriting a row.

---

## Scope

**IN.** Dying as a rescuable clocked state · the stabilization seam on the
shipped medic loop · the unified `ConditionApi.die` transition replacing
seven copies · the corpse (fork, loadout, decay, custody, autopsy access) ·
the shade · the passage floor + threshold seam · the new-body mint · the
chronicle deed · the accountability death row from every driver · the
`race.md` doctrinal amendment.

**OUT — hard fences.**

- **Parcels, land use, zoning, the per-location extent field.** Two other
  builds are live (farming/stewardship; residences/property). If this build
  thinks it needs land, it has drifted.
- **The residence spine** is *consumed*, never modified.
- **The full medic vertical** (clinic, pharmacopoeia, surgery) →
  [health-vertical-slate](./health-vertical-slate.md).
- **Disease / contagion** → [disease-slate](./disease-slate.md) (starts with
  crops, in the farming line).
- **The passage ladder** (trial / bargain / Orpheus quest) — content.
- **The patron-mint economy**, **the coroner/scrapper labor economy**,
  **courts adjudication**, **permadeath**, **the moderation/prison skin** —
  all remain mortal-vessel's, unbuilt.
- **No new Apis.** Death rides `ConditionApi`, `SpeciesApi`,
  `ChronicleApi`, `AccountabilityApi`, `ConnectionApi`, `PersistableApi`,
  `ChattelApi`.
- **No cast.** NPCs are expensive carves; this is a systems build.

---

## Rough waves (as built — see the subsystem doc)

1. **The transition.** `ConditionApi.die` + the `dying` condition + the band
   + collapse the seven copies. Ships the fix for the bricking bug.
2. **Stabilization.** `treat` clears `dying`; `assess` reads the clock at
   competence.
3. **The corpse.** Material fork slices, the loadout move, decay, custody,
   autopsy access.
4. **The shade + the passage floor + the new body.** The crossing, run
   backwards.
5. **The ledgers.** Chronicle deed, accountability from every driver.

## Resolved — see the requirements doc

The slate's open questions were closed during ideation on 2026-07-31 and
live with their reasoning in
[../../requirements/mortality-requirements.md](../../requirements/mortality-requirements.md):
corpse custody (no chattel row on the body; only the goods on it), looting
(the chattel chain-of-title already *is* the record — no accountability
kind), decay end-state (staged evidence degradation → stops vetoing
`canEvict`), the dying window (supplied by the driver that knows the
physics), and shade perception (the overlay + awareness-competence
gradient above).

Also closed there: **logout as a ghost** (the shade is a view, the arc
position is the durable state; the dying clock never freezes), and
**dying in a circle** (real inside, discarded with it; eject to the parked
body).

### The re-embodiment service — decided as lore, unbuilt

Ruled 2026-07-31, so the content build inherits it rather than re-deriving it:

- **The metaphysics are contested, and the game never adjudicates.** The
  kernel performs the transition; the temple and the corpo each insist their
  account of what just happened is the correct one, and neither is confirmed.
  This is the pattern the platform already ships — forensics has a stamped
  cause *and* an examiner who can be wrong; belief has reality *and* per-viewer
  memory; testimony is claims, not queries. It also means **no theology has to
  be written before anything is built.**
- **Two vendors, competing.** A **temple** (a patron mints the vessel; you
  leave owing a debt, a mark, a favor — the [altar-sacrifice] lore is the
  engine) and a **clinic** (a body fabricated and the self seated in it;
  corpo-priced, native to Terminus). Death lands on the Tiebout axis like
  everything else, and the player's choice — owe a patron or owe a
  corporation — carries character. The richness ladder emerges from
  *competition* rather than from a terms schema, which is the other half of
  why the registry was cut.
- **Coverage is the hook.** A clinic that resurrects its own employees free
  and everyone else at a price makes employment matter at the most dramatic
  moment available, and makes an uninsured death land completely differently.
- **The aether is not the mechanism.** It is the internet; it is not where a
  self is stored, and "we restored your backup" is the same category error as
  a spirit-fabric reading, in a lab coat.
- **Two constraints the substrate imposes.** The corpse persists on its own
  clock, so neither story can be "you got up" — both are about *making a new
  body*, which is cleaner and makes the old one contestable (evidence, relic,
  property). And the terms must keep death expensive: if the clinic is a
  routine paid service, death is a toll booth. The stakes live in what is on
  the corpse and what you owe when you walk out.

Still open, and deliberately downstream:

- **The in-circle death arc** — a circle death ejects, so the full arc
  can't be rehearsed in a holodeck. Minting a real body from inside a
  circle is the boundary the sandbox exists to hold; the machinery to do it
  safely is worth its own design.
- **Corpse remains** — bones/ash after terminal decay, and whether the
  coroner economy wants a titled body.
- **Where "wake at your residence" plugs in** — the seam ships; the
  residences build owns the surface.
- **The route catalogue** — what a resurrection business charges, what the
  Hades journey restores, and who else sells passage.
