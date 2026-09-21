# Slate-compaction pass — `social` batch ledger

Four slates: `tails/forums-slate.md` · `tails/argument-map-slate.md` ·
`tails/recognition-slate.md` · `builds/identification-slate.md`. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: `forums.md` · `belief.md`. Line numbers below are the ORIGINAL
file's (pre-edit). Every shipped claim was checked against
`packages/server/src/mud/**` and `packages/content/**`, not against the
slates' own markers.

⚠ **Provenance note:** a previous agent on this batch did the research and
verification below and began cutting `forums-slate.md`, then died mid-run.
Its cuts were reverted by the coordinator (uncommitted, so lost with the
session) but its findings file survived at
`/tmp/claude-1000/.../scratchpad/wave8-partial/social.findings.md`. This
session re-verified the load-bearing claims against the code directly
(`Board.ts` organizer union, `Channel.ts` procedure field + comment "the
flag ships, behavior doesn't", `forum.yaml`, grep for `world.forum`,
`ForumsUpdate.ts`) before re-applying the same cuts. All spot-checks
confirmed; nothing in the inherited findings was overturned.

## Findings for the coordinator

- **`recognition-slate.md` cites a heading that no longer exists**: a cut
  Stackable paragraph pointed at `stacks.md § Display rendering —
  DescribeApi.formatName`; `stacks.md` has no such section (headings: The
  mixin · split · absorb · placeDirect · applyQuantity). The paragraph was
  cut (shipped as the `NounPhrase` count, presentation.md), so nothing was
  restored — but any other doc linking that anchor is dangling.
- **`belief.md` had two statements the code proves false; both fixed by
  minimal edit (logged under the recognition slate):** (1) the belief
  referent key is `getIdentityPath()` (`RecognitionLogic.ts:124,196`,
  `BeliefStore.ts:674–781`), not `getTemplatePath()` — every player Avatar
  shares one templatePath, so the old sentence described a key that would
  collapse every player into one record; (2) *"Social-graph crowd
  verbosity"* was listed as a deferred tail, but it shipped as
  `composeOccupants` + the density tiers (`SocialLogic.ts`,
  `lib/social/NotifyRule.ts` `count-only`/`feature-string`;
  social-graph.md § Display lensing).
- **`identification-slate.md`'s ⭐⭐ framing paragraph** (*"there is no
  per-viewer knowledge state over world facts"*) is now partly false — the
  `DISCOVERY` realm is exactly that for found features (belief.md §
  Discovery). Kept verbatim as framing; flagged under Uncertain so
  requirements reconcile rather than inherit it.
- **`identification-slate.md`'s `Left` named `identificationLevel`**, which
  magic-items.md § `knownAttributes`, and the hedge explicitly REJECTS
  (*"There is no `identificationLevel` scalar"*); `knownAttributes` +
  the generation hedge shipped instead. Superseded, cut, `Left` corrected.
- **Overlap for the cluster pass:** identification's instrument seam
  (`analyze X with Y`) ↔ the instrumentation slate — the platform already
  ships `analyze chemistry` / `measure acidity` / `measure density` as
  READOUTS (`content/platform/content/platform/cmd/perception/analyze.yaml`,
  `measure.yaml`) that write nothing to the `IDENTIFICATION` realm. The
  identification slate's design is *the write*; the instrument shape is the
  instrumentation slate's. Kept in both, noted under Uncertain.
- No graduations were needed in this batch: every shipped decision was
  already carried by forums.md / belief.md / presentation.md /
  social-graph.md / magic-items.md. The Handoff sections are therefore
  short.

---

## docs/slates/tails/forums-slate.md — 593 → 247 · Status PARTIAL → PARTIAL

The doc (`forums.md`, 974 lines) already carries every shipped decision in
this slate, usually in more detail. Code checked: `lib/forum/{Subject,Board,
Entry,Vote,ForumEvent,Forums,ForumsUpdate,SubjectSubscriber}.ts`,
`platform/idea/{SubjectCatalogue,ForumSubscriptionRegistry}.ts`,
`platform/idea/api/ForumsLogic.ts`, `lib/social/Channel.ts`
(`procedure: 'open' | 'ordered'`, comment *"the flag ships, behavior
doesn't"* — NO enforcement, no `retention`), `schema/forum_*.yaml`
(five collections; NO `chat_log`), `cmd/social/forum.yaml` (subcommands
`list make on post reply edit read vote mature promote follow`). Grep found
NO `world.forum` topic, NO forum notification/digest path, NO `retention`/
`logged`/`chat_log`, NO reaction bridge on `Entry`.

### Cut (SHIPPED · DOCUMENTED)
- the second status block incl. the *"consciously overrides"* paragraph (10–29, 20 lines) — history; the thesis is forums.md's opening paragraph
- `## The spine` items 1, 3, 4, 5, 7 (83–95, 115–131, 138–142; 36 lines) — code: `Board.organizer`, `Entry.relation`, `ForumsUpdate`, `Vote`; doc: forums.md § The hierarchy, § The four surfaces, § The argument organizer, § The aether capability, § Voting. Items 2 and 6 KEPT (they carry the ephemeral lifecycle + `logged` retention)
- `## Part 0` intro paragraph (148–149, 2) — history
- `### Data model` → `Board` bullet (174–184, 11) — code: `lib/forum/Board.ts` (`override` bag designed-in, inert); doc: § The hierarchy
- `### Data model` → `Entry` bullet (185–197, 13) — code: `lib/forum/Entry.ts`; doc: § The hierarchy, § The typed claim-graph (DAG deferred with dedup)
- `### Data model` → `forum_events` bullet (208–218, 11) — code: `lib/forum/ForumEvent.ts`, `ForumsLogic.recordEvent`; doc: § Source of record, § Persist-then-fire
- `### Data model` → `SubjectCatalogue` bullet (219–226, 8) — code: `platform/idea/SubjectCatalogue.ts`; doc: § SubjectCatalogue
- `### Surfaces` → `ForumsApi`/Logic, the aether capability, the command surface bullets (285–296, 301–305; 17) — code: `api/forums.ts`, `ForumsLogic.ts`, `lib/forum/ForumsUpdate.ts`, `forum.yaml`; doc: § The Apis & module map, § The aether capability, § The verb model
- `### What's actually new vs. reused` (307–326, 20) — a build-planning table; everything in it shipped except the two rows (`chat_log`, the topic genre) still represented by the kept chat-surface bullet
- `## Client architecture` intro (332–337, 6), `### Shell IA` (339–355, 17), `### Writes` (357–380, 24) — code: `backend/inbound/command.ts` `fields`, `CommandLogic.overlayBodyFields`, client `mainView`; doc: § Client channels, § The command body side-channel
- `### Reads` → the trigger/durable-twin bullets + the three persist-then-fire / source-of-record / reads paragraphs (395–426, 32) — code: `ForumSubscriptionRegistry.ts`, `recordEvent`; doc: § The document-change observer, § Persist-then-fire. The section's first paragraph is KEPT for the latent collection-watch deferral
- `## Part 1 — the popularity organizer` (436–456, 21) — code: `lib/forum/Vote.ts`, `ForumsLogic.castVote`, `displayScoreFor`, `sortEntries`; doc: § Voting + the anti-snowball gate. *"Up/down (or single-up — open)"* resolved: up/down toggle
- `## Part 2 — the structure organizer` (460–490, 31) — code: `attachClaim`, `readArgumentLens`, `matureArgument`; doc: § The argument organizer (scale tail → argument-map slate)
- `## How this overrides the prior factoring` (494–517, 24) — reconciliation of two decisions that shipped; doc: § The Subject layer (the Subject entity reinstated), § History
- `## Build sequencing` (521–535, 15) — history (both cycles shipped)
- `## Open questions` → the *Resolved 2026-06-17* paragraph (541–557, 17) — every resolution shipped as stated; pointer left
- Open Q **Subject addressing** (576–577) — doc: § The Subject layer (`title` flat-global for venues, `board/thread` for topics)
- Open Q **Vote shape** (578–579) — code: `castVote` toggle; `ForumsLogic.castVote` refuses on an ordered board; doc: § Voting, § The typed claim-graph
- Open Q **Implant granularity** (580–582) — code: `Avatar.installDefaultLoadout` hosts `ForumsUpdate`; doc: § The aether capability
- Open Q **Read gate** (583–585) — moot: the capability is born-with on every Avatar (`ForumsMixin` confers read + post); doc: § The aether capability
- Open Q **A full surface doc** (592–593) — done (forums.md)
- the `---` separators orphaned by the Part 1 / Part 2 / reconciliation / build-sequencing cuts

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — forums.md already carries the why for every shipped item above

### Superseded — cut
- none as a whole section; the vocabulary drift (`popularity`/`structure`/`free`/`rules-of-order` → `open`/`ordered`) is noted under Uncertain rather than rewritten, per the no-rewrite rule

### Kept (UNBUILT)
- `## The spine` items 2 and 6 — the ephemeral lifecycle class + `logged` retention
- `### Data model` → the `Subject` bullet (the archive cascade: board locks / thread locks / chat seals; the externally-driven ephemeral lifecycle) and the **Chat surface** bullet (`retention: 'ring' | 'logged'` + `chat_log`; the procedure mode)
- `### Subjects, surfaces & lifecycle` (whole, incl. the bill worked through + the diagram) — the ephemeral bill design; the intro + Standing bullet kept as the contrast the Ephemeral design is written against
- `### Surfaces` → **Notifications over aether** — no `world.forum.*` topic, no ESP frame, no digest exists (forums.md: *"there is no notification inbox yet and `follow` is passive"*)
- `### Reads` → first paragraph — the latent collection-watch abstraction (also in forums.md § Open questions; kept because it is backlog, not a shipped decision)
- `### Notify — aether push frames`
- Open Qs: subscription query/pagination · procedure mode · lifecycle trigger / governance seam · chat-log bounds · root-entry shape (mixed — the root-as-`parent: null` half shipped, the link-vs-text submission distinction did not; kept whole) · reactions on entries

### Uncertain — kept
- Vocabulary in every kept section is the PRE-Wave-6 one: `'structure'`/`'popularity'` (now `'ordered'`/`'open'`), `'free'`/`'rules-of-order'` (now `procedure: 'open' | 'ordered'`, `lib/social/Channel.ts:36–100`), `--rules` (now `--ordered`). Not rewritten (cuts only); requirements should read the kept design with forums.md § The four surfaces open.
- The **Subject bullet**'s archive cascade is PARTLY built: `Board.archived` exists (`lib/forum/Board.ts:32`) and the content installer's archive-never-reap flips `Subject.state` (`SubjectCatalogue.ts:98`), but no thread-lock / chat-seal cascade and no external (bill) driver. Kept whole per the paragraph rule.
- Overlap for the cluster pass: the ephemeral bill lifecycle + governance trigger ↔ the Compact-governance / cooperative slate; the `logged` chat retention ↔ the chat slate.

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *the ephemeral bill lifecycle · the rules-of-order procedure mode · the latent collection-watch abstraction* → *the ephemeral bill lifecycle + archive cascade + the governance trigger · chat `logged` retention + `chat_log` · the rules-of-order (`procedure: 'ordered'`) chat discipline · notifications over aether (`world.forum.*` frames + the offline digest) · the latent collection-watch abstraction · the subscription query/pagination model · root-entry shape · reactions on entries*
- Size: a wave → a wave

---

## docs/slates/tails/argument-map-slate.md — 354 → 141 · Status PARTIAL → PARTIAL

Nearly every shipped decision is documented in forums.md § The argument
organizer (cycle 2), lines 356–491, which describes the claim-graph,
store/lens split, live reads, editing, the mature→vote seam, and the
verbs in more implementation detail than this slate carried. Code checked:
`lib/forum/{Board,Entry,ForumsUpdate}.ts` (`BoardOrganizer = 'open' |
'ordered'`), `platform/idea/api/ForumsLogic.ts` (`matureArgument`,
`editBody`, `readArgumentLens`), `ForumSubscriptionRegistry.ts`
(`projectArgumentNodes`, `resolveCircle`), `forum.yaml` (`reply
--pro/--con/--rebut`, `mature`). Grep confirmed **no time-box / automated
convergence / anti-railroad code anywhere** — `mature` is a bare
owner-gated manual verb call, so the v1 slice shipped *simpler* than the
slate's "convergence by time-box" description (see Superseded below).

### Cut (SHIPPED · DOCUMENTED)
- 4 duplicate status/narrative blocks (11–52, 42 lines: "v1 SHIPPED", "Status: the model…", "Factoring superseded…", "Update 2026-06-18…") — history; the canonical block (3–10) already carries the pointer, and the substantive content is either restated in the kept intro paragraph or in the sections below
- `## The spine` items 1, 5, 6 (91–96, 107–119; 19 lines) — code: `Board.ts` organizer union + `ForumsLogic.castVote` refusal on ordered boards, `forum_events` append-only log, `projectArgumentNodes` zeroing `up`/`down`/`score`; doc: forums.md § The argument organizer intro ("Nothing is ranked here"), § Source of record, § Store/lens split ("reputation-blind")
- `## The data model — a typed claim-graph` (123–142, 20 lines) — code: `Entry.relation`; doc: forums.md § The typed claim-graph (near-verbatim: root spine, node-role-from-edge, strict tree v1/DAG deferred)
- `## The substrate — the structure organizer over Board/Entry`, incl. the three provisional model decisions (144–187, 44 lines) — code: `Board.organizer`, `Entry.relation`, `ForumController.valence()`; doc: forums.md § The typed claim-graph (`responds-to` neutral edge), § The mature → vote seam (spine-is-any-prose-thesis, decoupled `mature` event), § The verbs
- `## Standard-model situation` (189–199, 11 lines) — code: `Subject`/`Board`/`Entry` as `Document`s, `GroupRef` via `Subject.groupRef`; doc: forums.md § The Subject layer, § Source of record
- `## Mechanics` bullets 1–2 (Navigation is structural; Contribution = attach a typed node) (203–209, 7 lines) — doc: forums.md § Store/lens split (default lens), § The verbs (`reply --pro|--con|--rebut`)
- `## Reading the map` intro paragraph + first two bullets (The record; The default lens) (220–234, 15 lines) — doc: forums.md § Store/lens split (dumb relation store, neutral default lens spine-first-grouped-by-valence)
- `### The two triage sources` (whole, 249–266, 18 lines) — code: `buildArgumentLens` (open-objection), `ForumSubscriptionRegistry.resolveCircle` (`inCircle`); doc: forums.md § Store/lens split ("Open objection — the one dual-use metric", "Delegated attention — the circle highlight", near-verbatim)
- `### One metric, two jobs` (268–274, 7 lines) — doc: forums.md § Store/lens split ("Open objection — the one dual-use metric" already covers the dual-use framing; the still-deferred automated-convergence half is tracked in `## The hard problems`, kept)
- `## Buildable now — the small-scale slice (v1)` (323–343, 21 lines) — this is the v1 slice as shipped; doc: forums.md § The argument organizer (whole section). One bullet ("convergence by **time-box** (no automated maturity-detection yet)") is SUPERSEDED rather than plain-shipped: no time-box of any kind exists in code — `matureArgument` is a bare owner-gated manual call (`ForumsLogic.ts:471`), simpler than what this bullet described. Noted, not restored (the doc's `### Deferred` section still lists "automated convergence-detection" as open, which is accurate)
- `## Open problems` → **A full surface doc** bullet (353–354) — done, forums.md exists; replaced with a pointer

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — forums.md's argument-organizer section already carries the why, in more implementation detail than this slate

### Superseded — cut
- `## Buildable now` → the "convergence by time-box" bullet, folded into the cut above rather than left standing alone (see note): the v1 slice shipped with a manual `mature` verb only, no time-box/timer of any kind. forums.md § Deferred still correctly lists "automated convergence-detection (+ anti-railroad floor)" as open, so nothing here needed restoring.

### Kept (UNBUILT)
- `## The spine` items 2, 3, 4 — "Dissent is a node, not a downvote" (doctrine: delete isn't merely undesired, it's simply not implemented — `editBody` is body-only, re-parent/merge/split/delete deferred with dedup); "Contribute as equals; decide by weight" (mixed — contribution-as-equals ships, but the weighted-vote consumer it points to does not exist); "The failure mode is bad-faith content" (doctrine motivating the still-open moderation problem)
- `## Mechanics` bullets 3–4 — "Convergence-detection + a time-box" (no time-box/automated-maturity code exists — genuinely unbuilt, not merely a documentation gap) and "The map informs; it doesn't decide" (references the undelivered vote/measure layer)
- `## Reading the map` → the "Your lens — free" bullet + the "Why a free personal lens is not the gameability hole" paragraph — only the default lens ships; per-viewer custom lenses (sort/filter/tour/summarize) do not
- `### The explorer is plural` + `**The split as a build boundary**` paragraph — the plural-lens explorer is explicitly deferred (forums.md § Deferred: "the rich plural-lens explorer")
- `## The hard problems (the open work)` — whole section; every item (claim dedup, map-summarization, convergence-detection, moderation, proposal version-control, editing & refactoring) is still listed as deferred in forums.md § Deferred
- `## Open problems — deferred to scale` — whole section minus the resolved bullet (see cut above); kept as-is even though its five remaining bullets duplicate `## The hard problems` almost exactly (see Uncertain)

### Uncertain — kept
- `## Open problems — deferred to scale`'s five remaining bullets are near-verbatim duplicates of `## The hard problems (the open work)`'s five bullets (same five topics, shorter phrasing). Not merged — the skill's mandate is cuts against shipped/superseded code, not deduplicating live UNBUILT content, and merging would cross into rewriting. Flagged for the coordinator / a later cluster pass to fold one into the other.
- `## The spine` item 3 ("Contribute as equals; decide by weight") is a single paragraph mixing a shipped fact (one-person-one-voice contribution — confirmed, no vote-weighting on `Entry`) with an unbuilt one (the weighted vote consumer). Kept whole per the no-split-a-paragraph rule.

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: *claim dedup / canonicalization · integrity-grade summarization · automated convergence detection · proposal version-control · the vote consumer · the plural-lens explorer* → *claim dedup / canonicalization · integrity-grade map-summarization · automated convergence-detection (+ the anti-railroad floor) · mass-scale moderation of claim quality · proposal version-control + map re-anchoring · editing & refactoring · the vote consumer · the plural-lens explorer* (two items — moderation, editing & refactoring — added: both are represented in the kept `## The hard problems` body and were previously unrepresented in `Left`)
- Size: a wave → a wave

---

## docs/slates/tails/recognition-slate.md — 544 → 166 · Status PARTIAL → PARTIAL

belief.md (462 lines) is a near-total rewrite/graduation of this slate,
usually with more implementation-accurate detail. Two statements in
belief.md itself proved false against the code and were fixed here
(minimal edits, not new content):

1. belief.md § The spine said *"Keyed on `referent.getTemplatePath()`"*.
   `RecognitionLogic.ts:124,196,364,494,502` all key on
   `target.getIdentityPath()`. Per CLAUDE.md's own antipattern entry,
   every player `Avatar` shares one `templatePath` — had the doc's
   claim been the actual mechanism, every player would collapse into
   one shared recognition record. Fixed the sentence and its rationale
   (avatars now correctly described as having a *minted identity*, not
   a *unique template path*).
2. belief.md § Deferred tails listed *"Social-graph crowd verbosity"*
   as still deferred. It shipped as `SocialApi.composeOccupants` +
   `NotifyRule`'s density tiers (`count-only`/`feature-string`),
   documented in `social-graph.md § Display lensing`. Fixed with a
   pointer; did not restore the slate's paragraph describing it (see
   Cut below).

Code checked: `platform/idea/api/RecognitionLogic.ts`,
`lib/belief/BeliefStore.ts`, `platform/idea/cmd/social/IntroduceController.ts`,
`platform/idea/api/SocialLogic.ts` (`composeOccupants`),
`lib/social/NotifyRule.ts`, `docs/subsystems/{social-graph,pets}.md`. Grep
confirmed **no** `describeSalientFeatures`/`distinctiveFeatures` anywhere
in the tree — the richer salient-feature algorithm never shipped (the
shipped mechanism is the much simpler bare-stem/species fallback belief.md
describes).

### Cut (SHIPPED · DOCUMENTED)
- the second `> **Status (2026-06):**` narrative block (11–20, 10 lines) — history; the canonical block already covers it
- `## Principle` (58–72, 15 lines) — code: `RecognitionLogic.describeFor`; doc: belief.md intro ("Two composable axes"), § Three concerns that meet only at the naming step
- `## The DescribeApi v2 pipeline` incl. the Stackable paragraph (76–133, 58 lines) — code: `RecognitionLogic.ts` (visibility gate, masked, recognition+identification compose); doc: belief.md § The compose seam (the shipped 5-step algorithm). The Stackable paragraph's link (`stacks.md#display-rendering--describeapiformatname`) is a **dangling anchor** — `stacks.md` has no such heading (see Findings) — cut anyway since the fact itself (count enters the noun phrase, decorations wrap it) shipped as the `NounPhrase` count (presentation.md)
- `## Self-presentation vs. viewer-perception …` incl. `### StatusMixin` (136–201, 66 lines) — code: `Stuff.getPresentation()`, `lib/status/Status.ts`; doc: belief.md § The compose seam Home note, § StatusMixin. **Superseded in one detail**: the slate's entry point `PerceptionApi.describe(viewer, target)` is not what shipped — the Api OO sweep retired it onto `Stuff.describeFor()` directly (belief.md's own Home note documents the retirement)
- `## The recognition store — viewer-side` incl. `### What populates the store` + `### Persistence` (205–257, 53 lines) — **superseded in shape**: shipped as the realm-namespaced `BeliefStoreMixin` (`Map<string, BeliefRecord>` keyed `` `${realm}:${referent}` ``), not the sketched `viewer.knownPeople: Map<Stuff, RecognitionRecord>`; doc: belief.md § The spine, § Persistence (which also solves every persistence concern raised — per-record write-through, lazy hydrate, GC — the "flagged for follow-on" note is stale). Also: the table listed "Third-party identification (v2)" as deferred, but `IntroduceController` already supports `introduce <subject>` third-party in v1 (requires the actor recognize the subject) — shipped earlier than planned
- `## Disguise — Wearable with a perceptual shadow` (261–293, 33 lines) — **superseded**: belief.md carries an explicit stale-doc note naming this exact design (*"the recognition-slate's `getPresentedIdentity`-shadow design) is superseded. Recognition is NOT a Shadow… disguise is NOT a shadow on the synthesizer"*) — shipped instead as `getPresentation()` deferring to `getDisguise()`; doc: belief.md § Disguise
- `## Worked scenarios` (A/B/C, 356–416, 61 lines) — illustrative only; every mechanism they demonstrate (introduce, hood, bucket-collapsed crowd) is shipped and documented above and in social-graph.md
- `## What this stresses for existing slates` → DescribeApi v2 / Perception subsystem / Embodiment slate / Social graph / Persistence framework subsections (421–452, 32 lines) — all either history (DescribeApi retired), superseded (Perception entry point moved, disguise isn't a shadow), or resolved (social-graph.md ships bucket verbosity; belief.md ships per-record persistence). `### MQL` subsection KEPT (still open)
- `## Open questions` items 1, 2, 9, 10, 11 (463–465, 477–483) — code/doc: item 1 → belief.md § Recognition triggers; item 2 → belief.md § The spine ("same-Stuff = same record" via `describeFor`'s lazy-GC'd store); item 9 → belief.md § Persistence (`keepsPersonalRegard`, `Cast.postRegister`); item 10 → [pets.md § Belief, recognition, age](../../subsystems/pets.md#belief-recognition-age); item 11 → belief.md § Recognition triggers (`IntroduceController` writes every scene recipient)
- `## Build order` (whole, incl. Adjacent/future, 496–530, 35 lines) — history; every wave shipped (Wave 4's "bucket-keyed verbosity" via social-graph.md/`composeOccupants`); the Adjacent/future bullets duplicate the kept Open Questions / Left with no unique content
- `## What this slate does NOT cover` → the persistence-layer-redesign bullet (543–544) — resolved; replaced with a pointer to belief.md § Persistence

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — belief.md already carries the why for everything shipped above, generally in more implementation detail than this slate had

### Superseded — cut
- (folded into the Cut entries above with their specific superseding note: the DescribeApi/PerceptionApi entry-point rename, the disguise-as-shadow design, the `RecognitionRecord`/`viewer.knownPeople` store shape, third-party introduction shipping in v1 not v2)

### Kept (UNBUILT)
- `## Salient-feature description generation` (whole) — genuinely unbuilt: no `describeSalientFeatures`/`distinctiveFeatures` anywhere in the tree; the shipped fallback (belief.md § compose seam step 4) is the much simpler bare-stem/species-fallback, so this richer author-curated design remains open work, not a stale description of something that shipped
- `## MQL handling for unrecognized actors` (whole) — matches belief.md § Deferred tails ("MQL compound feature-handles")
- `### MQL` (under "What this stresses…") — same open item, kept as-is (duplicate of the section above; not merged, see Uncertain)
- `## Open questions` items 3, 4 (contradicted note added), 5, 6, 7, 8, 12 (contradicted note added), 13, 14
- `## What this slate does NOT cover` — the rest of the list (scope-fencing against sibling slates, still accurate)

### Uncertain — kept
- Open Q 4 (disguise sophistication): the feature-by-feature coverage MECHANISM shipped, but only a hood ships as content (no heavy cloak / full illusion) — kept with a note rather than cut, since "richer disguise content" is a real remaining gap
- Open Q 12 (faking identity): ⚠ **contradicted by what shipped** — `IntroduceController` self-introduction always uses `actor.getName()` (the true name); there is no way to introduce yourself as anyone else in v1, so the open question's premise ("recorded as Carl in v1") is false. Kept per the "kept-but-contradicted goes in Uncertain" rule, corrected in place
- **Code finding, not touched (out of scope for a docs-only pass):** `IntroduceController`'s third-party branch resolves the introducee's recognition record via `introducee.getTemplatePath()`, while `RecognitionLogic` everywhere else keys belief records on `getIdentityPath()`. If an Avatar is ever the third-party subject of an introduction, this looks like a live key mismatch (the same class of bug CLAUDE.md flags for `getTemplatePath()` on a PERSON). Flagged for the coordinator / a future code review; not a docs cut
- `## What this stresses for existing slates § MQL` duplicates `## MQL handling for unrecognized actors` almost entirely — not merged (see argument-map-slate's identical judgment call), flagged for a later cluster pass

### Handoff (belongs in a doc outside my list)
- → `social-graph.md` and `pets.md`: no new graduation needed — both already carry the shipped decisions this slate pointed at (`composeOccupants`/density tiers; pets' `Belief, recognition, age`). Listed here only because they're outside my write list, not because anything is missing from them.

### Status block
- Left: *player-set nicknames (`name X as Y`) · memory decay · voice/scent recognition · MQL compound feature-handles · the aether id-aug ambient trigger* → *player-set nicknames · memory decay · voice/scent recognition · algorithmic salient-feature generation (author-tunable per-species templates) · MQL compound feature-handles · richer disguise content (heavy cloak / full illusion) · faking identity + a suspicion mechanic · cross-character recognition sharing · the aether id-aug ambient trigger* (salient-feature generation, richer disguise content, faking/suspicion, and cross-character sharing added — all represented in the kept body and previously unrepresented in `Left`)
- Size: a wave → a wave

---

## docs/slates/builds/identification-slate.md — 523 → 345 · Status PARTIAL → PARTIAL

The substrate half shipped, largely in a **simpler, different shape**
than this slate designed (no `identificationLevel` scalar, no
appearance-keyed signature, no shadow-based item illusion) — belief.md
§ Identification and magic-items.md § `knownAttributes`, and the hedge
are the authoritative record. Code checked:
`lib/identification/Identifiable.ts` (doc comment: *"v1 is binary…
partial identification and the pedagogical instrument seam… are a
separate later build"*), `lib/belief/BeliefStore.ts` (`knownAttributes`,
explicit *"no `identificationLevel` scalar"* comment),
`platform/idea/api/MagicLogic.ts` (`knownAttributes` writer),
`content/platform/content/platform/cmd/perception/analyze.yaml`
(`analyze chemistry`/`electrical`/`response`/`weapon`/… as pure
readouts). Grep confirmed **no** `IllusionOverlay`, `commonKnowledge`,
or `describeSalientFeatures`-equivalent anywhere in the tree.

### Cut (SHIPPED · DOCUMENTED)
- the second `> **Status (2026-06):**` narrative block (11–21, 11 lines) — history; the canonical block already covers it
- `## Principle` (80–104, 25 lines) — code: `Identifiable.ts` (class-not-instance keying, the inversion of the recognition direction); doc: belief.md § Identification
- `## The identification store — viewer-side` incl. `### Identification signature` + `### Partial identification` (108–173, 66 lines) — **superseded**, not merely undocumented: the `identificationLevel: 0..1` scalar and the `templatePath + appearance` signature never shipped; belief.md/magic-items.md explicitly reject a stored fraction-of-knowing ("A stored percentage of knowing is exactly the shape this codebase avoids") and defer appearance-keying. Doc: belief.md § Identification, magic-items.md § `knownAttributes`, and the hedge
- `### \`read scroll of identify\`` (181–186, 6 lines) — code: `IdentifyScroll`, `IdentifiableMixin`; doc: belief.md § Identification ("one thin trigger: a scroll of identify")

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — belief.md / magic-items.md already carry the why, generally in more implementation-accurate detail

### Superseded — cut
- `## DescribeApi v2 integration` + `### Examples` (230–264, 35 lines) — the pipeline example composes a continuous partial-attribute prose ("smells minty and tastes sweet") off `identificationLevel >= threshold`, neither of which exists; the shipped shape is binary (`IdentifiableMixin`) + the generation-hedge (magic-items.md). Doc pointer: belief.md § Identification, magic-items.md § `knownAttributes`, and the hedge
- `## Misidentification` (290–314, 25 lines) — **False identification** shipped as `payload.believedName` (a cursed identify scroll plants a false name); **decay (v2)** shipped instead as the generation-stamp hedge, not a time/level decrement. Doc: magic-items.md § `knownAttributes`, and the hedge; belief.md § Identification
- `### Recognition slate`, `### Disguise / illusion`, `### Persistence` (under "What this stresses…", 404–420, 17 lines) — all three are now literally the same substrate (belief.md's `BeliefStoreMixin` serves both realms with one persistence design); the disguise cross-reference specifically pointed at the shadow mechanism belief.md's own stale-doc-note rejects
- `## Open questions` #1 (signature shape), #4 (cursed items), #8 (confidence intervals) — each corrected in place with a one-line "resolved differently, shipped" note + doc pointer rather than deleted outright, since each open question's *remaining* half (appearance-keying for #1) is still genuinely open — see Kept
- `## Build order` → Wave 1 (substrate, 480–482) — shipped as `BeliefStoreMixin`'s `IDENTIFICATION` realm, not the sketched `IdentificationRecord`/`IdentificationApi`; `examine X` bullet under Wave 2 — did not ship as designed (`examine` is now a plain `look` alias per CLAUDE.md's verb table, no level-bump exists since no level exists); `learn from teacher`/propagation kept (still open) but "Misidentification handling (cursed/disguised items)" bullet under Wave 4 — shipped (see Open Q #4); "Identification decay" + "Partial-confidence display" under Adjacent/future — both superseded by the generation-hedge (same as Open Q #8)

### Kept (UNBUILT)
- `### \`analyze X with Y\`` through `### \`compare X to Y\`` (the rest of Identification triggers) — genuinely unbuilt; `analyze X with Y` annotated with the overlap note (readout verb ships generically, the identification-realm *write* does not — see Uncertain/overlap)
- `## Item disguise / illusion` — no item-illusion code exists at all; kept, annotated that its shadow-based design is likely the wrong shape given the creature-disguise precedent (belief.md's own correction)
- `## The pedagogical seam` (whole, Chemistry/Biology/Physics/Geology) — the vision for the still-unbuilt instrument-seam write; nothing here shipped as an identification mechanism (the readouts it imagines exist for other purposes, not for writing belief)
- `### Material substrate (race.md)`, `### Quantities slate`, `### Activity slate` (under "What this stresses…") — all still bear on the unbuilt instrument seam
- `## Open questions` #1 (appearance-keying half), #2, #3, #5, #6, #7, #9, #10, #11, #12 — all genuinely undecided/unbuilt
- `## Build order` → Wave 2's `taste X`/`drink X`/`wear X`, Wave 3 (whole), Wave 4's `learn from teacher`/propagation/common-knowledge, Adjacent's place-memory
- `## What this slate does NOT cover` (whole) — scope-fencing against sibling slates/layers, still accurate

### Uncertain — kept
- The **See also** bullet pointing at recognition-slate.md still describes the cut `RecognitionRecord`/`PerceptionMemoryRecord` shape ("same record; name to be reconciled") — stale now that both slates' store designs were superseded by `BeliefStoreMixin`. Not edited: the skill's minimal-false-statement-fix allowance is for the subsystem docs on my write list, not for rewriting slate prose outside a cut. Flagged for the coordinator; the link itself is still valid.
- The `## Identification triggers § analyze X with Y` overlap with the instrumentation slate (readout verb ships, identification-write doesn't) — same overlap already logged under the recognition-slate.md batch findings; kept in both slates per that finding

### Handoff (belongs in a doc outside my list)
- none — magic-items.md already carries the graduated decisions (`believedName`, the generation hedge, the `knownAttributes`/no-scalar rule) this slate pointed at; nothing needed adding there

### Status block
- Left: *the instrument seam (`analyze X with Y`) · partial identification (`identificationLevel`) · the experience/social ID verbs (`taste`, `learn from`) · misidentification + cursed items* → *the instrument seam that WRITES to belief · appearance-keying · the experience/social ID verbs (`taste`/`drink`/`wear`, `learn from teacher`, `compare`) · item illusion / mimic disguise · place-memory · common-knowledge defaults · identification as quest reward · forced-identification-by-ownership · cross-character sharing* (partial-identification and misidentification+cursed-items removed — both shipped, in a different shape than planned; six items added to represent sections already in the body but previously unrepresented in `Left`)
- Size: a build → a build
