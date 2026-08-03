# Topics substrate

The substrate for "what kind of message is this?" — per-topic authored
descriptors plus a runtime catalogue served to the client at
session-establish.

Topics carry the routing decision on every `MessageFrame`: the
wire-level `topic` string is a dotted path like `world.speech.say`,
and the catalogue resolves each path to a friendly label, a
description, and a family. The cockpit's tabbed terminal, filter
drawer, and gutter tooltips all consume that resolution; the future
help system will tap the same catalogue.

## File layout

| File | Role |
|---|---|
| `lib/messaging/Topic.ts` | The `Topic extends Idea` leaf class with persistent fields `topic` / `family` / `label` / `description` and `TEMPLATE_PATH_PREFIX = '/obj/Topic/'`. |
| `obj/TopicCatalogue.ts` | The singleton Idea (`/obj/TopicCatalogue`) owning the runtime descriptor cache + accessor surface. Sibling to `obj/EventRegistry.ts` per the singleton-in-`obj/` convention. |
| `seeds/lib/messaging/Topic/<dotted-path>.yaml` | One file per topic leaf or family. Flat path strings, no nested directories. |
| `seeds/obj/TopicCatalogue.yaml` | Singleton seed (`{ class: /obj/TopicCatalogue, data: {} }`). |
| `bootstrap.ts` | Manifest entry for the `/obj/TopicCatalogue` singleton. **No per-Topic pre-clone** — the catalogue loads its own descriptors. |
| `@saxonberg/types` `TopicDescriptor` | Wire-safe shape: `{ topic, family, label, description }`. Shared between the server snapshot and the client cache. |

## No code-side constants mirror

There is no `TOPICS` const in code. The earlier nested `TOPICS` tree
on `MessageApi` has been retired — topics are dotted-path string
literals at call sites (e.g. `.topic('world.speech.say')`), with
`Topic` Ideas + `TopicCatalogue` as the runtime catalogue. Three
deliberate non-things:

- No `Topics` enum exported from `@saxonberg/types`.
- No mirror file under `lib/topics/` (and no such subsystem dir —
  topics are a messaging concern, hence `lib/messaging/`).
- Topic strings cross the wire raw; the catalogue carries everything
  beyond the string itself (label, description, family).

The catalogue and the const are independent: descriptors are content
in the DB; `TOPICS` is a code-side autocomplete convenience.

## The Topic Idea

`Topic` extends `Idea` with four public string fields and per-field
invariants on the setters (empty strings rejected for `topic`,
`label`, `description`; `family` accepts `''` for root topics). The
`TEMPLATE_PATH_PREFIX` constant is `/obj/Topic/`. Authors
edit topic descriptors through the existing workspace shell —
there's no `describe-topic` verb.

`family` is encoded as a stored string field rather than derived
from the dotted path, so authoring can override the inheritance
chain if a future taxonomy refactor wants it. The catalogue's
fallback resolver uses the dotted-path structure directly.

## The TopicCatalogue singleton

`TopicCatalogue extends PostRegistrationMixin(Idea)`. Three instance
methods compose its surface:

- `getDescriptor(topic: string): TopicDescriptor` — three-tier
  resolution; **always returns a populated descriptor**.
- `getSnapshot(): TopicDescriptor[]` — flat array of authored
  entries, used by the wire push.
- `invalidateCache(): void` — drops the cached map. Future admin
  verb hook for "I just edited a Topic seed, re-read it without
  restarting"; currently unused at runtime (cache builds once at
  boot).

Cache state lives as a `Map<string, TopicDescriptor> | null` private
instance field, warmed by `postRegister`'s call to
`Template.findDescendants('/obj/Topic/')`. Resolution
dispatches through the standard call-security gate via
`StuffApi.findByTemplatePath('/obj/TopicCatalogue')` — there's no
`TopicCatalogueApi` indirection. Per
[[feedback-no-new-apis-default]], the singleton's instance methods
are the access surface.

**No pre-cloning of Topic templates.** Topic templates are pure
data (`topic` / `family` / `label` / `description`) with no runtime
behavior, so the catalogue reads `data.*` directly off each
`Template` doc — no `Topic` Stuff instances are ever cloned at
boot. The bootstrap manifest carries `/obj/TopicCatalogue`
but **not** a `templatePathPrefix: '/obj/Topic/'` entry.
Same pattern as species clades / materials / biomes (see the
preamble in `mud/bootstrap.ts` for the precedent).

## Auto-fallback for unknown topics

`getDescriptor` walks three tiers in order:

1. **Cache hit** — return the authored entry verbatim.
2. **Family-inherited** — walk the dotted-path chain
   (`segments.slice(0, i).join('.')` for `i` from `length - 1` down
   to `1`) looking for the nearest authored ancestor. If found,
   inherit the family's description and synthesize the label as
   `<family-label> (<leaf-titlecased>)`.
3. **Derived default** — titlecased last segment as the label,
   `'(no description)'`, family = path prefix.

The family-inheriting step scales dynamic-topic generators. For
example, `MudlogApi` composes `system.log.<category>.<level>` at
runtime (`system.log.command.info`, `system.log.command.warn`); the
authored `system.log.command` family descriptor provides a useful
label and description for both leaves without per-leaf hand-seeding.
Authors override by writing a specific Topic seed; the cache hit at
step 1 wins.

The client runs the **same three-tier resolution** against its
cached snapshot — descriptor lookups don't round-trip.

## Wire push on session-establish

At session-establish, `Avatar.enter` reads
`(await findByTemplatePath('/obj/TopicCatalogue')).getSnapshot()`
into the welcome scene payload's `topicCatalogue` field. The client
caches the array in a `Map<topic, TopicDescriptor>` on the Zustand
store; `getTopicDescriptor` consults that map.

No live updates in v1. Mid-session descriptor edits land on next
login. If real demand for mid-session updates appears, the catalogue
can be turned into an MQL-subscribed live query — but the snapshot
shape is forward-compatible with that move.

## Cache invalidation

The cache builds once at boot from mongo and stays put for the
process lifetime. Descriptor edits written to mongo during the
process are picked up on next boot (or via a future admin verb
that calls `invalidateCache` + `postRegister` to re-read). Since
the catalogue no longer holds runtime `Topic` Stuff instances,
there are no `Events.StuffCreated/Destructed` subscriptions to
manage.

The catalogue itself is a system singleton; `canDestruct` refuses
unconditionally (mirrors `EventRegistry`).

## Contrast with EventRegistry

Both are singleton Ideas in `obj/` that own a per-X data shape:

| Aspect | EventRegistry | TopicCatalogue |
|---|---|---|
| Content shape | Transient per-event policy closures | Persistent per-topic prose (label, description, family) |
| Source of truth | Code-side `Events` enum + `defaultPolicyFor` table | `Topic` Ideas under `/obj/Topic/` |
| Code-side vocabulary | `Events` enum is the vocabulary | no code-side const — topics are string literals at call sites; descriptors are content |
| Auto-resolve behavior | `EventApi.on/emit` auto-registers unknown events with the default `emittableBy()` policy | `getDescriptor` auto-falls-back via family inheritance or derived default |
| Persistence | Empty seed; runtime state is closures | Empty seed; runtime cache reads `Topic` template docs from mongo at boot |

## Seed YAML structure

Every topic is one YAML file at
`seeds/lib/messaging/Topic/<full-dotted-path>.yaml`. Flat path
strings — no nested directories under the `Topic/` prefix, no
`FolderZone` admin scaffolding at v1. The hierarchical meaning is
encoded in the `topic` / `family` fields.

```yaml
class: /lib/messaging/Topic
hydratorClass: /obj/persistence/PersistentHydrator
data:
  topic: world.speech.say
  family: world.speech
  label: Say
  description: A character speaks aloud to everyone in the room.
  communicative: true
```

System-owned at v1. Revisit FolderZone admin scoping when a doc team
emerges that needs scoped editing rights.

The optional **`communicative: true`** flag marks a topic as a
*communication act* (say/whisper/shout/emote/chat — **not** dm /
narration / system). `TopicCatalogue` builds a server-side `Set` of these
during its template scan (no `TopicDescriptor` wire change) and exposes
`isCommunicative(topic)`, surfaced through `MessageApi.isCommunicative`.
The renown reception gate (`SensorMixin.onMessage`) consults it so only
genuine comm frames mint a being-heard signal — the first data-driven
capability hung on a topic. See [renown.md](./renown.md).

## Boot sequence

1. `SeederManager` inserts every YAML into the `domain` collection
   (including the per-topic seeds — those just sit in mongo as
   template docs, no runtime presence).
2. `BootstrapManager` clones `/obj/TopicCatalogue` (and nothing
   else in the messaging substrate).
3. `TopicCatalogue.postRegister` reads every Topic template via
   `Template.findDescendants('/obj/Topic/')` and warms
   the descriptor cache.
4. Welcome-scene payload composition reads `getSnapshot()` and
   ships it to the client.

## Topics introduced by the social-cluster build

| Topic | Where it lives | Producer |
|---|---|---|
| `world.expression` | family root | (engine) |
| `world.expression.emote` | leaf | catalog + free-form emote frames (`SoulMixin`) |
| `world.speech.whisper` | leaf | `VocalMixin.whisper` |
| `world.speech.shout` | leaf | `VocalMixin.shout` |
| `world.chat.message` | leaf | chat posts (`ChannelCatalogue.postToChannel`) |
| `system.broadcast` | leaf | `broadcast` verb (`BroadcastController`) |
| `system.shell.chat` / `system.shell.contacts` / `system.shell.group` | leaves | chat / contacts / group verb feedback |

The emote leaf shares the modality `'emotive-esp'`; chat posts and
broadcast both ride `'verbal-esp'`. See
[emotes.md](./emotes.md), [chat.md](./chat.md), and
[messaging.md](./messaging.md) for the producer side.
