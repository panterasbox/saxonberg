# Breadcrumb (narrative trace) slate

> **Status: concept captured — deep design DEFERRED until advancement.**
> Surfaced by char-gen's backstory choice (an origin = a *seed* set of
> breadcrumbs). The deep design is entangled with the advancement /
> gamification layer, so it waits for that. This file preserves the idea
> and the decisions already made; it is not yet a full design.

A **breadcrumb** is a minted, structured record that *something happened*
— a narrative atom that renders to a human-readable line. It is **not**
the cockpit's location/focus breadcrumb (different layer, different
package; the name reuse is deliberate and fine).

## The core idea

One currency unifies **backstory and story**, distinguished only by
provenance:

- **claimed** (seed) — selected at char-gen (the origin menu). The
  bracketed, unverifiable prologue — which is exactly what backstory
  always was.
- **witnessed** (earned) — minted involuntarily by real events during
  play. True by construction.

This dissolves three problems at once:
- **Lying** — witnessed traces can't be faked; the only fiction is the
  seed, and everyone knows a seed is a seed. (Claimed-vs-witnessed even
  becomes a *feature* — an NPC can trust one and doubt the other.)
- **Maintenance** — they accrue on their own; zero upkeep. (The editable
  prose **bio** is a *separate* field — the claimed voice over the facts;
  see char-gen-slate *Identity & the records command*.)
- **Vestige** — the seed recedes under earned history *by design*; the
  day-one fiction is meant to shrink to a prologue, and it does.

## The prototype already exists

**Gus's crossing-log** is a primitive, single-purpose breadcrumb minter
(an anonymous dated mark per crossing). Generalize "Gus marks the log when
you cross" → "the world marks *your* trail when something worthy happens."
Your **first earned breadcrumb** is literally the Gus crossing. (Content
surfaced the platform need — same as the watch surfacing world-clock.)

## Record shape (sketch)

```
{ kind: "claimed" | "witnessed",
  when:  <calendar timestamp>,   // ONLY for witnessed — see below
  where: <place> | null,
  who:   [<entity refs>],        // enables NPC reaction
  text:  <rendered narrative line>,
  tags:  [<query / reaction hooks>] }
```

- **The timestamp is the witness.** Dated = witnessed (the clock saw it);
  **undated = claimed** (memory, not record — no clock was running on you
  before you arrived; rhymes with the world-clock's own rate + Gus's wrong
  watch). Do *not* fabricate calendar dates for seeds — the difficulty of
  estimating past dates is the tell that you shouldn't.
- Seeds instead carry **fuzzy narrative age** (in the prose) + **authored
  order** (prologue order).
- **Display partitions, never interleaves:** a **prologue** (claimed,
  undated, authored order) then a **timeline** (witnessed, dated). A
  person reads as their **bio** (voice) over a **featured trail** of these
  lines.
- Earned `text` is generated from the event via **ProseApi**; seed `text`
  is authored prose. Records are **queryable (MQL)** and **reactable**
  (`who` / `tags`).

## Open forks (for the deep pass)

- **What's worthy of a trace** — authored triggers + "firsts," probably;
  not every footstep (signal vs noise).
- **Permanence** — full trail forever vs. reaped tail; and a **featured /
  curated highlight-reel** selection (the "menu/curation" feel over real
  objects, honest because you emphasize true traces, never invent).
- **Per-viewer rendering** — a trace reading differently to different
  viewers.
- **Relationship to advancement/gamification** — does advancement *read*
  breadcrumbs (quests gate on "has trace X")? **Alignment derives from
  breadcrumbs** (deeds → witnessed morality — see
  [alignment-religion-slate.md](./alignment-religion-slate.md)), and a
  worshipped deity *reads* them to react in character. This entanglement is
  what defers the deep design.
- **Persistence shape** — append-only **Document**-track records (plain
  data, not Stuff) per the persistence rethink.

## Adjacent

reactions · recognition · social-graph · events / mql-subscription ·
persistence · world-clock · char-gen (the origin seed) · the future
advancement layer.
