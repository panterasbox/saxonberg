# The call-security pass — re-gating + the audit rail (slate)

> Written at the close of the Api OO sweep (MR !228, 2026-09-02), which
> deliberately merged with a known-permissive gate posture. This slate
> captures everything that build learned about the gate landscape so the
> future pass can be comprehensive without re-excavating. Two jobs, one
> build: (1) a **full pass over every call-security site** now that the
> verb surface has settled on the objects, and (2) an **audit of
> sensitive method calls we want to lock down** — with the audit rail
> (below) as the new instrument that makes "lock down" not the only
> answer.

## The design position (the user's, recorded 2026-09-02)

- **Preferred trust basis: the calling TEMPLATE (identity of the Stuff,
  with its known backing class) combined with the calling FUNCTION in
  that template's backing class.** Module/callsite trust is acceptable
  but secondary: *"if we check a specific function caller it should be
  coming from the module we expect"* — the module check becomes
  redundant once template + function are checked.
- **The deliberate case for NOT checking module/class at all**: a future
  where content developers provide *alternative mixins implementing the
  same interfaces*. Interface-openness is a real future, not a bug —
  but it should be chosen, not inherited.
- **Posture until then**: *"probably the less permissive models are
  better until we actually have content developers that need to break
  through security, and then we can try and judge the criterion then."*
- **The audit idea (new, this conversation)**: decorators that PERMIT
  calls but take a **random sample of specific invocations with all
  their runtime args** into an audit log; a human (or agent) reviews
  the logs for misbehaving callers. Permit-and-watch instead of deny.
  This is the object-tier instance of the recorded resilience posture
  (*friction + daylight; detect evasion, not malice*).
- **What call security IS**: *"tagging sensitive operations and doing
  AOP around them to try and keep the game stable and secure"* — the
  tension being maximum creative freedom for content authors vs bad
  actors *and plain incompetence* that creates game-balance issues.
  Balance-stability is a first-class goal of the gate system, not just
  intrusion resistance.

## What the OO sweep actually landed (the three postures)

The sweep moved ~190 subject-first Api statics onto their owner
mixins/classes (census 338 → 0, `lint:object-verbs` CI-gating). Gate
treatment split three ways:

### 1. The self-subject `FromMixin` widen (~18 hosts, the dominant shape)

The logic singleton's per-method gate became:

```ts
AnyOf(
  FromModule('/api/<x>#<X>Api'),                    // the facade arm
  FromMixin('<HostMixin>', {
    where: (caller, _t, _m, args) =>
      caller.stuffId === (args[SUBJECT] as ...).stuffId,
  }),
)
```

Hosts as shipped: Combustible, Furnace, Globbable, Chattel, Energized,
Charged (arg 1), Arcane, Caster, PartyMember, NotifyPolicy,
HasInteractive, SubjectSubscriber, Organization (args 0 *and* 1
variants), Employed, Bank, Combatant (args 0 and 1 variants),
Wieldable, plus `FromModule('/platform/idea/Interactive')` arms on
Connection/Card/Prompt/MqlSubscription/ForumSubscription/Reaction
state-holders and `FromModule('/lib/material/Material',
{includeSubclasses})` on MaterialLogic.

⭐ **What this posture actually protects**: impersonation only. The
chain is: ungated mixin forward → gated logic that admits *the subject
itself*. So any code **holding a reference to the object** can invoke
its public verbs through it — possession is capability. What the gate
prevents is calling the logic *as an object you are not*. The
"who initiates" question is answered only where participant contracts
or controller-side checks remain.

⚠ **`FromMixin` matches the `_mixinName` marker, which a pack class can
simply declare** — unlike `FromTemplate`, which reads the hard-private
`#templatePath` stamp (unspoofable). The spoof is bounded by the
self-subject `where`: a marker-claiming class can only act on ITSELF.
That is accidentally the interface-openness future in embryo. The pass
should either bless this (record it as the openness mechanism) or
re-anchor the widens on `FromTemplate`/`FromClass` where the host set
is enumerable.

### 2. Participant contracts (untouched, doctrine-preferred)

`FromClass`/`FromMixin` + a *relational* `where` (the Party exemplar:
`ByRosteringParty` — the party whose roster you sit on, writing its own
path). call-security.md § Participant contracts now records this as the
DEFAULT posture for new object-owned mutators, plus the three-way gate
rule in antipatterns.md § A subject-first Api static:
participant contract → self-subject widen → ungated+sealed.

### 3. Ungated + sealed (the deliberate deviation — the pass's main target)

Where the plan's `FromController` gate tables were contradicted by
grounding (the writers span PACK controllers, and ⭐ *a pack must never
need a kernel list edit*), the method shipped with **no caller check at
all**: `@Final @Unshadowable` seals + the invariant living in the logic
+ the `canX` veto seams as extension points. The full set as merged
(from `git diff origin/master`, sealed-no-gate public methods on lib
mixins):

| Domain | Methods | Balance sensitivity |
|---|---|---|
| Advancement | `creditSignature`, `creditDeed` | ⭐⭐ HIGH — writes the Transcript; competence derives from it |
| Chronicle (Persona) | `recordClaim`, `recordDeed`, `recordChronicleOnce`, `seedChronicleClaims` | ⭐ identity ledger, append-only |
| Belief | `learnIdentityOf`, `adjustRegard`, `setRegard`, `clearRegard` | ⭐ per-viewer memory; NPC-behavior inputs |
| Chattel | `stampChattel`, `transferChattel`, `setChattelPlace`, `followCustody` | ⭐⭐ HIGH — chain of title |
| Banking | `deposit`, `withdraw` | ⭐ conservation held by the postTransaction chokepoint beneath; these move coin↔balance |
| Glob | `split`, `absorb` | ⭐⭐ quantity conservation (was explicitly `ApiOnly` before — the one place the sweep consciously widened a stated denial) |
| Employment | `appoint`, `dismiss` | ⭐ roster + wallet conferral |
| Magic | `prepareCast`, `resolveCast`, `dischargeAt`, `chargeFrom` | ⭐⭐ the spend/effect pipeline |
| Fire | `ignite`, `tryAutoignite`, `douse`, `advanceBurn` (×Combustible, ×Furnace) | physics driver |
| Electricity | `conduct`, `shockContact` | physics driver |
| Thermal | `depositHeat`, `reconcilePhase` | physics driver |
| Slot | `occupyAll`, `transferOccupancy` | atomicity (pre-sweep D4a precedent) |

Mitigations already in place: the sandbox boundary + jurisdiction still
gate circle-scoped code; money conservation stays behind the sealed
`postTransaction` chokepoint; packs are units of review; field eval is
wizard-only and *wizard TS access is root anyway* (resilience posture).
The exposure that matters is **future non-wizard authored code paths**
and plain incompetence in reviewed pack code.

## The audit rail — design sketch

`@Audited(opts)` — a decorator on the SENSITIVE methods above (and any
the audit pass tags) that permits the call and, at a sampling rate,
records `{method, target stuffId+templatePath, caller identity (frame
target's templatePath + class), full runtime args (marshalled), frame
chain summary, commandId/causingCommandId, timestamp}` into an
`audit_events` collection.

- **Insertion point**: the proxy pipeline (`api/proxy.ts` `#runPipeline`
  / the `security.ts` gate stage) already intercepts every dispatch —
  sampling is one branch after the allow decision. The
  `#emitBoundaryReceipt` machinery is the in-tree precedent for
  structured security events.
- **Sampling**: per-method rate via decorator opts, with a `1.0`
  override dial (AppSettings) for targeted investigation; consider
  always-sample on `where`-clause near-misses.
- **Review surface**: a later concern — start with the collection + a
  wizard verb / CMS pane reading it; agent-assisted review is the
  eventual shape ("someone will go through these audit logs and try to
  find callers that are misbehaving").
- **Schema discipline**: `audit_events` needs its schema YAML
  (`src/schema/`), a `Collections` entry, and a reset disposition —
  `lint:schema` will enforce.
- ⚠ Mind the no-new-collections agreement — raise the one collection
  deliberately with the user; the alternative (document tree) is wrong
  here because audit rows are cross-parcel, queryable, and reaped by
  age.

## Future gate primitives to design (not yet built)

1. **`FromTemplateMethod(templatePath, methodName)`** — the user's
   preferred combined basis. The interception context knows the CALLED
   method (`ctx.prop`); the CALLER's method name is not currently
   tracked in frames — check what `ExecutionContextApi` frames carry
   and whether adding the dispatching method name to the frame is cheap
   (it is known at `method.apply` time in the proxy).
2. **`FromIdentity`** — already doctrine'd in call-security.md: MUST
   read the raw identity stamp, never the overridable
   `getIdentityPath()` (the FromTemplate/#templatePath reasoning).
3. **Pack-contributed gate participants** — the mechanism that would
   let the ungated+sealed set re-tighten without kernel list edits: a
   pack's manifest declares the gate arms its controllers need (the
   boot-manifest precedent), reconciled at install, revoked at
   uninstall. This is the structural answer to "the writers span packs."
4. **Interface-based admission** (the openness future) — if/when real
   content developers need alternative implementations: decide whether
   the mechanism is the `_mixinName` marker (status quo, spoof-shaped),
   a registered interface vocabulary, or per-pack conferral via (3).

## Where everything lives (orientation for the pass)

- Policies: `lib/security/SecurityPolicies.ts` (FromModule glob →
  module-id; FromTemplate → hard `#templatePath`; FromMixin → marker;
  FromClass; ApiOnly = `/api/**` FromModule + `/platform/idea/api/**`
  FromTemplate). Gate execution: `api/security.ts` `#securityGate`
  (boundary check → policy), `api/proxy.ts` pipeline.
- The self-subject `where` boilerplate is copy-pasted per logic file
  (compare by `stuffId` — proxy vs raw identity differs); the pass
  should hoist it into `SecurityPolicies` (e.g. `SelfSubject(argIndex)`)
  — it exists ~20 times.
- Boundary method sets: `#BOUNDARY_EXEMPT_METHODS` (now includes the
  naming projections `describeFor`/`describeWithStatusFor`/
  `salientFeatures`/`perceivedKeywordsFor`/`kindFor`/`presenceStatus`),
  `#MESSAGE_DELIVERY_METHODS`, `#INBOUND_TRANSPORT_METHODS`. The read
  aperture is `SecurityApi.projectAcross` — the naming/presence logics
  wrap their interior walks in it (RecognitionLogic, PresenceLogic,
  ProfileLogic.composeRow). ⚠ A moved projection needs BOTH the exempt
  entry (outer dispatch) and the aperture (interior walk) — D4b shipped
  without the aperture and only the sandbox escape suite caught it.
- The census: `scripts/check-object-verbs.ts` — CI-gating, zero;
  `EXEMPT_APIS` (57 entries, one-line mandate reasons) is the map of
  every surviving static surface. `NON_SUBJECT_TYPES` holds
  Subject/Board/Entry (Documents), Charge/Channel/Grade (value types).
- Doctrine recorded this build: antipatterns.md § A subject-first Api
  static (the three-way gate rule); architecture.md § the post-sweep
  Api-tier mandate; call-security.md § participant-default +
  identity-path rule.

## Acceptance shape for the pass (sketch)

1. Inventory every `@CallSecurity` site + every sealed-ungated public
   method (the table above is the merge-time snapshot; re-derive).
2. Classify each: participant contract / self-subject / needs-audit /
   needs re-gating (with the pack-manifest mechanism if built).
3. Ship `@Audited` + the collection + a minimal review read.
4. Hoist `SelfSubject(argIndex)`; decide the FromMixin-marker question
   deliberately; add `FromTemplateMethod` if the frame change is cheap.
5. The gym + full suite as pins; a live drive that exercises at least
   one audited call end-to-end and reads its own audit row back.
