# `which` — implementation plan

Builds the shell verb `which` — *what can I type here, and what gives me
each verb* — its terminal reply, its live card, and the retirement of
`query`'s relation listing. Executes
[which-requirements](../requirements/which-requirements.md), seeded by
[command-line-reflection-slate](../slates/engine/command-line-reflection-slate.md).
**Kind:** feature (server command + its card). **Leads from:** the
kernel; no content is added to any world. Paths below are relative to
`packages/server/src/mud/` unless they start `packages/` or `docs/`.

⭐ **Owner rulings, 2026-11-23** (on the first draft's four opens) are
recorded in § Owner rulings and are binding: R1 an unafforded verb gets
one plain line · R2 the build audits and fixes wrong verb affordances ·
R3 no dispatcher change · R4 `which ~ <thing>`, one view · R5 a source
click narrows the same card.

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
  names every object present (R2).
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
  that does not exist; `fish` with no rod is `unknown-verb` (R1).
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
| N8 | one view `which.yaml` (`fallthrough`, a `~` subcommand); `WhichController`, `WhichRelationsController` | row 8 — the shell-view shape; `help.yaml` is the exemplar |
| N9 | reason rows `no-such-verb`, `nothing-gives-verb`, `gives-nothing`, `keeps-nothing` | row 7's mechanism (reason rows); four plain sentences (R1) |
| N11 | the affordance audit's moves (W2) — contributions re-homed to the mixin or class that means them | no new substrate by intent: a move, never a guard. Any mixin the audit needs to split is added to this table with its P1 line before it is written (B1) |
| N10 | client `WhichBody.tsx` | client convention: a body with its own interaction gets its own file |

**Retired in the same build:** `emitSchemaDelta` / `getCommandSchemaPayload` /
`_commandSchemaSubscribed` / `CommandSchemaPayload` (D10); the `:~`
grammar element, `listRelations`, `RelationInfo`, `relations` on both MQL
results, the `lists:` view key, `names-relations` (W5).

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
falsehood.* Tested one way only (R3): every verb listed is accepted by
the line. The dispatcher is not touched.

**D2 — States come from `evaluateAffordance`, unchanged.** Each listed
`(verb, group)` is evaluated once, against the group's first-named
source, bound as the radial binds it (the verb's first object
positional); a source that is the viewer binds nothing. The reason is the
validator's own sentence. `resolveAffordancesImpl`'s two gates are lifted
into one module-private function both reads call.

**D3 — Grouped by source; two closing lines** (R2). One group per
source, alike sources counted (*3 notebooks on the shelf* — same handle,
same place words, same verbs). Groups are ordered by their rarest verb —
fewest sources in this answer first. After the audit (W2) a verb that
still comes from (nearly) every good is **common**, and collapses into a
second closing line beside the usual one: *and anything here: throw, …*.
Common is derived, never listed by hand: a verb is common when the
`Good` rung itself contributes it (`collectBucketDefs` over
`lib/stuff/Good`'s own chain — what a thing gives by being a good at
all). A group left with no other verb is not printed; the card's
collapsed *anything here* row opens to name the things. *Lens 1 chose:
interesting sources first.* ⚠ If the audit leaves nothing on the `Good`
rung, the second line simply never prints.

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
required: false }]`, and the `~` subcommand of D7. `which` · `which
counter` · `which fish`. `CommandApi.which` reads `what`
exactly as `source::verb` reads its scope (the resolve + `perceived`
lines of `matchAffordances`, lifted into one private method both use):
**a perceived thing in reach wins; a word that names nothing in reach is
read as a verb.** `help which` says so in those words (P9). A
shape-per-kind is impossible (Grounding § Shapes). Every thing the word
names is answered, each told apart by its place words — no prompt, no
keyword list.

**D7 — `which ~` and `which ~ <thing>`: one view, a `~` subcommand**
(R4 — the syntax law is `verb subcommand target`). In `which.yaml`:
`subcommands: { "~": { controller: …/WhichRelationsController, args:
[{ name: thing, type: object, required: false, scope: ["~reachable"] }] } }`.
The binder resolves `thing`, so its perception gate and tie prompt are
the binder's own. There is no second view.

**D8 — The `~` listing is the model's, and counts only kept sets.**
`which ~` = every word in `BuiltinRelations` (all apply to the asker) +
`me.relationsFor(me)`; `which ~ <thing>` = `thing.relationsFor(me)`
only (a counter *keeps nothing*). The count (*3 in the world*) is
`relatedBy(name, me)` members — resident ones, the holder's own gate. A
built-in shows its meaning and no count: its members are MQL's, and
`MqlApi` gains no third function.

**D9 — The live card is a payload card with a subscription.** Card
`which`: `{ source: { kind: 'payload', producer: 'which', subscription:
SUBSCRIPTION_SOURCES.which }, live: true, pinnedByDefault: false,
singleton: true, command: 'which' }`. The controller hands the card the
`WhichAnswer` it rendered the reply from, plus `params` (the ask) when
the answer can be kept current. `wantsLive` becomes *the kind is live,
the source can subscribe (MQL, or a payload with `subscription` and
`params`), and the player placed, pinned or roled it* — so a card that
flows past is a snapshot with a `takenAt`, and pinning it subscribes.
**There is one `which` card** (R5): the row is a singleton and both
controllers open it under the catalogue key `which`, so `which counter`
and `which ~` retarget the card that is up — `touchState` replaces its
payload, title and `params` and re-syncs liveness (a cancel-and-reopen
of its subscription, as `rebind` does). The answer carries the command
that reproduces it (`ask.command`: `which`, `which #<id>`, `which ~`),
which is what the card's refresh re-sends. The `~` view passes no
`params` and is a snapshot while it shows (a friend arriving is not
something this source hears). Not the `here` role (that is a place card rebinding); not a
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

**D11 — A verb you cannot use here** (R1). `which <verb>`, three cases,
in order: afforded here → its source(s), with the state and the
validator's own reason, then *`help <verb>` has its shape*; in the
catalogue (`CommandApi.allDefinitions()`) but given by nothing perceived
→ `nothing-gives-verb`: *Nothing here gives you `fish`. (`help fish`)*;
not a verb → `no-such-verb`. ⛔ Nothing says what WOULD give it: no
refusal-words field, no reverse search, no view key.

**D12 — Clicks.** A verb cell calls the store's `setDraft` on the
primary terminal's bar with `<verb> ` and focuses it — nothing is sent. A
source cell sends the command `which #<id>` (a typed, visible command;
`which` never acts), which **narrows the same card** (D9, R5); the
narrowed card shows a *everything* control that sends bare `which`. The `help` link sends
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
  place and no world row. The testbed gains one unplaced row (W6).
- Paths: views at `platform/cmd/shell/`, controllers at
  `/platform/idea/cmd/shell/`, the source at `/platform/idea/WhichSource`
  with its row, reason rows at `packages/content/platform/content/reasons/`.
- Module scope: declarations only. Import boundary: `lib/relation/` may
  not import `api/mql/**`; the move in N5 runs the other way.
- Verbs on objects: `whereFor`, `slotWord` are methods; `CommandApi.which`
  orchestrates the validator chain, as `resolveAffordances` does.
- One view, one word: one view, one word `which`, no alias;
  `verb target` (`which counter`) and `verb subcommand target` (`which ~ book`).
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
| N8 view | the view IS the def; no new view key | n/a | n/a | no synonym word | shell | never acts |
| N9 reason rows | worded in rows | rows | n/a | n/a | n/a | n/a |
| N10 `WhichBody` | a click types, never runs | n/a | n/a | n/a | n/a | sends only visible commands |
| N11 audit moves | a verb appears where the thing means it | n/a | a move, never a guard | n/a | each contribution on the mixin whose sentence it fits — the wave's whole test | changes which verbs a host affords; every change is a row in § The affordance audit |

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

**W0 — probe.** ✅ *(done 2026-11-23)* No commit. Found: a bare `~` is a plain word token; the biped's hands are `hand:left`/`hand:right` (`slotWord` → *left hand*); `fish` is trade-fishing's; ⭐ of every wide rung's contributions only `TangibleMixin` (`throw`) and `IntegrityMixin` (`ring`) put verbs in `environment`/`peers` — every other base-rung mixin contributes `self` only; places already compose neither; people do not compose `Integrity`. W2's job is therefore those two. In a standing test world: (a) list the verbs
a carried `/platform/thing/book` gives its carrier and a fresh avatar's
`self` verbs (a unit test over `getAffordances()` — keep it as W1's
fixture); (b) confirm a bare `~` tokenizes as a word and is a legal
subcommand key (`CommandLineApi`; if not, fix the tokenizer in W1 and say
so — R4: *make it work*); (c) read the biped body plan's hand slot
names; (d) confirm `PerceptionApi.perceives(viewer, viewer)` and what it
answers for a hosted app; (e) confirm `fish.yaml` is in the test world's
catalogue. Any answer that contradicts this plan is re-planned in place
before W1.

**W1 — the read and the words.** ✅ *(done)* (D1–D6, D11) — ⚠ `Good` is loaded at use in `commonVerbs` (a static import from `CommandLogic` closed a cycle through `Place`). `namedSources` lifted onto `CommandGiver`; `matchAffordances` uses it. `move` onto a body lands a thing in a free hand, so a carried article reads *in your left hand*.
- `packages/types/src/index.ts`: `WhichAnswer` (`ask` with its
  `command`, `groups`, `usual`, `common`, `relations`), `WhichGroup`,
  `WhichSource`, `WhichAsk`.
- `lib/slot/Slotted.ts` `slotWord`; `lib/spatial/Containable.ts`
  `whereFor`; `lib/augmentation/AetherHosted.ts` `whereFor`.
- `lib/command/CommandGiver.ts`: lift the scope's resolve-and-perceive
  into one method used by `matchAffordances` and by the read
  (`namedSources(raw)` — the perceived things, or the note).
- `platform/idea/api/CommandLogic.ts`: the shared gate function;
  `which(viewer, ask)`; `api/command.ts`: the static.
- Tests (`__tests__` beside each): **every verb `which` lists is accepted
  by `matchAffordances`** (one direction — R3); a hidden source's verbs
  absent; an unidentified thing's verbs absent; grouping, order,
  counting, the usual line and the common line; every row of D5's table;
  thing-first then verb; the three D11 cases.
- Acceptance: `pnpm test:near` green. Commit `feat(which): the read —
  what you can type and what gives it`.

**W2 — the affordance audit.** ✅ *(done — two slice fixes, no new substrate; § The affordance audit)* (R2, D3)
- **Census.** A script-free read: a vitest under
  `platform/idea/api/__tests__/` that walks every kernel and pack class
  and mixin with a `static commandContributions` (the `pack-roots`
  reader the lints use), and for each verb × bucket lists the hosts that
  end up composing it. Its output fills the table in § The affordance
  audit — every verb, not a sample.
- **Instrument.** Run the W1 read as a fresh player in each testbed
  place (plaza, shop, hall, bank, works, yard) and holding each testbed
  good; anything a person would call stupid is a row.
- **Verdict per row:** *right* · *wrong host* (the contribution sits on
  a rung wider than the things that mean it) · *wrong slice* (right
  host, wrong bucket — e.g. `peers` where only a holder should get it).
- **Fix every wrong row in this wave, by placement.** Move the
  contribution to the mixin or class whose header sentence it fits; where
  none exists, the row names the narrower existing mixin, or — only if
  there is none — a new one, added to § New substrate with its P1 line
  first. ⛔ Never a guard, a validator that re-narrows, or an
  `isFixedInPlace()` check inside a view. The owner's three named cases
  are the floor: **a person does not ring; a place is not throwable; a
  fixed-in-place fixture is not throwable.**
- B4: every moved view is grepped across `packages/content` and every
  pack's `src/` for hosts that relied on the old reach
  (`lint:reachability`, `lint:self-contributions`, `lint:contribution-keys`).
- Tests: the census test pins the table (a host gaining a verb it should
  not have fails it); each move has a test on the host that lost the
  verb and one on a host that keeps it.
- Acceptance: the W1 read in the testbed shop shows no wrong row; the
  touched packs' own vitest green. Commit `fix(affordances): the audit —
  verbs on the hosts that mean them` (split per verb family if large).

**W3 — the verb.** ✅ *(done)* (D6, D7, D8, D13) — decided: the `~` read is its own static, `CommandApi.whichRelations(viewer, thing?)`, beside `which` (one concept, two shapes of answer); the usual line names every body verb (a cutoff count was a controller decision `lint:controller-decisions` refused — the card collapses the row instead); `opens_card: which` lands with the card id in W4; replies ride `shell.result`; the common line reads *and anything you're carrying* (W2 made that the truth).
- `lib/relation/BuiltinRelations.ts`; `api/mql/relations.ts` reads it
  (`Record<BuiltinRelationName, members>` — a missing word is a compile
  error).
- `packages/content/platform/content/platform/cmd/shell/which.yaml`
  (`category: shell`, `opens_card: which`, `fallthrough: true`, the `~`
  subcommand; help text stating D3's order, the two closing lines and
  D6's rule); rows N9.
- `platform/idea/cmd/shell/WhichController.ts`,
  `WhichRelationsController.ts` + their template rows
  (`packages/content/platform/content/platform/idea/cmd/shell/`).
- `lib/character/Avatar.ts` `self`: the one view.
- The reply: one line per group — *buy, sell, shelf — the counter here*
  — a greyed verb followed by its reason on its own line; then *and
  anything here: throw, …*; then *and the usual: look, say, go, …
  (you)*. `which ~`: one line per word, *~friends — <meaning> (3 in the
  world)*.
- Tests: controller tests over a staged body; `help which` renders.
- Acceptance: typed in a dev world, steps 1–7 read right. Commit
  `feat(which): the verb, and the ~ words`.

**W4 — the card.** ✅ *(done)* (D9, D10, D12) — decided: the source pushes the WHOLE answer under one key `answer` (not a replace per group — group order and the closing lines move together, and the answer is small); a payload card's source answers asynchronously, so `subscribePayload` marks it live at once and sends the fresh answer on a `card-touched` when it lands; no `_hasSession` guard — `SubscriptionApi.poke` stands nothing up when nobody subscribed, so the three stack mutators poke unconditionally; a verb click seeds the PRIMARY bar through a new store field `primarySeed` (`setDraft` is the prompt-slot draft, not the base bar's); `throw` moved again in this wave, to `Tangible.self` (see § The affordance audit).
- `packages/types`: `CardId` + `CARD_IDS` `which`; `CardPayload` kind;
  `SUBSCRIPTION_SOURCES.which`; the source's params/snapshot/change
  types in `SubscriptionSources`.
- `lib/connection/Cards.ts`: `subscription?` on the payload source; the
  row. `platform/idea/CardRegistry.ts`: `params` on `CardOpenOptions`
  and `CardState`; `wantsLive`, `subscribe`, `syncLive`, `teardown`;
  `touchState` replacing a payload card's payload and `params` and
  re-syncing its subscription (the retarget, R5); the `card-touched`
  body for a payload card.
- `platform/idea/WhichSource.ts` + its row; the poke in
  `CommandGiver`'s three methods; delete the schema push (D10) and
  `api/__tests__/command-schema-delivery.test.ts`.
- Controllers call `CardApi.open(context, 'which', { key: 'which',
  payload, params })`.
- Client: `components/cards/WhichBody.tsx`, registered in
  `CardBodies.tsx`; `useCardFeed.ts` applies a result/delta to a `which`
  payload by group key; the widths — `unit`: verb · handle; `medium`:
  verb · name + place · state and reason; `full`: + description and the
  `help` link; the *anything here* and *usual* rows collapsed; the `~`
  layout; the narrowed card's *everything* control; refresh sends
  `ask.command`.
- Tests: `card-birth-path.test.ts` gains the mint site; a registry test
  that pin subscribes, unpin stamps `takenAt`, and `which counter` then
  `which` leave ONE card; a source test that a move, a pick-up and a
  lamp lit each produce the right group changes **applied by the wire's
  own rule**; client body tests per width.
- Acceptance: steps 12–16 by hand. Commit `feat(which): the card`.

**W5 — the listing leaves MQL.** ✅ *(done before W4 — server-only and independent)* (requirements § The `~` listing leaves
`query`) — a bare head `~` stays the home path (`/home/<you>`), so only `thing:~` is the refusal; `ContactsAddController`'s built-in warning now reads `BUILTIN_RELATION_WORDS` (it had resolved `me:~` to get them); the wiki guide and `notify`'s help point at `which ~`; `lint:data-ideas`' ceiling fell 13 → 11 and is re-pinned.
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

**W6 — drive, walk, docs.** *(docs written; the drive is `packages/wire/tests/which.dirty.wire.test.ts` — `.dirty` because step 4 buys notebooks off the counter; no testbed `phone.yaml` — step 10 clones the generic-objects Hollis Pal if the starting kit has none)*
- Testbed: `packages/content/test-fixtures/content/world/testbed/thing/phone.yaml`
  (class `/platform/thing/Phone`), not placed anywhere — the drive stages
  it; `scaffold.ts` gains its constant.
- `packages/wire/tests/which.wire.test.ts` (steps 1–11),
  `e2e/tests/which-walk.spec.ts` (12–16). Each checkpoint failed once on
  purpose (B2).
- `docs/subsystems/command-routing.md` (the `which` read; the audit's
  moves; the schema push retired), `card-surface.md` (the row; payload
  liveness; the retarget), `subscription.md` (the source),
  `presentation.md` (`whereFor`), `help.md` (the borrowed line), and the
  subsystem doc of every mixin the audit moved a verb off. Index lines
  are the sweep's.
- Full suite once, beside the MR. Commit `test(which): the drive and the
  walk`; the drive record appended below.

## The affordance audit

✅ *W2, 2026-11-23.* **Census** — every `static commandContributions` in
the kernel and every pack's `src/` (243 files), sorted by the rung that
composes it. ⭐ The finding that sized the wave: **only two wide-rung
mixins put verbs anywhere but `self`** — `TangibleMixin` (on `Thing` and
`Agent`) and `IntegrityMixin` (on `Good` and `Vessel`). Every other mixin
those rungs compose (`Container`, `Mobile`, `Posed`, `Vitals`, `Combatant`,
`Respiration`, `Eating`, `Metabolic`, `Palate`, `Engaged`, `Visible`)
contributes `self` only — the body's own verbs, the *usual* line. The
other ~80 `peers` contributions are each on one class or a narrow mixin
whose sentence they fit (a well's `pump`, a tub's `bathe`, a till's
`buy`, a bonded animal's `pet`, `Bulkable`'s pour/drink, `Marked`'s
read/write, `Behaved`'s `talk`), and were judged **right**.

| verb (view) | declared on | bucket(s) before | hosts that ended up with it | verdict | fix (commit W2) |
|---|---|---|---|---|---|
| `throw` · `throw-to` · `throw-at` | `TangibleMixin` | environment · peers | via `peers`: every thing in the room — a fixed counter, a hearth — and **every body** (a person was a thing you could throw) | **wrong slice** | moved to `self`: **a body throws** (every `Agent` composes Tangible; `self` is read only off a giver, so no rock or room gives it). ⚠ First cut kept `environment`, and an empty-handed player then got *I don't understand 'throw'* instead of ranged.md's *pick up the rock first* — lens 1 chose `self`. A place never composed it |
| `ring` | `IntegrityMixin` | environment · peers | via `peers`: every good and vessel in the room — a rope, a loaf, a sack | **wrong slice** | `peers` dropped; `environment` kept (tap the article you hold — a held rope gives *a dead thud*, which is true and is how a player learns what rings); `peers` `ring` moved to `RingableMixin` — a bell is struck where it hangs (`Bell`, `SignalBell`) |
| `ring` on a person | — | — | none: `Creature` does not compose `Integrity` (the requirements' first example was wrong; corrected before the plan) | right | — |
| every other contribution | (243 files) | | each on the class or narrow mixin whose header sentence it fits | right | — |

Consequence for D3: the *common* line (what the `Good` rung gives) is now
`ring` from what you **carry** — *and anything you're carrying: ring* — and
`throw` is on the usual line. Pinned by `command-which.test.ts` § the affordance
audit (a floor good, a fixture and a person give neither; a held article
gives both; `Good`'s `peers` has neither; a `Ringable` good keeps `ring`).
Checked: the two soak drives that `throw`/`ring` (river-b, underwater)
take the line up first and ring a `Ringable` bell.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| `which` / `which <word>` | `which.yaml` | `Avatar.self` | the stack (live) | view installed with the platform pack | `what`: string |
| `which ~` / `which ~ <thing>` | `which.yaml`'s `~` subcommand | same | `BuiltinRelations` + `relationsFor` | same | `thing`: object, optional, `~reachable` |
| a verb the audit moved | its own view, unchanged | the new host's `commandContributions` | — | — | the census test + `lint:reachability` |
| the card | `opens_card: which` on the view | `CardApi.open` in both controllers | the payload | `CARDS.which` | `card-birth-path.test.ts` |
| liveness | pin / place | `wantsLive` | `WhichSource` | the source's row; stood on first subscribe | `SubscriptionSourceMixin` check in the registry |
| the wake | — | the three stack methods + the watch set | `FieldChangedEvent` | — | `_hasSession` |
| the four sentences | — | `this.refuse` | the reason rows | `ReasonCatalogue.find` on use | `lint:reason-rows` |

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| every verb, its source in plain words, the usual on one line | W1, W3 (and W2: the sources are the right ones) |
| changes as they move and carry | W1 (a read of live state), W4 (pinned) |
| `which <thing>`, named by handle, two told apart | W1, W3 |
| `which ~`, `which ~ <thing>`, a new list appears | W3 |
| a verb nothing here gives: one plain line; a non-verb is called one | W1, W3 (R1) |
| nothing hidden appears | W1 |
| every verb listed is accepted by the line | W1's test (R3 — one direction) |
| `query me:~` points to `which ~` | W5 |
| the card: matches the reply, widens, follows when pinned, click types, a source narrows the same card | W4, W6 |

## Test & gate strategy

- **Unit**: W1–W5 as listed. Load-bearing: W1's *listed ⇒ accepted*
  test and W2's census test.
- **Drive** — all `instant`; no span step, so no staged twin and no soak
  drive. Blocking drive = steps 1–11 (wire) + 12–16 (walk).

| step | pace | note |
|---|---|---|
| 1–3, 5, 7, 9 | instant · player | as the requirements now read (R1: step 7's line is *Nothing here gives you `fish`.*) |
| 6 | instant · player | `which ~`; `which ~ counter` says the counter keeps nothing |
| 11 | instant · player | every verb listed in 1–10 is accepted when typed (one direction, R3) |
| 4 | instant · player | asserts the W0 list of the notebook's verbs under *the notebook you're carrying* / *in your … hand*; set down, it is named where it now is, or its verbs are only in the *anything here* line |
| 8 | instant · **staged** | the cellar and the trap are behind a locked door: the player is staged into the CELLAR, then the PASSAGE. Unlit: `which` names nothing there. Staged a lit lamp: the trap is not named by `which` or by `which trap`; after `search` finds it, `which trap` answers. (The requirements say *the yard*; the trap is in the passage.) |
| 10 | instant · staged | the testbed phone staged into the player's hand: `apps — the phone in your right hand` (W0(c) fixes the hand's word); and the player's own app: `calendar — your calendar`. The *app on your device* wording is unit-tested (W1); its end-to-end is stream-arrival's to check when the two meet |
| 12–16 | instant · player | Playwright, at three widths |

- **Staging tools**: the harness's existing teleport/stage and clone
  (`packages/wire/src/harness/`); none owed.
- `pnpm test` at code-complete and at `/finalize` only; between,
  `test:near` + the gates above.

## Owner rulings (2026-11-23)

- **R1** (was O1) — a verb nothing here gives gets one line, *Nothing
  here gives you `fish`.*, with a `help` pointer. Nothing answers what
  would give it. → D11.
- **R2** (was O2) — *"wtf is everything afford ring? … Places shouldn't
  be throwable. This build needs to also be an inventory of stupid verb
  affordances to fix now that we have a command to reveal them."* → W2,
  § The affordance audit; grouping per D3 (per source, plus *and
  anything here*).
- **R3** (was O3) — no leak-plugging. `which` lists nothing the asker
  cannot perceive; the *none it omits is accepted* half is dropped from
  the requirements; the dispatcher is untouched; no slate. → D1.
- **R4** (was O4) — *"just make it work and do whatever the command
  definitions imply"*: `which ~` and `which ~ <thing>`, one view. → D7.
- **R5** — a source click narrows the same card. → D9, D12.

## Risks & opens

- **The audit's size is unknown until its census runs.** ~70 classes and
  mixins declare contributions. The wave fixes every wrong row; if a fix
  needs a new mixin, it gets its § New substrate line first (B1). A move
  that changes what a trade pack's content can do is found by that
  pack's own vitest and the drive — run every touched pack's.
- **Moving `throw` off a rung may strand a verb that only worked by
  accident** (the assembly build's lesson: a `self`/`peers` verb that
  worked because something else in the room afforded it). The census
  test and `lint:reachability` are the check.
- **The one-card retarget** (R5) keys the card on `which`, so its refresh
  must send `ask.command`, not the key — card-surface.md warns that a
  relative key refreshes to the wrong thing. Tested in W4.
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
- **Do not stop** on W0(b): if `~` cannot be a subcommand key as the
  tokenizer stands, make it one (R4) and record the change here.

## Deferred seams

- The radial and typeahead reading `WhichAnswer` →
  command-line-reflection-slate § Left.
- Scripts asking whether a verb exists → scripting-hand-economy-slate.
- Card sizes beyond the three widths → card-sizes-slate.
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
