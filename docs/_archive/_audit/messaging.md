# Audit: MESSAGING_REQUIREMENTS.md (~55KB source)

**Verdict: light rewrite + reframe.** The content is ~90% accurate; the work
is mostly genre conversion (requirements → reference) plus adding the
`Phrasebook` subsystem, removing §12 Migration / §13 Open questions /
§14 Acceptance criteria entirely, and trimming §1 Scope and §3
design-decision-language down to a short rationale section.

**Critical framing issue**: The doc is written as **a forward-looking
requirements spec for a planning agent** ("input to a planning agent that
will produce an implementation plan", §0). The messaging system has been
**built** — to a remarkable degree of fidelity. Almost the entire spec
ships as code: `Mml`, `Scene`, `MessageApi.Topics/Tags/refOf`, `MudlogApi`,
`ScheduleApi`, `Sensor.filterMessage` extension point, `Avatar.handleMessage`
override, command-attribution stamping, `Phrasebook` movement defaults. So
the doc isn't drifted so much as **the wrong genre**: it documents intent for
work that's done.

## Content fraction estimate

- **Implementation reference (keep, lightly reword)**: ~55% — §2, §4, §5, §6,
  §7 mechanics, §8, §9 mechanics, §10 mechanics, §11 mechanics.
- **Design rationale worth preserving**: ~15% — selected paragraphs from §3
  (composition model, heartbeat vs schedule, sensors-only,
  shadowing-vs-registry rationale, Containable-wins).
- **Aspirational / requirements-style / cut now**: ~30% — §0 Purpose,
  §1 Scope, §12 Migration ("what burns / what stays / touch list"),
  §13 Open questions, §14 Acceptance criteria, the "planner to refine" /
  "planner to expand" / "v1" hedges sprinkled throughout.

## 1. Accurate (matches code)

- §2 Nomenclature (frame/topic/tag/scope/sensor/body/commandId/
  causingCommandId) — all live concepts.
- §4 Wire envelope (`MessageFrame<T>`, `StuffRef`, frame `id` via inline
  `nanoid()`) — exact match.
- §5 Topic taxonomy and §5.2 `MessageApi.Topics` constants — match (incl.
  `system.log.root`, `system.log.command`).
- §6 Tags namespace + §6.2 `MessageApi.Tags.Audience` constants — match.
- §7.1 `Mml` (private constructor, `compose`, `fromMarkup`, escape rules,
  vocabulary `name/speech/location/direction/object/item/list`, `stripTags`
  state-machine) — match.
- §7.2 `Scene` API (`MessageApi.scene(actor)`,
  `topic/tags/payload/toSelf/toTarget/toPeers/toContents/send`, dup-guard,
  peers-excludes-target, auto `audience:` tag, auto commandId/causingCommandId
  stamp) — match.
- §7.3 `VocalMixin.say` Containable-wins rule — match.
- §8 routing pipeline (Sensor → MessageApi.sendMessage → Avatar.handleMessage
  → Application.sendMessageToInteractive → Backend.sendMessageToSocket) —
  match.
- §9 MudlogApi (six levels with body-only and categorized overloads,
  throw-on-no-recipient, `isEnabled`) — match.
- §10 `Sensor.filterMessage` shadowable extension + `handleMessage` subclass
  hook — match (Avatar overrides `handleMessage`; tests at
  `lib/message/__tests__/Sensor.test.ts`).
- §11 commandId/causingCommandId model and
  `ScheduleApi.schedule/recurring/cancel` with `propagateAttribution` — match.

## 2. Drifted (small)

- §7.3 sketches `MobileMixin.announceDeparture/announceArrival` with inline
  `Mml.compose` literals. **Actual implementation routes through
  `Phrasebook`** (`mud/lib/Phrasebook.ts`) for movement/teleport prose, with
  a documented override hierarchy
  (`Exit.messageOut/In` → room hooks → Phrasebook). This is a real
  architectural addition the doc misses.
- §9.1 says MudlogOptions `to?: Sensor | Sensor[]`. Code requires
  `SensorStuff = Stuff & Sensor`. Practically equivalent; tighter than spec.
- MudlogApi emit attaches `level:<level>` and (when categorized)
  `category:<cat>` tags to the frame — not specified anywhere in §9.
- `Mml.format` (template + `{name}` placeholder substitution) exists in
  code, used by Phrasebook. Not mentioned in §7.1's vocabulary list.
- `Mml.escape` is exposed publicly. Not in §7.1.
- §11.2 mentions `executionId` as existing. Code uses `commandId` set on
  `CommandContext`; check that `executionId` lineage still applies
  (CommandGiver assigns commandId to context; lifecycle matches §11.2
  closely).

## 3. Gone / never built

- Nothing major from §1's "in scope" list is missing. The hypothetical
  bus-level taps and wire-level filters in §10.5 remain deferred (doc said
  as much).
- `Mobile.announceDeparture/announceArrival` named methods aren't on Mobile;
  the equivalent prose lives via Phrasebook accessors and is invoked by
  movement orchestration. Conceptually present, named differently.

## 4. Missing from doc (in code, undocumented)

- **`Phrasebook` subsystem** — significant: it's the user-configurable
  defaults layer for movement prose, with documented override precedence.
  Deserves first-class treatment.
- `Mml.format` and `Mml.escape` public surface.
- `MessageApi.sendMessage(recipient, frame)` chokepoint — explicitly the
  "lone delivery chokepoint" that all routing flows through. Worth
  highlighting.
- `Exit.inverse` back-pointer (§3.14 promised it; it's used by
  `Phrasebook.arriveDirection` via `NavigationApi.invertDirection` fallback).
  Verify and document.
- Tests live at `api/__tests__/{message,mml,mudlog,scene,schedule}.test.ts`
  and `lib/message/__tests__/{Sensor,Vocal}.test.ts` — worth pointing to.

## 5. Salvage

Sections 2 (nomenclature), 4 (frame shape), 5 (topics), 6 (tags), 7
(composer stack), 8 (pipeline), 9 (MudlogApi), 10 (filterMessage), 11
(attribution + ScheduleApi) are essentially **lift-and-reframe**: drop
"must"/"should"/"will be", change "the planner adds" → "the implementation
adds", drop §1 scope/§3 design rationale where they exist purely to instruct
the planner. §3 design rationale that explains *why* (3.1, 3.4, 3.7, 3.13
heartbeat-vs-schedule rationale) is worth keeping in a "Design rationale"
subsection — that's institutional memory.

## 6. Relevant files

- `packages/server/src/mud/api/message.ts`
- `packages/server/src/mud/api/mml.ts`
- `packages/server/src/mud/api/mudlog.ts`
- `packages/server/src/mud/api/schedule.ts`
- `packages/server/src/mud/lib/message/Sensor.ts`
- `packages/server/src/mud/lib/message/Vocal.ts`
- `packages/server/src/mud/lib/Phrasebook.ts`
- `packages/server/src/mud/lib/spatial/Mobile.ts`
- `packages/server/src/mud/obj/Avatar.ts`
- `packages/server/src/mud/obj/command/SayController.ts`
- `packages/server/src/mud/obj/command/TellController.ts`
- `packages/server/src/mud/api/connection.ts`
- `packages/types/src/index.ts`
