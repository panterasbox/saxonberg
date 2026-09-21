# Slate-compaction ledger — batch: chronicle

Insert-doc (may write): `docs/subsystems/chronicle.md`
Slate: `docs/slates/tails/deed-tags-slate.md`

## `docs/slates/tails/deed-tags-slate.md` — 191 → 185 lines · Status UNBUILT → UNBUILT

Verified against code, not against the slate's own claims. Findings:

- `DeedTag` / `DeedTagCatalogue` — grepped the whole tree
  (`packages/server/src`, `packages/content`): **no such class exists**.
  The dotted-hierarchy closed vocabulary, the three-tier resolver, the
  producer registration, `since`, and the `lint:` gate the slate proposes
  are all still unbuilt.
- `chronicle.tags` is still a flat `string[]`, stamped ad hoc by every
  producer (`ConditionLogic.ts:818,868` → `['death','passage']` /
  `['death']`; `EnrollController.ts:771` → `['founding','enroll']`;
  `IntroduceController.ts:151` → `['social','introduce']`;
  `RecipeKnowledge.ts:49,54` → `['recipe']`; `SpellKnowledge.ts:63` →
  `['spell']`; `Postmortem.ts:194` → `['mortality','burial']`). None use
  the dotted-family shape the slate proposes (`passage.death`,
  `harm.nonconsented`, …). `chronicle.md` already states `tags` is "open
  vocabulary — inert in v1" (line 50) and `who` likewise (line 313) — the
  slate's own status line already points at that same doc, so no new
  graduation is needed there; it is cross-referenced, not shipped.
- ⚠⚠ **The "one real finding" is CONFIRMED STILL PRESENT, unfixed.**
  `CombatLogic.ts` (`runResolutionConsumers`, ~line 5389) still does
  `if (crime) tags.push("crime")` onto the chronicle deed's `tags` array —
  the exact layer-3-leaking-into-layer-1 stamp the slate calls out. This
  is a **different** thing from the accountability ledger's crime
  derivation (`accountability.md`'s `deriveBlame`, which is correctly
  derive-on-read and does not stamp `crime`) — the deed-tag literal string
  is a separate, still-live defect on the *chronicle* side. Confirmed by
  reading `accountability.md` in full: it never mentions this chronicle
  tag, so it isn't documented as fixed anywhere. Kept verbatim; not
  superseded.
- Faith-relevant tags (`aid.treat`, `aid.attend-dying`,
  `harm.nonconsented`, `ritual.attend`) — none exist as producer emissions
  anywhere in the tree. `faith-slate.md` still exists and is not
  superseded. Kept.
- `amendment-library-slate.md` and `lineage-slate.md` (referenced by the
  open questions) both still exist. No supersession.

### Cut (duplicate status block — history)
- Blockquote paragraph beginning `> **Status: decided 2026-08-12, nothing
  built.**` (4 lines, immediately following the canonical `> **Status:**
  … **Left:** … **Size:**` block) — per the pilot calibration ("one
  status block… keep the canonical, cut the rest as history"). The
  adjacent paragraph ("It unblocks two documents that both stalled on
  it…") is substantive framing, not a status restatement, and was kept.

### Kept (UNBUILT) — verified against code, nothing shipped
- `## ⭐⭐⭐ The reframe that decides most of it` — decided doctrine, no
  implementation (no layer-1/layer-2/layer-3 tag-resolution machinery
  exists).
- `## The decision — petition, not override` — no petition mechanism
  exists anywhere (`/compact` document tree has no petition kind found).
- `## The object` — `DeedTag`/`DeedTagCatalogue` do not exist (verified
  above).
- `## Five rules` — no registration/lint gate exists for deed tags.
- `## The migration — and one real finding` — tags remain flat strings
  everywhere (verified above); the `crime` finding is confirmed still
  live in `CombatLogic.ts`.
- `## Faith-relevant tags that do not exist yet` — confirmed absent.
- `## Open questions` (all four) — none resolved: no wire push exists for
  a deed-tag catalogue; no petition-storage decision has been made; the
  `crime` retirement has not been sequenced or done; no path-depth
  convention has been adopted.

### Uncertain
- None. Every section resolved cleanly to UNBUILT via a direct code
  search; no ambiguous cases.

### Handoff (belongs in a doc outside my list)
- None. Nothing graduated — nothing in this slate has shipped, so there
  is nothing to insert into `chronicle.md` or any other doc.

### Status block
- Left: unchanged — *the closed deed-tag vocabulary + its three-tier
  resolver (the topics pattern) · the petition-not-override path ·
  getting `crime` out of layer 1 · the faith-relevant tags that do not
  exist yet*. The body still supports every item verbatim.
- Size: unchanged — *a wave*.
- Status: unchanged — *UNBUILT*.

**Net effect:** this slate is almost entirely still open work; the only
safe cut was a duplicate/superseded status paragraph. Body content
untouched (no rewrite, no reflow).
