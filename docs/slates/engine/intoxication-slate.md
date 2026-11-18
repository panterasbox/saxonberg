# Intoxication slate — what alcohol does, one system at a time

> **Status: UNBUILT** — talked through with the owner 2026-11-17/18, out of the Dave's Bar
> conversations ([bar-audition-slate § 20](../world/bar-audition-slate.md)). The owner wants this as
> **a general feature, not a bar feature**: alcohol now, other substances and their interactions
> later. What ships underneath it ([metabolism.md § Alcohol / BAC exemplar](../../subsystems/metabolism.md)):
> - blood alcohol by the Widmark formula, cleared at a steady rate;
> - one banded `intoxicated` condition (sober → tipsy → drunk → very drunk → incapacitated →
>   life-threatening), with signs: flushed, unsteady, slurring;
> - involuntary vomiting at the top band; `vomit`; an antidote;
> - an `alcohol-tolerance` stock that drinking builds and time fades, **which nothing reads yet**.
>
> **Left:** the effects map (§ 1) · tolerance's two halves (§ 2) · blackouts (§ 3) · the hangover
> (§ 4) · dependence (§ 5) · responsible service (§ 6) · driving and the moments of judgement (§ 7)
> **Size:** a build. It absorbs the metabolism slate's *alcohol-tolerance as a consumer* and
> *hangover* items ([metabolism-slate](./metabolism-slate.md)).

## 0. The ask **[DECIDED — the owner]**

*"Alcohol's main thing is that it affects judgement, but we have no 'use judgement' command.
Judgement is implied across many, many different activities. So it's those activities that need to
check intoxication and respond to it. The obvious one here is operating a motor vehicle."*

The owner's barfly years are the source for much of how it should feel
([bar-audition § 20](../world/bar-audition-slate.md)): most regulars at his neighborhood bar were
alcoholics, and the design should be able to tell that truthfully.

## 1. ⭐⭐⭐ The effects map — each effect lands on one system **[DECIDED in shape — the owner]**

⛔ **Not a blanket penalty.** A first proposal dropped every competence band a notch while drunk. The
owner: *"Being drunk doesn't make me worse at everything; it's a very specific kind of impairment.
You're treating it like being disabled."* So intoxication works the way the bestiary's template does:
**every effect lands on one system we already have**, through its real mechanism, at its real dose.

| effect | the real mechanism | lands on |
|---|---|---|
| **narrowed attention** | *alcohol myopia* (a real psychology theory): attention collapses onto what is most obvious and immediate; peripheral cues and consequences drop out | **noticing**: concealment and awareness. A drunk at the bar misses the hand in their pocket |
| **slower reactions** | slowed processing | anything you must react to *in time*: combat beats, a hazard on the road, something thrown |
| **balance** | inner ear and coordination (*unsteady* is already a sign) | **movement**: stairs, climbing, rough ground, a fall |
| **fine motor control** | coordination | precise hand work: pouring by eye (⭐ a **jigger** is the real fix), picking a lock, stitching, surgery |
| **speech** | slurring (already a sign) | what you **say** can come out slurred |
| **feeling warm while losing heat** | blood vessels at the skin dilate | **⭐ the thermal model**: you feel warm while losing heat faster. The drunk walking home in winter is a real danger, and derivable |
| **pain dulled** | a real analgesic effect | **harm**: you notice wounds less and keep going, which cuts both ways |
| **dehydration** | it suppresses the hormone that holds water | hydration (already modeled) |
| **memory** | blocks memories from forming | blackouts (§ 3) |
| **worse sleep** | sedating, but poor-quality rest | recovery, which already reads rest quality |
| **disinhibition and confidence** | loosened inhibition | **nothing in the engine.** It is the player's own choices. The game only stops warning them: their read of their own body says *"you feel fine"* |

**It helps some things, which a blanket penalty would erase:** courage (*Dutch courage*: anxiety
goes down), social ease, pain tolerance, and some studies find a small dose loosens associative,
creative thinking. The anxious dart player whose throw improves after one beer is real.

**Two rules hold throughout:**
- **Never dice.** The uncertainty doctrine bans rolling for what your action *did*
  ([uncertainty.md](../../uncertainty.md)). A drunk does not fail at random; they act on worse
  information, with worse hands, and with more confidence.
- **Never a gate.** You can always try (the owner's soft-limits rule). There are only consequences.

## 2. ⭐⭐ Tolerance — two halves, and the danger between them **[DECIDED — lens 1]**

- **Functional tolerance:** at the same blood alcohol, a seasoned drinker shows fewer signs and
  functions better.
- **Metabolic tolerance:** the liver adapts, and they clear alcohol faster.
- **⭐ Tolerance is specific too.** The seasoned drinker loses the *motor* signs (balance,
  steadiness) while the attention and judgement effects persist. That is why they believe they are
  fine, and why a bartender reading signs misjudges exactly the people most at risk.
- The stock ships; this build is its first consumer.

## 3. ⭐⭐ Blackouts — memory, not perception **[DECIDED — lens 1]**

Real alcohol stops the brain *recording* memories rather than erasing them. The record layer keeps
what each character perceived (`recall`); at high blood alcohol, recording thins and then stops.
*"What did I say last night?"* becomes a real question whose answer only the people who were there
have.
- ⚠ **The character forgets, not the player**, who still read the scrollback. A player can lean into
  it or not. Degrading what a drunk *perceives* at the time would go further; this stops at memory.

## 4. The hangover — only as far as the science goes **[DECIDED — lens 1]**

The causes of a hangover are still debated. Dehydration is a real part of it and is already modeled.
Modeling the rest would be the *clamp so the numbers come out right* failure design-lenses names, so
the hangover is what the established mechanisms produce, and no more.

## 5. ⭐⭐⭐ Dependence — in, truthfully, without the hook **[DECIDED — the owner: "dependence is in"]**

The honest model includes dependence and withdrawal: a body that needs the drink, shakes without
it, and is endangered by stopping cold. It is real, derivable, and the one source of *need*-driven
demand for a bar.

- **⭐ A character's body never pulls the player back into the game (proposed invariant).** Dependence
  and withdrawal progress **only while the character is present**, never against an absent body.
  That is the absent-body doctrine stated for compulsion, and it reaches past alcohol to anything a
  body can need. Model the truth, never the hook.
- **It is a state you see and choose about**, never a meter driving you somewhere.
- **Severity comes from physiology, never from demand.** Dependence is a demand lever; an author
  tuning withdrawal to fill a bar's till is the conflict of interest the guild slate rules against
  ([guild-slate § Authors' conflict of interest](../society/guild-slate.md)).
- **The bartender who knows a regular well is part of how it is lived with**, and sometimes the one
  who notices it has gotten bad.
- **No gauge either way:** no drinks counter, no achievement for drinking, and no engine-awarded
  sobriety badge. A sobriety chip is real, but it is given by people, so it is player content.
- Treatment of withdrawal is a clinic's (the medicine trade).

## 6. ⭐⭐ Responsible service **[DECIDED]**

This makes the bar's responsible-service node something you can demonstrate by playing, not only by
exam ([bar-audition § 3, § 11](../world/bar-audition-slate.md)), and its Wikipedia anchors already
stand: Alcohol server training (Q4713310), Alcohol intoxication (Q205972), Blood alcohol content
(Q886470), Standard drink (Q1899871), Dram shop (Q5305682).

- **A bartender reads signs, not blood alcohol, plus what they know of the person.** A stranger is
  judged on signs alone. A regular is judged on history: *"Joe can handle eight, but when Joe goes
  quiet like that, he's done."* The bartender's memory of a regular does the work.
- **A cut-off judges a person** (lens 7): the criterion is observed signs plus knowledge of you; the
  appeal is *come back tomorrow*, or another bar; the tier is the house's policy.
- **⚠ A cut-off lifts on its own:** tonight, never forever (the lending-gate lesson). A **bar ban**
  is a different act and needs a named appeal.
- **The refusal speaks:** *"You've had enough, friend. Come back tomorrow."* An NPC bartender applies
  authored criteria; a player bartender, their own judgement.
- **⭐ Responsible service has economic teeth only if the polity gives it some.** Cutting someone off
  costs the house a sale. Without liability law, the house's only reasons are values and regard.
  With a dram-shop law (tier C), over-serving carries a real cost. That is why such laws exist.

## 7. ⭐⭐ Driving — and the moments of judgement it needs **[LEAN]**

**The anchor:** England's Licensing Act 1872, section 12, made it an offence to be drunk in charge
of *"a carriage, horse, cattle, or steam engine"* on a public road. That is our epoch: a team and
wagon, the coach, a barge, a mount.

- **Driving draws on three effects:** slower reactions, narrowed attention (missing someone stepping
  off the curb at the edge of your view), and confidence. It does not care about speech, pain or
  fine motor control.
- **⚠ The gap: a journey needs moments of judgement to impair.** Today a journey mostly runs itself on
  a game clock. A drunk driver drives worse only if the road gives them things to read and react to:
  something in the road ahead, a grade taken too fast, someone crossing. ⭐ University Avenue is a
  busy crossing with a crossing guard ([university-avenue-slate](../world/university-avenue-slate.md)).
- **Harm caused while drunk** is recorded with the intoxication as context; Terminus's law can make
  *drunk in charge* an offence; the bartender who over-served is in the chain.

## 8. The lens pass

1. **Pedagogy:** real pharmacology, effect by effect; tolerance's two halves and why seasoned drinkers
   are misjudged; blackouts as encoding failure; the vasodilation trap. Lens 1 chose the effects map
   over a blanket penalty, both halves of tolerance, blackouts as memory, and the hangover's limits.
2. **Expression:** the condition's bands and signs are rows; each house writes its cut-off policy; a
   realm writes its alcohol law; each drink's strength is authored. Players' own relationship with
   drinking is expression: the sober regular on soda water, the lush, the one trying to quit.
3. **3a Immersion:** signs, not meters; the felt morning after; slurred speech; "you feel fine". ⚠ A
   blackout forgets for the character, not the player. **3b Participation:** players cutting off
   friends; a polity passing liability law, rules on public drunkenness, even prohibition (with
   bootlegging and speakeasies behind it).
4. **Values:** how much to drink; whether to cut off a friend; whether to tell someone they have a
   problem. No gauge either way. The divergence question lands hard here: what does it say if someone
   drinks very differently in the game than in life? The gap is the signal, made legible, never
   closed for them.
5. **Continuity:** the same body and physiology in every epoch; laws change with the era, and
   prohibition is itself an era.
6. **Economy:** dependence is a demand lever, so its severity is physiology only; responsible service
   needs liability law to bite; clinics treat withdrawal; distilleries benefit from demand.
7. **Governance:** a cut-off (signs and knowledge; tomorrow; the house's policy) lifts on its own; a
   bar ban needs an appeal; liability and drunk-in-charge are tier C.

## 9. Open

1. **Consent while drunk.** Signing a contract, agreeing to lethal fight terms. Real law treats
   intoxicated consent specially (a contract can be voidable if the other party knew). Should consent
   given while impaired be marked on the record, for the polity's law to weigh?
2. **Which effects first.** The bar wants attention (pickpockets, overheard talk), fine motor
   (pouring), speech and memory; the road wants reactions and attention.
3. **The journey's moments of judgement** (§ 7): what they are, and whose slate builds them.
4. **Other substances and their interactions:** later, by the owner's call.
5. **The bars-and-bands specifics:** dose thresholds per effect, and how tolerance offsets each.

## Cross-references

- [metabolism.md](../../subsystems/metabolism.md) — the BAC exemplar, `vomit`, the antidote
- [exertion.md](../../subsystems/exertion.md) — the `alcohol-tolerance` stock
- [metabolism-slate](./metabolism-slate.md) — tolerance as a consumer, the hangover (absorbed here)
- [bar-audition-slate](../world/bar-audition-slate.md) — the regulars, responsible service as a node
- [university-avenue-slate](../world/university-avenue-slate.md) — the crossing
- [guild-slate](../society/guild-slate.md) — authors' conflict of interest
- [pharma-slate](../trades/pharma-slate.md) — alcohol as a solvent; the distiller as a pharma supplier
- [uncertainty.md](../../uncertainty.md) — never roll for what your action did
