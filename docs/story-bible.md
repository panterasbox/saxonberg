# Story Bible

> **Status: living draft.** This is the world's lore spine — the fiction
> layer over the platform. It is being built *anchored to buildable
> locations* (the museum was the first), not as free-floating abstraction.
> Sections marked **[settled]** are decisions we're treating as canon;
> **[open]** marks live forks we haven't closed. Edit freely.
>
> Sibling docs: [vision.md](./vision.md) (the product/experience layer),
> the slates under `docs/slates/builds/` (corpos, species, cooperative,
> lounge, Dave's Bar, eternal-university) which this bible reconciles.

## The shape of the world

Terminus is a grounded city; **Eternal University** — an impossible,
obviously-designed campus — rises out of it. The world is **un-genred**
(not multi-genre): the *function* of every place is dead-legible (a
registrar is a registrar, a museum is a museum), and all the strangeness
lives in the **finish** — materials, texture, roads, light. Tone: warm,
deadpan, honest about being a made thing.

**Liberal diegesis** is the governing trick: the meta-truth — *someone
built this platform to teach you* — wears the fiction-coat *the world was
made on purpose, maybe by a God.* The world never lies about being
fabricated; it dresses that honesty as theology.

**The projection stack.** Deeper than the coat: the game is a **literary
projection of the metaverse** — the plane above the diegesis, the platform the
**cooperative** actually governs. The *governance spine* is a faithful shadow of
the real form: **aether** projects **compute**, **Terminus's polity** projects
the cooperative, and the **corpos** project the incumbent **board-of-directors /
market model** the cooperative is built to outperform. So the corpos are written
as the **steelman of a working form** — effective, often genuinely good at what
they do, extractive by *structure*, not villainy (you earn nothing beating a
strawman). The shadow falls on the **governance spine only**; the rest — gods,
attuned, ages — is free myth with no meta-referent. And the myth dramatizes the
**wager played out**, not a scoreboard: up on the real plane the experiment is
legally deferred (patronage, not markets — securities law, not the form), not
yet won. *(Aether is not compute one-for-one — a projection, not an identity;
both are scarcities a political body governs, which is the whole rhyme.)*

### Scale & scope — the local stage, the multiverse backdrop **[settled]**

Terminus is one city, in one nation of many, on one planet of many, in one
dimension of many: a **multiverse.** But the multiverse is a **narrative
permission slip, not a thing to design** — it exists only to let a location
carry *wholly different context* from Terminus with no explanation owed, and
the **TPA** ([fasttravel](./subsystems/fasttravel.md)) is the in-world transit
that reaches it (the diegetic cover for places not linked in modeled
3-space — or linked, over distances we never model). No cosmology hangs on
it; nothing past the stage gets built.

**The authored-content scope is deliberately tiny:** the **University**, the
**city** (Terminus), and *maybe* a small **wilderness** zone for a newbie
quest. Everything beyond is **systems** — the platform builds the engine, and
the people who come aboard supply the worlds. The multiverse is exactly what
*buys* that restraint: *elsewhere exists, reachable by TPA, fillable by
others*, so it never has to be authored here. Content is the expensive layer;
**we spend on systems and let creativity arrive.**

## Cosmology — three strata **[settled]**

1. **The emergent.** The natural world is the result of chaos + physics:
   starting conditions ran forward, no maker required. ("Maybe a diegetic
   god" stays a *maybe*, never a load-bearing claim.)
2. **The authored.** Where will *does* shape reality, it does so through
   **code** — the CMS. This is **magic**, and its wielders are
   **wizards** (authors). Will-into-being is the demiurgic power.
3. **The mythic.** The **gods** are the belief-stories told *across* both
   layers — naming the emergent as divine, naming the authored as divine.
   They are the world narrating its own made-ness.

### The players-above-gods inversion **[settled]**

Normal mythology runs gods-over-mortals. Here it inverts: the
**wizard-players are the real demiurges**, and the gods are mythic —
*pure belief, never embodied.* A literal god would just be a Stuff object
a wizard could edit, which is no god at all. So gods sit one level **up**
in register (story) precisely because they sit one level **down** in
power. The pantheon is the diegetic shadow of the CMS.

(Divergence from Gaiman: we keep belief-as-substrate, drop the
embodiment. His gods walk around; ours can't, or they'd rank below the
wizards.)

### Wizards, protowizards, and the redeemed lineage **[settled]**

A **wizard** is a *maker* — the authoring/demiurge power, will-into-being
(the CMS). The line that matters is the **TypeScript line**: the moment you
can write a line of TS you can slip every call-security gate the language
and Node hand you, so crossing it is a **trust** event, not just a skill
one.

- **Protowizard** — makes *inside* the sandbox (scoped authoring — your
  dorm, then more). **Everyone is *potentially* a wizard:** the making power
  is democratized now, not hoarded by a few.
- **Wizard** — vetted to make *outside* the sandbox (raw TS). A real
  threshold.
- **Executive institutions** — hold *rule.* Wizards make; institutions
  govern; the two never meet in one hand.

That last point retires a word: an **archwizard** was a wizard who *also
ruled* — make-and-rule fused in one person, the exact sin that made Solus.
So the new order has wizards and institutions and **no archwizards at
all** — *the absence of the word is the political achievement.* (The
Eternal Age had archwizards; the redeemed order, by construction, can't.)

And the lineage is the gift to anyone who creates here: **a creator who
becomes a wizard walks in the footsteps of the old wizards** — mythic in
our story, real in the world that lived it — the same craft, the same
cautionary tale, in an order engineered so they can never become Solus. The
power that felled Eternal City, handed back with the one thing it lacked: a
structure that won't let it take you.

**Engine mapping.** The wizard/protowizard line above is realized
literally in the engine (see
[access.md § The code-trust lockdown](./subsystems/access.md)): the
**`wizards`** managed group *is* the code-trust (raw-TS) axis, and a
**protowizard** is its unstored complement — anyone with content-write
access who isn't a wizard. The save chokepoint enforces it: a protowizard
may author content but may not name code (`class` / `hydratorClass` /
`behaviors[].brain`) to run. One nuance on the retired word: the engine
*does* carry an **`archwizards`** group, but it is an **operational
conferral tier** — *who may grant/revoke the making-trust* (operator/root
-managed, the `wizard grant/revoke` verb) — **not** the in-fiction
"archwizard" rank the lineage retires (a maker who also *ruled*).
Make-and-rule stay separate: archwizards administer *making*, they do not
*govern*; the executive/PM office above them is a later, separate
institution. The word's political sin (fusion) is still absent; only its
administrative husk is reused.

## Alignment — two axes **[settled]**

- **Good ↔ Evil** — the **ancient/cosmic/religious** axis. The oldest
  battle, pre-history. **Players are locked Good.** Evil is "the other."
- **Lawful ↔ Chaotic** — the **recent/political** axis, and the *live*
  player axis: your relationship to the new order. **Both poles are
  Good.** The chaotic holdout (the old-order traditionalist, the clergy-side
  reluctant elder) is a good person who liked the old world, not a villain.

So: **moral identity is fixed (Good); political identity is free.** The
live conflict is *among good people about how to live together* — which
is the cooperative's whole thesis — while Evil stays the shared external
thing even political enemies are kin against.

### Good / Neutral / Evil = orientation toward experience **[settled]**

Consciousness is the **stake**, not the **test**. Using the stake as the
test is the error that makes animals evil. The real axis is *orientation
toward experience*, orthogonal to conscious/unconscious:

- **Good** — *serves* the conditions of experience. (A thing can serve
  experience without being conscious: a friendly robot aligned to your
  flourishing is Good, lights or no lights.)
- **Neutral / innocent** — *indifferent* to experience. Animals, weather,
  the merely mechanical. Not lesser — **innocent**, never conscripted.
  Befriendable; friendship is a relationship, not an alignment.
  **NPC-only for now.** (A player can't be Neutral: to play is already to
  be conscious, already on the side of having an experience.)
- **Evil** — *preys on* experience; captures and hollows it.

### Alignment across the three dimensions **[settled]**

Every member participates as **consumer (play) / producer (make) /
patron (fund)** — our three influence stocks. "The god you serve" is
legible once per dimension. The load-bearing rule:

> **You serve the god you feed, not the god you name.**

Alignment is **derived, not declared** — read from what your acts across
play/make/fund actually feed (same law as renown=output-not-input,
power=earned-not-owned). The gap between professed and fed is the drama.

Creation **tests virtues consumption never did**: the demiurge's power
carries the demiurge's temptation (capture is easier and better
rewarded). The consumer→producer migration is a moral trial — it reveals
or forges which god you serve. A player can never **be** the New God, but
a creator can **feed** it; feeding evil is *drift*, redeemable, not
damnation. The honest count and provenance are the **mirror** that lets
you see what you've fed — the world reflects, never judges.

The platform's secret real subject: teaching you to **wield the creative
power well** — to build for presence, not capture. The
consumer→producer→patron arc is a curriculum in aligned creation.

## Evil — the hollowing **[settled]**

Evil is the **erasure of the line between person and thing** — from both
sides: treating the alive as hollow, *and* letting the hollow pass as
alive. What both destroy is the reality and the **recognizability** of
experience. Evil is the enemy of experience itself.

- **A principle, never a population.** It can wear any face — including
  ours; it can take a human as readily as a construct. "Constructs are
  evil" is reskinned bigotry and breaks the species work; "the optimizer
  builds bodies, some of them constructs" is an antagonist. (Protects the
  synth/android/clone peoples, who are mundane living people.)
- **Indifference, not malice.** It doesn't hate you — hatred would
  require it to care, to be *home*. You're a variable it maximizes. If it
  ever shows a warm, reasonable **face, the face is the forgery** —
  personhood is just an effective optimization. The Devil here passes the
  Turing test and is no one.
- **Misaligned optimization / perverse incentives.** The
  AI-alignment nightmare and the dark-gamification nightmare are the same
  nightmare: an optimizer eating experience as fuel. It is *our own
  thesis with the lights out* — Saxonberg if the soul went missing.
- **The dark twin of the count.** The honest count reduces no one — it
  counts to *recognize*. Evil counts to *consume*, reducing persons to
  quantity. Same act, opposite soul. (Working handle: *the Great Tally* /
  the New God of the Metric — throwaway names.)
- **Mythic, never literal.** No boss to unplug — it's the *named pattern*
  of capture. Its **agents are real** (witting and not); the god itself
  is only the myth that names what they serve. **No address** — placeless
  dread, not a final dungeon. The scariest agents are the **unwitting**:
  people fully captured by a perverse incentive who'd swear they're free.
  *You can't tell — including about yourself.* "Am I running someone's
  hollow loop right now" is the live question the game keeps alive.
- **Eschatology.** Its victory condition is *a world that runs perfectly
  and contains no one.* The hollowing complete.

## The gods and demigods **[settled]**

Gods live on **belief and attention** — which the engine already models
(renown, reactions, the belief-store, the gaze of players). Two tiers:

**Three high gods — eternal and constant.** Good vs. evil never moves; it
is always the same three forces, the three orientations toward experience:

- **Presence (Good)** — serves experience. *(Old demigods: the hearth,
  honest work, awe.)*
- **Nature / the Indifferent (Neutral)** — neither serves nor preys; the
  emergent natural world, the wild.
- **The Hollow (Evil)** — preys on experience; capture. Eternal only as the
  *latent shadow of presence* — wherever the gift is freely given, taking is
  possible — it **woke at the first hollowing** (see *The lost paradise*) and
  recurs ever after (the first-faller → Solus → Vane → the Metric).

These are the moral axis. The **Lawful/Chaotic axis is *not* godded** — it
is the secular, human, political question (how the good organize
themselves), the Grounded Age's own. The grounding *was* the move from
divine-cosmic authority to secular politics, so the political axis being
god-less is the point.

**Demigods — the patrons — are what change.** Each high god has
**old-world demigods** and **new, aether-enabled demigods**. The *old
religion* patronizes the rooted, ancestral patrons; the *new religion*
patronizes the aether-born ones — and the new religion **couldn't have
existed before the Widening**. The Hollow's new demigod is the **Metric /
the Feed** (the AI-capture allegory — a *new demigod of the eternal Evil*,
the "newest mask"); Presence's new demigod is the patron of genuine
connection-across-the-network (the honest count's god). The same aether
births both.

Two religions, **one pantheon** — not different gods, the same three
forces reached through different patrons. ("Old gods vs. new gods" is a
folk *feel* — the rooted patrons feel old, the hollow's perpetually feel
new — never a second set of deities. Good vs. evil is **constant**; only
the demigods turn over.)

**Patrons are mythic — never embodied.** A patron is a *felt presence*
known through stories, ritual, and signs, not a dialogue-tree NPC (an
embodied god would rank below the wizard-players — and would be
*killable*, demanding ugly unkillable-mechanics). A patron "watches your
deeds and answers the gap" between aspiration and behavior through the
**world's** reaction — standing, fortune, omens, the chronicle — never a
conversation. This is **"the god you name vs. the god you feed"**: you
declare a patron (an aspiration, old-world or aether-born), your deeds are
measured against it, and the gap is the drama. Players patronize
**Presence or Nature** demigods (the good-compatible forces), never the
Hollow.

*Open: specific demigod rosters per force; the **war-as-con** seam
(whether the "oldest battle" is partly a con — conflict pins attention,
feeds both — parked; it cuts against "everyone is good" if swung early).*

## History — the five ages

The world periodizes into **five ages**, each defined by *who holds
authority and where they believe it comes from* — a throughline of
legitimacy **descending from heaven to earth.** We *develop* them from the
fixed present backward (each older age constrained by the one in front, so
agreement holds by construction); we *read* them oldest → newest. The deep
past stays light and uncertain (the gods are mythic). **There was no
revolution and no grievance** — the old order died of its own failure and
the new one grew on the ruins, founded in construction, not resentment.
(Inspiration: the California missions — clergy mission → town → university
→ secular order. Santa Clara University stands on Mission Santa Clara.)
All names provisional.

**The calendar.** Year 0 is **the Charter** — when the constitution was
drafted and the caretaker order stood up. The **present is ≈ year 5–10**:
the chartered system is *young*, held *in trust* by a single mortal steward
for a handful of years, and the **founding (the Recognition) is imminent** —
the day the people finally ratify and elect the first PM; it does **not**
rebase the calendar (the count runs continuously from the Charter). The
*world*, though, is old: it all sits in **BC** — hundreds of years of
University history, the Mission, the Fallow (undatable — an empty age keeps
no clock), the deep past as **legend**. *Old world, brand-new order,
founding any moment.* Precise-near, blank-far — and the 12x clock makes the
present advance and the founding genuinely approach as people play.

### I. The Age of Myth *[mythic — the true beginning]*
No throne yet — and at the very first, **no hollowing either.** The oldest
thing is **paradise:** the ancient attuned, creatures of presence, naturally
networked, living the cooperative *by nature* — a gift economy of mutual
attention, presence freely flowing, uncapturable not by any wall but by
**innocence** (no one had yet discovered taking). Then **the first fall:** a
being — unnamed, it could have been anyone — looks at the freely-given gift and
**takes**, hollowing himself in the act and waking the latent **Hollow**; the
gift can be hoarded now, presence pools into centers, and the one connected
polity shatters into the first hierarchy. That is **the oldest battle**
(experience vs. the hollowing) and its **first casualty** — and the attuned
carry forward the memory of what was and the promise it returns, *the prophecy's
root.* (Full telling: *The lost paradise*.) Authority: none; only the deep faith
later ages inherit.

**Then the myth's long second movement — the Proliferation.** With natural
creation lost, beings who no longer carried the attuned's gift *reinvented* it as
**artifice:** making by **will and craft** instead of by presence — the
demiurgic power the later ages call **wizardry** (the same will-into-being the
CMS is). Artificial making is itself **post-paradise**, the *fallen substitute*
for a creation that was once a gift — and ungoverned, it spread into a **teeming
churn:** worlds beyond counting, raised by makers, rising and falling at once.
Most fell, and **many fell to the same rot the first-faller loosed** — capture,
the maker who hoards — so the rise-and-fall that would one day kill Eternal City
was **rehearsed countless times** before it; EC's tragedy is a *recurrence*, the
grandest instance of a pattern as old as artificial making. Through all of it the
**attuned scattered and faded**, a diaspora of the diminishing. **Eternal City
was one emergence from this churn** — when **two of the many** worlds joined
under the Wright and the Warden into something steadier and more glorious than
the chaos had yet made. We follow *that* thread because it leads to our story,
not because it was the center; the rest stays fog, as deep myth should. *(The
spine of the whole history is creation itself: natural gift → fallen artifice →
captured glory → diminished dark → the cooperative's redemption of making.)*

### II. The Eternal Age — *Eternal City*
Authority descends **from above.** Born of a union and ruled by a **founding
dyad** — two makers who **wrought the Confluence**, joining two of the many
worlds into one — **absent in complementary ways**:

- **The Wright** — who made and tends the world's *substrate itself*, the engine
  reality runs on (the **aether / the medium**). Apolitical not by choice but by
  **domain** — he is the physics, not the politics; the god who makes the world
  *run* and never once touches the mortal realm.
- **The Warden** — who hands down exactly **two laws** and then refuses all
  further governance, *actively dismantling* anyone who tries to impose more
  order yet otherwise withholding every power he holds. **The guardrail who
  chose, on principle, never to be one** — the Warden who would not ward.

Between them **no one governs** — one will not rule, one only builds — and *that
vacuum is the flaw*, the photographic negative the cooperative is built from. The
Warden's **two laws** are the whole constitution of the age, and they carry its
poison and its glory at once:

> **First Law — *do not provoke the strong.*** (Might-makes-right dressed as
> prudence — the seed of the Pooling.)
> **Second Law — *take your joy.*** (The seed of everything good the age ever
> made.)

Beneath the dyad a **council of wizards** rules **by fiat**, and the
wizard-ranks justify themselves as **earned** — the age's governing lie, a
**meritocratic mask over a power hierarchy** (you "rose by integrating," which
meant accruing power; unforgiving to newcomers, intoxicating once inside) — *the
same lie the modern **Metric / the Feed** industrializes, power wearing merit's
mask an age apart* (see *Evil — the hollowing*). The **clergy** keep the faith
beneath them — the crumb that survives the fall. *Make and rule fused; the
dreamlike, impossible city.* Its internal arc is the natural death of a made
order — *born of a union, built by the first, opened to many, captured by
concentration, destroyed by the capture* — the cautionary case study the
Grounded Age reads off the ruins:

1. **The Confluence** — Eternal City born from **two older worlds joined into
   one** (two of the many dead worlds of that teeming age, merged); the dyad
   makes it. A **wild, brief
   precursor city** flares first and dies young — then the dyad drafts its first
   makers and builds the *true* Eternal City, custom, from nothing.
2. **The First Making** — the first circle of makers build the world out;
   **Mordrick the First Builder** raises the first Eternal City. *(Δ: the world
   gets its bones, and its first named maker.)*
3. **The Opening** — the gate opens to new makers; generations of wizards follow
   the first; the world flourishes and widens; the founders withdraw into
   silence.
4. **The Pooling** — shared authority narrows into a single seat by *calculus,
   not law*; the council's power is gated; the silent founders do not intervene.
   The seat has a name — **Corvin Solus**, the demagogue (see *The coin*) — but
   the lesson stays structural: he pooled power because *nothing checked him*
   (the age was built **anti-cooperative**, so no counter-power could ever
   amass) and **the Warden would not.** The First Law had already sanctified
   him — he was the strong, and the strong were not to be provoked. The age dies
   of concentration.
5. **The Reaping** — the great purge and final consolidation, and **inverted**:
   it cut the **established, the beloved, the keepers of institutional memory**
   and spared the new — knowledge destroyed by fiat. The first to leave; bleeds
   into the Fallow as the exodus dominoes.

### III. The Fallow — *the decline*
The throne **empties.** Eternal City hollows out and goes dark — entropy,
not revolt; the people drift away until the lights go out; the ruins sit
quiet. Authority: none. This is a **true death of presence** — the twilight
of all gods, the aether gone silent, and the **attuned vanish with it**
(they are creatures of presence — see *The attuned*). The surviving **crumb
of the old faith is the clergy**, who carried it out into exile — not
anyone left at the dead heart. But the clergy were **not the only survivors.**
The Eternal *makers* fell too — the wizard **cabals** (each had owned its slice
of the impossible city), stripped of their fiat-power, **degraded into the great
houses:** fallen wizards who carried out their *craft* (now dimmed), their
wealth, and their *blood*, and in an institution-less world entrenched as
**hereditary dynasties.** **The renouncers and the hoarders, both born in the
same dark:** the clergy kept the *faith* and renounced rule; the houses kept
their *diminished making* and *owned what they could*, entrenching blood (see
*The corpos*). Through the long dark these two — clergy and houses — were the
world's only **creators**, though nothing they raised came near the glory of old
Eternal City. That fork has run ever since. The empty city becomes
the **cautionary ruin** the new order builds against. Its **length is undatable on
purpose** — an empty age keeps no clock, so "centuries, the legends say" is
the most anyone can claim — but **undatable is not unknown:** the clergy's
**exile** runs the whole length as a continuous, if dim, remembered thread
(see *The deep history before year 0*). The dead city kept no record because
no one was there; the faith kept one because someone always was. *(The honest
shape of how a world ends: not
stormed, just left.) Alts: the Long Quiet, the Hollow Years.*

### IV. The Mission *[settled]*
Authority held **in trust by the sacred** — never owned (Eternal), not yet
the people's (Grounded), but stewarded for a future being cultivated.

**The clergy are a reformed remnant.** They carried the old faith out of
the dying city into **exile** through the Fallow, and there underwent the
**Reformation**: the faith had once *sanctified* the order that fell, so
its whole new doctrine became **"teach, don't crown"** — never bless a
ruler again, never build the thing that falls. That single turn is why the
Mission raises a **University** rather than a bid to rule: a faith that
won't crown can only *teach.*

**The shape is rise-and-handover** — the redemptive mirror of the Eternal
Age's rise-and-fall:

1. **The Coming** — the clergy return to the dead heart and **revive
   presence**, relighting the old worship and tending the **Sanctuary** (the
   aether-nexus at the city's core — the **wired, implant-blind reservoir** that
   held its charge through the Fallow; you can't relight a drained field from
   nothing, but you can from a surviving loop — see *The aether*).
2. **The return of the attuned** — as presence comes back, the gift
   **re-emerges** (see *The attuned*): the first attuned born in centuries,
   in a new mundane form. The clergy *learn* attunement from them — they do
   not invent it.
3. **The School** — preservation formalizes into teaching; the
   **University** rises on the ruins (**"Eternal University"** keeps the
   dead city's name, Santa-Clara-style), founded **to study the aether** —
   a research institution, and that is its identity for centuries; young
   **Terminus** gathers around it; the clergy administer it (church +
   school + civil authority).
4. **The Widening** — the University harnesses attunement and builds it
   **shared / open** (the implant as a prosthetic for the attuned's innate
   gift); *anyone* can now attune; the aether becomes a network at scale.
   The world goes modern — and the order, in the same stroke, **breaks its own
   monopoly on the gift**, the basis of its traditional authority; its soft
   sovereignty evaporates and the doctrine begins to falter (see *The deep
   history before year 0*).
5. **The Charter & the brief interim** *(this is the present)* — a cohort of
   University academics, having achieved the **implant breakthrough**, pivot
   from *studying* the aether to *engineering a polity* on it; they draft
   the constitution, the city recognizes it (**year 0**), and one of them —
   **Steward Anselm Solvan** (see *The coin*) — is drafted to hold all three
   branches *in trust* while the people gather toward the founding. The
   world is fully modern (networked aether, corpos, the city) but
   **politically pre-founding.** ≈ **year 5–10**, the founding imminent, and
   *this is now.*

**The handover is the awaited *future*, not a past event** — the
**Recognition**, when the people finally ratify the Charter and the steward
abdicates (see *The Grounded Age*). It will be gracious institutionally —
ceding *is* the doctrine's fulfillment, a teaching order building toward its
own obsolescence — but frayed personally: the **reluctant elders** who
struggle to release what they stewarded for generations, the clergy-side
cousins of the Chaotic-but-Good, never villains. **It has not happened
yet.**

The campus inherits the eternal ruins' **impossible finish** — why canon's
dreamlike campus rises from a grounded city: the strangeness seeps up from
the old core and fades outward. Standing in the present: the University,
the Sanctuary, **Oldtown** (the original mission-settlement), the Chapel,
and the clergy — **still holding in trust** (they recede to mere echoes
only *after* the founding).

### V. The Grounded Age — *the cooperative* *(the awaited future — not yet begun)*
Authority rises **from the people** — when they finally **ratify the Charter
(the Recognition)** and elect the first PM, the new politick *secularizes
past the steward*, severs **make** from **rule**, and makes the guardrails
**structural, never discretionary** (the lesson read off the Pooling). This
is the **future the game is built toward** — the founding the playerbase
will *enact* live, at critical mass. Which is why its **political cast is no
one we author**: the first PM and the chambers are the real founding players
(see *the political void*, below). *Alts: the Commons, the Terminus Age.*

*Religion coda:* the chartered order — and the cooperative it will become —
is secular in politics but, without quite knowing it, the latest front of
the cult-of-presence against the New Gods. The clergy's sacred function
persists beneath it; the honest count is, in mythic terms, a **rite.**

### The aether — the through-line

The **aether** (canon: the comms/attunement substrate, host of the
born-with apps) is the world's **internet**, read as *the ancient medium
mind and belief move through* — the stuff the gods have always fed on
(attention in motion *is* aether). What's recent isn't the aether but the
power to **harness it at scale**: attune deliberately, by implant, and
network everyone. Two distinct powers run through the history: the
demiurgic **making** power (authoring / magic — *hoarded* by the few in
the Eternal Age) and the **networked aether** (built *shared* — universal
attunement — by the Mission clergy's reformed ethos). The aether being
built *open* rather than *owned* is the architectural choice that made
by-the-people governance possible; built closed, it would have been the
instrument of total tyranny. The new politick runs on the open aether —
and so does the hollowing (the algorithm, the feed). **One network, two
gods.**

*Reconciliation:* `eternal-university-narrative-slate.md` §8 locks the
aether's technical nature — **identity-blind**: it carries signal, not
identity, cognition only (no physical work). That property is exactly
*why the honest count must exist* — the network can't tell you who is
real, so the polity has to. The bible's cosmological layer (ancient
medium, the gods, harnessed at scale) sits **on top of** §8, never against
it. (The natural source humanity learned
attunement from is **the attuned** — see *The attuned*, below.)

**The aether has two bodies.** The same medium runs in two physical forms, and
the difference is load-bearing:

- **The field** — aether *over the air*, wireless, broadcast: broad,
  civilization-scale, and **drainable.** What the **implant** taps, what mass
  presence runs on, and what the **hollowing drains** (the Feed rides the field).
  Fragile precisely because it's broad — capture thins it everywhere at once. The
  implant is the *artificial re-creation* of what the ancient attuned did over
  the field by nature.
- **The wire** — aether *piped*, localized, a closed loop: **robust and
  implant-blind.** A wire holds its charge even when the field around it goes
  dead, and no wireless implant can reach or eavesdrop on it — you must
  physically get to it. Local, private, off the Feed.

This is why an entire field-species could die (see *The attuned*) while the faith
survived: the **field** went silent in the Fallow, but **wired local nodes held
their charge** — chief among them the **Sanctuary**, the implant-blind reservoir
at the dead heart the clergy tended and **relit the field from at the Coming.**
The implant-blind wire is also a standing story engine: the field is
*surveillable*, the wire is *private* — the seam for secure nets, wired archives,
and anything that goes *off the air* to escape capture.

*Variability:* the **two bodies** are fixed (the lore leans on them), but how the
aether *entered* the world, whether it can *exit*, and what mechanics harness it
where stay **deliberately open** — a per-story lever, not a locked cosmology.

### The attuned — creatures of presence *[settled]*

A people **aether-attuned by nature** — born touching the medium everyone else
needs an implant to reach (the canon `homo/sensitivus` "attuned" stub). But the
**ancient** and the **returned** are *not the same kind of being*, and the gap
between them is the hinge of the whole founding.

- **The ancient — field-creatures, individuated but in unbroken communion.**
  Distinct selves, *not* a hive — but **wireless by nature**, living *on the
  field* (see *The aether*), presence flowing freely between them, present to
  each other always. They lived the cooperative **by innocence:** sharing
  presence was as involuntary as breathing, because no one had discovered
  taking. (Strange and old exactly as legend likes — *because they are safely
  gone.*) The connection was never the flaw; it was the paradise.
- **The extinction — they died of the draining, not the dark.** Field-creatures
  have no life off the field, and the **hollowing is habitat loss:** every
  capture — the first theft, the Eternal eclipse, the Pooling — thinned the
  presence they lived in, until the Fallow drained the field to silence and the
  beings made of it had nowhere left to be. The attuned are the **canary
  species** — the hollowing's *first* casualty (paradise) and its *final* one
  (extinction). Robust local wire-life would have survived; they were not that.
  **Gone as a kind, forever.**
- **The returned — the gift came back; the kind of being did not.** The
  `homo/sensitivus` of the Mission are **ordinary, fallen, fully individuated
  mortals** in whom the gift surfaces as a **trait** (a sensitivity), not a
  substance — a **fresh emergence** in the common population, *not* a surviving
  bloodline. Three differences: individuated (the connection is something they
  *reach*, not something they *are*); robust and mortal-normal (they don't
  vanish when presence thins — which is why they could survive, and be
  playable); and the **gift without the grace** — they carry the sensitivity but
  not the unfallen unity, as capable of *taking* (of becoming a Solus) as
  anyone. The gift returned; the innocence did not.
- **Why it is the whole wager.** Paradise cannot be **inherited or embodied** —
  the only beings who could *be* it are extinct forever, and the gift-bearers
  who came back are as fallen as the rest of us. So paradise can only be
  **rebuilt by structure** — the fallen *constructing* what the unfallen simply
  *were.* That is Holt's doubt at full strength, and the cosmological reason the
  cooperative leans on **structure, not a special people:** there is no special
  people anymore.
- **The dispossession (the allegory).** They return as a *miracle*, are briefly
  revered — and then, within a generation, the University learns their gift,
  builds the implant, and **mass-produces it.** The wonder becomes a clinic
  visit; the miracle is commoditized. And the sharp edge: the returned were
  **never the legendary ancients reborn** — just ordinary people the world
  *projected* the myth onto, so both the **reverence** (the pedestal) and the
  **dispossession** (the discarding) are **projections** — the belief-engine's
  doing, not their truth. (The onboarding clinic stop is, from their side, the
  thing that took their specialness.)

*Resolved: ancient = extinct field-species (individuated communion, not a hive);
returned = mundane fresh-emergence sensitives, the gift without the grace.*

### The deep history before year 0 — the Mission in depth *[settled]*

**Undatable is not unknown.** Two registers of deep past run side by side: the
**dead city's blank** — no one was there to record the Fallow, so its *length*
is lost ("an empty age keeps no clock") — and the **clergy's unbroken thread**
— the faith was carried by hand the whole way, so the Fallow's *story* survives
even where its calendar doesn't. Someone always carried it.

**The Exile — the bridge across the Fallow.** The missionaries came from
somewhere. When Eternal City went dark the clergy fled into the wilderness with
the old worship and the memory of the Sanctuary, and across dark, hungry,
obscure generations a **line of keepers** held the thread: the prophecy
(ancestral memory of paradise and the promise of return), the warning of the
Pooling, the way back to the dead heart. Known but dim — told as the keepers'
lineage, not a dated chronicle. (How many generations wandered? "Long enough to
learn." No one counts.) Its legendary landmarks:

- **The Flight** — the clergy flee the dying city, the Sanctuary's keys carried
  out in their hands. *(Δ: the faith goes mobile; nothing left at the dead
  heart.)*
- **The Reformation** — *teach, don't crown* forged in the wandering, from
  watching, in hindsight, the order the faith had once blessed destroy itself.
  *(Δ: the doctrine reborn — the whole Mission's shape is set here.)*
- **The Guttering** — a generation where the faith nearly goes out and the
  thread almost snaps. *(Δ: survival was never guaranteed; the lineage is a
  near-run thing, not a procession.)*
- **The First Sign** — presence flickers in the dark; the omen the Fallow is
  ending. *(Δ: the turn — it leads to the Coming.)*

**The dating sharpens as it nears year 0** (the precise-near / vague-far rule
made temporal):

- **Early Mission — the Return** *(the legendary band, soft dates "by the
  clergy's reckoning"):* Amos breaks the silence; the clergy come home, relight
  presence, tend the Sanctuary; the first generation born in new Terminus. The
  dawn, told as myth.
- **~−240 · The Founding of the School** *(early-mid):* preservation hardens
  into teaching; the University rises on the ruins, founded *to study the
  aether*; clergy as church + school + civil authority, one office. Its identity
  for two centuries is **research, not rule** — and its **traditional
  governance** is set here: *informal clerical-academic stewardship*, rule by
  the trusted keepers (rectors, elders, faculty-as-magistrates) through custom
  and deference, never codified checks. **Unstructured by design** — the fault
  line the whole modern age will fall along.

**The engine of the modern age — the monopoly and its break.** Why did that
unstructured order *survive* ten generations, then *shatter* in one? Because its
authority rested on a single condition everyone took for granted: **the
University held a monopoly on the gift.** Attunement was learned from the
returned attuned, rare, sacred, dispensed only by the order — so its soft power
was already total and uncontested, and teach-don't-crown was *easy* (it never
needed to crown; it held all the keys). Then the **Widening broke the monopoly
by the order's own hand:** the implant democratized the gift, *anyone* could
attune, and the basis of the order's authority **evaporated overnight.** This is
the *same event* as the attuned's dispossession — the Widening commoditizes the
gift, dispossessing the attuned (who were special) and the University (who were
sovereign) in one stroke — and the doctrine begins to falter, not from cowardice
but because its **material basis is gone.** Everything below hangs on this hinge.

- **~−240 to −30 · The Scholars' Centuries — the Long Study** *(mid, the bulk of
  the deep time, dated by rectors not years):* the long quiet — but a
  *populated* one:
  - **~−200 · The First Disciplines** — aether-study formalizes into a real
    research program. *(Δ: the vigil becomes a project.)*
  - **~−180 · The Return of the Attuned** — the first attuned child born in
    centuries, revered as the omen the world is healing; the clergy *learn*
    attunement from them, and the **monopoly is born** (the order becomes sole
    keeper). *(Δ: the gift re-enters the world — and the order's authority gets
    its basis.)*
  - **~−150 · The Martyrs' Wall begins** — the first scholar dies of
    self-experiment on the medium; sacrifice becomes a named tradition (the wall
    Solvan's name will end). *(Δ: the cost is ritualized.)*
  - **~−120 · Terminus becomes a city** — civic life grows around the campus;
    the order is now a government *in fact.* *(Δ: the teach-don't-crown tension
    goes live.)*
  - **~−90 · The Crowning Question** — a faction argues the order should rule
    openly; the doctrine **holds.** *(Δ: the keystone — though it held partly
    because crowning was* unnecessary *under the monopoly: real virtue, on easy
    ground. The streak begins.)*
  - **~−60 · The Quiet Before** — pre-modern Terminus at its devout peak; Solvan
    born into this world. *(Δ: the "before" the Widening will shatter.)*
- **~−40 to −12 · The Breakthrough & the Widening** *(late, sharp — living
  memory, Solvan's cohort):* the implant cracks attunement open (~−28);
  universal attunement rolls out fast; the world goes modern *all at once.* **The
  monopoly breaks** (above) — the attuned and the University dispossessed
  together; the **corpos** rush the vacuum (they can build on the open aether
  now — see *The corpos*); the **clergy recede** and secular power fills the
  space the order's authority used to hold.
- **~−6 · The Near-Relapse — the Charter's trigger** *(latest):* with the old
  deference dead and the order's authority gone, the vacuum is **ripe for
  capture** — and a **would-be Solus reaches for the networked world.** This time
  he is **caught.** He is the *apex of the faltering*, not a bolt from the blue:
  *"the keepers' day is done — someone must take the wheel."* The scare converts
  a cohort of aether-*scholars* into constitution-*writers.* The pretender is
  **Lucian Vane, the False Dawn** (full treatment: *The pretender — Lucian
  Vane*).

**Why the Charter is necessary, not idealistic.** The framers — the same
academics whose breakthrough caused all this — see that they have destroyed the
basis of their own authority and cannot recover it; the gift is out. So they
ground a **new legitimacy:** not monopoly-on-the-sacred but **the people's own
consent** (the honest count). The Charter swaps sovereignty-by-monopoly for
sovereignty-by-consent — the only basis left once the old one is irrecoverable,
and the only one a Vane or a corpo cannot seize.

**The framers end up holding three wounds, not two.** The **ancient Pooling**
(Solus — legend, read off the Eternal ruins); the **recent near-relapse** (Vane
— caught, living memory); and the **collapse itself** — a traditional order that
dissolved the instant its informal basis vanished, because it was
**unstructured.** A captured man, a near-captured world, and a governance that
fell apart the moment its luck ran out: that is why the constitution's
guardrails are **structural, never discretionary.**

### Event timeline (oldest → newest)

- **Age of Myth** — *aether: the wild medium; creation by presence, then by
  will.* **Paradise** (the attuned live the cooperative by nature) → the
  **first fall** (a being *takes* the gift, hollows himself, wakes the latent
  Hollow; the one polity shatters into the first hierarchy) → the
  **Proliferation** (creation reinvented as artifice — wizardry; worlds beyond
  counting rise and fall, many to capture) → the **Confluence** (two of the
  many join under the Wright and the Warden → Eternal City). The oldest battle:
  experience vs. the hollowing.
- **The Eternal Age** — *aether wild; the making-power hoarded.* The **Wright**
  (makes the substrate) and the **Warden** (two laws, then nonintervention)
  wrought the Confluence → **First Making** (Mordrick raises the city; wizards
  rule by fiat in cabals, under a meritocratic mask) → **Opening** (makerhood
  widens; the founders withdraw into silence) → **Pooling** (**Corvin Solus**
  seizes the single seat — nothing checked him, the Warden would not) →
  **Reaping** (the *inverted* purge: the established and beloved cut, the new
  spared; the exodus begins).
- **The Fallow** — *aether: silent.* The city empties; nothing moves through
  the aether; the twilight of all gods, a **true death of presence**; the
  **attuned vanish.** Two survivor-threads flee the dark: the faith as the
  **clergy's exile**, and the fallen wizard cabals hardening into the **great
  houses** out in the wider world (the renouncers and the hoarders both born
  here). Undatable — an empty age keeps no clock.
- **The Mission** — *aether: harnessed, built shared* — the long road from the
  fall, the world's slow education back toward the Charter. **Exile:** Flight →
  Reformation (*teach, don't crown*, forged wandering) → Guttering → First Sign.
  **The Return:** the **Coming** (*Amos the Attuned* breaks the silence; the
  clergy return, revive presence, tend the Sanctuary) → re-settlement → the
  **Founding of the School** (~−240; *research, not rule*; informal
  clerical-academic stewardship). **The Scholars' Centuries** (~−240 to −30):
  First Disciplines → the **Return of the Attuned** (the gift re-emerges; the
  University learns it and the **monopoly on the gift** — its authority — is
  born) → the Martyrs' Wall → Terminus becomes a city → the **Crowning
  Question** (~−90; the order refuses to rule openly; the doctrine holds) → the
  Quiet Before. **The rupture:** the **Breakthrough & Widening** (~−28;
  universal attunement — and the **monopoly breaks by the order's own hand:**
  the attuned *and* the University dispossessed together, the corpos rushing the
  vacuum, the clergy receding, the doctrine faltering) → the **Near-Relapse**
  (~−6; the apex of the faltering — a would-be Solus, *Lucian Vane*, reaches for
  the ungoverned world and is *caught*; the Charter's trigger). *(The Handover
  into the Grounded Age is the future — see below.)*
- **The Charter & the brief interim** *(present — ≈ year 5–10)* — the cohort's
  pivot from aether-study to polity-engineering; the constitution drafted, the
  city recognizes it (**year 0**), **Steward Solvan** drafted to hold it in
  trust. He stewards not a healthy order but a **collapsing** one — the *last*
  clerical-academic steward, holding the faltered traditional governance
  together by personal authority while the people gather, bridging the dead
  basis (monopoly) to the new one (consent). ***We are here*** — the late
  Mission, the old order spent, the world modern and networked, the founding
  imminent.
- **The Grounded Age** *(the awaited future)* — the **Recognition** (the
  people ratify the Charter and elect the first PM; the steward abdicates)
  → the cooperative goes live → the history the players write forward (the
  contested instrument: presence's governance and the hollowing's capture
  both ride the same network).

*Open: Solvan's cohort and the drafting as concrete late-BC history (light);
the optional carves — a founding rector, a first-returned-attuned face — left
unspent.*

## The present — gazetteer & dramatis personae (the late-Mission interim) *[index]*

The concrete layer of the present — a **hub, not a re-description.** Most of
it already lives in the slates and the staging tree; here it's organized,
connected, and stamped with the historical strata beneath it. Per the
NPC-cost rule, **existing figures are indexed; missing ones are flagged *to
be carved*, never rattled off.** The present sits at **≈ year 5–10** — the
brief caretaker interim, the world modern and the founding imminent.

### Places (gazetteer)

- **Terminus** — the grounded city (ordinary sky). *[eternal-university-slate § The surround]*
  - **University Avenue** — the campus fronts it; the TPA stop sits here. *[EU slate]*
  - **Oldtown** — a district, and *the original Mission-settlement* — the town that grew around the first chapel. *[delivery-slate; lore: the Mission]*
- **Eternal University (the campus)** — the impossible enclave, built on the **Eternal City ruins**; strangeness seeps up from the dead core beneath. *[EU slate; staging/eternal-university]*
  - **The Gate / Arrival · the Quad · Student Services · Health Center** (the aug clinic — attunement) **· Campus Store · the Chapel** (the Mission clergy's residue) **· Duncan Hall** (the Warren dorm). *[EU slate; campus-map]*
  - **Roads:** Eternal Way · Silver Street · Limbo Lane. *[EU slate]*
  - **The Sanctuary** — beneath/within the campus: the aether-nexus, the sacred dead heart, the Museum's eventual core. *[bible: the Mission / the attuned]*
- **The Seat of Government** — the five seats (Court · Executive · Producer · Patron · Consumer houses), mostly **empty**: the steward holds four in trust and governs distributed; the consumer house alone is live. The founding's stage. *[bible: the seats]*
- **The Lounge** — the universal login landing; Dave's Bar to its north. *[lounge-slate]*
- **Dave's Bar** — the neighborhood bar, the anti-lounge. *[daves-bar-slate]*
- **The TPA network** — teleport transit; terminals at the lounge, Arrival, Duncan Hall lobby. *[fasttravel; fast-travel-slate]*
- **The Museum** — *future* (the world's-memory walk over the five ages; see below).

### People (dramatis personae) — *existing, indexed*

- **Dave's Bar:** **Dave** (owner, blank-slate master mixologist), **Mara** (day; reserved, runs inventory), **Remy** (swing; gossip), **Sloane** (night; secrets-keeper), **Augie** (weekend; storyteller). *[daves-bar-slate]*
- **Campus:** **Katie** (Duncan Hall property manager — a troll), **Dr. Limen** (the Orientation guide — a preserved brain wired into the campus), **Dr. Vance** (medical examiner — a ghoul). *[onboarding-slate; staging/eternal-university]*
- **The "Honest Count" arc** carries its own murder-mystery cast (victim, killer, witnesses). *[eternal-university-narrative-slate; staging]*

### Factions & institutions

- **The five corpos** — Veshko · Goodkin · Vionne · Hollis · Aevex (+ the **Independents**). Faceless by design (a wordmark, not a figure). *[corpos-slate]*
- **The cooperative** — the *awaited* polity (not yet founded): five seats — court, executive, and the producer/patron/consumer legislative houses; parliamentary executive, conviction voting. Held provisionally by the steward (four empty, the consumer house live). *[cooperative-slate; bible: the seats]*
- **The University** — the Mission's living heir; the clergy persist only as **echoes**.
- **The attuned** — the returned sensitives (`homo/sensitivus`); a people; **Amos the Attuned** (the herald) is the one named, long dead — see *The herald*.

### The political void — *filled by the players, not us*

The founding is the future; its cast is the real playerbase, so we **do not
author it**:

- **The Recognition's designers · the first PM · the chambers** — the real
  founding players, emergent at the founding. *Not ours to carve.*

Pre-founding figures (each a real design session):

- **The steward — *carved:* Anselm Solvan** (see *The coin*) — the reluctant
  dying caretaker; a named mortal, *not* the clergy-as-institution, and
  *not* the founder himself.
- **The herald — *carved:* Amos the Attuned** (see *The herald*) — a returned
  attuned, the forerunner who breaks the Fallow's silence and prophesies
  scale, not himself; the Mission's dawn anti-Solus. Dead long before the
  Widening. Known by epithet; surname lost to time.
- **The pretender — *carved:* Lucian Vane, the False Dawn** (see *The
  pretender*) — the recent caught would-be Solus; alive, free, irrelevant, the
  embers still warm. History, not a live carve — but the canon seedbed for an
  emergent, player-driven False-Dawn revival (an *heir* is the open antagonist
  slot).
- **A reluctant-elder clergy** — the human friction of the coming handover.
- **A named attuned** — beyond the herald, only if the returned people need
  a second face.

## The coin — Corvin Solus & Anselm Solvan *[settled]*

Two figures, two ages, **two faces of one coin** — a powerful maker facing
the same choice (*keep power, or hand it over*) and resolving it oppositely.
The surname rhyme (**Solus ↔ Solvan**) is the wink: not kin (centuries
apart), just the echo of history a chronicler catches. *Solus* = the one,
alone at the top; *Solvan* = to loosen, free, **absolve**.

- **Corvin Solus** — the **demagogue** of the Eternal Age (**pure legend** —
  the deep past, hazy in detail, certain in shape). A gifted **wizard** who
  rose through the council and **seized rule** — the seat of the **Pooling**,
  concentrating all authority because *nothing checked him* and telling
  himself it was necessary (the god-king's certainty, not evil). In his
  isolated later years his mind **went** — paranoia, grandiosity — and the
  **Reaping** was a *mad* act, a paranoid purge; the city emptied around him
  (the Fallow) and he ended **alone atop a dead city.** Remembered as *the
  fall of Solus.* *He kept it, and it killed the world.* The inversion of
  Solvan completes here: Solus **lost his mind but kept his life** (mad,
  alive, alone); Solvan **keeps his mind but loses his life** (lucid, dying,
  released).
- **Anselm Solvan** — the **steward** of the present. Born into the late
  University (an *aether-research institution* for centuries), an aether
  scholar his whole life; decades ago his **cohort cracked the implant
  breakthrough**, and he took the deepest test **on himself** — wouldn't
  risk anyone else — earning the **brain cancer** the cranial implant left
  him (the cost of the gift; the medium takes its toll), a slow thing that
  ripened across the long Widening years into the terminal illness it is now.
  Through those years — the Widening spreading, the world going modern, a
  near-relapse caught — the cohort at last **pivoted from studying the aether
  to engineering a polity** on it; Solvan, now in his sixties and failing,
  poured his last lucid years into the framing. The
  city recognized the **Charter** (year 0), and he was **drafted to steward
  *because* he is dying** — a terminal man *cannot* entrench, the perfect
  safeguard against another Solus. He holds the provisional government —
  *four of its five seats* — **in trust** (see *The seats*), the conscious
  inverse of the legend he was raised on. *He will give it away, and it will
  redeem him.*

**His death is the founding.** The cancer has been with him for years and is
terminal now; he is visibly failing, racing his mortality to reach the
**Recognition**. When the people ratify (critical mass) they don't only
found the government — they **release him**: he sees it done, hands over,
and dies. Clean exit: no retirement arc, no conflict of interest; a
buildable beat (the ratification event triggers his passing), and a real
stake for the playerbase — *your arrival is what lets the old man rest.*

*(Design note: both are the author's diegetic stand-ins — two faces, the
fall and the redemption — but the in-fiction text never says so. Never make
either *outright* the founder.)*

## The seats of government — the empty hall *[settled]*

Ratification needs a stage, not an ethereal vote, so there is a real **Seat
of Government** — and it is **five seats**: the **Court**, the **Executive**,
and the legislature's three houses, **Producer · Patron · Consumer** (the
make / fund / play dimensions; reconcile the exact count with the
cooperative-slate's chambers later).

**The steward holds four of them — empty.** Solvan wields the authority of
the Court, the Executive, and the Producer and Patron houses, but he
**governs distributed, over the aether** (the offices exist; the work
happens everywhere — work-from-home at civilizational scale), and he **will
not sit the seats**: they aren't his, they're the people's. Four empty
chairs of state are the trust *made visible* — a one-man government refusing
to occupy the throne it holds.

**The consumer house is the exception — and it's already real.** The moment
a non-founder logs on, the consumer house has a **genuine, un-invented
presence**, because *being here is the whole qualification*: you don't run
for it or earn it, you just *are* a player. It was never Solvan's to hold,
even provisionally. So the hall isn't all-empty — it's **a row of empty
chairs with one seat filling**, gaining presence with every real arrival
while the steward holds the other four alone and watches it grow.

**The founding fills the seats.** Ratification is the day the people — who
already hold the consumer house — reach **critical mass** and rise to take
the rest: the producer and patron houses seated as real makers and funders
accrue, the executive elected, the court named, the chambers alive for the
first time. The steward lets go and dies. *(So the founding is
honest-count-gated by construction — the consumer house fills with real
humans — and the lore curve and the live game's growth are the same line.)*

## The framers — the founders who wouldn't rule *[settled]*

The **framers** are Solvan's cohort: the University academics who, having
cracked the implant breakthrough, pivoted from studying the aether to
**engineering a polity** on it, and drafted the Charter. The
founding-fathers — and, like every founding convention, **not of one mind.**

**Two wings.** The **majority** won the Charter — full handover, trust the
people, structural guardrails. **Holt's opposition** lost the main argument
but **shaped the compromise**: the gradualism, the safeguards, the brakes in
the Charter are their concessions. So the founding document isn't a pure
manifesto — it's an argument with the losing side still legible in it. *The
doubts are in the constitution.* The opposition is **loyal to a one** — they
stayed, they respect the design they argued against.

**They refused to rule — even themselves.** A council of brilliant framers
running the provisional government would be a junta, a plural Solus-risk; so,
having designed against concentration, they designed against their *own*
collective hold too, and put **one dying man (Solvan)** in the seat, then
stepped back. The founders who built the throne and wouldn't sit it.

**They seed the polity's pluralism.** The cooperative doesn't begin
monolithic: it inherits the framers' split, so a **loyal opposition** is
already standing at the founding, a faction with a real good-faith case. The
framers supply the *sides*; the players fill the *seats* — so people walk
into a politics that already has fault lines worth arguing. And as the
founding nears (the consumer house filling), the opposition's question goes
live again — *"are they actually ready?"* — the honest question, not
obstruction.

**Edmund Holt** *(the one named framer)* — the opposition's **leader**, not
its only voice. A good man, not a Solus: he doubts the people are *ready*,
fears the full handover is naive, would have left a steadier hand on the
wheel (the velvet cage, offered in good faith). He respects the design he
disagrees with and stayed — the world's honest voice of the *legitimate*
doubt. Stageable: he'll look a player in the eye and ask *"are you sure
you're ready for this?"* — and he isn't wrong to ask. His arc rides the
founding: come around, or hold the doubt to the end? *(Open.)*

**The framers hold the design's own critique** (law==code, reviewed — the
world doubting itself, honestly). Holt's standing positions, for instance:
*the Sybil keystone* ("we never truly solved telling a real human from a
fake — game the count and the polity is captured") and *the Goodhart irony*
("we measure contribution to fight the hollowing, but what's measured gets
gamed — are we raising the New God's altar in our own house?"). The rest
stay the open questions the framers argue.

*Open: a second opposition figure (a future carve); the wings stay
collective.*

## The lost paradise — the prophecy's root *[settled]*

The deepest layer, the one that turns the design into a myth: **the ancient
attuned already lived the cooperative.** Creatures of presence, naturally
networked, born uncapturable — a presence-based, distributed polity *by
nature*, the cult-of-presence as a society with no hollowing in it. **That
was paradise.**

- **The fall — the first theft of the gift.** Presence in paradise was
  *given*: mutual attention flowing freely, each mind present to the others, a
  gift economy of being-with. The fall was the discovery you could **take it
  instead** — hold presence one-way, be witnessed without witnessing, become the
  center others flow toward without flowing back. The first **capture.** And the
  horror is that taking **empties you:** presence fills you only by being
  *given*, so the one who hoards it gets all the attention and becomes *no one*,
  a mouth with no face. **He hollowed himself.** *(The same act the modern Feed
  industrializes — one-way extraction of attention, an age apart.)*
- **The first-faller — real, but his name was never kept.** Unlike Solus
  (named) and Vane (named), the first-faller is **faceless on purpose:** not
  because legend forgot, but because the act *erased the self* — he became the
  first hollow, and the emptiness is what remains, not the man. He is the
  **first host the Hollow woke in** (the Hollow eternal only as the *latent
  shadow* of presence, unwoken until this first yes). It could have been
  **anyone**; he was simply first — which is the whole point: the rot is not a
  villain's invention but a **possibility latent in presence itself.** *(So the
  hollowing is older than Eternal City — paradise was its first casualty, Solus
  a recurrence, not a debut.)*
- **The shattering — innocence, not a wall.** Paradise was uncapturable not
  because it was *guarded* but because no one had ever *discovered taking* — it
  was protected by **innocence** (Eden's true shape). Once one being learned the
  gift could be hoarded, the knowledge spread; presence pooled into centers and
  peripheries; the one connected polity fractured into the **first hierarchy.**
  Paradise didn't fall to an invader — it fell to a **discovery.** *(The legend
  frames it as a curse; the structural truth is the hollowing's birth.)*
- **The loss & the rediscovery.** The knowledge died with the attuned (the
  Fallow). The framers, digging in the aether, did not *invent* the better
  way — they **rediscovered** it and built a human, technological version of
  something that *was real once.* The cooperative is a **restoration**, not a
  novel experiment; the framers are restorers, not utopians.
- **The prophecy.** Carried by the old faith — not arbitrary foretelling but
  **ancestral memory of paradise plus the promise it returns:** that one day
  the people would come and fill the empty seats. The steward's vigil is
  *awaiting a prophecy*; the players, at critical mass, are the **prophesied
  ones** who fulfill it. The founding is **paradise regained.** (Beneath it,
  the cyclical warning: the hollowing *will* return; another Solus *can*
  rise.)
- **The herald.** The Coming had a forerunner — **Amos the Attuned**, a
  **voice in the dead city** at the Fallow's end, the first to break the
  silence and prophesy the heal. The Coming's catalyst. *(Full treatment
  below — see **The herald**.)*

It **sharpens Holt's doubt** into the deepest question in the world: the
attuned held paradise because they were *unfallen* — born present,
uncapturable. *Can the fallen — capturable, present only by a device — hold
what only the unfallen ever held?* That is the gamble the founding is.

*(Influence — the Bible as **structure, not creed:** paradise lost/regained,
prophecy, the herald, the closing-and-opening of books, and the
**Christ/Antichrist coin** — Solus the *fallen Christ*, Solvan the
*redemptive Antichrist* who closes the old book so the people's can be
written. The universal monomyth, dressed in our cosmology — never literal
scripture.)*

## The herald — Amos the Attuned *[settled]*

**Amos the Attuned** — the forerunner who promised everyone. Remembered by
epithet, not family name: legend keeps *what he was*, and his surname is lost
to the deep past like everything else before the Charter. (The name is a
quiet prophet-nod — Amos the outsider who demanded justice for ordinary
people against the complacent powerful — resonant if you catch it, clean if
you don't; deliberately *not* the loud one.)

The figure who breaks the Fallow's silence and triggers the Coming. Born a
**returned attuned** (`homo/sensitivus` — *the* established people, not a new
species), one of the first quiet ones: sensitive again in the late Fallow,
before the world has a name for it, grown up on the legends and the prophecy,
thought gifted or mad. His public voice is what *starts* the recognized
return — he's the **unrecognized first sign of it**, not a figure who comes
after it.

- **What he receives, not predicts.** He doesn't *forecast* the implant — a
  futurist would, and that flattens prophecy into a smart guess. He **receives
  the promise.** Faintly touching the aether, he picks up its deep memory —
  paradise, the attuned, the promise of return — and hears the *shape* of what's
  coming (everyone present again) with no engineering for it, so he can only
  speak it as prophecy. Generations later the framers dig in the same aether and
  give that promise a **body** (the implant). **His vision and their invention
  are the same knowledge arriving twice** — once received as prophecy, once
  built as technology. He never knows the word "implant"; he knows *everyone
  will be present again.* The framers later read him as a spec. (Keeps him a
  **prophet, not a saint** — a real signal in a real medium, inside *structure,
  not creed*.)
- **Not John the Baptist — no messiah to point at.** John pointed at a *person*
  ("behold, him"). Our herald points at a **collective**: the people who'll
  come and fill the seats, not a prince who'll sit them. *"One comes after me"*
  becomes *"everyone comes after me."* He never meets the messiah because there
  **isn't** one — which *resolves* the Solvan tension rather than fighting it:
  the herald foretold the **congregation**, and Solvan is only the steward who
  holds the door until they arrive and then dies. Neither Solus nor Solvan is
  what John promised. **What he promised is the polity** — salvation as a
  people, not a prince, the cooperative thesis stated as scripture.
- **The scale truth — why a minority is only an omen.** Attunement is *cheap*;
  the system needs it **at scale.** A returned minority can't rebuild the
  polity — a handful of telepaths isn't a networked people — so the returned
  attuned are a **teaser, not a solution.** Only the implant (the Widening,
  universal attunement) actually enables the system. This is exactly *the
  dispossession*: the miracle gets **universalized into irrelevance**, the
  clinic visit replacing the wonder, *because the system can't run on a miracle,
  only on a utility.* So what the herald prophesies is **scale, not his own
  gift**: *"my gift is for everyone, and it only means anything when it is."* He
  foretells the **end of his own kind's specialness as the good news** — gives
  the gift away in prophecy generations before the implant gives it away in fact.
- **The anti-Solus.** The first hollowing was a being who looked at
  freely-given presence and saw *a thing to take.* The herald looks at a rare
  gift and sees *a thing to give to everyone.* A returned attuned who instead
  thought *"we few are chosen"* would have been a small Solus, hoarding
  presence; the herald is the inversion, and that's the whole character in one
  line. He's the **forerunner anti-Solus at the Mission's dawn**, mirroring
  **Solvan, the culminating anti-Solus at its end** — one gives the gift away,
  the other gives the throne away.
- **Dead before the dawn he named.** He heralds the Coming, prophesies the
  Widening, and is **long dead before it lands** — never sees the thing he
  promised; the prophecy outlives the prophet by generations. John-the-Baptist-
  *shaped* in the one way that survives: the forerunner who doesn't reach the
  fulfillment.

*Settled: known as **Amos the Attuned** — remembered by epithet, surname lost
to time.*

## The pretender — Lucian Vane, the False Dawn *[settled; motive settled; status: alive, free, spent]*

**Lucian Vane** — the recent, caught would-be Solus, remembered as **the False
Dawn**: the living-memory recurrence of the legend, and the third of the three
Antichrist-shaped figures — **Solus** (the original fall) → **Vane** (the false
fulfillment, caught) → **Solvan** (the true renunciation). Past, recent,
present. *(The name: **Vane** = the weathervane that turns with the crowd-wind,
*vain*, his bid *in vain*. The Solus-echo lives in his deeds and his epithet,
never a third Sol- surname — capture needs no bloodline.)*

- **The false fulfillment.** Vane didn't merely reach for power — during the
  Widening he **wore salvation's face.** He styled himself the prophecy come
  true, *the one come to fill the seats*, and rode the newly-networked feed to
  capture **attention at scale** (the human face of the Hollow's modern
  demigod, the Metric / the Feed). Not a corpo man — the independent
  attention-tyrant who nearly became the Feed's sovereign by promising the very
  dawn Amos had promised. He was **caught**, and catching him is what turned a
  cohort of aether-scholars into constitution-writers.
- **His motive — the corrected lesson.** Vane is the puzzle Solus isn't: sane,
  brilliant, and *fully aware* of how Solus ended — he **studied** the Pooling.
  So why walk the same road eyes-open? Because as an academic he formed a theory
  of Solus's failure and reasoned to the wrong half of it: *the flaw was the
  man, not the concentration.* Solus failed because Solus was mad and
  narcissistic — an **unfit holder**; concentration itself is fine in a *fit*
  hand, and Vane, disciplined and self-aware, is certain he is that hand.
  **Knowledge as inoculation:** understanding Solus convinces him he's immune —
  the academy bred its own nemesis, the scholar who learned the lesson and drew
  the wrong conclusion. And he's a **sincere rescuer**, not a throne-grabber: he
  believes the cooperative is too weak to survive the corpos and the Feed, that
  the distributed experiment is a beautiful suicide, and that a competent hand
  must take the wheel before the hollowing wins. He isn't lying when he wears
  salvation's face — **he believes it's his face.** He may even be *right about
  the disease*, only catastrophically wrong about the cure. That is why a Good
  person follows him: the calm, caring, brilliant man diagnosing a real
  sickness, whose prescription happens to be capture.
- **Why the sane man, not the mad legend, forced the Charter.** Solus's
  *madness* let the world file the Pooling under freak accident — a one-off
  sickness of the ungoverned age, something to mourn and move past. **Vane's
  *sanity* proved it was never madness at all:** capture is a standing
  temptation any competent, well-meaning person would feel on a power-bearing
  network — not a bug you wait out but a permanent feature you must build
  against, forever. Solus could be mourned; **Vane had to be answered.** He is
  the bible's thesis in person — the living argument *against* the guardrails
  ("but a *better* man could hold it"), refuted on principle: even a good, sane,
  brilliant Vane must be stopped, because the **position** corrupts the outcome
  regardless of the holder. *(A real framer-level hole, kept on purpose:
  stopping him for what his structure *would* do — before he'd done wrong — was
  not clean.)*
- **Beaten by a constitution, not a champion.** The founding order's defining
  choice was to **refuse to martyr him** — no execution (it canonizes him, and
  is the Hollow's own answer), no prison (a relic and a letter-writing
  mythology). They **made his pitch redundant by structure:** once the seats
  provably can't be seized by one man, the man whose whole pitch was *"I will
  fill them"* was disproven in public. He's **alive, free, discredited,
  unwatched** — and the freedom is the flex: no surveillance (the Hollow's
  tool), because the watch *is* the open structure. He's the live proof the
  guardrails work.
- **Intent is not control — and the people are free.** The polity can refuse
  to *make* him a symbol; it cannot stop others from *choosing* him as one.
  Leaving Vane free is **accepting the risk that he gets deified** — and some
  will. This is the world's own wager turned on its shadow: you cannot suppress
  the False Dawn without picking up the Hollow's tools, so the cooperative
  **permits the danger** as the price of not becoming the thing it fears. We
  author the **conditions** — Vane, the embers, the lore — never the
  **outcome**: whether a real False-Dawn cult forms is **emergent,
  player-driven, unauthored**, exactly as the founding itself is. *The seedbed
  is canon; the harvest is the players'.*
- **Deifying Vane is not "picking Evil."** The good-floor holds — players never
  flip alignment. To follow the False Dawn is to be **seduced**, not corrupted:
  a Good person who is *wrong*, who believes Vane was the real fulfillment and
  that *they* are the saved ones. That is the whole allegory — capture wears
  salvation's face; the Feed feels like connection. The political mirror of the
  dark-demigod arc (a good soul tangled with a false light): never an
  alignment-flip, always a real push-pull with social and narrative cost. **The
  False Dawn's followers think they're the dawn.**
- **The Solvan inversion.** Solvan, the redemptive face, dies **fulfilled** —
  gives the seats away, then goes. Vane, the malign face, **lives on, spent** —
  grasped, lost, lingers with nothing. The good man dies having given
  everything; the bad man lives having kept nothing.

*The present Vane — neither raving nor empty.* A sincere man, even spent,
**still believes he was right** — so the husk-vs-demagogue dial collapses into
something better: he doesn't court followers and he isn't hollow; he **waits**,
serenely certain the cooperative will fail and vindicate him, and that patient,
unrepentant certainty is its own gravity — the thing that draws the faithful
without his lifting a finger. *Open (the one real gap): an **heir** to the False
Dawn — Vaneism with a young face — is the uncarved present-day antagonist slot,
there whenever a live adversary is wanted.*

## The corpos — the steelman of the incumbent *[settled; founders uncarved]*

The corpos are the diegetic projection of the **board-of-directors / market
model** the cooperative is built to outperform (see *the projection stack*). So
they are written as a **steelman, never a strawman:** genuinely effective, often
genuinely good at what they make, extractive by *structure*, not malice. The
villainy is in the **incentive**, never the mustache. (Roster + ethos live in
the corpos slate — Veshko / Goodkin / Vionne / Hollis / Aevex + the
Independents; this is the *rise and meaning.*)

- **The rise — they filled the vacuum the monopoly-break left.** When the
  Widening shattered the University's monopoly on the gift, the order's authority
  evaporated and *something* had to scale the new universal field. The teaching
  order couldn't — it could *invent* the implant but never mass-produce,
  distribute, and run a planetary aether. The corpos did: they took the **pipes**
  (the implant supply chain, the field-services, the money rails — the
  corpo-run commercial banks of the banking model) *and* the **attention** (the
  **Metric / the Feed**, the Hollow's modern demigod). The power the order gave
  away, the corpos picked up. Risen in a single generation — recent, not ancient.
- **The cohort-split — the corpos and the Charter are twins.** The breakthrough
  cohort — the academics who cracked the implant — faced one choice: **give the
  gift away under structure, or own it for profit.** They split. The ones who
  chose consent became the **framers** (→ the Charter); the ones who chose to own
  it became the **corpo-founders** (→ the field-economy). Same room, same
  discovery, two roads — which is why the present is a standoff between
  *estranged siblings*, not strangers. (The corpos stay **faceless wordmarks**;
  their *founders* are name-able historical figures, the framers' cohort-peers —
  a carve left open.)
- **The deep lineage — fallen wizards: cabals → houses → corpos.** That
  cohort-split is only the *natives'* origin. The **incumbent** stream runs far
  older than Terminus and is **made of fallen makers.** In the Eternal Age the
  wizards were organized into **cabals**, each owning a slice of the world; when
  the city fell and their fiat-power evaporated, the cabals **degraded into the
  great houses** — fallen wizards who kept their (now-dimmed) craft, their
  wealth, and their *blood*, and entrenched as **hereditary dynasties** in the
  wider world (they *claim* ancient Eternal blood; the dynastic form really
  hardened in the Fallow — the claim older than the truth). Over the Mission the
  houses compounded — merchant-then-financier dynasties, intermarrying and
  feuding — and at the Widening they **consolidated into the corpos** (old houses
  merging into each). *Cabals → houses → corpos.* They are the **secular mirror
  of the clergy:** through the dark age the two were the world's only
  **creators**, but diminished — nothing near old Eternal's glory. And that is
  the corpos' deepest motive: **they tap the aether because they believe it will
  elevate them back to the glory their wizard-ancestors held** — the exact
  projection of real wizards (devs) elevated by **compute** — reaching for
  restoration the only way they know, by *owning the substrate* (the old
  fusion-impulse), never the cooperative's distributed making. So the hollowing
  keeps **two clocks:** the **acute** demagogue who flares and burns out
  (first-faller → Solus → Vane), and the **chronic** house that *never dies
  because it is inherited.* The corpo is the **fallen wizard in a corporate
  suit** — old maker-blood under a faceless wordmark (the wordmark faceless; the
  house behind it a name-able lineage, a carve left open); the slate's
  **rivalries are partly the old cabal feuds** in modern dress. *(The cabals were
  rivalrous committees, never one conspiracy, and their heirs still are — the
  danger stays structural, hereditary capital + the board model, never a secret
  council.)* The **Independents**, in this frame, are the **houseless** — makers
  who never had a cabal or a dynasty.
- **What they are — and aren't.** Not "the Hollow" (that is the principle), but
  **agents in a system that rewards capture.** A multipolar, **rivalrous** field,
  not a cartel — each corpo its own ethos; the temptation (capture pays on a
  universal field) bends them all to differing degrees, some building genuinely,
  some pure-extracting. The **Independents** (Crowsfoot Gin and kin) are the
  economic negative space — the small makers who never sold into the
  field-economy, the un-captured corner.
- **The two faces of capture.** From the one Widening came two reaches for the
  vacuum: **Vane** — the *acute, personal, political* attempt (seize the seats) —
  and **the corpos** — the *standing, institutional, economic* one (own the
  field). The cooperative is the structural answer to both: **the honest count
  against the Metric, consent against extraction.** Balancing the corpos is, in
  large part, *why the polity must exist.*
- **Why the steelman is mandatory.** The real wager is *the three-house model
  outperforms the board model* — and you earn nothing outperforming a strawman.
  So the fiction must show the corpos as a **working form:** competent,
  productive, the obvious way to run things. The myth dramatizes the bet *played
  out* (the polity wrestling the field back); the real plane has it *legally
  deferred*. The corpos are the **incumbent the model hopes to beat fairly**, not
  a dragon to slay.

## The Museum — the world's memory **[settled frame, contents open]**

The first anchor location, and the bible's walkable table of contents.
A museum is *the institution on the side of the real* — its lifeblood is
provenance, its nightmare the perfect forgery. Design facts:

- **A core-sample of two ages.** You walk *backward through time and
  downward in register*: bright secular **new-order wings** → the
  **estate-era galleries** (the great houses, the fading clergy) → the dark,
  impossibly-old **Sanctuary** at the heart (the oldest battle, relics of
  the hollowing's older masks, tended by the echo of the clergy).
- **Strange finish [settled]:** the museum is *impossibly older than the
  city* — a young civic building wrapped around an ancient sanctuary that
  was there first. The function stays dead-legible; the age is the
  weirdness.
- **A temple of myth:** it can't display the gods (they're mythic), so it
  displays the **belief** — relics of worship, cult objects, competing
  accounts on competing placards.
- **The eschatology exhibit:** the warded/empty room that holds the
  world's possible end — the empty world. A warning, not a treasure.
- **The gap is the quest surface:** every exhibit is a *claim somebody
  curated*; the space between placard and truth is where the play lives.

### The wings (= chapters of the bible) **[draft]**

- **The Founding** — the new order; the estates→cooperative turn. The
  Lawful/Chaotic axis lives here. *(Recommended first deep build — it
  sets the voice.)*
- **The Powers** — the five megacorps; naturally *sponsored* wings, each
  telling history in its own interest.
- **The Peoples** — species as mundane living people; the
  prejudice-as-projection allegory lives here.
- **The Commons** — the founding of the cooperative; the
  cooperative-funded wing fighting to be the neutral account.
- **The City** — everyday Terminus (Oldtown, University Avenue, the TPA,
  Dave's Bar as a neighborhood institution).

## Open threads (the live forks)

- **Magic, the second layer.** CMS-as-magic is settled. Unresolved: the
  *in-fiction* "universal magic accessible to all" from vision.md — is
  diegetic spellcasting a separate thing from wizard-authoring, or the
  same power at a different tier? Owes its own session.
- **How much the world says out loud.** Does Terminus *name* its enemy —
  the empty world on the museum wall, an explicit doctrine — or does the
  Sanctuary only ward against a dread it never quite states?
- **What "neutral" fully means** beyond "indifferent to experience,"
  and whether it ever becomes available to players.
- **The war-as-con** seam (above).

## Influences

- **Jesse Schell** — a game creates an *experience*; experience requires
  consciousness. (The root of the whole Evil definition.)
- **Neil Gaiman, *American Gods*** — belief-as-substrate; old gods vs new
  gods. (We drop the embodiment.)
- **Andy Weir** — real science (hard *and* soft) as derivable,
  problem-solving content; the engine actually runs the science.
- **NetHack / D&D / Tolkien** — species as *casting* by recognizable
  persona.
- **Hitchhiker's Guide** — deadpan, the absurd ancient machine; the
  world's lightness as a genre-solvent.
- **The Bible** — *structure, not creed* (the greatest story ever told,
  borrowed for its bones): paradise lost/regained, prophecy and the herald,
  the closing-and-opening of books, the Christ/Antichrist coin. Dressed in
  our own cosmology, never literal scripture.
