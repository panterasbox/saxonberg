# The failure model: throw, refuse, or return nothing

> **Status: PARTIAL** — the model shipped with the failure-model build
> (`build/failure-model`, 2026-11): reasons as `reason` rows any pack ships,
> one thrown family (`Refusal` · `Unavailable` · `ContentError` in
> `lib/errors.ts`), the `refused` note worded at emit, scripts that stop at a
> refusal and `try … on`, content errors to the row's title holder, the
> outage refusal, late failures owned by `CommandApi.reportFailure`, and five
> census gates. See response-envelope.md, scripting.md, diagnostics.md.
> **Left:** the burn-down (unrowed codes · legacy wordings · silent catches ·
> floating promises · act nulls · prose where a reason belonged) · a kernel
> protocol taking the open `ReasonPath` arm (`TravelNode.ride`) · the
> traverse's refusals · the other six dispatcher rejections · an interrupted
> step waking at the interruption · the smaller seams (typed floating-promise
> lint · `connected()` guards · brain throws · resolution saying why ·
> `pay office` · client rendering and `help`)
> **Size:** tails (each a ratchet's burn-down), plus one wave for the wake

*Compacted 2026-11-18, at the failure-model build's sweep (MR !611).* Cut as
shipped and documented: the conversation's taxonomy and its eight questions
(answered — [response-envelope.md § `refused`](../../subsystems/response-envelope.md),
[scripting.md § A script stops at a refusal](../../subsystems/scripting.md),
[diagnostics.md § A content error goes to the row's title holder](../../subsystems/diagnostics.md),
[command-spec.md § A refusal is passed on](../../subsystems/command-spec.md),
[lint-family.md § The failure-model gates](../../lint-family.md)); the
"what already exists" survey (superseded by the build); evidence items 1–4
and 8 (fixed: missing refusals became reasons, bands refused at install,
`SettleRefused`/`BoardRefusal` folded into `Refusal`, the floating-promise
gate). The owner's ruling that started it — *"model what went wrong for some
consumer somewhere"* — is the build's premise; git has the conversation
(`git show e2eac3e28:docs/slates/tech-debt/failure-model-slate.md`).

## 1. The burn-down — each a ratchet

The gates count what is left; each falls, never rises
([lint-family.md](../../lint-family.md)):

- **Unrowed codes** (`lint:reason-rows` i) and **legacy wordings** (ii): the
  migration of each controller is mechanical — give the code a row, delete
  the wording switch, `return this.refuse(context, answer)`.
- **Silent catches**, **floating promises**, **act nulls** — the census
  halves the silent-write census (absorbed below) started.
- **Prose where a reason belonged** (evidence 6, still open): `PullOutcome`
  (~85 sentences, six hosts), the magic Apis' refusals (→ spellbook-slate
  § 8), `TravelNode.ride`.
- **A refusal with no reason** (evidence 5): `rm`'s `unspecified`.

## 2. A kernel protocol with an open arm for a pack host

`ActRefusal<ReasonPath, RefusalFacts>` exists (`lib/errors.ts`), and forestry
proves a pack's own reason end to end — but no KERNEL protocol takes the
open arm yet. `TravelNode.ride` (the TPA pack's node behind the kernel's
`TravelNode` shape) is the first that should (evidence 9).

## 3. The traverse's refusals

`go north` at a locked door is still worded by the locomotion base
(`locomotion-gate-failed`, `Exit.canTraverse`'s `gate: 'locked'` with a
sentence) — the next consumer after `open`.

## 4. The rest of the dispatcher's rejections

Three `command-rejected` reasons have rows (`needs-input`, `parse-failed`,
`bind-failed`); the other six (`unknown-verb`, `shape-fall-through`,
`missing-subcommand`, `source-not-found`, `source-affords-nothing`, the
generic) and `PromptCancelledError`'s `cancelled` / `host-disconnected` are
still worded by the dispatcher's own arms.

## 5. An interrupted step wakes at the interruption

A script awaiting an engaged step wakes at the step's EXPECTED end (and
re-checks), not when it was cut short; `Engagement.endedBy` is stamped where
a wake would fire — the attach point.

## 6. Smaller seams

- **A promise dropped with no `void`** needs a typed lint.
- **`if (!connected()) return []`** guards in logic singletons: sort each
  as a read (a legitimate skip) or a write (a defect).
- **NPC brain throws that stop at `console.warn`** (`BehavedMixin`).
- **Resolution should say why when it knows** (evidence 7: *"the box is
  shut"*, not *"you have no apple"*).
- **A failure that varies by world** (evidence 10, `pay office`) was never
  root-caused.
- **Client rendering of a refusal beyond its sentence**, and **reasons in
  `help`** — the requirements' non-goals; `refused` carries the code and
  facts they need.
- A late completion refusal from a controller that still words its own
  (`onRefused`) never reaches the context, so a script running it does not
  stop there.

## Related

- [silent-write-census-slate.md](./silent-write-census-slate.md): the write half; this slate absorbs it.
- [spatial.md § Writes on a detached subject](../../subsystems/spatial.md): the current written policy.
- [response-envelope.md](../../subsystems/response-envelope.md), [diagnostics.md](../../subsystems/diagnostics.md), [command-spec.md](../../subsystems/command-spec.md) (the act convention, the quote hint).
- [call-security-pass-slate.md](./call-security-pass-slate.md) § The actor claim: a refused `ActsAs` is one more failure this model must route.
- The controller-liquidity plan's Appendix C, the defect ledger where most of the evidence above is recorded (retired with MR !561; read it at `git show 13cece156:docs/plans/controller-liquidity-plan.md`).
