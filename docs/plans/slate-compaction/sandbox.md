# Slate compaction ledger — sandbox

Batch key: `sandbox`. Slate: `docs/slates/tails/sandbox-slate.md`.
Subsystem docs I may insert into: `docs/subsystems/sandbox.md` only.
Anything belonging elsewhere goes in Handoff, never into another doc.

Verified against: `packages/server/src/mud/**`, `packages/content/**`,
`docs/subsystems/sandbox.md` (the shipped reference — very extensive;
most of the slate's design has a matching "as built" section there,
often in far more detail and precision than the slate carries).

Findings in progress below; cuts land as they are made, per the
incremental-ledger rule.

## `docs/slates/tails/sandbox-slate.md` — 596 → 180 · Status PARTIAL → PARTIAL

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## The doctrine — two channels…` + `## What "anything goes" means — the two gates` + the "Mutation-prohibition is rejected" paragraph — code: the whole write-path/dispatch mechanism these motivate (verified throughout `mud/api/security.ts`, `mud/lib/persistence/CollectionPolicy.ts`, `mud/api/sandbox.ts`); the two-gate framing and the "criminal vs structurally impossible" doctrine were nowhere in `sandbox.md` → inserted `sandbox.md § Doctrine — two channels, two gates` (16 lines)
- "One honest edge" paragraph (circle contains new content, not edits to published source) from `## The test harness — the CMS loop` — code: git-workflow.md's snapshot-and-push finding (unchanged); not stated anywhere in `sandbox.md` → inserted `sandbox.md` as a bullet before "The CMS button rides the command bus" (8 lines)
- `## Shared circles — guests and the group cell` — code: `packages/content/platform/content/studio.yaml` (governance-provisioned `/studio/<groupId>`, subdivide+transfer --group), `SandboxLogic.ts` (`SandboxSession.scope` — "Decision A: host and guests share it"); `sandbox.md` only mentioned `/studio` mirroring `/home` and the guest `revokeUse` witness, never the governance-provisioning decision or the no-home-to-home-trust decision → inserted `sandbox.md § Shared circles — guests and the group cell` (12 lines)

### Cut (SHIPPED · DOCUMENTED)
- `## The mechanism — four containment layers over one magic circle` (Layers 1–4, ~165 lines) — code/doc: matches `sandbox.md §§ The scope taint, The write-path policy table, The roots table, Exempt-singleton classification, The crossing (as built)` almost 1:1, in more precise detail (e.g. the slate's "sparse" index call was refined to "partial" as built). Cut with a pointer. Two bullets kept instead of cut — see Uncertain below.

- `## The ledger walk — first classification, as a PM policy table` + `## The reach walk — every channel of out-of-circle effect` + its roots table + `## Performance posture` (~130 lines total) — code/doc: matches `sandbox.md §§ The write-path policy table (VERIFIED), Read filters/discard/indexes, The roots table (VERIFIED), Exempt-singleton classification` — the shipped doc is the writer-verified successor to this draft classification (e.g. `blueprints`/`wiki`/`media_assets` reclassifications the slate's draft didn't anticipate). Cut with a pointer.

- `## The wardrobe…` para 1 (wardrobe-as-exit, skins, storage-unit-and-key) — code/doc: matches `sandbox.md § The door, the aperture, the harness` ("A wardrobe is a skin, not the class", "The public-booth rule"). Cut with a pointer.
- `## The test harness — the CMS loop` eval paragraph — code/doc: matches `sandbox.md § Jurisdiction-targeted eval (Decision K)` in far more detail (the three fixes the live pass forced: extent-test-by-location not lineage, the scratch's whole life in the jurisdiction root, wire-ness via `resolveEnclosingZoneForPath`). Cut with a pointer.
- "One honest edge" paragraph (already graduated above) — cut, pointer added.
- `## Shared circles — guests and the group cell` (already graduated above) — cut, pointer added.

### Kept (UNBUILT)
- `## The wardrobe…` para 2 ("Minting: …") — mixed paragraph, cannot split per the granularity rule. Confirmed shipped: personal-circle-never-provisioned (`selfHomeOwnerOf`), destroy→reap-then-orphan (`sandbox.md` "Destroy follows from the same split"), one circle from char-gen. **Not found in code**: "move it → portable pocket dimension" and "sell empty/furnished (title + allowance-liability transfer)" — grepped for `sell`, `portable pocket`, `allowance-liability` across `mud/**` and `packages/content/**`; no hits. Kept whole.
- `## The test harness — the CMS loop` para 1 (the authoring loop, CMS launch/embed = Layer 1, brain hot-reload, **the draft overlay composes**) — mixed paragraph. Confirmed shipped: CMS-launch-is-Layer-1, brain hot-reload. **Confirmed NOT built**: draft-overlay compose — `sandbox.md` itself says the `launchTestSession` options bag "reserved for a draft-overlay compose, was never read" and both the endpoint and the bag are deleted; grepped for `draftOverlay`/`draft-overlay`/`changeset.*circle` — no implementation anywhere. This is a genuine open item; kept whole and it is the one item carried into the re-stamped `Left`.

### Cut (SUPERSEDED — by the shipped build)
- `## Phasing` (all of it — the build-cut note, the escape-battery paragraph, and the 7-item phase list) — the whole build shipped in one cycle as documented throughout `sandbox.md`; the two named exclusions (draft-overlay compose, compute billing) are preserved: the first stays represented in the kept test-harness paragraph and the re-stamped `Left`, the second was already covered by the untouched "What this slate does NOT cover" section. Cut with a pointer.

### Kept (UNBUILT) — continued
- Open questions: *Chronicle presentation* (still open — no code renders wire-scoped chronicle deeds differently from field ones; `chronicles` is classified PASS(mark) but the `chronicle` verb's presentation logic wasn't checked further than that).
- Open questions: the carried-forward bullet — **what counts as "power"** for the release gate, **combination exploits**, **instancing**. Grepped for `combination exploit`, `release gate.*power` — no hits; no augment/verb "power" classification system exists for a release gate, and no combination-exploit governance backstop exists. Kept whole (one bullet, three related open sub-questions — not split).

### Uncertain — kept
- Layer 4 "Symmetric" bullet + the "Privacy rider" paragraph (governance inspection channel for abuse) — looked for a `FromModule`-gated logged aperture in `mud/api/sandbox.ts`, `mud/api/security.ts`, `docs/subsystems/governance.md`, `docs/subsystems/civics.md`. Found: `SecurityApi._armInspectionBypass` / `_consumeBypass` exist (the latch), and their doc comment names `SandboxApi.inspect` as "the sole caller" — but no `inspect` method exists anywhere in `mud/api/sandbox.ts` or `SandboxLogic.ts`. So the latch is wired but nothing arms or calls it: the governance inspection aperture is **half-built**, not shipped. Kept verbatim (not cut) with a verification note added beneath, since I cannot tell whether this is a known gap, in-flight work, or dead code. **Flag for the coordinator** — this may warrant a small follow-up build/plan item rather than living in a slate.

### Status block
- Status: PARTIAL → PARTIAL (real open items remain — not ABSORBED)
- Left: *chronicle presentation of wire deeds · in-circle accountability + consent · disposition symmetry · SHADOW read composition + scope-keyed unique indexes · what counts as "power" at the release gate · draft-overlay compose + the CMS test button* → *chronicle presentation of wire deeds · what counts as "power" at the release gate + combination exploits + instancing · draft-overlay compose · circle transfer (move/sell an owned circle) · the governance inspection aperture's missing caller*. (Accountability+consent, disposition symmetry, SHADOW mechanics, and the CMS test button all resolved/shipped and dropped; circle transfer and the inspection-aperture gap are newly surfaced by this pass.)
- Size: a tail → a tail (unchanged — still small and opportunistic)

## Final check
- `git diff --stat`: only `docs/slates/tails/sandbox-slate.md` and `docs/subsystems/sandbox.md` touched (plus this ledger, new file).
- Every heading/paragraph removed from the slate is accounted for above.
- The status block's `Left` and the remaining body agree (verified by re-reading the compacted file).
- No file outside the batch assignment was modified. No commit made.

