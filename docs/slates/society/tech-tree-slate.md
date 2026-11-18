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
> **Left:** the node catalog (the platform's received law, written down) · the kernel sweep — every
> law-bearing piece of code cites its law (§ 6) · the derivation from a content row to its nodes,
> shared with the epoch build's *made with* · the author check on a pack · covenants that cite nodes
> · the course shape (its own conversation) · who writes a Tier C statute's course · where the
> platform's received law lives · the social-technology boundary in detail
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
   enforces.
3. **A row's nodes are derived, never stamped** — the union of what it composes, plus its station.
   The same derivation the epoch build already owes for *made with* (the ~20 stamps re-derived,
   every station declaring its prime mover). ⭐ **Fold both into one pass: that is why now.**
4. **An author check on a pack** — the content's nodes against its maintainers' credentials, at the
   polity's enforcement level (§ 8).
5. **Covenants cite nodes** (§ 7).
6. **The courses** — the real cost, and coming anyway.

⚠ **A lint can check that code cites a law, never that it cites the right one.** The mapping is
judgment and needs review, as the subsystem docs did.

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
- **The university extent is a covenant that admits every node** — the owner: *"within the
  university extent inside the city, it's anything goes."* Terminus's own epoch law stays undecided
  and the university does not depend on it.

## 8. ⭐⭐ The ways through the tree **[LEAN]**

**For authors, the university is the main road** — its course catalog *is* the tree, and Eternal
University teaches all of it, the Future rung and arcane science included. An author presents the
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
5. The course shape — its own conversation, with Wikipedia now and study.com later. ⚠ The repo is
   public: nothing internal to study.com goes in it.
6. Whether a fictional organism (smithing's glowing headlamp fungus) cites a law that a covenant can
   reach, or needs the magic flag ([content-declaration-slate](../platform/content-declaration-slate.md)
   § 3.0a).

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
