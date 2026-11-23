# One resolution rule

> **Status:** PARTIAL — opened 2026-11-03 (user, during the harbors MR review !511). The
> scorer, the exit as a candidate and the keyword tiers shipped with harbors !511 and
> controllers-are-io W2; the matcher half (§§ 1, 6, 7 — one naming rule in `GrammarApi`, the
> duration slot, `defaulted`, the `lint:hand-matchers` and `.raw`/`.via` censuses at zero)
> shipped with the naming overhaul (2026-11) → [mql.md § Match-quality scoring](../../subsystems/mql.md),
> [presentation.md](../../subsystems/presentation.md), [command-spec.md](../../subsystems/command-spec.md).
> **Left:** `look` renders what MQL bound and nothing else — the class-specific appends moved onto
> their objects behind an async augmenter pass (§ 2 rows 5, 11, 13, 14, 17, 20, 24–27) · § 3 row 9's
> slow path (one neighborhood builder for both paths) and the implicit tract candidate (§ 5 row 3) ·
> the recognition tokens on the slow path, `[keyword.x]` and a mid-chain literal (§ 5 row 4) · § 7's
> unfinished families: Ideas named by word through `PerceptibleMixin` keywords · Brand, Locality and
> Organization composing `NamedMixin` · organizations reached by relation with no global name
> search · a published directory for collection records · `hail`'s matchers (signalling-slate's).
> **Size:** a build — the `look` half waits for a look design conversation after the client work,
> with [carded-prose](../client/carded-prose-slate.md); the § 7 remainders are a tail.

## ⭐⭐⭐ The rule (user, 2026-11-03)

> *A verb resolves its targets through MQL by ONE rule — its declared scope plus the grammar — and
> acts on what comes back. No verb second-guesses resolution; no word gets special handling for one
> situation. When a bare keyword doesn't land where a player wanted, the answer is the grammar or
> better keywords on the object (Perceptible keywords are flexible), never a rule only one verb
> knows. Uniform, predictable resolution across ALL commands beats per-verb cleverness. `look`
> should be: MQL resolves an object; show its description. If a usability carve-out truly must
> exist, MQL is the place for it, never a command controller.*

What the rule buys (lens 1, pedagogy): a player who learns how one verb finds a thing has learned
how every verb finds it. A carve-out in one controller is a rule the player cannot discover from
any other verb — and cannot discover at all, since nothing tells them it exists.

**The sibling doctrine** is [controllers-are-io](./controllers-are-io-slate.md) (*state belongs on
the objects*). This slate is its input half: *which object* is MQL's, never the controller's.

**What prompted it.** Harbors review 2 had `look hesper` on the quay — which MQL binds to the quay
through the way named `hesper` — swap in her deck inside `LookController`
(`peekDestination` + `isSeenAcrossExit`). Reverted in the same MR (§ 1, row 1): `look hesper` now
shows the quay, whose own description reads the way's (*"A gangway runs up to the Hesper's
deck."* — `BerthExit.description`, authored on the `exits/berth` row).

---

## 1. This MR's own carve-outs (harbors, `git diff origin/master...reqs/harbors`)

*Shipped or settled, all sixteen rows → cut 2026-11-23. Row 1 was reverted in !511; row 2 closed with
§ 3 row 11 (W2); row 3's `defaulted` fact rides a bound result
([command-spec.md](../../subsystems/command-spec.md) § `default:`); rows 4–10's eleven matchers name
through `GrammarApi.nameAmong` ([presentation.md](../../subsystems/presentation.md),
`lint:hand-matchers` at zero) — except `hail`'s, exempted by name until
[signalling-slate](../engine/signalling-slate.md); row 11 is the `type: duration` slot. The
**listing protocol + `listed` MQL scope** proposed here was superseded by § 7: MQL finds runtime
Stuff only.*

---

## 2. `LookController`, entirely (778 lines, at `origin/master` after the revert)

Line numbers are the file as it stands after this MR (identical to `origin/master`).

| # | Lines | Behavior | Added by | Kind | Proper home |
|---|---|---|---|---|---|
| 1 | 73–76 | `look in <x>` → the ledger (`InventoryController.ledger`) | maritime Q-W1 (10-12) | verb I/O — the prep is grammar MQL parsed | ✅ (one ledger, shared with `inventory`) |
| 2 | 77–86 | no match → *"You don't see any '…' here"* + `empty-result` | envelope 4d (05-12) | verb I/O | ✅ |
| 3 | 87–91, 116–169 | `via.detailPath` → describe the DETAIL, not the host | look/details (05-07) | ✅ **renders what MQL bound** — the precedent the exit case lacks | ✅ |
| 4 | 93–96 | `one === context.location` → the room. **Includes `look <exit>`**: a direction binds `(location, via.exit)`, so `look north` / `look hesper` re-render the room you are in | maritime D1 (10-11) | ⚠ **resolution-shape gap** — not creep, but the exit is not an object MQL can return, so `look` cannot show one | MQL (§ 3, row 6): the exit is a candidate in its own right (`stuff: exit`), read by `go`/`open`/`lock` through `effectiveTarget`; an exit then carries a description like any Visible thing, and `look` needs no branch — ✅ **closed** (§ 3 row 6 done; the branch is only *the bound thing is the place you stand in*) |
| 5 | 98–103 | `isSoilable(one)` → `reconcileAiring()` before describing | cleanliness W3 (10-17) | ⚠ class-specific branch | the object: reconcile-on-read inside its own describe (`describeFor` / `getMarkupLong` is the read; an async *settle before observed* hook on Stuff, one call, every observer) |
| 6 | 189–201 | preload the sense gate (the boot link for modalities) | concealment Ph3 (07-16) / envelope W0 | verb I/O (a warm) | perception: the modality warm belongs to `PerceptionApi`, not the first verb that needs it |
| 7 | 202, 531–553 | the light band at the place, per viewer | envelope W0 (09-24) | presentation | perception (`VisionModality.perceivedBand`, already) — wording belongs on the place's describe |
| 8 | 211–222 | visible contents: not self, not adornment, Visible, `perceives` | 05-24 / concealment (07-16) | ⚠ a **second visibility rule** — `lookAtTarget` uses `PerceptionApi.visibleContentsOf` | one rule: `visibleContentsOf` for the room too — ✅ **done W2**: the one MQL query (perception.md § The room listing is one query) |
| 9 | 224–233 | indistinct surroundings fallback | 05-24 | presentation | the place's describe |
| 10 | 235–270 | too dark: band sentence, perception moment, exits by feel | envelope W0 (09-24) | presentation | the place's describe, given the viewer's band |
| 11 | 263, 502–529 | a fire's glow seen in the dark — colour words by temperature | ceramics / fire (10-23) | ⚠ feature-specific wording in the verb | the vision modality finds it already; the WORDS belong with it (or the fire) |
| 12 | 272–301 | long description through `getMarkupLong(viewer)` (the augmenter pipeline) | markup (06-05) | ✅ the right seam | — |
| 13 | 302–307 | floor puddle summary | bulk (06-12) | ⚠ feature-specific append (and card-invisible — [carded-prose](../client/carded-prose-slate.md)) | a markup augmenter on the floor/room |
| 14 | 308–328, 474–483 | the help-wanted notices (derived, sent uncarded) | trades-and-labor (09-23) / scan-sweep | ⚠ feature-specific append | the venue's describe or a room augmenter; the uncarded send is the carded-prose question |
| 15 | 329–344 | the perception moment (`learnSurroundings`) → exits shown | location-graph (10-06) | ✅ delegated to the body | — |
| 16 | 345–400 | loose contents; occupants via `composeOccupants`; items resolved now (two gates disagree) | placement / social-graph / presentation | presentation; ⚠ the double gate is a recorded open finding | the room's describe; one perception gate |
| 17 | 401–424 | passive hints (honest fog) over contents + every exit | concealment (07-16) | ⚠ feature-specific append | perception: `hintsFor` already decides; the line belongs on the room's describe |
| 18 | 426–440, 468–473 | the card opens FIRST, then `carded` | card (08-16) | verb I/O | ✅ |
| 19 | 441–455 | the light band line, uncarded | envelope W0 | presentation (card workaround) | carded-prose |
| 20 | 456–466, 556–587 | the tinted light through glass (`light.tintLegibleAt` dial) | glass W0 (10-06) | ⚠ feature-specific wording | vision / the window (`Colour` on `Light`) |
| 21 | 590–615 | not Visible → *"You can't see …"* | 05-24 | verb I/O | ✅ |
| 22 | 616–619 | a deliberate look learns a being's identity | api-oo D4b (09-02) | ✅ the perception moment for beings (delegated) | — |
| 23 | 620–626 | target's long via `getMarkupLong(viewer)` — *"a consumable's nutrition label rides this augmenter seam … not a special-case here"* | 08-07 | ✅ the right seam, and the file's own statement of the rule rows 24–27 break | — |
| 24 | 628–645 | `isPlacing` → *On it / Hanging from it* | placement W1/W2 (09-28) | ⚠ class-specific append | a markup augmenter on `PlacingMixin` |
| 25 | 646–658 | `isChattel` → *Owned by …* (async) | libations (08-28) | ⚠ class-specific append | `ChattelMixin`'s augmenter — needs an ASYNC augmenter pass (the reason it landed here) |
| 26 | 659–668 | `isDisplay` → `readScreen(viewer)` (async) | display (08-29) | ⚠ class-specific append | `DisplayMixin`'s augmenter (same async need) |
| 27 | 669–722 | `isContainer` → Wearing/Holding/In it (four inline, then `inventory <kw>`); the close glance (`resolveSearch`) + hints | maritime D1–D4 (10-11) / concealment (07-16/17) | ⚠ class-specific append | `ContainerMixin`'s describe (`visibleContentsOf` already the rule) and perception's glance |
| 28 | 737–768 | exits line: `Mml.exit`, door + `stateWord()` | boundary W7 (10-09) / location-graph | presentation | ✅ mostly delegated; belongs on `Exitable` so the card and `look` share it |

**Severity: LOW for resolution, MEDIUM-HIGH for presentation.** After this MR's revert `look` never
re-resolves a target. But row 4 means `look <exit>` shows the wrong object by construction, and
rows 5, 11, 13, 14, 17, 20, 24–27 are ten class- or feature-specific branches that make an
alternate `look` controller impossible to write without copying them — the
[controllers-are-io](./controllers-are-io-slate.md) failure, at the most-used verb. The blocker
that put 25–26 here is real: the augmenter pipeline is SYNC and an owner or a screen is async.

---

## 3. MQL (`packages/server/src/mud/api/mql/**`, the binder's scope walk, `MqlLogic`)

| # | Rule | Where | General or special? | Verdict |
|---|---|---|---|---|
| 1–8, 10–18 | *cut 2026-11-23 — fine as audited, fixed in W2 (5, 6, 7, 11, 12), or retired with the seed words and `:members` (13, 14): [mql.md](../../subsystems/mql.md) § Match-quality scoring, § Seeds, § Relations* | | | |
| 9 | the tract rule: a loaded `Place` across an exit that answers `isSeenAcrossExit()` is a `here` candidate by its own name | `candidatesForHere` (tracts D30) | ⭐ MQL-hosted carve-out, opt-in by hook | ✅ principled and uniform for the FAST path; ⚠ absent from `candidatesForAnchor` (the slow path), so a drilled focus never sees across — make both paths share one neighborhood builder |

---

## The build

**Order of work.**

*Steps 1, 3 and 4 shipped (the exit as a candidate; the binder's cross-try tiers and `defaulted`;
the matchers on one scorer) — cut 2026-11-23. The `.raw` / `.via` / hand-matcher censuses sketched
here shipped and sit at zero ([lint-family.md](../../lint-family.md) § `lint:hand-matchers`).
What remains:*

2. **The async augmenter pass**, then § 2 rows 5, 24–27 move onto their mixins (`Placing`,
   `Chattel`, `Display`, `Container`, `Soilable`'s settle). Rows 11, 13, 14, 17, 20 move onto the
   room's describe and perception. `look` ends as: resolve → `describeFor(viewer)` → card + send.
5. MQL rows 5, 7, 9 (one neighborhood builder for both paths). *(Rows 5, 7 ✅ W2; row 9's slow
   path open.)*

---

## 4. The scorer's NAME tiers — ⭐ DECIDED: the name is not special (user, 2026-11-03) — ✅ BUILT (controllers-are-io W2)

*Shipped and documented whole → mql.md § Match-quality scoring — keyword tiers (the name is not
special): the tiers as built (`TIER_*`), `NamedMixin.getKeywords` folding the name and its bare
form, the six drive findings and the keyword data that keeps each outcome, the hesper tie that
prompts, `startsAWord` in the cut (§ 3 row 5). Cut 2026-11-07.*

## 5. MQL reads only Perceptible (user, 2026-11-03)

*The rule: MQL reads a Stuff ONLY through its Perceptible interface (`getName` / `getKeywords`). Any
name, keyword or candidate MQL synthesizes on the query side is undocumented special grammar — MQL
misbehaving. If an object must answer to a word, the object says so: authored keywords, or an
override of `getKeywords()` on its own class, documented there as derived.* Fixed in harbors review 3
for exits and directions only (`Exit.getKeywords`: authored ∪ direction ∪ short forms; Mobile's
`n` → `go n`; no `via.exit`). Everything else, inventoried — **not fixed in !511**:

| # | What MQL synthesizes | Where | In `mql-grammar.md`? | Judged against the rule |
|---|---|---|---|---|
| 1, 2, 5–14 | *cut 2026-11-23 — closed in W2 / harbors review 3, or documented grammar: [mql.md](../../subsystems/mql.md) § Match-quality scoring* | | | |
| 3 | **The tract candidate** — a loaded place across an exit answering `isSeenAcrossExit()` joins `here` by its own name | `candidatesForHere` (tracts D30) | ❌ not documented | ⚠ a synthesized CANDIDATE (not a word): the words are the place's own. Opt-in by hook, so it is the object saying so — but the pool membership is MQL's. With `:exits:…:to` (harbors review 3) the same place is NAMEABLE by grammar; the build decides whether the implicit candidate stays (§ 3 row 9) |
| 4 | **Recognition-relative names and keywords** — a person answers only to what the viewer perceives (`describeFor(viewer)`, tokens of the `distinguishing` form); authored keywords dropped for a persona | `pushDirect` → `RecognitionLogic.perceivedKeywordsImpl` | ❌ not in the grammar (belief.md / presentation.md own it) | ⚠ synthesized words (tokenized prose), but on the object's own face (`perceivedKeywordsFor` is a Stuff method). Conforming once named on the class as derived; ⚠ and the SLOW path + chain steps read the viewer-blind `getPresentation`/`getKeywords` instead (`nameOf`/`keywordsOf`) — two answers to *what does this answer to* |

---

## 6. Reuse ledger for the plan — the matcher half (2026-11-20)

*Cut 2026-11-23 — the census and reuse ledger that seeded the naming overhaul's Stage C. Its
direction (a `listed` scope in MQL) was replaced by § 7; what shipped is in
[presentation.md](../../subsystems/presentation.md) (the naming rule, who supplies candidates),
[command-spec.md](../../subsystems/command-spec.md) (`type: duration`) and
[lint-family.md](../../lint-family.md) (`lint:hand-matchers`).*

---

## 7. The matcher half, re-cut (owner, 2026-11-20)

The § 6 ledger's census stands; its *direction* was wrong — it put a
`listed` scope in MQL. MQL is a query over runtime Stuff only (memory:
*MQL finds runtime Stuff only*). The re-cut, family by family, as settled
so far:

*Shipped families cut 2026-11-23 — real objects in reach (MQL), the naming rule's home
(`GrammarApi`), documents a player names (`keyworded`), lists of things not yet made and a holder's
own parts (the holder's `…Named` method), labels a player gave, and durations (one `type: duration`
slot; the stream verbs keep their own wall-clock parser):
[presentation.md](../../subsystems/presentation.md), [document-store.md](../../subsystems/document-store.md),
[command-spec.md](../../subsystems/command-spec.md). Two were superseded by the code: `buy`'s word
stays a word, named by the one rule ([retail.md](../../subsystems/retail.md) § Naming a good), and
a bound result DOES carry `defaulted`. Still open:*

- **Real objects out of reach** → an existing MQL form where one exists
  (`bob:inventory`, `here:exits:to:i`, …); a set a **holder keeps** (a
  harbor or charter book's ships, a travel card's nodes, a device's
  offered apps, a contact list's people) → a `~name` relation on the
  holder (`:members` retires into it) ([mql-anchors-slate](../engine/mql-anchors-slate.md));
  **`call` and `hail`** are acts, not targets — whatever perceives them
  decides ([signalling-slate](../engine/signalling-slate.md)); their
  matchers retire with that redesign, not this cleanup.
- **Ideas a player names by word** → `PerceptibleMixin` keywords, held
  live by their catalogue (the Material pattern): Spell (its catalogue
  stops holding descriptors), Reading, Condition, Lane, Species, App.
  ⛔ **Never `NamedMixin` for this** — Named is for proper names only.
- **Brand, Locality, Organization compose `NamedMixin`** — so an instance
  *may* carry a proper name ("Terminus", "Aevex", "Dave's Bar"); one that
  has none is described by its short description ("a forest clearing",
  "the general store") and leaves the name empty. Found by Perceptible
  keywords either way.
- **Organizations are reached by relation** (the premises you stand in,
  a business you belong to), else by path as an address. No global name
  search.

- **Collection records** (channels, forum boards, groups, parties) are
  named by their player-chosen proper name through the shared rule, no
  keywords; unique names win on an exact hit, partial words prompt;
  candidates by relation (yours) plus a published directory to join.

Every family in § 7 is settled (owner, 2026-11-20).
