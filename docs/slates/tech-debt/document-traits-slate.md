# Document traits — free-text kinds composing code-defined traits

> **Status: PARTIAL** — opened 2026-11-20 (owner). The ten traits, the `kind`
> declaration, the write funnel and the installer trio shipped with the
> naming overhaul (2026-11) and live in
> [document-store.md](../../subsystems/document-store.md) § Kinds are declared.
> **Left:** whether `recipe`, `maturation-profile`, `fraction-schedule` and
> `archetype` are content, not documents (rule 3's finding) · expiry as a
> lifecycle trait.
> **Size:** a tail (the rule-3 question is a design conversation first).

## Terms (conversation only — nothing is renamed)

- **document** — an entry in the path-addressed store
  ([document-store.md](../../subsystems/document-store.md)).
- **collection record** — a row in its own Mongo collection, whose class
  extends the backend `Document` base (channels, forum subjects, groups,
  parties). **Out of scope here.**

## The rules (owner, 2026-11-20)

Rules 1, 2 and 4 shipped —
[document-store.md](../../subsystems/document-store.md) § Kinds are declared.
Rule 3 is kept for its open finding:

3. **A trait may name a SERVICE that reads a kind** (a catalogue that
   serves it, a validator that checks it) — **never a class the document
   becomes.** A document stays data. ⭐ The test that follows: *a kind that
   is only useful hydrated into a behavior-bearing class is not a
   document — it is content, and belongs to the content system.* Failing
   it today (a finding, not this build's work): `maturation-profile`
   (~60 methods), `fraction-schedule` (~31), `recipe` (~36), `archetype`.

## Decided traits

The traits, the declaration, the installer trio and the write funnel shipped —
[document-store.md](../../subsystems/document-store.md) § Kinds are declared
and § The one write funnel. The survey's five defects closed with them. What
is still open:

### `dated` — when it happened, for ordering

- ⚠ Expiry (release `expiresAt`, edition `validUntilS`) is not this trait —
  a lifecycle trait for later.

### First consumers of `keyworded` (owner, 2026-11-20)

`recipe`, `form`, `formation`, `operation` and `emote` **stay documents**
with `keyworded` (formation and emote `unique` — the word dispatches). This
reverses the earlier "make them keyworded Ideas", made before the trait
existed. Whether `recipe` is really content is settled later with
`maturation-profile`, `fraction-schedule` and `archetype` (rule 3's
finding), not by the naming cleanup.

## Related

- [one-resolution-rule-slate](./one-resolution-rule-slate.md) §§ 1, 6 — the
  matchers this serves.
- [documents-path-identity-slate](./documents-path-identity-slate.md) — the
  pass that made Ideas into documents.
