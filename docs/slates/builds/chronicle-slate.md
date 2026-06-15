# Chronicle (narrative record) slate

> **Status: SHIPPED 2026-06-14 — substrate graduated to
> [../../subsystems/chronicle.md](../../subsystems/chronicle.md).** The
> dumb append-only ledger (`ChronicleEntry` + `ChronicleApi`), the
> `chronicle` self-view verb, char-gen claim-seeding, and three demo
> minters landed; every identity readout (recognition / reputation /
> alignment / traits / achievements) remains a deferred consumer.
>
> **Status: UNBLOCKED 2026-06-14 — requirements-ready; the identity
> substrate, decoupled from advancement.** Earlier framing ("deferred
> until advancement") is overturned: the gate on *what's worth
> chronicling* is **identity-impact, not advancement-reward** (an event
> earns an entry iff it changes *who you are* — recognized / regarded /
> aligned / trait-counting / affiliated / story-worth-telling — **not** iff
> it grants a level). Advancement is just *one more future readout*, not a
> prerequisite, so the dependency dissolves. **Chronicle is a *dumb*
> append-only ledger** (the belief-store precedent — dumb store, smart
> consumers); its readouts (recognition / reputation / alignment / traits /
> later advancement) are already designed enough to fix its shape. Build it
> *first* as the foundation the identity stack reads. **Re-categorized as
> platform identity-substrate (not RPG game-design) → graduates to
> `builds/` at requirements time.** Next step: `/requirements`.
>
> **Renamed 2026-06-14** from "breadcrumb" — that metaphor implied a trail
> retraced *back to a source*, but this is an **accumulating record of
> narrative events** read *forward*, and the term collided with the
> cockpit's location/focus breadcrumb. The aggregate is a character's
> **chronicle**; the atoms are **deeds** (witnessed) and **claims**
> (claimed).

A character's **chronicle** is the accumulating record of their narrative
events. Each entry is a minted, structured atom that *something happened*
— rendering to a human-readable line. Three systems read the chronicle as
the common root (alignment / reputation / traits — below). It is **not**
the cockpit's location/focus breadcrumb (different layer, different
package — and the reason this got renamed).

## The core idea

One currency unifies **backstory and story**, distinguished only by
provenance — which gives the two atom kinds their names:

- **claim** (seed, claimed) — selected at char-gen (the origin menu). The
  bracketed, unverifiable prologue — which is exactly what backstory
  always was.
- **deed** (earned, witnessed) — minted involuntarily by real events
  during play. True by construction.

This dissolves three problems at once:
- **Lying** — deeds can't be faked; the only fiction is the claim, and
  everyone knows a claim is a claim. (Claim-vs-deed even becomes a
  *feature* — an NPC can trust your deeds and doubt your claims.)
- **Maintenance** — entries accrue on their own; zero upkeep. (The
  editable prose **bio** is a *separate* field — the claimed voice over
  the facts; see the char-gen subsystem, the deferred `records` command.)
- **Vestige** — the claims recede under earned history *by design*; the
  day-one fiction is meant to shrink to a prologue, and it does.

## The prototype already exists

**Gus's crossing-log** is a primitive, single-purpose deed minter (an
anonymous dated mark per crossing). Generalize "Gus marks the log when you
cross" → "the world **chronicles** *you* when something worthy happens."
Your **first deed** is literally the Gus crossing. (Content surfaced the
platform need — same as the watch surfacing world-clock.)

## Entry shape (sketch)

```
{ kind: "claim" | "deed",        // claimed | witnessed
  when:  <calendar timestamp>,   // ONLY for deeds — see below
  where: <place> | null,
  who:   [<entity refs>],        // enables NPC reaction
  text:  <rendered narrative line>,
  tags:  [<query / reaction hooks>] }
```

- **The timestamp is the witness.** Dated = a deed (the clock saw it);
  **undated = a claim** (memory, not record — no clock was running on you
  before you arrived; rhymes with the world-clock's own rate + Gus's wrong
  watch). Do *not* fabricate calendar dates for claims — the difficulty of
  estimating past dates is the tell that you shouldn't.
- Claims instead carry **fuzzy narrative age** (in the prose) + **authored
  order** (prologue order).
- **Display partitions, never interleaves:** a **prologue** (claims,
  undated, authored order) then a **timeline** (deeds, dated). A person
  reads as their **bio** (voice) over a **featured chronicle** of these
  lines.
- A deed's `text` is generated from the event via **ProseApi**; a claim's
  `text` is authored prose. Entries are **queryable (MQL)** and
  **reactable** (`who` / `tags`).

## Open forks (for the deep pass)

- **What's worthy of a deed** — authored triggers + "firsts," probably;
  not every footstep (signal vs noise).
- **Permanence** — full chronicle forever vs. reaped tail; and a
  **featured / curated highlight-reel** selection (the "menu/curation"
  feel over real objects, honest because you emphasize true deeds, never
  invent).
- **Per-viewer rendering** — an entry reading differently to different
  viewers.
- **Relationship to advancement/gamification — RESOLVED 2026-06-14:
  decoupled.** Advancement does *read* the chronicle (quests gate on "has
  deed X"), but it is **not** a prerequisite — the gate on what to record
  is **identity-impact, not advancement-reward**. The chronicle is the
  **common root of readouts** (see
  [reputation-slate](../builds/reputation-slate.md) § "The chronicle
  root"): **alignment** (deeds → witnessed Law-axis stance), **reputation**
  (deeds refracted through witnesses/circles → esteem/notoriety), and
  **traits** (thresholded queries → named badges); a worshipped deity also
  *reads* it; **advancement is simply one more reader.** So the chronicle
  leads and the readouts (advancement included) follow — building it *first*
  is what unblocks reputation/alignment/traits, not the reverse.
- **Persistence shape** — append-only **Document**-track entries (plain
  data, not Stuff) per the persistence rethink.

## Adjacent

reactions · recognition · social-graph · events / mql-subscription ·
persistence · world-clock · char-gen (the origin seed) · the future
advancement layer.
