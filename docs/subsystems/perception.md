# Perception Subsystem

The viewer-aware query pattern: a cross-cutting principle that any
property whose value depends on *who's perceiving* must follow.

This is a *pattern* document, not the description of a specific
mixin or Api. Concrete users (light, hearing, display-name
composition, language understanding, faction visibility, vendor
pricing) reference this doc rather than re-derive the rule.

## Why this doc exists

Several queries in Saxonberg return different answers depending on
who's asking:

| Query | Viewer-dependent because |
|---|---|
| `LightApi.canSee(viewer, target)` | night-vision, blindfold, invisibility, light state |
| `DescribeApi.getDisplayName(viewer, target)` | hooded stranger reads as "a tall figure" to most, "Bob" to those who recognize him |
| `SensorApi.canHear(viewer, source)` (future) | deaf, distance, walls, magical silence |
| `understandsSpeech(viewer, speaker, msg)` (future) | does the listener speak the language? |
| `canRead(viewer, text)` (future) | literacy, language, vision |
| `factionStanding(viewer, target)` (future) | who's friendly to whom |
| `priceFor(viewer, item)` (future) | merchant haggles based on rapport |

All same shape: `f(viewer, subject [, args]) → result`. None of them
have a *single* correct answer — the answer depends on the viewer.

## The anti-pattern this replaces

Old MUDs often consulted the *current command-giver* as ambient
state. Code reaches into "who's running this command" via a global
or via a callstack walk, and renders for them. This breaks the
moment a command's effect transitively triggers a perception check
on someone else.

Concrete failure: Alice runs `tell orc to look at Bob`. The
perception check inside the orc's resolved `look at Bob` is *for
the orc*, not Alice. If `getDisplayName` infers viewer from
execution context, it returns Alice's view of Bob — wrong.

This anti-pattern also fails any time we broadcast: a sword fight
visible to N witnesses needs N independent perception checks, one
per witness. There is no single "current viewer" during a
broadcast.

**Saxonberg does not infer the viewer from execution context. The
viewer is always an explicit parameter.**

## The three layers

### 1. Pure query Apis

Functions whose answer depends on a perceiver take the perceiver as
an explicit parameter. The function is pure: same inputs, same
outputs. No reads from execution context, no globals, no
callstack-aware tricks.

```ts
LightApi.perceivedBand(viewer: Stuff & Sensor, loc: Stuff & Container): LightBand
LightApi.canSee(viewer: Stuff & Sensor, target: Stuff, detail?: VisibilityDetail): boolean
DescribeApi.getDisplayName(viewer: Stuff & Sensor, target: Stuff, fallback?: string): string
SensorApi.canHear(viewer: Stuff & Sensor, source: Stuff): boolean
```

Trivially testable, multi-perceiver-safe, side-effect-free.

### 2. Scene / Sensor broadcast harness

The multi-perceiver case rides on the existing messaging subsystem
(see [messaging.md](./messaging.md)). When something happens that
should be perceived, the Scene composer iterates Sensors present
and, for each Sensor, calls the query Apis with that Sensor as the
viewer. This is where one event becomes N tailored renderings.

The broadcast harness doesn't add a viewer parameter — it iterates
and applies. Each per-witness rendering is just N calls into layer
1, varying which Sensor is the viewer.

### 3. Shadow per-viewer overrides

The `Shadow` framework (see [call-security.md](./call-security.md))
is already per-instance. A shadow on a specific viewer can intercept
any query Api method called for that viewer:

- `BlindfoldShadow` on Bob → `LightApi.canSee(Bob, …)` returns
  false.
- `NightVisionShadow` on a cat-NPC → band shifts up.
- `DarknessShadow` on a cursed avatar → `LightApi.lightAt` from
  this viewer's perspective is capped at zero.
- `RecognitionShadow` on Bob → `getDisplayName(Bob,
  hooded-stranger)` returns "Phil" because Bob has met Phil before.
- `LanguageShadow` on Alice → `understandsSpeech(Alice, …, msg)`
  returns true for messages in languages Alice has learned.

Shadow overrides are *per-viewer-per-query*. They don't fight the
contract; they're how the contract gets specialized.

## The viewer type

All viewer-aware query Apis take **`Stuff & Sensor`** as the viewer
parameter. The reasoning:

- Perceiving is a sensor-side concern. `Sensor` is the existing
  mixin for "I receive perceptual input."
- Channel filtering (`hearing disabled`, `vision disabled`,
  `magical sense enabled`) lives on Sensor.
- Anything that perceives composes Sensor — players' avatars, NPCs
  that act as witnesses, observers in a sense-routing graph.

There is no separate `Perceiver` mixin. **Sensor *is* the perceiver
type.** The "I receive messages" and "I am queried as a viewer"
surfaces are the same set of objects.

A non-Sensor cannot be the viewer in a perception query. This is
enforced at the type level — passing a non-Sensor fails to compile.

## Worked example

`Alice tells the orc to look at Bob`. End-to-end:

1. Alice's controller runs `tell`, dispatches to the orc via the
   messaging subsystem.
2. The orc receives a tell-event. Eventually (NPC behavior layer,
   currently deferred — for now, the equivalent in tests is a
   programmatic call) the orc decides to comply and runs its own
   `look at Bob`.
3. The look pipeline runs **with viewer = orc**, not Alice.
4. Inside look:
   - `LightApi.perceivedBand(orc, Bob.getEnvironment())` — the
     orc's perception of band.
   - `LightApi.canSee(orc, Bob, 'figure')` — orc's gate.
   - `DescribeApi.getDisplayName(orc, Bob)` — orc's renderer.
5. Whatever the orc reports back (say it tells Alice what it saw)
   flows through the Scene composer with orc as the source. Alice
   receives the orc's *report*, not Alice's own perception of Bob.

The command-giver (Alice) is relevant only for **attribution** —
error messages, stamina deduction, billing-style accounting.
**Perception is always answered for the perceiver.**

## Where the pattern is currently used

- (existing) `LightApi.canSee`, `LightApi.perceivedBand`,
  `LightApi.viewerVisionProfile` — Light & Boundary subsystem.
  Viewer-side overrides via Shadow seam methods
  (`perceivedBandModifier`, `canSeeOverride`, `getVisionProfile`)
  declared only on Shadows; `LightApi` walks
  `ShadowApi.getShadows(viewer, methodName)` to invoke them. See
  [light.md § Per-Viewer Perception](./light.md#per-viewer-perception).
- (planned) `DescribeApi.getDisplayName(viewer, target)` — v2 form
  per [docs/roadmap.md](../roadmap.md)
- (existing) `Sensor` channel filtering already runs per-Sensor on
  message dispatch — see [messaging.md](./messaging.md)

## Where the pattern *will* be used

- Hearing (`SensorApi.canHear`) when sound conduit lands
- Reading / literacy / language gating
- Faction-standing queries
- Quest visibility (which quests an Avatar can see)
- Vendor pricing
- Recognition / disguise resolution
- Any future "personal" view of a shared world property

## Anti-patterns to avoid

- Reading "current command-giver" from execution context inside a
  perception query. Use the explicit viewer parameter.
- Caching per-viewer state on the *target* instead of the viewer.
  "Bob has seen this NPC, so the NPC remembers Bob" — that
  recognition state is on the *viewer* (Bob's `RecognitionShadow`
  or equivalent), not on the NPC.
- Defaulting to a "current viewer" when none is passed. Refuse to
  compile instead — make the type system enforce that callers know
  who they're querying for.
- Assuming `viewer === command-issuer`. An action can transitively
  trigger checks on other agents. The viewer is whoever is
  *perceiving in this specific check*.
- Caching per-(viewer, query) results without an invalidation
  story. The state any of these queries closes over (light,
  shadows, position, faction, language) can change between
  queries; cache only with hooks that invalidate on the relevant
  events.

## Cross-references

- [messaging.md](./messaging.md) — Scene composer, Sensor routing,
  the multi-perceiver harness
- [call-security.md](./call-security.md) — Shadow framework,
  per-instance overrides
- [light.md](./light.md) — first major user of this pattern. The
  per-viewer queries (`perceivedBand`, `canSee`,
  `viewerVisionProfile`) and the Shadow seam dispatch live there.
- [roadmap.md](../roadmap.md) — Display-name composition (DescribeApi
  v2) is the second planned user
