# Bar audition slate — performing for Dave, the wet bar in the classroom, and what a drink teaches the record

> **Status: UNBUILT**. Talked through with the owner on 2026-11-16, after the agent cast
> ([live-instance-testing § 5c](./live-instance-testing-slate.md)) named Abel (gets hired by
> auditioning) and Iris (gets hired through the university exam) and left the audition undefined.
> This slate mostly **composes** what other slates hold; what it adds is the apparatus the
> audition and the classroom share, the recall/reference split, and one gap nobody owns.
>
> **What it composes:**
> - [recipes-slate](./recipes-slate.md): declared intent, nearest-not-exact with named faults,
>   head-or-book (O3).
> - [assessment-slate](./assessment-slate.md): the exam interface (§ 6), what a Discipline node
>   carries (§ 7), performance or assessment or both (§ 8), the refusal that names its examiner
>   (§ 9), the deferred Discipline tree pass (§ 10).
> - [real-world-anchors-slate](./real-world-anchors-slate.md): Wikidata on the row; is, models
>   or contrasts.
> - [campus-grounds-slate](./campus-grounds-slate.md): lessons at the university (its Open Q 13).
> - [lounge-slate](./lounge-slate.md): Dave's Bar; the served pie.
>
> **Left:**
> - the bar's Discipline subtree, anchored (§ 3)
> - the hiring gate on the bartender and keeper seats (§ 4)
> - the audition (§ 5)
> - recall and reference (§ 6)
> - the bartender's guide (§ 7)
> - the wet bar in the classroom (§ 8)
> - ⭐ a drink's grade and its misses reaching the record (§ 9)
> - zero-cost routes (§ 10)
> - ⭐ the trust ladder: Dave does not judge you at the door (§ 14)
> - tips to the drink's maker, and the jar split (§ 15)
> - where demand comes from (§ 16)
> - the rail's supply: the well as import, the call shelf by placement, no works board (§ 19)
>
> **Size:** a build, once its upstream slates have landed. Most of the work is theirs.

## 0. The ask **[DECIDED — the owner]**

The lounge and Dave's Bar are **the game's backstop**: a character can be kept going forever
without leaving them. The bar has free water, the lounge has free pizza, and money comes from a
shift behind the bar. That floor is **survivable but thin** (the owner, 2026-11-16). A shift needs
proven skill, and there are two ways to prove it: *"performing for Dave according to some
criteria, or you can go to the university and take an exam in bartending/mixology/whatever other
disciplines matter for Dave."*

The bar is also the owner's **microvision**: the one corner scrutinized in every detail, in the
hope that the choices made there mature the systems everywhere else. The question this slate
answers is the owner's:

> *"What of all these different Wikipedia articles do you actually exercise through the process
> of performing for Dave? … How our existing systems exercise that and how legible they are is
> probably what we're really trying to test here."*

## 1. ⭐⭐⭐ The two routes share a MECHANIC, not a label **[LEAN]**

An exam (a **claim**) and a demonstration (a **deed**) on the same Discipline are two different
instruments. Whether they agree is a measurement, never an assumption: *passed the exam, can't do
it* is the case the comparison exists to catch. So "perform for Dave **or** take the exam" is
honest only where both are written against **the same objectives** and judged in **the same
vocabulary**.

What makes that true here is that the audition and the classroom practical are **one apparatus**:

1. **The call.** Somebody names a drink. That is the recipes slate's **declared intent** (§ 1): the
   build is judged against the named recipe.
2. **The build.** The hand build: pour, stir or shake, strain, garnish. It is open to anyone and
   it is the universal learning route.
3. **The consultation.** Whether the maker reached for the guide (§ 6, § 7).
4. **The judgment.** The distance from the declared recipe as **named faults** on three axes:
   ingredients, proportions and method (recipes slate § 3). The faults are the per-objective
   **misconception vocabulary**; a written exam's distractors are drawn from the same list.
5. **The record.** The grade, the faults and the consultation, written as evidence (§ 9).

The classroom is where mistakes are cheap and the feedback is the point. Dave's bar is where the
result is a hiring decision. Same apparatus, different stakes.

## 2. What exists today (verified 2026-11-16)

**Built:**
- **The knowledge ladder** ([crafting.md § The knowledge ladder](../../subsystems/crafting.md)):
  `unknown → known-of → can-make`.
  - **Known-of** comes from reading a menu or a printed recipe, or from **being in the room
    when someone makes it**: every witness is written known-of.
  - **Can-make** is minted the first time you make the recipe by any crafting act.
  - The one-shot `mix` and `serve` are locked until you have can-make. The hand build is open.
- **Graded drinks.** Recipes match by proportion, quality is weakest-link `Grade`, and every drink
  carries a maker's mark. There are 20 cocktails at `discipline: mixology`; the four juice presses
  and coffee stay at `bartending`.
- **Hiring rules in a closed vocabulary.** A seat can require gigs, a discipline or a band
  ([employment.md](../../subsystems/employment.md)). The refusal carries `wanted` and `held`.
- **Dave's Bar as a business:**
  - The bartender seat has `headcount: 5` and **no `requires`**, so anyone who applies is hired.
  - Dave's "Looking for work?" branch makes you **keeper**, the seat that buys with the house
    account, **with no check at all**.
- **Printed books** ([paper.md](../../subsystems/paper.md)): a printed recipe teaches known-of
  when read; a handwritten page teaches nothing.

**Not built:**
- `menu` shows names and prices, never a spec.
- **There is no bartender's guide**, and no in-world place to learn what is in a Negroni.
- ⚠ **A made drink always records `outcome: success`** at the recipe's difficulty. The grade never
  reaches the transcript. An off-spec build mints a generic "mixed drink" that matches no recipe
  and **records nothing, not even a failure**. So the estimator only ever sees successes, all
  equal (§ 9).
- The university has no lessons (campus-grounds Open Q 13) and no exam interface (assessment § 6).

## 3. ⭐⭐ The bar's subtree, anchored **[LEAN]**

The second pilot of assessment § 10's deferred tree pass, after lockcraft, on lockcraft's pattern:
**every node has a Wikipedia article**, with the anchor a **Wikidata id** on the row
(real-world-anchors § 2). All articles and ids were checked against live Wikipedia on 2026-11-16.

| node | article (Wikidata) | relation | play shows it (deed) | an exam tests it (claim) |
|---|---|---|---|---|
| bartending (root) | Bartender (Q808266), Mixology (Q15070553) | is | ✅ | ✅ |
| technique: measure, shake, stir, dilute | Cocktail shaker (Q1105339), Jigger (Q6192295), Dilution (Q3028008), Ice cube (Q488463) | models | ✅ graded by proportion and method | ✅ |
| recipes | Cocktail (Q134768), List of IBA official cocktails (Q2536409), and each cocktail's own article | models | ✅ | ✅ |
| presentation | Garnish (Q59541) | is | ✅ | ✅ |
| prep | Mise en place (Q1938786) | is | ✅ | ✅ |
| product knowledge | Liquor (Q56139), Liqueur (Q178780), Beer (Q44), Wine (Q282), Ethanol fermentation (Q851986) | models | partly (smell, taste) | ✅ |
| sanitation | Food safety (Q909821), Sanitation (Q949149) | models | ✅ `wash`; cleanliness and contamination | ✅ |
| responsible service | Alcohol server training (Q4713310), Alcohol intoxication (Q205972), Blood alcohol content (Q886470), Standard drink (Q1899871), Dram shop (Q5305682) | models | ❓ (§ 11) | ✅ |
| operations (the keeper) | Inventory (Q815410), Cost of goods sold (Q12154181) | models | ✅ `house par`/`house stock`, the P&L | ✅ |
| service | Hospitality (Q815825), Customer service (Q1060653) | is | evidence only | — |

- **The study material for the exam route is the article.** It is free, Creative Commons, and the
  place anyone can be sent before any ed-tech platform is involved. The university's course
  **points at** the articles and never copies their prose: share-alike would put our content under
  Wikipedia's license (real-world-anchors § 5).
- **The recipe rows anchor too.** 15 of our 20 cocktails are on the IBA official list:
  cosmopolitan, Cuba libre, daiquiri, dark 'n' stormy, gimlet, Manhattan, margarita, martini,
  mojito, Moscow mule, Negroni, old fashioned, paloma, screwdriver, Tom Collins. A whiskey sour
  sits on it as well, but the check was not conclusive. Each recipe anchors to its cocktail's
  article as **models**, with a note wherever our spec departs from the IBA one. Gin and tonic,
  vodka soda, the Aperol spritz and whiskey-ginger are real drinks, not IBA canon.
- **Service never gates.** The lounge slate's soft-skills rule (*evidence in, no rewards out*)
  holds. Flair bartending (Q374417) is bartending as performance, and Dave is a washed-up actor,
  so he should *react* to it. It stays patter and is never a criterion.

## 4. ⭐⭐ The hiring gate **[LEAN — REVISITED in § 14]**

> ⚠ **Revisited 2026-11-16 (the owner: *"first I wanna decide if Dave even judges you
> initially"*).** Dave does not judge you at the door. The gates below move **up the ladder**
> (§ 14): working the rail is open to anyone, and judgment arrives where trust is needed: being a
> bartender in your own right, covering alone, keeping the house's money.

- **Bartender:** `requires` a band in the nodes Dave hires on. The lean is **technique, recipes,
  presentation and sanitation**.
- **Keeper:** everything above plus **operations**. The seat that spends the house's money should
  be the most scrutinized, not the least; today it is the least. Real bars draw the same line
  between bartender and bar manager.
- **The refusal names the examiner** (assessment § 9): *"Not yet. Pour me a few when you're
  ready, or the University examines for it."* Lens 7 is satisfied: the criterion is named, and the
  university is the **appeal**, an examiner independent of Dave.
- ⚠ A band is reachable by an exam only by the evidence it carries: a claim **moves the
  estimator, it never sets a band**. Dave's threshold is set knowing how much exam evidence it
  takes to reach it, and how much deed evidence.

## 5. ⭐⭐ The audition **[LEAN — REVISITED in § 14]**

> ⚠ **Revisited 2026-11-16.** The staged audition **dissolves into working history**: every drink a
> barback makes is a maker-marked deed, so *"has this person been good behind my bar?"* is
> answered by having been behind his bar. The apparatus below stays. It is the classroom's
> practical (§ 8), and the shape any promotion reads a drink by.

Dave calls drinks. You build them behind the bar, the house stocks the well, and each drink is
judged as in § 1.

- **The call list draws on the IBA tiers** (§ 6), so an audition always tests recall *and*
  reference.
- **Every criterion can be read off the drink's own record**: the declared recipe, the
  ingredients, proportions and method, the glass and garnish, the consultation, and the **game**
  time from the call to the serve. Speed is measured in game time at a deliberately generous
  bar, so typing speed and lag never leak into the score.
- **The first rung is called drinks.** A **trial shift** (serving real patrons while Dave watches,
  which real bars also do) is the second rung. It is richer, and it also tests whether a new hire
  gets fed any orders under `call: regulars`.
- **Discoverability is the test.** Dave says what he looks for when asked. The refusal carries
  `wanted` and `held`. The faults name what was wrong. If Abel cannot find out the criteria, that
  is a finding about legibility, not about Abel.

## 6. ⭐⭐⭐ Recall and reference — consulting the guide changes the evidence **[LEAN]**

In a real bar, looking up a gin and tonic and looking up a Ramos fizz say opposite things about
you. They are **two objectives**:

- **Recall:** the canon, by heart.
- **Reference:** knowing where to look, and following a spec under pressure.

Real bars expect both, and the real world supplies the split. The IBA list is published in three
tiers: **The Unforgettables, Contemporary Classics and New Era Drinks**.

- An Unforgettable made **from the guide** is weaker evidence of recall than one made from
  memory.
- A New Era drink made from the guide is good reference practice, and no mark against you.

Consulting is an **act** (reading the guide at the bar), so it is witnessed. The deed records
whether the recipe was **in head or in book**, which is the recipes slate's O3 given its first
consumer. The audition reads: *recall on the Unforgettables, reference on the rest, faults on
everything.*

## 7. ⭐⭐ The bartender's guide **[LEAN]**

Most bars keep one behind the bar for unusual or regional requests.

- **Content today:** a **printed book** (an edition, read page by page) holding the specs. Reading
  a printed recipe already teaches known-of.
- **Mechanism, slated:** being **consultable while building** is recipes-slate O3 (*"make needs
  the recipe in reach (head or book)"*).
- **Where it lives:** behind Dave's bar, and in the classroom (§ 8). Copies are paper, so they can
  be bought, sold, torn or lost like any book.
- **What it holds:** the canon, our specs, noting where they depart from the IBA spec. It is our
  own text and never Wikipedia's prose.

## 8. ⭐⭐ The wet bar in the classroom **[LEAN]**

A small wet bar in a university classroom, using the same apparatus as § 1:

1. **Demonstration.** The instructor makes a drink; everyone in the room is written known-of.
   That works today.
2. **Practice.** A student builds by hand with the guide open, and the classroom stocks the well.
   The result is can-make plus deeds.
3. **Feedback.** Named faults from the distance (recipes slate § 3), so a miss teaches something
   instead of minting a nameless "mixed drink".
4. **Testing.** The written, timed exam (assessment § 6) for the knowledge nodes (product,
   responsible service, the sanitation rules), and a **practical at the wet bar** for the rest. The
   practical *is* Dave's audition, proctored by the instructor.

The university **only teaches**: it is never an economic venue, so the wet bar sells nothing and
makes drinks only to teach. The real bar is Dave's.

## 9. ⭐⭐⭐ A drink's grade and its misses must reach the record **[OPEN — no slate owned this]**

Today every made drink writes `outcome: success` at the recipe's difficulty, and a miss writes
nothing. That makes everything above **decorative**: Dave cannot judge understanding from a record
that holds only "made it at least once", and the estimator never sees a slip.

What the record needs:
- **the grade** as a graduated outcome;
- **the misses** (a declared drink that came out off-spec) as failures;
- **the faults** as tags (the misconception vocabulary);
- **head or book** as a tag.

It is an advancement question as much as a crafting one. Declared intent (recipes § 1) is what
makes a miss recordable at all: without a declaration, an off-spec drink failed at *nothing*.

## 10. ⭐⭐ Both routes are open to someone with no money **[LEAN]**

The backstop is survivable but thin, so the character trying to climb off the floor is broke by
definition. **Both routes to a hire must be reachable with no money**:
- the audition's well is stocked by the house;
- the classroom's well is stocked by the university, from its endowment
  ([classroom-and-credential-slate](./classroom-and-credential-slate.md) § 7);
- **enrollment may be paid in time**, through an obligation clause, rather than in money. That is
  campus-grounds Part 4's synthesis: *enrollment is a contract whose consideration may be money,
  time, or both.* The college slate's "enrollment costs money" stands for anyone who can pay; it
  is never the only consideration;
- the study material is Wikipedia.

If either route needs money, the backstop becomes a trap. A probe can assert this
(live-instance-testing § 4).

## 11. Open

1. **Responsible service.** Build the read that lets a bartender see a patron's intoxication
   (alcohol metabolism exists; seeing it from behind the bar is unconfirmed) and **refuse service**,
   or leave the node exam-only and out of Dave's criteria for now. Until it is built, *perform
   **or** exam* is not true for this node.
2. **Which nodes Dave hires on.** The lean is § 4.
3. **The call list.** How many drinks, drawn how from the tiers, and how often an audition may be
   retaken. Dave's regard remembers.
4. **The grade threshold and the fault tolerance per recipe.** These are the recipes slate's grain
   (its O2).
5. **The record's shape** (§ 9): whose build owns it, advancement or crafting.
6. **The trial shift** as the second rung: when, and how Dave watches it.

## 12. The lens pass

- **1 pedagogy** — the core of it. Every node has a real article; the audition and the classroom
  share an apparatus; recall and reference come from the IBA's own tiers; named faults teach where
  silence did not. ⭐ This lens chose § 1 over a bare band gate.
- **2 creative expression** — a realm admits performance, assessment or both (assessment § 8);
  another bar authors its own call list and thresholds as rows.
- **3a immersion** — the guide is paper behind a real bar; Dave reacts to flair; the refusal is in
  Dave's voice.
- **3b participation** — the backstop's climb is a real job with a real gate, so a newcomer's
  first standing is earned.
- **4 values** — the thresholds and the responsible-service decision have no derivable answer;
  they are the owner's.
- **5 continuity** — the guide answers the same commands in any epoch; a printed guide and a screen
  guide are the same consultation.
- **6 economy** — the house pays for the audition's ingredients, a real cost on the P&L, so a bar
  hires when it needs to. The keeper gate protects the house account.
- **7 governance** — a hire judges a PERSON. The criterion is named nodes at named bands, the
  appeal is the university, and the tier is the realm's (it authors the rows).

## 13. How it is tested

Abel (the working route: up the ladder from barback, § 14) against Iris (the exam) is this slate's acceptance at the live-instance scale
(live-instance-testing § 5c). **Content independence holds**: neither charter names Dave, the bar
or a drink. If an agent cannot find out the criteria, the spec, or why a drink failed, the finding
is about legibility.

## 14. ⭐⭐⭐ The trust ladder — Dave does not judge you at the door **[LEAN]**

The owner reopened the premise (2026-11-16): *"What a shift even is. Are you the only one making
drinks? Are you covering for someone? … Do we need different contracts for different kinds of
people? Like a journeyman bartender might be trusted to actually fill in for someone, whereas
someone else you're just there as backup or … to train. Then maybe Dave comes out later if the bar
introduces the idea of a more permanent hire."*

**What is shipped (verified 2026-11-16):**
- **A shift is voluntary.** `clock on` and `clock off` are the holder's own acts; a player holding
  a seat has no roster slot. The wage is `wageRate × hours` (4 an hour), paid at `clock off`.
  Logged-out hours are not paid.
- **You are never alone.** Four NPCs (Mara, Remy, Sloane and Augie) cover every hour of the week,
  so a player on shift always works *beside* somebody. Each order goes to one server:
  capability, then **your regular**, then the freest, then rotation.

**The ladder.** Real bars already have it. Barback (Q3214103) to bartender is the actual career
path, and it is the oldest ladder there is: apprentice, journeyman, master.

| rung | what you do | judged? | commitment | pay |
|---|---|---|---|---|
| **barback** | work beside whoever is on the rail: pour, wash, restock | **no** — anyone can clock on | none; clock on and off freely | a **small wage** (§ 17), tips you earn, a share of the jar |
| **bartender** | take orders in your own right | by your **working record** (the drinks you made, at their grades) or a presented credential | none | tips + a **cut per drink served** |
| **cover** (journeyman) | **run the rail alone** so a rostered hand can leave | by promises kept, **recency-weighted** so a broken one is recoverable | ⭐ a promise: *"I'll hold 18:00–22:00"* | a wage for the window |
| **keeper / permanent** | buy for the house; a roster slot | **this is where Dave comes out** | rostered | wage + standing |

- **The audition dissolves into the work** (§ 5). The credential route still skips rungs
  ([classroom-and-credential § 6](./classroom-and-credential-slate.md)). A good record behind
  Dave's bar still outranks a credential from a school he doesn't trust.
- **"Whose gin" stops being a problem.** A barback is on shift, so they pour house stock the way
  any on-shift hand does.
- **A full shift matters only where somebody was promised.** A barback may leave at any time; a
  cover may not, because a rostered hand went home on their word. That is the work-contract's
  **maintain** clause (keep the bar tended across a window). Its breach detection is unbuilt, and
  this would be its first real consumer (contract.md § The clause primitive).
- **Different contracts for different people falls out of the ladder:** each rung is a different
  contract shape, not a different class of person.
- **⭐ An unjudged way to earn is the backstop's floor** (proposed: invariant for the backstop).
  The barback rung is the one place the climb starts with no paperwork and no performance.

## 15. ⭐⭐ Tips — to the drink's maker, and a written jar split **[LEAN — lens 2 chose it]**

The owner: *"I suspect tipping may actually be the real economic lane here for players, as …
giving a player a tip for the drink that they made cements what may be a more longer lasting
relationship between the players. It's not just about mixing drinks."*

**Shipped:** cash tips go into a shared jar, off every ledger, and whoever is on shift `collect`s
the whole jar. `--eft` tips go to "the present on-shift server", on their ledger
([employment.md § Tips](../../subsystems/employment.md)). Neither is aimed at a person.

- **A tip goes to whoever made your drink.** Drinks carry a maker's mark, so tipping a drink
  credits its maker, not whoever happens to be on shift. Choosing whom to reward is expression;
  a tip into a pool is a deposit (lens 2). The serve has to say who made it: *"Remy slides you a
  Negroni."*
- **The jar stays as the anonymous, shared pool.** Its split is a **written house policy**, with
  Dave's default by hours on shift. ⚠ Today's `collect` is an unwritten policy (whoever types it
  first takes the jar), so a barback beside Remy gets nothing whenever Remy collects first. That
  is lens 7's own failure case.
- **A tip feeds "your regular".** When you tip someone, they think better of you, and the call
  already routes you to your regular next time: tip, remembered, served, tip again. The
  relationship is built from shipped parts, with no number shown to anyone. ⚠ Unconfirmed: whether
  a *player* bartender holds a regard toward patrons that the call can read.
- **Cash or EFT stays a choice with no right answer:** anonymous or on the record.
- **⛔ No tips leaderboard, no "tips earned" gauge** (lens 4; grain).

## 16. ⭐⭐ Where demand comes from **[LEAN]**

*"Demand may be really low in the beginning; there's not really any value to spending money on
drinks right now if water satisfies every need."* Verified: a cocktail hydrates and its sugar gives
some satiation, and the alcohol model exists, but free water and free pizza meet every need.
**There is no need-driven demand for drinks today.**

- **Early demand is social:** buying a drink to be in the room, buying one for somebody, keeping
  the person behind the bar talking. That is why tips are the lane: a tip is the one transaction
  whose value is the relationship.
- **Need-driven demand comes later**, from the owner's list: preference profiles, intoxication
  profiles, and exotic materials (*"a dram of healing tonic into certain drinks"*; a mana draught
  is already ordinary carbohydrate and water, magic-items.md). The bar's economy is not built on
  demand that is not there yet (lens 6).
- **For the craft to matter, a patron must be able to perceive it.** If a fine Negroni and a poor
  one taste the same to the person tipping, quality never reaches anyone's pocket. Taste and smell
  ship; whether they read a drink's grade is unverified.

## 17. The lens pass over §§ 14–16

1. **Pedagogy:** mixology, hospitality and business are exercised. Economically, **service
   dominates craft**, and that is honest: research on tipping finds tips only weakly tied to
   service quality and strongly tied to relationships and norms. Lens 1 chose a **per-drink
   cut**: wage, commission and tips are three real incentive schemes, and a cut makes pay
   derivable from demand.
2. **Expression:** tips to the maker (lens 2 chose it). Each house authors its own ladder and pay
   as rows; a per-drink cut is a new field on the seat (grain). The named work is a relationship:
   *Remy's regulars*.
3. **3a Immersion:** the serve names the maker. Somebody drinking the rail must be **seen** by the
   staff standing beside them. **3b Participation:** a bartenders' union (Ezra's lane), tip-out
   norms, a rival bar poaching staff. Money laundered through the cash jar is acceptable, since
   conservation holds. ⚠ **Tipping buys priority** through "your regular". Real bars work this
   way, and it is named here rather than discovered.
4. **Values:** whether and how much to tip, cash or EFT, whether to take a cover promise, how to
   split the jar. Standing is conferred by patrons, not the engine, which is consistent with the
   lounge's *evidence in, no rewards out*: that rule forbids *engine* rewards, and a tip is a
   person rewarding a person.
5. **Continuity:** apprentice, journeyman, master holds in every epoch; tips already cross from
   coin to EFT.
6. **Economy:** ⚠ **this lens reversed part of the proposal.** With no demand, a tips-only barback
   earns nothing, which breaks the owner's own promise: *"if you need some money … you can pick
   up a shift in the bar."* **The shift is the backstop's only money faucet**, so the barback rung
   keeps a small wage, and the open question is how it avoids paying idlers (§ 18.7). ⚠ The bar's
   P&L is deliberately red, so Dave subsidizes; players on wage grow the subsidy, and it needs a
   payer.
7. **Governance:**

   | decision | criterion | appeal | tier |
   |---|---|---|---|
   | clock on as barback | none (open door) | — | proposed invariant for the backstop |
   | barred from the rail | witnessed misuse (pouring for yourself, waste) | ⚠ unnamed | the house's |
   | promotion to bartender | working record: drinks at a grade | a credential; keep working | the house's |
   | trusted to cover | promises kept, recency-weighted | time | the house's |
   | keeper | Dave | the drinks; another bar | Dave's |
   | the jar split | ⚠ today: first to `collect` takes all | none | must be written: the house's |

## 18. Open, from the ladder

7. **How the barback wage avoids paying idlers:** pay only while active, a daily cap, or pay per
   task (restock, wash, pour).
8. **The jar split:** a house-authored policy; Dave's default is by hours on shift.
9. **Who pays for Dave's red P&L** once players draw wages (the university's answer was an
   endowment).
10. **The cover contract:** build breach detection for the maintain clause now, or wait for real
    demand.
11. **The appeal for being barred from the rail.**
12. **Two checks:** does taste read a drink's grade; does a player bartender hold a regard the call
    can read.

## 19. ⭐⭐⭐ The rail's supply — the well and the call shelf **[LEAN; owner direction 2026-11-16]**

The owner: *"The bar doesn't really need zorkmids. … It does need to pay players because that's
the whole point. … Only the drinks really matter for us long term, as everything else is just
staged in its final 'done and ready' state."* The shaker, the glassware and the stools are staged
one-time costs. The liquor depletes, staged or persistent, so the question is only **where the
replacement bottle comes from.**

**Shipped (verified):**
- A shelf line has exactly one source: **supplied** (bought on terms by the keeper's restock
  routine), **from a store**, or an **import**, cloned from nothing at the top-up. An
  `importBackstop` imports at a markup only when the local supplier is out (retail.md § *Buy local
  first*).
- Dave's 46 par lines are all supplied from the cash-and-carry in Terminus, which is filled by
  placeholder producers. **When placeholder content goes, the bar's supply goes with it.**

**⭐ Faucets are goods, never money (the owner).** *"If you're going to put faucets in the game I'd
prefer they be around goods and commodities, not money, which we go to extreme lengths to
conserve. Putting the good in at least gets balanced against player demand before it converts to
zorkmids."* An import's goods become money only when a patron buys a drink, so a mis-sized import
stays local to one shelf. Its size and markup are **levers**
([guild-slate § Authors' conflict of interest](./guild-slate.md)).

**The well and the call shelf.** Real bars split their liquor (Well drink, Q7283928): **well** or
**rail** drinks use the lower-cost liquors within the bartender's reach; a **call** drink names its
spirit and costs more.
- **The well is the import.** Dave's house pour, effectively a private label (Q722080) bottled
  elsewhere: a goods faucet topped to par, always there, at a fixed modest grade. The bar never
  runs dry and survives the placeholder world being deleted.
- **The call shelf is the market.** Named spirits (a player's gin, a corpo brand; Veshko and Aevex
  already have neon over the bar) are bought from whoever supplies them and **sold by name at a
  premium**. *"A Negroni with Abel's gin"* is a call drink. This is the off-label showcase: the
  owner, *"players making gin have a market to sell to, provided Dave is willing to go off-label
  (he is, by the way; in this way the bar continues to showcase systems running elsewhere)."*
- **So Dave doesn't prefer players over imports; they fill different shelves.** He wants the call
  shelf because call drinks sell for more and show off the rest of the game. Players compete with
  corpos and each other there, by grade and price. The well is not a market.

**⛔ The works board leaves the bar.** It was hung in the bar by the logistics switchover so the
keeper could get goods moved without travelling, because the lounge is off the map: a cargo
workaround, not a bar. No bar posts its inventory. (On the industrial floors it is a carriage job
board on connected ground; that is a separate call.) **The receiving bench stays**: deliveries come
through the back and land somewhere that is not the shelf, because an order aimed at a shelf that
still holds stock is refused.

**How a spirit gets on the call shelf: placement.** In the trade, a distiller or a rep walks in
with a bottle, the bar manager tastes it, and an order is placed. So:
- **A player distiller pitches whoever holds the keeper seat**: a conversation and a tasting, then
  terms (rung 0 of the credit ladder already takes goods on terms) and a par line naming that
  supplier.
- **Players learn the bar buys local by seeing it:** named bottles on the back bar are the
  advertisement, and the staff say so when asked (*"we pour local if it's good; bring a bottle"*).
- **Shortages stay private**, as in a real bar. The keeper counts against par and reorders from
  suppliers the house has terms with; deliveries arrive by the terminal route
  ([logistics-slate § Cargo through terminals](./logistics-slate.md)) and land on the bench.

**The money loop closes on its own.** Imports (goods) go into the well; drinks are sold to players
(money in); revenue pays player wages and buys call bottles from players (money out). The house is
a **pass-through**, matching *"the bar doesn't need zorkmids"*; player pay is bounded by what
players spend; NPC wages may be zero.

**⚠ The gaming vector is the classic one.** A keeper buying call bottles from their own alt at
inflated prices with house money is embezzlement (courts-slate case #1). The defense is
visibility: house purchases on the ledger, the P&L readable. Choosing whose gin is poured judges a
producer, so the curation criterion must be named (lens 7).

**Open:**
13. **How a call bottle is priced to the house:** derived from the call drink's menu price minus a
    margin, or the keeper's to set.
14. **The house's starting float**, so it can pay before revenue arrives.
15. **Can a courier sell the house a bottle unsolicited**, or only by placement?

## Cross-references

- [recipes-slate](./recipes-slate.md) — declared intent (§ 1), nearest-not-exact (§ 3), head or
  book (O3)
- [assessment-slate](./assessment-slate.md) — §§ 6–10
- [real-world-anchors-slate](./real-world-anchors-slate.md)
- [campus-grounds-slate](./campus-grounds-slate.md) — lessons (Open Q 13)
- [lounge-slate](./lounge-slate.md) — Dave's Bar, the served pie
- [live-instance-testing-slate](./live-instance-testing-slate.md) — the cast (§ 5c), probes (§ 4)
- [crafting.md](../../subsystems/crafting.md) — the knowledge ladder, the hand build
- [advancement.md](../../subsystems/advancement.md) — the Transcript, the estimator, bands
- [employment.md](../../subsystems/employment.md) — openings, `requires`, the refusal
- [paper.md](../../subsystems/paper.md) — printed books and what reading teaches
