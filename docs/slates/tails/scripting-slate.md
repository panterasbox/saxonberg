# Scripting language slate (working doc)

> **Status: decided in principle, design open.** A **purpose-built scripting
> language** — our grammar, our semantics — is the medium for procedural
> content behavior. It promotes [npc-behavior-slate](./npc-behavior-slate.md)'s
> deferred `scripted-behavior` tail to a first-class subsystem, and it's the
> language the [LLM director](./llm-content-slate.md) authors in. It is the
> **special** language (reaches only what the grammar grants), distinct from
> the **general** TS `EvalScript` (reaches everything). This slate records
> *why*, specifies the **piping model** and the **command-native grammar**
> (below), and frames the remaining design work.

Working slate for **the scripting language** — the long-intended MUD
soft-scripting layer. It's the code-tier rung the behavior ladder always
pointed at, the answer to "how does an LLM express multi-stage / scheduled
behavior," and a human-authored content surface in its own right.

> *Not near-term.* This slate captures the model; nothing here is slated to
> build soon. The remaining design forks (blocks, the execution model, the
> `( )` sublanguage, scope) want a deeper grounding in scripting-language
> design before they're decided — a good candidate for a focused learning
> pass when build time approaches.

The load-bearing decisions:

1. **A designed language, not eval and not a tool-menu.** eval (general TS in
   a sandbox) is *so* powerful it subsumes everything — which is the problem,
   not a virtue: it reaches what you never sanctioned. A pre-canned reaction
   menu is the opposite failure: it caps expression to what was anticipated.
   The right surface is a **special language whose grammar *is* the boundary**
   — designed to reach exactly the set you chose. **Designing the grammar is
   how you bound, by construction, not by subtraction.** This is the honest
   form of "bounded **affordances**, free **expression**": the grammar's
   builtins are the affordances; the control flow is the expression; you
   author both sides of that line.

2. **It conducts the verb bus; it doesn't bypass it.** A statement like
   `say "..."` or `pour mug` is a **gated dispatch as the actor** — on the
   bus, attributed, permission-checked (and when the [director](./llm-content-slate.md)
   forces, force stays bounded by the *target's* perms). The language is a
   sequencing + control-flow layer **over** dispatch, never a side door
   around it. The whole command-security model survives unchanged. See
   [command-routing.md](../../subsystems/command-routing.md),
   [call-security.md](../../subsystems/call-security.md).

3. **Timing is control flow.** `wait 30s`, `every 2m`, `when <cond>` make a
   script a **coroutine the scheduler drives** (`ScheduleApi` already wraps
   callbacks in execution-context). This is the real scheduling answer: not
   "the LLM files reactive triggers" (that's a script smeared across frames),
   but "the LLM writes a procedure with `wait` in it." **One generation →
   multi-stage execution.** Round-trip cost is exactly why the per-beat live
   loop loses to a script for multi-stage action.

4. **Conditions are MQL.** `if` / `when` predicates are MQL — an existing,
   bounded, sandboxed query language. Don't reinvent queries. See
   [mql.md](../../subsystems/mql.md).

5. **`improv` is the seam back to live generation.** A primitive that
   re-invokes the LLM mid-script for a line it didn't pre-write. This unifies
   the two extremes as **one knob**: a script that's all `improv` is the live
   per-beat loop; a script with none is pure choreography. The
   [director](./llm-content-slate.md) dials the ratio.

6. **Humans author it too — the LLM is just its most prolific author.** It is
   *the* content-scripting language, not an LLM output format. This collapses
   npc-behavior's separate `scripted` and `llm` rungs: **the LLM writes the
   scripted rung**, with `improv` for the generative beats — exactly the
   slate's "scripting and LLM aren't a separate paradigm." It sits at the
   **wizard/code tier** of the authoring ladder
   ([scoped-authoring-slate](./scoped-authoring-slate.md)), with authoring
   intelligence ([authoring-intelligence-slate](./authoring-intelligence-slate.md))
   over it.

See also:

- [npc-behavior-slate.md](./npc-behavior-slate.md) — defers exactly this
  ("Scripting itself … the deferred scripting work"; the `scripted-behavior`
  brain; open Q4). This slate is that tail, promoted. A script is a brain's
  code-tier config.
- [llm-content-slate.md](./llm-content-slate.md) — *who* authors scripts at
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

## The first use case — recipes as banked command-scripts (Dave's Bar)

This slate's "next conversation" (*what needs we have around scripting*) has its
first concrete, bounded answer, and it's the **gentlest rung the language could
launch on.** In [Dave's Bar](./daves-bar-slate.md), a player learns a cocktail
by **making it once for real** (programming by demonstration): the sequence of
verbs they perform — `pour gin into shaker` · `add vermouth` · `stir` ·
`strain into glass` · `garnish with olive` · `serve` — is **banked as a named
recipe**, and afterward `make martini` *replays it.* Reading the recipe from a
book is a `claim`; *making* it is the `deed` that banks it (the advancement
model's knowing→doing / procedural-vs-conceptual, felt — the book isn't enough,
the hands have to learn it).

Why it's the right MVP:

- **It exercises the spine, none of the forks.** A recipe is a **linear sequence
  of gated verbs** — command-native, *conducts the verb bus* (decision #2),
  sequencing-over-dispatch — with **no** blocks, control flow, `wait`, MQL
  conditions, director, or `improv`. Plus exactly **one** parameter (the brand,
  `pour $gin` → `make martini with Vionne`) — the tamest touch of the
  `$`-value feature. The whole thesis, validated on the easiest possible case.
- **Replay is pre-bound, not re-parsed.** The banked script rides the piping
  model's `{command, model}` path — **skip match/assemble, run resolve +
  execute** — so replay skips the text re-parse (fast) but still
  resolve+validate+executes through the bus (gated, attributed, scope-rechecked
  every time). Real commands without the tedium; "piping skips parsing, not
  resolve."
- **It's the most accessible on-ramp the language could have.** Players author
  scripts by *doing*, never knowing they're scripting (decision #6, "humans
  author it too," at its gentlest) — and the banked script is *commands*, so
  it's inspectable and later editable: do → get a script → tweak it (the seam to
  recipe invention) → write scripts. The bar teaches what a script *is*.

**Decision:** build Dave's Bar's recipe shorthand **script-shaped from the
start** — so the bar is the scripting language's first home (alongside Activity
and metabolism), pulling forward only the **tamest rung** (banked linear
command-macros + one substitution), never the language's blocks / coroutines /
director. The language gets designed against a real bounded consumer instead of
in the abstract.

## Safe by grammar, not by trust

eval's sandbox exposes everything and is gated by *who you are* (developer).
This language's sandbox exposes **only the verb/affordance surface + scheduler
primitives**, so even untrusted authors can write it: the worst a script can
do is call gated verbs (themselves permission-checked) in a loop. The
residual risks shift from "arbitrary execution" to **resource exhaustion**
(loops → step/time/instruction limits) and **auditability** (a procedure vs a
single call). Both are bounded mechanically. Growing the world = adding
**builtins/verbs** to the grammar (authored, out-of-band), never handing the
live LLM raw code.

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

## The grammar: command-native

**Decided: command-native, in the Tcl / expect lineage — everything is a
command.** Flow control and functions are *not* grammar; they're commands that
take `{ }` blocks. So the grammar is ≈ the command grammar already parsed, plus
**pipes**, **blocks**, and **named values**:

```
pipeline := command ( "|" command )*
command  := word arg*
arg      := literal | "$" name | "(" expr ")" | "{" block "}" | objectref
script   := pipeline ( sep pipeline )*
```

Flow control falls out as ordinary commands:

```
if (gus angry) { say "Easy, friend." } else { greet gus }
each (npcs in room) { glare at it }
while (shop open) { tend_bar }
def haggle { ... }          # defines a command, invoked like any verb
```

`if` / `else` / `while` / `each` / `def` are verbs taking a block. No separate
statement grammar, no whole-language precedence parser — **the smaller the
grammar, the more the language *is* the command bus** (the prime criterion).

**Build:** extend the `CommandLineApi` tokenizer (`{}`, `()`, `$`, `|`,
statement separators, nesting, multi-line) and add a small recursive-descent
**`Parser` impl** — the pluggable parser interface already anticipates exactly
this. Not a from-scratch language; the command tokenizer + MQL do most of it.

### Two Tcl warts to avoid

Command-native done naively *is* Tcl, which earned its reputation from two
specific mistakes:

1. **Blocks are parsed, scoped *values* — not re-scanned strings.** Tcl
   re-parses `{}` on every use (its quoting hell). Ours is a first-class block
   value: parsed once, carries its scope, executed by the command it's passed
   to. This is the **keystone** — flow-control-as-commands and `wait`-suspension
   both sit on it.
2. **Infix expressions live inside `( )`.** Pure prefix (`if [< $hp 0.2]`) is
   the other wart. `( )` is an **expression / query context**: it's where
   **MQL** lives (`(npcs in room)`, `(gus angry)`) *and* where infix
   comparison/logic reads naturally (`(hp < 0.2)`). Commands stay the spine;
   `( )` is the small expression island inside an arg.

### Follow-on decisions (dependency order)

1. **Blocks** (keystone) — the parsed block value, scope capture, how a command
   invokes one. *(in progress)*
2. **Values / substitution** — `set x (look)` to capture, `$x` to read; clean
   explicit interpolation (not Tcl rescanning); `look | set x` to capture from a
   pipe.
3. **The `( )` sublanguage** — MQL predicates + infix comparison/logic; how an
   MQL set's emptiness reads as truthiness for `if` / `while`.
4. **Scope** — lexical, per-script frame; must survive suspension (ties into the
   execution model, #6).

### Blocks (keystone) — current direction, not yet decided

Explored to a direction; forks left open (build is not near-term):

- A block is a **closure** — a parsed body (a script fragment) + a captured
  **lexical** scope; inert until a command invokes it.
- It's a **first-class value**, unifying control-flow bodies, lambdas, event
  handlers, and **functions** (`def name {block}` = a named block invoked like
  a verb — "commands and functions are the same," literally).
- Invoked by the receiving command in a **child scope** (lexical parent = the
  closure env); `if` / `each` / `while` are just commands that invoke their
  block. Invoking a block **may suspend** (it can contain `wait` / `expect`),
  so blocks ride the script's coroutine.
- The block's subject is the **MQL pronoun `it`**, bound by the enclosing
  command (each-item / pipe-value / expect-match); nesting captures it with
  `set` (so blocks and `set` arrive together).
- A block **yields its last command's value**, so `if` can work in value
  position (`set x (if (c) {a} else {b})`).

**Open forks (deferred):** (1) `it`-only vs. explicit block params; (2) how
fully first-class the v1 *surface* is (store/pass/handlers vs. inline-only);
(3) suspension persistence — in-memory vs. durable across restart. These want a
deeper scripting-language pass before they're settled.

---

## The design surface (the "scripting needs" to scope next)

The **piping model** and the **command-native grammar** above are now resolved.
What remains open:

1. **Primitive vocabulary** — which verbs/effects are first-class builtins;
   how the grammar's builtin set relates to the engine's verb catalog (is a
   builtin a thin shim over a dispatched verb?); how it grows.
2. **Control flow** — pipe-composition *and* the syntax (flow control =
   commands taking blocks) are resolved (above); still open: block/scope
   mechanics (the keystone, in progress), the temporal ops (`wait` / `every` /
   `when`), and `on`-event hooks vs. polling (reuse the event bus, per
   npc-behavior's "triggers are a selector, not a DSL").
3. **Conditions** — *home resolved: the `( )` expression island (MQL + infix
   logic, above).* Still open: how an MQL set's emptiness reads as truthiness,
   and how `( )` values bind into args.
4. **Actor binding** — a script runs *as* an actor; how it binds to the host
   (an NPC running its own script) vs. the **director forcing** an actor;
   what `self` / the acting identity resolves to.
5. **The `improv` seam** — its signature (intent in, line out), how it
   re-invokes the director, what context it carries, latency/cost shape.
6. **Execution model** — scripts as coroutines on the scheduler; suspension
   across `wait`; **interruption / cancellation** (a player barges in
   mid-script → yield, abort, or `improv` a reaction); the `AbortReason`
   vocabulary; concurrency with engagement slots.
7. **Resource & isolation** — step/time/instruction limits; how the existing
   `EvalScript` isolation is reused with a narrowed grammar; the relationship
   (shared runtime? distinct interpreter?) to `EvalScript`.
8. **Grammar & semantics surface** — *syntax resolved (command-native,
   above).* Still open: the type/value model, error semantics, and how
   authoring intelligence (LSP / save-gate validation) understands it.
9. **HMR / path-resolution** — scripts as path-resolved brain config,
   re-resolved per invocation (npc-behavior's grain) → edit-to-live loop.

---

## What this slate does NOT cover (yet)

- **Who drives at runtime** (the director, force, scenes) →
  [llm-content-slate.md](./llm-content-slate.md).
- **The brain ladder / `Behaved` / engagement** →
  [npc-behavior-slate.md](./npc-behavior-slate.md).
- **Authoring intelligence over the language** (completions, diagnostics) →
  [authoring-intelligence-slate.md](./authoring-intelligence-slate.md).
- **The concrete grammar** — deliberately open; that's the next conversation
  ("what needs we have around scripting").
