# Injury — requirements

**Kind:** feature
**Leads from:** kernel (Stages A + B) · content (Stage C)
**Kernel-led, so the first consumer is named:** the **newbie-wilds
crossroads** and the **Sunken Delve**. The wolf, the duelist, the sentry
and three trap objects already wound people every day; every consequence
this build adds is exercised by content that shipped months ago, on the
day it lands. Nothing here waits on new content to run.

A body in this game can be hurt in five ways and can end up in six
states, and **none of those states costs you anything you would notice**.
A fracture greys one equipment slot. Everything else is a number that
decays. You cannot lose a limb, a blow to the head lands exactly like a
blow to the bicep, and the two blood-pressure readings the body tracks
are driven by nothing at all.

This build makes a wound **mean something** — and it is deliberately the
build *before* treatment, because a treatment vertical with nothing real
to treat is the `feel`/`taste` failure at the scale of an entire
profession.

Seeded by [physiology-slate](../slates/builds/physiology-slate.md)
(waves 2–4, which that slate says "block the rest"),
[materials-response-slate](../slates/tails/materials-response-slate.md)
(the reserved channels and tissue-as-an-axis), and
[ranged-slate](../slates/builds/ranged-slate.md) (W3–W4, Stage C).

---

## What already exists

⭐ **Far more than the framing above implies**, and the survey shrank
this build twice.

**A body can already be hurt, and it is not theoretical.** Five
mechanisms — a cutting edge, a concentrated point, a spread impact,
electrical current and heat — run through **one** door, so armour
mitigates a trap, a forge, a live wire and a sword by the same rules. Six
injuries can result: a laceration, a puncture, a fracture, a bruise, an
avulsion, a burn. Twenty-four authored conditions (venom, lead, carbon
monoxide, botulism, salmonella, hypothermia, asphyxiation, starvation…)
warm at boot and are live. Ten or so things in the world actually inflict
them. **Touching a lit forge burns you today.**

**A wound is already a process, not a number.** There is no hit-point
total anywhere; "how hurt am I" is derived on every read from blood
volume, seven vital signs and the active conditions. A laceration bleeds
until it is dressed, will not self-clot, and re-opens if you pull the
dressing too early.

**Combat is built.** Sessions, poise, tempo, range bands, eighteen
gambits, consent, blame, the two-stage defeat/execution split. It picks a
mechanism, a site and an energy, and hands them to the same door
everything else uses.

**The medic loop is built, and is one bandage deep.** You can assess a
body, and what you see is gated on your own medicine competence — a
novice reads "bleeding badly," a practised eye reads the site. You can
dress a wound and undress it. There is exactly **one** medical item in
the game and exactly **one** medical Discipline.

**Magic is built and shares the body's door.** Thirteen spells; only
three can hurt anything. A firebolt is heat, a spark is current — neither
has a damage path of its own.

### Therefore what is genuinely new here is

1. **Consequence.** A wound costs you a *capacity* — grip, gait, breath,
   consciousness — instead of costing you a number.
2. **Anatomy that matters.** Where you are hit, and what is under the
   skin there.
3. **Interiority.** Injuries that cannot be seen and cannot be bandaged.
4. **Two ways to be hurt that the world cannot currently express at all**
   — being frozen, and being burned by something caustic.
5. **Weapons past the medieval**, which the engine can already describe
   and no content has ever used.

⛔ **Not new, and deliberately excluded: a magic-only damage type.**
Considered and rejected during scoping — see *Surface decisions*.

---

## Goals

- A wound **costs a capacity**, and the capacity it costs is derivable
  from where it landed and what is under the skin there.
- **Anatomy is load-bearing** — a head, a spine and a liver exist, and
  being hit in one is not the same as being hit in an arm.
- **Some injuries are invisible and undressable**, so that reading a body
  becomes a skill rather than a formality.
- **Blood loss reaches its real conclusion** — falling pressure, then
  shock — instead of stopping at a falling number.
- **A limb can be lost**, permanently, and the world keeps working
  around the person it happened to.
- **Cold and caustics can hurt you**, each by its own physics, with a
  real thing in the world that does it.
- **A fight can be had with something other than a medieval weapon**, and
  armour can be acquired and worn in layers by a player who wants it.
- Every injury this build adds is **reachable by an ordinary player in a
  place that already exists**, on the day it ships.

## Non-goals

- **Treatment beyond what ships today.** The bandage stays the only
  intervention. → the **next build**, seeded by
  [physiology-slate](../slates/builds/physiology-slate.md) §7,
  [health-vertical](../slates/builds/health-vertical-slate.md),
  [medic-judgment](../slates/builds/medic-judgment-slate.md),
  [pharma](../slates/builds/pharma-slate.md).
- **Diagnosis as a graded act.** → `medic-judgment`, which owns it
  outright as of the 2026-09-15 reconciliation.
- **Transfusion, blood types, donation.** → `blood-slate`, which is now
  their sole home.
- **Prosthetics.** A lost limb stays lost here. →
  [augmentation-slate](../slates/tails/augmentation-slate.md), whose Left
  list already names the medical install procedure.
- **Wards as a mitigator for the mental axis.** →
  [capability-magic-slate](../slates/builds/capability-magic-slate.md),
  which owns the resist seam.
- **Infection of a wound.** The pathogen substrate exists but only
  butchery seeds it. → `physiology-slate` §7c, explicitly *"infection is
  the reason medicine exists"* — it belongs with treatment.
- **Pain as a derived reader.** → `physiology-slate` wave 5.
- **A gym or training venue.** Nowhere, deliberately — the crossroads and
  the bar are the venues, and a third would dilute both.
- **New aleatory randomness.** Nowhere, ever. Severity stays
  deterministic; see `uncertainty.md`.

---

## Placement

**Kernel** for the substrate, and this is structural rather than a
preference: the mechanism vocabulary and the armour-resistance forms are
closed sets **on purpose**, so that a pack cannot ship a bespoke
resistance profile and quietly rewrite combat balance. A new way to be
hurt is a change to how the world works, and it is reviewed as one.

**Content** for everything a player touches: the frost spell in the
**arcana** pack, the caustic and the new arms and armour in
**generic-objects**, placement in **newbie-wilds** and **terminus**.

⭐ **The second-instance test:** a second frost spell, a second caustic,
a second firearm, a second suit of armour must each need **zero** kernel
code — an authored row naming a material and a form. If the plan cannot
show that, the substrate is in the wrong place.

---

## Collisions

**Which existing places and objects this touches, and who already lives
there.** Every one of these is live content with a resident.

| Place / thing | Who lives there | What changes |
|---|---|---|
| **newbie-wilds crossroads** | the wolf, the sellsword, the sentry | every fight gains real consequence; the wolf's bite reaches an organ |
| **the fog hollow** | the duelist | a consented lethal duel now produces lasting injury, not just defeat |
| **the Sunken Delve** | three trap objects | a spike pit reaches the gut; a dart's venom is unchanged |
| **the longmeadow** | *nobody, and no props* | the ranged demonstrator exists purely for its 12 m extent — Stage C finally gives it something to do |
| **Dave's Bar** | Dave, the `enforces` brain | brawls gain consequence; ⚠ Dave escalates to a taser, so shock consequence lands on players |
| **the lounge** | everyone; the check-rack | ⛔ **combat-free by mechanism and must stay so** — nothing here may make the sanctuary hurtable |
| **GlassAlley** | the harm demonstrator | the flagship bare-foot-on-glass loop must still read identically |
| **Duncan Hall cistern** | drowning | asphyxiation must keep its own window |
| **the Drowned Substation** | the live wire | shock's circuit path is untouched |
| **Hearthworks** | the forge, the sealed cellar | contact burns must still fire at the same threshold |
| **the general store, Terminus** | the clasp knife — *the only weapon sold anywhere* | Stage C needs somewhere to buy arms, and this is it |

⚠⚠ **Two collisions that are really defects, found during the survey:**

- **Every torso armour piece in the game is unreachable.** The gambeson,
  the hauberk, both breastplates and the jerkin are authored, linted, and
  **placed nowhere** — no shop, no NPC, no room. Layering is wired and
  has never been exercised by a player. Deepening what armour does while
  leaving it unobtainable would be building a second dead feature on top
  of a first.
- **Sixteen species declare exactly one natural attack: a fist.** The
  wolf does not even use that path — it carries a single legacy field.
  The rotation machinery has one authored shape in the entire game.

---

## Surface decisions

### ⛔ No magic-only damage type — reversed during scoping

**The question:** most games in this genre carry damage types only magic
can inflict — force, necrotic, radiant, psychic. Should we?

**The answer: no.** A magic-only damage *type* requires a magic-only
*injury*, which requires the body to have a failure mode only magic can
produce. That is **magic physiology**, and it is a second exemption —
which `arcane-science.md` forbids as a standing rule: *"every time magic
appears to need a second exemption, that is a modelling error, not a
discovery."*

The reasoning that decided it: in a hit-point game a damage type is free,
because it is points with a label. Here every mechanism must land as a
real injury with an onset, a course, a site and something that treats it.
**The moment you ask what "necrotic" does to tissue, you are inventing
organs for it.**

⭐ **And every one of the genre's magic-only types already has a physical
register here**: *force* is kinetic, which is a spread impact; *psychic*
is the mental axis, which already exists; *radiant* is light, which burns;
*necrotic* is heat pulled *out* of a body, which is freezing — and since
the caster is always the other endpoint, the warmth lands in **them**.

**What carries the difference instead**, at no cost to the physics:

1. **Reach.** Magic delivers to sites and at ranges no weapon does.
2. **Cold.** No mundane weapon in this world delivers it at all
   (Stage B).
3. **The mental axis**, which is legitimately non-physical because mana
   is a postulated second conserved quantity with its own law — it
   predates the question and was not invented to justify a damage type.

**Alternative considered and dropped:** a `burst` channel, magic-only by
construction, on the grounds that a nonlocal transfer needs no path and
can therefore deposit energy *inside* a body where no armour intervenes.
The delivery geometry is sound. It was dropped because the treatment
surface it promised — a wound you cannot see or bandage — comes from
**organs and interiority**, which a spear through the gut needs just as
much as a spell does. Magic was never what justified it. Recorded in full
in `capability-magic-slate` if it is ever wanted back.

### Cold is a heat pump, and it costs the caster

Cooling has **no fixed efficiency** — it is a function of how far you are
moving heat, cheap near ambient and divergent as it gets colder. And the
caster absorbs both the heat removed and the work spent.

⭐ **So a frost caster cooks themselves**, exactly the way conjuring water
does, and *the mana bar is not the danger meter.*

⭐⭐ **This is a published prediction in the fiction's own science, and
nobody has tested it** — the cooling section is explicitly framed as
falsifiable *"the moment someone authors the spell."* Authoring it is an
in-world scientific event, and the first content this build ships that a
student could be **wrong** about.

### Caustics burn without being hot

A separate way to be hurt from heat: it ignores hardness (a steel
breastplate is no defence against something that eats steel), it is
stopped by the *right* material rather than a thick one, and it keeps
working after contact until it is washed off. That last property is what
makes it a treatment surface rather than a reskinned burn.

### Interiority, and why it is mundane

Some sites are **inside** you. A wound there cannot be seen by an
onlooker, cannot be bandaged, and bleeds into a cavity rather than onto
the floor — so blood is lost with nothing to show for it.

This is not a magic concept and not an exotic one. **A spear through the
belly is an interior wound**, and the game cannot currently say so
because the only organs that exist are a heart and a pair of lungs.

### A lost limb is a slot, not an ending

Losing a limb disables what it did and does not end the character. The
game already disables an equipment slot when the part behind it is
broken; a missing part is the same read with a permanent cause.

⚠ **Non-negotiable:** nothing in this build may make a permanent injury a
*sentence*. The person keeps playing, the world accommodates them, and
the route back is a later build's to offer.

### Stage C is the cut line

Stages A and B deepen; Stage C widens. If the cycle runs hot, **Stage C
is what goes**, because it is nearly pure content and will be just as
cheap in three months. Stage A must not land half-finished — it is the
gate on five other builds.

---

## Lens pass

**1 · Pedagogy.** Strong, and the strongest part is the derivability.
Anatomy and physiology are real subjects, and this build teaches them the
honest way: if you know the nerve to a hand was cut, you know the grip is
gone — without looking anything up. Exercises **medicine** (the shipped
Discipline) for reading a body, and **melee-combat**, **blades** and
**unarmed** for producing the readings. The frost spell exercises
**magic-create** and **magic-water** and, uniquely, tests a *published
prediction* of the in-world science.

**2 · Creative expression.** Good, with one honest asymmetry. An author
adds an organ, a species' vital baselines, a caustic material or a weapon
with **no code** — a row naming a material and a form. An author **cannot**
add a mechanism or an armour-resistance profile, and that is deliberate:
those are how the world works, not what is in it.

**3 · Immersion & roleplay.** The strongest lens here. A limp, a hand
that cannot hold a shield, a wound nobody can see — these are RP prompts
the simulation *hands* you rather than ones a player has to invent and
ask others to honour. ⭐ The unseen injury in particular: being hurt in a
way that does not show is a situation the sim can now produce honestly.

**4 · Values.** Real, and it arrives with triage: when two people are
bleeding and one is worse, you choose. The choice is forced by
deterioration clocks that are already honest, not by a scoreboard. ⚠ The
values weight lands mostly in the **next** build (who gets care, at what
price) — recorded as a gap, not claimed.

**5 · Epochs.** Passes cleanly, and is the argument for Stage C. The
function axis is indifferent to the weapon: a severed nerve is a severed
nerve whether the blade was bronze or the round was jacketed. The
mechanisms are physics. **Only the delivery changes across epochs**,
which is exactly what Stage C is.

---

## The drive

Run against the live game before the MR opens. Every location, NPC and
object below **exists today** except where marked ⊕ *new*.

### Stage A — a wound means something

1. Make a character and walk to the **newbie-wilds crossroads**.
2. `assess` yourself. **See** a healthy body with its parts listed —
   including a head, a spine and a liver that were not there before.
3. Pick a fight with **the wolf** and let it bite you at least twice.
4. `assess` yourself again. **See** a named injury at a named part.
5. Try to `wield` a weapon two-handed with an injured arm. **See** it
   refused, and the refusal should say *why* — the hand cannot grip, not
   "you can't do that."
6. Walk somewhere. **See** the injury change how you move — a limp, and
   moving costs you more than it did.
7. Take a wound to the torso deep enough to reach something. `assess`
   yourself: **see** that something is wrong and that you cannot tell
   what. Have a second character `assess` you — **see** that a competent
   reader learns more than you can about your own body.
8. Try to `treat` that interior wound with a bandage. **See** it refused,
   honestly — there is nothing to dress.
9. Keep bleeding without dressing anything. **See** blood pressure fall
   and the body pass into shock **before** it reaches the dying window.
10. ⭐⭐ Take an avulsion severe enough to sever. **See** the part
    reported missing, the slots it carried disabled, and a description
    that reflects it. Log out and back in: **it is still missing.**
11. Walk to **GlassAlley** barefoot. **See** the shipped flagship loop
    behave exactly as it does today — cut, bleed, limp, dress, clot,
    undress. ⚠ This step is a regression check and must not change.

### Stage B — two new ways to be hurt

12. ⊕ Learn and cast the **frost spell** at a target. **See** a cold
    injury that is not a burn.
13. ⭐⭐ Cast it repeatedly. **See your own body temperature rise**, and
    **see** the caster reach hyperthermia while the mana reserve still
    has plenty in it. *The mana bar is not the danger meter.*
14. Wear the **hide jerkin** and take the same cold effect. **See** it
    help. Wear the **steel breastplate** and take it again — **see the
    steel not help**, for the same reason a steel gauntlet makes a burn
    worse.
15. ⊕ Find the **caustic** and get it on yourself. **See** a burn that is
    not thermal, and **see it keep working** after contact.
16. `wash` it off. **See** it stop.

### Stage C — past the medieval *(the cut line)*

17. ⊕ Buy a **bow** at the Terminus general store, walk to the
    **longmeadow**, and shoot something at a range the crossroads cannot
    afford. **See** the empty demonstrator arena finally used for its
    purpose.
18. ⊕ Take a firearm round while wearing the **mail hauberk**. **See**
    the mail fail against it in a way it does not fail against a sword.
19. ⊕ Buy and wear **three layers** — padded, mail, plate. `assess` and
    **see** all three counted, outside-in.

⚠ Step 19 is also a **reachability check**: it cannot be performed today
at all, because no armour in the game is obtainable by a player.

---

## Acceptance criteria

Observable from outside the code, by a person.

1. **An injured character can be seen to be injured by somebody else**,
   without either player agreeing to pretend.
2. **A wound stops you doing a specific thing**, and a player can predict
   *which* thing from where they were hit — without consulting
   documentation.
3. **A player can be hurt in a way they cannot see**, and can be told
   more about their own body by a competent stranger than by looking.
4. **Bleeding produces shock before it produces death**, visibly, with a
   window in which someone could act.
5. **A character can permanently lose a limb, keep playing, and still be
   able to do most things** — the world accommodates them.
6. **A player can be frozen and can be burned by something caustic**, and
   each feels different from being burned by fire.
7. **A frost caster who over-casts injures themselves**, and can tell
   from the game that it was heat and not exhaustion that did it.
8. **A player can buy armour, wear three layers of it, and observe that
   the layers matter.**
9. **The bare-foot-on-glass loop behaves exactly as it does today.**
10. **Nothing in the lounge can hurt anyone.**
11. *(Stage C)* **A player can fight with something that is not a
    medieval weapon**, and armour answers it differently than it answers
    a sword.

---

## Cross-references

**Seeding slates**
- [physiology-slate](../slates/builds/physiology-slate.md) — waves 2–4;
  the function axis, the organ roster, the capacity vocabulary
- [materials-response-slate](../slates/tails/materials-response-slate.md)
  — the reserved mechanisms and tissue as an axis
- [ranged-slate](../slates/builds/ranged-slate.md) — W3–W4, Stage C

**Consuming slates** *(this build is their acknowledged blocker)*
- [health-vertical](../slates/builds/health-vertical-slate.md) ·
  [medic-judgment](../slates/builds/medic-judgment-slate.md) ·
  [pharma](../slates/builds/pharma-slate.md) ·
  [blood-slate](../slates/builds/blood-slate.md) ·
  [augmentation-slate](../slates/tails/augmentation-slate.md)

**Subsystem docs**
- [harm.md](../subsystems/harm.md) · [vitals.md](../subsystems/vitals.md)
  · [mortality.md](../subsystems/mortality.md) ·
  [materials-response.md](../subsystems/materials-response.md) ·
  [combat.md](../subsystems/combat.md) ·
  [ranged.md](../subsystems/ranged.md) ·
  [race.md](../subsystems/race.md) · [magic.md](../subsystems/magic.md)

**Doctrine**
- [arcane-science.md](../arcane-science.md) — the eight content rules;
  the cooling prediction Stage B tests
- [uncertainty.md](../uncertainty.md) — no resolution rolls
- [design-lenses.md](../design-lenses.md)
