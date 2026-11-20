# Naming overhaul — implementation plan

Executes [naming-overhaul-requirements](../requirements/naming-overhaul-requirements.md):
one build, one MR, three stages — **A** document traits, **B** MQL anchors,
**C** the matcher cleanup. **Kind:** refactor/sweep with a player-visible
grammar change. **Lead end:** kernel; every pack that ships documents, views
or a hand-rolled matcher follows. Design and rulings:
[document-traits-slate](../slates/tech-debt/document-traits-slate.md) (A),
[mql-anchors-slate](../slates/engine/mql-anchors-slate.md) (B),
[one-resolution-rule-slate](../slates/tech-debt/one-resolution-rule-slate.md)
§ 6 (the census ledger) and § 7 (the re-cut — **§ 7 wins** wherever the two
disagree). File-level survey: [naming-overhaul-grounding](./naming-overhaul-grounding.md)
(retire it into this plan at the sweep).

Path shorthand: `S/` = `packages/server/src/mud/`, `C/` = `packages/content/`,
`P/` = `C/platform/content/platform/`.

---

## Questions for the owner

These are product questions the requirements and slates do not settle. The
plan does **not** decide them. Each names the wave it touches; every other
wave is unaffected.

**Q1 — Does a bare name reach the people you keep?** `online` goes from 23
views (`dm`, `pay`, `party`, …). The slate says each *moves to relations
(contacts, group/party members, here) plus the player-id address*. It does not
say whether `dm iffy` (no sigil) finds Iffy because she is on one of your
lists, or whether a person elsewhere is only ever named as `~friends:iffy` /
`@id`. Drive step 11 reads either way. The first needs one relation the views
can scope to — everyone on any list you keep (`~contacts`, answered by the
contact lists' own mixin) — which is a relation name the slate does not list.
*Touches B3.* Recommendation: bare names search `~here`, then `~contacts`,
then `~party` (lens 3a — a relation is what makes a thing nameable; you have
one).

**Q2 — A contact who is not loaded cannot be bound by MQL.** MQL finds runtime
Stuff only, and an offline player's avatar is not runtime Stuff. Today
`contacts remove` deliberately works on an offline person
(`S/platform/idea/cmd/social/ContactsRemoveController.ts:5–9` — *"so a person
need not be online"*, matching the entry's remembered name or raw id). Under
`contacts remove ~friends:iffy` an offline Iffy binds nothing. Options: (a)
you can only remove someone who is online; (b) when the query binds nothing,
the list resolves the typed words among its own entries by the shared naming
rule (§ 7's *player labels are resolved by their holder*); (c) something else.
The same hole exists for `contacts list` display (unaffected — it lists
entries) and for nothing else. *Touches B4.* Recommendation: (b).

**Q3 — Notify on a managed group.** The ruling retires notify's `contacts:` /
`managed:` / `mql:` reference syntax in favor of relations (`~friends`,
`~party`). A managed group is a collection record whose membership is an async
read; a relation must answer synchronously. Either a person answers
`~<group name>` for the groups they belong to (needs a resident membership
mirror — new state), or notify rules on managed groups and on `mql:` queries
simply go in this build. *Touches B4.* Recommendation: they go; a managed
group becomes a relation when the who-list build models kept lists as holders.

**Q4 — Stream durations in game time.** The requirements say *"`rent`, `fire`
and the stream verbs read a duration the same way, in game time."* A stream
break (`stream start … 15m`, `S/platform/idea/cmd/stream/StreamStartController.ts:19`)
is an out-of-character act about a real broadcast, and the traits slate itself
keeps `stream-token` as the one real-time kind. Parsing the *words* the same
way is clearly right; converting a streamer's "back in 15 minutes" to game
seconds looks wrong. The plan as written follows the requirements (D-C6); say
if the stream verbs should share the reading but stay on the wall clock.

**For the owner's eye (decided here as engineering, reversible):**

- `look <holder>:~` (drive step 13) needs one small branch in `look` to print
  a relation listing, although `look` is otherwise out of this build (D-B4).
- `$$` retires into `~last`, and the default query aliases are `here`, `it`,
  `them`, `him`, `her` only — `inventory`, `peers`, `reachable`, `person`,
  `horizon` typed bare become ordinary keywords (D-B7).
- The `documents` collection's nightly reset becomes a plain `keep` (D-A9).
- `who` / `profile` must show a player's `@id` or the address is unreachable
  (Reachability, link 2).

**Errata in the requirements (no decision needed, recorded so the drive is
written right):**

- Stage B goal *"`:members` retires into `@` relations"* and Stage C goal
  *"a set a thing keeps through `@`"* use the superseded sigil; relations are
  `~` (the rulings in the same doc and mql-anchors § 14).
- Drive step 8 says *"make `formation` words unique while two share one"*;
  `formation` is already unique (the word dispatches), so two can never share
  one. The drive stages it on `form`, which is deliberately non-unique
  (`document-store.md`: *"two wheels may each know a `brick`"*).

---

## Grounding

Verified this cycle by opening the files (HEAD `abd3ce1dc`). The handed
grounding doc carries the full file:line census; what follows is what the
decisions below stand on.

### The document store

- **The closed list** — `S/lib/document/DocumentKinds.ts` (588 lines):
  `DocumentKindSpec` = `{ kind, keys?, words?, catalogue?, contentDir, ext,
  onVanish }`; `keys` and `words` are **functions** (`recipeOutput`,
  `dyestuffMaterial`, `releasePublishedAt`, `releasePinned`, `releaseIdOf`,
  `leafWord`, placement's first preposition). Every one of them reads a single
  data field or the leaf — all reduce to data. The file *"imports nothing — the
  reset policy and the schema generator read it statically."*
- **The card** — `S/lib/document/StoredDocument.ts:119–150`: `cardOf` reads
  `DOCUMENT_KINDS[kind]`; an undeclared kind gets an empty card and is stored
  anyway. `save()` recomputes the card on every write.
- **Writers** — nine paths in `S/platform/idea/api/DocumentLogic.ts`
  (`saveReleaseImpl` 189, `saveAsBusinessImpl` 269 with
  `BUSINESS_DOCUMENT_KINDS` 233, `saveInstrumentImpl` 352, `saveMapImpl` 398,
  `saveStreamTokenImpl` 444, `saveBerthImpl` 502, `saveToRegisterImpl` 603,
  `saveImpl` 652, `freezeEditionImpl` 875). **Each builds a `StoredDocument`
  and calls `doc.save()` itself** — there is no single write funnel, which is
  why nothing can enforce a ledger or a filing rule today.
- `saveImpl` validates through `PackApi.validateDocument` (dynamic import),
  special-cases `command-view` twice (673, 698), then `forgetEdited` →
  `catalogueForImpl` (707) which reads `DOCUMENT_KINDS[kind].catalogue`.
  Recipe, archetype, help-concept, blueprint and name-bank declare no
  catalogue there (defect 1 confirmed).
- `pagesOfImpl` (777–860) is a 42-case switch; `callUpImpl` (919) matches by
  substring over a 200-release window.
- **The catalogue base** — `S/lib/document/DocumentCatalogue.ts`: `ensure` ·
  `need` · `peek` · `remember` · `all` · `under` · `byWord` · `forget`, memory
  per kind in a hard-private static. `ServesDocuments` is `{ forget(paths?) }`.
  A catalogue is reached through its domain Api (`CraftingApi.joints()`), and
  an Api's dictionaries stand at boot as its `static readonly needs`
  (`document-store.md` § Resident by construction; `S/api/stuff.ts:830`).
- **The installer** — `S/platform/idea/api/PackLogic.ts` (4421 lines):
  `GATED_DOCUMENT_KINDS` 174 (empty), `DOCUMENT_VALIDATORS` 181,
  `activeDocumentKinds` 238, the per-kind reader 890–935 (path =
  `/<contentDir>/<rel>` except `command-view`), `invalidateDocumentKind` 3613
  (a switch; `NameBank.clearCache()` at 3654), `validateDocument` ~4011.
- **Reserved dirs** — `S/lib/paths.ts:264` `NON_TEMPLATE_DIRS` spreads every
  yaml kind's `contentDir`, runtime-only kinds included (defect 3).
  `packages/server/scripts/check-template-census.ts:68–71` keeps a hand copy
  listing six kind dirs (defect 4).
- **Reset** — `S/lib/persistence/ResetPolicy.ts:47,105` keeps
  `kind ∈ [release, ...DECLARED_DOCUMENT_KINDS]`; generated from
  `packages/server/src/schema/documents.yaml:48` (`keep:
  declared-document-kinds`) through `packages/server/scripts/gen-schema.ts:140`
  `KEEP_DERIVATIONS`. So today the reset wipes exactly the *undeclared* kinds.
- **The undeclared write** — `S/lib/behavior/enforces.ts:152` plain-saves kind
  `venue-eighty-six`. **The ungated write** —
  `C/water/src/idea/WaterRightRegistry.ts:216,243` plain-saves `water-right`.
- **Who owns which kind** (by where its constant lives): `herd` →
  trade-ranching; `fishery`, `water-right` → water; `bore` → trade-drilling;
  `body` → ground; `rate-card`, `bill-of-lading`, `warehouse-receipt` →
  trade-haulage (the receipt's class is the kernel's `S/lib/storage/Store.ts`);
  `dyestuff` → trade-dyeing; `ship`, `berth-roll`, `berth-book`,
  `stream-token`, `instrument`, `map`, `edition`, `release` and the shipped
  reference kinds → platform.
- **Pack layout** — 75 packs; a kind's files sit in a top-level dir of the
  pack's `content/` (30 packs ship `recipes/`, 13 `archetypes/`, 12
  `maturation-profiles/`).

### MQL and the command line

- **Sealed subdir** — only `S/api/mql.ts` imports `S/api/mql/**`. `MqlApi` is
  `resolveOne` + `resolveMany` (plus `extractStuffs`, `effectiveTarget`).
  **Resolution is synchronous** (`resolve(query, ctx): MqlMatch[]`); nothing a
  query asks may load anything.
- **The scorer** — `S/api/mql/scope-walk.ts:292–396`: `TIER_PHRASE` 100 ·
  `TIER_WORDS` 60 · `TIER_PREFIX` 40 · `TIER_PARTIAL` 10; `scoreTier`;
  `scoreKeywords(keywords, queryWords)` is a **pure function of two string
  lists**; `scoreCandidates` applies the whole-phrase cut. Plurals are added
  per candidate at `candidateFor` (238) via `GrammarApi.pluralize(stuff, k)`.
- **`GrammarApi`** — `S/api/grammar.ts` (319 lines), pure statics, **no logic
  singleton**; owns `ARTICLES`, `ORDINAL_WORDS`, `ORDINAL_NUMERIC`, `tokenize`,
  `pluralize(stuff, word)` over a private `pluralWord`. Already imported by the
  sealed subdir.
- **Seeds twice** — `resolver.ts`: `SEED_WORDS` 172; `resolvePronoun` 443
  (`me`, `here`, `it`, `them`, `him`, `her`); `resolveKeywordSeed` 488
  (`inventory`, `online`, `world`, `peers`, `reachable`, `person`, `horizon`);
  and again as `candidatesForScopePart` 725. ⚠ The two tables **do not mean the
  same thing**: seed `here` is the place (one Stuff) while scope `here` is
  `candidatesForHere` (what is to hand there); seed `inventory` is the giver
  while scope `inventory` is the carried things.
- **Scopes** — `candidatesForScope` 583: a fast path over comma-joined scope
  words, else a slow path that resolves the fragment as a query and walks each
  anchor's neighborhood (`candidatesFromQuery` 628, `candidatesForAnchor` 674).
- **`:members`** — `flatMapMembers` 973, `instanceof Warren` only, live members.
- **Views** — ~460 `scope:` lines across the packs: `["reachable"]` 112,
  `["here","peers","person"]` 108, `"reachable"` 69, `["$focus","reachable"]`
  33; `online` on 29 lines in 23 views; ~150 `default:` queries name a seed.
  `:members` has 3 uses outside tests.
- **The selector** — `S/platform/idea/api/CommandLineLogic.ts:275–295`: token 0
  splits at its first `@` past index 0; re-emitted as `verb@scope`;
  `S/platform/idea/api/ShellLogic.ts:164` `carryScope` keeps it through an
  alias.
- **Aliases are verb-position only** (`shell-alias.md` § Core Principle;
  `S/lib/shell/Alias.ts`). Defaults come from a view's `defaultAliases:` or a
  mixin's `static defaultAliases`. **There is no argument-position alias
  today** — the ruling *"`here` survives as a removable default player alias"*
  needs one.
- **Durations** — a `type: duration` slot **already exists**
  (`S/lib/command/CommandDefinition.ts:648` `parseDuration` → real ms,
  `isDurationUnit`; the binder's two-word form at
  `S/platform/idea/api/CommandLogic.ts:2800,3409`; used by `press --for`). The
  three hand parsers beside it: `RentController.daysOf`
  (`S/platform/idea/cmd/retail/RentController.ts:116`), `FireController.parseHoldS`
  (`S/platform/idea/cmd/device/FireController.ts`), `StreamApi.parseDuration`
  (`S/api/stream.ts:239`). `S/lib/script/Interpreter.ts:202`
  `parseDurationSeconds` is a fifth.
- **Notify** — `S/platform/idea/cmd/social/NotifyControllerBase.ts:128`
  `normalizeRef`; a `NotifyRule` (`S/lib/social/NotifyRule.ts:58`) is keyed by
  a `GroupRef`, matched in `S/platform/idea/api/SocialLogic.ts:297`
  `matchesRule` (async, through `GroupApi`). `GroupRef`s also serve
  `AccessApi`, `PackLogic` and diagnostics — they are not notify's alone.
- **Contacts** — `S/lib/social/Contacts.ts`: entries are durable ids (a
  `playerId` or an NPC `templatePath`) with a `label`; owner-only reads.
- **Party** — `S/platform/idea/Party.ts:70`, a live Idea holding `memberIds`.

### The matchers

- **`buy`** — `P/cmd/retail/buy.yaml`: `thing` is `type: string`, `counter` an
  object behind `from`; `BuyController.ts:55` sniffs `counter.raw`;
  `S/lib/retail/ForSale.ts:56` is `offers(word)` · `sellerFor(word)` ·
  `sell({ word })`; `S/lib/retail/Stock.ts:407,434` `resolveBuy` /
  `lineForWord` match the template **leaf**. `retail.md:208`: *"the shelf is
  always instances."*
- **`charter`** — `S/platform/thing/CharterBook.ts:79–118`: `shipFor` strips
  `the`, loads each listed ship with `StuffApi.singleton`, then a private
  `answersTo`. Listed ships are live singletons once loaded.
- **Ideas** — `Material` composes `PerceptibleMixin(Idea)`
  (`S/lib/material/Material.ts:87`) and is held live by `MaterialCatalogue`;
  `Spell` is a bare `Idea` (`S/platform/idea/magic/Spell.ts:147`) whose
  catalogue holds descriptors and takes the first of an ambiguous name
  (`SpellCatalogue.ts:99`); `Brand` already composes `NamedMixin(Idea)`
  (`S/platform/idea/corpo/Brand.ts:58`); `OrganizationMixin` carries its own
  `name` field (`S/lib/employment/Organization.ts:265`).
- **`NamedMixin`'s header** (`S/lib/description/Named.ts:1–40`) states it is
  for proper names only and that adding a composer is *a deliberate act on one
  class*.
- **The existing gate** — `packages/server/scripts/check-controller-resolution.ts`:
  `BESPOKE_RESOLUTION_CEILING = 0`, `SELF_RESOLUTION_CEILING = 75`. It does not
  count `.raw` reads, lower-casing or article stripping.
- **Rough pre-census greps** (not the gate's numbers): 40 article-stripping
  regexes outside `api/mql` and `api/grammar`; 108 `toLowerCase()` sites in 61
  controller files; 216 `.raw` reads in controllers (most are refusal words).
- **Controller I/O helpers** — `S/lib/command/CommandController.ts`:
  `refuse` 431, `promptForObject` 174, `choiceLine` 395.

---

## ⭐⭐ New substrate

The list is short on purpose. **No trait is a class**; the ten traits are
fields of one value class. Each item cites its reuse-ledger row
(one-resolution § 6, or the slate section that ruled it) or says *genuinely
new* and what was searched.

| # | item | where | ledger |
|---|---|---|---|
| N1 | `DocumentKind` — the value class over one `kind` declaration (the ten traits + `fields:`) | `S/lib/document/DocumentKind.ts`, **replacing** `DocumentKinds.ts` | generalizes `DocumentKindSpec`; the closed table is deleted in A1 (P1's *is the specific one gone* — yes) |
| N2 | `DocumentKindCatalogue` | `S/platform/idea/DocumentKindCatalogue.ts`, reached as `DocumentApi.kinds()` | reuse — the per-family `DocumentCatalogue` pattern (`document-store.md`) |
| N3 | `NameBankCatalogue` | `S/platform/idea/NameBankCatalogue.ts` | reuse — same pattern; ruled by the traits slate (*a reader with a private cache must be the kind's catalogue*); `NameBank`'s static cache is deleted |
| N4 | document kinds `kind` (the bootstrap) and `venue-eighty-six` (written today, undeclared) | `C/platform/content/kinds/` (→ `/platform/kinds/<kind>`) | ruled (traits slate § Where a kind is declared, § Undeclared kinds) |
| N5 | one write funnel inside `DocumentLogic` (a private function, not a surface) | `S/platform/idea/api/DocumentLogic.ts` | generalizes the nine `doc.save()` sites |
| N6 | `RelatingMixin` — *a thing that keeps named sets it can be asked for* | `S/lib/relation/Relating.ts`, `Mixins.Relating` | **genuinely new.** Generalizes `flatMapMembers`' `instanceof Warren` (which retires). Searched: `S/lib/mixin.ts` for Relat/Keep/List/Member (none); `GroupProvider` (durable-id membership, async, answers offline people — a different question, see D-B9); `Registrar` (a write transport's holder); `Listing` (the rejected § 1 protocol, never built). Six implementers in this build |
| N7 | the built-in relation table | `S/api/mql/relations.ts` (sealed pipeline internal) | generalizes — and replaces — the two hand-written seed/scope tables in `resolver.ts` |
| N8 | `MqlMatchVia.relation` (a facet) and `MqlMany.relations` (a fact) | `S/api/mql/types.ts` | reuse — the `via.detailPath` / `isSet` precedents |
| N9 | the naming rule on `GrammarApi`: the scorer **moved** from `scope-walk.ts`, plus one entry `GrammarApi.name()` returning a `NameAnswer<T>` | `S/api/grammar.ts` | § 6 rows 1–4 (reuse the scorer, generalize plurals, reuse articles/ordinals/literals). `name()` is new composition of existing parts |
| N10 | `CommandController.named()` — the I/O half: prompt on a tie, refuse listing what was there | `S/lib/command/CommandController.ts` | reuse — beside `refuse` / `promptForObject`; § 6 row *the prompt on a tie* |
| N11 | query aliases: `AliasEntry.at: 'verb' \| 'query'` | `S/lib/shell/Alias.ts`, `ShellApi.expandQueryAliases` | generalizes `AliasMixin` (mql-anchors § 13 ruled *the alias system, not the grammar*) |
| N12 | `granularity:` · `min:` · `max:` on a `type: duration` slot, and the slot returning game seconds | `CommandDefinition`, the binder, `lint:view-keys` | generalizes the existing `type: duration`; § 6 row *durations* |
| N13 | `DocumentCatalogue.named(text, among?)` and `parentOf` / `nearest` | `S/lib/document/DocumentCatalogue.ts` | generalizes `byWord`; `tree` replaces three hand walks |
| N14 | reason rows: `document-kind-undeclared`, `document-filed`, `ledger-altered`, `kind-in-use`, `no-such-name`, `names-relations`, `bad-duration` | `C/platform/content/reasons/` | reuse — the failure-model reason rows |
| N15 | gates: `lint:document-kinds` (replaces `lint:typed-words`), `lint:hand-matchers` (new census), two more counts in `lint:controller-resolution` | `packages/server/scripts/` | § 6 row *the census gate* |
| — | `PerceptibleMixin` on `Spell`, `Reading`, `Condition`, `Lane`, `Species`, `App`; `NamedMixin` + `PerceptibleMixin` on `Locality` and the `Organization` hosts | their own class files | **no new mixin** — § 7; the Material precedent |

**Not new, deliberately:** no MQL scope, seed or grammar for anything that is
not runtime Stuff; no `Listing` protocol; no `listed` scope; no `defaulted`
fact; no validator registry; no class a document becomes; no new Api; no new
logic singleton; no new module category; no exported free helper; no new Mongo
collection.

### P9–P14, per item

One line per item. P9 predictable from the def and `help` · P10 metadata is a
Document · P11 no caller branches on the destination · P12 no synonym · P13 on
the mixin whose header sentence it fits · P14 nothing moves, retargets or
decides invisibly.

| item | P9 | P10 | P11 | P12 | P13 | P14 |
|---|---|---|---|---|---|---|
| N1 `DocumentKind` | n/a (no command) | yes — a kind **is** a document, the value class reads it (`Placement` shape) | one funnel asks the kind; no writer branches on it | replaces `DocumentKindSpec`, not beside it | value class, no host | a refused write says which trait refused |
| N2 kind catalogue | `ls <root>/kinds` shows titles; `help` reads the same documents | serves documents | — | the catalogue pattern, 18th of its kind | a `DocumentCatalogue` | never invents a kind; unknown ⇒ refusal |
| N3 name-bank catalogue | n/a | serves documents | — | replaces the static cache | a `DocumentCatalogue` | — |
| N4 `kind`, `venue-eighty-six` | — | documents | — | — | — | — |
| N5 write funnel | — | — | **the point of it**: the nine transports stop each deciding how to write | not a tenth `save*`; private | lives in the store's logic | a ledger or filing refusal is loud, never a dropped field |
| N6 `RelatingMixin` | `thing:~` prints every relation and its meaning — the grammar documents itself | a relation's answer is runtime Stuff, not metadata | MQL calls one method on any holder; no `instanceof` | replaces `:members`; `GroupProvider` answers a different question (D-B9) | header: *keeps named sets it can be asked for*; only keepers compose it (host table) | answers per asker; a holder with no such set adds nothing, visibly empty |
| N7 built-in table | each built-in's one-line meaning is what `me:~` prints | — (grammar) | one table serves seed and scope | replaces two tables | sealed pipeline internal | built-ins checked first, structurally — a list can never mask one |
| N8 `via.relation`, `relations` | `contacts remove ~friends:x` says the list in the command | — | a verb reads a fact, never re-parses `.raw` | — | on the match, like `via.detailPath` | a `:~` query binds **nothing** and says so; no verb acts on the holder by accident |
| N9 `GrammarApi.name` | one rule for every verb is the requirement | — | every non-Stuff matcher calls the same entry | the scorer is moved, not copied; `scope-walk` keeps no second copy | `GrammarApi` already owns articles, ordinals, plurals | a tie is returned as a tie; never a first-match pick |
| N10 `named()` | the prompt and the refusal are the same lines on every verb | — | — | beside `promptForObject`, which prompts among Stuff; this prompts among entries | controller I/O | asks on a tie; picks only when one answers |
| N11 query aliases | `alias list` prints them; removable | — | — | same mixin, same table, one more position | header widens from *verb-position substitution* to *the words a player may respell* — stated in the mixin header in B3 | expansion is echoed (`expandedText`), as verb aliases are |
| N12 duration keys | the view states granularity and bounds; `help` prints them | — | — | one slot type replaces five parsers | the binder owns arg coercion | out-of-bounds is refused with one line, never clamped |
| N13 `named`, `parentOf` | — | — | — | `byWord` becomes the unique-word case of `named` | on the catalogue base | — |
| N14 reason rows | the rows are the words | rows | — | — | — | — |
| N15 gates | — | — | — | `lint:typed-words` is replaced, not kept beside | — | — |
| `Perceptible` on six Ideas | — | they stay Ideas because they have behavior and live state (traits slate rule 3 separates them from documents) | — | — | header: *what words find me* — exactly the use | — |
| `Named` on Locality / Organization | — | — | — | `Organization`'s own `name` field is deleted, not kept beside | header: proper names only — an instance may leave it empty | an unnamed instance is its short description; nothing synthesizes a name |

---

## Plan-level decisions

### Stage A

**D-A1 — One value class, ten fields.** `DocumentKind` is built from a `kind`
document's data: `traits: { shipped?, catalogued?, keyworded?, titled?,
dated?, filed?, paper?, ledger?, tree?, secret? }` plus `fields:`. The trait
names are a closed const in that file; each trait's parameters are parsed in
`DocumentKind.fromData`, which throws on an unknown trait or parameter. Pure
methods only: `cardOf(path, data)`, `titleOf`, `keywordsOf`, `dateOf`,
`fieldFailures(data)`, `ledgerFailures(before, after)`, `filedBy()`,
`isSecret()`, `shippedAt()`, `servedBy()`. No statics that hold state.

**D-A2 — The card is data.** Today's `keys` functions become an `index:` on a
field of the `fields:` schema (`outputTemplate: { type: string, index: output }`),
`dated: { indexed: true }` writes `keys.date`, and `keyworded` writes
`keys.word` (every derived keyword, lowercased). `release`'s `pinned` and
`releaseId` are indexed fields. No derivation function survives.

**D-A3 — Declarations are resident, as `DocumentApi`'s need.** Every write and
every paper read asks its kind, synchronously, so `DocumentKindCatalogue` is
declared in `DocumentApi`'s `static readonly needs` and stood at boot by the
existing routine (one `listOfKind('kind')`). This is the sanctioned rung for
*the kernel's own built-in citations*, not a `boot:` list entry. A kind
declared at runtime enters through the same `save` and the catalogue's own
`forget`. The catalogue indexes by leaf (`byName(kind)`); the declaration of
`kind` itself is a constant on `DocumentKind` (`shipped: { dir: kinds }`,
`catalogued: { load: boot }`, `keyworded: { unique: true }`, `titled`).

**D-A4 — One write funnel.** A private `writeDocument({ kind, path, owner,
data, by })` in `DocumentLogic` is the only code that constructs or saves a
`StoredDocument`. In order: kind declared (else `document-kind-undeclared`) →
`by` matches `kind.filedBy()` (plain `save` on a filed kind refuses
`document-filed`, naming the transport) → `fieldFailures` → catalogue `parse`
when the kind is catalogued → `ledgerFailures` against the stored row →
`unique` keyword check → card → save → `catalogue.forget([path])`. The nine
transports keep their own authority checks and path schemes and then call it.
`StoredDocument.save()` stops deriving the card; `StoredDocument` stays
kind-agnostic. The installer's bulk row builder calls `kind.cardOf` directly.

**D-A5 — The installer trio comes off declarations.** `PackLogic` reads every
pack's `kinds/` first (a duplicate leaf anywhere is refused naming both; a
pack shipping documents of a kind it neither declares nor `requires` the
declarer of is refused), then documents. `activeDocumentKinds`,
`DOCUMENT_VALIDATORS`, `GATED_DOCUMENT_KINDS`, the `invalidateDocumentKind`
switch and the four `command-view` special cases retire: shape is
`fieldFailures`, meaning is the catalogue's `parse` (`ServesDocuments` gains
an optional `parse`), going live is `forget`, and `command-view` is
`shipped: { in-tree: cmd }` + a `catalogued` service whose `forget` reloads
the view. The five `fromData` validators are deleted.

**D-A6 — `catalogued.by` is checked like a `controller:`.** A path, resolved
with the same class-file rule at install and at a live edit; a kind whose
service does not resolve is refused. `load:` is `per-path` · `whole` · `boot`
and says only how the catalogue fills — never an instruction to the installer.

**D-A7 — Reserved dirs derive from `shipped` only.** `NON_TEMPLATE_DIRS` in
`S/lib/paths.ts` shrinks to the four non-document dirs; the installer passes
the shipped-dir set it read from the declarations. Scripts read
`content/kinds/*.yaml` off disk through `scripts/pack-roots.ts` (one new
reader method there, where every gate's shared reader already lives) —
`check-template-census`'s hand copy and the per-kind lints' hard-coded dirs go.

**D-A8 — Live-edit and removal refusals are structural.** Saving a `kind`
document whose new declaration existing documents fail is refused naming
them: `fields` and `unique` are re-checked over `listOfKind`; **turning on or
changing `filed` while any document of the kind exists is refused outright**
(they were written by some other path by definition — no stamp is needed).
Deleting a declaration is refused while any document of the kind exists with
no `sourcePack` (`kind-in-use`).

**D-A9 — The reset becomes `keep`.** With undeclared kinds refused, every row
in `documents` is of a declared kind, which is exactly the set the reset
already keeps. `documents.yaml`'s `reset:` becomes `verb: keep` with that
reason; `KEEP_DERIVATIONS` loses its one entry; `pnpm gen:schema`. This also
removes the last static reader of the closed table.

**D-A10 — Game time for release and edition, expiry included.**
`publishedAt` → `publishedAtS`, `frozenAtMs` → `frozenAtS`, and because they
are compared against it, `expiresAt` → `expiresAtS` and `validUntilS` stays.
Expiry does not become a trait (non-goal); only its unit moves. The front
door and the ticker render the date through the Timekeeping display seam.

**D-A11 — `venue-eighty-six` is declared plain.** A platform kind with
`titled` and no `filed` unless the build finds the enforcing brain holds a
live `Business` to file through, in which case `filed: business`. The
swallowed-denial `try/catch` at `enforces.ts:151` stays a logged skip.

**D-A12 — `water-right` files through its register.** `WaterRightRegistry`
composes `Registrar` and writes with `saveToRegister`; its path scheme moves
under the registry's own branch if it is not there already (no migration —
dev data is dropped).

### Stage B

**D-B1 — The grammar.** The lexer gains `~` and `@`. A head `~name` is
`me:~name`; `~` after a `:` asks the left side; a bare `:~` asks for the
listing. At the **start of a query only**, `~` alone or `~/…` is a home path,
desugared to the path seed `/home/<asker>[/…]`. `@<id>` is a head-only address
resolving the loaded avatar whose identity path is
`/platform/agent/Avatar/<id>` (D17's identity, never lineage). MQL still gives
`::` no meaning. `me` stays a pronoun; `here`, `it`, `them`, `him`, `her`,
`$$`, the seven seed words and `:members` leave the grammar in B3.

**D-B2 — One table for built-ins, in the sealed subdir.**
`api/mql/relations.ts` declares each built-in as `{ name, meaning, whose,
members(left, asker), pool?(left, asker) }`. `whose: 'anyone'` for `~here`
and `~inventory` (under the gates `:e` and `:i` already apply); `'self'` for
`~peers`, `~reachable`, `~person`, `~horizon`, `~it`, `~them`, `~him`,
`~her`, `~last` — asked of anyone else they answer empty. Built-ins are
consulted **before** the holder, so masking is impossible by construction.

**D-B3 — View scopes behave exactly as today; only the spelling changes.**
The seed table and the scope table already disagree about `here` and
`inventory` (Grounding). The merged table keeps that difference **declared**:
`members` is what a query gets (`~here` is the place), `pool` is what a view
`scope:` searches (`~here` is what is to hand there — today's
`candidatesForHere`, tract and vessel surface included). A relation with no
`pool` uses its `members`. So `scope: ["here","peers","person"]` becomes
`["~here","~peers","~person"]` with identical candidates, and `look ~here`
shows the room. Each built-in's `meaning` line states both when they differ.
A scope entry that is a kept relation (`~contacts`, or a chain ending in one —
`~reachable:[class.CharterBook]:~ships`) contributes its members and nothing
else; the neighborhood walk of the slow path does not apply to it.

**D-B4 — `thing:~` binds nothing and carries a fact.** The result has no
matches and `relations: [{ holder, name, meaning, builtin }]`. `query` and
`look` print it (one shared line-builder on `CommandController`); every other
slot gets the refusal row `names-relations`, pointing at `query <what you
typed>` — the `too-many` precedent. This is the one touch on `look` in the
build.

**D-B5 — The protocol.** `RelatingMixin` adds `relationsFor(asker):
RelationInfo[]` and `relatedBy(name, asker): Stuff[] | null` (`null` = this
holder keeps no such set for this asker). A contributor whose relation names
are fixed (`ships`, `rooms`, `party`, `contacts`, `nodes`, `apps`) also lists
them with their one-line meanings in a `static relations` declaration, read
along the prototype chain as `static defaultAliases` is — that is what
`thing:~` prints for them and what a lint can check a view's `scope:`
against; a dynamic name (a contact-list label) comes from the method alone.
Contributing mixins require it
beneath them and chain with a typed `super` call (the `getKeywords` fold in
`S/lib/description/Detailed.ts:234`, but typed by `MixinConstructor<Relating>`
rather than a prototype probe). Synchronous: a holder answers from what is
resident and never loads. A multi-thing left side asks each, unions and
dedupes by `(stuff, via)`.

**D-B6 — A match through a kept relation says so.** `via.relation = { holder,
name }`. `contacts remove` reads it to know which list; nothing reads `.raw`.

**D-B7 — Query aliases.** `AliasEntry` gains `at: 'verb' | 'query'`; `alias
set --query here ~here`. `ShellApi.expandQueryAliases(text, giver)` rewrites a
query's **head word** when the whole query is that word or it is followed by
`:`; the binder calls it for every `object` / `objects` slot and for the
selector's source, never for a view's authored `scope:` or `default:`.
Defaults ship as `static defaultAliases` on the mixin layers that already
carry defaults or own the thing aliased: `it`, `them`, `him`, `her` on
`FocusedMixin` (`S/lib/command/Focused.ts` — it owns the pronoun memory) and
`here` on `MobileMixin` (beside the direction aliases). Each is removable
with the existing tombstone. `$$` is not
re-offered: `~last` is short enough.

**D-B8 — The selector.** Token 0 splits at its first `::` outside quotes:
left is the source query, right the verb. `ParsedCommand.scope` is unchanged
downstream. `format()` and `carryScope` re-emit `source::verb`. A token with
an empty side is not a split. `verb@source` is no longer recognized: `wind@watch`
is an unknown verb and the refusal says the new spelling once.

**D-B9 — Relations do not replace `GroupApi`.** A `GroupRef` answers durable
membership (offline people, access control, async); a relation answers *who of
these is reachable now*, as Stuff. They are different questions and both stay.
What retires is **notify's** use of `GroupRef` strings: a `NotifyRule` is keyed
by a relation name of the viewer (`~friends`, `~party`) or a reserved
pseudo-subject, and `matchesRule` is `person ∈ viewer.relatedBy(name, viewer)`
— synchronous, so the `excludeMql` cost carve-out goes with it. The `mql:`
provider's own queries lose `online` (they run in system mode; the build
greps and respells them).

**D-B10 — `online` leaves completely.** The seed, the scope, `SEED_WORDS`'
entry, and `api/mql/online-provider.ts` / `online-wire.ts` if the build finds
no consumer outside the retired seed. System mode keeps `world`, paths and ids.

### Stage C

**D-C1 — The naming rule's home is `GrammarApi`.** It moves there whole:
`TIER_*`, `scoreTier`, `scoreKeywords`, and the whole-phrase cut as
`GrammarApi.rank(entries, words)`; `pluralWord` becomes public so an entry
with no Stuff behind it answers to its plurals. `scope-walk.ts` keeps
`candidateFor`, the facets and attribution, and calls `GrammarApi` for the
score. `GrammarApi` stays logic-free statics (it has no logic singleton and
the scorer is pure).

**D-C2 — One entry for everything that is not Stuff.**
`GrammarApi.name<T>(text, entries: ReadonlyArray<{ value: T; keywords:
readonly string[]; title: string }>): NameAnswer<T>` — strips a leading
article, reads a leading ordinal, treats a quoted phrase as phrase-tier only,
adds plurals, ranks, and returns `{ one }`, `{ tie: [...] }` (in entry order;
an ordinal picks from it) or `{ none, offered: titles }`. It never prompts and
never refuses — that is I/O.

**D-C3 — The I/O half is one helper.** `CommandController.named(context,
answer, noun)` returns the value, or prompts with the entries' titles on a
tie (a number picks), or refuses with `no-such-name` listing what could have
been named. A script never prompts (the existing D23 rule): a tie is the
refusal.

**D-C4 — Who supplies candidates is never the rule's.** A holder exposes one
method per list it keeps — `quayNamed(text): NameAnswer<Quay>` — whose body is
its entries mapped to `{ value, keywords, title }` and one `GrammarApi.name`
call. A method that lower-cases, strips an article or compares by hand is
what `lint:hand-matchers` counts.

**D-C5 — Destination by what the entry is** (§ 7, as a decision procedure for
the ~95 sites):

1. The entry is **runtime Stuff in reach** → an `object` slot, plain MQL.
2. Runtime Stuff a **holder keeps** (ships in a book, a card's nodes, a
   device's offered apps, a warren's rooms, your people) → the holder
   composes `RelatingMixin`; the view's `scope:` is the relation.
3. A **document** → its kind is `keyworded`; `DocumentCatalogue.named(text,
   among?)`.
4. An **Idea** → it composes `PerceptibleMixin`; its catalogue holds live
   objects and names them through `GrammarApi.name` over `getKeywords()`.
5. **Not yet made**, or a **holder's own part** → the holder's method (D-C4)
   over authored words; nothing becomes `Visible` to carry a description.
6. A **collection record** → named by its chosen proper name through
   `GrammarApi.name` with the name as its only keyword; candidates by
   relation (yours) plus the published directory.
7. A **label a player gave** → its holder's method (D-C4).
8. A **fixed vocabulary** → `type: enum` on the view; out of the census.
9. A **search** (`help search`, `who --country`) → untouched.

**D-C6 — One duration slot, game time.** `type: duration` returns **game
seconds**, accepts `90s`, `15m`, `1h30m`, `2 hours`, `a week`, `two days`,
`7 days`, and takes `granularity:` (`minute` · `hour` · `day`), `min:` and
`max:`. A value off the granularity or out of bounds is the one refusal row
`bad-duration`. It is usable as a positional (`rent canoe for a week`). The
five parsers retire; `press --for` and `Interpreter`'s `wait` / `every` move
to the same reading. (See Q4 for the stream verbs.)

**D-C7 — `buy` targets the good.** `thing` becomes `type: object` scoped to
the contents of the sellers in reach (`scope:
["~reachable:[mixin.ForSaleMixin]:i"]`); `at <seller>` is an optional object
slot the controller narrows by and refuses on, naming the seller. `ForSale`
loses `offers(word)` and `sellerFor(word)` and `sell` takes the bound good.
When nothing on any counter answers, the sellers here are asked in turn for
`offerNamed(text): NameAnswer<Offer>` — the holder's device for what is not
on the shelf (a yard's hulls, a boat sold where she lies, a pooled line whose
real exemplars supply the keywords) — and with none, the nearest seller's own
refusal row. `Stock.lineForWord`, `pricedKeyFor`, `resolveBuy` and the
`counter.raw` sniff are deleted. Goods that are alike in every way the sale
cares about (same template, same seller, same price) are one choice; a prompt
appears only when sellers or prices differ.

**D-C8 — `call`'s name test moves onto the animal.** The hearer answers
`answersToCall(text)` with `GrammarApi.name` over its own name and keywords;
`CallController`'s matcher and `Archetype.answersTo` go. `hail` is untouched.

**D-C9 — Organizations are reached by relation.** The premises you stand in
and the businesses you belong to answer as relations of `me` (`~employers`,
contributed by the employment mixin on the person) and of the place
(`~business`); `job apply dave's bar` binds through them. A path remains an
address. `EmploymentLogic.findOrganizationImpl` / `needleOf` / `namesItself`
retire; there is no global name search.

**D-C10 — The census gate.** See *Test & gate strategy*.

---

## ⭐⭐ Host placement

| what | host | what composing it claims about the rest of that host's composers |
|---|---|---|
| the ten traits | fields of `DocumentKind` (a value class) | nothing — a kind turns on only what it declares; no document carries a trait its kind did not name |
| kind declarations | documents of kind `kind` at `<root>/kinds/<leaf>` | each pack owns its own; the platform pack declares the platform's |
| `RelatingMixin` | **only things that keep a set**: the avatar family (beneath `ContactsMixin` and `PartyMember`), `Warren` (`~rooms`), `CharterBook` and the harbor's register book (`~ships`), the travel credential (`~nodes`), `AetherHostMixin`'s hosts (`~apps`), the employing person and the business premises (D-C9) | every composer answers at least one relation by construction — the contributing mixin is what pulls it in. **It is not on `Stuff`, `Thing` or `Idea`.** A loaf composes nothing and `loaf:~` lists only the built-ins that apply to it |
| built-in relations | the table in `api/mql/relations.ts`, each with a `whose` | not a field on any host. `~here` applies to anything contained, `~inventory` to any container, the rest to a perceiving body asking about itself — the same domains the seeds had. No host gained a member |
| contact-list relations | `ContactsMixin` (the lists are its own) | every Contacts host has lists; `~contacts` is their union |
| `~party` | `PartyMember` | every party member has a party |
| `via.relation`, `relations` | the MQL match / result | — |
| query aliases | `AliasMixin` (already on `Shell` only) | NPCs without a shell do not carry it; unchanged |
| the naming rule | `GrammarApi` statics | — |
| `named()` | `CommandController` | every controller may name an entry; it is I/O, like `refuse` |
| `PerceptibleMixin` | `Spell`, `Reading`, `Condition`, `Lane`, `Species`, `App` — each class directly | each is named by a player by word today through a private matcher; every instance answers yes |
| `NamedMixin` | `Locality`; each class that composes `OrganizationMixin` (not the mixin itself) | **the quiet-default test:** many localities and organizations have no proper name. That is the ruling's stated intent — the name is empty and the short description stands — and it is why `NamedMixin` goes on these three families and **not** on `Idea`. `Brand` already has it |
| `answersToCall` | the class that hears a call today (the hearer `CallController` iterates) | only callable animals |
| holder name methods (D-C4) | each holder, one method per list it keeps | a holder with no list gains nothing |
| duration keys | the view slot | only `type: duration` slots may carry them (`lint:view-keys`) |

**Narrowing guards found and written down rather than coded:** none are
introduced. Two existing ones are removed: `flatMapMembers`' `instanceof
Warren`, and `BuyController`'s `isForSale` + raw-text sniff.

**Rejected placements:** `relationsFor` on `Stuff` (an honest default
answering "none" on nearly every object — the river's pools); `NamedMixin` as
the keyword vehicle for Ideas (ruled out; proper names only); a `Visible`
Idea to carry an entry's description (ruled out); a per-kind class a document
hydrates into (ruled out).

---

## Convention conformance

Checked against the tree at plan time.

- **`props:` / `cast:`, Locations not rooms** — no new place, no new row
  placement.
- **Namespace** — kind declarations at `<root>/kinds/<kind>`; `kinds` is a
  document dir, so no class lives there. New classes: two catalogues at
  `/platform/idea/…` (instanceable singletons), one mixin and nothing else in
  `lib/`.
- **Module categories** — value class (`DocumentKind`), mixin (`Relating`),
  sealed-subdir pipeline internal (`api/mql/relations.ts`), Api statics
  (`GrammarApi`), Api logic (`DocumentLogic`, `PackLogic`, `CommandLineLogic`,
  `ShellLogic`, `SocialLogic`), catalogues (Stuff singletons), controllers,
  command YAML, reason rows, scripts. **No new category, no exported free
  helper, no `eslint-disable`.** A pack gains only `kinds/*.yaml`, view edits
  and methods on its own classes — no Api, no logic singleton.
- **Api ↔ logic split** — untouched. `GrammarApi` has no logic singleton today
  and gains pure statics only; if `lint:thin-forwarder` or a sibling gate
  objects, the answer is a `GrammarLogic` at `/platform/idea/api/grammar`,
  not an exemption.
- **Module scope declares** — the built-in relation table and the trait const
  are `const` declarations; nothing registers at import.
- **Import boundary** — `lib/` and `platform/` reach the naming rule through
  `GrammarApi`; nothing new imports `api/mql/**`.
- **Verbs on objects** — a holder names its own entries; `GrammarApi.name`
  takes strings and entries, never a world object as first parameter
  (`lint:object-verbs` stays at 0).
- **P3 refuse / skip / throw** — undeclared kind, filed kind by plain save,
  altered ledger, kind in use, bad duration, no such name: refusals with
  reason rows. A relation the holder does not keep: a skip (empty, visibly).
  A `DocumentKind` asked for a trait parameter it never parsed, or a transport
  calling the funnel with a `by` it does not own: typed throws.
- **P4 no duck typing** — MQL narrows with `MixinApi.isRelating`; packs
  compose the kernel mixin by package specifier. No `?.()`.
- **P5 the mixin decides** — the holder resolves and answers `NameAnswer`;
  the controller calls `named()` and renders. `buy`'s seller is where the
  good lies; the controller asks nothing.
- **P6 persistence per content** — no class gains persistence. Contact lists,
  notify policies and aliases persist where they already do. Kind
  declarations and filed records are documents.
- **P7 load on use** — relations answer from residents and never load;
  catalogues fill per their `load:`; the one boot stand is the kind catalogue
  as an Api need (D-A3), justified there.
- **P8 names** — `Relating` (a participle, like `Carrying` / `Placing`);
  `DocumentKind` (what it is); `keyworded`, never `named`, so the trait is
  never read as `NamedMixin`; American spellings throughout.
- **Gates this build must pass** — `lint:family` whole, with particular
  attention to `view-keys` (duration keys, reviewed addition), `one-word`,
  `command-views`, `schema` (after `gen:schema`), `instanceable`,
  `mixin-names`, `mixin-clusters`, `data-ideas` (must not rise — nothing here
  is a data-only Idea), `lib-statics`, `object-verbs`, `imports`,
  `module-scope`, `duck-typing`, `silent-catch`, `reason-rows`,
  `template-census`, `untitled-paths`, `test-bootstrap`, and the three this
  build adds or extends. **No ceiling rises**; a count that would rise gets a
  caller audit and a redesign, per `lint-family.md` § ratchet lesson 4.

---

## Waves

Seventeen waves, A then B then C. Each ends at one `build(naming-overhaul
W<id>): …` commit with `pnpm test:near`, the touched packs' vitest and
`pnpm -C packages/server lint:family` green. Each is landable on its own: the
tree works after every commit. **B4 (rename reaching content):** every wave
that renames a key, a scope word or a field greps `packages/content`,
`packages/wire`, `e2e` and `docs` before it commits. The wire drive file grows
with the waves — each wave adds the steps it makes true.

### Stage A — documents

**A0 — Declarations exist and agree with the closed table.**
*Decisions:* D-A1, D-A2, D-A3.
*Files:* new `S/lib/document/DocumentKind.ts`; new
`S/platform/idea/DocumentKindCatalogue.ts` + `DocumentApi.kinds()` and the
`needs` entry in `S/api/document.ts`; `kinds/<kind>.yaml` for all 42 kinds and
`venue-eighty-six` in their owning packs (Grounding § who owns which kind;
everything else in `C/platform/content/kinds/` (→ `/platform/kinds/<kind>`)); `PackLogic` reads `kinds/` first; new
`packages/server/scripts/check-document-kinds.ts` + the `lint:document-kinds`
script (every declaration parses; one declaration per leaf; `catalogued.by`
resolves; no two kinds share a shipped dir; a pack's document dirs are all
declared by it or a pack it requires).
*Acceptance:* a parity test asserts every declaration equals its
`DOCUMENT_KINDS` entry (dir, ext, vanish, catalogue, word and key
derivations on sample data). Nothing yet reads a declaration for behavior.
*Commit:* `build(naming-overhaul WA0): kind declarations beside the closed list`.

**A1 — The readers flip; the closed list is deleted.**
*Decisions:* D-A4, D-A5, D-A6, D-A7, D-A9.
*Files:* `DocumentLogic.ts` (the funnel; `catalogueForImpl`; the
`command-view` branches); `StoredDocument.ts` (`cardOf` and the `save`
override go); `PackLogic.ts` (the five retirements of D-A5);
`S/lib/paths.ts`; `CmsLogic.ts:25,60,561`; `ScriptLogic.ts:37,403`;
`ResetPolicy.ts`, `gen-schema.ts`, `schema/documents.yaml`, then
`pnpm gen:schema`; catalogues declared for `recipe`, `archetype`,
`help-concept`, `blueprint`; new `NameBankCatalogue` and the deletion of
`NameBank`'s static cache; `ServesDocuments.parse?`; the command and soul
catalogues' `forget`; scripts `check-typed-words` (deleted, replaced by A0's
gate), `check-untitled-paths`, `check-template-census` (the hand copy and
`DOCUMENT_PATH_FIELDS`), `check-aromas`, `check-doneness`,
`check-menu-staff`, `check-reachability`, `check-reason-rows`,
`check-placement-words`; the three tests named in the grounding; the
comments at `C/trade-tailoring/src/thing/MeasureBook.ts:12` and
`S/lib/storage/Receipt.ts:6`; delete `DocumentKinds.ts` and the parity test.
*Acceptance:* a CMS save of a recipe, an archetype, a help concept, a
blueprint and a name bank is read back changed with no restart (unit, per
catalogue); a pack fixture with a `maps/` template folder installs its
templates; writing an undeclared kind is refused `document-kind-undeclared`;
`grep -r DOCUMENT_KINDS packages` is empty.
*Commit:* `build(naming-overhaul WA1): kinds are declared — the closed list is gone`.

**A2 — Filed, ledger, secret, and the two refusals.**
*Decisions:* D-A4 (the `by` check), D-A8, D-A11, D-A12.
*Files:* `DocumentLogic.ts` (each transport passes its `by`;
`BUSINESS_DOCUMENT_KINDS` and `saveToRegister`'s declared check go; plain
`save` refuses a filed kind; `list` / prefix scans and the CMS tree skip a
`secret` kind); `DocumentKind.ledgerFailures`; `DocumentKindCatalogue`'s
edit and delete vetting; `C/water/src/idea/WaterRightRegistry.ts`;
`S/lib/behavior/enforces.ts`; `CmsLogic.ts` (the tree); the declarations'
`filed:` / `ledger:` / `secret:` lines; reason rows.
*Acceptance (unit):* a plain save over a herd path refuses naming the
register and `draft` still files; rewriting an earlier bore-log line refuses
and an append lands; an edition and a rate card cannot be saved twice at one
path; `ls` of the stream-token branch is empty and an exact-path read works;
turning `unique` on for `form` with two forms sharing `brick` refuses naming
both; deleting `herd`'s declaration with a filed herd refuses.
*Commit:* `build(naming-overhaul WA2): filed records, enforced ledgers, secret kinds`.

**A3 — Titled, dated, paper, tree, keyworded.**
*Decisions:* D-A2, D-A10.
*Files:* `DocumentLogic.pagesOfImpl` (the switch becomes: secret → null;
`paper.template` through `ProseApi`; else the summary line of `titleOf` +
`dateOf`); `summaryLine`'s field guess goes; the instrument's template over
its real fields; `ls` prints titles; `DocumentCatalogue.parentOf` /
`nearest` and the aroma, topic and reason walks that become them; release
and edition fields and every reader (`S/lib/press/Release.ts`, the press
logic and ticker, the front-door REST read, `Edition.ts`,
`freezeEditionImpl`, the client's release date); `keyworded` on the
declarations and `keys.word` on the card; `unique` enforced in the funnel
and at install (`formation`, `emote`).
*Acceptance (unit):* an instrument reads as pages with its history; a ship
register's pages are one line per entry with title and date; a release's
date renders in game time; `FormationCatalogue.pathOfWord` still resolves
through the card; two packs may ship a recipe with the same word.
*Commit:* `build(naming-overhaul WA3): every document has a title, a date and a page`.

### Stage B — MQL anchors

**B0 — `source::verb`.**
*Decisions:* D-B8.
*Files:* `CommandLineLogic.ts:275–295,384`; `ShellLogic.ts:164`;
`CommandGiver.matchAffordances`' callers if they format a selector; every
`verb@source` in `packages/content` (help text, examples), `packages/wire`,
`e2e`, tests, `docs/subsystems/command-parsing.md`, `command-routing.md`,
`shell-alias.md`.
*Acceptance:* `watch::wind`, `me:i:watch::wind`, `"pocket watch"::wind`
dispatch; an alias keeps the source (`ww::` forms per shell-alias.md's three
cases); `wind@watch` is refused with the new spelling; `format()`
round-trips.
*Commit:* `build(naming-overhaul WB0): the affordance selector is source::verb`.

**B1 — Relations in the grammar, beside the old words.**
*Decisions:* D-B1, D-B2, D-B3, D-B4, D-B5, D-B6.
*Files:* `S/api/mql/lexer.ts`, `parser.ts`, `types.ts`, `resolver.ts`, new
`S/api/mql/relations.ts`; new `S/lib/relation/Relating.ts` and
`Mixins.Relating` in `S/lib/mixin.ts`; `MixinApi.isRelating`; the
relation-listing line-builder on `CommandController`; `QueryController` and
`LookController` (the one branch); the `names-relations` reason row.
`resolveKeywordSeed`, `resolvePronoun` and `candidatesForScopePart` become
lookups in the table — the old spellings still resolve through it in this
wave, so nothing in content changes yet.
*Acceptance (unit, in the mql tests):* `~here` ≡ `here`; `~inventory`,
`~peers`, `~reachable`, `~person`, `~horizon`, `~it`, `~last`; a bare
`~x` ≡ `me:~x`; `me:~` lists every built-in with its meaning; `@<id>`
binds a loaded avatar and nothing for an unknown id; `~/workroom` and a
bare `~` resolve as paths, and `x:~/y` is a parse error; a list of two
holders unions and dedupes; a `'self'` built-in asked of another answers
empty.
*Commit:* `build(naming-overhaul WB1): relations — one table, one protocol`.

**B2 — The holders answer.**
*Decisions:* D-B5, D-B6.
*Files:* `S/lib/social/Contacts.ts` (`~contacts` pending Q1, one relation
per label, and the warning when a label equals a built-in's name);
`S/lib/party/PartyMember.ts` (`~party`); the `Warren` base (`~rooms`;
`flatMapMembers` and the `members` chain word are deleted, its three uses
respelled); `S/platform/thing/CharterBook.ts` and
`S/platform/thing/RegisterBook.ts` (`~ships`, from residents); the travel
credential in `C/tpa/src/` (`~nodes`); `S/lib/augmentation/AetherHost.ts`
(`~apps`); `P/cmd/work/charter.yaml` (`ship` becomes an object slot scoped
to the book's `~ships`), the teleport and `apps` views likewise.
*Acceptance (unit + the pack vitests):* `me:~friends:iffy` binds a loaded
friend in another room with `via.relation.name === 'friends'`; another
player's `@<you>:~friends` is empty; a list named `inventory` is created
with the warning and `@<you>:~inventory` is still the carried things;
`book:~` lists `~ships`; `warren:~rooms` equals the old `:members`.
*Commit:* `build(naming-overhaul WB2): contact lists, parties, books, cards and warrens answer`.

**B3 — The sweep: every seed word and scope becomes `~`; `online` goes.**
*Decisions:* D-B3, D-B7, D-B10; Q1.
*Files:* every view `scope:` and `default:` in `packages/content` (~460 +
~150 lines, mechanical: a scope word gains `~`; `$focus`, `subject`, `self`,
paths and `me:…` chains are unchanged); the 23 `online` views (per Q1);
`S/lib/shell/Alias.ts`, `S/api/shell.ts` + `ShellLogic.ts`
(`expandQueryAliases`), `AliasController` and `P/cmd/shell/alias.yaml`
(`--query`), the binder call sites in `CommandLogic.ts` (the two object-slot
loops near 1722 and 1989, and the selector's source); the default aliases;
then the removals in `resolver.ts`, `lexer.ts`, `parser.ts`, `types.ts`
(`PronounName` keeps `me`; `SEED_WORDS`, the `here` / `it` / `them` / `him` /
`her` pronoun nodes, `$$`, the `[keyword.x]` seed escape);
`online-provider.ts` / `online-wire.ts`; the `mql:` group provider's
queries; every query string in `packages/server` tests, `packages/wire`,
`e2e`, `tools/` and scripts; `docs/mql-grammar.md`, `docs/subsystems/mql.md`.
*Acceptance:* `look here` and `look ~here` both show the room and `alias
unset --query here` makes `here` an ordinary word; `get it` works through the
alias; `dm <stranger>` refuses saying how to reach them and `dm @<id> hi`
arrives; `goto ~/workroom`; `grep -rE "scope:.*\bonline\b" packages/content`
is empty; `lint:view-keys`, `lint:command-views`, `lint:one-word` green; the
mql and binder suites green on the new spellings.
*Commit:* `build(naming-overhaul WB3): seeds are relations; online is gone`.

**B4 — Notify and contacts over relations; the id is visible.**
*Decisions:* D-B6, D-B9; Q2, Q3.
*Files:* `S/lib/social/NotifyRule.ts` (`groupRef` → `subject`),
`NotifyPolicy.ts`, `SocialLogic.ts` (`matchesRule`, `canonicalReservedRef`,
`isMqlRef` and `excludeMql` go), `NotifyControllerBase.ts` (`normalizeRef`
goes), the `notify` views; `ContactsRemoveController.ts`,
`ContactsControllerBase.ts` and `P/cmd/social/contacts.yaml` (`remove`
takes an object slot scoped to your lists and reads `via.relation`);
`WhoController` and the profile card print `@<id>`;
`docs/subsystems/social-graph.md`, `contacts.md`, `grouping.md`.
*Acceptance:* a rule on `~friends` fires when a friend arrives and not for a
stranger; `notify contacts:…` is refused with the new spelling;
`contacts remove ~friends:<them>` takes them off that list and no other;
`who` shows ids. The Q2 and Q3 branches wait on the answers; the online path
is built regardless.
*Commit:* `build(naming-overhaul WB4): notify and contacts speak relations`.

### Stage C — one rule

**C0 — The rule moves; the census is taken and pinned.**
*Decisions:* D-C1, D-C2, D-C3, D-C10.
*Files:* `S/api/grammar.ts`; `S/api/mql/scope-walk.ts` (the tier constants
and `scoreKeywords` leave; `scoreTier` is re-exported from nothing — its
importers move to `GrammarApi`); `CommandLogic.walkScopes`' import;
`S/lib/command/CommandController.ts` (`named`); reason rows `no-such-name`;
new `packages/server/scripts/check-hand-matchers.ts` + `lint:hand-matchers`;
`check-controller-resolution.ts` gains the two counts; ceilings pinned to
the measured numbers, written into this plan under *Drive record*.
*Acceptance:* the mql scorer tests pass unmoved in meaning (they follow the
function to `GrammarApi`'s test file); a `GrammarApi.name` test table covers
article, case, word start, mid-word refusal (`plant` never finds `implant`),
plural, ordinal, quoted phrase, tie, none-with-offered.
*Commit:* `build(naming-overhaul WC0): the naming rule lives in GrammarApi; the census is pinned`.

**C1 — One duration.**
*Decisions:* D-C6; Q4.
*Files:* `S/lib/command/CommandDefinition.ts` (`parseDuration` → game
seconds, the word forms, the three keys and their load-time validation);
`CommandLogic.ts` (coercion, the positional two- and three-word forms, the
`bad-duration` refusal); `check-view-keys.ts`; `P/cmd/retail/rent.yaml` +
`RentController.ts` (`daysOf`, `DAY_WORDS`, `span`'s parsing half);
`P/cmd/device/fire.yaml` + `FireController.ts` (`parseHoldS`);
`S/api/stream.ts`, `StreamLogic.ts`, `StreamStartController.ts` and the
stream views; `P/cmd/system/press.yaml` and its controller (ms → game
seconds, with D-A10); `S/lib/script/Interpreter.ts:202`;
`docs/subsystems/quantities.md`, `command-spec.md`.
*Acceptance:* `rent canoe for a week | 7 days | 2 weeks`; `fire limekiln
for 90 minutes`; `for soon` and `for a while` give the identical line; a
`rent` of `90 minutes` refuses on granularity; the census's duration count
is 0.
*Commit:* `build(naming-overhaul WC1): one duration slot, in game time`.

**C2 — Documents by keyword.**
*Decisions:* D-C5 rule 3.
*Files:* `DocumentCatalogue.named`; `S/platform/idea/RecipeCatalogue.ts:103`
`findByKeyword` and `S/lib/craft/Recipe.ts:840` `matchesKeyword`;
`S/lib/craft/FormSpec.ts:145` (the form **word** only — the `holding N
unit` tail stays grammar); `PartyLogic.ts:568` (formation);
`S/lib/vitals/Operation.ts` + `OperateController.ts:71`,
`PrescribeController.ts:63`; `SoulCatalogue.ts:163,175,211` (the unique
word still dispatches without asking); `DocumentLogic.callUpImpl` (a name
through the rule, not a substring); the placement and form declarations'
`keywords:` fields; the keywords the drive needs on the entries it names.
*Acceptance:* `party adopt wedge` / `the wedge`; a `smile` still smiles; a
recipe verb takes article, plural and word start; two recipes sharing a
word prompt.
*Commit:* `build(naming-overhaul WC2): documents are named by their keywords`.

**C3 — Ideas by keyword; proper names; no keys.**
*Decisions:* D-C5 rules 4 and 2, D-C9.
*Files:* `S/platform/idea/magic/Spell.ts` + `SpellCatalogue.ts` (holds live
spells, the descriptor cache and `byName` go, an ambiguous name is a tie);
`S/lib/instrument/Reading.ts` + `ReadingCatalogue.ts:91`;
`S/platform/idea/Condition.ts` + `S/lib/vitals/Vitals.ts:695`;
`C/transport/src/idea/Lane.ts` + `LaneCatalogue.ts:250,297,320`; the
species class + `C/trade-forestry/src/lib/Stand.ts:322`;
`S/platform/idea/App.ts` + `AetherHost.ts:220,244`; `Locality.ts` +
`AddressRegistry.ts:188`; the `Organization` hosts +
`S/lib/employment/Organization.ts` (its `name` field goes) +
`EmploymentLogic.ts:409,450` + `RecordControllerBase.ts:79`;
`CorpoCatalogue.ts:171` + `CraftingLogic.ts:869` `resolveBrandKey`;
`S/lib/governance/Office.ts:93`, the org-path arguments of `clock`,
`job apply`, `job quit`, `house appoint`, the position keys,
`WalletUseController.ts:42`, `GroupControllerBase.ts:79`; the content rows
that carried `name:` on an organization or lacked keywords on a spell.
*Acceptance:* `cast Glowlight` and `cast glow`; `apps install Messages`,
`apps uninstall the messages`; `job apply <a business's name in words>` at
its counter; `lint:identity` green (a name key lands only where a class
holds one); no view arg's help asks for a path or a key.
*Commit:* `build(naming-overhaul WC3): Ideas answer to keywords; organizations are reached, not searched`.

**C4 — Retail.**
*Decisions:* D-C7.
*Files:* `P/cmd/retail/buy.yaml`, `BuyController.ts`;
`S/lib/retail/ForSale.ts`, `Stock.ts:407,434,529`, `HeldGoods.ts:219`, the
consignment shelf; `C/transport/src/thing/HullBook.ts:300`;
`OrderController.ts:60`, `OrderWordedController.ts:34`,
`S/platform/thing/Tariff.ts:282`, `S/lib/commerce/Menu.ts:113`;
`S/lib/storage/Store.ts:1315` `matchesGood`; `lint:counters`;
`docs/subsystems/retail.md`.
*Acceptance:* `buy loaf | loaves | a loaf`; with two sellers and rope only
at the second, `buy rope` buys there and `buy rope at <first>` refuses
naming the first; sold out, the shop's own line; eleven identical loaves do
not prompt; a hull is ordered at the yard by name.
*Commit:* `build(naming-overhaul WC4): buy targets the goods on the counter`.

**C5 — Lists not yet made, and a holder's own parts.**
*Decisions:* D-C4, D-C5 rule 5.
*Files (each matcher becomes one D-C4 method or an object slot):*
maritime — `C/transport/src/idea/Harbor.ts:218,232,529`,
`S/platform/idea/ExpanseNode.ts:96,212` + `S/lib/expanse/Expanse.ts:304`,
`C/water/src/idea/WatercourseCatalogue.ts:1509`,
`S/platform/idea/ShipRegister.ts:168`, `S/lib/location/HaulOut.ts:126`,
`S/lib/spatial/Line.ts:265`; crafting — `CarveController.ts:83`,
`RecipeCatalogue.ts:167`, `C/trade-carpentry/src/lib/PatternStock.ts:54`,
`FitController.ts:85,157,216`, `CraftingLogic.ts:4738`,
`C/trade-forestry/src/thing/Billet.ts:67`, `S/lib/craft/Butcherable.ts:292`
(no exemplar is cloned to read keywords — the cut's row words),
`S/platform/thing/Rope.ts:770`; ground —
`C/trade-mining/src/lib/Working.ts:580,1024`,
`C/trade-mining/src/idea/reading/GradeReading.ts:189`,
`C/trade-quarrying/src/lib/OpenWorking.ts:383,813`,
`C/trade-mining/src/thing/ClaimsRegister.ts:185`,
`C/water/src/thing/IceSheet.ts:157`,
`C/trade-ranching/src/idea/HerdRegistry.ts:367`,
`C/trade-ranching/src/idea/cmd/ranching/MoveController.ts:136`,
`C/residence/src/idea/PlatBook.ts:377`. **Left alone:**
`S/lib/expanse/Hailable.ts:47` and `HailController.ts:44,63` (signalling
slate); `C/transport/src/thing/Boat.ts:275` `paddleBy`,
`S/lib/mould/Mould.ts:1075`, `S/lib/material/Greenware.ts:211` (fixed
vocabularies — moved to `type: enum` where they are not already).
*Acceptance:* `charter hesper | the Hesper | HESPER`, a tie prompts, `2`
and `charter second <word>` pick; `sample north` samples, `sample northern
rock` refuses listing the faces; each touched pack's vitest green.
*Commit:* `build(naming-overhaul WC5): holders name their own entries`.

**C6 — Collection records, labels, and the social leftovers.**
*Decisions:* D-C5 rules 6 and 7, D-C8.
*Files:* `S/platform/idea/ChannelCatalogue.ts:219`,
`SubjectCatalogue.ts:130`, `S/lib/social/Group.ts:193`,
`PartyLogic.ts:615,632`; `S/lib/slot/Wardrobe.ts:124`,
`CockpitTerminalController.ts:89`, the wallet accounts;
`RouteController.ts:739,794,826`, `MapController.ts:85`,
`TeleportController.ts:385` + `C/tpa/src/lib/FastTravel.ts:425` (now B2's
`~nodes`), `GetController.ts:80`; `CallController.ts:162` +
`S/lib/archetype/Archetype.ts:692`; `PlayerLogic.ts:229`
`findAvatarByName` (its callers move to MQL or `@id`; the function goes if
none remain).
*Acceptance:* `chat join` by a word that begins a channel's name; an exact
unique name wins without asking; `call` an animal by name, with an article,
by a word start.
*Commit:* `build(naming-overhaul WC6): records and labels by the one rule`.

**C7 — Zero, and held.**
*Decisions:* D-C10.
*Files:* the remaining `.raw` re-reads (`Shape`, `Fell`, `Cut`,
`WorkedActController.ts:101`, `SampleController.ts:50`, whatever the census
still lists); both gates' ceilings set to 0 with the named exemption table;
the subsystem docs the requirements cross-reference, updated in place
(`document-store.md`'s closed-vocabulary section and its *written after it
loads ⇒ an Idea* limb restated in trait terms; `content-packs.md`;
`mql.md`; `mql-grammar.md`; `command-parsing.md`; `command-routing.md`
§ verb@source; `shell-alias.md`; `contacts.md`; `social-graph.md`;
`retail.md`; `presentation.md`; `quantities.md`); `docs/lint-family.md`.
*Acceptance:* `lint:hand-matchers` and `lint:controller-resolution`'s new
counts are 0 and hard; `help search harb` is unchanged.
*Commit:* `build(naming-overhaul WC7): the matcher census is zero and gated`.

**Then, in order:** push, open the MR ready, report the number; run
`pnpm test` once and the blocking drive once, alongside review; the browser
walk once.

---

## Reachability wiring

Five links per capability; each fails closed and silent.

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| declaring a kind | the CMS save / `DocumentApi.save` of kind `kind` | title over `<root>/kinds/` | the declaration document | the kind catalogue stands as `DocumentApi`'s need (D-A3); a runtime declaration enters through `forget` | the bootstrap `kind`'s own `fields:` schema |
| a filed write | the filing verb that already exists (`draft`, the register, the press) | unchanged | `filed:` on the declaration | the funnel reads the resident kind | the transport's `by` must equal `filedBy()` |
| an edit going live | CMS save | title | `catalogued.by` | the catalogue's `forget` — ⚠ a kind with a reader and no `catalogued` trait is the silent failure; `lint:document-kinds` cannot see a private cache, so A1's acceptance lists the five by name |
| a document as paper | `cat`, `read` | whoever holds or reaches the paper | `paper.template` or `titled`/`dated` | read by path | `secret` ⇒ never |
| a relation | any verb with an object slot; `query x:~` | none needed — the grammar | the holder's lists | **residents only**; an unloaded member is absent, visibly | `requires:` on the slot as today |
| a view scoped to a relation | `charter`, `teleport`, `apps`, the 23 | the view's `scope:` | the holder composes `RelatingMixin` — ⚠ a `scope: "~ships"` on a holder that never answers it binds nothing; `lint:command-views` gains a check that a kept-relation name in a `scope:` is declared by some mixin's static relation list | residents | `requires:` |
| a player address | any person slot | — | the avatar's identity path | loaded avatars | ⚠ **nobody can type an id they cannot see** — `who` and the profile card print `@<id>` (B4) |
| a query alias | `alias set --query` | `AliasMixin` on `Shell` | the alias table; defaults on `FocusedMixin` and `MobileMixin` | read at lookup | head word only (D-B7) |
| `source::verb` | every afforded verb | `matchAffordances`, unchanged | — | — | the split in `CommandLineLogic` |
| naming a non-Stuff entry | each verb in C2–C6 | unchanged | the entry's authored keywords — ⚠ an entry with no keywords answers only to its title; the drive's entries are checked by name | the holder's catalogue, per its `load:` | the slot stays `type: string`; the holder's method is the gate |
| a duration | `rent`, `fire`, the stream verbs, `press` | unchanged | the view's `granularity` / `min` / `max` | — | `lint:view-keys`; load-time validation of the keys |
| notify on a relation | `notify ~friends …` | unchanged | the stored subject | the viewer's own lists | the name must be one `me:~` lists |

---

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| every drive step behaves as written | steps 1–9 → A1–A3; 10–16 → B0–B4; 17–24 → C0–C7 |
| the same word forms work the same way on every naming verb; a tie is always asked | C0 (the rule), C2–C6 (every caller), C7 (the gate that holds it) |
| a word that names nothing gets a refusal saying what could have been named | C0 (`named()` + `no-such-name`), C2–C6 |
| no player argument requires an internal path or key | C3 |
| `me:~` and `thing:~` say what can be asked; nothing typed reaches at a distance except through a relation or an address | B1, B2, B3 |
| an edit to any catalogued document is live on the next read | A1 |
| a filed record cannot be written except by its keeper; a ledger never loses or changes an entry | A2 |
| every document prints; every in-world date is game time | A3 (C1 for durations) |
| nothing is written that a nightly reset will silently wipe | A1 (refusal), D-A9 |

Nothing is unmapped. Two criteria rest on owner questions: *reached through a
relation* for people (Q1) and for offline contacts (Q2).

---

## Test & gate strategy

**Unit tests** (beside the source, importing `test-bootstrap` where they
touch the wired runtime): `DocumentKind` (every trait's parse and refusals,
the card, ledger rules); the funnel (each refusal, each transport's `by`);
the installer over fixture packs (kinds first, duplicate leaf, undeclared
dir, the `maps/` template folder); each newly declared catalogue's go-live;
the MQL grammar table (B1's acceptance list); `RelatingMixin` per holder;
query-alias expansion; the selector split; `GrammarApi.name`'s table; the
duration slot; each holder method in C2–C6 gets a three-line table (article,
tie, none).

**What only the drive proves:** that the CMS edit reaches a player's `look`;
that a restart brings back contact lists, notify policies, kind declarations
and filed records; that `dm` crosses rooms through a relation; that the
harbor, the counter, the kiln and the put-in still work for a person.

**The census gate.**

- **`lint:hand-matchers`** (new, `check-hand-matchers.ts`) walks `S/lib`,
  `S/platform` and every pack's `src/` (not controllers — the existing gate
  has those; not `S/api/grammar.ts` or `S/api/mql/**`; not tests). It counts,
  per function or method:
  1. an **article strip** — a regex or slice removing a leading `the` / `a` /
     `an` from a string;
  2. a **hand compare** — a string parameter (or a value derived from one)
     lower-cased and then compared with `===`, `includes`, `startsWith`,
     `endsWith`, `indexOf` or a `find` / `some` over names, keywords, labels,
     titles, keys or path leaves;
  3. a **duration parse** — a regex or word table over time-unit words
     outside `CommandDefinition`;
  4. a **word-keyed lookup map** built from names (`new Map` keyed by a
     lower-cased name, like `SpellCatalogue.byName`).
- **`lint:controller-resolution`** gains two counts over the same controller
  set it already walks: (3) a `.raw` read on a bound argument anywhere but a
  refusal's facts or an echo; (4) a `.via` read of anything but a declared
  facet (`detailPath`, `bulk`, `region`, `relation`) or through
  `MqlApi.effectiveTarget`, plus a model string lower-cased or
  article-stripped in a controller.
- **Starting ceilings:** each count's number as the script measures it on
  the tree at C0, pinned in the script as a named `*_CEILING` constant with
  a dated comment, and recorded here. The hand census expects roughly 71
  matchers + 14 key lookups + 10 `.raw` re-reads; the rough greps in
  Grounding (40 article strips, 108 controller lower-casings, 216 `.raw`
  reads) bound it from above. **The script's number is the ceiling, not the
  estimate.**
- **The ratchet:** every wave from C1 lowers the constants in the commit
  that removes the sites (the script already prints *below the ceiling —
  lower it*). C7 sets them to 0 and removes the ceiling comparison in favor
  of a hard failure.
- **Exemptions** are a table in the script, each a file + symbol + the slate
  that retires it: `Hailable.answersTo`, `HailController` (two sites) →
  signalling-slate; `HelpCatalogue.search` / `typeaheadMatch`,
  `WhoController --country` → a search is not a name. Nothing else. A new
  exemption is a reviewed change to that table, never an `@internal`.
- A census that undercounts is the failure mode: C0 checks the script
  against ten sites from the grounding list by name and fails the wave if
  any is missed.

**Other gates:** `lint:document-kinds` (A0), `lint:view-keys` (duration keys),
`lint:command-views` (relation scopes), the whole family per wave.

**Suite discipline:** `pnpm test:near` + touched packs' vitest +
`lint:family` per wave. `pnpm test` exactly twice: at code-complete beside
the open MR, and at `/finalize`. Never in the background.

### The drive

Wire file: `packages/wire/tests/naming-overhaul.dirty.wire.test.ts`
(`dirty`: it edits documents, files records and restarts). Browser walk:
`e2e/tests/naming-overhaul-walk.spec.ts`, run once at code-complete. Run on
this worktree's own `WIRE_PORT` and database (`docs/testing.md` § Attach or
own). **Every step is `instant`; there is no clock jump, no span step and
therefore no staged twin and no soak drive.** *Assertion* says whether the
checked act uses only player verbs (`player`) or wizard setup is involved
(`staged`).

| step | assertion | staged by |
|---|---|---|
| 1 recipe and help-concept edits go live | staged | the CMS REST save through the wire harness's authenticated session (a wizard holding title); checked with `look` / `help` |
| 2 an instrument reads as pages | staged | two harness players and the contract verbs; checked with `cat` |
| 3 declare a kind; undeclared refused | staged | CMS save of a `kind` document under the author's home; `ls` |
| 4 herd record refuses overwrite; `draft` files | staged setup, **player** check for `draft` | `testharness` for the herd; CMS save for the refusal |
| 5 bore log append-only | staged | `eval` in the bore's parcel calling the register's own append and a rewrite |
| 6 `read` the ship register; a release's date | player | — (a release published by the harness press beforehand) |
| 7 a pack with a `maps/` template folder installs | staged | a fixture pack in `SAXONBERG_PACKS` for the drive world |
| 8 unsatisfied edit refused; in-use removal refused | staged | CMS saves of the `form` and `herd` declarations |
| 9 `ls` of stream tokens shows nothing | player | — |
| 10 `query me:~`, `look ~here`, `look here` | player | — |
| 10b `goto ~/workroom` | staged | a wizard character with a workroom |
| 11 `dm ~friends:<them>`, refusal, `dm @<id>` | staged setup, player check | `contacts add` on one harness player; the second walks elsewhere |
| 12 a list named `inventory` | player | two harness players |
| 13 `look harbor-book:~`, `charter hesper` | player | at the Terminus harbor |
| 14 `watch::wind`; `wind@watch` refused | player | a watch given by `clone --here` |
| 15 notify on `~friends` | staged setup, player check | `notify ~friends --login …`; the friend logs in |
| 16 **restart** | staged | the harness's world restart; steps 1, 10, 11 re-asserted, plus the list, the policy, the declared kind and the herd record read back |
| 17 `charter` word forms, tie, ordinal | staged | a second listed ship sharing a word (`testharness ship`) |
| 18 `buy` forms, two sellers, sold out | staged | a second seller with rope; the shelf emptied by buying it out |
| 19 `cast`, `apps`, `chat join`, `job apply` | staged | a known spell, a phone, a channel, a business with an opening |
| 20 `sample north` / `northern rock` | staged | a working with a north face (`goto` + the mining pack's stake) |
| 21 `party adopt wedge`; `smile` | player | — |
| 22 `contacts remove ~friends:<them>` | player | step 11's list |
| 23 `rent` and `fire` durations, the shared refusal | staged | a lit limekiln (`testharness` / `eval` to light it) |
| 24 `help search harb` | player | — |

**A state nothing can stage is tooling this build owes.** Two are likely:
a CMS-save helper on the wire harness (if `packages/wire/src/harness` has
none — it has `world.ts` with restart, and no `cms` helper was found), and a
fixture-pack switch for step 7. Both are harness code, not game code.

**Every checkpoint must be able to fail (B2):** each is first run against the
pre-wave behavior and seen red, and the wire file's helper is checked to
distinguish a refusal from an empty reply — the two failure kinds this
drive leans on.

**The walk** covers what a person sees: the relation listing and the tie
prompt as rendered, the `source::verb` echo, the kinds folder in the CMS
tree, the release date on the front door, and `buy` at a counter.

---

## Risks & opens

- **Size.** Seventeen waves across the store, the installer, the grammar and
  ~95 matcher sites in ~25 packs. The stages are ordered so that each leaves
  a working tree; if the build must pause, a stage boundary is the place.
- **A1 is the widest single commit** (the closed list has ~20 readers and a
  generated table). A0's parity test exists to make it mechanical.
- **B3 touches ~600 view lines and every test that types a seed word.** It is
  mechanical but large; B1 keeps both spellings alive precisely so B3 can be
  one find-and-replace wave with the suite as its check. ⚠ A scope word
  inside a chain (`here:exits`, `reachable:[class.X]`) is respelled too.
- **Synchronous relations.** A relation answers residents only. A listed ship
  nobody has loaded is not in `book:~ships`. `CharterBook.shipFor` loads them
  today (`StuffApi.singleton`); B2 must make the book hold its listed ships
  resident (its authored field's setter returns the load — the *resident by
  construction* rung), or `charter` regresses at a cold harbor. Stop and
  re-plan the wave if a holder's set cannot be made resident that way.
- **`here` means two things** (D-B3). The plan keeps both, declared. If
  review prefers one meaning, the cost is the ~140 views that scope to `here`.
- **Identical goods at a counter** (D-C7) — the binder prompts among things
  that answer alike (`look rod` among three rods). `buy loaf` over eleven
  loaves must not. The build confirms how `get coin` behaves among several
  coins today and uses that rule; if there is none, the collapse belongs in
  the binder for alike candidates, not in `BuyController`.
- **`water-right` path scheme** (D-A12) may sit outside what a `Registrar`
  may administer; the paths move if so.
- **Game time on the front door** (D-A10) reaches the client. If the
  unauthenticated release read has no clock to render with, the server sends
  the rendered date.
- **`GroupRef` consumers of `online`** (D-B9) — the `mql:` provider's
  queries; grep before B3 removes the seed.
- **The census can undercount** — guarded in C0; if a matcher family turns up
  in C5/C6 that the script did not see, extend the script first, then fix.
- **Stop and ask, do not guess:** anything that would add an MQL seed, scope
  or grammar for non-Stuff; anything that would make a document a class or
  an Idea `Visible`; a lint ceiling that would have to rise; the four
  questions at the top if they are still open when their wave starts.

---

## Deferred seams

- **`hail`'s matchers** stay, exempted by name in the gate →
  [signalling-slate](../slates/engine/signalling-slate.md).
- **`look`'s augmenter pass, `look <exit>`, the tract candidate on the slow
  path** → one-resolution-rule-slate's `look` half (its § 2 and § 3 row 9
  stay open there).
- **`@name`** — `@` parses an id only; the parser's `PlayerNode` carries a
  string so a name resolver attaches without a grammar change →
  mql-anchors-slate § 14.
- **Who is online** — a player-kept list is a `RelatingMixin` holder like any
  other; nothing here needs to change for it → its own build (unslated).
- **Managed groups as relations** (Q3) → mql-anchors-slate, with the who-list.
- **Expiry as a lifecycle trait; whether `recipe`, `maturation-profile`,
  `fraction-schedule`, `archetype` are content** → document-traits-slate
  (rule 3's finding).
- **A keyword sweep of content** — entries get the keywords the drive and the
  suite need, no more.

At the sweep the three slates are compacted against what shipped; this plan
and the grounding doc retire.

---

## Critical files

Read first, in this order.

1. `docs/requirements/naming-overhaul-requirements.md`; the three slates
   (traits whole; anchors § Decided; one-resolution §§ 6–7).
2. `docs/plans/naming-overhaul-grounding.md` — the file:line census.
3. `S/lib/document/DocumentKinds.ts`, `DocumentCatalogue.ts`,
   `StoredDocument.ts`; `S/platform/idea/api/DocumentLogic.ts`;
   `S/api/document.ts`.
4. `S/platform/idea/api/PackLogic.ts` — 170–240, 890–935, 3613–3660, ~4011.
5. `S/lib/paths.ts:259–272`; `S/lib/persistence/ResetPolicy.ts`;
   `packages/server/scripts/gen-schema.ts:130–150`.
6. `S/api/mql/scope-walk.ts`, `resolver.ts` (165–185, 436–530, 575–800,
   965–1010), `lexer.ts`, `parser.ts`, `types.ts`; `S/api/mql.ts`.
7. `S/api/grammar.ts`.
8. `S/platform/idea/api/CommandLineLogic.ts:270–300`; `ShellLogic.ts`;
   `S/lib/shell/Alias.ts`; `S/platform/idea/api/CommandLogic.ts` (the binder:
   1722–1850, 1989–2060, 2796–2970).
9. `S/lib/command/CommandDefinition.ts:640–700`;
   `S/lib/command/CommandController.ts`.
10. `S/lib/social/Contacts.ts`, `NotifyRule.ts`;
    `S/platform/idea/api/SocialLogic.ts`; `NotifyControllerBase.ts`.
11. `S/lib/retail/ForSale.ts`, `Stock.ts`; `BuyController.ts`;
    `P/cmd/retail/buy.yaml`.
12. `S/platform/thing/CharterBook.ts`; `S/lib/material/Material.ts` +
    `S/platform/idea/MaterialCatalogue.ts` (the Idea precedent);
    `S/lib/description/Named.ts`, `Perceptible.ts`.
13. `packages/server/scripts/check-controller-resolution.ts`,
    `check-view-keys.ts`, `pack-roots.ts`.
14. `docs/review-questions.md` (B1–B4 at every wave), `docs/testing.md`
    §§ Staging, Two tiers, Attach or own.

---

## Drive record

*(appended at build time — the measured census ceilings at C0, then the
blocking drive's output, count and findings, and the walk's.)*
