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

## Owner rulings folded in (2026-11-20)

The first draft carried four questions. The owner answered them; the
requirements and mql-anchors-slate §§ 19–23 were updated to match, and this
plan is revised in place. Where each landed:

| ruling | where in this plan |
|---|---|
| a bare name reaches the people you keep through the **view's default scope** — `dm` scopes `[~here, ~all]`; `~all` is the one meta-relation (no `~contacts`, no `~known`); never a binder special case | D-B2, D-B10, WB3a |
| offline people wait for the person handle (person-targeting-slate § 3). `contacts remove` resolves among its own entries when the query binds nothing; `dm` to an offline player stays unsupported | D-B12, WB4, Deferred seams |
| your **own** groups are resident on you and answer as relations of `me`; notify keeps matching groups asynchronously — only its typed string syntax goes | D-B9, D-B11, WB2, WB4 |
| the stream verbs keep their own duration reading on the wall clock | D-C6, WC1, the gate's exemption table |
| `here` **splits** — `~here` is the place only; no relation has two faces | D-B3, WB3b |
| default player aliases are exactly `here`, `it`, `them`, `him`, `her`; `$$` becomes `~last` | D-B7 |
| drive step 13 is `query harbor-book:~` — `look` gets no branch | D-B4 |

**Still for the owner's eye (engineering, reversible):**

- The `documents` collection's nightly reset becomes a plain `keep` (D-A9).
- `who` / `profile` must show a player's `@id` or the address is unreachable
  (Reachability).
- A contact list and a group you belong to that share a name **prompt**
  (*your list, or the group?*) — and in a script, refuse (D-B11).
- The here split is sized at 142 slots in 120 view files, each needing a
  judgment, not a respelling (WB3b).

**Decided by the build (2026-11-20, the two calls left open at handoff):**

- **The building a place is the landing of** is the built-in relation
  **`~buildings`** (`whose: anyone`; members = `Place.landedStructuresNow()`
  of the left side) — a table entry in `api/mql/relations.ts`, so no host
  gains a member and no relation has two faces. It is how WB3b's
  landing row is spelled (`~here:~buildings`). Lens 2 chose: a slot that
  could bind the cottage from the lane yesterday still can, in words.
- **The speech verbs** (`say`, `whisper`, `shout`, `react`) scope their
  addressee to `["~peers"]` as D-B10's table says.

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
  `candidatesForHere` (`scope-walk.ts:85`) — the place's **surface**: the
  place itself, the ways out and their doors, the buildings whose landing it
  is, open ground seen across a way, and the same for the vessel you sit in.
  *Never what stands there* — that is `peers`. Seed `inventory` is the giver
  while scope `inventory` is the carried things.
- **Scopes** — `candidatesForScope` 583: a fast path over comma-joined scope
  words, else a slow path that resolves the fragment as a query and walks each
  anchor's neighborhood (`candidatesFromQuery` 628, `candidatesForAnchor` 674).
- **`:members`** — `flatMapMembers` 973, `instanceof Warren` only, live members.
- **Views** — ~460 `scope:` lines across the packs: `["reachable"]` 112,
  `["here","peers","person"]` 108, `"reachable"` 69, `["$focus","reachable"]`
  33; `online` on 29 lines in 23 views; ~150 `default:` queries name a seed.
  **`here` as a scope word: 142 slots in 120 view files.** Their `requires:`
  show what they were after: 16 `any`, 12 `ToolMixin`, 11 `BurnerMixin`, 9+
  `SoilMixin` (the ground — the place itself), `JobBoard`, `Bulkable`,
  `Tangible`, `PricedOffer`, `StoreBook`, … — most name things that stand in
  the place, which the `here` pool never held.
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
  `matchesRule` (async, through `GroupApi`). `GroupApi.onMembershipChange(ref,
  cb)` exists (`S/api/group.ts:75`). `GroupRef`s also serve
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
| N16 | `GroupMemberMixin` — the groups you belong to, resident on you | `S/lib/social/GroupMember.ts`, `Mixins.GroupMember` | **genuinely new**, ruled (mql-anchors § 20). The person-side twin of `S/lib/party/PartyMember.ts`; searched `S/lib/social/` and `GroupLogic` for a resident membership mirror (none — every read is async through the registry) |
| N6 | `RelatingMixin` — *a thing that keeps named sets it can be asked for* | `S/lib/relation/Relating.ts`, `Mixins.Relating` | **genuinely new.** Generalizes `flatMapMembers`' `instanceof Warren` (which retires). Searched: `S/lib/mixin.ts` for Relat/Keep/List/Member (none); `GroupProvider` (durable-id membership, async, answers offline people — a different question, see D-B9); `Registrar` (a write transport's holder); `Listing` (the rejected § 1 protocol, never built). Seven implementers in this build |
| N7 | the built-in relation table | `S/api/mql/relations.ts` (sealed pipeline internal) | generalizes — and replaces — the two hand-written seed/scope tables in `resolver.ts` |
| N8 | `MqlMatchVia.relation` (a facet), `MqlMany.relations` and `MqlMany.relationTie` (facts) | `S/api/mql/types.ts` | reuse — the `via.detailPath` / `isSet` precedents |
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
| N7 built-in table | each built-in's one-line meaning is what `me:~` prints, and each means one thing | — (grammar) | one table serves a typed query and a view's scope | replaces two tables | sealed pipeline internal | built-ins checked first, structurally — a list can never mask one |
| N8 `via.relation`, `relations`, `relationTie` | `contacts remove ~friends:x` says the list in the command | — | a verb reads a fact, never re-parses `.raw` | — | on the match, like `via.detailPath` | a `:~` query binds **nothing** and says so; a name two sets share is asked, never picked |
| N16 `GroupMemberMixin` | `me:~` lists each group with its meaning | membership stays the group record's; this is a resident read of it | — | not a second membership store: it holds nothing the registry does not, and is rebuilt at login | header: *the groups this person belongs to, resident*; only the avatar family composes it | kept current by the membership hook; never decides membership |
| N9 `GrammarApi.name` | one rule for every verb is the requirement | — | every non-Stuff matcher calls the same entry | the scorer is moved, not copied; `scope-walk` keeps no second copy | `GrammarApi` already owns articles, ordinals, plurals | a tie is returned as a tie; never a first-match pick |
| N10 `named()` | the prompt and the refusal are the same lines on every verb | — | — | beside `promptForObject`, which prompts among Stuff; this prompts among entries | controller I/O | asks on a tie; picks only when one answers |
| N11 query aliases | `alias list` prints them; removable | — | — | same mixin, same table, one more position | header widens from *verb-position substitution* to *the words a player may respell* — stated in the mixin header in WB3a | expansion is echoed (`expandedText`), as verb aliases are |
| N12 duration keys | the view states granularity and bounds; `help` prints them | — | — | one slot type replaces `rent`'s and `fire`'s parsers and serves `press` and the script `wait`; the stream reading is deliberately left | the binder owns arg coercion | out-of-bounds is refused with one line, never clamped |
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
members(left, asker) }` — **one answer each; no relation has two faces**
(mql-anchors § 22). `whose: 'anyone'` for `~here` and `~inventory` (under the
gates `:e` and `:i` already apply); `'self'` for `~peers`, `~reachable`,
`~person`, `~horizon`, `~it`, `~them`, `~him`, `~her`, `~last` and `~all` —
asked of anyone else they answer empty. **`~all`** is the one meta-relation:
every loaded person on any contact list the left side keeps (it reads the
lists through `MixinApi.isContacts`, the same narrowing the other built-ins
use for their mixins); it does not include groups or the party, which are
named sets of their own. Built-ins are
consulted **before** the holder, so masking is impossible by construction.

**D-B3 — `here` splits; a scope is a query and nothing more.** `~here` is the
place you stand in — one Stuff — in a typed query and in a view's `scope:`
alike. Today's scope-`here` pool (the place's *surface*: the place, its ways
and their doors, the buildings on the landing, ground seen across a way, the
vessel's surface) has no successor relation. Each of the 142 slots that
scopes to it is rewritten to say what it meant (WB3b gives the procedure):
the place itself is `~here`; its ways are `~here:exits` (a door is reached
through its way by `effectiveTarget`, as today); a far place across a way is
`~here:exits:to`; the vessel you sit in is `me:e`; what stands in the place
is `~peers` or `~here:i`. A slot whose `requires:` could never have bound
anything in the old pool simply drops the word. **A view's scope entry is an
MQL query whose matches are the candidates** — that is the fast path's rule
for every pool, and it becomes the only rule for a relation scope
(`~reachable:[class.CharterBook]:~ships` contributes the ships and nothing
else). The slow path's neighborhood walk stays for the non-relation scopes
that use it today (`$focus`, a path, a `[class.X]` anchor); unifying the two
paths is one-resolution § 3 row 9, not this build.

**D-B4 — `thing:~` binds nothing and carries a fact.** The result has no
matches and `relations: [{ holder, name, meaning, builtin }]`. **`query`
prints it** (drive steps 10 and 13); every other slot gets the refusal row
`names-relations`, pointing at `query <what you typed>` — the `too-many`
precedent. `look` is not touched.

**D-B5 — The protocol.** `RelatingMixin` adds `relationsFor(asker):
RelationInfo[]` and `relatedBy(name, asker): RelatedSet[]` (each `{ info, members }`; empty =
this holder keeps no such set for this asker; more than one = a name two of
its sets share, D-B11), and `groupRefOf(name, asker)` for the sets that are
also durable groups (D-B9). A contributor whose relation names
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
with the existing tombstone. These five are the whole
default set (mql-anchors § 23): `inventory`, `peers`, `reachable`, `person`
and `horizon` typed bare are ordinary keywords, and `$$` is gone — `~last`.

**D-B8 — The selector.** Token 0 splits at its first `::` outside quotes:
left is the source query, right the verb. `ParsedCommand.scope` is unchanged
downstream. `format()` and `carryScope` re-emit `source::verb`. A token with
an empty side is not a split. `verb@source` is no longer recognized: `wind@watch`
is an unknown verb and the refusal says the new spelling once.

**D-B9 — Relations do not replace `GroupApi`, and notify keeps its matching.**
A `GroupRef` answers durable membership (offline people, access control,
async); a relation answers *who of these is reachable now*, as Stuff. Both
stay. A `NotifyRule` stays keyed by a `GroupRef` and `SocialLogic.matchesRule`
keeps awaiting `GroupApi.isMember` exactly as today — so rules on managed
groups keep working. **Only the typed string syntax goes:** `notify` takes a
relation name of yours (`notify ~friends`, `notify ~bookclub`, `notify
~party`) or a reserved pseudo-subject, and the holder that answers the name
says which `GroupRef` it stands for (`Relating.groupRefOf(name, asker)` — a
contact list its `contacts:` ref, a group its `managed:` ref, the party its
own). `normalizeRef` and the pass-through of anything containing a `:` are
deleted; a typed `contacts:…` / `managed:…` / `mql:…` is refused with the new
spelling. An `mql:` subject can no longer be typed into `notify`; the `mql`
group provider itself is untouched apart from losing `online` in its queries.

**D-B10 — `online` leaves completely; each of its views picks a scope.** The
seed, the scope, `SEED_WORDS`' entry, and `api/mql/online-provider.ts` /
`online-wire.ts` if no consumer remains outside the retired seed. System mode
keeps `world`, paths and ids. The 23 views, by what the verb is:

| views | was | becomes | why |
|---|---|---|---|
| `dm` | `online` | `["~here", "~all"]` | the ruling |
| `pay`, `bank`, `house`, `profile`, `party` (invite) | `["reachable", "online"]` | `["~reachable", "~all"]` | a person in reach first, then the people you keep |
| `contacts` (add), `group` (add / invite), `party` (the three `online` slots), `introduce`, `office`, `title`, `pack`, `wizard` | `online` | `["~peers", "~all"]` | you name someone beside you or someone you keep; a stranger elsewhere is `@id` |
| `say`, `whisper`, `shout`, `react` (their addressee slots) | `online` | `["~peers"]` | acts in a place address who is in it; an explicit `@id` or `~list:x` still binds whoever the verb can reach |
| `goto`, `scry` | `online` + path globs (+ `reachable`) | the same lists with `~all` in place of `online` | a wizard reaches a stranger by `@id` or path |
| the Duncan Hall and Terminus `lease` / `unlease` / `provision` / `unprovision` | `online` | `["~peers", "~all"]` | as `contacts` |

A view row that turns out to need something else is the build's to adjust
and record here; none may add a relation.

**D-B11 — Your own groups are resident on you.** `GroupMemberMixin` on the
avatar family holds, transiently, each managed group you belong to with its
member ids: filled when the avatar materializes (that path is already async),
kept current by `GroupApi.onMembershipChange`, dropped with the avatar. It is
never persisted and holds nothing the registry does not (P6). It contributes
one relation per group, named for the group (`~bookclub`), whose members are
the loaded avatars among those ids. There is no group-wide flag and no
relation for a group you are not in. **A name two of your sets share** (a
contact list and a group both called `bookclub`): `relatedBy` hands back both
sets, every match carries its own `via.relation`, and the result carries
`relationTie`; the binder prompts — *your list, or the group?* — and keeps
the chosen set's matches. A script never prompts: the tie is the refusal.
Built-ins are not part of this: they are checked first and always win.

**D-B12 — `contacts remove` keeps working on offline contacts.** The slot is
an object scoped to your lists; when the query binds something, the verb
reads `via.relation` for the list. When it binds nothing, the list resolves
the typed words **among its own entries** — the entry-matching the controller
does today, moved onto `ContactsMixin` as `entryNamed(text, label?)`. It is
written with `GrammarApi.name` in WC6, once the rule has moved (until then
the existing compare stands and the census counts it). `dm` to an offline
player stays unsupported. The person handle is not built here.

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
`bad-duration`. It is usable as a positional (`rent canoe for a week`).
`RentController.daysOf` and `FireController.parseHoldS` retire into it;
`press --for` (the slot's one user today) and `Interpreter`'s `wait` /
`every` take the same reading. **The stream verbs are not touched**
(owner): `StreamApi.parseDuration` stays, on the wall clock, and is a named
exemption in the gate.

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
| `RelatingMixin` | **only things that keep a set**: the avatar family (beneath `ContactsMixin`, `PartyMember` and `GroupMemberMixin`), `Warren` (`~rooms`), `CharterBook` and the harbor's register book (`~ships`), the travel credential (`~nodes`), `AetherHostMixin`'s hosts (`~apps`), the employing person and the business premises (D-C9) | every composer answers at least one relation by construction — the contributing mixin is what pulls it in. **It is not on `Stuff`, `Thing` or `Idea`.** A loaf composes nothing and `loaf:~` lists only the built-ins that apply to it |
| built-in relations | the table in `api/mql/relations.ts`, each with a `whose` | not a field on any host. `~here` applies to anything contained, `~inventory` to any container, `~all` to a keeper of contact lists, the rest to a perceiving body asking about itself — the same domains the seeds had. No host gained a member |
| contact-list relations | `ContactsMixin` (the lists are its own), one relation per label; `entryNamed` for the offline fallback | every Contacts host has lists. `~all` is **not** here — it is a built-in |
| `GroupMemberMixin` and the group relations | the avatar family, beside `PartyMember` | every player may belong to groups; an avatar in none holds an empty map — the same shape as a player in no party. Not on NPCs, which join no managed group |
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

Eighteen waves, A then B then C. Each ends at one `build(naming-overhaul
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

✅ **Done.** 43 declarations (42 tabled kinds + `venue-eighty-six`) in their
owning packs; the installer installs them through a temporary `kind` row in
the closed table (A1 replaces the reader). Decided: a `DocumentKind` is
built with its **constructor** (`new DocumentKind(name, data)`), not a
static `fromData` — `lint:lib-statics` counts public static methods on lib
classes and the caller set (installer, catalogue, scripts) is not author
surface. `LedgerTrait` is a `mode`-discriminated union (an `in` probe tripped
`lint:duck-typing`). Runtime-only kinds declare no `shipped` (defect 3 is
fixed in data already; the reserved-dir derivation flips in A1). The five
missing catalogues (recipe, archetype, help-concept, blueprint, name-bank)
and emote's/command-view's services are declared in A1, where they gain
`forget`. Pack dependency for gate 5 = `package.json`'s
`@saxonberg/content-*` dependencies (no manifest field exists); platform is
always reachable.

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

✅ **Done.** Decided along the way:
- **The meaning check reads a service's class when it is not resident**
  (`DocumentLogic.checkMeaningImpl`, reached by the installer as
  `DocumentApi.checkMeaning`, gated to `PackLogic`). Standing a row-backed
  catalogue (recipe, soul, blueprint, archetype, help) mid-install would warm
  it from a store the install has not written yet; every `parse` reads only
  its arguments. A logic singleton's service path (`/platform/idea/api/command`)
  resolves to its `<Feature>Logic` class.
- **The command-view kind's service is `CommandLogic`** (`forget` reloads a
  view, `parse` checks the schema), gated to the store and the installer —
  no new catalogue class.
- **`ServesDocuments` widens** to `forget(): void | Promise<void>` (the
  recipe/archetype/blueprint go-live re-warms, awaited) and an optional
  `parse`.
- **`unique` replaced "every typed word is unique"** in this wave, not A3:
  the installer's flat-key and store-word checks run for `unique` kinds only
  (emote, formation, `kind`, and **topic** — a topic key is a muting path two
  packs must not share, which the topics test caught).
- **Declarations are read from every shipped pack, ignoring
  `SAXONBERG_PACKS`** (`discoverUnfiltered`): a declared kind reserves its dir
  whether or not this boot installs the pack.
- `lint:typed-words` is deleted (its unique half is `lint:document-kinds` gate
  6). The per-kind lints (`aromas`, `doneness`, `reachability`,
  `reason-rows`, `placement-words`, `untitled`, `census`) read their dirs
  through `pack-roots.shippedDirOf` / `nonTemplateDirs` off the declarations.
  `check-template-census`'s `DOCUMENT_PATH_FIELDS` (field → dir) stays: it is
  about which fields cite documents, not the kind list.
- A pack shipping documents of a kind it neither declares nor depends on the
  declarer of is refused by `lint:document-kinds` gate 5, not at install
  (no pack does today).
- `standby-reason` and `lower-third-panel` lost their `fromData` validators
  for a `fields:` schema; their enum/positivity checks are now the reader's.
- Recipe, operation, help-concept, archetype and topic cards now carry title
  words in `keys.word` (keyworded + titled), as the trait says.

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

✅ **Done.** Filed: register (herd, fishery, body, bore, ship, berth-book,
water-right), business (bill-of-lading, warehouse-receipt, rate-card),
release, instrument, map, stream-token, berth (berth-roll), edition. Ledgers:
edition and rate-card `immutable`, bore `{ grows: [lines] }`, instrument
`{ grows: [history] }`. **Map is not a ledger** — `growMap` bumps existing
claims in place. Decided: **D-A11 → `venue-eighty-six` stays plain** (not
filed): the enforcing brain writes through `save` under the venue-records
carve-out and holds no Business to file through. A transport writing a kind
it does not file is a typed throw; the plain save on a filed kind is the
`document-filed` refusal. Declaration edits re-read at once
(`kinds().ensure(path)` after the save). The forged-release test now
expects the refusal outright — stronger than "never reaches the window".

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

✅ **Done.** `pagesOf` reads the declaration: secret → null; `paper.template`
(Liquid via `ProseApi.compile`/`renderCompiled`, entities decoded to plain
text, `<page/>` breaks a page; vars = data + `title`, `date`, `path`,
`owner`, `owner_leaf`); else the summary line `title — date`. Templates:
release (masthead), warehouse-receipt, recipe, instrument (defect 2 — its
`face` + `history`), edition. ⚠ **Every document now prints** — a script or a
command view reads as its title line (the edition test said "a script does
not read as a page"; the plan's rule wins). Dates render on the world's
calendar (`DefaultCalendar.formatDate`). Release: `publishedAtS` /
`expiresAtS` (game seconds), `dated: indexed` → card key **`date`** (the
press reads `findByKey('release', 'date')`); edition `frozenAtS`. The wire
rows keep `publishedAt` (now game seconds, for order) and gain
**`publishedOn`** (server-rendered words) — the front door renders that, no
client clock. **Re-planned N13:** the tree rule is `DocumentKind.parentOf`
(aroma's catalogue extends `Idea`, not `DocumentCatalogue`, so a base-class
method could not serve it); topic's dotted-key walk and reason's fuzzy
`nearest` are not trees and stay. `unique` is enforced at save. **C1's core
moved here:** the `type: duration` slot already returns **game seconds**
(press `--expires` needed it to avoid controller arithmetic — the
`lint:controller-decisions` ceiling); C1 keeps the word forms, the
granularity/bounds keys, rent and fire.

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

✅ **Done.** The split reads the RAW verb token, so a quoted source keeps
its own colons (`"a::b"::wind`); a leading `\` (alias bypass) stays on the
verb (`\me::look` → verb `\look`, scope `me`). `format()` re-emits the raw
token when its scope is unchanged, else `<quoted source>::<verb>`. The old
`wind@watch` is one unknown verb word and the refusal says `watch::wind`
once (`CommandGiver`'s `unknown-verb` line). Respelled: the wiki guide, the
controllers-are-io wire file and walk, the tokenizer/alias/script tests,
`command-parsing.md`, `command-routing.md`, `shell-alias.md`.

**B1 — Relations in the grammar, beside the old words.**
*Decisions:* D-B1, D-B2, D-B3, D-B4, D-B5, D-B6.
*Files:* `S/api/mql/lexer.ts`, `parser.ts`, `types.ts`, `resolver.ts`, new
`S/api/mql/relations.ts`; new `S/lib/relation/Relating.ts` and
`Mixins.Relating` in `S/lib/mixin.ts`; `MixinApi.isRelating`; `QueryController`
(prints a `relations` fact); the `names-relations` reason row; the binder's
`relationTie` prompt. `resolveKeywordSeed`, `resolvePronoun` and
`candidatesForScopePart` become lookups in the table. **The old spellings
still resolve in this wave** through a clearly marked legacy block in
`resolver.ts` — the seed words map to their relations, and the scope word
`here` keeps calling `candidatesForHere` — so nothing in content changes yet.
The block is deleted in two cuts: everything but scope-`here` in WB3a,
scope-`here` and `candidatesForHere` in WB3b.
*Acceptance (unit, in the mql tests):* `~here` is the place, in a query and
as a scope; `~all` is every loaded person on any of your lists; `~inventory`,
`~peers`, `~reachable`, `~person`, `~horizon`, `~it`, `~last`; a bare
`~x` ≡ `me:~x`; `me:~` lists every built-in with its meaning; `@<id>`
binds a loaded avatar and nothing for an unknown id; `~/workroom` and a
bare `~` resolve as paths, and `x:~/y` is a parse error; a list of two
holders unions and dedupes; a `'self'` built-in asked of another answers
empty.
*Commit:* `build(naming-overhaul WB1): relations — one table, one protocol`.

✅ **Done.** The lexer gains `tilde`, `homePath` (`~/x`) and `playerId`
(`@id`); the desugar pass leaves any query with `~`/`@` alone. A head
`~name` parses as `me:~name`; a bare head `~` is the home; `:~` is the
listing; a home path or player id after a `:` is a parse error. The
built-in table (`api/mql/relations.ts`) has **here, inventory, peers,
reachable, person, horizon, buildings, all, it, them, him, her, last** —
`~buildings` is the build's decision for the landing row. `via.relation`
carries `{ holder, name, meaning }` (the meaning tells two sets of one name
apart for the tie prompt). Facts ride a save/restore side channel like
`registryScan` and surface on `MqlOne`/`MqlMany`. A view `scope:` part
starting `~`/`@` resolves as a query whose matches ARE the candidates. The
listing reaches only a slot declaring **`lists: relations`** (a new view
key — `query`'s `set`); every other slot, and every option, refuses
`names-relations` — the binder detects the listing syntactically (a
trailing `:~`). `RelatingMixin` (`lib/relation/Relating.ts`) is the base of
the chain; holders arrive in B2. The legacy seed words and the scope word
`here` are untouched (B3a/B3b).

**B2 — The holders answer.**
*Decisions:* D-B5, D-B6.
*Decisions also:* D-B11.
*Files:* `S/lib/social/Contacts.ts` (one relation per label, and the warning
when a label equals a built-in's name — `all` included);
`S/lib/party/PartyMember.ts` (`~party`); new `S/lib/social/GroupMember.ts`
composed on the avatar family, filled in the avatar's materialize path and
subscribed through `GroupApi.onMembershipChange` (unsubscribed in
`onDestruct`), `Mixins.GroupMember`; the `Warren` base (`~rooms`;
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
`book:~` lists `~ships`; `warren:~rooms` equals the old `:members`;
`me:~bookclub:iffy` binds a fellow member, joining and leaving a group
changes `me:~` with no relog, and a list and a group both named `bookclub`
prompt (and refuse in a script).
*Commit:* `build(naming-overhaul WB2): contact lists, parties, books, cards and warrens answer`.

✅ **Done.** `RelatingMixin` composes ONCE (the `Slottable` guard), so every
contributor pulls it in beneath itself and one `super` chain runs through
them all. Holders: `ContactsMixin` (one relation per label, owner-only),
`PartyMemberMixin` (`~party`, `party:<path>` ref), new
**`GroupMemberMixin`** on the Avatar (resident groups — filled in
`Avatar.enter`, re-read by each group's change hook, and refreshed
directly by `GroupAddController` and `GroupLogic.ensureMember` for a group
the member was not yet listening to; unsubscribed in `onDestruct`),
`Warren` (`~rooms`; `flatMapMembers` and the `members` chain word deleted —
the plan's "three uses" were all tests and docs), `CharterBook` (`~ships`;
`setShips` returns the load so listed ships stand resident; `lets()` reads
residents), `TravelCard` (`~nodes`, the tpa pack), `AetherHostMixin`
(`~apps` = the running apps). Decided: **`RegisterBook` gets no `~ships`** —
it pages ship-register DOCUMENTS (kind + key), not live ships; the charter
book is the holder `charter` binds through. **The `apps` and `teleport`
views stay string slots until C3/C6** — an offered app is not made yet
(D-C5 rule 5) and the teleport destination is a route on the node, not the
card. `charter`'s `ship` is an object slot scoped
`~reachable:[class.CharterBook]:~ships` (no `greedy:` — object slots refuse
it). The tie prompt lives in the binder's one resolve funnel
(`scopedMany` → `settleRelationTie`); a script gets `needs-input`.
`contacts add` warns when a label is a built-in's name, by asking MQL
(`me:~`) rather than importing the sealed table. ⚠ Deleting the resolver's
now-unused `Warren` import changed module load order and exposed a LATENT
cycle (`Place` → … → `Tombstone` → `Location` → `Place`) in the three
`biome.*Of` tests — the only ones that loaded the runtime without
`test-bootstrap`; they import it now. The server's boot imports the
bootstrap first; the drive's boot is the check that production order holds.

**B3a — The mechanical sweep: seeds and scopes become `~`; `online` goes.**
*Decisions:* D-B7, D-B10.
*Files:* every view `scope:` and `default:` in `packages/content` **except
the scope word `here`** (~320 scope lines and ~150 defaults; a scope word
gains `~`; `$focus`, `subject`, `self`, paths and `me:…` chains are
unchanged; `here` inside a *chain* — `here:exits` — is the place already and
is respelled `~here:exits`); the 23 `online` views per D-B10's table;
`S/lib/shell/Alias.ts`, `S/api/shell.ts` + `ShellLogic.ts`
(`expandQueryAliases`), `AliasController` and `P/cmd/shell/alias.yaml`
(`--query`), the binder call sites in `CommandLogic.ts` (the two object-slot
loops near 1722 and 1989, and the selector's source); the five default
aliases; then the removals in `resolver.ts`, `lexer.ts`, `parser.ts`,
`types.ts` (`PronounName` keeps `me`; `SEED_WORDS`, the `here` / `it` /
`them` / `him` / `her` pronoun nodes, `$$`, the `[keyword.x]` seed escape,
and the legacy block's seed half); `online-provider.ts` / `online-wire.ts`;
the `mql:` group provider's queries; every query string in
`packages/server` tests, `packages/wire`, `e2e`, `tools/` and scripts;
`docs/mql-grammar.md`, `docs/subsystems/mql.md`.
*Acceptance:* `look here` and `look ~here` both show the room and `alias
unset --query here` makes `here` an ordinary word; `get it` works through the
alias; `dm <a contact elsewhere> hi` arrives through `~all`; `dm <stranger>`
refuses saying how to reach them and `dm @<id> hi` arrives; `goto
~/workroom`; `grep -rE "scope:.*\bonline\b" packages/content` is empty;
`lint:view-keys`, `lint:command-views`, `lint:one-word` green; the mql and
binder suites green on the new spellings.
*Commit:* `build(naming-overhaul WB3a): seeds are relations; online is gone`.

✅ **Done.** 282 views respelled by script (every scope/default chain head
gains `~`; `here:` chains → `~here:`; the scope WORD `here` left for B3b;
`$$` → `~last`); `online` per D-B10 by one generic rule (speech verbs →
`~peers`; `dm` → `~here, ~all`; a list already holding `~reachable`/`~peers`
→ `~all`; else `~peers, ~all`). 69 source files respelled at their
`resolveMany`/`scope:` call sites, plus the constants a call-site scan
cannot see (`ROOM_LISTING`, teleport's try-list, pour's default test, the
binder's `~reachable` fallback). The grammar keeps `me`, `world`, paths, ids
and the operators; `here`/`it`/`them`/`him`/`her`, the seed words, `$$`, the
mid-chain seed flat-maps (`x:peers`) and the **`:online` predicate** are
gone; `online-provider`/`online-wire` deleted. `broadcast` and the Compact's
listing read `PlayerApi.connectedAvatars()`; an `mql:` group resolves in
system mode over `/platform/agent/Avatar`. Decided: **a bare built-in scope
(`~reachable`) serves the built-in's own pool** (keeps detail
subcandidates); **only a scope ENDING in a relation takes its matches as
candidates** — a drilled focus (`~here:bookcase`) still walks its anchor's
neighborhood. **The focus defaults to `~here`**; `CommandGiver`'s offered
source form names the immediate holder `me:e` (not `here`). `~here`,
`~it`, `~him`, `~her` are one referent (not a set — a bare `look` is the
room). Query aliases: `?name` keys in the alias table, `alias set|unset
--query`, defaults `here` (Mobile) and `it`/`them`/`him`/`her` (Focused),
expanded by `ShellApi.expandQueryAliases` for every typed object slot and a
`source::verb` source. ⚠ The docs (`mql-grammar.md`, `mql.md`,
`shell-alias.md`) are respelled in C7's doc pass, with everything else
that pass touches.

**B3b — `here` splits: 142 slots say what they meant.**
*Decisions:* D-B3.
*Size, honestly:* 142 slots in 120 view files across the platform pack and
~40 trade and locality packs. This is **not** a respelling — each slot is
read and judged — and it changes what some verbs can bind. Budget it as the
second-largest wave of the stage.
*Procedure:* first write the worklist — a throwaway report (run from the
scratch dir, not committed, not a `drive-*` script) listing every slot whose
`scope:` contains the word `here`, with its view, its `requires:`, its
`default:` and the other scope words beside it. Then, per slot, ask what the
old pool could have given it:

| the slot is after | old pool supplied | rewrite `here` to |
|---|---|---|
| a thing that stands in the place (a tool, a burner, a board, a counter, a person) — by far the most common `requires:` | nothing (`here` never held what stands there; `peers` beside it did) | **drop the word**; if `peers` / `reachable` is not already in the list, add `~peers` |
| the ground or the place itself (`SoilMixin`, `CultivableMixin`, `GroundPointMixin`, a `Location` class, `look` with no target) | the place | `~here` |
| a way or its door (`open`, `close`, `lock`, `knock`, the locomotion verbs not already on `me:e:exits`) | the exits and doors | `~here:exits` |
| a place seen across a way | open ground across | `~here:exits:to` |
| the vessel you sit in or its door | the vessel's surface | `me:e`, `me:e:exits` |
| `requires: any` / `VisibleMixin` (16 + 5 slots — `look`-shaped) | everything above | the union the verb really wants, spelled out: typically `["~here", "~here:exits", "~peers", "~person"]` |
| a building whose landing this is | the landing's buildings | ⚠ **no chain is known to express this.** Find how `PerceptionApi.reach`'s `around` pool derives it; if an existing step reaches it, use that. If none does, **stop**: list the slots in this plan and ask — do not add a relation, a step or a second face to `~here` |

Order within a list is kept (first-try precedence is behavior). Then delete
`candidatesForHere`'s scope use, the legacy block's remainder, and
`PerceptionApi.reach`'s `here` pool if nothing else asks for it.
*Acceptance:* `grep -rE "scope:.*[\[\", ]here\b" packages/content` is
empty; for every pack touched, its vitest green; a table test over the
binder asserts, for one representative verb of each row above, that what
bound before still binds (`open north`, `dig` on the ground, `look`, a tool
verb at a bench, a verb used from inside a coach); `lint:command-views`
green. The wire drive's existing files that exercise these verbs are run
(`pnpm wire` for the touched trades' files, not the whole wire suite).
*Commit:* `build(naming-overhaul WB3b): here is the place — every view says what it meant`.

✅ **Done.** 116 slots (the 142 counted lines) judged by `requires:` from a
scratch worklist: a thing that stands in the place (tools, burners,
counters, boards, books, desks, baths…) **drops** the word (`~peers`
beside it already); the ground/place (`SoilMixin`, `CultivableMixin`,
`Growing|Soil`, a pump's source, the market square, the midden) → `~here`;
`bail` → `~here, me:e`; `any` / `affords` / `VisibleMixin` (non-book) /
`DetailedMixin` / `DurableMixin` → **`~here, ~here:exits, ~here:~buildings`**
in the word's place — the landing row spelled with the build's
`~buildings`. The scope word `here`, `candidatesForHereScope` and the dead
element-derivable flat-map code are gone; an empty scope is the
`~reachable` backstop. `PerceptionApi.reach`'s `here` pool STAYS — the
`~reachable` pool still includes the place's surface. Card `query:` strings
were missed by the B3a call-site scan (the shopkeeping stock card found
it) — swept. ⚠ The per-row binder table test is replaced by the touched
packs' suites and the drive (no isolated fixture world reproduces a coach,
a bench and a lane at once cheaply).

**B4 — Notify and contacts over relations; the id is visible.**
*Decisions:* D-B6, D-B9, D-B12.
*Files:* `NotifyControllerBase.ts` (`normalizeRef` goes; the typed subject
is a relation name resolved through `groupRefOf`), the `notify` views and
their help; `S/lib/social/Contacts.ts`, `PartyMember.ts`, `GroupMember.ts`
(`groupRefOf`); `SocialLogic.canonicalReservedRef` (the bare `friends` /
`foes` words become `~friends` / `~foes`); `NotifyRule.ts`'s doc comments.
**`matchesRule`, `ruleFor`, `excludeMql` and the stored `groupRef` are not
changed.** `ContactsRemoveController.ts`, `ContactsControllerBase.ts` and
`P/cmd/social/contacts.yaml` (`remove` takes an object slot scoped to your
lists, reads `via.relation`, and on an empty binding asks
`ContactsMixin.entryNamed`); `WhoController` and the profile card print
`@<id>`; `docs/subsystems/social-graph.md`, `contacts.md`, `grouping.md`.
*Acceptance:* a rule set with `notify ~friends` fires when a friend arrives
and not for a stranger; a rule set with `notify ~bookclub` fires for a
fellow member (the async group match, unchanged); `notify contacts:…` is
refused with the new spelling; `contacts remove ~friends:<them>` takes them
off that list and no other; with them logged out, `contacts remove <their
name>` still removes them; `who` shows ids.
*Commit:* `build(naming-overhaul WB4): notify and contacts speak relations`.

✅ **Done.** `normalizeRef` became `groupRefFor(giver, raw)`: the bare
pseudo-subjects pass, `~name` asks `Relating.groupRefOf`, and a typed
`contacts:`/`managed:`/`mql:`/`party:`/`guild:` ref, a bare word or an
unkept relation is refused with the relation spelling. `Contacts.groupRefOf`
keys on `getPlayerId()` — the same key `SocialLogic.canonicalReservedRef`
uses, so the reserved dedup holds. ⚠ **Found:** the settings card issued
`notify set <groupRef>` — every button would have been refused. Decided:
the `social.rules` projection carries a typed `subject` (`~friends`, the
bare pseudo-subjects) and the card's commands use it; rule lines and echoes
print the subject, never the ref. `subjectFor` asks `friends`/`foes` by
name as well, since an empty reserved list answers `groupRefOf` but is not
in `relationsFor`. `contacts remove` reads the list off `via.relation`,
else the typed `~<label>:<them>`, else a trailing label; the offline
fallback is still the old name match over the list's entries
(`entryNamed` arrives with C6). `who` and the profile card print `@<id>`
(`addressOf`) — ⭐ decided: withheld when a disguise masks identity, since
the id would unmask them (lens 3a).

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

✅ **Done.** `GrammarApi` holds the tiers, `scoreTier`, `rank`, `name` and a
public `pluralWord`; `scope-walk` keeps candidates, facets and attribution.
⭐ **Decided (perf, crowded-rooms precedent):** every Api static pushes a
security frame, so the scorer is `GrammarApi.scoreAll(lists, words)` — ONE
call per pool — and the pure per-list rule is a module function in
`grammar.ts`; a per-candidate static would have put a frame on every
candidate in a crowd. ⭐ **Decided (lint:duck-typing):** `NameAnswer` is
discriminated by `kind` (`one` · `tie` · `none`), since `'one' in answer` is
an `in` probe the ratchet counts. `named(context, answer, noun, what)` takes
the typed words for the refusal's `what` fact; `no-such-name` already
existed from A1. ⭐ **Decided:** the hand census also reads controllers (the
plan said not), because the duration parsers the C1 acceptance names
(`daysOf`, `parseHoldS`) are controller methods; the controller-only counts
are `.raw` re-reads and `.via`/lowered-model reads. **Ceilings pinned:**
article strips **36**, hand compares **92**, duration parses **6** (incl.
`WorldClockRegistry.durationSeconds` and the test-harness clock, which C1
must judge), word-keyed indexes **14**; raw re-reads **35**, via/lowered
**49**. `MUST_FIND` names twelve grounding sites; the first draft missed two
(fixed), the second overcounted dedup sets and date placeholders (cut).

**C1 — One duration.**
*Decisions:* D-C6.
*Files:* `S/lib/command/CommandDefinition.ts` (`parseDuration` → game
seconds, the word forms, the three keys and their load-time validation);
`CommandLogic.ts` (coercion, the positional two- and three-word forms, the
`bad-duration` refusal); `check-view-keys.ts`; `P/cmd/retail/rent.yaml` +
`RentController.ts` (`daysOf`, `DAY_WORDS`, `span`'s parsing half);
`P/cmd/device/fire.yaml` + `FireController.ts` (`parseHoldS`);
`P/cmd/system/press.yaml` and its controller (ms → game seconds, with
D-A10). **Not touched:** `S/api/stream.ts`, `StreamLogic.ts`,
`StreamStartController.ts` and the stream views — entered in the gate's
exemption table (wall clock, owner ruling); `S/lib/script/Interpreter.ts:202`;
`docs/subsystems/quantities.md`, `command-spec.md`.
*Acceptance:* `rent canoe for a week | 7 days | 2 weeks`; `fire limekiln
for 90 minutes`; `for soon` and `for a while` give the identical line; a
`rent` of `90 minutes` refuses on granularity; the census's duration count
is 0 outside the stream exemption.
*Commit:* `build(naming-overhaul WC1): one duration slot, in game time`.

✅ **Done.** ⭐ **Decided (placement):** the one grammar is
`GrammarApi.parseDuration` / `isDurationUnit`, with
`CommandDefinition.parseDuration` forwarding — the world clock
(`WorldClockRegistry`) must read it too, and `CommandDefinition` imports the
command Api (a boot-cycle risk from a registry); a duration is English
grammar, and `grammar.ts` is the rule's census-exempt home. Word forms
(`a week`, `two days`, `an hour and 30 minutes`, `a fortnight`) read as
digits. `granularity:` / `min:` / `max:` on a duration slot, validated at
load (schema, `lint:view-keys`, `validateField`, and a default that will
not do refuses the view). ⭐ **Decided (the refusal channel):** a bind error
had no row — only `bind-failed` with a summary — so `BindErr` and the
assembly result gained an optional `refusal {reason, facts}` that
`CommandGiver` emits through `context.refuse`; `bad-duration` is now the
binder's line, and `for soon` / `for a while` give the identical one
(an unreadable run takes every word up to the next slot's preposition). The
binder takes the longest run of up to four words that reads as one
duration. ⭐ **Decided (D-C6 over the file list):** the plan's file list said
the Interpreter's `wait` was not touched, but D-C6 and the acceptance (*the
census's duration count is 0*) say it reads the same grammar; it does, with
a bare number still meaning seconds. The world clock's `after('5 minutes')`
and `testharness clock-advance` read it too. Rent's slot is `span`
(`granularity: day`, `min: 1 day`); fire's `hold` (`min: 1 minute`).
`press --expires` already read game seconds (A3). Census: duration parses
**0**; hand compares **89** (−2 a census correction — a length or number test
names nothing — and −1 the world clock's parser); controller decisions 503.

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

✅ **Done.** `DocumentCatalogue.named(text, among?)` names a kind's
documents by the words its kind derives (`keywordsOf`; a kind not yet
declared `keyworded` still answers to its leaf), path order the tiebreak.
`party adopt` names a formation through it and `setPartyFormation` takes the
picked path (a bare word still resolves exactly, for a script or fixture);
`operate … for <op>` names the operation. Recipes are template rows, not a
document catalogue, so `RecipeCatalogue.recipeNamed(text, among?)` is the
same rule over id · name · keywords; the word index and
`Recipe.matchesKeyword` are deleted, `findByKeyword` keeps path and id and
otherwise takes only a unique name, and the recipe verbs (`bake`, `cook`,
`mix`, `forge`) name through `CraftController.recipeNamed` → `named`, so two
recipes sharing a word prompt. `FormGrammar.parse` tokenizes with
`GrammarApi.tokenize` (articles fall away there), keeps the proportion
vocabulary and names the form word or class through the rule (forms gained
a `keywords` field). `callUpImpl` names releases by headline and press, and
home documents by title, through the rule — newest first, a tie the newest.
⭐ **Decided:** emote dispatch stays an exact VERB word (a command word, not
a name; `smile` smiles, unchanged) — `soul search`'s index joins the
exemption table as a search. ⭐ **Decided:** the carving plan, an object
answer that cannot prompt, takes the first carving of a tie. **Moved to C3:**
`prescribe` (a Condition is an Idea). **Census:** article strips 35, hand
compares 84 (removals plus one tightening — a variable holds a lowered value
only when the lowering is on its own receiver chain), word-keyed indexes 11.

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

✅ **Done, with one open.** Every Idea-shaped name below goes through
`GrammarApi.name`, and every catalogue keyed by a lowered name lost its index:
**spells** (`SpellCatalogue.spellNamed` / `MagicApi.spellNamed`; `byName`
gone; an ambiguous short name is a TIE asked by `cast`, the cast carries the
path; descriptors gain `keywords`), **readings** (`readingNamed`; `measure`,
`analyze`, `readings`), **conditions** (`treat <condition>` names among the
whole roster so a wrong call stays possible; `prescribe` names among the
drugs and asks on a tie), **lanes** (a stop from here), **expanse nodes**
(`nameKeywords` + `Expanse.nodeNamed`; `namesRiver` tokenizes),
**stand species**, **apps** (`AetherHost.appNamed(text, installed|any)` —
`apps install Messages`, `apps uninstall the messages`), **localities**
(`AddressRegistry` keeps a set; a shared name breaks toward the broader
place, as before), **organizations** (`findOrganization` by label and key,
no substring), **brands** (`resolveBrandKey`), **offices**
(`OfficeControllerBase.officeNamed` — `office vacate prime minister`) and
**wallet accounts**. `job apply`, `job quit` and `clock` name the house
among the ones in hand (`EmploymentApi.organizationNamed(text, paths)`:
the openings here, your employers) and `house appoint`/`dismiss` (and their
authority validator) take a house by name, a path still answering — no view
arg asks for a path. Unknown names are the `no-such-name` row
(reason-rows legacy −3). ⚠ **Open (recorded, not silently dropped):** D-C9's
`~employers` / `~business` RELATIONS were not minted — the in-hand pool is
the same scoping without the relation — and `findOrganization` stays a
global name read for the record verbs (`chronicle`/`competence`) and
`house appoint`; the Organization `name` field is unchanged and spells did
not gain `PerceptibleMixin` (descriptors carry keywords instead). These are
review items. **Census:** article strips 30, hand compares 75, word-keyed
indexes 9; via/lowered 45.

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

✅ **Done — re-planned in place.** ⭐ **Decided (D-C7's object slot NOT taken,
lens 2 + the sale's own semantics):** `buy`'s `thing` stays a word. An object
slot binds only goods PRESENT, and two of the sale's paths are about goods
that are not: a store-fed line is brought up TO ORDER from the store when
the shelf is bare (storage-and-ice D8), and *sold out* is the shop's own line
for a good it carries but has none of today — both need a NAME for an absent
good. What D-C7 was for is kept: every retail matcher names through the one
rule — `Stock.lineForWord`, `pricedKeyFor`, `resolveBuy` (keywords + leaf),
`HeldGoods.resolveHeld` (consignments), `HullBook.hullsNamed` (the yard's
offers), `Tariff.serviceNamed` (`order` passes the phrase; no controller
lower-casing), `Store`'s receipts — so `buy loaves`, `buy a loaf` and `buy
block` work and alike goods are one choice (no prompt among eleven loaves).
The `counter.raw` sniff is gone: a single bound result now carries
`defaulted` (as a list did), and `buy rope at <first>` (`at` joins `from`)
holds the named seller to its own refusal. `GrammarApi.withoutArticle` is the
one place a RECORDED name drops its article (a ship's register); matching
never uses it. Census: article strips 28, hand compares 71 (with one more
narrowing — a compare operand counts only when it IS a lowered word), maps 8.

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
none remain); `ContactsMixin.entryNamed` rewritten over `GrammarApi.name`
(D-B12).
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
| a duration | `rent`, `fire`, `press` | unchanged | the view's `granularity` / `min` / `max` | — | `lint:view-keys`; load-time validation of the keys |
| notify on a relation | `notify ~friends …`, `notify ~bookclub …` | unchanged | the stored `GroupRef`, from the holder's `groupRefOf` | the async group match, unchanged | the name must be one `me:~` lists and must stand for a durable group — a built-in (`~peers`) is refused |
| your groups as relations | any person slot (`~bookclub:iffy`) | — | `GroupMemberMixin`'s resident map | filled at avatar materialize, kept by `onMembershipChange` — ⚠ a group joined after login must appear with no relog (WB2's acceptance) | `requires:` |

---

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| every drive step behaves as written | steps 1–9 → A1–A3; 10–16 → B0–B4; 17–24 → C0–C7 |
| the same word forms work the same way on every naming verb; a tie is always asked | C0 (the rule), C2–C6 (every caller), C7 (the gate that holds it) |
| a word that names nothing gets a refusal saying what could have been named | C0 (`named()` + `no-such-name`), C2–C6 |
| no player argument requires an internal path or key | C3 |
| `me:~` and `thing:~` say what can be asked; nothing typed reaches at a distance except through a relation or an address | B1, B2, B3a, B3b |
| an edit to any catalogued document is live on the next read | A1 |
| a filed record cannot be written except by its keeper; a ledger never loses or changes an entry | A2 |
| every document prints; every in-world date is game time | A3 (C1 for durations) |
| nothing is written that a nightly reset will silently wipe | A1 (refusal), D-A9 |

Nothing is unmapped. *Reached through a relation* covers loaded people only:
an offline person is not runtime Stuff, and the person handle that would
target one is a separate build (D-B12, Deferred seams).

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
  `WhoController --country` → a search is not a name;
  `StreamApi.parseDuration` / `StreamLogic`'s parser → the stream verbs read
  the wall clock (owner, 2026-11-20). Nothing else. A new
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
| 10 `query me:~` (built-ins, `~all`, your lists, your groups), `look ~here`, `look here` | player | — |
| 10b `goto ~/workroom` | staged | a wizard character with a workroom |
| 11 `dm ~friends:<them>`, `dm <them>` through `~all`, the stranger's refusal, `dm @<id>` | staged setup, player check | `contacts add` on one harness player; the second walks elsewhere |
| 12 a list named `inventory` | player | two harness players |
| 13 `query harbor-book:~`, `charter hesper` | player | at the Terminus harbor |
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

- **Size.** Eighteen waves across the store, the installer, the grammar and
  ~95 matcher sites in ~25 packs. The stages are ordered so that each leaves
  a working tree; if the build must pause, a stage boundary is the place.
- **A1 is the widest single commit** (the closed list has ~20 readers and a
  generated table). A0's parity test exists to make it mechanical.
- **B3a touches ~470 view lines and every test that types a seed word.** It
  is mechanical but large; B1 keeps both spellings alive precisely so B3a can
  be one find-and-replace wave with the suite as its check. ⚠ A scope word
  inside a chain (`here:exits`, `reachable:[class.X]`) is respelled too.
- **B3b is judgment, 142 times.** A slot rewritten too narrowly makes a verb
  stop binding something it bound yesterday, silently (the binder says *you
  don't see that*). The guards are the per-row binder table test, each
  touched pack's vitest, and the trades' existing wire files. The likeliest
  misses: a verb used from inside a vessel (the old pool included the
  vessel's surface), and the landing's buildings (the one row with no known
  spelling — a stop, not an invention).
- **Resident groups** (D-B11) add a subscription per group per logged-in
  member. Unsubscribe in `onDestruct` and on leaving the group; a leaked
  callback is a memory leak that only a crowd shows. If
  `GroupApi.onMembershipChange` cannot report a group you were just added to
  (you were not subscribed to it yet), the add path must fill the member
  directly — check this first in WB2.
- **Synchronous relations.** A relation answers residents only. A listed ship
  nobody has loaded is not in `book:~ships`. `CharterBook.shipFor` loads them
  today (`StuffApi.singleton`); B2 must make the book hold its listed ships
  resident (its authored field's setter returns the load — the *resident by
  construction* rung), or `charter` regresses at a cold harbor. Stop and
  re-plan the wave if a holder's set cannot be made resident that way.
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
  queries; grep before WB3a removes the seed.
- **The census can undercount** — guarded in C0; if a matcher family turns up
  in C5/C6 that the script did not see, extend the script first, then fix.
- **Stop and ask, do not guess:** anything that would add an MQL seed, scope
  or grammar for non-Stuff; anything that would make a document a class or
  an Idea `Visible`; a lint ceiling that would have to rise; a `here`-scoped slot no
  existing chain can spell (WB3b); anything that would give a relation two
  faces or add a relation name the slate does not list.

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
- **Offline people as targets** — the person handle. `contacts remove`'s
  entry fallback (D-B12) is the only offline naming in this build, and it is
  the list naming its own entries, not a person →
  [person-targeting-slate](../slates/engine/person-targeting-slate.md) § 3.
- **Groups you are not in, and `mql:` notify subjects** — no relation, and
  no way to type the latter into `notify` → mql-anchors-slate.
- **The stream verbs' duration** stays its own parser on the wall clock →
  nowhere, until something else shows what real time needs.
- **One neighborhood builder for both scope paths** → one-resolution-rule-slate
  § 3 row 9.
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
