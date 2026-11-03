# One resolution rule

> **Status: UNBUILT · opened 2026-11-03 (user, during the harbors MR review !511).**
> **Left:** `look` renders what MQL bound and nothing else — the `via.exit` gap closed in MQL, the
> class-specific appends moved onto their objects · the binder's cross-scope tiering (which retires
> `go.yaml`'s private scope order) · a `defaulted` fact on a bound result (which retires `buy`'s
> raw-text sniff) · ⭐ one listing protocol + one scorer for words that name an ENTRY in a record
> (eleven hand-rolled matchers today) · the MQL inconsistencies in § 3 · the `lint:controller-resolution`
> census-then-ratchet.
> **Size:** a build.

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

Counts, by verdict: **§ 1 harbors** — 16 rows: 3 violations (1 reverted here), 7 rows of
hand-rolled word matchers (11 functions, at least six different word rules — one finding, one fix),
1 quantity parsed in a controller, 5 accepted. **§ 2 `LookController`** — 28 behaviors: 0
re-resolutions after the revert, 1 resolution-shape gap, 10 class- or feature-specific branches
that belong on objects, 2 duplicated rules, 15 that are the verb's own I/O or already delegated.
**§ 3 MQL** — 18 rules: 12 general and fine, 6 inconsistencies or half-applied carve-outs.

---

## 1. This MR's own carve-outs (harbors, `git diff origin/master...reqs/harbors`)

| # | Site | What it does | Why it was added | Verdict | The uniform fix |
|---|---|---|---|---|---|
| 1 | `LookController` (review 2, `22564bc34`) | `look hesper` bound the quay via the way; the controller swapped in her deck when the far side was a `Place` seen across exits | so the player "sees her" from the quay | ⛔ **violation — REVERTED in this MR** | The way's own description (`BerthExit.description`, `{{ ship }}` her name), read by the landing's alongside line. Her deck is seen by going aboard (`go hesper`) — or by MQL's own tract rule, which `Compartment.isSeenAcrossExit` already answers (row 14). |
| 2 | `go.yaml` `scope: ["reachable", "$focus"]` (Stage A drive, run 6) | the only one of 45 `$focus` scopes that puts the room first | after `look first line` (a line *from the Hesper*), `go hesper` searched the focused line first, matched its NAME at a partial tier, and never reached the way | ⚠ **violation of uniformity** — a private scope order on one verb, and the defect it dodges is live on all 44 others (`look hesper` after `look first line` looks at the line; the drive step is ORDERED to dodge it — *"asked before the line is looked at"*) | MQL/binder (§ 3, row 11): rank across scope tries by tier, so a whole-name hit in a later scope beats a partial in the focus. Then `go.yaml` returns to `["$focus", "reachable"]`. |
| 3 | `BuyController` — `named = !!counter.raw && !/^reachable:/.test(counter.raw)` (review 1, `d898a4a15`) | parses the bound result's RAW query text to guess whether the player named a seller or the view's default bound one; if defaulted, re-routes the sale to `bound.sellerFor(word)` | a market of several sellers: the default binds the first `ForSale`, which may not offer the word | ⛔ **violation** — the controller second-guesses a binding by reading MQL's text | MQL states the fact: a bound result carries `defaulted: true` when the binder applied `default:` (it knows; nothing should parse for it). `sellerFor` stays the `ForSale` protocol's — the object decides who sells, the controller only asks. |
| 4 | `Harbor.shipNamed` / `quayNamed` / `isRoadsWord` (`berth <ship> at <quay>`, P11) | `type: string` args matched by hand: strip `the`, exact compare against the book's ships, the hail log, the quays, the roads' name | the ship is at sea or off the bar and the quay elsewhere — nothing MQL can reach | ⚠ **hand-rolled matcher** (see ⭐ below) | One listing protocol + MQL's scorer. |
| 5 | `CharterBook.shipFor` + `answersTo` (`charter <ship> at <book>`, P23) | strip `the`; way-word, name, or exact keyword | listed ships are rows, not reachable things | ⚠ hand-rolled matcher | same |
| 6 | `HullBook.answersTo` (`buy <hull>` at the yard, review 1) | strip `a/an/the`, fold `-`/`_`, kind leaf or slot name | a hull on the stocks is a page in a book | ⚠ hand-rolled matcher — and a THIRD article rule | same |
| 7 | `Hailable.answersTo` + `HailController` contacts (`hail <contact>`, P8) | the place's hail name by SUBSTRING (`includes`), keywords exact; contacts by substring | a hail reaches what is within hail, not in the room | ⚠ hand-rolled matcher — substring, which MQL's scorer bans mid-word (the ceramics *"imPLANT"* defect) | same; a hailable place is a candidate with `hailName()` as its name |
| 8 | `Stock.pricedKeyFor` (review 1, `0b7c75e60`) — beside master's `lineForWord` | priced key's leaf, hyphen-folded, whole or one word | a boat sold where she lies, with no stock line | ⚠ hand-rolled matcher (the second in the same class) | same |
| 9 | `ShipRegister.entryNamed` (← `transfer … shares of <ship>`, `testharness ship <name>`) | the register's own name compare | a ship is traded by her registered name, wherever she lies | ⚠ hand-rolled matcher; the harness one is test scaffolding (accept) | same, for the verb |
| 10 | `WatercourseCatalogue.landingNamed` + `ExpanseNode.namesRiver` (`course <heading>`, P5) | name / hyphened / path leaf / `leaf.join(' ').includes(w)`; a river by its key unless the words say `bar`/`mouth`/`sea` | a heading names a place on a chart, not a thing in reach | ⚠ hand-rolled matcher with a word-specific exclusion list (`bar`, `mouth`, `sea`) — the shape the rule names | same; the exclusion becomes the candidates' own names (the bar node answers to `bar`; the river does not) |
| 11 | `RentController.daysOf` | parses `2 days` / `a week` by regex + a word table | `for <n> days` | ⚠ a quantity parsed in a controller (not object resolution) | the Quantity substrate: a `type: quantity` arg in a time unit (`quantities.md`) |
| 12 | `RentController` — `bound instanceof HireBook && rateFor(kind)` | narrows the bound book by class; refuses if it does not let the kind | `requires:` is a knowing superset | ✅ accept — narrows, refuses, never re-resolves. (A `HireBook` predicate in `requires:` would make the refusal the binder's.) | — |
| 13 | `PayController` — `isPayable(recipient)` → pay bills | what was bound decides the act | `pay the harbor office` settles what you owe | ✅ accept — polymorphism on the resolved object, not resolution | — |
| 14 | `Compartment.isSeenAcrossExit` + `BerthExit.peekDestination` (review 2) | her deck (only) answers master's tract hook; the way's far side is asked of HER, never the entrance row | so the deck takes part in MQL's tract rule, and a second smack's deck is never the one seen | ✅ accept — participates in an MQL rule through a hook any `Place` answers; no verb knows | — |
| 15 | `Ship.commission` / `Rope` end / `WreckSite` keywords from her name | the object carries the words it answers to | `look hesper's line`, `go gull` | ✅ **the model** — better keywords on the object | — |
| 16 | `FrameSited` alongside augmenter (`instanceof BerthExit`) | the landing's description reads its ways | *Alongside: …* + each way's description | ✅ accept — presentation on the room's own pipeline | — |

### ⭐ Rows 4–10 are ONE finding: eleven matchers, six word rules

Every book/record that a word must name rolled its own matcher, because the thing named is an
ENTRY (a ship in a register, a hull on a page, a quay on a chart, a contact within hail) rather
than a Stuff in a scope. The result is six different word rules: articles (`the` only · `a/an/the`
· none), hyphen folding (yes · no), substring (`includes`) vs whole word vs exact, keywords
(exact · none). A player who learns `look the gull` cannot predict `charter the gull`.

**The fix is in MQL, once.** A **listing protocol** on the object (`Listing.entriesFor(viewer):
{ name, keywords, key }[]` — a ship's book lists its ships, a harbor its quays and the roads, a
chart its landings) and an MQL scope that walks it (`<the book>:listed`, or the arg's
`scope: listed`), scored by the ONE `scoreCandidate`, prompting on excess like any other slot.
The verbs keep `type: string` only where the word is not a name at all (a number, a free-text
tail).

---

## 2. `LookController`, entirely (778 lines, at `origin/master` after the revert)

Line numbers are the file as it stands after this MR (identical to `origin/master`).

| # | Lines | Behavior | Added by | Kind | Proper home |
|---|---|---|---|---|---|
| 1 | 73–76 | `look in <x>` → the ledger (`InventoryController.ledger`) | maritime Q-W1 (10-12) | verb I/O — the prep is grammar MQL parsed | ✅ (one ledger, shared with `inventory`) |
| 2 | 77–86 | no match → *"You don't see any '…' here"* + `empty-result` | envelope 4d (05-12) | verb I/O | ✅ |
| 3 | 87–91, 116–169 | `via.detailPath` → describe the DETAIL, not the host | look/details (05-07) | ✅ **renders what MQL bound** — the precedent the exit case lacks | ✅ |
| 4 | 93–96 | `one === context.location` → the room. **Includes `look <exit>`**: a direction binds `(location, via.exit)`, so `look north` / `look hesper` re-render the room you are in | maritime D1 (10-11) | ⚠ **resolution-shape gap** — not creep, but the exit is not an object MQL can return, so `look` cannot show one | MQL (§ 3, row 6): the exit is a candidate in its own right (`stuff: exit`), read by `go`/`open`/`lock` through `effectiveTarget`; an exit then carries a description like any Visible thing, and `look` needs no branch |
| 5 | 98–103 | `isSoilable(one)` → `reconcileAiring()` before describing | cleanliness W3 (10-17) | ⚠ class-specific branch | the object: reconcile-on-read inside its own describe (`describeFor` / `getMarkupLong` is the read; an async *settle before observed* hook on Stuff, one call, every observer) |
| 6 | 189–201 | preload the sense gate (the boot link for modalities) | concealment Ph3 (07-16) / envelope W0 | verb I/O (a warm) | perception: the modality warm belongs to `PerceptionApi`, not the first verb that needs it |
| 7 | 202, 531–553 | the light band at the place, per viewer | envelope W0 (09-24) | presentation | perception (`VisionModality.perceivedBand`, already) — wording belongs on the place's describe |
| 8 | 211–222 | visible contents: not self, not adornment, Visible, `perceives` | 05-24 / concealment (07-16) | ⚠ a **second visibility rule** — `lookAtTarget` uses `PerceptionApi.visibleContentsOf` | one rule: `visibleContentsOf` for the room too |
| 9 | 224–233 | indistinct surroundings fallback | 05-24 | presentation | the place's describe |
| 10 | 235–270 | too dark: band sentence, perception moment, exits by feel | envelope W0 (09-24) | presentation | the place's describe, given the viewer's band |
| 11 | 263, 502–529 | a fire's glow seen in the dark — colour words by temperature | ceramics / fire (10-23) | ⚠ feature-specific wording in the verb | the vision modality finds it already; the WORDS belong with it (or the fire) |
| 12 | 272–301 | long description through `getMarkupLong(viewer)` (the augmenter pipeline) | markup (06-05) | ✅ the right seam | — |
| 13 | 302–307 | floor puddle summary | bulk (06-12) | ⚠ feature-specific append (and card-invisible — [carded-prose](../tails/carded-prose-slate.md)) | a markup augmenter on the floor/room |
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
| 1 | leading articles stripped from the query | `desugar.ts` (`GrammarApi.ARTICLES`) | general grammar | ✅ |
| 2 | a candidate's own leading article dropped before the exact-name compare (`bareName`) | `scope-walk.ts` `scoreCandidate` | general | ✅ documented (field population pass 4) |
| 3 | the tier cascade: name IS the query 100 · a KEYWORD is the query 70 · every word a whole word of the name 60 · word-starts 50/40 · keyword 25 · partials | `scoreCandidate` / `scoreCandidates` | general, each tier cites the drive that found it | ✅ — note the deliberate order **a thing NAMED by the word (100) outranks a keyword (70), and a keyword outranks a name merely containing the word (60)**; this is what makes the way `hesper` (name, 100) beat her deck (keyword) |
| 4 | the whole-phrase cut (a partial never rides along with a whole match) | `scoreCandidates` | general | ✅ |
| 5 | ⚠ `namesEveryWord` uses `includes` (MID-word) while `scoreCandidate` bans mid-word matches | `scope-walk.ts` | inconsistency | fix: `startsAWord` in both |
| 6 | a direction binds `(location, via: { exit })` — the exit is never itself a candidate | `candidatesForHere`, `candidatesForAnchor` | a shape choice every exit verb reads | ⚠ the root of § 2 row 4 and the harbors swap: `look` cannot show an exit. Fix: the exit is the candidate (`stuff: exit`); `go`/`open`/`lock`/`climb` already read through `effectiveTarget` (row 8) or `via.exit` and move to the exit itself |
| 7 | ⚠ the slow path (`candidatesForAnchor`) lists `getObviousExits()`; the fast path lists `obviousExitsFor(viewer)` | `resolver.ts` vs `scope-walk.ts` | inconsistency — the slow path is viewer-blind to hidden exits | fix: `obviousExitsFor(viewer)` in both |
| 8 | `effectiveTarget(result, predicate)`: the bound stuff → its exit's door → the exit | `MqlLogic` | ⭐ an MQL-hosted usability carve-out | ✅ principled (one question: *what, reachable that way, satisfies the predicate*), documented, used by every device verb — **not by `look`**, which is how row 6 stayed hidden |
| 9 | the tract rule: a loaded `Place` across an exit that answers `isSeenAcrossExit()` is a `here` candidate by its own name | `candidatesForHere` (tracts D30) | ⭐ MQL-hosted carve-out, opt-in by hook | ✅ principled and uniform for the FAST path; ⚠ absent from `candidatesForAnchor` (the slow path), so a drilled focus never sees across — make both paths share one neighborhood builder |
| 10 | `here` dropped when a later try is `reachable` | `CommandLogic.scopeTries` | general binder rule | ✅ documented (ceramics clay pit) |
| 11 | ⚠ the FIRST scope try with an admissible match wins, at any tier | `CommandLogic.walkScopes` | general, but it lets a 10-point partial in the focus beat a 100-point name in the room | **the defect behind § 1 row 2**: compare tiers across tries (a drilled focus still wins a tie — that is what drill-first means), and retire `go.yaml`'s private order |
| 12 | ⚠ a quoted literal is an exact compare of the lowercased NAME only — no `bareName`, no keywords | `resolveLiteralSeed` | inconsistency with rows 2–3 | fix: the literal is one word for the scorer's 100 tier (`bareName`) and the keyword tier |
| 13 | seed words (`inventory` `online` `world` `peers` `reachable` `person` `horizon`) and chain words (`members`) shadow an object so named; `[keyword.x]` is the escape | `resolveKeywordSeed`, `flatMapMembers` | general, documented | ✅ |
| 14 | `:members` expands a `Warren` only (`instanceof`) | `flatMapMembers` | class-specific, but a NAMED operator | ✅ |
| 15 | peers: fixtures count; one level into an OPEN container | `candidatesForPeers` | general, agrees with `canReach` | ✅ |
| 16 | `$focus` / pronouns from the stash; `updates_focus: extend` | `resolver.ts`, `pronoun-memory.ts` | general | ✅ |
| 17 | `[capability.x]`, `[material.x]`, `[mixin.X]`, `[class.X]` predicates | `resolver.ts` | general | ✅ (`[class.X]` in a view's default is how `charter`/`berth`/`rent` find their book — fine) |
| 18 | `onExcess: prompt` on ambiguity | binder | general | ✅ |

**Verdict.** MQL is mostly principled: the rules are general, each cites the drive that forced it,
and its two real carve-outs (rows 8–9) are hooks any object answers. The trouble is at its EDGES —
the exit shape (row 6), the cross-scope order (row 11) and four small inconsistencies (5, 7, 9's
slow path, 12) — and every one of them is exactly where a controller was tempted to compensate.

---

## The build

**Order of work.**

1. **`look` first** — MQL row 6 (an exit is a candidate; its verbs move to it), then `look`'s
   location branch narrows to *the bound thing is the place you stand in*. An `Exit` composes
   `Visible` with a description; the berth way's sentence moves from the landing's augmenter onto
   it (the alongside line keeps the names).
2. **The async augmenter pass**, then § 2 rows 5, 24–27 move onto their mixins (`Placing`,
   `Chattel`, `Display`, `Container`, `Soilable`'s settle). Rows 11, 13, 14, 17, 20 move onto the
   room's describe and perception. `look` ends as: resolve → `describeFor(viewer)` → card + send.
3. **The binder** — row 11 (tier across tries; `go.yaml` back to the shared order), row 12, and the
   `defaulted` fact (retires `BuyController`'s raw sniff).
4. **The listing protocol** — the eleven matchers of § 1 rows 4–10 onto one scorer.
5. MQL rows 5, 7, 9 (one neighborhood builder for both paths).

**The ratchet — `lint:controller-resolution`.** A census over `platform/idea/cmd/**` and every
pack's `src/idea/cmd/**` counting, per controller: reads of `.raw` on a bound result other than in
a refusal's words; `.via` reads other than through `MqlApi.effectiveTarget`; `toLowerCase()` /
`replace(/^the\s+/` / `includes(` applied to a model string; `StuffApi.find*` or `MqlApi.resolve*`
inside `execute`. Today's count is the ceiling (it may fall, never rise); the build drives it to
zero and flips it to a hard gate. Paired with a census of hand-rolled `answersTo`-shaped matchers
in `lib/`/`platform/` (a method taking a `word: string` and lower-casing it) — the listing protocol
is what lets that one fall.

**Size:** a build — two of its five steps (the exit as a candidate, the async augmenter pass) touch
every exit verb and every described object.
