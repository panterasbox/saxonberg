# Spoilers & secrets slate (working doc)

> **Status: deliberately light — best-effort, not a security boundary.**
> Keeping players from being spoiled (a puzzle solution, a hidden room's
> contents, a quest twist, an NPC's secret) — by **imposition** (the game
> withholds it to preserve the experience) or by **choice** (the player
> opts out of seeing it). The game is open source, so a determined person
> can always self-spoil from the repo; we make a *reasonable effort* for
> normal play, and don't over-build a hardened thing. Assessment
> integrity is a *separate, deeper* problem (below) — not solved here.

Working slate for **spoiler / secret protection** — the perception-side
sibling of content authoring. Both are facets of one shape (*what can a
subject do/see/author, under what circumstances* — see the access
slate); this one is **see/know**.

The load-bearing decisions:

1. **Best-effort, not security.** Open source means hiding can always be
   circumvented by reading the repo. So this protects the *normal play
   experience* against *casual* spoiling — not against a determined
   source-reader. Scope it light; don't pretend it's a boundary.

2. **It's the percept model, extended.** A fact is perceived only when
   its **revelation condition** is met (senses slate). Spoiler protection
   just adds new *kinds* of revelation condition: **progress / integrity
   gates** (revealed when *earned* — puzzle solved, quest done — or when
   your *role* permits) on top of the existing sense/skill conditions.

3. **Gate the fact, not the verb.** The protection lives on the *fact's
   revelation condition*, enforced **server-side** (the server doesn't
   *send* an unrevealed fact). So you can't `analyze`/inspect/"pull up the
   code" your way past it in-game — the data simply isn't on your client.
   The open-source repo is the acknowledged limit, not an in-game one.

4. **Imposition *and* choice.**
   - **Imposed** (integrity/progress): mandatory, role/progress-
     conditioned — revealed only when earned or your role permits.
   - **Opt-in** (choice): a player who *could* see something asks not to
     ("don't spoil endings/solutions") — a self-applied guard; even an
     author wanting to experience content fresh.

See also:

- [docs/slates/senses-slate.md](../tails/senses-slate.md) — the **percept
  revelation-condition** model this extends (sense/skill conditions +
  now progress/integrity).
- [docs/slates/access-slate.md](../tails/access-slate.md) — the unifying shape
  (do/see/write × circumstances); spoiler is access on **see/know**, at
  **best-effort** rigor (vs hard for do/write).
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — server-
  side fact-gating = don't *send* the unrevealed fact (the Scene/percept
  projection withholds it).
- [docs/subsystems/card-surface.md](../../subsystems/card-surface.md) —
  the card shows percepts; spoiler-gated facts simply aren't in the
  projection.
- the **quest/progress system** (consumed — supplies the "have you earned
  it?" reveal condition) and the future **assessment/education-vertical**
  system (owns assessment integrity — *not* this slate).
- [docs/design-philosophy.md](../../design-philosophy.md) — pragmatic best-
  effort; liberal diegesis (secrets are in-fiction).

---

## Principle

1. **Best-effort, not security** (open source; protect normal play).
2. **Extends the percept revelation-conditions** (add progress/integrity
   gates).
3. **Gate the fact server-side** (don't send it), not the verb.
4. **Imposed (integrity/progress) + opt-in (player choice).**

---

## The model

### Content marks secrets + their reveal condition

Authored content tags a fact/object/detail as **secret**, with a
**reveal condition** — e.g. *after the puzzle is solved*, *after the
quest stage*, *only the teacher role*, *never to students*. The condition
is just a richer member of the percept model's revelation-condition
family: instead of "revealed if you have the sense," it's "revealed if
you've *earned* it / your role permits."

### Server-side fact-gating (the enforcement)

When the server projects what a viewer perceives (the percept / the
inspection-card projection / a `look`/`analyze`), it **omits secret facts
whose reveal condition isn't met for that viewer.** The unrevealed fact
never crosses the wire, so no in-game inspection surfaces it. This is the
whole "effort" — cheap, and it defeats the realistic (casual, in-game)
threat. It does *not* defeat reading the open-source content; that's
accepted.

### The player choice-guard (opt-in)

A per-player setting ("don't spoil endings/solutions/secrets for me")
that *further* withholds revealable-but-spoilery facts the player *could*
see. Self-applied; toggle-able. Useful even for authors/admins (who can
otherwise see internals) wanting a fresh experience.

### Role-conditioned reveals

Reveal conditions can key on role (the access circumstance): a **teacher
sees the answer key; a student doesn't**; an author sees internals a
player doesn't. So spoiler-gates compose with the access tiers.

---

## Assessment integrity — flagged, *not solved here*

The one place "best-effort + open source" is genuinely **insufficient**:
if grades matter and the answer key lives in public content, a student
can read the repo to cheat. Hiding it harder is futile. The real answer
is **assessment design**, and it belongs to the **assessment / education-
vertical system**, not this slate:

- **don't store answers** in client-reachable *or* public-repo content;
- **grade server-side** (submit → the server checks against a private/
  generated key the client never sees);
- and/or design **open-book / applied / process-graded** assessments that
  don't depend on a secret answer.

This slate handles *experience* spoilers (best-effort fact-gating);
assessment integrity is a deeper, separate problem with a different
answer. Flagged so it isn't mistaken for something the spoiler system
delivers.

---

## What this reveals / needs

- **Progress/integrity reveal-conditions** — the percept model's
  revelation-condition family, extended with earned/role gates.
- **The secret tag + reveal-condition** on content (authoring marks what's
  secret and when it opens).
- **The player choice-guard** — a setting (EnvironmentMixin keyspace).
- **(Separate)** the assessment-integrity problem → the future
  assessment/education-vertical system.

Reuses: the **percept model** (revelation-conditions), **messaging/Scene**
(fact-gating = don't send), **access** (role-conditioned reveals; the
circumstance shape), **quest/progress** state (the earned condition).

---

## Open questions / forks

1. **Best-effort, accepted as defeatable?** *Confirmed* — protect normal
   play; don't harden against source-reading.
2. **Secret/reveal-condition content model** — how content tags secrets +
   expresses conditions (progress flag, quest stage, role). *Lean: a
   reveal-condition that plugs into the percept revelation-condition
   family.*
3. **Choice-guard granularity** — one global "no spoilers," or per-
   category (endings / solutions / contents)? *Lean: start global, add
   categories if wanted.*
4. **Admin/author handling** — they can inspect internals (power), so
   imposed gates may not bind them; they can opt into the guard.
   Integrity gates are **role-conditioned** (students gated, teachers
   not). Confirm at requirements.
5. **Assessment integrity** — *deferred to the assessment system*; this
   slate explicitly does not solve it.

---

## Build order

**Wave 1 — the light fact-gate.** The secret tag + reveal-condition on
content (plugged into the percept revelation-condition family); server-
side fact-gating in the percept/Scene projection (omit unrevealed secret
facts per viewer); the per-player choice-guard setting.

**Wave 2 — richer conditions + categories.** Role-conditioned reveals
(teacher/student); progress/quest-stage conditions; per-category
choice-guard.

**(Separate track) assessment integrity** — owned by the assessment/
education-vertical system (server-side grading, private keys, assessment
design). Not part of this slate's build.

---

## What this slate does NOT cover

- **A hardened/security spoiler boundary** — it's best-effort; open source
  is the limit.
- **Assessment integrity** — a deeper, separate assessment-system problem
  (server-side grading + assessment design), flagged not solved.
- **The percept substrate** — reused from the senses slate; this extends
  its revelation-conditions.
- **Authoring** (the *write* side of the shape) — scoped-authoring slate.
- **The quest/progress system** — consumed for reveal conditions, not
  defined here.

---

## Once shaped into formal requirements

This slate boils down to:

- **Best-effort, server-side fact-gating**: omit unrevealed secret facts
  from a viewer's percept/projection, so in-game inspection can't surface
  them (open-source repo is the accepted limit).
- **Reveal conditions** as an extension of the percept revelation-
  condition family: progress/earned, quest-stage, role-conditioned.
- The **player choice-guard** (opt-in self-withholding), per-player.
- **Assessment integrity flagged as separate** (assessment-system:
  server-side grading + don't-publish-answers + assessment design).
- Tests: a secret fact isn't sent to a viewer whose reveal condition
  isn't met (and `analyze`/inspect can't surface it); the condition opens
  the fact when earned/role-permitted; the choice-guard withholds
  revealable spoilers; the system makes no claim against source-reading.

Role/progress condition depth, per-category guards, and the entire
assessment-integrity problem wait for later work / the assessment system.
