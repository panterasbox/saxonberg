# Backstops owed slate — the conversations the soak session's fixes did not have

> **Status: UNBUILT** — written 2026-11-27, after the owner read the soak session's
> report (MRs !669 and !670, worked while the owner was away). Several fixes in those MRs
> settled a question by a RULE or by a NUMBER the session picked, not by the honest model.
> The owner: *"if the physics are honest and they're dying, then the problem isn't the
> physics, it's the content. And if the content is right and they're still dying, then
> something about the physics or rules of the game are wrong that we need to talk about
> what the real 7 lens solution is for it… the backstops aren't bad but they can be really
> really bad if they prevent me from ever dealing with the issues for real."*
> **In requirements:** §§ 1, 2, 4 → cast-in-winter (2026-11-28; the reuse ledger is at the end).
> **Left:** one conversation per section below. The headline is § 1 (the world's cast
> dying). The others are calibrations and decisions to confirm or overturn.
> **Size:** a tail per section; § 1 may be a build (the cast's daily life)

Each section says **what shipped**, **why it is a backstop or a guess**, and **the
questions** — physics first, then content, then the lenses.

## 1. ⭐⭐⭐ The world's cast was dying, and a rule now stops it

**What shipped (!669, `Vitals.diesOfNeglect`):** hypothermia, hyperthermia, starvation and
dehydration reach the dying seam only for a body somebody answers for (a player's, or an
owned chattel). The world's Cast and the strays shiver, starve and are impaired, but never
die of it. This is metabolism's `integratesLongAbsence` line, carried to the short gaps.

**Why it is a backstop:** it stops the deaths without saying why they happened. In a
probe world, the Delight's dairywoman, Hesper Vane, was found dead of the cold in her own
byre within a game day. Her core fell 305.9 → 302.6 K over ten hours, shivering, in a byre
at 270–275 K before dawn. At the measured drain, every Cast without an eating brain would
also have died of thirst within about four days. **⚠ The backstop is silent when it
fires.** Nothing says "an NPC would have died here", which is exactly the shape the owner
does not want.

**The questions:**
- **Physics:** a byre full of cows sat at the outdoor temperature. Do animals' bodies warm
  an enclosed room (occupant heat in the envelope)? Is a person's core falling 0.6 K per
  two hours at 0.63 clo and 1 °C honest, or is the regulation (shivering heat, shedding)
  off? The cold bench says an outfit at 0 °C is hypothermic by 12 hours.
- **Content:** a dairywoman works an unheated byre through a winter night in a student
  costume and a field jacket, never goes home, never lights a fire, never eats or drinks.
  Every Cast is authored this way. What is a Cast's day: where it sleeps, what it wears in
  winter, its meals and water, its warm room? Which of those are rows, and which are
  brains?
- **Lens 3a/3b:** a cast that dies silently is a broken fiction. A cast that cannot die
  is a different broken fiction, and possibly the "attention company's answer". When
  *should* an NPC die of the cold, and who notices?
- **The backstop's future — [DECIDED, the owner, 2026-11-27]:** *"they should just die if
  it's not hurting anything but if it blocks other work then leave the backstop in."* It
  blocks other work, so it stays for now: the drives need a living cast (the distillery
  hand who makes the mash, the dairy's staff, every shopkeeper and roster), and so will
  the shared demo instance. It comes OUT when the cast lives honestly (the physics and
  content questions above). Until then, the rule is: a backstop that blocks nothing is
  removed so the breakage shows.

## 2. ⭐⭐ Clothing insulation: the trapped-air number was picked

**What shipped (!669):** a worn layer adds `textiles.clo.enclosedAir` = **0.5** local clo
for the still air it holds against the body (`Attired.insulationAt`). Before, a shipped
outfit summed to 0.07 clo. The cold bench has always assumed 0.6 for shirt and trousers and
1.0 for the cast's outfit.

**Why it is a guess:** the trapped-air physics is honest (that air is most of what
clothing is worth), but **0.5 is my calibration**, aimed at the bench's numbers. Also, the
biped's `torso` slot covers only `body.torso` (16 % of the skin, the arms, can never be
covered by anything), while textiles.md says a shirt covers "torso and arms".

**The questions:** is the cloth's own `t / k` derivation right? Should the air layer
derive (from fit, from the layer's place in the stack), not be a dial? Do arms get a
covering slot, or does `torso` cover them?

## 3. ⭐⭐ A badly handled animal's blow: the per-kg factor was picked, and blunt reaches organs

**What shipped (!669):** the handling hazard's blunt energy went from `mass × risk × 0.6`
to `mass × risk × 0.02`. A wild cow now lands ~6 (the strongest authored trap is 6), and a
ewe ~0.7.

**Why it is a guess:** **0.02 is my calibration** against the content's trap energies. The
deeper finding is in the harm model. One blunt shove of energy 20 to the torso left five
trauma wounds and an exsanguination: the carcass-chain knacker was dead a step after
handling his ewe. Since organism-biology the torso holds the organs, and a blunt blow
reaches them.

**The questions:** is there ONE energy scale (traps, fists, weapons, animals), and where
is it written down? Should a blunt torso blow bleed internally at that energy? What does a
shove from a 60 kg animal honestly do?

## 4. ⭐⭐ A new player in student clothes outdoors in winter

**What happened:** soak drives now dress their characters in a greatcoat (`dress()`)
before working outdoors, because a body in the shipped student outfit goes hypothermic in
hours in a winter yard.

**The question (lens 1, 3a):** is that the intended first winter, a lesson the world
teaches, or should the starting kit and the places a newcomer goes be warmer? The drives
are now hiding whatever the answer is.

## 5. ⭐ A long hand act is the body's share (#144) — the session decided it

**What shipped (!669):** a quern grind the body cannot finish whole is cut to the share it
can ("Your arms give out before the grain does; the rest stays in the sack"). exertion.md
was updated. The issue had asked the owner which rung was intended. The session chose the
soft-limit reading without asking.

**The question:** confirm or overturn. Should the share generalize to every long hand act,
or stay a quern decision?

## 6. ⭐ The condenser carried dry (#145) — a content decision

**What shipped (!669):** the condenser's mass went from 90 to 20 kg, so a player can carry
it and set up the retort chain. The issue listed four options (a placing act for heavy
fittings, a lighter condenser, several hands or a hoist, author it seated). The session
picked the lighter condenser.

**The question:** confirm, or build the heavy-fitting act (several hands, `fit`, a hoist)
that a 90 kg copper worm in a water jacket honestly needs.

## 7. ⭐ A failing restamp no longer exits the world

**What shipped (!669):** `Thermal.restamp` catches its own failure and logs it (server log
plus diagnostics) instead of rejecting unhandled, which exited the process. Two real
defects had each killed a whole world this way.

**Why it is a backstop:** a test world exits on any unhandled rejection *on purpose*
(break loudly). The catch keeps the world up, and it also makes the next failure a log line
nobody reads.

**The question:** what is the policy for an object's failure in a running world: exit,
quarantine the object, or log loudly to somewhere that is actually read? Does the answer
differ between a test world and the live instance?

## 8. ⭐ A room that answers to the name of a thing in it (#138)

**What shipped (!669):** the Rejection fuel yard no longer answers to `clamp`. A content
edit for one room. The engine rule, that a room and a thing in it tie on the same word and
prompt, is untouched, and the Wharfside bank's `river` still ties.

**The question:** should the engine resolve that tie (the thing outranks the room it
stands in), or is it each author's job not to give a room its contents' names?

## Not backstops (recorded so nobody hunts for them)

- The open-sky pull (!670, #139): under the sky, the pull side reads the weather. That's
  an honest model fix. No drive has proven it yet (ceramics-a's setup times out on master).
- `PersistenceManager.whenQuiet` with no database answers at once: test infrastructure.
- A dog eats one portion of a carcass (`takeBite`): the honest model, already there.

## Reuse ledger for the plan (cast-in-winter, 2026-11-28)

§§ 1, 2 and 4 are being built as **cast-in-winter**
([requirements](../../requirements/cast-in-winter-requirements.md)). For every
concept that build needs: what already does it, and whether the plan should
reuse it or generalize it. Every row must be accounted for in the plan.

| concept | already doing it (shipped or in flight) | reuse / generalize |
|---|---|---|
| a body's core temperature | `lib/thermal/ThermalRegulation.ts` `integrateThermalSlice`, a comfort band (`THERMAL_DEFAULTS` in `Thermal.ts`) | **generalize** into a heat budget: metabolic W by activity, loss through clo, wind and wet. The band's cues (shivering, sweating) stay |
| work heat | `Exerting.absorbHeatLoad` (`lib/exertion/Exerting.ts`) | reuse; make it count in the losing branch |
| room temperature | `lib/biome/Atmospheric.ts` envelope, `roomHeatExchange()` on SpaceHeating / Store | **generalize**: a body answers `roomHeatExchange()` with its own output, people and animals alike |
| clothing insulation | `Wearable.getClo`, `Attired.insulationAt` (+`ENCLOSED_AIR_CLO` 0.5), `bodyInsulation()` by Meeh share | reuse; re-derive or confirm the 0.5 against published figures; fix arm coverage |
| arm coverage | biped body plan `torso` → `body.torso` only (`species-and-names/.../BodyPlan/biped.yaml`) | **generalize**: a sleeved garment's coverage reaches `body.arm.*` |
| the cold bench | `Thermal.cold.gym.test.ts` (gym job, fixed clo overrides) | reuse; re-pin to published tables, both resting and working |
| reconcile on read | growth, wounds, spoilage, soil; metabolism `integratesLongAbsence` (skips gaps over 4 h for unowned bodies) | **generalize** to bodies: closed-form reconcile on the heat budget, replacing the skip |
| watched / unwatched | the card surface's attention scoping; residency's cold-tail eviction | reuse the attention signal; no new watcher registry |
| one deliberation | `lib/behavior` deliberation beat + `Urgency` four bands × five `TaskKind`s | reuse; needs enter as candidates, no new brain per need |
| eating | `eats` brain (2 users) | fold into the needs deliberation's hunger act |
| keeping a fire | `stokes` brain (2 Cast) | reuse as the post's fire act; widen the users through supply |
| off shift | employment roster tick, `offShift: out` (10 of 89 houses) | reuse; becomes the default for a Cast |
| a role whose body is fresh | the Extra rung (identity.md) | reuse; the presence route "a role" |
| supply on places | `stocks:`, house stock lines, `fulfills`/`purchases` on seats | **ask first**: extend the house/place declarations; do not mint a new document kind unless none fits |
| the commons | market `standpipe`, `bread-counter`, `fountain`; the bar's free water | reuse; mark as commons supply |
| outdoor kit | wardrobe/outfit (player-only), `Costumed` (once-flag) | **genuinely new?** dressing from a post's peg; check whether a Locker / kept container plus `wear` covers it |
| the death report | `DiagnosticApi` store, the `errors` verb | reuse where a person reads it; no new log |
| the backstop | `Vitals.diesOfNeglect` (`lib/vitals/Vitals.ts:1649`), its 4 gates | **delete** |
| null is timeless | nothing: thermal's `baseAmbientK` returns the setpoint for a null container; metabolism's `integratesLongAbsence` skip; spoilage/growth/maturation run on the clock wherever the thing is | **genuinely new as a rule**: one stamp on leaving the narrative and one rebase on re-entry for the held subtree, not per subsystem. The plan must find every derive-on-read clock |
| act identity per turn | tropes (build-1, in flight) | coordinate: the needs turns carry it |
