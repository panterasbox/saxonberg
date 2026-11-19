# Corpos slate (working doc) — the marks and the fault line

> **Status: PARTIAL** — phase 1, the mark substrate and the v1 roster,
> shipped → [corpo.md](../../subsystems/corpo.md). The roster's LORE
> shape (ethos-only, no entity form) is itself superseded by
> [institutions-slate](./institutions-slate.md) Part 6, which is a
> still-**unbuilt** design of its own — see the note below.
> **Left:** the multipolar approval vector · competition + rival-tanking ·
> sponsorship · approval→access gates · player-founded corpos ·
> portfolios beyond booze · numeric tuning · ⭐ (2026-11-18, at the end) the public face and hidden hand ·
> the conviction tally on every corpo seat, constituency by form · no corporate personhood · charters
> renewed by bill · player companies in the five forms
> **Size:** a build

> ⭐ **2026-09-18 — the roster's LORE is superseded by
> [institutions-slate](./institutions-slate.md) Part 6**: each corpo is
> now an entity FORM with a charter (Goodkin a credit union, Veshko the
> shareholder bank across the avenue, Vionne a partnership, Hollis a
> public company holding an unexercised charter, Aevex a sole trader),
> and `/corpo/<key>` title moves from the organization to a
> `<key>-committee` group. The mark substrate and the faction axis below
> stand. ⚠ Institutions-slate is itself UNBUILT (its own status block
> says so) — the rewrite is a decision, not yet code; the roster below
> matches what corpo.md ships today.

Corpos are a handful of fictional megacorps that own most of the private
sector — a cross-cutting **affiliation/competition fault line** for
players, and a **mark** stamped on the actual goods of the world. Driven
into existence by Dave's Bar needing its brands *truthfully owned*;
foundational world-content well beyond it.

See also:
[vision.md](../../vision.md) (the origin sketch — "Organizational Affiliation
/ Corporations," tentative) · [advancement-slate](./advancement-slate.md)
(**corp = the cross-cutting third social axis**, guild/party/corp) ·
[daves-bar-slate](../world/daves-bar-slate.md) (the first consumer — the back-bar's
booze is corpo-owned) · [affiliation-slate](./affiliation-slate.md)
(related deferred faction/org work) ·
[institutions-slate](./institutions-slate.md) (the entity-form/charter
rewrite of the roster, Part 6 — unbuilt). Substrate:
provenance/maker's-mark (the mark), [belief](../../subsystems/belief.md)
/ renown (the approval scope).

---

## The world frame, the mark, and the v1 roster — shipped

The five-corpo-plus-independents frame (not Good/Evil, tribal not
moralistic; each corpo distinguished by sector + ethos + aesthetic), the
mark mechanism (`Corpo`/`Brand` reference-identities, `BrandedMixin`,
brand→corpo resolution), and the authored v1 roster (Veshko, Goodkin,
Vionne, Hollis, Aevex, the independents, the two rivalry pairs, Dave's
back-bar as the legibility payoff) all shipped as authored content and
are documented in full at
[corpo.md](../../subsystems/corpo.md) — see especially § "Why three
axes", § "The mark is diegetic, not the provenance ledger", and § "Authored
content (v1, the booze slice)". ⚠ The roster's *shape* (ethos-only, no
entity form or charter) is what
[institutions-slate](./institutions-slate.md) Part 6 will rewrite —
still unbuilt; see the note at the top of this file.

## The player axis — closed (Phase 2 design)

The mark (Phase 1) shipped; here is the closed design for the **player's
relationship to the corpo landscape** — the third social axis, the **"earn"**
axis (you *form* a party, *join* a guild, **earn** standing with corps).

**The relationship is the standing-vector — not a membership.** You never
"join" a corpo. Each corpo regards you (a signed standing) and your *conduct*
moves each independently; the pattern across all of them *is* your factional
identity. Substrate: **regard/renown scoped to corpo entities** — the
subject-scoped standing shape guild/party reputation already use, **not** a
new faction model. *(Resolves the approval-substrate question: reuse, don't
build.)*

**Employment is the strongest conduct-input — and the closest thing to
"allegiance."** Working for a corpo (the employment engine) is the deepest
alignment: it maxes your standing with them and tanks their rivals'. But it's
*employment + the resulting standing*, recognized by others — **not** a
membership card. "A Veshko agent" = employed-by-Veshko + high-Veshko
standing, worn as recognition. *(Resolves standing-vs-agency: agency is
employment; there is no separate corp-membership primitive.)*

**What the competition is *over*: market + prestige — explicitly NOT
territory.** The load-bearing call:
- **Market** — whose brands and services the world chooses (economic share,
  refereed by the conserved economy). Non-sovereign, conduct-mediated, the
  pie can grow.
- **Prestige** — the world's aggregate regard for a corpo's ethos (the
  approval vector at corpo scale).
- **NOT territory / jurisdiction** — that is the polity's (territory =
  protected resource-tenure / governance). Corps own **property** (venues,
  brands — the mark) and contest **market**, but they do **not** hold
  **territory**. Keeping corps off territory is what keeps them *powerful,
  not sovereign*. *(Splits the old "competition/territory": property + market
  yes, jurisdiction no.)*

**Prosocial by construction.** Take EVE's *structure* (competing factions),
not its *culture* (scam/grief/predation). Because the win-condition is
**comparative excellence** (out-earn, out-prestige) and there is **no
mechanism to destroy a rival corpo** (they're authored, persistent), the
rivalry *cannot* collapse into griefing — you win by being better / more
favored (the house-cup / team-sports shape). Protect this at every
downstream decision.

**The rivals fault-line goes live.** The authored `rivals` edges (Vionne↔
Hollis, Veshko↔Aevex, Goodkin floats, Independents outside) become consumed:
conduct favoring one corpo *tanks its rival*, so the vector has structure
(not five independent dials) and the game plays out along the fault-lines.

**Sponsorship — how a corpo projects into the world.** A corpo charters /
funds an institution — a **guild branch** ("the Aevex Combat Academy"), a
**venue**, a **crew** — lending its prestige to what it backs (a
corp-sponsored guild's certification carries the corp's standing). This is
the corpo↔guild interlock (advancement-slate's "corp-sponsored branches") and
the EVE "corp-branded branch" reinterpreted honestly: **the corp sponsors
*institutions*; it does not hand out player memberships.**

**What standing *does* (the consumers — an access currency, not a power
stat):** contract access (a corpo hires those it favors), venue/amenity
access + prices, sponsorship eligibility (high standing → it backs your
crew/venue/branch), and the recognition halo (others regard you per their
stance toward your corpo). Economic + social access, never a combat buff.

**The mark extends — venues by ownership, people by standing.** `BrandedMixin`
marks *products* today; it extends cleanly to **venues/branches** (ownership
— a Veshko-owned bar *is* marked like a product). **People are NOT
`_branded`** — a person's corpo relationship is their dynamic *standing*
(+ any employment), surfaced via belief/recognition ("a known Veshko agent"),
not a durable ownership stamp. Ownership-mark for things; standing-recognition
for people.

**Independents = a region, not a positive faction.** Being independent is the
*absence* of corpo alignment (low/neutral across all) — a region of the
approval-space, not a unified faction with its own dial. Specific independent
outfits (a named microdistillery) can be authored as their own small
reference-identities later, but there is no monolithic "Independent Guild."
*(Resolves the independents question.)*

**Player-founded corpos: deferred (the apex).** v1 is the five authored
corpos + the independents you earn standing with. A player-founded corpo is
an apex like player-banks — it needs machinery to mint a new `Corpo` Idea,
its brands, and its entry into the rivalry graph — deferred with the
economy/cooperative maturity that supports it. The seam: a new Corpo Idea +
brands + a rivalry edge.

**Governance boundary (the wall).** Corpos are authored institutions /
reference-identities, **not** government (Offices/Chambers). *Powerful ≠
sovereign*: a corpo can economically dominate without legislating, holding
office, or owning territory. Corps compete *within* the polity's rules; the
monopoly of legitimate force and jurisdiction stays the polity's. This is
what stops the faction-game becoming a shadow government.

## Open (residual)

- Portfolios beyond booze — already decided as deferred, documented at
  [corpo.md § Deferred](../../subsystems/corpo.md#deferred) verbatim
  (authored as consumers need them; not a design fork).
- **Player-founded corpos** — the deferred apex (above); revisit with
  economy/cooperative maturity.
- **Numeric tuning** — conduct→standing rates, the rival-tanking coupling,
  approval→access thresholds. Tuned against a running game.

*(Approval-substrate, competition/sponsorship, and independents are resolved
in the Phase 2 design above.)*

---

## ⭐⭐⭐ 2026-11-18 — what corpos are, and how anyone comes to run one

Talked through with the owner after the governance design
([separation-of-powers-slate](./separation-of-powers-slate.md), [guild-slate](./guild-slate.md)
§ *The guild as an institution*). The owner: *"Corpos are a weird one because I don't know exactly what
I want them to be … these have the least shape and we are free to do the most with them at this
point … we can leave some of this stuff to discover later on when we actually need corpos to do
something for us. But we can do our best to fill in the pieces we know, anticipate ones we don't, and
try to figure out where the 'cool' is in the whole corpo design."*

### Private, though the Compact holds everything **[DECIDED]**

*"I really don't want these things to be state run … in the end the Compact really does control
everything; we don't have a 'private sector' in the strictest sense."* The Compact holding the root no
more makes everything state-run than a sovereign country makes its companies state-owned. **Private
means a holder with protections the state cannot casually override** — the right to exclude, a warrant,
compensation if taken (separation-of-powers § 7l). Corpos are chartered by the polity and protected by
its law, never run by it, by three choices:

1. **The state does not seat their leaders** — each corpo's own constituency does (below).
2. **The state does not set their strategy** — *author the ethos, never the outcome* (institutions-slate).
3. **They actually compete** — market share is the real economy's verdict, nothing scripted.

### Where the cool is

**1. A public face and a hidden hand** **[LEAN — the shape; content later]**. The owner: *"they might be
better stand-ins for some of the clandestine guild content you'd see in other games — the Dark
Brotherhood from Skyrim doesn't really fit our guild model."* A guild is chartered, public and
master-led; a clandestine organization needs **cover, money and protection**, which a corporation gives
— real organized crime runs through fronts and shells, and limited liability is a shield. So each corpo
has a legitimate business **and a covert arm fitting its ethos**:

| corpo | its public face | its hidden hand |
|---|---|---|
| **Veshko** — the ruthless optimizer | the bank across the avenue | repo men who become enforcers; collection by other means |
| **Vionne** — the prestige house | luxury, restricted supply | spies and blackmail — knowing things about the right people |
| **Aevex** — the disruptor (*you pay in data*) | free services | information brokering and surveillance |
| **Hollis** — the populist | cheap goods everywhere | smuggling and the grey market |
| **Goodkin** — the paternalist mutual | the credit union | the family — mutual protection sliding into a code of silence (how the Mafia began); **or clean on purpose [OPEN]** |

Honest under the rules: **hidden in the fiction, not in the code** (concealment, disguise and belief
make in-fiction secrets real; meta-level it is a spoiler); **its crimes are in-fiction crimes**, which
players are meant to commit, judged on what someone could know (separation-of-powers § 7o); **the
griefing line holds** — it targets characters, never the persons behind them
([moderation-slate](./moderation-slate.md) § 23). **Legitimate on the ledger, criminal in its shadows**:
a teller may work Veshko's window for years and never learn what the repo office does.

**2. The barons — the estate that checks the state.** The owner: *"I kinda want them to maybe even balance
the power of the state somewhat … an oligarchy based on the game's strongest personalities might not be
such a bad check on government. Or it could be really bad and swallow the game whole."* The Magna Carta
was barons limiting a king. Corpos run what everyone depends on — the banks, the TPA's carriers, the
well rail's supply — so withholding service is real leverage (a capital strike); the state checks back
with charters it renews, antitrust at the Compact's level, and the wall. **The press as the fourth
estate, the corpos as the barons, the Compact as the crown: that standoff can be the game's central
political drama.**

**3. The risk — they swallow the game.** The known routes: capture of the legislature, buying the press,
owning everyone's livelihood. The guards are mostly designed: **money never carries a bill alone** (2 of
3); **no corporate personhood** (below); **disclosure** of sponsorship and conflicts; **antitrust at a
corpo's reach**; **fair procedure** wherever it holds something exclusive. Whether they suffice is what
a living polity finds out.

### ⭐⭐⭐ How anyone comes to run one **[DECIDED — the owner's critique, then the mechanism]**

The owner, on a first draft that leaned on *"the founder"*: *"You talk about 'the founder' like that isn't
also another person we have to figure how they're chosen … NPCs can't make choices, so you're
contradicting yourself … it's my experience that these roles get filled by the first person that's
willing to do them, which means you need a structured way to unseat that person and replace them with
someone more suitable. Iterate quickly through people until you find the right one for the job. But you
also want people to want the job … what's the mechanism behind all this, and what makes it more than a
popularity contest?"*

- **Before anyone holds a seat, a corpo is lore on autopilot.** An NPC cannot choose, but a **policy** can
  run: with no person in its leadership, a corpo executes its **authored ethos as a fixed strategy**
  (Veshko repossesses without sentiment; Hollis prices thin). **Every leadership seat starts empty.**
- ⭐⭐ **One engine: the conviction tally on every corpo seat** ([influence.md](../../subsystems/influence.md)
  § Conviction) — positions held continuously, weight building the longer support is held, a rival with
  more support replacing the holder. **What differs is who holds positions and what they weigh**, which
  the entity form (institutions-slate Part 6) defines:

| corpo | positions held by | weighted by |
|---|---|---|
| **Goodkin** (credit union) | its members | one member, one vote |
| **Veshko** (closely held) | its shareholders | shares |
| **Vionne** (partnership) | its partners | their interests |
| **Hollis** (public company) | its shareholders, mostly small | shares — organizing them is the game |
| **Aevex** (sole trader) | nobody — the business is *owned* | it changes hands **by sale**: the one form where money buys control — allowed for a corpo, never the polity **[OPEN — the owner]** |

- **The first-willing-person problem:** an empty seat goes to **anyone who stands unopposed** — the first
  willing person, no ceremony; they hold it **only while they out-poll every rival** — constructive
  replacement, costing nothing and needing no election calendar, so the iteration happens on its own;
  **the conviction ramp gives a holder room** to act before a flash mob unseats them (inertia without
  term limits); **standing decays**, so an absent leader loses the seat to whoever is present.
- ⭐ **Why it is more than a popularity contest:** **the voters bear the outcome** (members live with
  Goodkin's results; shareholders' money rides on Veshko's); **the voters see the scoreboard** — the
  engine measures each corpo's earnings, market share and regard, **publicly**, and never picks (choosing
  a leader judges a person, which the measurement doctrine leaves to people); **support must be
  sustained**; and **each form is a different contest**.
- **Is a popularity contest what we want? Partly, on purpose.** Goodkin *is* one, among its members —
  democracy's strengths and failure modes taught on a bank. The other four weight by capital, by consent
  or by ownership: **five corpos are five answers to *whose opinion counts***, each with its real failure
  — Goodkin's demagogue, Veshko's entrenched bloc, Vionne's closed circle, Hollis's apathetic holders,
  Aevex's deep-pocketed buyer.
- **Why anyone wants the job:** the seat controls pricing, lending, sponsorship, which guild wings it
  endows, **and the hidden hand**; pay comes from the corpo's own earnings by its own rules.
- **The journey is the pitch.** You arrive as nobody: a job (Dave's Bar is the first rung) → regard (the
  standing vector above) → a position → ownership on the cap table → a seat by that corpo's rule. **A
  player's first takeover of a corpo seat is a world event** on the paper's front page. And the skills
  carry to the polity: a Goodkin board member has run an election; a Hollis proxy fighter has built a
  coalition — the PM's headcount and the floor's tallies are the same arts. **Corpos are where the
  strongest personalities learn the power that makes them the barons.**

### Corpos in the polity

- ⭐ **No corporate personhood** **[DECIDED]**. A corpo is an institution, never a member: no standing, no
  position on a bill, no second. Its influence on legislation flows **only through people**, as persons —
  *Citizens United* inverted. It is what *money can never buy power* requires once corpos are real.
- ⭐ **A charter is a grant from the polity, renewed by bill** **[DECIDED]**. A chartered corpo is a
  committee holding grants the legislature gave it (a bank charter, a carrier license); **renewing
  Veshko's bank charter is a bill on the floor**, with its own Subject and the paper's coverage. The
  institutions-slate arcs (Hollis exercising its charter, Aevex's renewal) become legislative events.
- **Misconduct goes as high as its reach.** Jurisdiction follows where harm landed (moderation § 23): a
  shop overcharging in Terminus is Terminus's case; price-fixing across every city a corpo trades in lands
  everywhere, so the lowest common holder is the realm or the Compact. **Antitrust is the Compact's by
  arithmetic**, and so is the wall.
- **Protection must be legal, never informational** **[LEAN]**. Nothing can be secret — the code and
  content are public; a guild's mysteries are spoilers. So the only workable protection for a design (the
  future-tech slate's *who owns a design*) is **a patent**: the design published, an exclusive right to
  *make* it granted for a term — disclosure for a temporary monopoly. The disclosed design enters the
  curriculum; the right expires. A grant from the polity, by bill or a patent office. Guilds too.
- **Fair procedure through exclusivity.** By the computed test (guild-slate), a corpo owes it where it
  holds something exclusive — the only carrier on a route, a bank charter, a patent. An ordinary
  dismissal does not trigger it; **at-will or just cause is the polity's labor law**, Tier C, with unions
  (guild-shaped institutions inside corpos) the natural players.
- **Where corpos meet the rest:** carriers lease TPA gates, so gate exclusivity is where fair procedure
  and antitrust bite first; corpos sponsor the paper, with disclosure on its record; corpos endow guild
  wings, never forks; firms are where the frontier moves, beside guilds.

### Lens pass

1. **Pedagogy** — the five forms; Berle and Means's separation of ownership and control (Hollis lives
   it); proxy fights; the principal–agent problem; Glass-Steagall; antitrust; patents; the capital
   strike; the estates checking a crown. ⭐ **The five forms stay distinct** — each teaches whose opinion
   counts; ⭐ **each corpo's scoreboard is public** **[DECIDED — lens 1]**.
2. **Expression** — authors write the ethos and the hidden hand, never the outcome. ⭐ **Player-founded
   companies stop being a deferred apex**: the guild conversation gave players a generic institution
   toolkit, and entity forms are charters, so **a player may found a company in any of the five forms
   with no special machinery**; the five corpos are special by size, history and lore, not kind
   **[DECIDED — lens 2; supersedes *Player-founded corpos: deferred (the apex)* above]**.
3. **3a Immersion** — the autopilot plays as character; the hidden hand is hidden in-fiction; shareholder
   meetings and member elections are in-fiction institutions under the flag. **3b Participation** — the
   hidden hand against rivals' characters, collusion, capture through people, the barons against the
   crown: real politics.
4. **Values** — Aevex by sale; a clean corpo or a hidden hand everywhere; labor law.
5. **Continuity** — ⭐ **arcs change a corpo's form, never end the corpo** **[DECIDED — lens 5]**:
   demutualization, the IPO, the bloc fragmenting, the proxy fight transform it; its identity persists and
   answers the same commands. Market failure may shrink one to almost nothing; it never disappears. Seats
   have no terms; conviction and decay carry them.
6. **Economy** — power and pay draw people; ownership trades on the cap table; the hidden hand has its own
   illicit economy; **a seat nobody wants stays on autopilot** — a working floor.
7. **Governance** — choosing a leader is the constituency's political judgment, so losing support is not
   appealable, but acts from the seat are on the record and fair procedure applies where it holds something
   exclusive. ⭐ **Each corpo's charter says whether its seat votes are secret or public** **[DECIDED —
   lenses 7, 2]**, as a guild's counting rule. Against alts: Goodkin is one *account*, one membership;
   shares weight capital, so splitting them across alts gains nothing; standing for a seat needs a
   standing floor.

### Open

1. **Aevex by sale** — money buying control, for a corpo.
2. **A clean corpo** — is Goodkin the one with nothing hidden?
3. **Labor law** — at-will or just cause.
4. **Patents** — confirm, and who grants them.
5. **Which corpos carry the TPA's routes.**
6. **A seat's conviction period** — how long before a challenger can win.
7. **Each hidden hand's content** — a content session.
