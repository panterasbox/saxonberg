# `which` — implementation plan

Builds the shell verb `which` — *what can I type here, and what gives me
each verb* — its terminal reply, its live card, and the retirement of
`query`'s relation listing. Executes
[which-requirements](../requirements/which-requirements.md), seeded by
[command-line-reflection-slate](../slates/engine/command-line-reflection-slate.md).
**Kind:** feature (server command + its card). **Leads from:** the
kernel; no content is added to any world. Paths below are relative to
`packages/server/src/mud/` unless they start `packages/` or `docs/`.

⚠ **Four places where planning found the requirements wrong or
underspecified are in § Risks & opens (O1–O4).** The plan picks a default
for each so the build can run; the owner should read them before `/build`.

## Grounding

Verified by opening the files, 2026-11-23, on `design/2026-11-23-reflection`.

**The stack, and what the line accepts**

- `lib/command/CommandGiver.ts:452` `RecencyEntry { source, bucket,
  commands, seq }`; `:678` `_commandStack`; `:726` `getAffordances()` —
  every `(command, source, bucket)` on the stack, `'self'` resolved to
  the giver; `:748` `matchAffordances(parsed)` — the verb filter the
  dispatcher uses (`_runChain`, `:1451`): **a verb is accepted iff some
  entry of `getAffordances()` has it**; otherwise the emote fallback,
  then `unknown-verb` (`:1564`, worded `I don't understand '<verb>'.` at
  `:118`).
- The stack is mutated only by three sealed methods (`:859`
  `pushCommandSource`, `:886` `popCommandSource`, `:900`
  `resetCommandSources`), driven by
  `platform/idea/api/CommandLogic.ts` `applyContainmentDeltaImpl`
  (`:4522`), `applyShadowDeltaImpl` (`:4688`), `applyHostedAppDeltaImpl`
  (`:4762`).
- ⚠ **The stack is not perception-gated.** A concealed or unlit thing's
  `peers` contributions are pushed like any other; the dispatcher
  accepts their verbs. Only `source::verb` gates
  (`CommandGiver.ts:780`, `PerceptionApi.perceived`).
- ⚠ **Almost everything is a source.** `lib/material/Tangible.ts:211`
  contributes `throw` (three shapes) and `lib/material/Integrity.ts:201`
  contributes `ring`, both in `environment` and `peers` — so every good
  and every body in the room affords them. A source-per-group listing
  names every object present (O2).
- **`source::verb` already names a source**: `matchAffordances`
  resolves the scope with `MqlApi.resolveMany(…, { scope: '~reachable' })`
  then `PerceptionApi.perceived(giver, stuff, ordinal)` (`:771–780`),
  and `affordsFrom` (`:249`) pairs an affordance with a named source.
- **The client push is dead.** `CommandLogic.emitSchemaDelta` (`:2374`)
  only ever sends `reset` (its one caller, `CommandGiver.ts:928`, on
  first connection); `packages/client/src/services/websocket.ts:257`
  reads `shell.control` only for `control:clear`. Nothing consumes
  `control:schema`. Tests: `api/__tests__/command-schema-delivery.test.ts`.
- **The radial read**: `CommandLogic.ts:2543` `resolveAffordancesImpl`
  (perception gate, identification gate, per-verb `evaluateAffordance`
  at `:2650`, which runs the view's validators with the target bound to
  the verb's first object positional and returns the validator's own
  words). `AffordanceEntry` (`packages/types/src/index.ts:2167`) carries
  `verb · description · state · reason · category`; `description` is the
  view's `description:`, which is also help's `summary`
  (docs/subsystems/help.md:72).
- **A verb nothing affords has no words of its own.** The doc comment at
  `api/command.ts:1355–1368` (*the parser floor*) describes a view field
  that does not exist; `fish` with no rod is `unknown-verb` (O1).
  `CommandApi.allDefinitions()` (`api/command.ts:1594`) is the loaded
  catalogue.

**Shapes and slots**

- A chain stops at the first view whose object slot resolves to nothing
  (`CommandGiver.ts:1691`) and at an enum mismatch (a bind error,
  `CommandLogic.ts:3004`); only a *shape* error, an unknown subcommand on
  a non-last view, or a field validator's refusal falls to the next view
  (`:1594–1624`, `:1717`). So "a thing, else a verb" cannot be two
  shapes.
- `fallthrough: true` lets `args:` and `subcommands:` coexist
  (`lib/command/command.schema.json:109`); `help.yaml`
  (`packages/content/platform/content/platform/cmd/system/help.yaml`) is
  the exemplar. `type: enum` + `values:` exists (command-spec.md § `type:
  enum`).
- Shell verbs' views: `packages/content/platform/content/platform/cmd/shell/`
  (`client-card.yaml`, `settings.yaml`, `alias.yaml`). `help` is afforded
  by `lib/character/Avatar.ts:289` (`self`).

**Relations**

- `api/mql/relations.ts` — the built-in table (`name · meaning · whose ·
  members`), sealed in `api/mql/**`. `api/mql/parser.ts:357` parses
  `:~` to `{ kind: 'relations' }`; `api/mql/resolver.ts:959`
  `listRelations`; `relations?` on `MqlOne`/`MqlMany`
  (`api/mql/types.ts:190,219`, `RelationInfo` `:356`) and through
  `platform/idea/api/MqlLogic.ts:123–158`.
- `CommandLogic.ts:1772–1795` (the `lists: relations` slot) and `:2071`
  (options) raise `names-relations`; the key is in
  `command.schema.json:379`, `api/command.ts:953`,
  `packages/server/scripts/check-view-keys.ts:108`; the row is
  `packages/content/platform/content/reasons/names-relations.yaml`;
  `platform/idea/cmd/perception/QueryController.ts:79–99` prints the
  listing; `query.yaml` documents `me:~` / `book:~`;
  `docs/mql-grammar.md:54,89,198`.
- `lib/relation/Relating.ts` — `relationsFor(asker)`, `relatedBy(name,
  asker)` (owner-gated by each contributor, e.g.
  `lib/social/Contacts.ts:268`).
- `MqlApi` is `resolveOne` + `resolveMany` (`api/mql.ts:97,110`) and
  stays that.

**Naming a thing**

- `lib/stuff/Stuff.ts:445` `handlePhrase()`; `describeFor(viewer,
  form)`; `Perceptible.getPrimaryKeyword()`.
- `lib/slot/Carrying.ts:426` `tierOf(thing)` → `hand · ready · packed ·
  elsewhere`. `lib/spatial/Containable.ts:521` `getPlacement()` →
  `{ host, name }`. `lib/augmentation/AetherHosted` `getHost()`.
- ⚠ **No surface says where a thing is in a viewer's words.** `i` prints
  `In hand: …` with no hand named (`QueryController.ts:427`). Three
  private copies turn a body-site path into words
  (`lib/combat/CombatNarration.ts:763`, `TreatController`,
  `platform/idea/reading/CleanlinessReading.ts:154`) — about wound
  sites, not slots.

**Cards and subscriptions**

- `lib/connection/Cards.ts:55` `CardSource` (`mql · payload · client ·
  prompt`); the `CARDS` rows; `CardId` / `CARD_IDS`
  (`packages/types/src/index.ts:1100–1160`); `CardPayload` (`:1350`).
- `platform/idea/CardRegistry.ts:1197` `wantsLive` — live only for
  `kind: 'mql'`; `:1205` `subscribe` (the card's `instanceId` is the
  subscription id, opened silently); `:1253` `syncLive`; `:385`
  `singleton` reuse by key; `:1474` `resolveInto` (a payload card takes
  `opts.payload`). `CardApi.open(context, cardId, opts)`
  (`api/card.ts:101`), gated by the view's `opens_card:`.
- `platform/idea/WhereaboutsSource.ts` — the shape of a non-MQL source:
  per-holder subscriptions, a watch set over `FieldChangedEvent`, a dirty
  set, one `ScheduleApi.schedule(0, …)` flush per beat, `sub.noteCause()`
  at the mark, `pokeSubscriptions(holder, hint)`. Its row:
  `packages/content/platform/content/platform/idea/WhereaboutsSource.yaml`;
  its path in `SUBSCRIPTION_SOURCES` (`packages/types/src/index.ts:2752`).
- Client: card bodies in `packages/client/src/components/cards/`
  (`CardBodies.tsx` dispatches payload kinds; own-file bodies:
  `InspectionBody.tsx`, `StreamControls.tsx`, `TerminalCardBody.tsx`);
  deltas reach cards in `useCardFeed.ts:231`; the command line's text is
  the store's `setDraft(slot, text)`
  (`packages/client/src/store/index.ts:1727`, read by `CommandBar.tsx`).
  An MML `mudcmd:` link **dispatches** (`MmlRenderer.tsx:171`) — it is
  not click-to-type.

**The testbed** (`packages/content/test-fixtures/`,
`packages/wire/src/harness/scaffold.ts`)

- SHOP: `thing/counter.yaml` is `/trade/shopkeeping/thing/Stock`
  (`packages/content/trade-shopkeeping/src/thing/Stock.ts:23` — `buy`,
  `shelf`, `sell` in `peers` and `environment`), stocking
  `/platform/thing/book` and `/platform/thing/rope`; a consignment
  shelf, a hearth, a lamp.
- The notebook is `platform/thing/Book.ts:92` —
  `Tearable(Combustible(Thermal(Reserved(Assembled(Crafted(Durable(Marked(Good))))))))`.
  It has no `commandContributions` of its own; what it gives a carrier is
  whatever those mixins put in `environment` (at least `throw`, `ring`).
  **W0 lists them exactly.**
- The trap (`thing/trap.yaml`, `/platform/thing/Trap` =
  `HazardMixin(Good)`, `concealment: subtle`) is in the **PASSAGE**
  (unlit, off the cellar), not the yard. It gives no verb other things do
  not also give.
- The hall's `thing/tablet.yaml` is `/platform/thing/Tablet`
  (`DisplayMixin(Good)`) — a screen, not an app host. No phone row exists
  in the platform pack or the testbed (`Phone` rows:
  `packages/content/generic-objects/content/stuff/thing/gear/hollis-pal.yaml`,
  `aevex-meridian.yaml`).
- Apps on master: `packages/content/platform/content/platform/idea/app/`
  (`calendar · forums · messages · wallet`). An app's `self` verbs reach
  its host only when the host is a command giver
  (`CommandLogic.ts:4767`) — i.e. the person's own host
  (`lib/character/Avatar.ts` composes `AetherHostMixin`). A **phone's**
  apps bring nothing to its carrier on master; the phone itself gives
  `apps` (`lib/augmentation/AetherHost.ts:131`, `environment`).

## ⭐⭐ New substrate

| # | item | ledger row / genuinely new |
|---|---|---|
| N1 | `CommandApi.which(viewer, ask)` → `WhichAnswer`, over `CommandLogic` | ledger rows 1 + 2: reads `getAffordances()`; shares the gates and `evaluateAffordance` with `resolveAffordances`. One static beside its sibling, not a new Api |
| N2 | `WhichAnswer` / `WhichGroup` / `WhichSource` wire types (`@saxonberg/types`); a group's verbs are `AffordanceEntry` | row 2 — the entry type is reused; the grouping is new |
| N3 | `Containable.whereFor(viewer)` and `AetherHosted.whereFor(viewer)` | row 3 — *new wording, not new substrate*: one method, two implementers. Searched: `Carrying`, `Slotted`, `Containable`, `Placement`, `Stuff.describeFor`, the ledger printer — none says where a thing is in a viewer's words |
| N4 | `Slotted.slotWord(slot)` | genuinely new, small: the hand's words. Searched `SlotSpec` (no label), the three private site-word copies (wound sites, left alone, not grown) |
| N5 | `lib/relation/BuiltinRelations.ts` — the built-in `~` words' `name · meaning · whose`, moved out of `api/mql/relations.ts` | row 6 — the same table, moved so something outside the sealed MQL directory can read it; MQL keeps `members`, typed against it |
| N6 | `WhichSource` (`platform/idea/WhichSource.ts`, a `SubscriptionSourceMixin(Idea)` + its row + `SUBSCRIPTION_SOURCES.which`) | subscription.md: *a new kind of state is a new SOURCE*. Genuinely new instance of a shipped pattern |
| N7 | card id `which`; `CardPayload` kind `which`; `subscription?:` on the `payload` card source; `params?` on `CardOpenOptions` | generalizes `CardRegistry.wantsLive`/`subscribe` from MQL-only to any source — the one registry, no second path |
| N8 | views `which.yaml`, `which-of.yaml`; `WhichController`, `WhichRelationsController` | row 8 — the shell-view shape |
| N9 | reason rows `no-such-verb`, `nothing-gives-verb`, `gives-nothing`, `keeps-nothing` | row 7's mechanism (reason rows); the four sentences are new |
| N10 | client `WhichBody.tsx` | client convention: a body with its own interaction gets its own file |

**Retired in the same build:** `emitSchemaDelta` / `getCommandSchemaPayload` /
`_commandSchemaSubscribed` / `CommandSchemaPayload` (D10); the `:~`
grammar element, `listRelations`, `RelationInfo`, `relations` on both MQL
results, the `lists:` view key, `names-relations` (W4).

**No new** mixin, Api, logic singleton, hook, registry, document kind,
collection or module category.

## Plan-level decisions

**D1 — One read: `which` is `getAffordances()` filtered by the binder's
perception gate.** `CommandApi.which` walks `viewer.getAffordances()` —
the list `matchAffordances` filters for the dispatcher — and keeps an
entry when its source is the viewer, is hosted on the viewer, or passes
`PerceptionApi.perceived` (and, for an identifiable thing, the
identification gate `resolveAffordancesImpl` already applies). No second
list exists to drift. Not the recency stack read raw (it has no states
and no gate); not `resolveAffordances` per source (it re-evaluates every
actor verb per source). *Lens 1: the answer is true or it teaches a
falsehood.* The residue is O3.

**D2 — States come from `evaluateAffordance`, unchanged.** Each listed
`(verb, group)` is evaluated once, against the group's first-named
source, bound as the radial binds it (the verb's first object
positional); a source that is the viewer binds nothing. The reason is the
validator's own sentence. `resolveAffordancesImpl`'s two gates are lifted
into one module-private function both reads call.

**D3 — Groups are keyed by verb set** (closes Q3 and O2). Sources that
give the same set of verbs are one group, named together; alike sources
(same handle, same place words) are counted (*3 notebooks on the shelf*).
Groups are ordered by their rarest verb — fewest sources in this answer
first — so *buy, sell, shelf — the counter here* leads and *throw, ring —
the shelf, the hearth, the lamp, …* trails. No hand list, no threshold.
The terminal reply names at most four sources per group and counts the
rest; the card shows all. *Lens 1 chose: the rare cause is the lesson.*

**D4 — "The usual" is the `'self'` entry.** The verbs whose source is
the giver itself with bucket `self` — what the body's own class and
mixins contribute (`CommandApi.collectSelfDefs`). It is the last line
(*and the usual: look, say, go, … (you)*). A hosted app on the person is
its own source (bucket `self`, source the app), so it is its own group.
A verb the body has is never repeated under another source.

**D5 — The source's words are built by the thing.** `WhichSource`
(type) is `{ id, handle, name, place }`: `handle` =
`getPrimaryKeyword()`; `name` = `describeFor(viewer, 'concise')` made
definite; `place` = `whereFor(viewer)`:

| where it is | `place` | reads as |
|---|---|---|
| the viewer | — | *you* |
| in a hand slot of the viewer | `in your <slotWord>` | *the rod in your right hand* |
| worn by the viewer | `you're wearing` | *the coat you're wearing* |
| otherwise on the viewer (`ready`, `packed`) | `you're carrying` | *the notebook you're carrying* |
| placed on a host in the viewer's place | `<placement word> the <host handle>` | *the notebook on the shelf* |
| loose, or fixed, in the viewer's place | `here` | *the counter here* |
| the viewer's place itself | `where you are` | *the shop, where you are* |
| one passable exit away | `nearby` | *the bell nearby* |
| an app hosted on the viewer | — (possessive) | *your calendar* |
| an app hosted on a device | `on your <device handle>` / `on the <device handle> <device place>` | *the broadcast app on your phone* |

A shadow names its host's words. `Containable.whereFor` asks the viewer
(`MixinApi.isCarrying` → `tierOf`; `isSlotted` → the slot →
`slotWord`); it never reads another mixin's fields. The card's one-column
form is `handle` alone.

**D6 — One view takes a word; the model decides thing-or-verb.**
`which.yaml`: `fallthrough: true`, `args: [{ name: what, type: string,
required: false }]`, `subcommands: { "~": {} }`. `which` · `which
counter` · `which fish` · `which ~`. `CommandApi.which` reads `what`
exactly as `source::verb` reads its scope (the resolve + `perceived`
lines of `matchAffordances`, lifted into one private method both use):
**a perceived thing in reach wins; a word that names nothing in reach is
read as a verb.** `help which` says so in those words (P9). A
shape-per-kind is impossible (Grounding § Shapes). Every thing the word
names is answered, each told apart by its place words — no prompt, no
keyword list.

**D7 — `which <thing> ~` is a second shape.** `which-of.yaml`: `args:
[{ name: thing, type: object, required: true, scope: ["~reachable"] },
{ name: relations, type: enum, values: ["~"], required: true }]`,
contributed **before** `which.yaml`. `which counter` is a shape error
there (a missing second word) and falls to `which.yaml`; `which ~` the
same. The requirements' spelling is kept (O4 records the alternative).

**D8 — The `~` listing is the model's, and counts only kept sets.**
`which ~` = every word in `BuiltinRelations` (all apply to the asker) +
`me.relationsFor(me)`; `which <thing> ~` = `thing.relationsFor(me)`
only (a counter *keeps nothing*). The count (*3 in the world*) is
`relatedBy(name, me)` members — resident ones, the holder's own gate. A
built-in shows its meaning and no count: its members are MQL's, and
`MqlApi` gains no third function. (Narrowing recorded in O4.)

**D9 — The live card is a payload card with a subscription.** Card
`which`: `{ source: { kind: 'payload', producer: 'which', subscription:
SUBSCRIPTION_SOURCES.which }, live: true, pinnedByDefault: false,
singleton: true, command: 'which' }`. The controller hands the card the
`WhichAnswer` it rendered the reply from, plus `params` (the ask) when
the answer can be kept current. `wantsLive` becomes *the kind is live,
the source can subscribe (MQL, or a payload with `subscription` and
`params`), and the player placed, pinned or roled it* — so a card that
flows past is a snapshot with a `takenAt`, and pinning it subscribes.
Key = the normalized command, so `which`, `which counter` and `which ~`
are three cards, each reused when re-asked. `which ~` passes no `params`
and is always a snapshot (a friend arriving is not something this source
hears). Not the `here` role (that is a place card rebinding); not a
client-opened subscription (the client never decides liveness).

**D10 — `WhichSource` wakes on the stack and on what the answer named;
the dead schema push goes.** The three sealed stack methods poke
`SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, giver)` — guarded by
the same first-connection flag the schema push used, renamed
`_hasSession`. The source also watches `FieldChangedEvent` on the body,
its place and every source on the stack (a lamp lit, a thing found, a
purse filled). One flush per beat per holder; a `replace` per changed
group key, a `remove` per vanished one; `sub.noteCause()` at the mark so
the card's ChangeMark names the command. `which <thing>` subscriptions
carry the subject ids and re-check perception every flush.
`emitSchemaDelta`, `getCommandSchemaPayload` and their test are deleted:
the owner's call was *reuse it or toss it*, and nothing reads it.

**D11 — A verb you cannot use here.** `which <verb>`, three cases, in
order: afforded here → its group(s), with the state and the validator's
own reason, then *`help <verb>` has its shape*; in the catalogue
(`CommandApi.allDefinitions()`) but afforded by nothing perceived →
`nothing-gives-verb`; not a verb → `no-such-verb`. See O1.

**D12 — Clicks.** A verb cell calls the store's `setDraft` on the
primary terminal's bar with `<verb> ` and focuses it — nothing is sent. A
source cell sends the command `which #<id>` (a typed, visible command;
`which` never acts), which opens that key's card. The `help` link sends
`help <verb>`.

**D13 — `which` is afforded by `Avatar.self`,** beside `help`
(`lib/character/Avatar.ts:289`): a player's shell verb. No alias.

## ⭐⭐ Host placement

| item | host | what composing it claims | P2 |
|---|---|---|---|
| `whereFor(viewer)` | `ContainableMixin` | every containable thing is somewhere a viewer can say | yes for every host — a thing is always in a hand, on a body, on a host, in a place or elsewhere (`''`) |
| `whereFor(viewer)` | `AetherHostedMixin` | every app sits on a host | yes — an app cannot exist unhosted |
| `slotWord(slot)` | `SlottedMixin` | every slotted host can word a slot | yes — a rack's peg and a hand are both named slots |
| `which` (the read) | `CommandApi`/`CommandLogic`, over any `CommandGiver` | any giver can be asked | yes — the stack exists on every giver |
| the `which` verb | `Avatar` `self` | every player body has it | yes; NPCs do not need it |
| the stack poke | `CommandGiverMixin`'s three sealed methods | every giver may poke | the guard is *has a session*, which is the giver's own fact, not a re-narrowing of the host |
| `WhichSource` | a singleton `Idea` | — | n/a |

No guard re-narrows a host. No field is added to any class; nothing
persists.

## Convention conformance

Checked 2026-11-23 against CLAUDE.md and the docs named.

- `props:`/`cast:`, places-not-rooms, the five axes: the build adds no
  place and no world row. The testbed gains one `props:` entry (W5).
- Paths: views at `platform/cmd/shell/`, controllers at
  `/platform/idea/cmd/shell/`, the source at `/platform/idea/WhichSource`
  with its row, reason rows at `packages/content/platform/content/reasons/`.
- Module scope: declarations only. Import boundary: `lib/relation/` may
  not import `api/mql/**`; the move in N5 runs the other way.
- Verbs on objects: `whereFor`, `slotWord` are methods; `CommandApi.which`
  orchestrates the validator chain, as `resolveAffordances` does.
- One view, one word: two views, one word `which`, no alias;
  `verb target` (`which counter`) and `verb subcommand` (`which ~`).
- **P3** — empty answers are refusals with rows (N9); an unresolvable
  source is skipped; a card payload of the wrong kind throws (shipped).
- **P4** — no `?.()`; `whereFor` is reached through `MixinApi.isContainable`
  / `isAetherHosted`. No pack code.
- **P5** — the controllers render a `WhichAnswer`; every decision (gate,
  grouping, order, thing-or-verb) is in `CommandLogic`.
- **P6** — nothing persists. **P7** — nothing boots: the source stands on
  first subscribe; the catalogue is already loaded.
- **P8** — `which` (the common shell word); `WhichSource` follows
  `WhereaboutsSource`.
- **P9–P14, per item:**

| item | P9 | P10 | P11 | P12 | P13 | P14 |
|---|---|---|---|---|---|---|
| N1 `CommandApi.which` | help states both rules (D3 order, D6 thing-first) | n/a | the source words itself; no caller branches | not `resolveAffordances` — that asks what can be done *to* a target | CommandLogic's affordance section | reads only |
| N2 wire types | n/a | wire shapes, not metadata | n/a | group entries reuse `AffordanceEntry` | n/a | n/a |
| N3 `whereFor` | its words are the reply | n/a | two typed implementers; the composer asks the thing | no existing call says it | Containable: *where it sits*; AetherHosted: *its host* | reads only |
| N4 `slotWord` | n/a | n/a | n/a | the three private copies word wound sites | Slotted owns slot names | reads only |
| N5 `BuiltinRelations` | `which ~` prints it | reserved grammar words, each bound to code and owner-vetted — not a row a pack could add | n/a | the same table, moved | lib/relation | n/a |
| N6 `WhichSource` | the card says what changed it (ChangeMark) | n/a | n/a | a source, per subscription.md | n/a | pushes only what it recomputed |
| N7 card + `subscription` | pin = live, as every card | n/a | `subscribe` branches on the SOURCE kind it owns, in one place | one registry | Cards.ts | liveness only by the player's act |
| N8 views | the views ARE the def; no new view key | n/a | n/a | no synonym word | shell | never acts |
| N9 reason rows | worded in rows | rows | n/a | n/a | n/a | n/a |
| N10 `WhichBody` | a click types, never runs | n/a | n/a | n/a | n/a | sends only visible commands |

**Gates this build must pass:** `lint:view-keys` (the `lists` pin
removed), `lint:one-word`, `lint:verb-collisions`, `lint:command-views`,
`lint:self-contributions`, `lint:reason-rows`, `lint:controller-resolution`,
`lint:controller-decisions`, `lint:hand-matchers`, `lint:object-verbs`,
`lint:mixin-clusters`, `lint:mixin-files`, `lint:lib-statics`,
`lint:imports`, `lint:module-scope`, `lint:duck-typing`,
`lint:perceived-surfaces`, `lint:presentation`, `lint:schema`,
`lint:drive-scripts`, `lint:wire-content`, `lint:test-bootstrap`,
`lint:closed-vocabularies`. No ceiling rises; a gate that wants one is a
re-plan, not a number change.

## Waves

**W0 — probe.** No commit. In a standing test world: (a) list the verbs
a carried `/platform/thing/book` gives its carrier and a fresh avatar's
`self` verbs (a unit test over `getAffordances()` — keep it as W1's
fixture); (b) confirm a bare `~` tokenizes as a word and is a legal
subcommand key (`CommandLineApi`; if not, fix the tokenizer in W1 and say
so); (c) read the biped body plan's hand slot names; (d) confirm
`PerceptionApi.perceives(viewer, viewer)` and what it answers for a
hosted app; (e) confirm `fish.yaml` is in the test world's catalogue. Any
answer that contradicts this plan is re-planned in place before W1.

**W1 — the read and the words.** (D1–D6, D11)
- `packages/types/src/index.ts`: `WhichAnswer`, `WhichGroup`,
  `WhichSource`, `WhichAsk`.
- `lib/slot/Slotted.ts` `slotWord`; `lib/spatial/Containable.ts`
  `whereFor`; `lib/augmentation/AetherHosted.ts` `whereFor`.
- `lib/command/CommandGiver.ts`: lift the scope's resolve-and-perceive
  into a private method used by `matchAffordances` and exposed for the
  read (`@internal`-free: a public `namedSources(raw)` returning the
  perceived things or the note).
- `platform/idea/api/CommandLogic.ts`: the shared gate function;
  `which(viewer, ask)`; `api/command.ts`: the static.
- Tests (`__tests__` beside each): the equality test — the verbs of
  `which` with every source perceived equal the verbs
  `matchAffordances` accepts; a hidden source's verbs absent; an
  unidentified thing's verbs absent; grouping, order and counting; every
  row of D5's table; thing-first then verb; the three D11 cases.
- Acceptance: `pnpm test:near` green. Commit `feat(which): the read —
  what you can type and what gives it`.

**W2 — the verb.** (D6, D7, D8, D13)
- `lib/relation/BuiltinRelations.ts`; `api/mql/relations.ts` reads it
  (`Record<BuiltinRelationName, members>` — a missing word is a compile
  error).
- `packages/content/platform/content/platform/cmd/shell/which.yaml`,
  `which-of.yaml` (each `category: shell`, `opens_card: which`, help
  text stating D3's order and D6's rule); rows N9.
- `platform/idea/cmd/shell/WhichController.ts`,
  `WhichRelationsController.ts` + their template rows
  (`packages/content/platform/content/platform/idea/cmd/shell/`).
  `which.yaml`'s `~` subcommand and `which-of.yaml` both name
  `WhichRelationsController`.
- `lib/character/Avatar.ts` `self`: the two views, `which-of` first.
- The reply: one line per group — *buy, sell, shelf — the counter here*
  — a greyed verb followed by its reason on its own line; the usual line
  last; `which ~` one line per word, *~friends — <meaning> (3 in the
  world)*.
- Tests: controller tests over a staged body; `help which` renders.
- Acceptance: typed in a dev world, steps 1–7 read right. Commit
  `feat(which): the verb, and the ~ words`.

**W3 — the card.** (D9, D10, D12)
- `packages/types`: `CardId` + `CARD_IDS` `which`; `CardPayload` kind;
  `SUBSCRIPTION_SOURCES.which`; the source's params/snapshot/change
  types in `SubscriptionSources`.
- `lib/connection/Cards.ts`: `subscription?` on the payload source; the
  row. `platform/idea/CardRegistry.ts`: `params` on `CardOpenOptions`
  and `CardState`; `wantsLive`, `subscribe`, `syncLive`, `teardown` and
  the `card-touched` body for a payload card.
- `platform/idea/WhichSource.ts` + its row; the poke in
  `CommandGiver`'s three methods; delete the schema push (D10) and
  `api/__tests__/command-schema-delivery.test.ts`.
- Controllers call `CardApi.open(context, 'which', { payload, params })`.
- Client: `components/cards/WhichBody.tsx`, registered in
  `CardBodies.tsx`; `useCardFeed.ts` applies a result/delta to a `which`
  payload by group key; the widths — `unit`: verb · handle; `medium`:
  verb · name + place · state and reason; `full`: + description and the
  `help` link; the usual row collapsed; the `~` layout.
- Tests: `card-birth-path.test.ts` gains the mint site; a registry test
  that pin subscribes and unpin stamps `takenAt`; a source test that a
  move, a pick-up and a lamp lit each produce the right group changes
  **applied by the wire's own rule**; client body tests per width.
- Acceptance: steps 12–16 by hand. Commit `feat(which): the card`.

**W4 — the listing leaves MQL.** (requirements § The `~` listing leaves
`query`)
- `api/mql/parser.ts`: `:~` with no name is an `MqlParseError` —
  *`~` with no name lists nothing — `which ~` lists the ~ words you can
  type*; the head-of-query `~` error names `which ~` too. Remove the
  `relations` element, `listRelations`, `RelationInfo`, both result
  fields, the `MqlLogic` pass-through, both `CommandLogic` branches, the
  `lists` key (schema, `api/command.ts`, `check-view-keys.ts`),
  `names-relations.yaml`, `QueryController.relations`, and the `me:~` /
  `book:~` lines in `query.yaml`.
- B4: `grep -rn ':~\b\|lists: relations\|names-relations' packages docs`
  — every hit fixed or deliberate.
- Docs: `docs/mql-grammar.md`, `docs/subsystems/mql.md`.
- Tests updated in place (the D-B4 tests become the refusal's).
- Acceptance: `query me:~` and `look me:~` both answer with the hint.
  Commit `refactor(mql): the relation listing retires — which ~ has it`.

**W5 — drive, walk, docs.**
- Testbed: `packages/content/test-fixtures/content/world/testbed/thing/phone.yaml`
  (class `/platform/thing/Phone`), not placed anywhere — the drive stages
  it; `scaffold.ts` gains its constant.
- `packages/wire/tests/which.wire.test.ts` (steps 1–11),
  `e2e/tests/which-walk.spec.ts` (12–16). Each checkpoint failed once on
  purpose (B2).
- `docs/subsystems/command-routing.md` (the `which` read; the schema
  push retired), `card-surface.md` (the row; payload liveness),
  `subscription.md` (the source), `presentation.md` (`whereFor`),
  `help.md` (the borrowed line). Index lines are the sweep's.
- Full suite once, beside the MR. Commit `test(which): the drive and the
  walk`; the drive record appended below.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| `which` / `which <word>` / `which ~` | `which.yaml` | `Avatar.self` | the stack (live) | view installed with the platform pack | `what`: string; `~`: a subcommand |
| `which <thing> ~` | `which-of.yaml` | `Avatar.self`, listed first | `relationsFor` | same | `thing`: object, `~reachable`; `relations`: enum `[~]` |
| the card | `opens_card: which` on both views | `CardApi.open` in both controllers | the payload | `CARDS.which` | `card-birth-path.test.ts` |
| liveness | pin / place | `wantsLive` | `WhichSource` | the source's row; stood on first subscribe | `SubscriptionSourceMixin` check in the registry |
| the wake | — | the three stack methods + the watch set | `FieldChangedEvent` | — | `_hasSession` |
| the four sentences | — | `this.refuse` | the reason rows | `ReasonCatalogue.find` on use | `lint:reason-rows` |

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| every verb, its source in plain words, the usual on one line | W1, W2 |
| changes as they move and carry | W1 (a read of live state), W3 (pinned) |
| `which <thing>`, named by handle, two told apart | W1, W2 |
| `which ~`, `which <thing> ~`, a new list appears | W2 |
| unusable verb: one line + `help`; a non-verb is called one | W1, W2 — ⚠ O1 |
| nothing hidden appears | W1 |
| listed ⇔ accepted | W1's equality test — ⚠ O3 for the one-directional residue |
| `query me:~` points to `which ~` | W4 |
| the card: matches the reply, widens, follows when pinned, click types | W3, W5 |

## Test & gate strategy

- **Unit**: W1–W4 as listed. The equality test (D1) is the build's
  load-bearing test.
- **Drive** — all `instant`; no span step, so no staged twin and no soak
  drive. Blocking drive = steps 1–11 (wire) + 12–16 (walk).

| step | pace | note |
|---|---|---|
| 1–3, 5–7, 9, 11 | instant · player | as written |
| 4 | instant · player | asserts the W0 list of the notebook's verbs under *the notebook you're carrying* / *in your … hand*; on the shelf it joins the shelf's neighbors' group |
| 8 | instant · **staged** | the cellar and the trap are behind a locked door: the player is staged into the CELLAR, then the PASSAGE. Unlit: `which` names nothing there. Staged a lit lamp: the trap is still not named among the sources of `throw`; after `search` finds it, it is. (The requirements say *the yard*; the trap is in the passage.) |
| 10 | instant · staged | the testbed phone staged into the player's hand: `apps — the phone in your right hand`; and the player's own app: `calendar — your calendar`. The *app on your device* wording is unit-tested (W1); its end-to-end is stream-arrival's to check when the two meet |
| 12–16 | instant · player | Playwright, at three widths |

- **Staging tools**: the harness's existing teleport/stage and clone
  (`packages/wire/src/harness/`); none owed.
- `pnpm test` at code-complete and at `/finalize` only; between,
  `test:near` + the gates above.

## Risks & opens

- **O1 — a verb nothing here gives has no refusal words of its own.**
  The requirements' *you need something to fish with* does not exist:
  `fish` without a rod is `unknown-verb`, and the *parser floor* doc
  comment (`api/command.ts:1355`) describes a field that was never
  built. The plan answers *Nothing you have or can reach here lets you
  `fish` — `help fish` says what it is.* Saying **what** would give it
  needs either a new authored view key on every capability verb or a
  reverse search over classes (P7) — a requirements decision.
- **O2 — "grouped by source" meets `throw` and `ring` on everything.**
  D3 (groups keyed by verb set) is the plan's default. The owner may
  prefer a second closing line or hiding the commons.
- **O3 — the line accepts a verb whose only source is hidden.** The
  stack is not perception-gated, so `which` (gated) omits a verb the
  dispatcher still parses, and the dispatcher's different answer is
  itself a detector. AC 6 and AC 7's second half conflict there; the
  plan sides with AC 6. Gating the dispatcher changes what works in the
  dark for every verb in the game — a build of its own. The testbed
  cannot show the gap (the trap gives nothing distinctive).
- **O4 — `which <thing> ~` and the counts.** The spelling is kept (D7);
  the owner's syntax law reads `verb subcommand target` (`which ~
  book`), which one view could bind. Counts are shown for kept sets
  only (D8).
- **State is evaluated against one source per group** (D2), bound as the
  radial binds — a merged group can grey a verb one of its members would
  allow, and a verb whose first object slot is not what the source is
  (`fish`'s bait) is probed loosely. Inherited from the radial.
- **`CommandGiver.ts` is 2,137 lines**; `lint:mixin-clusters` may object
  to `namedSources`. It reads the same stack and scope as its neighbor;
  if the gate splits it, re-plan — do not raise the ceiling.
- **Crowds.** A read is O(perceived sources × their verbs) validator
  runs, on demand; a pinned card recomputes at most once per beat and
  costs nothing unshown (`subscription-pause`). Measure in the walk with
  the hall's three chairs and three notebooks; a room of fifty is the
  soak lane's to notice.
- **Stop and ask** if W0(b) shows `~` cannot be a subcommand key without
  a grammar change, or if W1's equality test cannot be made to pass
  without touching the dispatcher.

## Deferred seams

- The radial and typeahead reading `WhichAnswer` →
  command-line-reflection-slate § Left.
- Scripts asking whether a verb exists → scripting-hand-economy-slate.
- Card sizes beyond the three widths → card-sizes-slate.
- What would give an unafforded verb (O1), and gating the dispatcher by
  perception (O3) → new lines in command-line-reflection-slate at the
  sweep.
- One wording for body sites (the three private copies) → not this
  build; `slotWord` is where they could meet.

## Critical files

1. `docs/requirements/which-requirements.md`
2. `packages/server/src/mud/lib/command/CommandGiver.ts` (`:440–930`, `:1451–1760`)
3. `packages/server/src/mud/platform/idea/api/CommandLogic.ts` (`:2454–2790`, `:4365–4795`, `:1760–1800`)
4. `packages/server/src/mud/platform/idea/CardRegistry.ts` (`:360–470`, `:1190–1330`, `:1474`)
5. `packages/server/src/mud/platform/idea/WhereaboutsSource.ts`
6. `packages/server/src/mud/lib/connection/Cards.ts`
7. `packages/server/src/mud/api/mql/relations.ts`, `parser.ts:350`, `resolver.ts:925–980`
8. `packages/server/src/mud/lib/relation/Relating.ts`, `lib/slot/Carrying.ts:426`, `lib/spatial/Containable.ts:505–535`
9. `packages/content/platform/content/platform/cmd/system/help.yaml` (the `fallthrough` exemplar)
10. `packages/client/src/components/cards/CardBodies.tsx`, `useCardFeed.ts`, `StreamControls.tsx`
11. `packages/wire/src/harness/scaffold.ts`; `docs/testing.md`
12. `docs/subsystems/card-surface.md`, `subscription.md`, `command-routing.md`, `command-spec.md`

## Drive record

*(appended at build time)*
