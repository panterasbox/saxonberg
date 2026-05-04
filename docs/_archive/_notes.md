# Documentation Cleanup — Working Notes

**Status**: synthesis in progress. Audit reports staged in `_audit/`. Originals
left in repo root until every new doc is written and reviewed; do NOT delete
anything from `/home/bobalu/play/saxonberg/*.md` until the very end.

This file is scaffolding. It (and `_audit/`) get deleted as the final step.

---

## Goal

Replace a sprawling set of 13 root-level Markdown docs with a tight `docs/`
tree. Every preserved or newly-authored doc must be validated against current
code. The two docs that stay at root are `CLAUDE.md` and `README.md`.

## Target structure

```
docs/
  vision.md                  ← from Saxonberg.md (light rewrite of two sections)
  architecture.md            ← merge of ARCHITECTURE_PATTERNS + IMPLEMENTATION_GUIDE
                               (CONSISTENCY_REVIEW is dropped — already obsolete)
  antipatterns.md            ← light rewrite of ANTIPATTERNS.md
  subsystems/
    templates.md             ← heavy rewrite of CMS_TEMPLATE_PATTERN.md
    persistence.md           ← rewrite from scratch (PERSISTENT_PATTERN.md fictional)
    lifecycle.md             ← from PROTECTED_LIFECYCLE.md, scope-expanded
                               to cover full create→destruct lifecycle
    messaging.md             ← light rewrite + reframe of MESSAGING_REQUIREMENTS.md
                               (drop "requirements" framing — it's built)
    call-security.md         ← heavy rewrite with substantial salvage from
                               CALL_SECURITY.md (~50% accurate, ~25% trim, ~25% cut)
    state-model.md           ← heavy rewrite of PHASE_8_STATE_MODEL.md
  roadmap.md                 ← reconciled from PLAN.md (DRAFT staged here already)
```

After all docs land:
- Trim `CLAUDE.md` so it points to `docs/` rather than restating subsystem
  detail. CLAUDE.md becomes the orientation doc + project-specific rules
  (privacy conventions, file-naming conventions, "go through the API layer"
  principles), not a re-rendering of subsystem internals.
- Delete `_audit/` and `_notes.md`.
- Move/delete originals: `ANTIPATTERNS.md`, `ARCHITECTURE_PATTERNS.md`,
  `CALL_SECURITY.md`, `CMS_TEMPLATE_PATTERN.md`, `CONSISTENCY_REVIEW.md`,
  `IMPLEMENTATION_GUIDE.md`, `MESSAGING_REQUIREMENTS.md`,
  `PERSISTENT_PATTERN.md`, `PHASE_8_STATE_MODEL.md`, `PLAN.md`,
  `PROTECTED_LIFECYCLE.md`, `Saxonberg.md`.

## Audit verdicts (one-line)

| Source doc | Verdict | New home |
|---|---|---|
| Saxonberg.md | light rewrite (2 sections) | `vision.md` |
| ARCHITECTURE_PATTERNS.md | heavy rewrite | `architecture.md` (merged) |
| IMPLEMENTATION_GUIDE.md | heavy rewrite | `architecture.md` (merged) |
| CONSISTENCY_REVIEW.md | **delete** (self-identified as historical) | — |
| ANTIPATTERNS.md | light rewrite | `antipatterns.md` |
| CMS_TEMPLATE_PATTERN.md | heavy rewrite with salvage | `subsystems/templates.md` |
| PERSISTENT_PATTERN.md | **rewrite from scratch** | `subsystems/persistence.md` |
| PROTECTED_LIFECYCLE.md | heavy rewrite + scope expand | `subsystems/lifecycle.md` |
| MESSAGING_REQUIREMENTS.md | light rewrite + reframe | `subsystems/messaging.md` |
| CALL_SECURITY.md | heavy rewrite with substantial salvage | `subsystems/call-security.md` |
| PHASE_8_STATE_MODEL.md | heavy rewrite with salvage | `subsystems/state-model.md` |
| PLAN.md | full distillation | `roadmap.md` (drafted) |

## Strategy — why audits live on disk

We're doing this in a long single conversation. Auto-compaction WILL eventually
run; we don't want it to summarize away the audit details (file paths, "old
name → new name" specifics, salvage instructions). So:

1. Every audit report is staged verbatim in `_audit/` BEFORE any synthesis.
2. Synthesis is sequential, one doc at a time. Each round reads its audit
   file fresh from disk.
3. Originals stay in repo root until the very end — they're the source of
   truth for any "salvage verbatim" passages the audit flagged.
4. Done docs aren't kept in conversation context; they live in `docs/`.
5. A fresh conversation could pick up using only `_audit/` + `_notes.md` +
   `CLAUDE.md` + the originals + the codebase.

## Process for each new doc

1. Read its audit file in `_audit/`.
2. Read the original doc(s) listed in the audit.
3. Spot-check claims against the code paths the audit cites.
4. Draft the new doc. For "salvage verbatim" passages, copy from the original
   rather than paraphrase.
5. Validate: each claim in the new doc must point to real code. No "future"
   framing for things that are built. No "built" framing for things that are
   future.
6. Write to `docs/` (or `docs/subsystems/`).
7. Mark the task completed.

## Cross-cutting findings the audits surfaced

These are real subsystems in code that NO existing doc covers and they
genuinely need their own treatment (most belong in `subsystems/call-security.md`
or `subsystems/state-model.md`):

- `ProxyApi` interceptor pipeline (`api/proxy.ts`): `RAW_TARGET`,
  `PASSTHROUGH_KEYS`, `Interceptor`, `InterceptionContext`, `registerInterceptor`,
  wrapper-cache for mock-spy passthrough.
- `FrameKind` taxonomy + `tagCurrentFrame` + `findFrame` + `runRoot` vs `run`
  in `api/execution-context.ts`.
- Frame-mutator allowlist (the trust boundary protecting frame pushes).
- `assertTestOnly` test-seam pattern across every Api class.
- Late-binding handle pattern between `SecurityApi` and `ShadowApi`
  (`_consumeBypass`, `_withDispatch`, `_invokeOnShadow`) to avoid
  bootstrap cycles.
- Why ExecutionContextApi/ModuleApi/SecurityApi/ProxyApi do NOT decorate
  themselves (bootstrap cycle reasoning).
- Construction sentinel (`Stuff._beginConstruction`/`_endConstruction`,
  `#expectingConstruction`, stack-walk allowlist).
- `templatePath` stamping at clone time + zone stamping via
  `ZoneApi.resolveZoneForPath`.
- Synthetic constructor frame wrapping hydrate + postRegister.
- Failure-path unregister on hydrate/postRegister throw.
- `Phrasebook` subsystem (`lib/Phrasebook.ts`) — movement/teleport prose
  defaults with documented override hierarchy
  (Exit.messageOut/In → room hooks → Phrasebook).
- `MudlogApi` overloaded `trace/debug/info/warn/error/fatal` with category
  and MML body.
- `ScheduleApi.schedule`/`recurring`/`cancel` with `propagateAttribution` and
  `causingCommandId` re-planting on Root frames.
- `NavigationApi.normalizeDirection`/`invertDirection`/`directionOffset`/
  `cardinalDirections`.
- `PathPatternApi` limited glob (`*` / `**`) with regex compile cache.
- `TemplateApi.saveTemplate` + folder/leaf invariant validators +
  ancestor-path walk + `obj/hooks/DomainHook.ts` + `hooks.yaml` loader.
- `ZoneApi` `ZONE_CLASS_PATHS` whitelist + `resolveZoneForPath` ancestor walk
  + clone cache.
- `obj/Login.ts` ephemeral entry orchestrator.
- `obj/hooks/DomainHook.ts` + `AroundSaveHookMixin`/`AroundDeleteHookMixin`/
  `PostRegistrationMixin` triad in the registry.
- `services/loader/` (`loader-hook.ts`, `transform.ts`, `vite-plugin.ts`) —
  module-loader instrumentation backing `ModuleApi.stamp()`.

## Phase numbering reconciliation

CLAUDE.md jumps from Phase 4 to Phase 7 because Phases 5 and 6 got absorbed,
not skipped:

- **Phase 5 (Communications)**: Sensor/Vocal mixins shipped with Phase 3
  messaging; `say.yaml`/`tell.yaml` controllers exist in
  `mud/cmd/`/`mud/obj/command/`. Done.
- **Phase 6 (Extended Object Model)**: `Thing.ts`, `Detailed.ts`,
  `Propertied.ts`, `CartesianLocation.ts` all exist in `lib/stuff/` and
  `lib/spatial/`. Done.

Worth noting in the new `architecture.md` or `roadmap.md` to head off future
"what happened to phases 5 and 6" confusion.

## Validation backstop

Every new doc gets a final verification pass: spot-check 5-10 specific claims
against actual code. Goal is NOT to re-audit comprehensively — the staged
audits did that. Goal is to catch any drift introduced during synthesis.
