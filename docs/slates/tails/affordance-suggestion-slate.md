# Affordance & suggestion slate — what should this player be offered?

> **Status: PARTIAL** — the kind axis (`requires:` on the command def),
> the three-axis table (kind/relation/state), and the two-tier
> menu-honesty/dispatch-hygiene gate all shipped, better than proposed
> → [command-spec.md § `requires:`](../../subsystems/command-spec.md)
> and [command-routing.md § The gate reports two
> tiers](../../subsystems/command-routing.md)
> **Left:** the generative `narrow()` direction (no consumer yet) · the
> relational axis still only says no · a structured reason on a disabled
> row · server-side command history (retention/privacy/persistence all
> undecided) · what a "context" is concretely for a target-less caller
> (CMS, palette) · where relevance ranking lives (server vs
> server-scores/client-orders)
> **Size:** a wave

**Captured 2026-08-10**, out of the MR review of the client-server
surface build (waves 5–6, "affordance honesty"). That build validated
108 command args so the radial menu would stop offering `attack` on a
room. Reviewing it surfaced that **the menu is one consumer of a much
larger question**, and that the build had solved a fragment while
borrowing the whole question's justification.

Related: [command-routing.md](../../subsystems/command-routing.md)
(the affordance resolver), [command-spec.md](../../subsystems/command-spec.md)
(the arg-kind rule), [mql.md](../../subsystems/mql.md) (scope + keyword
resolution), [cockpit.md](../../subsystems/cockpit.md) (the mode axis),
[shell-workspace.md](../../subsystems/shell-workspace.md) (cwd),
[perception.md](../../subsystems/perception.md) (the honest-fog rule).

---

## 1. The question

> **Given everything we know about this player right now, what should be
> offered to them?**

Today that is asked in exactly one shape:

```ts
CommandApi.resolveAffordances(target: Stuff, viewer): AffordanceResolution
```

which hardcodes *there is a target Stuff* as the entry point. That is
fine for a radial menu on an object and wrong for almost everything
else. A command palette has no target. A suggestion while typing has a
partial one. **A context menu in the CMS has no world target at all** —
but it has a workspace path, a file open, and a history of what you were
just doing, which is plenty to suggest from.

So the entry point is not "a target". It is "a context", and a target is
one thing a context may contain.

## 2. Four stages, currently collapsed into one function

| Stage | Question | Today |
|---|---|---|
| **Candidacy** | which verbs are even in play? | ✅ `viewer.getAffordances()` — the recency stack: `commandContributions` across self / peers / environment / inventory, plus competence conferrals and hosted aether updates |
| **Binding** | can each operand be filled from context? | ⚠ target only. `$focus`, MQL `scope:`, keyword search, workspace cwd and history all exist and are **not** sources here |
| **Admissibility** | would it be refused? | ⚠ validators — but **rejective only** (see § 3) |
| **Relevance** | which does the player most likely want? | ❌ nothing |

⭐ **Most of the missing inputs already exist and are simply not
connected.** `FocusedMixin` has a focus chain. `WorkspaceMixin` has a
cwd. `cockpit.mode` (shipped) says which surface the player is looking
at. MQL already does scoped keyword resolution. The command bar already
keeps history — client-side (§ 5).

⚠ **Candidacy is already good and should not be redesigned.** The
recency stack is the answer to "where does a verb come from", it already
attributes `commandSource`, and content already contributes verbs
through it — see
[command-routing.md § Why discovery is a per-giver recency
stack](../../subsystems/command-routing.md). This slate adds stages
around it, not under it.

## 3. ⭐⭐ The blocker: a validator can only say "no"

```ts
type FieldValidator = (value, field, ctx, preloaded) => string | undefined;
```

Hand it a candidate; it rejects. You **cannot ask it what would
satisfy it**. So:

- **binding** cannot use validators to *find* operands,
- **relevance** cannot rank by them,
- and any suggester must re-derive constraints the validators already
  encode — a second taxonomy, which this project has now refused three
  times.

**The kind axis shipped and closed its half** — `requires:` on the
command-def slot, the three-axis table (kind/relation/state), the
`state`-axis exclusion rationale, and the two-tier menu-honesty/
dispatch-hygiene gate are all now the documented shape:
[command-spec.md § `requires:` — every object field states what it
accepts](../../subsystems/command-spec.md) and
[command-routing.md § The gate reports two
tiers](../../subsystems/command-routing.md). What follows is what that
did **not** close.

### ❌ What `requires:` did NOT close

- **The generative direction.** `requires:` is *declarative*, so a
  candidate set could now be filtered by it rather than judged one at a
  time — but nothing does that yet. The `narrow()` half of the original
  proposal has no consumer, and building it before one exists is a cost
  with no reader.
- **The relational axis is still rejective.** `canReach` and its six
  siblings can still only say no, and they are the ones a suggester
  most needs to ask "what would satisfy you" of, because they are the
  ones that depend on the viewer.
- **A disabled row still carries only a sentence**, not a structured
  reason. The synthesised check knows exactly which mixin was missing;
  it discards that and returns prose. Cheap to add when a client wants
  it.

## 4. Scope of the menu gate — shipped

The menu-honesty-vs-dispatch-hygiene split this section proposed
shipped as the arg-kinds gate's two reported tiers; see
[command-routing.md § The gate reports two
tiers](../../subsystems/command-routing.md).

## 5. Command history — server-side

Today history is a client-local array in `CommandBar`. For **relevance**
it has to move server-side, and that is a real decision, not plumbing.

**Why server-side:**

- the client owns zero command semantics — a ranking derived from
  history is a semantic decision and cannot live in the client;
- it must survive reconnect, device change, and the multiplexed
  connections a single Avatar can hold;
- suggestion has to be **viewer-filtered** (§ 6), and only the server
  can filter honestly;
- scripting, macros and "do that again" all want the same record.

**Shape (open):** an append-only per-character ring of dispatched
commands — verb, bound operand identities, outcome status, `at`. Note
`causingCommandId` and the dispatch-response envelope already carry most
of this at dispatch time; the question is what is *kept*, not what is
observed.

⚠ **Decisions this forces, none of them made:**

- **Retention.** A ring of N, or a time window? This is the second time
  a retention policy has been the blocker on a "what happened" surface —
  the away-digest hit the same wall and was cut for it.
- **Privacy.** A command history is the most sensitive per-player record
  the server would hold: it includes who you talked to and what you
  tried and failed to do. Self-only is the obvious floor. Whether a
  wizard can read it is a real question with a real answer, and it
  should be decided **before** the store exists, not after.
- **Nouns vs verbs.** Reusing a *verb* is cheap. Reusing a *noun* means
  keeping operand identities, which is what makes the record sensitive.
  These may deserve different retention.
- **Failures are the useful part.** What you tried and were refused
  predicts what you want better than what succeeded. It is also the part
  players would least expect to be stored.
- **Is it persisted, or session-scoped?** Session-scoped sidesteps most
  of the above and still serves suggestion within a sitting.

⚠ Do **not** let this become an audit log. It exists to make suggestions
better; accountability already has `accountability_events`, provenance
has `authoring_events`, and merging the three would give one store three
retention policies and three privacy models.

## 6. Cross-cutting constraints

- ⚠⚠ **Every source DELETES; nothing is present-and-flagged.** The
  resolver already follows the honest-fog rule. Suggestion is *more*
  dangerous than the menu, because it can surface a keyword for
  something the player never targeted and may not perceive. A suggester
  that leaks the existence of a concealed thing is a worse bug than any
  the affordance build fixed.
- ⚠ **Snapshot, never a gate.** `resolveAffordances` says so explicitly:
  a verb reported `enabled` still faces the full chain when run.
  Everything downstream inherits that, and history-based suggestion will
  be the most tempting thing to over-trust.
- ⚠ **Validators must stay side-effect free.** An open radial re-resolves
  repeatedly; ranking over N candidates × M validators sharpens that from
  a convention into a performance constraint.
- **Mode says which surface, not whether.** Per
  [social-graph.md](../../subsystems/social-graph.md), idleness is the
  attention truth and the cockpit mode only says which surface counts as
  watched. A suggester keys presentation off mode and relevance off
  activity.

## 7. Open questions

*Q1 (the two-tier gate's shape) resolved: one script, two reports, both
gating — [command-routing.md § The gate reports two
tiers](../../subsystems/command-routing.md).*

1. Is the generative direction (filter a candidate set by `requires:`
   rather than judging one) worth building before a suggester exists?
   The declaration now makes it *possible*; nothing asks for it yet.
   The relational validators — the ones a suggester most needs to
   generate from — are still rejective and are the harder half.
2. What is a "context" concretely — a bag the caller fills, or a resolved
   object the server composes from the Interactive? The second is safer
   (the client cannot claim a focus it does not have) and less flexible.
3. Does relevance ranking live server-side entirely, or does the server
   ship scored candidates the client orders? The zero-semantics rule
   says the former; latency may argue the latter.
4. History retention, privacy and persistence (§ 5) — all open.
