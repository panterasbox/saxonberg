# Slate-compaction pass — persistence batch ledger

Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `docs/subsystems/persistence.md`.
Note: the prior `unlinked-1` batch already homed the `WarmedIndex`
"cannot live on the `XLogic` singleton" handoff to `architecture.md` —
nothing further needed here.

---

## docs/slates/builds/persistence-architecture-slate.md — 449 → 165 · Status PARTIAL → PARTIAL

Code-verified before any cut: `User extends Document`
(`lib/identity/User.ts:22`), `GoogleProfile extends Document`
(`lib/identity/GoogleProfile.ts:19`), `Template extends Document`
(`lib/stuff/Template.ts:43`), no `class Persistable extends Idea` left
in the tree (only the unrelated, later `PersistableMixin` self-
persistence spine). `PersistentHydrator` still `extends Idea`
(`platform/idea/persistence/PersistentHydrator.ts:52`), `DomainHook.ts`
and `hooks.yaml` still live under `platform/idea/hooks/` (not `obj/hooks/`
as the old status block said) — **Wave 3 is confirmed still unbuilt**,
matching the slate's own claim. `Marshaller` still `extends Idea`
(`lib/persistence/Marshaller.ts:53`). Wave 4 (schema docs) confirmed
fully shipped: 48 files under `packages/server/src/schema/*.yaml`,
`scripts/gen-schema.ts`, `pnpm -C packages/server lint:schema`.

### Cut (SHIPPED · DOCUMENTED)
- Two extra status blocks (`> **Status: Waves 1-2 shipped, audit-grounded...`
  and `> **Audit 2026-08-08 — Wave 3 verified untouched...`, ~34 lines) —
  history; the canonical block covers the same ground. The one live fact
  in the audit block (Wave 3 unstarted, `PersistentHydrator extends Idea`)
  folded into the re-stamped `Left`; the brain-pattern confirmation folded
  into decision 5's parenthetical, pointing at `behavior.md`
- Decisions 1-4 of "The load-bearing decisions" (~30 lines) — doc:
  persistence.md's opening two-track description + § Why is `Document`
  NOT a Stuff. Heading-level pointer left; decision 5 (Wave 3, UNBUILT)
  kept verbatim
- `## Principle` (13 lines) + `### The two relationships` table + para
  (18 lines) + `### Reassignments` (13 lines) + `### What the audit
  found` (18 lines) (~62 lines total) — code: `User`/`GoogleProfile`/
  `Template` all `extends Document` (see above); doc: persistence.md's
  two-track table + § Why is `Document` NOT a Stuff (states the audit
  conclusion verbatim: "An audit confirmed nothing relied on
  `User`/`GoogleProfile`/`Template` being Stuff"). One paragraph left
  naming the code evidence
- `## Open questions` (20 lines, 6 questions) — all six resolved by the
  shipped build: Q1 → the injected resolver seam (persistence.md §
  Marshaller Framework § Resolution); Q2 → yes, the document-store tree
  (`StoredDocument extends Document`, confirmed
  `lib/document/StoredDocument.ts:35`); Q3 → deferred, is Wave 3; Q4 →
  named `Document`, shipped; Q5 → Api/collection/lease layer, confirmed
  in persistence.md; Q6 → no `stuffId`-equivalent (confirmed:
  `Document.ts` carries no such field). One-paragraph pointer left per
  question
- `## Build order` Wave 1 + Wave 2 paragraphs (~10 lines) — shipped, per
  above. Wave 3 paragraph kept verbatim
- `## Once shaped into formal requirements` (22 lines) — this was the
  slate's own pre-build requirements summary; every bullet restates
  decisions already covered above (now shipped) plus one Wave-3 test
  bullet already covered by the kept Wave 3 paragraph. Cut in full, no
  pointer needed (nothing here isn't already said elsewhere in the kept
  body)
- `## Wave 4` body from `> ## ✅ **BUILT...` through `### ✅ What shipped,
  and the one place it differs` (~150 lines: "What is a hard-coded table
  today", "What it buys", "The two things to settle", "Where it would
  sit", "Decided 2026-08-31" table + inventory, "What shipped") — doc:
  persistence.md § Collections, and the schema docs that describe them
  (matches point for point: the four hard-coded tables, the
  generated-not-parsed ruling on `Collections`, the harvested-not-
  restated field list, the six `lint:schema` assertions, the 84 vs 89
  index-count correction). Code: `packages/server/src/schema/*.yaml`
  (48 docs), `scripts/gen-schema.ts`. Heading + one paragraph pointer
  left. `### The tail Wave 4 left` kept verbatim (the slate's own note
  says these two attach points are deliberately NOT moved to the doc —
  design space, not documentation)

### Kept (UNBUILT)
- Title, canonical status block (re-stamped), intro paragraph (the
  "most of what a platform persists is plain document data" framing —
  kept as spine; it's the slate's stated reason for existing)
- Decision 5 (un-Stuffing marshallers/hooks/Hydrator into path-resolved
  modules) — Wave 3, still open
- `### Blast radius` table in full — three of four rows are historical
  (done), but it's one compact table (not paragraph-splittable) and its
  last row (`Un-Stuff marshallers / hooks` — medium–high effort, the
  only Stuff-coupling that's load-bearing) is exactly the Wave 3 scope
  estimate; kept whole rather than surgically split
- `## Build order` Wave 3 paragraph, verbatim
- `## What this slate does NOT cover` — all four bullets still bound
  Wave 3's scope (clone pipeline stays templates.md's, the path-
  resolved-module mechanism is npc-behavior-slate's, access control is
  access-slate's); kept as spine/scope-boundary
- `## Wave 4` heading + `### The tail Wave 4 left` (per-field prose on
  `fieldMeta`; Mongo-side JSON Schema validators) — both explicitly
  un-migrated design space per the slate's own note

### Uncertain — kept
- None. Every section resolved cleanly to SHIPPED·DOCUMENTED, UNBUILT,
  or already-pointed-elsewhere.

### Handoff (belongs in a doc outside my list)
- None. The one candidate (`WarmedIndex` / `PersistableLogic`
  "singleton can't reload" note) was already homed to `architecture.md`
  by the `unlinked-1` batch — verified, not duplicated.

### Status block
- Left: *Wave 3 — un-Stuff `PersistentHydrator`, the marshallers and
  `obj/hooks/` (`DomainHook` + `hooks.yaml`) into path-resolved, lazy,
  re-resolved modules on the shipped brain pattern* →
  *Wave 3 (same scope, corrected path to `platform/idea/hooks/`,
  confirmed still unstarted) · Wave 4's tail (per-field prose on
  `fieldMeta`; Mongo-side JSON Schema validators)* — Wave 4's tail items
  were previously buried 170 lines into an already-BUILT wave section;
  now surfaced in the status line since they're the only other live
  remainder
- Size: *a build* → *a build (Wave 3) · a tail (Wave 4's tail)*
- Status: PARTIAL → PARTIAL (unchanged — still genuine unbuilt work,
  now correctly scoped to exactly what remains)

---

## Findings for the coordinator

- No migrations were proposed anywhere in this slate (checked per the
  "NO MIGRATIONS EVER" instruction) — the one place "migration" appears
  in kept text (`### The tail Wave 4 left` § Mongo-side JSON Schema
  validators) is a caution *against* building one, consistent with
  project rule, not a proposal.
- `persistence.md` itself still says `hooks.yaml` lives at
  `obj/hooks/hooks.yaml` (lines ~261, 280, 950 in the pre-batch file) —
  the real path is `platform/idea/hooks/`. This is a pre-existing stale
  path in the subsystem doc, unrelated to anything this slate asked to
  graduate, so it was left alone (out of scope for a compaction pass —
  flagging for whoever next touches persistence.md's hooks section).
