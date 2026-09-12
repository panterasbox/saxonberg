# Presentation — implementation plan

Executes [presentation-requirements.md](../requirements/presentation-requirements.md).
**Kind:** refactor/sweep. **Leads from:** kernel. **First consumer:** every
prose line the game emits — concretely the 634 rows that author a
`shortDescription`, the 30 that author a proper name, the chat channels,
and (after this lands) pets' `KeptAnimal`.

What is being built: a thing presents a **noun phrase** (stem · register ·
count) instead of a string with an article typed into it; a reference
carries a **form** (`bare · handle · concise · presence · distinguishing ·
formal`) that the render seam resolves late beside the viewer, so the rich
forms survive a broadcast; `NamedMixin` leaves `Creature` for the identity
rung and the player body while `PerceptibleMixin` joins `Creature` so the
48 agent rows that already author a handle stop being silently discarded;
a channel gains an anonymity setting whose default reproduces today; and a
mechanical before/after golden proves the 634 shipped rows render the
identical string.

**Supersedes `named-rung-plan.md`** (its grounding is carried below, marked
*carried*; nothing is built from it).

---

## Grounding

Verified by opening files this cycle, on branch `design/pets` at
2026-09-10. `mud/` means `packages/server/src/mud/`; a pack path is
`packages/content/<pack>/`.

### The render seam

- `mud/api/mml.ts:243-246` — `MmlPayload` is `eager | lazy | ref`; the
  `ref` payload is `{ kind: 'ref'; tag: string; stuff: Stuff }` and
  nothing else. `Mml.ref` (`:319`) is private; the faces are `actor`
  (`:346`, tag `ACTOR_TAG = 'actor'`, `:257`, deliberately absent from
  `KNOWN_TAGS`), `thing` (`:405`), `location`, `player`, `npc`.
- `mml.ts:955-983` — `toString(viewer?)`: for a `ref`, tag =
  `wire === ACTOR_TAG ? stuff.kindFor(viewer) : wire`, and
  **`label = viewer ? stuff.describeFor(viewer) : stuff.getPresentation()`**
  — one form, hardcoded. The label then passes through
  `stuff.getPresentationMml(label) ?? Mml.text(label)` (`Stuff.ts:336`, a
  null-default hook; the only override tree-wide is
  `tpa/src/thing/TpaTerminal.ts:373`, which wraps the label in `<color>`).
- ⚠⚠ **`Mml.list` is eager** (`mml.ts:726-748`): every branch calls
  `items[i].toString()` with **no viewer**, so a list of `Mml.actor` refs
  renders viewer-blind — `getPresentation()`, the true name. Fourteen
  call sites; seven wrap identity refs:
  `SenseController.ts:210,260`, `LookController.ts:264,268,369,407,426`.
  The room's *main* occupant list escapes this only because
  `composeOccupantsImpl` resolves names eagerly per viewer before
  listing (below); `sense`, `search` results, on-surface and
  in-container lists do not escape it. This is a pre-existing honest-fog
  leak the requirements did not see; D5 decides it.
- `mud/lib/message/Scene.ts:265-276` — `Scene.send` builds one frame per
  recipient and materializes `af.body.toString(recipient)`; that is the
  per-recipient late binding every emitter rides. `ChannelCatalogue.ts:363`
  does the same per audience member (`peerBody.toString(a)`).
- `mud/api/mql-subscription.ts:311-325` — the wire's universal
  `displayName` field is `stuff.describeFor(viewer)` (concise), so the
  card and the scrollback share one name. `MessageLogic.refOf`
  (`platform/idea/api/MessageLogic.ts:66-69`) stamps `displayName` from
  `getPresentation()` — viewer-blind by design (`messaging.md:125`).
- The sealed subdir `mud/api/mml/` is `entities · flatten · markdown ·
  mention · schemes · tags · tree`; `tags.ts:36-80` is `KNOWN_TAGS`
  (`player · npc · thing · location · …`, `actor` absent, a test pins it).
  Only `api/mml.ts` may import from it (ESLint `no-restricted-imports`).

### The four forms and the two chains

- `mud/lib/stuff/Stuff.ts:218-241` — `getPresentation()` wraps
  `presentationCore()` (`:285-315`) in `SecurityApi.projectAcross`.
  `presentationCore`: disguise `appearsAs` → `Named.getName()` →
  `Visible.getShortDescription()` → `DEFAULT_PRESENTATION = 'something'`
  (`:74`); then, for a `Globbable` with `quantity !== 1`,
  `` `${n} ${GrammarApi.pluralize(this, base)}` ``. Overridden twice:
  `mud/lib/employment/Organization.ts:208` (`name || super`) and
  `trade-farming/src/location/Field.ts:611` (`fieldName || super`).
- `Stuff.ts:243-281` — `describeFor(viewer)` · `describeWithStatusFor`
  · `salientFeatures(covered)` · `perceivedKeywordsFor` · `kindFor`, each
  forwarding to `Stuff._recognitionFace()` (`:127-148`, the
  `RecognitionFace` interface: `describe · describeWithStatus ·
  salientFeaturesOf · perceivedKeywords · kindOf · knowsTrueType`), with
  `getPresentation()` as the no-face fallback.
- **Non-test callers**, counted (kernel + every pack `src/`):
  `getPresentation()` 265 · `Mml.actor(` 275 · `Mml.thing(` 390 ·
  `Mml.player(`/`Mml.npc(` 0 · `describeFor(` 13 · `.getName()` 88 (most
  are bespoke `name` fields on Ideas — `Locality`, `Material`, `Zone`,
  `Organization`…; none typed `Creature`/`Character`/`NPC`, *carried*) ·
  `.setName(` 3 · `getFullName()` 16 · `getPrimaryKeyword()` 17 ·
  `articleFor(` 6 · `GrammarApi.article(` 1 · `kindFor(` 4.
  ⚠ **`describeWithStatusFor` has exactly one caller**
  (`platform/idea/api/SocialLogic.ts:509`) and **`salientFeatures` exactly
  one** (`SocialLogic.ts:490`, `wornFeatureOf`, which parses the text
  after `" wearing "` out of the string).
- `mud/platform/idea/api/RecognitionLogic.ts` (510 lines):
  - `obscured(target)` `:73` — `isOrganism ? 'someone' : 'something'`.
  - `isMasked` `:82` — `getDisguise()?.masksIdentity`.
  - `strangerStem(target)` `:241-253` — **a second chain**: Visible
    `shortDescription` → `` `${articleFor(species)} ${species.getCommonNames()[0]}` ``
    → `'someone'`. Skips the name; skips the disguise (a non-masking
    disguise shows `appearsAs` on the wire ref and the `shortDescription`
    to a stranger — an existing inconsistency, preserved by D3).
  - `salientFeaturesImpl` `:257` — stem + `" wearing " + mostNotableWorn`.
  - `describeCore(viewer, target, withFeatures, withStatus)` `:290-352`
    — baseline `getPresentation()`; not `Sensor & Perception` → baseline;
    `canSeeGate` fails → `obscured`; masked → baseline; organism branch:
    `knownAs`/`typeName` compose as `` `${instanceName}, ${typeName}` ``
    (so *"Mitch, a city guard"* already exists), else stranger stem (+
    features); item branch: label / `typeName ?? unidentifiedLook ??
    baseline`; `decorate` (`:225`) appends `, ${status}`.
  - `perceivedKeywordsImpl` `:389` — organisms:
    `GrammarApi.tokenize(describeCore(viewer, target, true, false))`;
    everything else: `getKeywords()` if Perceptible, else `[]`.
  - The class (`:441-510`) wraps `describe` / `describeWithStatus` /
    `salientFeaturesOf` / `perceivedKeywords` in `projectAcross`.
- `mud/platform/idea/modalities/VisionModality.ts:146-179` —
  `canSee(viewer, target)` reads the light band at the **target's**
  container, not the viewer's location. So a channel line today renders
  `describeFor(recipient)` = the concise form across the realm: the name
  to someone who recognizes the speaker, the `shortDescription` to a
  stranger (the nine portraits included), `someone` if the speaker stands
  in the dark. That is "today's behaviour" the setting's default must
  reproduce (D9).

### The occupant block

- `mud/platform/idea/cmd/perception/LookController.ts:255-270` — two
  paths: `MixinApi.isNotifyPolicy(actor) ? await actor.composeOccupants(…)
  : Mml.list(occupants.map(o => Mml.actor(o)))`. Every `Avatar` composes
  `NotifyPolicyMixin` (`Avatar.ts:166`), so the second path is reached
  only by non-avatar lookers.
- `SocialLogic.ts:508-521` `nameMml(viewer, occ, color?)` — hand-builds
  `<${occ.kindFor(viewer)} stuff-id color>${describeWithStatusFor(viewer)}</…>`
  via `Mml.fromMarkup`; comment: *"resolved now … because the occupant
  block is resolved eagerly for a single known viewer"* and *"hand-built
  rather than `Mml.actor` because of the `color` attribute"*.
  `composeOccupantsImpl` `:537-610` awaits `ruleForImpl` (async,
  `GroupApi.isMember`) per occupant, sorts into boosted / individual /
  grouped, and returns `Mml.list([...])` — eager.
- The client already renders a `color` attribute on identity tags:
  `packages/client/src/components/MmlRenderer.tsx:612`
  (`$tint={paletteFor(node.attrs.color)}`), and `commandFor` (`:133`)
  routes `thing · location · player · npc` by `stuff-id` → registry
  `primaryKeyword` → `look <keyword>`, falling back to `look <label>` when
  either is missing.

### The description mixins and the census

- `mud/lib/description/Visible.ts:136-141` — `fieldMeta`:
  `shortDescription · longDescription · illustration`, all persistent +
  authorable; subscribable `shortDescription`/`longDescription`/`illustration`.
  Composers: `Thing` (`lib/stuff/Thing.ts:75`), `Creature`
  (`lib/creature/Creature.ts:142`), `CartesianLocation`
  (`lib/location/CartesianLocation.ts:58`), `Species`
  (`platform/idea/species/Species.ts:248`), `CircleFloor`. Five classes
  **override `getShortDescription()` to derive one at runtime, article
  included**: `platform/thing/Coin.ts:175` (`Currency.describeDenomination`
  → `` `a ${value}-${unit} piece` ``, `lib/banking/Currency.ts:221-228`,
  no shipped denomination authors `label`), `arcana/src/thing/ManaMain.ts:96`
  (`|| 'a mana line'`), `ManaCell.ts:49` (`'a mana cell'`),
  `ManaLamp.ts:116` (`'a mana lamp'`), `tpa/src/thing/TpaTerminal.ts:407`
  (`'a Teleport Authority terminal'`). `Coin.getPluralForm()` (`:193`)
  owns the stack form.
- `mud/lib/description/Perceptible.ts:105-114` — `fieldMeta`:
  `keywords · autoDeriveKeywords · primaryKeyword`. The `keywords` getter
  (`:170-190`) folds `tokenizeName(getName())` only under
  `hasMixin(ctor, Named)` and `shortDescription` tokens under
  `hasMixin(ctor, Visible)`. `getPrimaryKeyword()` (`:256`) returns the
  authored value if it is in the pool, else the **trailing** pool token —
  no public read says whether one was authored. Composers: `Thing`,
  `CartesianLocation`, `Material` (`lib/material/Material.ts:134`),
  `CircleFloor`, and in ranching `Livestock.ts:54` / `WorkingAnimal.ts:52`
  as `…PerceptibleMixin(Creature)`. **Not** `Character`, `Creature`,
  `Extra`, `Cast`, `Avatar`, `Corpse`.
- `mud/lib/description/Named.ts` — five fields, all persistent +
  authorable; `getFullName()` = `[honorific, name, surname]` + `, suffix`.
  *Carried:* exactly one production composition, `Creature.ts:166`
  (`NamedMixin(PropertiedMixin(Agent))`, innermost); `Thing.ts:14` states
  the rule it breaks.
- **Content census** (parsed YAML, every pack, this session; the script
  is in the scratchpad, not the tree): 1531 rows with `data:`; **634
  author a `shortDescription`**; leading word **`a` 451 · `an` 25 ·
  `the` 135 · none 23**. By branch — thing `a 391 · an 24 · the 46 · none 4`;
  agent `a 32 · an 1 · the 14 · none 5`; location `the 74 · a 26 · none 14`;
  idea 1 (`the Ferrow diggings`). ⭐ **The vowel rule reproduces every
  one of the 476 authored `a`/`an` choices — 0 mismatches**, so no
  article-override field is needed. The 23 article-less rows: 14
  locations (`Hinkley Lane`, `Duncan Hall lobby`…), 5 agents (`Odo the
  cook`, `Dave the Barkeep`, `Odile, the city registrar`…), 2 firm stocks
  (`Veshko's stock`), and ⚠ 2 `Floor` rows that are **mass nouns**, not
  proper names (`sodden peat ground`, `wet flagstones`). Stems over 25
  chars after the article: 45; over 40: 8. Title-case stems after an
  article: 49 (`the Goodkin counter`).
- **`primaryKeyword` is authored on 584 rows — including 48 agent rows**
  (`clerk`, `wolf`, `sentry`, `collier`, `weaver`, `dave`, `katie`, `body`,
  `carcass`, `pony`, `dog`, `ox`, `horse`…) — ⚠⚠ **every agent one is
  discarded at hydration today** because no `Character`/`Creature` class
  composes `Perceptible` (`PersistentHydrator.ts:64-77` reads only
  declared fields; *carried*). Two agent rows lack one: the Realtor (`a
  land agent in a good coat gone slightly shiny`) and Livestock (`a head
  of stock`). 17 agent rows also author `keywords:` (rejection, haulage,
  mining, ranching, transport) — discarded for the same reason.
- 30 organism rows author `name:`, every one Cast-composed (*carried*,
  including the Realtor via `terminus/src/realty/agent/Realtor.ts`).
  `newbie-wilds/…/agent/sellsword.yaml:31` authors `alternateNames` as
  plain strings on a `Mercenary` (*carried*: dead, mis-shaped).
- 57 species rows, all author `commonNames` (`["human","man","person"]`,
  `["dwarf"]`…) — `Species.getCommonNames()` `:606`.
- One row authors `appearsAs`: `generic-objects/…/thing/clothes/hood.yaml`
  — `a hooded figure`, `masksIdentity: true`.
- `Coin.yaml` deliberately authors no `shortDescription`; the one
  `quantity`-bearing row with one is `trade/mining/thing/Ore`
  (`a lump of green-stained rock`, `quantity: 1`).
- `ConditionLogic.mintCorpseFrom` (`platform/idea/api/ConditionLogic.ts:584-591`)
  overlays `shortDescription: `the body of ${presentation}`` — a
  **runtime-authored description with an article** (*carried:* it never
  carried a name; the `:578` comment is false).

### Grammar

- `mud/api/grammar.ts:147-163` — `article(stuff)` =
  `articleFor(stuff.getPresentation())`; `articleFor(text)` is a vowel
  check on the first character (so today `article(x)` on `"a heavy
  door"` answers `an` — a latent bug with **0 content users**: no shipped
  template uses the `| article` or `| name` prose filters). `ARTICLES`
  (`:66`, public `:100`) feeds MQL article-stripping and `tokenize`
  (`:168`). `pluralize(stuff, singular)` (`:190`) honours
  `getPluralForm()`. `GrammarApi` is in `check-object-verbs`'s
  `EXEMPT_APIS` (`scripts/check-object-verbs.ts:108`).

### Chat

- `mud/lib/social/Channel.ts:44-50` — `fieldMeta` `name · kind · subject
  · procedure · archived`; `kind: 'player-created' | 'open-join-standalone'`.
- `mud/platform/idea/ChannelCatalogue.ts:303-375` `postToChannel(speaker,
  channel, body)` — `speakerName = Mml.actor(speaker)`; `selfBody` /
  `peerBody = compose`[${name}] ${speakerName}: ${safeBody}``; per-audience
  `peerBody.toString(a)`; payload `speaker: MessageApi.refOf(speaker)`
  (a `StuffRef` with `stuffId` + `displayName`); history ring stores the
  viewer-blind `getPresentation()` line. Channel docs are minted at
  `:487` (`promote`), `:530` (`createPlayerChannel`), `:569`, `:607`
  (`attachChatToSubject`), and by the installer's subject kind at
  `platform/idea/api/PackLogic.ts:1911-1915` (`procedure: 'open'`).
  Seeded subjects: `platform/content/subjects/{help,global,chat}.yaml`
  (`name · description · channel: true`).
- `platform/idea/cmd/social/ChatController.ts` — one controller,
  subcommands dispatched on `model.subcommand`; the bare post is the
  fallthrough (`executePost`, `:100-150`; ad-hoc channels are composed
  inline with `Mml.actor(speaker)`); `rename`/`disband` are owner-gated
  (`:294`, `:342`). The view `platform/content/platform/cmd/social/chat.yaml`
  declares subcommand `options:` (`on: options: ordered: {type: boolean,
  field: ordered}`) and top-level `args: channel, message (greedy)`;
  top-level `options:` is the shipped shape (`author/clone.yaml:24-45`).
- Client: `packages/client/src/lib/templates/chatTemplate.tsx:50` picks
  the sender as `findFirstTagAny(tree, ['player','npc','thing'])` and
  falls back to a plain layout when none is found (`:78`);
  `App.tsx:67` tolerates an absent `payload.speaker`.

### Employment — the role rung has no noun

- `mud/lib/employment/Position.ts:29-30` — `label: string`, *"Human label
  for the role (e.g. `'tending bar'`)"*. ⚠⚠ **Every shipped label is a
  gerund or a phrase** (`tending bar`, `keeping the bar`, `running
  Hollis`, `on the road`, `sitting as Magistrate of Terminus`, 40 rows).
  Position **keys** are mostly nouns (`clerk ×3`, `weaver`, `smith`,
  `collier`, `teller`, `cook`, `carter`…) but are identifiers with firm
  names mixed in (`vionne`, `veshko`, `hollis`, `goodkin`, `hand ×8`,
  `chief-executive ×5`) — not a prose source either.
- `mud/lib/employment/Employed.ts:181-191, 280-300` —
  `getActiveEmployment()` → `organizationPath` → `StuffApi.findByTemplatePath`
  → `MixinApi.isOrganization` → `getPosition(positionKey)`; that walk
  already exists for `getConferredMixinNames`. `Employed` is composed on
  `Character` (its header) — so `Extra`, `Cast`, `Avatar`, but not
  `Livestock`/`KeptAnimal`.

### Identity, rungs, gates (carried, re-verified)

- `mud/lib/npc/Cast.ts:96` — `class CastMixin extends SingletonMixin(Base)
  implements Cast`; four dossier fields; no name field. `Extra.ts:29` is
  `class Extra extends NPC {}`; `NPC.ts` = `BehavedMixin(PostRegistrationMixin(Character))`.
  `Avatar.ts:160-183` reaches `Named` only through `Creature`.
- `scripts/check-identity.ts` — rule 1 (`:262`) proper `name:` on an
  Extra; **rule 2 (`:270-283`) reads the article with `DEFINITE =
  /^the\s+/i` and `INDEFINITE = /^an?\s+/i` on `shortDescription`** —
  ⚠ once the sweep strips articles these regexes match nothing and rule
  2 silently passes everything; rule 3 double instantiation; rule 4
  sentient Extra with no institution; rule 5 dossier on an Extra.
  `main()` at `:343` runs unguarded on import.
- `scripts/pack-roots.ts:112-150` `composesMixin` — matches only
  `/\bclass\s+\w+\s+extends\s+([^{]+)\{/g` and follows identifiers through
  `importedClassPath` only; **blind to a same-file `const XBase = …`**
  (*carried*; `Creature`, `Character`, `NPC`, `Avatar`, pets'
  `KeptAnimal` all use it). `lint:dossiers` shares it.
- `Perceptible.keywords` and `perceivedKeywordsImpl` are both
  absent-safe once `Named` leaves `Creature` (*carried*, D3 of the old
  plan); ~35–40 test files subclass `Character`/`NPC`/`Creature` and call
  `setName` — vitest does not type-check, they fail at runtime, and
  `test:near` will not select them (*carried*).

### Harness precedents

- `scripts/check-field-meta.ts` — the `--snapshot` / `--verify` / `--lint`
  golden-master pattern (one extractor, a committed golden, a diff).
- `scripts/drive-identity.ts` — a drive over the real wire
  (`POST /auth/test-login`, a WebSocket, typed command strings, `✔/✘`
  checkpoints). There is **no vitest that boots the content packs**;
  the only full-world harness is a running dev server (`e2e/` is
  Playwright over the client). `StuffApi.getAllObjects()`
  (`mud/api/stuff.ts:1312`) enumerates every live Stuff in-process.
- `pnpm -C packages/server lint:family --list` — 29 gates today.

### Pets (context, not scope)

`docs/plans/pets-plan.md:133` lists `Named` in `Creature`'s composition;
`:394-403` composes `KeptAnimal` over `PerceptibleMixin(Creature)`;
`:560-570` (D10) narrows recognition to persons. § Deferred seams says
what changes.

---

## Plan-level decisions

**D1 — The noun phrase is a value object; `getPresentation()` keeps
returning a string.** `mud/lib/description/NounPhrase.ts` (category:
*named value-object / vocabulary*, the `Light`/`Quantity` home) exports
`class NounPhrase { stem; register; count; plural }` with `static
of(stem, register)`, `static proper(stem)`, `withCount(n, plural)`,
`article()`, `render()` (the shipped string: `count !== 1` → `` `${n}
${plural}` ``; `proper` → stem; `definite` → `the ${stem}`; `indefinite`
→ `${a|an} ${stem}`), `bare()`, `definite()`, `indefinite()`,
`possessive()`, `toString() = render()`; and the two vocabularies
`Register = 'proper' | 'definite' | 'indefinite'` (`REGISTERS`) and
`PresentationForm = 'bare' | 'handle' | 'concise' | 'presence' |
'distinguishing' | 'formal'` (`PRESENTATION_FORMS`). The vowel check
moves here (`NounPhrase.articleFor`); `GrammarApi.articleFor` delegates.
`Stuff` gains **`presentationPhrase(view: 'own' | 'stranger' = 'own'):
NounPhrase`** — the structured identity and the new **override point**
(`Organization` and `Field` move their overrides onto it, returning
`NounPhrase.proper(name)`) — and `getPresentation()` becomes
`projectAcross(() => this.presentationPhrase().render())`, signature
unchanged, so the 265 callers, the wire `displayName`, `refOf`, MQL
scalars and logs are untouched. Reason: a string is the right type for
265 sinks that only print; the phrase is the right type for the six
places that need an article, a plural or a possessive.

**D2 — The register field lives on `VisibleMixin`, beside the
description it was typed into; the rungs constrain it, they do not
carry it.** `Visible.fieldMeta.register: { persistent: true, authorable:
true }`, default `'indefinite'`, setter validates against `REGISTERS`
(throws — the `Status` precedent for a per-field invariant). The
requirements say the register "belongs to the identity rungs"; the
census says 480 of the 611 articled rows are things and locations,
which have no rung. So the *field* goes where every describable thing
already keeps its article, and the *rung* is enforced as agreement:
`lint:identity` rule 2 reads `register` instead of the leading article
(Extra ⇒ `indefinite`; nameless Cast ⇒ `definite`; an Extra may not be
`proper`). The one chain rule the sweep needs: **a stem never begins with
an article** — `lint:presentation` (D10) gates it as census-then-ratchet.
The two mass-noun `Floor` rows are marked `proper` by the sweep (they
render identically: no article) and recorded as the one place the
three-value vocabulary is thin — a `mass` register is a deferred seam,
not a fourth value invented now.

**D3 — One chain, two views; the stranger view skips exactly one rung.**
`presentationPhrase('own')` = disguise `appearsAs` (indefinite; the
garment's stem) → `Named.name` (proper) → `shortDescription`
(`register`) → species common name (indefinite, organisms) →
`'something'`. `presentationPhrase('stranger')` = `shortDescription` →
species → `'someone'` — the same rungs minus the name and the disguise,
which is what `strangerStem` does today. `RecognitionLogic.strangerStem`
is deleted; `describeCore`'s stranger branch calls the phrase. The two
terminals (`something` / `someone`) and the stranger view's disguise
skip are kept **deliberately**, for byte-identity with today; the one
change is the species rung joining the viewer-blind chain, which no
shipped row reaches (every agent row but the Avatar seed authors a
description, and an Avatar is named at enroll) — a fixture-level delta
only. The disguise's `appearsAs` is a **stem** from now on and its
phrase is always indefinite (a disguise is one-of-many by nature); no
field is added to `DisguiseBearingMixin`; the hood row is swept.

**D4 — The form is a parameter on the ref and on the one describe
call.** `MmlPayload.ref` gains `form?: PresentationForm` and `attrs?:
Readonly<Record<string, string>>`; `Mml.actor / thing / location /
player / npc (stuff, opts?: { form?, color? })`. Resolution in
`toString(viewer?)` becomes `stuff.describeFor(viewer, form ?? 'concise')`
where **`viewer` may be `undefined`** (viewer-blind: what
`getPresentation()` gave, per form). `Stuff.describeFor(viewer: Stuff |
undefined, form = 'concise'): string` is the single face;
`describeWithStatusFor` and `salientFeatures` are **deleted** (one
caller each, both in `SocialLogic`, both migrate); `RecognitionFace`
shrinks to `describe(viewer, target, form) · perceivedKeywords · kindOf
· knowsTrueType`. Form semantics, resolved beside the viewer:

| form | resolves to | gates consulted |
|---|---|---|
| `concise` | today's `describeCore(false,false)` — recognized name (+ `, typeName`) or the stranger phrase | perception · disguise · recognition |
| `presence` | `concise` + `, ${status}` (`StatusMixin`) | same |
| `distinguishing` | `concise`, with the stranger phrase widened to `… wearing ${worn}` | same |
| `formal` | `getFullName()` when Named and non-empty, else `concise` | same |
| `bare` | `getName()` when Named and non-empty, else `handle` | **none** — a channel is not looking |
| `handle` | `handlePhrase().render()` — `indefinite(handle stem)` | **none** |

⭐ **The `handle` form carries no `stuff-id`.** A handle names nobody, so
the ref's wire tag is emitted without the id (the client's `commandFor`
already tolerates an id-less identity tag). The tag kind is
`kindFor(undefined)` — the object's own truth (`player` for a player) —
because "a weaver" being a player is not the secret; *which* player is.
`perceivedKeywordsImpl` becomes `tokenize(describe(viewer, target,
'distinguishing'))` — unchanged output.

**D5 — `Mml.list` becomes lazy.** It builds a `{ kind: 'lazy' }` payload
(items as values, separators as strings) so its items resolve at
`toString(viewer)`. This is required by D4 (a late-bound occupant list
in an eager join would render viewer-blind) and it closes the leak in
§ Grounding: `sense`, `search` results, on-surface and in-container
lists stop showing a stranger a hooded figure's true name. ⚠ This is
the plan's **one deliberate departure from "a player cannot tell"**:
every shipped row renders identically (the golden proves it), but a
*disguised or unrecognized person* listed by `sense`/`search`/a surface
now reads as the room's roll-call already reads them. It is the
behaviour `belief.md § The prose path` documents as the contract, and
the alternative — a second lazy list for occupants only — would be a
guard. Recorded in the MR as a fix, with the seven sites named.

**D6 — The occupant block keeps its eager *rule* and regains late
*naming*.** `nameMml` becomes `Mml.actor(occ, { form: 'presence', color:
rule.color })`; the async `ruleForImpl` (boost/hide/group) stays
resolved per viewer because it is an attention rule, not a name. The
`LookController` fallback path becomes `Mml.list(occupants.map(o =>
Mml.actor(o, { form: 'presence' })))`, so both paths render the same
form (AC5). `wornFeatureOf` keeps parsing after `" wearing "` from
`occ.describeFor(undefined, 'distinguishing')` — the viewer-blind
distinguishing form — recorded as a seam, not rewritten.

**D7 — `NamedMixin` off `Creature`; onto `CastMixin` and `Avatar`;
`PerceptibleMixin` onto `Creature`.** (Named: the superseded plan's
D1/D2 verbatim — `class CastMixin extends SingletonMixin(NamedMixin(Base))`,
`interface Cast extends Named`; `Avatar` composes it innermost of
`AvatarBase`.) Perceptible on `Creature` at the position `Visible`
holds (`VisibleMixin(PerceptibleMixin(…))`, the `Thing` order):
**every body is addressable by a keyword and carries the guaranteed
handle**, which is what 48 shipped agent rows have been asserting into a
void. Ranching's `Livestock`/`WorkingAnimal` drop their explicit
`PerceptibleMixin(` (a double composition would declare `fieldMeta`
twice). Organism targeting (`perceivedKeywordsImpl`) **stays
recognition-derived** — it does not union the authored `keywords:` pool
— so no targeting word is gained or lost; the 17 rows' `keywords:` now
hydrate and go unread by targeting, recorded in § Deferred seams. The
one client-visible consequence: an NPC's wire record now carries
`primaryKeyword`, so clicking its tag sends `look clerk` rather than
`look a brisk clerk with a stub of chalk`. That click was broken; it
now works. Named on `Extra` becomes a compile error and rule 6 of
`lint:identity` (carried: an organism row authoring a name-shaped key on
a class that does not reach `Named`) makes it a build error; the
sellsword's `alternateNames` block is deleted (carried D7).

**D8 — The handle chain reads an authored `primaryKeyword`, then a
`noun` on the Position, then the species, then the description stem.**
`Position` gains `noun?: string` — *what one holder is called*
(`bartender`); optional, `fromData`/`serialize` round-trip it, absent =
no role rung. `EmployedMixin.getPositionNoun(): string | null` walks
the first active employment (the `getConferredMixinNames` walk).
`PerceptibleMixin.getAuthoredPrimaryKeyword(): string | undefined`
exposes the raw slot (the derived trailing token must never feed the
handle — it is `other` for the weaver). `Stuff.handlePhrase()` =
`indefinite(authored primaryKeyword ?? positionNoun ?? species common
name ?? description stem ?? 'someone'|'something')`. ⚠ **This is the one
place the plan pushes back on the requirements' wording.** *"Drop an NPC
into a bakery and they are a baker … Nobody typed that"* — somebody
did: the bakery's author, once, on the Position. `label` is a gerund
by design and there is no honest gerund-to-noun transform; the noun is
a second, optional word on the same row, and the handle then follows
the job exactly as required (AC11) and never overrides an authored
handle (AC12). The content wave authors `noun:` on every shipped
Position whose key is already a plain noun (`bartender`, `clerk`,
`weaver`, `smith`…); the firm-name keys get none.

**D9 — Anonymity is a property of the utterance, gated by the channel;
disguise is untouched.** `Channel.fieldMeta.anonymity: 'permitted' |
'forbidden'`, **default `'permitted'`**; authored on a seeded subject as
`anonymity:` (installer passes it through); set by the owner with `chat
anonymity <name> permit|forbid`. The bare post gains a top-level boolean
option `--anon`. `postToChannel(speaker, channel, body, { anonymous })`
chooses the speaker fragment:

| channel | post | speaker fragment |
|---|---|---|
| `forbidden` | plain | `Mml.actor(speaker, { form: 'bare' })` — the name, for everyone, hood or no hood |
| `forbidden` | `--anon` | refused: `controller-rejected`, *"this channel does not permit anonymity"* |
| `permitted` | plain | `Mml.actor(speaker)` — **today's concise form, byte-identical** |
| `permitted` | `--anon` | `Mml.actor(speaker, { form: 'handle' })` — no `stuff-id`; `payload.speaker` omitted; the history line stores the handle |

Why `permitted`+plain stays `concise`: that is what every channel does
today and the invisibility bar owns the default. ⚠ It leaves a wart the
requirements did not decide — a hooded speaker on a *permitted* channel
still reads as hooded to a stranger, though "a channel is not looking".
Recorded in § Deferred seams as a one-line follow-up once a visible
change is allowed; not decided here. Ad-hoc (DM-group) channels refuse
`--anon` (a cohort you were added to by name has no anonymity to
permit).

**D10 — The invisibility bar is a golden master, and the gate that
keeps it is `lint:presentation`.** New `scripts/check-presentation.ts`
(one more `lint:*` script; the roster is derived, nothing to enrol):

- `--snapshot` (W0, run once **before any change**) writes
  `scripts/__fixtures__/presentation-golden.json`: for every content row
  with a `shortDescription` or a `name`, the string today's
  `presentationCore` produces (`name ?? shortDescription ?? 'something'`)
  and, for every organism row (`_speciesPath`), today's stranger stem
  (`shortDescription ?? "a|an <commonNames[0]>" ?? 'someone'`), both
  computed from YAML by the shipped rule.
- `--verify` recomputes both through `NounPhrase.of(stem, register)`
  from the *swept* rows and diffs against the golden. Green = 634 rows
  byte-identical. Runs in every wave from W1 on.
- `--lint` (permanent): (a) no `shortDescription` / `appearsAs` stem
  begins with `a `, `an `, `the ` — **census-then-ratchet**: W0 records
  today's 612 as the ceiling, W1 drives it to 0 and flips it hard; (b)
  every authored `register` is in `REGISTERS`; (c) every Position `noun`
  is a single lowercase token. The golden file and `--verify` are
  build-cycle artifacts and are **deleted at `/finalize`**; the `--lint`
  clauses stay. The row sweep itself is a **textual** edit (strip the
  leading article on the `shortDescription:` line, insert `register:`
  after it; never a YAML re-serialize — comments and quoting survive);
  its script lives in the scratchpad, runs once, and is not committed.
- The runtime forms are proven by the **drive** (`scripts/drive-presentation.ts`,
  the requirements' 14 steps over the wire, plus a `--transcript <file>`
  mode that captures `look` in five rooms so W0 can record a *before*
  transcript and W5 diffs it).

**D11 — Client: no work.** The wire tag vocabulary is unchanged
(`player · npc · thing · location`; `actor` still never reaches the
wire); `color` is already rendered; `primaryKeyword` is already in
`REF_FIELDS`; the anonymous line still carries an identity tag (id-less)
so `chatTemplate` lays it out as any other post; an absent
`payload.speaker` is tolerated. Confirmed against
`MmlRenderer.tsx:133,612`, `chatTemplate.tsx:50,78`, `App.tsx:67`.

**D12 — Wave order: harness and gates first, then content, then the
seam, then the hosts, then the new behaviour.** The golden must exist
before the sweep (W0 → W1); the form axis needs no content (W2); the
host move is the wide fixture sweep and lands under rule 6 (W3); chat
and the handle chain are the only new behaviour and land last (W4).

---

## ⭐⭐ Host placement

| what | host | what composing it claims about everything on that host | guard? |
|---|---|---|---|
| `register` field | `VisibleMixin` (`lib/description/Visible.ts`) — hence `Thing`, `Creature`, `CartesianLocation`, `Species`, `CircleFloor` and every subclass | every describable thing takes an article, and it was already in the prose (611/634) | none |
| `NounPhrase` | value object, `lib/description/NounPhrase.ts` — inherited by nothing, instanced by `Stuff.presentationPhrase` | n/a | n/a |
| `presentationPhrase` · `handlePhrase` · `describeFor(viewer, form)` | `Stuff` (`lib/stuff/Stuff.ts`) — where `getPresentation` and the recognition faces already sit | every Stuff can be asked for its phrase and for any form; the no-face fallback is the phrase | none — the mixin reads inside are the same `MixinApi.isX` narrows `presentationCore` makes today |
| `form` / `attrs` on the ref | `Mml` payload (`api/mml.ts`) | a reference states the form it needs; the seam answers | none |
| `NamedMixin` | `CastMixin` (`lib/npc/Cast.ts`) — hence `Cast`, `Crafter`, `Gus`, `TicketClerk`, `Walter`, `Katie`, `Realtor` | every somebody can be addressed by name — the rung's definition | none |
| `NamedMixin` | `Avatar` (`platform/agent/Avatar.ts`) — hence `Shade`, `WireBody`, guests | every player body has a name enroll writes | none |
| `NamedMixin` **off** `Creature` | releases `Extra`, `Mercenary`, `Corpse`, `HaulingCreature` (+`PitPony`, `DraftHorse`), `Livestock`, `WorkingAnimal`, bare `Creature` | a body is not a somebody | none — the eight `isNamed` narrows in the tree already narrow |
| `PerceptibleMixin` | `Creature` (`lib/creature/Creature.ts`), inside `Visible` | every body is addressable by keyword and carries a handle; `Livestock`/`WorkingAnimal`/pets' `KeptAnimal` stop composing it themselves | none — organism targeting keeps its own path, by design (D7) |
| `getAuthoredPrimaryKeyword` | `PerceptibleMixin` | the raw slot is readable without the derived fallback | n/a |
| `noun` | `Position` value object (`lib/employment/Position.ts`) | a position may say what one holder is called | n/a |
| `getPositionNoun` | `EmployedMixin` (`lib/employment/Employed.ts`) — hence `Character` and below | an employable actor can be called by its job | none |
| `anonymity` | `Channel` document (`lib/social/Channel.ts`) | every persistent channel permits or forbids; ad-hoc has no setting | none |
| `--anon` option · `anonymity` subcommand | `chat.yaml` / `ChatController` | the verb that posts declares the stance | n/a |
| rule 2 on `register`, rule 6, const-follow | `scripts/check-identity.ts`, `scripts/pack-roots.ts` | as the superseded plan | n/a |

Rejected hosts: register on `CastMixin`/`Extra` (no rung on 480 rows);
register on `Stuff` (a Stuff with no description has no article to
take); a `handle` field of its own (the field exists — `primaryKeyword`
on 584 rows); Perceptible on `Character` (`Corpse`, `Livestock`,
`KeptAnimal` are `Creature`-tier and need the handle); anonymity on the
speaker (a disguise is on the body; a stance is on the message); a
`noun` derived from `Position.key` (an identifier, and `vionne` is not
"a vionne"); a lazy list only for occupants (a guard).

---

## Convention conformance

- **Module categories:** one new file in a sanctioned category
  (`lib/description/NounPhrase.ts`, named value-object + vocabulary), one
  new lint script (`scripts/check-presentation.ts`, the `check-*`
  precedent), one new drive script (`scripts/drive-presentation.ts`, the
  `drive-*` precedent), tests. No new Api, no logic singleton, no free
  helper, no `eslint-disable`. The vowel check stays a static on
  `NounPhrase` (a value object's own method), `GrammarApi.articleFor`
  forwards to it.
- **Sealed subdir:** nothing outside `api/mml.ts` imports `api/mml/**`;
  `KNOWN_TAGS` is not edited (no new wire tag); the `actor`-absent test
  still holds.
- **`_mixinName` widening:** no new mixin; `Perceptible` and `Named`
  keep their statics.
- **Module scope / import boundary:** `Stuff.ts` imports only `mud/`
  siblings (`NounPhrase` is pure); `Employed.ts` already imports
  `StuffApi`; `check-presentation.ts` reads YAML with `yaml` +
  `pack-roots` like every other gate.
- **Verbs on objects:** `describeFor(viewer, form)` stays on the object;
  `GrammarApi.article(stuff)` remains exempt-listed; no `XApi.verb(host)`
  is added.
- **`Collections` over literals:** `Channel.collectionName` unchanged;
  `schema/channels.yaml` purpose text gains a sentence on `anonymity`
  (no index).
- **props:/cast:**, **Locations-not-rooms**, **`<root>/<branch>/`**: no
  row designation, class path or template path changes.
- **Gates this build must pass** (the whole derived family, `pnpm -C
  packages/server lint:family`, 30 once `lint:presentation` exists);
  the ones it *exercises*: `lint:presentation` (new), `lint:identity`
  (rule 2 rewritten, rule 6 added), `lint:dossiers` (shares the
  resolver), `lint:field-meta` (`register`, `anonymity`),
  `lint:schema` (channels doc), `lint:instanceable` (new `lib/` file;
  two pack `src/` edits), `lint:module-scope`, `lint:imports`,
  `lint:object-verbs`, `lint:thin-forwarder`, `lint:arg-kinds` (`chat
  anonymity` takes strings, no object slot), `lint:test-bootstrap`,
  `lint:test-content` (the golden is a JSON fixture, not a test file;
  the drive is a script; keep `/world/…` literals out of any new
  `*.test.ts`), `lint:census`, `lint:untitled`.

---

## Waves

### W0 — the golden, the ratchet, the resolver, rule 6, the drive skeleton

**Goal.** Ship every measuring instrument before anything moves, green on
the current tree. D10, D12; the carried W0.

**Files.**
- `packages/server/scripts/check-presentation.ts` (new) — `--snapshot`,
  `--verify`, `--lint` as in D10. Export the pure decisions
  (`legacyPresentationOf(row, speciesByPath)`, `stemOf`, `leadingArticleOf`)
  the way `check-template-census.ts` exports `refsOf`. `--lint` clause
  (a) is a **ceiling** at W0: `LEADING_ARTICLE_CEILING = 612` (611
  `shortDescription`s + the hood's `appearsAs`; confirm the number by
  running it), failing only if the count *rises*.
- `packages/server/scripts/__fixtures__/presentation-golden.json` (new,
  committed) — the `--snapshot` output. ⚠ Generate it **before** W1
  touches a row.
- `packages/server/package.json` — `"lint:presentation": "tsx
  scripts/check-presentation.ts --lint"`; nothing else (the family is
  derived).
- `packages/server/scripts/pack-roots.ts` — `composesMixin` follows a
  same-file `const <Id> = <expr>;` binding when an `extends` identifier
  is not an import (carried W0, ~15 lines; update the docstring).
- `packages/server/scripts/check-identity.ts` — rule 6 (carried);
  guard `main()` with the `check-template-census.ts:662` idiom; extend
  `--report` with the name-shaped keys.
- `packages/server/scripts/__tests__/check-identity.test.ts` (new) and
  `scripts/__tests__/check-presentation.test.ts` (new) — pure-decision
  tests (no wired runtime; no `/world/…` literal in the test text).
- `packages/server/scripts/drive-presentation.ts` (new) — the
  `drive-identity.ts` shape: login, WebSocket, the requirements' 14 steps
  as `✔/✘` checkpoints, and `--transcript <file>` capturing `look` (and
  `look <occupant>`) in Hinkley Lane, Dave's Bar, the Terminus registry,
  the Ferrow adit and the Duncan Hall lobby. Run it now against a booted
  master-equivalent server with `--transcript before.json` (scratchpad;
  not committed).

**Acceptance.** `lint:family` green; `--snapshot` written; `--verify`
green against itself; `lint:identity`/`lint:dossiers` finding counts
before/after the resolver change recorded below (a new finding is a
finding, not a regression to suppress); rule 6 finds nothing on the
current tree; `--report` lists the sellsword's `alternateNames`.

**Commit.** `build(presentation W0): the presentation golden + lint:presentation ratchet; composesMixin follows const bases; lint:identity rule 6`

### W1 — the noun phrase, the register, and the content sweep

**Goal.** A thing presents a stem + register; every row loses its
article and gains a `register:`; the golden proves 634 rows render the
identical string. D1, D2, D3 (own view only — the stranger view moves
in W2). No rendering path other than `presentationCore` changes.

**Files.**
- `mud/lib/description/NounPhrase.ts` (new) + `__tests__/NounPhrase.test.ts`
  — the value object, both vocabularies, the vowel check; tests over
  the render matrix (proper/definite/indefinite × count 1/n × a/an).
- `mud/lib/description/Visible.ts` — `register` field, `getRegister()` /
  `setRegister()` (validates), `fieldMeta`, a `subscribableFields`
  dependency is **not** needed (`displayName` already re-projects on
  `shortDescription`; add `register` to its `dependsOnFields` on
  `Stuff.subscribableFields` if the descriptor lists sources — check
  `Stuff.ts:153-190`).
- `mud/lib/stuff/Stuff.ts` — `presentationPhrase(view)` replacing
  `presentationCore` (the `'stranger'` view is added here but reached
  only in W2); `getPresentation()` renders it; `handlePhrase()` lands in
  W4. `Organization.ts:208` and `trade-farming/src/location/Field.ts:611`
  move their overrides onto `presentationPhrase`.
- `mud/api/grammar.ts` — `articleFor` delegates to
  `NounPhrase.articleFor`; `article(stuff)` = `stuff.presentationPhrase().article()`
  (fixes the double-article latent bug; 0 content users).
- The five derived descriptions become **stems**: `Coin.ts:175`
  (`describeDenomination` returns `` `${value}-${unit} piece` ``, and
  `Currency.ts:57`'s `label?` doc says *a stem, no article*; the
  `"a blank coin"` fallback → `"blank coin"`), `ManaMain.ts:96`,
  `ManaCell.ts:49`, `ManaLamp.ts:116`, `TpaTerminal.ts:407` — each
  drops its `a `; their registers stay the default `indefinite`. Their
  tests follow.
- ⚠⚠ **Every RUNTIME writer of `shortDescription` must write a STEM**,
  and W0's audit found **nine**, not the one the plan named. Each writes
  an article into the field today, so each would render a **double
  article** the moment the register does the article's job — *"a a
  salvaged lump of iron"*. None is covered by the golden, which reads
  YAML; they are covered by the unit tests beside them and by the drive.

  | site | writes today | becomes |
  |---|---|---|
  | `platform/idea/api/ConditionLogic.ts:586` | `the body of ${presentation}` | stem + `register: 'definite'` (carried D4) |
  | `platform/idea/cmd/retail/CheckController.ts:103` | `a coat-check ticket` | `coat-check ticket` |
  | `platform/idea/api/CraftingLogic.ts:1625` | `a worked lump of ${material}` | `worked lump of …` |
  | `platform/idea/api/CraftingLogic.ts:2241` | `a salvaged lump of ${material}` | `salvaged lump of …` |
  | `platform/idea/api/CraftingLogic.ts:2258` | `a heap of ${material} scrap` | `heap of … scrap` |
  | `lib/lock/Lock.ts:110-117` (`keyDescription`, 4 literals) | `a worn brass key`, … | `worn brass key`, … |
  | `lib/thermal/Thermal.ts:725` | `a cast lump of ${material}` | `cast lump of …` |
  | `trade-ranching/src/idea/cmd/ranching/DraftController.ts:239` | `` `a ${primary}` `` where `primary` is a species common name | `` `${primary}` `` — the register supplies the article |
  | `eternal-university/src/duncan-hall/dorm-themes.yaml` (28 overlays) | `a miner's dorm room`, … | stems; the file is under `src/`, **outside the golden's walk**, so its own pack suite is the proof |

  ⭐ `DraftController` is the argument for the whole build in one line. It
  prepends `"a "` to a **species common name it is handed at runtime** —
  so the correctness of the article depends on content nobody has written
  yet. ⚠ Checked: no shipped livestock species has a vowel-initial common
  name, so the bug is **latent, not live** (`elf`, `ogre`, `orc`, `ewe`
  exist, none of them reachable by `draft`). It is exactly the kind of
  thing that only becomes wrong when somebody authors an ox — and after
  this build the site cannot get it wrong, because it stops choosing.
- `mud/lib/disguise/Disguise.ts` — `appearsAs` doc: a stem; the wearer's
  phrase is always indefinite. `Stuff.presentationPhrase` builds
  `NounPhrase.of(appearsAs, 'indefinite')`.
- **The sweep (content, textual):** every row with a leading-article
  `shortDescription` → article stripped, `register: definite|indefinite`
  inserted on the next line; the 23 article-less rows → `register:
  proper`; `hood.yaml` `appearsAs: hooded figure`. Two rows lacking a
  `primaryKeyword` on the agent branch get one read off the stem
  (`realty/agent/ricky.yaml` → `agent`; `ranching/agent/livestock.yaml`
  → `stock`). No row gains prose.
- `scripts/check-identity.ts` rule 2 → reads `register` (**same
  commit** as the sweep — the regex form goes blind the moment the
  articles leave); `scripts/check-presentation.ts` clause (a) flips from
  ceiling to hard zero.
- `packages/server/src/mud/lib/stuff/__tests__/Stuff.presentation.test.ts`
  (new or extended) — the chain: disguise > name > description > species
  > `something`; a `Globbable` stack; a `definite` row renders `the …`.

**Acceptance.** `lint:presentation --verify` green (0 diffs over the
golden); `lint:family` green; `test:near` + the explicit set in § Test
& gate strategy green; `drive-presentation --transcript after-w1.json`
identical to `before.json`.

**Commit.** `build(presentation W1): the noun phrase — stem + register, the article out of 634 rows, the golden holds`

#### ⚠ W1 re-planned in place (2026-09-10)

**`strangerStem` moved from W2 to W1, because W1 is what breaks it.**
`RecognitionLogic.strangerStem` read `getShortDescription()` **raw** and
prepended the article itself. The moment the article left the field, it
returned `"weaver"` where it had returned `"a weaver"` — for every
stranger in the game, in W1, with W2 still two commits away. A wave has
to be independently landable, so D3's stranger view lands here: the
function is now one line, `target.presentationPhrase('stranger').render()`.

⭐ That is the argument for the collapse, arriving on its own: the two
ladders were the same ladder maintained by hand in two places, and the
first change that touched one of them broke the other.

**Also in W1 and not in the plan's file list:**

- `Organization.getPresentation` and `Field.getPresentation` become
  `presentationPhrase` overrides returning `NounPhrase.proper(name)` —
  planned, but worth naming what it buys: both now render the
  possessive and the definite form correctly, which neither could do
  while overriding a finished string.
- `Coin.getPluralForm`'s docstring **loses its reason to exist**. It was
  written to dodge *"4 a red apples"* — a stack rendering the article
  inside the description. `NounPhrase.render()` drops the article at any
  count but 1, so the override survives only for the honest reason
  (`piece` pluralizes irregularly). A test pins the old wart.
- `lint:presentation` clause (a) now also walks every pack's `src/*.yaml`
  by text. `dorm-themes.yaml` holds **28 authored descriptions** that
  reach `setShortDescription` and is not a template row, so
  `contentRows()` never saw it; an article creeping back there would
  render *"a a miner's dorm room"* with nothing to say so.
- The `--verify` golden gained a **`KNOWN_DELTAS`** table rather than a
  re-snapshot. Re-running `--snapshot` to make `--verify` green is how
  the proof gets lost; a row that is meant to change is named with the
  argument for why no player can tell, and the diff stays in the source.


#### ⚠⚠ Caught up to master mid-W1 — and master changed a convention

The branch was **90 commits behind** `origin/master`, which had landed 12
new articled `shortDescription`s. Merging *after* a 635-file content
sweep is the worst possible moment, so it was done as soon as W1 was
committed and pushed. Three conflicts, all small; ⭐ the sweep is
**idempotent** (it skips a row that already has a neighbouring
`register:`), so re-running it over the merged tree swept master's 12 new
rows and `--verify` came back green with *"12 row(s) added since the
golden"*.

**What master changed that this build had to adopt:**

| master's change | what it cost here |
|---|---|
| `Globbable` → `Stackable` (mixin + `MixinApi.isGlobbable`) | one call site in `Stuff.presentationPhrase`, one test import |
| a new `trade-medicine` pack | `pnpm install` — the stale-`node_modules` symptom that reads like a repo defect |
| 6 new lint gates (30 → 36) | ⚠ one of them **failed**: see below |

⭐⭐ **`lint:drive-scripts` retired the drive-script shape entirely.**
Master's wire-tests build (MR!251) moved every drive into
`packages/wire/tests/<feature>.wire.test.ts` behind a shared harness, and
gates the old shape at a ceiling of **0** — it deleted
`drive-cooking`, `drive-food-safety`, `drive-identity`, `drive-logistics`
and `drive-textiles` on its way past. W0's `drive-presentation.ts` was
therefore obsolete the moment the merge landed.

**Decided:** master's convention wins — it is newer, it is gated, and a
wire test is strictly better than a script because *it keeps running*.
So the drive splits in two:

- **The checkpoints** become `packages/wire/tests/presentation.wire.test.ts`,
  written against the harness (`Session`, `declareFile`, `plain`), and
  extended wave by wave — it must be green at every wave, so W1 ships the
  steps W1 can prove and W4 adds the chat ones. ⭐ Its three
  `look <instrument>` assertions are the `getLong` regression pinned in
  the only tier that could ever have seen it.
- **The transcript** stays a build-cycle instrument and moves to the
  **scratchpad** (`transcript.mjs`), uncommitted, beside the golden. It
  is a before/after diff of what five rooms *say*, not a test, and
  `lint:drive-scripts` is right that it does not belong in
  `packages/server/scripts/`.

#### The W1 transcript diff, read honestly

`before.json` (pre-sweep) vs `after.json` (post-sweep) over 65
renderings in five rooms. Four groups of difference, and **only one was
this build**:

1. ⚠⚠ **Duncan Hall's instruments — a real regression, and the only
   instrument that could see it.** `look altimeter` rendered *"a brass
   altimeter"* in its identity tag and **"brass altimeter"** in its body.
   `Visible.getLong()` falls back to the short description when nobody
   wrote a long one, and it handed back the RAW field. Fixed; pinned in
   `NounPhrase.test.ts` and in the wire file.

   ⚠ **Correction to my own account of this.** I wrote three times that
   *"no unit test asserted the fallback."* **There was one** —
   `Visible.test.ts` → *"should fall back to shortDescription when
   longDescription is empty"*. It could not catch the bug because it
   asserted a **field round-trip**: it set `'A rusty sword'` and expected
   `'A rusty sword'` back, which is true of the raw field and says
   nothing about the prose. The honest lesson is narrower and more
   useful than the one I first drew: ⭐ **a test that feeds a value in
   and asserts the same value out cannot see a rendering change.** The
   rewritten assertion sets a stem and expects an article.
2. **Dave's Bar** — extra ambient lines in one run and not the other.
   Confirmed **timing noise**: it varies run-to-run on identical code
   (the bartender's brain ticks).
3. **The Terminus registry** — Odile read `someone` before and by her
   description after. ⭐ Confirmed **not this build**: `someone` is
   `RecognitionLogic.obscured`, reached only when `canSeeGate` fails —
   a light/visibility gate this build does not touch. The companion
   difference (`look city` finding nothing in the same run) is exactly
   what an unperceivable target produces, since an organism's keywords
   derive from `describeCore`. A day/night-shaped variable between two
   runs 50 real minutes (≈10 game hours) apart.
4. **Nothing else.** The other 61 renderings are byte-identical.

⚠ **A transcript diff is a noisy instrument and that is worth writing
down**: two of its four findings were the world moving, not the code.
It is still the only thing that found (1).

### W2 — the form axis on the seam; the occupant block unified; `Mml.list` lazy

**Goal.** A reference states its form; the four faces collapse to one;
the rich forms survive a broadcast. D3 (stranger view), D4, D5, D6.

**Files.**
- `mud/api/mml.ts` — the `ref` payload (`form`, `attrs`); `actor` /
  `thing` / `location` / `player` / `npc` take `opts`; `toString`
  resolves `describeFor(viewer, form)`, emits `attrs`, and omits
  `stuff-id` for `form === 'handle'`; `Mml.list` builds a lazy payload;
  `Mml.actor`'s docstring drops the *"server-side disambiguation walks
  bodies …"* sentence (the naming slate records it as unbuilt) and
  gains the form table. `api/__tests__/mml*.test.ts`: the form matrix
  with a recognizing viewer, a stranger, a masked target and no viewer;
  `Mml.list` resolves per viewer; `actor` still absent from `KNOWN_TAGS`.
- `mud/lib/stuff/Stuff.ts` — `describeFor(viewer | undefined, form)`;
  delete `describeWithStatusFor`, `salientFeatures`; `RecognitionFace`
  reshaped; `perceivedKeywordsFor` unchanged.
- `mud/platform/idea/api/RecognitionLogic.ts` — `describe(viewer,
  target, form)` over a `describeCore` that returns the phrase for the
  stranger branch (`target.presentationPhrase('stranger')`), decorates
  for `presence`, widens for `distinguishing`, and short-circuits
  `bare`/`handle`/`formal` before the perception gates
  (`bare`/`handle`: no gate at all); delete `strangerStem`,
  `salientFeaturesImpl`, `describeWithStatusImpl`; `mostNotableWorn`
  stays. `__tests__/RecognitionLogic*.test.ts`: every form × (recognized
  / stranger / masked / unseen); `distinguishing` tokens still resolve
  `look vest`.
- `mud/platform/idea/api/SocialLogic.ts` — `nameMml` →
  `Mml.actor(occ, { form: 'presence', color })`; `wornFeatureOf` →
  `describeFor(undefined, 'distinguishing')`; the eager-viewer comments
  rewritten to say what is still eager (the rule) and why.
- `mud/platform/idea/cmd/perception/LookController.ts:264` — the
  fallback path renders `presence`; `SenseController`, the surface /
  container / search lists are untouched in code (they become
  viewer-aware through `Mml.list`).
- `mud/platform/idea/api/ProfileLogic.ts:198-215` — the recognized name
  surface stays field-shaped (the card wants the parts); the card header
  may use `formal` — **no**: the header is `concise` today and stays so
  (invisibility). Leave; record `formal`'s first consumer as the profile
  in § Deferred seams.
- `docs/subsystems/belief.md` and `messaging.md` — deferred to W5.

**Acceptance.** `lint:family` green; the explicit test set green; the
drive transcript identical to `before.json` **except** where D5 applies
(none expected in the five rooms — if a diff appears, it must be a
`sense`/`search`/surface line naming a disguised or unrecognized
person; anything else is a defect). Step 7 of the drive (emote in a room
of four) shows each recipient their own naming.

**Commit.** `build(presentation W2): a reference states its form — six forms on one seam, the occupant block late-bound, Mml.list lazy`



#### W2 as built (2026-09-10)

Done. `describeFor(viewer | undefined, form)` is the single face;
`describeWithStatusFor` and `salientFeatures` are gone, and
`RecognitionFace` is four methods instead of six.

- ⚠ **The no-viewer branch is not "no decoration."** My first cut sent
  every viewer-less call to the baseline, which silently stopped the
  room's similarity grouping finding *"12 dwarves in red robes"* — the
  old `salientFeaturesOf(target)` took **only a target**, so
  `distinguishing` with no viewer is exactly what it was. What a
  viewer-less call lacks is **recognition**, not decoration: the object
  can still say what it is wearing and what it is doing.
  `viewerlessForm` says so.
- `Mml.list` is lazy. The seven leaking sites (`sense`, `search`,
  on-surface, in-container) close by construction — no site was edited.
- `nameMml` drops its hand-built markup and becomes
  `Mml.actor(occ, { form: 'presence', color })`. The `color` attribute
  was the stated reason it could not use `Mml.actor`; it is an ordinary
  argument now. ⭐ What stays eager is the **rule** (boost/hide/group),
  because that is an attention decision, not a name — conflating the two
  is what forced every rich surface to give up per-recipient naming.
- `LookController`'s fallback path renders `presence` too, so both paths
  show the same form (AC5).
- `handlePhrase()` lands here with the two rungs that exist today
  (species, description stem). W3 adds the authored-keyword rung and W4
  the Position rung — each wave independently landable, and the W2 test
  says out loud which rung it is asserting.
- ⚠ A test's **fake recognition face** had to be rewritten to the new
  shape. That is the right kind of breakage: a stub is a mirror of an
  interface, and it broke exactly where the interface changed.
- `Mml.actor`'s docstring loses its claim that *"server-side
  disambiguation walks bodies … to pick the minimal-distinguishing form
  per recipient."* It does not and never did; the naming slate owns it.

### W3 — the hosts: Named off Creature, Perceptible onto it

**Goal.** Proper-name surface only where a proper name can be; the 48
authored agent handles go live. D7; the carried W1.

**Files.**
- `mud/lib/creature/Creature.ts` — drop `NamedMixin(` (`:166`) and its
  import (`:21`); add `PerceptibleMixin(` inside `VisibleMixin(`
  (`:142`) with its import; rewrite the header and the stack comment.
- `mud/lib/npc/Cast.ts` — `SingletonMixin(NamedMixin(Base))`,
  `interface Cast extends Named`, a *what it carries* paragraph.
- `mud/platform/agent/Avatar.ts:173` — `NamedMixin(ShelledCharacter)`
  innermost, with the comment from the carried plan.
- `trade-ranching/src/agent/Livestock.ts:54`, `WorkingAnimal.ts:52` —
  drop `PerceptibleMixin(`.
- `mud/lib/description/Perceptible.ts` — `getAuthoredPrimaryKeyword()`.
- `mud/lib/character/Character.ts:22` header; `mud/lib/description/Named.ts`
  docstring (composed by `CastMixin` and `Avatar`; never a base; a named
  animal or artefact composes it on its own class; rule 6).
- `newbie-wilds/…/agent/sellsword.yaml:31-35` — delete `alternateNames`
  (carried D7).
- Test fixtures — every file in the carried census whose fixture
  extends `Character`/`NPC`/`Creature`/`ShelledCharacter` and calls the
  name surface composes `NamedMixin` on the fixture. Find the true set
  by running the explicit directories, not by pre-editing.
- `mud/lib/creature/__tests__/Creature.test.ts:31` — `isNamed(creature)
  === false`, `isPerceptible(creature) === true`; `Cast`/`Crafter`/`Avatar`
  named; `Extra`/`Corpse`/`Mercenary` not.
- `mud/lib/npc/__tests__/` — a `Cast` row with `name:` hydrates; an
  `Extra` row with `name:` hydrates nothing; an `Extra` row with
  `primaryKeyword: wolf` now answers `getAuthoredPrimaryKeyword() ===
  'wolf'`.
- `mud/lib/description/__tests__/Perceptible.test.ts` — a `Visible`-only
  host still folds description tokens (carried).
- `docs/plans/pets-plan.md:133, :394-403` — the one-line hand-off (a
  plan is a living document): `Named` is not on `Creature`;
  `Perceptible` is; `KeptAnimal` = `…SensorMixin(NamedMixin(Creature))`.

**Acceptance.** `lint:family` green — rule 6 passes **only because** of
the sellsword edit (restore the block temporarily: it must fail); the
explicit test set + pack suites green; enroll → reconnect round-trips
the name through `holder_snapshots` (the link that would fail silently
with a "Welcome, ." banner); the drive transcript identical to
`before.json` (D5 excepted).

**Commit.** `build(presentation W3): NamedMixin off Creature — on CastMixin and Avatar; PerceptibleMixin on Creature — 48 authored handles go live`



#### W3 as built (2026-09-10)

Done. `Creature` composes `Perceptible` and not `Named`; `CastMixin` and
`Avatar` compose `Named` explicitly.

- ⚠ **The fixture blast radius was 5 files, not the ~35–40 the carried
  grounding predicted** — and only 20 tests. The reason is the other
  half of the move: `Avatar` gaining `NamedMixin` fixed every
  `setName`-on-an-Avatar site at a stroke (18 of the 19 files `tsc`
  first flagged), and most creature-derived fixtures never name
  anything. The four that did were all eaters in `cmd/bulk`, which name
  their subject to read the scene line.
- ⚠ **Correction to my own W0 finding:** I predicted rule 6 would fire on
  **two** rows. It fires on one. The `duelist` is on
  `/platform/agent/Cast`, which composes `NamedMixin`, so its block is
  *held* — still mis-shaped, still dead, but part of the 60-block finding
  rather than a W3 blocker. **Rule 6 checks REACH, not shape.** The
  plan's single deletion was right.
- ⚠ `CastMixin` **drops its `implements Cast` clause.** `Cast` extends
  `Named` now, whose members arrive from the base chain, and a
  class-factory mixin's `implements` cannot see through a generic
  `Base`. `MixinApi.isCast` (`obj is Stuff & Cast`) is what threads the
  contract, and it is what every caller narrows through.
- `Livestock`'s header is rewritten rather than deleted: it had
  **diagnosed the symptom correctly and treated it locally**, and the
  argument it made ("a person is addressed by their NAME, an animal by
  what it is") is the premise that turned out to be wrong. 48 agent rows
  were in the same void. ⭐ That is the mixin-slate lesson in one class:
  *a fix that needs a local re-composition usually means the host is
  wrong one level up.*
- `handlePhrase()` gains rung 1, `getAuthoredPrimaryKeyword()` — the raw
  slot, never `getPrimaryKeyword()`, whose derived fallback is the
  trailing pool token (`other`, for the weaver).
- Docs corrected at their source: `Named.ts` (who composes it, and that
  it is never a base), `Thing.ts` (its rule is now true of the agent
  branch too), `Character.ts` (no name surface), and **`pets-plan.md`,
  whose `KeptAnimal` composition was wrong in both directions.**

### W4 — the handle chain, and chat anonymity

**Goal.** The only new behaviour, behind a setting that defaults to
today. D8, D9.

**Files.**
- `mud/lib/employment/Position.ts` — `noun?: string` on `PositionData`
  and the class; `of`/`fromData`/`serialize`; `__tests__/Position.test.ts`
  round-trip (absent stays absent).
- `mud/lib/employment/Employed.ts` — `getPositionNoun()`; interface;
  `__tests__/Employed.test.ts`: noun follows the active employment; null
  when unemployed or the position has no noun.
- `mud/lib/stuff/Stuff.ts` — `handlePhrase()` (D8 chain);
  `describeFor(_, 'handle' | 'bare')` reaches it through the face.
- `mud/lib/social/Channel.ts` — `anonymity` field, `permitsAnonymity()`;
  `packages/server/src/schema/channels.yaml` purpose sentence.
- `mud/platform/idea/api/PackLogic.ts:1911` — pass `anonymity` from the
  subject row (`f.anonymity`, validated to the two values) into
  `ensureSurface`; the subject contribution's reader gains the key;
  `docs/subsystems/content-packs.md` subject kind table gains it.
- `mud/platform/idea/ChannelCatalogue.ts` — `postToChannel(speaker,
  channel, body, opts?: { anonymous?: boolean })` per the D9 table; the
  history line uses `speaker.describeFor(undefined, form)`; anonymous
  payload omits `speaker`; `setAnonymity(channel, value)` owner-gated
  the way `rename` is. `mud/api/chat.ts` + `ChatLogic.ts` forward the
  option; `SubjectSubscriber.postToChannel` gains it.
- `platform/content/platform/cmd/social/chat.yaml` — top-level
  `options: anon: { type: boolean, field: anon, description: … }`;
  subcommand `anonymity` (`args: name, setting`) with help text; the
  verb's help gains two lines.
- `mud/platform/idea/cmd/social/ChatController.ts` — `anon` on the
  model; `executePost` refuses `--anon` on a forbidden or ad-hoc channel
  with `ctx.note({ kind: 'controller-rejected', reason: 'anonymity-forbidden' })`;
  `executeAnonymity` (owner-gated). `__tests__/ChatController.test.ts`:
  the four rows of the D9 table + the two refusals; a masked speaker on
  a forbidden channel is named; the anonymous frame carries no
  `stuff-id` and no `payload.speaker`.
- Content: `noun:` on every shipped Position whose key is a plain noun
  (lounge `bartender`, the rejection/haulage/textile/goodkin rows…);
  none on `vionne`/`veshko`/`hollis`/`goodkin`/`chief-executive`/`hand`
  unless the author's judgment supplies one (`hand` → `hand` is fine).
  `platform/content/subjects/*.yaml` gain nothing (default).
- `docs/subsystems/employment.md:65` Position line; `chat.md`'s channel
  fields (W5 does the prose).

**Acceptance.** `lint:family` green (`lint:arg-kinds` sees no object
slot; `lint:presentation` clause (c)); the explicit set green; drive
steps 9–14 pass (a named channel names a hooded speaker; an anonymous
weaver is *a weaver*; a new NPC in a job with a `noun` is *a baker*,
follows the job, and an authored handle never moves); steps 1–8 still
identical to `before.json`.

**Commit.** `build(presentation W4): the handle chain (primaryKeyword → Position.noun → species), and chat anonymity as a channel setting`



#### W4 as built (2026-09-10)

Done. The handle chain has all four rungs; chat anonymity ships behind a
default that reproduces today.

- ⭐ **The plan's pushback was right, and the content proved it.** Every
  one of the ~40 shipped `Position.label`s is a gerund or a phrase —
  *"tending bar"*, *"on the road"*, *"running Hollis"*, *"sitting as
  Magistrate of Terminus"* — with **no exceptions**. There is no honest
  transform from any of them to a noun.
- ⚠ **But the plan was wrong about the keys.** It predicted firm-name
  keys (`vionne`, `veshko`, `hollis`) would have to go without a noun.
  Those are **labels**, not keys. The actual key census is 31 distinct
  values and **every one is a plain noun a holder is called** —
  `bartender`, `clerk`, `smelterman`, `onsetter`, `warehouseman`,
  `press-secretary`. So `noun: <key>` was authorable on **all 46**
  shipped positions rather than the subset the plan expected.
- `getPositionNoun()` reads the first **active** employment, not on-shift:
  a bartender walking home is still a bartender.
- `anonymity` on `Channel`, default `permitted`, plus
  `chat anonymity <name> permit|forbid` (owner-gated the way `disband`
  is) and a top-level `--anon`. ⚠ `anonymity` is added to
  `RESERVED_NAMES` — the bare post is a fallthrough, so an unreserved
  subcommand silently steals a channel name somebody could already hold.
  The list gained a docstring saying so.
- ⚠ An anonymous post **omits the speaker ref entirely** rather than
  blanking it. A `StuffRef` carries a `stuffId`, and a client holding one
  can ask the world about it — the rendered line is not the only place a
  name can leak.
- Ad-hoc (DM-group) threads refuse `--anon`: a cohort you were added to
  **by name** has no anonymity to grant.

### W5 — docs, the drive record, the suite, the MR

**Goal.** The subsystem docs say the new truth; the drive is run and
recorded; one full suite; push; MR.

**Files.**
- `docs/subsystems/presentation.md` (new) — the noun phrase, the
  register, the six forms and who wants them, the handle chain, the
  golden's method, `lint:presentation`; the CLAUDE.md map line is left
  to the sweep (worktree rule 5).
- `docs/subsystems/messaging.md § The identity tags` and `§ MML` — the
  form on the ref; `Mml.list` lazy; `handle` carries no id.
- `docs/subsystems/belief.md § The compose seam`, `§ Disguise`,
  `§ StatusMixin` — one face, six forms; the two deleted methods.
- `docs/subsystems/identity.md:41` rung table (proper name: structural),
  `:248` gate table (rule 2 on `register`; rule 6), `:262` cast table.
- `docs/subsystems/chat.md` — `anonymity`, the D9 table, `--anon`, the
  subcommand. `docs/subsystems/card-surface.md:1092-1130` — the
  identity-tag paragraph names the current four tags and the id-less
  handle. `docs/subsystems/race.md:721`, `mixins.md:378`,
  `employment.md:65`, `content-packs.md` (subject kind).
- This plan — the W0 gate deltas and the drive record.

**The drive.** Fresh dev DB, booted server, `pnpm -C packages/server
exec tsx scripts/drive-presentation.ts` (all 14 steps) and
`--transcript after.json`, diffed against `before.json`. Then, and only
then, `pnpm test` once; push; MR against `master`.

**Commits.** `docs(presentation): the phrase, the form, the handle — presentation.md + seven docs` then `drive(presentation): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| the register renders | none new — every emitter through `getPresentation`/`Mml.ref` | n/a | `register:` on 634 rows through `Visible.fieldMeta` | rows clone exactly as today |
| a form on a ref | none new — `look` (presence), targeting (distinguishing), chat (bare/handle) | n/a | none | the recognition face is registered by `installFrameworkWiring` as today; **a bare harness falls back to the phrase, per form** |
| a Cast's name | `say`/`emote`/`introduce`/`look` | n/a | the 30 rows' `name:` through `Named.fieldMeta` on `CastMixin` | as today |
| a player's name | `enroll`, `player name` | Avatar's own contributions | the enroll overlay + `holder_snapshots` through `fieldMeta` on `Avatar` | as today — the round trip is the fails-closed check |
| an agent's handle | `look <keyword>` (click), `chat --anon` | n/a | the 48 rows' `primaryKeyword:` through `Perceptible.fieldMeta` on `Creature` | as today |
| the role rung | `chat --anon` | n/a | `noun:` on a Business's `positions[]` (organization rows) | the organization must be live (`StuffApi.findByTemplatePath`) — it is, for any roster that materialized an Employment |
| chat anonymity | `chat <ch> --anon <msg>` · `chat anonymity <ch> permit\|forbid` | the `chat` verb's view (already afforded to every implant holder) | `Channel.anonymity` (default `permitted`); a seeded subject's `anonymity:` | seeded channels are (re)installed by the pack installer; an existing row without the field reads the default |
| rule 6 · `lint:presentation` | `pnpm lint:family` | derived roster | every pack's rows | CI's manual `gate` job — somebody clicks ▶ |

Fails-closed checks the build must actually run: (1) the enroll →
reconnect name round trip after W3; (2) an `--anon` post's frame on the
wire carries no `stuff-id` and no `payload.speaker` (read the raw frame
in the drive, not the rendered line); (3) `lint:identity` rule 2 after
W1 — author `register: definite` on an Extra fixture row and watch it
fail (the regex form would have passed it).

---

## Acceptance-criteria coverage

| AC | satisfied by |
|---|---|
| 1 — a player cannot tell | W0 golden + W1 `--verify` (634 rows) + the drive transcript diff at W1/W2/W3/W4; D5 is the one recorded exception and is bounded to disguised/unrecognized persons in `sense`/`search`/surface lists |
| 2 — refer, target, act by the old words | D7 (targeting stays recognition-derived; `Perceptible` adds words to no organism), W3's keyword tests, drive step 3 |
| 3 — every named NPC still named everywhere | D7 + W3's Cast hydration test + pack suites + drive step 4 |
| 4 — disguised as disguised, stranger as stranger | D3 (the stranger view skips exactly the rungs it skips today) + W2's form × masked/stranger matrix + drive steps 5–6 |
| 5 — the room survey shows what occupants are doing, the same for one recipient or many | D4/D5/D6 + W2's `Mml.list` per-viewer test + drive step 7 |
| 6 — named on a no-anonymity channel | D9 `forbidden`+plain → `bare`; W4 controller test; drive step 9 |
| 7 — anonymous = a short handle, never a portrait | D8 handle chain (authored `primaryKeyword` first — the weaver is *a weaver*); W4 test; drive step 10 |
| 8 — named on a named channel while disguised | `bare` consults no gate (D4); W4 masked-speaker test; drive step 11 |
| 9 — an author writes a stem + register and gets *a*, *the*, the possessive, the plural | D1 `NounPhrase` + W1 render-matrix test; `GrammarApi.article` via the phrase |
| 10 — a role-filler cannot be given a surname | structural after W3 (`Extra` has no `setSurname`); rule 6 refuses the row |
| 11 — a job-derived handle follows the job | D8 rung 2 + W4 `getPositionNoun` test + drive steps 12–13 |
| 12 — an authored handle is never overridden | D8 rung 1 is `getAuthoredPrimaryKeyword` + W4 test + drive step 14 |
| 13 — no NPC acquires prose nobody wrote | the handle chain derives a **noun** only; `presentationPhrase` derives a species noun only; no code path writes `shortDescription` except the corpse overlay, which is today's text; `lint:presentation` (a) + the golden |

Nothing unmapped. ⚠ AC1 and D5 are in tension by exactly the seven
listed sites; the user should price that (§ Risks 1).

---

## Test & gate strategy

- **Unit:** `NounPhrase` render matrix; `Stuff.presentation` chain;
  `mml` form matrix + lazy list + `actor`-absent; `RecognitionLogic`
  forms × viewer states; `Creature`/`Cast`/`Extra`/`Avatar` composition
  assertions; `Perceptible` authored-vs-derived; `Position`/`Employed`
  noun; `Channel`/`ChatController` D9 table; `check-identity` and
  `check-presentation` pure decisions.
- **Only the drive can prove:** the rendered world is unchanged
  (transcript diff), targeting by description (step 3), the name round
  trip (step 8), the anonymous frame's wire shape (step 10), the hooded
  speaker on a named channel (step 11), the job-follows-the-model pair
  (12–14).
- ⭐ **The meaningful near-set.** `test:near` selects by file proximity
  and this change touches `Stuff.ts`, `mml.ts`, `grammar.ts`, `Visible.ts`,
  `Named.ts`, `Perceptible.ts`, `Creature.ts`, `Cast.ts`, `Avatar.ts`,
  `RecognitionLogic.ts`, `SocialLogic.ts`, `LookController.ts`,
  `Channel.ts`, `ChannelCatalogue.ts`, `ChatController.ts`,
  `Position.ts`, `Employed.ts`, `ConditionLogic.ts`, `Coin.ts` — so it
  will run their sibling `__tests__/` and **miss every emitter test that
  asserts a rendered string** and every fixture that sets a name.
  After each of W1–W4 run explicitly: `pnpm -C packages/server exec
  vitest run src/mud/api src/mud/lib/stuff src/mud/lib/description
  src/mud/lib/message src/mud/lib/disguise src/mud/lib/identification
  src/mud/lib/belief src/mud/lib/npc src/mud/lib/creature
  src/mud/lib/character src/mud/lib/employment src/mud/lib/social
  src/mud/platform/agent src/mud/platform/idea/api
  src/mud/platform/idea/cmd/perception src/mud/platform/idea/cmd/social
  src/mud/platform/idea/cmd/charactergen src/mud/platform/thing
  src/mud/__tests__ scripts/__tests__`, plus after W3 the carried
  fixture directories (`lib/vitals lib/metabolism lib/slot lib/equipment
  lib/magic lib/respiration lib/hazard lib/concealment lib/encumbrance
  world/substation world/hearthworks`), plus **every pack with a
  `src/`** (`pnpm -C packages/content/<pack> test` for arcana, tpa,
  trade-ranching, trade-mining, trade-farming, trade-cooking, transport,
  terminus, eternal-university, saxonberg-lounge, hearthworks,
  newbie-wilds, rejection, trade-haulage, and any other the list at
  `scripts/pack-roots.ts packSources()` reports).
- **Lint family** after every wave.
- ⚠ `pnpm test` runs **twice**: after W5's drive, before the MR; and at
  `/finalize`. Not between waves, not because W3 is wide.

---

## Risks & opens

1. **D5 is a visible change for a narrow case.** `Mml.list` lazy stops
   `sense`/`search`/surface/container lists leaking a hooded or
   unrecognized person's true name. It is a fix to the documented
   contract and it is required by AC5's mechanism; the requirements'
   "nothing observable" did not know the leak existed. The user should
   confirm this reading or ask for the guarded alternative.
2. **D8 rewords a requirements sentence.** "Nobody typed that" becomes
   "nobody typed it on the NPC" — the noun is authored once on the
   Position. If the user wants the role rung to cost literally nothing,
   the honest options are a `noun` derived from `Position.key` (rejected:
   `vionne`) or dropping the rung; there is no gerund transform.
3. **D9's default keeps a disguise live on a permitted channel.** Byte-
   identical to today, and the requirements only decided the forbidden
   case. A one-line follow-up (`permitted`+plain → `bare`) is a visible
   change and waits for a build that may make one.
4. **Fixtures fail at runtime, not compile time** (carried) — W3's
   explicit directories, not `test:near`.
5. **The resolver fix changes gate results** (carried) — record the
   before/after counts in W0.
6. **The species rung joins the viewer-blind chain** — a fixture with
   no name and no description that asserts `'something'` for an
   organism will now read the species (or `'something'` still, if the
   fixture has no species). Bounded to tests; the golden covers content.
7. **Hydration order for `register`** — `Visible.fieldMeta` order puts
   `register` after `illustration`; nothing reads it in a setter, so
   order is immaterial. `PersistableMixin` capture/restore walks
   `fieldMeta` and round-trips it for an Avatar (the Avatar seed has no
   description; harmless).
8. **A `Channel` row minted before this build** has no `anonymity` and
   hydrates the default — correct, no migration.
9. **Stale `blueprints` rows** (carried D6) — drop the dev DB, never
   migrate.
10. Nothing here should stop the build. The three forks the
    requirements left open are decided as D2 (where the field lives),
    D8 (the noun) and D9 (the default's third case) and are flagged for
    the user's eye in the handoff, not held for sign-off.

### W0 gate deltas *(filled in by the build, 2026-09-10)*

- **`lint:identity`** before / after the resolver change: **0 findings /
  0 findings**, and the `--report` roster is **byte-identical**. Every
  shipped `Cast` class names `CastMixin` inline in its own `extends`, so
  the const-stack blindness was never changing this gate's answer — it
  was a latent hole, not a live miss. It matters from W3 on, where rule 6
  walks `NamedMixin` reach and **every** organism class reaches it
  through a const base.
- **`lint:dossiers`** before / after: **0 / 0**, same reason (it shares
  the resolver).
- **The resolver's own before/after**, which is the real delta:
  `composesMixin('/lib/creature/Creature', 'NamedMixin')` answered **no**
  and now answers **yes**; so did `Character`→`EmployedMixin`,
  `Avatar`→`NamedMixin`, `Creature`→`VisibleMixin`. ⚠ It was answering
  **no to every question asked of a const-stacked class** — which is
  every deep stack in the tree.
- **`lint:presentation` ceiling recorded: 611**, not the 612 the plan
  predicted — see the finding below.

### ⚠ W0 findings

**1 — a capitalized article is part of a name, and one row proves it.**
The round-trip audit (strip the article, record the register, re-render,
compare) ran over all 635 authored strings and found **exactly one** that
would change: `hearthworks/…/location/offstage.yaml`,
`"The Hearthworks — Back room"`. Read case-insensitively that is a
definite article over the stem `"Hearthworks — Back room"`, and the sweep
would have re-rendered it **decapitalized** — a venue's proper name
quietly lowercased. So `LEADING_ARTICLE` matches **lowercase only**, that
row is `proper`, and the ceiling is 611 rather than 612. ⭐ With the rule
fixed the audit reports **0 of 635 strings change**, which is the
build's central claim established mechanically before a single row moved.

**2 — ⚠⚠ all 60 `alternateNames:` blocks in the content are dead.** Found
by rule 6's `--report`. There is exactly one `alternateNames` declaration
in the tree (`Named.fieldMeta`), typed `AlternateName[]` =
`{ kind, value }[]`:

| | rows |
|---|---|
| class composes `NamedMixin` (the field exists) | 25 |
| class does **not** (27 `SingletonCartesianLocation`, 4 `FurnishableRoom`, 2 `CartesianLocation`, 2 water things) — key discarded whole | 35 |
| authored as `{kind, value}` | **0** |
| authored as plain strings → hydrates to `[{kind: undefined, value: undefined}]` | **60** |

Every author clearly meant *alternate keywords for targeting*
(`[road, crest, top]`, `[barkeep, bartender]`, `[odile, clerk,
magistrate]`) — which is `Perceptible.keywords`, a different field.
**Not fixed here, deliberately:** converting them to `keywords:` would
*add* targeting words, and AC1 forbids a visible change. Recorded to
§ Deferred seams. ⚠ **Correction (W3):** I predicted rule 6 would fire on **two** rows,
the `duelist` as well as the `sellsword`. It fires on one — the duelist
is on `/platform/agent/Cast`, which composes `NamedMixin`, so its block
is *held* (and still mis-shaped, and still dead: it is one of the 60).
Rule 6 checks REACH, not shape. The plan's single deletion was right.

**3 — the drive's job steps use the drive's OWN player, not a minted
NPC.** The requirements' steps 12–13 say *"place a new NPC into a job"*,
which needs `clone` and therefore a wizard — and every drive in this tree
is an ordinary player on purpose (`drive-cooking`: *"no wizard, no
`clone`, no `startLocation` trickery beyond the seat"*). A player's own
body is the honest instrument here and a **better** one: an Avatar has no
authored `primaryKeyword` at all, so the derivation chain is exercised
without anyone conveniently leaving a field blank. Same rungs, same
assertion, no authoring powers.

---

## W6 — keywords are authored (added 2026-09-11, at the user's direction)

Not in the plan. Raised in review of !255, and the census settled it
before any argument did.

### The finding

| | |
|---|---|
| rows that author a `shortDescription` | 646 |
| **rows that already author `keywords` by hand** | **568 (88%)** |
| rows that author `autoDeriveKeywords: false` | **0** |

⭐ **Derivation was saving authors nothing** — they were already writing
the keywords — while what it produced was junk. A tailor described as
*"tailor with pins down one cuff and a tape round her neck"* answered to
`look with`, `look and`, `look her` and `look neck`. The `other` that
made `getAuthoredPrimaryKeyword()` necessary came from exactly this.

### The rule

> **Keywords are authored. `primaryKeyword` is `keywords[0]` unless an
> author pins one.**

- `Perceptible.keywords` returns `_keywords` verbatim. The name/description
  folding is gone; `autoDeriveKeywords` is gone with it (**zero** users).
- `getAuthoredPrimaryKeyword()` **deleted**. With one value there is
  nothing to disambiguate — and ⭐ the anonymity leak becomes
  *unrepresentable* rather than guarded: a player authors no keywords, so
  the handle chain's first rung is simply empty.
- `lint:presentation` gains clause (d): a pinned `primaryKeyword` must be
  in that row's own `keywords`, because a click sends `look <that word>`.

### The sweep — 770 rows

⭐ **`primaryKeyword` changed on 0 of 756 rows.** Each swept list leads
with *today's* `getPrimaryKeyword()` answer, so every click sends exactly
what it sent before. 182 targeting words dropped, **all function words
but one** (`&`): `of` ×137, `in` ×13, `with` ×7.

⚠ **`look super` failed today.** `tokenizeName` split on whitespace
alone, so *"live-in super, keys jangling at her belt"* put **`super,`** —
comma included — in the pool. The clean token was never there; the sweep
strips punctuation, so those rows *gained* the word they should have had.

### ⚠⚠ The host finding, again

Clause (d) fired on **16 rows across 6 room classes** the day it existed.
`Location` does **not** compose `Perceptible` (only `CartesianLocation`
does), so `FurnishableRoom`, `Bar`, `Lounge`, `Offstage`, `DormRoom` and
`Corridor` all missed it — and **every single `FurnishableRoom` row
authors keyword fields.** Same shape as W3's 48 agent rows, fixed the
same way. ⭐ The root observation — a room class built directly on
`Location` has to *remember* — belongs to the mixin slate.

### Seven runtime writers had to start saying it

A thing minted in code has no row to author keywords in, and used to get
them free from its description: the coat-check ticket, three crafting
lumps, the keys, the cast lump, and `Coin` — whose description is
**computed from its denomination**, so no author could ever have written
them.

### ⚠ My sweep had five bugs, and every one was caught by a gate

Worth recording, because the pattern is that *I* was not the check:

1. `rstrip("'s")` mangled plurals — `keys` → `key`.
2. A token with a comma broke the YAML flow list.
3. It rewrote a **nested** `keywords:` inside a detail block — matching
   any indentation instead of the `data:` level. That broke a file, and
   then the census **silently skipped** it (`catch { continue }`), so one
   row escaped the sweep entirely.
4. A bare `no` (from *"with no floor"*) parsed as **boolean false** —
   `keyword.toLowerCase is not a function`, eleven tests deep in the
   Sunken Delve.
5. Quoting it fixed that and broke possessives: `'blacksmith's'` is
   unterminated YAML. Double quotes.

### The value-object ruling

⭐⭐ **`NounPhrase` lost every static.** `GrammarApi.phrase()` /
`properPhrase()` / `articleFor()` / `isRegister()` own construction now.

The reason is mechanical, not stylistic: the author-surface projection
admits **public Api statics** and **public instance methods**, and a
static on a non-Api class is neither — so `NounPhrase.proper()` was
*callable by anyone and visible to nobody*, which the governing
invariant `callable == visible == cared-about` forbids outright.

⚠ **24 other value classes still break it** (`Money.of`, `Position.of`,
`Position.fromData`…) →
[value-object-statics-slate](../slates/tails/value-object-statics-slate.md).

### ⚠ And a gate I was not running

Two ESLint errors sat in `NounPhrase.ts` for the whole build — free
exported functions in `lib/`, which `no-restricted-syntax` refuses. **I
ran `lint:family` after every wave and never ran `pnpm lint`**, and the
export-discipline rule is an ESLint rule, not a `lint:*` gate. The
family cannot see it. ⭐ Same shape as *"a gate that reports and exits 0
is a gate you have not run"*, one step sideways: **a rule that is not in
the family you run is a rule you are not running.**

## Deferred seams

- **Minimal-distinguishing rendering** → [naming-slate.md](../slates/tails/naming-slate.md):
  `bare` is the form that needs it; the seam is `describeFor(viewer,
  'bare')` and its one caller. The `Mml.actor` docstring's claim is
  removed in W2.
- **A `mass` register** (`sodden peat ground`, `wet flagstones`, marked
  `proper` by the sweep) → the mixin slate; the vocabulary is closed at
  three until a third row wants *"some flagstones"*.
- **`permitted`+plain on a channel still consults the disguise** (D9)
  → one line in `postToChannel` when a visible change is allowed.
- ⚠ **A seeded subject's `anonymity:` — deferred, and NOT merely for
  scope.** D9 said the installer should pass it through. It is not wired,
  because `PackLogic`'s `ensureSurface` applies its `mint()` closure
  **only when the row is new** (an existing row gets `archived`, `name`
  and `description` and nothing else). So an authored `anonymity:` would
  be a **one-time default that silently diverges from the YAML forever
  after**: edit the row, reinstall, nothing happens. That is a worse
  authoring surface than none, and *"does the row or the owner win on
  reinstall?"* is a real question the requirements did not decide. ⭐ The
  attach point is the `mint()` at `PackLogic.ts:1939` plus the matching
  field on `renderSubjectRow`'s preimage — both, or reconcile sees a
  permanent diff. Nothing shipped wants a non-default value today, and
  `chat anonymity` is the player-facing path the requirements actually
  specify.
- **17 agent rows' `keywords:` hydrate but are not consulted by organism
  targeting** (D7) → the naming slate (unioning them is a targeting-word
  gain and an identity-leak question — `keywords: [odile]` on a stranger).
- **`formal`'s first consumer** — the profile card header stays
  `concise`; the `formal` form ships reachable and unused until a
  document surface wants it (press, contracts).
- **`wornFeatureOf` parses a string** (D6) — the honest read is a
  `mostNotableWorn` face on the object; left because it is the shipped
  seam and nothing observable rides it.
- **The two proper-register agent stems that contain the name** (`Odo
  the cook`, `Odile, the city registrar`) leak the name to a stranger
  today and after → the naming slate; the fix is content (`the cook`,
  `the city registrar`), not this build's.
- **Pets** — `KeptAnimal` = `…SensorMixin(NamedMixin(Creature))` (no
  `PerceptibleMixin(`; it arrives from `Creature`); the cat row authors
  `shortDescription: thin cat` + `register: indefinite`; the `name` verb's
  collision read is `MixinApi.isCast(x) && x.getName()`; pets D10's
  `isPersona` narrowing sits inside the `concise` branch and composes
  with the forms unchanged; `pets-plan.md:133` and `:394-403` are
  corrected in W3.
- **The general silent-discard gate** (carried) — *every authored
  `data:` key must be a field some composed class declares* — the mixin
  slate; this build closes the `primaryKeyword`-on-agents instance by
  composition, not by a gate. ⭐ W0 gave that gate its census: **60 dead
  `alternateNames:` blocks** (see § W0 findings 2), 35 of them on classes
  with no such field at all. They are authored *keywords*, and the fix is
  to move them to `keywords:` — a targeting-word gain, so it waits for a
  build that is allowed to change what a player can type.

---

## Critical files

Read first, in this order:

1. `docs/requirements/presentation-requirements.md`
2. `packages/server/src/mud/api/mml.ts` (`:200-330`, `:726-748`, `:940-995`)
3. `packages/server/src/mud/lib/stuff/Stuff.ts` (`:60-80`, `:120-150`, `:200-340`)
4. `packages/server/src/mud/platform/idea/api/RecognitionLogic.ts` (`:60-90`, `:220-420`, `:441-510`)
5. `packages/server/src/mud/platform/idea/api/SocialLogic.ts` (`:470-610`)
6. `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts` (`:150-275`)
7. `packages/server/src/mud/lib/description/{Visible,Perceptible,Named}.ts`
8. `packages/server/src/mud/lib/creature/Creature.ts` (`:19-45`, `:130-190`), `lib/npc/Cast.ts`, `platform/agent/Avatar.ts` (`:155-185`)
9. `packages/server/src/mud/api/grammar.ts`
10. `packages/server/src/mud/platform/idea/ChannelCatalogue.ts` (`:296-375`, `:470-610`), `lib/social/Channel.ts`, `platform/idea/cmd/social/ChatController.ts`, `packages/content/platform/content/platform/cmd/social/chat.yaml`, `platform/idea/api/PackLogic.ts` (`:1895-1925`)
11. `packages/server/src/mud/lib/employment/{Position,Employed}.ts`
12. `packages/server/src/mud/platform/thing/Coin.ts` (`:170-200`), `lib/banking/Currency.ts` (`:216-228`), the three arcana `Mana*.ts` and `tpa/src/thing/TpaTerminal.ts` overrides, `platform/idea/api/ConditionLogic.ts` (`:560-620`)
13. `packages/server/scripts/{check-identity,pack-roots,check-field-meta,drive-identity}.ts`
14. `packages/client/src/components/MmlRenderer.tsx` (`:120-175`, `:600-620`), `packages/client/src/lib/templates/chatTemplate.tsx`
15. `docs/subsystems/{messaging,belief,identity,chat,card-surface,employment}.md`, `docs/plans/named-rung-plan.md § Grounding` (carried facts), `docs/plans/pets-plan.md` (`:380-430`)

---

## Drive record

**Run 2026-09-10** against a freshly reset world (`saxonberg_build2`),
packs reinstalled from the checkout.

### The wire file — 13/13

`packages/wire/tests/presentation.wire.test.ts`, attached to the live
world on 2010. All four rows of the D9 anonymity table, the three
`look <instrument>` assertions that pin the `getLong` regression, the
targeting checks, and the ad-hoc refusal.

### ⚠⚠ The transcript diff found TWO more, and both were mine

65 renderings in five rooms, against the pre-sweep baseline. Ten keys
differed. **Four were noise** of the kind § W1 already documented (NPC
brain ticks; a `look <ambiguous>` prompt firing in one run and not the
other; an extra drive character standing in two rooms). **Two were
real**, and they are the same defect seen twice:

| where | was | became |
|---|---|---|
| the Terminus registry, room item list | `the deed desk` | `something` |
| Duncan Hall, `look <super>` → `── In it:` | `a householder's kit` and `a heavy ring of master keys` | `something` and `something` |

⭐⭐ **D5's blast radius was wider than D5 priced it.** Making `Mml.list`
lazy was scoped in the plan to *"a disguised or unrecognized **person**"*.
But an item list resolved late also starts consulting the **vision
gate**, and the gate disagrees with the surface that built the list:

- `LookController` already filters its contents through
  **`PerceptionApi.perceives(actor, item)`**. Everything in the list has
  been judged perceivable.
- `describeFor` then asks **`VisionModality.canSee`**, which reads the
  light band at the target's container. In an unlit interior that fails,
  and the item renders `obscured` → **`something`**.
- Worse for a container: `canSee` walks up **one** level, so the contents
  of an NPC's own inventory land on the NPC — who carries no light — and
  every one of them reads `something`.

⚠ *Every object reading "something"* is the documented tell for exactly
this ([unlit interiors are pitch black]). The room's prose read in full
while its furniture was anonymous — incoherent, and a visible change the
acceptance bar forbids.

**Fixed by refusing the second gate**, not by reverting D5: `look`'s two
item lists resolve **now**, viewer-blind, which is what they always did.
They are `toSelf` renders for one known viewer whose perception was
already resolved, and an inert thing has no recognition for late binding
to add. D5's real fix — a person you have never met no longer named by
`sense`, `search`, a surface or a container — is untouched.

⭐ **The two gates disagreeing is a genuine finding and is NOT settled
here.** `PerceptionApi.perceives` and `VisionModality.canSee` answer
differently about the same object, and `canSee`'s one-level walk cannot
see into a creature's inventory at all. → the perception/naming slate.

### What the drive cost, honestly

It found **three** defects the 10,041-test kernel suite could not: the
`getLong` fallback (W1) and these two. All three are *rendering* bugs,
and the suite's blind spot is the same in each case — it asserts fields
and envelopes, and the prose is assembled downstream of everything it
checks.
