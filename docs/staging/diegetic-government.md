# Diegetic government — polities, jurisdiction, citizenship (staging)

> **Status: exploration, 2026-07-30. NOT canon, NOT specced.** Design
> conversation capture: what a government *inside the fiction* is, how it
> relates to the real metagovernment, and what (little) new substrate it
> needs. The load-bearing outputs are the **two-layer premise** (§1), the
> **enforcement-powers enumeration** (§4 — that list *is* the modeling
> scope), and the **Polity Idea sketch** (§5). Ratify into the bible /
> graduate to a slate on sign-off. Siblings:
> [terminus-city.md](./terminus-city.md) (the city this government
> administers), [guilds-raw.md](./guilds-raw.md) (the chartered-institution
> rhyme, §7).

## 1. The premise: two layers, and they are NOT faces of each other

There are two genuinely distinct strata of government:

- **The metagovernment** — the real polity (Charter, offices, chambers,
  the register). It governs the *platform*: players, property title,
  money conservation, code trust, conduct. Singular by nature.
- **Diegetic governments** — fiction. The government of Terminus the
  city is *content*: authored, owned, and one instance of a **class**
  that is plural by construction.

**Rejected premise (explicitly, so nobody re-derives it):** "Terminus's
government is the metagovernment's diegetic face / projection." It
cannot be, because diegetic governments are mintable — a new city can
stand up its *own* government with its own identity, laws, and flavor
(or join an existing one, §6), which no singleton-projection model
survives. The bible's liberal-diegesis language applies to the
realm-level Charter framing, not to city government; do not extend it
downward. (Related lore-hygiene rule recorded the same session: the
aether is a metaphor for the internet, nothing more.)

Plurality is a feature: legal diversity between cities is travel
texture, jurisdiction shopping, and refuge-for-outlaws play. Terminus's
retrofit administration ("the young polity retroactively governing the
ungoverned patchwork" — terminus-city.md §1) is the flagship instance,
not the definition.

## 2. The bridge between layers is property — and only property

In the real layer, the Terminus committee's authority is exactly a
**landowner's**: parcel title + content authorship
([parcel.md](../subsystems/parcel.md)). The diegetic government is the
fiction the landowner writes on their own land.

This dissolves the public/private "conflict" (Terminus is privately
held per the parcel registry; diegetically its streets are public).
**Disneyland model:** Main Street reads as a public street and is
private property the whole way down. "Public" is a claim made *inside*
the fiction — the owner narrating publicness on land they hold. The
metagovernment's property system never recognizes "public" as a
category; it recognizes an owner, and the owner says what the land *is*
in the story. The two claims live at layers that never read each other.

## 3. Two codes of law: different subjects, different sources

- **Real law binds players.** Source: the Charter/polity. Substance:
  consent, harm to others' experience, cheating, conservation, title.
- **Terminus law binds characters, within Terminus's jurisdiction.**
  Source: the committee's ownership + authorship. Substance:
  whatever makes the fiction good (murder, theft, vagrancy…).

"No killing" appearing in both is coincidence of content, not shared
authority — a country's criminal code and a chess club's rules can both
prohibit a thing. The codes never need to agree, and **no supremacy
clause is needed** because supremacy is structural: diegetic law can
only be enforced through the powers the engine grants a
landowner-author (§4), and every one of those powers is already
governed by real law. A Terminus statute exceeding those powers can be
*declared* but not *enforced* — theater, which is fine; theater is
content too.

Independence of proceedings: the same person can be a rule-breaking
*player* (real remedy) and a law-abiding *character*, or vice versa —
as independent as breaking federal law vs. your HOA's covenants.

## 4. The six enforcement powers — this list IS the modeling scope

A diegetic government can, concretely and exhaustively:

1. **Move NPCs** — constables notice, pursue, arrest. Brains +
   engagements ([behavior.md](../subsystems/behavior.md)), bounded by
   the combat/consent substrate like every other NPC.
2. **Exercise property rights** — banishment = revocation of access to
   its parcels; likewise denial of services on its land.
3. **Move money it owns** — fines, bounties, fees, wages, all through
   the real banking chokepoints ([banking.md](../subsystems/banking.md)).
   It can never mint; it cannot seize outside consent/contract escrow.
4. **Keep records** — city registry of convictions, licenses,
   marriages: Documents + chronicle **claims** (a conviction is the
   institution's claim about a character — the deed/claim split,
   [chronicle.md](../subsystems/chronicle.md)).
5. **Touch reputation** — renown is per-scope
   ([renown.md](../subsystems/renown.md)); crime damaging standing *in
   the Terminus scope* is the substrate working unmodified.
6. **Petition upward** — if a character's *player* broke real law, the
   committee escalates to the real polity like any other member.
   The only channel between layers, and everyone has it.

Notice what's absent: no statute engine, no parallel court substrate,
no new legal machinery. The **hard integrity rule**: diegetic justice
may only move real-substrate value (money, chattel, title) through the
real chokepoints. The fiction narrates freely but never mints, burns,
or title-flips outside the conserved systems.

## 5. The Polity Idea — owns Businesses, claims Localities

**Neither supersession of Business nor mixin-stacking: aggregation by
reference.** A government is a legal identity that *contains* operating
units. Parks & Rec and Public Safety as one Business is wrong because a
Business is one operating unit (one roster shape, one P&L); as separate
free-floating Businesses it's wrong because they're branches of one
government. So:

- **Department = a Business** ([employment.md](../subsystems/employment.md)).
  The Watch, Parks & Rec, the Registry — each with its own positions,
  shifts, wages, accounts. Zero new employment machinery. Departments
  are funded *from* the treasury through ordinary banking, so budgets
  fall out for free and the city-economy model (terminus-city.md §6)
  treats a department like any other institution.
- **Polity = the Idea above them** — the Corpo pattern structurally
  ([corpo.md](../subsystems/corpo.md)): a data Idea in a catalogue that
  other things reference. Corpo claims a *mark*; Polity claims a
  *territory*.

```
Polity (data Idea, catalogued — the Corpo pattern)
├─ key, displayName
├─ charter        → Document path (the law, as text — fiction)
├─ treasury       → bank account(s)
├─ claims         → Locality address prefixes (longest-prefix resolve)
├─ departments    → Business refs (Watch, Parks & Rec, Registry, …)
└─ seats          → positions on those Businesses (Mayor, Magistrate, …)

PolityApi.governmentAt(address) → jurisdiction chain, most-local first
```

The Idea earns its existence by being the only piece that doesn't
already exist — everything under the top line is a shipped substrate.

**Seats are positions, not a second office substrate.** The real
polity's Office apparatus is deliberately code-authored and singleton
([governance.md](../subsystems/governance.md)) — wrong tool for
diegetic seats, which must be data, plural, committee-mintable, and
holdable by players *or NPCs*. A Mayor is a **position** (on the
administration department), with holder, wages, appointment semantics
the fiction defines. Authority checks = "holds position X in polity P"
— the `requiresGovernor` analogue one layer down, as data.

## 6. Territory: jurisdiction claims on Localities, longest-prefix

Business applies statically to Stuff objects; **a government applies to
a Locality subtree** ([address.md](../subsystems/address.md)). Three
systems already resolve by prefix/outward walk (parcel `ownerOf`, the
address walk, the biome chain) — jurisdiction is the fourth verse:

- A Polity holds **claims over Locality address prefixes**. "What
  government am I under?" = walk the address upward; longest match =
  local jurisdiction; the chain above = the federal ladder
  (ward → city → state). Nesting for free.
- **Minting a new city doesn't mint a new government unless someone
  wants one.** The new locality's owner points it at an existing polity
  (joins the state) or charters a fresh one — decided by exactly who
  the property bridge says: the landowner, at charter time. Federation
  is a pointer; secession is repointing.
- **Legitimacy rule:** a jurisdiction claim over a locality is valid
  iff the parcel/locality owner consents. Property remains the only
  bridge between layers *and* the write-path gate on jurisdiction.

## 7. Guilds rhyme — share the organs, not a superclass

Guilds (guilds-raw.md; chartered-not-derived) are the sibling case:
chartered institution, player-administered, treasury, roster,
wizard-maintained code underneath. **Resist the "Institution"
super-Idea** — template inheritance by another name (the ref-shapes
doctrine). Share at the **parts** level: both reference Businesses,
hold bank accounts, anchor a charter Document, express leadership as
positions. What differs is the claim — Polity claims a Locality
subtree, Guild claims a practice/membership, Corpo claims a mark. Three
sibling Ideas over common substrates; extract commonality only if real
duplication appears after guilds build.

**The two staffs (applies to both, never merge):**

- **Meta staff** — the committee: parcel owners + code-trusted
  wizards. Rides the property + code-trust axes that exist today
  ([access.md](../subsystems/access.md)).
- **Diegetic staff** — seat-holders: ordinary players or NPCs. Rides
  positions.

"Terminus is code but also a polity of NPCs and real players" is these
two staffs on their own axes, not a tension.

## 8. Citizenship — derived from residence, never conferred

Real municipalities don't do citizenship (that's national); they do
**residency**, established by **domicile** — where you actually live +
intent to remain. Nothing confers it; you *are* a resident by living
there; documents merely evidence it. Two real-doctrine details are
load-bearing:

1. **Domicile persists until replaced.** You keep your old domicile
   until you establish a new one — no stateless gap.
2. **Homeless people are still residents.** Courts have upheld voter
   registration from a shelter address or a habitual park bench.
   Domicile requires a place you habitually are, not a dwelling you
   hold title to.

Mapping (all derive-on-read, the house style — no stamped rows):

- **`citizenOf(character)`** = the jurisdiction chain over their
  **home's address** ([residence.md](../subsystems/residence.md) —
  everyone gets a home, dorm-first). Plural, nested citizenship for
  free (ward + city + state). Grants *membership rights*: the vote in
  the fiction's elections, standing to petition, citizen-only services,
  the city's taxes if it levies any. NPCs derive identically — "a
  polity of NPCs and real players" needs zero membership machinery.
- **`subjectTo(character)`** = the chain over **where they're standing
  now**. A tourist in Terminus must obey Terminus law (what the Watch
  checks). Distinct read from citizenship, adopted from the real model
  because it's cheap now and confusing later.
- **Leaving the dorm without new property ≠ stateless**: domicile
  remains the last home until replaced — one tombstone field on the
  residence record, not a system. Homelessness = no *dwelling*, not no
  *civic identity*.
- **The shelter** should exist — as content, not mechanism. A Terminus
  institution (a public-welfare department Business, or more
  interestingly a charity with its own charter). It gives a homeless
  character a bed and an address their records can point at. It
  *evidences* residency; it never *grants* anything. Scope: a room, a
  Business, an NPC — a content afternoon.

## 9. Concrete cases

- **Marriage** — a Terminus institution, full stop; the metagovernment
  has no marriage law (not its layer). Ceremony at the courthouse =
  content; record = city-registry entry (Document + chronicle); effects
  = whatever the couple opts into through real substrates (joint bank
  account, shared residence), each on its own consent terms. Another
  city may not recognize a Terminus marriage — story material, not a
  bug.
- **The prisons are two institutions.** Terminus's gaol is content, for
  characters — short, gameplay-shaped, exits designed for fun. The
  polity's remedy for a real offender is whatever the real system
  chooses; if it sentences someone to a creator's prison island, that's
  the *polity contracting with content as a venue*, not Terminus's
  gaol. Colocation optional.

## 10. What's the point

- **The civic integrating vertical** — as Dave's Bar integrates the
  commerce substrates, city hall integrates records, employment,
  property, renown, contracts, and NPC behavior into one legible
  institution (the never-half-grown bar applied to civics).
- **Crime-and-consequence is play** — guards, gaols, trials,
  banishment, bounties: the NetHack shopkeeper lesson at city scale.
- **Plurality makes the map politically legible** — authored
  governments extend the readable factional geography into law: where
  you are determines what your character can get away with.

## Jargon standard (added 2026-07-30, supersedes this doc's older usage)

The **markedness rule**: the fiction is where players live, so it gets
the unmarked plain-English civics vocabulary; the meta is the
exceptional frame, so it carries the marked register.

- **"meta" names the layer, not the institution** — "the meta"
  colloquially, "metagovernment" as the precise compound, `meta-` as
  the established prefix (metaresource, meta staff). Never a bare
  proper noun ("Meta" is a company), never a code identifier prefix
  (no `MetaApi` — meta-layer subsystems keep concrete names: office,
  influence, ballot). **"metagame" is a category noun** — any game
  built over the engine's state. The Compact is *a* metagame;
  a future 4x-over-the-TPA-network would be another. Never a proper
  name.
- **The meta institution is "the Compact"** (LOCKED 2026-07-30).
  "Cooperative" rejected (reads politically left; the system is
  deliberately capital-compatible); "Commonwealth" released to the
  fiction's vocabulary pool (a fiction nation may want it). Named for
  the agreement rather than the apparatus — deliberately: paper rights
  mean nothing without good-faith engagement, and the agreement is the
  whole thing. Members are *party to the Compact*. Precedent for the
  metonymy: the Union, the Crown; pedigree: the Mayflower Compact, the
  Compact Clause. "Charter" stays fiction-side vocabulary (Year 0,
  guild charters, chartering content) — no collision.
- **"committee"** = the group that administers a code subdivision (a
  city, a guild) — *the Terminus committee*. Retires the old
  tongue-in-cheek "cabal" and replaces the older "content group".
- **Enfranchised humans in the meta are "members"** — membership, the
  franchise. Not "citizens" (you aren't a citizen of a portfolio).
- **"polity" retires to the academic register, meta-only** — existing
  artifacts keep it (polity-decision-register); new writing stops
  spreading it. "The polity of Terminus" was always wrong: those are
  **residents**.
- **"government", "state", "law", "court" etc. → fiction, unmarked.**
  The diegetic Idea is `Government`; the fiction's territorial tier
  above cities is a "state"/"realm".
- **"resident" is the substrate word; "citizen" is realm-tier fiction
  flavor.** Cities have residents, nations have citizens — one nested
  jurisdiction chain serves both; the word choice is lore, not
  substrate. The requirements read is `residentOf` (renamed from this
  doc's older `citizenOf`), verb subcommand `government residency`.

## Open questions

- Polity module home + catalogue shape (mirror `CorpoCatalogue`? one
  civics registry?).
- Primary-home designation when a character holds residences in
  multiple cities (real doctrine: many residences, one domicile —
  player-designated primary?).
- Seat-authority plumbing: the generic "holds position X in polity P"
  validator (the deferred generic office validator's diegetic twin).
- Whether jurisdiction claims live on the Polity, on the Locality, or
  both (write-path is owner-gated either way).
- How Terminus law interacts with the future real judiciary's
  outlawry/killmail case type — the real court judges *player* conduct;
  the city magistrate judges *character* conduct; boundary cases.
- **The Circulation Reserve lever's eventual home.** The city-economy
  model (terminus-city.md §6) steers the city's Circulation Reserve
  through the *meta's* CB Governor office — correct for v1 (CB is
  live-from-boot, no city government exists), but it is a meta office
  holding a fiction-economy lever. Long-term that lever probably
  migrates to a Terminus government seat (a Treasurer), with the meta
  CB keeping only the mint.
