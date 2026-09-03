# Rejection — the locality (design, staging)

> **Target seeds:** `packages/content/rejection/content/world/rejection/**`
> (new: `location/`, `agent/`, `idea/` rows for the support half) ·
> `packages/content/world-seed/content/stuff/idea/Locality/rejection.yaml`
> (amend: `_governmentKey` when the town charters).
>
> **Retire when:** the support half is in YAML — the Rest, the Tallow, the
> sharpening shop, the infirmary and the Institute exist as rooms with
> cast, and the shift cores replace the placeholder 24/7 rosters.
>
> **Status: design, pre-requirements.** Design rationale lives in
> [towns-slate](../slates/builds/towns-slate.md); the mine itself is
> `rejection-slate` + `metal-chain-slate` + `mining-slate`. This doc is
> the **content bible** — who lives here, what they do all day, and what a
> future build can rely on finding.

---

## 1. What kind of place it is

**A town nobody chose.**

The name is literal and it is about the ground, not the people: the first
prospectors up this valley were *rejected* — bad rock, thin showings,
three seasons of nothing — and most of them left. Somebody stayed long
enough to find the Ferrow. The name stuck because the people who stayed
thought it was funny, and then it stopped being funny and stayed anyway.

Everything follows from **you go where the ore is, not where the people
are**:

- Nobody is *from* Rejection. There are almost no children and no
  grandparents. The population is working-age because the town has no
  other use for anybody.
- ⭐ **It is the most species-mixed place in the realm**, and for the
  opposite of the usual reason. A city has enclaves because people who
  arrive with a choice settle near their own. Rejection has no enclaves
  because nobody arrived with a choice — the work does not ask what you
  are, only whether you can hold a bar. Do **not** write this as a
  khazadicus town; the trope is available and it is exactly the
  essentialism the species doctrine refuses. The mixing *is* the
  characterisation.
- Everyone is somebody's second choice of life, and the town knows it.
  That produces the specific Rejection tone: **unsentimental, funny about
  bad odds, and fiercely literal about safety.**

**Tone register.** Flat, dry, declarative. Nobody here is eloquent and
everybody is precise. The one subject on which the town is *not* casual is
air. Sentences shorten as the subject gets more dangerous.

**What is normal here that is shocking elsewhere:** working a face alone;
a woman running a burn; owing the store four weeks; talking about a man's
lungs to his face.

**What is shocking here that is normal elsewhere:** an unattended flame; a
stranger who won't say what he's after; a promise about the ground.

---

## 2. The two halves

| | |
|---|---|
| **Functional (shipped)** | the Ferrow diggings · four businesses (co-op, fuel yard, smelter, provisioning) · the grade chain to the ingot · the damps + the canary · the claims register |
| **Support (this doc)** | the Rest (lodging) · the Tallow (public house) · the sharpening shop · the infirmary · the Ferrow Institute |

⚠ **Eight surface rooms ship and all eight are workplaces.** There is
currently nowhere in Rejection to *be* that is not work. That is the gap
this doc fills.

---

## 3. Geography and the room map

Rejection is a **shelf**: a steep hillside with one level bench cut into
it where the adit comes out, and everything crowded onto that bench
because it is the only flat ground. The town is one street long because
the shelf is one street long.

```
                    ▲ (the coppice, the fuel yard's stand)
                    │
   the Institute ── the Row ── the Tallow ── the Rest
        │             │           │
        │        the sharpening shop
        │             │
   the infirmary   pithead yard ── the Dry ── the adit ──▶ THE FERROW
                       │
                  assay shed ── provisioning ── smelter ── fuel yard
                       │
                       ▼ the road down the valley
                         (→ Heart's Delight → Terminus)
```

**Shipped (8):** adit · assay-shed · claims-office · fuel-yard ·
pithead-yard · provisioning · smelter · the-dry.

**New (5):**

| room | what it is |
|---|---|
| **the Rest** | Morwenna Bawden's lodging house. Eleven beds in four rooms, a kitchen, a drying rack always full. Bed by the week. |
| **the Tallow** | the public house. Named for candles, which miners bought themselves and burned by the hour. One room, one fire, a slate on the wall with names and marks. |
| **the sharpening shop** | Ines Tregear's. A treadle wheel, a water trough, and a rack of every miner's steel with their mark on it. |
| **the infirmary** | one room, two cots, a cupboard. Absalom Rundle's. |
| **the Ferrow Institute** | a hall, a stove, forty books, a minute book and a subscription ledger. The only room in Rejection with chairs facing the same way. |
| *(the Row)* | the linking street. Prose, not a venue. |

⭐ **The Institute is the load-bearing new room.** A miners' institute is
a real institution — funded by a *check-off* on wages, holding a library,
a reading room, a mutual-aid fund and the meeting hall. It is
simultaneously the town's school, its insurance, and **the room in which
Rejection would charter itself.** One room, four future builds.

---

## 4. Culture

**The candle.** The organising object. A miner buys his own light, burns
it by the hour, and knows to the stub how much working time he has left.
Everything about Rejection's relationship to cost and time runs through
this. "A two-candle job." "He's short of candle" (out of money, or out of
time, or dying — the ambiguity is the point).

**The Hush.** The natural chamber below is not spoken of casually.
Nobody claims it is haunted; everybody declines to eat down there. The
town's superstition is **procedural, not theological** — a set of things
you do not do, held by people who will tell you flatly they don't believe
in anything.

**Safety as the one earnest subject.** The onsetter already says it out
loud in shipped content and it is the town's creed:

> *Ground will stop you working and will not kill you. Air will kill you
> and will warn you.*

Every character in Rejection can recite it. It is what they say instead of
goodbye when somebody goes down.

**Species.** Mixed and unremarked. Author the roster mixed and let no
character comment on it — the absence of comment is the characterisation.

**Money.** Wages weekly, in coin, at the adit. The store carries people
between paydays and the Institute's fund carries them past an injury.
⭐ **Debt is the town's real social structure** — who owes the store, who
owes the Rest, whose subscription to the Institute has lapsed. It is all
written down in three different books kept by three different people, and
nobody has ever compared them.

**The year.** No seasons that matter underground, which is itself the
point: the surface has weather and the work does not care. Two dates:
**pay Friday** (weekly), and **setting day** (the tribute pitches — the
metal-chain slate's deferred auction, when it comes).

---

## 5. The cast

Seven ship. Five are added here. Routines are given as **shift cores**,
which replace the placeholder 24/7 rosters:

- **day core** 06–14 · **afternoon core** 14–22 · **night core** 22–06

### Shipped (amend routines only)

| who | role | core | off-core home |
|---|---|---|---|
| the onsetter | co-op, adit mouth | day | the Rest |
| the hewer | co-op, at the face | day + afternoon (the producer beat) | the Rest |
| the collier | fuel yard, the clamp | ⚠ **none** — a clamp cannot be left | a hut at the yard |
| the smelterman | smelter | day | above the smelter |
| the buyer | assay shed | day | the Rest |
| the storekeeper | provisioning | 06–20 | behind the shop |
| the registrar | claims office | 08–16 | the Rest |

⭐ **The collier is the exception that proves the shift model.** A
charcoal clamp burns for days and dies if unattended; she cannot have a
schedule, which is why she "has not had a full night's sleep in a decade."
Her `Offstage` is a hut ten feet from the clamp. Do not give her a core.

### New

**Morwenna Bawden — the Rest.**
Keeps the lodging house. Widow of a hewer the Ferrow took eight years ago;
took the compensation, bought the building, and has never once said
whether that was a good trade. Rents by the week, bed not room. Will not
take a man who has been drinking, and will carry a man who cannot pay,
and the two rules together are the whole of her.
*Dispositions:* `fairness +70`, `compassion +45`, `constancy +65`,
`sociability −30`.
*Routine:* awake 05:00–22:00, always in. Serves at 05:30 and 18:00.
*Affords:* a bed by the week; the **rent book** (a readable object listing
who is behind); the first "somewhere to sleep that is not the dorm."

**Jory Hocking — the Tallow.**
Publican. Fourteen years a hewer, then his lung went, and he bought the
licence with what the Institute's fund paid out. Coughs between sentences
and does not apologise for it. He is the only person in town who will say
plainly what the dust does, because he is the demonstration.
*Dispositions:* `honesty +80`, `sociability +60`, `worldview −55`
(cynical), `temperance −40`.
*Routine:* opens 16:00, closes 02:00. Busiest at the core changes.
*Affords:* the wage sink; the **slate** (a public tab — social credit made
literal); ⭐ **the room where the town argues**, which is the seat of any
future chartering.

**Ines Tregear — the sharpening shop.**
Mine blacksmith. Paid by the pick, out of wages, at a rate the co-op has
not raised in six years. Knows every miner in town by their steel and none
by their face. Keeps the rack in an order only she understands.
*Dispositions:* `diligence +75`, `patience +55`, `humility +40`,
`sociability −60`.
*Routine:* 05:00–13:00 (steel goes in at the end of a core, comes back
before the next). Dark by afternoon.
*Affords:* the durability sink; a **tool-condition read** ("she can tell
you what you've been cutting"); the first honest maintenance price.

**Absalom Rundle — the infirmary.**
Surgeon-apothecary. Competent at crush, burns, breaks and the things a
rope does to a hand; entirely defeated by the dust, which he diagnosed
correctly eleven years ago and can do nothing about. ⭐ Write him as
**good at his job and losing anyway** — never as a quack, never as a
saint. He keeps a case book of every man's lungs and shows it to anyone
who asks, which the town finds either admirable or unforgivable.
*Dispositions:* `honesty +85`, `compassion +60`, `worldview −40`,
`humility +30`.
*Routine:* 07:00–19:00, and awake for anything the whistle means.
*Affords:* the medic vertical's natural home; the **case book** (an
occupational-disease record that is *evidence* if the town ever litigates
the air); triage that is real because the injuries are predictable.

**Enid Nancarrow — the Ferrow Institute.**
Secretary. Not elected — the last secretary left and she was the one who
knew where the minute book was. Keeps the subscription ledger, the forty
books, the stove, and the minutes of a body that meets when there is a
reason and otherwise does not.
⭐⭐ **She is the person who would write Rejection's charter**, and she
knows it, and she is waiting for somebody to ask.
*Dispositions:* `diligence +70`, `fairness +75`, `worldview +50`
(idealistic — the only one in town), `boldness −35`.
*Routine:* opens the hall 18:00–22:00 on core days; all day Sunday.
*Affords:* the mutual-aid fund; the library (the education seam); the
**minute book**; the chartering path.

---

## 6. The economy

**In:** tools · timber · food · candles · coin (wages) · **people**.
**Out:** ingots. Only ingots.
**Made here, consumed here:** charcoal.
**Scarce:** flat ground · timber (⚠ the wood contest, below) · air ·
sleep.

⚠ **The wood contest is the town's live economic conflict and it is
unwired.** The fuel yard's coppice is *also* the mine's timber supply —
two consumers, one seven-year rotation, and no rule. The co-op needs
props to hold ground; the collier needs cordwood to burn. Whoever builds
Rejection's second half should wire this, because it is the town's
argument and the Tallow and the Institute are where it gets had.

**Terminus relation.** Rejection sends metal and takes everything else.
Its businesses already bank at goodkin, in the city — so the town's money
lives somewhere it does not govern. Nobody in Rejection has noticed this
yet.

---

## 7. Institutions and the open seats

| institution | what it is | the seat a player could hold |
|---|---|---|
| the Ferrow co-op | tutwork employer; keeps the ground and the ore | **onsetter** (shipped position) |
| the claims register | first-come, enforced by `stake` | **registrar** |
| the Institute | mutual aid, library, meeting hall | **secretary** — ⭐ the civic on-ramp |
| the Rest | lodging | **keeper** (on Morwenna's retirement or sale) |
| the Tallow | licence | **publican** |
| *(none)* | ⚠ **there is no government** | — the whole point |

⭐ Rejection declares **no `_governmentKey`**, deliberately. The route to
one runs: the wood contest produces a dispute → the Tallow is where it is
argued → the Institute is where it is minuted → and somebody has to write
something down. **Do not ship a government here.** Ship the argument.

---

## 8. Hooks — what a future build can rely on

| if you are building… | Rejection already has / will have |
|---|---|
| **the medic vertical** | the infirmary, Rundle, the case book, and *predictable occupational injury* — the only place where harm is not a fight |
| **tenancy** | the Rest — bed-by-the-week, no instrument (the rung below Mayfield's lease) |
| **mutual aid / insurance** | the Institute's fund, funded by a wage check-off |
| **chartering / legal-code** | the Tallow (argument) + the Institute (minutes) + a real dispute (timber) + no incumbent government |
| **tool durability / repair pricing** | Ines, paid by the pick, at a rate frozen six years |
| **debt & credit** | three books nobody has compared: the store's, the Rest's rent book, the Institute's subscription ledger |
| **shift/labor mechanics** | three cores, one exception (the collier) that proves the model |
| **occupational disease** | the dust, Rundle's case book, Jory's lung — a slow condition with a documented cause |
| **freight** | the weighbridge depot at the adit; ingots out, everything in |
| **education** | forty books and a stove — the realm's only library outside the city |

---

## 9. Open forks

- **Does the co-op become the government?** The company-town question.
  Left open deliberately; it is the most interesting thing about the town.
- **Whose timber?** The wood contest wants a rule, or deliberately no rule.
- **What the Institute's fund actually pays** — injury only, or death
  benefit, or both, and who decides.
- **Children.** There are almost none. Is there a schoolroom, or do
  families simply not stay? Currently: they do not stay, and that is
  sadder and cheaper.
- **The Hush cast.** Deferred by metal-chain; the town's superstition is
  authored here without committing to what is actually down there.
