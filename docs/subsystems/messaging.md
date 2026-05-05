# Messaging

The messaging subsystem turns "X happened in the world" into one or more
typed wire frames delivered to the right Sensors and on out to connected
clients. The pipeline:

```
Game object
    composes via mixin sugar (Layer 4) or direct Scene (Layer 3)
        ↓
Scene.send()
    builds one MessageFrame per audience, stamps commandId / causingCommandId
        ↓
MessageApi.sendMessage(recipient, frame)         ← lone delivery chokepoint
        ↓
Sensor.onMessage(frame)
    ├─ filterMessage(frame)   shadowable extension point
    └─ handleMessage(frame)   subclass override
        ↓
Avatar.handleMessage(frame)
    for each connected Interactive
        ↓
Application.sendMessageToInteractive(interactive, frame)
        ↓
Backend.sendMessageToSocket(socketId, frame)
        ↓
WebSocket.send(JSON.stringify(frame))
```

The Sensor → MessageApi → Application → Backend skeleton is the entire
delivery path. There are no parallel channels, no log sinks, no bus-level
sidecars. Anything wanting to consume a frame is, or shadows, a Sensor.

## Nomenclature

These terms have specific meanings; code, comments, and docs use them
precisely.

- **Message frame** — the unit of outbound communication. A typed
  object delivered to a Sensor. Carries a topic, optional tags, an MML
  body, optional structured payload, and metadata. See "Wire envelope".
- **Topic** — *intrinsic* hierarchical classification of a message's
  nature/content. Mandatory. Framework-defined and stable. Dot-separated
  path. Example: `world.speech.say`. Answers "what kind of message is
  this?"
- **Tag** — orthogonal flat property attached to a frame.
  Namespace-prefixed string (`audience:witness`). Open set.
- **Scope** — producer-side concern, NOT a property of the message
  itself. Describes how a producer chose to deliver the frame (to self,
  to peers, to contents, to a specific target). Once delivered, scope
  is gone — the recipient just has a frame.
- **Sensor** — game object that receives frames. The sole recipient
  type. Existing concept (`SensorMixin`). Avatars and NPCs are sensors;
  custom sensors (debug consoles, audit observers) can be written as
  needed.
- **Body** — MML-formatted string representation of a message. Always
  present on every frame. The console-facing face. Even frames primarily
  consumed by widgets carry a body for accessibility, log capture, and
  fallback display.
- **commandId** — live-command attribution. Present on every frame
  composed during the *synchronous* execution of a command. Travels
  with the frame to every recipient (including witnesses who never
  issued the command).
- **causingCommandId** — causal attribution. Present on every frame
  composed inside work descended from a command — sync execution OR
  async aftermath propagated via opt-in schedulers. In sync execution
  this equals `commandId`; in async aftermath `commandId` is absent
  but `causingCommandId` carries the originating command's id.

Topic and scope are orthogonal and never collapsed into a single field:

| Concept | Where it lives        | Required               |
|---------|-----------------------|------------------------|
| topic   | on the frame          | yes                    |
| scope   | producer call only    | producer-side decision |

## Wire envelope

`MessageFrame<T>` lives in `@saxonberg/types` so server and client
agree on shape:

```typescript
interface MessageFrame<T = unknown> {
  id: string;
  topic: string;
  tags?: string[];
  body: string;          // MML markup
  payload?: T;
  meta: {
    timestamp: number;
    commandId?: string;
    causingCommandId?: string;
  };
}
```

`StuffRef` is the wire-safe Stuff reference. Direct Stuff objects never
cross the boundary:

```typescript
interface StuffRef {
  stuffId: string;
  displayName?: string;  // pre-resolved server-side at compose time
}
```

`MessageApi.refOf(stuff)` builds one. `displayName` is resolved at
compose time via `DescribeApi.getDisplayName`, so the wire payload
doesn't depend on a re-resolution step on the client.

Frame `id` is a `nanoid()` minted inline at frame construction in
`Scene.send()` and `MudlogApi.*`. No dedicated `IdApi` wrapper —
single-method utility doesn't pay for itself.

When per-audience payloads diverge, the topic's payload type is a
discriminated union keyed by `audience`; the frame's `audience:` tag
discriminates and consumer code narrows via TS pattern matching.

## Topics

Two roots. Dot-separated paths. Lowercase.

```
world.                          # in-fiction
  speech.
    say
    tell
  perception.
    look
    inventory
  narration.
    movement                    # walking-style depart/arrive
    teleport                    # sudden, magical in/out

system.                         # out-of-fiction infrastructure
  connection.
    established
    lost
  auth.
    success
    failed
  log.
    <category>.<level>
    # category: hot-reload, security, command, persistence, etc. (open)
    # level:    trace | debug | info | warn | error | fatal
```

Conventions:

- All paths lowercase, dot-separated.
- Leaves should be specific enough that a single MML template applies
  (`world.speech.say` is a leaf; `world.speech` is not).
- Adding a new topic requires no framework changes — producers just emit
  the new topic string.
- Failed commands aren't a special topic. A `look` that found nothing
  still composes prose at `world.perception.look`; the failure is
  captured by the auto-emitted bland MudlogApi entry and the controller's
  `success: false` return.

`MessageApi.Topics` exposes the canonical constants so call sites get
autocomplete, grep-ability, and rename safety:

```typescript
MessageApi.scene(speaker)
  .topic(MessageApi.Topics.world.speech.say)
  ...
```

`MessageApi.Topics.system.log.root` (`'system.log'`) is the prefix used
for "all log frames" matching; `system.log.command` is the
framework-emitted bland command-outcome topic (see "Auto-emit on command
completion" below).

## Tags

Open-set, flat, namespace-prefixed strings. Producers attach as
`tags: string[]` on frames.

`audience` is the only namespace defined in v1. It's load-bearing for
the discriminated-union payload pattern and for audience-aware filtering.
Other namespaces (modality, urgency, context, locale, etc.) are
introduced when first feature actually needs them.

```typescript
MessageApi.Tags.Audience.Actor       // 'audience:actor'
MessageApi.Tags.Audience.Target      // 'audience:target'
MessageApi.Tags.Audience.Witness     // 'audience:witness'
MessageApi.Tags.Audience.Bystander   // 'audience:bystander'
```

The Scene composer auto-attaches the appropriate `audience:` tag per
audience frame. Producers don't tag manually.

## MML — Mud Markup Language

`Mml` (`mud/api/mml.ts`) is the composer for body strings. Layer 2 of
the composer stack.

```typescript
class Mml {
  // Constructor is private. Two factory paths:
  static compose(strings, ...values): Mml      // safe — escapes raw values
  static fromMarkup(raw: string): Mml          // explicit trust assertion
  static format(template: string, vars): Mml   // {name}-placeholder template

  // Vocabulary
  static name(stuff: Stuff): Mml               // <name stuff-id="…">…</name>
  static speech(text: string): Mml             // <speech>"…"</speech>
  static location(stuff: Stuff): Mml           // <location stuff-id="…">…</location>
  static direction(d: string): Mml             // <direction>…</direction>
  static object(stuff: Stuff): Mml             // <object stuff-id="…">…</object>
  static item(stuff: Stuff): Mml               // <item stuff-id="…">…</item>
  static list(items: Mml[]): Mml               // joined with commas/and

  // Helpers
  static escape(text: string): string          // five-entity escape
  static stripTags(body: string): string       // plain-text projection

  toString(): string
  toJSON(): string
}
```

The private constructor + named factories pattern makes trust explicit:
every site that wraps an untrusted-shape string says `Mml.fromMarkup(...)`,
which is grep-able for security audit. `Mml.compose` is always safe.

`compose` interpolation rules:

- `Mml` fragments emit verbatim.
- Raw strings are escaped (`<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`,
  `"` → `&quot;`, `'` → `&apos;`).
- Numbers and booleans are coerced via `String()` then escaped.
- Objects with `toMml()` get unwrapped — escaping a non-`Mml` return.
- `null` / `undefined` → empty string.

Vocabulary helpers always re-escape raw string arguments. Calling
`Mml.location("<name>foo</name>")` produces literal text inside
`<location>` tags — devs who want nested markup compose with Mml
fragments explicitly. Pass-through is not a feature; it's the bug
surface this design closes.

For prose stored outside the source — schema-declared settings,
CMS-authored room/NPC/item descriptions, eventually prompts — reach
for `ProseApi.format` (see [prose.md](./prose.md)). Liquid-syntax
templates with conditionals and filter chains, same Mml-aware escape
rules as `Mml.compose`, returns a finished `Mml` fragment.

`Mml.escape` is the five-entity escape exposed publicly for other
markup-producers that need it.

`stripTags` parses with a small state machine and decodes the five
built-in entities. Used by clients or log capture that need a
plain-text projection. Tolerates unclosed tags by dropping their
characters.

## Scene — multi-audience composer

`MessageApi.scene(actor)` returns a `Scene` builder. Layer 3 of the
composer stack: producers describe per-audience frames; one `.send()`
dispatches them all.

```typescript
MessageApi.scene(speaker)
  .topic(MessageApi.Topics.world.speech.say)
  .toSelf(Mml.compose`You say, ${Mml.speech(text)}`)
  .toPeers(Mml.compose`${Mml.name(speaker)} says, ${Mml.speech(text)}`)
  .payload({ speaker: MessageApi.refOf(speaker), text })
  .send();
```

Surface:

- `MessageApi.scene(actor)` — establishes actor identity. Actor is any
  `Stuff`. Compositional requirements (Sensor, Containable, Container)
  are checked per `.toX()` method, not at the factory.
- `.topic(path)` — required.
- `.tags(tags[])` — optional shared tags merged with per-audience auto-tags.
- `.payload(p)` — optional shared payload, used for any audience that
  doesn't override.
- `.toSelf(body, payload?)` — actor frame. Auto-tags `audience:actor`.
  Throws if the actor isn't a Sensor.
- `.toTarget(target, body, payload?)` — single-target frame. Auto-tags
  `audience:target`. Throws if the target isn't a Sensor.
- `.toPeers(body, payload?)` — broadcasts to actor's environment;
  excludes actor and any explicit target. Auto-tags `audience:witness`.
  Throws if the actor isn't Containable.
- `.toContents(body, payload?)` — broadcasts to actor's contents;
  excludes the actor. Auto-tags `audience:witness`. Throws if the actor
  isn't a Container. Used when the actor IS the container — a haunted
  location speaking to its occupants.
- `.send()` — dispatches all configured frames.

Per-audience compositional requirements throwing is deliberate. They
are composition errors, not user-input errors — a controller that asks
for `.toPeers` on a non-Containable actor has a bug, not a recoverable
condition.

The Scene class lives inside `mud/api/message.ts` — there is no
`scene.ts` and no top-level `Scene` export. Construction goes through
`MessageApi.scene(actor)` only; Scene's constructor is sentinel-gated
and rejects all other callers.

Constraints enforced inside the builder:

- Only one frame of each kind per Scene. Multiple `.toSelf()` calls
  throw — one frame per audience role per scene.
- `.toPeers()` exclusion: when both `.toSelf()` and `.toTarget()` are
  present, `.toPeers()` excludes both — witnesses are everyone except
  the actor and target.

`.send()` does the per-frame plumbing:

- Reads the ambient `ExecutionContextApi` for `commandId` and
  `causingCommandId` and stamps them onto every frame's `meta`.
- Builds one `MessageFrame` per queued audience: tags include the
  per-audience `audience:*` tag plus shared tags; body is the `Mml`
  fragment's `toString()`; payload is the per-audience payload, falling
  back to the shared payload.
- For self/target: dispatches via `MessageApi.sendMessage(recipient, frame)`.
- For peers: walks `MessageApi.getSensors(env)` and dispatches one frame
  per sensor, skipping the actor and the explicit target.
- For contents: dispatches via `MessageApi.messageContents(actor, frame,
  { exclude: actor })`.

## VocalMixin and the Containable-wins rule

`VocalMixin.say(text)` is Layer 4 sugar — the canonical "speak in your
current scope" pattern. Speakers get `say` for free as long as they
compose the mixin.

Scope is inferred from the speaker's composition (the **vessels rule**):

```typescript
if (MixinApi.isContainable(speaker))    scene.toPeers(witnessBody);
else if (MixinApi.isContainer(speaker)) scene.toContents(witnessBody);
else throw new Error(
  'VocalMixin requires composition with Container or Containable'
);
```

A vessel is a Stuff that's both Container *and* Containable
(wardrobe, cart, walking house). The Containable path wins: vessels
broadcast to peers (other things in the same area), not to contents.
A speaker that's neither — composition error — throws.

`MobileMixin` follows the same Containable-wins rule for movement
narration; its base-class constraint
(`TBase extends MixinConstructor<Stuff & Containable>`) makes the
guarantee compile-time.

## Routing pipeline

`MessageApi.sendMessage(recipient, frame)` is the **lone delivery
chokepoint**. Every routing helper, every `Scene.send` dispatch, and
every `MudlogApi` emit goes through it. Non-MessageApi code does NOT
call `sensor.onMessage` directly — the chokepoint is where future
cross-cutting concerns (audit trail, debug logging, bus-level taps,
wire-level filters) hook in exactly once.

```typescript
static sendMessage(recipient: SensorStuff, frame: MessageFrame): void {
  recipient.onMessage(frame);
}
```

The two low-level routing helpers complement it:

- `MessageApi.getSensors(container)` — walks `container.getContents()`
  and filters via `MixinApi.isSensor()`. Mixin-narrowed; nothing
  duck-types `onMessage`.
- `MessageApi.messageContents(container, frame, { exclude? })` — deliver
  to every sensor inside the given container. The caller picked the
  container. Used when the speaker IS the container.
- `MessageApi.messageContainer(source, frame, { exclude? })` —
  convenience wrapper for the "speaker is Containable, broadcast to peers
  in the same room" case. Drops with a warning if `source` has no
  environment.

`Avatar.handleMessage` is the multiplexing fan-out:

```typescript
protected override handleMessage(frame: MessageFrame): void {
  const app = Avatar.getApplicationInstance();
  for (const interactive of this.interactives) {
    app.sendMessageToInteractive(interactive, frame);
  }
}
```

`Application.sendMessageToInteractive(interactive, frame)` is the sole
gateway from game objects to Backend. It calls
`Backend.sendMessageToSocket(socketId, frame)`, which `JSON.stringify`s
and writes to the WebSocket. For non-Avatar Sensors (NPCs, custom
observers), `handleMessage` does whatever that Sensor does — there's no
special path.

## Sensor extension points

`SensorMixin` is shaped as a template method — `onMessage` is
framework plumbing, content authors hook the named extension points:

```typescript
onMessage(frame: MessageFrame): void {
  const transformed = this.filterMessage(frame);
  if (transformed === null) return;       // dropped
  this.handleMessage(transformed);
}

protected filterMessage(frame: MessageFrame): MessageFrame | null {
  return frame;                            // shadowable
}

protected handleMessage(_frame: MessageFrame): void {
  // subclass override (Avatar, NPCs, …)
}
```

- **`filterMessage`** is the per-recipient interception point. Game
  content (deafness shadows, audit observers, language garblers) shadows
  this method via the shadow framework. Returning `null` drops the
  frame; returning a transformed frame substitutes it. Lifecycle
  binding, ordering, and call-security mediation are inherited from
  `ShadowApi`. Hooks SHOULD treat frames as immutable and return new
  objects when modifying:

  ```typescript
  return { ...frame, body: garble(frame.body) };
  ```

- **`handleMessage`** is the subclass-override delivery point. Avatar
  multiplexes to its connected Interactives. NPCs run AI. Default is a
  no-op.

`onMessage` itself is NOT meant to be shadowed or overridden — it's the
contract ("sensors receive messages"). Shadowing it would let content
skip `handleMessage` and break delivery. Game content uses
`filterMessage`; subclasses use `handleMessage`.

## MudlogApi

`MudlogApi` (`mud/api/mudlog.ts`) is the in-game messaging facility for
log-style content. Every call delivers to a Sensor. Topic is
`system.log.<level>` (no category) or `system.log.<category>.<level>`.

```typescript
class MudlogApi {
  // Body-only — topic system.log.<level>
  static trace(body: Mml, opts?: MudlogOptions): void;
  static debug(body: Mml, opts?: MudlogOptions): void;
  static info (body: Mml, opts?: MudlogOptions): void;
  static warn (body: Mml, opts?: MudlogOptions): void;
  static error(body: Mml, opts?: MudlogOptions): void;
  static fatal(body: Mml, opts?: MudlogOptions): void;

  // Categorized — topic system.log.<category>.<level>
  static trace(category: string, body: Mml, opts?: MudlogOptions): void;
  // …debug/info/warn/error/fatal same shape

  // Hook for log4j-style "skip composition when disabled" guards.
  // Always returns true today; per-category levels and dynamic config
  // plug in here.
  static isEnabled(category: string | undefined, level: LogLevel): boolean;
}

interface MudlogOptions {
  to?: SensorStuff | SensorStuff[];   // explicit recipient(s)
  payload?: unknown;
}
```

`SensorStuff = Stuff & Sensor` — the option is mixin-narrowed, not a
loose `Sensor` interface.

Recipient resolution:

1. If `opts.to` is provided → deliver to those Sensor(s).
2. Else look up the active command giver via
   `ExecutionContextApi.getCurrentCommandContext()?.commandGiver` and
   check via `MixinApi.isSensor`. If present → deliver to them.
3. Else **throw**. There is no stdout fallback. MudlogApi is purely an
   in-game messaging facility; stdout / file logging is a separate
   concern that has nothing to do with MudlogApi.

Every `error()` and every other level throws on no recipient, same
rule. That's the `MudlogApi` contract: "calling without an obtainable
recipient is a bug."

Each emit attaches `level:<level>` to `tags`, plus `category:<category>`
when the categorized overload was used. Frames also carry `meta.commandId`
and `meta.causingCommandId` from the ambient `ExecutionContextApi` — same
auto-stamp `Scene.send` performs.

```typescript
MudlogApi.info('hot-reload',
  Mml.compose`Reloaded module ${moduleRef}, ${dependents.length} dependents`);

MudlogApi.info(Mml.compose`Boot complete`);   // body-only

if (MudlogApi.isEnabled('combat', 'debug')) {
  MudlogApi.debug('combat',
    Mml.compose`${Mml.name(attacker)} swing detail: ${expensive.computation()}`);
}

MudlogApi.info('admin',
  Mml.compose`${Mml.name(player)} just hit level 50`,
  { to: [admin1, admin2] });
```

The standard level constants are exported as `MUDLOG_LEVELS` for
diagnostic UIs that want to render every level.

### Auto-emit on command completion

`CommandGiverMixin.executeCommand` automatically emits a MudlogApi
entry per command, addressed to the actor. This is the uniform,
hidable, structured log that complements the controller's prose Scenes.

The frame carries topic `system.log.command.info` (success) or
`system.log.command.warn` (failure). Body is `<verb>: <tail>` where
`tail` is `result.summary` if provided, otherwise `'ok'` / `'failed'`.

Both this MudlogApi entry AND any prose Scenes the controller fired
share the same `commandId` (auto-stamped from `ExecutionContextApi`). UI
can correlate, group, filter, route to different panels — whatever it
wants.

## Movement-message defaults — `MobileMixin.settings`

Default movement / teleport prose lives as schema-declared settings
on `MobileMixin` (`messages.movement.*`). Avatars compose
`EnvironmentMixin` and players override individual templates through
the `settings` command; NPCs and other Mobile hosts that don't
compose `EnvironmentMixin` render at the schema default via
`resolveSetting`'s non-Environment fallback. See
[shell-environment.md](./shell-environment.md) for the broader
settings subsystem.

The override hierarchy `MobileMixin` consults (highest priority first):

1. **`Exit.messageOut` / `Exit.messageIn`** — room-author per-exit
   Liquid templates with `{{ mover }}` available. Handy for one-off
   custom narration on a specific door.
2. **Room hooks** on the source/destination Container:
   `getDepartureMessage(mover, exit)`, `getArrivalMessage(mover, exit)`,
   `getTeleportOutMessage(mover)`, `getTeleportInMessage(mover)` —
   each returns `{ self?, peers? }` and Mobile fills in defaults for
   any audience the resolver skipped.
3. **`messages.movement.*` settings** — schema-defaulted, player-overridable.

Each schema entry's default is rendered through `ProseApi.format`,
which interpolates `Mml.name(mover)` and `Mml.direction(...)` and
handles the directional/bland arrive split via `{% if direction %}`
inside a single template — see [prose.md](./prose.md) for the
templating language.

Out of scope for these settings: prose for one-shot controller output
(look, inventory, get/drop, open/close, etc.) lives where the controller
composes it. Most controller prose has no use for configuration —
inline `Mml.compose` is fine.

## Command attribution

Every frame composed during a command's *synchronous* execution carries
both `meta.commandId` and `meta.causingCommandId` (same value). Frames
composed in async aftermath of a command (via a propagating
`ScheduleApi` callback) carry `meta.causingCommandId` but not
`meta.commandId`. Frames composed outside any command lineage carry
neither.

| Scenario                              | commandId | causingCommandId |
|---------------------------------------|-----------|------------------|
| Sync command execution                | set       | set (same id)    |
| Async aftermath of a command          | absent    | set              |
| Pure background (NPC AI, tick)        | absent    | absent           |

`CommandContext` already exists as the per-command bundle
(`commandGiver`, `interactive`, `location`, `commandText`, `executionId`)
and carries `commandId: string` for attribution.
`CommandGiverMixin.executeCommand` is the home of the lifecycle:

1. Generates a fresh `commandId` (nanoid) per execution.
2. Builds the CommandContext, stamping `commandId`.
3. Pushes the CommandContext onto `ExecutionContextApi.commandContext`
   AND sets `causingCommandId` to the same id.
4. Invokes the controller.
5. Pops on return (including error paths). `causingCommandId` clears
   unless propagated by a scheduler.
6. Auto-emits the bland MudlogApi command entry per "Auto-emit on command
   completion".

Inside the controller, ANY frame composed via `Scene.send()` or
`MudlogApi.*` — directly, via mixin sugar, or transitively via deeper
calls — reads `ExecutionContextApi` at compose time and auto-stamps
`meta.commandId` / `meta.causingCommandId`. Producers don't pass
attribution explicitly.

### ScheduleApi — async propagation

`ScheduleApi` (`mud/api/schedule.ts`) is the framework's scheduler.
Single-purpose for v1: one-shot, recurring, cancel.

```typescript
class ScheduleApi {
  static schedule(delayMs: number, fn: () => void,
                  opts?: ScheduleOptions): ScheduleHandle;
  static recurring(intervalMs: number, fn: () => void,
                   opts?: RecurringOptions): ScheduleHandle;
  static cancel(handle: ScheduleHandle): void;
}

interface ScheduleOptions {
  // Default true. Captures
  // ExecutionContextApi.getCurrentCausingCommandId() at schedule time
  // and re-plants it on a fresh Root frame inside the callback.
  // Pass false to sever the chain.
  propagateAttribution?: boolean;
}

interface RecurringOptions extends ScheduleOptions {
  initialDelayMs?: number;          // default = intervalMs
  mode?: 'fixed-rate' | 'fixed-delay';   // default 'fixed-delay'
}
```

`recurring` defaults to `fixed-delay` (next fire = previous-completion
+ interval, drift-tolerant); `fixed-rate` uses `setInterval`'s
predictable cadence (long callbacks can pile up).

Propagation mechanics: when a callback fires, `ScheduleApi` runs it
inside `ExecutionContextApi.runRoot(ScheduleApi, 'fire', …)` — a fresh
Root frame with no live CommandContext, but the captured
`causingCommandId` is re-planted onto the frame's metadata via
`updateCurrentFrameMetadata`. Frames composed inside the callback then
see `causingCommandId` (the originating command) but no `commandId` (no
live execution).

Cascading work extends naturally. If the async callback itself calls
`ScheduleApi.schedule` with propagation, the chain extends as long as
schedulers keep propagating. There's no built-in depth limit;
`propagateAttribution: false` severs the chain.

For recurring schedules, attribution is captured once at schedule time
and reused for every fire. If the originating command is "lighting a
candle that ticks once a second," every tick reads back the same
`causingCommandId`.

## Design rationale

### Composition model (server-side, per-audience)

Messages are composed once on the server, by the producer, with both
their structured payload and console body bound at compose time. The
wire carries both. The alternative — domain events with edge-side
renderer registries — was rejected because it requires either
client-side rendering work (out of scope) or server-edge renderer
registries, which introduce a registry-rot failure mode and break
locality for AI-agent authors.

When the actor and witnesses see different bodies of the same event,
the producer composes both at the same call site (one Scene, multiple
`.toX()` calls). The wire carries one frame per audience.

### Topic vs tags vs scope

Multi-axis classification doesn't fit a single hierarchy. Topic encodes
the producing subsystem (speech machinery → `world.speech.*`); tags
capture orthogonal properties (`audience:witness`); scope is a
producer-side concern that disappears once the frame lands.

Two roots — `world.*` and `system.*` — and that's it. Logs are
`system.log.*`. Widgets are NOT a topic root; widgets are renderers
that consume topic streams and are registered on the client side.

### Sensors are the only recipient type

No "sinks", no "channels", no parallel delivery mechanisms. Anyone
wanting to consume messages (in-game admin console, replay capture,
audit observer) implements or shadows a Sensor. One mechanism, one
lifecycle, one security model.

### MudlogApi is in-game, not stdout

Every MudlogApi call delivers to a Sensor. There is NO stdout fallback,
no singleton sensor, no "framework log" concept. Stdout logging is an
entirely separate concern handled by `console.log` or a future framework
facility. Conflating the two would force every MudlogApi call site to
think about both the in-game and out-of-game audience.

### Shadowing rather than a hook registry

`SensorMixin` exposes `filterMessage` as a shadowable extension point
because lifecycle binding, ordering, security mediation, and call-stack
semantics are already provided by the shadow framework. A parallel hook
registry would re-implement all of these. Single mechanism for content
authors to learn.

`onMessage` itself isn't shadowable: it's the contract. Shadowing it
would let content skip `handleMessage` and break delivery.
`filterMessage` is the explicitly-shadowable surface; `onMessage` and
`handleMessage` are framework plumbing.

### No global heartbeat — periodic behavior is explicitly scheduled

The framework does NOT provide a global tick that objects subscribe to.
Every recurring behavior schedules itself via `ScheduleApi.recurring`
with its own interval. Reasons:

- Cost scales with active scheduled tasks, not with object count —
  10,000 inert objects burn zero CPU.
- Cadence is legible at the call site (grep `schedule` / `recurring`
  reveals every periodic behavior and its interval).
- Fine granularity per task instead of a global compromise interval.
- Matches Node.js's event-loop model rather than fighting it.

Future "reset" mechanics, time-of-day cycles, etc. layer on top of
`ScheduleApi`, not via a heartbeat.

### Containable wins for vessels

When an actor implements both Container and Containable (a vessel —
wardrobe, cart, walking house), the Containable path wins. Vessels
broadcast to peers (other things in the same area), not to contents.
The room a wardrobe sits in is a more meaningful audience for the
wardrobe's speech than the things stuffed inside it. Mixin sugar
checks Containable first; pure-Container actors (a haunted location)
fall through to `toContents`.

## Cross-References

- [templates.md](./templates.md) — template clone pipeline that creates
  the Stuff that compose `SensorMixin`, `VocalMixin`, `MobileMixin`
- [lifecycle.md](./lifecycle.md) — Stuff create/destroy choreography;
  Avatar's `prepareDestroy` clears its `interactives` set
- [persistence.md](./persistence.md) — `Persistable` / around-hook
  machinery; unrelated to messaging but shares `PersistenceManager`
- [state-model.md](./state-model.md) — Avatar self-contained design;
  Avatar runtime fields (`interactives`) are not persisted
- [antipatterns.md § Duck Typing with Mixins](../antipatterns.md#duck-typing-with-mixins)
  — why `MessageApi.getSensors` narrows via `MixinApi.isSensor` rather
  than checking for an `onMessage` method
