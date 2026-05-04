# Messaging System Requirements

## 0. Purpose

This document specifies requirements for the redesigned outbound
messaging system between the Saxonberg server and clients. It is the
input to a planning agent that will produce an implementation plan.

The current outbound messaging code is considered disposable — the
wire envelope, composer surface, and concrete delivery code are all up
for replacement. The Sensor → MessageApi → Application → Backend
skeleton is sound and stays.

## 1. Scope

**In scope:**
- Wire envelope (server → client)
- Server-side composition surface (what controllers, mixins, and game
  objects call to emit messages)
- Topic taxonomy and tag set
- Outbound routing through Sensors
- MudlogApi
- Per-recipient interception via shadowable extension methods on Sensor
- Command-execution correlation (`commandId` for sync execution,
  `causingCommandId` for async aftermath) and auto-emitted bland
  command outcome log entry
- `ScheduleApi` for scheduled callbacks with opt-in attribution
  propagation (the surface that makes `causingCommandId` meaningful
  across async boundaries)

**Out of scope (acknowledged, deferred):**
- Client-side rendering (MML parser, terminal renderer, widget framework)
- Inbound protocol redesign (commands, ping, prompt-response — keep
  current shape)
- General in-game object-to-object event/observer system (separate
  concern; explicit method calls or future EventApi)
- Bus-level taps and wire-level filters; the design accommodates these
  via the same shadow-extension pattern but they are not built in v1
- Emotes (separate subsystem to come later)
- Chat channels and any "channel" routing concept; not designed here
- Server-side stdout logging — entirely separate from MudlogApi (use
  `console.log` or a future framework facility)
- Format-string templating for command outcome summaries (UNIX-shell-style
  variable interpolation) — future enhancement; v1 is plain summaries
- Client-side localization, theming, or per-viewer accessibility variants

---

## 2. Nomenclature

These terms have specific meanings in the messaging system. Code,
comments, and docs should use them precisely.

- **Message frame** — the unit of outbound communication. A typed
  object delivered to a Sensor. Carries a topic, optional tags, an MML
  body, optional structured payload, and metadata.
- **Topic** — *intrinsic* hierarchical classification of a message's
  nature/content. Mandatory. Framework-defined and stable.
  Dot-separated path. Example: `world.speech.say`. Answers "what kind
  of message is this?"
- **Tag** — orthogonal flat property attached to a message.
  Namespace-prefixed string (`audience:witness`). Open set.
- **Scope** — producer-side concern, NOT a property of the message
  itself. Describes how a producer chose to deliver a message (to self,
  to peers, to contents, to a specific target). Once delivered, scope
  is gone — the recipient just has a frame.
- **Sensor** — game object that receives messages. The sole recipient
  type. Existing concept (`SensorMixin`). Avatars and NPCs are sensors;
  custom sensors (debug consoles, audit observers) can be written as
  needed.
- **Body** — MML-formatted string representation of a message. Always
  present on every frame. The console-facing face. Even messages
  primarily consumed by widgets carry a body for accessibility, log
  capture, and fallback display.
- **commandId** — live-command attribution. Present on every frame
  composed during the *synchronous* execution of a command. Travels
  with the frame to every recipient (including witnesses who never
  issued the command). Lets clients identify "frames from command X
  happening right now." See §3.11 and §11.
- **causingCommandId** — causal attribution. Present on every frame
  composed inside work descended from a command — sync execution OR
  async aftermath propagated via opt-in schedulers. In sync execution
  this equals `commandId`; in async aftermath `commandId` is absent
  but `causingCommandId` carries the originating command's id. See
  §3.12 and §11.

The orthogonality of topic and scope is fundamental and should not be
conflated:

| Concept | Where it lives        | Required |
|---------|-----------------------|----------|
| topic   | on the frame          | yes      |
| scope   | producer call only    | producer-side decision |

---

## 3. Design decisions and rationale

These were settled during design discussion and should not be re-debated
by the planner. Brief rationale included to give the planner enough
context to recognize edge cases.

**3.1 Composition model.** Messages are composed once on the server, by
the producer, with both their structured payload and console body
bound at compose time. The wire carries both. The alternative —
domain events with edge-side renderer registries — was rejected
because it requires either client-side rendering work (out of scope) or
server-edge renderer registries, which introduce a registry-rot failure
mode and break locality for AI-agent authors.

**3.2 Producer composes per audience.** When the actor and witnesses
see different bodies of the same event, the producer composes both at
the same call site (one Scene, multiple `.toX()` calls). The wire
carries one frame per audience.

**3.3 No client-side localization or theming in v1.** Deferred.

**3.4 Topic = intrinsic functional kind, tags = everything else
orthogonal.** Multi-axis classification doesn't fit a single hierarchy.
Topic encodes the producing subsystem (speech machinery →
`world.speech.*`); tags capture orthogonal properties
(`audience:witness`).

**3.5 Two topic roots: `world.*` and `system.*`.** Logs are
`system.log.*`. Widgets are NOT a topic root — widgets are renderers
that consume topic streams and are registered on the client side.

**3.6 Every frame carries an MML body.** Even widget-targeted frames.
Ensures accessibility, log capture, and consistent fallback. Structured
payload is optional.

**3.7 Sensors are the only recipient type.** No "sinks", no
"channels", no parallel delivery mechanisms. Anyone wanting to consume
messages (in-game admin console, replay capture, audit observer)
implements or shadows a Sensor.

**3.8 MudlogApi is an in-game messaging facility.** Every call delivers
to a Sensor. Default recipient is the current command giver via
ExecutionContext; can be overridden via opts. There is NO stdout
fallback, no singleton sensor, no "framework log" concept. Stdout
logging is an entirely separate concern that has nothing to do with
MudlogApi.

**3.9 Per-recipient interception uses shadows on a designated
extension method.** Not a parallel hook registration system.
SensorMixin exposes `filterMessage` as a shadowable extension point;
the rest of `onMessage` is framework plumbing. Lifecycle binding,
ordering, and call-security mediation are inherited from the shadow
framework.

**3.10 `CommandResult` is purely semantic.** `{ success: boolean,
summary?: Mml | string }`. The `success` flag means "did the command
achieve its goal?", independent of any messaging that occurred. The
`summary` decorates the auto-emitted bland command-outcome MudlogApi
entry. Controllers handle all prose messaging via Scene; nothing in
CommandResult dictates messages or wire shape.

**3.11 Every frame composed during a command's synchronous execution
carries a `commandId`.** This stamping is automatic — `Scene.send()`
and MudlogApi calls read `ExecutionContext` at compose time and stamp
the active commandId onto each frame. The id is on the frame, so it
travels to every recipient (actor, target, witnesses) regardless of
whether they issued the command.

**3.12 Async work descended from a command preserves causal attribution
via a separate `causingCommandId`, not via `commandId`.** The two
fields have distinct meanings: `commandId` is "live command output,
right now in the synchronous span of executeCommand." `causingCommandId`
is "this frame originated from command X, possibly long ago, possibly
many async hops removed." Propagation across async boundaries is
opt-in at the scheduler level (§11.3) — if a scheduler captures
ExecutionContext at schedule time, the callback's frames carry
`causingCommandId`. Background work with no command ancestry has
neither field set.

**3.13 No global heartbeat. Periodic behavior is explicitly scheduled
per task.** The framework does NOT provide a global tick that objects
subscribe to. Every recurring behavior schedules itself via
`ScheduleApi.recurring` with its own interval. Reasons: (a) cost
scales with active scheduled tasks, not with object count — 10,000
inert objects burn zero CPU; (b) cadence is legible at the call site
(grep for `schedule` / `recurring` reveals every periodic behavior
and its interval); (c) fine granularity per task instead of a global
compromise interval; (d) matches Node.js's event-loop model rather
than fighting it. Future "reset" mechanics, time-of-day cycles, etc.
are built on top of `ScheduleApi`, not via a heartbeat.

**3.14 Phase 7 Exits gain bidirectional back-pointers as part of this
work.** Each paired `Exit` carries an `inverse?: Exit` reference to
its counterpart in the adjoining room, set when both rooms are loaded.
Independent of messaging, this is broadly useful (any code needing the
inverse direction can read it directly instead of going through
ContainmentApi). For messaging specifically, it gives MobileMixin
sugar a clean way to reach the destination-side exit when only the
source-side is in hand. Lazy-load caveat: `inverse` is `undefined`
until both endpoints are loaded; readers must tolerate that. The
back-pointer is established at clone time when an Exit's destination
room is already loaded, and at room-load time for each loose end the
incoming room satisfies.

---

## 4. Wire envelope

### 4.1 Frame shape

```typescript
interface MessageFrame<T = unknown> {
  /** Frame identifier. Used for client-side deduplication. */
  id: string;

  /** Topic path. Dot-separated. Mandatory. See §5. */
  topic: string;

  /** Optional tag set. Namespace-prefixed flat strings. See §6. */
  tags?: string[];

  /** MML body. Always present. The console-facing face of the message. */
  body: string;

  /** Optional structured payload, typed by topic. */
  payload?: T;

  /** Metadata. */
  meta: {
    timestamp: number;        // ms since epoch, server time

    /** Live command output. Present IFF composed during the synchronous
     *  execution of a command. Cleared on executeCommand return. */
    commandId?: string;

    /** Causal attribution. Present IFF composed inside work descended
     *  from a command (sync OR async, propagated via opt-in schedulers).
     *  In sync execution, equals commandId. In async aftermath, set
     *  while commandId is absent. See §3.12 and §11. */
    causingCommandId?: string;

    // additional fields TBD by planner (e.g., correlation id for prompts)
  };
}
```

### 4.2 Per-topic payload typing

Each topic owns a payload type. Producers and consumers narrow at use
site:

```typescript
type SaySpeechPayload = { speaker: StuffRef; text: string };
const frame: MessageFrame<SaySpeechPayload> = scene.send();
```

A future iteration may layer a `TopicPayloadMap` interface (TS module
augmentation) so `MessageFrame<'world.speech.say'>` infers the payload
type from the topic constant. Not required for v1.

### 4.3 Discriminated union payloads for asymmetric audiences

When per-audience payloads diverge, the topic's payload type is a
discriminated union keyed by `audience`:

```typescript
type CombatHitPayload =
  | { audience: 'actor';   damage: number; weapon: string;       target: StuffRef }
  | { audience: 'target';  damage: number; healthRemaining: number; attacker: StuffRef }
  | { audience: 'witness'; attacker: StuffRef; target: StuffRef };
```

The frame's `audience:` tag discriminates the union; consumer code
narrows via TS pattern matching.

### 4.4 Stuff references

Frames sent over the wire cannot include direct Stuff references.
Payloads use `StuffRef`:

```typescript
interface StuffRef {
  stuffId: string;
  displayName?: string;  // pre-resolved server-side at compose time
}
```

That's the minimum committed shape. Expand later if needed.

### 4.5 Frame `id` generation

`nanoid()` called inline at frame construction (likely inside
`Scene.send()` and `MudlogApi.*`). No dedicated `IdApi` wrapper —
single-method utility doesn't pay for itself.

---

## 5. Topic taxonomy

Two roots. Dot-separated paths. Lowercase. Singular nouns where
possible.

```
world.                          # in-fiction
  speech.
    say
    tell
  perception.
    look
    inventory
  narration.
    movement                     # walking-style depart/arrive
    teleport                     # sudden, magical in/out

system.                          # out-of-fiction infrastructure
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

That is the entire v1 taxonomy. The planner adds new topics as new
features need them — no "reserved" subtrees pre-declared.

### 5.1 Topic conventions

- All paths lowercase.
- Dot-separated.
- Leaves should be specific enough that a single MML template applies
  (e.g. `world.speech.say` is a leaf; `world.speech` is not).
- Adding a new topic requires no framework changes — producers just
  emit the new topic string.
- Failed commands aren't a special topic. A `look` that found nothing
  still composes prose at `world.perception.look`; the failure is
  captured by the auto-emitted bland MudlogApi entry (§9.4) and the
  controller's `success: false` return.

### 5.2 Topic constants — exposed via `MessageApi.Topics`

Topic constants live as a static readonly property on `MessageApi`,
not in their own module. Keeps the public surface centralized: you
get the bus, the scene factory, the topics, and the tags from the
same import.

```typescript
// On MessageApi (packages/server/src/mud/api/message.ts)
class MessageApi {
  // ... existing sensor primitives, scene factory ...

  static readonly Topics = {
    world: {
      speech: {
        say:  'world.speech.say',
        tell: 'world.speech.tell',
      },
      perception: {
        look:      'world.perception.look',
        inventory: 'world.perception.inventory',
      },
      narration: {
        movement: 'world.narration.movement',
        teleport: 'world.narration.teleport',
      },
    },
    system: {
      connection: {
        established: 'system.connection.established',
        lost:        'system.connection.lost',
      },
      auth: {
        success: 'system.auth.success',
        failed:  'system.auth.failed',
      },
      log: {
        root:    'system.log',           // root for prefix matching / dynamic categories
        command: 'system.log.command',   // bland command-outcome auto-emit (§9.4)
        // additional known framework categories added as they're used
      },
    },
  } as const;
}

// Usage:
MessageApi.scene(speaker).topic(MessageApi.Topics.world.speech.say)...
MudlogApi.info(Mml.compose`...`);                           // dynamic category
MudlogApi.info('hot-reload', Mml.compose`...`);             // dynamic category
// (MessageApi.Topics.system.log.command is for the framework's auto-emit;
//  application code uses category strings.)
```

Topic strings aren't expected to be repeated heavily, but the constants
namespace gives autocomplete, grep-ability, and rename safety. Worth
the small surface cost on MessageApi.

---

## 6. Tags

Open-set, flat, namespace-prefixed strings. Producers attach as
`tags: string[]` on frames.

### 6.1 v1 namespace

```
audience:  actor | target | witness | bystander
```

This is the only namespace defined in v1 — it's load-bearing for the
discriminated-union payload pattern (§4.3) and audience-aware
filtering. Other namespaces (modality, urgency, context, locale, etc.)
will be introduced when first feature actually needs them; no
preemptive constants.

### 6.2 Tag constants — exposed via `MessageApi.Tags`

Tag constants live as a static readonly property on `MessageApi`
alongside `Topics` (§5.2). Same rationale: centralized public surface.

```typescript
// On MessageApi (packages/server/src/mud/api/message.ts)
class MessageApi {
  // ... Topics ...

  static readonly Tags = {
    Audience: {
      Actor:     'audience:actor',
      Target:    'audience:target',
      Witness:   'audience:witness',
      Bystander: 'audience:bystander',
    },
  } as const;
}

// Usage:
MessageApi.scene(actor)
  .topic(MessageApi.Topics.world.speech.say)
  .toSelf(body, { audience: MessageApi.Tags.Audience.Actor, ... })
  ...
```

Producers SHOULD use these constants instead of string literals for the
known set, both for autocomplete and to catch typos at compile time.
Future namespaces extend the same constant on MessageApi.

### 6.3 Audience tags are mandatory on multi-audience frames

Whenever a Scene composes per-audience frames, each frame MUST carry
an `audience:` tag identifying its role. This drives discriminated-union
payload narrowing (§4.3) and lets audience-aware logic reason about
whose perspective a frame is from.

---

## 7. Composer stack

Producers compose at the highest layer that fits.

```
Layer 4: Domain sugar           say(), announceDeparture(),
                                announceArrival(), ...
                                Lives on mixins. Owns canonical patterns.

Layer 3: Scene builder          Multi-audience composition. Emits one
                                frame per audience and dispatches.

Layer 2: Mml composer           Tagged template + token vocabulary.
                                Mml.compose, Mml.name(), Mml.speech(), ...

Layer 1: Routing primitives     MessageApi.messageContents/Container,
                                Application.sendMessageToInteractive (existing).
```

### 7.1 Layer 2 — `Mml`

A small composer library. Vocabulary helpers return Mml fragments;
tagged template composes them into final MML strings with auto-escaping
of interpolated raw values.

#### Internal representation: wrapper class

```typescript
class Mml {
  // Constructor is private. Use Mml.compose for assembly from values
  // (escapes raw strings) or Mml.fromMarkup for trusted MML input.
  private constructor(private readonly raw: string) {}

  /** Compose from values via tagged template. Escapes interpolated
   *  raw strings per §7.1 interpolation rules. The safe default. */
  static compose(strings: TemplateStringsArray, ...values: unknown[]): Mml { /* ... */ }

  /** Wrap a string already known to be valid MML — does NOT escape.
   *  Use for hydration, deserialization, or known-trusted programmatic
   *  assembly. Misuse = injection. Grep `Mml.fromMarkup` to audit. */
  static fromMarkup(raw: string): Mml { /* ... */ }

  toString(): string { return this.raw; }
  toJSON(): string { return this.raw; }

  // future: concat(), transform(), etc.
}
```

`Mml` is a wrapper around a string. Distinct type at compile time;
small allocation cost at runtime. The `toJSON()` method ensures the
string serializes correctly when an Mml ends up in a payload that
gets `JSON.stringify`'d. Wire frames carry `body` as a plain string
(unwrapped at the boundary by Scene/MudlogApi when populating
`MessageFrame.body`).

The private constructor + named factories pattern makes trust
explicit: every site that wraps an untrusted-shape string must say
`Mml.fromMarkup(...)`, which is grep-able for security audit.
Composition from values is via `Mml.compose` (always safe).

#### Vocabulary

```typescript
Mml.name(stuff: Stuff): Mml          // -> <name>Alice</name>
Mml.speech(text: string): Mml        // -> <speech>"..."</speech>, with escape
Mml.location(stuff: Stuff): Mml
Mml.direction(d: string): Mml
Mml.object(stuff: Stuff): Mml
Mml.item(stuff: Stuff): Mml
Mml.list(items: Mml[]): Mml          // -> joined, comma-separated, etc.
// ... extend as the vocabulary grows

// Tagged template — interpolates Mml fragments verbatim, escapes raw.
const m: Mml = Mml.compose`${Mml.name(speaker)} says, ${Mml.speech(text)}`;

// Plain-text projection (used when stripping markup is needed).
Mml.stripTags(body: string): string;
```

#### Interpolation rules for `Mml.compose`

- `Mml` fragments → emitted verbatim.
- Raw strings → escaped (`<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`,
  `"` → `&quot;`, `'` → `&apos;`).
- Numbers and booleans → `String()` then escape.
- Stuff references → call `toMml()` if defined, else `toString()` then
  escape.
- Other objects → `toMml()` if defined, else `toString()` then escape.
- `null`/`undefined` → empty string.

#### Escaping precedence: re-escape, no detection

When a vocabulary helper is called with a string argument that contains
markup-like characters (e.g., `Mml.location("<name>foo</name>")`), the
characters are re-escaped. The user sees the literal text inside the
expected tag. No detect-and-warn, no pass-through.

**Rationale**: security-correct by default. String arguments are
treated as untrusted user data and always escaped. Devs who want to
nest markup must compose with Mml fragments explicitly. Bug surface
shows up as visible literal text, which is caught quickly during
testing. Pass-through is dangerous (XSS-equivalent for our renderer);
hard reject is too brittle.

**Documented contract**: "string arguments to vocabulary helpers are
always escaped. Nest markup with Mml fragments."

### 7.2 Layer 3 — Scene (factory: `MessageApi.scene`)

Multi-audience composer. Builds one or more frames and dispatches them.

The Scene class lives inside the MessageApi module — there is no
`scene.ts` and no top-level `Scene` export. Construction goes through
`MessageApi.scene(actor)`, which returns a Scene builder. The Scene
class itself may be exported as a type for annotation purposes (e.g.,
when a helper accepts a partially-built Scene), but it has no public
constructor or static factory of its own. All entry is via MessageApi.

```typescript
// Simple: shared payload across all audience frames
MessageApi.scene(speaker)
  .topic(MessageApi.Topics.world.speech.say)
  .toSelf(Mml.compose`You say, ${Mml.speech(text)}`)
  .toPeers(Mml.compose`${Mml.name(speaker)} says, ${Mml.speech(text)}`)
  .payload({ speaker: refOf(speaker), text })   // shared
  .send();

// Asymmetric: per-audience payload overrides
MessageApi.scene(attacker)
  .topic('world.narration.combat.hit')   // ad-hoc topic; not in Topics module yet
  .toSelf(
    Mml.compose`You hit ${Mml.name(victim)} for ${damage} damage.`,
    { audience: 'actor', damage, weapon: weaponState, target: refOf(victim) },
  )
  .toTarget(victim,
    Mml.compose`${Mml.name(attacker)} hits you for ${damage} damage!`,
    { audience: 'target', damage, healthRemaining: victim.health, attacker: refOf(attacker) },
  )
  .toPeers(
    Mml.compose`${Mml.name(attacker)} hits ${Mml.name(victim)}.`,
    { audience: 'witness', attacker: refOf(attacker), target: refOf(victim) },
  )
  .send();
```

#### Scene API surface (sketch — planner to refine)

- `MessageApi.scene(actor: Stuff)` — establishes the actor identity. The
  actor is any Stuff. Specific compositional requirements (Sensor,
  Containable, Container) are validated per `.toX()` method, not at
  `MessageApi.scene`. Ambient/environmental messages use whatever Stuff the
  content author treats as the originator (the Location itself, a
  Zone, a dedicated weather entity, an ambience object — framework
  doesn't dictate). There is no actor-less scene.
- `.topic(path: string)` — required.
- `.tags(tags: string[])` — optional shared tags, merged with
  per-audience tags.
- `.payload(p: T)` — optional shared payload, used for any audience
  that doesn't override.
- `.toSelf(body, payload?)` — actor frame. Auto-tags `audience:actor`.
  Requires actor to be a Sensor (else throws).
- `.toTarget(target, body, payload?)` — single-target frame. Auto-tags
  `audience:target`. Requires target to be a Sensor (else throws).
- `.toPeers(body, payload?)` — broadcasts to actor's environment;
  excludes actor and target. Auto-tags `audience:witness`. Requires
  actor to be Containable (else throws). Use when the actor is in a
  place (the typical case: avatar in a room).
- `.toContents(body, payload?)` — broadcasts to actor's contents;
  excludes actor. Auto-tags `audience:witness`. Requires actor to be
  Container (else throws). Use when the actor IS the container (e.g.,
  a haunted location speaking to its occupants, or any environmental
  Stuff narrating to its contents).
- `.send()` — dispatches all configured frames.

Scene returns a builder; chained calls produce a single dispatch on
`.send()`. Multiple `.toX()` calls of the same type are an error (one
frame per audience role per scene).

`.toPeers()` exclusion: when both `.toSelf()` and `.toTarget()` are
present, `.toPeers()` excludes both — witnesses are everyone except
the actor and target.

#### Automatic command attribution stamping

When `.send()` runs inside an active command execution, every emitted
frame is stamped with `meta.commandId` and `meta.causingCommandId`
read from `ExecutionContext.commandContext` and
`ExecutionContext.causingCommandId` respectively (§11). The ids travel
to every recipient regardless of whether they're the actor, target,
or witness.

### 7.3 Layer 4 — Mixin sugar

Canonical patterns live as methods on the mixins that own them.
Internal implementations use Layers 2–3 — never hand-build frames or
hand-route. Mixin sugar inspects the actor's composition to pick the
right scope (e.g., `say()` picks `toPeers` for Containable actors,
`toContents` for pure-Container actors).

#### Vessels (Container + Containable): Containable wins

When an actor implements both Container and Containable (a vessel —
wardrobe, cart, walking house), the Containable path wins. Vessels
broadcast to peers (other things in the same area), not to contents.
Mixin sugar checks Containable first:

```typescript
// VocalMixin
say(text: string): void {
  const scene = MessageApi.scene(this).topic(MessageApi.Topics.world.speech.say)
    .toSelf(Mml.compose`You say, ${Mml.speech(text)}`)
    .payload({ speaker: refOf(this), text });

  const witnessBody = Mml.compose`${Mml.name(this)} says, ${Mml.speech(text)}`;
  if (MixinApi.isContainable(this))     scene.toPeers(witnessBody);
  else if (MixinApi.isContainer(this))  scene.toContents(witnessBody);
  else throw new Error('VocalMixin requires Container or Containable');

  scene.send();
}

// MobileMixin — split on arrive/depart, with optional Exit. Exit
// presence determines walking vs teleport: with exit → topic
// `world.narration.movement` and direction-bearing prose; without
// exit → topic `world.narration.teleport` and sudden/magical prose.
//
// The exit passed to each method is the room-local exit (the source
// room's exit for departure; the destination room's exit for arrival).
// ContainmentApi orchestrates the move and resolves both exits; it
// then calls these methods with the appropriate room/exit pair.
// `exit.direction` is therefore correct for the room being addressed,
// no cross-room lookup needed.

announceDeparture(from: Location, fromExit?: Exit): void {
  if (fromExit) {
    MessageApi.scene(this).topic(MessageApi.Topics.world.narration.movement)
      .toSelf(Mml.compose`You head ${Mml.direction(fromExit.direction)}.`)
      .toPeers(Mml.compose`${Mml.name(this)} heads ${Mml.direction(fromExit.direction)}.`)
      .send();
  } else {
    MessageApi.scene(this).topic(MessageApi.Topics.world.narration.teleport)
      .toSelf(Mml.compose`The world dissolves around you.`)
      .toPeers(Mml.compose`${Mml.name(this)} vanishes.`)
      .send();
  }
}

announceArrival(to: Location, toExit?: Exit): void {
  if (toExit) {
    MessageApi.scene(this).topic(MessageApi.Topics.world.narration.movement)
      .toSelf(Mml.compose`You arrive.`)
      .toPeers(Mml.compose`${Mml.name(this)} arrives from the ${Mml.direction(toExit.direction)}.`)
      .send();
  } else {
    MessageApi.scene(this).topic(MessageApi.Topics.world.narration.teleport)
      .toSelf(Mml.compose`You materialize.`)
      .toPeers(Mml.compose`${Mml.name(this)} appears out of nowhere.`)
      .send();
  }
}
```

Mixins own the sugar for their concern. Adding a new canonical pattern
means: identify the owning mixin, add the method, use Scene internally.

### 7.4 Controllers

Controllers handle ALL prose messaging via Scene (or via mixin sugar
which uses Scene internally). They return a small `CommandResult` that
carries outcome semantics only — never wire-shape data.

```typescript
interface CommandResult {
  success: boolean;
  // Optional summary for the auto-emitted MudlogApi command entry (§9.4).
  // Replaces the generic "ok"/"failed" tail in the bland log entry body.
  summary?: Mml | string;
}
```

`success` is purely about command outcome ("did the command achieve
its goal?"). It is not a messaging flag and must not be set based on
"did I display a message to the user."

#### Examples

```typescript
// Found case — prose Scene, success
execute(input, context): CommandResult {
  MessageApi.scene(actor).topic(MessageApi.Topics.world.perception.look)
    .toSelf(Mml.compose`You see ${describe(target)}.`)
    .send();
  return { success: true, summary: 'examined the rusty sword' };
}

// Not-found case — prose Scene, failure
execute(input, context): CommandResult {
  MessageApi.scene(actor).topic(MessageApi.Topics.world.perception.look)
    .toSelf(Mml.compose`You don't see a sword here.`)
    .send();
  return { success: false, summary: 'no such object' };
}

// Side-effect case — sugar fires Scene; commandId stamped automatically
execute(input, context): CommandResult {
  context.commandGiver.say(input.text);
  return { success: true };
}

// Multi-audience case
execute(input, context): CommandResult {
  MessageApi.scene(actor).topic(MessageApi.Topics.world.narration.movement)
    .toSelf(Mml.compose`You leave.`)
    .toPeers(Mml.compose`${Mml.name(actor)} leaves.`)
    .send();
  return { success: true };
}
```

Note that the `world.perception.look` topic is used for both the
"found" and "not-found" prose. Topics describe what the message is
ABOUT, not whether the underlying action succeeded. Outcome is captured
by `success` and the auto-emitted MudlogApi entry.

---

## 8. Outbound routing

### 8.1 The bus

The current `MessageApi` is the routing surface. It receives a
`MessageFrame` from `Scene.send()` (one call per audience-frame) and
delivers to the appropriate Sensor(s) based on the producer's `.toX()`
choices. That's it.

Sensors are the only recipient type. There is no "channel" delivery,
no "log sink" delivery, no parallel mechanism.

### 8.2 Frame lifecycle

```
Producer (controller / mixin)
    ↓ composes via Layer 4 sugar (typically) or direct Scene
Scene.send()
    ↓ stamps commandId + causingCommandId from ExecutionContext
    ↓ (whichever are set; both, one, or neither — see §11)
    ↓ produces 1+ MessageFrame, dispatches each via MessageApi
MessageApi (bus)
    ↓ routes per-frame to target Sensor(s)
Sensor.onMessage(frame)
    ↓ filterMessage(frame)  — shadowable extension point (§10)
    ↓ handleMessage(frame)  — subclass delivery
Avatar.handleMessage(frame)
    ↓ for each connected Interactive
Application.sendMessageToInteractive(interactive, frame)
    ↓
Backend.sendMessageToSocket(socketId, frame)
    ↓ JSON.stringify
WebSocket.send
```

For non-Avatar Sensors (NPCs, custom observers), `handleMessage` does
whatever that Sensor does — there's no special path.

---

## 9. MudlogApi

In-game messaging facility for log-style content. Every call delivers
to a Sensor. Topic is `system.log.<category>.<level>`.

### 9.1 API surface

```typescript
class MudlogApi {
  // Body-only overload: omits category. Topic becomes system.log.<level>.
  static trace(body: Mml, opts?: MudlogOptions): void;
  static debug(body: Mml, opts?: MudlogOptions): void;
  static info (body: Mml, opts?: MudlogOptions): void;
  static warn (body: Mml, opts?: MudlogOptions): void;
  static error(body: Mml, opts?: MudlogOptions): void;
  static fatal(body: Mml, opts?: MudlogOptions): void;

  // Categorized overload. Topic becomes system.log.<category>.<level>.
  static trace(category: string, body: Mml, opts?: MudlogOptions): void;
  static debug(category: string, body: Mml, opts?: MudlogOptions): void;
  static info (category: string, body: Mml, opts?: MudlogOptions): void;
  static warn (category: string, body: Mml, opts?: MudlogOptions): void;
  static error(category: string, body: Mml, opts?: MudlogOptions): void;
  static fatal(category: string, body: Mml, opts?: MudlogOptions): void;

  static isEnabled(category: string | undefined, level: LogLevel): boolean;
}

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface MudlogOptions {
  to?: Sensor | Sensor[];   // explicit recipient(s); default = current command giver
  payload?: unknown;
}
```

Most ad-hoc log calls don't have a meaningful category. The body-only
overload is the cheap default; named categories are for subsystems
that benefit from filtering (`hot-reload`, `security`, `command`,
`persistence`, etc.).

### 9.2 Recipient resolution

1. If `opts.to` is provided → deliver to those Sensor(s).
2. Else look up command giver via `ExecutionContext`. If present →
   deliver to them.
3. Else → **throw**. Calling MudlogApi without an obtainable recipient
   is a bug, not a fallback case. Stdout has nothing to do with this
   facility.

### 9.3 Usage

```typescript
MudlogApi.info('hot-reload',
  Mml.compose`Reloaded module ${moduleRef}, ${dependents.length} dependents`);

// During a command execution, frame is auto-stamped with commandId.
// Recipient defaults to the command giver from ExecutionContext.

if (MudlogApi.isEnabled('combat', 'debug')) {
  MudlogApi.debug('combat',
    Mml.compose`${Mml.name(attacker)} swing detail: ${expensive.computation()}`);
}

// Explicit recipient override
MudlogApi.info('admin',
  Mml.compose`${Mml.name(player)} just hit level 50`,
  { to: [admin1, admin2] });
```

`isEnabled` enables the log4j-style "skip composition when disabled"
pattern for hot paths. Most call sites won't need the guard because
`Mml.compose` is cheap.

### 9.4 Auto-emit on command completion (the "bland log")

`CommandGiverMixin.executeCommand` automatically emits a MudlogApi
entry per command, addressed to the actor. This is the uniform,
hidable, structured log that complements the controller's prose
Scenes.

```typescript
// Conceptual; lives at the end of CommandGiverMixin.executeCommand
const tail = result.summary ?? (result.success ? 'ok' : 'failed');
const body = Mml.compose`${verb}: ${tail}`;
const level: LogLevel = result.success ? 'info' : 'warn';

MudlogApi[level]('command', body, {
  to: actor,
  payload: { verb, success: result.success /* + planner discretion */ },
});
```

Resulting frames carry topic `system.log.command.info` or
`system.log.command.warn`. Body examples:

- Default success: `look: ok`
- Default failure: `say: failed`
- With summary: `look: examined the rusty sword`
- With summary: `look: no such object`

Both this MudlogApi entry AND any prose Scenes the controller fired
share the same `commandId` (via auto-stamping from ExecutionContext).
UI can correlate, group, filter, route to different panels — whatever
it wants. Future enhancement: format-string templating with variables
(UNIX-shell-style). Out of scope for v1.

### 9.5 Stdout logging is unrelated

Server-side stdout / file logging is a SEPARATE concern. Use
`console.log` or whatever framework facility exists outside MudlogApi.
MudlogApi is purely an in-game messaging facility; it has no opinion
on stdout, no fallback to stdout, no relationship to stdout.

---

## 10. Per-recipient interception via `filterMessage`

`SensorMixin` exposes a designated, shadowable extension method. Game
content (spells, shadows, listeners) intercepts incoming messages by
shadowing `filterMessage`, NOT by registering with a parallel hook
system.

### 10.1 SensorMixin shape

```typescript
interface Sensor {
  onMessage(frame: MessageFrame): void;
}

// In SensorMixin:
onMessage(frame: MessageFrame): void {
  const transformed = this.filterMessage(frame);
  if (transformed === null) return;  // dropped — recipient sees nothing
  this.handleMessage(transformed);
}

// Shadowable extension point. Empty default. Game content shadows this.
// Returns the frame to deliver (possibly modified), or null to drop.
protected filterMessage(frame: MessageFrame): MessageFrame | null {
  return frame;
}

// Subclass override for actual delivery (Avatar multiplexes to
// Interactives, etc.).
protected handleMessage(frame: MessageFrame): void {
  // default no-op
}
```

### 10.2 Why shadowing rather than a hook registry

Lifecycle binding, ordering, security mediation, and call-stack
semantics are already provided by the shadow framework. A parallel
hook registry would re-implement all of these. Single mechanism for
content authors to learn.

### 10.3 Why a designated extension method rather than shadowing `onMessage` directly

`onMessage` is a contract — "sensors receive messages." Shadowing it
directly would let content skip `handleMessage` and break delivery.
`filterMessage` is the explicitly-shadowable surface; `onMessage` and
`handleMessage` are framework plumbing.

### 10.4 Modification convention

Hooks should treat frames as immutable and return new objects when
modifying:

```typescript
return { ...frame, body: garble(frame.body) };
```

The framework does not enforce immutability via `Object.freeze` (cost),
but a hook that mutates in place and returns the same reference is
incorrect.

### 10.5 Future extension points (same pattern, deferred)

The same template-method-with-shadowable-extension shape will apply to:

- **Bus-level taps** — `MessageApi.previewBroadcast(frame)`. For
  replay/audit observers.
- **Wire-level filters** — `Interactive.filterOutgoing(frame)`. For
  protocol/transport concerns.

Neither is implemented in v1, but the pattern is established so future
additions don't introduce new mechanisms.

---

## 11. Command execution and command attribution

### 11.1 The two attribution fields

- **`commandId`** — live command output. Set IFF the frame is composed
  during the synchronous span of `executeCommand`. Cleared the moment
  control returns from the controller. Tells UI: "this is what just
  happened in response to typing a command."
- **`causingCommandId`** — causal attribution. Set IFF the frame is
  composed inside work descended from a command (sync OR async,
  propagated via opt-in schedulers). In sync execution, equals
  `commandId`. In async aftermath, set while `commandId` is absent.

| Scenario                              | commandId | causingCommandId |
|---------------------------------------|-----------|------------------|
| Sync command execution                | set       | set (same id)    |
| Async aftermath of a command          | absent    | set              |
| Pure background (NPC AI, tick)        | absent    | absent           |

### 11.2 `CommandGiverMixin.executeCommand` lifecycle

`CommandContext` already exists in the codebase
(`packages/server/src/mud/api/command.ts`) as the per-command data
bundle (commandGiver, interactive, location, commandText,
executionId). It is extended with `commandId: string` for command
attribution. The active CommandContext is attached to ExecutionContext
during command execution:

```typescript
// CommandContext (extended)
interface CommandContext {
  commandGiver: Stuff & CommandGiver;
  interactive: Interactive;
  location: Location;
  commandText: string;
  executionId: string;     // existing security/call-stack id
  commandId: string;       // NEW — command attribution id
}

// ExecutionContext (extended)
ExecutionContext.commandContext?: CommandContext;   // present in sync command execution
ExecutionContext.causingCommandId?: string;         // survives async propagation
```

`CommandGiverMixin.executeCommand` is the home of the command
lifecycle. It is responsible for:

1. Generating a fresh `commandId` (nanoid) per execution.
2. Building the CommandContext (already does this) and stamping
   commandId onto it.
3. Pushing the CommandContext onto `ExecutionContext.commandContext`
   AND setting `ExecutionContext.causingCommandId` to the same
   commandId.
4. Invoking the controller.
5. Popping `ExecutionContext.commandContext` when control returns
   (including error paths). `ExecutionContext.causingCommandId` is
   also cleared unless propagated by a scheduler (§11.3).
6. Auto-emitting the bland MudlogApi command entry per §9.4.

Inside the controller call, ANY frame composed (via Scene.send() or
MudlogApi.* — directly, indirectly via mixin sugar, or transitively
via deeper calls) reads `ExecutionContext.commandContext?.commandId`
and `ExecutionContext.causingCommandId` at compose time and stamps
them onto `meta.commandId` and `meta.causingCommandId`. Automatic;
producers do not pass attribution explicitly.

### 11.3 Async propagation (opt-in via schedulers)

When a command schedules async work (a timer, a deferred callback, a
delayed effect), the scheduler decides whether to propagate causal
attribution. The default policy is **propagate**, but propagation is
opt-in at the scheduler API surface — it doesn't happen automatically
across every Promise boundary.

The framework provides `ScheduleApi` for this:

```typescript
// packages/server/src/mud/api/schedule.ts
class ScheduleApi {
  // One-shot delayed callback. Returns a handle for cancellation.
  static schedule(delayMs: number, fn: () => void, opts?: ScheduleOptions): ScheduleHandle;

  // Recurring callback. Default: first fire after intervalMs, then every
  // intervalMs. See RecurringOptions to tune.
  static recurring(intervalMs: number, fn: () => void, opts?: RecurringOptions): ScheduleHandle;

  // Cancel a previously scheduled callback. Idempotent. For recurring
  // schedules, cancels all future fires.
  static cancel(handle: ScheduleHandle): void;
}

interface ScheduleOptions {
  /** When true (default), captures ExecutionContext.causingCommandId at
   *  schedule time and restores it for the callback. When false, the
   *  callback runs with no command attribution (chain is severed). */
  propagateAttribution?: boolean;  // default: true
}

interface RecurringOptions extends ScheduleOptions {
  /** Optional initial delay before the first fire. Defaults to intervalMs
   *  (i.e., first fire happens after one full interval). Set to 0 for
   *  fire-now-then-recur semantics. */
  initialDelayMs?: number;

  /** Drift handling.
   *  - 'fixed-delay' (default): next fire = previous-completion + interval.
   *    Drift-tolerant; cadence depends on callback runtime.
   *  - 'fixed-rate': next fire = scheduled-time + N*interval. Predictable
   *    cadence; if callback runs long, fires can pile up. */
  mode?: 'fixed-rate' | 'fixed-delay';
}

interface ScheduleHandle {
  readonly id: string;
}
```

ScheduleApi is single-purpose for v1: one-shots, recurring, cancel.
Game-time scheduling, cron-style triggers, calendar-aware fires,
"reset" mechanics — all are layers built ON TOP of this API when
their use cases land. They are not built into ScheduleApi itself.

A propagating schedule call captures `ExecutionContext.causingCommandId`
at schedule time, and when the callback fires:

1. Restores `ExecutionContext.causingCommandId` to the captured value.
2. Leaves `ExecutionContext.commandContext` undefined (we're no longer
   inside synchronous command execution; there is no live CommandContext).
3. Invokes the callback.
4. Clears the restored attribution on callback return.

Frames composed inside such a callback carry `causingCommandId` (the
captured originating command) but not `commandId` (no live execution).
Same is true for cascading work — if the async callback itself calls
`ScheduleApi.schedule` with propagation, the chain extends as long as
schedulers keep propagating. There's no built-in depth limit; callers
can break the chain by passing `propagateAttribution: false`.

### 11.4 Frames outside any command lineage

Background ticks, NPC AI loops, server startup work, etc. — none of
this has command ancestry. Frames composed here carry neither
`commandId` nor `causingCommandId`. Both fields are simply absent.

---

## 12. Migration

### 12.1 What stays

- `IBackend.sendMessageToSocket` and the `Backend` implementation.
  Wire-level transport unchanged.
- `Application.sendMessageToInteractive` as the sole game-object → wire
  gateway.
- `Avatar`'s multiplexing role (one Avatar may have multiple
  Interactives).
- `MessageApi`'s sensor-routing primitives (`messageContents`,
  `messageContainer`, `getSensors`).
- `SensorMixin` and `VocalMixin` mixin shape (interfaces evolve but
  the mixins remain).
- `ExecutionContextApi` (extended with `commandContext` and
  `causingCommandId` per §11.2).

### 12.2 What burns

- The current `WebSocketMessage` envelope (`{ type, payload, id, error }`)
  — replaced by `MessageFrame`.
- The `MessageType` enum — replaced by topic strings.
- The `connection_established` payload shape — replaced by an
  appropriate `system.connection.established` frame with structured
  payload for client bootstrap data.
- All hand-built `{ type: 'output', payload: { text: '...' } }` literals
  in controllers and `Login` — replaced by Scene-based composition.
- Inline MML string concatenation everywhere — replaced by `Mml.compose`
  and vocabulary helpers.
- `CommandResult.error` and `CommandResult.output` — replaced by
  `CommandResult.summary` (decorates the auto-emit) and Scene-based
  prose. Success/failure becomes purely semantic.
- `TellController`'s direct construction of a wire envelope and direct
  `target.onMessage(envelope)` call — replaced by
  `MessageApi.scene(speaker).toSelf(...).toTarget(target, ...).send()`.

### 12.3 Approximate touch list (planner to expand)

- `packages/types/src/index.ts` — add `MessageFrame`, `StuffRef`;
  remove `WebSocketMessage`, `MessageType`,
  `ConnectionEstablishedPayload`, etc.
- `packages/server/src/mud/api/message.ts` — substantial extension:
  keep existing sensor primitives (`getSensors`, `messageContents`,
  `messageContainer`); add `MessageApi.scene(actor)` factory; add
  the `Scene` builder class (in same module, not exported as its own
  API); add `MessageApi.Topics` and `MessageApi.Tags` static readonly
  constant namespaces. No separate `scene.ts`, `topics.ts`, or
  `tags.ts` files — keep the messaging public surface centralized on
  one Api.
- `packages/server/src/mud/lib/message/Sensor.ts` — add `filterMessage`
  extension method; refactor `onMessage` to call it; introduce
  `handleMessage` subclass extension point.
- `packages/server/src/mud/obj/Avatar.ts` — convert current
  `onMessage` override into a `handleMessage` override.
- `packages/server/src/mud/lib/message/Vocal.ts` — rewrite `say` using
  Scene.
- `packages/server/src/mud/lib/spatial/Mobile.ts` — add
  `announceDeparture(from, exit?)` and `announceArrival(to, exit?)`
  sugar methods (exit-presence determines walking vs teleport
  flavor).
- `packages/server/src/mud/lib/spatial/Exit.ts` (and `Exitable.ts` /
  any pairing helper like `addBidirectionalExit`) — add `inverse?:
  Exit` back-pointer per §3.14. Wire up the back-pointer at clone
  time and at room-load time; tolerate `undefined` until both ends
  are loaded.
- `packages/server/src/mud/api/containment.ts` — when orchestrating a
  move, resolve both source-side and destination-side Exits and pass
  each to its corresponding MobileMixin announce method.
- `packages/server/src/mud/lib/command/CommandGiver.ts` — extend
  `executeCommand` to push/pop `commandId` and `causingCommandId`,
  auto-emit bland MudlogApi entry on completion.
- `packages/server/src/mud/api/execution-context.ts` — extend to carry
  `commandContext?: CommandContext` (the active per-command bundle)
  and `causingCommandId?: string` (causal attribution surviving async).
- `packages/server/src/mud/api/command.ts` — extend `CommandContext`
  with `commandId: string`.
- New: `packages/server/src/mud/api/schedule.ts` — `ScheduleApi` that
  supports opt-in attribution propagation (§11.3). Even if v1 doesn't
  ship complex async use cases, the API exists so the first
  scheduled-work need has a propagation-aware home.
- New: `packages/server/src/mud/api/mml.ts` — Mml composer + vocabulary.
- New: `packages/server/src/mud/api/mudlog.ts` — MudlogApi.
  (Scene, Topics, and Tags do NOT get their own files — they live
  inside `message.ts` per the entry above.)
- All controllers in `packages/server/src/mud/obj/command/` — rewrite
  to use sugar/Scene; drop hand-built envelopes; return
  `CommandResult { success, summary? }` only.
- `packages/server/src/mud/obj/Login.ts` — rewrite welcome and look
  paths to use Scene + appropriate topics.
- `packages/server/src/backend/Application.ts` — `processUserMessage`
  no longer wraps `result.output`; `handleCommandMessage` simpler.
- Client: `packages/client/src/components/Terminal.tsx` and `App.tsx`
  need only minimal updates — handle the new frame shape, render
  `frame.body` as raw text (with MML literal display, since MML
  parsing is deferred).

---

## 13. Open questions for the planner

Most of the design questions are settled (see §3 design decisions).
What remains is a short list of implementation-level choices the
planner makes; each should be called out explicitly in the
implementation plan.

1. **`StuffRef` extension fields.** Minimum committed shape is
   `{ stuffId, displayName? }`. The frame ships display names at
   compose time — UI handles its own refresh on rename, no
   server-side push. The planner adds fields (e.g., type hints,
   icons) if a use case demands; otherwise, ship the minimum.

2. **Auto-emit command-entry payload structure.** Sketch:
   ```typescript
   interface CommandLogPayload {
     verb: string;
     success: boolean;
     commandText: string;     // original line typed
     durationMs: number;      // executeCommand wall-clock
     executionId: string;
   }
   ```
   Confirmed use cases that consume this: client command-history
   widget, replay/audit reconstruction, performance monitoring of
   verb durations, scripting/automation that inspects prior outcomes,
   future data-warehouse pipeline. Extend if needed; controllers
   contribute via `summary` only (no direct payload manipulation).

3. **`Mml.stripTags` parser.** Build a real parser (small state
   machine — markup is tag-only with nested tags allowed; not
   complex). No regex stopgap.

4. **MML serialization at the wire boundary.** `Mml` is a wrapper
   class with `toString()` and `toJSON()`. `MessageFrame.body` is a
   plain string; the unwrap happens when Scene/MudlogApi populate
   the frame. Verify `JSON.stringify` on a frame produces the
   expected output (no `[object Object]` for body).


### Settled (no longer open — references to where decisions live)

- **Scene.broadcast / actor constraint** — dropped Scene.broadcast
  entirely. Every Scene has an actor, accepted as any `Stuff`. Per-
  method validation enforces compositional requirements (Sensor for
  toSelf/toTarget; Containable for toPeers; Container for
  toContents). See §7.2.
- **Scene / Topics / Tags consolidated into MessageApi** — no
  separate `scene.ts`, `topics.ts`, or `tags.ts`. Construction goes
  through `MessageApi.scene(actor)`; constants are
  `MessageApi.Topics` and `MessageApi.Tags`. See §5.2, §6.2, §7.2.
- **Mml constructor escaping** — constructor is private; trusted
  input goes through `Mml.fromMarkup(raw)`. See §7.1.
- **ExecutionContext shape** — `commandContext?: CommandContext`
  (extended with commandId) plus `causingCommandId?: string`. See
  §11.2.
- **Scheduler API name and shape** — `ScheduleApi.schedule(delay,
  fn, opts?)`. See §11.3.
- **Tags constants** — plain string constants, no branded type.
  See §6.2.
- **system.log subtopic constants** — known framework log
  categories (currently just `command`) appear in the Topics
  constants module. See §5.2.

---

## 14. Acceptance criteria

A v1 implementation is acceptable when:

- All current `{ type, payload }` literal frame construction in
  production code is replaced by Scene/Mml composition.
- All current inline MML string concatenation is replaced by
  `Mml.compose` + vocabulary helpers.
- The wire envelope is `MessageFrame<T>`. The legacy `WebSocketMessage`
  shape is removed from `@saxonberg/types` (or kept only as a
  transitional alias if necessary, with a deprecation comment).
- `MudlogApi` exists with all six levels and is used in place of any
  in-game log-style messaging. Calls without an obtainable recipient
  throw.
- Server stdout / `console.log` usage is unaffected by the messaging
  redesign — the two facilities are independent.
- `CommandResult` is `{ success, summary? }`. The bland command-outcome
  MudlogApi entry is auto-emitted by `CommandGiverMixin.executeCommand`
  for every command.
- Every frame composed during a command's *synchronous* execution
  carries `meta.commandId` AND `meta.causingCommandId` (same value).
  Frames composed in async aftermath of a command (via a propagating
  `ScheduleApi` callback) carry `meta.causingCommandId` but NOT
  `meta.commandId`. Frames composed outside any command lineage carry
  neither.
- `ScheduleApi` exists with `schedule`, `recurring`, and `cancel`.
  Attribution propagation defaults to on; passing
  `propagateAttribution: false` severs the chain.
- `Sensor.filterMessage` exists as a shadowable extension point. At
  least one example shadow-based interception (a test fixture, e.g. a
  "mute speech" shadow) demonstrates the pattern.
- All existing tests pass after refactoring. New tests cover: Mml
  composition + escaping, Scene multi-audience dispatch, MudlogApi
  recipient resolution and throw-on-no-recipient, auto-emit of the
  bland command entry, sync `commandId` stamping, async
  `causingCommandId` propagation through `ScheduleApi` (both with
  and without `propagateAttribution: false`), and `filterMessage`
  shadow interception.
- The console renders `frame.body` literally (MML tags visible).
  No client-side MML parsing required for v1.

---

End of requirements.
