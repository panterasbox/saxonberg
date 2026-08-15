# Connection-quality slate — latency as a fact about the player, never the character

**Captured 2026-08-05**, out of the freight/logistics thread. Having just
written the rule that **no economic rate may be wall-clock**, the obvious
next question was whether latency should be measured at all.

> **User: "do we want to try and measure ping though? We can do that, right?
> I'm not sure how we'd want to use it, but it might be something players
> would want to publish about themselves — at least to their party."**

> **Status: design conversation, captured. Not requirements.** ⭐ The
> *measurement* already ships; what is undesigned is **what may cross to the
> server, and in what form.**

Related: ⭐⭐ [connection-origin-slate](./connection-origin-slate.md) (**the
doctrine precedent — same problem, already solved once**),
[connection.md](../../subsystems/connection.md) (the plumbing),
[cockpit-layouts.md](../../subsystems/cockpit-layouts.md) /
[client-cockpit-slate](./client-cockpit-slate.md) (where it belongs),
[freight-slate](../builds/freight-slate.md) (⭐ **the invariant this
protects** — *no economic entitlement may depend on command-processing
rate*), [social-graph.md](../../subsystems/social-graph.md) (party /
presence surfaces), [party.md](../../subsystems/party.md),
[wizard-duty-slate](../builds/wizard-duty-slate.md) (the ops-read
discipline).

---

# Part 0 — ⭐⭐ It already ships, and the posture is already right

`packages/server/src/backend/inbound/ping.ts`:

> *"Ping handler — app-level latency probe. The browser's WebSocket
> ping/pong is opaque from JS, so **the cockpit needs its own ping to
> measure RTT.** Server replies with a `pong` carrying a server-side
> timestamp; **client subtracts to derive latency.**"*

Which means the correct posture exists **by construction, not by policy**:

| | |
|---|---|
| the server | echoes a timestamp — **stateless** |
| the client | **derives** the number |
| storage | ⭐ **none.** Nothing persisted, nothing server-side, nothing queryable |

> ⭐⭐⭐ **So the design question is not "should we measure it." It is
> "what may CROSS BACK, and in what form" — because sharing it with a party
> is the moment latency stops being client-local.**

---

# Part 1 — The rule, and what it does not say

[freight-slate](../builds/freight-slate.md) establishes:

> **No economic entitlement may depend on the rate at which a member's
> commands are processed.**

⚠ **That is a rule about FORMULAS, not about telemetry.**

> ⭐⭐ **Measure freely. Never let it reach a formula.**

⭐ And publishing it is the **transparency counterpart** to forbidding it as
an input — the same move as the wizard slate's break-glass: when an
asymmetry cannot be eliminated, make it *legible* rather than pretend it is
absent. Nothing here is in tension.

---

# Part 2 — ⚠⚠ The hazard that is not obvious

> **Ping is a proxy for geography, and geography is a proxy for
> infrastructure wealth.**

A public latency number is therefore a **discrimination vector that maps
onto real-world class** — and competitive games already use it exactly that
way (*"sorry, 300 ms, you're out"*).

⚠ This project has a deliberate interest in **defamiliarized** prejudice
(the species slate) and an **equal-protection** module in the amendment
library. **Importing a real-world discrimination axis by accident would be
an unusually bad trade** — it is the one kind of prejudice the design has no
interest in modelling.

## ⭐⭐⭐ The distinction that does the work

> **Latency is a fact about your CONNECTION, not about your CHARACTER.**

| | |
|---|---|
| **Player-scoped, never avatar-scoped** | it is out-of-fiction, so it belongs to the **cockpit**, not the world |
| **Never a world fact** | not in the record, not an attribute, not indexed, ⭐ **not queryable** |
| **Opt-in and ephemeral** | you tell your party; **nobody can filter the population** |

⭐ The gatekeeping case is foreclosed structurally rather than by rule: **you
cannot sort a roster by something that was never stored.**

---

# Part 3 — ⭐⭐⭐⭐ Publish the STATE, not the NUMBER

This is the recommendation, and it inverts the social effect at no cost:

| | reads as |
|---|---|
| *"Alice's connection is unstable"* | ⭐ **useful and generous — it invites accommodation** |
| *"Alice: 340 ms"* | ⚠ **a filter criterion** |

**Same information, opposite consequence.** And it is what people actually
want: not a measurement but an **excuse** — *"sorry, my connection"* — which
a status handles the way `AFK` already does.

> ⭐⭐ **It is also just the house rule.** This codebase prefers **bands over
> numbers** everywhere — competence, renown, traits, grade — on the standing
> principle that *no number is an authority*. Latency should band for the
> same reason, **plus a social one**.

⭐ **Precedent, exactly:** [connection-origin-slate](./connection-origin-slate.md)
already solved this shape for a sibling fact — the IP is captured, coarsened
to **country only**, **never persisted**, and the raw read stays
developer-gated. **Country-not-IP is band-not-milliseconds.** Follow it.

---

# Part 4 — Legitimate uses

- ⭐ **Client-side smoothing.** Knowing RTT lets the cockpit do better local
  echo and prediction. Pure UX, no economic surface — **and this is the use
  that already justifies the probe existing.**
- **Ops diagnostics.** An operator investigating *"the game feels bad"*
  needs latency data, and that is ordinary work. ⚠ Per-player latency
  visible to an operator is mildly surveillance-adjacent, so it rides the
  same discipline as every other such read
  ([wizard-duty-slate](../builds/wizard-duty-slate.md)): **not whether, but
  why — a purpose, declared at use.**
- **Party coordination** — the case that prompted this. Opt-in, banded,
  ephemeral, visible only to co-members.

---

# Open questions

1. ⭐ **How many bands, and where are the cuts?** *Leans three* —
   *fine / laggy / unstable* — because the actionable distinction is only
   ever *"can this person keep up."* ⚠ More bands re-create the number.
2. **Is it a status like `AFK`, or a party-card readout?** *Leans status* —
   it composes with everything that already renders presence, and it is
   self-asserted rather than measured-about-you.
3. ⚠ **Self-asserted or system-derived?** A player claiming *"unstable"*
   when they are fine costs nothing; a player hiding it also costs nothing.
   *Leans: derived client-side, published only on opt-in* — the honest
   default, with no verification, because **there is nothing here worth
   policing.**
4. ⭐ **Jitter, not latency — LEANED 2026-08-05.** For *"can this person keep
   up,"* **variance beats mean**: steady 200 ms is playable, swinging
   40–400 ms is not. So the one derived signal should be the
   **unstable-ness**, not the ping.

   > **User: "it depends on how closely people watch this stuff, but you're
   > probably right that jitter is what people care about."**

   ⭐⭐ **And the caveat argues the same way.** If most people are *not*
   watching closely, a number is wasted precision — it rewards attention
   nobody is paying. **A state surfaces only when it is actionable**, which
   is exactly the granularity an unwatched signal should have. *Nobody
   watches this closely* is an argument FOR the band, not against the
   feature.
5. **Does the operator's diagnostic read need to be per-player at all?**
   *Leans aggregate first* — a distribution answers *"is the server sick"*
   without naming anybody, and the per-player read is the break-glass case.
