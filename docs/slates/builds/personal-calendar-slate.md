# Personal calendar — a player's red-letter dates, on the comms device they carry

> **Status: PARTIAL — thin slice SHIPPED (clinical-medicine, MR !290, 2026-09).**
> A player's own **dated events** ("red letter dates"), distinct from game-time
> (the world's clock). The **clinical-medicine build shipped the thin slice**:
> per-player dated entries (`CalendarMixin` on the aether implant), the medicine
> author seam (a follow-up date written on `operate`/suture), the `calendar`
> read, and ⚠ `assess` never leaking a future date
> ([calendar.md](../../subsystems/calendar.md)). This slate holds the full
> design still to build.
> **Left:** the full feature — recurring events, per-event reminders/snooze,
> shared/other-people's calendars, the **carried physical-device / paper
> alternative** (the RP manifestation), rich author tooling, and the
> write-authorisation rule (who may put a date on whose calendar).
> **Size:** a build (the thin slice rides clinical-medicine).

Captured out of the clinical-medicine requirements (2026-09-24): the
follow-up loop needs a patient to know "come back in two weeks", and the
honest home for that is not the wound (you can't read a prognosis off flesh)
and not a bespoke medical record — **it's a calendar.** People have always
kept one: paper you bought each year, now digital on your phone. Our players'
phone is the **aether implant**, so that is where v1 lives.

---

## The thesis

> ⭐⭐⭐⭐ **A player has a personal calendar of dated events on their comms
> device, and any content author can write a red-letter date to it. It is
> pure infrastructure — the persistence is trivial; the design is (1) how it
> MANIFESTS in the fiction and (2) the author-facing seam every future system
> writes through.**

Two things make this its own substrate, not a feature buried in whatever
needs it first:

1. **Everyone will write to it.** Medicine's aftercare is the first demand,
   but contract due-dates, festivals, employment shifts, election terms, loan
   maturities — all are red-letter dates. They must all write the same way, or
   we grow N bespoke reminder systems.
2. **The manifestation is a cross-cutting fiction decision** (below), and it
   is a contract with content authors, so it belongs in one place.

---

## What already exists (and what does not)

- **Game-time** — `WorldClockApi` / `CelestialApi`, the world's clock and
  calendar, read by the `time`/analyze surface. This is the world's dates, NOT
  a player's personal events. Do not conflate them.
- **The aether implant** — the comms device (`dm`/`tell`, chat). It carries
  thought-arriving messages; it has **no calendar surface** today.
- **The notify alarm** (recovery) — a one-shot push at a body transition
  ("fever broke"). Complements a calendar (see below), is not one.
- ⚠ **No personal calendar exists.** Confirmed greenfield 2026-09-24 (the
  only "appointment" in the tree is the employment "appoint-to-a-seat" sense
  and the attendant queue policy — neither is a dated event).

---

## What clinical-medicine seeds (the thin slice, first consumer)

Enough for the aftercare loop, and no more:

- **Per-player dated entries** — a calendar entry is `{ owner, whenGameDate,
  label, source }`. Persisted as **per-player state** (the self-persistence
  spine or the document tree) — ⚠ **no new Mongo collection** (the standing
  rule).
- **An author seam** — one call to add a red-letter date to a player's
  calendar (`CalendarApi.add(player, label, whenGameDate, source)` in spirit;
  the plan names it). Medicine writes `"remove stitches"` at the return date.
- **A read on the implant** — a `calendar` verb (and/or an implant widget)
  that lists your upcoming entries, filtered by date. This is the "place you
  access on demand."
- **A ping when due** — when a dated entry arrives, the player is notified
  (rides the existing notification channel).

The full feature below is deferred; the thin slice must leave those as clean
attach points, not stubs.

---

## The manifestation — decided for v1, with the fork recorded

⭐ **v1: the aether implant** (user, 2026-09-24). A digital calendar on the
comms device everyone already has — always with you, best quality-of-life,
and what a modern person's calendar *is*.

⚠ **The deferred RP alternative: a carried physical device / paper
appointment-card.** Better immersion and roleplay (a diegetic object you can
forget, lose, hand to someone), worse QoL. This is a real design choice on a
**QoL↔RP axis**, and it is an *epoch* marker too (paper calendar = low-tech,
implant = high-tech — the same mechanism, only the medium changes). v1 commits
to QoL (the implant); the carried/paper manifestation is this slate's to add
later, and a setting could even let a world choose.

---

## The author contract (why it is a substrate)

Every future writer of a red-letter date uses **one seam**, so the calendar
stays consistent and no system grows its own reminder store:

- **medicine** — aftercare / follow-up dates (first consumer).
- **contract** — clause deadlines, delivery dates.
- **employment** — shift reminders (the roster is the schedule; a personal
  ping is the calendar's).
- **banking / credit** — loan maturities, term ends.
- **governance / civics** — election dates, term expiries.
- **events / festivals / press** — realm-wide red-letter dates broadcast to
  many calendars.

⚠ **Write-authorisation is an open question** (below): letting anything write
to your calendar is a spam/consent vector.

---

## Lens pass (`docs/design-lenses.md`)

1. **Pedagogy** — time management and planning: a player who reads their
   calendar and prepares (the autarkist banking blood before a dated hunt)
   is exercising foresight the world rewards.
2. **Creative expression** — authors add dated content (festivals, deadlines)
   with no code, through the one seam; the ordinary case is a single call.
3. **Immersion & roleplay** — the implant calendar (QoL) vs the carried
   paper (RP) is the axis; a forgotten appointment is a story either way.
4. **Values & self-improvement** — keeping your commitments (you were told a
   date; do you show up?); and the write-authorisation question (who gets to
   put things on your calendar — consent).
5. **Technology & magic (epochs)** — paper → implant is a clean epoch marker;
   one mechanism, the medium changes.
6. **Economy & governance** — scheduling-as-a-service (a secretary/steward
   who manages a busy person's calendar?); shared org calendars later.

---

## Collisions

- **game-time** (`time.md`) — the world's calendar; the personal calendar
  reads game dates but is a different thing. Don't merge them.
- **the notify alarm** (recovery, `harm.md`/`vitals.md`) — ⭐ the likely
  division: the **calendar owns SCHEDULED reminders** (appointments — a date
  you were given), while the **notify alarm stays for SENSED state-changes**
  (fever broke, a wound festered — things a body notices). Medicine's return
  date → a calendar entry; a wound turning septic → a notify push. Settle this
  boundary here.
- **comms / the implant** (`comms.md`) — the v1 surface; a new capability on
  the implant.
- **client-shell** — a calendar widget is the client half.
- **clinical-medicine** — the first consumer; this slate must not contradict
  what that build seeds.

---

## Open questions (for its own requirements)

1. **Write-authorisation** — who may put a date on whose calendar? (Consent /
   trust / a filter, or a spam vector opens.) The load-bearing values question.
2. **Calendar vs notify boundary** — does the calendar own all scheduled
   reminders (and notify shrinks to sensed changes), or do they stay parallel?
3. **Recurring events / snooze / per-event reminders** — how much beyond a
   flat dated entry.
4. **Shared / others' calendars** — can you see an NPC's or an org's? A
   secretary managing another's?
5. **The carried-device manifestation** — is it ever built, and is it a
   world setting (paper world vs implant world)?
6. **Persistence home** — the self-persistence spine vs a document-tree
   calendar doc (both avoid a new collection); the plan picks.

---

## Cross-references

- [clinical-medicine-requirements](../../requirements/clinical-medicine-requirements.md)
  — the first consumer (aftercare dates).
- [comms.md](../../subsystems/comms.md) — the aether implant (the v1 surface).
- [time.md](../../subsystems/time.md) — game-time (distinct from this).
- [harm.md](../../subsystems/harm.md) / [vitals.md](../../subsystems/vitals.md)
  — the notify alarm this divides labour with.
- [contract.md](../../subsystems/contract.md) · [employment.md](../../subsystems/employment.md)
  · [banking.md](../../subsystems/banking.md) — future writers of red-letter dates.
- [design-lenses.md](../../design-lenses.md) — the lens pass above.
