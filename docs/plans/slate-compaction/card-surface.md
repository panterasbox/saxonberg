# Slate-compaction pass — card-surface batch (the client)

Four slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `card-surface.md` ·
`client-shell.md` · `cockpit.md` · `record-layer.md` (only `client-shell.md`
needed inserts). Line numbers below are the ORIGINAL file's. Code was
verified in `packages/client/src/**`, `packages/server/src/mud/**`,
`packages/types/src/index.ts` and `packages/content/platform/**`; every
class below names the file that decided it.

Three things a reviewer should know first:

1. **Two `Left` items were false on arrival.** client-slate named *"the
   wiki + forum search ports (both still unwired)"* — `recall --scope
   wiki|forums` is wired (`RecordLogic.ts:395-397`, `recall.yaml`,
   `CardBodies.tsx:1638` sends it from the wiki card) — and *"the
   `item`/`object` collapse to `thing`"* — `KNOWN_TAGS` (`api/mml/tags.ts:53-58`)
   has `thing` and no `item`/`object`. Its *"`mx` digest's width"* was
   answered by the slate's own § 4.2 (the digest was CUT). social-inspection
   named *"account age on the card (Q4)"* — shipped as `card.newness =
   'new-arrival'` (`ProfileLogic.ts:161-163`).
2. **The social-inspection design is SHIPPED · UNDOCUMENTED and its home is
   outside my list.** `social-graph.md` never mentions `profile`, `score`,
   the disclosure model or `privacy.showStatus`; `card-surface.md` has only
   the `who` card row. The decision text is in Handoff → `social-graph.md`
   below, verbatim, and the slate carries a pointer to this ledger.
3. **The § 4.2 affordance rationale is also undocumented** —
   `command-routing.md` documents `resolveAffordances` but not *why
   `static affords` was not built* nor *why the `mx` digest was cut*. Handoff
   → `command-routing.md § Affordance resolution`, verbatim.

---

## docs/slates/tails/client-slate.md — 1205 → 208 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- second + third status blockquotes *"design surface for a multi-wave client cycle"* / *"server subsystem work stops after the ranged build"* (24–38, 15) — history; S1 shipped (`messaging.md`, `topics.md`, `mql-subscription.md`), every track below shipped
- `## 2 · The one-line summary of the change` (74–86, 13) — dress: `styles/ground.ts` (`message-rendering.md § The custom-property colour layer`); architecture: `cockpit.md § The two axes`; honesty: `client-shell.md § The honest-state primitives`
- `## 3` → *"Six. Each is a rule…"* (92, 1) — false once only 3.7 remains
- `### 3.1 ⭐⭐ Never render a figure the server did not send` (94–140, 47) — code: `components/ui/Figure.tsx` (`FigureState` union), `UnbuiltGround.tsx`, `ResetWarden.ts` (the wipe now exists); doc: `client-shell.md § The honest-state primitives` (carries the three-state table, the wipe box and both carve-outs verbatim)
- `### 3.3 one frame → modes → layouts → cards` (152–165, 14) — code: `COCKPIT_MODES` / `COCKPIT_ARRANGEMENTS` (`types/index.ts:3009,3031`), `layouts/modes.ts` `MODE_REGISTRY`; doc: `cockpit.md § The two axes`, `§ The client frame renders from both axes`
- `### 3.5 The command line is never silent` (189–205, 17) — code: `components/frame/StatusBar.tsx`, `CommandSheet.tsx`; doc: `client-shell.md § The status bar`, `§ The command sheet` (the pedagogical dividend is stated there), `cockpit.md § The preview surface + click model`
- `### 3.6 Mobile is not desktop with a narrower column` (207–227, 21) — code: `MobileFrame.tsx`, `ShelfPullDown.tsx`, `CommandSheet.tsx`, `min-height: 44px` in `DroppedRow.tsx:57`/`CommandSheet.tsx:102`; doc: `client-shell.md § The phone's play surface` (*interleave what is causally related, switch what is independent*), `§ The mobile bar`, `§ The server owns what is shown` (`env(safe-area-inset-*)`). One-line note left; the copy-to-Attention paragraph is Superseded (below). The 44px tap floor was undocumented → graduated (below)
- `## 4` intro *"Four tracks. The handoff names three…"* (243–244, 2) — history
- `### 4.1 Track A` → the verified-against-tree para, the table, the `<measure>` history and the two *pull-forward* bullets (248–286, 39) — code: `api/mml/tags.ts` (`quantity` registered; `item`/`object`/`name` gone), `Quantity.buildMarkup`; doc: `messaging.md § It must never be inert` (l.447), `topics.md` (the facets, `communicative`), `mql-subscription.md`. The open-questions paragraph (288–292) is KEPT
- `### 4.3 Track C` → intro + the live/not-wired table + *"every not-wired row is a ledger"* (409–426, 18) — standing/renown/competence: `Avatar.subscribableFields` + `CARDS.self` (`client-shell.md § The widget shelf`); practice: `CharacterSelect.tsx` (`client-shell.md § Character select`); wiki/forum search: `RecordLogic.recallWiki/recallForums` (`record-layer.md § recall`); frame store: `record-layer.md § The frame store`. Clips + attestation stay (kept bullet)
- `### 4.3` → the *Per-player frame store* bullet (431–435, 5) — code: `RecordLogic.ts`, `Avatar.handleMessage` write, `ConnectionEstablishedPayload.frameBackfill`; doc: `record-layer.md § The client buffer becomes a cache`
- `### 4.4 ⚠⚠ Track D — the cockpit contract change` + `### ✅ SHIPPED as S3 — and the axiom held` + the hold-conditions note (445–508, 64) — code: `cmd/shell/cockpit.yaml` subcommands, `CockpitShelfController`, `lib/connection/Cards.ts`, `SHIPPED_ARRANGEMENT_CARDS`; doc: `cockpit.md § One verb`, `§ The two axes`, `§ ⭐⭐ A mode switch opens its arrangement, server-side` (the *"decide before the card feed"* half is decided: the server pushes), `card-surface.md § What the five holds became`. One-line note left
- `## 5 · What in packages/client is superseded` incl. `### ✅ The three "verify first" items` (512–556, 45) — `GhostCommandLine` deleted (`client-shell.md § The status bar`); `InspectionCard` → `components/cards/` (`card-surface.md § The tiers`); `LAYOUT_REGISTRY` → `MODE_REGISTRY` (`cockpit.md § The client frame renders from both axes`); facets in the filter editor (`client-shell.md § Composing one`: *the three facet axes*); the account block (`client-shell.md § Character select`); `prompt.format` rendered by `components/PromptStrip.tsx` (`prompt.md` l.292)
- `## 6` → *Standing splits by level* (565–568, 4) — code: `InfluenceApi.standingForHost`; doc: `influence.md § standingForHost — the seam, and the account roll-up` (*sum*)
- `## 6` → *A reaction is an ordinary emote carrying `inReactionTo`* (569–574, 6) — doc: `reactions.md` l.11, l.63 (`suppressFanOut`), l.116
- `## 6` → *A prompt remembers who asked* (579–583, 5) — code: `api/prompt.ts` `PromptCancelledError`; doc: `prompt.md` l.66 (`foreground`), l.152
- `## 6` → *Search needs a CLI equivalent … `recall` is free* (584–586, 3) — code: `cmd/shell/recall.yaml`; doc: `record-layer.md § recall` (*`search` is taken*)
- `### ⚠⚠ One widget … must NOT be built` → paras 1–2 (600–609, 10) — code: `ShelfRowId` omits `trait`, the server guard on `trait|disposition|personality`; doc: `client-shell.md § TRAIT is permanent, not deferred`. The `score`/`traits` verb paragraph is KEPT (an open product decision for the psychology build)
- `## 7 · Proposed wave cut` → intro + the wave table (620–634, 15) — every row shipped or is carried by its own subsection; Wave 7 (authoring restyle) shipped as the `cms`/`git`/`studio` client-source cards (`cms.md § The CMS is a CARD now`, `card-surface.md § The catalogue`)
- `### 7.1 Wave 1 cut into three builds` (whole, incl. `#### ⭐ **WAVE 1 IS CLOSED.** Wave 2 (Arrival) is unblocked.`, 636–831, 196) — every ⭐/⚠ item has a doc home: the three builds' rows cite them; the glance-line (`cockpit.md § first, and the glance-line`); the round-trip hatch reason (`client-shell.md § Round trip, and a hatch reason that was WRONG`); the held-commands queue and the bell (`§ The dropped row`, `§ The top bar`); the six browser bugs (`§ The shell is clamped to the viewport`, `§ Reporting a schedule obliges the schedule to be real`, `§ The mobile bar`); the read-only indicator (`§ The read-only mode indicator`); default pins (`cockpit.md § first`); the token sweep + Marble (`message-rendering.md` l.357, l.386); the honest-state primitives as a Wave 2 prerequisite (`client-shell.md § The variant axis`); one `self` entry feeds the shelf (`§ The subscription`); three live figures + the `level` collision + its Wave 2 resolution (`§ The hatch categories`, item 1); fonts (`message-rendering.md § Font-by-register`)
- `#### ⭐ **WAVE 2 IS CLOSED.** What it settled, beyond its own screens` (835–877, 43) — the generic char-gen payload + the two additive rules (`char-gen.md` l.99–103, l.206–214); account-level Make = sum (`influence.md § The formula: sum`); `standingForHost` → `undefined` (`influence.md` l.119); the wipe (`record-layer.md § The nightly reset`); *"Sign in to save"* (`client-shell.md § The top bar`, `AccountMenu`); the rail collapse (`§ Intake on a phone, and the in-world rail`); the still-cut list (`§ Character select`: retire stub, rename/appearance dropped)
- `### ⚠⚠ 7.15 the mocks were audited by TEXT` + `#### The Wave 1 audit — done 2026-08-14` (879–948, 70) — the two defects: `Figure` title = aria-label (`client-shell.md § The honest-state primitives`, ⚠⚠ para), `add` not `—` (`§ The ＋ widget menu`); the four kept departures: bell (`§ The top bar`), status-bar right region (`§ The command sheet`, last para), `Views` menu (`§ The top bar`), `GutterStripe` (`message-rendering.md` l.531); `frames behind` hatched (`§ The connection popover`). The method paragraph → Handoff `testing.md`
- `### ⚠ 7.16 Wave 6 was NOT "almost pure client"` (950–992, 43) — `SoulApi.snapshot()` (`emotes.md § The client read face`), the `subjects` scope (`forums.md` l.711), `cockpit.tuned` (`streaming.md § The tuned rail`), `SHIPPED_ARRANGEMENT_CARDS` keyed (mode, arrangement) (`cockpit.md § A mode switch opens its arrangement`), `REACTABLE_PREFIXES` drift (`reactions.md` l.330), the `OFFICIAL` badge + three derived blocks (`wiki.md` l.878–883)
- `### ⭐⭐ 7.17` → the four live-drive defects + the generalisation (996–1025, 30) — the `;` sigil (`reactions.md` l.294), the wiring lesson (`client-shell.md § The card surface` ⚠ para: *a component test proves rendering, never wiring*). The open coalesced-line paragraph is KEPT
- `### 7.2 The program resequenced` → the efficiency para + the 2.5 list (1034–1060, 27) — card rows: `CARD_IDS` is eleven (`types/index.ts:998`), `card-surface.md § The catalogue`; frame store + wiki/forum search + wipe: `record-layer.md`; `prompt.format`: `PromptStrip.tsx`, `prompt.md`. One-line note left
- `### ✅ 7.18 Wave 7 — the card surface` → paras 1–10 + the residue para (1085–1155 · 1162–1172, 82) — doc: `card-surface.md` end to end (`§ One birth path`, `§ Two axes`, `§ Inspection is ONE row`, `§ One identity`, `§ shell.result — a FILTER`, `§ What the LIVE DRIVE found`, `§ Recorded, not closed`). One-line note left; the *unfinished* paragraph is KEPT

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### 3.2 Derive every figure from the data that produces it` (142–150, 9) — code: `char-gen`'s *field the client cannot draw renders hatched* (`char-gen.md` l.206–214 documents the instance, not the rule), `Figure.tsx` → inserted at `client-shell.md § The honest-state primitives`, after the two carve-outs (9 lines: the derivation rule, *controls branch on the state their copy describes*, the intake example)
- `### 3.6` → the tap-target floor (225–227, 3, inside the 3.6 cut) — code: `min-height: 44px` in `DroppedRow.tsx`, `CommandSheet.tsx`, `MobileFrame.tsx:97` comment → inserted at `client-shell.md § The mobile bar` after the glance-line paragraph (5 lines: 44px by `min-height`, safe areas via `env()` not constants)

### Superseded — cut
- `### 3.4 ⭐⭐ A card is held by a condition, never by recency` (167–187, 21) — by the code: the five holds were retired for *pinned, or aged out* (`CardDefinition.pinnedByDefault`, `cards.window`) → `card-surface.md § What the five holds became`. Heading + one-line note left
- `### 3.6` → the copy-to-Attention paragraph (219–223) — by `client-shell.md § Routed feeds were retired` (*Copy-to-Attention is gone for the same reason*); folded into the 3.6 note
- `### 4.2 ⭐⭐⭐ Track B — affordance resolution, **and the correction**` + `### ⭐ Why the `mx` digest was cut` (whole, 294–405, 112) — shipped as S2 MR B: `CommandApi.resolveAffordances` (`api/command.ts:1985`), `KNOWN_TAGS` (`thing`, no `item`/`object`/`name`; `actor` an authoring face) → `command-routing.md § Affordance resolution`, `messaging.md § The identity tags`. `static affords` was not built; the `mx` digest was cut; the *greyed-with-requirement* question was decided yes. Heading + one-line note left; the undocumented rationale → Handoff `command-routing.md`
- `## 6` → *The routing catch-all cannot be deleted* (575–578, 4) — by the code: routed feeds (MOVE/COPY) were retired for named predicate views → `client-shell.md § Routed feeds were retired`. Struck bullet + note left
- `### 7.2` → *"Still to decide before the card feed is built … who initiates"* (1062–1066, 5) — by `cockpit.md § ⭐⭐ A mode switch opens its arrangement, server-side` (the server resolves and pushes). Folded into the 7.2 note

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-06* framing · *Related* · `## 1 · Why this slate exists at all`
- `### 3.7 Registers are mode-scoped, not frame-scoped` — see Uncertain
- `### 4.1` → the open MML vocabulary paragraph (`msg`'s purpose, `communicative` on the wire, one measurement-channel list) — `msg` is still in `KNOWN_TAGS` (`tags.ts:60`); `communicative` is a `TopicCatalogue` flag (`topics.md` l.288) with no wire evidence found; nothing unifies the channel list
- `### 4.3` → the *Durable clips + attestation* bullet (two-slates overlap with `builds/attestation-slate.md`, which owns it; `record-layer.md § The window` cites the mailbox model from there)
- `## 6` → *Engagement: render what is already recorded* — the practice **figure** ships on character select (`CharacterSelect.tsx`), the career portrait does not (no `PracticeRecord` in the client)
- `### ⚠⚠ One widget …` → the `score`/`traits` self-report vs the psychology premise paragraph — `score.yaml` help still lists *"most pronounced traits"*; `ProfileLogic.ts:318-322` digests traits on the self card
- `### 7.17` → the coalesced *"7 people reacted"* line — `reactions.md` l.344 records it as *not built, a design question*
- `### 7.2` → the lounge-cut paragraph (two-slates overlap with `builds/lounge-slate.md`, which owns pizza/waiter/order console/departures) and the *Deferred, designed but not scheduled* paragraph (clips · engagement · the notification tray — `client-shell.md § The top bar`: bell *not built, not hatched, not placeholdered*)
- `### 7.18` → *What Wave 7 ships unfinished* (tables / forms / interactive cards; fixed tabs where the design wants tagging) — `card-surface.md § Named views over the feed` and its closing note confirm both as unbuilt
- `## 8 · Open questions` — spine, verbatim

### Uncertain — kept
- `### 3.7` — *plates* (an illustration in a paper mount, inline in the feed): `CardBodies.tsx:110-116` has a `CardIllustration` "room plate" and `CharGenStage.tsx:174` a `Plate`; whether that is the warm surface the section means, and whether *the terminal never carries a mode's dress* is stated anywhere, I could not confirm — `message-rendering.md` has no *plate* or *register-scoped-by-mode* statement. Kept whole
- `### 4.1` open paragraph → *"is the `item`/`object` split portable-vs-fixed or historical?"* is answered by the code (collapsed to `thing`); it sits inside a kept paragraph with three still-open questions
- `## 8` Q3 (`item`/`object`) — answered by `KNOWN_TAGS`; Q4 (`mx` digest width) — answered by the slate's own former § 4.2 (*cut*). Both kept because open questions are spine; `Left` no longer names them
- *"the wiki + forum search ports"* (the old `Left`) — the verbs are wired (`recall --scope wiki|forums`) and the wiki card sends `recall --scope wiki` (`CardBodies.tsx:1638`); I found no forum-card search box in the client, and the axiom does not require one. Dropped from `Left`; flagging in case a client box was intended
- Overlaps for the cluster pass: clips/attestation ↔ `attestation-slate`; the lounge content half ↔ `lounge-slate`; the notification tray ↔ `client-cockpit-slate § Notifications` + `social-graph-slate`

### Handoff (belongs in a doc outside my list)
- → `command-routing.md § Affordance resolution`, verbatim from the cut § 4.2 (why `static affords` was not built · why MML must not carry the verb list · why the `mx` digest was cut):

  > The spec's § 6.3 proposes adding `static affords` beside `fieldMeta` on
  > every verb-conferring mixin, collected up the prototype chain.
  >
  > **Do not build that.** `build/affordance-scope` has just made
  > `static commandContributions` **directional and recursive**, named from
  > the declaring object's point of view:
  >
  > ```
  > self         me
  > inventory    everything nested INSIDE me, at any depth   (recursive)
  > environment  my container CHAIN, outward, at any depth   (recursive)
  > peers        my siblings, and one PASSABLE exit away
  > ```
  >
  > That is the same job, already authored across the whole tree, already
  > introspectable, and now carrying reach semantics `affords` does not
  > have. Adding `affords` beside it would be **a second taxonomy describing
  > what a first taxonomy already knows** — which is precisely the reason
  > § 6.3 gives for rejecting its own earlier `kind` registry. The argument
  > was right; it just stopped one step short of the existing answer.
  >
  > **Why MML must not carry the verb list**, and why the split is
  > principled rather than a compromise:
  >
  > - *Bloat* — twenty tagged nouns × a dozen verbs is a frame many times
  >   the size of its own prose.
  > - *Staleness* — a frame sits in scrollback forever; a door tagged
  >   `unlock` ten minutes ago is now a lie.
  > - *Viewer-dependence* — the true menu is a function of `(id, viewer,
  >   now)`, and MML is a snapshot of *then*.
  >
  > **A mixin set is stable; its state is volatile.** So put the stable half
  > in the markup and resolve the volatile half live: the radial opens
  > *immediately* on the mixin-derived skeleton (no round-trip, no spinner),
  > the resolver runs in parallel, unavailable verbs dim with their reason
  > (*"locked"*, *"needs Smithing 2"*), newly available ones fill in. The
  > file-manager right-click pattern. `mudref:` is already the plumbing;
  > the resolver is what's missing.
  >
  > **Category slots are fixed** — perception north, manipulation east,
  > social west, movement south — so muscle memory survives a menu whose
  > verbs you have never seen. The geometry must not reflow to fit the
  > available verbs.
  >
  > ### ⭐ Why the `mx` digest was cut
  >
  > The question was going to be *how wide* — every composed mixin, or only
  > the verb-conferring ones. It turned out to be neither, because the
  > premise of putting composition in MML at all was false.
  >
  > **The split rested on "a mixin set is stable; its state is volatile."**
  > It is not stable: `MixinApi.getActiveMixins` unions in augments,
  > implants, species innates and on-shift conferral. Composition changes at
  > runtime, so a digest sitting in scrollback goes stale in exactly the way
  > this section refuses to let the *verb* list go stale. The three
  > arguments above — bloat, staleness, viewer-dependence — apply verbatim
  > to the digest. The reasoning stopped one step short of itself.
  >
  > Two more, either sufficient alone:
  >
  > - **Redundant with the key beside it.** The frame already carries
  >   `stuff-id`; the resolver is a function of `(id, viewer, now)`, and so
  >   is composition.
  > - **It can drift irreconcilably.** `ProseLogic` registers an `item`
  >   Liquid filter, wiki content is hand-authored, and `Mml.fromMarkup` is
  >   public — so hand-written `<thing mx="…">` is reachable and nothing
  >   could ever reconcile it against the object.
  >
  > A bitvector was considered: 149 registered mixins means ~25 fixed
  > base64 characters on every tagged noun — *longer* than the sparse list
  > for the common object — plus a version-locked index registry shared with
  > the client. Worst of both.
  >
  > **Composition rides the resolver instead**, cached per `stuff-id`. A
  > cold radial waits one local round-trip; warm opens are instant. No MML
  > change, no encoding problem, no drift.

- → `testing.md` (the render tier), verbatim from the cut § 7.15 — the method rule for reading the `docs/design_handoff/*.dc.html` mocks:

  > **The `.dc.html` files were read by extracting their text and never
  > opened in a browser.** Stripped text preserves *what words appear* and
  > destroys *how they are arranged* — so a one-page form was built as a
  > five-screen wizard, a banded hero was built as a two-column rail, and a
  > three-column workspace was built as a single centred column. All three
  > were caught only when the user looked at the built screens.
  >
  > ⭐ **The method fix, for every wave from here:** render the mock and
  > compare by eye. The files are React walkthroughs — pin the phase flag
  > in a scratch copy to reach panels behind a step (`isDoor` / `isIntake`
  > / `isLounge` in *Arrival — First 60 Seconds*). Reading the source text
  > is a supplement, never the audit.

### Status block
- Left: *the wiki + forum search ports (both still unwired) · the notification tray · output logging / clips / attestation · the lounge's content half · the `item`/`object` collapse to `thing` · the `mx` digest's width* → *the notification tray (read `NotifyPolicy`/`NotifyRule` first) · output logging / clips / attestation (owned by attestation-slate) · the lounge's content half (owned by lounge-slate) · the open MML vocabulary questions (what `msg` is for · `communicative` on the wire · one measurement-channel list) · engagement patterns beyond the practice figure (the career portrait) · the `score`/`traits` self-report vs the psychology premise · the coalesced "7 people reacted" line · the card surface's tables / forms / interactive cards + view tagging · § 3.7's plates (unverified)*
- Size: a wave → a wave

---

## docs/slates/tails/client-cockpit-slate.md — 796 → 397 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the narrative *"**Status.** Design surface staked out…"* paragraph (22–32, 11) — history; the current block covers it
- `## Principle` → the three corollaries (78–92, 15) — 1: `cockpit.md` governing principle; 3: `client-shell.md § The command sheet`; 2 is Superseded (below). One-line note left
- `## Archetype` (96–111, 16) — (B) shipped: the card feed (`card-surface.md`), every clickable through the bus
- `### Room-state (about the location)` (294–311, 18) — its own note already said *folded into the inspection card*; code: `DETAIL_FIELDS` `contents`/`worn`/`exits` (`card-surface.md § DETAIL_FIELDS extension`, `§ worn vs contents`)
- `### Inspection card` (313–324, 12) — code: `components/cards/`, `CardRegistry.ts`; doc: `card-surface.md § Inspection is ONE row`
- `## MML semantic tags (Track 1)` → intro *"Today the prose card renders MML as literal text"* (424–427, 4) — false now: `components/MmlRenderer.tsx`
- `### Renderer contract` (452–472, 21) — code: `MmlRenderer.tsx` (identity tags at l.133-136, unknown tags flatten), `styles/ground.ts` tokens; doc: `message-rendering.md` (semantic-only core, the theme cascade), `card-surface.md § MML identity-tag rendering`
- `## Non-goals` → *Dedicated content CMS* (683–685, 3) — `cms.md`; *Server-side scripting* (686–688, 3) — `scripting.md`, `api/script.ts`; *Mobile cockpit* (689–691, 3) — `client-shell.md § The mobile bar`; *AI-generated location illustrations* (680–682, 3) — `media.md` (the image-generation pipeline), `CardBodies.tsx` `CardIllustration`
- `## Suggested build order` (727–757, 31) — history; tracks 1–6 and 8 shipped, 7 (the content surface) keeps its own section

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Out-of-scope reminders for future selves` (760–777, 18) — the tree already follows it (`packages/client/src/{components,store,services,layouts,lib}`); the *don't bake content in / don't shadow server state / don't bypass the bus* bullets are `cockpit.md`'s axiom; the module-placement bullet had no doc home → inserted at `client-shell.md` top, after the scope box (8 lines: *Where client code lives*). *"Don't pre-empt the mobile slate — cockpit is desktop"* is simply false now

### Superseded — cut
- `## Principle` → corollary 2 (*no server-side multi-command primitive; the client batches*) — by `scripting.md` (the command-native interpreter). Folded into the corollaries note
- `## The click model` (115–140, 26) — by the code: hover preview lives in the status bar, **shift-click / right-click copy** (not *load into the input*), right-click / long-press opens `AffordanceRadial` (`EntityName.tsx:143`), a phone tap opens the **command sheet** (not *preview + send*) → `cockpit.md § The preview surface + click model`, `client-shell.md § The command sheet`. Heading + note left
- `### Admin mode verb (override)` (178–191, 14) — by `cockpit mode <name>`, ungated (*a mode is a view, never a gate*) → `cockpit.md § One verb`, `§ The mode axis`. Heading + note left
- `### Always-on minimum` (197–214, 18) — by the `Frame` bar + command bar + status bar; the notification chip was cut twice → `client-shell.md § The top bar`. Heading + note left
- `### World mode` diagram (216–231, 16) — by `play` + the card feed → `cockpit.md § The two axes`, `card-surface.md`. Heading + note left
- `### Mobile (out of scope for v1…)` (265–271, 7) — by the shipped phone chrome, which is NOT a stream + button bar → `client-shell.md § The mobile bar`, `§ The phone's play surface`. Heading + note left
- `### Tag taxonomy` (429–441, 13) — by `KNOWN_TAGS` (`api/mml/tags.ts:53-60`): `player` · `npc` · `thing` · `location` · `exit` · `direction` · `quantity`; no `item`/`npc`-style verb menus in markup, no `<mql>`, no `<lesson>` → `messaging.md § The identity tags`. Heading + note left
- `## MQL-subscription consumer (Track 2)` + `### Initial-state hydration` (476–509, 34) — by the code: the client cannot name a card or issue widget MQL; its one subscription is `chrome: 'self'` (`MqlSubscribeMessage`), cards are server-pushed, reconnect replays only that → `card-surface.md § One birth path`, `§ Reconnect behavior`, `client-shell.md § The subscription`. Heading + note left
- `## Character creation (Track 3)` → `### Hybrid path` · `### Client-side batching when needed` · `### Archetypes are content` · `### Starting location is server-configured` (513–579, 67) — by `char-gen.md` (`enroll` draft machine, `EnrollController.FIELDS`, species dossier + NameBank), `location.md § Landing: the startLocation spawn instruction`, `identity.md` (the archetype stamp). Heading + note left; `### Re-entry and post-modal changes` KEPT (see Uncertain)
- `### "Enter the world" is a command (open question)` (593–606, 14) — by `enroll confirm` (`char-gen.md` l.46: *commits a fresh Avatar*)
- `## Prompt line` (610–632, 23) — by `prompt.format` as a **Liquid** template, default `{{ focus }}>` (`lib/shell/Environment.ts:406`, `components/PromptStrip.tsx`) → `prompt.md` l.292, `shell-environment.md` l.374. The `%token` grammar did not ship; further variables *land additively* per the setting's own description. Heading + note left
- `## Interactive prompt stack (Polish A)` (636–650, 15) — self-marked superseded by `prompt-stack-slate`; shipped → `prompt.md`; the prompt card opens pinned (`card-surface.md § What the five holds became`). Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · the two framing paragraphs · *Audience* · *See also* · *Dependencies*
- `## Principle` → the two thesis paragraphs
- `## Modes` → intro + `### Mode catalogue` (mixed table: World shipped as `play`; Study / Classroom / Tutor unbuilt — no `study`/`classroom`/`ContentPayload`/`mode-changed` anywhere in `packages/types` or `packages/client`) + `### Mode-switching is server-driven` (see Uncertain)
- `## Cockpit layout` → `### Study mode` · `### Classroom mode (later)` diagrams
- `## Panel inventory` → intro · `### Self-state` (mixed: vitals/posture in the prompt did not ship — `prompt.format` exposes only `focus`; inventory + slots ship as `contents`/`worn` on the subject card; status effects / skills / quest log unbuilt) · `### Navigation` (no `Compass`/`SketchMap` in the client) · `### Communication` (no tell history) · `### Notifications` (the chip — overlap with client-slate's tray) · `### Help / education` (verb help shipped as the card's action row; MQL examples wait on the sleeper; no `Tutorial` in the client) · `### Author / admin` (see Uncertain)
- `## Content surface (mode-bound)` — all four subsections
- `### The <mql> sleeper` — `mql` is not in `KNOWN_TAGS`; nothing in `MmlRenderer.tsx` handles it
- `### Re-entry and post-modal changes` (see Uncertain)
- `## Envelope rendering (Polish B)` (see Uncertain)
- `## Non-goals` → 3D map · voice · persistent profile UI
- `## Open questions` — spine, verbatim

### Uncertain — kept
- `### Mode-switching is server-driven` — kept-but-contradicted: the diegetic *"`study textbook` flips the layout automatically"* / *"a quest gate drops a player into a classroom"* collides with `cockpit.md § The old layout axis`: *No auto-switch … No domain verb, URL, NPC, or item flips it*, and mode rides `cockpit.mode` clientState, not a `mode-changed` push channel. Requirements for `study` must reconcile; flagged in `Left`
- `### Re-entry and post-modal changes` — *"the verbs (`rename`, pronouns, outfit, body plan) ship universally available in v1"* is contradicted by `client-shell.md § Character select` (*Retire is a disabled stub; rename and appearance are dropped*) and client-slate's Wave 2 (*still cut*). Kept because the design (a registrar's clerk runs the same verb) is unbuilt; flagged in `Left`
- `## Envelope rendering (Polish B)` — the status block claimed it shipped. Looked for `'declined'` / `'partial'` markers, `controller-rejected` / `validator-failed` / `mql-no-match` note chips in `packages/client/src/components/**`; found envelope handling only in `services/websocket.ts` and `store/index.ts` (the `PromptStrip` and card feed read parts of it). Whether status colours / note chips paint anywhere I could not confirm; kept and dropped from the status block's *shipped* list
- `### Author / admin` panels — `cms.md § The unified-tree projection` (a tree), `diagnostics.md § Reader A — the errors verb` + the CMS pane (reload/compile status), `studio.md` (a template/blueprint browser) cover parts of this table in different shapes; `card-surface.md § Body discipline` says *the v1 card has no admin surface*. Kept as a mixed table
- `## Open questions` — Q1 answered by `enroll confirm`; Q4 by Ink / Marble / high-contrast (`message-rendering.md`); Q5 by the card feed's pin/dismiss + `cockpit shelf first`; Q6 by `card-surface.md § Reconnect behavior` (cards do not replay). Q2 (tutorial overlays) and Q3 (the chip's semantics) are open. Kept because open questions are spine
- *Dependencies* → *"World clock feeds `%time` token"* — the `%token` grammar did not ship; left as spine
- Overlaps for the cluster pass: the notification chip ↔ `client-slate` (tray) ↔ `social-graph-slate`; the educational mode ↔ `client-shell-slate § Modes generalize`

### Handoff
- none

### Status block
- Left: *the `study` and `classroom` modes · the content surface (video + transcript payloads, diegetic triggers, completion events) · the live-tutor / classroom shape · the `<mql>` / `mudq:` sleeper, still inert by design* → *the `study` and `classroom` modes + their diegetic `mode-changed` trigger (⚠ contradicts cockpit.md's no-auto-switch rule) · the content surface (video + transcript payloads, diegetic triggers, completion events) · the live-tutor / classroom shape · the `<mql>` / `mudq:` sleeper, still inert by design · the navigation panels (sketch map · compass) · tell history · the notification chip (overlap: client-slate's tray) · tutorial overlays · the author/admin panel set (uncertain against cms.md / diagnostics.md) · the post-intake identity verbs (`rename` / pronouns / appearance — contradicted by client-shell.md § Character select) · envelope status / note rendering (uncertain) · the self-state panels not on a card (status effects · skills · quest log)*
- Size: a wave → a wave

---

## docs/slates/tails/client-shell-slate.md — 665 → 490 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the two older status blockquotes *"Track A lead SHIPPED"* / *"shape proposed"* (10–42, 33) — history; the current block + the kept `## Principle` carry the thesis
- `## The frame / body decomposition` (146–169, 24) — code: `components/frame/Frame.tsx`, the layout registry; doc: `client-shell.md § The top bar` (*shared primitives, not a shared `Frame`*), `cockpit.md § Client registry`
- `## Shared primitives` → intro + `ConnectionIndicator` / `AccountMenu` / `ModeIndicator` bullets + *Decouple concern from placement* + *Layered status* (175–200 · 203–213, 37) — code: `ConnectionChip.tsx`, `ConnectionIndicator.tsx`, `AccountMenu.tsx` (state-polymorphic, two exits distinct — Q4 resolved), `ViewsMenu.tsx`; doc: `client-shell.md § The top bar`, `§ The connection popover`, `cockpit.md § Client registry`. One-line note left; the `SearchInput` bullet KEPT
- `## Pre-world is plain UI` (301–334, 34) — code: `components/StartScreen.tsx`, `services/auth/GuestAuthRoutes.ts`, `Login.enter` mints the guest; doc: `client-shell.md § The front door` (no metaphor, logout returns here, data-shaped provider list), `§ Anonymous guest` (minted on Enter). ⚠ Its *"Guest = post-sign-in quick-play … not an anonymous path"* was already contradicted by the slate's own later section; the anonymous shape is what shipped. Heading + note left
- `### Guest = anonymous, zero identity persistence` + the abuse-seam box (393–422, 30) — code: `GuestAuthRoutes.mayMintGuest`, `Avatar.save()` guest short-circuit, `backend/inbound/clientState.ts` don't-flush; doc: `client-shell.md § Anonymous guest`. Heading + note left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `## Surfaces over the bus` → the game/CMS-coupling + author-mode-seam paragraph (135–142, 8) — by the code: the CMS is the `build` **mode**, its `?surface=cms` takeover deleted, editor/git/Studio three cards in one feed → `cockpit.md § Builder = the CMS re-homed`, `cms.md § The CMS is a CARD now`. Note left; the surfaces table KEPT (it names the public surface)
- `## Modes generalize the cockpit's mode axis` → intro + the five-row table (219–231, 13) — by `COCKPIT_MODES` (`types/index.ts:3009`): `play` / `build` / the two `watch` arrangements; *Educational* has no mode → `cockpit.md § The mode axis`. Note left; the mode-determination paragraph KEPT

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *See also* · `## Principle` · `## Surfaces over the bus` (table + the shared-layout paragraph) · `## Shared primitives` → `SearchInput`
- `## Modes generalize` → the determination paragraph (see Uncertain)
- `## Search as a frame primitive` — no `SearchInput` / palette in the client; `recall` covers frames · wiki · forums (`RecordLogic.ts:395-397`) and **not help**; the shared reading substrate (content-surface viewer, spoiler gating, transclusion palette) has no client home
- `## Pre-auth client state` → the distinction, the taxonomy table, `### Two axes → two client tiers`, `### Merge on login`, `### Why this section lives here` — no `localStorage` tier exists (`CommandBar.tsx:542` persists command history only); the provider list shipped data-shaped (Google · Twitch · Kick) but *last-used provider leads* did not
- `## The public read-only surface` — all subsections, including the read-only-session box (`client-shell.md § The read-only mode indicator` confirms nothing exists)
- `## Declarative mode model — extract, don't pre-build` — steps 1 (`play` + the frame) and 2 (author = `build`) are done as plain composition; the extraction is not
- `## Build order / sequencing` (mixed) · `## Relationship to existing slates` · `## Open questions` · `## Dependencies`

### Uncertain — kept
- `## Modes generalize` → *"how a mode is determined spans role-gating (author/streamer)…"* — kept-but-contradicted: `cockpit.md § The mode axis` says *a mode is a view, never a gate* and a source scan forbids anything outside the cockpit reading `cockpit.mode`. Vertical-config / context / user-toggle determination remain open (Q1); role-gating is the wrong layer
- `## Search` → *"Help … exists now; searchable first"* — `help` is a card (`opens_card: help`) and a verb, but not a `recall` scope; whether search lands as a fourth scope or a frame input is the open design
- `## Open questions` — Q4 (two exits) and Q6 (the start screen composes the primitives) are resolved by the code (`AccountMenu.tsx`, `StartScreen.tsx`); Q7 (wiki own-vs-external) is answered by `wiki.md` (own). Kept because open questions are spine
- *See also* → `cms-slate.md` *"the CMS surface — separate tab"* is stale (it is a mode now); left for the sweep
- Overlaps for the cluster pass: the educational mode ↔ `client-cockpit-slate § Modes`; the public overlay's control half ↔ `streaming.md`/`livestream.md`; help search ↔ `help-slate`; spoiler gating ↔ `spoiler-slate`

### Handoff
- none

### Status block
- Left: *search as a frame primitive (Q3) · the public read-only surface (metrics · overlays · public docs) · the declarative mode model · mode determination (Q1) · the device-local pre-auth tier (Q9)* → *search as a frame primitive (Q3 — the CLI half shipped as `recall`; help is not yet a scope) · the public read-only surface (metrics · overlays · public docs) + a read-only session · the declarative mode model (extract at mode #3 — `play` and `build` exist) · mode determination (Q1) · the device-local pre-auth tier (Q9) + merge-on-login (Q8) · the educational mode row*
- Size: a wave → a wave

---

## docs/slates/tails/social-inspection-slate.md — 340 → 196 · Status PARTIAL → PARTIAL

⚠ Everything this slate designed shipped (`who.yaml` with `--here`/`--friends`/`--country`, `profile.yaml` with `finger`, `score.yaml` with `me`, `WhoController.ts`, `ProfileController.ts`, `ProfileLogic.ts` behind `SocialApi.composeRow/composeCard`, `privacy.showStatus` on `NotifyPolicy.ts:164`, the `who` card row, the new-arrival badge) — and **no subsystem doc states the disclosure model.** `social-graph.md` has `who` only as a Liquid variable and the sandbox roster-row note; `card-surface.md` has the `who` card row. The design paragraphs go to Handoff → `social-graph.md` verbatim; the slate carries a pointer to this ledger.

### Cut (SHIPPED · DOCUMENTED)
- the second status blockquote *"design captured, not built"* (20–25, 6) — false now
- `### who — the roster` → *Always lists every online player* (157–159, 3) — code: `WhoController.ts:4-10` (presence public, rows via `composeRosterRow`), `who.yaml` help; doc: `card-surface.md § The catalogue` (the `who` payload row)
- `## Client design` → *Clickable, command-previewing* (253–256, 4) — code: `EntityName.tsx`, `CommandSheet.tsx`; doc: `client-shell.md § The command sheet`, `card-surface.md § The card's action row`
- `## Build order` → *Wave 1* (307–314, 8) — shipped in full (files above)

### Graduated (SHIPPED · UNDOCUMENTED) — cut, text in Handoff
- `## Principle — three kinds of "values about a person"` (61–78, 18) — code: `ProfileLogic.composeCard` (identity facts by disclosure; *Always-outward standing (renown + competence)* l.226-233; the digest's influence/traits self-only l.303-322; the observer's contacts label as annotation l.77) → Handoff `social-graph.md`. One-line note left
- `## The disclosure model` → the five numbered points (84–122, 39) — code: `who.yaml` (*there is no "appear offline"*), `describeFor` per pair, `privacy.showStatus` = `anyone | contacts+` with the setting's own text *"privacy is a disclosure floor, never a way to vanish"* (`NotifyPolicy.ts:164-175`), no `privacy.showCountry` anywhere → Handoff `social-graph.md`. Note left; `### Settings shape (sketch)` KEPT (`showSpecies` open)
- `## The verb surface` → the verb table (147–153, 7) · `### `profile <player>` / `finger` — the card` (169–184, 16) · `### score / me — the self-dashboard` (186–193, 8) · `### The standing split` (195–204, 10) — code: `profile.yaml`, `score.yaml`, `ProfileLogic.ts:144-235` (card) / `:290-325` (digest, empties hidden) → Handoff `social-graph.md` (the standing-split table verbatim; the verb table's content is in the three YAML helps)

### Superseded — cut
- `## Server design` (208–229, 22) — by the code: the composer is `SocialApi.composeCard` / `composeRow` on `ProfileLogic` (not a `ProfileApi`); the online set is `SocialApi.online()` (`WhoController.ts:51`), no `PresenceApi`; `privacy.*` lives on `NotifyPolicyMixin`'s settings. Heading + note left
- `## Client design` → *`who` — a live card* (235–239, 5) — by `card-surface.md § Inspection is ONE row`: `who` ships **static** because nothing wakes on connect/disconnect and a live `who` would be permanently wrong while looking right. Struck bullet + note left

### Kept (UNBUILT)
- the status block (re-stamped) · both framing paragraphs · *See also*
- `### Settings shape (sketch)` — `privacy.showSpecies` does not exist (grep `privacy\.` in `packages/server/src/mud`: only `showStatus`)
- `### who — the roster` → the filters bullet (`--group <g>` is not in `who.yaml`'s options) + the density-aggregation bullet (Q7)
- `## Client design` → *`profile` — the inspection card* — `profile.yaml` declares no `opens_card`; the per-viewer subscribable projection is unbuilt
- `## Deferred — invisibility` (see Uncertain)
- `## Open questions` · `## Build order` → Wave 2 (mixed) + *Deferred* · `## What this slate does NOT cover`

### Uncertain — kept
- `## Deferred — invisibility` — `concealment.md` has since shipped a presence-concealment gate (*ConcealableMixin bands, honest-fog seams, `search`*) for in-room perception; whether *"invisible to X = per-pair fidelity floored to zero"* is now the same mechanism, a second one, or still deferred for `who` (which lists every connected player unconditionally, `WhoController.ts:51`) needs a decision. Flagged in `Left`
- `## Open questions` — Q1 (standing split) shipped as the lean; Q3 (`finger`) shipped; Q4 (account age) shipped as a coarse *new-arrival* badge (7-day window, `ProfileLogic.ts:47`); Q5 (idle derivation) answered by `social-graph.md § Idleness — the project standard`; Q8 (hide empties) shipped (`competence.length` / `traits.length` guards). Q2, Q6, Q7 are open. Kept because open questions are spine
- `## Build order` → Wave 2's *`PresenceApi.online()`* bullet — shipped as `SocialApi.online()`; kept inside the mixed block
- Overlaps for the cluster pass: invisibility ↔ `concealment.md` / `stealth.md`; blocking ↔ `comms-slate`

### Handoff (belongs in a doc outside my list)
- → `social-graph.md`, a new section beside *§ Country of origin* (the inspection surface: `who` · `profile`/`finger` · `score`/`me` · the disclosure model), verbatim from the cut sections:

  > ## Principle — three kinds of "values about a person"
  >
  > The load-bearing distinction (and the reason this is *not* one fat
  > `score` command): there are three different kinds of fact about a person,
  > with three different owners and three different privacy semantics.
  >
  > | Layer | Examples | Owner | Privacy semantics |
  > |---|---|---|---|
  > | **Identity facts** | persona/name-as-presented, species-as-presented, country of origin, account age, online/idle status | The person | Disclosure dial (below). Country exempt — always public. |
  > | **Measured standing** | renown, influence (play/make/fund), competence, traits | The world (derived) | Outward measures public; internal measures self-only. |
  > | **Private opinion** | your regard for them, your contacts label for them | *The observer* | Always private to the observer; never on the subject's card. |
  >
  > The codebase already votes for keeping these separate — there is no
  > monolithic score verb; there are `standing`, `traits`, `competence`,
  > `chronicle`, each a thin per-subsystem self-view. This slate adds the
  > **identity-facts surface** (the card + the roster) and a self-dashboard
  > that *digests and links to* the standing verbs rather than absorbing
  > them. Private opinion stays on the observer's side.

  > ## The disclosure model (the heart of this slate)
  >
  > Privacy is **not** a set of hide-flags. The model:
  >
  > 1. **Presence is a public fact.** If you are online, you are on the `who`
  >    list. Always. There is no "appear offline" toggle. Hiding your
  >    *existence* is a future, privileged, conditional capability
  >    (invisibility — see Deferred), never an ordinary setting.
  >
  > 2. **Fidelity is per-(observer, observed) pair.** What a given viewer
  >    sees about you is a function of the *relationship* — have they been
  >    introduced to you (recognition), are you in their contacts, do you
  >    share a group — layered over a baseline. A stranger sees you as "a
  >    tall stranger — from Brazil"; someone you've introduced yourself to
  >    sees "Duncan — from Brazil." Same presence row, different resolution.
  >    This is exactly the `RecognitionApi.describe` lens, applied to the
  >    roster and the card.
  >
  > 3. **Privacy is what you offer *without friction*.** A privacy setting is
  >    the *floor* of disclosure — what any stranger gets by default. It
  >    never reaches "nobody," and it is not a per-field boolean. The shape
  >    is a **per-attribute disclosure threshold**: each soft attribute names
  >    the relationship tier that unlocks it (`anyone` / `introduced+` /
  >    `contacts+`). Raising a specific person above the floor is an *act* —
  >    which is what `introduce` already is.
  >
  >    > **`introduce` is the first disclosure consumer because it *is* the
  >    > model in miniature.** Disclosure is an act you direct at someone
  >    > (handing them your name); the "setting" is just the default for
  >    > everyone you haven't performed that act toward.
  >
  > 4. **Country is exempt — pinned at maximum, non-overridable.** Given the
  >    political premise of the game, country of origin is load-bearing
  >    world-fact, not a personal detail to curtain. It shows on every card
  >    and every roster line, to everyone, always. No `privacy.showCountry`.
  >
  > 5. **Inbound vs outbound — don't conflate.** `social.verbosity` (shipped)
  >    is the *observer's* preference for how much presence-noise they
  >    receive. The disclosure dial is the *observed's* control over how much
  >    of themselves others receive. Same surface area, opposite directions.
  >    They are distinct settings.

  > ### The standing split — what shows on *others'* cards
  >
  > Recommended default (open to revision):
  >
  > | Measure | On self-card | On others' card |
  > |---|---|---|
  > | Renown | band | **band** (reputation is inherently outward) |
  > | Competence | band | **band** (observable skill — "a skilled bartender") |
  > | Influence (play/make/fund) | band | **self only** (political/economic standing isn't others' business) |
  > | Traits | band | **self only**; others instead get *your* compatibility read (the regard-baseline layer-3 read), never their internal estimate |

  (What shipped, for the doc's *what* line: `WhoController` / `ProfileController`; `SocialApi.composeRow(viewer, target)` / `composeCard(viewer, target)` on `ProfileLogic` as the one redaction seam; `SocialApi.online()`; `privacy.showStatus: anyone | contacts+` declared on `NotifyPolicyMixin`; `card.newness = 'new-arrival'` under a 7-day window; `who` as a static catalogue card.)

### Status block
- Left: *the `who --group <g>` filter · the `privacy.showSpecies` threshold (Q2) · the `profile` card rendered into the inspection card with a per-viewer subscribable projection (Q6 — no `opens_card` today) · account age on the card (Q4) · deferred: invisibility as per-pair fidelity floored to zero* → *the `who --group <g>` filter · the `privacy.showSpecies` threshold (Q2) · the `profile` card rendered into the inspection card with a per-viewer subscribable projection (Q6 — no `opens_card` today) · `who` at scale (Q7) · deferred: invisibility as per-pair fidelity floored to zero (⚠ check against concealment.md)*
- Size: a tail → a tail

---

## Inserts into subsystem docs (all `client-shell.md`, +25 lines)

- top, after the scope box — **Where client code lives** (8 lines) ← client-cockpit-slate § Out-of-scope reminders
- `§ The mobile bar`, after the glance-line paragraph — the 44px tap-target floor + safe areas via `env()` (5 lines) ← client-slate § 3.6
- `§ The honest-state primitives`, after the two carve-outs — **Derive every figure from the data that produces it** / controls branch on the state their copy describes (9 lines) ← client-slate § 3.2

No existing sentence in any subsystem doc was edited.

## Findings outside this batch (not acted on)

- `card-surface.md § The catalogue` says *"the nine shipped rows"*; `CARD_IDS` now has eleven (`stock`, `survey` joined — `house.yaml`, `analyze.yaml`). Doc rot from a later build, not this pass's to fix.
- `card-surface.md § MML identity-tag rendering` shows `case 'item': case 'name': case 'object'`; `MmlRenderer.tsx:133-136` dispatches on `thing` / `location` / `player` / `npc`. Same class.
- `client-shell-slate` *See also* still calls the CMS *"a separate tab"*; the sweep owns index-style lines.
