# The record layer — implementation plan

Wave **2.5** of the client rebuild: the server build that sits between
Arrival and the Play surface, so that waves 4, 6 and 7 are pure client
work. Seeded by [client-slate](../slates/builds/client-slate.md) § 7.2.

Its subject is one thing, which is why it is a build rather than a
grab-bag: **what the server remembers for you, and how you get it
back.** The per-player frame store, search over it and its neighbours,
and the reset policy that decides what survives the night.

> ✅ **The blocking decision is ANSWERED** (2026-08-14, by the user):
> the survivors list is **published press releases and nothing else**.
> See D6. This plan now runs as the server half of the combined
> play-surface build — see
> [play-surface-requirements](../requirements/play-surface-requirements.md).

---

## Grounding — facts established by investigation

### What exists

- `PromptApi.renderPromptRefresh` **already renders `prompt.format`
  server-side** into a `PromptRefreshNote`, reading
  `giver.getSetting('prompt.format')` with a bare `'{{ focus }}>'`
  default and falling through to it on render failure. The slate's
  *"`prompt.format` is not rendered client-side"* is a **client**
  observation. There is no server work here; it was in this build's
  scope by mistake and is recorded so it is not re-added.
- Chat channels and the press archive keep their **own** history.
  `forums` has the Subject layer; `wiki` has current state plus
  `wiki_revisions`.
- `search` is taken — it is the in-world perception verb. The slate
  reserves **`recall`** for the retrieval verb, and it is free.
- The append-only ledgers the client wants to read
  (`participation_events`, `renown_events`, `disposition_events`,
  `transcripts`, `authoring_events`) all exist.

### What does not

- **No general per-player frame store.** Ordinary world frames are
  retained for you nowhere, so the client buffer is *the only copy* —
  clearing site data destroys it, and a second device starts empty.
- **No wiki search and no forum search.** Neither `api/forums.ts` nor
  `api/subject.ts` exposes one.
- **No nightly wipe.** No cron, no CI job, no script — and three
  documents reason from one existing (client-slate § 3.1's box).

### ⚠ The pane catalogue is deliberately NOT in this build

`Panes.ts` states its own rule:

> *"This is a catalogue, not an enum of screens. Every entry is a pane
> the client actually opens. Adding a row is cheap; adding a row for a
> pane nobody opens is how a vocabulary ends up sized to a mockup rather
> than to the game."*

Pre-adding entries for the panes 23 mockups want is exactly that
failure. **Each row belongs to the wave that opens it.** What this build
delivers instead is a *feasibility survey* (phase 6) — for each pane the
handoff screens want, can MQL answer it today, and does it need a hold
condition or a field that does not exist? That is the thing that
actually stalls a client wave, and it is a document, not a schema.

---

## Decisions

### D1 — The frame store is a per-player rolling window, not an archive

Retention is a **bounded window** (a frame count, configured), oldest
evicted first. It is deliberately **not** the mailbox model the
attestation slate specifies for clips.

The two are different problems and the slate already separates them: a
*clip* is evidence in a dispute that can take weeks, so it never expires
and you delete to make room; a *frame* is your scrollback, whose value
decays fast and whose volume does not. Giving frames the mailbox model
would grow without bound for every player forever, to serve a case
attestation already covers better.

⚠ **Clips and attestation stay deferred.** This build must not smuggle
them in — the slate is explicit that they are bigger than a read API.

### D2 — The client buffer becomes a cache, and the server is the source

Today the client buffer is the only copy, which is why `clearFrames` on
reconnect was a real data question. After this build the client may
backfill from the server on connect, and a second device starts
populated.

⚠ This changes the meaning of an existing behaviour rather than adding
one, so it is a **behaviour change to a machine other waves depend on**
— the same category as Build C's reconnect fix, and it gets the same
treatment: flagged everywhere, and the old path is not quietly deleted
until the backfill is driven.

### D3 — Owner-only, and stated rather than assumed

A player's frame store is readable by that player. Not by wizards
through an ordinary read, not by another character, not by a pane.

Stating it matters because the frames themselves are not all
self-addressed — a room frame you received names other people, so the
store contains third-party content by construction. The gate is on the
*store*, not on each frame's content, and that is the only tractable
place for it.

### D4 — `recall` is one verb over several corpora

One verb, a scope argument, three corpora at first: your frames, the
wiki, the forums. `recall` is a real command like everything else — a
client-only search box would break the axiom that the client owns zero
command semantics, and § 3.5 names search as the case where that most
easily lapses.

Scope is a named argument rather than a separate verb per corpus, so a
fourth corpus is an entry rather than a verb.

### D5 — Search is Mongo text indexes, not a search engine

Three text indexes and a projection. No external service, no embedding
model, no ranking design. The requirement is *find the thing you
half-remember*, and the corpora are small.

Recorded because search invites scope: relevance tuning, facets and
typo-tolerance are all real and none of them is this build.

### D6 — ✅ The survivors list: published releases, and nothing else

**Answered 2026-08-14.** The nightly reset removes all persistent state
except **`documents` rows with `kind: 'release'`** — the press releases
the front door's press room displays. Accounts included.

That is a sharp, testable list precisely because it is short:
`RELEASE_DOCUMENT_KIND` already exists as a discriminator, so the
survivor predicate is one equality rather than a policy table.

⚠⚠ **It makes the front door's own copy false, and fixing that is in
this build.** The handoff states both sides of the tension in one file:

> *"Your character, your record, and everything you build persist to an
> account."*
>
> *"the world resets nightly · Nothing survives to tomorrow yet."*

Under this decision the second is true and the first is not. That is the
same class of defect as *"Sign in to save"* — copy the player **acts
on** — so the persistence sentence is replaced in the commit that ships
the job, not after it. See
[play-surface-requirements](../requirements/play-surface-requirements.md) D2.

⚠ **Seeded world content is not player state.** The seeder is
INSERT-ONLY; the job leaves `domain` alone or reseeds it. "Wipe
everything" read literally empties the world, which is a broken game
rather than a reset one.

⚠ **The wipe makes the wiped-DB traps a nightly event.** The
figures-on-the-wire build recorded them: a character dies on restart
because a fresh `playerId` voids id-keyed grants, seeding a log does not
move a materialized standing, and `WIZARD_PLAYER_IDS` is boot-only.
Whatever re-establishes founder access is part of this phase, not an
operator's memory.

⭐ [gazette-slate](../slates/builds/gazette-slate.md)'s requirement that
bulletins survive is satisfied exactly and only by this list — which is
a good sign the list is the right shape rather than an arbitrary one.

### D7 — The reset policy is reported, not inferred

Whatever the job does, it reports itself: `/auth/status`'s optional
`resetPolicy` (added in Arrival phase 4) becomes non-absent, and the
front door's notice appears with **no client change** — the mechanism
Arrival ships precisely so this build only has to make the claim true.

---

## Phases

Ordered so the blocking decision sits as late as possible and everything
before it ships regardless.

## Phase 1 — The frame store

A new collection, per-player, append-only within a bounded window.
Written where frames are already dispatched to a player's sensor, so
there is one producer rather than a tap per surface.

⚠ **The write must not be on the render hot path.** Every frame to every
player is the highest-volume write in the system; batch or defer.

**Tests.** Window eviction; owner isolation; a frame written once per
delivery, not once per recipient-surface.

## Phase 2 — Reading it back

The read API and the reconnect backfill (D2). The client buffer stops
being the only copy.

**Test.** ⭐ Not "the API returns rows" but *a second connection sees
what the first received* — the property the store exists for, and the
one a per-method test cannot see.

## Phase 3 — `recall`, over frames

The verb, its scope argument, its response shape. Frames first because
they are the corpus this build owns.

## Phase 4 — `recall`, over wiki and forums

Text indexes on `wiki` and the forum Subject layer; the two extra
scopes. Nothing new in the verb.

## Phase 5 — The nightly wipe ✅ unblocked

The scheduled job, its survivors list (D6: `documents` where
`kind === 'release'`, nothing else), and `resetPolicy` reporting it.

⚠ **Three things ship in this phase, not near it:** the front door's
persistence sentence is replaced (it becomes false the moment the job
runs); the seeded `domain` content survives or is reseeded; and founder
access is re-established after a wipe rather than by hand.

⚠ Destructive-by-design work: it wants a dry-run mode, a loud log of
what it removed, and a test that asserts each survivor category is still
present afterwards. A wipe that quietly takes one category too many is
indistinguishable from a data-loss bug — and unlike the worktree case,
there is no reflog.

## Phase 6 — The pane feasibility survey

For each pane the 23 screens want: can MQL answer it today; does it need
a hold condition beyond the five; does it need a field no
`subscribableFields` declares? Output is a table in
[mql-subscription.md](../subsystems/mql-subscription.md) or a short
sibling doc — **not** rows in `Panes.ts` (grounding, above).

Cheap, and it converts Wave 4's biggest unknown into a list.

## Phase 7 — Docs

The frame store gets a subsystem doc or a section in an existing one;
`client-shell.md` records that the buffer is now a cache; the slate's
§ 4.3 not-wired table is updated to what is actually left;
client-slate § 3.1's box resolves.

---

## ⚠ Flags

1. ✅ **The survivors list (D6) is answered** — releases only. What
   remains is that the wipe is **destructive by design**: dry-run mode,
   a loud log, and a test asserting the survivor survives AND that a
   representative row from each wiped collection does not. There is no
   reflog.
2. **Frame-store volume is the risk in this build**, not complexity. It
   is the highest-frequency write in the system and the phase-1 note
   about the hot path is the whole engineering problem.
3. **D2 changes an existing behaviour** other waves rely on. Same
   category as Build C's reconnect fix; flag it in the MR description,
   not only in a comment.
4. **`recall` must not drift toward a client-side filter box.** If it
   ends up as one, the axiom is gone and § 3.5's warning was right.
5. **Clips and attestation stay deferred**, and the frame store is not a
   back door to them (D1).
6. **Notification policy is not in this build.** `NotifyPolicy` /
   `NotifyRule` should be *read* before the notification UI is designed,
   which is a Wave 6 prerequisite, not a Wave 2.5 deliverable — and the
   bell has already been cut twice for the same reason.

---

## Critical files

| Area | Where |
|---|---|
| Frame store collection + writer | `mud/lib/persistence/Collections.ts`, the sensor dispatch path |
| Read API + backfill | a `mud/api/` face + its `obj/api/*Logic.ts` |
| `recall` verb | `mud/cmd/shell/`, `mud/obj/command/shell/` |
| Wiki / forum indexes | `mud/api/subject.ts`, `mud/api/forums.ts` |
| The wipe | `tools/` or a scheduled server job; `resetPolicy` on `/auth/status` |
| Survey output | `docs/subsystems/mql-subscription.md` |
