# Scripting language slate (tail)

> **Status: PARTIAL** — the v1 engine shipped 2026-06 →
> [scripting.md](../../subsystems/scripting.md)
> **Left:** the piping model over the built `Pipeline` AST node + the
> value→field binder + the two-channel/ByValue compatibility design ·
> the block-value fork (`it`-only vs explicit params on the generic
> `Block` value — `def`'s named params are a separate mechanism and
> already shipped) · the `improv` seam · LLM-director authoring ·
> actor-binding's "director forcing" half (llm-content-slate's remit) ·
> on-event hooks vs. polling (only `when`'s poll shipped) · error
> semantics + authoring-intelligence understanding of the grammar
> **Size:** a tail

Working slate for **the scripting language** — the long-intended MUD
soft-scripting layer. It's the code-tier rung the behavior ladder always
pointed at, the answer to "how does an LLM express multi-stage / scheduled
behavior," and a human-authored content surface in its own right.

The load-bearing decisions:

Decisions 1–4 (a designed language, not eval and not a menu · it conducts
the verb bus · timing is control flow · conditions are MQL) shipped and
graduated → [scripting.md § Why a designed language — the grammar is the
boundary](../../subsystems/scripting.md). Still open, kept:

5. **`improv` is the seam back to live generation.** A primitive that
   re-invokes the LLM mid-script for a line it didn't pre-write. This unifies
   the two extremes as **one knob**: a script that's all `improv` is the live
   per-beat loop; a script with none is pure choreography. The
   [director](../builds/llm-content-slate.md) dials the ratio.

6. **Humans author it too — the LLM is just its most prolific author.** It is
   *the* content-scripting language, not an LLM output format. This collapses
   npc-behavior's separate `scripted` and `llm` rungs: **the LLM writes the
   scripted rung**, with `improv` for the generative beats — exactly the
   slate's "scripting and LLM aren't a separate paradigm." It sits at the
   **wizard/code tier** of the authoring ladder
   ([scoped-authoring-slate](./scoped-authoring-slate.md)), with authoring
   intelligence ([authoring-intelligence-slate](../builds/authoring-intelligence-slate.md))
   over it.

See also:

- [npc-behavior-slate.md](../builds/npc-behavior-slate.md) — defers exactly this
  ("Scripting itself … the deferred scripting work"; the `scripted-behavior`
  brain; open Q4). This slate is that tail, promoted. A script is a brain's
  code-tier config.
- [llm-content-slate.md](../builds/llm-content-slate.md) — *who* authors scripts at
  runtime (the director) and *how they're enacted* (force over the verb bus).
  This slate is the language they're written in.
- [shell-author.md](../../subsystems/shell-author.md) — the existing
  `EvalScript` sandbox: the **general** TS surface. The scripting language is
  the **special** surface; same isolation machinery, narrowed grammar.
- [access-slate.md](../tails/access-slate.md) — isolation / lease-scoped sandboxes;
  who may write/run a script.
- [mql.md](../../subsystems/mql.md) — the condition sublanguage *and* the
  existing object pipeline (chain operators over Stuff) the pipe generalizes.
- [command-spec.md](../../subsystems/command-spec.md) — the YAML field-`type:`
  vocabulary the pipe binds against, and the pluggable-parser seam (the
  pre-bound `{ command, model }` path piping rides).
- [response-envelope.md](../../subsystems/response-envelope.md) — the
  `DispatchResponseEnvelope`: the **effect** channel, distinct from the pipe's
  **value** channel.

---

## Why a language (and why now)

- **The LLM's native medium is code.** Fighting that with a config-menu wastes
  it; the win is to let it code — in a language *we* designed, so the surface
  is ours to control.
- **Round trips.** A 10-stage NPC bit is 10 generations under a per-beat loop,
  one generation as a script. Multi-stage and scheduled behavior *need* a
  procedural representation.
- **It's a stated goal.** The MUD soft-scripting layer has always been
  intended; the behavior ladder and the `scripted` rung were placeholders for
  it.

## The first use case — recipes as banked command-scripts (Dave's Bar) — SHIPPED

Built exactly as designed here: demonstration capture (`Transcriber`),
the chronicle knowledge ladder (`known-of` claim / `can-make` deed), and
the authored Dave's Bar demo content. See scripting.md §§
*Demonstration capture (P8)*, *The chronicle knowledge ladder (P9)*,
*Authored demo content (P10)*.

## Safe by grammar, not by trust — SHIPPED

See scripting.md § Resource governance (the sandbox): the
`AppSettings`-tiered `sliceSteps` / `maxSteps` / `maxDispatch` /
`maxDepth` limits, exactly the resource-exhaustion-not-arbitrary-
execution split described here.

---

## The piping model

Commands are the unit; scripting grows out of composing them, and **piping is
where it begins.** The pipe carries **objects** (Stuff + structured values) —
**PowerShell-style, not bash-style**: each stage receives structured data,
never re-parsed text. Query stages are **MQL** (already a Stuff pipeline via
chain operators); action stages are **verbs**; `expect` / `wait` are **commands
that suspend** and emit into the pipe. So `chest contents | where weapon | give
to gus` is three commands composed, Stuff flowing between them.

### Two output channels: effect and value

A command produces **two** outputs, on separate channels:

- **effect** — the diegetic `DispatchResponseEnvelope` (Notes/Status); what the
  scene and the player see. *Exists today.*
- **value** — the pipe output (Stuff / values) the next stage consumes. *The
  gap to build* — almost nothing produces it yet.

`give sword to gus` *narrates* the hand-over (effect) **and** *emits* the sword
downstream (value). Pipes carry the value channel; the effect channel is
unaffected. (PowerShell's separate streams.)

### The binding seam already exists

The spec is parser-pluggable: a stage can hand the dispatcher a pre-bound
`{ command, model }` that **skips match/assemble and runs only resolve +
execute** (command-spec.md's anticipated non-text path). A pipe stage *is*
that — it binds the upstream value into a field instead of parsing text. So
**piping skips parsing, not resolve**: scope and validators still gate a piped
value. You cannot pipe a Stuff you found into `give` and bypass reachability —
the field's scope re-checks at resolve. Right behavior, for free.

### Compatibility = the type system, not pairwise adapters

How you know one command's output pipes into another: **type compatibility
against the receiving field's declared `type:`** — the vocabulary the YAML
already uses (`string` / `number` / `boolean` / `object` = a Stuff / `objects`
= a Stuff list / `struct`). For Stuff that's narrowed by scope/mixin at
resolve — *the same check that validates a text-resolved arg validates a piped
one*. **No per-pair adapters** (N² and brittle); the adapter is centralized as
the type vocabulary + the one resolve step.

- **No implicit cross-type coercion.** A real mismatch is an **explicit
  transform stage** (`| contents`), never hidden magic.
- **Cardinality** is the one extra rule: a Stuff list into a singular `object`
  slot **streams** (runs the downstream once per item, PowerShell-style); into
  an `objects` slot it binds whole.

### One value, one inlet (ByValue, not ByPropertyName)

A **single typed value** flows per stage — *not* the whole record. The
**receiver** declares which one of its fields is the inlet (PowerShell's
`ValueFromPipeline`); the sender just emits a value and doesn't aim. We do
**not** adopt ByPropertyName (the whole record binding by matching field names)
— it couples unrelated commands by field-name and is the brittle corner of
PowerShell.

Richness rides **inside** the value, not alongside it: the piped value is
usually a **Stuff**, carrying its whole contract surface. The receiver "uses or
ignores" by reading methods off that one value — not by cherry-picking parallel
piped fields. A command's *other* inputs come from its explicit args, not the
pipe.

### What flows out: the direct object

The default pipe-output is the verb's **direct (primary) object** — the slot-0,
non-prepositional argument; the thing acted upon:

```
put apple in bag | foo      → the apple
give sword to gus | foo     → the sword
unlock door with key | foo  → the door
```

The oblique objects (`in bag`, `to gus`, `with key` — destination / recipient /
instrument) are **not** the default output. You reach them by **navigating the
world relationship the verb just established** (after `put apple in bag`,
`apple.container == bag`, so a downstream stage reads the bag off the piped
apple), by **explicit reference** (`bag | foo`), or via a command's **declared
non-default output**. The default is mechanically definable (slot-0 vs.
prepositional), so it needs no per-verb authoring — only exceptions declare.

### The two per-command declarations (cheap defaults)

Not adapters — two small declarations, each with a default that makes most
verbs pipeable for nothing:

| Declaration | What | Default |
|---|---|---|
| **inlet** | which field accepts pipeline input | the primary object field |
| **outlet** | the value + type it emits downstream | pass-through the **direct object** |

Only **producers** declare a custom outlet: `look` emits room contents, an MQL
stage emits its set, `expect` emits the matched event. Everything else
pass-throughs, so `chest contents | where weapon | give to gus` works with zero
piping-specific authoring.

### What's left to build (narrow)

The **value-output channel** (separate from the envelope), the **inlet/outlet
markings** on the YAML, and the **streaming binder**. The binding rule **reuses
resolve**, and the type system **is** the command-spec types + MQL — neither is
invented here.

---

## The grammar: command-native — SHIPPED

The command-native grammar (pipeline/command/arg/script), flow control
as ordinary block-taking commands, the two Tcl warts avoided (blocks as
parsed scoped values not re-scanned strings; infix confined to the `( )`
island), and all four follow-on decisions (blocks, values/substitution,
the `( )` sublanguage, scope) are built exactly as designed here — see
scripting.md §§ *Grammar & the parser (P1)*, *The block keystone and
`( )` island*, *Scope, frames & `$`*. Code: `lib/script/ast.ts`,
`lib/script/Block.ts`, `lib/script/Scope.ts`, `lib/script/Expression.ts`,
`lib/command/parsers/script.ts`.

### Blocks (keystone) — the direction shipped; three forks still open

The closure shape, first-class-value status, child-scope invocation +
coroutine-suspendability, and last-value yield are all shipped as
designed here — see scripting.md § The block keystone and `( )` island
and § Control flow as commands. One nuance not yet true: `it`-binding
on `each-item` is shipped; `pipe-value` / `expect-match` binding waits
on the piping model and `expect` above (both still open).

**Open forks (deferred):** (1) `it`-only vs. explicit block params —
note `def`'s named positional params (shipped) are a *separate*
mechanism (`ScriptDef`, not a generic `Block`), so this fork is really
about whether the generic `Block` value itself should ever take named
params beyond `it`; (2) how fully first-class the v1 *surface* is
(store/pass/handlers vs. inline-only); (3) suspension persistence —
in-memory vs. durable across restart. These want a deeper
scripting-language pass before they're settled.

---

## The design surface (the "scripting needs" to scope next)

The **piping model** and the **command-native grammar** above are now resolved.
What remains open:

Primitive vocabulary (#1), conditions (#3), execution model (#6),
resource & isolation (#7), and HMR/path-resolution (#9) are now all
shipped — see scripting.md §§ *Grammar & the parser*, *The block
keystone and `( )` island* (MQL-emptiness-as-falsiness centralized in
`isTruthy`), *Coroutines*, *Resource governance*, *The store*.
`builtins.ts`'s own docstring answers #1's "how it grows": *"growing
the language is adding affordance verbs (over the bus) or, rarely, a
new intrinsic builtin (authored, out-of-band)."*

Still open:

2. **Control flow** — pipe-composition *and* the syntax (flow control =
   commands taking blocks) are resolved (above); block/scope mechanics and
   the temporal ops (`wait` / `every` / `when`) shipped; still open:
   `on`-event hooks vs. polling (only `when`'s poll is built; reuse the
   event bus, per npc-behavior's "triggers are a selector, not a DSL").
4. **Actor binding** — a script runs *as* an actor (shipped — the
   Interpreter takes the actor as a constructor param, and P10's
   `invokeByPath` is how an NPC runs its own script); still open: the
   **director forcing** an actor (llm-content-slate's remit) and what
   `self` resolves to when forced rather than run as the host.
5. **The `improv` seam** — its signature (intent in, line out), how it
   re-invokes the director, what context it carries, latency/cost shape.
   Confirmed unbuilt: no `improv` anywhere in `lib/script/`.
8. **Grammar & semantics surface** — *syntax resolved (command-native,
   above); the type/value model shipped (`Value.ts`).* Still open:
   error semantics, and how authoring intelligence (LSP / save-gate
   validation) understands it.

---

## What this slate does NOT cover (yet)

- **Who drives at runtime** (the director, force, scenes) →
  [llm-content-slate.md](../builds/llm-content-slate.md).
- **The brain ladder / `Behaved` / engagement** →
  [npc-behavior-slate.md](../builds/npc-behavior-slate.md).
- **Authoring intelligence over the language** (completions, diagnostics) →
  [authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md).
- ~~The concrete grammar — deliberately open~~ — superseded: the grammar
  shipped (command-native, above; scripting.md § Grammar & the parser).
