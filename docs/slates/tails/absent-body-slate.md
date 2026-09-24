# The absent body — how the world treats a body with no one at the controls

> **Status: UNBUILT / DESIGN CAPTURED 2026-09-19** — the principle is
> settled (option B below); the mechanism is not designed.
> **Left:** the autonomic-defense stance itself · brain-mechanism vs
> pure-stance · the grace/duration question · the interaction with
> `combat.maxBeats` · whether a distress signal is in.
> **Size:** a tail (of connection + combat).

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

## Open questions

- **Mechanism** — a scoped brain module, or a `CombatSession`-applied default
  stance with no module at all? (Lean: the latter — the less it "decides," the
  better.)
- **Duration / grace** — does the stance run indefinitely, or collapse to a
  dormant "gone to ground" body after a window? How does it compose with
  `combat.maxBeats` (which already caps a linkdead combatant's fight)?
- **The distress signal** — is "cry for help" in (it aids rescue) or does even
  that leak intent?
- **Out-of-combat absent bodies** — the stance is a combat concept; outside
  combat the existing freeze + the safety-gated convalescence (recovery) is
  the whole story. Confirm nothing else is needed.

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
