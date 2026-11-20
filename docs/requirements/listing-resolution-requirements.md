# Listing resolution — requirements

**Kind:** refactor/sweep
**Leads from:** kernel (first consumers: the ~71 verbs that today match a
typed word by hand — charter, berth, hail, course, route, journey, buy,
order, store withdraw, cast, chat, forum, soul, party, apps, job, house,
clock, wallet, title, hew, sample, stake, scrape, draft, move, fit, tie,
treat, readings/measure/analyze, help and the rest; § What already exists)

A player names things two ways. **Things in reach** are named through
MQL, under one rule: articles dropped, keywords, whole words and word
starts, a prompt when several answer, ordinals (`second canoe`),
plurals. **Entries in something** — a ship in a register, a line on a
price list, a node on a chart, a spell you know, a channel, an app, a
herd in the herd book, a person who is not in the room — are named by
whatever rule the verb's author happened to write, and there are
nineteen of them. A player who learns `look the gull` cannot predict
`charter the gull`, `hail the gull` or `course gull`. This build makes
the second way the same as the first: anything that holds named entries
**lists** them to the viewer, a verb's argument says which listing its
word names from, and the one rule scores it. It also gives the verbs
that read a length of time one way to read it, and lets a verb know
whether its target was named or defaulted.

Seeded by [one-resolution-rule-slate](../slates/tech-debt/one-resolution-rule-slate.md)
— the **matcher half** (§ 1 rows 3–11). The `look` half (§ 2, the async
augmenter pass, `look <exit>`) is deliberately not here; see Non-goals.
The reuse ledger is in the slate (§ *Reuse ledger for the plan*).

## What already exists

- **The rule, for things in reach.** MQL's scorer (keyword tiers, the
  whole-phrase cut, word starts, never mid-word), the binder's prompt on
  a tie, ordinals, quantity prefixes, plurals of any keyword, quoted
  literals. [mql.md](../subsystems/mql.md) § Match-quality scoring;
  [mql-grammar.md](../mql-grammar.md).
- **The census (2026-11-20, this cycle).** ~71 hand-rolled matchers over
  sets of entries, across every family; ~14 exact-key lookups (a typed
  word must equal an internal key, case and all — `job apply`,
  `house appoint`, `office assign`, `clock on`, `wallet use`, `operate`,
  `prescribe`, `group`, `notify`); ~10 verbs that bind an object and then
  re-read the raw text of the player's words (`buy`, `carve`, `fit`,
  `shape`, `fell`, `teleport`, `get … from`, `dig`, `sample`, `cut`). ~54
  of the matchers search records no scope reaches; ~16 search things MQL
  could already find. The rules seen:
  - **Articles:** none stripped, `the` only, `a/an/the`, or `a/an` only.
  - **Case:** sensitive or folded.
  - **Hyphen folding:** either way.
  - **Path-leaf compares.**
  - **Any one word of the name.**
  - **Mid-word substring:** `hail`, `show <paper>`, a river's landing,
    `route`'s last rung, a quarry band of four letters or more.
  - **Reversed substring:** `sample` and `measure grade` accept any
    phrase that *contains* a face's direction.
  - **Plural `s` by hand.**
  - **Synonym maps.**
  - **First token only.**
  - **First hit wins in silence:** spells, routes, stock lines.
- **Durations.** `rent … for 2 days`, `fire … for 3 hours` and the
  stream verbs each parse a length of time by their own rules, with
  their own refusals.
- **The `buy` sniff.** `buy <thing>` in a market reads its own arg's
  query text to guess whether the player named a seller.
- **Searches** — `help search`, `who --country` — are deliberately
  substring searches that list hits.
- **In flight:** nothing collides. `build/tooltips` (client),
  `build/soak-repair`, `reqs/test-world-lifecycle` touch none of these
  verbs; call-security-pass has merged.

**Therefore what is genuinely new here is:** one way for an object to
list the entries a player may name in it, one scope that names from a
listing under the existing rule, one duration argument, and the
`defaulted` fact. Every matcher is then a listing, not a rule.

## Goals

- **One naming rule.** Every word a player types to name something —
  a thing in reach or an entry in something — is matched by the same
  rule, with the same articles, keywords, word starts, plurals,
  ordinals and quoted literals.
- **Ambiguity is always asked.** When several entries answer, the
  player is prompted with them, exactly as for things. Nothing picks
  the first hit silently. *(Lens 1 decided: a silent pick teaches
  nothing and cannot be discovered.)*
- **A miss says what is there.** When a word names nothing in a
  listing, the refusal says what that listing holds for this viewer
  (bounded), so the player learns the words by asking. *(Lens 1.)*
- **A listing is per viewer.** It holds what this person may name:
  spells they know, channels they can see, apps on offer to them,
  quays their harbor has. Naming never leaks an entry the viewer could
  not have known.
- **Internal keys are no longer player words.** An organization, a
  position, an office, an operation, a group is named by its name and
  keywords in any case, never by its path or key.
- **A person not present** (a payee, a beneficiary, a group member) is
  named the way a person is named everywhere — their handle and the
  forms [presentation](../subsystems/presentation.md) gives —
  through the same rule.
- **One duration argument.** Every verb that takes a length of time
  reads it the same way: a number or a number word, any time unit,
  `a day`, `a week`, `half an hour`, `90 minutes`. A malformed duration
  is refused with one line.
- **A verb knows whether its target was named or defaulted.** `buy loaf`
  in a market with several sellers finds whoever sells loaves;
  `buy loaf at <seller>` buys from that seller or refuses, naming them.
- **Searches stay searches.** `help search` and `who --country` match
  anywhere in the text and list the hits. Anything that *names* one
  thing follows the rule — so `show <paper>` names a paper by words
  that begin its headline words, not by any substring.
- **It stays this way.** A census of hand-rolled matchers falls to zero
  and is held there; a new verb cannot add one.

## Non-goals

- **The `look` half of the slate** — the async augmenter pass, moving
  `look`'s ten class-specific additions onto their objects,
  `look <exit>`, what `look` should and should not do, and how the
  client renders it as hypertext. → a **look design conversation**,
  after the current client work, folded together with
  [carded-prose](../slates/client/carded-prose-slate.md). Recorded in
  the one-resolution-rule slate's *Left*.
- **The slow path's neighborhood builder and the tract candidate**
  (slate § 3 row 9, § 5 row 3) and the recognition tokens on the slow
  path (§ 5 row 4). → stay on the one-resolution-rule slate; they are
  MQL-internal, and none is a hand-rolled matcher.
- **Fixed-vocabulary words** — `switch on|off`, `pull up|down`, a
  draught word, a posture word, a direction word, the dip faces. They
  name a *setting*, not an entry, and each is one small closed set.
  → nowhere, deliberately; a closed word set is already a declared
  `enum` arg where it is worth one.
- **Free text** — message bodies, labels, names being assigned, amounts.
  Not names; untouched.
- **Better keywords on content.** Where the uniform rule makes a word
  stop working because an entry never said it answers to that word, the
  fix is the entry's keywords, authored as part of this build for the
  entries the drive and the suite exercise — but a sweep of every
  row's keywords for quality is not this build. → nowhere; keywords
  are authored as content is.

## Placement

Kernel. The listing, the scope and the duration argument are command
substrate every pack's verbs use; no pack owns them. Each pack keeps
its entries where they already live (the harbor its quays, the stand
its species, the register its ships) and gains only the statement of
what it lists. **A second listing needs no new rule** — only that the
object says what it holds.

## Collisions

- **Every family's verbs change underneath**, by design. The players
  who live there: anyone at the Terminus harbor (charter, berth, hail,
  course, route), the general store, the shipyard and the chandler
  (buy), Dave's Bar (order), the Rejection put-in (rent), every
  kiln-keeper (fire), every trade with a recipe verb, the mines and
  quarries (hew, sample, dig, stake), the ranches (draft, move), and
  every social verb over a catalogue (chat, forum, soul, party, group,
  contacts, notify).
- **Words that worked by accident stop working.** `hail ffice` (mid-word)
  and `sample northern rock` (a phrase that merely contains `north`)
  will refuse. That is the point; the refusal says what the listing
  holds.
- **Quoted buys in the drives** (`buy "rubber boots"`) keep working;
  quoting is grammar.
- **The archetype stamp** matches an authored need against items by
  keyword. Not a player word, but the same rule applies, so an
  authored need names an item the way a player would.

## Surface decisions

### Scope: all of it
**Q.** The census found ~71 matchers, not 11. **A.** All of them, plus
the exact-key lookups and the raw-text re-reads. *(Owner, 2026-11-20.)*
A partial pass leaves the gate unable to reach zero and the pattern
keeps spreading — two new matchers appeared in the seventeen days
after the audit.

### Searches are not names
**Q.** Does a search follow the naming rule? **A.** No. A search matches
anywhere and lists the hits (`help search`, `who --country`); a name
follows the rule. `show <paper>` is a name. *(Owner.)*

### Plurals live in the grammar
**Q.** Where does `fit legs` / `fell oaks` tolerance live? **A.** In the
one rule: the plural of any keyword answers, for entries exactly as it
already does for things. *(Owner.)*

### One duration argument
**Q.** Fold `rent`'s, `fire`'s and the stream verbs' duration parsing
into one? **A.** Yes. *(Owner.)*

### Ambiguity prompts; misses list
Decided by lens 1 (pedagogy — the rule must be learnable from any
verb): a tie is a prompt, never a silent pick; a miss names what was
there to name.

## Lens pass

- **1 Pedagogy.** The point of the build: one learnable rule.
  Derivable — a player can predict any verb from any other. No
  Discipline exercised; this is the interface the Disciplines are
  practiced through.
- **2 Creative expression.** An author adding a register, a menu or a
  catalogue writes no matcher: the object says what it lists, and
  naming works. The bespoke case — an entry that answers to a word its
  name does not contain — is the entry's keywords.
- **3a Immersion / 3b participation.** A listing is per viewer, so naming
  never reveals what the character could not know. 3b: a player can
  create entries others name (a channel, a forum board, a soul), and
  they are named by the same rule as everything the platform ships —
  no first-party advantage.
- **4 Values.** No undecidable choice here.
- **5 Continuity.** Epoch-neutral: a ship's register, a phone's app
  list and a spellbook are listings alike.
- **6 Economy.** None produced or consumed. Buying becomes predictable
  across shops, which is the only economic effect.
- **7 Governance.** Judges no person.

## The drive

Paces: every step is `instant` and `player` unless marked. Nothing this
build makes persists (it changes how words are read, not what is kept),
so the drive carries **no restart step** — stated, not skipped. It adds
no places, so it carries **no light step**.

### Blocking drive

**The harbor (Terminus).**

1. At the town quay, `charter hesper`, `charter the Hesper` and
   `charter HESPER` all name the Hesper.
2. `hail office`, `hail the harbor office` and `hail Harbor Office` reach
   the harbor office. `hail ffice` refuses, and the refusal says what
   is within hail.
3. `course town quay`, `course town-quay` and `course the roads` set the
   course. `course nowhere` refuses and lists the headings the chart
   holds.
4. *(staged: a second listed ship sharing a word with the Hesper.)*
   `charter` with the shared word prompts with both; answering `2`
   charters the second; `charter second <word>` does the same without
   a prompt.

**Buying.**

5. In the general store, `buy loaf` buys a loaf; `buy loaves` and
   `buy a loaf` too.
6. *(staged: a market of two sellers, only the second selling rope.)*
   `buy rope` buys from the second seller. `buy rope at <first seller>`
   refuses, naming the first seller and saying it does not sell rope.
7. At the yard, `buy smack` and `buy the smack` name the hull on the
   stocks.
8. *(staged: a pen stored.)* `store withdraw pen` and `store withdraw
   the pen` withdraw it; `store withdraw p` refuses and lists what is
   stored.
9. At Dave's Bar, `order` a cocktail by its name in any case, and with
   an article.

**Catalogues and entries.**

10. *(staged: the glowlight spell known.)* `cast Glowlight` and
    `cast glowlight` cast it. *(staged: two known spells sharing a
    word.)* casting by the shared word prompts.
11. `apps uninstall the messages` and `apps install Messages` act on
    the Messages app; `apps install mess` installs it by word start;
    `apps install xyz` lists what is on offer.
12. `chat join` a channel by its name in a different case.
13. *(staged: an open position at a named organization.)*
    `job apply <organization's name in plain words>` applies — no path,
    any case.
14. *(staged: a working with a north face.)* `sample north` and
    `sample the north face` sample it; `sample northern rock` refuses
    and lists the faces.
15. *(staged: an assembly with legs.)* `fit legs …` still names the
    leg line through the plural.
16. `wallet beneficiary <a connected player's handle>` names them in
    any case.

**Durations.**

17. At the Rejection put-in, `rent canoe for a week`,
    `rent canoe for 7 days` and `rent canoe for 2 weeks` each quote the
    right number of days. `rent canoe for soon` refuses with the one
    duration line.
18. *(staged: a lit, loaded limekiln.)* `fire limekiln for 3 hours` and
    `fire limekiln for 90 minutes` hold it for that long;
    `fire limekiln for a while` refuses with the same duration line as
    step 17.

**Searches stay searches.**

19. `help search harb` lists topics containing `harb`. `show <a word
    that begins a word of a current paper's headline>` shows that paper;
    a word from the middle of a headline word does not.

### Soak drive

None. No step depends on the clock.

## Acceptance criteria

- Every step above behaves as written, through player verbs.
- Across every verb that names an entry, a player can use the same
  word forms that work for a thing in reach — article or none, any
  case, a word start, a plural, an ordinal, a quoted phrase — and get
  the same outcome.
- No verb that names one thing picks among several silently; each
  prompts.
- A word that names nothing gets a refusal that says what could have
  been named there.
- No player-facing argument requires typing an internal path or key.
- Every duration a verb takes reads the same forms and refuses with
  the same line.
- `help search` and `who --country` behave exactly as before.

## Cross-references

- [one-resolution-rule-slate](../slates/tech-debt/one-resolution-rule-slate.md)
  — seeding slate, § 1; reuse ledger.
- [mql.md](../subsystems/mql.md), [mql-grammar.md](../mql-grammar.md) —
  the rule.
- [command-routing.md](../subsystems/command-routing.md) — arg binding,
  defaults, prompts.
- [presentation.md](../subsystems/presentation.md) — how a person is
  named.
- [quantities.md](../subsystems/quantities.md) — time units.
- [carded-prose-slate](../slates/client/carded-prose-slate.md) — where
  the `look` half goes.
