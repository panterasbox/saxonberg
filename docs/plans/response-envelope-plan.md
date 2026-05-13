# Response envelope — implementation plan — RETIRED 2026-05-12

The build shipped on the `response` branch and is preserved here as
historical reference for the build-decision process. Operational
detail and architectural decisions live in the subsystem doc.

## Where the content went

- **Operational reference** (load-bearing for working code):
  [`docs/subsystems/response-envelope.md`](../subsystems/response-envelope.md)
- **Per-controller migration audit** (still useful as a
  reason-vocabulary reference):
  [`docs/plans/response-envelope-audit-manifest.md`](./response-envelope-audit-manifest.md)
- **Slate's design ledger** (the "Resolved" decisions table is
  preserved as the design-path record):
  [`docs/slates/response-envelope-slate.md`](../slates/response-envelope-slate.md)

## How the build rolled out

The chunked rollout on the `response` branch, in commit order
(oldest first; `git log a94be73..f6fe9a4` for the full diff):

| Commit  | Chunk | Description |
|---------|-------|-------------|
| 0002bf9 | 1     | Wire types (`Status`, `Note` union, three envelope shapes, `EnvelopeTemplate`, `AbortReasonRegistry`, `MessageFrame.meta.frameId`, `ConnectionEstablishedPayload.interactiveStuffId`) in `@saxonberg/types`. |
| 58a7c3c | 2     | Server substrate: `DispatchApi`, `CommandContext` accumulator, dispatcher rewrite, `SensorMixin` envelope triad, `MessageApi.sendEnvelope` chokepoint, `Avatar.handleEnvelope` fan-out, `Interactive.nextFrameId`, `Application.sendEnvelopeToInteractive`, per-Interactive send-time stamping for both channels, input-echo helper, framework bridge. |
| 2339a96 | 3     | Client envelope routing seam (`onEnvelope` / `offEnvelope` demux); `selfInteractiveId` stash on connection-established. |
| a063ffb | 4a    | Locomotion controller audit: `LocomotionControllerBase.emitRejection` centralizes the `Scene.send + ctx.note(locomotion-gate-failed)` pair; Goto adds structured reasons. |
| 7e7cb1f | 4b    | Workspace controller audit: 10 controllers' `.fail()` helpers grow a `reason` param; `mixin-missing { WorkspaceMixin }` for the "no workspace" branch. |
| cd3abd8 | 4c    | Slot-bearing + posture audit: 10 controllers emit `slot-occupied` / `mixin-missing { BodyPlanMixin }` / `controller-rejected` per failure path; `PostureApi.transferPosture` gains structured `reason`; Wear / Wield / Mount lose their exception-swallowing try/catch. |
| ae33c30 | 4d    | Long-tail audit: 26 remaining controllers (Look / Inventory / Locate / Scry / Help / Focus / Analyze\* / Measure\* / Weigh / Say / Tell / Get / Drop / Open / Close / Player / Alias / Settings / Var / Clone / Destruct / Eval / Reload / Teleport / Ping) all emit canonical notes. |
| 1761be8 | 5     | Retirement sweep: `CommandResult` / `success` / `summary` / `pass` removed; controllers' `execute()` returns `Promise<void>`; framework bridge dropped. |
| d59bb05 | post  | `Application.sendMessageToInteractive` narrowed from `unknown` to `MessageFrame`; `isMessageFrame` runtime sniff removed. |
| d2ae4a4 | post  | Glob's parallel note interfaces retired; `applyQuantity` opts gain required `field`; `target-declined.target` becomes `StuffRef` via `MessageApi.refOf`. |
| 330dcd1 | post  | `api/dispatch.ts` folded into `api/command.ts`; `createCommandContext` factory moves to `CommandApi.createCommandContext`. |
| ff62a60 | post  | Glob's speculative note re-exports dropped — nothing consumed them. |
| f6fe9a4 | post  | Final-pass cleanup: sed/perl scars, `as never` casts, unused imports, Alias/Settings/Var per-call-site reasons, FocusController dead-code restoration. |

2658 tests pass at HEAD of the branch (modulo two pre-existing
failures in `ConnectionManager.test.ts` and `Perception.test.ts`
that are unrelated to this work and were already broken on
`origin/response` at branch start).

The audit manifest's per-controller table is the inventory snapshot
of v1 reasons used during the migration; it stays useful for
reason-vocabulary consistency checks during future code review.
