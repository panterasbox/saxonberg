# Slate-compaction pass — topics batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `docs/subsystems/topics.md`.
Line numbers below are the ORIGINAL file's (403 lines) unless noted.

---

## docs/slates/tails/console-filtering-slate.md — 403 → 395 · Status PARTIAL → PARTIAL

This slate had already been through one round of correction (visible
"Correction (what shipped)" / "Resolved" blockquotes) from whoever built
console-foundations, so most of its SHIPPED content was already flagged
rather than stated as design. This pass verified those corrections
against the current tree and found the ground moved again *underneath*
them: the S2 topic-taxonomy build (MR!173, memory: `topic-taxonomy-build`)
and the identity-tag-collapse (MR!174) rewrote the topic vocabulary
itself after this slate's corrections were written, and a later client
build replaced the sketched "flat topic checkbox drawer" with a named-
predicate view system with facets. Verified against
`docs/subsystems/topics.md` (§ The seven roots, § Wire push on
session-establish), `docs/subsystems/client-shell.md` (§ One strip, and
every tab is a VIEW over the whole buffer; § `Aether` is a topic list,
and that is a finding; § Composing one), and code:
`packages/client/src/components/{TabStrip,FilterDrawer,GutterStripe}.tsx`
exist; grep for `prose.verbose`, `console.timestamps`, `console.compact`,
sender-filter, and a Ctrl+F search box under `packages/server/src/mud`
and `packages/client/src` found **nothing** — every `Left` item is
confirmed still unbuilt.

**No graduation landed in `topics.md`.** Everything in this slate that
shipped inside topics.md's own domain (the catalogue, the wire push, the
seven-root vocabulary, topic discovery) is already documented there more
thoroughly than the slate ever described — there was nothing left to
insert. What's newly SHIPPED·UNDOCUMENTED from this slate belongs to
`client-shell.md` (the named-predicate `TabStrip`/`FilterDrawer` view
model, the facet-based mute), which is **outside my write list** — but
that doc already carries all of it (it was written by the build that
shipped the feature), so there is nothing to hand off either. This
batch's edits are cuts + pointers only.

### Cut (SHIPPED · DOCUMENTED)
- none as a whole-section removal — every cut below is a partial-section
  replacement (a stale sub-part swapped for a pointer), because each
  section mixes a shipped fragment with a still-relevant unbuilt
  fragment. See the paragraph-level entries below.

### Superseded — cut (with a note in place, not a bare pointer)
- `### Topic toggles`'s topic-list example (96–104 orig, `world.speech.*`
  / `world.perception.*` / `system.shell.*` / …) — by the S2
  topic-taxonomy build: the ~89-topic tree it lists is **gone**,
  collapsed to seven roots / 29 leaves with the cross-cutting axes moved
  to facets. Doc: `topics.md § The seven roots`. Replaced with a note
  naming the new vocabulary and warning that every topic string
  elsewhere in the slate (the UI sketch included) is illustrative, not
  current
- `### Topic toggles`'s "UI shape: … tree of topics, each with a
  checkbox … Shipped as the `FilterDrawer`" paragraph (106–110 orig) —
  by what actually shipped: a tab is a named predicate over facets + a
  topic-mute tree, not a flat checkbox tree. Doc: `client-shell.md § One
  strip, and every tab is a VIEW over the whole buffer`. The still-true
  half (mute persists per-tab via `ClientStateMixin`, not a `settings`
  key) is KEPT verbatim — it was already a correct correction
- `## UI sketch`'s box-drawing drawer diagram (the gear icon + the flat
  `☑ World / ☑ Speech / …` checkbox tree, 284–309 orig) — by the shipped
  facet editor (`client-shell.md § Composing one`). The still-unbuilt
  controls it also sketched (search box, timestamps, compact mode) are
  KEPT as a smaller code block; the right-click paragraph is KEPT,
  reworded only to say "shipped facet editor" instead of "the drawer"
  where it names the configuration surface
- Open question 2, mute granularity (326–327 orig) — by the shipped
  model carrying BOTH axes (a topic-mute tree AND `FacetFilter.topics`)
  — the lean ("both, tree-shaped UI") **held**, so this reads as
  resolved-as-guessed, not wrong-guessed. Doc: `client-shell.md §
  `Aether` is a topic list, and that is a finding`. Note added in place,
  question kept (not deleted) since the resolution is itself worth
  keeping visible
- `## Suggested build order` step 1, "Topic toggles + drawer UI" (370–371
  orig) — by the shipped named-predicate view system (a materially
  bigger, more capable thing than "the load-bearing 80% surface"
  implied). Replaced by a pointer back to the `### Topic toggles`
  section above rather than repeating the citation
- `## Dependencies`'s "MessageApi topic vocabulary" bullet (353–354
  orig) — by the same S2 rewrite; the vocabulary's home moved to
  `TopicCatalogue`/`topics.md`. Reworded in place (not just cut) since
  the bullet's *role* in the list (name the vocabulary dependency) is
  still correct, only its *name* was stale — this is the "statement the
  code proves false" allowance, noted here

### Kept (UNBUILT)
- the status block (re-stamped — see below) · the intro paragraph
  (13–17) · the "Status — core SHIPPED" framing paragraph (19–30,
  unchanged — it already correctly scopes what's left) · `See also`
  (all five targets exist; the `packages/server/src/mud/api/message.ts`
  pointer is left as-is, since topics still ride `MessageFrame`) · the
  `Reconciliation note` (channels resolved, reactions still open —
  unchanged, still accurate)
- `## Principle` (doctrine — see below)
- `## Filtering surfaces` intro paragraph
- `### Search` · `### Sender filter` · `### Family mute (collapse)` ·
  `### Author / admin frames toggle` · `### Verbosity setting` ·
  `### Per-room verbosity memory` · `### Timestamps` · `### Compact
  mode` — all eight confirmed still unbuilt by grep (no
  `prose.verbose`, no `console.timestamps`/`console.compact`, no
  sender-filter UI, no Ctrl+F search, no family-collapse badge, no
  author-frame toggle anywhere in `packages/server/src/mud` or
  `packages/client/src`)
- `## Wire impact` (both subsections — the server/client split is still
  the right shape for the unbuilt items)
- `## Settings keyspace` (the existing correction stands; the knobs it
  proposes — `console.timestamps`, `console.compact`,
  `console.verbosity`, `prose.verbose` — are all still unbuilt)
- `## Non-goals` (doctrine/scope guardrails, still binding)
- `## Open questions` 1, 3, 4, 5 (5 already marked resolved), 6 — all
  either still open or already correctly marked resolved
- `## Dependencies` (reworded per above, otherwise kept)
- `## Suggested build order` steps 2–7 (all still unbuilt)

### Doctrine — kept, labelled
- `## Principle` — *"the server prints everything; the client decides
  what to show"* — validated, not contradicted, by what shipped: the
  named-predicate view model is retroactive (re-sorts history on a rule
  change) precisely because the server never filters. Not an item in
  `Left`

### Uncertain — kept
- none new this batch — every ambiguity found had a confirming doc
  (`topics.md` or `client-shell.md`) to resolve it, so nothing was left
  in a genuinely unknown state

### Handoff (belongs in a doc outside my list)
- none — the client-side facts that shipped since this slate's last
  correction pass (the named-predicate `TabStrip`, the facet editor, the
  topic-mute tree) all live in `client-shell.md` already, written by the
  build that shipped them. Nothing here is SHIPPED·UNDOCUMENTED in a doc
  outside my list; it's SHIPPED·DOCUMENTED-ELSEWHERE, which is a plain
  cut-with-pointer, not a handoff

### Status block
- Status: PARTIAL → PARTIAL (unchanged)
- Left: *transcript search · sender filter · compact mode · timestamps ·
  brief mode / `prose.verbose` · per-room verbosity memory* (6) →
  *transcript search · sender filter · family mute (collapse a topic
  family to a count badge) · author/admin frames toggle · compact mode ·
  timestamps · brief mode / `prose.verbose` · per-room verbosity memory*
  (8) — the body wins: `### Family mute (collapse)` and `### Author /
  admin frames toggle` are both still-UNBUILT sections that were
  unrepresented in the old `Left` line
- Size: a wave → a wave (unchanged — eight small, independent client
  tools; still opportunistic-tool-shaped, not a build)

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `tails/console-filtering-slate.md` | 403 → 395 | PARTIAL → PARTIAL | 6 → 8 | a wave → a wave |

`docs/subsystems/topics.md`: **no changes** — every shipped fact this
slate names is already documented there (or, for the client-view layer,
in `client-shell.md`, outside my write list but already complete). No
other file touched.
