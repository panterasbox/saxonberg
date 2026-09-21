# Mortality slate — dying, the corpse, the shade, the passage

> **Status: PARTIAL** — the substrate shipped 2026-07-31: the unified
> `ConditionApi.die`, the rescuable `dying` clock, stabilization, the
> forensic corpse, the shade, `reembody` + the `passage` floor, and the
> ledger rows → [mortality.md](../../subsystems/mortality.md)
> **Left:** the re-embodiment service as content (the temple vs clinic
> vendors, employer coverage, the price of walking out, and a service's
> own diminishment lever) · the in-circle death arc (minting a real body
> from inside a circle) · the passage ladder — the route catalogue (trial
> / bargain / Orpheus; what a resurrection business charges and who else
> sells passage)
> **Moved out 2026-09-10:** corpse **custody**, corpse **remains** and the
> **coroner economy** are trade questions, not metaphysics ones →
> [end-of-life-slate.md](./end-of-life-slate.md)
> **Size:** a wave

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
> [deferred-rpg/mortal-vessel-slate](./mortal-vessel-slate.md)
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

## The gap — CLOSED

**Historical.** Death used to be written seven times independently across nine subsystems, three of them byte-identical copy-pasted `applyDeath` helpers, and dead players were bricked permanently. All of it is now `ConditionApi.die`, one call. See mortality.md § One transition.

## The keystone — shipped

**Shipped as designed** — death forks the body out of the person and discards the person's claim on it, the mirror of the sandbox forking the person out of the body. See mortality.md § Death is the sandbox crossing, backwards.

## The three objects at death — shipped

**Shipped as designed**, including the doctrinal split (NPCs stay one Stuff; PCs split because an identity has to leave). See mortality.md § The corpse, § The shade, § The doctrinal split.

## What survives a new body — shipped

**Shipped as designed** — the durable ledgers key on `getIdentityPath()`, so chronicle, transcript/competence, traits, beliefs, renown, authority, bank accounts, and titles all survive with no carrying mechanism; gear, vitals/wounds, and world state are lost by design. See mortality.md § What survives a new body.

## Dying as a state with a clock — shipped

**Shipped as designed** — the `dying` condition between `critical` and `dead`; the clock, not the threshold, kills. See mortality.md § The dying clock.

## Stabilization — shipped

**Shipped as designed**, riding the shipped medic loop. See mortality.md § Stabilization.

## Death when nobody comes — shipped

**Shipped** — the `dying` clock's expiry reaches `ConditionApi.die`. See mortality.md § One transition.

## Recovery — shade → passage → new body — shipped

**Shipped as designed, including the reversal of an earlier `perceptualPlane`/wake-point design.** The shade's platform acts, the aether-is-the-internet perceptibility, the cut `perceptualPlane` axis, the two bare transitions (`die`/`reembody`) with no route-type vocabulary, and "there is no wake point" all shipped exactly as reasoned here. See mortality.md § The shade, § Coming back, § The floor, § Deferred ("The underworld").

## Three hazards this design creates — all closed

**Shipped as designed.** The snapshot-must-not-record-death hazard, the `byTemplatePath` collision, dying-inside-a-circle, the disconnect-cure trap, and the two-ways-to-persist-death confusion are each named and closed in mortality.md (§ Three hazards is gone from that doc too — folded into the build once shipped); see § The two ways to persist death, § Inside a circle, § The dying clock runs while you are disconnected. The circle-marked-rows accountability hole is closed in § Circle-marked rows convict nobody; the `isLivingBody()` shade defect is closed in § Reading lifecycle state.

## Scope — as built

**Shipped as scoped.** The IN list shipped in full; the OUT fences (parcels/land-use, the residence spine, the full medic vertical, disease/contagion, the passage ladder as content, the patron-mint/coroner/courts/permadeath/moderation surfaces) all still hold — see the cross-references at the top of this slate and mortality.md's own Deferred section.

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

### The recuperation model — resolved

**Resolved, not left open.** What diminishment *should be* was undesigned
here; the answer shipped as a temporary, fading, across-the-board
competence-band suppression — never a Transcript rewrite. See
mortality.md § The recuperation model. Still open: a *better*
diminishment for a paying service to sell (a wound that heals over time,
a diminished vessel, a patron's mark), which is really the re-embodiment
service's own design question, above.

Still open, and deliberately downstream:

- **The in-circle death arc** — a circle death ejects, so the full arc
  can't be rehearsed in a holodeck. Minting a real body from inside a
  circle is the boundary the sandbox exists to hold; the machinery to do it
  safely is worth its own design.
- **Where "wake at your residence" plugs in** — resolved the other way:
  there is no wake point at all, by design. See mortality.md § The floor.
- **The route catalogue** — what a resurrection business charges, what the
  Hades journey restores, and who else sells passage.
