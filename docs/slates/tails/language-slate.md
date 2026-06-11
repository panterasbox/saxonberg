# Language (working slate)

Working slate for the language substrate — how the game models
distinct languages, how NPCs speak them, how written content is
gated by them, and how player proficiency mediates comprehension.

The use cases are deliberately narrow:

- **NPC dialogue** in fantasy languages (a Khazad speaks Khazadic
  by default) rendered to the player based on what they've
  learned.
- **Readables** (signs, books, scrolls) carrying a language tag
  that gates `read`.
- **Pedagogical content** (real languages as in-game Readables;
  English-register variants as a TOEFL-friendly content layer).

What the substrate explicitly does NOT cover:

- **Player-to-player speech.** Two real players in a room typing
  `say hello` share English (or whatever real language they
  share). They don't go through this system. The game doesn't
  language-gate human conversation.

See also:

- [docs/subsystems/race.md](../../subsystems/race.md) — Species /
  BodyPlan; native-language defaults attach here.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) —
  scene composer, MML, where the render-time language gate
  lives.
- [docs/subsystems/prose.md](../../subsystems/prose.md) — the
  prose pipeline through which language rendering composes.
- [docs/slates/recognition-slate.md](../builds/recognition-slate.md) —
  per-viewer perception state. Language proficiency is a
  parallel per-viewer state; the rendering pattern (shadow /
  scope) is identical.
- [docs/slates/affordance-verb-slate.md](../tails/affordance-verb-slate.md)
  — `put` / `give` verbs. `read` lives in this slate because
  it's primarily a language-system consumer.

---

## Principle

Languages are **data, not behavior**. Adding a new language is
one new template at `/lib/language/<name>`. The render-side
gate consults proficiency; the gate is the only piece of code
the system grows.

The substrate stays out of the way for the common case
(everyone speaking common / English) and lights up only when
content opts in by tagging an utterance or a Readable with a
non-default language.

---

## Layered design

| Layer | Concern | Where |
|---|---|---|
| 1. Language singleton | Per-language metadata | `Language` Idea + `/lib/language/<name>` templates |
| 2. Speaker tag | "This utterance is in language X" | `Vocal.speechLanguage` for NPCs; per-utterance override |
| 3. Readable tag | "This text is in language X" | `Readable.language` (the `read` consumer) |
| 4. Proficiency state | "I know which languages, at what level" | `Character.languages: Map<LanguagePath, Proficiency>` |
| 5. Render gate | "Should this listener see the authored content?" | Scene composer filter |

Layers 1-4 are author/runtime data. Layer 5 is the only
behavior the system adds.

---

## Layer 1 — `Language` singleton

`Language extends SingletonMixin(PropertiedMixin(Idea))` — same
shape as `LocomotionMode`, `Material`, `Species`. Templates live
at `/lib/language/<name>`.

### v1 roster

```
/lib/language/common         (the universal default)
/lib/language/khazadic       (Homo khazadicus native)
/lib/language/sylvan         (placeholder, for elf-equivalent content)
/lib/language/english-academic (TOEFL/pedagogical register)
/lib/language/spanish        (real language; pedagogical content)
```

The lineup is illustrative; content authors add languages as
needed.

### Property axis

| Field | Type | Used by |
|---|---|---|
| `name` | string | display, debug |
| `displayName` | string | prose ("(in Khazadic):") |
| `writingSystem` | string (`'latin'` / `'runes'` / `'pictographic'` / …) | future; informs Readable rendering |
| `voiceProfile` | string | future; informs NPC speech flavor |
| `relatedTo` | `{ language: LanguagePath; overlap: number }[]` | mutual-intelligibility hint; future use |

The `relatedTo` field is data for a future feature; v1 doesn't
consume it. Captured here so content authors can populate it as
they go.

### `common` is special

`/lib/language/common` is the universe default. NPCs without an
explicit `speechLanguage` are assumed common; Readables without
a `language` are assumed common; every Character is assumed to
know common at native proficiency without an entry in their
`languages` map.

This keeps the substrate invisible for the 90% case (nobody
authoring content has to think about language unless they want
to).

---

## Layer 2 — NPC speaker tag

`Vocal.speechLanguage: LanguagePath` — what language the NPC
speaks by default. Defaults to `common`.

For NPCs that code-switch (a Khazad merchant addressing players
in common, then turning to another Khazad and switching to
Khazadic for an aside), the NPC's behavior code sets the
utterance's language per-emission. The Stuff-level default is
the fallback when behavior doesn't override.

**Player utterances** don't go through this field. Player speech
emitted via `say` / `tell` / `shout` has no language tag — it's
just text. The render gate (Layer 5) only fires for utterances
that carry a non-null `language`.

### Open question: does `Vocal` actually own this?

Could go on `Vocal` (the speech-capability mixin) or on
`Character` directly. Lean `Vocal` — it's the speech surface.
Build agent should verify nothing else on `Vocal` blocks the
addition.

---

## Layer 3 — Readable tag

`Readable.language: LanguagePath` — what language a written
text is in. Defaults to `common`.

(Readable's full surface and the `read` verb live in this slate
because they're primarily a language-system consumer. See
§ The `read` verb below.)

---

## Layer 4 — Character proficiency

`Character.languages: Property<Map<LanguagePath, Proficiency>>`.

### Proficiency values

For substrate v1, **binary**:

```ts
type Proficiency = 'known' | 'native';
```

`native` is essentially equivalent to `known` for the gate; it's
preserved as a future-distinguishing tag (a native speaker
might see idiomatic prose variants; a `known` speaker might
see literal translations).

The map type accommodates a richer future:

```ts
// v2 extension (deferred):
type Proficiency =
  | 'unknown'        // not in the map; explicitly captured
  | 'smattering'     // few words leak through
  | 'basic'          // key nouns / verbs leak
  | 'conversational' // mostly intact, occasional gaps
  | 'fluent'         // full
  | 'native';        // full + idioms
```

v1 ships binary; the partial-comprehension layer is its own
follow-up when content earns it.

### Defaults via Species

`BodyPlan.nativeLanguages: LanguagePath[]` — what a species
knows by default. Homo sapiens defaults to `[common]`; Homo
khazadicus defaults to `[khazadic, common]`; Constructa metallica
might default to `[common, machine-protocol]` (future).

A newly-created Character of species X starts with each
language in `species.bodyPlan.nativeLanguages` mapped to
`native`. Learning new languages later mutates the map.

### `common` is implicit

The Character's `languages` map does NOT need an entry for
`common`; every Character is assumed to know common. The map
records what's KNOWN BEYOND that.

---

## Layer 5 — Render gate

The scene composer (or the prose pipeline; placement TBD) gains
a small filter that fires when an utterance or Readable carries
a `language` field that's not `common`.

### Speech gate (NPC utterances)

When a speech message frame is delivered to a listener:

```
if utterance.language && utterance.language !== 'common':
  if listener knows utterance.language:
    render the authored text in normal prose
  else:
    render a wrapper: "<speaker> says something in <language.displayName>."
```

The wrapper is a single line; it does NOT include the authored
content. Player gets a clear signal that something happened but
they don't understand.

### Read gate (Readable text)

When `read` is invoked:

```
if readable.language && readable.language !== 'common':
  if actor knows readable.language:
    emit the authored text
  else:
    emit a wrapper: "The writing is in <language.displayName>; you can't read it."
```

Same shape.

### Partial-comprehension extension (deferred)

When proficiency moves beyond binary, the render gate gains a
degradation mode: leaky keywords for `basic`, mostly-intact text
with `[unfamiliar]` markers for `conversational`, etc. The
extraction algorithm (which words leak?) is the real work of
that extension — likely a mix of stop-word filters and per-text
author annotation. Out of scope for this slate.

---

## The `read` verb

The verb that consumes Readable + the language gate.

### Shape

```
read <item>
```

Instant — no duration in v1. The durative version (page-by-page
with bookmark on abort) lives in
[host-slot-activities-slate.md](../tails/host-slot-activities-slate.md).

### Actor-side

`Perceiver` (already shipped — has sight) + `Character.languages`
(this slate).

### Target-side — `Readable` (new)

```ts
interface Readable {
  getReadText(): string;       // or Mml later
  getLanguage(): LanguagePath; // defaults to 'common'
}
```

Text storage is via `PropertiedMixin` keys. v1 ships plain
string; Mml-aware variant when content authors want inline
formatting.

### Verb controller sketch

```ts
class ReadController extends CommandController<ReadModel> {
  execute(model, ctx): void {
    const actor = ctx.commandGiver;
    const target = model.target;

    if (!MixinApi.isReadable(target)) {
      ctx.note({ kind: 'controller-rejected', reason: 'not-readable' });
      // Scene.send "There's nothing to read on <target>."
      return;
    }
    // Light gate — too dark to read.
    if (LightApi.lightAt(actor) < MIN_READ_LUX) {
      // Scene.send "It's too dark to make out the writing."
      return;
    }
    // Language gate — handled by the scene composer when
    // delivering the read-emission. Controller just emits.
    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(target.getReadText(), { language: target.getLanguage() })
      .toPeers(Mml.compose`${Mml.name(actor)} reads ${Mml.name(target)}.`)
      .send();
  }
}
```

The `{ language: ... }` rider on `.toSelf` is the seam that
triggers the render gate. If the actor knows the language, the
authored text passes through; otherwise the composer substitutes
the wrapper.

---

## Pedagogical surfaces

Three ways the substrate doubles as a teaching surface:

### Real languages as in-game Readables

`/lib/language/spanish`, `/lib/language/mandarin`, `/lib/language/french`
— all coexist with fantasy languages. A "Spanish menu" in-game
is genuinely in Spanish; the player either knows Spanish (in-
game and IRL) or sees a wrapper. Foreign-language students get
authentic reading practice woven into normal gameplay; native-
English players just see English and never notice the tagging.

### Register-tagged English content

`/lib/language/common` is everyday English. `/lib/language/english-academic`
is TOEFL-register. Students working on academic English encounter
academic-register Readables (university bulletin boards, journal
articles, formal correspondence) as opt-in study surfaces. Native
speakers see them as in-character formal prose without friction.

### Translation tools as content

A `Translation Dictionary` in-game item could be a Readable
whose mere possession grants temporary proficiency in the
language it covers. Or a `Translator Daemon` NPC that translates
on demand. These are content patterns, not substrate — but the
substrate supports them via straightforward proficiency map
mutations.

The substrate stays editorial-passive: content authors decide
whether to use language tags pedagogically or just for flavor.

---

## What ships in this slate

- `Language` Idea + per-language templates (common, khazadic, +
  one or two more for proof-of-content; full roster grows
  editorially).
- `BodyPlan.nativeLanguages: LanguagePath[]` field extension.
- `Character.languages: Property<Map<LanguagePath, Proficiency>>`
  with binary Proficiency in v1.
- `Vocal.speechLanguage: LanguagePath | null` field on NPC Vocal
  hosts (null = common).
- `Readable` mixin (`getReadText`, `getLanguage`) — paired with
  the `read` verb.
- `read` verb — YAML + controller.
- Scene composer / prose pipeline render gate: speech and read
  emissions check listener's `languages` map; substitute wrapper
  on miss.
- A few authored content Stuffs: a Khazadic-only sign in a
  Khazad-quarter zone; a Khazad merchant NPC speaking Khazadic;
  a Spanish-language menu for content-team proof.

Tests gating acceptance:

- `read X` against a `common` Readable → full text emission.
- `read X` against a Readable in an unknown language → wrapper.
- `read X` against a Readable in a known language → full text.
- NPC speech in common → all listeners see authored text.
- NPC speech in Khazadic → Khazadic-speakers see authored text;
  others see wrapper.
- Character with `species: khazadicus` starts with
  `languages: {khazadic: native}` (common is implicit).
- Mutating `actor.languages.set('spanish', 'known')` causes
  Spanish Readables to render for that actor.
- Player-to-player `say` doesn't trigger the language gate
  regardless of speakers' / listeners' language proficiencies.

---

## Open questions

### Q1. `Vocal.speechLanguage` vs. `Character.speechLanguage`

The NPC-side speaker tag could live on `Vocal` (the speech-
capability mixin, applicable to anything that talks) or on
`Character` (semantically tighter — only Characters speak in v1).
Lean `Vocal` for breadth; revisit if a non-Character Vocal host
appears that wants different language semantics.

### Q2. Player speech with explicit language

Should a player be able to `say --in khazadic "khazad ai-menu"`
and have the system render it Khazadically to listeners who
understand it (and wrapper-style to those who don't)? Implies
player-speech CAN opt into the language gate per-utterance.

Lean **yes, deferred** — this is roleplay flavor more than
substrate. The render gate works the same either way; v1 just
defaults player utterances to language-null. A future setting
or argument could opt in.

### Q3. Per-language writing system fields

`writingSystem` is in the schema but not yet consumed. A future
extension could let a player who's literate in Latin script but
doesn't know Spanish at least "recognize the letters" of Spanish
Readables — distinct from understanding the content. Useful for
real-language pedagogy. Deferred until content earns it.

### Q4. Render-gate placement

The render gate fits naturally in the scene composer (where
toSelf / toPeers rendering already happens per-listener) OR in
the prose pipeline (the Mml-rendering pass). Build agent decides
by reading the existing composer + prose code; the slate is
silent on which.

### Q5. NPC behavior + language

A Khazadic NPC receives player speech in common — do they
understand it? Today's substrate says: they have a `languages`
map too (NPCs are Characters), so the same proficiency lookup
applies. Whether the NPC's behavior code RESPONDS in common or
in Khazadic is a content/AI concern, not substrate. Flagged
because the AI layer will need to consult the language map
when deciding what language to respond in.

### Q6. Light gate for `read`

Already noted in the affordance-verb slate's earlier draft:
hardcoded minimum-read-illuminance vs. per-Readable difficulty.
Lean hardcoded constant for v1; `Readable.minReadLux` field if
content earns it later.

### Q7. Non-text Readables

`read map`, `read chart`, `read recipe` — these are arguably
Readable but rendering wants more than a text dump. Probably
out of scope for v1; readable maps would be their own mixin or
a richer Readable variant.

---

## What this slate does NOT cover

- **NPC AI / dialogue trees.** The substrate exposes language
  data; how NPCs use it is AI-layer.
- **Partial comprehension rendering.** Deferred. Binary in v1.
- **In-game translation tools.** Content, not substrate.
- **Speech accents / voice profiles.** Recognition-slate territory.
- **Sign language / non-verbal communication.** Distinct channel;
  out of scope.
- **Sound subsystem interaction.** When sound ships, a
  soundproof barrier blocks audibility before language even
  gates. Composes cleanly; no coordination needed here.

---

## Once shaped into formal requirements

This slate boils down to:

- `Language` Idea + initial v1 template roster.
- `BodyPlan.nativeLanguages` field; default-population on
  Character creation.
- `Character.languages` Property (binary Proficiency v1).
- `Vocal.speechLanguage` field on NPCs.
- `Readable` mixin + `read` verb + light gate.
- Scene-composer render gate for speech + read emissions.
- A handful of authored content Stuffs exercising the gate.
- Tests covering common-default, language-mismatch wrapper,
  known-language full render, species-driven defaults, and
  player-speech bypass.

The substrate sets up the pedagogical surfaces (real-language
Readables, register-tagged English) without committing to
specific content; that work is editorial.
