# Document traits — free-text kinds composing code-defined traits

> **Status: UNBUILT** — opened 2026-11-20 (owner, in the listing-resolution
> conversation). The vocabulary and the declaration are decided (below, the owner's).
> **Left:** retiring the closed
> `DOCUMENT_KINDS` list and everything that enumerates it · the five
> defects below.
> **Size:** a build.

## Terms (conversation only — nothing is renamed)

- **document** — an entry in the path-addressed store
  ([document-store.md](../../subsystems/document-store.md)).
- **collection record** — a row in its own Mongo collection, whose class
  extends the backend `Document` base (channels, forum subjects, groups,
  parties). **Out of scope here.**

## The rules (owner, 2026-11-20)

1. **A kind is free text.** Anyone can add one; the kinds the platform owns
   are reserved by fiat, not by a closed type. The per-kind declaration
   stays — it moves to whoever ships the kind. Two packs claiming one kind
   is a collision the installer reports.
2. **Traits are code; kinds compose them as data.** A trait is a behavior
   the platform defines (like a mixin); a kind turns it on and passes its
   parameters. A derivation that will not reduce to data is a sign a trait
   is missing.
3. **A trait may name a SERVICE that reads a kind** (a catalogue that
   serves it, a validator that checks it) — **never a class the document
   becomes.** A document stays data. ⭐ The test that follows: *a kind that
   is only useful hydrated into a behavior-bearing class is not a
   document — it is content, and belongs to the content system.* Failing
   it today (a finding, not this build's work): `maturation-profile`
   (~60 methods), `fraction-schedule` (~31), `recipe` (~36), `archetype`.
4. **Bookkeeping and modelling are trait combinations, not two systems.**
   A reference kind is `shipped`; a filed record is `filed` (and usually
   `dated`); `edition` and `ship` are both.

## The survey (2026-11-20, all 42 kinds)

Three families: **shipped reference** (27 — recipe, emote, aroma, form,
joint, dirt, fabric, dyestuff, maturation-profile, fraction-schedule,
cleanser, operation, help-concept, formation, placement, shape, reason,
topic, name-bank, blueprint, command-view, archetype, pump-mechanism, msh,
standby-reason, lower-third-panel, release) · **mixed** (edition, ship) ·
**filed records** (13 — herd, fishery, body, bore, water-right,
warehouse-receipt, bill-of-lading, rate-card, instrument, map, berth-roll,
berth-book, stream-token).

**Code that depends on the list being closed:** `DocumentKinds.ts`
(`DOCUMENT_KINDS`, `DeclaredDocumentKind`, `DECLARED_DOCUMENT_KINDS`);
`StoredDocument.cardOf`; `DocumentLogic` (`BUSINESS_DOCUMENT_KINDS`,
`saveToRegister`'s declared check, `catalogueForImpl`, the `pagesOfImpl`
switch, pinned kind literals); `ResetPolicy` + `gen-schema`'s
`declared-document-kinds` keep; `paths.ts` `NON_TEMPLATE_DIRS`;
`PackLogic` (`GATED_DOCUMENT_KINDS`, `DOCUMENT_VALIDATORS`,
`activeDocumentKinds` ×5, `invalidateDocumentKind`, the command-view
special cases); `check-typed-words`, `check-untitled-paths`,
`check-template-census` (a stale hand copy), per-kind lints; tests.

**Defects the closed list hides** (each falls out of the traits):

1. CMS edits to `recipe`, `archetype`, `help-concept`, `blueprint`,
   `name-bank` never go live — their catalogues are undeclared, so
   `forgetEdited` cannot reach them (catalogued trait owns going live).
2. An `instrument` never reads as paper — `pagesOf` reads `title`/`text`,
   which the writer never sets (titled + paper).
3. Runtime-only content dirs (`maps`, `herds`, `papers`, `bodies`…) are
   reserved template-dir names; a pack tree using one is skipped silently.
4. `check-template-census`'s copy of the reserved dirs is stale.
5. `keys.word` is read at runtime only by `formation`; every other kind
   declares words for the install uniqueness check and matches in memory
   by its own rule (the listing-resolution matchers).

**Doctrine conflict:** `document-store.md`'s limb *"something writes it
after it loads ⇒ an Idea"* is violated by every filed record and by
release (retract) and emote (disable). It was written for reference
metadata; restate it in trait terms. Flagged as possibly Ideas: `herd`,
`water-right`, `warehouse-receipt` (named, acted on, stateful).

## Decided traits

### `titled` — what it is called

- **Declares** which data field holds the title — per kind, because
  documents are bespoke (release `headline`; ship `name`; receipt `what`;
  help-concept/edition `title`; recipe/formation/pump-mechanism/blueprint
  `name`; standby-reason/archetype/joint/operation/topic `label`).
- **Gives:** the display of one entry everywhere — a register's summary
  line, the choices in a "which did you mean" prompt, the list in a "no
  such thing" refusal, `ls`. Retires `pagesOf`'s `name|title|what|headline|key`
  guess and `callUp`'s headline guess. No title → the leaf.

### `named` — what words find it

- **Declares:** `keywords` — which data field holds extra keywords
  (default `keywords`; placement → `prepositions`, emote → `searchTerms`);
  `leaf` — whether the path leaf answers (default yes, **switchable off**
  per kind — a filed record's leaf is often an id); `unique` — whether a
  word must mean one document across every pack (default **no**).
- **Answers to** (derived, never stored — `NamedMixin.getKeywords`'s
  shape): the leaf (unless off), the keywords field, and — when also
  `titled` — the title and its bare form without a leading article.
- **Matched by the one naming rule** (MQL's scorer, lifted to a shared
  home MQL also calls): articles, case, word starts, plurals, ordinals, a
  prompt on a tie. Not MQL.
- **Who can be named is not the trait's** — the reading service or verb
  supplies the candidates (spells you know, a menu's recipes, your herd
  book's herds).
- **`unique` is opt-in:** emote (the word *is* a verb and must dispatch
  without asking) and probably formation. Everything else prompts on a
  tie instead of failing install.
- Retires: `form`'s `key ?? leaf` (authored keywords) and placement's
  first-preposition word (the keywords field).

### `filed` — written by its transport, and only by it

The write transports are the eight narrow-by-construction paths already
in `DocumentApi`: **register** (a society's book about somebody else —
herd, fishery, body, bore, ship, berth-book), **business** (a business's
own papers — bill-of-lading, warehouse-receipt, rate-card), **release**
(the press), **instrument** (a contract's papers into each party's home),
**map** (a player's map claims), **stream-token**, **berth** (a landing's
roll), **edition** (a frozen printing). ⚠ `water-right` has none — its
registry writes with the plain `save`, ungated.

- **Declares** which transport writes it (`filed: register`). The
  transports stay code and closed — each is a security path; a pack
  declares that its kind is register-filed, it cannot invent a transport.
- **Gives:** the kind is writable **only** through its transport — the
  plain `save` refuses a filed kind (today a branch owner could write a
  herd record by plain `save`; title on the path is the only gate). The
  transport checks the kind's declaration instead of a list
  (`saveToRegister`'s declared check and `BUSINESS_DOCUMENT_KINDS` retire).
  No content dir unless also `shipped` (defect 3). Kept across the nightly
  reset — a filed document is world state.
- Path schemes (slug, hash, home key) stay with the transport.

### `dated` — when it happened, for ordering

- **Declares** the field, its **unit** (game seconds, or real ms for an
  out-of-character kind — today only `stream-token`), and **indexed**
  (the date on the card so newest-first and ranges are database queries;
  default **off**).
- **Gives:** one ordering for listings, `ls`, a register's pages and "the
  current one" (the newest rate card); the date beside the title in a
  summary line.
- One "when" per kind — a receipt's `settledAtS` is just data.
- Indexed: **release, bill-of-lading, warehouse-receipt, rate-card** (they
  grow per event and are read newest first). Maps not.
- ⚠ Expiry (release `expiresAt`, edition `validUntilS`) is not this trait —
  a lifecycle trait for later.
- ⭐ **Release and edition move to game time** (owner, 2026-11-20 — *game
  clock only*): `publishedAt` and `frozenAtMs` are real ms today; both are
  in-world.

### Undeclared kinds are refused

Writing a kind nobody declared is **refused** (refuse/skip/throw), not
written and wiped at the next reset. The one live case, the
`venue-eighty-six` list the enforcement brain writes
(`lib/behavior/enforces.ts:152`), gets a declaration (likely
`filed: business`).

### Where a kind is declared — a `kind` document (owner, 2026-11-20)

One kind is reserved by fiat and known to the installer: **`kind`**. Every
other kind is declared by a document of kind `kind` at
**`<root>/kinds/<kind>`**, shipped by whoever owns it:

```yaml
# trade-ranching/content/kinds/herd.yaml  → /trade/ranching/kinds/herd
traits:
  filed: register
  named:  { leaf: false }
  titled: { field: name }
  dated:  { field: founded, unit: game-s }
```

- **The kind's name is the leaf.** The namespace is global; a second
  declaration of the same leaf anywhere is refused, naming both.
- **Title on the declaration's path governs who may change the kind** —
  the ordinary path rule; no new authority.
- **Why a document, not a manifest block:** it is edited live through the
  CMS under the same gate; it needs no pack (an author in their own extent
  can declare a kind at runtime); and it describes itself (`kind` is
  titled and named by leaf, so `ls …/kinds` and `help` read like anything
  else).
- **The installer reads every pack's `kinds/` first**, then documents
  against them. A pack shipping documents of a kind another pack declares
  must `requires` that pack.
- **Service references** (a catalogue, a validator) are paths, resolved
  and checked at install like a command view's `controller:`.
- **A live edit the existing documents do not satisfy is refused**, naming
  them (turning on `unique` over a shared word; making a kind `filed` with
  documents at plain-save paths).
- **Removing a declaration while documents of that kind exist is
  refused.** Shipped documents leave with their pack, so the conflict is
  filed documents — world state nobody could then write or reset
  correctly.

### The installer trio (owner, 2026-11-20)

Replaces `PackLogic`'s `DOCUMENT_VALIDATORS` (22 entries) and the
`invalidateDocumentKind` switch.

**`validated` is not a trait.** The 22 validators were 15 catalogue
`parse` calls, 5 value-class `fromData` hydrations and 3 hand-written
shape checks. So:
- **Shape is data** — a `fields:` schema in the declaration
  (`label: { type: string, required: true }`), checked at install and on
  every save. Topic, help-concept, standby-reason and lower-third-panel
  need nothing else; command-view's JSON schema moves into its
  declaration.
- **Meaning is the catalogue's** — a catalogued kind is checked by the
  service that reads it (the `parse` 15 kinds already have). No separate
  validator reference.
- The `fromData` validators (`Emote`, `Recipe`, `Archetype`, `StandbyReason`,
  `LowerThirdPanel`) go — hydrating into a class to validate is the rule-3
  smell.

**`catalogued`** — `by` (the serving singleton's path, checked at
install) and `load`: `per-path` · `whole` · `boot` (all three in use).
- **One interface every catalogue implements: forget these changed and
  deleted paths.** The installer and the CMS both call it after any edit.
  The go-live switch retires; each case becomes that catalogue's own
  forget (the command catalogue reloads a view, the soul catalogue drops
  its cache, the recipe catalogue re-warms). Recipe, archetype,
  help-concept and blueprint get declared catalogues — **defect 1 fixed
  by construction.**
- **A reader with a private cache must be the kind's catalogue** —
  `NameBank`'s static cache becomes the name-bank catalogue or stops
  caching.

**`shipped`** — `dir` (a top-level dir of a pack's `content/`), `ext`,
`vanish` (delete · archive · keep).
- Command views' rule (any `cmd/` dir anywhere in the tree, the path
  content-relative — special-cased in four places today) becomes a
  parameter: `shipped: { in-tree: cmd }`.
- **Reserved dir names derive from `shipped` declarations only** — runtime
  kinds stop reserving `maps/`, `herds/` (**defect 3**). Two kinds claiming
  one dir is refused, naming both.

### The small ones (owner, 2026-11-20)

- **`paper`** — `{ template: … }`, a Liquid template (`ProseApi`) over the
  document's data. Retires the `pagesOf` switch. No template ⇒ the summary
  line (title + date). `instrument` gets a template over its real fields
  (**defect 2**). A recipe teaching when read stays the reader's act.
- **`ledger`** — writes may add, never alter (the constitution's **A2**,
  unenforced until now). `ledger: immutable` — written once, a new version
  is a new path (edition, rate-card). `ledger: { grows: [field…] }` — the
  named fields only gain entries; a save that drops or changes an earlier
  one is refused (the bore log, an instrument's history, map claims).
- **`tree`** — `{ parent: folder | field }`: parent, ancestors, and a
  nearest-ancestor lookup (aroma, topic, reason). Map is prefixed by
  place, not a tree.
- **Kernel words are not a trait** — a bare word resolving to
  `/platform/<dir>/<word>` is `named` (by leaf) + `catalogued` with
  `load: boot`.
- **`secret`** — never listed (`ls`, prefix scans), never paper, never in
  the CMS tree, readable only by exact path (stream-token). Explicit, so a
  later trait cannot expose it by accident.

## The vocabulary, complete

`shipped` · `catalogued` · `named` · `titled` · `dated` · `filed` ·
`paper` · `ledger` · `tree` · `secret` — plus a `fields:` schema on any
declaration. Ten traits, every one parameterized by data; the only code
they name is a catalogue (a service) and a filed transport (closed, a
security path).

## Related

- [one-resolution-rule-slate](./one-resolution-rule-slate.md) §§ 1, 6 — the
  matchers this serves.
- [listing-resolution requirements](../../requirements/listing-resolution-requirements.md)
  — ⚠ written before this conversation; to be rewritten.
- [documents-path-identity-slate](./documents-path-identity-slate.md) — the
  pass that made Ideas into documents.
