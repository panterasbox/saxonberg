# Response envelope slate — RETIRED 2026-05-12

This slate's design ledger is superseded by
[`docs/subsystems/response-envelope.md`](../subsystems/response-envelope.md).
The load-bearing decisions live in that subsystem doc's
"Architectural decisions" section.

The "Resolved" decisions table below remains as a historical
reference for anyone reviewing the design path that led to the
shipped envelope. Everything else in the original slate (Principle,
Scope, Note kinds roster, Wire protocol, Server-side production,
Envelope delivery pipeline, etc.) has been folded into the subsystem
doc and the per-controller audit manifest:

- Operational reference (shipped subsystem):
  [`docs/subsystems/response-envelope.md`](../subsystems/response-envelope.md)
- Build sequence (retired):
  [`docs/plans/response-envelope-plan.md`](../plans/response-envelope-plan.md)
- Per-controller migration audit (retired but useful as a
  reason-vocabulary inventory):
  [`docs/plans/response-envelope-audit-manifest.md`](../plans/response-envelope-audit-manifest.md)

The build shipped on the `response` branch (commits a063ffb /
7e7cb1f / cd3abd8 / ae33c30 / 1761be8 / d59bb05 / 330dcd1 / d2ae4a4
/ ff62a60 / f6fe9a4); 2658 tests pass.

---

## Resolved

- ~~**Should `outcome` carry a `scene` field?**~~ No. Prose rides
  on existing per-emit `MessageFrame`s. The envelope is a pure
  machine-signal control frame that ships at dispatch and
  engagement-lifecycle boundaries. Clients correlate envelope
  and `MessageFrame` by id (`dispatchId` ↔ `meta.commandId`,
  `engagementId` ↔ `meta.causingCommandId`).
- ~~**Should `outcome` carry an `effects` summary?**~~ Out of
  scope for the envelope. State changes flow through the
  state-sync channel (see
  [state-sync-slate](./state-sync-slate.md)). Keeps note kinds
  narrow and unifies self-action vs. witnessed-action state
  delivery on one code path.
- ~~**Wire-shape relationship to `MessageFrame`.**~~ The envelope
  is a new wire-frame shape that ships **alongside** `MessageFrame`,
  not as a superset, wrapper, or replacement. Both shapes coexist
  on the connection; the client demuxes by frame discriminator.
- ~~**Fate of `topic`.**~~ `MessageFrame.topic` survives unchanged
  as the content classification axis. The envelope's `type`
  discriminator is an orthogonal axis (wire-interaction class).
- ~~**Auto-emit MudlogApi command frame.**~~ Retires. The
  dispatch-response envelope's `outcome.status` carries the
  success/failure signal; controllers' own `Scene.send` calls
  carry the prose. Pre-controller failure paths become
  dispatcher-emitted note kinds.
- ~~**`CommandResult` shape.**~~ Retires entirely in v1.
  `success`, `summary`, AND `pass` all retire; controllers'
  `execute()` returns `void` (`Promise<void>`). The audit of all
  45 controllers across 129 failure paths migrates each
  `success: false` return to emit `Scene.send` + a controller-side
  note kind, then drops the return value entirely. A framework
  bridge (`success: false + status: 'ok' → 'declined'` + dev
  warning) ships as transitional scaffolding during the audit
  sub-chunks and is removed alongside `success` / `summary` /
  `pass` / the interface itself at end of v1.
- ~~**Chain-of-responsibility at the execute stage.**~~ Retires.
  The `pass: true` return-flag was a holdover from legacy MUDs
  where every handler did its own arg parsing — saxonberg's
  framework parses + binds before execute, so the
  syntax-disagreement use case is subsumed by the shape vs bind
  distinction at the assemble stage (which stays as-is).
  Remaining "runtime decline" use case (the Throne example) is
  better served by **dynamic contributions**: contributors push
  their YAML onto the recency stack when contributable and pop
  when not, gating dispatchability at the discovery layer
  rather than after-the-fact at the controller. The Throne
  example in `command-routing.md` rewrites to illustrate the
  dynamic-contribution pattern.
- ~~**Controller-side failure note roster.**~~ Four specialized
  kinds (`controller-rejected`, `mixin-missing`,
  `locomotion-gate-failed`, `slot-occupied`) plus the existing
  catch-all surface (`target-declined`, `empty-result`,
  `match-ambiguous`). Audit catalogued 11 recurring patterns;
  these four earn their structured payloads, the remaining
  ad-hoc patterns ride on `controller-rejected.reason`
  open-enum.
- ~~**`activity-progress` kind.**~~ Retires. The activity slate's
  derivable-progress rule (`startedAt + duration` on
  `engagement-started`; client computes locally) replaces the
  push-progress design.
- ~~**`activity-*` naming.**~~ Renamed to `engagement-*` to align
  with the activity slate's `Engagement` framework primitive
  (which covers both `DurativeActivity` and `SustainedEngagement`).
- ~~**`witness` frame type.**~~ Dropped from v1. Peer prose rides
  on `MessageFrame`s with `audience:witness` tag, as today. The
  envelope `witness` type lands as an additive extension when
  structured peer-event signals earn it. Documented use cases:
  NPC reactions to other actors' commands (merchant scoffing,
  guard interventions), audit Sensors capturing per-room
  dispatch outcomes for replay/forensics, LLM-agent observers
  consuming structured peer events without parsing prose.
- ~~**`frameId` mint-site.**~~ Lives on `Interactive`
  (`#frameCounter` + `nextFrameId()` method). Connection-scoped
  monotonic counter that resets on reconnect. Stamping happens
  per-Interactive at **send-time** inside
  `Application.send{Message,Envelope}ToInteractive` — not at
  producer-time. Same logical frame multiplexed to N Interactives
  gets N different `frameId`s, one per per-Interactive wire copy.
- ~~**`MessageFrame.meta.frameId`.**~~ Added as optional. Closes
  the gap-detection coverage on the prose channel — without it,
  envelope and state-delta have gap detection but a lost prose
  frame is undetectable. Stamped per-Interactive at send-time
  (same mechanism as the envelope's `frameId`); absent at
  compose-time.
- ~~**Envelope delivery: Sensor pipeline vs direct-to-wire.**~~
  Sensor pipeline. The envelope flows through the actor's
  `Sensor.onEnvelope` → `filterEnvelope` → `handleEnvelope`,
  parallel to the existing `MessageFrame` flow. `Avatar.handleEnvelope`
  multiplexes to connected `Interactive`s. `MessageApi.sendEnvelope`
  is the lone delivery chokepoint. Load-bearing for shadows
  (`filterEnvelope`), netdead Avatar reactions, audit Sensors,
  and NPC self-observation.
- ~~**`DispatchContext` vs `CommandContext` typing.**~~ Single
  type. `CommandContext` interface extends with accumulator
  methods (`note`, `setStatus`, `getNotes`, `getStatus`). No
  separate `DispatchContext` class. Implementation hides
  accumulator state behind a private `CommandContextImpl` class
  exposed via a `createCommandContext` factory.
  `CommandController.execute(model, ctx: CommandContext)`
  signature stays unchanged — interface is just richer.
  `command-routing.md`'s "read-only reference bundle" description
  retires; new description: "request context that accumulates
  notes during dispatch." (Auto-escalation was originally planned
  as a `DispatchApi` static helper; in the shipped build it folded
  into `api/command.ts` as module-private helpers — see the
  subsystem doc.)
- ~~**Validator note-emission capability.**~~ Validators MAY
  emit notes via `ctx.note(...)`. The dispatcher always emits
  `validator-failed` as the framework-tier fallback when a
  validator returns a string; validator-emitted notes ride
  alongside. Generic framework validators
  (`mustBeContainable`, `mustBeVisible`, `canReach`,
  `mustBeNumber`, `notEmpty`) stay note-silent; specialized
  domain validators (`canAfford`, `notOnCooldown`, etc.) opt into
  the richer signal. Validators may also emit informational
  notes without returning a string (e.g., a custom validator
  that emits `pronoun-resolved` during validation).
- ~~**Multi-device input echo.**~~ MudlogApi at the start of
  `executeCommand` (topic `system.log.command.{info|warn}`,
  payload `{kind: 'issued', rawText, expandedText?, verb?,
  parseError?, dispatchId, originInteractiveId?}`). Multiplexed
  to all of the Avatar's connected `Interactive`s via the
  existing `MessageFrame` multiplex; ready for admin audit and
  replay Sensors when they land. Fires on parse-failure and on
  NPC programmatic dispatches (when actor is a Sensor).
  v1-scoped even without a client renderer so the surface is
  in place for the use cases we anticipate.
- ~~**Versioning**: how do clients cope when a Note kind's payload
  evolves?~~ Kinds are append-only and per-kind-frozen. New shape
  ships under a new kind name; both can coexist.
- ~~**Severity field?**~~ No. Kind discriminator already encodes
  severity; status discriminator carries dispatch-level severity.
- ~~**Note ordering**~~. Emission order on the wire, no other
  guarantee documented. Clients should treat the list as
  semantically unordered for rendering and rely on note kind +
  payload (not position) for any consumer logic.
- ~~**Workspace text output**~~ (`cat /obj/Avatar/bob.yaml`).
  Mml-wrapped as `<pre>` and rides on the existing
  `MessageFrame` body, like any other prose. The envelope's
  outcome reports `ok` with empty notes. No envelope-level
  workspace affordance.
- ~~**Multi-scene messages**~~ (e.g., `scry` peeking at a remote
  room). Remote scene renders as inline prose inside the actor's
  `MessageFrame` body (one Mml-shaped channel), optionally
  accompanied by an `observed-remote` note carrying the
  structured pointer for rich clients. Revisit only if a future
  UI wants the remote room as a side-by-side panel.
