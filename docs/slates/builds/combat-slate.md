# Combat system (working slate)

> **Status: PARTIAL** — cycles 1 + 2, the experience pass, weapon
> playstyle, combat hooks and formations, and morale (individual) all
> shipped → [combat.md](../../subsystems/combat.md) +
> [combat-hooks.md](../../subsystems/combat-hooks.md) +
> [combat-formations.md](../../subsystems/combat-formations.md)
> **Left:** pursuit / the chase (⚠ contradicts the shipped single-step
> disengage — see ledger) · rout & rally retreat · the `guards`
> intervention brain (⚠ content riding substrate that does not exist —
> see [intervention-slate.md](./intervention-slate.md)) · the client
> `CombatCard` (+ the terms-handshake render) · NPC-vs-NPC crews · the
> composure/luck axis · combat's integration into the employment economy
> (contract kinds, party-shape/staffing, no-loot-loop) · per-party goals
> as a resolution model · the augment-conferred-gambit channel (implants
> affording combat verbs) · group payout/blame split for a hire-a-crew
> contract · the institutional **purge** declaration · balance/tuning of
> the competence→exchange-rate curve (the gym exists; several cells are
> still red — see combat.md § Morale)
> **Size:** a build

> **Read the two siblings first.** This slate owns the *terms-and-consent
> frame*, the *loadout/affordance model*, the *expressive layer*, and the
> *moment-to-moment minigame loop*. It does **not** re-derive:
> - [combat-tactics-slate.md](../tails/combat-tactics-slate.md) — combat as an
>   **engagement graph** (the no-geometry spatial answer) + **party-level
>   tactic presets**. Its "engaged relationship graph" **is** the *threat
>   graph* this slate leans on; its Master-Apprentice preset is validated
>   here against the poise economy.
> - [../../subsystems/vitals.md](../../subsystems/vitals.md) — the
>   **consequence** substrate combat writes into (vital signs, anatomy /
>   `BodyPart` / tissue, the two-kind condition system incl. `Trauma`, the
>   `getConsciousness`/`getConditionBand` derived readouts, the death seam).
>   **No HP scalar** — combat honors that.

The one-sentence thesis: **combat is a consented, terms-bound, contracted
activity that is subordinate to the social contract — not a survival
loop.** Everything below is a consequence of taking that seriously.

See also:

- [../../subsystems/activity.md](../../subsystems/activity.md) — a combat
  session is a `SustainedEngagement` coroutine on the engagement framework
  (the `DialogueConversation` precedent in
  [../../subsystems/npc-dialogue.md](../../subsystems/npc-dialogue.md) is
  the near-exact structural twin: a terms-bound state machine pumping over
  game-time, detached choice-loop via `ScheduleApi` + `runRoot`).
- [../../subsystems/advancement.md](../../subsystems/advancement.md) —
  combat skills are `Discipline`s; each exchange mints an `ActSignature`
  ({discipline, difficulty, outcome}); competence is derived, bands-only.
- [economy-slate](../builds/economy-slate.md) + the employment engine —
  combat is one thing an **employment contract** asks for; coin flows from
  the contract, never from loot.
- [../../subsystems/reactions.md](../../subsystems/reactions.md),
  [../../subsystems/emotes.md](../../subsystems/emotes.md),
  [../../subsystems/messaging.md](../../subsystems/messaging.md),
  [../../subsystems/behavior.md](../../subsystems/behavior.md),
  [../../subsystems/trait.md](../../subsystems/trait.md),
  [../../subsystems/scripting.md](../../subsystems/scripting.md) — the
  **expressive layer** is authored on these, not on a bespoke combat-VFX
  system.
- [capability-magic-slate](./capability-magic-slate.md) — the
  channels-not-nouns "mechanism of injury meets material" decomposition;
  the magic-side mirror of the same affordance grammar.
- [materials-response-slate.md](../tails/materials-response-slate.md) — the
  `mechanism × material × construction` response substrate combat is the
  first consumer of: armor mitigation (coverage × construction × material,
  layered) + `Trauma` generation from one function; weapon capabilities
  derived from construction.
- [party-slate.md](../tails/party-slate.md) — the **party** the tactic, sides, and
  coup attribution all operate over (first-class Stuff; captain + roles;
  party-vs-combat-side; the guild≠party≠corp wall; reputation + odometer
  progression). Combat is the heaviest consumer of the party axis.
- [combat-experience-slate.md](./combat-experience-slate.md) — the
  **felt-experience companion**: the dramatic arc + beat-punctuation, the
  **poker-not-slots** randomness stance (epistemic not aleatory, the fog is
  the dice), earned crits, luck-as-emotional-weather, the loadout as a bag
  of portable reagents + genre-as-costume, the chemistry-set reagent shelf +
  composition rules, and how a determinism-first system gets balanced (the
  **combat gym** headless matchup-sweep). This slate owns the *mechanism*;
  that one owns the *experience*.

---

## Principle

1. **Terms-first, not HP-first.** A fight ends when the *agreed
   stop-condition* is met, not when a pool hits zero. Death is a term you
   opt into **and** must be authorized for; the default resolution is
   yield / subdual / incapacitation — which the vitals substrate already
   gives free (`getConsciousness → unconscious` is recoverable; `dead` is
   a separate lifecycle flip a driver must deliberately pull).
2. **Combat serves the economy; it does not feed a loot loop.** No
   kill-for-coin. A slime has no coin — the *contract to clear the slimes*
   pays, funded by whoever wants them gone. Gear is **bought or crafted**,
   an investment against future contracts, not the reward of the last kill.
3. **The mechanical core is a deliberately-boring commodity; the product
   is the reactive/expressive layer.** A text MUD cannot out-spectacle a
   3D MMO on the swing — so it doesn't try. It wins on the swing *meaning
   something, being witnessed, and reading differently to every observer*.
   That layer is an **authoring surface on existing substrate**, not engine
   work.
4. **One new subsystem, resting on four already-built layers.** The only
   genuinely new mechanism is the fast, session-scoped **poise** contest.
   Consequence (vitals/trauma), fatigue (metabolism reserves), affordances
   (augmentation / command-contribution), and the expressive layer
   (reactions / emotes / scene / brains / traits) already exist.

---

## Thesis 1 — The combat session (terms, consent, blame)

Shipped and documented: the session (a `SustainedEngagement`/N-container
hybrid), terms (lethality × stop-condition × stakes), the consent
handshake (settings pre-answer, prompt only on conflict), the derived
blame ledger, and the sentience-keyed three-case severity model — see
[combat.md § The session](../../subsystems/combat.md#the-session--a-sustainedengagement-the-dialogue-twin),
§ Terms & consent, and § `isSentient` — the person/beast axis. Blame
itself was later extracted into the harm-agnostic
[accountability.md](../../subsystems/accountability.md); combat.md's
§ The blame ledger records the migration.

**Still open — the purge.** The **purge** — case 2 (consented lethal)
scaled up — is an **institutional declaration**
(governance / office layer — a state of emergency) that temporarily makes
lethal force against a class of target *authorized*. It is content and a
rare event, never a baseline mode. This is how "no one runs around
murdering everyone" holds **without ever writing "you cannot attack."**

---

## Thesis 2 — Combat lives in the employment economy

Combat is a **skill vertical parallel to crafting**, never privileged. The
loop:

1. Take an **employment contract** (the economic frame; coin lives here).
2. The objective may *require* combat — or offer it as **one pathway among
   several** (the immsim multi-pathway principle: the bouncer who talks the
   drunk down and the one who subdues him complete the *same* contract —
   different skills, one state-change; **de-escalation is a combat skill**).
3. Exchanges mint `ActSignature`s → Transcript evidence → competence bands
   rise ([advancement](../../subsystems/advancement.md)).
4. Higher competence opens harder / better-paying contracts. Coin,
   reputation, and competence compound.

A pacifist can run a full career on non-combat contracts; a mercenary runs
combat ones. Both are valid — "specialization is the engine."

### Contract kinds that touch combat

Every one has an **authorizer, terms, and a stop-condition** — the
guardrail is baked into the economic frame, not bolted on as a rule.

| Contract | Combat shape | Default terms |
|---|---|---|
| **Pest / cull** | non-sentient targets | lethal-ok, no blame |
| **Guard / escort** | reactive — fight only if attacked; success = *the thing survives*, not enemies dead | non-lethal preferred |
| **Bouncer / peacekeeping** | subdual, ejection | non-lethal; stop at yield/removal |
| **Bounty / apprehension** | bring them in | **alive** default; dead-or-alive a gated, costlier variant |
| **Sparring / duel / training** | consented | non-lethal, first-blood/yield — the **safe, repeatable advancement engine**; where Master-Apprentice lives |
| **Arena / exhibition** | spectacle | consented (gladiatorial lethal *or* prizefight non-lethal); ties to the broadcast/capital layer |
| **Sanctioned purge / war** | institutionally declared | the rare authorized-lethal free-for-all |

None is "wander out and kill for loot."

### Party-shape and staffing (from the employment engine)

The **contract** declares a **party-shape requirement**
(satisfiable-by-an-individual vs requires-a-crew, with a size/role spec).
For a crew contract the **issuer** picks a **staffing model**:
**hire-a-formed-crew** (take an existing durable party as one unit) or
**hire-and-compose** (pick individuals, the issuer assembles the crew).
That choice sets **who the contracting party is**, which sets **payout and
blame flow**: hire-a-crew → the group is the party, payout+blame land on it
and split internally; hire-and-compose → each individual is a separate
contracting party.

---

## Thesis 3 — Loadout & affordances (what a gambit is made of)

Three of the four proposed conferral channels shipped and are documented:
body/species (`Species.naturalAttacks[]`), learned/skills (the advancement
conferral seam, combat `Discipline` band-gating), and worn/wielded
(`commandContributions` on a wielded weapon) — see
[combat.md § Gambits](../../subsystems/combat.md#gambits--affordances-attempt-time-gated).
The channels-not-nouns discipline (instruments expose `{capability, band}`,
attempt-time cross-gating, injury-edits-the-menu-live) shipped exactly as
designed and is documented at the same section.

**Still open — the fourth channel.** `AugmentMixin.confers()` +
aether-as-host never grew a combat consumer: no implant confers a gambit
the way the wallet/comms/forums apps confer verbs. On-theme for the corpo
world and unbuilt.

---

## Thesis 4 — The affordance taxonomy (three axes)

- **Activation**: **passive** (always-on) · **reactive/triggered**
  (auto-fires on an event — riposte-on-parry, counter-on-grab, rally-on-
  ally-down; this is "induces reactions" as a mechanic and is what makes a
  fight *branch* instead of loop) · **active** (the gambit), split by
  target — **self** (stance, brace, second-wind), **target** (disarm,
  press, subdue), **ally** (cover, feed-opening — the party moves), and
  **field** (parley, rally, formation shift — acts on the *threat graph*,
  the no-geometry substitute for "area" effects).
- **Effect domain**: **mechanical** (the thin resolution math — commodity)
  · **combat-state** (transient, session-scoped: staggered, off-balance,
  disarmed, prone, inspired — where the minigame's texture lives) ·
  **vitals/trauma** (the *lasting* residue + exit condition) ·
  **expressive/narrative** (emote, reaction, standing/regard/blame — the
  **differentiated product**, all existing substrate).
- **Persistence**: instant · **windowed** (opens a timed opportunity —
  reactive affordances + openings live here) · sustained (a stance with
  upkeep) · lasting (trauma).

Two variety levers, cleanly separated: **reactive-triggers + transient
state** give *systemic/emergent* variety (the engine owns the scaffold);
**authored decoration** gives *expressive* variety (creators own the
content).

---

## Thesis 5 — The expressive layer is the product (and it's already built)

Shipped and documented: the fair-but-boring resolution, the reactive-
affordance dispatch, the reaction/emote/scene routing, and the
engine/creator boundary this thesis argued for — see
[combat.md § Narration](../../subsystems/combat.md#narration--the-fight-as-an-arc)
and its own worked example, § "A sequenced trace (a non-lethal duel)".
The one step of the walkthrough that never got a content consumer is the
bouncer/guard intervention brain — already tracked in this slate's status
block `Left`.

---

## Thesis 6 — The poise minigame (the one new subsystem)

Shipped and documented in full: the single session-scoped poise gauge +
qualitative flags, the four-timescale stack, the overextend/opening
economy, emergent tempo (no attacks-per-round scalar), the tick loop,
the single-thread-cooperative-coroutine decision (never a worker — see
[combat.md § The session](../../subsystems/combat.md#the-session--a-sustainedengagement-the-dialogue-twin)
for the graduated rationale), bands-not-numbers legibility, the
Master-Apprentice validation (now [combat-formations.md](../../subsystems/combat-formations.md)'s
territory), and the terms/traits-driven stop-condition. See
[combat.md § Poise](../../subsystems/combat.md#poise--the-one-new-subsystem),
§ Tempo, and § "Multi-party, tactics, and Master-Apprentice" in
combat-formations.md. The one piece that never shipped a client surface
is the previewed-command affordance in a combat card — tracked in this
slate's status block `Left`.

---

## Thesis 7 — Resolution & exits (how a fight ends)

**Still open — per-party goals.** A fight is a **race between the
parties' competing goals**, not a march to one shared stop-condition.
Split the two: **terms** = the consented *shared frame* (Thesis 1);
**goals** = *per-party objectives within the frame* (a bounty hunter's is
*capture alive*, the quarry's is *escape*, a bouncer's is *drive out*).
This never shipped: the actual `CombatResolution` is a flat outcome enum
(`first-blood | yield | incapacitation | death | draw | disengage`,
`CombatSession.ts`), not a per-party goal object, and none of
`capture-alive` / `protect-VIP` / `hold-position` / `survive-until-help`
/ `drive-off` exists anywhere in the tree. If the goals model is still
wanted it needs its own design pass against the shipped resolution
shape, not a bolt-on.

**Superseded — the three exit families.** The slate's proposed
Resolution/Withdrawal/Dissolution taxonomy, with an `achieved | yielded
| escaped | draw | dissolved` discriminator, did not ship in that shape.
What shipped is the flatter `CombatResolution` enum above, documented
throughout [combat.md](../../subsystems/combat.md) (Terms & consent,
Cycle 2's fleeing/draw, the coup). The substance (failure is normal,
a draw transfers no stakes, fleeing is a real exit) is real and shipped;
the family/goal framing around it is not.

**Superseded — fleeing as a multi-step sequence.** The slate proposed a
2+-tick contestable sequence (break engagement → transition/traverse →
get out of reach). What shipped (Cycle 2) is a single opposed-lite check
at the movement controller's pre-traverse gate:
`actor.disengage()` — a focus-fire pin vetoes it, foes still locked on
land a parting shot, success removes the actor and the traverse
proceeds in the same beat. See
[combat.md § Cycle 2](../../subsystems/combat.md#cycle-2--multi-party-the-threat-graph--the-party-seam)
"Fleeing". The poise-state cost (punished if reeling, clean if composed)
did ship; the multi-step sequence and the standing/dishonor cost did
not.

### The chase — a persistent pursuit-session on a decaying tether

Two layers; conflating them is the trap:

- **The melee edge** (a threat-graph lock) is **location-local** — it breaks
  the instant you traverse out.
- **The pursuit** (the session) is the **persistent meta-engagement** — "A
  is hunting B" survives the room change.

The chase is the session in a **second mode**, and the **contest axis
flips**: a stand-up fight is a *poise* contest; a chase is an **endurance +
mobility + navigation** contest. Poise *recovers* while running (both sides)
— the question is whether you can *lose them or outlast them*, gated by
locomotion mode + encumbrance (the plate knight can't sustain the chase; the
skirmisher can always leave — the emergent balance from Thesis 6).

It ends on **loss of the contact tether**, which decays three ways:

- **Escape (contact lost)** — open a lead, break line-of-sight at a branch
  (**perception-gated** — did they see which way you went? a crowd / corner
  / darkness helps), a **mode escape** (into water / up a wall / on the wing
  they can't follow — instant break), or reach a **sanctuary**.
- **Corner** — dead-end / closed gap → a melee edge reforms, poise contest
  resumes with whatever endurance remains.
- **Abandon** — the pursuer's cost exceeds the value → they break off.

Guaranteed to terminate (the tether decays, endurance floors). Multi-room
but self-limiting.

**Shipped and documented** — two-stage death (defeat → unconscious, then
a separate interruptible telegraphed coup) is
[combat.md § Two-stage death — the coup](../../subsystems/combat.md#two-stage-death--the-coup);
coup attribution (the tactic governs right/credit/decision-authority,
blame is institution-derived from tactic-recorded facts, credit and
blame can diverge under an unlawful directed kill) is
[combat-formations.md § Coup governance](../../subsystems/combat-formations.md)
"the right, the call, and the facts" (outside my doc list to touch —
pointer only).

### Guards — an application, not an engine feature

City guards that stop fights and deter them are **content** (a `guards`
brain — see [../../subsystems/behavior.md](../../subsystems/behavior.md)),
and the engine-guaranteed intervention window is what *makes them possible*.
Everything they need exists: **detection is free** (combat is loud/witnessed
— the reactions substrate; a patrol's witness trigger catches it; lethal
escalation is extra-telegraphed); they **read the blame ledger** to act
against the *aggressor* (legitimacy over the engine's facts); they
**intervene** with existing tools (interpose / redirect threat edges /
demand a cease / **arrest** as a capture goal → **pursue** the fleeing
aggressor via the chase); **presence deters** (initiation is a witnessed
act, so a guard witnessing the *start* steps in before blows); and their
real weapon is **legitimacy** (fighting the law is a massive blame
escalation, so most yield — the guard out-legitimizes rather than
out-fights). Instakills would collapse this chain, which is why Stage-2
death is load-bearing.

**Superseded — "mechanically".** The slate's own wiring sketch for this
thesis (routing through `combat.session.resolved` / `combat.graph.broken`
dot-namespaced hooks) is superseded by the hook-point catalog finding
below — those hooks were never built.

---

## The hook-point catalog (the engine deliverable)

**Superseded — by the code.** This section proposed a dot-namespaced
event catalog (`combat.session.opened`, `combat.exchange.resolved`, …)
with six category tables and N/R/X/B/A/L consumer classes. Grepped for
every literal hook name: zero hits anywhere in the tree. What shipped
instead is a different, and now-documented, extension grammar: three
`@hook` surfaces (instrument/participant/venue) over
`CombatReactiveMixin` / `CombatantMixin` / `CombatVenue`, described in
[combat-hooks.md](../../subsystems/combat-hooks.md) § The three
surfaces (outside my doc list — pointer, not graduated). The underlying
routing this thesis argued for (per-viewer narration, reaction
volume-gating, the reactive-affordance dispatch, brain triggers, the
derived blame/accountability ledger) all shipped — see combat.md's own
worked example, § "A sequenced trace (a non-lethal duel)", which plays
the same role this section's trace did.

---

## The client experience (UX tiers)

Structure only — the arrangement/density is playtest + A/B territory. What's
settled is *which surfaces exist, what each reads, and the discipline they
obey.*

### Combat is a summoned overlay, NOT a layout swap

Two tiers, both server-authoritative (the client owns **zero** command
semantics):

- **Default — a summary card**, summoned on `combat.session.opened` and
  dismissed on `combat.session.resolved` (the `SettingsPanel` summoned-panel
  tier; additive, degrades gracefully). One glanceable box: terms, the graph
  in miniature, your state, the gambit bar. **The world/prose stream stays
  primary** — the fight happens *in the room*, and the per-viewer combat
  narration *is* that stream. We do **not** hide the prose behind a
  video-game combat screen; the prose is the game.
- **Opt-in — `layout combat`**, a dedicated control-deck arrangement (the
  `streamer` layout precedent) for the rich multi-display view. Promoted via
  the `layout` verb, **never automatic** (honors no-auto-switch — summoning
  an additive overlay ≠ reorganizing the workspace).

### The panel inventory

Each is a live-subscribed view + previewed-command affordances; **every
button previews its real command on hover** (the global rule — the bar is
the training-wheels view of the CLI: a newbie clicks `[disarm]`, sees
`disarm mary`, learns the verb; a veteran just types it; same bus).

- **Engagement/threat graph** — nodes = combatants (identity via
  `RecognitionApi`), edges = who's locked on whom, sides tinted, focus-fire
  visible; each node a *banded* condition color + *banded* poise ring,
  **perception-gated by the server** (you read enemies only as well as your
  competence allows; the client never receives hidden data). Small +
  glanceable, not an MMO minimap. Clicking a node previews a targeting
  command.
- **Selected-target read + hit-location** — coarse target state, drilling
  into a **body silhouette** (the `SlotSpec.covers` map) showing armored /
  injured / exposed parts; during an **opening**, the exposed parts light up
  and clicking one previews a **called-shot** gambit. *Hit-location is core,
  not a frill* — it's the targeting surface for the coverage-based armor
  model ([materials-response-slate.md](../tails/materials-response-slate.md)).
- **Your own vitals** — full fidelity (you know your own body): condition
  band, poise band, active flags, endurance reserve, and **impaired parts**
  (which double as *why* some gambits are greyed).
- **Terms banner** — always visible: lethality (color-coded), stop-condition,
  stakes, and **your blame status** (aggressor? within authorized terms?).
  The **consent handshake** surfaces here on conflicting terms.
- **Gambit bar** — the currently-affordable gambits (cross-gated live; greyed
  when capability/band/state fails), the **opening** affordances with their
  timer, the **tactic** selector, the **queued** gambit (directed-autocombat),
  and the always-available `[yield] [parley] [disengage]`.

All honesty doctrines hold: **bands not numbers**, enemy state hedged /
your own precise, buttons that are really verbs.

---

## Settled decisions (this pass)

Twelve of the original sixteen shipped and are documented in combat.md /
combat-formations.md (poise, overextend, timed openings, consent,
sentience-keyed severity, the derived blame/accountability ledger,
self-credited `ActSignature`s, two-stage death, coup attribution,
guards-as-content's engine precondition, emergent tempo, the
single-thread coroutine). Four are still open, and still undecided in
the running game:

1. **The client UX tier** — a summoned summary card by default,
   `layout combat` opt-in and denser, the client owning zero command
   semantics. No `CombatCard` exists yet.
2. **Hit-location as a client surface** — the *mechanical* site-picking
   (torso default, called shot on an open window) shipped and is
   documented ([combat.md § The exchange](../../subsystems/combat.md#the-exchange--consequence-through-materials-response));
   the body-silhouette client display never did.
3. **Per-party goals as the resolution model** — see Thesis 7 above;
   never shipped, the flat `CombatResolution` enum shipped instead.
4. **The chase as a persistent pursuit-session** — see Thesis 7 above;
   never shipped, a single-step disengage shipped instead.

---

## Open questions

1. **The competence→exchange-rate curve** — *the* load-bearing tuning
   knob is still unresolved. The de-risking tool (the **combat gym**)
   shipped and is documented (combat.md § The experience pass), but the
   numbers themselves aren't found yet: `test:gym` carries known-red
   cells (the mutual-exhaustion limit cycle, the dead parry seam — see
   combat.md § Morale, "Two pre-existing defects the wound work
   measured"). Tuning, not shape, and still open.
2. **Group payout/blame split** — the mechanics of internal division for
   a hire-a-crew contract (reuses the banking remittance-split seam).
   Unbuilt — no employment-contract integration exists yet (Thesis 2).
3. **How the terms handshake renders** — the client surface for propose /
   counter / accept / yield / parley. Unbuilt (folds into the client
   `CombatCard` gap above).

**Resolved, cut with pointer:** tick tempo (shipped as a tunable
`combat.tickSeconds`, no further open design) · transient-state storage
(shipped session-scoped, `lib/combat/Poise.ts`) · the hook-point catalog
(superseded — see § The hook-point catalog above) · NPC/enemy tactic
symmetry (shipped as brain-driven-enemy asymmetry — combat.md § "The
enemy — a combat brain, invoked directly") · de-escalation as a
resolution path (answered by the code, not built as a verb —
combat.md § "Why there is no verb for talking a fight down" + § Morale's
onlooker read; the open act-half moved to
[intervention-slate.md](./intervention-slate.md)).

---

## What this slate does NOT cover

- **The engagement graph + party tactic presets** — owned by
  [combat-tactics-slate.md](../tails/combat-tactics-slate.md) (its graph *is* the
  threat graph; its preset table is the tactic vocabulary this loop
  consults).
- **The vitals consequence substrate** — owned by
  [vitals.md](../../subsystems/vitals.md) (Trauma, anatomy, death seam,
  condition bands). Combat *writes into* it; it isn't re-specified here.
- **The capability/mechanism-of-injury channel decomposition** — owned by
  [capability-magic-slate](./capability-magic-slate.md) ("damage type" is
  explicitly not the model).
- **The `mechanism × material × construction` response substrate** — armor
  mitigation + trauma generation, the construction vocabulary, layered
  coverage, weapon-capability-from-construction — owned by
  [materials-response-slate.md](../tails/materials-response-slate.md). Combat is its
  first consumer.
- **Specific numbers** — all resolution constants, band thresholds, the
  exchange-rate curve. Game-design/tuning, deferred to a running game.
- **Geometric/ballistic ranged combat** — refused (combat-tactics Thesis 1;
  ranged is a *relationship* problem, not a coordinate one).

---

## Once shaped into formal requirements

**Superseded — by the build.** This was the buildable spine at design
time; items 1–7 shipped (cycles 1+2, the experience pass, weapon
playstyle, combat-hooks, combat-formations — see combat.md's own
`## History`). Item 8 shipped its two-stage-death and coup-attribution
halves; its per-party-goals, three-exit-family, multi-step-fleeing, and
chase halves did not (see Thesis 7 above) — that residual is what
remains of this slate.
