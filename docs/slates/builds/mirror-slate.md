# Mirror slate — the game state that stays in parity with your life

> **Status: design captured 2026-07-31, not built. Deliberately further out
> than anything else in `builds/`.** The thesis: a player's in-game state can
> be held in **parity with their real state**, so that acting in the world
> earns in the game. The exemplar is the room everybody already has —
> **instrument your real bedroom, and your game bedroom keeps parity with
> it.** Make the bed, and the bed is made.
>
> This is the [gamification mirror thesis](../../vision.md) taken literally:
> not a game *about* a life, but **real-unit models of real life** with the
> loop closed at both ends. The platform already models the real units —
> money, labor, standing, competence, property, condition. What it does not
> yet have is an **inbound** channel from the world it models.
>
> **Why it is not absurd, and why it is not now.** It would not work today:
> the home is not instrumented densely enough, and a thin signal is a signal
> worth faking. It becomes tractable as automation penetrates the home,
> because the answer to the cheating problem is **density, not verification**
> (below). That is the bet, and it is a real-futurism bet — captured so the
> substrate stops foreclosing it, not because it is next.

See also: [property-slate](./property-slate.md) (the home as owned ground) ·
[stewardship-slate](./stewardship-slate.md) (**condition** — the in-game
quantity a parity feed would most naturally drive) · the **furnishing**
build ([requirements](../../requirements/furnishing-requirements.md), D7 —
which pays this slate's only forward-compatibility cost) ·
the **enforcement** design (**the evidence firewall** and
testimony-as-claims — the closest prior art for untrusted assertions;
unwritten, below) · the **practicum** thesis (applied hours — the education
product this most directly serves; unwritten, below) · substrates:
[provenance.md](../../subsystems/provenance.md) (receipts) ·
[advancement.md](../../subsystems/advancement.md) (Disciplines, derive-on-read
competence) · [chronicle.md](../../subsystems/chronicle.md) (deed vs claim) ·
[accountability.md](../../subsystems/accountability.md) ·
[residence.md](../../subsystems/residence.md).

**Unwritten siblings — a real gap.** Four designs this slate leans on exist
only in session memory and have **no file in the corpus**:

- **Instrumentation** — sensing rides **instruments**, never the aether
  (aether = modem, not sense organ; textbook vs. lab); three gates of
  capability / competence / calibration; mounts sited by anatomy. This is the
  in-fiction half of the mirror's mechanism and the most load-bearing of the
  four; it should be captured before either is built.
- **Enforcement** — the evidence firewall (kernel omniscience is never
  diegetic evidence), testimony as *claims* not queries, and the
  INTRINSIC/SOCIAL split. The nearest prior art for admitting untrusted
  assertions, cited twice below.
- **Practicum** — applied hours; the model-as-syllabus education thesis the
  mirror most directly serves.
- **Bathroom** — the toilet paradox (presence, not function), the LOD ladder,
  washing as enabling. Relevant to any second instrumented room.

Cited by name rather than by link throughout, so nothing here dangles.

## The thesis

Everything in this world derives on read, from acts the kernel witnessed.
That is what makes standing un-fakeable: a disputed fortune has a ledger, and
competence is the shape of a transcript rather than a number someone set.

The mirror asks whether the **kernel's witness can extend past the client**.
If a real kitchen reports that a meal was cooked, and the game already models
cooking in real units — ingredients, heat, time, a `Grade`, a `horticulture`
or cooking Discipline that accrues from the act — then there is no modelling
gap to bridge. The game does not need a new "real life mode." It needs an
inbound event with the same shape as the ones it already trusts.

Three claims follow, and they are the slate's spine:

1. **The units already match.** The platform models labor, condition,
   maintenance, nutrition, skill acquisition and property in real units by
   design. A parity feed is not a translation layer; it is the same event
   arriving from a different witness.
2. **The reward is the existing economy.** No parallel currency, no
   achievement layer. Real acts accrue the same Disciplines, the same
   participation, the same standing — because they *are* the same acts.
3. **The pedagogy runs both ways.** The game teaches stewardship by
   simulating it; the mirror lets the simulation be *checked* against the
   thing it teaches. That is the practicum thesis with the loop closed.

## The cheating problem, and the answer

Rewarding in-game for real-world action inverts the platform's anti-cheat
posture. Every other signal is something the kernel saw; a sensor feed is an
**assertion from outside** that the kernel cannot witness and cannot audit.
The moment a clean bedroom pays out, the cheapest path to the reward is
faking the signal, not cleaning the room.

**The answer is density, not verification.** Do not try to make one sensor
trustworthy — that is a losing arms race, and it is the mistake every
step-counter reward scheme makes. Instead make the signal *broad and
mutually constraining*, so that producing a coherent false life costs more
than living the real one. A faked tidiness reading contradicts the door
sensor, the power draw, the grocery ledger, the sleep record. At sufficient
density, **to game it is to actually live the thing you are gaming** — which
is not a defense against cheating so much as a dissolution of the category.

This is the same move the platform already makes everywhere else: nothing is
trusted because it was stamped once; everything derives on read from many
events. The mirror widens the aperture without changing the rule.

**What follows for design:** breadth is a prerequisite, not a polish item. A
single-sensor mirror should not ship, because a single-sensor mirror is a
cheat surface with a reward attached. The correct minimum is a *domain* dense
enough to be self-constraining.

## The bedroom, as the exemplar

Everyone has one, which is why it is the right first room. It is also the
densest cheap domain in the house: occupancy, sleep timing and duration,
light, temperature, tidiness, whether the bed is made, whether the window is
open, when the sheets were last changed. Several of those are already
instrumented in ordinary homes for unrelated reasons.

And it lands on in-game quantities that will exist anyway: **condition**
(stewardship), rest and vitals (shipped), the `Stewardship` Discipline
(stewardship slate), and the residence itself (the furnishing build). The
mirror does not need new nouns here — it needs the inbound channel.

## What the platform already has

- **Receipts and provenance** — every act is attributable; `authoring_events`
  and the ledgers are the audit surface a parity claim would have to join.
- **Derive-on-read everywhere** — standings, competence, traits and renown
  are computed from event logs, never stamped. An inbound feed appends
  events; it does not set values. This is the single most important existing
  property, and the mirror must not break it.
- **Deed vs. claim** ([chronicle.md](../../subsystems/chronicle.md)) — the
  corpus already distinguishes *a thing that happened* from *a thing someone
  says happened*. A parity reading is structurally a **claim** until
  corroborated, and the chronicle's existing split is the right home for
  that distinction rather than a new one.
- **The evidence firewall** (the unwritten enforcement design) — kernel
  omniscience is never diegetic evidence, and testimony is claims not
  queries. The mirror is the mirror-image problem (outside assertions rather
  than inside omniscience) and should reuse the vocabulary.
- **Room-level state** — the furnishing build's D7 establishes that a room
  carries declared fields of its own rather than only contents, which is the
  one seam a parity feed needs to exist. **That is already paid for.**

## Open questions

- **What is admissible.** Which real signals may drive which in-game
  quantities, and which are categorically inadmissible? The enforcement
  enforcement design's INTRINSIC/SOCIAL split is the nearest precedent:
  traits, alignment
  and competence are kernel-authoritative, private, and never
  admissible as evidence. Does a real-world reading get the same firewall — informing
  *condition* but never *character*?
- **Claim, corroboration, and decay.** If a reading is a claim, what
  corroborates it, and what does an uncorroborated claim earn — nothing, or
  something provisional that decays? The chronicle's deed/claim split gives
  the vocabulary but not the policy.
- **The density threshold.** What is the minimum coherent domain? Stated as
  a principle above; unquantified. Getting this wrong in the permissive
  direction ships a cheat surface with a payout.
- **Privacy, and who holds the data.** This is the hardest one and it is not
  primarily technical. A bedroom sensor feed is among the most intimate data
  a person has. Does the platform ever *store* readings, or only accept
  derived assertions computed on the player's own hardware? The strong
  default — **the platform never sees the raw feed** — is worth taking
  seriously as an invariant rather than a setting, and it constrains the
  whole architecture if adopted.
- **Sensor silence.** What happens when the feed stops — a holiday, a broken
  device, a player who opts out? Parity that punishes absence is a treadmill
  and turns the product into an obligation. Leaning: **absence is neutral, and
  the mirror only ever adds**; the game must remain whole and complete for a
  player with no instrumentation at all. This is close to a first principle.
- **Opt-in and the two-tier world.** If instrumented players earn on a
  channel uninstrumented players cannot reach, the mirror is pay-to-win with
  extra steps — those sensors cost money. Does the mirror earn *different*
  things rather than *more* (recognition, not advantage)? This interacts with
  the capital-standing rule that funding buys a voice, never power.
- **Calibration and trust tiers.** The unwritten instrumentation design
  already proposed capability / competence / calibration gates for in-fiction
  instruments. Do real-world feeds carry the same three, so a
  better-calibrated sensor is a better witness — and is that a defensible
  ladder or a paywall?
- **What the in-fiction story is.** The player's character does not have a
  smart home; the player does. Is parity diegetic (an instrument the
  character owns), or explicitly out-of-fiction (a metagame channel, marked
  register)? The jargon standard says meta surfaces are *marked* — this is
  the same decision, and it decides how the feature is presented.

## What this slate does NOT cover

- **The instrumentation substrate itself** — instruments, mounts, the three
  gates, the aether-is-a-modem rule. Its own (unwritten) slate; this one
  assumes it.
- **Condition** — what property condition *is*, how it degrades and what
  maintains it → [stewardship-slate](./stewardship-slate.md). The mirror is a
  possible *driver* of condition, never its definition.
- **The furnishable residence** — rooms, archetypes, owner-based
  persistence → the furnishing build, in flight. The mirror consumes its D7
  room-level-state seam and asks nothing else of it.
- **Hardware, protocols, integrations.** Which sensors, which standards, what
  the ingest looks like. Premature until the admissibility and privacy
  questions above are answered, because those decide whether raw data ever
  crosses the boundary at all.
- **The education product framing** — applied hours, the syllabus-as-model
  thesis → the practicum (unwritten). The mirror is one input to it, not its
  shape.
