# Access & authorization slate (working doc)

> **Status: architecture set, forks leaned.** The in-world permission
> layer — "can this *actor* do this *action* on this *resource*?" — that
> `call-security` explicitly reserved a seam for. Capability-based,
> diegetic-first, one `can()` core, two enforcement surfaces. Consumes
> the grouping facade (group-role is one capability source) and fills
> call-security's stubbed/deferred policy slots.

Working slate for **authorization** — the scattered access checks
(chat post/moderation, door locks, guild kick, file write-scope, wizard
verbs, the `forceX` admin bypass) unified into one model. Distinct from
`call-security` (the code-trust *mechanism*) and from the RPG sense of
"capability" in [capability-magic-slate.md](./capability-magic-slate.md)
(abilities/power) — here **capability = access authority**.

The unlock: **this is not a parallel system to bolt on.** `call-security`
already reserved the slots:

- `AdminOnly` is an explicit **always-deny stub**, documented as
  "replaced by a real permissions-aware policy *when the permission
  framework lands*."
- `Admin`, `ByCommandGiver`, `ByActingAvatar`, `ByResponsibleAvatar` are
  **deferred policies** — specified, unbuilt ("no consumer needs them
  yet").
- `getActingAvatar` / `getResponsibleAvatar` (stack-walkers to find the
  *in-world actor* behind a call) are deferred for the same reason.
- `forceX` + `AdminOnly` is the standardized admin-override shape.

We're filling those reserved slots, not inventing.

See also:

- [docs/subsystems/call-security.md](../subsystems/call-security.md) —
  the enforcement substrate (caller-identity policies, frames, shadows,
  force-bypass, the audit gap). This slate realizes its reserved
  permission seam.
- [grouping-slate.md](./grouping-slate.md) — `GroupApi`; **group-role is
  a capability source** (control-via-groups). The facade pattern this
  slate mirrors.
- [chat-slate.md](./chat-slate.md) / [emotes-slate.md](./emotes-slate.md)
  — consumers: channel post/moderate roles; the **expression-policy /
  emote-only gag** is `can(actor, 'speak', channel)`.
- [docs/subsystems/properties.md](../subsystems/properties.md) — field-
  level access (masks) is a fine-grained consumer.
- [scoped-authoring-slate.md](./scoped-authoring-slate.md) — access on
  **WRITE** (the per-field (policy, validator)); the *do/see/write*
  shape below.
- [spoiler-slate.md](./spoiler-slate.md) — access on **SEE/KNOW** (best-
  effort fact-gating); the other arm of the shape.
- [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
  / command-spec — validators are the action-level enforcement point.
- [docs/subsystems/messaging.md](../subsystems/messaging.md) —
  **`MudlogApi` is the audit sink** (closes call-security's Pillar 5).
- [docs/design-philosophy.md](../design-philosophy.md) — diegetic-first
  access; liberal diegesis for the meta-tier.

---

## Principle

1. **Fills call-security's reserved permission seam** — realizes
   `AdminOnly`→`Admin`, the deferred actor-aware policies, and the
   stack-walk subject helpers.
2. **Call-security ≠ authorization.** Call-security asks "may this
   *caller* (a Stuff/null) invoke this *method*?" (code-trust,
   invariants, go-through-the-Api). Authorization asks "may this *actor*
   (player/NPC) do this *action* on this *resource*?" (in-world rights).
3. **Capability-based, diegetic-first.** Access is mostly *emergent from
   the world* — keys, ownership, ranks, location — not abstract ACLs.
   `can()` reads the world.
4. **One core, two surfaces.** A single `can(subject, action, resource)`;
   enforced at privileged method chokepoints (call-security policies) and
   at the action layer (command validators + controller checks).

---

## The layers

```
ACTION-LEVEL ENFORCEMENT          METHOD-LEVEL ENFORCEMENT
command validators +              call-security policies
controller can() checks           (Admin / ByActingAvatar → can())
(open this door, post here)       (forceX, destroy, manager mutations)
        └──────────────┬──────────────────┘
                       ▼
            can(subject, action, resource)          ← THE CORE
                       │  effective capabilities from pluggable sources
   ┌───────────┬───────┼─────────────┬──────────────┐
   ▼           ▼       ▼             ▼              ▼
POSSESSION  OWNERSHIP  GROUP-ROLE   LOCATION/      TIER
(key/badge) (your      (GroupApi)   CONTEXT        (player/builder/
            stuff)                  (in zone)       wizard/owner)
                       │
            (subject from the frame stack: getActingAvatar / getResponsibleAvatar)
                       │
   built on ──▶  CALL-SECURITY MECHANISM (proxy, policies, frames, force-bypass)
```

---

## The capability core — `can(subject, action, resource)`

A thin uniform check. The subject's **effective capabilities** come from
pluggable, **diegetic-first** sources; the action/resource declares a
**requirement**; `can()` tests one against the other. Predicate-shaped —
**not** a giant static capability enum (avoids the premature-vocabulary
trap; fork #4).

| Source | Diegetic? | Example |
|---|---|---|
| **possession** | fully | hold a key/keycard/badge → open this lock |
| **ownership** | yes | your avatar, inventory, home-room, created group/channel |
| **group-role** (`GroupApi`) | yes | guild officer → kick; channel mod → moderate; member → post |
| **location / context** | yes | you're in the zone / adjacent |
| **tier** | meta (liberally wrappable) | player / builder / wizard / owner |

Same facade pattern as `GroupApi` (and group-membership is literally one
of its sources). Likely a thin `AccessApi.can(...)` — the sanctioned
cross-cutting-Api case (no host), or a set of call-security policies that
call a shared core. Build it **incrementally** (fork #1): wire the real
`Admin` policy + the tier + the group-role source against today's actual
consumers (`forceX`, chat, doors); grow sources as real needs appear.
Don't speculate a policy DSL.

**The subject** is the in-world actor behind the call, resolved by
walking the frame stack — the deferred `getActingAvatar` /
`getResponsibleAvatar` helpers. *Lean (fork #2): the responsible/acting
avatar* (the actor ultimately behind the call), which the deferred
`ByActingAvatar`/`ByResponsibleAvatar` policies will key on.

---

## Two enforcement surfaces, one core

- **Method-level** (call-security policies — *the reserved seam
  realized*). For **privileged / must-never-bypass operations** gated at
  the chokepoint no matter how reached: `forceX`, `Stuff.destroy()`,
  manager mutations. `AdminOnly`-stub → a real `Admin` policy backed by
  the tier; `ByActingAvatar` calls `can()` with the stack-walked actor.
  Coarse-ish (tier/critical-capability gates on specific methods).
  **Don't** push *all* rich authorization here — the interceptor runs on
  every method call; reserve it for chokepoints.
- **Action-level** (command validators + controller checks). For
  **rich, content-configurable, per-resource** player-facing decisions
  where the verb + resource are clear: open *this* door, post to *this*
  channel, kick from *this* guild. Verb-level requirements ride a
  validator (`requires: tier` / `requires: capability`); resource-level
  checks call `can(actor, action, resource)` in the controller.

Both call the **same `can()`**. The split is *chokepoint integrity*
(method) vs *player rights* (action).

---

## Diegetic-first (the project flavor)

Most access is **emergent from the world**, not an ACL list: a door is
locked because you don't hold the key; a hall is yours because you own
it; the guild bank obeys your rank; the lab is reachable because you're
in the building. `can()` reads possessions, ownership, relationships, and
location — so "access control" is mostly *content + world state*, not a
permissions table. Only the **meta-tier** (wizard/staff) is non-diegetic,
and per liberal diegesis it wraps fine ("the Architects"). This is what
makes it *our* access system rather than generic RBAC.

---

## The unification

Everything we'd been scattering collapses into instances of one model:

| Scattered check | Becomes |
|---|---|
| command validators (`requiresAnimate`, wizard-only `eval`) | action-level `can()` / tier requirement |
| chat post · **moderation gag / emote-only** | `can(actor, 'speak', channel)` (expression-policy = a capability source) |
| door locks | `can(actor, 'open', door)` ← key possession |
| guild kick · channel moderate | `can(...)` ← role via `GroupApi` |
| file / source-tree write-scope | `can(actor, 'write', path)` ← ownership/scope |
| `AdminOnly` stub + `forceX` | real `Admin` policy ← tier; force = the audited bypass |
| property field masks | fine-grained `can()` on field access |

One mental model, many sources.

## The broader shape: do / see / write × circumstances

The unification goes wider than *actions*. The same circumstance-
conditioned-gating shape covers three kinds of thing a subject can be
gated on, and the access "context" spans more than role/scope:

> **What can a subject *do / see / author*, under what *circumstances*?**
> - **action**: **DO** (verbs — this slate's `can()`) · **SEE/KNOW**
>   (perception/inspection — the [spoiler slate](./spoiler-slate.md)) ·
>   **WRITE/AUTHOR** (content authoring — the
>   [scoped-authoring slate](./scoped-authoring-slate.md)'s per-field
>   (policy, validator)).
> - **circumstance**: role/tier · ownership/scope · **choice** (opt-in
>   self-restriction) · **integrity/progress** (imposed gates).

So:

- **Authoring** = access on **WRITE** (the per-field access *policy* is
  literally `can(subject, 'write', resource.field)`; a value-validator
  rides alongside).
- **Spoilers** = access on **SEE/KNOW** (revelation conditions extended
  with progress/integrity + a choice filter, over the percept model).

**Same shape, but two rigors — and the split is load-bearing:**

| | enforcement | why |
|---|---|---|
| **DO / WRITE** | **hard, server-enforced** | guards malicious *action*; knowing the source doesn't bypass — the server rejects the call regardless. |
| **SEE/KNOW** | **best-effort** (server withholds the fact) | guards *experience*; the content is ultimately public (open source), so it's a courtesy, not a boundary. |

These stay **distinct consumers with their own policies** (per the
per-consumer stance below) — not one mega-engine. The unification is the
*mental model* (one shape across do/see/write × circumstances), which is
what keeps the three from drifting apart; the *rigor* differs by threat
model.

## Force-bypass & deny composition

- **`forceX`** is the standardized, audited admin override (call-security
  already ships the shape on `forceDestruct`/`forceMove`). Verb
  controllers "try the polished path; on veto, fall back to `forceX` when
  `-f` and the tier allow." `AdminOnly` → real `Admin` policy is the swap.
- **Deny-wins** (fork #3, *leaned yes*): when a grant and a deny collide
  (a gagged guild-officer), the deny wins — reusing the grouping
  **override-layer** pattern (effective = grants − denies). Gags, bans,
  and lockdowns are denies that subtract from otherwise-granted access.

## Audit (a free win)

Call-security's Pillar 5 (audit) is an explicit gap — denies/shadow
events aren't wired to `MudlogApi`. Route **authorization denies + every
`forceX` use** to the Mudlog audit sink. This *also* satisfies the
moderation control plane's audit need: one stream for "who was denied /
who force-bypassed / who was gagged."

---

## Worked scenarios

- **Locked door (diegetic, possession):** `open door` → controller
  `can(actor, 'open', door)` → door requires a fitting key; actor's
  possessions satisfy it → opens. No ACL, just the world.
- **Guild kick (group-role):** `guild kick rookie` → `can(actor, 'kick',
  guild)` → `GroupApi.roleOf(actor, guild) == officer` → allowed; the
  guild system performs it.
- **Moderation gag (deny-wins):** a gagged player `chat guild hi` →
  `can(actor, 'speak', guild-channel)` → grant from membership, but the
  gag deny wins → refused + audited.
- **Wizard force (tier + bypass):** `destruct foo -f` → controller tries
  `StuffApi.destruct`; on veto, `forceDestruct` (gated by the real
  `Admin` policy ← wizard tier) → succeeds; the force use is audited.
- **Owned room (ownership):** in your home-room you may `describe`/`build`;
  a visitor can't — `can(...)` ← ownership.

---

## What this stresses

- **call-security** — realizes `AdminOnly`→`Admin`, the deferred
  actor-aware policies, and `getActingAvatar`/`getResponsibleAvatar`;
  wires denies to the audit sink (Pillar 5).
- **grouping** — `GroupApi` becomes a capability source; `roleOf` feeds
  `can()`.
- **chat / emotes** — channel roles + the expression-policy gag become
  `can()` consumers/sources.
- **command framework** — verb-level `requires:` validators; controllers
  call `can()` for resource-level checks.
- **MudlogApi** — the audit sink for denies + force uses.
- **properties** — field masks as a fine-grained consumer.

---

## Open questions

1. **`can()` scope now** — *Lean incremental:* realize the real `Admin`
   policy + tier + group-role source against today's consumers
   (`forceX`, chat, doors); grow sources as needed. No speculative DSL.
2. **Subject resolution** — `ByActingAvatar` vs `ByResponsibleAvatar` vs
   `ByCommandGiver`. *Lean: responsible/acting avatar.*
3. **Deny composition** — *Resolved-lean: deny-wins* (override-layer
   pattern).
4. **Capability representation** — predicate `can(actor, action,
   resource)` (*lean*) vs a typed capability-token vocabulary (heavier,
   but greppable/auditable like `forceX`). Possibly a hybrid: predicate
   core, named tokens for the audit-critical few.
5. **Tier ladder** — how many rungs (player / builder / wizard / owner?),
   and how each is diegetically wrapped. *Lean: a short ladder; tiers are
   one capability source, not a separate system.*
6. **Where `can()` lives** — a thin `AccessApi` (cross-cutting, no host —
   the sanctioned Api case) vs purely call-security policies calling a
   shared core. *Lean: a thin `AccessApi.can()` both surfaces consult.*
7. **NPC / system subjects** — system-initiated actions bypass (the
   `SystemRoot`/null-caller path); NPCs are normal actors. Confirm the
   bypass boundary.

---

## Build order

Incremental, against real consumers — no speculative framework.

**Wave 1 — realize the seam, coarsely.** `AccessApi.can()` thin core; the
**tier** capability source + the real `Admin` policy (replaces the
`AdminOnly` stub, re-gates every `forceX` uniformly); the
**group-role** source via `GroupApi`. Wire denies + force uses to the
`MudlogApi` audit sink. Subject resolution via the (now-built)
`getActingAvatar` helper.

**Wave 2 — diegetic sources + action-level.** Possession (keys/locks),
ownership, location sources; the `requires:` verb validator + controller
`can()` checks; migrate chat post/moderate + the expression-policy gag
onto `can()`; deny-wins composition.

**Wave 3 — depth.** Field-mask fine-grained checks; richer tier
semantics; the audit/review tooling (with the moderation control plane);
any typed-capability-token layer if the audit-critical set grows.

---

## What this slate does NOT cover

- **The call-security mechanism itself** (proxy, frames, shadows,
  caller-identity policies) — consumed/extended, not redefined.
- **Domain role models** (guild ranks, channel roles) — those are
  *capability sources*; their internals live in their own systems.
- **RPG capability/abilities** — [capability-magic-slate.md](./capability-magic-slate.md);
  different sense of the word.
- **The moderation control plane** — moderator tooling/scope/audit-review
  is the moderation subsystem; this slate provides the gag-as-deny + the
  audit stream it consumes.
- **Authentication / accounts** — *who you are* (OAuth/login) is upstream;
  this slate is *what you may do*.

---

## Once shaped into formal requirements

This slate boils down to:

- **`can(subject, action, resource)`** — the thin predicate core; the
  pluggable diegetic-first capability sources (possession / ownership /
  group-role / location / tier); the requirement-declaration shape.
- **Subject resolution** from the frame stack (`getActingAvatar` /
  `getResponsibleAvatar`); the chosen deferred policy.
- **Two enforcement surfaces** — method-level call-security policies
  (`Admin` realized, `ByActingAvatar` → `can()`, the `forceX` bypass) and
  action-level (validators + controller `can()`).
- **Deny-wins** composition (override-layer); gag/ban/lockdown as denies.
- **Audit** — denies + force uses → `MudlogApi` (closing Pillar 5).
- The **unification** of chat/moderation/locks/guild/file-scope/wizard
  checks onto the one model.
- Tests: a keyless actor is denied `open` on a locked door; a guild
  officer passes `can('kick', guild)`; a gagged member is denied
  `'speak'` despite membership (deny-wins); `forceDestruct` is gated by
  the real `Admin` policy and audited; a system/null-caller action
  bypasses; an unauthorized `eval` is refused by tier.

The typed-capability-token layer, field-mask depth, the moderation
control-plane tooling, and the full tier semantics wait for their own
waves.
