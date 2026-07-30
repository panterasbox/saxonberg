# The odometer — honest number-go-up (working slate)

> **Status: design-phase, deferred-rpg.** Born from the party-progression
> discussion: the honest-simulation stack (no HP, no XP, no stored
> competence — derive-don't-track) *loses* one real thing — the tight,
> granular, dopamine-drip of **watch-number-go-up**. That's a genuine
> engagement mechanic, not a weakness to rationalize away. This slate gives
> it back **without the lie.** Nothing here is a build.
>
> Not party-specific — it's a general **subject-scoped** primitive (a
> character, a party, later maybe a guild/corp). Homed standalone because
> several systems consume it.
>
> **Sequencing decision (2026-07-28): the odometer is a CAPSTONE — built
> deliberately LAST**, after the economy spine + the crafting skill seam
> are live and a beta population has generated ledger density worth
> summarizing. Two reasons make late-build strictly better here: (1)
> deferral loses nothing — it derives over ledgers already kept, so a
> launch-week build shows every player's *complete* journey
> retroactively; (2) counter *selection* is editorial and can only be
> done well against observed play (which acts players actually care
> about). Guessing counters early is the only way to build it badly.
>
> **The load-inert rule** (extends downstream-inert): *no system's
> felt-progression story may DEPEND on the odometer.* It garnishes
> journeys other systems already make felt; if removing it would break a
> system's progression feel, that system is underbaked — fix the system,
> don't lean on the tally. This is a standing review question for every
> build. Accumulated promissory mentions to honor (and audit against
> this rule) when the build comes: the advancement slate's
> focus-concentration feel, the party slate's fast-timescale strand, the
> crafting conversation's tally strand (2026-07 — crafting's
> requirements deliberately do NOT depend on it).

See also:

- [../../subsystems/participation.md](../../subsystems/participation.md) — the
  odometer's **decayed sibling**: participation reads a *decayed window*
  ("active *now*," anti-AFK); the odometer reads the *un-decayed lifetime*
  ("done *ever*"). Same event streams, two temporalities.
- [../../subsystems/advancement.md](../../subsystems/advancement.md) — the
  honest **capability** dimension the odometer must **never** become (the
  bright line). Competence is derived, bands-only; the odometer is a tally.
- [../../subsystems/chronicle.md](../../subsystems/chronicle.md) /
  [../../subsystems/renown.md](../../subsystems/renown.md) — the
  **subject-keyed** pattern (keyed on `templatePath`) the odometer reuses,
  and the append-only ledgers it *counts*.
- [../../subsystems/belief.md](../../subsystems/belief.md) — milestones
  surface as **recognition / titles** (a belief fact others see), never as
  power.
- [party-slate.md](./party-slate.md) — the party is one odometer subject (the
  fast layer of party progression).

---

## Principle — XP fuses two things; the lie is the fusion

XP feels like one thing but is two glued together:

1. **A journey odometer** — a monotonic, granular tally of *what you've
   done*. Every act bumps it; it never regresses.
2. **A capability input** — you *spend* it to get stronger (XP → level →
   power).

**The dishonesty is entirely in #2** — the pretense that "how much you've
done" *is* "how good you are." That's exactly what the derived capability
dimensions (competence / renown / standing) exist to avoid. But #1 is
completely honest, and **#1 is where all the dopamine actually lives** — the
satisfaction is the tally climbing, not the spending. So: **split them. Keep
the odometer; throw away the capability-input.** You lose the lie and keep
the drip.

The honest definition of what it encapsulates: **activity / effort /
journey — explicitly NOT capability.** ("One number" felt like it had to be
XP only because we assumed it meant *capability*; make it honestly mean
*activity* and it's an odometer, not a lie.)

---

## What it is

A **subject-scoped, monotonic, authored** set of counters over countable
acts, plus an aggregate:

- **Specific counters** (the primary thing) — clean, homogeneous, authored
  counts of one act-type each: *contracts completed*, *fights won*, *leagues
  travelled*, *drinks mixed*, *deeds witnessed*. Each is **specific** (means
  exactly one thing) and **authored** (the author declares what fires it and
  its weight) — the "specific authored dimension" the honest stack was
  missing. It is a **primary** signal, not a derived aggregation of
  heterogeneous dimensions (that mush is what dissatisfies).
- **An aggregate headline** — a "journey total" (weighted sum of acts) for
  the single-number-go-up hit. Honest because it's *total acts*, not *total
  power*.

## The bright line — downstream-inert

**The odometer never feeds capability or power.** Read-only; you cannot spend
it; it is not a competence input; it gates nothing mechanical. Capability
lives permanently in the derived dimensions, forever separate.

**Litmus test:** *does the number feed back into capability?* XP: yes.
Odometer: **no.** The instant someone proposes "spend odometer points to
unlock a skill," it has become XP and the honesty is lost. Hold this line.

## Why this dissolves the balance problem

"How would you balance it?" — **there is nothing to balance, because it has
no mechanical power.** Balance anxiety comes from the number *doing*
something (a big number = stronger = must be tuned or exploited). A number
that only *displays* cannot be overpowered. The author just picks weights (a
contract worth more bumps than a single gambit); "wrong" weights only make
the number climb faster or slower — a **cosmetic pacing choice, not an
exploit.** Removing the power removes the balance problem.

## Why a powerless counter is engaging (not a consolation prize)

Steam playtime, achievement counts, fitness-tracker lifetime steps, word-
count tools, streak counters, idle games — among the *stickiest* mechanics
in existence, and **none of them do anything.** Nobody thinks their
step-count *is* their fitness, but watching it climb is deeply satisfying
*because* it's honest effort made visible. Powerless isn't the weak version
of XP — it's the **actual source** of XP's good feeling, extracted from the
lie.

## Milestones — the anticipation pull, without power creep

Layer **milestones/achievements** on the counters (100 contracts → a title /
badge / recognition). That's the "so close to the next one" hook — but the
reward is **identity / recognition**, never capability. Milestones tie into
[belief.md](../../subsystems/belief.md): a title is a belief fact others
*see* when they look at you. Modern achievement design (titles, cosmetics) —
milestone dopamine, zero power creep.

## Nearly free — a readout over ledgers we already keep

We already keep append-only ledgers of every act (the chronicle,
`participation_events`, `renown_events`, producer events, the contract log).
**The odometer is the *lifetime count* over those, surfaced as a growing
number** — "your deeds, counted." It's the **monotonic sibling of
participation**: participation reads a *decayed* window over the same events;
the odometer reads the *un-decayed lifetime*. Minimal new substrate — mostly
a projection + the authored counter/weight/milestone definitions.

## Subject-scoping — personal, party, and beyond

Keyed on a **subject** (`templatePath`), the renown/chronicle pattern. A
character is a subject; a party is a subject; a guild/corp could be later.
So **personal and party odometers are one mechanic at two cardinalities.**
Crediting uses the same "every subject banks its own" rule: a contract done
*as a party* **double-bumps** the party odometer *and* each participating
member's personal odometer (different subjects, same event, no
double-spend — there's nothing to spend).

## Personal vs. social framing

**Personal by default** — *your* journey (personal progress, no leaderboard)
gives the dopamine without the toxic-comparison / grind-to-top-the-board
dynamic. Optional social visibility is framed as **history, not ranking** (a
party's odometer is public like its reputation — "we've been through 47
contracts together" — but it's shared history, not a scoreboard). A true
leaderboard drives more engagement but invites grinding + status toxicity;
kept out of the default.

---

## Settled decisions

1. **Odometer = the honest half of XP** (the journey tally), split from the
   capability-input (which is discarded).
2. **Downstream-inert** — read-only, never spent, never a capability gate.
   The bright line.
3. **Specific authored counters (primary) + an aggregate headline** — not a
   derived aggregation of heterogeneous dimensions.
4. **Subject-scoped** — personal *and* party (and beyond); double-attribution
   via "every subject banks its own."
5. **Monotonic** — never regresses (the sibling contrast with decay-based
   participation).
6. **Milestones reward recognition/identity, never power.**
7. **Personal by default; social framing is history, not a leaderboard.**

## Open questions

1. **Counter/weight authoring surface** — how authors declare countable acts
   and weights (a table? per-verb metadata? riding the existing event
   ledgers' tags?).
2. **Which ledgers back which counters** — the projection map from existing
   event streams to odometer counters.
3. **Milestone catalog + rewards** — the title/badge vocabulary and how it
   plugs into belief/recognition.
4. **Aggregate weighting** — is the journey-total a flat sum, or normalized
   so no single grindable act dominates?
5. **Does participation share the substrate** — is the odometer literally the
   un-decayed read of `participation_events` (+ other ledgers), or its own
   counter store?

## What this slate does NOT cover

- **Capability / power** — owned by advancement (competence), renown,
  standing. The odometer must never become an input to any of them.
- **Reputation** — a *standing* (what others think), slow and derived; the
  odometer is a *tally* (what you did), fast and monotonic. Siblings on the
  same subject, different meanings.
- **The party system** — owned by [party-slate.md](./party-slate.md); the
  party is merely one subject here.

## Once shaped into formal requirements

1. A **subject-keyed counter store** (or a projection over existing ledgers)
   holding per-subject specific counters + an aggregate journey total,
   **monotonic**, **downstream-inert**.
2. The **authored counter/weight** definitions (what acts count, how much).
3. **Milestones** → recognition/title rewards via belief; no power.
4. **Double-attribution** on party-scoped acts (party + members).
5. A **read surface** — the character/party dashboard (the `score`/`me` +
   party-sheet precedent) showing counters + total + milestones, personal by
   default.

Tests gating: an act bumps the actor's counters + aggregate and never
decreases; the same act done as a party double-bumps party + member
odometers; a milestone fires a recognition/title (not a stat change); the
number is unspendable and gates nothing; personal odometers are private by
default while a party's is visible-as-history.
