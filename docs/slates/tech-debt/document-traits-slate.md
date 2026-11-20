# Document traits — free-text kinds composing code-defined traits

> **Status: UNBUILT** — opened 2026-11-20 (owner, in the listing-resolution
> conversation). Design in progress; decisions below are the owner's.
> **Left:** the rest of the trait vocabulary (filed · dated · shipped ·
> validated · catalogued · paper · append-only · tree · kernel words ·
> secret) · where a kind's declaration lives · retiring the closed
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

## Related

- [one-resolution-rule-slate](./one-resolution-rule-slate.md) §§ 1, 6 — the
  matchers this serves.
- [listing-resolution requirements](../../requirements/listing-resolution-requirements.md)
  — ⚠ written before this conversation; to be rewritten.
- [documents-path-identity-slate](./documents-path-identity-slate.md) — the
  pass that made Ideas into documents.
