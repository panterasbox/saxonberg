# Polity Decision Register

> **The classified state of every governance decision — what's permanent,
> what's interim, what's still open.** This register exists so that anyone
> who clones the repo and starts asking questions gets a coherent map: for
> any rule of the polity, *which kind of decision is this, and can I push
> on it?* It is the hand-off document — each entry carries its reasoning
> and the trigger that should reopen it, so the eventual polity inherits
> arguments, not just settings.

## The three kinds of decision

Every governance decision in this project is exactly one of these, and
each entry below is tagged accordingly:

1. **Permanent (load-bearing).** Change it and you are building a
   different thing. The axioms — three co-equal chambers,
   influence-is-voice-not-equity, amendment-by-equals. Reopened only by
   amendment-by-equals (one-member-one-vote), never by ordinary weighted
   legislation.
2. **Interim (provisional).** Chosen *now* to make a working product, and
   explicitly **built to be revisited**. These are the founder's
   research-curated bootstrap defaults — real settings the prototype
   ships with, marked for the polity to overturn.
3. **Open (undecided).** Deliberately *not* decided. The code stays
   unimplemented and the design stays up in the air — and it is **marked
   as such in place**, so no one mistakes an empty seam for a settled
   answer.

### Flawed is not broken

The quality bar across all three tiers:

- A **flawed law** is acceptable — *desirable*, even. Launching an
  imperfect rule and then **fixing it through the system itself** is the
  strongest possible proof the system works. Dogfooding exercises not
  just the code but the laws.
- A **broken system** is not acceptable. Broken = crashes, incoherent,
  or can't be reasoned about when someone tests the edges and asks Claude.
- Therefore: **everything *implemented* must work and be
  Claude-explainable; the *decision* it embodies may be imperfect.** An
  *Open* item is honestly unimplemented (and says so); it is never a
  half-built thing that breaks under questioning.

## Why this register exists — the self-undermining founder

A deliberative polity has a founding paradox: the rules that constitute it
cannot themselves be deliberated — there is no polity yet to do the
deliberating. Someone must set the bootstrap defaults so a prototype can
exist at all. The founder is that someone, transiently (see the
cooperative slate's "founder's transient control" and amendment-by-equals,
[cooperative-slate.md](./slates/builds/cooperative-slate.md)).

The resolution this project adopts:

1. **Curate, don't decree.** Each *Interim* default is bound to evidence
   (mechanism-design / social-choice / online-community research, or
   empirical observation), not founder taste. The rationale is recorded
   so it can be *argued with*.
2. **Classify honestly.** Every decision is tagged Permanent / Interim /
   Open. Nothing provisional is dressed as permanent; nothing open is
   dressed as decided.
3. **Name the revisitation trigger.** Every *Interim* default carries the
   condition that should reopen it.
4. **Hand it forward.** When a polity exists, every *Interim* entry
   becomes a standing motion the relevant chamber may revisit;
   *Permanent* entries change only by amendment-by-equals.

This is the founder deliberately writing rules designed to be taken away
from the founder.

### Relationship to the other docs

- [cooperative-slate.md](./slates/builds/cooperative-slate.md) — the
  governance **north star**; the source of the Permanent spine below.
- [reputation-slate.md](./slates/builds/reputation-slate.md) +
  [renown.md](./subsystems/renown.md) — the **substrate** that measures
  the "quality" half of consumer influence.
- **This register** — the **classified decisions** taken to ship a
  prototype before the polity that should make them exists.

## How to read an entry

Each Interim/Permanent entry carries: **Decision** (the rule as it ships)
· **Rationale (evidence)** (why this, not the alternative) · **Tradeoff
accepted** (the strongest case *against* — the opening counter-argument,
handed over intact) · **Revisitation trigger** (what should reopen it) ·
**Tier** (Permanent / Interim).

---

## Tier 1 — the permanent spine (load-bearing)

Recorded briefly here so the load-bearing axioms are visible in one place;
the cooperative slate is their authoritative source and the place they are
argued. Changing any of these is changing *what we are building*.

- **Three co-equal chambers, two-of-three passage** (producer / capital /
  consumer). The permanent structural check against majoritarian capture
  (cooperative-slate.md:496, 528).
- **Influence is voice, never equity.** Stake-is-not-stock: membership
  confers governance and recognition, never a financial claim
  (cooperative-slate.md:172).
- **Influence is non-fungible across chambers.** No cross-chamber
  conversion, ever (cooperative-slate.md:242).
- **Influence individuates.** Standing attaches to a person, never a
  group or shared account; no cross-character transfer
  (cooperative-slate.md:1889).
- **Ordinary legislation is weighted; constitutional amendment is
  one-member-one-vote.** A whale can dominate weighted legislation but
  cannot buy a constitutional change past the equal consent of the
  governed (cooperative-slate.md:1103).
- **The Sybil floor is costly, verified contribution.** Sybil-resistance
  by construction for the paid chambers; the load-bearing enabler of
  weighted digital democracy (cooperative-slate.md:131). (Its consumer-
  chamber form is *Open* — see D7.)
- **D1 — Consumer influence is `engagement × renown` (multiplicative).**
  Both axes required; either at zero zeroes the product — the structural
  defense against popularity-contest (reputation alone) and idle-farm
  (engagement alone) (cooperative-slate.md:276). *The two axes and their
  multiplicative form are load-bearing; how each axis is measured is
  Interim — see D2/D4.*

### Resource & territory — the tenure floor

The kernel cluster that makes "authority over a subdivision" mean
something. Source: cooperative-slate.md § *Institutions are private
actors* + § *How territory is held*; [economy-slate](./slates/builds/economy-slate.md)
§ *The two scarcities*; [advancement-slate](./slates/builds/advancement-slate.md).
The split principle: **the kernel is the procedural floor that makes
authority real and capture hard; every substantive who-gets-what choice
is a module** (see the tenure / compute / federalism module in the
[amendment library](./slates/builds/amendment-library-slate.md)).

- **Compute is the only real scarcity, and the firewall covers it.**
  Content is non-rival (freely copyable; never enclosed past the
  no-pay-to-win firewall — full CC-vs-proprietary is a *module*). The one
  rival resource is **mem/compute**; real money sizes the compute pool and
  buys **no** in-world power.
- **Presence is never the meter.** No mechanic may make a player's
  *attendance* the thing that staves off loss — the true, narrow floor
  under "respect people's time" (broader than the economy slate's Law 2
  "no rent on owned space," and the part that is actually inviolable). It
  is what *permits* metering the real compute substrate by use:
  the bill is paid in engagement + capital, never in showing up.
- **Rule-of-law over resources.** The executive may *oversee* any
  subdivision but may not seize or override a holder's rights except by
  **due process / published standards / legislated reason.** Authority is
  the *protection*, not exclusivity of access (access is necessarily
  non-exclusive — oversight reaches everywhere).
- **The executive is functional, never territorial.** No "Department of
  Narnia"; the executive reaches a subdivision only through system-wide
  functional charters (publishing, enforcement, provisioning). This keeps
  *oversight* from silently becoming *ownership*.
- **A protected-rights floor for resource-holders — federal-by-
  construction.** Every instance guarantees a subdivision-holder a
  non-empty, due-process-protected core of authority over what they hold.
  *That a floor exists* is kernel; *how far above it the dial sits* (how
  centralized vs. federal) is a module. Chosen **kernel for uniformity**:
  a common floor is the **interop protocol** for a future inter-instance
  ("UN") federation — you cannot federate instances that don't share a
  basic structure (see Tier 3).

---

## Tier 2 — interim decisions (provisional)

The live bootstrap choices. Real settings the prototype ships with;
flagged for the polity to revisit.

### D2 — Quality is *second-order engagement* (the engagement you cause in others)

- **Decision.** The "quality" axis is the engagement a member's presence
  induces in *other* members — measured with the same engagement metric
  applied to those around them — not merely the count of
  reactions/receptions they collect. (Direct reactions remain a signal,
  not the definition.)
- **Rationale (evidence).** Operationalizes "made the game fun for others"
  directly and rule-agnostically: the outlaw who livens a room scores;
  the scold who makes people go quiet does not — no conduct/compliance
  term anywhere. Also the strongest anti-gaming property available: you
  cannot manufacture *other real people's* genuine engagement (see D7).
  renown.md flags this as the deferred "engagement-effect sampling" seam
  (renown.md:198).
- **Tradeoff accepted.** Causal attribution is noisy and expensive; the
  cheap proxy (interaction-weighted co-presence) is gameable at the
  edges. Ship the proxy, treat true causal attribution as the frontier.
- **Revisitation trigger.** Proxy proves gameable in practice; causal
  version becomes affordable; or polity revisits.
- **Tier.** Interim.

### D3 — Governance quality is *crowd-judged*; social renown may be elite-weighted

- **Decision.** The renown projection feeding the **governance** rollup
  leans crowd-judged: broad revealed appreciation, eigenvector/
  reactor-renown weighting used only as a light Sybil damper. The
  **social** projection (NPC reactions, fame) may be fully
  eigenvector-weighted. One log, two projections weighted differently
  (renown.md:147).
- **Rationale (evidence).** Eigenvector trust weighting (EigenTrust;
  PageRank) is excellent against Sybils but encodes an aristocracy of
  taste — the influential validating the influential. For
  *enfranchisement*, legitimacy comes from broad mandate, not an in-crowd
  deciding what "fun" is. The two-projection design lets social flavor be
  elitist while the vote stays democratic.
- **Tradeoff accepted.** A crowd-leaning governance signal is more exposed
  to Sybil/collusion; we lean harder on D7 and the multiplicative gate to
  compensate.
- **Revisitation trigger.** Observed Sybil/collusion capture; or polity
  revisits the elitism/legitimacy balance. (Exact eigenvector coefficient
  is *Open*.)
- **Tier.** Interim.

### D4 — Renown *gates and caps*; engagement carries the magnitude

- **Decision.** On the determines-vs-informs dial
  (cooperative-slate.md:2287), renown **informs**: it gates eligibility
  (you must be net-valued to hold full influence — see D5) and caps the
  ceiling, but the *magnitude* of consumer influence is carried by
  engagement, not by a raw appreciation score.
- **Rationale (evidence).** If renown *determines* vote weight, every
  optimizer points at the reaction system — maximum Goodhart pressure on
  the most game-able signal. Gating rather than scaling sharply lowers it.
- **Tradeoff accepted.** A beloved-but-light participant is capped by
  their engagement; intensity of regard buys eligibility, not unbounded
  voice.
- **Revisitation trigger.** Polity exists; or evidence the gate is too
  coarse.
- **Tier.** Interim.

### D5 — Net-negative conduct disenfranchises; it never anti-enfranchises

- **Decision.** Governance influence clamps at zero:
  `max(0, renown) × engagement`. A net-unfun member loses voice but never
  casts negative weight. The cooperative-wide rollup nets the outlaw out:
  antisocial-but-entertaining (net positive) keeps full voice;
  antisocial-and-unfun (net negative) falls to zero.
- **Rationale (evidence).** Signed renown feeding *negative* votes would
  weaponize brigading. Clamping makes the consequence legible and
  bounded: "the polity stops listening to you," never "your enemies vote
  on your behalf." The line is *unfun*, not *rule-breaking*.
- **Tradeoff accepted.** A harmful member at exactly net-zero sits at the
  boundary with no extra penalty; punitive conduct stays a separate
  moderation concern.
- **Revisitation trigger.** Polity exists; or evidence clamp-at-zero is
  insufficient against harmful-but-net-positive actors.
- **Tier.** Interim.

### D6 — Standing shown as qualitative bands; vote weight exact and auditable at the ballot

- **Decision.** The running standing meter is surfaced as **qualitative
  bands** ("respected," "a pillar," "notorious"), not a precise score. The
  **vote weight at the moment of voting** is exact and fully auditable.
  Meter decoupled from ballot.
- **Rationale (evidence).** A precise visible score is a Goodhart target —
  players optimize the number, not the play. Bands preserve felt earned
  standing without exposing a gradient to grind; auditability is kept
  exactly where accountability matters (the vote).
- **Tradeoff accepted.** Bands reduce between-vote legibility of *why* a
  member's weight is what it is.
- **Revisitation trigger.** Polity demands fuller transparency; or bands
  prove too coarse to feel earned.
- **Tier.** Interim.

### D7 — The consumer-chamber Sybil floor is human verification

- **Decision.** One verified human = one consumer-chamber seat, regardless
  of how many avatars accrue engagement. In-game defenses (D1, D2,
  log-saturation, decay, conviction voting) raise the *cost* of gaming
  but are not the floor — human verification is. **Measurement is
  per-character; enfranchisement is per-human.** Renown and engagement
  accrue to the player-*character* — a human may spread effort across
  several characters and thereby *dilute their own standing*, which is
  their choice. What anchors to the one verified human is the **seat**
  (the enfranchisement gate), never per-character storage. (Corrects an
  earlier "banks at the human level" phrasing that conflated measurement
  with enfranchisement; consistent with Tier 1 *influence individuates /
  no cross-character transfer* — you earn separately on each character,
  never move standing between them.)
- **Rationale (evidence).** Paid chambers are Sybil-resistant by cost.
  Consumer engagement costs only *time*, so no in-game mechanic alone
  stops a patient adversary running many engaging characters (Douceur's
  Sybil result). Proof-of-personhood is the only known floor (BrightID /
  World ID / Gitcoin Passport / Proof of Humanity family).
- **Tradeoff accepted.** Robust proof-of-personhood is hard, privacy-
  fraught, and exclusionary at the margins; until it exists, consumer-
  chamber Sybil resistance rests on cost, not a true floor.
- **Revisitation trigger.** A proof-of-personhood mechanism is adopted; or
  observed Sybil capture forces it.
- **Tier.** Interim (the verification *mechanism* itself is *Open* — see
  below).

### D8 — The default tenure regime is *homestead* ("Frontier")

- **Decision.** The bootstrap default for how a group comes to *hold* a
  subdivision is **homestead**: build in unclaimed namespace → hold it.
  Compute is **metered as use** (paid in engagement + capital, never in
  presence); inert/never-built claims **revert by abandonment** (not a
  holding tax — Law 2); content stays free/CC. The two alternative regimes
  (**chartered grant**, **commons**) ship as the other settings of the
  tenure module.
- **Rationale (evidence).** Lowest activation energy for a tiny pilot —
  one person can homestead day one, where a commons needs a quorum and
  chartering needs a bureaucracy. Lockean (build-to-hold), and it counters
  the two failure modes of the founder's prior over-centralized world:
  single-point dependence (distributes the world-building labor) and
  ossification (abandonment-reversion self-cleans). Degrades gracefully
  *into* the other regimes by ordinary amendment.
- **Tradeoff accepted.** Frontier land-rush dynamics and name-squatting on
  inert claims (mitigated by abandonment-reversion + CC-forkability, never
  by a presence-paid rent).
- **Revisitation trigger.** A community adopts a different distro
  (Federation / Commons); or the polity revisits.
- **Tier.** Interim.

---

## Tier 3 — open (undecided)

Deliberately not decided. Code unimplemented, design up in the air —
marked as such so an empty seam is never mistaken for a settled answer.

- **The attribution window for second-order engagement (D2)** —
  co-presence vs interaction-weighted vs causal (arrive/leave delta).
  Start: interaction-weighted co-presence. Causal is the frontier.
- **The eigenvector damping coefficient on the governance projection
  (D3)** — "light" is decided; the number is not.
- **The engagement metric's anti-bot / anti-AFK definition** — what counts
  as a unit of engagement (cooperative-slate.md:2276). *No quantity-axis
  substrate exists yet.*
- **Decay rate + concave dollar→influence curve shape** — structurally
  decided (slow decay, concave curve), exact numbers deferred to a running
  game (cooperative-slate.md:2229, 2249).
- **The proof-of-personhood mechanism (D7)** — the actual verification
  method.
- **The compute meter's currency + the precise presence-exclusion line**
  — *that* compute is metered by use is settled; the exact unit
  (engagement-subsidy vs. capital-allocation vs. a rule-bound market) and
  the precise line that keeps player *presence* out of the meter are not.
- **The rights-bundle composition + per-right protection levels** — *that*
  a protected floor exists is kernel (Tier 1); *which* rights a holder
  gets (author / admit-exclude / house-rules / develop / earn-credit /
  transfer / guaranteed-compute) and *how protected* each is — the
  federalism dial, set per-right — is the open module surface.
- **Inter-instance ("UN") governance — the layer above.** Federalism
  *between* instances: a compact governing anyone running the platform.
  The kernel-uniformity choice (Tier 1, the tenure floor) deliberately
  keeps this door open — a federation needs members that share a basic
  structure — but the layer itself is **not designed**; parked as a future
  exploration, not a near-term build.

## The deliberation hand-off

When a polity exists:

- Every *Interim* entry (D2–D7) becomes a standing motion the relevant
  chamber may revisit. The rationale and tradeoff fields are the opening
  argument *and* the opening counter-argument, handed over intact.
- *Permanent* entries (Tier 1) change only by amendment-by-equals
  (one-member-one-vote), never by weighted legislation — the founder's
  provisional choices must not be entrenchable past the equal consent of
  the governed.
- *Open* items (Tier 3) are picked up as the substrate to implement them
  lands and the polity has something to deliberate.
