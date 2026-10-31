# Law-and-order slate — what policing does here, and what this medium changes

> **Status: UNBUILT** — designed at high level 2026-10-28 with the owner, the law-enforcement half of
> [emergency-services-slate](./emergency-services-slate.md). What ships: brains as path-resolved
> modules over data specs, the deliberation beat and its four urgency bands, cadence and witness
> triggers ([behavior.md](../../subsystems/behavior.md)); the `enforces` bouncer, which judges by
> belief and never the ledger; exclusion as a declaration over an extent
> ([settlement-model.md](../../settlement-model.md) § 9); credentials
> ([credential.md](../../subsystems/credential.md)); several characters per account (character
> select). Designed elsewhere: the institution ([policing](./policing-slate.md)), law as prose plus
> clauses ([legal-code](./legal-code-slate.md)), confinement ([prison](./prison-slate.md)), the
> push column ([call](./call-slate.md)), sideless interposition ([intervention](./intervention-slate.md)).
> **Left:** the feeling per settlement type · prevention as cadence, response as witness · the eleven
> scenarios · the four-part module (situation, playbook, policy, duty) · the witness vocabulary it
> needs · the received book and the standing orders · citing the law at the act · the medium test ·
> banishment as dials, sentences on the character · the sentence menu · penal geography (relegation,
> deportation, the ticket of leave, the inmate polity) · the kit of standing · the custody that
> survives logout · the griefing table
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"What do these NPC brains actually do? What are the different scenarios we support responding to?
At some point all this needs to be abstracted away to modules that can be shared and composed like
anything else. … Most of our NPC brains to this point have just been 'do this to make this test
work', but now we're talking about game policy — we can't just leave it to whatever's most
expedient. When people are in Terminus versus the outlying areas, what do we want them to be
feeling? … What about prevention versus response? What laws do we actually need to be on the books
and legible to the player — so as to say 'it has been decided thusly', in prose, not code?"*

*"Let's examine the actual things that set our platform apart and how that affects law and order
design in ways maybe our seven lenses might not pick up. Again, this game is built for **digital**
communities. … So we can optimize for that medium."*

## 1. What people should feel **[LEAN]**

Settlement-model § 9 already gives the axis — not *am I safe?* but ***if something goes wrong here,
is there anyone to appeal to?*** — and locks that inside settlements the danger is economic and
social.

| | feels | taken for granted | on guard against | you appeal to |
|---|---|---|---|---|
| **city** (Terminus) | watched over, and watched | a shout brings someone in minutes; fights get broken up; stolen goods are traceable | pickpockets, fraud, the corpo squeeze, the gang's credit, ⭐ being stopped yourself | the watch, the courts |
| **suburb** (Hinkley) | safe, and exposed | nobody will hurt you | the neighbors' opinion | nobody |
| **village** (the valley) | known | neighbors help; the bell gets rung | reputation; the co-op shutting you out | custom, the co-op |
| **camp** (Rejection) | dangerous ground, honest people | everyone comes to the cry | the ground; the camp turning on you | the hue and cry |
| **the wilds** | alone | nothing | everything | your party |

⭐ **Being policed is felt from both sides.** A city that only feels safe hides half of what it is.

## 2. Prevention and response are two brain shapes **[LEAN]**

Peel: *"the test of police efficiency is the absence of crime, not the visible evidence of police
action."*

- **Prevention** — presence (crime displaces to the next alley), light, locks, posted law, knowing
  people. A **cadence** brain, presence-gated.
- **Response** — the summons, the arrival, the stop. A **witness** trigger — behavior.md: *"an event
  should push; a brain should not poll."*
- **The split is a budget dial** — patrol density against stations and call boxes.
- ⚠ **NPC response is never instant.** Response time is geography; an instant watch leaves the
  bystander, the citizen's arrest and the player constable nothing to do.

## 3. ⭐⭐ The scenarios — a closed list **[LEAN]**

Each is noticed by **perception, never the ledger** (the evidence firewall; `enforces` already works
this way).

| # | situation | noticed by | the playbook | dials |
|---|---|---|---|---|
| 1 | the beat | cadence | walk the route; greet the regulars; notice who is out of place | `stopThreshold` |
| 2 | a fight | combat started in view | shout; interpose without taking a side; restrain; separate; who started it, by belief | `escalationCeiling` |
| 3 | a call for help | heard | go — how many, from how far, is the call slate's push column | `pursuit` |
| 4 | a crime in progress | seen | stop; restrain; recover the goods; arrest | `stopThreshold`, `escalationCeiling`, `searchAuthority` |
| 5 | a report | spoken to | record it as a **claim**; act only if their own belief crosses the threshold | `reporting`, `stopThreshold` |
| 6 | a dispute | spoken to or seen | separate; record both claims; refer to a court or an arbiter — ⚠ never settle by talk | — |
| 7 | found property | handed in or found | hold in custody; return by chain of title | — |
| 8 | someone hurt or dead | seen | render aid; call the medic; secure the scene; hold the body for the coroner | `dutyToAid` |
| 9 | arms where banned | a visible weapon | warn, order out, eject | `escalationCeiling` |
| 10 | someone wanted | recognized | arrest on the warrant | `stopThreshold` |
| 11 | custody | after an arrest | escort to the lockup; hand to the court; hand to an NPC on logoff | — |

- **Row 6 is the *parley* lesson** — the engine cannot measure language, so a dispute's tools are
  separating, recording and referring.
- **The market inspector** (weights and measures) adds rows later. **Traffic** waits on carts.

## 4. ⭐⭐⭐ A module is four things composed **[LEAN]**

| part | is | lives in | shared by |
|---|---|---|---|
| **situation** | a recognizer — a fight in view, a cry heard, a visible weapon, someone believed wanted | a witness trigger with an urgency | every brain that cares |
| **playbook** | ordered steps, each **a verb anyone can use** — shout, interpose, restrain, arrest, search, escort, whistle, aid | the brain | constable, bouncer, villager |
| **policy** | how far up the ladder the playbook may go | the place's charter, read at the act | everyone acting there |
| **duty** | which situations this person must answer, and the authority to | **the seat**, as data | NPC and player alike |

- **A constable** is a seat with rows 1–11 under the city's policy. **A bouncer** is rows 2 and 9
  under the house's own policy — `enforces` rebuilt from shared parts. **A hue-and-cry villager**
  has row 3 as everyone's duty under the law, with no seat. **A night watchman** is rows 1, 3 and 7.
- **It fits the shipped arbiter** — the beat is `wanted`, a cry `pressing`, a fight with a weapon
  out `critical`. The gap is the witness vocabulary behavior.md already asks for: `combat-started`,
  `cry-heard`, `weapon-seen`.
- **The player variant is the same seat** — situations arrive as notices instead of candidates on a
  beat; the playbook is the same verbs; judgment is measured against the same dials
  ([emergency-services-slate](./emergency-services-slate.md) § 9).

## 5. The book — decided thusly, in prose **[LEAN]**

The legal-code test: *ship what the world cannot function without; never ship what the polity would
enjoy arguing about.* Received law, *"in force since before the Compact"*:

1. **The Watch Act** — the watch may stop, restrain, arrest and hold for the court.
2. **A thin criminal code**, filtered by *does the system already prevent it?* — harm to the
   unwilling · taking without title · obtaining by deception · destroying another's property ·
   withholding wages · a false report · ⭐ **impersonating an officer** (the uniform is a claim, § 9).
3. **Resisting or obstructing the watch.**
4. **The custody limit** — a person held is brought before a court within a stated time.
5. **The duty to raise the cry** — an inherited convention, no penalty; it makes the hue and cry
   lawful.

**Not shipped:** gun law, vice, punishment severity, stop-and-frisk, speech.

⚠ **The standing orders** — NPCs must read *some* policy on day one, and any values are a position.
Ship them as **the founding commissioner's standing orders**: a seat's instructions, not law,
changeable by whoever holds it; Peelian by default (minimum force, a high stop threshold).

⭐ **Every enforcement act cites what it acts under** — *"Under the Watch Act, you're under arrest
for taking what isn't yours."* The enforcement slate's *a prevented act must always say why*,
generalized. The prose is what is quoted; the clause is what the brain read.

## 6. ⭐⭐⭐ The medium test — is this true here? **[LEAN as a formal check]**

The lenses never ask whether a real-world premise holds in this medium.

| | real life | here | so |
|---|---|---|---|
| death | final | `passage` — cheap | lethal force deters nothing |
| time | always present | players come and go | a sentence served offline costs nothing; served online it costs the play the platform exists to give |
| identity | one body | several characters per account | answered in § 7 |
| records | partial | complete | the evidence firewall is a *choice* |
| walls | expensive | free | the temptation is to wall everything |
| exit | hard | the next parcel is a walk; leaving the realm is a right | a sanction weighs what the place gives you |
| the scarce thing | safety, freedom | **attention** — time and community | remedies cost access and standing, never hours of play |

## 7. ⭐⭐⭐ Remedies **[DECIDED — the owner, except where marked]**

*"We don't really like putting people in prison, because it prevents them from engaging with the
fruits of our labor. The only exception to that is the person who builds the prison itself. … Maybe
the better tool to examine is banishment, temporarily or extended. Terminus doesn't jail you, it
simply banishes you from its extent, and you have to deal with being cut off from its part of the
economy. Jail may or may not be the preferable option depending on the terms and the criminal's
individual economic situation."*

### Sentences bind the character

*"We only do things to characters. If we do something at the account level it needs to be extreme,
like disenfranchisement. Yes, creating new characters is cheap, but we're not selling the ability to
create new characters — we're selling the ability to play **your** character, the one that has a
personality and experiences that reflect a history of decisions made while playing it. If that's
the thing in jail, I think we're good."*

An alt is no escape: it arrives without the chronicle, the transcript, the traits, renown, or what
others believe of you. And a sentence follows the **identity**, not the body — every ledger keys on
it — so dying does not escape one.

### Banishment — every form is a dial

*"I'd want all forms of banishment on the table. These are dials to be tuned."*

| dial | settings |
|---|---|
| what is refused | service · shelter · trade · work · ⭐ entry · a mix |
| where | a venue · a district · the extent — one declaration at three scales |
| how long | days · seasons · until a condition · indefinite, with review |
| conditions | restitution · a surety · petition |
| transportation | banished *to* somewhere |

- ⚠ **This reopens settlement-model § 9's *"exclusion may never touch movement."*** Presence
  banishment is now a setting; stranding someone when the banishing place is a crossroads is a
  consequence a polity tunes for, and a rights question for the Compact court — not a prohibition.
- **Its weight is the extent's share of the economy** — banishment from the clearing house is heavy,
  from a hamlet nearly nothing. **It runs in calendar time**, costing the same whatever you play.
- **Every exclusion creates a customer for the gang** (settlement-model § 9) — heavy use grows the
  Gray, and that is honest dynamics.

### The sentence menu **[LEAN]**

The law sets an exchange rate; the convict chooses — *thirty days' banishment, or six hours in the
gaol, or a fine* (history: *"forty shillings or a month"*). Gaol hours count **only while online**:
you choose to spend play, and nobody spends it for you.

### ⭐⭐ Penal geography **[DECIDED — the owner: dials]**

*"The difference between a prison colony like Australia and imposed exile like Elba is mostly
semantic? … There's also the whole possibility of some kind of 'Escape from New York' situation."*

The mechanism is shared — sent to a place you may not leave, the prison slate's *"a locality you
cannot leave."* History's differences are other dials:

| dial | Elba (1814) | Australia (1788–1868) |
|---|---|---|
| **what you keep** — Rome's *relegatio* (sent away, keeping citizenship and property) against *deportatio* (stripped, confined) | title, household, guard, sovereignty over the island | liberty and, in practice, property lost |
| **what is demanded** | nothing | assigned labor |
| **the way back** | none — he left after ten months | the ticket of leave, then a pardon; return early was capital |
| **the place** | a small polity he ruled | a colony of convicts, emancipists and free settlers |
| ⭐ **interior jurisdiction** — warden or inmates | — | — |

- ⚠ **Labor is bounded.** The [unfree-labour slate](./unfree-labour-slate.md)'s proposed Tier A — *a
  real person is never registered, bound to forgo exit, or held in a coercive seat* — makes a
  player's colony confinement without assignment: they work to live, nobody compels them.
- ⭐⭐ **The inmate polity — Escape from New York.** Turn interior jurisdiction to *inmates*: one rule
  at the boundary, no guards inside, whatever order the prisoners build (Skarbek: prison gangs are
  governance). It answers the objection to prison — a walled extent with its own polity and economy
  *is* play — and escape is content. The builder benefits, as the owner said: a committee that
  builds a good walled city has built a destination other people's sentences fill.

## 8. Escapes, and griefing **[LEAN]**

**Fine to escape — the fiction:** outrunning, hiding, disguise, crossing out of the jurisdiction
(`pursuit`), not being noticed; the innocent stopped by honest error.

**Not fine — the medium against the fiction:** logging off to escape arrest; dying to escape a
sentence (it follows the identity).

⭐⭐ **The symmetric trap.** Whatever keeps an arrested body from escaping by logout lets a kidnapper
hold one the same way — `restrain` is a verb anyone can use. So **only a seat's custody survives
logout**, and only to the lockup within the custody limit; **private restraint lapses when the
restrained logs off.** Standing is computable, so the engine can tell them apart.

| vector | the answer |
|---|---|
| dragging the guards onto someone | NPCs arrest whom they *believe* — framing works on them on purpose; it is a crime with its own record, and false reports are perjury |
| weaponized reporting against a real person | meta moderation, never adjudicated in the fiction |
| ⭐ a captured committee banishing its competitors | economic exclusion of a rival is a rights question — the Compact court; the most dangerous vector here |
| player officers harassing | witness mode — every stop checked against the dials; the seat removable |
| restraint as kidnapping | private restraint lapses on logout |
| jail as griefing | the sentence menu |
| planting stolen goods | the chain of title shows who held what, and when |

## 9. The kit of standing **[LEAN]**

When death is cheap, weapons confer little power; what police carry is **standing made visible**,
and **summoning**.

| item | does | the general version |
|---|---|---|
| ⭐ the warrant card | *proves* authority — a credential, unforgeable | none |
| the staff of office, the truncheon | the office's mark (Victorian truncheons bore the royal arms; the medieval staff *was* the warrant) | a club |
| the uniform | *claims* authority — perceptual, fakeable, hence impersonation is an offense | clothing |
| rattle → whistle → call-box key | the summons by epoch | a whistle; not the box key |
| the pocketbook | reports recorded as claims | a notebook |
| restraints | custody — *lawful* restraint is the seat's | rope |
| the armory sidearm | licensed, on duty, returned at shift's end | the weapon, not the license |

By agent: the constable — truncheon, restraints, whistle, lantern · the armed response — the armory's
sidearm · the bouncer — the office taser · the villager — whatever is at hand · the thief-taker —
their own arms and no standing · the gang's collector — a cudgel and a reputation.

## 10. The lens pass

1. **Pedagogy** — rules against standards in the book; prevention against response; relegation
   against deportation; why police followed density.
2. **Expression** — every module composes; every remedy is a dial; a walled city is an authorable
   destination.
3. **Immersion** — every act cites its law; authority is an object you can see. **Participation** —
   the inmate polity; the player constable; the bystander.
4. **Values** — sentences never spend play without consent; nobody compelled to labor; being
   policed felt from both sides.
5. **Continuity** — the summons and the kit by epoch.
6. **Economy** — banishment weighs the extent's economy; exclusion feeds the gray economy; the kit is
   a budget line.
7. **Governance** — banishing a competitor is the vector to watch; standing orders are a seat's,
   law is the polity's.

## 11. Open

1. **The feelings table** — is *watched over, and watched* the city's target?
2. **The standing orders** — Peelian by default, as a seat's instructions.
3. **The sentence menu** — the law's exchange rate, the convict's choice.
4. **The medium test** as a formal check beside the lenses.
5. **The witness vocabulary** — which recognizers ship first.
6. **Presence banishment from a crossroads** — where the rights floor caps it.
