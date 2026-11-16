# The failure model: throw, refuse, or return nothing

> **Status: UNBUILT. A conversation the owner wants (2026-11-10), not yet had.**
> **Left:** the conversation · a taxonomy of failures and which channel each
> takes · when a refusal may be thrown · where error classes live · what
> reaches the client · pack-extensible reason vocabularies · the
> "null means something went wrong" census · floating promises · content
> errors at load time vs at use
> **Size:** a build after the conversation (doctrine, then census-then-ratchet sweeps)

## Why

The owner, 2026-11-10, during the controller-liquidity build (MR !561):
*"we need to have a whole throwables conversation and how we want to use
them in the code. because most shit just says 'if shit isn't what I
expected, return null' and just gives up instead of trying to actually model
what went wrong for some consumer somewhere, even if it's just a better
error message that bubbles up to the client."*

The earlier ruling this builds on (2026-10-29, ceramics review !437):
*"maybe we should actually have a policy instead of giving up and telling no
one"* and, rejecting "never throws": *"surely exceptions and exception
handling has a place in our platform."* That produced the one written rule
so far: **who is at fault decides the channel.**
- **The world says no:** a refusal the object returns and the controller
  words.
- **A read finds nothing:** empty, false, or a skip.
- **The code or content asked the impossible:** throw a typed error, checked
  before any change.

It lives in [spatial.md § Writes on a detached subject](../../subsystems/spatial.md),
with its census in [silent-write-census-slate.md](../tails/silent-write-census-slate.md),
which this slate absorbs as one part.

## What already exists (the machinery the conversation starts from)

- **The act convention** (controllers-are-io, !527; finished by
  controller-liquidity, !561): `ActRefusal<R>{ok:false, reason, facts?}` ·
  `ActPlan` · `ActOutcome` · and now **`ActChoices`**, a third outcome that
  is neither failure nor success: *several qualify; the caller picks,
  refuses, or asks*. Refusal reasons are **closed unions**, and the
  controller words each one.
- **The response envelope** ([response-envelope.md](../../subsystems/response-envelope.md)):
  a controller notes `controller-rejected` with a reason and detail; the
  guarded roots (`runRootGuarded`, `CommandGiver`) turn a THROW into a
  `controller-error` note for the player plus an author diagnostic
  ([diagnostics.md](../../subsystems/diagnostics.md)). So a throw already
  tells somebody, just not in the player's terms.
- **Typed errors** in `lib/errors.ts` (`DestructError`, `DetachedError`),
  plus subsystem-local ones that grew elsewhere (below).
- **The grammar's refusals** (controller-liquidity W1, W5): a bad
  `values:` word is refused by the view with the allowed list, and a
  multi-word name gets a **fitted suggestion** (`suggestion` on the note)
  that the client renders as a tappable command. That is the "better
  message that bubbles up to the client" mechanism at its best, and it
  exists for exactly one failure class.

## What controller-liquidity learned (2026-11-09/10), as evidence

Each item is a case the conversation should be able to classify.

1. **Raw throws that reached the player as controller errors**, found by
   the drive's before-record: `cool`, `dose` and `cp` threw (an object
   treated as a list, an unmet assumption); each became a named refusal.
   **Lesson:** an unexpected throw in an act is usually a missing refusal,
   not a missing catch.
2. **A content error thrown at use, mid-act:** `QuenchController` died on
   `Grade.of: unknown band 'good'` because four recipe rows named a band
   that does not exist. Throwing was right (the content was wrong), but it
   surfaced only when a player quenched. Fixed by test guards over the
   recipes. **Question:** should content errors be refused at load or
   install (the pack installer and the lint family) rather than at use?
3. **An invariant breach deep in a chokepoint:** #128. A broke store's sale
   threw at the bank's no-overdraft floor, because a creditor's share left
   the shop short of the sales tax. The floor throwing is correct (it is the
   conservation chokepoint), but the CALLER never checked first, so the
   player saw an exception. Fixed by `SettleRefused('splits-exceed')`
   checked before any money moves. **Lesson:** a chokepoint throws; its
   callers pre-check and refuse.
4. **Refusals that are thrown, not returned:** `SettleRefused` (banking,
   W7c: `Tip` falls through to the account transfer only on
   `insufficient-coin` and never shows raw exception text) and
   `BoardRefusal` (forums, W3: `not-member`, `no-subject`, failing closed).
   Both cross deep call stacks where threading a return value is awkward.
   **Question:** when may a refusal travel as an exception? The two grew
   independently, with no rule.
5. **A refusal with no reason:** `rm` refused with reason `unspecified`
   (W15's drive). A reason that says nothing is the refusal-shaped version
   of `return null`.
6. **Prose where a reason belonged:** `Soil.resolvePartFor` returned a
   sentence, so its callers could not distinguish "no such part" from
   "several match". W4 made it return the choices or a refusal with facts
   `{part, ground}`. The same debt remains in `PullOutcome` (~85 sentences,
   six hosts), the magic Apis' refusals (→ spellbook-slate § 8),
   `TakesFish`'s old prose (fixed in W12), and `TravelNode.ride`.
7. **A miss that hid its reason:** `eat apple` with the apple in a shut box
   used to say *"you have no apple"*. W2 added one deeper look whose only
   purpose is to say *"the box is shut"*. **Lesson:** "found nothing" is
   often "found it, but not in a way you can use". Resolution should report
   why when it knows.
8. **A floating promise:** `CardRegistry` fired `void markTerminalPrivacy()`
   with nothing to catch its failure, so a failed catalogue read became an
   unhandled rejection: no player note, no diagnostic, and a test run that
   "passed" and exited 1. Fixed by catch-and-warn. **Question:** a gate
   (`no-floating-promises`, or a census) for every `void <promise>` in
   domain code.
9. **Reason vocabularies across the pack line:** kernel protocol files
   declare closed reason unions, so a pack host cannot add a reason without
   a kernel MR. `TravelNode.ride` stayed prose for exactly that reason
   (W12, lens 2). **Question:** a closed kernel union, a pack-extensible
   registry of reasons, or a kernel reason plus a pack's facts.
10. **A failure that varies by world:** `pay office` errored on some worlds
    and not others (W0). It was never root-caused, and the record pinned a
    different row instead. An error nobody can classify gets routed around.

## Questions for the conversation

1. **The taxonomy.** Refusal (the world says no) · absence (a read finds
   nothing) · choices (several qualify) · content error · code error
   (programmer) · invariant breach at a chokepoint · transient
   infrastructure (Mongo not connected, a timeout). Which channel does each
   take, and what does each owe its consumer?
2. **Thrown refusals.** When (if ever) may a refusal be an exception, given
   items 3 and 4? A typed `Refusal` error base that the guarded roots word
   like a returned refusal?
3. **Where error classes live.** `lib/errors.ts` holds two; others sit
   beside their subsystem (`lib/banking/Charge.ts`). The module categories
   have no "error class" row.
4. **What reaches whom.**
   - Player: a reason, worded in world terms, plus a fitted suggestion where
     one exists. Raw exception text never.
   - Wizard: the diagnostic.
   - Script or `do`: a reason code it can branch on.
   - Client: does it get reason codes so it can render better than a
     sentence?
5. **"Null means something went wrong."** The census beyond writes: every
   `return null` or `?? null` that collapses a distinguishable failure into
   "nothing". The silent-write census is the write half of this.
6. **Content errors at load, not use.** Which validation moves to the
   installer or the lint family so a bad row never reaches a player
   (item 2).
7. **Async.** Floating promises (item 8), and errors inside scheduled
   completions, which run after the controller is gone.
8. **Pack-extensible reasons** (item 9).

## Related

- [silent-write-census-slate.md](../tails/silent-write-census-slate.md): the write half; this slate absorbs it.
- [spatial.md § Writes on a detached subject](../../subsystems/spatial.md): the current written policy.
- [response-envelope.md](../../subsystems/response-envelope.md), [diagnostics.md](../../subsystems/diagnostics.md), [command-spec.md](../../subsystems/command-spec.md) (the act convention, the quote hint).
- [call-security-pass-slate.md](./call-security-pass-slate.md) § The actor claim: a refused `ActsAs` is one more failure this model must route.
- The controller-liquidity plan's Appendix C, the defect ledger where most of the evidence above is recorded (retired with MR !561; read it at `git show 13cece156:docs/plans/controller-liquidity-plan.md`).
