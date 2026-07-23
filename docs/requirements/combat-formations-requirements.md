# Combat formations — requirements

The **party-strategy layer over the built combat engine**: a *formation* is a
named, party-level **policy over the threat graph** — who holds which
engagement, who intercepts what, who finishes the fallen — chosen once by the
party captain and then *watched unfolding* (set-policy-then-watch, the
text-native answer to per-character gambit walls). The marquee preset,
**Master-Apprentice**, turns the unstoppable power-leveling behavior into the
teaching relationship an educational world actually wants — and it needs **no
reward knobs**, because the poise economy makes it hold emergently.

Seeded by [combat-tactics-slate.md](../slates/deferred-rpg/combat-tactics-slate.md)
(Thesis 2 — party-level presets; its Thesis 1 engagement graph is **already built**
as `CombatGraph`) as refined by
[combat-slate.md](../slates/deferred-rpg/combat-slate.md) (§ "Multi-party,
formations, and Master-Apprentice fall out" — the emergent-MA validation — and
§ "Coup attribution — formation-governed, except blame"). Rides shipped
substrate end to end: multi-party combat
([combat.md](../subsystems/combat.md) — `CombatGraph` with per-edge terms,
`redirect()`, focus-fire erosion, the `Coup`), the Party Idea
([party.md](../subsystems/party.md) — captain-gated `party` verb, the
`sideOf`/`areAllied` seam), advancement
([advancement.md](../subsystems/advancement.md) — per-actor `ActSignature`
self-credit), and the accountability ledger
([accountability.md](../subsystems/accountability.md)).

## Goals

- **`CombatFormation` as authored `Idea` singletons** — one template per preset
  (the `LocomotionMode` parallel; not a registry). A formation carries: role
  slots, a target-allocation policy, an interception rule with **role
  priority**, and a coup-governance rule (who may finish, who gets the call,
  where the credit routes).
- **A four-preset v1 roster**: the **default** formation (see next bullet),
  **Focus Fire** (all edges converge on the captain's called target),
  **Vanguard** (front-line roles eat the edges; a threat edge landing on a
  back-line role auto-intercepts to the front per role priority), and
  **Master-Apprentice** (the apprentice holds the primary engagement and
  cashes openings; the master intercepts high-threat edges and creates the
  openings).
- **The default formation is a formation — "solo" is not a concept.** Formation
  resolution is a **total chain** (party's active formation → the default
  formation), mirroring `LocomotionApi.defaultModeFor`'s universe-`walk` rung and
  `PartyApi.sideOf`'s `solo:` rung. The default formation is an authored `Idea`
  like every other preset and **byte-preserves today's behavior** (current
  `pickTarget`, manual-only `defend`, current coup rules) — a partyless
  wanderer, a party that never chose, and a party of one all run it through
  the same consult path. **No `if (formation)` branch anywhere.**
- **Formations are total over party cardinality.** A party of 1 (`party form`
  already permits it) may adopt *any* preset; policies degrade gracefully with
  vacant roles (a Vanguard with no back line has an inert clause, not an
  error). Solo formations do real work — solo Focus Fire is target discipline in
  a 1vN fight (stay on the called target while pressed, versus the default's
  pick).
- **Three mechanical hooks, exactly.** The formation governs (1) **target
  allocation** — the exchange loop's `pickTarget` consults the actor's
  resolved formation + role; (2) **interception** — a policy-triggered
  `CombatGraph.redirect` when a threat edge lands on a protected role,
  role-priority resolving contention; (3) **coup governance** — below. The
  formation never scripts anyone's gambits.
- **Coup governance** (in scope): the formation gates *who may* coup (killing the
  everyone-stabs-the-body scrum, giving an intervener one clear cooper to
  stop), routes the **credit** by the same role structure that cashes openings
  (MA → the apprentice banks the deed), and assigns the **call** (mercy vs
  execution): a hierarchical formation gives the captain the decision, an
  egalitarian one leaves it to whoever is engaged. **Blame stays
  institution-derived, never formation-decided** — the engine records the facts
  (formation, roles, directive) on the accountability rows so that credit and
  blame can diverge: under an unlawful Master-Apprentice kill the apprentice
  earns the *deed* while the master bears **command responsibility**.
- **Master-Apprentice holds emergently — no reward knobs.** No credit
  transfer, no scaled rewards, no level-gap cap. Each actor banks their own
  `ActSignature`s; the economy works because defense is generative, openings
  are **ally-exploitable** (already true structurally — the open window lives
  on the *defender's* poise, so any attacker with an edge cashes it; pin with
  a test), and competence is the exchange rate (sustainable for the veteran,
  suicidal for a newbie running it unassisted).
- **Teaching banks command signatures.** Seed a **`command`** `Discipline`
  (the party-strategy sibling of `melee-combat`); policy work mints
  signatures — the master's interceptions and created-openings, the captain's
  calls (target call, formation shift, coup call). The master advances the exact
  disciplines you cannot grind solo — the pro-social payoff the whole thesis
  exists for.
- **Captain surface on the `party` verb**: `party adopt <name>` and
  `party assign <role> <member>`, captain-gated like the other mutations.
  Mid-fight switching is allowed (captain-only), lands on the **next beat**,
  and is a **witnessed, narrated** act ("the line reforms around Alma"); no
  poise cost in v1. `fight` (bare) shows your side's active formation and your
  role.
- **NPC symmetry falls out of the Party.** A formation works wherever a Party
  exists: a party with a Mercenary in it just works (the `combatant` brain
  reads its role), an authored enemy crew gets formations by being a party, and
  a wolf pack stays on the default. No enemy-side special casing.
- **The gym proves the theses headless.** The combat gym gains a formations
  matrix: default-vs-default byte-parity with today (pinned regression),
  Focus-Fire convergence, Vanguard interception, and the MA claim itself —
  master-sustainable / newbie-suicidal-unassisted — as deterministic matchup
  outcomes.
- **A reachable demonstrator** proving the loop in-world (planning picks the
  content; the newbie-wilds Mercenary 2v1 is the natural host — recruit,
  `party adopt vanguard`, watch the interception; an MA beat with the
  duelist or a veteran NPC as master).

## Non-goals

- **Ranged combat, and with it the Skirmish/Kite preset.** Still its own
  future engagement-mode build ([combat.md](../subsystems/combat.md)
  § Deferred). The roster is designed so Skirmish slots in later without
  reshaping the formation contract.
- **Phalanx and any fifth preset.** Vanguard is the v1 protector shape
  (cleaner role structure); Phalanx's mutual-cover variant waits until
  content asks. Resist the config-screen wall.
- **Gambit auto-play / per-character scripting** (the DA:O gambit wall).
  Players type their gambits; NPC gambit choice stays in brains. Explicitly
  *not* the model, per the seeding slate.
- **Reading the enemy's formation** (a fog-hedged `assess` reveal of the
  opposing party's preset). Deferred follow-on; v1 legibility is your own
  side's formation + witnessed shift narration.
- **Reward scaling, credit transfer, level-gap caps** — the original slate's
  MA knobs are **superseded** by the emergent model; they are dead, not
  deferred.
- **Spatial formation / geometry.** A formation is a graph policy; positions,
  lines, and facing stay refused (combat.md § Deferred).
- **Morale, rout/rally, pursuit, session split** — their own deferred items.
- **The client `CombatPane` formation selector.** v1 is verb-surface only;
  the pane inherits the formation display when it lands.

## Surface decisions

### The name is "formation"; the verb is `party adopt`

The slate said "tactics" and the name was never debated. Decided:
**formation** — player-facing and code vocabulary alike (`CombatFormation`,
`combat.formation.*`, the `party adopt <name>` subcommand). In the gaming
lineage "Tactics" names per-character gambit scripting (DA:O's tactics
menu) — the exact model this build rejects — while "formation" names the
preset-arrangement choice players expect, and the fiction is already
formation-shaped (`front`/`back` roles, "the line reforms" narration). The
model stays a graph policy, not geometry — the spatial word describes the
fiction, not the math. The verb is `adopt` rather than `formation` to avoid
the `party form` subcommand adjacency. "Doctrine" was considered (the best
semantic fit for the coup-governance conduct facet) and passed over as
heavier vocabulary.

### Roles are sets, not seats

A role is an open badge the captain assigns: any number of members may hold
the same role, and each member holds at most one. **No cardinality schema,
no composition table** (the Bang!/Samurai-Sword dealt-roster shape —
role decks composed to the player count — is deferred until a preset wants
it), and no assignment validation beyond role-name existence. Two rules
interpret any fill deterministically: a **vacant** role's clauses are inert
(the policy degrades to its fallback rung), and a **plural** role resolves
to its holders in party-roster order wherever a clause needs exactly one
referent (the interception priority walk; MA's primary apprentice = the
first *standing* holder). Six combatants under a two-role formation is
normal, not an error: two `front`, three `back`, one unassigned.

### Solo is the default formation, not a case

The slate asked what a solo actor gets ("probably `(none)` plus statuses").
Decided: there is **no formation named "solo" and none named "none"** — there is
a default formation every side resolves to when nothing was chosen, authored
like every other preset, consulted through the same total chain. The
precedents are `walk` (a real `LocomotionMode` at the bottom of
`defaultModeFor`) and `solo:<templatePath>` (a real side from `sideOf`).
Uniformity is load-bearing: the exchange loop gains **one** consult path and
zero null branches, and the default preset doubles as the byte-parity pin.

### Vanguard over Phalanx

One protector-shaped preset in v1. Vanguard's asymmetric roles (front line
eats edges, back line stays free) exercise the interception hook and the
role-assignment surface more legibly than Phalanx's symmetric mutual cover,
and it composes with Focus Fire as the natural pairing (front holds, back
bursts). Phalanx is an add-when-asked.

### What a formation controls (and doesn't)

Decided: exactly the three hooks — target allocation, interception, coup
governance. These are the policy-shaped seams the built engine actually has
(`pickTarget`, `CombatGraph.redirect`, the `Coup`). Everything
moment-to-moment (gambits, defends as reactions, flee) stays personal agency;
the formation is the standing policy around it. This keeps a preset describable
in one prose line — the legibility requirement.

### Interception contention → role priority on the formation

The slate's open question 4. Decided: the formation declares role priority; when
multiple members could take a redirect, the highest-priority *eligible*
(still standing, not already past a pressure threshold) role wins.
Deterministic — no dice, matching combat's zero-new-randomness rule.

### Coup governance in scope; blame stays institutional

Decided: in scope, all three facets (right / credit / call), because the
`Coup` and the accountability ledger both ship and the design is settled in
combat-slate. The accountability event rows grow the **factual context**
(active formation, role assignments, the directive when the captain called the
kill) — recorded fire-and-forget as today, consumed derive-on-read by blame.
Command responsibility is a *derivation* over those facts, not a stamp.

### Mid-fight switching

Allowed, captain-only, applies at the next beat, witnessed (a narrated
formation-shift beat; `noteReactableAct` so the crowd can react). No poise or
tempo cost in v1 — cost knobs wait for evidence of shift-spam.

### NPC symmetry via the Party primitive

The slate's open question 6 (symmetry "doubles the design"). Decided: it
doesn't, because formations attach to the Party, not to player-ness — the
`combatant` brain reads its role through the same resolution chain a player
does (NPC≈PC parity, the gym's standing rule). Authoring an enemy crew as a
durable party is content, not engine.

## Constraints

- **Dependency direction**: combat already imports only `PartyApi.sideOf`/
  `areAllied` — formation resolution joins that narrow seam (pure gated statics
  on the party face), keeping the one-way combat→party import discipline.
- **Idea singletons, not a registry** ([standard-model](../standard-model.md);
  the `LocomotionMode` precedent). No `FormationRegistry`.
- **Shape in code, magnitudes in AppSettings**: policy structure (roles,
  priorities, governance rules) is authored shape; any tunable thresholds
  (e.g. what "high-threat" means for MA interception) are `combat.formation.*`
  dials.
- **Zero new randomness; bands not numbers.** Formation decisions are
  deterministic given the graph + poise state; anything surfaced to players
  stays banded and perception-gated.
- **Byte-parity default** is a pinned regression: a side on the default
  formation must fight exactly as today (the accountability-migration
  precedent) — gym determinism unchanged.
- **The `party` verb owns the surface** — captain-gating reuses the existing
  invariants (one-active-party, captain-only mutations); no new command
  category.
- **Gated Api discipline**: any new policy-consult surface follows the
  Api/Logic split and `docs/antipatterns.md`; the formation consult must not
  give content a bypass into `CombatGraph` mutation (redirects route through
  the session's own machinery).

## Acceptance criteria

- A party of 1 can adopt every preset; no minimum-size gate exists; vacant
  roles are inert. A partyless combatant resolves to the default formation
  through the same chain — no null branch in the exchange loop.
- Default-formation combat is byte-identical to pre-build combat (gym pin).
- Focus Fire: the party's edges converge on the called target; the shipped
  focus-fire erosion observably compounds; solo Focus Fire holds one target
  in a 1vN fight where the default would switch.
- Vanguard: a threat edge opened against a back-line role is redirected to
  the highest-priority standing front-line role on the next beat; with no
  front line standing, the policy degrades to default allocation.
- Master-Apprentice: gym matchups demonstrate the emergent claim —
  the master-run pattern is sustainable for a high-competence master and
  fails for a low-competence actor attempting the same roles unassisted; the
  apprentice banks offensive `ActSignature`s, the master banks
  defensive/`command` signatures; an opening created by the master is cashed
  by the apprentice (ally-exploitability pinned by test).
- Coup: under a governing formation only the role-holder may begin the `Coup`;
  the captain's call is required where the formation assigns it; the
  accountability death row carries formation/roles/directive; blame derivation
  shows credit/blame divergence for the unlawful directed kill (apprentice
  deed, master command responsibility).
- `party adopt <name>` / `party assign <role> <member>` are captain-gated;
  a mid-fight switch lands next beat and emits a witnessed narration beat;
  `fight` (bare) shows formation + own role.
- The `command` Discipline is seeded; interceptions and captain calls mint
  signatures.
- An in-world demonstrator exercises Vanguard (or MA) with a Mercenary party
  against a real foe, reachable from the newbie wilds.
- Subsystem doc exists (`docs/subsystems/` — either a `combat-formations.md` or
  a § in combat.md + party.md cross-refs, finalize's call) and combat.md's
  Deferred list drops "party tactic-roles".
- Full suite green; gym determinism suite green.

## Cross-references

- Seeding slates: [combat-tactics-slate.md](../slates/deferred-rpg/combat-tactics-slate.md),
  [combat-slate.md](../slates/deferred-rpg/combat-slate.md) (formations + coup
  attribution sections)
- Subsystem docs: [combat.md](../subsystems/combat.md),
  [party.md](../subsystems/party.md),
  [advancement.md](../subsystems/advancement.md),
  [accountability.md](../subsystems/accountability.md),
  [behavior.md](../subsystems/behavior.md)
- Related: the deferred ranged-engagement build (future Skirmish preset);
  the deferred client `CombatPane` (formation selector surface)
