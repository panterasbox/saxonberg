# Naming overhaul — requirements

**Kind:** refactor/sweep (with player-visible grammar change)
**Leads from:** kernel. First consumers: every document kind the packs
ship or the game files (Stage A); every verb that names something at a
distance — `dm`, `pay`, `party`, `contacts`, `teleport`, `charter`,
`berth` and the 23 that scope to `online` today (Stage B); the ~71 verbs
that match a typed word by hand (Stage C). One build, one MR, three
stages; nothing merges until all three are done (owner, 2026-11-20).

A player names things in this game in three different worlds that grew
three different sets of rules. **Things in reach** are named by MQL under
one rule. **Things at a distance** are named through fourteen reserved
seed words resolved in two places, one of which (`online`) the owner
wants gone. **Everything else** — a spell, a recipe, a ship in a register,
a herd in a herdbook, a channel, an outfit, a mine face — is named by
whatever matcher its verb's author wrote: about 71 of them, nineteen
different word rules. Underneath, the store that holds most of that
"everything else" is a closed list of 42 document kinds that hides five
live defects.

This build makes naming one thing. Documents get a vocabulary of traits
a kind composes, so a document can say *what words find me* and *what I
am called*. MQL keeps to its mandate — finding runtime Stuff — with one
root (the asker), relations through the things that keep them, and every
seed word a legible relation. And every hand-rolled matcher goes to the
one place it belongs.

Seeded by, and designed in full in:
- [document-traits-slate](../slates/tech-debt/document-traits-slate.md) — Stage A
- [mql-anchors-slate](../slates/engine/mql-anchors-slate.md) — Stage B
- [one-resolution-rule-slate](../slates/tech-debt/one-resolution-rule-slate.md) §§ 6–7 — Stage C (the census and the re-cut)

## What already exists

- **The rule for things in reach** — MQL's scorer: articles, keywords,
  whole words and word starts (never mid-word), plurals, ordinals, quoted
  literals, a prompt on a tie ([mql.md](../subsystems/mql.md)).
- **Seeds** — `me`, `here`, `peers`, `person`, `reachable`, `inventory`,
  `horizon`, `online`, `it`/`him`/`her`/`them`, `$$`, `/path`, `#id`;
  `world` refused ([mql-grammar.md](../mql-grammar.md)). Each resolved by
  hand, twice (as a seed and as a view scope).
- **The affordance selector** — `verb@source` (`drink@glass cocktail`)
  ([command-parsing.md](../subsystems/command-parsing.md)).
- **The document store** — 42 kinds in one closed list; a pack ships
  files into a reserved directory per kind; a CMS edits them
  ([document-store.md](../subsystems/document-store.md)). Five defects
  (document-traits-slate § *Defects*): CMS edits to recipes, archetypes,
  help concepts, blueprints and name banks never go live; an instrument
  never reads as paper; runtime-only directory names are reserved and
  silently skip a pack's templates; a lint keeps a stale copy of the
  reserved names; and declared words are mostly never read.
- **The matchers** — the census (one-resolution-rule-slate § 6): ~71
  hand-rolled, ~14 exact-key lookups that make a player type an internal
  path or key, ~10 verbs that re-read the raw text of a resolved target.
- **In flight:** nothing collides (`build/tooltips`, `build/soak-repair`,
  `reqs/test-world-lifecycle`).

**Therefore what is genuinely new here is:** a trait vocabulary and
kind declarations for documents; relations as MQL's way to reach at a
distance, with seed words become relations; one shared naming rule
outside MQL that MQL also uses; one duration reading; and the sorting of
every matcher into one of those.

## Goals

### Stage A — documents that say what they are

- **A kind is free text, declared by whoever ships it.** A pack (or an
  author in their own extent) declares a kind by shipping a declaration
  document; the platform's kinds are reserved by fiat, not by a closed
  list. Who may change a kind is decided by title on its declaration's
  path, like any document.
- **A kind composes traits**, each configured by data: *shipped* (where a
  pack's files live), *catalogued* (the service that serves it, how it
  loads, and that an edit goes live), *keyworded* (the words that find
  it), *titled* (what it is called), *dated* (when, in game time),
  *filed* (written only by its filing path), *paper* (how it prints),
  *ledger* (writes may add, never alter), *tree* (parent and nearest
  ancestor), *secret* (never shown) — plus a schema of its fields.
- **Every edit goes live.** A CMS edit to any catalogued document reaches
  the next read with no restart.
- **Filed records are written only through their filing path** — a
  herdbook entry cannot be rewritten by whoever holds the branch; a water
  right cannot be written by the plain path at all.
- **Ledgers are append-only, enforced** — a bore log, a contract's
  history, a map's claims only grow; an edition and a rate card are never
  rewritten (the constitution's A2).
- **Every document prints** — an instrument reads as pages; a register's
  entries print as their title and date.
- **In-world dates are game time** — a release and an edition move off
  real time.
- **Nothing written is silently lost** — writing a kind nobody declared is
  refused, not written and wiped at the next nightly reset.

### Stage B — MQL reaches from the asker

- **One root.** Every query is the asker's. A thing at a distance is
  reached through a relation the asker has to it — near it, carrying it,
  a list they keep, a holder they can name — or by an **address**: a
  `/path`, a `#id`, or a **player address**, `@` and the player's id
  (`@abc123`). `@` means a player everywhere — the client's mentions and
  typeahead will share the meaning. Addressing a player by **name**
  (`@bobalu`) is out of this build (owner: *just make the player id
  work*).
  `~/workroom` is a path under your own home (a bare `~` is your home) —
  the shell's meaning — at the start of a query only; `~word` is a
  relation.
- **Relations have a sigil, never a reserved word.** `~name` after a thing
  asks it for the set it keeps under that name (`me:~friends:iffy`,
  `book:~ships`, `card:~nodes`); a bare `~friends` is `me:~friends`;
  `thing:~` lists what relations that thing answers, to you. A thing
  answers per asker (your contact lists are yours alone; a published list
  answers anyone). A built-in relation can never be masked by a list
  named after it; naming a list that way is allowed, with a warning.
- **Seed words become relations of `me`** — `~here`, `~peers`, `~person`,
  `~inventory`, `~reachable`, `~horizon`, `~it`/`~them`/`~last` — each with
  a one-line meaning `me:~` shows. `here` and its like survive only as
  removable default player aliases.
- **`online` goes**, and with it every view scoped to it; a stranger is
  reached by their player id or by getting a relation first.
- **`:members` retires** into `~` relations.
- **The affordance selector is `source::verb`** — `glass::drink cocktail`,
  `me:i:watch::wind` — freeing `@` for player addresses.
- **Notify policies apply to MQL relations** (`~friends`, `~party`);
  their private reference syntax goes.

### Stage C — every word named by one rule

- **One naming rule** — the scorer that names things in reach, in a
  shared home, used by MQL and by every verb that names something that
  is not Stuff. A player who learns how one verb finds a thing has
  learned all of them: articles, case, word starts, plurals, ordinals,
  quoted phrases, a prompt on a tie, a refusal that says what was there.
- **Every matcher goes to its place** (one-resolution-rule-slate § 7):
  real objects through MQL; a set a thing keeps through `~`; documents
  a player names by their keywords; Ideas a player names by their
  keywords (never a proper name a generic thing does not have); a shop's
  inventory as the real goods on its counter; lists of things not yet
  made and a holder's own parts resolved by the holder; collection
  records (channels, boards, groups, parties) by their chosen names; a
  player's own labels by their holder.
- **No player argument requires an internal path or key** — a business,
  an office, a position, an operation is named in words.
- **One way to say how long** — `rent`, `fire` and the stream verbs read
  a duration the same way, in game time, each verb stating its own
  granularity and bounds.
- **It stays this way** — a census of hand-rolled matchers falls to zero
  and is held there.

## Non-goals

- **`hail` and `call` as acts.** `call` is already a sound its hearers
  answer; `hail` becomes an emission its watchers answer. →
  [signalling-slate](../slates/engine/signalling-slate.md). This build
  leaves `hail`'s matcher in place for that build to retire (`call`'s
  "is that my name?" moves onto the animal here, with the one rule).
- **What `look` shows and how the client renders it** — the async
  augmenter pass, `look <exit>`. → the look design conversation after the
  client work, with [carded-prose](../slates/client/carded-prose-slate.md).
- **Who is online** — the owner's player-kept who-list feature. → its own
  build (unslated). Until it ships, strangers are reached by player id.
- **Recipe, maturation-profile, fraction-schedule, archetype as content.**
  They fail the "a document never becomes a class" rule; whether they
  move to the content system is → document-traits-slate rule 3's finding.
- **Documents as Stuff; collection records as Stuff.** → nowhere,
  deliberately (the owner: documents are different; the cost is not
  justified).
- **Expiry as a trait** (a release's `expiresAt`, an edition's validity).
  → document-traits-slate, a later lifecycle trait.
- **A keyword sweep of every content row.** Entries get the keywords the
  drive and the suite need. → nowhere; keywords are authored as content
  is.

## Placement

Kernel: the trait vocabulary, kind declarations, the naming rule, MQL's
grammar and the duration reading. Packs own their kinds' declarations
(each under its own root, `<root>/kinds/<kind>`) and their entries'
keywords. **A second kind needs no kernel change** — only a declaration.

## Collisions

- **Every typed seed and every view scope changes** — `here` becomes
  `~here` (with `here` kept as a default alias); `online` is gone from 23
  views (`dm`, `whisper`, `shout`, `say`, `react`, `introduce`, `profile`,
  `contacts`, `group`, `party`, `scry`, `pay`, `bank`, `house`, `office`,
  `title`, `goto`, `wizard`, `pack`, the four dorm-room verbs).
- **The affordance selector's spelling changes** — `drink@glass` becomes
  `glass::drink` — in players' habits, saved aliases and scripts, and the
  docs and help that show it.
- **Every pack that ships documents** gains declarations for its kinds;
  the platform pack declares the platform's.
- **Saved notify policies** use the old reference syntax.
- **Words that worked by accident stop working** — a mid-word fragment, a
  phrase that merely contains a face's direction. The refusal says what
  could have been named.
- **Who lives there:** anyone at the Terminus harbor (charter, berth,
  course, route), every shop counter (buy), Dave's Bar (order), the
  Rejection put-in (rent), every kiln-keeper (fire), every trade with a
  recipe verb, the mines and quarries, the ranches (draft, move), every
  social verb, and every author editing documents in the CMS.

## Surface decisions

All of them are recorded, with the owner's reasoning, in the three
slates: the trait vocabulary, the declaration, filing, dating and the
rest in document-traits-slate (§§ Decided traits onward); one root,
addresses, `@` relations, seeds as relations, `source::verb`, built-ins
winning, notify and contacts through relations in mql-anchors-slate
(§ Decided); every matcher family's destination in
one-resolution-rule-slate § 7.

## Lens pass

- **1 Pedagogy.** The point: one learnable naming rule, and a grammar a
  player can interrogate (`me:~`, `thing:~`) instead of memorize.
- **2 Creative expression.** An author adds a document kind with no
  kernel change, and a register, a menu or a list with no matcher.
- **3a Immersion / 3b participation.** You reach what you have a relation
  to; a thing you have none to is not nameable. 3b: players keep lists
  others read (the who-list's hook), named by the same rule as anything
  the platform ships; a built-in can never be masked.
- **4 Values.** Removing `online` makes presence something players
  track, not the platform — a values choice the owner made.
- **5 Continuity.** Epoch-neutral.
- **6 Economy.** None produced or consumed. Filed records locked to their
  filing paths protect the records sales depend on (a herdbook).
- **7 Governance.** Ledgers enforced append-only (A2); filed records
  written only by their keeper.

## The drive

Paces: all `instant` unless marked; `player` steps use only player verbs
and tools, `staged` steps may set up with wizard tools. No new places, so
no light step.

### Blocking drive

**Stage A — documents**

1. *(staged)* In the CMS, change a recipe's wording; `look` at that
   recipe's printed sheet (or the menu that offers it) — the new wording,
   no restart. The same for a help concept: `help <concept>` shows the
   edit.
2. *(staged: a contract between two players)* `cat` the instrument in
   your papers — it reads as pages, with its history.
3. *(staged)* An author declares a new kind in their own extent and
   writes a document of it; `ls` the kinds folder shows it by title.
   Writing a document of a kind nobody declared is refused, saying so.
4. *(staged)* Try to overwrite a herd record through the CMS at its path
   — refused, naming the register that keeps it. `draft` from that herd
   (player) still files the change.
5. *(staged)* Try to rewrite an earlier line of a bore log — refused;
   appending a line works.
6. `read` a register (the ship register at the harbor) — each entry is a
   line with its title and date. A press release's date reads in game
   time.
7. *(staged)* A pack with a template folder named `maps/` installs its
   templates (no longer silently skipped).
8. *(staged)* Change a kind's declaration so existing documents no longer
   satisfy it (make `form` words unique while two forms share one) —
   refused, naming the documents. Remove a declaration that filed records
   still use — refused.
9. `ls` where stream tokens live shows nothing.

**Stage B — reaching from the asker**

10. `query me:~` lists your relations with what each means (`~here`,
    `~inventory`, `~reachable`, your contact lists…). `look ~here` shows
    the room; `look here` does too (the default alias).
10b. *(staged: a wizard with a workroom)* `goto ~/workroom` lands in it.
11. *(staged: a contact list "friends" holding a player elsewhere)*
    `dm ~friends:<them> hello` reaches them in another room. `dm <them>`
    with no relation and no player id is refused, saying how to reach
    them; `dm @<their id> hello` works.
12. *(staged)* Make a contact list named `inventory` — allowed, with a
    warning; another player's `query @<you>:~inventory` still shows your
    carried things, not the list.
13. At the Terminus harbor: `query harbor-book:~` lists `~ships`;
    `charter hesper` (the view scoping to that book's `~ships`) charters
    her.
14. `glass::drink` style: `watch::wind` winds a carried watch;
    `wind@watch` is no longer a selector.
15. *(staged)* A notify policy on `~friends` notifies when a friend
    arrives.
16. **Restart.** Contact lists, notify policies, kind declarations and
    filed records come back; steps 1, 10 and 11 still behave.

**Stage C — one rule**

17. `charter hesper`, `charter the Hesper`, `charter HESPER` all name her;
    with two listed ships sharing a word *(staged)*, `charter` by it
    prompts, `2` picks the second, `charter second <word>` too.
18. At a shop counter, `buy loaf`, `buy loaves`, `buy a loaf`; *(staged:
    two sellers here, only the second has rope)* `buy rope` buys from the
    second, `buy rope at <first seller>` refuses naming them. With loaves
    sold out, `buy loaf` says so in the shop's words.
19. *(staged)* `cast Glowlight` and `cast glow` cast it; `apps install
    Messages`, `apps uninstall the messages`; `chat join` a channel by a
    word that begins its name; `job apply <a business's name in words>` at
    its counter.
20. *(staged: a working with a north face)* `sample north` samples it;
    `sample northern rock` refuses and lists the faces.
21. `party adopt wedge`, `party adopt the wedge`; a `smile` still smiles.
22. *(staged)* `contacts remove ~friends:<them>` takes them off the list.
23. At the Rejection put-in, `rent canoe for a week`, `for 7 days`,
    `for 2 weeks`; *(staged: a lit limekiln)* `fire limekiln for 90
    minutes`; `rent canoe for soon` and `fire limekiln for a while` refuse
    with the same line.
24. `help search harb` still lists every topic containing `harb`.

### Soak drive

None. No step depends on the clock.

## Acceptance criteria

- Every step above behaves as written.
- Across every verb that names a thing or an entry, the same word forms
  work the same way, and a tie is always asked, never guessed.
- A word that names nothing gets a refusal that says what could have been
  named.
- No player argument requires an internal path or key.
- `me:~` and `thing:~` say what can be asked and what it means; nothing a
  player can type reaches at a distance except through a relation or an
  address.
- An edit to any catalogued document is live on the next read.
- A filed record cannot be written except by its keeper; a ledger never
  loses or changes an entry.
- Every document prints; every in-world date is game time.
- Nothing is written that a nightly reset will silently wipe.

## Cross-references

- [document-traits-slate](../slates/tech-debt/document-traits-slate.md),
  [mql-anchors-slate](../slates/engine/mql-anchors-slate.md),
  [one-resolution-rule-slate](../slates/tech-debt/one-resolution-rule-slate.md),
  [signalling-slate](../slates/engine/signalling-slate.md)
- [document-store.md](../subsystems/document-store.md),
  [content-packs.md](../subsystems/content-packs.md),
  [mql.md](../subsystems/mql.md), [mql-grammar.md](../mql-grammar.md),
  [command-parsing.md](../subsystems/command-parsing.md),
  [contacts.md](../subsystems/contacts.md),
  [social-graph.md](../subsystems/social-graph.md),
  [retail.md](../subsystems/retail.md), [presentation.md](../subsystems/presentation.md)
