# Influence — producer stock & conviction voting — requirements

This build completes **Law 2 of the cooperative — "power is earned and
spent, never owned"** — far enough that Chapter 2 of the constitution
video can describe its mechanics *accurately* (the build-before-describe
rule). It does two things the shipped influence substrate does not:

1. **Earned, third faucet.** Adds the **producer** influence stock —
   standing earned by *authoring content*, measured by the engagement
   that content draws from other players (Art. III §1). The shipped
   consumer stock measures a player's *own* participation (first-order);
   producer is the *second-order* sibling — the engagement **others**
   generate inside content **you** made, attributed back to you. With
   producer live, two of the three faucets are real and "earned by three
   kinds of contribution" is honest on camera.

2. **Spent, never owned.** Adds a **minimal conviction-voting
   substrate** — a member brings their **full** influence to *every*
   bill (no finite pool, so no triage ever), casting a yea/nay stance
   whose weight **builds the longer it is held and resets when flipped**
   — *without* bills, chambers, passage, or quorum yet. This settles the
   constitution's explicitly-deferred gap (Art. IV §2: "the precise
   reconciliation of a capped, regenerating reservoir with continuous
   allocation remains to be specified") — and largely *dissolves* it:
   with full weight per bill there is no reservoir to draw down. It makes
   "spent, never owned" a working mechanic, not a description of vapor.

Patron influence stays intake-gated (deferred to the Twitch build); the
chambers/bills/2-of-3 legislature stays population-deferred. This is the
tractable near-term slice that unblocks the chapter.

Seeding slates: [cooperative-slate.md](../slates/builds/cooperative-slate.md)
(§§ *Influence*, *The legislature*, *One resource, not two*),
[draft-constitution.md](../slates/builds/draft-constitution.md) (Art. I §3,
Art. III, Art. IV §2). Load-bearing subsystem docs:
[participation.md](../subsystems/participation.md) (the consumer sibling this
mirrors and extends), [renown.md](../subsystems/renown.md),
[access.md](../subsystems/access.md) (Zone ownership),
[response-envelope.md](../subsystems/response-envelope.md).

## Goals

### Producer influence stock

- **Producer standing is a measured, banded output** in the existing
  three-stock contract: `InfluenceApi.standingOf(subject, 'producer')`
  returns a real `InfluenceStanding` (no longer the reserved zero),
  read uniformly with consumer through the same dispatcher and `Band`.
- **Authorship is a *routing key*, not a faucet.** Authoring content mints
  **nothing** by itself. It only records *where to send producer credit
  if and when that content draws engagement.* An empty template nobody
  touches earns zero; a thousand of them earn zero. The faucet is
  **engagement**; authorship is the address label on it. (This is the
  load-bearing defense against farming the *creation* act — and why
  authoring-without-measured-engagement is rewarded only through the
  deferred, human-judged merit-pay channel.)
- **Authorship is a property of the Template, stamped at authoring
  time.** Creation is *designing a definition* — a `Template` in the
  `domain` CMS — so the routing key is a `createdByPlayerId` recorded on
  the Template when its author first saves it (the content-tree `write`
  path), not on any instance. **Instantiating (cloning) is not
  authorship** — it spawns a copy of someone else's design and is, if
  anything, a *consumption* of that work; the cloner never becomes an
  author. v1 records a **single owner** (the original author); the
  multi-recipient team split is deferred (Non-goals).
- **Only *released* content earns.** Producer credit flows from
  engagement with content in the **general domain** (released to the
  commons), never from a personal **homedir** or **team sandbox** —
  unreleased content is the author testing their own work. Release
  (sandbox → general domain) is the gate. With `A ≠ P`, bucket-dedup, and
  this released gate together, there is no cheap self- or ring-farm.
- **The producer faucet is the honest second-order measure.** A player's
  recognized in-world engagement *inside released content authored by
  another player* credits **producer** standing to that author — "the
  engagement your content draws." The engagement is resolved to the
  author through the Template: actor's location → covering zone
  (`ZoneApi.resolveZoneForPath`) → the zone's `Template` →
  `createdByPlayerId`. Self-engagement (author acting in their own zone)
  earns nothing (`A ≠ P`). The signal is the same recognized-command
  engagement the consumer faucet already taps; producer routes it to the
  *author of the content engaged* instead of the actor — so the very act
  of cloning/using someone's design feeds *their* producer standing, not
  the user's.
- **Producer standing is rebuildable from an append-only log**, mirroring
  participation/renown: drop the aggregate, replay the log, get identical
  standings (an asserted invariant). The log captures the attributed
  engagement; the standing is a recency-decayed projection.
- **Producer is engagement-only — not `× regard`.** Per Art. III §§1,6,
  regard multiplies *consumer* influence; producer quality is the
  *human* merit-pay channel (deferred). Producer standing is the decayed
  attributed-engagement quantity, banded — strictly simpler than
  consumer's `engagement × renown`.
- **Anti-farm parity with participation.** Attributed engagement is
  deduped per coarse time-bucket per `{author, actor}` (or `{author,
  content}` — planner's call), so a single player spamming inside one
  author's zone cannot inflate that author's producer standing, and an
  AFK player credits nothing.

### Conviction-voting substrate (the spend half)

- **A subject holds a conviction *position* on a target.** A generic
  substrate records a subject's yea/nay stance (with split yea/nay
  permitted, to express ambivalence) on an opaque target ref (a plain
  string id — *no* bill or chamber type; the target is whatever a future
  ballot points at).
- **Full weight per target — no finite pool, no triage.** A position
  applies the subject's *full* stock standing to that target; holding a
  position on one target never reduces the weight available to another.
  There is no allocatable pool to divide and therefore no forced
  triage — the property the slate's "no sessions, no forced triage"
  demands, in its strongest form.
- **Weight is conviction-weighted — it builds while held and resets on
  flip.** The weight a position carries ramps from near-zero toward the
  subject's full standing over a build period while the stance is held
  steady, and resets/decays when the subject flips the stance or drops
  the position. A fresh stance is weak (anti-ambush, Art. IV §2); a
  long-held one carries full weight (intensity expressed by *time on
  position*, not by out-spending others).
- **Positions are non-fungible per stock.** A producer position
  contributes only to the producer tally on that target, consumer only
  to consumer (Art. III §2); each stock tallies independently, the seed
  of the per-house concurrent vote.
- **Positions persist; conviction derives on read.** A held position
  `{subject, stock, target, direction, since}` survives restart
  (conviction = dwell time, which a restart must not erase); the
  conviction weight is computed on read from `(standing.scalar, since,
  now)`. No stored weight is authoritative.
- **Per-target, per-stock tallies are readable.** The substrate can
  report the signed conviction-weighted total held on a target, per
  stock — the shape a future per-house bill-tally consumes.

### Surface & honesty

- **The `standing` self-view shows all three stocks.** The existing
  zero-arg self-view renders consumer (live), producer (now live), and
  patron (defined zero / "not yet earnable") bands — so a player sees the
  three-faucet model, qualitatively (never raw scalars, register D6).
- **The mechanics the video describes all exist and are tested.** Every
  claim Chapter 2 makes about earning (three kinds of contribution) and
  spending (full weight per bill, conviction-by-time-held, no pool / no
  triage, non-fungible per stock) is backed by running, tested code.

## Non-goals

- **Patron faucet.** Dollars → patron influence is gated on Twitch
  payment intake — [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md)
  Phase 4/5. `standingOf(_, 'patron')` stays a defined zero standing.
- **Bills, chambers, passage, quorum, 2-of-3, delegation.** The
  legislature is population-deferred (cooperative-slate: "you can't run a
  government with one citizen"). The conviction substrate's target stays
  an opaque ref; no bill/chamber types are introduced.
- **A player-facing voting verb.** With no bills to point at, the
  conviction substrate ships **Api-and-tests only** for v1; the
  `vote`-style verb lands with the bill/chamber build that gives it a
  real target.
- **Producer merit-pay** — the bounded, human-judged *mint* of producer
  influence for work the engagement measure can't see/judge (Art. III §7)
  — is deferred; this build ships only the *measured* producer faucet.
- **`producer × regard`.** Producer is engagement-only by design; the
  quality judgment for producers is merit-pay, not a renown multiplier.
- **Per-object engagement attribution.** Authorship itself is recorded
  per-template (fine-grained), but v1 *attributes* engagement only at
  **zone granularity** — the engagement signal resolves location, not the
  target object. Crediting "the engagement your *sword* / *NPC* draws"
  needs a target-carrying engagement signal and is deferred.
- **Shared-development attribution (the team split).** v1 routes producer
  credit to a **single owner**. Splitting one piece of content's earned
  engagement across a *team* of contributors (editors, co-authors, the
  Narnia case) is its own deferred design problem. **Settled constraints
  for when it is built**, so the deferred design starts from a fixed
  frame:
  - The routing table for shared content is a **declared weighted split**
    among individuals — *not* a governed divvy. The polity stays **flat**:
    individuals vote; a team/zone never holds political power, it is only
    a label on a routing key its owners configure. (A governed per-period
    divvy would be **federalism** — deliberately avoided.)
  - Producer influence must resolve to **enfranchised individuals** (it is
    a vote in the producer house; a team cannot vote) —
    cf. [[influence-banking-level]].
  - The split is **static between fixed, global adjustment windows**
    (e.g. quarterly — a Schedule-of-Parameters constant, *not*
    team-chosen). It is a **franchise-shaping instrument**: an on-demand
    re-cut is a *redistricting* power that could swing a live producer-
    house vote, so re-cuts are decoupled from the bill calendar — the same
    continuity/anti-ambush value conviction voting enforces, applied to
    the routing layer.
  - Re-cut semantics are **redirect-the-faucet, not reslice-the-pool**:
    each engagement event routes to individuals' *own persistent*
    standings by the split in effect; a re-cut changes only *future* flow
    (so swings are gradual) and never claws back already-earned standing
    (never drain the tank). A mid-window joiner/leaver's *share of future
    flow* changes at the next window.
- **A separately-stored regenerating reservoir + the lifetime-total /
  recurring-rate two-marker split.** Those model the *patron-dollar*
  shape; the consumer/producer faucets are continuous-contribution and
  reuse the measured standing directly as voting weight (no stored
  reservoir). Deferred with patron.
- **A limited "priority-boost" intensity layer.** The full-weight-per-bill
  rule (Surface decisions) deliberately gives up *positive* minority
  empowerment — a passionate minority cannot out-*mass* a steady majority
  on a single bill; intensity is expressed by persistence (conviction
  builds the longer a stance is held), not by concentration. If the
  polity later wants bounded concentration back, the intended shape is a
  **small, separate pool of priority boosts** layered *on top of* the
  full-weight base — a member spends it on the few bills they care most
  about, recovering limited intensity-concentration *without* making
  every vote a triage chore or reintroducing bill-starvation. Explicitly
  **deferred, not built**: it is a second resource (the slate warns this
  doubles the hoardable surface) and a new gameable surface, warranted
  only once there is a live electorate to measure the need against.

## Surface decisions

### Producer faucet is the second-order reuse of the engagement signal

**Question.** The consumer faucet taps `CommandDispatchedEvent` (one
recognized command from an interactive origin) and credits the *actor*.
How does producer earn from "engagement my content draws"?

**Decision.** Producer reuses the **same engagement signal**, but routes
each event to the **author of the content the actor was engaging**, not
to the actor. Producer standing for author *A* = the recency-decayed,
bucket-deduped count of recognized engagements by players *P ≠ A* inside
content *A* authored. This makes producer the literal second-order
sibling of consumer: consumer measures *your* engagement; producer
measures *the engagement you cause in others by what you built* — the
same primitive read from the other end.

**Consequence — the engagement signal must carry location/zone.**
`CommandDispatchedEvent` today carries only `{subjectId, commandId, at,
realAt}`; the fire site (`CommandGiver._emitInputEcho`) has
`context.location` available but does not forward it. Producer
attribution needs the engaged zone, so the signal (or the producer tap's
resolution at fire time) must surface the actor's location → covering
zone → that zone's author. This is a change to the shared,
just-merged consumer substrate; it must preserve the consumer tap's
behavior byte-for-byte.

**Consequence — the snoop-gate allowlist widens by one.** The engagement
event's subscribe side is locked to `ConsumerLogic` via
`EventApi.restrictSubscribe` (the per-player activity-snooping gate;
participation.md). Producer's tap is a second blessed consumer:
`ProducerLogic` joins the allowlist. No third party gains the signal.

### Authorship lives on the Template (authoring time); attribution is zone-capped (engagement signal)

**Question.** Nothing records who authored game-world content. Where does
the authorship stamp come from, on what unit, and at what granularity can
engagement be attributed back to it?

**Decision — authorship is per-Template, stamped at save.** The act of
*creation* is designing a **Template** (the definition in the `domain`
CMS), so authorship is a **`createdByPlayerId` field on `Template`**,
stamped when the author **first saves** it. The author identity is
available at the content-tree `write` path (`WriteController` →
`context.commandGiver` → Avatar `playerId`) and threads through
`TemplateApi.saveTemplate` → `TemplateLogic`, stamped on insert only so
later edits don't overwrite the original author. **Cloning/instantiating
is explicitly *not* an authoring event** — it spawns a copy of an
existing design and carries no author of its own; the cloner is a
*consumer* of the work. (This corrects an earlier draft that wrongly
stamped authorship at clone time.) The stamp is distinct from
`Zone.ownerGroup` (multi-member *access control*, not authorship), and it
is recorded on **every** authored template (zone, item, NPC), cheaply, at
save — forward-compatible even where v1 cannot yet attribute to it.

**Decision — v1 attribution is zone-granularity, and that is an
*attribution* limit, not an authorship one.** Authorship is fine-grained
(per template); but the engagement signal can resolve only *where* an
action happened, not *which object* it targeted. So v1 credits the author
of the **zone** an engagement occurs in (location → covering zone → zone
`Template` → `createdByPlayerId`) — a faithful realization of the slate's
"author a zone, measure the engagement it draws." **Per-object
attribution** ("the engagement your *sword* draws") is **deferred**: it
needs the engagement signal to carry the *target* object → its template →
author, a larger change to the shared signal.

**Reasoning.** The Template is the unit that holds the hours of work, so
it is the correct home for authorship; the `write`/save seam is where the
authoring player is known and where creation actually happens.
Zone-granularity attribution is the honest most-we-can-measure-now from a
location-only engagement signal, and it matches the canonical authored
unit (a place people spend time in) rather than under-delivering.

**Decision — authorship is a routing key, earning is gated to *released*
content, and v1 routes to a single owner.** The stamp earns nothing on
its own; it only directs the *engagement* faucet (above). Two scope
boundaries fall out: (1) credit flows only from content in the **general
domain** — engagement inside a personal **homedir** or **team sandbox**
earns nothing (unreleased work the author is still testing), with
**release** (sandbox → domain) as the gate; the planner needs a
sandbox-vs-released marker on the zone/tree. (2) v1 routes to a **single
owner** per piece of content; the **multi-recipient team split** is
deferred with settled constraints (Non-goals: declared-not-governed,
flat-not-federal, static between fixed global adjustment windows,
redirect-the-faucet semantics). Together with `A ≠ P` and bucket-dedup,
the released gate removes the self-/ring-farm surface that an
author-grants-credit model would have.

### Full weight per bill — there is no reservoir to draw down

**Question.** Art. IV §2 wants a capped, regenerating *reservoir* drawn
down by *continuous allocation*, and flags the reconciliation as
unspecified. What is the model?

**Decision.** **A member brings full weight to every bill; there is no
finite pool and nothing is drawn down.** The weight a member exerts on a
bill is their measured standing for that stock × the conviction earned on
that bill's position — and holding a position on one bill costs nothing
on another. The "cap + regenerating reservoir" of Art. IV §2 simply *is*
the measured `InfluenceStanding.scalar`: contribution-bounded, faucet-fed,
decaying — no second stored reservoir, no regen loop, no
`Σ ≤ scalar` accounting. "Never owned": the standing tracks *current*
contribution (stop contributing → it decays → your weight everywhere
shrinks), and conviction resets when you flip — so nothing is a
permanent, owned, transferable share.

This is the **settled conviction rule** (full weight per bill, intensity
by time-held, no triage), chosen over the finite-pool alternative because
a pool reintroduces the "caring about X costs weight on Y" friction the
slate's no-triage value rejects.

**Consequence — the draft constitution is revised.** Art. IV §2's
current language ("*allocating* influence onto the bills... decays when
you *move* it") describes the finite-pool model that was rejected here;
its phrasing must be updated to the full-weight-per-bill / conviction-by-
time framing. The draft constitution is not ratified, and this is the
piece it explicitly left unspecified — so this build's design *is* the
resolution. (Flag the doc edit during the build's docs sweep; the
constitution lives in the slates tree.)

**Reasoning.** Reuses the shipped derive-on-read standing as the single
source of weight (no redundant reservoir to keep consistent), and is the
simplest substrate that satisfies anti-ambush (conviction build),
continuity (positions persist), and zero triage (no pool).

### Conviction substrate ships Api-and-tests, verb deferred

**Question.** Should the conviction substrate get a player-facing voting
verb now?

**Decision.** **No — Api + tests only for v1.** Without bills there is no
real target to vote on; a demo target would be throwaway. The substrate
exposes hold / flip / drop a position and read per-target tallies through
its Api, fully tested against a controllable clock. The player-facing
`vote`-style verb lands with the bill/chamber build that gives it a real
target. The video describes the mechanic; it does not need a live verb.

## Downstream — how the tally feeds passage (deferred, informative)

This section is **not in scope** — the bill/chamber lifecycle is the
population-deferred legislature build. It is recorded so the planner
shapes the conviction substrate to *feed* that lifecycle (Constitution
Art. IV §§3–4; cooperative-slate § *The legislature* / § *Deliberation*).
The single coherence requirement it imposes on *this* build: the
substrate must expose, per `{stock, target}`, the **net signed
conviction-weighted total** — that number *is* a future bill's
per-house tally.

The deferred lifecycle the tally serves:

- **Passage.** A bill's per-house tally = Σ over voters of `weight ×
  conviction × direction` (yea positive, nay negative) — exactly the
  substrate's per-`{stock, target}` net total. A bill **carries in a
  house** when that net crosses the house's **passage threshold**;
  because conviction is the time-integral of support, crossing inherently
  means "enough weight, held long enough" (anti-ambush is intrinsic). It
  **becomes law** on a **majority of houses (2 of 3)**, each tallied in
  its own non-fungible stock; a sub-quorum house **abstains** but passage
  is still measured against all three.
- **Leaving the floor.** A bill exits exactly three ways: **passes**
  (threshold in 2 of 3); **lapses** (positions dropped/flipped →
  conviction decays → net falls below a **survival floor**: abandonment);
  or **times out** at a **maximum lifespan** unless backers pass a
  **continuing resolution**. Reaching the floor at all needs a minimal
  **sponsoring position** (anti-spam).
- **Debate.** Does not hard-close — voting is continuous, so the
  argument-map stays open while the bill lives, bounded by an
  **anti-railroad minimum period** (a bill cannot carry before a floor of
  deliberation time, even with overwhelming weight) and signalled by
  **maturity** (the argument structure stabilizes; the forums
  argument-organizer already fires a `mature` event with no consumer —
  this ballot is its eventual one).

All thresholds, floors, and lifespans are **ratification-time tuning
constants** (the constitution's Schedule of Parameters), never hardcoded
here.

## Constraints

- **Module taxonomy (CLAUDE.md).** New surfaces follow the fixed
  categories: a thin gated `ProducerApi` (`api/producer.ts`) forwarding
  to a `ProducerLogic` singleton (`obj/api/ProducerLogic.ts`); likewise
  the conviction-position substrate as an `Api` + logic-singleton if it
  needs protected internals. **No free-floating helpers.** Value objects
  (`Position`, conviction weight) are named value-object modules.
- **Cross-stock home.** The shipped value objects (`InfluenceStanding`,
  `Band`) live in `lib/participation/` — a consumer-flavored home now
  carrying cross-stock primitives. Whether producer + conviction
  primitives join there or motivate a new `lib/influence/` subsystem
  folder is an architecture call for the planner; if a new folder is
  proposed it must clear the "don't invent module categories" bar
  (a new *subsystem* folder is permitted; a new module *type* is not).
- **Routing seam is forward-compatible (Layer 1 / Layer 2 split).** The
  producer faucet (engagement → credit) reads authorship through a
  **routing resolver** — "given engaged content, who earns and in what
  shares." v1's resolver returns a single owner; the deferred team split
  is a Layer-1 enrichment behind the *same* resolver, so the faucet
  (Layer 2) is built once and untouched when splits arrive. Build the
  resolver as the seam, not an inline `createdByPlayerId` lookup.
- **Rebuildable-cache invariant.** Producer standing and conviction
  weight are both derive-on-read / replay-from-log; no stored value is
  authoritative. Persistence goes through the `PersistApi` chokepoint
  (renown.md precedent), `lint:pm`-locked.
- **Two clocks.** Producer attribution measures *a human showing up to
  consume content* — like participation, its bucket/decay are **real
  time** (participation.md § Two clocks); the game-time `at` is recorded
  for parity only. Conviction dwell time is likewise real-time.
- **Snoop-gate preserved.** Widening `restrictSubscribe` to
  `ProducerLogic` must not open the engagement signal to any other
  subscriber; the consumer tap's behavior is unchanged.
- **Controllers return `void`** and ride the dispatch-response envelope
  (the `standing` view extension); no `{success, summary}` returns.
- **Non-fungibility is code, not a key** — the per-stock position
  separation is an entrenched invariant, not an AppSettings dial.
- **Tuning via AppSettings, no code defaults** — producer decay
  half-life / bucket width, conviction build period & decay rate, band
  thresholds are `AppSettings` keys seeded from YAML (app-settings.md).

## Acceptance criteria

- `InfluenceApi.standingOf(subject, 'producer')` returns a live,
  non-zero `InfluenceStanding` for an author whose authored zone has
  drawn engagement from other players; zero for one whose content drew
  none.
- A recognized command by player *P* inside a **released** zone authored
  by *A* (with `A ≠ P`) increases *A*'s producer standing; the same
  command by *A* inside *A*'s own zone does not.
- The same engagement inside an **unreleased** zone (a homedir / team
  sandbox authored by *A*) credits *A* **nothing** (the released gate).
- Dropping the producer aggregate and replaying the append-only log
  reproduces identical producer standings (asserted test).
- Bucket-dedup holds: *N* recognized commands by one player in one
  author's zone within a bucket credit the author once for that bucket.
- Hold/flip read-back: a subject's conviction weight on a target
  **increases over time** while a steady position is held, and
  **resets/drops** when the position is flipped or dropped (asserted with
  a controllable clock).
- Full-weight-per-target / no pool: a subject's full stock standing
  applies to a target at full conviction, and holding a position on one
  target does **not** reduce the weight available on another (asserted —
  there is no `Σ ≤ scalar` pool to divide).
- Producer and consumer positions tally **independently** per stock
  (non-fungible) — a producer position does not affect the consumer
  tally, and vice versa.
- A held position survives a persistence round-trip; its conviction
  recomputes from dwell time, never from a stored weight.
- The `standing` self-view renders three stocks (consumer + producer
  live, patron defined-zero) as bands, never raw scalars.
- A subsystem doc exists (`docs/subsystems/` — extend
  participation.md or a sibling) describing the producer faucet, the
  authorship stamp, and the conviction-voting substrate, with the
  reservoir-reconciliation decision recorded.
- `pnpm test`, `pnpm lint` (incl. `lint:gates`, `lint:pm`), and
  `pnpm build` pass.

## Cross-references

- **Seeding slates:** [cooperative-slate.md](../slates/builds/cooperative-slate.md),
  [draft-constitution.md](../slates/builds/draft-constitution.md)
  (Art. I §3, III, IV §2)
- **Mirrored sibling:** [participation.md](../subsystems/participation.md)
  (consumer stock — the substrate, two-clocks, snoop-gate, three-stock
  contract this extends)
- **Read, not owned:** [renown.md](../subsystems/renown.md) (the quality
  multiplier; producer does *not* use it)
- **Authorship inputs:** the template-authoring path
  (`WriteController` → `TemplateApi.saveTemplate` → `TemplateLogic`,
  stamping `createdByPlayerId` on `Template`),
  [templates.md](../subsystems/templates.md),
  [persistence.md](../subsystems/persistence.md);
  [access.md](../subsystems/access.md) (`Zone.ownerGroup` is access
  control, *not* the authorship stamp); instance→template→author
  resolution via `Template.findByPath` + `ZoneApi.resolveZoneForPath`
- **Engagement signal:** `lib/events/CommandDispatchedEvent.ts`,
  `CommandGiver._emitInputEcho`, `EventApi.restrictSubscribe`
- **Video target:** `docs/manifesto/constitution-video.md` (Ch. 2 — lives
  in the master worktree, uncommitted)
- **Deferred follow-ons:** patron faucet
  ([broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md)),
  bills/chambers (cooperative-slate, population-deferred), producer
  merit-pay (Art. III §7)
