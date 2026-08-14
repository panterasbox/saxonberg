# The play surface — requirements

Waves **2.5 + 4** of the client rebuild, taken as one build: the server
build that makes the remaining read surfaces answerable, and the client
wave that replaces the play surface itself. Seeded by
[client-slate](../slates/builds/client-slate.md) §§ 3.3, 3.4, 3.5, 3.6,
4.3, 4.4, 7.2, and by seven reference screens in `docs/design_handoff/`.

Arrival delivered everything between a cold URL and a body. This is
everything after the body: **the surface a player is actually looking at
while they play**, on both form factors, plus the server reads it needs.

> ⚠ **The reference art was RENDERED for this document, not read as
> text** — the method rule from client-slate § 7.15. Every layout claim
> below was seen. Where the art and the shipped architecture disagree,
> the disagreement is called out rather than silently resolved; there is
> one large instance (the `mx` digest, D11).

---

## Goals

- **The pane feed replaces the single inspection slot.** N panes, each
  held by a server-side condition rather than by recency, each naming
  which condition holds it, each pinnable.
- **Two feeds, independently scrolled** — the terminal oldest→newest,
  the panes newest→oldest.
- **Feed routing is real**: one stream, several destinations, an ordered
  rule table with MOVE/COPY semantics and an undeletable catch-all.
- **Filters are a standing predicate over topic FACETS**, not a list of
  topic strings.
- **The prompt system gets its full shape**: one slot with three
  occupants, a waiting queue, and cancel semantics that name the command
  they abandon.
- **The affordance radial** opens from the resolver with fixed category
  geometry, unavailable verbs dimmed with their reason.
- **The whole surface works on a phone** — one column, a feed switcher,
  panes inline, prompts in a sheet, routing as a settings screen.
- **The server remembers your frames**, and `recall` searches them, the
  wiki and the forums.
- **The world resets nightly, and says so truthfully** — with an
  enumerated survivors list (D2).

## Non-goals

- **Durable clips and attestation.** Bigger than a read API; the frame
  store is not a back door to them ([attestation-slate](../slates/builds/attestation-slate.md)).
- **The lounge's CONTENT half** — the pizza-as-tally, the waiter, the
  order console, the departures board. The play surface renders whatever
  the lounge is; making the lounge interesting is
  [lounge-revisit](../slates/tails/lounge-revisit.md) and
  [location.md](../subsystems/location.md)'s deferred list.
- **The notification tray.** Cut three times now, and the reason has not
  changed: what belongs in it is *what the receiver said they wanted*,
  which is `NotifyPolicy`'s job. Reading `NotifyPolicy` is a Wave 6
  prerequisite, not a deliverable here.
- **Relevance tuning, facets or typo-tolerance in `recall`.** Mongo text
  indexes and a projection (record-layer plan D5).
- **Waves 6 and 7** — reactions, forums, wiki, livestream, CMS, help,
  git. Their server halves already shipped; they are pure client and
  they are not this.
- **Migrating the frame off `cockpit.layout`** beyond what the mode ×
  arrangement axes already shipped in S3.

---

## Surface decisions

### D1 — One build, server first, with a planned cut line

The server half (Wave 2.5, the record layer) lands before the client
half (Wave 4, the play surface), in one branch.

⭐ **The cut line is between the halves, and it is planned rather than
improvised.** If the build does not fit, the record layer ships alone
and the play surface becomes its own cycle — which is exactly the
sequencing § 7.2 already argued for. What must not happen is the play
surface landing half-built because a read surface was missing, which is
the failure the server half exists to prevent.

### D2 — ⚠⚠ The wipe takes everything except published news

**Decided by the user, 2026-08-14.** The nightly reset removes all
persistent state except **`documents` rows with `kind: 'release'`** —
the press releases the front door's press room displays.

That is the whole survivors list. Explicitly *not* surviving: `users`
and every OAuth profile, `holder_snapshots`, all standing and evidence
ledgers (`participation_events`, `renown_events`, `disposition_events`,
`transcripts`, `producer_events`, `authoring_events`), `chronicles`,
`beliefs`, `bank_ledger` / `bank_accounts` / `bank_supply`, `parcels`
and `chattel` with their event chains, `contracts`, `parties`,
`accountability_events`, `wiki` and `wiki_revisions`, `positions`,
`office_holders`, `diagnostics`, and the new frame store.

Three consequences, all of which are **work in this build**, not notes:

1. ⚠⚠ **The front door's persistence claim becomes false and must
   change.** It currently reads *"Your character, your record, and
   everything you build persist to an account."* Under a nightly total
   wipe that is the same class of defect as *"Sign in to save"* — copy
   the player **acts on**, believing their work is banked. It is
   replaced in the same commit that ships the job, not afterwards.
2. **`resetPolicy` becomes non-absent**, so the front door's reset
   notice appears with no client change — the mechanism Arrival shipped
   for exactly this (record-layer plan D7).
3. ⚠ **The wipe reproduces the wiped-DB traps** recorded in the
   figures-on-the-wire build: a character dies on restart because a new
   `playerId` voids id-keyed grants, and `WIZARD_PLAYER_IDS` is
   boot-only. A nightly wipe makes those daily rather than rare. The job
   must therefore be followed by whatever re-establishes the founder's
   access, and that sequence is part of the phase, not an operator's
   memory.

⚠ **Seeded world content is not player state and must come back.** The
seeder is INSERT-ONLY, so the wipe leaves the `domain` templates alone
or reseeds them; a wipe that empties the world is a wipe that broke the
game. This is stated because "wipe everything" read literally would do
exactly that.

### D3 — A mode switch opens its arrangement's panes, server-side

When the player switches mode, the **server** resolves the saved
arrangement and pushes the pane set. The client renders what arrived.

This closes § 7.2's *"still to decide before the pane feed is built"*.
It keeps *the client owns zero command semantics* literally true: the
client sends one command and knows nothing about what an arrangement
means. The alternative — the client replaying `cockpit pane open <name>`
per pane — puts the meaning of an arrangement, and the pane ORDER, in
the client, and costs a round trip per pane.

⚠ The cost is accepted knowingly: **the server now holds view state per
player.** It already holds `cockpit.layout`, `cockpit.mode` and
`console.tabs`, so this is the same seam widened, not a new one.

### D4 — Both form factors, in this build

The phone is not a later pass. Arrival's precedent is decisive: the
mobile path found bugs the desktop pass could not see (the ICB overflow
among them), and every play-surface component would otherwise be touched
twice.

### D5 — A pane is held by a condition, and the header says which

The five hold conditions ship as the vocabulary: `unanswered`, `here`,
`present`, `inReach`, `carried`. The pane header carries the reason in
words — the art's *"held · owes a reply"*, *"held · still in the
room"*, *"held · in reach"*, *"held · you are here"*.

⚠ **The conditions are server-side facts** (*are they still here*, *is
it still in reach*), never client guesses. A manual pin overrides the
decision in either direction, and the pinned count is shown.

⭐ **Nothing still actionable ever leaves.** That is the property that
makes a pane *feed* tractable where a pane *list* would not be, and it
removes the race between the room, a drilled object and an open form
competing for one slot.

### D6 — Pane kinds are a small closed vocabulary with a shared skeleton

The art shows `FORM`, `AGENT`, `INSTRUMENT`, `PLACE` and an unlabelled
in-focus pane. Each is the **same card** — kind label, name, hold
reason, pin — with a body that differs:

| Kind | Body |
|---|---|
| `FORM` | the question in serif, reply options as command buttons, a primary action, and the note that unanswered forms pin themselves |
| `AGENT` | mixin chips with an overflow count, measured label/value rows, action buttons |
| `INSTRUMENT` | mixin chips, one large reading with a unit, a gauge bar with a window, a provenance caption (*working 1150–1300 · via pyrometer*) |
| `PLACE` | mixin chips, `WAYS OUT` as exit buttons, `HERE` as a contents list with each item's own reading |

⚠ **The mixin chip row truncates with a count** (`+11`, `+8`, `+6`) —
it is a teaching surface, not a full manifest.

⚠ Each new kind needs a `Panes.ts` catalogue row, and **that row belongs
to this wave** — `Panes.ts` states its own rule that a row exists for a
pane the client actually opens. The record layer half delivers a
*feasibility survey*, not pre-added rows.

### D7 — Routing: first match wins, MOVE or COPY, and the catch-all cannot be deleted

An ordered rule table. Each rule is a predicate over the envelope, a
destination, and a disposition:

- **MOVE** — routes here and stops; later rules never see it.
- **COPY** — routes here and keeps going, which is how a tell reaches
  Attention *and* still lands in World.

⚠⚠ **The last rule is a catch-all and is undeletable.** Every frame must
land somewhere; without one, a mistyped predicate silently drops output,
and *in a world where a frame can be "you are on fire", a lost message
is not a cosmetic bug*. The UI states that reason where the rule is.

**Every rule shows its match count**, and the count is computed from the
frames it actually matched (client-slate § 3.2). The destinations in the
art are World, Attention, Channels, Diagnostics.

### D8 — Filters are a predicate over topic FACETS

The filter panel offers presets (`Everything`, `Quiet`, `Only me`, `No
diagnostics`) and three facet axes, each chip carrying a **derived
count**:

- **ADDRESS** — who it is aimed at: `direct`, `personal`, `ambient`, `broadcast`
- **ACTOR** — who acted: `self`, `person`, `world`, `system`
- **WEIGHT** — how much it matters: `consequence`, `activity`, `chatter`, `diagnostic`

⭐ **This is why the S2 facet work exists.** Filtering on facets rather
than topic strings means *"quiet"* is one rule instead of a list of
sixty paths that drifts every time a topic is added. The build must
verify the shipped facet vocabulary matches these axes and reconcile the
names if it does not — the art is not authority over the taxonomy that
shipped after it.

A filter set can be saved, and opened as its own terminal.

### D9 — The prompt slot has three occupants and two cancels

1. **At rest** the slot renders `prompt.format` — a Liquid template the
   player owns. ⚠ This is **already rendered server-side** by
   `PromptApi.renderPromptRefresh`; the client work is displaying the
   note it already receives, and the token chips (`{{ focus }}`,
   `{{ posture }}`, `{{ time }}`, `{{ hp }}`) that edit it.
2. **A foreground prompt takes the slot.**
3. **Everything else waits above it** in a queue strip. `foreground:
   false` joins the stack without seizing input, so a guild vote can
   arrive mid-forge and wait its turn.

⚠ **Failure is not dismissal.** A validator returning a string emits
`prompt-validation-failed` and the prompt stays alive — the UI must
never clear the answer.

⭐ **A prompt remembers who asked**, and that is what makes an abandoned
one judgeable: every prompt is pushed from inside a running command, so
the verb, its description and how long it has waited ride the envelope.
Cancelling is not dismissing a dialog — it **rejects the awaiting
command** with `PromptCancelledError`, and *the button says which
command dies*.

**Two cancels, and they are different verbs**: the × on a prompt is
`prompt-cancel` (this one); `prompt cancel` on the strip is the verb
(all of them).

Long-form context stays in the terminal: `opts.body` ships a
`world.prompt` frame carrying the `promptId`, so the prose scrolls with
everything else and the two are visibly tied.

### D10 — The two feeds scroll in opposite directions

Terminal `oldest → newest`; panes `newest → oldest`. Both headers say
so. This is a real design fact from the art, not an accident of
implementation, and the headers exist to stop it being surprising.

### D11 — ⚠⚠ The radial is resolver-backed; the art's `mx` layer does not exist

The affordances screen shows three layers, and **layer 1 is not
architecture**. `<thing mx="Tangible,Thermal,…">` was **CUT** by S2 —
client-slate § *Why the `mx` digest was cut*. Composition is not stable
(`getActiveMixins` unions augments, implants, species innates and
on-shift conferral), so a digest in scrollback goes stale exactly as a
verb list would; it is redundant with the `stuff-id` already on the
frame; and hand-authored MML makes it unreconcilable.

What ships instead: **`CommandApi.resolveAffordances` for
`(id, viewer, now)`**, cached per `stuff-id`. A cold radial waits one
local round trip; warm opens are instant.

The rest of the screen IS the spec:

- **Category slots are FIXED** — perception north, manipulation east,
  social west, movement south. ⚠ *The geometry must not reflow to fit
  the available verbs*; muscle memory is the whole point.
- **Unavailable verbs render dimmed with their reason** — *"54.4 kg —
  too heavy to lift"*, *"needs Smithing 2"*. Decided yes for S2; the
  reason strings already exist, one per validator.
- **Verbs carry their provenance** — `from Tangible`, `from Thermal`,
  `added · Smithing 2 — you have it`. This is the pedagogical dividend:
  meeting the composition palette on real objects is how a player learns
  to author.

### D12 — Mobile: interleave what is causally related, switch what is independent

- **Panes are caused by what you just did** → they render **inline in
  the feed** as cards, not in a second column. Pinned panes get a chip
  row above the command bar.
- **Routed feeds are independent** → a **switcher** (`World 1077`,
  `Attention 2`, `Channels 12`, `Diag 118`), each tab carrying its count.
- **Prompts are demands on you** → a **sheet** that keeps its slot and
  is never hidden, with each option annotated (*"sound, needs truing"*,
  *"heavier"*, *"jig won't hold it"*) and the footnote naming the
  command a cancel abandons.
- **Routing becomes a settings screen**, with `+ add a rule` and
  `from a frame…` — the envelope picker, because tapping fields beats
  typing a predicate on glass.

⚠⚠ **The copy-to-Attention rule stops being a convenience and becomes
the safety net.** On desktop the frame is visible in World anyway; on a
phone World may not be the feed you are looking at. It **ships on by
default**, and turning it off must say what it costs.

⭐ **A frame routed out of view leaves something behind**: a bordered
card in the feed you are watching, naming the destination and offering
`open <feed>` / `reply here`.

### D13 — The frame store is a rolling window, and the client buffer becomes a cache

Per-player, bounded by a configured frame count, oldest evicted first.
**Not** the mailbox model clips get — a frame's value decays fast and
its volume does not.

⚠ **Owner-only, gated on the store rather than per frame.** The frames
are not all self-addressed — a room frame names other people — so the
store contains third-party content by construction, and the only
tractable gate is the store itself.

⚠ **This changes the meaning of an existing behaviour**: after it, the
client may backfill on connect and a second device starts populated. It
gets the same treatment as Build C's reconnect fix — flagged in the MR,
and the old path is not deleted until the backfill is driven.

⭐ **The art already hatches this.** `Filters and Search.dc.html` ships
a banner reading *"on this device only — the sole copy of your world
frames, no server store to fall back on"*, with *"needs a recall verb"*
beside it. That banner is a design-time honest-state hatch, and this
build is what retires it.

### D14 — `recall` is one verb over several corpora

Scope is a named argument, not a verb per corpus: your frames, the wiki,
the forums. ⚠ `search` is taken — it is the in-world perception verb.

⚠ **`recall` must not drift toward a client-side filter box.** A search
box that filters locally would break the axiom that the client owns zero
command semantics, and § 3.5 names search as the case where that most
easily lapses. The `⌘K` field in the art sends a command.

---

## Constraints

- **The command-line axiom holds everywhere.** Every clickable previews
  exactly what it sends — the radial, pane action buttons, reply
  options, exit buttons, filter chips, routing rules. Desktop previews
  in the status bar; the phone opens the command sheet.
- **Never render a figure the server did not send.** Every count in
  these screens (`1,077`, `9 of 9`, `+11`, `0 pinned`, per-rule match
  counts, per-chip facet counts) is **derived from the data beside it**
  or it is hatched. `Figure` is the only thing that prints a value.
- **Registers are mode-scoped, not frame-scoped.** The terminal keeps a
  neutral ground in every mode; plates are the only warm surface.
- **Safe areas** 62px top / 34px bottom; tap targets never below 44px
  via `min-height`, never by shrinking the box.
- **The mobile viewport model**: any fixed-width pane inside an
  overflowing document widens the ICB and pushes `position: fixed`
  chrome off-screen. Verified at 390px with `isMobile: true`, in a real
  browser — jsdom cannot see it.
- **`Panes.ts` rows are added by the wave that opens them**, never
  pre-added to match a mockup.
- **The frame-store write must not sit on the render hot path.** It is
  the highest-volume write in the system; batch or defer.
- **The wipe is destructive by design**: dry-run mode, a loud log of
  what it removed, and a test asserting the survivor category is still
  present. There is no reflog.

---

## Acceptance criteria

**The record layer**

- A frame delivered to a player is retained server-side, once per
  delivery rather than once per recipient-surface, within a bounded
  window with oldest-first eviction.
- ⭐ A **second connection sees what the first received** — asserted as
  that property, not as "the API returns rows".
- The store is owner-only; another character and a wizard read are both
  refused.
- `recall` searches frames, the wiki and the forums by scope argument,
  and every invocation is a real command on the wire.
- `/auth/status` reports `resetPolicy` once the job exists, and the
  front door's notice appears with **no client change**.
- The wipe removes everything except `documents` where
  `kind === 'release'`; a test asserts releases survive and asserts at
  least one representative row from each wiped collection does not.
- The wipe has a dry-run mode that changes nothing and logs what it
  would remove.
- The front door's persistence copy no longer claims work persists,
  and a test asserts the old sentence is absent.
- The pane feasibility survey exists as a table: for each pane the 23
  screens want — can MQL answer it today, does it need a hold condition
  beyond the five, does it need a field no `subscribableFields`
  declares?

**The play surface**

- The right column is a **feed of panes**, not one slot; each renders
  its kind, name, hold reason and pin control.
- A pane held by `present` disappears when the subject leaves, and one
  held by `unanswered` does not, until answered. Both asserted by
  driving state change, not by hand-refreshing.
- A pinned pane survives the release of its hold condition.
- Switching mode opens the arrangement's panes **from the server**, in
  one round trip, with the client sending exactly one command.
- The routing table routes by first-match-wins; a COPY rule delivers to
  two destinations; the catch-all cannot be deleted and says why.
- Every routing rule and every filter chip shows a count derived from
  the frames it matched.
- Filters operate on facets; selecting `Quiet` is one predicate, not a
  topic-string list.
- A prompt with `foreground: false` joins the queue without seizing the
  slot; a validation failure leaves the answer intact; cancelling names
  the command it abandons.
- The radial opens with fixed category geometry; an unavailable verb is
  dimmed and states its reason; the geometry does not reflow.
- The affordance list comes from `resolveAffordances`, and **no `mx`
  attribute is emitted anywhere** — asserted by a source scan.

**Both form factors**

- The whole play surface is usable at 390px `isMobile: true`: feed
  switcher, panes inline, pinned chips, prompt sheet, routing settings.
- No screen scrolls horizontally at 390px.
- A frame routed to a feed you are not watching leaves a card in the
  feed you are watching, offering to open it or reply in place.
- Copy-to-Attention is on by default on a phone, and turning it off
  states the cost.

**Verification**

- ⭐ **Driven in a real browser at both form factors before it is called
  done.** Three of the last three builds found defects this way that a
  green suite could not see.
- The reference screens are **re-rendered and compared by eye** at the
  end, not only at the start.
- `pnpm test`, `pnpm build`, `pnpm lint` and the eight lint gates clean.

---

## Cross-references

- [client-slate](../slates/builds/client-slate.md) §§ 3.3–3.7, 4.2–4.4, 7.2
- [record-layer-plan](../plans/record-layer-plan.md) — the server half's plan
- [play-surface-plan](../plans/play-surface-plan.md) — the client half's plan
- [cockpit.md](../subsystems/cockpit.md), [inspection-pane.md](../subsystems/inspection-pane.md),
  [mql-subscription.md](../subsystems/mql-subscription.md),
  [command-routing.md](../subsystems/command-routing.md),
  [prompt.md](../subsystems/prompt.md), [topics.md](../subsystems/topics.md),
  [client-shell.md](../subsystems/client-shell.md), [press.md](../subsystems/press.md)
- Reference art: `Play Surface - General`, `Explore - Two Feeds`,
  `Feed Routing`, `Filters and Search`, `Prompt System`,
  `Mixin-Derived Affordances`, `Mobile - Live Client`
