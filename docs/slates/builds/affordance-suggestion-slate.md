# Affordance & suggestion slate — what should this player be offered?

**Captured 2026-08-10**, out of the MR review of the client-server
surface build (waves 5–6, "affordance honesty"). That build validated
108 command args so the radial menu would stop offering `attack` on a
room. Reviewing it surfaced that **the menu is one consumer of a much
larger question**, and that the build had solved a fragment while
borrowing the whole question's justification.

> **Status: design surface, not a build.** Nothing here is scoped. The
> one cheap, immediately-useful piece is § 6; everything else wants its
> own requirements + plan.

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
through it. This slate adds stages around it, not under it.

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

### ✅ Half of this is now BUILT — `requires:` on the slot

⚠ **This section originally proposed a `ValidatorMeta` interface** —
bolt an `axis` and a `requires` token onto each of the ~72 validator
files so the gate could read them. That was working around a missing
declaration instead of adding one. What shipped instead:

```yaml
- name: target
  type: object
  requires: SealableMixin                     # must compose it
  requires: [VisibleMixin, ContainableMixin]  # a list is AND
  requires: CombustibleMixin|FurnaceMixin     # `|` is OR
  requires: class:Agent                       # the one class escape
  requires: any                               # deliberately unconstrained
```

The kind axis moved **onto the command def**, and the ~34 validator
files that were one `MixinApi.isX` and one sentence are gone — the
framework synthesises the check at spec-load and prepends it to the
slot's chain. The refusal sentence lives on the mixin (`MixinRefusals`
in `lib/mixin.ts`).

What that closed, from this section's original list:

- ✅ **The hardcoded six-name list is gone** from
  `scripts/check-arg-kinds.ts`. The script reads one field.
- ✅ **The declaration is checkable.** A mixin name resolves against the
  `Mixins` registry or the spec does not load. `targetKind: any` was an
  unfalsifiable promise and **three of its 51 uses were wrong** (`scry
  --with`, `plant seed`, `wallet freeze card` — each with a real kind
  refusal in its controller); `plant` was fixed by extracting
  `PlantableMixin`, and the other two were bookkeeping-only.
- ✅ **The two-tier report** (§ 4) ships.
- ✅ **The `state` axis is named** in
  [command-spec.md](../../subsystems/command-spec.md), not left as a
  comment on one validator.

### The three axes, and why the third one matters

| Axis | Constrains | Where it lives | Menu behaviour |
|---|---|---|---|
| **kind** | what the target **is** | ✅ `requires:` on the slot | stable, cacheable; the only axis a menu can safely precompute |
| **relation** | the **viewer's relationship** to it — `canReach`, `mustBeInInventory` | a validator | volatile; recomputed every resolve |
| **state** | its **current condition** — already open, not lit, no charge | the **controller**, permanently | ⚠ deliberately excluded |

⚠⚠ **The `state` axis was a finding from the affordance build that was
only half-recorded.** The ignition gate deliberately asks "does fire
apply to this" and never "is it currently lit" — because a thing unlit
now is ignitable a second later, and a menu must not freeze that into a
disabled row. That call was written as a one-off comment on one
validator. Naming it as an axis is what explains, generally, **why some
refusals belong in controllers permanently** and are not a gap in the
sweep.

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

## 4. ⚠ Scope: the menu sees less than you think

`resolveAffordancesImpl` considers **verb-level object positionals
only**:

- **options are excluded deliberately** — `cd --mql` would otherwise put
  every shell verb in the menu of every object in the world;
- **subcommand args are excluded structurally** —
  `CommandDefinition.args` is empty for a subcommanded verb.

Measured: **111** fields the menu can ever see, against **157**
object-typed fields in the tree. So ~46 fields (15 options, ~31
subcommand args) are validated at dispatch and are **invisible to the
menu**.

⭐ This resolves a discrepancy the affordance build flagged as unknown:
its requirements measured **112** and the gate measured **157**. The
requirements were counting the *menu-relevant* set and were right to.

**Two different gates are hiding in one number:**

| | Scope | Premise |
|---|---|---|
| **menu honesty** | verb-level object positionals (~111) | a verb offered against a target it cannot act on is a false figure |
| **dispatch hygiene** | every object-typed field (157) | `scope:` is a search hint, not a gate, so any arg reaching a controller should declare what it accepts |

Both are legitimate. They are **not the same claim**, and the affordance
build justified the second with the first's argument. Any future gate
should report them as two tiers.

## 5. Command history — server-side

Today history is a client-local array in `CommandBar`. For **relevance**
it has to move server-side, and that is a real decision, not plumbing.

**Why server-side:**

- the client owns zero command semantics — a ranking derived from
  history is a semantic decision and cannot live in the client;
- it must survive reconnect, device change, and the multiplexed
  connections a single Avatar can hold;
- suggestion has to be **viewer-filtered** (§ 7), and only the server
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

## 6. ✅ The one cheap piece — BUILT

This section proposed `ValidatorMeta` on the validators. **What shipped
was better and is described in § 3**: the kind axis went onto the
command def as `requires:`, which deleted ~34 validator files instead of
annotating them, and made the declaration checkable rather than merely
readable.

The remaining cheap piece, if a consumer appears: **let the synthesised
check return a structured reason** alongside its sentence. It already
knows which mixin was missing.

## 7. Cross-cutting constraints

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

## 8. Open questions

1. ~~Does the two-tier gate (§ 4) become two scripts, one script with
   two reports, or one number plus a documented caveat?~~ **Answered:**
   one script, two reports, both gating.
2. Is the generative direction (filter a candidate set by `requires:`
   rather than judging one) worth building before a suggester exists?
   The declaration now makes it *possible*; nothing asks for it yet.
   The relational validators — the ones a suggester most needs to
   generate from — are still rejective and are the harder half.
3. What is a "context" concretely — a bag the caller fills, or a resolved
   object the server composes from the Interactive? The second is safer
   (the client cannot claim a focus it does not have) and less flexible.
4. Does relevance ranking live server-side entirely, or does the server
   ship scored candidates the client orders? The zero-semantics rule
   says the former; latency may argue the latter.
5. History retention, privacy and persistence (§ 5) — all open.
