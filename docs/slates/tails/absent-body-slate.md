# The absent body — how the world treats a body with no one at the controls

> **Status: UNBUILT / DESIGN CAPTURED 2026-09-19 · WIDENED 2026-09-30** —
> the combat principle is settled (option B below); the mechanism is not
> designed, and the subject turned out to be larger than combat:
>
> > **User (2026-09-30): "disconnection in general needs some attention, it's
> > supposed to basically be a 'pause' on most things but we want like player
> > managed hooks to get you out of a situation when your connection drops if
> > possible. whether thats a job or combat or whatever. it's a bigger problem
> > than just this."**
>
> **Left:** the autonomic-defense stance itself · brain-mechanism vs
> pure-stance · the grace/duration question · the interaction with
> `combat.maxBeats` · whether a distress signal is in · ⭐⭐ **the whole of
> §§ *A live hole*, *Standing orders* and *the situation matrix* below** — the
> per-situation policy, which of them a player may choose, and where a
> standing order is declared.
> ⭐⭐⭐ **And the DIRECTION settled 2026-09-30: logout is SLEEP, not a
> freeze** — see that section first; it supersedes the freeze doctrine and
> retires *"never tax absence"*. ⚠ It reverses a shipped decision
> (metabolism's linkdead freeze), which needs its own record.
> **Size:** ⚠ was *a tail (of connection + combat)*; with the widening and
> the sleep direction it is **a build** — it builds diegetic sleep, which
> metabolism.md has as future work.

Captured out of the **recovery** design conversation (the offline-healing
question, [recovery-slate](../builds/recovery-slate.md) D3). Recovery forced
it because offline healing creates a combat-log-to-heal surface — but the
conduct of an absent body is **not recovery's to build**, so it lives here.

---

## The thesis

> ⭐⭐⭐⭐ **The pause is on your *agency*, not on the *world*.** Going
> linkdead stops *you* from acting. It does not stop consequence from
> reaching your body. Your body persists, fully subject to the world, and
> takes its chances exactly where it stands.

## The problem — intent is undetectable, and both cases are real

A player's connection drops for two reasons that **cannot be told apart**:
a bad connection (involuntary) and an intentional disconnect to escape death
(a "combat log"). The engine's `loggedOut` vs `disconnected` flag
(`Application.ts:323`) is **worthless as intent** — an escaper just
force-quits or pulls the cable and reads as an involuntary drop, identical
to the honest player whose router died.

> ⭐⭐⭐ **So we never adjudicate intent.** Any rule that punishes the
> disconnected-under-threat body to catch the escaper punishes the
> bad-connection player identically; any rule that protects it rewards the
> escaper. We must rule the **same way for both**, and let the **situation**,
> not the intent, decide the outcome.

## What already exists (grounding)

- Disconnecting **never removes the body** — `onLinkdead()` is a *presence
  transition*, not a despawn (`HasInteractive.ts:117`). The avatar persists
  in the room.
- The **rescuable dying clock does NOT freeze on linkdead** (`Vitals.ts:2145`)
  — you can still die if already dying; Alt-F4 cures nothing.
- Out-of-combat wound **harm freezes** on linkdead (the reconcile arms
  re-stamp and continue), but the **combat session already ticks against a
  linkdead combatant** until `combat.maxBeats` forces a resolution
  (`combat.md:1009`). So the session already resolves against an absent
  body, to a cap.

## The principle — automate the autonomic, never the strategic

> **Automate only what any body does unattended (reflex); never what a mind
> chooses (strategy).** Equivalently: **preserve options, don't exercise
> them.**

It is also the honesty line: modeling a body's reflexes is *true*; playing a
player's strategy for them is *faking* (the world pretending they acted). The
test for any candidate behavior — **would the body do this regardless of what
the player wanted?**

| behavior | verdict |
|---|---|
| guard, absorb a blow, collapse when out of poise | ✓ autonomic — decides nothing |
| cry out / go to ground | ✓ borderline-in — a distress signal is autonomic and low-stakes |
| attack the enemy | ✗ strategic — maybe they'd have yielded |
| flee *toward home / allies* | ✗ the **direction** leaks intent (where they were headed) |
| surrender, loot, cast, use an item | ✗ strategic |

## The decision — (B) autonomic defense only

> ⭐ **The absent body holds a default *defensive stance* — it guards and
> absorbs, never attacks, never chooses a direction, then goes down into the
> rescuable dying window.** (User, 2026-09-19: "B is good.")

Rejected: **(A) a pure statue** (zero automation) — maximally honest but a
free kill, which does not respect the bad-connection player. (B) gives them a
*fighting chance* from the one reflex that is not a strategic choice —
self-preservation — without ever fabricating a plan.

⭐ **Probably *less* than an NPC brain, not more.** A full brain has goals and
tactics — the fabrication we are avoiding. This wants a deliberately
impoverished **reflex floor**: reuse combat's existing poise/guard vocabulary
as a default stance, applied by the session to any participant with no pilot.
The brain *system* may be the hook; the thing itself is not an agent.

## Why minimal automation is *enough*

The absent body does not have to be *saved* — only kept from being a **free
kill** while the situation resolves. The life-or-death resolution hands off to
layers that already exist or are being built:

- the **rescuable dying clock** (`Vitals.ts:2145`), and
- ⭐ the **medic vertical** (the recovery build) — *other people* can now
  **stabilize a downed stranger**. A body dropped by a dead router can be
  saved by a passerby: a humane outcome for the bad-connection case that costs
  the escaper nothing they did not already risk.

So we can automate almost nothing — which is exactly right, because
almost-nothing is almost-no-intent-fabrication.

## ⚠⚠ A live hole, logged 2026-09-30 — a coroutine outlives its author

Found while settling brains-versus-scripts
([agent-coordination-slate](../builds/agent-coordination-slate.md) § *Brains
and scripts*). **Not fixed; nothing coded.**

`ScriptLogic` keeps `RUNNING = new Map<string, Set<Coroutine>>()`, a
per-actor registry of running coroutines keyed on `stuffId`, and
`cancelAllImpl` resolves `currentActor()` — so **the only thing that stops a
detached background script is the player typing `stop`.** Nothing cancels or
suspends on linkdead: `Avatar.onLinkdead` fires events and touches the estate
and never reaches the registry. Coroutines ride `WorldClockApi.after`, so they
are server-side game time.

> **A player can `clock on`, start an `every 5m` script, disconnect, and the
> script keeps acting through their body on the game clock — earning wages.**

⚠ It walks straight through the gate [employment.md](../../subsystems/employment.md)
says `clock on` exists to be — *"writing the applicant a slot with the seat's
hours pays them present or not, which is the AFK wage lens 6 names a
failure"* — because **the gate is on ROSTERING and nothing gates ACTING.**

⭐ **And it is NOT a hook candidate.** See the rule below: earning while
absent is dishonest under
[uncertainty.md](../../uncertainty.md)'s abstraction law (*an abstraction is
legitimate while it still costs somebody the activity*), so **stopping is a
RULE, not a choice.** A player's coroutines suspend on presence drop and the
shift clocks off; there is no opt-out to author.

## ⭐⭐⭐ Standing orders — and the amendment they force

The 2026-09-19 principle was *automate the autonomic, never the strategic*,
and its table refuses `flee toward home / allies` because **"the direction
leaks intent."** A player-declared hook dissolves that objection completely:

> ⭐⭐⭐ **Never FABRICATE intent — but a standing order IS the player's
> intent, declared in advance.** The engine choosing to flee is fabrication.
> Executing a flee the player pre-declared is **obedience**.

So the principle stands and gains a second limb: *preserve options, don't
exercise them —* **unless the player already exercised them, on the record,
before they dropped.**

⚠ **And it must not become a combat-log button.** The slate's own doctrine is
that intent is undetectable and we rule the same for both cases, so a hook is
equally available to the escaper. The answer is not detection, it is price:

> ⭐⭐ **A hook may WITHDRAW you from jeopardy at a cost. It may never WIN you
> anything.** Fleeing costs what fleeing costs — the parting blow, the dropped
> carry, the forfeited wager, the standing hit for abandoning a fight. The
> escaper pays exactly what a present player pays to flee; the
> bad-connection player converts an **unfair** loss into a **priced** one.
> Nobody's intent is adjudicated.

⭐ **The second rule, which decides what is even offerable:**

> **The player chooses only where both answers are honest.** Where one answer
> is dishonest — earning while absent, healing under threat — it is a **rule**,
> not a hook. The hook space is exactly the set of situations with two
> defensible outcomes.

# ⭐⭐⭐ The DIRECTION — logout is sleep, not a freeze

*Decided 2026-09-30. This supersedes the freeze doctrine below, which is kept
because it is an accurate description of **what ships today** and of why the
shipped mix is coherent.*

> **User: "isnt automation better than freezing the state machine? but
> eventually they either have to reconnect or we have to log them out, which
> in our game means sleeping. we'd want to check for a bedroll or something on
> their person first I suppose."**

> ⭐⭐ **Freeze is an EXCEPTION. Sleep is a MECHANISM.**

Same outcome — you do not starve while you are away — but one is a fudge and
the other is the world working. **A body that stands in a tavern for three
days without hungering is not a body**, and *model honestly, no fudge
anywhere* is the governing principle, so lens 1 decides this rather than
taste.

⭐ It also removes the mess § *a clock versus a situation* exists to explain.
Freeze forces **two kinds of time**, and every subsystem has to know which it
is in — which is exactly why some clocks stop and some do not and nobody
could say why from first principles. **Sleep needs one kind of time.**

## It composes with the standing-orders amendment rather than fighting it

The principle is *automate the autonomic, never the strategic*:

| | |
|---|---|
| **sleeping** | ✓ **autonomic** — a tired body sleeps. In scope by default |
| **walking home / seeking shelter** | ✗ strategic; the direction leaks intent. ⭐ Out by default, **in as a standing order** (*"if I drop, seek shelter first"*) |

## The grace window is the fairness answer

Absence does not become sleep immediately. A window in which the autonomic
body simply stands (or holds the defensive stance of option B) means **a
thirty-second router blip costs nothing**, and only a sustained absence turns
in for the night. ⭐ Lens 7's answer to *who can be wronged*: the
bad-connection player is not taxed for the connection, only for **where they
were standing.**

## And the cost is already priced by shipped mechanisms

**bed > campfire > rough**, with cold doing the pricing:

- `Postures.Lie` exists; `PosturedMixin` carries **`restQuality`**, read off
  the occupied host (`getOccupiedHost()?.getRestQuality() ?? 1.0`), with
  **floor / standing as the low end**.
- a `Bed` authors `lie:1` slots accepting `lie` / `sit`.
- `restQuality` × `warmth` already feeds [thermal.md](../../subsystems/thermal.md),
  and the envelope build made **cold a real cost**.
- ⭐ `Campfire` already reads `restQuality` — camping is half-built.
- ⚠ **No bedroll row exists anywhere in content.** It would be new — and
  that is a *feature*: it gives a currently-nonexistent good **real demand
  from nothing**, which is lens 6 finding a producer rather than inventing a
  need.

⭐ So **where you disconnect matters**, which is the diegetic form of *don't
log out in a dungeon* — priced by the world rather than forbidden by a rule.

## Two things it makes honest that are currently carve-outs

- ⭐ **The far-past guard.** Today it is mechanical: *drop any gap longer than
  a plausible session*. Under sleep it is the fiction — **a month away is a
  month ASLEEP, not a month starving.** Same code, justified instead of
  excused.
- ⭐ **Reconnection becomes waking up** — a transition with prose, rather
  than a state flag flipping.

## ⚠⚠ What it costs, stated plainly

- **It reverses a shipped decision.** [metabolism.md](../../subsystems/metabolism.md)'s
  linkdead freeze goes — *"the reconcile re-stamps and integrates nothing"* —
  and that is a **change, not an addition**. It needs its own record and it
  touches metabolism, recovery, posture, residence and thermal.
- **Sleep is designed-but-unbuilt.** metabolism.md: *"no sleeping player body
  and no away-recovery… diegetic sleep is a future NPC behavior over the same
  posture × `restQuality` rest path."* This build is what builds it, for
  players first.
- ⚠ **Asleep is MORE vulnerable, not less**, so a bad connection in a bad
  place is genuinely dangerous. The mitigations are the autonomic defensive
  stance (already decided), the medic vertical, and — honestly — **that is
  what the bedroll and the inn are for.** A real risk; not to be smoothed
  over.
- ⚠ **And "never tax absence" is retired as a doctrine** in favour of
  *absence has a diegetic mechanism with a price*. Anybody citing the old
  phrase after this should be pointed here.

---

## The rule that describes what SHIPS — a clock versus a situation

⚠ **Superseded as a direction by § *logout is sleep* above**; kept because it
accurately describes today's behaviour and explains why the shipped mix is
coherent rather than sloppy.

Asked 2026-09-30: *does your body thirst while netdead, and will it drink
automatically if possible?* **No, and there is nothing to drink for** — and
the answer turns out to supply the organizing rule this slate lacked.

[metabolism.md](../../subsystems/metabolism.md) settled it already:

> **Linkdead** — when the host `isHasInteractive` and `isLinkdead()`, the
> reconcile **re-stamps and integrates nothing** (the body lingers in-world
> but doesn't tick); reconnect resumes as left.
> **Logout** — a **far-past guard** (`MAX_REASONABLE_GAP_SEC`) drops any gap
> longer than a plausible continuous session, so a relog accrues nothing.

⭐ The doctrine is named there: **"never tax absence"**, true for every
reserve for free because they all ride the same clock. (Also *"no sleeping
player body and no away-recovery — recovery only accrues while present and at
rest."*) So no auto-drink is needed: **nothing drains**, and an autonomic
drink would be the intent-fabrication this slate refuses anyway.

**Now look at what freezes and what does not:**

| | |
|---|---|
| metabolism — hunger, thirst, every reserve | **freezes** |
| out-of-combat wound harm | **freezes** |
| the rescuable **dying** clock | ⚠ **does NOT freeze** |
| an open **combat session** | ⚠ **keeps ticking** to `combat.maxBeats` |

> ⭐⭐⭐ **A CLOCK does not run against an absent body. A SITUATION already
> in motion still does.**

Hunger is a clock, so it stops. A fight and a body already dying are
situations, so they continue. **The shipped policy is coherent, not
inconsistent** — and this is a better rule than the freeze/continue/withdraw
guesswork below, which it explains.

### ⚠⚠ And it reclassifies the AFK hole

The matrix below lists *on shift, earning* as needing a new rule. **It does
not — it is violating the existing one.** The wage is a clock
(`wageRate × game-hours on shift`), and:

> **Metabolism refuses to TAX absence. Employment refuses to STOP PAYING for
> it.** Same axis, opposite failure.

⭐ So the symmetric statement of the doctrine is **a clock runs neither
against an absent body nor for it** — and the fix is not a policy decision,
it is making one clock obey the rule the other already follows. A cheaper
argument than the lens-6 one, and a stronger one.

⚠ **Which leaves a question worth asking of every other clock in the game**
before this builds: who else is running for or against an absent body?
Spoilage, maturation, growth, interest, rent and the fishery's recovery are
all clocks, and none of them is *about* the player — they are the world's, and
the world does not pause. **The rule is about clocks that read a PERSON.**

## The situation matrix — the bigger problem, enumerated

Three possible policies per situation — **freeze · continue · withdraw** — and
per row: which is honest, and whether the player may choose.

| situation | shipped today | honest policy | a hook? |
|---|---|---|---|
| **in combat** | the session ticks against a linkdead combatant to `combat.maxBeats` | autonomic defence (option B) | ⭐ **yes** — stand or withdraw-at-a-price are both defensible |
| **on shift, earning** | ⚠ nothing stops it; the coroutine hole above | **clock off** — ⭐ not a new rule, the *existing* one (a clock runs neither against an absent body nor for it) | ⛔ **no** — a rule |
| **a script running** | ⚠ nothing stops it | **suspend**, resume on reconnect | ⛔ no — a rule |
| **mid-engagement affecting only you** (a craft, a build) | aborts or holds per activity | freeze | maybe — low stakes |
| ⭐ **mid-engagement affecting SOMEBODY ELSE** (a surgery, a lease, an escort) | not designed | ⚠ **the open one** — abandoning a patient is a harm | **the interesting case** — see below |
| **in a hazard** (drowning, bleeding, freezing) | the **dying clock does not freeze**; a passerby can stabilise you | continue — the world does not pause | ⛔ no, and correctly |
| **mid-journey** | not designed | ? | ? |
| **holding an attendant lease / queue slot** | idle-eviction sweep releases it | withdraw | ⛔ no — already right |
| **holding a seat or office** | the estate touch vacates past a short clock | withdraw at the clock | ⛔ no — already right |
| **in a prompt or dialogue** | aborts | withdraw | ⛔ no |

⭐⭐ **The row that is genuinely unsolved is "affects somebody else."** Every
other row is about what happens to *you*; that one is about what your absence
does *to a third party*, and neither freeze nor withdraw is obviously honest —
a frozen surgeon leaves a patient open, a withdrawing one abandons them. It is
also the row that most needs a hook, because a player who knows they may drop
should be able to say *"if I go, close the patient and call for help."*

## Where a standing order lives

⭐ The mechanism exists: the per-character settings keyspace
([shell-environment.md](../../subsystems/shell-environment.md)'s
`EnvironmentMixin`), which is already the home for *how I want the world to
treat me*. A standing order is declared there, in advance, and read at
`onLinkdead` — **never chosen at drop time, because the player is not there
to choose.**

⚠ **And none of this touches NPCs.** An NPC has no connection, so no rung of
this applies to one — which is the same asymmetry the agent-coordination slate
settled: *`urgency` exists because an NPC has nobody to ask; a player has
themselves.* A standing order is the degenerate case of that — **the player
answering in advance for a moment when they will not be askable.**

## Open questions

- **Mechanism** — a scoped brain module, or a `CombatSession`-applied default
  stance with no module at all? (Lean: the latter — the less it "decides," the
  better.)
- **Duration / grace** — does the stance run indefinitely, or collapse to a
  dormant "gone to ground" body after a window? How does it compose with
  `combat.maxBeats` (which already caps a linkdead combatant's fight)?
- **The distress signal** — is "cry for help" in (it aids rescue) or does even
  that leak intent?
- **Out-of-combat absent bodies** — ⚠ **answered by the widening, and the
  answer is no:** the freeze-plus-convalescence story is *not* the whole
  story, because it says nothing about earning, scripts, leases, journeys or
  a patient on a table. § *the situation matrix* is the replacement.
- ⭐⭐ **The "affects somebody else" row** — the one situation with no
  defensible default. What does an abandoned patient, escort or lease get?
- **How many standing orders, and how specific?** One blanket *"get me out"*,
  or per-situation orders? A blanket order is legible and coarse; per-situation
  is expressive and is a config surface nobody will fill in.
- **Does a standing order need a reviewer?** It is the player declaring intent
  about their own absence — the same declare-and-review shape as the faculty
  profile, minus the body, because it binds nobody but its author. ⭐ Probably
  no review, and that asymmetry is worth stating.
- **What does a hook cost when the situation has no natural price?** Fleeing
  has one. Clocking off has one. *"Go home"* from the middle of a wood does
  not, and an unpriced withdrawal is the combat-log button by another name.

## Boundaries

- **NOT recovery's build.** Recovery ships only the intent-agnostic rule that
  **convalescence requires actual safety** (out of a `CombatSession`, not
  recently harmed) — identical online and offline — so no one heals under
  threat, escaper or victim. That is correct no matter how this slate resolves.
- **NOT [presence-hollowing](../builds/presence-hollowing-slate.md)** (the
  cosmological is-anyone-home axis) — this is the mundane "no one at the
  keyboard" case.
- **NOT [connection-quality](./connection-quality-slate.md)** (ping
  measurement) — that is latency as a fact about the *player*; this is conduct
  of the *character* when the player is absent.

## Cross-references

- [recovery-slate](../builds/recovery-slate.md) (the forcing consumer; the
  convalescence-safety gate) · [combat.md](../../subsystems/combat.md)
  (`combat.maxBeats`, the linkdead combatant) ·
  [connection.md](../../subsystems/connection.md) (`onLinkdead`, the
  presence transitions) · [mortality.md](../../subsystems/mortality.md) (the
  rescuable dying clock) · [behavior.md](../../subsystems/behavior.md) (the
  brain system, if the mechanism rides it) ·
  [uncertainty.md](../../docs/uncertainty.md) (resolutional randomness is
  banned — the stance is deterministic reflex, never a roll)
