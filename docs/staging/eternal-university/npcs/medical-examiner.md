# Character Sheet — the medical examiner, "Dr. Vance" (staging)

> **Status:** staging draft (character carve — second pass, 2026-06-27: species
> cast + allegory layer folded in). The first carve in the **character-sheet
> format** — prose study *plus* an engine-attribution block (dispositions,
> competence, behavior).
> **Kind:** a *living* authority NPC — the hostile-obstacle face of the city
> morgue. Full behavior/dialogue spec deferred (needs npc-behavior /
> npc-dialogue, same as Gus/Katie).
> **Placement:** the **city medical examiner's morgue**, across Gus's gate in
> Terminus (see [the-morgue.md](../experiences/the-morgue.md)).
> **Narrative anchor:** realizes §14's "tame examiner who rubber-stamps
> 'accident'" and §11/§15.1's banality-of-legibility-violence at human scale.
> Complicity model: **willful incuriosity.** Species cast: **Ghoul**, carrying
> the **stigmatized death-caste** allegory (see *The allegory* below; the
> governing stance is the species-as-race-allegory rule —
> [species-expansion-slate.md](../../../slates/builds/species-expansion-slate.md)).
> **Name:** "Dr. Vance" / *she* are working handles; owned by the naming pass.
> **Retire when:** cemented as a `Character` seed in YAML.

---

## Engine attributes (the buildable spine)

Authored *target* positions — the trait system seeds dispositions via
`BehavedMixin` claim-evidence, competence via the Transcript; the sheet names the
destination.

- **Species:** **Ghoul** — cast for the morgue (the persona and the setting
  rhyme) *and* for the **death-caste** allegory it carries. In this world ghouls
  are a **living people** (mundane, a kind of person — §17.D), death-*associated*
  and treated as half-dead by prejudice; the "undead/unclean" framing is the
  *slander*, not the biology (`lifecycleStates: alive/dead`; material flesh;
  biped). *Dial:* whether/how ghouls' relationship to the dead is literal
  (ritual, cuisine) and how normalized — sensitive, setting-defining (below).
- **Dispositions** (salient axes — `key` → pole · band):
  - `curiosity` → **Incurious · entrenched** — the keystone. The examiner who
    stopped looking. Doubly rooted: the species-default indifference to the dead
    *and* the curdling of a clarity she once overrode (below).
  - `worldview` → **Cynical · entrenched** — not just volume of death: a lifetime
    of handling the community's dead while treated as unclean for it. *Looking
    closely cost her everything and changed nothing* — so why look.
  - `boldness` → **Cautious · entrenched** — never sticks her neck out, defers
    "upstream"; the self-protective caution that lets the lie pass *through* her.
  - `compassion` → **Callous · defined** — case numbers, not names; **defined,
    not entrenched** — the residue of the ghoul who once chose to *see* the dead
    as people. The crack the knife exploits.
  - *Meaningful absence —* `honesty`: **unremarkable.** She is **not** Deceitful;
    she doesn't experience herself as lying. That's what makes it banal.
- **Competence:** `forensics` → **expert** (retained — competence is
  capacity-not-decay; skill doesn't erode even as the will to use it does).
- **Behavior (brains):** morgue presence, processing intake, bureaucratic
  deflection of inquiry. Bespoke responder/dialogue deferred to npc-dialogue.
- **Regard baseline:** **cool/low** for most players (Callous + Cynical +
  Cautious). The lever is **professional shame**, not regard-farming (the knife).
- **Carries / on her person:** worn — tired scrubs and a lab coat, a little
  stained, practical (she runs cool, so the morgue's chill suits her); carried —
  a **pen and a stack of case files** (the throughput) and almost nothing
  personal (the de-personed life). The **fine loupe she no longer carries**
  (turned to the wall in the exam room) is the tell — what she *stopped* carrying
  is the curdle. Implant: a basic comms (the upstream deference). Brands:
  institutional issue, unremarkable.

## The two-number portrait (why this format earns its keep)

Her whole character is the **tension between two attributes**: `forensics:
expert` × `curiosity: Incurious · entrenched`. **Competence intact, curiosity
dead.** She could read any body on the slab better than the player ever will —
she just won't pick up the lens. Knowing ≠ doing, stated precisely.

## Keystone: the examiner who stopped examining

A forensic pathologist whose vocation is to look at a body and certify *what is
true about it* — and who has quietly become the hand that certifies what's
**convenient.** Not bought, not cruel. **Ground down.** The morgue never empties
(the roll-clock keeps it full), the system wants throughput, and an "obvious"
accident gets the stamp because *who has time to look hard at every one?* The one
person whose whole job is to catch this is the person whose **not-doing-her-job
is the mechanism.**

The ghoul casting gives that a root *and* a tragedy. A ghoul's native relation to
the dead is **unsentimental clarity** — to her kind a corpse was never a person
to grieve, just the plain substance of the world. That clarity is what made her
*great*: she read bodies the way credentialed humans, squeamish or sentimental,
could not. Her excellence was a **ghoul** excellence — never a thing she
transcended her kind to reach. And her fall is that same clarity **curdling**:
under exhaustion and contempt, *unflinching* slides into *not-looking.* Same
trait, two valences. No escapee, no redemption-by-assimilation.

## The allegory: the stigmatized death-caste

Ghouls carry an **abstracted dynamic of prejudice** (per the
species-as-race-allegory stance — *not* a reskin of any real group): the people
made to do the necessary work no one else will touch — handling the dead — and
then **despised for its deathliness**, cast as unclean, half-dead themselves,
and **falsely feared as predatory** ("they feed on us"). That last charge has a
blood-libel shape and is handled accordingly: it is a **slander the fiction
refutes, never confirms.** The discipline (the essentialism trap): the prejudice
lives as a *projection viewers hold* — false-as-a-law — not a species fact; her
clarity is a real ghoul trait but its meaning stays **honestly underdetermined**
(unflinching *or* unfeeling — a decent player can read it either way).

**The payoff fuses the two engines.** The system hides its dirtiest secret — the
laundered bodies — inside a caste **no one will look at.** The contempt *is the
cover.* And it deepens her: she stopped caring partly because caring, for a
ghoul, bought only more contempt. The who-counts arc and the race allegory meet
on her slab.

## The formative case: "the one she lost"

Years ago, at her peak, a body came through that didn't add up — and Vance was
**right** about it when every credentialed human wanted it closed. She fought.
The institution closed ranks: overruled, humiliated, reminded what she was —
*know your place, ghoul* — and the death got filed the way power wanted. It cost
her (her standing, or the mentor who'd vouched for her, or simply the last of her
belief that looking *mattered*). The lesson she took: **looking closely costs you
everything and changes nothing.** That is why she signs now.

It earns its place three ways: it does the **curdle in one beat** (her finest
clarity and the thing that killed it are the *same case* — punished *for* her
excellence, not despite it); it **foreshadows the conspiracy** (that old covered
death was an early turn of the *same machinery* — she's living proof the rot is
old, spending no new reveal); and it **loads the climax** (re-lighting her
clarity asks her to relive the thing that broke her).

## How she differs from Katie (a facet, not a repeat)

The **two ends of "looking away"** — and now both are species-cast (Katie →
troll, Vance → ghoul). Katie is *intimate*: warmth that enforces quiet over one
death she grieved (noticed and *chose* not to see). Vance is *industrial*: a
vocation worn smooth across all deaths, none known by name. Warm local end, cold
systemic end. Legible in the attributes — Katie reads Compassionate/Gregarious;
Vance reads Callous/Cynical/Incurious.

## The personal knife (the lever)

Not regard, not evidence — **professional shame, the ghost of who she was.** You
don't break her by *presenting* the cooling-curve contradiction; you make it a
**mirror of the vocation she abandoned** — *"you'd have caught this in your
sleep, ten years ago."* The `compassion: defined` crack and the retained
`forensics: expert` are what let it bite: there's still a doctor in there, and
she still knows she's good. And because of the formative case, the cut goes
deeper than flattery — to make her look again is to ask her to **relive the case
that broke her.** That's why it's hard, and why it matters when she does.

## Concrete texture (clean lines)

- **She reads the file, not the flesh.** A pathologist who doesn't really *look*
  at the bodies anymore — reads the intake sheet, signs the call it implies,
  next. The examiner who stopped examining, made physical.
- **Case numbers, not names.** The de-personing is in her *language.* A player
  who insists on the dead kid's **name** is doing the whole game's thesis at her.
- **She runs cool, and the cold morgue is her comfort, not the bodies'.** A small
  ghoul-flavor irony: the one who reads cooling curves is herself the coolest
  thing in the room.
- **The unused instrument.** Something fine and personal she no longer picks up —
  a loupe, an old testimony commendation turned to the wall. The craft present as
  an absence.
- **Deference upstream, and the flicker of fear.** "Take it up with the
  registrar." "The finding stands." Polite, final — and underneath, a glance that
  says *I don't ask about those ones.*
- **A deadened calm.** She doesn't get wrathful; she gets *tired.*

## Role in the experience (#7)

She is the **wall the routes go around** — the hostile authority of
[the-morgue.md](../experiences/the-morgue.md). A player can't bull through her;
they route around (records / insider / deputization / the release window). The
**climactic beat** turns the player's own forensic demonstration into the mirror,
and the examiner who trained herself not to look finally **has to look up** — on
a body she falsely certified, in the shape of the case that once broke her. You
don't "beat" her with force or access; you make the expert do her actual job.

## Cross-references

- Experience: [the-morgue.md](../experiences/the-morgue.md),
  [first-forensic-win.md](../experiences/first-forensic-win.md).
- Bible: [§14](../../../slates/builds/eternal-university-narrative-slate.md) (the
  tame examiner, the laundering seam), §11/§15.1 (banality), §5/§7 (the
  who-counts engine the allegory serves).
- Species/allegory:
  [species-expansion-slate.md](../../../slates/builds/species-expansion-slate.md)
  (casting + the race-allegory layer).
- Carves: [property-manager.md](./property-manager.md) (Katie — troll, the warm
  end of the same axis).
- Engine: [trait.md](../../../subsystems/trait.md),
  [advancement.md](../../../subsystems/advancement.md),
  [behavior.md](../../../subsystems/behavior.md),
  [belief.md](../../../subsystems/belief.md) (regard; prejudice-as-projection).

## Open questions / dials

1. **Name & gender** — "Dr. Vance" / *she* working; naming pass owns both.
2. **Ghoul worldbuilding** — whether/how ghouls' relationship to the dead is
   literal (ritual, cuisine) and how normalized; the "they feed on us" slander's
   exact in-world shape. Sensitive, setting-defining — keep mundane and
   underplayed (§17.D); the fiction refutes the predator charge.
3. **Forensics band** — **expert** (leaned, sharpest knife) vs. **proficient**.
4. **The climax outcome** — does she **crack** (does the autopsy, turns
   evidence/witness), **deflect** (stonewalls; the player wins via other nodes),
   or get **removed** (the handler cuts her loose)? Bears on whether the morgue
   audit *closes* or *deepens* (§14's "how much the player confirms about the
   bookkeeper").
5. **The formative case's specifics** — what exactly it cost her (standing / a
   mentor / the belief), and how directly that old death ties to the present
   machinery (a faint rhyme vs. a hard thread the player can pull).
