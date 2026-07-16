# Weapon playstyle & the hand-slot economy — requirements

The next combat build over the merged core (1v1 + multi-party cycle 2 +
the experience pass). The experience pass made the *exchange* a read-and-
react contest but every weapon still fights identically — the loadout isn't
yet the chemistry-set input the design promises. This build makes **a weapon
a derived playstyle, not a stat block**: you author a *shape* (a long
balanced double-edged steel blade) and the playstyle — reach, balance,
guard, handedness, delivery, afforded gambits — **computes** from
form × material × dimensions, legible and previewable. Each derived axis is
an **input to a system we already built**, so weapons differ by *how they
couple into the existing engine*, not by bolted-on numbers. It then builds
the **hand-slot economy** — two hands as an allocation you manage *during*
a fight (switch, draw a sidearm, dual-wield) — so the loadout is a live
decision, not a pre-fight menu.

Seeded by [combat-experience-slate.md](../slates/deferred-rpg/combat-experience-slate.md)
Thesis 14 and the **already-designed weapon model** in
[materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)
(§ Weapons — the symmetric dual) + [materials-response.md](../subsystems/materials-response.md)
(the built `Construction`/`MaterialApi` substrate). This build *builds* that
model; it does not re-design it.

## Goals

- **A weapon derives a compact playstyle bundle** from its `Construction`
  (form) × `Material` × dimensions — the six properties the materials-response
  slate specified: **delivery** (already built), **reach**, **handedness**,
  **balance/leverage**, **guard**, and **afforded gambits**. Authored as a
  *shape*, never hand-tuned; a bare form yields a working weapon with zero
  tuning (the universe-default precedent).
- **Legibility is a mandatory deliverable** (the slate's "or it doesn't
  ship"): the `analyze` surface previews a weapon's derived profile in
  author-and-player terms (`edge ●●●○ · point ●●○○ · reach medium · guard
  good · two-handed`), and a `check`-style lint guards that no derived
  weapon is inert.
- **Balance → the poise/tempo economy** (`balanceFactor` finally goes live —
  today a neutral `1.0` field): a heavy/committal weapon is a **guard-breaker**
  (high poise damage, slow tempo, high overextend — it *creates* openings); a
  light/quick weapon is an **exploiter** (fast tempo, cheap, punishes
  overextend — it *cashes* openings). Complementary, neither dominant.
- **Guard → the parry/riposte** (defense-is-generative): a crossguard weapon
  parries and ripostes well; a flail/whip bypasses a guard but can't
  self-guard — an offense↔defense axis orthogonal to balance, riding the
  existing reactive-dispatch seam.
- **Reach → a threat-graph engagement-range tier** (the signature feel,
  geometry-free): each combat edge carries a discrete **range state**
  (`reach` | `close`). A longer weapon **controls until closed** — it acts
  before a shorter one can and strikes at advantage while the foe is at
  reach; **closing the gap is a tempo-costed opposed action**; reach
  **reverses inside** (a dagger/unarmed owns the clinch, a spear is a
  liability there). No coordinates — a per-edge *state*, not a map.
- **Handedness → the hand slots** (the existing `Wieldable`/embodiment slot
  system): a two-handed weapon occupies both grips, a one-handed leaves a
  hand free — the allocation the hand-slot economy games.
- **Shield = wielded armor-construction** (pure materials-response reuse): a
  shield derives **directional coverage** (strong facing one foe 1v1, weak
  when focus-fired from multiple edges), high **guard**, **costs a hand**, and
  is **sunderable** (durability); shield-bash is a blunt/leverage gambit.
- **The hand-slot economy is a live, dynamic game**:
  - **Switching** armament mid-fight is a **vulnerable durative beat** (spends
    tempo, guard down — a read, not a menu-swap), driven by **range
    transitions** (spear → dagger once closed; keeping yourself optimally
    armed as the fight flows through ranges).
  - A **sheathed sidearm** draws fast — the answer to **disarm** (disarm
    becomes a tempo setback, not a fight-ender); a *dropped* weapon is a
    slow, contested pickup.
  - **Dual-wield** is the doubled case — trades defense/versatility for
    tempo/pressure; sword-and-dagger's off-hand parries (a tiny shield) and
    carries both ranges (the anti-switching build); **band-gated mastery**
    (a novice is worse dual-wielding; you grow into it — the competence seam
    the experience pass established).
- **Afforded gambits are weapon-shaped**: a weapon's construction confers
  weapon-specific moves onto the gambit menu (e.g. shield-bash, the hafted
  weapon's sweep), riding the existing affordance/`eligibilityFor` seam —
  "the weapon edits the menu" alongside "injury edits the menu."
- **NPC ≈ PC and the gym**: NPCs fight with the same derived weapons; the
  combat gym gains weapon/loadout as a matrix axis and asserts no weapon or
  allocation is strictly dominant (the balance regression guard extended).

## Non-goals

- **Ranged & thrown weapons** (Thesis 14's sixth archetype) — freedom from
  the melee edge, the kite, ammo-as-consumability, cover-as-status,
  protect-the-archer. A whole engagement mode of its own; the next weapon
  build. (The reach tier here is melee-range only.)
- **The deep grapple/clinch control game** — choke/drown *delivery*, the full
  submission tree. This build ships unarmed/dagger as the **reach-close**
  archetype (wins the clinch) and reuses the existing `subdue`/`grappled`
  seam, but not a new grappling subsystem.
- **Formation & geometry** — the spear wall, no-pike-in-a-doorway,
  positioning. Reach is geometry-free (a per-edge state); spatial formation
  is deferred.
- **Weapon crafting / repair economy** — deriving playstyle from an authored
  shape is in scope; the forge/repair/reforge loop and a durability economy
  are the crafting/materials tails (shield *sunder* uses the existing
  `DurableMixin` gauge, no new economy).
- **Final number-tuning** — the derivation + couplings + the gym ship; the
  gym *finds* the numbers (the standing combat rule).

## Surface decisions

### Reach ships as the full engagement-range tier
A discrete per-edge `reach | close` **range state** on the `CombatGraph`:
control-until-closed, closing as a tempo-costed opposed beat, reversed
inside. Chosen over a lighter opening-beat-only modifier — the
control-until-closed dynamic *is* the signature weapon feel and it composes
with the multi-party graph (each edge has its own range). Geometry-free (no
coordinates) so it stays a state machine over the graph, not a spatial sim.

### Melee + shield in scope; ranged/thrown deferred
All melee archetypes plus the shield (wielded armor-construction). Ranged/
thrown is its own engagement mode and its own build.

### The full hand-slot economy (static + dynamic)
Not just derived handedness — the **dynamic reallocation** game: mid-fight
switching as a vulnerable durative beat, the fast sidearm draw as the disarm
answer, and band-gated dual-wield. This is the "unifier" that makes the
loadout a live decision; a static-only version would leave the allocation a
pre-fight menu (the half-grown outcome we reject).

### Playstyle is derived, never authored as numbers
The six properties compute from `Construction` form × `Material` × dimensions
on read (the materials-response derive-don't-store precedent). `balanceFactor`
stops being a stored literal and becomes derived (or the stored value becomes
the authored *dimension* input, not the tempo number). Authors set a shape;
the profile and its `analyze` preview follow.

## Constraints

- **Derive, don't store** the playstyle numbers — the six properties are a
  pure function of form × material × dimensions, computed on read and
  surfaced only as **bands/pips** (`banding = presentation not security`);
  no magic balance number persists on the instance (the authored *shape* is
  the input, per materials-response).
- **Each axis couples into an existing system** — reach → `CombatGraph`,
  balance → `Poise`/`Tempo`, guard → the reactive-dispatch parry, handedness
  → `Wieldable` slots, delivery → the `Channel`/`inflict` path already wired.
  **No parallel weapon engine**; the build is derivation + wiring + the
  hand-slot economy.
- **Zero new aleatory randomness** — reach/switch/dual-wield outcomes are
  deterministic functions of the tactical state (the poker-not-slots line
  the experience pass drew); a single session stays bit-for-bit
  reproducible, and the gym relies on it.
- **NPC and PC run the identical model** — the same derived weapons, the same
  hand-slot economy; the `combatant` brain gains reach/switch/allocation
  policy through the same `CombatApi` surface a player uses.
- **The legibility surface is mandatory, not optional** — a derived weapon
  with no legible profile, or an inert weapon, is a ship-blocker (the CI lint
  + the `analyze` preview, the materials-response precedent).
- **All tunables are `combat.*` / `response.*` AppSettings** — no code-literal
  magnitudes; the seeder key-count moves with them.
- **Composes with the multi-party graph** — reach is per-edge, so a 2v1 can
  have one foe at reach and one closed; the shield's directional coverage
  weakens under focus-fire (the graph edge count already computed).

## Acceptance criteria

- **A weapon derives its full profile** from `Construction` + `Material` +
  dimensions: authoring three distinct shapes (a dagger, a spear, a
  war-hammer) yields three distinct playstyles with **no per-weapon tuning**,
  and `analyze <weapon>` previews each as bands/pips (delivery · reach ·
  balance · guard · handedness). Unit-tested on the derivation; the inert-
  weapon lint is CI-wired.
- **Balance changes the poise contest, provably in the gym**: a guard-breaker
  vs an exploiter is a contested matchup (neither sweeps), a guard-breaker
  creates openings faster, an exploiter cashes them faster, and
  `balanceFactor` visibly modulates tempo. Asserted at fixed inputs.
- **Guard changes parry**: a crossguard weapon parries/ripostes where a
  guardless one (flail/whip) does not; the flail bypasses a steady guard.
  Unit-tested through the exchange.
- **Reach controls the approach**: a reach weapon strikes at advantage while
  the foe is at `reach` and acts before a shorter weapon; **closing is a
  tempo-costed opposed beat** that can be contested; once `close`, the reach
  weapon is at a disadvantage and the dagger/unarmed wins. Asserted per-edge,
  including a 2v1 with mixed ranges.
- **The shield works as directional armor**: it adds coverage + guard facing
  one foe (strong 1v1), **weakens when focus-fired** from multiple edges,
  costs a hand, and can be **sundered** (durability); shield-bash is an
  afforded gambit. Tested through `inflict` (coverage) + the graph
  (focus-fire) + durability.
- **The hand-slot economy is live**: switching armament mid-fight is a
  vulnerable durative beat (tempo spent, guard down); a sheathed sidearm
  draws fast so **disarm is a setback, not a fight-ender**; dual-wield trades
  defense for pressure and is **band-gated** (a novice is measurably worse
  dual-wielding than a proficient). Each covered by a test.
- **Weapon-shaped gambits**: a weapon's construction confers moves onto the
  menu (shield-bash, sweep), gated at attempt-time like any gambit — "the
  weapon edits the menu." Unit-tested via `eligibilityFor`.
- **NPC ≈ PC / the gym**: the gym gains a weapon × allocation matrix axis and
  asserts no weapon or hand-allocation is strictly dominant (a spear beats a
  dagger at reach but loses closed; 2H beats 1H+shield in some matchups and
  not others), plus single-session determinism with weapons in play.
- **Docs**: [combat.md](../subsystems/combat.md) + [materials-response.md](../subsystems/materials-response.md)
  updated (the derived weapon bundle, the reach tier on the graph, the
  hand-slot economy, shield-as-armor); the doc-map + architecture entries at
  finalize; the realized Thesis 14 items ticked in the slate.
- **Tests** cover the decidable pieces: the profile derivation, the four
  couplings (balance/guard/reach/handedness), the shield, switching/sidearm/
  dual-wield, and the gym's weapon-matrix balance assertions. Integration
  validated by a live run (a reach duel and a shield/sidearm exchange).

## Cross-references

- Seeding: [combat-experience-slate.md](../slates/deferred-rpg/combat-experience-slate.md)
  (Thesis 14) + [materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)
  (§ Weapons — the symmetric dual, the designed model)
- Substrate consumed (built): [materials-response.md](../subsystems/materials-response.md)
  (`Construction`/`Material`/`MaterialApi`, `DurableMixin`),
  [combat.md](../subsystems/combat.md) (the exchange, `CombatGraph`, `Poise`/
  `Tempo`, the reactive parry, the gym, `Sharpness` for band-gating),
  [embodiment.md](../subsystems/embodiment.md) (`Wieldable`/slots),
  [slot.md](../subsystems/slot.md)
- Related memory: [[combat-experience-build]], [[multi-party-combat-build]],
  [[materials-response-requirements]], [[banding-presentation-not-security]],
  [[never-half-grown-everything-a-business]]
