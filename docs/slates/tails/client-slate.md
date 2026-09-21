# Client slate — the rebuild, and the server work hidden inside it

> **Status: PARTIAL** — waves 0–7 merged (figures on the wire, arrival,
> the play surface, the card surface, the 2.5 server pass) →
> [client-shell.md](../../subsystems/client-shell.md) +
> [cockpit.md](../../subsystems/cockpit.md) +
> [card-surface.md](../../subsystems/card-surface.md) +
> [record-layer.md](../../subsystems/record-layer.md)
> **Left:** the notification tray (read `NotifyPolicy`/`NotifyRule`
> first) · output logging / clips / attestation (owned by
> attestation-slate) · the lounge's content half (owned by lounge-slate) ·
> the open MML vocabulary questions (what `msg` is for · `communicative`
> on the wire · one measurement-channel list) · engagement patterns beyond
> the practice figure (the career portrait) · the `score`/`traits`
> self-report vs the psychology premise · the coalesced *"7 people
> reacted"* line · the card surface's tables / forms / interactive cards +
> view tagging · § 3.7's plates (unverified)
> **Size:** a wave

**Captured 2026-08-06**, from the Claude Design handoff committed at
`c03100dd` (`docs/design_handoff/` — 23 interactive `.dc.html` screens +
three cross-cutting markdown docs). The handoff was produced by reading
the real server source, so its designs are grounded rather than
aspirational; what it does *not* do is sequence itself against this
repo's own conventions, and it makes one recommendation that the build
in flight has already answered better.

Related: [client-shell.md](../../subsystems/client-shell.md),
[cockpit.md](../../subsystems/cockpit.md),
[message-rendering.md](../../subsystems/message-rendering.md),
[card-surface.md](../../subsystems/card-surface.md),
[messaging.md](../../subsystems/messaging.md),
[topics.md](../../subsystems/topics.md),
[prompt.md](../../subsystems/prompt.md),
[command-routing.md](../../subsystems/command-routing.md);
tails: [client-shell-slate](../tails/client-shell-slate.md),
[client-cockpit-slate](../tails/client-cockpit-slate.md),
[console-filtering-slate](../tails/console-filtering-slate.md),
[prompt-stack-slate](../tails/prompt-stack-slate.md),
[message-rendering-slate](../tails/message-rendering-slate.md),
[affordance-verb-slate](../tails/affordance-verb-slate.md).

---

## 1 · Why this slate exists at all

The handoff is 23 files of interactive HTML. They cannot be diffed,
searched, or retired, they carry no links into `docs/subsystems/`, and
they will drift from the code inside a month. They are **reference art**
and should stay that.

What has to live in repo vocabulary is the set of **decisions** they
encode — because those get re-litigated once per wave otherwise. That is
§ 3. Pixels, copy and interaction detail stay in the `.dc.html`; this
slate points at them and does not restate them.

The handoff's own reading order still holds: `DESIGN-SYSTEM.md` and
`CONVENTIONS.md` before any screen.

---

## 3 · The governing decisions

### 3.4 — superseded by [card-surface.md § What the five holds became](../../subsystems/card-surface.md): a card is **pinned, or aged out**; the five holds were retired.

### 3.6 — shipped: [client-shell.md § The phone's play surface](../../subsystems/client-shell.md) + § The mobile bar. Copy-to-Attention was retired with the routed feeds (§ Routed feeds were retired).

### 3.7 Registers are mode-scoped, not frame-scoped

Civic is the default and covers nearly everything, **the terminal
included**. Narrative is *not* a theme over the terminal — the terminal
is the one constant across every mode, so it never carries a mode's
dress; world prose keeps the serif voice on the neutral ground. **Plates**
— an author-supplied illustration in a paper mount, hairline border,
italic caption, inline in the feed — are the only warm surface. That is
where the storybook lives, and nowhere else.

---

## 4 · ⚠ The server work hidden inside the handoff

### 4.1 Track A — MML + topics redesign  *(mostly additive)*

Open, for the server side: is the `item`/`object` split
portable-vs-fixed or historical? What is `msg` for, distinct from
`speech` and `chan`? Should `communicative` join the facets and go on
the wire? Does the measurement channel list match the engine's own
channel enum — it should be one list in one place.

### 4.2 Track B — ✅ shipped as S2 MR B → [command-routing.md § Affordance resolution](../../subsystems/command-routing.md) + [messaging.md § The identity tags](../../subsystems/messaging.md). `static affords` was NOT built (`commandContributions` already carries reach) and the `mx` digest was CUT (composition rides the resolver, cached per `stuff-id`) — rationale handed off to command-routing.md via the compaction ledger.

### 4.3 ⚠ Track C — the unwired read-APIs  *(blocking, per § 3.1)*

Two of these are bigger than a read API and should not be smuggled in as
one:

- **Durable clips + attestation.** Storage is a mailbox (delete to make
  room, never expires — a dispute can take weeks and a retention window
  would erase evidence exactly while it is being argued); attestation is
  the thing on a clock (a rolling chain of frame hashes, cheap, reaching
  back only so far). Filing a report attests automatically rather than
  offering the choice. See [attestation-slate](../builds/attestation-slate.md)
  and `Output Logging.dc.html` — deferred by the handoff, and it should
  stay deferred.

### 4.4 Track D — ✅ shipped as S3 (MRs !177–!179) → [cockpit.md](../../subsystems/cockpit.md) § One verb · § The two axes · § A mode switch opens its arrangement, server-side. The undecided half (who acts on a recall) is decided: the server resolves the arrangement and pushes the card set.

---

## 6 · Decisions the handoff makes that are worth keeping as rules

Short list, because these are the ones a later wave will otherwise
re-argue:

- ~~The routing catch-all cannot be deleted~~ — superseded: routed feeds were retired ([client-shell.md § Routed feeds were retired](../../subsystems/client-shell.md)); a frame is in every view whose predicate it satisfies, so nothing is routed out of sight.
- **Engagement: render what is already recorded, do not invent a
  mechanic.** The practice record (a portrait of a career — colour is
  the *trade*, not the intensity) is recommended; the standing curve
  pairs with it but reads as a guilt meter if put on the front door; the
  chronicle is the deepest hook and the slowest, and on day one reads as
  an empty trophy case. Explicitly **not**: login streaks, a season
  pass, minted achievements — each contradicts standing, which measures
  what you did.

---

### ⚠⚠ One widget in the handoff's catalogue must NOT be built

⚠ The `score` and `traits` **verbs** do self-report today, which
contradicts the psychology slate's premise that "the engine derives
`TraitPosition` and shows nobody, so privacy is free". That is a
pre-existing product decision the psychology build has to make. The
distinction S1 drew, and which the client should keep: **a verb you
choose to type is an act; a pinned readout is ambient.** Only the second
is a stat sheet.

## 7 · Proposed wave cut

---

### ⭐⭐ 7.17 What the LIVE DRIVE found that the suite could not

**Open, and deliberately so:** the coalesced *"7 people reacted to what
you said"* line. Where a client-composed sentence lives without
impersonating server prose or reviving the notification surface Wave 1C
cut is a real design question.

### 7.2 The program resequenced — 2026-08-13

The 2.5 server build shipped in full — catalogue rows ([card-surface.md § The catalogue](../../subsystems/card-surface.md)), the frame store + `recall` over frames · wiki · forums + the nightly reset ([record-layer.md](../../subsystems/record-layer.md)), `prompt.format` ([prompt.md](../../subsystems/prompt.md)). *Who acts on a recall* is decided: the server ([cockpit.md § A mode switch opens its arrangement, server-side](../../subsystems/cockpit.md)).

⚠ **The lounge is cut from Wave 2 entirely** — both halves. Its client
half is Wave 4's play surface (the art's lounge panel is a play-surface
mock, so a pass built in Wave 2 would be discarded or would constrain
Wave 4); its content half — the pizza-as-tally, the waiter, the order
console, the departures board — is listed **deferred** in
[location.md](../../subsystems/location.md) and belongs to the
lounge-revisit slate.

Deferred, designed but not scheduled: output logging / clips /
attestation (§ 4.3); engagement patterns beyond the practice record;
notifications — designed only as a stub, and `NotifyPolicy` /
`NotifyRule` should be read before the UI is designed, because what
belongs in that tray is *whatever the receiver said they wanted*, not
everything that happened.

### ✅ 7.18 Wave 7 — the card surface — SHIPPED (`build/card-surface`)

Shipped → [card-surface.md](../../subsystems/card-surface.md) (one birth path · pinned-or-aged-out · liveness scoped to attention · inspection is ONE card · the feed is a LOG · `meta.carded` · subject-bound subscriptions · § What the live drive found).

⚠ **What Wave 7 ships unfinished, and it is worth naming for the next
client build:** no tables, no forms, no interactive cards — the widest
gap between what a card is *for* and what it does; and fixed `All` +
`Look` tabs where the design wants **tagging**, which needs a fuller set
of card kinds to form a tag library around.

---

## 8 · Open questions

1. ~~**Per-player frame store — yes or no?**~~ (§ 4.3) ✅ **ANSWERED:
   yes** (2026-08-13). The server retains a player's frames; the client
   buffer stops being the only copy. It lands in the **2.5 server
   build** (§ 7.2) with its own storage and retention design, because
   search scope, the second-device story and "your backlog" all depend
   on it and Wave 4 would otherwise stall on the question.
2. ~~**Does a mode switch stay a real command on the wire?**~~ (§ 4.4)
   **ANSWERED: yes** — and verified by driving a browser, not just by
   test. `cockpit mode watch streamer` is an ordinary command; the whole
   frame switches on it. Track D is a verb plus a `clientState` axis,
   and **the axiom holds**: every clickable still previews exactly what
   it sends.
3. **`item` / `object` — portable-vs-fixed, or historical?** Decides
   keep-or-collapse in Track A/B, and the spec's own answer (collapse to
   `thing`, because portability is *state*, not kind) depends on the
   resolver existing first.
4. **How wide is the `mx` digest** (§ 4.2) — the honest full list or the
   verb-conferring subset?
5. ~~**Do the four faces get licensed/self-hosted, or ride Google
   Fonts?**~~ ✅ **CLOSED by precedent (Build A, MR !182)** — not
   decided. `GlobalFonts.ts` already self-hosted subset OFL woff2 and
   `globalFonts.test.tsx` already asserted the `src` URLs are relative,
   so the handoff's `<link>` would have been a *regression*. Six files
   ship (Spectral is static so 400 + 500 are real faces; Public Sans is
   one variable file), and the subsetting procedure is recorded in
   [message-rendering.md](../../subsystems/message-rendering.md)
   § Font-by-register typography — it had been traceable only to a
   commit message describing the result.
