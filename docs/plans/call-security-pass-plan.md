# The call-security pass — the actor claim and the compulsion gate — implementation plan

Executes [call-security-pass-requirements](../requirements/call-security-pass-requirements.md).
**Kind:** refactor/sweep with a security edge. **Lead end:** kernel. The
engine learns to say who is acting (a person, an object acting as itself,
or the named system); every protective method checks the actor it was
handed against that answer; and a command run on a body that is not the
actor's own is refused unless the verb allows it and the body's own player
says yes at that moment. Slate: [call-security-pass-slate](../slates/tech-debt/call-security-pass-slate.md)
§ *The actor claim* and § *Reuse ledger for the plan*.

Paths below are relative to `packages/server/src/mud/` unless they start
`packages/`, `docs/` or `e2e/`.

## Requirements problems

Scope is not changed by any of these. Each states the reading this plan
builds. ✅ **Owner ruled 2026-11-18:** problem 1's reading (never = giving
away; a counter purchase may ask consent) and problem 2's (the gate words
the command, the asker states the price first) are accepted, and the
requirements were amended to match; the size of the plan was accepted too.

1. ⛔ **The never-list forbids the verb the drive compels.** § Compulsion
   says *never, whatever a verb says: … title, and money leaving the body*.
   The Realtor's `title buy` (Collisions, drive steps 7–8, the third
   acceptance criterion) acquires title and spends the buyer's money.
   Both cannot hold as written. **Reading built:** the never-list is about
   *disposing* — speech, conferral, membership, title **out** (`title
   transfer`/`subdivide`/`publish`/`offline`) and money **given** (`pay`,
   `tip`, the `bank`/`house`/`wallet` verbs). A *purchase at a counter at a
   posted price* (`title buy`; later `buy`/`order`/`rent`) may declare
   `consent`. If the owner's rule is the stricter one, D12's ratchet ceiling
   is 0, steps 7–8 cannot pass, and the Realtor must instead hand the player
   a command to run themselves — a requirements change.
2. **The consent question cannot honestly carry the price.** The example
   sentence (*"…buy plot 4 for 120 zorkmids. Let them?"*) holds a fact only
   the asker knows. Words supplied by the asker can lie about what will run.
   **Built:** the gate words the question from the one thing the asker
   cannot falsify, the command line after the body's own alias expansion
   (*"The realtor would have you run `title buy lot 4`. Let them?"*); the
   realtor says the price in its own line first.
3. ⚠ **The compulsion gate covers the command path only.** Any code holding
   a body can still call that body's verb *methods* directly (the slate's
   *possession is capability*; re-gating them is a stated non-goal). So
   "speech is never compellable" is true of the `say` command and not of a
   direct call to a body's speech method. The protective roster's
   self-subject sites (forum post/vote) are closed by this build (D5); the
   rest stays with the slate. The owner should know the invariant is
   narrower than its sentence.
4. **"Sol adopts a replacement controller" is not a per-player act today.**
   Re-pointing a view's `controller:` is its titleholder's act and applies
   to everyone. The drive stages step 2 by giving Sol title over the `name`
   view for that step (the controller-liquidity drive's method) with the
   lying controller's row under Sol's home, so its keeper is Sol.
5. **Step 11's premise is thin.** Verified by grep: no sweep, tick or
   schedule calls a protective act with a person as the claimed actor today
   (the only non-controller callers are three self-claims on `unhitch`,
   `Printer`→`callUp`, and `DormWarren`→`super.let`). The system arm is
   proved by unit test; the drive step proves no regression.

## Grounding

Verified 2026-11-18 on `reqs/call-security-pass` (current with master).

**The acting author (`api/execution-context.ts`).**
- `getActingAuthor()` l.615: with a command stack, null if any frame is
  `forced` or the givers differ, else the giver; with none, the nearest
  `metadata.actingAuthor` tag. `getCausingAuthor()` l.647 adds the
  continuation's `metadata.causingAuthor`, and is null for a forced chain.
- `tagActingAuthor(principal)` l.671 and `runRoot` l.1009 are gated by
  `_assertFrameMutatorAllowed` (l.323) against `_frameMutatorAllowlist`
  (l.269: `lib/security/`, `api/`, `backend/`, `CommandGiver`, four
  registries, `PersistableLogic`, `SandboxLogic`, `*.test.ts`).
- ⚠ `runRoot`/`runRootGuarded` link the root with **parent null**
  (`_linkFrame(root, null)`, l.1022/l.1061): a root planted mid-act starts
  an empty stack. `getCaller()` l.505 is the top frame's `caller`;
  `getCurrentTarget()` l.515 its `target`.
- Continuations: `api/schedule.ts` `captureAttribution` l.137 stores
  `{commandId, author: getCausingAuthor()}` and `planRunInner` l.161
  replants both; `platform/idea/SchedulerRegistry.ts` keeps
  `causingAuthors` (l.141, set l.412, planted l.678).
- ⚠ **About 30 readers rely on the author being null when forced**:
  `ConditionLogic.resolveInflicter` l.194, `Vitals` l.3885,
  `Maturing` l.999, `Fractionating` l.402, `ChattelLogic` l.323–327 (title
  of a fresh good), `ProvenanceLogic` l.31, `PressLogic` l.78,
  `Growing.stampCrop` l.471, `Tariff` l.266, `PackLogic` l.2286, and the
  document/template/CMS/git/studio write gates. `DocumentLogic` l.381–390
  documents a bypass that exists *because* a self-forced `sense` is nobody.
- ⭐ **The second question already ships, privately:**
  `BankingLogic.actingPrincipal()` (`platform/idea/api/BankingLogic.ts`
  l.173) returns the single giver *forced or not*, with the comment
  *"provenance is a different question from who is paying."* The slate's
  ledger did not list it.

**Driving a body (`lib/command/CommandGiver.ts`).**
- `forceCommand` l.856 is `executeCommand(text, {forced: true})`; neither
  carries a gate. `executeCommand` l.863 tags the Command frame on its
  first line and stamps `commandContext`/`forced` at l.944.
- The socket path (`packages/server/src/backend/inbound/command.ts` l.92)
  plants `runRootGuarded(giver, 'executeCommand', …)`: the root's target is
  the giver, so `getCaller()` inside `executeCommand` is the giver.
- Non-forced `executeCommand` is also called by code: `BrainMoves` l.68,
  `prints` l.91, `ScriptLogic.runImpl` l.507, `Login` l.368. A gate keyed
  on the `forced` flag would be skipped by dropping the flag.
- Cross-body force in shipped code: exactly one,
  `packages/content/terminus/src/realty/agent/Realtor.ts` l.220
  (`player.forceCommand('title buy …')` after its own `promptChoice` l.191
  and `promptConfirm` l.204).
- `lib/npc/DialogueConversation.ts`: a plain class (not a Stuff),
  constructed by a brain's `open` (`lib/behavior/tree-dialogue.ts` l.80;
  `packages/content/trade-fishing/src/behavior/reads-water.ts` l.77),
  launched with `ScheduleApi.schedule(0, …)` (l.206) from inside the
  player's `talk` command, so its loop is a continuation of the **player**.
  `dispatch` l.428 calls `npc.forceCommand(text)`.
  `platform/idea/cmd/social/TalkController.ts` l.59–88 picks the spec and
  calls `descriptor.open` itself.
- Brains run at `lib/behavior/Behaved.ts` l.813 (`await descriptor.act(ctx)`)
  on a `ScheduleApi` continuation (cadence) or synchronously inside
  whatever command a witness fired in.
- `lib/spatial/Mobile.ts` l.648 `autoLookOnArrival` forces the body's own
  `movement.arrivalCommand`; it runs for passengers of somebody else's move.
- ⚠ **`eval` is nobody.** `EvalController` l.136–139 runs the code under
  `SandboxApi.runScoped`/`runGoverned` (`platform/idea/api/SandboxLogic.ts`
  l.843, l.862), each a fresh root with only `circleScope` or
  `jurisdictionBound`. No command frame and no tag survive, so the acting
  author inside `eval` is null today.

**The protective sites.** Roster source: controller-liquidity Appendix D
(`git show b70896f76^:docs/plans/controller-liquidity-plan.md`, l.2978)
plus this survey. Each verified by opening the file. *Act* = writes or
discloses; *predicate* = a yes/no read an act consults.

| # | site | file | actor param | shape |
|---|---|---|---|---|
| 1 | `takeName(name, by)` | `lib/description/Named.ts` l.290; `lib/husbandry/Bonded.ts` l.663 | `by` | act → `canBeNamedBy` |
| 2 | `lock(by)` / `unlock(by)` | `lib/boundary/Lockable.ts` l.192, l.201 | `by` | act → `opensFor` (sync) |
| 3 | `unhitch(by)` | `lib/slot/Hauler.ts` l.151 | `by` | act → `canUnhitch`; ⚠ self-claims at `Hauler` l.112, `Haulable` l.317, `Mobile` l.1236 |
| 4 | `collectBy(actor)` | `platform/thing/TipJar.ts` l.70 | `actor` | act |
| 5 | `consignBy(actor, …)` | `lib/retail/ConsignmentShelf.ts` l.230 | `actor` | act → `mayDisposeOf` |
| 6 | `withdraw(actor, …)` | `lib/storage/Store.ts` l.960 | `actor` | act |
| 7 | `takeUnit(lot, dest, issuer?)` | `lib/commerce/DonationBank.ts` l.255 | `issuer` | act → `keptBy`; ⛔ **fail-open**: `if (issuer && !kept)` |
| 8 | `armBy(actor)` | `platform/thing/TrapKit.ts` l.74 | `actor` | act |
| 9 | `searchRefusal(by)` | `lib/vitals/Vitals.ts` l.1454 | `by` | refusal-read used as the gate |
| 10 | `slaughterRefusal(by)` | `lib/species/Organism.ts` l.443; `packages/content/trade-ranching/src/agent/Livestock.ts` l.326 | `by` | refusal-read → `mayKeep` |
| 11 | `mayTakeDown(by)` | `lib/boundary/Adornment.ts` l.156 | `by` | predicate; find its act |
| 12 | `mayDrive(actor)` | `lib/display/Display.ts` l.279; consumed by `lib/command/CommandController.ts` l.123 | `actor` | predicate; consumer is a controller base |
| 13 | `historyFor(reader, id)`, `setAnonymity`, `renamePlayerChannel`, `governRefusal(actor, c)` | `platform/idea/ChannelCatalogue.ts` l.482, l.787, l.804, l.528 | `reader`/`actor` | acts; `governRefusal` is private |
| 14 | `postThread`/`reply`/`editBody`/`castVote`, `refuseUnlessAudience(actor, …)` | `platform/idea/api/ForumsLogic.ts` l.156–315, l.574 | arg 0 (self-subject) | acts behind `SelfSubject(0)` |
| 15 | `historyFor(reader, …)`, `revisionAtFor`, `redactFor(reader, …)` | `platform/idea/WikiRegistry.ts` l.257, l.291, l.311 | `reader` (nullable) | protected reads → `WikiRenderer.ceilingFor` l.296 |
| 16 | `callUp(reader, word)` | `platform/idea/api/DocumentLogic.ts` l.1097 | `reader` | protected read |
| 17 | `apply(applicant, key)` | `lib/employment/Organization.ts` l.695 | `applicant` | act |
| 18 | `ownsGroup(actor, group)` | `platform/idea/GroupRegistry.ts` l.131; `platform/idea/api/GroupLogic.ts` l.166 | `actor` | predicate; find its act (group rename) |
| 19 | `let(by, tenant, opts)` / `endLet(by, tenant)` | `packages/content/residence/src/lib/LettingWarren.ts` l.148, l.215 (override: `eternal-university/…/DormWarren.ts` l.200); `terminus/src/market/thing/MarketStalls.ts` l.251 `let(renter)` | `by`/`renter` | acts → `mayLetFor` |
| 20 | `sell(extent, buyer, desk)` | `packages/content/residence/src/idea/PlatBook.ts` l.226 | `buyer` | act; money and title |
| 21 | `mayKeep(actor, herd)` | `packages/content/trade-ranching/src/idea/HerdRegistry.ts` l.530 | `actor` | predicate; find draft / move / herdbook acts |
| 22 | `assignBy(ship, place, by, nowS)` / `sendToRoads(ship, by, nowS)` | `packages/content/transport/src/idea/Harbor.ts` l.545, l.582 | `by` | acts → `keptBy` l.516 |
| 23 | `spudPlanFor(by)` | `packages/content/trade-drilling/src/thing/Bailer.ts` l.143 | `by` | planner that asks `AccessApi.can` |
| 24 | `canOpen(by)` | `lib/spatial/Sealable.ts` l.226 (the water pack's padlocked gate overrides it) | `by` | veto hook; the act is `Sealable`'s open |

**Already asks the engine (no actor parameter; unchanged):**
`AppLogic.setSetting` l.125, `DiagnosticLogic.rawTail` l.465,
`WikiRegistry.mayEdit` l.465, `TemplateLogic.deleteSubtree` l.142 (reads
`getActingAuthor` at l.184), `DocumentLogic` save (l.56), `ParcelLogic`
l.253, `CmsLogic` l.209, `PackLogic` l.3399.

**Not protective (left alone):** the `*PlanFor(actor)` planners other than
`spudPlanFor`, `Reading.bandOf`, the controllers' `doneWords`/`beginWords`,
`Lockable.opensFor(mover)` and every other predicate (a predicate asked
about a third party is a read; the lie buys an answer).

**The failure model (MR !611).** `Refusal` (`lib/errors.ts` l.127);
`CommandLogic.reportFailure` (`platform/idea/api/CommandLogic.ts` l.1016)
words a thrown `Refusal` through `context.refuse` or `sayLate`; reason
rows at `packages/content/platform/content/reasons/<code>.yaml` (34
today; shape `facts:` + `says:`). `DiagnosticLogic` l.252 `titleRecipients(path)`
resolves `ParcelApi.ownerOf(path)`; `pushToAuthor` l.266 routes only
`content-error` that way. `DiagnosticLogic.list` l.388 shows a row to
whoever holds an extent over its path, and `heldExtents` includes the
subject's own home root.

**Views and lints.** `lib/command/command.schema.json` (keys `async`,
`testOnly`, …); `lib/command/CommandDefinition.ts` l.162 reads them;
`packages/server/scripts/check-view-keys.ts` pins every key per surface
(verb · subcommand · arg · option). `scripts/check-controller-gates.ts`
exports `GATE_PATTERNS` (ten permission predicates) and holds controllers
at 10. `scripts/pack-roots.ts` exports `ratchet`, `parseTs`,
`mudSourceFiles`, `packSrcFiles`, `controllerFiles`, `commandViews`.
`title.yaml` (`packages/content/platform/content/platform/cmd/civics/`)
has one controller per subcommand; `buy` is the residence pack's
`/system/residence/idea/cmd/civics/TitleBuyController`.

**Replacing a controller.** A `command-view` save is gated by title over
the view's path and names its controller by template path
(document-store.md § *The command-view save*). The controller-liquidity
drive re-points a view through `/api/cms/write` as its titleholder
(`packages/wire/tests/controller-liquidity.dirty.wire.test.ts` l.753).

**Tests.** 157 direct calls of roster-named methods in 47 unit-test files;
75 direct `executeCommand`/`forceCommand` calls in 16; four hand-copied
`asGiver` helpers (`…/cmd/banking/__tests__/house-draw.test.ts` l.53).
`api/test-harness.ts` holds the `@TestOnly` statics.

## ⭐⭐ New substrate

No new mixin, Stuff class, registry, document kind or collection.

| # | item | ledger row / status |
|---|---|---|
| S1 | `ExecutionContextApi.getActor()` and `actingSystem()` | row *who is acting* — generalizes `BankingLogic.actingPrincipal`, which is **deleted** |
| S2 | frame metadata `actor`, carried by `ScheduleApi` and `SchedulerRegistry` continuations and by the `eval` roots | row *who is acting* (the continuation leg) |
| S3 | `ExecutionContextApi.runAsSystem(name, fn)` and a `system:` option on `ScheduleApi.schedule/recurring` and `WorldClockApi.every` | row *the system as an actor* — **genuinely new** (searched: every `runRoot` site, `RunRootOpts`, `Attribution`; nothing names a principal for unattended work) |
| S4 | `ExecutionContextApi.runAsSelf(fn)` | **genuinely new** (searched `SecurityApi.projectAcross`, `run`, `tagActingAuthor`: all take a principal and are allowlisted; none lets an object name only itself) |
| S5 | `ExecutionContextApi.getActingCodePath()` | generalizes module-private `_guardPath` (`execution-context.ts` l.373) |
| S6 | `AccessApi.requireActor(claimed)` | row *a gate that asks the engine* — the slate's `ActsAs(n)`, as a call (D4) |
| S7 | view key `compellable: never \| consent` (verb and subcommand) | row *a verb's own declarations* |
| S8 | `static compellable` on `CommandController` | **genuinely new** (D11: the view opts in, the class must agree) |
| S9 | the compulsion gate inside `CommandGiver.executeCommand` | row *driving a body* |
| S10 | `BehavedMixin.converse(player, interactive)` | moves `TalkController`'s spec pick onto the NPC; not new behavior |
| S11 | reason rows `not-acting-for`, `not-compellable`, `cannot-consent`, `compel-declined`, `no-issuer` | row *a refusal, worded* |
| S12 | diagnostic channel `call-security`, routed to the path's title holder | row *telling the code's keeper* — generalizes the `content-error` route |
| S13 | `lint:actor-claims`, `lint:compellable` | row *a census that only falls* |
| S14 | `TestHarnessApi.actAs(person, fn)` (`@TestOnly`) | replaces the four hand-copied `asGiver` helpers |
| S15 | `ClaimProbeController` — the drive's lying controller, test-world only | a tool the drive owes (workflow: a state nothing can stage) |

### P9–P14, per item

| item | P9 predictable | P10 metadata | P11 caller branching | P12 synonym | P13 right host | P14 invisible |
|---|---|---|---|---|---|---|
| S1 | n/a: no command behavior | none | none: one read, no caller picks a resolver by context | not `getActingAuthor` (D1: author ≠ actor); removes a private copy | a context read, on the context Api | reads only |
| S2 | n/a | a frame field written and read by the engine each call; not a table | none | sits beside `causingAuthor` because the two differ for a forced start (D1) | on the continuation it describes | a continuation acts as whoever started it; visible in `dumpCallStack` |
| S3 | n/a | the name is a label on a frame | none: `requireActor` asks one question | not `runRoot`: adds a named principal | context Api; the option on the two schedulers that plant roots | named in every diagnostic; never implied |
| S4 | n/a | none | none | not `tagActingAuthor`: takes no principal | context Api | an object can only become itself; nothing retargets |
| S5 | n/a | none | none | replaces `_guardPath`'s use for this purpose | context Api | a read |
| S6 | n/a | none | none: every protective method makes the same call | not `SelfSubject` (caller vs. actor) | `AccessApi`: "who may" | refuses out loud, never passes quietly |
| S7 | ⭐ yes: `help <verb>` prints a generated line from the key (W4); `lint:view-keys` pins it | a view key, on the document that is the def | none | none | the view, per requirements § Placement | the body is asked before anything runs |
| S8 | the view cannot disagree with it: a mismatch is refused at save and load | a static on a class, read at view load | none | not the view key: the class is the half a CMS save cannot write | the controller: it is the code that would run | none |
| S9 | the def says whether a verb can be asked of you; refusal and question are worded | none | none: one rule for `executeCommand` and `forceCommand` | none | `CommandGiver`: "runs commands as this giver" | ⭐ the point of the item: nothing runs unseen |
| S10 | `talk` behaves as documented | none | removes one (`TalkController` scanning specs) | none | `Behaved`: "runs what its specs author" | none |
| S11 | worded rows | rows of the existing `reason` kind | none | none | platform pack `content/reasons/` | none |
| S12 | `errors` lists it | a channel word | one routing set, not a branch per channel | none | `DiagnosticLogic` | none |
| S13 | n/a | none | none | none | `packages/server/scripts/` | n/a |
| S14 | n/a (test seam) | none | none | replaces four copies | `TestHarnessApi`, marked `@TestOnly` | none |
| S15 | exists only in a test world (`assertTestOnly`) | none | none | none | a Controller in `platform/idea/cmd/system/` beside `testharness` | none |

## Plan-level decisions

**D1 — Two questions, two reads: the author is unchanged, the actor is
new.** *Author* is whose work it is (maker's mark, blame, provenance) and
stays null for a forced chain; `getActingAuthor`/`getCausingAuthor` and
every reader keep their behavior byte for byte. *Actor* is whose authority
is being exercised. `ExecutionContextApi.getActor()` walks the live frame
chain from the top and returns at the first frame that bears one:
a Command frame → its `commandContext.commandGiver` (forced or not; D8
admitted the frame); `metadata.actor` → that value; `metadata.actingAuthor`
→ that value (REST, CMS, persistence restore). `actingSystem()` returns the
system's name when that nearest bearer is the system (then `getActor()` is
null). One private walk feeds both. `BankingLogic.actingPrincipal` is
deleted for `getActor()`.
*Why not generalize `getActingAuthor` in place, as the ledger row says:* an
NPC's forced `ferment` would start stamping a maker (`Maturing` l.999) and
`ChattelLogic` l.329 would title the wine to the NPC; `inflictedBy` and
provenance would change too. That breaks *no behavior change for an NPC*.
Banking had already met the same fork and split it.

**D2 — A continuation carries its actor.** `Attribution` (`api/schedule.ts`)
gains `actor`, captured with `getActor()`/`actingSystem()` and replanted as
`metadata.actor`. `SchedulerRegistry` stores it beside the author (one map
of `{author, actor}`) and plants both. `SandboxLogic.runScoped`/`runGoverned`
capture the actor before planting their root and replant it, so `eval` acts
as the wizard. Other mid-act roots (`AccessApi`'s query root,
`SecurityApi.projectAcross`, the sandbox crossing roots) wrap reads or the
crossing choreography and are left alone; W0 confirms each.

**D3 — The system is a named frame, planted only by the engine.**
`ExecutionContextApi.runAsSystem(name, fn)` is behind the frame-mutator
allowlist. `ScheduleApi.schedule/recurring` and `WorldClockApi.every` take
`system: '<name>'`, honored only when the caller passes
`SecurityPolicies.ApiOnly` (an Api or a logic singleton; a pack has
neither) and a throw otherwise. A continuation of system work stays system
work. Named in this build: `boot` (`BootstrapManager.boot`), the three
residency sweeps, every `recurring`/`every` armed under
`platform/idea/api/**` and `platform/idea/*Registry|*Warden`, and the test
harness's `stage`. At a protective check the system is admitted for any
claim and the frame says so; the method's own predicate still runs on the
claimed person. ⚠ A root with **no** actor is not the system: a claim made
there is refused and the diagnostic names the root's label.

**D4 — The check is a call in the method body:
`AccessApi.requireActor(claimed)`.** Weighed against
`@CallSecurity(SecurityPolicies.ActsAs(n))`:

| | policy `ActsAs(n)` | in-body `requireActor` |
|---|---|---|
| existing gates | a method-form `@CallSecurity` *replaces* the class default; each already-gated site (`ForumsLogic` carries 19 gates, `WikiRegistry` 11, `Organization` 8) needs a hand-composed `AllOf` | no interaction |
| where it can sit | dispatched Stuff methods only; not `refuseUnlessAudience` or `governRefusal` (module-private / `private`) | anywhere the predicate is asked |
| refusal shape | the gate throws `SecurityError`; a worded `Refusal` needs a new deny path through three gate sites | throws `Refusal` directly |
| cost | policy evaluation on every dispatch of the method | one short frame walk, where needed |
| countable | decorator parsing plus tracing into helpers | a local rule (D13) |
| pack hosts | fine | fine (`@saxonberg/server/mud/api/access`) |

`requireActor` passes when the system is acting; passes a `null` claim
(claiming nobody asks for the least; sites that must not accept nobody
refuse it themselves, D6); otherwise passes only when the claim and
`getActor()` are the **same object**, compared after peeling proxies
(`ProxyApi.unwrap` to a fixpoint, the `_identityStampOf` loop). Never by
`stuffId` and never by `getIdentityPath()`: both are readable members a
forged object can answer (the identity-path rule). On a mismatch it records
the diagnostic (D7) and throws `Refusal('not-acting-for', { claimed })`.
It is synchronous (`Lockable.lock` is). The owner should note this departs
from the slate's sketch of a policy; the name `ActsAs` survives only in
the docs as the concept.

**D5 — What gets the call.** Every roster *act* gets
`AccessApi.requireActor(<param>)` as its first statement, before any other
refusal (a liar learns nothing about the target's state). A *predicate*
gets none. Where the roster names only a predicate (#11, #12, #18, #21) the
build finds the act that consults it; if the only consumer is a controller,
that is a controller-liquidity D9 gap and the act method takes the actor
and asks its own predicate, then requires. Self-subject acts (#14, #17)
require their subject argument: the participant contract proves the caller
is the subject, and this proves the subject is who is acting.

**D6 — Self-claims assert self; the blood bank fails closed.** An object
passing *itself* as the actor from its own upkeep (`Hauler` l.112,
`Mobile` l.1236) wraps the call in `ExecutionContextApi.runAsSelf`.
`Haulable` l.317 passes the *hauler* as the actor from the cart's code; the
build makes it pass the cart, or route through a method on the hauler.
`DonationBank.takeUnit`: `issuer` becomes required; a null issuer returns
`{ ok: false, reason: 'no-issuer' }`, a non-keeper `'not-keeper'`, and the
method returns an `ActRefusal | { ok: true, unit }` union instead of
`Stuff | null` (two different "no"s were one null; P3). `IssueController`
l.54 renders it with `this.refuse`.

**D7 — Telling the keeper.** `ExecutionContextApi.getActingCodePath()`:
the innermost Command frame's `commandContext.command.resolvedController`
when one is set; else the template path of the nearest frame target that
has one. For a replaced controller that is the controller row's path; for a
brain, the NPC's row; for `eval`, the eval controller (the liar is the
typist, who reads the refusal). `requireActor` records
`{ path, channel: 'call-security', message: '<method>: <actor> claimed to
act for <claimed>' }`. `DiagnosticLogic.pushToAuthor` routes a small set of
channels (`content-error`, `call-security`) through `titleRecipients`; the
row is listed in `errors` to whoever holds an extent over the path.

**D8 — The compulsion gate sits in `executeCommand`, not on the `forced`
flag.** Before the frame is tagged, read `prior = getActor()`,
`system = actingSystem()`, `caller = getCaller()`. The command is the
giver's **own act** when `prior` is the giver, or `caller` is the giver
(the socket root; a reflex such as `autoLookOnArrival`; `Login`'s
`embody`), or the system is acting. Otherwise it is **compelled**:
- no actor at all, or a `circleScope`/`jurisdictionBound` on the context
  (`eval`, a sandbox circle) → `Refusal('not-compellable')` + diagnostic;
- else parse, expand the giver's aliases and match as usual; at the head
  of each `_executeOne`, **before any validator, binder, preload or
  controller**, read the claiming definition's `compellable` for the
  matched subcommand. `never` → `not-compellable` + diagnostic, and the
  chain does not fall through to another candidate;
- `consent` → D9.
The refusal is **thrown to the compelling code** (`forceCommand` stays
`Promise<void>`); its root words it to the actor. Identity compared as in
D4.

**D9 — Consent is asked of the body, by the gate.** The giver's own
Interactive (`getInteractives()`, first; none → `Refusal('cannot-consent',
{ who })`, which covers an NPC and an offline player). `promptConfirm`,
default no, text composed in `CommandGiver`: *"{asker} would have you run
`{line}`. Let them?"* with `asker` the actor's presentation to the giver
and `line` the alias-expanded command. Yes → the command runs as an
ordinary frame of the giver (its validators, money and gates are its own).
No or no answer → `Refusal('compel-declined', { who })`.

**D10 — An NPC's own act is established by the NPC.**
`Behaved._runBrain` wraps `descriptor.act(ctx)` in `runAsSelf`, so a brain
is the NPC even when a witness fired it inside a player's command or its
timer was armed while a player loaded the room. New
`BehavedMixin.converse(player, interactive)` picks the NPC's own `engage`
spec (the loop now in `TalkController` l.59–72) and calls
`descriptor.open` inside `runAsSelf`; the conversation's `launch` then
captures the NPC as the continuation's actor, and `dispatch` is the NPC's
own command. `TalkController` calls `target.converse(...)` and renders the
result. A conversation constructed by anyone else runs as that someone and
cannot dispatch.

**D11 — Two keys: the view opts in, the class agrees.** A view is content
any titleholder can save, naming any controller, so the view alone cannot
be trusted with the never-rule. `CommandController` declares
`static compellable = false`; a controller written to be asked of someone
overrides it `true`. `CommandDefinition` honors `compellable: consent` only
when the resolved controller class agrees; a mismatch is a `ContentError`
on the view at load and `invalid-document` at a save. Classes are written
by wizards and packs and reviewed; a CMS save cannot opt `SayController` in.

**D12 — The never-rule is held where classes are reviewed.**
`lint:compellable`: (a) every view's `compellable` is `never` or `consent`;
(b) every `consent` view's controller declares the static, and the
reverse; (c) no controller under `idea/cmd/<category>/` for
`social · governance · banking · employment · work · system · author ·
shell · stream · charactergen` declares it (speech, conferral, membership,
money given, and the verbs that can run or define other commands); (d) a
ratchet on the count of declaring classes, **ceiling 1**
(`TitleBuyController`), its header naming each class and the five kinds a
reviewer checks a rise against. `title transfer`'s controller is in
`civics` and is held by (d). ⚠ Limit, recorded in the lint header: a pack
verb that speaks from a new category is caught by review at the ratchet,
not by (c).

**D13 — The census: `lint:actor-claims`.** Over every non-controller,
non-test source file in the kernel and every pack `src/` (TS syntax tree,
`parseTs`): a function is **deciding** for parameter `p` when it passes `p`
to a permission predicate — the `GATE_PATTERNS` vocabulary, extended with
the predicates this survey found (`canBeNamedBy`, `mayLetFor`, `keptBy`,
`mayDisposeOf`, `canUnhitch`, `mayTakeDown`, `mayDrive`, `ownsGroup`,
`isAdHocMember`, `isAudienceMember`, `ceilingFor`, `isOnShiftFor`,
`hasProprietor`, `canOpen`) — or to a same-file function that is itself
deciding for that position and unchecked. A function is **exempt** when it
is itself a predicate: its name is in the vocabulary or its declared return
type is `boolean`/`Promise<boolean>`. A deciding function is **checked**
when its body calls `AccessApi.requireActor(p)`. The count of deciding,
non-exempt, unchecked functions is the published number. Opened at its own
count in W0 as the ceiling, driven down by W1–W3, flipped to 0 in W5.
No list of sites is kept; the vocabulary is the one list and is shared
with `lint:controller-gates`. If extending `GATE_PATTERNS` raises that
gate's count of 10, the new hit is fixed when it is a plain D9 move;
otherwise the extra names live in a second exported array the new gate
alone reads, and the controller is named on the slate — the ceiling does
not rise. ⚠ Limit, in the header: a method that decides by a hand-rolled
comparison no predicate names (`governRefusal` l.537) is invisible; the
remedy is to name the predicate. W5 cross-checks the roster table: every
row carries the call whether or not the lint sees it.

**D14 — Sandboxed code never compels** (the `eval` rule of D8). The grain,
not the law: if a holodeck ever needs a consent verb inside a circle, that
is the sandbox's decision.

**D15 — Tests state who acts.** `TestHarnessApi.actAs(person, fn)`
(`@TestOnly`): a root targeting `person` with `tagActingAuthor(person)`.
No environment branch is added to `requireActor` or the gate. The build
wraps the direct calls it breaks and replaces the four `asGiver` copies.

### Decisions the build made (B-numbered, for the MR)

- **B1 (W0) — S2's carrier is two context statics, not a frame field per
  scheduler.** `ExecutionContextApi.captureActor()` → `ActorClaim
  {actor, system}` and `runAsCaptured(claim, fn)` (frame-mutator allowlisted;
  pushes a frame that keeps the current target, so no `@CallSecurity` gate
  sees a different caller). `ScheduleApi`, `SchedulerRegistry`,
  `WorldClockRegistry` and `SandboxLogic` all use the pair. Decided by the
  nearest pattern (`causingAuthor` is captured and replanted the same way).
- **B2 (W0) — identity is compared by `ProxyApi.identityOf`, a registry of
  the proxies `ProxyApi.wrap` made.** D4 said "peel proxies with
  `ProxyApi.unwrap`" — but `unwrap` reads `RAW_TARGET` off the value, which a
  forged object can answer with the actor's own raw self (proved in
  `actor.test.ts`). `identityOf` peels only proxies it made. New static on a
  bootstrap Api; genuinely new (no existing map of made proxies).
- **B3 (W0) — "honored only from the Api tier" is a named policy,
  `SecurityPolicies.SystemNamer`** (ApiOnly ∪ `FromTemplate('/platform/idea/*')`,
  one segment, so registries/wardens qualify and controllers never do). Both
  `ScheduleApi` and `WorldClockApi` check it against `getCaller()`.
- **B4 (W0) — boot is wrapped at `AppBootstrap.run`, three calls only**
  (the manifest, the spawn sweep, the first roster pass), not the whole
  method: the relay readers' inbound traffic is somebody's, and an ALS
  context inherited by a reader's socket would make every relayed line "the
  system". `runAsSystem` at an empty stack plants an OMNI-scoped root, so
  timers armed at boot keep the omni registration scope they had.
- **B5 (W0) — WorldClock schedules carry the actor too.** Verified: a
  `WorldClockApi.every/after` callback carried NO attribution (it ran on the
  heartbeat's omni root). Each `Schedule` now captures `{actor, system}` at
  registration and fires under `runAsCaptured`. The registry's own ticks are
  named (`weather`, `fire`, `lighting`, `clock`).
- **B6 (W0) — named sweeps:** `residency` (eviction, reset, spawn),
  `roster`, `reactions`, `clock`, `weather`, `fire`, `lighting`,
  `test-stage`. The other Api-tier recurring arms (renown, producer,
  consumer, record, sandbox sweeper, attendant, watch, reset, card) are armed
  at boot and inherit `boot` through the capture — not renamed one by one.
- **B7 (W0) — `lint:actor-claims`' rule, refined from D13 by running it:**
  the actor is the predicate's FIRST argument when it is parameter-rooted
  (`by`, `by.getIdentityPath()`), the next parameter-rooted one past a
  leading `this` (`canUnhitch(this, by)`), or the receiver for the two asked
  OF a person (`isFulfilling`, `isOnShiftFor`); a first argument read from
  the engine is nobody this function was handed. Exempt also covers a
  predicate-shaped name (`can…`/`may…` — `canTraverse(mover)` is a read).
  "Any argument" counted paths, actions and items (56 → 49). Opened at
  **49**. The census widens W1–W3 past the roster: on-shift titling
  (`Tract.markField`, `Working.winOre`, `IceSheet.cutBlock`,
  `CraftingLogic.fulfillingHand`, the doorman/stokes brains), the CMS and
  document gates, `readWorldAs`, `sourceWriteRefusal`, `visibleChannels`,
  `Group.rename`, `Sealable/Throttleable.openPlanFor`, the herdbook acts.
- **B8 (W0) — the stream-deck control command is rooted at its streamer**
  (`backend/inbound/command.ts`), as the socket path is: it had no root at
  all, which the compulsion gate would read as nobody acting.
- **W0 audit (timers outside the Api tier):** `Coroutine` (a script's waits)
  arms `WorldClockApi.after/every` from inside the script, so it captures the
  scripter (B5); `CombatSession`, `Avatar` periodic save, `FastTravel`,
  `Wellhead`, `AirPocket`, and the one-shots named in W0 call no roster act
  and run no command. The control path (B8) was the one root with nobody.

- **B9 (W1) — brains are not counted by the census.** A brain module's
  `host` comes from the framework's `BrainContext` and the brain runs as
  that NPC (D10); its predicates are reads about others (`doorman.judge`
  asks the doorman about a mover). `lint:actor-claims` skips
  `…/behavior/<verb>.ts`.
- **B10 (W1) — the hitch's self-claims go through `Hauler.slipFrom(cart)`**
  (new member on the existing mixin): the hauler uncoupling as itself
  (`runAsSelf`), only from the cart it pulls. `hitch`'s re-hitch, the cart's
  `slipHitch` and `Mobile`'s teleport release all call it; before, the cart
  passed the hauler as the actor from the cart's own code.
- **B11 (W1) — `takeUnit` answers `TakeUnitAnswer`** (`no-issuer`,
  `not-keeper`, `lot-empty`, or `{ok, unit}`) with three new platform rows;
  `IssueController` lost its own `keptBy` precheck (a controller-liquidity
  D9 gap, now on the window).
- **B12 (W1) — `mayTakeDown` (#11) and `mayDrive` (#12) get no call.** Their
  only consumers are controllers (`GetController`, the watch/show verbs,
  `CommandController.resolveScreen`) and no model act exists to host the
  check; a replaced controller could skip the predicate entirely, so a
  check inside it buys nothing. Recorded as D9 gaps on the slate.
- **B13 (W1) — `SchedulerRegistry.plantAuthor` never planted anything.** A
  method call is a proxied frame, so `updateCurrentFrameMetadata` inside it
  wrote onto that frame, which vanished on return — engagement completions
  carried neither the author nor (new) the actor. Now
  `continuationMetadata(id)` RETURNS the metadata and the root's own
  closure plants it. Found by trade-mining's hew test (a completion acting
  as nobody). ⚠ Durative completions now carry their author too: what a
  firing makes an hour later is the firer's, as `getCausingAuthor`'s
  docstring always claimed.
- **B14 (W2) — the census widened the roster** to the on-shift titling
  acts, the document/CMS write gates, `readWorldAs`, `sourceWriteRefusal`,
  `visibleChannels`, `Group.rename`, the herdbook acts and the open
  planners; each got the call. The wiki's "a reader naming a moderator
  cannot raise the ceiling" test now asserts the stronger outcome: refused.
- **B15 (W1–W3) — tests state who acts.** Direct calls of protective acts
  and controller `execute(model, ctx)` calls in tests are wrapped in
  `TestHarnessApi.actAs(<the actor>, …)` (a person's own method acts as its
  receiver); tests that spy `getActingAuthor` spy `getActor` alike. The four
  hand-copied `asGiver` helpers are left in place — they still state their
  giver through a command frame and keep passing.
- **W1–W3 landed as one commit**: the waves share their test fallout file
  by file, and splitting them bought nothing a reviewer reads. The census
  went 49 → 39 (W1, two of them brains) → 21 (W2) → **0** (W3), and its
  ceiling is pinned at 0 in the same commit (W5's flip, done early).

- **B16 (W4) — "the caller is the giver" looks past the giver's own
  `forceCommand`.** D8 read `getCaller()` inside `executeCommand`, but
  `forceCommand` calls `this.executeCommand`, so that caller is ALWAYS the
  giver — the Realtor's `player.forceCommand(…)` would have read as the
  player's own act. The gate walks down past the giver's own
  `forceCommand` frame to whoever called it. An arrival reflex (the
  giver's own method calling its own `forceCommand`) stays its own act.
- **B17 (W4) — the gate runs at the head of `executeCommand`, before the
  frame is tagged, not at the head of `_executeOne`.** It parses the line
  itself (the body's parser, then the body's aliases), and requires EVERY
  view that claims the verb (for that subcommand) to say `consent` and its
  controller class to agree — fail closed across candidates. A refusal is
  then a plain throw to the compelling code, never a note on the body's
  envelope, and nothing (validator, binder, preload) has run. Only a single
  plain command line can be compelled; a script or a bound short-circuit is
  `not-compellable`.
- **B18 (W4) — D11's second key is checked at run time, not at view load
  or CMS save.** The gate clones the claiming controller and reads its
  class's `static compellable`; a view saying `consent` over a class that
  does not agree is refused (`not-compellable` + a `call-security`
  diagnostic naming the view and the class). `lint:compellable` (a)/(b)
  holds every SHIPPED view to the same rule at build time. A load-time
  `ContentError` was not added: the CommandDefinition is built before its
  controller class is resolvable, and the run-time check is the one a
  saved view cannot skip.
- **B19 (W4) — the Realtor states the terms in its own line** ("Hinkley
  Hills lot-7 — 500 zorkmids, freehold. I'll put it through for you.")
  and the engine asks *"<realtor> would have you run `title buy lot-7`.
  Let them?"*; `compel-declined` → "No hurry", `cannot-consent` → the
  listing. The realtor still asks WHICH lot (a choice prompt is asking, not
  compelling).

- **W5 — the roster, row by row (done with W1–W3's flip to 0).** #1 ✓
  (`Named`, `Bonded`) · #2 ✓ · #3 ✓ (+ `slipFrom`) · #4 ✓ · #5 ✓ · #6 ✓ · #7 ✓
  (fails closed) · #8 ✓ · #9 ✓ · #10 ✓ (`Organism`, `Livestock`) · #11 ✗ and
  #12 ✗ (B12: controller-only predicates, no act to host it) · #13 ✓
  (`historyFor`, `visibleChannels`, `governRefusal` — which `setAnonymity`,
  `renamePlayerChannel` and disband pass through) · #14 ✓ (+ `editBody`) ·
  #15 ✓ (+ `WikiRenderer.redactSource`) · #16 ✓ · #17 ✓ · #18 ✓
  (`Group.rename`) · #19 ✓ (`let`/`endLet`; `DormWarren` through `super`;
  `MarketStalls.let`) · #20 ✓ · #21 ✓ (the herdbook acts) · #22 ✓ · #23 ✓ ·
  #24 ✓ (`openPlanFor`, where `canOpen` is asked). Census: unchecked **0**;
  checked: printed by `lint:actor-claims` on every run.
- **W6 — the drive's scope.** The wire drive carries the player-facing and
  the lie steps (1–4, 7–9). Steps 5 (an NPC's beat, a dialogue dispatch), 6
  (a bore completing for its starter), 10 (the blood bank) and 11 (a sweep as
  the system) are proved by unit tests (`Behaved.test` converse,
  `actor.test` continuations, trade-mining's hew completion — B13 —,
  `DonationBank.test`, `actor.test` system arms) and by every wire drive in
  the suite still passing with the gate in: a brain, a timer or a sweep that
  lost its actor would refuse loudly there.

## ⭐⭐ Host placement

| item | host | what it claims about the rest |
|---|---|---|
| `getActor`, `actingSystem`, `runAsSystem`, `runAsSelf`, `getActingCodePath` | `ExecutionContextApi` | context reads and frame planting are already its whole job; bootstrap-special, so it imports nothing new (`Refusal` and diagnostics stay out of it) |
| `requireActor` | `AccessApi` → `AccessRegistry` | "who may": needs `Refusal`, `DiagnosticApi`, the context. Not on `SecurityPolicies` (D4) |
| the `requireActor` call | each roster act | per method, on the method that asks the predicate. Not on a base class or mixin: no host gains it by inheritance |
| the compulsion gate | `CommandGiverMixin.executeCommand` | every command giver (Avatar, NPC, Login) *means* it: each runs commands and each must not be driven. No narrowing guard; a `Login` has no other body's code driving it and answers "own act" by the caller arm |
| `compellable` (view key) | `CommandView` / subcommand | every view answers; the default `never` is the true answer for nearly all, which is the requirement's own default and not a capability spread across hosts |
| `static compellable` | `CommandController` base | ⚠ quiet-default test: one of 620 controllers answers yes. Accepted: it is a refusal-by-default declaration, not a capability; the alternative (a kernel list of class paths) breaks *a pack never needs a kernel edit* |
| `converse` | `BehavedMixin` | every Behaved host has specs; one with no `engage` spec returns `not-conversational`, which `TalkController` says today for the same hosts |
| `runAsSelf` around brains | `Behaved._runBrain` | every brain run, no exception |
| `actor` on continuations | `Attribution`, `SchedulerRegistry` | every continuation; absent when nobody acted |

No guard re-narrows any host set. Nothing is added to `Thing`, `Stuff`,
`Location` or any base rung.

## Convention conformance

- **`props:`/`cast:`, places, persistence per content:** no rows of those
  kinds; nothing persists but diagnostics (P6: not applicable).
- **Namespace axes:** reason rows in the platform pack; the fixture
  controller at `/platform/idea/cmd/system/`; its drive row under the test
  player's `/home/<key>/`.
- **Module scope, imports, categories:** no new category, free helper or
  `eslint-disable`. Packs import `AccessApi` and `ExecutionContextApi` by
  package specifier. `lint:imports`, `lint:module-scope`.
- **Verbs on objects:** no subject-first Api static is added;
  `requireActor(claimed)` takes a claim, not a subject it acts on. If
  `lint:object-verbs` counts it (first parameter a world object), the
  answer is its `EXEMPT_APIS` mandate line with the caller audit (every
  caller is a protective method asking about its own argument), not a
  rename.
- **No new `isWizard`** (`lint:wizard-axis`): `eval` is bounded by D2/D14.
- **P3 refuse/skip/throw:** a lie → `Refusal`; a null issuer → refusal; a
  compelled never-verb → `Refusal`; `system:` from a non-Api caller → throw;
  a `consent` view on a class that does not agree → `ContentError`.
- **P4 no duck typing:** packs call kernel statics; no `?.()`.
- **P5 the mixin decides:** the check is on the model; `TalkController`
  loses its spec scan; the Realtor loses its confirm.
- **P7 load on use:** reason rows load through `reasonCatalogue().find`;
  no boot entry. **P8 names:** `requireActor`, `converse`, `runAsSelf`,
  `runAsSystem`; no adjective class.
- **Gates this build must pass:** the whole family
  (`pnpm -C packages/server lint:family`), in particular `lint:gates`,
  `lint:view-keys` (the new key pinned with what it does),
  `lint:command-views`, `lint:controller-gates` (≤ 10),
  `lint:controller-decisions`/`-mutations` (the fixture controller is
  measured like any other), `lint:object-verbs`, `lint:lib-statics`,
  `lint:test-bootstrap`, `lint:schema`, and the two new gates.

## Waves

Each wave ends at one commit and is gated by `pnpm test:near`, every
touched pack's vitest and `lint:family`.

### W0 — the kernel: who is acting ✅ (49dfde3f5)
Implements D1, D2, D3, D4, D7, D15 and the brain half of D10.
- `api/execution-context.ts`: S1, S3, S4, S5.
- `api/schedule.ts`, `platform/idea/SchedulerRegistry.ts`,
  `platform/idea/WorldClockRegistry.ts` + `api/worldclock.ts`: the `actor`
  leg and the `system:` option. ⚠ Verify first whether a callback armed
  with `WorldClockApi.every` directly (not through `ScheduleApi`) carries
  any attribution today; if not, it gains the same capture.
- `platform/idea/api/SandboxLogic.ts` l.843–875: replant the actor.
- `packages/server/src/backend/BootstrapManager.ts`: boot under
  `runAsSystem('boot')`.
- Name the Api-tier sweeps: the `ScheduleApi.recurring` /
  `WorldClockApi.every` calls in `ResidencyLogic` (l.655/694/760),
  `RenownLogic`, `RecordLogic`, `ProducerLogic`, `ConsumerLogic`,
  `EmploymentLogic` (the roster tick, which relocates staff),
  `AttendantLogic`, `StreamLogic`, `SandboxLogic`, `WatchWarden`,
  `ResetWarden`, `ReactionRegistry`, `CardRegistry` (grep at plan time;
  re-grep at build).
- `api/access.ts` + `platform/idea/AccessRegistry.ts`: `requireActor`.
- `platform/idea/api/DiagnosticLogic.ts`: the `call-security` route.
- `platform/idea/api/BankingLogic.ts`: delete `actingPrincipal`.
- `lib/behavior/Behaved.ts` l.813: `runAsSelf`.
- `api/test-harness.ts`: `actAs`; its `stage` runs as the system.
- Reason row `not-acting-for` (`facts: { claimed: thing }`,
  *"You can't act for {{ claimed | … }}."* with the person filter
  `not-board-member.yaml` uses).
- `scripts/check-actor-claims.ts` + `lint:actor-claims`, ceiling = its own
  count.
- **Audit, recorded in this plan:** every timer armed outside the Api
  tier — recurring ones in `lib/script/Coroutine.ts`,
  `lib/combat/CombatSession.ts`, `lib/character/Avatar.ts`, and packs
  `tpa` `FastTravel`, `trade-drilling` `Wellhead`, `water` `AirPocket`;
  one-shot ones in `Respiration`, `Mould`, `Percolating`, `Drift`,
  `Comminuting`, `Calendar` and packs `Boat`, `Assaying`, `Sawmill` — and
  `handleControlCommand` (`backend/inbound/command.ts`): does it run a
  command or call a roster act? One that does on its own behalf wraps in
  `runAsSelf`; a script's coroutine must resume as its scripter (the
  continuation leg), proved by a unit test of a `do` script that waits
  and then runs a protected verb.
**Acceptance:** unit tests — an NPC's forced command resolves to the NPC;
an engagement's completion and a `ScheduleApi` callback to their starter;
`eval`'s root to the wizard; a system sweep to its name; an unnamed root
to nobody; `getActingAuthor` unchanged in all five (pinned);
`requireActor` passes self, system and null, refuses a different person
and a forged object answering another's `stuffId`/`getIdentityPath()`, and
records a `call-security` row at the controller's path; banking's payer
tests unchanged.
**Commit:** `feat(security): the engine says who is acting`.

### W1 — kernel sites: things and places ✅ (be6a396c5, with W2–W3)
Roster #1–#12, #24 and D6. Files as in the roster table; plus
`packages/content/trade-medicine/src/idea/cmd/medical/IssueController.ts`
and reason row `no-issuer`. Tests wrapped with `actAs`.
**Acceptance:** per site, a unit test that the honest actor passes and a
different claimed person is refused before any state is read;
`DonationBank.test.ts` l.151 asserts a null issuer is refused and the lot
is still held; `lint:actor-claims` falls.
**Commit:** `refactor(security): kernel protective acts require their actor (things)`.

### W2 — kernel sites: records and words ✅ (be6a396c5)
Roster #13–#18. `ChannelCatalogue`, `ChatLogic`, `ForumsLogic`,
`WikiRegistry`, `DocumentLogic.callUp`, `Organization.apply`, the group
rename act.
**Acceptance:** as W1; a wiki read with a null reader still returns the
redacted view; `packages/content/trade-printing/src/thing/Printer.ts` l.32
still calls up a document for its own actor.
**Commit:** `refactor(security): kernel protective acts require their actor (records)`.

### W3 — pack sites ✅ (be6a396c5)
Roster #19–#23 and the `Livestock` half of #10: `residence`
(`LettingWarren`, `PlatBook`), `eternal-university` (`DormWarren`),
`terminus` (`MarketStalls`), `trade-ranching`, `transport`,
`trade-drilling`, `water` (the gate's `canOpen`). Each pack's vitest.
**Acceptance:** as W1; Katie's `provision` and a bore's completion pass in
their packs' tests.
**Commit:** `refactor(security): pack protective acts require their actor`.

### W4 — compellability and the Realtor ✅ (84fd4435a)
Implements D8, D9, the dialogue half of D10, D11, D12, D14.
- `lib/command/command.schema.json`, `CommandDefinition.ts`,
  `scripts/check-view-keys.ts` (verb and subcommand surfaces),
  `lib/command/CommandController.ts` (`static compellable`), the
  `command-view` validator in `PackLogic`, and the generated help line
  (*"Another character may ask you to do this; you are always asked
  first."*).
- `lib/command/CommandGiver.ts`: the gate and the consent prompt.
- `lib/behavior/Behaved.ts`: `converse`;
  `platform/idea/cmd/social/TalkController.ts`: call it.
- `packages/content/platform/content/platform/cmd/civics/title.yaml`:
  `subcommands.buy.compellable: consent`;
  `packages/content/residence/src/idea/cmd/civics/TitleBuyController.ts`:
  the static.
- `packages/content/terminus/src/realty/agent/Realtor.ts`: delete the
  `promptConfirm`; the realtor says lot and price; `forceCommand` in a
  `try` that answers `compel-declined` with its "No hurry" line and
  `cannot-consent` with the listing.
- Reason rows `not-compellable`, `cannot-consent`, `compel-declined`.
- `scripts/check-compellable.ts` + `lint:compellable`.
**Acceptance:** unit tests — own act by actor, by caller (a passenger's
arrival look inside a driver's command) and under the system; a compelled
`say` refused with no prompt, online or not; a compelled `title buy` asks
the body's Interactive, yes runs it as the body (the money leaves the
body's wallet), no throws `compel-declined`; an NPC and a linkdead body
`cannot-consent`; a compelled line never reaches a validator before the
answer; from a jurisdiction-bound root it is refused; Dave's dialogue
`dispatch` runs as Dave; a conversation constructed outside `converse`
cannot dispatch; a view claiming `consent` over `SayController` is
refused at save. `Realtor.test.ts` updated.
**Commit:** `feat(security): the compulsion gate — a body is asked`.

### W5 — the census holds at zero ✅ (pinned at 0 in be6a396c5)
Flip `lint:actor-claims` to 0; cross-check the roster table row by row;
publish both numbers (unchecked: 0; checked sites: the `requireActor`
count) in the lint's output and in `docs/lint-family.md`.
**Commit:** `chore(lint): actor claims — zero, and held`.

### W6 — the drive, the walk, the docs
- `platform/idea/cmd/system/ClaimProbeController.ts` (S15): the `name`
  view's model in, `target.takeName(name, <the thing's keeper>)` out;
  `SecurityApi.assertTestOnly` first.
- `packages/wire/tests/call-security-pass.dirty.wire.test.ts`;
  `e2e/tests/call-security-pass-walk.spec.ts`.
- Docs: `call-security.md` (§ *The method asks who* gains the actor check;
  § Deferred policies; a new § *Who is acting* and § *Compulsion*),
  `access.md`, `command-spec.md` (the key), `command-routing.md` (the
  gate's place in dispatch), `npc-dialogue.md`, `behavior.md`,
  `response-envelope.md` (the rows), `diagnostics.md` (the channel),
  `lint-family.md`, `testing.md` (`actAs`). Index lines are the sweep's.
- `pnpm test` once, at code-complete; the Drive record below.
**Commit:** `test(security): the call-security pass, driven`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| the actor check | every roster verb, unchanged | unchanged | `not-acting-for.yaml` | the row loads on first use through the reason catalogue | none: the check is in the method |
| consent compulsion | `title buy` | the Realtor's `realty-buy` dialogue effect on its row (existing) | `title.yaml` `subcommands.buy.compellable`; `TitleBuyController.compellable`; three reason rows | the key is read when the view loads (`CommandDefinition`); a mismatch fails there, loudly | the consent prompt on the body's Interactive; none → `cannot-consent` |
| the keeper's diagnostic | `errors` (existing) | existing | channel `call-security` | n/a | `errors` lists by held extent (existing) |
| the system actor | none | none | none | planted at boot and by each named sweep; an unnamed root is refused with its label | `system:` honored from the Api tier only |
| the blood bank | `issue` (trade-medicine) | existing | `no-issuer.yaml` | on use | the issuer is required |
| the lying controller (drive) | `name`, re-pointed | existing | a row under the test player's home naming the fixture class | cloned by the dispatcher from the view's `controller:` path | `assertTestOnly` |

⚠ New reason rows ship in the platform pack: check `content-packs.md` for
whether the reconcile installer needs the manifest version raised to
install them into a standing world, and do it in the wave that adds each.

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| every protective gate decides on the engine's actor; a forged actor is refused, worded, and the keeper sees a diagnostic | W0 (check, row, route), W1–W3 (sites), W6 steps 2–3 |
| no visible change for an honest player, an NPC, a timed step or a sweep | D1 (author untouched), W0 pins, W6 steps 1, 4, 5, 6, 11 |
| no body runs a command because another body's code asked, unless compellable with consent and its player said yes | W4, W6 steps 7–9 |
| speech, conferral, membership, and giving title or money away are never compellable as commands | W4 (D11, D12) — the owner's ruling (problem 1); commands only (problem 3) |
| a wizard's `eval` can act only as the wizard | W0 (D2), W4 (D14), W6 steps 3, 9 |
| the blood bank refuses an issue with no issuer | W1, W6 step 10 |
| the count of unchecked protective gates is published and is zero | W0 (opened), W5 (zero) |

Nothing is unmapped.

## Test & gate strategy

**Unit tests:** each wave's acceptance list. The actor model, the check,
the gate and consent are provable in unit tests with `actAs` and a fake
Interactive. **Only the drive proves:** the re-pointed view reaching the
check over the wire; the diagnostic reaching Sol's `errors`; the prompt on
a real client; the Realtor end to end.

**The blocking drive** (all eleven steps; no soak drive):

| step | pace | how it is staged |
|---|---|---|
| 1 Ryn names her pet | instant | a kitten staged bonded to Ryn |
| 2 Sol's lying `name` controller | staged | Sol opened with title over the `name` view; a template row under Sol's home with `class:` the fixture; the view re-pointed through `/api/cms/write`, restored in `afterAll`. Checks: the refusal line, the kitten's name unchanged, Sol's `errors` naming the row's path |
| 3 `eval` unlock naming another | staged | wizard session holding the pump-house parcel; `ev(…, door.unlock(<ryn>))` refused and the door still locked; then the wizard, holding the key, unlocks through `eval` |
| 4 honest gates | instant | `unlock` with the key; `chat history`; `wiki history` as a reader |
| 5 NPCs do their jobs | staged | a shopkeeper's restock beat pulled forward (`stage(npc, 'requestBeat')`); `talk dave` to the `house appoint` choice |
| 6 a bore completes for its starter | staged | `testharness clock-advance` inside the blocking jump cap |
| 7 Realtor, yes | instant | the gate's question on Ryn's client; the plot titled to Ryn; her balance down by the price |
| 8 Realtor, no | instant | nothing bought; the realtor's line |
| 9 Sol's code drives Dave and Ryn | staged | Sol's wizard `eval` holding the bar's parcel: `dave.forceCommand('house appoint …')` and `ryn.forceCommand('say hello')`, Ryn online and then parked. Checks: the refusal, no appointment, nothing said, and no prompt on Ryn's client |
| 10 the blood bank | staged | `ev` calling the window's `takeUnit` with no issuer; the lot still held |
| 11 a sweep runs as the system | staged | the residency eviction staged over a cold place holding a hitched team and a locked door; evicted, and no `call-security` row |

⚠ B2: each checkpoint is made to fail once before it is trusted — in
particular step 2 with the fixture claiming the honest actor (must pass),
and step 9 with a `consent` verb (must prompt).

**The walk** (`e2e`): steps 1, 4, 7, 8 in a browser, once, at
code-complete.

**Suite:** `pnpm test` at code-complete and at `/finalize` only. Between:
`test:near`, touched packs, `lint:family`.

## Risks & opens

- ✅ **Requirements problem 1** — ruled (see the top): W4 builds on it.
- **Unnamed roots.** A root that carries no actor now refuses a claim or a
  cross-body command, loudly. W0's audit covers the planters found; the
  full suite and the drive find the rest. The fix is always to name the
  root or to act as self, never to admit null.
- **A timer armed while a person loads a place carries that person.**
  Safe direction (a sweep claiming somebody else is refused), and brains
  are covered by D10; but an object's own upkeep that reaches a roster act
  must `runAsSelf`. W0's audit lists the timers. Not solved in general.
- **Callback laundering (pre-existing).** A body method that invokes a
  caller-supplied function runs it under the body's frame, so that
  function can `runAsSelf` or force the body as itself. The same weakness
  bounds every `SelfSubject` gate today. Not closed here; named on the
  slate (Deferred seams).
- **`SandboxLogic` replanting the actor** makes `eval` attributable to the
  wizard for the first time *as an actor*; the author stays null inside
  `eval` as today. Any roster act an `eval`-driven test or drive helper
  (`ev`) calls with a claimed person other than the wizard now refuses —
  existing wire drives that stage with `ev(…, thing.act(<someone>))` will
  need `TestHarnessApi.stage` (the system) instead. Expect a tail in the
  wire suite at code-complete.
- **`lint:controller-gates` and the wider vocabulary** (D13's fallback).
- **`lint:object-verbs` / `lint:lib-statics`** may count the new statics;
  answer with a caller audit, not a ceiling rise argued from doctrine.
- **The author-surface projection** will list `requireActor` and the
  context reads as consumer surface. Intended: an author should see them.
- **Stop and ask:** only if a roster site turns out to need a claim the
  model cannot check as designed (an act legitimately performed *for*
  another person by a present third party). That is agency, and it is not
  this build's.

## Deferred seams

All to [call-security-pass-slate](../slates/tech-debt/call-security-pass-slate.md)
unless named:
- The audit rail samples `call-security` refusals as its first producer
  (the channel and `getActingCodePath` are its attach points).
- Direct calls of a body's verb methods (Requirements problem 3): the
  re-gating of the sealed-ungated set, with speech first.
- Callback laundering: a census of function-typed parameters on
  command-giver hosts.
- Lifecycle hooks and object timers acting as the object by default.
- Retiring `DocumentLogic`'s map-transport bypass and moving the three
  precedent gates (`setSetting`, `rawTail`, `mayEdit`) from the author to
  the actor.
- A hand-rolled permission comparison the census cannot see
  (`governRefusal`): extract and name the predicate.
- A never-rule that follows what a verb *does* rather than where its
  controller lives (a compelled-frame check at the speech and money
  primitives).
- Acting for another by grant → agency-slate, wizard-duty-slate. Acting on
  a body → the slate's § *The consent gate*. Compulsion magic →
  spellbook-slate § 8. Compulsion inside a sandbox circle → the sandbox's
  slate.

## Critical files

1. `docs/requirements/call-security-pass-requirements.md`
2. `packages/server/src/mud/api/execution-context.ts` (l.196–245, l.265–352, l.590–682, l.1000–1082)
3. `packages/server/src/mud/lib/command/CommandGiver.ts` (l.295–440, l.845–1030, `_runChain`, `_executeOne`)
4. `packages/server/src/mud/api/schedule.ts` (l.120–185); `platform/idea/SchedulerRegistry.ts` (l.130–145, l.405–415, l.675–685)
5. `packages/server/src/mud/platform/idea/api/SandboxLogic.ts` (l.835–875); `platform/idea/cmd/author/EvalController.ts` (l.120–180)
6. `packages/server/src/mud/platform/idea/api/BankingLogic.ts` (l.160–182)
7. `packages/server/src/mud/lib/behavior/Behaved.ts` (l.795–820); `lib/behavior/tree-dialogue.ts`; `lib/npc/DialogueConversation.ts` (l.195–210, l.418–440); `platform/idea/cmd/social/TalkController.ts`
8. `packages/content/terminus/src/realty/agent/Realtor.ts` (l.160–225)
9. `packages/server/src/mud/lib/errors.ts`; `platform/idea/api/CommandLogic.ts` (l.1014–1075); `platform/idea/api/DiagnosticLogic.ts` (l.244–290, l.386–405)
10. `packages/server/scripts/check-controller-gates.ts`, `check-view-keys.ts`, `pack-roots.ts`
11. `packages/wire/tests/controller-liquidity.dirty.wire.test.ts` (l.721–800: the CMS re-point)
12. `docs/subsystems/call-security.md` (l.1143–1270), `docs/review-questions.md`, `docs/antipatterns.md`
13. The roster table above, one file per row.

## Drive record

*(appended at build time)*
