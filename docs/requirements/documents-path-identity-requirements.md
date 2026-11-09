# Documents — the path is the identity — requirements

**Kind:** refactor/sweep
**Leads from:** kernel. First consumers are content that already exists and
already uses these kinds: smell and taste (aromas, dirt), char-gen naming,
emotes, crafting by recipe word, `survey`'s room archetypes, `help`, the
potter's `shape`, `put … on`, `pump`, `operate`, `fit`, `party formation`,
`cast`, `competence`, `government`, branded goods, and the press. The press is
the first consumer of secondary keys.

The document store is the world's library of written-down things: what packs
**author** (vocabulary, recipes, help, aromas) and what the world **files**
(maps, herd books, bills of lading). This build makes three things true of it.
A document's **path is its only name** — its place on the shelf, so two packs
can each ship a `smoke` because they sit on different shelves. Every document
can be **found by other means** through one catalogue-card shape, without that
ever becoming a second name. And the **Idea families that are only metadata
become documents**, while the Ideas that are nouns a query passes through stay
Ideas and **load when something reaches them** rather than at startup.
Seeded by [documents-path-identity-slate](../slates/builds/documents-path-identity-slate.md);
the precursor, MR !541, did this for aromas and name banks.

## What already exists

- **The store** ([document-store.md](../subsystems/document-store.md)): one
  collection, path-addressed, a closed vocabulary of kinds, installed from
  packs under each pack's root. A path index exists but is not unique.
- **Path citations already shipped** (!541): aromas and name banks are named
  by path, and the census lint checks that a cited name bank exists.
- **Four kinds still carry a second, flat name** shared across every pack:
  emotes (the verb), recipes (the recipe word), blueprints (the id),
  archetypes (the id). The installer refuses a second pack claiming one.
- **A word-to-document index already exists** for command views: path-keyed
  documents plus a lookup by the verb a player types.
- **Typed-word dictionaries** were ruled acceptable if built lazily on first
  use (owner, 2026-10-14, [scan-sweep-slate](../slates/builds/scan-sweep-slate.md)
  Part 2 ruling 1).
- **Metadata held as Ideas**: dirt kinds, cleansers, form words, help concepts,
  placements, pump mechanisms, operations, message topics, joints, combat
  formations, maturation profiles, fraction schedules, fabrics, dyestuffs.
- **Referent Ideas read like documents**: disciplines, spells, corporations and
  brands, governments are each read straight off their rows by a catalogue
  that scans the whole family at startup.
- **The press archive** reads every release and sorts them itself
  ([document-store-tiering-slate](../slates/tails/document-store-tiering-slate.md)).

Therefore what is genuinely new here is: **one secondary-key shape on every
document** and the word index generalized to the typed-word kinds. Everything
else is moving existing content onto shapes that already exist.

## Goals

- A document's path is its only identity, for every kind: no kind carries a
  second name, and the store refuses two documents at one path.
- Every reference an author writes to a document names its path.
- A word a player types (a verb, a recipe word, a form word, a placement word)
  still finds its document, through an index built when first needed.
- A word still means one thing: a pack that would make a typed word ambiguous
  is refused when it is installed, naming both claimants.
- Any document can be found by a declared key — by equality, by a range, or in
  order of a key — fast, whatever its kind's shape. The press archive reads its
  releases newest first that way.
- The metadata families are documents; nothing in the world can be targeted,
  shadowed or found by MQL as though it were one of them.
- Disciplines, spells, corporations, brands and governments stay Ideas, load
  when something reaches them, and no longer load at startup.
- The aroma library is arranged in directories, and its folders ARE its tree.
- A fresh world boots, plays and survives a restart with every one of the
  existing behaviors above unchanged.

## Non-goals

- **Cleansers, maturation profiles, fraction schedules, fabrics, dyestuffs** →
  after material decomposition merges; they stay on the slate (it remains
  PARTIAL), so neither build waits on the other.
- **Material, Biome, Condition and the address registry** loading on use →
  [scan-sweep-slate](../slates/builds/scan-sweep-slate.md).
- **`MATURATION_MECHANISMS`** → material-decomposition slate § 7.
- **Two meanings of "archetype"** (an NPC's role vs a room archetype) → left as
  found; recorded in the seeding slate.
- **`release`'s vanish policy and the descriptor bank** →
  [document-store-tiering-slate](../slates/tails/document-store-tiering-slate.md).
- **A targeting language for administration other than MQL** → nowhere yet; the
  governance command palette is unbuilt.
- **New kinds of query on Ideas**, i.e., the governance palette itself → nowhere
  yet; this build only keeps those Ideas reachable.

## Placement

Kernel: the document store, the installer and the typed-word resolution are
platform. Every pack that ships or cites these kinds has rows rewritten
(citations become paths), and base-library's aromas move into directories. A
second pack shipping its own aroma, recipe, emote or form word needs **no
code**: a file under its own root.

## Collisions

- **Material decomposition** (planned) wraps the cleanser citation; the five
  material-adjacent families are out of this build for that reason.
- **Every pack that ships emotes, recipes, blueprints, archetypes, aromas or the
  converted families** — their files keep their place; their citations change.
- **Sixteen packs' boot lists** name catalogues this build stops booting.
- **The 109 `archetype:` fields on NPC rows** are a different concept and are
  not touched.
- **Live worlds** carry no data that needs moving (no migrations; dev
  databases are dropped).

## Surface decisions

### Who sets a document's keys
**The kind declares them, derived from the document's own data**; no author
writes a key. A key written separately would repeat a value already in the
document and drift from it (the two-copies rule). Adding a kind is already a
platform edit, so content authors need no code either way.

### What keys answer
**Equality, a range, and ordering on one key.** The press needs *newest first*;
recipe-by-cuisine needs equality.

### Where a typed word's uniqueness is enforced
**At install, as a check on the word.** Installing a pack is the only moment a
realm adds one; a lint cannot see a pack added to a live world, and an index
built lazily would only refuse at runtime.

### Uniqueness
**Only the path, and typed words.** No key is unique.

### Combat formations
**A document.** Which formation a party uses is the party's state (a coup
changes it); the preset is vocabulary a query reaches through the party.

### Order against material decomposition
**Independent.** The five material-adjacent families are left out (above).

### The aroma directories
**Included, and the folder is the tree.** An aroma's parent is the aroma its
folder belongs to (`aromas/smoke/peat-smoke` is a kind of `smoke`); an explicit
`parent:` exists only to hang an aroma under another pack's. The hierarchy the
owner asked for in !531 becomes the authoring format, with no second copy of
the tree.

## Lens pass

1. **Pedagogy** — no Discipline changes. The nose still reads deeper with
   training, now walking a tree an author can see as folders.
2. **Creative expression** — the ordinary case gets easier: a pack ships a
   word under its own root with no collision against an unrelated pack, and
   arranges its aromas as folders. Bespoke cases (hanging an aroma under
   another pack's) keep a field.
3. **Immersion / participation** — invisible to a player when it works; the
   drive's job is to prove nothing a player does changes. Participation is
   untouched.
4. **Values** — none decided here. Typed-word ambiguity is refused rather than
   resolved by install order: the store does not pick a winner silently.
5. **Continuity** — documents persist across epochs as text; nothing here is
   epoch-bound.
6. **Economy** — none. Startup does less work, which is the only cost moved.
7. **Governance** — no judgment of a person. ⭐ The Ideas kept as Ideas are
   kept *for* governance: the administration layer will reach through
   institutions and fields of study.

## The drive

Every step is `instant` and asserted as a `player` would see it unless tagged.
There are no new places, so no light step.

### Blocking drive

0. *(staged)* Drop the world's database and boot. Every pack installs; the
   world answers.
1. In the tannery yard, `smell`: the air smells of the tanyard's words. A
   trained tanner's `smell` reads deeper down the aroma tree, and the deeper
   word is one the folders put under the shallower.
2. Wear a sweat-soaked shirt; someone else's `smell` at you names stale sweat.
3. `smile`, then `agree`: both emotes work by the word typed.
4. At a carving bench, `carve` a recipe by its word: it is made.
5. In a bedroom, `survey`: the room archetypes it does and does not meet are
   listed.
6. A new player enrolls: char-gen suggests a name from the species' banks.
7. `help` on a concept: the concept page reads.
8. At a wheel, `shape mug`: the potter's form word is understood.
9. `put` a thing `on` a shelf: the placement word is understood and `look`
   shows it there.
10. At a suction pump on a hill, `pump`: it lifts, and reports its ceiling in
    words.
11. *(staged: a wound)* A surgeon `operate`s: the operation runs by its name.
12. `fit` two parts with a named joint: they are joined.
13. A party captain adopts a formation and assigns a role: both stand.
14. `cast` a known spell: it casts, though no spell catalogue loaded at startup.
15. `competence`: the disciplines a character holds are listed by name.
16. `government` in a locality: its government reads.
17. `look` at a branded good: the brand reads.
18. Publish two releases a game hour apart; the press lists the later one
    first.
19. *(staged)* Install a test pack that ships an aroma named like a
    base-library one: it installs, and both aromas read. Install a test pack
    that ships an emote verb another pack ships: it is refused, naming both.
20. Restart the world. Steps 1, 3, 5, 14 and 18 read the same.

### Soak drive

None: nothing in this build depends on the clock.

## Acceptance criteria

- A fresh world boots with every pack installed, and every step of the drive
  reads as written, before and after a restart.
- No document in the store shares its path with another.
- Every citation to a document in shipped content names a path that a pack
  ships; a misspelled one is caught before merge.
- Two packs may each ship a document of the same name under their own roots
  and both are found; two packs claiming one typed word are refused at
  install, naming both.
- Documents of any kind can be found by a declared key by equality, by range
  and in order, and the press shows releases newest first.
- None of the converted families can be found or targeted by MQL as a thing.
- No catalogue of disciplines, spells, corporations, brands, governments,
  topics, placements, operations, joints, recipes, archetypes, blueprints or
  emotes is loaded at startup; each is there the moment something reaches it.
- An aroma's folder determines its parent, and the nose's depth of naming is
  unchanged on the shipped content.

## Cross-references

- [documents-path-identity-slate](../slates/builds/documents-path-identity-slate.md) — seeding slate, with the reuse ledger for the plan
- [scan-sweep-slate](../slates/builds/scan-sweep-slate.md) — ruling 1 (typed words) and the boot catalogues
- [document-store-tiering-slate](../slates/tails/document-store-tiering-slate.md) — the press archive's index
- [document-store.md](../subsystems/document-store.md) · [content-packs.md](../subsystems/content-packs.md) · [senses.md](../subsystems/senses.md)
- In flight: material decomposition (`reqs/material-decomposition`)
</content>
</invoke>
<invoke name="Bash">
<parameter name="command">cd /home/bobalu/play/saxonberg/build-4 && python3 - <<'EOF'
p='docs/slates/builds/documents-path-identity-slate.md'; s=open(p).read()
i=s.index('## Open questions')
s=s[:i]+'''## Open questions

All seven were answered at requirements (owner, 2026-11-09) — see
[documents-path-identity-requirements](../../requirements/documents-path-identity-requirements.md)
§ Surface decisions: keys are declared by the kind and derived from data ·
equality, range and order on one key · typed-word uniqueness checked at
install · uniqueness only on path and typed words · CombatFormation is a
document · the five material-adjacent families wait for material
decomposition · aroma directories are in, the folder is the tree.

**Recorded, not decided:** an NPC's `archetype:` (a role) and an archetype
document (a room) are two meanings of one word.
'''
open(p,'w').write(s)
EOF
git add docs/requirements/documents-path-identity-requirements.md docs/slates/builds/documents-path-identity-slate.md && printf 'reqs(documents): requirements for the path-identity build\n\nThe slate'"'"'s seven questions answered with the owner; a 21-step blocking\ndrive over the content that already uses these kinds; no soak drive.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' > $CLAUDE_JOB_DIR/tmp/msg.txt && git commit -q -F $CLAUDE_JOB_DIR/tmp/msg.txt && git push -q -u origin reqs/documents-path-identity 2>&1 | grep -E "merge_requests" | head -1; git log --oneline -1