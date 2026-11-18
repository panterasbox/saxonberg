# Tech tree slate — the legal code read as a graph, taught by the university

> **Status: UNBUILT** — talked through with the owner 2026-11-18, out of the epoch ladder's redesign
> ([content-declaration-slate](../platform/content-declaration-slate.md) §§ 3.0–3.0b) and the
> [future-tech-slate](../trades/future-tech-slate.md)'s *"three root tech nodes at the bottom of the
> rest of the tree."* What already ships or is designed underneath it:
> - received law, `process: founding`, and the instrument taxonomy
>   ([legal-code-slate](./legal-code-slate.md));
> - *"a law of nature is a law whose codification already happened"*
>   ([inquiry-slate](./inquiry-slate.md) § 3);
> - the enforcement ladder — wall · camera · witness · norm
>   ([enforcement-slate](./enforcement-slate.md));
> - the entrenchment tiers A · B · C ([measurement.md](../../measurement.md));
> - the credential as the university's product, and transcripts private unless presented
>   ([classroom-and-credential-slate](./classroom-and-credential-slate.md));
> - the magic grid as a lens, never an effect-builder ([magic.md](../../subsystems/magic.md)).
>
> **Left:** the node catalog (the platform's received law, written down) · the annotation palette,
> its import gate and its projection (§ 6b), each decorator with its first reader · the kernel sweep
> — every law-bearing piece of code cites its law · the derivation from a content row to its nodes,
> shared with the epoch build's *made with* · the amendment diff (§ 6a) · the author check on a pack
> · covenants that cite nodes · the course's remaining shape · who writes a Tier C statute's course
> · where the platform's received law lives · the social-technology boundary · the power ratchet
> · the physics receipt — the recorder, the banded wording, `trace last` (§ 6d)
> **Size:** a design pass, then a kernel sweep folded into the epoch re-map build, then content —
> the catalog and the courses — which is the real cost

## 0. The ask **[the owner, 2026-11-18]**

*"Does this game want a tech tree? We have a skill tree (Disciplines) but a tech tree is something
different and I'm not even sure what it would affect … this game has become a bit of a kitchen sink
of game mechanics borrowed from other sources and I actually wanna lean into that. A tech tree seems
like a big hole we might ought to want to fill."*

And on whose it is: *"None of these are like multiplayer persistent shared worlds that have to live
and stay interesting for years … I actually think probably the university, or the generic 'academia'
system it implements, is exactly where we want the tech tree most manifest. And EU should teach it
all, even the future stuff … it's about the holder of the tech. I feel like the answer to that is the
content author, which isn't even an active participant in the story — that's the meta layer playing
out, and they're labor, not consumers … the idea of working your way through a catalog of different
techs that manifest in content and unlocking the ability to integrate them into your own story does
seem like an interesting application of tech trees that actually feels very unique to our platform."*

## 1. ⭐⭐⭐ What separates a tech tree from a skill tree: its holder **[DECIDED]**

The shape is not the difference; the holder is. Disciplines are a **person's**. Games put a tech
tree on a faction (Civilization), a server (*A Tale in the Desert*), a culture (Crusader Kings), a
blueprint owner (EVE), or nobody (Minecraft's implicit tree).

> ⭐⭐⭐ **Ours is held by the content author** — the meta layer, not a participant in the story.
> **Climbing a node earns the right to write content that uses it.**

- **The usual tree stays ruled out.** Four slates already say *no tech-tree unlock* in the world
  ([land-use-covenant-slate](./land-use-covenant-slate.md), forestry, rubber's no-gate ship,
  instrumentation's *competence resolves detail, never access*). Nothing here unlocks anything for a
  player in the fiction. For a player, the tree is **information**: learning a node makes the world
  readable.
- **Authors are labor, not consumers.** Climbing works like a trade license — you apprentice into
  what you build with.
- ⛔ **Code is gated only by wizardness, always** (the owner). A node covers content — rows,
  declarations, what a pack's content uses — never TypeScript.

## 2. ⭐⭐⭐ A node is a law, and the tech tree is the legal code read as a graph **[DECIDED in shape]**

The owner: *"one of the assumptions this game makes is that in a game a rule and a law mean the same
thing, and some rules (for us, any rule that is able) are enforced by code … every tech could have a
law and every law could actually have a tech, if we wanted the Compact to draft legislation that
way."*

- **A node is a law.** Carnot, Newton cooling, Beer–Lambert, Arrhenius, Liebig, Ohm, Lawson, the
  mana price list, conservation of money, contract, tenure.
- **An edge is a citation.** Statutes cite statutes; Carnot rests on thermodynamics. A law's
  prerequisites are what it cites — nobody authors the tree's shape separately.
- **A technology is a cluster of laws** a piece of content runs on — a steam engine cites
  combustion, Carnot and the pressure vessel. Derived (§ 6), never stamped.
- **Kernel physics is received law** — the deepest layer, agreed to by adopting the platform, on the
  record as `process: founding` ([legal-code-slate](./legal-code-slate.md) § received law). The code
  is its codification.
- ⭐ **Not a new catalog.** It is the document tree of laws the legal code already has room for,
  extended down to the platform's own physics.
- **Not every law is in Wikipedia.** Carnot and Lawson are; the mana postulate and Terminus's street
  law are ours. Provenance is a column, and a law with no outside source is taught from our own docs
  ([arcane-science.md](../../arcane-science.md) and the like).

### ⭐⭐ Law and instrument

The legal code's split runs everywhere: a **law** is a general rule and a node; an **instrument** is
content that applies it.

| law (a node) | instrument (content) |
|---|---|
| Newton cooling | a thermos row |
| tip pooling | Dave's written jar split ([bar-audition-slate](../world/bar-audition-slate.md) § 15) |
| the Lawson criterion | a fusion plant's generator row |

**Every law is a node; the tree shows the ones content depends on** **[LEAN]**. A parking ordinance
is a law nobody climbs. The frontier is visible without anyone curating it.

## 3. ⭐⭐⭐ The shape: shallow and wide, with epoch as a color **[DECIDED in shape]**

```
technologies      steam engine · refrigeration · fusion · tip pooling · a spell
(clusters)          (each cites a handful of laws below)
                 ─────────────────────────────────────────────────────────────
domain laws       Carnot · Newton cooling · Beer–Lambert · Arrhenius · Liebig ·
(very wide)       Ohm · Lawson · the mana price list · contract · tenure · …
                 ─────────────────────────────────────────────────────────────
foundations       conservation (energy, mass, money) · the aether postulates ·
(few, deep)       the Compact's entrenched articles · the uncertainty doctrine
```

- ⭐⭐ **Depth measures understanding, not history.** Any technology sits two or three citations
  above the foundations: a watermill about two, fusion about three (conservation → nuclear binding →
  Lawson). The owner's constraint holds — *"I wouldn't want to make it so ancient content is
  'easier' to make than sci-fi content."* Sci-fi is not at the bottom of a deep chain; it is another
  region of a wide tree.
- **Epoch is a color, not a depth.** Each technology takes its prime-mover band from the *made
  with* derivation ([content-declaration-slate](../platform/content-declaration-slate.md) § 3.0).
  The history — what had to exist first — stays in that graph. Drawn together, a Wheel technology
  and a Future one sit side by side at similar depth, colored differently.
- **Two graphs, kept apart.** *Made with* is historical (a blast furnace needs bellows, which need a
  mill) and is what covenants on operation read. The tree is conceptual (fusion needs nuclear
  physics, not watermills) and is what authors climb.

## 4. ⭐⭐ Magic: one small column and an edge, never the grid again **[DECIDED]**

The owner: *"'pottery' and 'magic pottery' aren't really two different techs. The way we use magic
is as a flag, so what is really purely magic as a tech is questionable. And we don't want to just
recreate our verb-noun thing with different names."*

- **The arcana grid is a caster's skill tree** (5 verbs × 13 nouns, each a Discipline): who can cast
  a spell and how well. It stays where it is. ⛔ **No grid cell becomes a node** — no *pyromancy*,
  no *control·body*.
- **Purely magic is the arcane laws and nothing else** — the postulate, the laws and the price list
  ([arcane-science.md](../../arcane-science.md)). A few domain laws on the aether postulates: one
  small column.
- **A spell touches the tree through its effects**, as its grid cell is derived from its effects
  ([magic.md](../../subsystems/magic.md) § the grid is a lens). A self-cooling jar's effect offsets
  ambient heat, so it cites refrigeration; a firebolt injects heat, so it cites combustion.
- **So magic pottery is three citations:** pottery, the capability the enchantment delivers, and
  arcane science — which an author needs anyway, because arcane-science's binding rules require the
  borrowed capability be priced honestly, and you cannot price cooling without knowing what cooling
  costs. No new node.
- **Magic stays a flag** on any rung ([content-declaration-slate](../platform/content-declaration-slate.md)
  § 3.0): whether a place allows it is a covenant's call (§ 7).

## 5. ⭐⭐⭐ The other kinds of law: three tiers × three fields **[DECIDED in shape]**

Every law sorts by **tier** (who can change it — [measurement.md](../../measurement.md)) and by
**field** (which faculty teaches it):

| tier | who changes it | natural | the game's own rules | institutions |
|---|---|---|---|---|
| **A** | nobody | — | the measurement articles A1–A16 | the Compact's entrenched articles |
| **B** | whoever ships the code (the AGPL is the check) | physics, chemistry, biology; arcane; the Future rung | conservation of money, the uncertainty doctrine, residency and persistence | the substrates: banking, contract, tenure, employment |
| **C** | the polity | — (nature is not amendable) | — | statutes, covenants, received city law, venue and house policy |

- **The three fields are three faculties:** natural philosophy (with magic as its lab wing, as the
  inquiry slate already says), the game's own rules, and civics — where
  [compact-political-science](../../compact-political-science.md) lives.
- ⭐ **Social technology is in.** Double-entry bookkeeping, the joint-stock company and tip pooling
  are laws with real rules, so a covenant can say *no usury* the way it says *no gunpowder*.
  **[OPEN — where exactly the line falls]**
- **An author writing a venue in Terminus may be expected to know Terminus's law** — the same kind of
  credential as Carnot, at a different tier.

## 6. ⭐⭐ How it manifests in code — a citation, not a tag **[LEAN]**

The owner: *"do we have to go back and instrument all our existing code for it? Now's the time to do
that; I'm just wondering what exactly we're signing up for."*

1. **The node catalog** — the platform's received law written down, roughly one law per core rule in
   each subsystem doc (likely 100–200), plus the arcane and Future-rung laws. A document tree,
   mostly LLM-written, reviewed by us.
2. ⭐ **Every law-bearing piece of kernel code cites the law it codifies**, as an implementing
   regulation cites its statute: mixins (about 200), the magic effect union (12 kinds), material
   kinetics, the logic that computes things (routing, the cast pipeline). The one real sweep.
   Wizard-layer only; content changes nothing. **Census-then-ratchet**: a lint counts the pieces
   that cite nothing, and the count only falls. It doubles as the legal record of what the platform
   enforces. **How it cites — inert, typed decorators behind an import gate — is § 6b.**
3. **A row's nodes are derived, never stamped** — the union of what it composes, plus its station.
   The same derivation the epoch build already owes for *made with* (the ~20 stamps re-derived,
   every station declaring its prime mover). ⭐ **Fold both into one pass: that is why now.**
4. **An author check on a pack** — the content's nodes against its maintainers' credentials, at the
   polity's enforcement level (§ 8).
5. **Covenants cite nodes** (§ 7).
6. **The courses** — the real cost, and coming anyway.

⚠ **A lint can check that code cites a law, never that it cites the right one.** The mapping is
judgment and needs review, as the subsystem docs did.

## 6a. ⭐⭐⭐ Code is reality; the curriculum and the law describe it **[DECIDED in shape]**

The owner: *"For us, the reality == the code and code == reality. Laws and academia can actually
disagree with that — they shouldn't, but they could."* And on what this work is: *"the thing you're
actually doing now is taking all the TypeScript code we've written to support content and making it
the university curriculum. And we also need an expression of the same ideas legislatively that
agrees with the university."* The structure comes from that and the lenses. The two externalities
that do not move are **Wikipedia** and **study.com**.

### One law, four faces

| face | the question | who supplies it |
|---|---|---|
| **the real thing** | how does it work on Earth? | Wikipedia (reference) and study.com (instruction) |
| ⭐ **the rule** | exactly what this world computes — parameters, scope, and where it departs from Earth | us, from the code |
| **the practice** | where in the world you meet it | derived from content: what composes it |
| **the authoring** | how content invokes it | derived from the code's authorable surface |

Our authoring work is the **rule face**. The outside world owns reality's face; the other two
derive from what exists. Study.com maps in at the law: its real-subject instruction fills the first
face.

### ⭐⭐⭐ The rule face *is* the statute

Written precisely — what is computed, its parameters, its scope, its stated departures — the rule is
legislation. So **the law and the curriculum agree because they are one artifact read two ways**:
the statute is the rule face in clauses; the course teaches it against the real thing, with the
practice and authoring faces as worked material. The course is generated from the statute and
carries the version it teaches, so a lag shows when the statute moves (§ 9).

**Agreement with reality is checked both ways:** every clause names the code that enforces it, and
every rule in the code cites a clause. A rule with no clause is an unlegislated law; a clause with no
code is a law nobody enforces — fine for Tier C, a defect for Tier B. Where they disagree, **the code
is what is true** and the description is wrong.

### ⭐⭐ Clauses carry tiers, not whole laws

A cooling law's **form** (rate proportional to the temperature difference) is nature, amendable by
nobody; a material's **constant** is a parameter we tune in code; some game-rule parameters (a tip
split, a fine, a tax rate) may be the **polity's**. Tagging each clause with who may amend it shows
the polity exactly where its foothold is, law by law, and tells the course which parts are physics
and which are policy (lenses 4 and 7).

### ⭐⭐ Our development process is the legislative record

When code cites clauses, an MR that changes a rule's behavior **is an amendment** — detected, not
hand-written: diffing the projection (§ 6b) between master and a branch shows a changed clause value,
a new law, a moved tier. **The MR supplies only the *why*, and only when that diff is non-empty.**
So the experimental early versions leave a complete record a later legislature argues from.

### The structure that falls out

- **Fields** — natural philosophy, the game's own rules, civics — are departments (§ 5).
- **Laws** are the units, about a lesson cluster each, likely 100–200.
- **Clauses** are the exact rules, each with its tier and its code citation.
- **Edges** are laws citing laws — the prerequisites.
- **Courses are selections and orderings of laws for an audience** — a player, an author, a
  legislator. They are packaging and cheap to rearrange; the laws are what lasts. ⚠ This replaces
  § 8's *"its course catalog is the tree"*: the catalog is **over** the tree, never one course per
  node.

## 6b. ⭐⭐⭐ The annotation palette — inert decorators behind an import gate **[DECIDED in shape]**

The owner: *"we don't want the instrumentation to affect reality — that's the operation working in
reverse. It sounds like what we want are annotations, which implies the use of decorators … could the
decorator palette be used to also plug into governance or academia, or even the economy?"*

⭐ **Every decorator in the kernel today changes behavior** — `@CallSecurity` (on about 1,400
methods), `@Shadowing`, `@TestOnly`, `@RequiresActive`, `@Final`, `@Unshadowable` all wrap, gate or
replace. The only descriptive metadata is `static fieldMeta` (`authorable: true`), a plain table.
This palette is a **new kind**, and must look different.

### Inert by construction

- **Its own module**, apart from the security decorators. Each body records a fact about a class
  or member in a write-once slot and returns the target **unchanged** — no wrapping, no replacing.
  A lint proves it.
- ⭐⭐⭐ **The import gate is the real guarantee: reality may not read its description.** Code on
  the simulation path may not import the metadata's reader; only the out-of-fiction set may — the
  projection, the wiki, the course and item generators, the legal record. *(invariant — worth
  entrenching as platform law, not only a lint.)* ⚠ **Restated by § 6d:** the receipt's recorder
  sits in the path, so the invariant is *no outcome may depend on a description*, and the gate
  governs where descriptions may flow.
- **Typed arguments** — `@law(Laws.NewtonCooling)`, not a string, so a typo or a renamed law fails
  to compile (the advantage over a TSDoc tag like `@hook`). Read **statically** by the compiler API
  into a **projection document** — the canonical record — and readable at runtime **only behind
  the gate**, because the item generator must *call* annotated code (§ 6c, lens 1).
- **`@law` takes an id, never a display name.** *Newton* is Earth's name; who discovered cooling in
  this world is content, named by its peoples ([place-names-slate](../world/place-names-slate.md)).
- **Exported to packs** with the rest of the kernel surface: a capability pack annotates its own
  `src/` with laws under its own root.

### The palette

| decorator | goes on | what it records | its first reader |
|---|---|---|---|
| `@law(id)` | the method or class that computes a law | what the code is about | the course and item generators |
| `@clause(id)` | a clause's parameter — a named class static, not a loose literal | the exact rule and its value | the statute text; the amendment diff |
| `@departs(id, why)` | where we simplified Earth on purpose | the *contrasts* note, where the difference lives | the course's rule face |
| `@amendable(tier)` | a clause's parameter | who may change it | the legal record |
| `@faucet(kind)` / `@sink(kind)` | every site that mints or destroys goods or money | where things enter and leave the world | the faucet audit (*goods faucets, never money faucets*) |
| `@measures(what)` | every counter the engine keeps | what the platform counts about people | a public list of counters (the measurement doctrine) |

⚠ **`@amendable('C')` is where the one-way rule bites.** A parameter the polity may amend must take
its value from the legal code at runtime, and **that read is ordinary code** — codification, not
the decorator. The annotation only records that the statute is the source of truth; a lint checks
that every Tier C parameter really is read from the law store.

### ⭐⭐⭐ The line: what reality reads is code; what only describers read is annotation

If the simulation must read it, it is a real field or method. If only describers read it, it is an
annotation. That splits the enforcement ladder exactly:

- **wall** changes an outcome, so it must be **codified** — a covenant that *refuses* gunpowder
  needs a real check on the act, never a lookup of which code carries `@law(gunpowder)`;
- **witness** judges a *person*, and judging a person needs a named criterion, so it is codified
  too (lens 7, § 6c);
- **camera** and **norm** observe and state, so they may run on descriptions.

The same rule covers epoch: if covenants **enforce** *runs on*, then *runs on* is a real derived
property of objects, not an annotation a covenant reads.

## 6c. Lens pass on the palette — what it decided

1. **Pedagogy** — the strongest item does not restate the cooling law; it **calls the annotated
   method** and asks you to predict the result, so the world is the answer key and a course cannot
   drift. `@departs` keeps the world derivable for a student who knows Earth. **Gap:** a clause's
   *prose* can still drift from its code; items that call the code catch it, prose does not.
2. **Expression** — content authors never touch a decorator (a row's laws derive); a capability
   pack annotates its own code; Tier C parameters give a realm real knobs. Annotate only law-bearing
   code — the census sizes it, nowhere near the 1,400 security sites. *(grain)*
3. **3a Immersion** — invisible to the fiction; law ids out of fiction, names realm content.
   **3b Participation** — Tier C parameters; a player journalist publishing the faucet map; players
   auditing what is counted about them. **Gap:** players meet annotations only out of fiction.
4. **Values** — which parameters are Tier C, and what counts as a faucet (a fish landed is minting;
   a crafted good transforms), have no derivable answer. `@departs` makes every simplification we
   chose legible.
5. **Continuity** — annotations ship in the diff with the code they describe, so description cannot
   silently lag reality; typed ids survive refactors; the projection diff detects amendments.
6. **Economy** — the cost is the catalog, the extractor, the lints and the sweep, in wizard labor,
   ours; the demand is already here (the university's rule face, the faucet audit, the counter list).
   ⭐ **Each decorator ships with its first reader** — a flag nobody honors is decoration (EotL) —
   so one ratchet per decorator, started when its reader ships.
7. **Governance** — witness is codified (it judges a person); re-tiering a clause moves power, and
   the projection diff puts it on the record; the import gate is an invariant for the platform's own
   law.

| question | answer | lens |
|---|---|---|
| read at build time or at runtime? | both; runtime only for the out-of-fiction set, behind the gate | 1 |
| witness | codified, on the wall side | 7 |
| census and ratchet | one per decorator, started when its first reader ships | 6 |
| law names | ids in code; display names are realm content | 3a |
| amendments in MRs | the projection diff detects them; the MR supplies *why* | 5 |

## 6d. ⭐⭐⭐ The physics receipt — the world shows its work **[DECIDED in shape]**

The owner: *"one interesting thing this does is we could actually tell a player every execution
'hey, here's what physics actually happened this command', in a way that was coincidental with the
university and the government."*

Every act can come with a **receipt**: these laws ran, with these clause values, on these things —
each line linked to the lesson that teaches the law and the clause that defines it. The receipt, the
textbook and the statute book cite the same thing because they **are** the same thing.

### Something has to watch — so the gate is restated

An inert decorator cannot know when its method runs. **The call-security proxy already sees every
call**, with its arguments and return; when an act is being recorded, it notes calls into `@law`
methods and hands them to an out-of-fiction recorder. That sits in the simulation path, so § 6b's
*"nothing on the simulation path imports the reader"* is too strict. ⭐⭐⭐ **The invariant is: no
outcome may depend on a description.** The recorder may read annotations to *describe* a call; it
never touches an argument, a return value or control flow, and it writes only to the player's
buffer. A lint checks it.

### ⭐⭐⭐ A full receipt leaks hidden state — so it is banded

Several systems are hidden on purpose, and a raw trace would give each away: contamination no sense
reports (*"infect fired"*), the charged-or-dry trap a drill is a bet on, concealment, seeded
deposits, a hidden trap a search has not yet surfaced. So the receipt is **what the code did, as far
as you could know it**:

- **only quantities you could have perceived or measured** — hidden state stays hidden at every band;
- **banded by your competence in each law** — *competence buys information*:
  - none: *"the stew cooled"*;
  - some: *"it cooled toward the room's temperature, faster because the pot is thin"*;
  - full: the law with its clause values, for what you could measure.

⭐ **The loop it makes: study a law and the world explains itself to you in more detail.** The course
enriches the receipt; the receipt makes you want the course.

### What else it gives

- **Due process for free** — when an outcome judged you (a fine, a refusal, a wall), the receipt
  names the clause and its tier, Tier C ordinances included.
- **The agent playtesters** — if an agent resident cannot work the world out from receipts and
  courses, neither can a player ([live-instance-testing-slate](../tech-debt/live-instance-testing-slate.md)).
- **Wizards** — the unbanded receipt, in the sandbox, is a debugger.

### The lens pass

1. **Pedagogy** — every act becomes a worked example. ⚠ A *forecast* would do the player's job:
   learning happens in predicting and then checking. Reading receipts is not evidence of competence
   (else a band could be farmed by reading).
2. **Expression** — ordinary content gets receipts for free, derived from the annotated code; a
   pack's annotated laws appear automatically. The cost is each law's banded wording in the catalog
   (roughly three bands × 150 laws), generated and reviewed. *(grain)*
3. **3a Immersion** — banding by what you could perceive keeps the fiction honest; law names are the
   realm's, so it never says *Newton*. **3b Participation** — players publish receipts (*why the cart
   overturned*): forensics and journalism nobody scripted. ⚠ An omniscient trace would be perfect
   forensic evidence and would end the investigation play the university's story arc is built on.
4. **Values** — how much the world explains itself has no right answer: per viewer an appetite
   setting, per realm the realm's call (a mystery realm may want it off). *(grain)*
5. **Continuity** — a receipt cites the law version that ran, so an amendment shows in play; acts on
   any rung explain themselves the same way.
6. **Economy** — recording costs nothing when nobody records, but asking *after* the act needs it
   recorded *when it happened*: a small buffer. The demand was there first (the rule face, the
   agents, debugging).
7. **Governance** — the buffer is a measurement (`@measures`), held only for you, shown only to you,
   gone at logout; your receipts are private unless presented, like transcripts. A wizard reading a
   live player's full trace is surveillance.

| question | answer | lens |
|---|---|---|
| when | **after the act only, never a forecast** *(invariant)* | 1 |
| where | **`trace last`**, as a card — `trace` already answers questions about the simulation rather than the place, and only the platform ships its subcommands; no new verb, and asking is itself an act of curiosity | 2 |
| detail | banded by competence; only what you could perceive | 1, 3a |
| omniscient trace | **never in the fiction**; unbanded only in the sandbox *(invariant)* | 3b, 7 |
| storage | a per-session buffer of your last few acts, in memory, gone at logout, never persisted | 6, 7 |
| on or off | per viewer an appetite setting (hidden by default, one click, never prevented); per realm the realm's call | 4 |
| the gate | no outcome depends on a description; the recorder writes only to your buffer | 7 |

## 7. ⭐⭐ Covenants are statutes that cite nodes **[DECIDED in shape]**

The owner: *"I don't want to lose the covenant angle, I think that's good stuff too."*

One catalog, two readers:

| reader | question | answered by |
|---|---|---|
| **authorship** | may you *write* content that uses this node? | the university's credential (§ 8) |
| **covenants** | may this node *operate* here? | a place's law, enforced wall · camera · witness · norm |

- **A covenant is a Tier C statute whose clauses name other laws**: *the gunpowder law does not
  operate in this extent.* Covenant, tech tree and legal code are one document tree with different
  readers.
- **Nodes give covenants the grain bands could not.** *No gunpowder* is one node; *no modern
  medicine* is a cluster — the knowledge gate the declaration slate parked on its culture axis
  because a prime mover cannot express it. Bands become named cuts across the tree (Wheel is a set
  of nodes).
- **Not the banned allowlist.** The land-use slate refused per-room tool lists because a list only
  grows when somebody edits it. A node list does not: new content falls under existing nodes, so the
  covenant stays right with nobody maintaining it.
- ⚠ **A wall needs codification** (§ 6b): a covenant that *refuses* reads a real property of the
  act, never the annotations. Camera and norm may run on the annotations.
- **The university extent is a covenant that admits every node** — the owner: *"within the
  university extent inside the city, it's anything goes."* Terminus's own epoch law stays undecided
  and the university does not depend on it.

## 8. ⭐⭐ The ways through the tree **[LEAN]**

**For authors, the university is the main road** — its course catalog is laid over the tree (§ 6a),
and Eternal University teaches all of it, the Future rung and arcane science included. An author presents the
credential when their content cites a node. Side roads, which also give lens 7 its appeals:

- **a grant from the polity** — governance confers a node on an author directly (our base pack, a
  guest expert, the grandfathered); its entrenchment tier is the polity's to set;
- **demonstrated work** — content shipped under a camera-level node holds up under review, and
  standing accrues, as agent residents earn it;
- **peer sign-off** by authors who already hold the node — guild-shaped, among people, with no NPC
  weight ([guild-slate](./guild-slate.md)).

**Soft by default.** The polity picks the enforcement level per node: most likely *camera*
(uncredentialed content is marked, not refused), with *wall* for the few that are easy to get badly
wrong — medicine, anything sold as real science.

**For players**, the university is where you learn to read the world, and each node has a bench or
lab where it runs — the university extent being the one place every rung operates, like the
classroom wet bar. A player can stand beside a working fusion demo before any author has put fusion
anywhere in the world.

## 9. ⭐⭐⭐ The curriculum follows the legislative history **[DECIDED — the owner]**

The owner: *"I like the idea of a college curriculum and a legislative history that agree with each
other. I think that actually gives the polity a real foothold for running something that is pretty
experimental, at least for the first several major versions."*

**Three branches, one tree:** the legislature writes; the executive codifies (in code for Tier B, in
content for Tier C); the university teaches — which is all it does (the standing rule: the university only teaches).

- ⛔ **The university cannot get a veto** (the owner). A statute takes effect when enacted, course or
  no course. The curriculum **follows** the record and is never ahead of it or able to block it.
- **The gap is visible state:** *enacted, not yet taught.* Honest, and it shows the university
  where its work is.
- **The university can teach a repealed law as history; it cannot teach a law into force.**
- **Every repeal argument has a textbook.** The course says why the rule was adopted; events never
  change, so repealed law stays in the history as a lesson.
- **The early versions are experiments with a record.** When a rule fails in 1.x, the history says
  what it was for and the course says how it worked — the next legislature argues from that, not
  from a changelog.
- **Tier B changes are still code**, but their record lives in the same tree: when we change a
  physics rule it appears as an amendment the polity can read and teach.

## 10. ⭐ Why it suits a world that lasts years

- **The tree is a map of where the world can grow.** Per node, a realm sees whether content uses it,
  whether credentialed authors exist with no content yet (where authoring work should go), or
  neither (where a course could be written).
- **The frontier moves as people learn**, so the world keeps diversifying for as long as people keep
  studying.
- **Realms diverge in technology** because each realm's authors climb in their own order — the
  inquiry slate's per-instance tech trees, now with a holder.

## 11. Lens pass

1. **Pedagogy** — the tree *is* the syllabus; every node is a real or honestly invented law with a
   course; depth by understanding keeps every epoch equally learnable. ⭐ The platform's educational
   claim cashed at the author layer: whoever writes the steam engine knows the thermodynamics.
2. **Expression** — nodes are derived from what content composes, so the ordinary case declares
   nothing; a bespoke author climbs what they need, and a new technology is a new cluster of
   existing laws, not a new node.
3. **3a Immersion** — nothing in the fiction unlocks; the world stays what it is. **3b
   Participation** — the legislature, the executive and the university each have real work on one
   tree; the polity can legislate a technology into being or out of an extent.
4. **Values** — which nodes run at *wall*, and whether an author must know a city's law to build in
   it, have no derivable answer; the polity decides.
5. **Continuity** — a law outlives every instrument citing it; a covenant on a node stays right as
   content is added.
6. **Economy** — authoring labor goes where the tree shows credentialed authors and no content;
   courses are the university's labor; the catalog and courses are the build's real cost.
7. **Governance** — the author check names its criterion (the course), its appeals (grant,
   demonstrated work, peer sign-off) and its tier (per node, the polity's). ⛔ The university holds
   no veto.

## 12. Open

1. Who writes a Tier C statute's course — us, the polity's own faculty, or the bill's sponsor
   alongside the bill.
2. Where the platform's received law lives — the root extent above every realm, with each realm's
   received law under it **[LEAN]**.
3. Node grain — one law, or one technology. **[LEAN: laws as nodes, technologies as derived
   clusters]**
4. The social-technology line (§ 5).
5. The course's remaining shape — assessment, the reader, credentials — over § 6a's units, with
   Wikipedia now and study.com later. ⚠ The repo is public: nothing internal to study.com goes in it.
6. Whether a fictional organism (smithing's glowing headlamp fungus) cites a law that a covenant can
   reach, or needs the magic flag ([content-declaration-slate](../platform/content-declaration-slate.md)
   § 3.0a).
7. ⭐ **The power ratchet** — a clause may move from B to the polity (C) freely, but moving it back
   from C to B needs the polity's consent, so power only ratchets toward the people. Constitutional,
   and the owner's call.
8. **The faucet boundary** — what counts as minting versus transforming.
9. **An in-fiction statute book** — the law published as paper, so players meet the legal code
   inside the world.
10. **One statute text or two** — an in-world text (this world's natural philosophy, no Earth) and a
    plain annex set against Earth's physics.
11. **The receipt buffer's length** (§ 6d) — the last act only, or the last handful, so you can ask
    about the act *before* the one that surprised you.
12. **A receipt as evidence in fiction** — presented at an inquest the way a transcript is. Banding
    keeps it honest, but it is an out-of-fiction artifact entering an in-fiction process.
## Cross-references

- [content-declaration-slate](../platform/content-declaration-slate.md) — the prime-mover ladder,
  *made with* and *runs on*, the culture axis
- [future-tech-slate](../trades/future-tech-slate.md) — the three roots and the pair techs
- [legal-code-slate](./legal-code-slate.md) — received law, instruments, `<extent>/law/`
- [inquiry-slate](./inquiry-slate.md) — the codification doctrine; per-instance tech trees
- [land-use-covenant-slate](./land-use-covenant-slate.md) — the covenant; no tech-tree unlock
- [enforcement-slate](./enforcement-slate.md) — wall · camera · witness · norm
- [classroom-and-credential-slate](./classroom-and-credential-slate.md) — the credential and the
  transcript
- [crafting-slate](../trades/crafting-slate.md) — tools as a parallel tech tree
- [magic.md](../../subsystems/magic.md) · [arcane-science.md](../../arcane-science.md)
- [measurement.md](../../measurement.md) — the entrenchment tiers
