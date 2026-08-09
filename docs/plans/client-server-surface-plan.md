# The client-server surface — plan

Implements
[client-server-surface-requirements.md](../requirements/client-server-surface-requirements.md).

**Seven waves, three MRs.** Three because the three halves touch
nothing in common and reviewing them together would mean reviewing none
of them carefully.

| MR | Waves | What |
|---|---|---|
| **A — the cockpit axis** | 1–3 | `cockpit.mode`, per-mode arrangements, the pane set |
| **B — affordance honesty** | 4–5 | Enumerate the gap, then close it |
| **C — read surfaces** | 6–7 | Search, competence digest, notify read, docs |

They are independent. **If time runs short, A and B are what the client
overhaul is actually blocked on** — C's gaps degrade to "that panel is
empty for now", while A's absence blocks the layout work and B's
absence means every verb menu in the new UI is wrong.

---

## Wave 1 — the vocabulary and the verb

Smallest slice that puts a mode on the wire.

1. `@saxonberg/types`: `CockpitMode` + `COCKPIT_MODES`
   (`world` · `study` · `classroom` · `tutor`), beside `LAYOUT_NAMES`
   and for the same reason.
2. `cockpit.mode` as a `clientState` key on `HasInteractiveMixin`,
   defaulting to `world`.
3. `cmd/shell/cockpit.yaml` + `obj/command/shell/CockpitController.ts`.
   Bare `cockpit` reports; `cockpit <name>` sets.
4. Follow the **write → save → push triple** `layout` already uses.
   **Read `LayoutController` first and mirror it** — do not invent a
   second commit path.

⚠ **Do not touch the `mode` verb.** Wave 1's own test asserts both
verbs coexist and that `applyInputMode`'s exemption still names the
input-mode verb only.

**Deliverable: `cockpit study` round-trips as a command.** Drive it
before Wave 2.

---

## Wave 2 — arrangements become per-mode

1. `LAYOUT_NAMES` → a per-mode map. The five current layouts are
   `world`'s; the other three modes ship one arrangement each.
2. `LayoutController`'s validator resolves against the **active mode's**
   set; an arrangement valid elsewhere is refused *with a reason naming
   the mode*.
3. **Per-mode arrangement memory** — `cockpit study` → `cockpit world`
   returns you where you were.

⚠ Memory is per-Interactive `clientState`, not a new store. Shape:
`cockpit.arrangements: { [mode]: layoutName }`. One key, riding the
persistence `clientState` already has.

⚠ **A mode gates nothing.** Wave 2's test asserts a verb runnable in
`world` runs in every mode. Write it now, while the temptation to
"helpfully" scope verbs to modes is live.

---

## Wave 3 — the pane set

The wave with real design risk. **Read
[mql-subscription.md](../subsystems/mql-subscription.md) and
[inspection-pane.md](../subsystems/inspection-pane.md) before writing
anything.**

1. `InspectionPane`'s single slot → an N-pane set.
2. Hold conditions: `while-present` · `while-reachable` · `pinned`,
   evaluated **server-side**.
3. Release carries a **reason** on the wire.

⚠ **Reuse the S1 substrate.** An N-pane set is N subscriptions plus a
lifetime rule. A second registry is the failure mode; criterion 9
asserts its absence.

⚠ Evaluate conditions on the **existing re-resolve batch**, not a new
timer. A pane set with its own tick is a second clock.

---

## Wave 4 — enumerate the affordance gap

The mechanical prerequisite to Wave 5, and what turns a scary 88-spec
change into a reviewable one. **This wave lands a report and a gate, not
a fix.**

1. `scripts/check-arg-kinds.ts` — for every `type: object` arg in
   `cmd/**` and `domain/**`, report whether it carries a semantic kind
   validator, declares `targetKind: any`, or is **unaccounted for**.
   Measured today: **112 args, 24 validated, 88 unaccounted.**
2. For each unaccounted arg, record **what the controller actually
   refuses** — read the controller, do not guess from the verb name.
   The output is a table: spec → arg → controller's refusal → the
   predicate that expresses it → proposed validator (existing or new).
3. **Cluster the predicates.** Many verbs share one: everything in
   `bulk/` wants "is a bulk source/sink", `boundary/` wants "is
   openable/lockable". Expect ~15–25 validators to cover 88 args; a
   validator per arg would be the failure.
4. ⚠ Mark the genuinely unconstrained (`author/` wizard verbs) for
   `targetKind: any` rather than inventing a constraint for them.

**Land the table.** Wave 5 acts on it.

⚠ Do not skip step 2. The whole risk in this MR is a validator that
states a refusal the controller does not actually make — criterion 17
calls under-reporting a build failure, and the only defence is having
read the controller.

---

## Wave 5 — close it

1. Add the clustered validators to `lib/command/validators/`. Each is
   **extracted from a controller**, and the controller then uses the
   same predicate — one source of truth (requirements § 8).
2. Apply them across the 88 args; `targetKind: any` where declared.
3. **A test per validator asserting the controller refuses exactly what
   the validator excludes** (criterion 16). This is the shared-predicate
   constraint made checkable.
4. `check-arg-kinds.ts --lint` becomes CI-gating.
5. **The before/after candidate-set comparison** (criterion 17): resolve
   the affordance set over a representative world before and after, and
   diff. Every move must be `enabled → disabled` for a target the
   controller would refuse. **A verb that lost availability is a bug in
   the sweep, not an acceptable cost.**

⚠ Codemod the YAML, but **review the diff by eye**. 88 spec edits is
the shape of change that hides one non-mechanical mistake.

⚠ Stage by name.

---

## Wave 6 — the read surfaces

Three independent pieces, cheapest first.

**a. Competence digest** — a `subscribableFields` entry on `Avatar`
beside `practisingCompetence`, derived on read from `transcripts`.
⚠ **No stored total.**

**b. Notification policy read** — the receiver's `NotifyRule`s plus the
ping variants they produce. The surface is the policy, not a feed.

**c. `SearchApi.query({ scope, terms, limit })`** — the new subsystem
face. Scopes: `wiki` · `forum` · `chat` · `press` · `help` · `all`.

- Reads **existing** storage. No new collection, no index build.
- ⚠ Viewer-filtering **deletes**: an unreadable source is absent, not
  redacted. Both directions tested.
- ⚠ Shape the call so `'mine'` can be added without reshaping it.

---

## Wave 7 — docs

- `cockpit-layouts.md` — **rewritten** for the two axes, arrangement
  memory, and *why the verb is `cockpit` and not `mode`*. That last is
  what a future reader will otherwise re-litigate.
- `inspection-pane.md` — the pane set and hold conditions.
- `command-routing.md` + `command-spec.md` — the validator rule, the
  shared-predicate constraint, and `targetKind: any`. **The resolver's
  candidate set is no longer purely syntactic; say so where S2 said the
  opposite.**
- `search.md` — **new subsystem doc.**
- `advancement.md` — the digest.
- `quantity.ts` — the stale `world.measure.*` doc reference.
- `CLAUDE.md` — **one line** for `search.md`. One.

---

## Risks

| Risk | Handling |
|---|---|
| **A validator states a refusal the controller doesn't make.** A verb silently disappears from menus and nobody can discover it. The worst outcome in this build. | Wave 4 step 2 reads every controller before proposing a predicate. Criterion 16 tests the pairing; criterion 17's before/after diff catches it at the set level. |
| **The pane set grows a second subscription mechanism.** | Criterion 9 asserts the absence of a second registry. Read the S1 doc first. |
| **A mode quietly becomes a permission.** "Study mode shouldn't allow combat" is a seductive one-liner. | Criterion 7, written in Wave 2 before the temptation. |
| **The sweep grows a validator per arg** instead of a shared vocabulary. | Wave 4 step 3 clusters *before* Wave 5 writes anything; ~15–25 covering 88 is the target, and a validator that duplicates an existing one is a defect by the constraints. |
| **A catalogue row nothing warms at boot.** Recurred three times; CombatFormation is still broken. | Criterion 14 — the test asserts a cold read fails LOUDLY. |
| **Scope.** Three MRs. | A and B are the blocking ones; C degrades gracefully. |

## Out of scope

Every wave of the client overhaul. The per-player frame store. Durable
clips + attestation. Traits on the dashboard. The `capital` stock.
Rewriting controllers, or changing what any verb does when it runs.
