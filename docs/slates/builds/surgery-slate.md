# Surgery slate — the operating theatre as a practice, not a verb

> **Status: DRAFTED 2026-09-23** — captured out of the recovery build's
> review (MR !278), where `operate` shipped as an honest minimum and the
> question *"what does surgery actually entail — that's its own game"* was
> asked and deferred. Design-only; nothing here is built.
> **Left:** all of it. Recovery shipped `operate` (closes a rupture, gated
> on lying + `competent`); this slate is the vertical that verb is the
> stub of.
> **Size:** a build — and a large one, tightly coupled to
> [augmentation](../tails/augmentation-slate.md) and the
> [health vertical](./health-vertical-slate.md). Sequenceable in stages.

Captured the moment the recovery `operate` verb was recognized as the same
shape that got prosthetics cut: a single wound type, a single gate, a
single scalar outcome, over in one instant. That is *first aid for the one
wound first aid cannot reach* — not surgery. This slate is what surgery
becomes when it is a practice.

---

## The thesis

> ⭐⭐⭐⭐⭐ **Surgery is not a treatment; it is the mechanism three different
> jobs run on — repairing what is torn, installing what the body lacked,
> and removing what must come out. The shipped `operate` does the first
> job, shallowly. The vertical is the operating theatre those three jobs
> share.**

Two claims fall out of that, and they are what make this a build rather
than a tail:

1. **Surgery is SUBSTRATE, not a sibling of the things it enables.** The
   [augmentation slate](../tails/augmentation-slate.md) already says, in
   writing, that *"install/remove is a medical procedure (surgery)"* and
   *"recovery's `operate` verb is the install act."* So the same procedure
   that closes a rupture is the one that seats a prosthetic, implants a
   comm chip, transplants an organ, or amputates a limb that cannot be
   saved. Design surgery once, and augmentation/prosthetics inherit their
   install act instead of inventing one.

2. **Surgery is the platform's best EPOCH axis.** A wound closed on a
   Roman battlefield, by a medieval barber-surgeon, in a Victorian
   theatre, in a modern OR, by a mend-spell, or by future nano is *the
   same mechanism with different dynamics* — the exact test
   [design-lenses.md](../../design-lenses.md) lens 5 asks for. **Anaesthesia
   is the epoch marker**; the [shipped `mend` spell](../../subsystems/harm.md)
   is already the arcane fork. Almost nothing else in the game spans the
   epochs this cleanly.

---

## What already exists (do not rebuild it)

- **`operate` / `surgery`** (recovery, MR !278; `trade-medicine`
  `OperateController`) — closes an internal **rupture** via the one body
  primitive `Vitals.applyTreatment(wound, {by:'surgery', efficacy})`.
  Gated: patient **lying** (`Postures.Lie`), surgeon **`competent`+** in
  `medicine` (an untrained hand is *refused*, not risked). Efficacy is
  `0.4 + 0.15 × band`. Fires in one tick — no duration, no during-state.
  Credits a `medicine` deed. **This is the honest minimum and it stays**:
  a rupture is the one wound a bandage cannot reach, and closing it is a
  real need. The vertical wraps it; it does not delete it.
- **`SurgicalKit`** (`trade-medicine`) — the carried `ToolItem` whose
  `surgery` capability the `operate` view asks for by name (the Whetstone
  carried-affordance shape). One kit today; a graded instrument family is
  the trade's to grow.
- **`Vitals.applyTreatment`** — the single treatment primitive every
  consumer routes through (splint / dress / dose / operate / the nurse
  brain). Surgery's outcomes must ride this, never a bespoke second engine.
- **The `mend` spell** (recovery W-B1) — the arcane fork already exists:
  it afflicts a `mending` condition + drains the caster. Magical surgery is
  a fork of the same axis, not a new system.
- **`Tariff.labourIndexed`** (recovery W-B2) — the bill already bends by
  the customer's wage × the harm's shortfall. Surgery's price inherits it.
- **The `medicine` Discipline** + `competenceBandFor` / `creditDeed`
  (advancement) — the skill axis is shipped; surgery deepens what it
  *exercises*, it does not add a Discipline.
- **[health-vertical-slate.md](./health-vertical-slate.md)** — already
  carries the governing thesis (*"healing here is a practice, not a
  resource to apply — and the practice begins with not knowing what's
  wrong"*) and logs the prior art to avoid (*"Trauma Center / Surgeon
  Simulator — surgery as a dexterity minigame"*). This slate is the
  surgical wing of that vertical; the diagnosis surface stays with
  [medic-judgment](./medic-judgment-slate.md).
- **[augmentation-slate.md](../tails/augmentation-slate.md)** — owns the
  install/replace/enhance operations and the anatomical slot regions.
  Surgery is the ACT; augmentation is the CATALOGUE of what the act seats.

> **Therefore what is genuinely new here is:** the procedure as a *timed,
> interruptible sequence with a during-state*; the surgical *team* and the
> *theatre* as content and capital; the three-job substrate (repair /
> install / remove); the epoch × magic axis made mechanical; and the
> values layer (consent, complication, who may cut).

---

## The model — a procedure is a sequence, not an instant

The one shipped shallowness that everything else follows from: `operate`
fires in a single tick. A real operation is a **durative, interruptible
engagement with a during-state**, and every phase is a seam that already
has a home in the engine:

1. **Prep / field** — the sterile field is the hygiene system already
   shipped (`HygieneMixin`, `scrub`→now bare `wash`, `wound-sepsis`). An
   unclean field seeds infection; this is not new mechanism, it is the
   sepsis seam pointed at the theatre. Instruments must be clean too.
2. **Anaesthesia** — the epoch marker (see below) and a *gate on the
   during-state*: an un-anaesthetised patient is conscious, in pain, and
   (for a competent-consent case) may refuse or thrash. This is where the
   `dying`/`unconscious` clocks and pain interact.
3. **The incision → the work → the closure** — one engaged activity
   (`EngagedMixin` / `SchedulerApi`, the `ManualBuildStep` shape splint
   already uses), NOT three verbs. Its duration scales with severity and
   inversely with competence + instrument grade. **It can be
   interrupted** — the patient can die on the table, the surgeon can be
   attacked, the anaesthesia can wear off — and an interrupted operation
   leaves an *open* wound worse than the one it started on.
4. **The during-clock** — the key new state. Like the caustic burn that
   `rinse` addresses (*"the one wound still HAPPENING"*), an open operation
   is a live process: blood loss accrues, the clock ticks, and the outcome
   is decided by whether the surgeon closes before the patient runs out.
   This is the drama the instant verb has none of.
5. **Recovery** — post-op is the recovery build's convalescence loop
   already: bed rest quality, the carer, the infection window. Surgery
   *feeds* that loop (a fresh surgical wound with its own mend law); it
   does not need a second one.

⭐ **None of these five is a new engine.** Each is an existing seam
(hygiene, engagement, the caustic during-model, convalescence) aimed at
the theatre. The build is the *composition*, not new substrate — which is
exactly what makes it a real build and not a research project.

---

## The three jobs (the substrate claim)

One procedure sequence, three payloads it can carry:

| job | what it does | who owns the catalogue |
|---|---|---|
| **Repair** | close a rupture, set an internal fracture, debride, cauterise | this slate + `harm.md` (the wound types) |
| **Install / remove** | seat or extract an augment, prosthetic, or implant | [augmentation](../tails/augmentation-slate.md) (the `Add`/`Replace`/`Enhance` catalogue) |
| **Transplant / amputate** | move an organ between bodies; remove a part that cannot be saved | this slate (the vitals `severPart` / graft seam) + augmentation |

The value of the substrate framing: **`operate <patient> [to install X \| to remove Y \| to repair Z]`** is one verb family over one procedure engine, and the payload is a catalogue row. A second surgical procedure needs zero new engine — the [second-venue test](../../design-lenses.md) applied to a verb.

---

## The epoch × magic axis (the lens that makes this special)

The mechanism holds from antiquity to the future; only the dynamics move.
The design job is to name the DIALS the epoch turns, so one engine covers
all of them:

- **Anaesthesia** — the headline dial. None (bite the bullet; the patient
  is conscious, pain and thrash are live) → herbal/soporific → ether/
  chloroform → modern general → magical sleep. The *availability* of
  anaesthesia is the single biggest determinant of what surgery a setting
  can attempt.
- **Asepsis** — open wound + no theory of infection (the sepsis seam runs
  hot) → carbolic/Listerian → sterile modern → magically warded field.
  Rides the shipped hygiene/sepsis system unchanged; only the *floor*
  moves.
- **Instruments** — bone-saw and cautery iron → graded steel → powered →
  arcane/nano. The `SurgicalKit` grade dial, already a `ToolItem`.
- **The arcane fork** — the `mend` spell is surgery-without-the-theatre
  for a caster who can pay; a *magical* operation (regrowth, arcane
  transplant) is the same procedure sequence with the anaesthesia and
  asepsis dials pinned by the spell. Magic and future tech are ONE axis
  ([arcane-science.md](../../arcane-science.md)); the theatre is where they
  meet the same patient.

⭐ This is the section that argues surgery is worth building deep: very few
systems let a player *feel* the epoch they are in as directly as being
operated on with or without anaesthesia.

---

## The team and the theatre (immersion / RP)

Surgery is the game's natural **multi-person, real-stakes cooperative
scene** — the property [design-lenses.md](../../design-lenses.md) lens 3
prizes (RP emerges from an honest sim, never a gauge):

- **Roles, not classes** — a surgeon (the `operate` competence), an
  anaesthetist (holds the anaesthesia during-state), an assistant/nurse
  (the `TendingEngagement` carer, already shipped, buys rate and can pass
  instruments / stanch bleeding). A solo surgeon can attempt small work;
  big work wants a team, and the team is *emergent*, not scripted.
- **The operating theatre** as content and capital — a room with the
  fixtures (table that pins the patient lying, the instrument tray, the
  clean-field basin, the light). A second theatre needs zero pack code
  (the [trade = mechanism, locality = expression](../../design-lenses.md)
  rule); the College of Physic's teaching theatre and a battlefield tent
  are the same fixtures at different grades.
- **Battlefield surgery** — the combat tie: a body dropped in a fight
  (`dying` clock, which does NOT freeze — see
  [mortality.md](../../subsystems/mortality.md)) is the highest-stakes
  patient, and field surgery under fire is a genuine scene the sim already
  almost supports.

---

## The values layer (gamification / self-improvement)

Lens 4 — the choice surgery forces, and who confers standing:

- **Consent.** Operating on a conscious competent patient needs their
  agreement; operating on the unconscious (the `dying` patient who cannot
  answer) is the good-faith emergency exception — and operating on the
  *unwilling* is harm, and routes to
  [accountability.md](../../subsystems/accountability.md) like any other.
  This is a real ethical fork with a diegetic ledger, not a flavour line.
- **The botch.** Recovery deliberately *refuses* the untrained rather than
  risking a botch. The vertical revisits that: with the during-clock and a
  team, a botched operation (wrong competence for the difficulty, an
  interruption, a dirty field) is a *survivable-or-not* outcome the sim
  resolves honestly — never a random death, always a consequence of the
  inputs ([uncertainty.md](../../uncertainty.md): no resolutional
  randomness — the roll never decides what your action DID).
- **Who may cut.** Standing to practise surgery is the College of Physic's
  to confer (the [guild](./guild-slate.md) / credential seam), not a
  wizard bit — an unlicensed surgeon is a diegetic status, not an engine
  lock.

---

## The economy (produces · consumes · who pays)

- **Produces:** closed wounds, seated augments, saved lives — and trained
  surgeons (the College teaching loop).
- **Consumes:** the surgeon's scarce time and competence, the theatre
  (capital), instruments (durable, wear), anaesthetic + antiseptic
  consumables (a real apothecary demand the health vertical already wants),
  and the assistant's attention.
- **Who pays:** the patient, via the shipped `labourIndexed` tariff — a
  major operation is the most expensive medical act, and the destitute pay
  base while the wealthy subsidise. The demand is unquestionably there
  first (people get ruptured, lose limbs, want augments).
- **The scarce vocation:** a surgeon is a *five-criteria real vocation*
  ([vocations.md](../../vocations.md)) — unmet demand, a
  Discipline gate, capital, consumables, and a credential.

---

## Collisions — what this touches, and who already lives there

- **Recovery / `harm.md`** — `operate` and `applyTreatment` are shipped;
  the wound-type catalogue (rupture, fracture, burn, frostbite) is the
  repair job's input. Surgery must not fork the treatment primitive.
- **[augmentation-slate](../tails/augmentation-slate.md)** — owns the
  install/replace/enhance catalogue and slot regions; this slate owns the
  ACT that seats them. **These two want designing together** (the same
  conclusion prosthetics reached). Sequencing question below.
- **[health-vertical-slate](./health-vertical-slate.md)** — surgery is its
  surgical wing; the apothecary (anaesthetic/antiseptic consumables), the
  College of Physic (who may cut), and the aid post (battlefield/triage)
  all live there.
- **[mortality.md](../../subsystems/mortality.md)** — the `dying` clock is
  the during-clock's neighbour; a patient who dies on the table is the
  corpse/forensic path.
- **[combat](../../subsystems/combat.md)** — battlefield surgery; the
  interrupted-operation case (the surgeon is attacked mid-op).
- **Terminus infirmary** — the shipped ward is the first theatre-bearing
  locality; a real theatre is a fixture upgrade there, not a new place.

---

## What stays minimal NOW vs what this slate defers

**Stays as-is (the honest minimum):** the shipped `operate` — one instant
verb that closes a rupture, gated on lying + competent, and doubles as the
augment install act. It is correct for what it does and nothing here
regresses it.

**This slate defers (the build):** the durative procedure sequence + the
during-clock; the surgical team roles; the theatre fixtures; the three-job
verb family (repair / install / remove / transplant / amputate); the
epoch × magic dials (anaesthesia, asepsis, instrument grade); the consent
+ botch values layer; the surgeon vocation + theatre capital.

---

## Open questions (for requirements, not now)

1. **One build with augmentation, or two coupled builds?** Surgery is the
   act; augmentation is the catalogue. Prosthetics review concluded they
   are coupled. Likely: **surgery first as the procedure engine, then
   augmentation ships its catalogue onto it** — but the sequencing is a
   requirements decision. (Lens read leans surgery-first: the engine is
   the shared substrate, and augmentation is one of its three payloads.)
2. **How deep does the during-clock go before it is a minigame?** The
   health vertical explicitly rejects "surgery as a dexterity minigame."
   The line to hold: the during-state is a *situation the sim resolves
   from honest inputs* (competence, team, field, anaesthesia, severity),
   never a twitch/QTE. Name the inputs; never ask for reflexes.
3. **Anaesthesia as a Material tag or a substance system?** The `dose`
   antidote precedent is a Material `antidote:<toxin>` tag; anaesthetic
   could be `anaesthetic:<depth>` the same way — cheapest path, worth
   pressure-testing against the epoch dial.
4. **Transplant — does an organ become a carriable `Thing` between two
   bodies?** The vitals `severPart` seam exists for loss; graft/transplant
   is its inverse and needs a home (this slate or augmentation).
5. **Does the College of Physic teaching theatre come with this build or
   the health vertical?** Credential-to-cut is the guild's; the teaching
   scenario is the university's.

---

## Cross-references

- [health-vertical-slate](./health-vertical-slate.md) — the parent
  vertical; the practice-not-resource thesis and the prior-art table.
- [augmentation-slate](../tails/augmentation-slate.md) — the install
  catalogue; the `operate`-is-the-install-act coupling; the deferred
  prosthetics note (2026-09-23).
- [recovery-slate](./recovery-slate.md) — where `operate`,
  `applyTreatment`, `mend`, `labourIndexed`, and hygiene/sepsis shipped.
- [harm.md](../../subsystems/harm.md) · [vitals.md](../../subsystems/vitals.md)
  · [mortality.md](../../subsystems/mortality.md) — the body substrate.
- [medic-judgment-slate](./medic-judgment-slate.md) — the diagnosis
  surface (deliberately not this slate's).
- [guild-slate](./guild-slate.md) — the College of Physic / who may cut.
- [combat.md](../../subsystems/combat.md) — battlefield surgery, the
  interrupted operation.
- [design-lenses.md](../../design-lenses.md) — the six-lens pass this slate
  is written against.
