# Notification slate (working doc)

> **Status: design proposed, nothing built.** The one substrate that
> answers *"what happened to the things I care about while I was away."*
> Surfaced by the [wiki](../tails/wiki-slate.md), which needs watchlists and
> must not grow an inbox of its own — but the wiki is far from the only
> claimant, and building it per-subsystem would give us five inboxes.

---

## The gap

Four things look adjacent and none of them is this:

| | why not |
|---|---|
| `NotifyPolicy` / the `notify` verb | attention rules keyed on a **group ref** — a *who* axis. This is a *what* axis. |
| MQL subscriptions | live reactive cards, per-`Interactive`, torn down on disconnect |
| forum subscriptions | same shape, same teardown |
| `Bulletin` | staff→everyone broadcast; not per-user, not subject-keyed |
| the `*_events` ledgers | durable **records**, with no delivery |

The live pipeline (`Sensor` / `MessageApi`) delivers what you are
**present for**. Everything above is either present-tense or
everybody-tense. Nothing is *absent*-tense.

**Claimants, today:** a gig accepted or its escrow released; a
consignment sold; a crop ready or a bed gone dry; a lease expiring; a
reply to your post; a wiki page you watch changing; an office you hold
being reassigned; a bank balance crossing a threshold. Each of these
would otherwise invent its own.

---

## Principles

1. **Absent-tense, not present-tense.** If the player is there, the
   Sensor pipeline already handled it. This is for what they missed.
2. **The substrate delivers; subsystems emit.** A producer supplies a
   typed event and nothing else — no prose, no routing, no read-state.
3. ⭐ **Not a second message bus.** See below; this is the constraint
   that most needs defending.
4. **Derive on read.** No fan-out writes. The house pattern (renown,
   participation, competence).
5. **Client-agnostic.** A major client rewrite is expected; the substrate
   must not assume a card, a ticker, or a widget. It answers queries.

---

## ⭐ Not a second message bus

The failure mode this design exists to avoid: notifications become a way
to put arbitrary text in front of a player, bypassing the Sensor
pipeline's consent, spoiler, and display-lensing rules. Every
notification system drifts this way, because "just send them a message"
is always the shortest path.

So: **an event is typed and structured, and its prose is composed by the
substrate from a template the substrate owns.** A producer supplies
`{ kind, subject, actor, data }` — never a rendered string.

Consequences worth stating plainly:

- A producer **cannot** address a specific player. It emits about a
  *subject*; who hears it is the subscription's business.
- A producer **cannot** phrase anything. Adding a new notification kind
  means adding a template, which is a reviewable act.
- Therefore notification can never be used for harassment, spam, or an
  end-run around `dm`/`tell` — there is no channel for free text.

---

## The event

```
NotificationEvent {
  kind:     string      // 'wiki.published', 'contract.accepted', …
  subject:  string      // path-shaped; the routing key
  actor:    string|null // who caused it (durable path), or null
  at:       number
  level:    0..3        // spoiler level of the FACT of this event
  data:     {…}         // structured; the template's inputs
}
```

**`subject` is path-shaped on purpose.** `/lib/material/oak`,
`wiki/page/oak`, `contract/7fQ…`, `parcel/world/terminus/…`. Paths give
the routing index below for free, and they already are how this codebase
names things.

Append-only, TTL-rotated (the `diagnostics` precedent). The event log is
also the **activity feed** — same store, different query.

---

## The subscription

```
Subscription {
  subscriber: string    // durable player path
  selector:   string    // a subject path, or a prefix
  scope:      'exact' | 'subtree'
  mute:       boolean
}
```

⭐ **Routing is a `PathTrie`**, which already ships and is already used
for parcel coverage and the address registry. Subjects are paths, so:

- `exact` — watching one page;
- `subtree` — watching a namespace, a content branch, everything under a
  parcel;
- and `longestPrefix` gives "the most specific rule that applies", which
  is how a mute on one page can override a subtree watch.

No new index type, no scan-all-subscriptions on emit.

**The interesting selector is a template path.** Watching
`/lib/material/oak` catches both the wiki article about oak *and* a
change to oak itself — because both name the same subject. Subject-keyed
routing makes that free, where a wiki-owned watchlist could never have
reached the second one.

---

## Delivery: derive on read

**No fan-out.** One event row, however many subscribers. A subscriber's
inbox is a query: *events matching my selectors, since my cursor,
ordered by time.*

This is the house pattern and it avoids write amplification — a change
to a heavily-watched page writes once, not once per watcher.

**Read state is a cursor per subscription** (`lastReadAt`), plus a small
set of explicitly dismissed event ids for "I read that one but not the
others". A cursor alone is cheap and wrong at the margins; a per-item
read table is correct and expensive. The pair is the honest middle.

---

## Coalescing and digest

A chatty producer must not produce a chatty inbox. Because delivery is
derive-on-read, both are **read-side** concerns and need no writer
cooperation:

- **Coalesce** by `(subject, kind)` within a window — six edits to one
  page in an hour is one line saying six.
- **Digest** by cadence — the same query with a coarser grouping.

A producer that emits per-keystroke is still wrong, so a per-`(subject,
kind)` emit floor belongs on the write side as a guard.

---

## ⚠ Notification is a spoiler surface at BOTH ends

Easy to get half-right.

- **Subscribe-time.** You must not be able to watch a subject you cannot
  see. "Oak's article changed" tells you an oak article exists.
  Subscription creation is capability-checked.
- **Deliver-time.** Capability changes. The check is re-applied on read,
  so a subscription made legitimately does not keep paying out after the
  reader's standing changes.
- **The event's own level** is the level of *the fact that it happened*,
  which is not the level of the thing that happened. A level-0 page can
  have a level-3 edit; the event is level 3.

Above the ceiling, an event is **absent** — never "1 hidden update",
which is the leak in miniature.

---

## Relationship to `NotifyPolicy`

They are not the same axis and should not be merged:

- `NotifyPolicy` answers *how does this person render to me, and do their
  comings and goings reach me* — a **who** axis, evaluated in the live
  pipeline, and partly a display-lensing concern.
- This answers *what happened to the things I named* — a **what** axis,
  evaluated on read, about absence.

They should **share the delivery-preference vocabulary** so a player
meets one set of words, and stay separate stores. Folding watchlists into
`NotifyPolicy` would bend presence-rendering into an inbox; folding
presence into this would make every login a durable event.

> Open question: whether the two eventually present as one verb with two
> faces, the way `wiki` and `chat` carry subcommands.

---

## Producers

A producer emits and forgets. The registration surface is one call; the
event kinds are a vocabulary with one template each.

⚠ **The Api question is deferred.** The Api layer is being reorganised
before go-live, so this slate deliberately does not name a `NotifyApi`.
The *shape* is what matters here: producers emit typed events, and the
delivery surface is queried. Where that lands is the reorg's business.

---

## Open questions

1. **Read-state granularity** — cursor-plus-dismissals (proposed) vs a
   full per-item read table. The proposal is a deliberate compromise.
2. **Cross-device read state** — one cursor per subscriber, or per
   Interactive? One per subscriber, presumably; multiplexed sessions are
   already a shipped concept.
3. **Push vs pull for online players.** Derive-on-read is the model, but
   an online player probably wants a nudge. Reuse the reactive
   subscription machinery, or poll?
4. **Retention window** — how long before an unread notification is
   simply gone.
5. **Digest delivery outside the game** — email is a whole other consent
   and deliverability problem. Almost certainly not.
6. **Do NPCs subscribe?** A shopkeeper watching their consignments is a
   real behaviour and would ride the same substrate.

---

## What this slate does NOT cover

- **The live message pipeline** — `Sensor` / `MessageApi` owns
  present-tense delivery and is unaffected.
- **Broadcast** — `Bulletin` stays what it is; a staff announcement is
  not a subscription.
- **The `*_events` ledgers** — they remain each subsystem's system of
  record. Emitting a notification is not the same act as writing to a
  ledger, and merging them would couple an audit trail to a UX concern.

---

## Cross-references

- [wiki-slate.md](../tails/wiki-slate.md) + `docs/requirements/wiki-requirements.md`
  — the first claimant; emits, consumes nothing
- [social-graph.md](../../subsystems/social-graph.md) — `NotifyPolicy`,
  the *who* axis
- [press.md](../../subsystems/press.md) — broadcast *(`bulletin.md` was
  rewritten as `press.md`, not renamed)*
- [mql-subscription.md](../../subsystems/mql-subscription.md) — the
  session-live reactive machinery a push path might reuse
- [forums.md](../../subsystems/forums.md) — `forum_events` and a
  session-scoped subscription surface that could migrate here
- [contract.md](../../subsystems/contract.md),
  [retail.md](../../subsystems/retail.md),
  [husbandry.md](../../subsystems/husbandry.md) — claimants
