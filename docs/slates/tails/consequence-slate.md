# Consequence slate — what an injury costs, and who it puts to work

> **Status: PARTIAL, mostly ABSORBED** — all eighteen waves shipped
> (MR!254, 2026-09-10; verified against `git log` and the code, not just
> this slate's own claim) → [combat.md](../../subsystems/combat.md) ·
> [harm.md](../../subsystems/harm.md) ·
> [mortality.md](../../subsystems/mortality.md) ·
> [contract.md](../../subsystems/contract.md)
> **Left:** the **terms/consent lift** — a legal primitive
> (`lethality`/`stopCondition`/`consent`) generalizing out of combat to
> sit beside governance/contracts; no owning slate exists yet ([open
> question Q5](#open-questions)) · the **necropolis** is still a stub
> inside Terminus and wants to be a sixth locality
> ([towns-slate](../builds/towns-slate.md)) with a real vertical
> ([end-of-life-slate](../builds/end-of-life-slate.md)) · de-escalation's act-half
> lives in [intervention-slate.md](../builds/intervention-slate.md) · blood/
> transfusion, filling `g(composure)`, and the client `CombatCard` are
> each already tracked as open on their owning slate/doc (see § Not in
> scope)
> **Size:** a tail

**Captured 2026-09-08**, out of a design conversation that opened with
*"we don't have hitpoints"* and ended somewhere else entirely.

> **User: "so you get burned? so what? is it just a counter to 0 like
> hitpoints or is there something more dynamic at work… basically we have
> a really cool simulation modelled now we have to make an actual game
> out of it. and players have some very specific expectations for gameplay
> on a multiplayer RPG. we have to either meet them or explicitly defy
> them, but as far as I know, we've never even had the conversation."**

> **User: "the one area I do want to be more proactive on is interplay.
> the violent players need the non violent ones to exist and vice versa…
> that's all the more reason to make combat complementary, so it's
> something that can be sprinkled into any content at any level."**

**Read first / Issues / Substrates removed** — this slate's own
bookkeeping links (to combat-slate/combat-experience-slate/vitals-slate/
health-vertical-slate/disease-slate/medic-judgment-slate/physiology-slate/
blood-slate, three GitLab issues, and nine subsystem docs) are cut: every
wave they pointed at landed, and the subsystem docs above are now the
source of truth for what shipped and why.

---

## What shipped (cut in full, verified against code)

Every finding (the two-arrows gap, the eight-parallel-mechanisms
discrimination, the open wound→poise loop, the three dead `Condition`
channels, the two dead trauma types, burn/`bloodVolume` physiology,
violence's missing wake, the live death-spiral in advancement) and every
design (A. the wound→poise loop closed · B. the consequence table ·
C. the wake as violence-creates-demand · D. the composure hook ·
E. winning/losing with certainty · F. legibility as narration, never a
card · G. losing≠dying, the punishment/measurement split, the
`recovering` diminishment reference implementation) shipped exactly as
decided here. Re-verified at compaction time, not trusted from this
slate's own ✅ marks:

- `lint:condition-arms` ceiling is **5** today (was 7+1=8 when this
  slate was written) — the 8-arm unification (Design/W8) landed and the
  ratchet held.
- Combat's wound→poise ceiling (Design A / W1), the poise-read narration
  (W2), the outcome model with the floor (Design E / W3), individual
  morale (W4), and the room-reads-morale de-escalation replacement (W5)
  are all documented in [combat.md](../../subsystems/combat.md) (§ The
  wound ceiling, § Morale).
- The `resolution.by` treatment dispatch (W9), the `governs` rename
  (W10), the 23 authored rows (W11), and diminishment via `recovering`
  (Design G / W12) are documented in
  [harm.md](../../subsystems/harm.md) and
  [mortality.md](../../subsystems/mortality.md) (§ Diminishment, and why
  the floor has to hurt) — outside my doc list, pointer only.
- The diagnosis surface, the judgment loop, the repair shop, the
  necropolis stub, and the guard contract (W13–W17) are documented in
  `harm.md`, `mortality.md`, and
  [contract.md](../../subsystems/contract.md) — pointer only.
- ⭐ **One gap found in this verification, not caught by the slate's own
  ✅ marks:** W7 ("the `afflict` door") did **not** ship as designed — a
  new `ConditionApi.afflict` static was correctly rejected mid-build as
  the exact "thin Api wrapper around a single object method" antipattern
  — but the attribution stamp W7 actually shipped
  (`AfflictionRecord.inflictedBy`, the `Trauma.inflictedBy` twin) was
  never written up in `harm.md`. Recorded in this batch's ledger as a
  Handoff for whoever next touches `harm.md`.

The **rejected fork** (generalizing `Poise` into a universal contest
metric) is graduated into
[combat.md § Poise](../../subsystems/combat.md#poise--the-one-new-subsystem)
("Poise stays combat-scoped — rejected, not merely undone") along with
**the three clocks** doctrine this slate also argued. Cut here.

The **player-expectations table**, the **armour failure mode** (armour
buys a margin in the poise contest, never immunity — the exact finding
now in `combat.md`'s wound-ceiling section), and **the lens pass** are
cut: every row/claim maps to a decision documented above.

---

## Open questions

Of the nine numbered here, seven are answered by what shipped: Q1
(wound→poise, with the cap — `combat.md` § The wound ceiling), Q3 (a
burn needs fluid, `treat` refuses a mismatch with prose — `harm.md`'s
treatment-dispatch table), Q4 (an animal does not take a yield —
`combat.md` § "A beast does not take a yield"), Q6 (the guard job needed
no engine seam — `contract.md`'s guard contract), Q7 (W14 shipped, see
`trade-medicine`'s `analyze patient`), Q8 (winning/losing with the
BKT floor — `combat.md` § Advancement), and Q9 (diminishment —
`mortality.md` § Diminishment).

**Still open:**

- **Q2 — does contusion cost anything outside a fight?** No endurance
  tax exists (`resolution.by` resolves contusion to `rest`, i.e. time
  only); the "small endurance tax" this question proposed was never
  built. Low stakes, still open.
- **Q5 — where do the terms go?** The consent primitive
  (`lethality`/`stopCondition`/`consent`) is general and this slate
  deliberately never lifted it. It wants its own slate next to
  [contract.md](../../subsystems/contract.md) and governance; no such
  slate exists yet.

---

## Not in scope (each already tracked on its owning slate/doc)

- **Generalizing poise** — refused; see the graduated note in
  [combat.md § Poise](../../subsystems/combat.md#poise--the-one-new-subsystem).
- **The terms/consent lift** — Q5 above; unowned, needs a slate.
- **Blood, transfusion and the donation loop** — its own build; tracked
  on [blood-slate.md](../builds/blood-slate.md).
- **Filling `g(composure)`** — the hook shipped inert; the axis belongs
  to `traits-stress`, tracked on
  [combat-experience-slate.md](../builds/combat-experience-slate.md) T5 and
  combat-slate.md's `Left`.
- **A `CombatCard`** — tracked on [combat-slate.md](../builds/combat-slate.md)'s
  `Left`.
- **The limb-sever / part-promotion seam** at `AVULSION_BEHAVIOR.onset`
  — unbuilt, no owning slate identified.
- **Anything that renders poise, endurance or a wound as a number** —
  a standing constraint, not a task.
