# Blood-bank economy — requirements

**Kind:** feature (content-led, with thin kernel substrate extensions)
**Leads from:** content — first consumer is the Terminus infirmary blood
bank (the `{category: blood, level: 2, unit: L}` par already authored on
the infirmary Business, today with nothing filling it). The kernel
extensions (a type-aware par read, the gift-credit wiring, the issue
act, the consent predicate) each have that one live consumer in this
same build.

The blood *core* shipped with the clinical-medicine build — `test` /
`bleed` / `transfuse` / `operate` / `prescribe`, blood as a perishable
*typed* unit, the transfusion-reaction, the marrow donation cost — and
cold storage (MR !320) shipped the powered blood fridge that lets a bank
hold a unit for weeks instead of hours. What is still missing is the
**economy around the bank**: nothing produces blood to fill the par, a
gift earns nothing, a shortage is invisible, and there is no civic
institution that holds and issues the supply. This build wires those
over shipped substrate. It executes the `blood-slate` v1 (gift-only; the
Titmuss paid-market lever stays out). Seeding slate: `blood-slate`.

## What already exists

Surveyed this cycle (three product-level passes, paths in the plan's
grounding):

- **The blood core** (`blood.md`, trade-medicine): a player `test`s to
  learn a blood type (the only surface — no sheet renders it; `untested`
  until tested), `bleed`s a unit into a bag (a long durative act costing
  volume + the slow `marrow` reserve), and `transfuse`s a unit back
  (matched restores; unmatched inflicts the transfusion-reaction; saline
  is the volume-expander floor). A drawn unit is a perishable typed
  Material carrying species, type, labelled-flag and donor identity.
- **The demand already exists.** Five `operate` operations each declare a
  `bloodCostL`; surgery is the standing consumer of banked blood.
- **Cold storage** (just shipped): the ward's blood fridge keeps a unit
  cold for weeks; a carried cooler holds it off-grid; the freezer
  compartment makes ice and is explicitly *not* for blood (freezing ruins
  a unit).
- **The par + restock spine** (`employment.md`, `retail.md`): a Business
  authors `parLines: [{category, level, unit, supplier?, exemplar?}]`;
  the `restocks`/`stocks` brains drive a par toward level from a
  `supplier:` Business on a cadence (live at the bar and general store).
  On-hand is a *derived* read (`stockSheetFor`), never stored.
- **The org substrate** (`employment.md`, `governance.md`): a Business
  Idea with `positions` (`fulfills`/`purchases`/`requires:{discipline,
  band}`), a `roster`, `banksAt`, `operatingLocations`, and an
  `appointingAuthority` whose `kind: office`/`committee` carries a
  **founder-default holder** (so the org is never ownerless and the seat
  hands off without touching employment records). Appointed via
  `appoint`/`apply`/`clock`.
- **The three credit ledgers**: the **chronicle** deed (`recordDeed` /
  `recordChronicleOnce`, the `chronicle` verb), **disposition**
  evidence (generosity/compassion, minted from an authored
  `dispositionValence` on an act — ⚠ no act authors one yet; this build
  would be the first), and **renown** (⚠ materialized — a donation that
  raises standing must append *and* schedule a recompute, the shipped
  `seedTo` pattern).
- **The demand channels**: `say`/`shout` (a room ask), the press
  `notice` on the ticker (pull-only, no badgering — the Gazette's
  priced-index beat is the precedent), and NotifyPolicy (opt-in,
  silent-by-default, rate-limited).
- **Accountability** (`accountability.md`): a producer appends a `harm`
  row with a producer-supplied `consent` boolean (the bad-meal
  precedent); a row derives as a crime when `!consented && sentient`.

**Therefore what is genuinely new here is** four things, each a thin
wire over the above: (1) **a supplier that fills the blood par** — an
NPC-donor-fed Blood Service org, so the combat supply exists regardless
of players; (2) **a gift mints credit** — donating to the bank or a
named other appends a chronicle deed + generosity/compassion disposition
+ a renown move, while self-use mints nothing; (3) **a type-aware bank**
— shortage is legible by type and the summons names it ("anyone
O-negative?"); (4) **the civic draw** — a seat-gated, gift-only `issue`
of a typed unit, plus an emergency-implied-consent predicate and a
harm-on-non-consent append. Everything else is rows.

## Goals

- The infirmary blood bank **holds a typed stock that refills toward par
  from NPC donors on a cadence**, so a combat blood supply exists whether
  or not any player donates.
- Blood is a **universal-service good with an NPC-guaranteed floor**:
  *nobody dies for lack of blood that physically exists.* A dying patient
  with a compatible unit in the bank is always served — by the NPC
  attendant if no player acts — and no player-held seat can withdraw that
  floor.
- A player **donating blood as a gift** (to the bank, or to a named
  person in need) earns a recorded deed, generosity/compassion evidence,
  and a move in local standing — and **the same act for one's own use
  earns none of it** (the gift/sale thesis, expressed as gift-vs-self).
- A blood **shortage is legible by type** — a named shortage a player can
  read (the press ticker) and a room summons for a specific type — and
  the pull to answer it is the value offered (a life, the credit), never
  a badgering nudge.
- The bank is a **civic institution a player can hold and staff *above
  the floor***: a Blood Service org with a founder-default holder and
  seats that draw, screen, and issue — a player operator runs drives,
  answers the summons, stocks the rare types, and makes the hard
  allocation of *scarce* units, building standing by doing it well, but
  is **never the reason someone bleeds out next to a full fridge**. A
  second Service is authorable as rows.
- An authorized attendant can **issue a typed unit** from the bank
  gift-only, leaving a chain-of-custody record; and a transfusion
  **honours consent** (implied in an emergency, required when conscious),
  with a non-consented administration recorded as harm.

## Non-goals

- **The paid market and its policy lever** → `blood-slate` (the Titmuss
  lever), deliberately out until the economy can carry
  poverty-correlation; v1 keeps the seam (donation records *why*).
- **The black market in blood** → `policing-slate`.
- **Component therapy** (plasma/platelet separation, separate shelf
  lives) → `blood-slate` v2.
- **Disease transmission through the supply** → rides the Titmuss lever,
  `blood-slate`.
- **A dedicated donor centre as a second location** → a later content
  build; v1 co-sites the Blood Service at the infirmary (the mechanism
  must make a second venue need zero code).
- **Emergent trait-driven NPC donation** (a callous neighbourhood runs
  short because its population won't give) → deferred to `blood-slate`;
  v1's NPC supply is a reliable restock cadence, because NPCs earn no
  *standing* by arithmetic (standing = renown × participation) so the
  interesting trait feedback only lands on players anyway.
- **A blood-type display on a character sheet** → nowhere deliberately;
  type stays a fact you learn by `test`, per the slate (knowing is a
  belief, learned by being tested).
- **Lineage inheritance of blood type** → `lineage-slate`; v1 assigns
  type by the shipped precedence (author pin → species frequencies →
  roll).

## Placement

The **mechanism is substrate**; the **Terminus bank is content**.

- The **blood acts** (`test`/`bleed`/`transfuse`) and the blood Material
  stay in `trade-medicine`, where they shipped.
- The **par/restock, org, credit-ledger, and accountability** substrate
  is kernel/platform and already generic — this build *extends* it
  (type-aware par read, the gift-credit wiring, the `issue` act, the
  consent predicate) rather than forking it.
- The **Blood Service org, its seats, the donor supply, and the typed
  bank** at the Terminus infirmary are **content rows**.
- ⭐ **The test: a second blood bank needs zero code** — another clinic
  authors a Blood Service Business with a blood par and a donor supplier,
  and it works. This is the trade=mechanism / locality=expression line.
- Whether the Terminus rows ride `trade-medicine` or a thin new
  blood-service pack is the plan's call; the product requirement is only
  that the bank is an *org over the shipped Business substrate*, not a
  hardcoded NPC caste.

## Collisions

Everyone this touches already lives at **the Terminus infirmary**
(`/world/terminus/infirmary/`):

- **The physician's practice** is already a Business there (physician +
  nurse positions, hours 7–19, `banksAt: goodkin`) — and it currently
  carries the `{category: blood, level: 2, unit: L}` par line. ⚠ **The
  blood par must move off the practice onto the Blood Service org** — the
  slate is explicit the blood people are *separate from medical*. Two
  Businesses operating at one location (the practice and the Blood
  Service) must stand up and attribute independently.
- **The ward** (cots, tariff slate, the basin, the just-placed blood
  fridge + cooler, the dressing cabinet) is where the Blood Service
  co-sites — it needs an `operatingLocations` fixture there (a donation
  couch / a registrar's desk) without displacing the practice's.
- **The physic garden** (north of the ward) and the **counting-houses
  avenue** (the ward's southwest exit, which carries the grid feeder the
  fridge draws) are unaffected but are the neighbours.
- **The physician + nurse cast** stay the practice's; the Blood Service
  brings its **own cast** (a registrar, and the donor NPCs that feed the
  supply).
- The **general-store cold room** (the other cold-storage consumer) is
  unrelated and elsewhere.

## Surface decisions

### The supply backbone — NPC donors stand up the bank
**Q:** Where does the bank's blood come from, given a player can't be the
backbone (at 12× a donor's marrow regrows a unit in ~28 real hours)?
**A:** A **Blood Service org** whose supply is **NPC donors giving on a
cadence**, filling the bank toward par via the shipped restock spine.
Player donation is a *choice* layered on top, never the load-bearing
wall. **Chosen by lenses 6 + 3b** — it creates real vocations (registrar,
phlebotomist, screener) and an institution to participate in, where a
clinic-function would create neither.

### Gift-vs-self is what mints credit
**Q:** A `bleed` today mints nothing; when does donation earn the
chronicle/disposition/renown credit?
**A:** When the unit is **given** — to the bank, or transfused into a
*named other* — not when drawn for one's own use. Generosity for routine
giving, compassion when answering a named person; a chronicle deed; a
renown move in the locality. **This is the gift/sale thesis** (payment
severs the disposition credit) expressed as gift-vs-self, since v1 has no
sale. The revival it buys also mints the recipient a deed ("someone's
blood brought you back") — the slate's best-donor loop.

### Type-aware shortage and the summons
**Q:** Is the bank's stock and shortage legible by blood type?
**A:** **Yes.** The bank's shortfall is readable per type, a shortage
posts as a type-named press notice, and a room summons names the type
("anyone O-negative?"). **Chosen by the user**, and it is the slate's
headline payoff — typing creates *occasions where a specific stranger
becomes necessary*, which almost nothing else in the design does.

### Dispensing is a seat-gated, gift-only issue act
**Q:** How does a unit leave the bank to be used?
**A:** A new **`issue`/`requisition`** act: an on-shift bank attendant
dispenses a typed unit gift-only (never `buy`), appending a
chain-of-custody record. **Chosen by lenses 6/3b/7/4** — it is the
registrar's actual job (economy), makes the bank a counter you transact
with (participation), names who may draw and leaves an auditable trail
that is simultaneously a malpractice record and a credential
(governance), and keeps the draw off money so the gift thesis survives at
the dispensing end too (values). Raiding the fridge with `get` was
rejected: "authorized" would have no criterion.

### The floor/ceiling split — players operate above an NPC-guaranteed floor
**Q:** Blood is life-or-death. Do we hand players the controls on a good
whose failure mode is a *third party's* death — and does the player
experience differ from the NPC's?
**A:** **Yes to both, split by altitude.** Blood is a **universal-service
good**: unlike every luxury trade shipped (a failed gin shop just doesn't
clear a nice-to-have), a blood bank that fails *kills*, so the economy
lens forbids a floor the market can withdraw.
- **Floor — NPC-guaranteed, un-withdrawable:** the emergency case (a
  dying patient + a compatible unit on hand) is always served, by the NPC
  attendant if no player acts, bypassing any player-held gate. Supply
  *and* emergency dispensing have an NPC floor.
- **Ceiling — player-operable, where the drama is:** everything above
  "don't die" — donor drives, the named summons, stocking rare types,
  *elective*-surgery supply, and the allocation of **scarce** (not
  last-ditch) units. A player registrar makes the bank *good* and earns
  standing for it.
- **The player/NPC experience is deliberately asymmetric.** An NPC giving
  or dispensing is *plumbing* (mints supply, no standing). A player
  giving or running the Service is a *character act* (the deed, the
  trait, the standing, the hard allocation call). The engine guarantees
  the floor; the player participates where it is a choice with a
  consequence to their character — the measurement doctrine's
  feed-measures / mirror-shows-you, applied to life and death.
- **Abuse is a governance story, not a silent death:** a player operator
  who hoards or mis-issues hits the custody/accountability ledger
  (mis-issue without consent is already `harm`; hoarding a public good is
  a legible, standing-destroying, punishable act), never a third party
  dying beside a full fridge.

**Chosen with the user**, over the alternative (*pure NPC infrastructure
— players only donate and receive*). That alternative was safest and kept
the gift (the pedagogical core) intact, but threw away the values-lens
allocation moment and the registrar vocation; the floor/ceiling split
keeps both without the "I logged off and three people died" failure mode.

### Consent
**Q:** Can a transfusion happen without the patient's agreement?
**A:** **Implied consent in an emergency** — a dying/unconscious body may
be treated by anyone; a conscious body must agree. A transfusion
administered without consent appends a **harm** row (the poisoner's
shape, producer-side), so the same ledger is a malpractice trail and a
credential depending on outcome.

### Shelf life is game-time
**Q:** Game-time or real-time spoilage?
**A:** **Game-time** — already settled by what shipped (blood is a world
Material on the freshness clock, kept by the cold fridge). Noted only
because it couples supply pressure to `setScale`; the rates are dials.

### The holder is an office with a founder-default
**Q:** Who owns the bank — a business, a civic office, a fixture?
**A:** A **Business with `appointingAuthority: {kind: office}`** (or
committee) — a founder-default holder so it is never ownerless, and the
seat hands off without touching records. This makes a blood bank
*privately holdable*, which is most of the politics and keeps the paid
lever a future legislative choice.

## Lens pass

1. **Pedagogy** — blood type teaches biological compatibility that cuts
   *across* species (a dwarf and an elf can share; two elves might not) —
   the anti-essentialist refutation, true of real ABO. The bank teaches
   the collective-action / free-rider problem directly: a perishable
   public good nobody can stockpile.
2. **Creative expression** — the ordinary case is rows (a second clinic's
   bank is authored, zero code); the bespoke case (a rare-type donor
   drive, an org with unusual seats) is authored without forking.
3. **Immersion / participation** — ⭐ fills a real institution-shaped
   hole: a civic bank with a registrar seat, a summons that makes a
   specific stranger matter, a donation that is remembered. The polity
   can run a blood service we didn't script.
4. **Values** — two forced choices with no right answer. *Give / don't*,
   with no scale and no ranking: an **unearned distinction** (your type is
   just true) that makes universal donors community assets. And, above the
   floor, *who gets the last scarce unit* — a genuine undecidable this
   build hands a **player** operator to decide, which is exactly lens 4's
   home and the richest content here. Standing is conferred by the
   locality (renown); the deed by the chronicle; gift-only keeps the act
   an act of character.
5. **Continuity** — the mechanism holds across epochs: a bank that holds
   typed perishable units, issued on authority, answers the same acts
   whether the era is medieval or industrial; only the cold-chain and
   paid-market dynamics change.
6. **Economy** — ⭐ a **life-or-death good inverts the usual player ruling.**
   For every luxury trade, a failed player business is harmless (the
   market just doesn't clear a nice-to-have); blood is a
   **universal-service good** where "go without" = die, so the supply and
   emergency-dispense **floor cannot be withdrawn by a player** — the NPC
   institution guarantees it; players operate above it. Produces: a
   reliable typed supply + the registrar/phlebotomist/screener vocations
   (courier later). Consumes: donor volume/marrow, cold-chain power, the
   Service's wages. Who pays: the Service's treasury (wages), the donor
   (volume) — never the recipient (gift-only). The demand was there first
   (surgery's `bloodCostL`, the bleed).
7. **Governance** — when the bank judges *who may draw*, the criterion is
   the seat (on-shift, authorized), the record is the custody/harm
   ledger, and the holder is an office with a founder-default and a
   hand-off. A player operator's abuse (hoarding, mis-issue) is a legible,
   recorded, punishable act — a governance story, never a silent death,
   because the floor still serves the dying. The gift/paid policy is named
   as a future legislative choice (not built).

## The drive

Driven at the Terminus infirmary on a live world.

1. **The bank is stocked, by NPCs.** Arrive at the ward. Look at / query
   the blood bank: it holds **typed** units (e.g. "O+ 1.5 L, A− 0.4 L,
   O− — none"), because the Blood Service's donors have been giving on a
   cadence. Confirm the stock is **derived from the units actually in the
   fridge**, not a stored number.
2. **Surgery spends it.** A patient needs a rupture-repair (0.3 L). The
   clinician transfuses a compatible banked unit; the bank's stock for
   that type drops. (Demand is real and pre-existing.)
3. **A shortage becomes legible.** Drive the O− stock to zero (surgeries
   / issues). A **press notice** posts — "the Terminus infirmary is short
   of O−" — readable on the news ticker and the start-screen press room.
   No push, no toast, no badger: it is on the ticker because someone
   reads the ticker.
4. **The summons.** In the ward, the registrar (or a player holding the
   seat) asks the room **"anyone O-negative?"** — a specific kind of
   stranger is now needed.
5. **A player learns their type and gives.** An untested player `test`s
   (a drop, a one-line answer) to learn they are O−. They `bleed` a unit
   into a bank bag and **give it to the bank** (the gift act). Confirm:
   a **chronicle deed** is recorded, **generosity** (and **compassion**,
   because the ask was a named shortage) evidence appends, and local
   **renown moves** (append + recompute). Then confirm the control: a
   player who `bleed`s into their *own* bag for their *own* use earns
   **none** of the three.
6. **The registrar issues a unit — and makes a hard call.** An on-shift
   Blood Service attendant `issue`s an O− unit to the clinician/patient —
   **gift-only, no coin changes hands** — and a **custody record** appends
   (who issued what, to whom). An unauthorized or off-shift person is
   refused. Then the scarcity moment: with one compatible unit and two
   patients wanting it (one elective, one urgent-but-not-dying), the
   player operator chooses — a values call the record remembers.
7. **Consent.** Transfusing a **conscious** patient requires their
   agreement; transfusing a **dying/unconscious** one proceeds under
   implied consent. Transfuse a conscious patient *without* agreement and
   confirm a **harm** row appends against the administrator (the
   poisoner's shape).
8. **The backbone and the floor hold with no players.** With no player
   donating, the bank still refills toward par from the Blood Service's
   NPC donors on its cadence — the combat supply does not depend on a
   player. And the floor: with **no player operator on shift**, a dying
   patient with a compatible unit on hand is still served (the NPC
   attendant dispenses under implied consent) — nobody bleeds out beside a
   full fridge. Conversely, a player operator who **refuses/hoards** does
   not override the floor for a dying patient, and the refusal is recorded.
9. **A second bank is rows.** (Author-level check) a second clinic's
   Blood Service — a Business with a blood par and a donor supplier —
   stands up a working typed bank with no new code.

## Acceptance criteria

*(Observable from outside the code.)*

- At the ward, the blood bank shows **typed** stock, and that stock
  reflects the units actually held (draw one out, the reading drops).
- Leaving the bank alone, its stock **rises toward par over game-time**
  from NPC donors — with no player having donated.
- A player who **gives** blood (to the bank or a named other) afterward
  sees it in their `chronicle`, moves on the touched traits, and rises in
  local standing; a player who draws blood **for their own use** sees no
  deed, no trait move, no standing change.
- When a type runs out, a **named shortage for that type** is readable on
  the press ticker without the player being pushed or nagged; and the
  room summons names the type.
- An **on-shift Blood Service attendant can issue a typed unit** with no
  payment; an unauthorized person cannot, and the issue leaves a record a
  player can read (`chronicle` of the bank / the custody trail).
- **The floor holds regardless of players:** a dying patient with a
  compatible unit on hand is served even with **no player operator on
  shift**, and a player operator **cannot withhold** blood from a dying
  patient to death — the attempt is recorded, the floor still serves.
- Above the floor, a player operator **can choose** who receives a
  **scarce** (non-last-ditch) unit, and that choice is attributable in
  the custody record.
- A **conscious patient can refuse** a transfusion; a **dying one is
  treated** without being asked; a transfusion **without consent** shows
  up as harm attributable to whoever gave it.
- A compatible-across-species, incompatible-within-species donation
  **works** (the clade graph is not a hierarchy) — nobody is ever
  hard-blocked from a donor pool.
- The bank can be **held by a seat that hands off** (an office with a
  founder-default holder), observable by appointing a new holder without
  the stock or roster breaking.

## Cross-references

- **Seeding slate:** `docs/slates/builds/blood-slate.md`
- **Subsystems:** `blood.md` (the core), `employment.md` +
  `governance.md` (the org, par, seats), `retail.md` (the restock
  brains), `chronicle.md` / `trait.md` / `renown.md` (the gift credit),
  `comms.md` / `press.md` / `social-graph.md` (the summons, no-badgering),
  `accountability.md` (consent/harm), `thermal.md` + `energy.md` (the
  cold chain the fridge rides).
- **Related slates:** `cold-chain-slate` (the shipped fridge this
  depends on), `species-slate` (costs-not-ranks for the clade graph),
  `legal-code-slate` (the future gift/paid policy object),
  `freight-slate` (the later cold-chain courier vocation).
