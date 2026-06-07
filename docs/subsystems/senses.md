# Senses

The multi-sense authoring substrate. Content authors write rooms once
with `<sense channel="X">` regions and per-sense `Detail` slot maps;
viewers see only what their sensorium can perceive; the four
contact-family single-sense verbs (`smell` / `listen` / `feel` /
`taste`) and the gestalt verb (`sense`) all route through the same
substrate. Auto-on-entry fires `sense` so a player perceives a new
room across their full sensorium without typing.

This is the **authoring + presentation surface** for the senses
substrate the [senses slate](../slates/senses-slate.md) outlines. The
slate's full `PerceptionChannel` substrate (propagation walks,
attenuation, masking, ESP-as-channel registration) is Wave 2+; nothing
here implements field-physics. The surface stays surgical:
contact-only reads, regex-clean strip, no propagation.

## Substrate consumed

- [light.md](./light.md) — vision substrate; unchanged. `look` stays
  vision-only (now expressed via the augmenter's `filter: ['vision']`).
- [race.md](./race.md) — `BodyPlan` + `Species`. This build adds
  `BodyPlan.getModalities()` and `Species.olfactoryProfile`.
- [messaging.md](./messaging.md) — the `MarkupAugmenter` pipeline.
  The new `senseStripAugmenter` slots onto `VisibleMixin.markupAugmenters`.
- [message-rendering.md](./message-rendering.md) — MML vocabulary.
  The `<sense channel="X">` tag is a new semantic core member; flatten
  + parse already handle unknown tags transparently, so the wrapping
  ships without renderer / client changes.
- [persistence.md](./persistence.md) — `Detail` rides the
  instruction-field path (`applyDetails` Phase 2);
  `Species.olfactoryProfile` rides the scalar-default rule the same
  way `visionProfile` does.

## What ships in this build

### `SenseChannel` vocabulary

Canonical physical-sense channel union, declared in
`lib/description/Perceiver.ts` alongside the runtime
`SENSE_CHANNELS` array:

```ts
export type SenseChannel = 'vision' | 'hearing' | 'smell' | 'touch' | 'taste';
export const SENSE_CHANNELS: readonly SenseChannel[] = [...];
```

Perceiver is the actor-side surface that perceives across these
channels, so the vocabulary's home is here — BodyPlan declares
which ports a body has but uses this type to label them; Detail
stores the prose per channel but uses this type to key its slots.

Used consistently across every surface: `SensoryPort.modality`,
`Detail` per-sense slot map keys, `<sense channel="X">` MML wrapper
attribute, `senseStripAugmenter` filter, the four `requires*` verb
validators. The eyes-modality entry uses `'vision'` (the
channel/process word), NOT `'sight'` (the organ word). ESP / alien
channels are deliberately NOT in this union for v1 (slate Wave 3).

### Per-sense `Detail` slot map

`DetailedMixin`'s `Detail` shape grew from a single `description: string`
to a per-sense slot map. Authoring accepts both shapes:

```yaml
# New per-sense authoring.
details:
  bookcase:
    keywords: [shelves]
    vision: "Hand-tooled leather spines."
    touch: "Smooth walnut, grain runs vertical."

# Legacy authoring — still works, populates the `vision` slot.
details:
  bookcase:
    keywords: [shelves]
    description: "A tall walnut bookcase."
```

Mixing the two (`{ description: "...", vision: "..." }` in the same
entry) is rejected at applier time with a clear error — pick one
shape per entry.

Lookup gained an optional `sense` argument:

```ts
host.getDetail('bookcase');           // → vision slot (back-compat)
host.getDetail('bookcase', 'vision'); // explicit, same as above
host.getDetail('bookcase', 'touch');  // touch slot, or null
host.getDetail('bookcase', 'touch', 'parent'); // sense + nested parent
host.getDetail('lock', 'handle');     // legacy parent-arg shape preserved
```

The 2-arg dispatch distinguishes sense-vs-parent by recognising the
five `SenseChannel` literals — any other string is treated as the
legacy parent path.

`setDetail` gained an overload accepting a slot map:

```ts
host.setDetail(['bookcase'], 'A tall walnut bookcase.');                 // legacy
host.setDetail(['bookcase'], { vision: "...", touch: "..." });           // new
```

Per-field invariants on the slot-map shape: at least one slot must
be populated; every populated slot must be a string. The wire
projection (`getDetailEntries` / `getDetailEntry` consumed by the
inspection-pane subscription substrate) projects the `vision` slot
into the existing `description` field — non-vision slots are
server-side state only; the v1 wire stays single-channel for back-compat.
Persistence migration is implicit — pre-existing documents with
`{ description: "X" }` re-hydrate transparently into the `vision`
slot on first load.

### `<sense channel="X">` MML wrapper

A new semantic MML tag parallel to `<chan>` / `<player>` / `<mention>`.
Lives in any long description; the server-side `senseStripAugmenter`
drops regions the viewer can't perceive before the body ships to the
client. The flatten / strip-tags failsafe emits children verbatim
(`Mml.flatten('<sense channel="smell">garlic</sense>')` = `'garlic'`),
so the wrapping adds no failsafe artifacts. The client's `parseMml`
recognises it as a tag node with `channel` attr without any client
changes — unknown tags already round-trip transparently.

`<detail key="X" sense="Y">` adds an optional `sense=` attribute to
the existing `<detail>` tag. Default-absent = `'vision'` (the
back-compat default; existing detail authoring keeps rendering
unchanged).

### `Mml.stripBySense`

The strip primitive lives on `Mml` (per the hard rule that nothing
outside `api/mml.ts` may import `api/mml/`). Two rules:

| Tag                                | Channel ∈ allowed | Channel ∉ allowed             |
| ---------------------------------- | ----------------- | ----------------------------- |
| `<sense channel="X">…</sense>`     | keep tag + recurse | drop tag AND children       |
| `<detail key="K" sense="X">…</detail>` | keep tag + recurse | drop tag, KEEP children inline |
| All other tags                     | preserve, recurse | preserve, recurse             |

Untagged prose is always preserved.

### `senseStripAugmenter`

A new entry on `VisibleMixin.markupAugmenters`. Reads the per-call
`opts.filter` (a `readonly SenseChannel[]`) and the viewer's
sensorium (from `SpeciesApi.deriveSensorium(viewer)`); strips
regions whose channel isn't in `filter ∩ sensorium`.

```ts
function senseStripAugmenter(text, host, viewer, opts?) {
  const sensorium = SpeciesApi.deriveSensorium(viewer);
  const filter = opts?.filter ?? sensorium;          // gestalt fallback
  const allowed = new Set(filter.filter((ch) => sensorium.includes(ch)));
  return Mml.stripBySense(text, allowed);
}
```

The augmenter ordering: `senseStripAugmenter` runs FIRST
(parent-first walker, Visible above Detailed in the typical chain),
`wrapDetailKeysAugmenter` runs SECOND. Strip-then-wrap is correct
because wrapping inside a region destined for the strip is wasted
work.

### `Mml.augment` + `MarkupAugmenter` widened with `opts?: AugmentOpts`

The substrate walker is exposed as `Mml.augment(text, host, viewer,
opts?)` — a static on the `Mml` class (the bare `augmentMarkup`
function export was retired). Callers thread through the class
handle: `import { Mml } from '../../api/mml'; Mml.augment(...)`.


The augmenter contract is now
`(text, host, viewer, opts?: AugmentOpts) => string`. Existing 3-arg
augmenters keep working (covariant params). Existing call sites of
`augmentMarkup` keep working (the new param is optional). Verbs that
care about the filter pass it explicitly:

```ts
location.getMarkupLong(viewer, { filter: ['vision'] });        // look
location.getMarkupLong(viewer, { filter: ['smell'] });         // smell
location.getMarkupLong(viewer, { filter: deriveSensorium(viewer) }); // sense
location.getMarkupLong(viewer);                                // subscription — gestalt default
```

The inspection-pane subscription's `read = (stuff, viewer) =>
stuff.getMarkupLong(viewer)` passes no opts and naturally gets the
viewer's full sensorium — the right "what does this viewer perceive
right now?" projection for the cockpit.

### `BodyPlan.getModalities()` + `SpeciesApi.deriveSensorium(viewer)`

`BodyPlan.getModalities(): SenseChannel[]` returns the deduped
channel list from `sensoryPorts`. A sessile body plan with no ports
returns `[]`.

`SpeciesApi.deriveSensorium(viewer)` is the canonical viewer →
sensorium walker. Walks viewer → Organism → Species → BodyPlan →
`getModalities()`; returns `[]` when any step is null (a
non-Organism viewer, an Organism without a Species, etc.). Shared
by the augmenter AND the four `requires*` validators.

`SenseChannel` is declared in `lib/description/Perceiver.ts` (the
actor-side perception surface). `SpeciesApi.deriveSensorium` lives
on the API class so consumers thread through the api/ layer rather
than importing a bare function from lib/.

### `Species.olfactoryProfile`

New persistent field on `Species`, parallel to `visionProfile`. v1
ships a single coarse `acuity` scalar:

```ts
export interface OlfactoryProfile {
  acuity: 'keen' | 'normal' | 'dull' | 'none';
}
```

No propagation walk means no math consumes the value — the field's
job in this build is shape + place for content authors to start
declaring per-species smell variance. When the
`PerceptionChannel` substrate lands and smell gains a propagation
walk, this extracts to a `lib/perception/Smell.ts` value-object
module following the `Light.ts` precedent.

No `hearingProfile` / `tactileProfile` / `gustatoryProfile` yet —
those land per content demand.

### Single-sense verbs: `smell` / `listen` / `feel` / `taste`

Four contact-only verbs sharing a common `SingleSenseControllerBase`.
Each subclass pins two abstract properties: `senseChannel` (the
`SenseChannel` literal — note `listen`'s channel is `'hearing'`,
not `'listen'`) and `sceneTopic` (the dotted Scene topic). Bare form
renders the current location filtered to that channel; targeted form
resolves via MQL and reads `host.getDetail(dotted, senseChannel)`.

| Verb     | Channel   | Topic                         | Validator         |
| -------- | --------- | ----------------------------- | ----------------- |
| `smell`  | `smell`   | `world.perception.smell`      | `requiresSmell`   |
| `listen` | `hearing` | `world.perception.listen`     | `requiresHearing` |
| `feel`   | `touch`   | `world.perception.feel`       | `requiresTouch`   |
| `taste`  | `taste`   | `world.perception.taste`      | `requiresTaste`   |

Verb-level validators in `lib/command/validators/requires*.ts` gate
the giver-side sensorium check via `deriveSensorium(giver).includes(channel)`.
Same pattern as `requiresAnimate`. Polite refusal strings: `"You
can't hear."` / `"You have no sense of smell."` / `"You can't feel
anything."` / `"You have no sense of taste."` Failure routes through
the dispatcher's standard validator-failed prose path.

A non-Detailed target gets a polite "you don't perceive anything
notable" response. Targets outside the viewer's MQL scope aren't
addressable — contact-only is enforced by the existing scope rules,
no extra code.

No aliases (`sniff` / `lick`) in v1 — keep the surface tight.
`--peek` not yet supported on the single-sense verbs.

### Gestalt verb: `sense`

The dominant room-presentation verb post-this-build. Bare form
renders the current location with the augmenter's filter set to the
viewer's full `getModalities()`; targeted form mirrors `look <target>`'s
shape with the gestalt filter. Detail lookup uses `'vision'` (per
the slate's "click = look" rule — the gestalt's detail-drill default
stays single-sense; smell/touch/etc. require the verb-specific
single-sense form).

`SenseController` keeps the room-presentation chrome (exits,
occupant list) that `LookController` had — the vision-bound
affordances stay because `sense` IS the room-presentation verb
now.

No `requiresVision` / `requiresSense` validator — the gestalt filter
is the viewer's full sensorium; the augmenter naturally produces an
appropriate render for whatever channels the viewer has (vision-only
authoring renders identically for a vision-bearing viewer; a
sightless viewer's gestalt strips the vision regions and presents
the rest).

### Auto-on-entry switches to `sense`

`MobileMixin.autoLookOnArrival` was renamed to `autoSenseOnArrival`
and its body now `forceCommand`s `sense` (not `look`). Same focus-reset
behaviour, same forceCommand plumbing, same error-swallow. The
four call sites that forced `look` on arrival all delegate through
this single hook:

- `Avatar.enter` (post-welcome auto-render)
- `Mobile.traverse` (after a movement)
- `Mobile.teleport` (after an instant move, when not silent)
- `Goto -l` flag fallback (raw-move path)

Existing rooms render identically because the augmenter's
filter ∩ sensorium = the viewer's full sensorium for a room with
no `<sense>` regions authored — vision-bearing players see the same
vision-only prose they did before. The door is open for multi-sense
authoring without a breaking transition.

Bare `look` becomes opt-in vision-only — players who want JUST the
vision channel still have the verb; the gestalt is the default.

## Authoring discipline

The slate's "events single-channel per frame, state multi-sense"
discipline:

- **Events** — `Scene.send` carries one frame per audience per
  channel. A frame attributes one channel. Cross-channel events
  (a spell that glows AND hums) are two separate sends, one per
  channel. Don't conflate channels at emit time.
- **State** — the room's long description and every Detail's per-sense
  slot map are multi-channel together. One `<sense channel="X">`
  region per channel per location; one slot per channel per Detail.
  Authors describe the thing across senses in one place; the
  augmenter filters per-viewer per-verb at render time. No
  "Smell: nothing. Sound: nothing." rule — empty channels just don't
  appear.

This split means content authors don't write the same thing five
times; the substrate's filter does the per-viewer per-verb work.

## What's NOT in this build (Wave 2+)

- **`PerceptionChannel` substrate abstraction.** No general
  five-part Channel object yet (emission / propagation+medium /
  attenuation+masking / sensitivity / rendering). The five physical
  senses route through specific code paths.
- **Field / contact / network family physics.** No propagation
  walks, no attenuation/masking, no field/contact/network family
  modelling. Smell is contact-only (no cross-room diffusion, no
  gradient, no falloff). Same for the other senses.
- **ESP-as-channel registration.** ESP channels (verbal, emotive)
  don't appear in `<sense>` MML wrappers in state authoring —
  `<sense>` is for physical senses only. The slate's "messaging =
  sensing" unification is deferred. Existing comms (`VocalMixin.say`,
  `AetherMixin.tell`) ship unchanged.
- **Smell trails / temporal persistence.** Slate Wave 3.
- **Light / vision convergence onto the new substrate.** `LightApi`,
  `canSee`, `visionProfile` ship unchanged. `LookController` doesn't
  gain a `requiresVision` validator. The dark-room test fixture
  uses a sightless-by-construction sensorium; real-world
  darkness-blocks-vision lands when light converges onto the
  substrate.
- **Salience-threshold engine.** Authors decide what's notable by
  what they wrap in `<sense>`. Empty channels just don't appear; no
  engine threshold.
- **Sensorium-relative stealth.** Slate Wave 3.
- **Alien sense channels** (`echolocation`, `electroreception`,
  `pit-sensing`). Slate Wave 3 — proves the abstraction once the
  full `PerceptionChannel` substrate exists. Body plans declaring
  alien sensory ports don't yet unlock anything beyond appearing in
  `getModalities()`.
- **Per-sense Species profiles beyond `olfactoryProfile`.** No
  `hearingProfile` / `tactileProfile` / `gustatoryProfile` yet.
- **Vitals organ-condition modulation.** Slate Wave 2.
- **Per-channel instruments tie.** No instruments-emit-as-sense yet.
- **Inspection-pane wiring changes.** Pane consumes
  `getMarkupLong(viewer)` today; that path still works because the
  augmenter walk is per-viewer (default-absent opts → full sensorium).
- **Active-sense / emit-and-perceive-the-return pattern.** Slate Wave 3.
- **Single-sense verb aliases** (`sniff` / `lick`) and `--peek`.
  Land per content demand.
- **No client changes.** The `<sense>` MML tag and `<detail sense=>`
  attribute ride the existing client renderer transparently; the
  server-side augmenter strip means the wire body the client
  receives is already filtered per-viewer.

## Cross-references

- [docs/slates/senses-slate.md](../slates/senses-slate.md) — the
  seeding slate. Names the wider design space; this build's surface
  is the cross-wave slice.
- [docs/subsystems/light.md](./light.md) — the vision substrate,
  unchanged by this build.
- [docs/subsystems/race.md](./race.md) — BodyPlan / Species. This
  build extends `BodyPlan.getModalities()` + adds
  `Species.olfactoryProfile`.
- [docs/subsystems/messaging.md](./messaging.md) — `MarkupAugmenter`
  pipeline + `Scene` builder.
- [docs/subsystems/message-rendering.md](./message-rendering.md) —
  MML vocabulary + the substrate that consumes augmenter output.
- [docs/subsystems/persistence.md](./persistence.md) — `Detail`'s
  instruction-field applier + the `Species.olfactoryProfile`
  scalar-default round-trip.
- [docs/subsystems/command-spec.md](./command-spec.md) — author
  guide for the verb framework the new verbs follow.
