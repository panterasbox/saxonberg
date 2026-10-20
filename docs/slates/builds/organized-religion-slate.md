# Organized religion slate — the institution, and how to read one

> **Status: UNBUILT** — designed at high level 2026-10-19 with the owner, out of
> the gap walk's abbey item. A design doc to keep picking at; no build is
> scheduled (*"I have no idea when I'll get to building any of this stuff but
> these are design docs that I always like to pick at from time to time as the
> rest of our models evolve"*). The inner half — a standard you declare, the fall,
> the congregation, ritual — is the [faith slate](./faith-slate.md); this is the
> **institutional** half. Alignment is settled in [story-bible.md](../../story-bible.md)
> (derived, two axes, banded, recognition never reward); gods are never the RNG
> ([uncertainty.md](../../uncertainty.md) Part 3).
> **Left:** the charter readout (structure derived, the vibe a claim) · the three
> polities on the Organization substrate · territorial vs gathered · title decides
> the schism · the Compact's non-establishment + free exit, and establishment in
> the localities · canon as pointers, lineage by `extends:` · sacraments as records
> and validity as recognition · the relic · the vowed life · mortmain · cults as
> the cost of leaving
> **Size:** a build, when it comes; most of it is content over shipped substrate

## 0. The owner's frame

*"What I want to explore here actually is not faith but religion and more
specifically, organized religion. denominations vs independent churches vs ones
that belong to an institution. maybe also scripture or other sacraments or
artifacts. and how any of this stuff relates to the actual 'faith' side of things
or if it's just another flavor of corpo with different motives. probably there's
room for both models within the tent of organized religion."* And: *"most people
pick their church on 'vibes' which is a shame because there's real institutional
decisions that make those 'vibes' what they are and you can break down a church's
target demo by looking at how they organize and what their decision making process
looks like."*

## 1. ⭐⭐⭐ The structure is the vibe **[DECIDED — lens 1]**

What people experience as a church's feel falls out of a handful of institutional
decisions. Most people know none of them, even about their own church. The game
can make them readable.

### The three polities

| the decision | **episcopal** (Catholic, Anglican, Orthodox) | **presbyterian** (Presbyterian, Reformed) | **congregational** (Baptist, the independents) |
|---|---|---|---|
| who picks the minister | the bishop assigns one | the congregation calls one, the presbytery approves | the congregation hires and fires |
| who changes doctrine | councils, slowly | assemblies, by vote | the congregation — in practice often the pastor |
| who owns the building | the denomination | usually the congregation, held in trust for the denomination | the congregation |
| how a split goes | you leave the building behind | contested | the majority keeps it |
| **the vibe it produces** | continuity, liturgy, the same rite everywhere, slow change | deliberative, committee-run, an educated clergy, moderate | responsive, local, pastor-centered; can reinvent itself or split overnight |
| **who it serves** | people who want the church to outlast them | people who want a say through process | people who want it to be *theirs* |

### ⭐⭐ Two more decisions that pick the demographic

1. **Territorial or gathered.** A **parish** serves everyone in its territory —
   you belong to the church of where you live; the membership is broad, mixed,
   older and unchosen. A **gathered** church recruits its members and competes in
   a market. ⭐ A parish is a church keyed to a locality, and the address substrate
   already resolves which one you are in.
2. **Targeting.** The twentieth-century church-growth movement made it explicit:
   Donald McGavran's *homogeneous unit principle* observed that people join
   without crossing racial, linguistic or class barriers, and churches were
   designed around a target demographic on purpose. The megachurch is the far end
   — congregational polity, pastor-led, built for growth, with production values:
   the church-as-corpo, and its structure says so.

### ⭐⭐⭐ The readout — structure is derived, the vibe is a claim

The pattern of the cannery's label
([cannery-and-bottling-slate](./cannery-and-bottling-slate.md) § 6a), applied to
an institution:

- **The church's self-description** — *"a welcoming community," "rooted in
  tradition"* — is authored **marketing**: a claim, and it can be false.
- **Its charter readout is derived** from the actual organization: who appoints
  the minister · who holds the title · who can change the creed and how hard that
  is · where the money goes · how you join and how you are expelled. It cannot lie;
  it is read off the structure.

[measurement.md](../../measurement.md): *the feed hides the measurement; the mirror
shows you.* The marketing is the feed and the charter is the mirror. A player who
learns to read it predicts the vibe before attending — what most people never
learn to do.

### ⭐ The lesson is general

Every institution in the game has a decision process and a title structure —
guilds, co-ops, firms, towns, the Compact. *You can read an institution's
character from how it decides* is the sibling course's general lesson
([compact-political-science.md](../../compact-political-science.md)). The church
is where people need it most and have it least; **the charter readout works on any
Organization**, and the church is its first consumer.

## 2. ⭐⭐ Faith, religion, and the corpo **[DECIDED]**

- **Faith** is a standard *you* declare (the faith slate's `Tradition` of
  `kind: faith`).
- **Religion** is an institution that **publishes a standard and organizes the
  people who declare it** — it holds ground, appoints clergy, takes offerings.

**The shape is a corpo's; the product differs:**

| | a firm | a religion |
|---|---|---|
| publishes | a mark on goods ([corpo.md](../../subsystems/corpo.md)) | a creed people declare about themselves |
| its customers | buyers | adherents |
| revenue | sales | offerings and tithes — voluntary transfers, never a mint |
| its measure | a ledger | **fidelity, which nobody can read** |
| its power | market share | a congregation's regard, through the witness network |

**Both models live in the tent.** The sincere church and the church run as a
business have the same shape; they differ only in their leaders' chronicles, which
only witnesses see — *"the gap between professed and fed is the drama"*
(story-bible). The system never decides which a church is (lens 4); players do.

**The polities ride shipped substrate.** A denomination is a parent Organization
over congregations ([employment.md](../../subsystems/employment.md)'s
`parentOrganization`, the appointing authority, offices); an independent church
has no parent. Joining or leaving a denomination looks like taking or dropping a
franchise.

## 3. ⭐⭐⭐ Title decides the schism **[DECIDED — lens 7]**

The faith slate says heresy is *"a second row"* — true of the creed. **Who keeps
the building** is a separate question, and a real one: American courts have
fought it for a century, either deferring to the hierarchy or applying neutral
property law (*Jones v. Wolf*, 1979). Here it falls out of
[parcel](../../subsystems/parcel.md) title: in an episcopal church the denomination
holds title and a seceding congregation walks out of its building; in a
congregational one the congregation holds it and takes it along. **Choosing a
polity is choosing who keeps the property when the split comes.**

## 4. ⭐⭐ Non-establishment at the Compact; establishment in the localities **[DECIDED — the owner]**

*"I would want a first amendment sorta deal for the compact, but individual
committees running localities in the game can impose whatever religion they want."*

The real First Amendment originally bound **only Congress**; states kept
established churches, and Massachusetts funded its church by tax until **1833**.

- **The Compact** — no establishment and free exercise: it never funds, favors or
  penalizes a faith.
- **A locality's committee may establish one** — a church tax, Sunday closing,
  attendance rules, even excluding heretics from its own extent (the exclusion
  sanction, [settlement-model](../../settlement-model.md) § 9).
- ⭐ **What makes it legitimate is free exit.** *Consent is geographic.* Entrenched
  at tier A: **you can always leave a locality, and nothing follows you out** — no
  locality reaches your account, your chronicle or your standing elsewhere. A
  theocratic town is a town you chose to live in.

## 5. Scripture, canon and lineage **[LEAN]**

- **Scripture is documents** in the document store, authored like anything else.
  A religion's **canon is a list that points at documents** — the same move as a
  holiday pointing at a festival row.
- **Shared scripture, different canons** — the Abrahamic pattern: three religions
  point at the same law and prophets, each adds its own books, each declares
  different precepts. Prophets are figures in shared texts.
- ⭐ **Lineage by `extends:`.** A template row may `extends:` one parent, resolved
  at read ([templates.md](../../subsystems/templates.md)). A reforming tradition
  **extends** its parent, inheriting precepts and overriding some: the tradition
  tree *is* the religious family tree. The single parent makes syncretism the
  honest edge case.
- **A prophet** — a player's words become scripture when an institution
  **canonizes** them; [provenance](../../subsystems/provenance.md) records who
  wrote them. ⚠ The world never says whether they were *revealed*.
- **Copied by hand, it drifts** — a scribe's errors come from competence, so
  manuscripts diverge into variants; printing freezes a text
  ([paper-and-printing-slate](./paper-and-printing-slate.md)).

## 6. Sacraments, recognition and the relic **[LEAN]**

- **Sacraments are acts that write records** — naming, marriage (a witnessed
  contract), ordination, burial. ⭐ The **parish register** was historically the
  civil registry: the only record that a person existed.
- ⭐⭐ **Validity is recognition.** A sacrament is valid when an office-holder of the
  recognizing institution performed it; whether another church accepts your
  baptism or marriage is **mutual recognition** — the acceptance-policy pattern of
  [diplomacy](./diplomacy-slate.md) between servers and the
  [antecedents slate](./antecedents-slate.md)'s record exchange. Its third
  appearance; worth naming as a pattern.
- **Rites consume goods** — communion wine and bread, candles, incense, chrism oil:
  a buyer for winemaking, baking, chandlery and the olive.
- ⭐ **The relic** — its value is **provenance** ([chattel](../../subsystems/chattel.md)'s
  chain of title) and its authenticity a **claim** ([belief](../../subsystems/belief.md));
  relic forgery was a real medieval industry. It does nothing — but pilgrims come,
  money flows, and the sick who rest at the shrine recover, because rest is real.
  A real effect with a mundane cause: the mysticism rule exactly.
- **Pilgrimage is a deed** — going to the shrine is the act, a liturgy deed-tag
  from where you walked; the badge records having been.

## 7. The vowed life and mortmain **[LEAN]**

- **The vowed life** — an order is an Organization whose members trade wage and
  property for food, lodging and community: **poverty** (the order holds
  everything), **obedience** (the order assigns the work — the roster's call),
  **stability** (you stay). A total institution entered by consent. ⚠ **Leaving is
  always free; what you gave stays given** — a gift is a transfer, not a loan.
  Vowed labor is unpaid, so the order's goods undercut waged trades — the real
  medieval complaint, a live tension here.
- **The order's houses are trades we have or have slated** — brewery and liqueur
  (distilling), scriptorium (paper and printing), infirmary (medicine), guesthouse
  (residence), granges (farming) — and its goods carry the **order's mark**, as
  *Trappist* does.
- ⭐⭐ **Mortmain — the institution that never dies.** People die and their estates
  pass or escheat ([credit.md](../../subsystems/credit.md): dormant, escheated,
  reclaimed). An order never dies, so land bequeathed to it never comes back out;
  across generations it accumulates without limit. Medieval England's **Statutes of
  Mortmain** — *the dead hand* — answered exactly this. ⚠ The gap is in our estate
  chain for **every** undying organization (guild, co-op, firm); the abbey is where
  it bites first. The polity's remedy is a mortmain law, with a criterion and an
  appeal.

## 8. Cults — the cost of leaving **[DECIDED]**

**Nothing in the system distinguishes a "cult" from a religion**; the word is a
judgment, and the system stays silent on whether a standard is good. What does
distinguish them is the faith slate's first danger: **the cost of leaving** —
isolation, surrendered property, controlled information, punished exit. A
player-run cult can do everything a religion can **except trap you**, because the
Compact guarantees exit.

⭐ **The limit case is Rajneeshpuram** (Oregon, 1981–85): a religious community that
incorporated as a city, took over neighboring Antelope through its elections, and
used municipal power for its ends. Here, a religion that captures a locality's
committee *may* establish itself there — the owner's rule — and the Compact's free
exit is what remains. The hardest lens-7 case this design can meet, and playable.

## 9. Lens pass

1. **Pedagogy** — ⭐ the polities and what they produce; territorial vs gathered;
   targeting; reading an institution by how it decides. Decided § 1.
2. **Expression** — a founded church chooses its polity, its canon, its rites;
   scripture is authored; lineage is `extends:`.
3. **Immersion** — the parish you live in; the relic and its pilgrims.
   **Participation** — the schism and who keeps the building; the theocratic town;
   the cult that takes a committee.
4. **Values** — the system never ranks faiths or motives; the sincere and the
   cynical church share a shape.
5. **Continuity** — the same polities across epochs; the scribe's drift and the
   printed canon.
6. **Economy** — offerings as transfers; rites as a buyer; vowed labor against
   waged; mortmain's accumulation.
7. **Governance** — non-establishment and free exit at the Compact (tier A);
   establishment allowed in localities; title decides the schism; mortmain law.

## 10. Open

1. **The charter readout's verb** — `look` at the church, `analyze` its
   organization, or a reading row; and whether it reads every Organization from the
   start.
2. **Syncretism** — what a tradition drawing on two parents does under
   single-parent `extends:`.
3. **Who may establish** in a locality — the committee alone, or the residents.
4. **Mortmain in general** — whether the undying-organization gap is fixed here or
   in the estate chain for everyone.
5. **What the officiant does in commands** (faith slate open 4) — the rites above
   are the lean.
