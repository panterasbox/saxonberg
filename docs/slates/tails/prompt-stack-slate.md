# Prompt stack slate (working doc)

> **Status: PARTIAL** — server substrate, wire shape, client stack/strip/
> CommandBar, cardinality-driven MQL disambiguation and base-prompt
> rendering all shipped → [prompt.md](../../subsystems/prompt.md)
> **Left:** Tier 2 kinds `numeric` / `multiChoice` / `password` · Tier 3
> `paginated` + `quiz` · the open questions below (choice-list scaling,
> confirm/choice unification, author test-prompt overrides, quiz design)
> **Size:** a tail

Working slate for the **interactive prompt stack** — a server- and
client-side substrate for asking the player a question mid-flow,
recording their answer, and resuming whatever needed it. Disambiguation,
confirmation, choice menus, multi-step workflows (character
creation, crafting, lesson gates) all consume the same surface.

**Status.** The full Tier 1 substrate has shipped — server `PromptApi`,
the wire Note kinds, the client prompt stack/strip/CommandBar, and MQL
disambiguation via `onExcess: prompt` — see
[docs/subsystems/prompt.md](../../subsystems/prompt.md) for the
implemented surface. What remains is content-gated: Tier 2/3 kind
canon (`numeric`/`multiChoice`/`password`/`paginated`/`quiz`) plus a
handful of still-open UX questions below.

See also:

- [docs/slates/client-cockpit-slate.md § Interactive prompt stack
  (Polish A)](../tails/client-cockpit-slate.md) — names the rendering
  shape choice (inline-in-terminal) and refers the substrate work
  here.
- [docs/subsystems/response-envelope.md](../../subsystems/response-envelope.md)
  — `PromptEnvelope` lives in the same wire family as
  `DispatchResponseEnvelope` and `ActivityUpdateEnvelope`.
- [docs/roadmap.md § v1 punch list](../../roadmap.md) — Framework 11
  is the server-substrate line item.
- [docs/subsystems/mql.md](../../subsystems/mql.md) — MQL multi-match
  cardinality is the load-bearing first consumer; disambiguation
  is what closes the chain from "object MQL returned N matches"
  to "user picked one".

---

## Prompt kinds

### The kind canon (tiered)

Prompts are inherently free-form (you get a string back; the caller
interprets). Without discipline, every author rolls their own
parsing + retry + UX, and the player faces a dozen subtly-different
prompt shapes. The discipline: **a small canon of structured kinds,
each with a fixed UX pattern, augmented by a validator hook**.
Authors compose canonical kinds; new kinds require slate review.

**Tier 2 — ships when content asks**

| Kind | Notes |
|---|---|
| `numeric` | Number with `{ min?, max?, step?, integer? }`. Built-in coercion + range check. Slider affordance future. |
| `multiChoice` | Pick N of M with `{ min?, max? }`. Toggle-able chips; "Confirm selection" button to send. |
| `password` | Masked text input. Own kind (not a `text` flag) so the UX renders dots without per-flag branching. |

`mqlMany` shipped already (it rode in with Tier 1's `mqlObject`, not
gated behind content demand) — see
[prompt.md § Surface](../../subsystems/prompt.md#surface).

**Tier 3 — needs slate work**

- `paginated` — when N is too big to enumerate (50 disambiguation matches; vast item lists). Needs server-side pagination, client-side search-within-prompt, "type to filter."
- `quiz` — edtech-shaped: choice with a correctness model. Different from `choice` because the answer is graded, not just chosen. Probably composes `choice` + a server-side grading callback.

### Compose vs. custom

> *Graduated 2026-09-21* → [prompt.md § Why the kind canon is small — compose, don't invent](../../subsystems/prompt.md).

---

## Non-goals

- **Custom prompt kinds outside the canon** — see
  [prompt.md § Why the kind canon is small](../../subsystems/prompt.md).
- **`async`-command flag** — the shipped `foreground: false` opt-out
  (PromptApi's `passive` case) is shaped to support eventual
  `--async` commands but the flag itself is not v1.

(Token-format base prompt, preempting priority, prompt timeout/
expiry, modal prompts and multi-Interactive sync all shipped as
*deferred, no real use case yet* — see
[prompt.md § What ships unused or deferred](../../subsystems/prompt.md#what-ships-unused-or-deferred).
The three-way `demanding`/`passive`/`toast` priority spectrum this
slate proposed shipped as a boolean `foreground` instead; `toast`
— push nothing to the stack, just scroll an acknowledgement — never
shipped and nothing has asked for it.)

---

## Open questions

(Q1, "active-prompt visual selection when stack > 1," resolved by a
different shape than either option it posed: the shipped CommandBar
doesn't reorder or highlight-in-place — an activated prompt leaves the
waiting queue entirely for the input slot. See
[prompt.md § The prompt strip](../../subsystems/prompt.md#the-prompt-strip--one-slot-three-occupants).)

1. **Choice rendering when N is large.** 50 disambiguation matches
   is a usability problem. Server-side: should `mqlObject` truncate
   and suggest narrowing the query? Client-side: scrollable /
   searchable list? Both probably needed eventually — `paginated`
   is the Tier 3 kind that owns this.
2. **`multiChoice` response encoding.** Comma-separated tokens
   vs JSON array vs a structured payload. Lean comma-separated for
   the simple case, with the wire shape leaving room to grow.
   (`mqlMany` — the sibling kind that already shipped — resolved
   this for itself as a JSON-encoded array; worth the same choice
   for consistency when `multiChoice` lands.)
3. **Confirm-vs-choice unification.** `confirm` could be a
   special-case `choice` with `[yes, no]` + a default. v1 keeps
   them separate (the dedicated UX justifies it). Worth revisiting
   if redundancy bites.
4. **Author / admin overrides.** Should admins be able to push test
   prompts to themselves for development? Probably yes, gated under
   a `mode prompt <kind>` or `eval`-shaped surface. Lands with
   author tooling, not v1.
5. **Quiz kind design.** Edtech-load-bearing but speculative until
   content arrives. Slate-shaped work for the quiz kind specifically.

