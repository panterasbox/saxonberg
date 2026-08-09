# The client-server surface — plan

Implements
[client-server-surface-requirements.md](../requirements/client-server-surface-requirements.md).

**Eight waves, three MRs.** Three because the halves touch nothing in
common and reviewing them together would mean reviewing none carefully.

| MR | Waves | What |
|---|---|---|
| **A — the cockpit** | 1–4 | The `cockpit` verb, the mode axis, arrangements, the pane set |
| **B — affordance honesty** | 5–6 | Enumerate the gap, then close it |
| **C — read surfaces** | 7–8 | Search, competence digest, notify read, docs |

They are independent. **If time runs short, A and B are what the client
overhaul is actually blocked on** — C's gaps degrade to "that panel is
empty for now", while A blocks the layout work and B means every verb
menu in the new UI is wrong.

---

## Wave 1 — the host verb, and the absorption

The consolidation, before anything new rides on it. **No new capability
in this wave** — the same three things the player could already do,
reached through one verb.

1. `cmd/shell/cockpit.yaml` + `obj/command/shell/CockpitController.ts`,
   with subcommands `mode` · `layout` · `scope` · `style`. Bare
   `cockpit` reports all four.
2. **Absorb the three existing controllers.** `LayoutController`,
   `StyleController` and `ModeController` become the subcommand
   handlers. `style`'s existing subcommand tree (`show`, `theme`,
   `channel`, …) nests under `cockpit style` **unchanged** — a
   subcommand of a subcommand, not a flattening.
3. **Delete `layout.yaml`, `style.yaml`, `mode.yaml`.** No default
   aliases: one name per thing (requirements § 1).
4. ⭐ **`applyInputMode`'s exemption becomes `cockpit`.** The literal
   `'mode'` in `api/command.ts` becomes `'cockpit'`, and the comment
   states the rule it now expresses: *interface control is not world
   input.*

⚠ Wave 1's tests, both directions (criterion 3): a bar scoped to a
channel can run **every** `cockpit` subcommand un-prefixed, **and** an
ordinary verb typed in that bar is still prefixed. The second is what
makes it an exemption rather than a hole.

⚠ The client dispatches `mode chat --bar <id>` today from its own UI
controls, and `layout <name>` from the Views menu. Those sites move.
**Grep `packages/client` before declaring this wave done** — a missed
one fails silently at runtime, not at build.

**Deliverable: every cockpit control works, through one verb.** Drive
it before Wave 2.

---

## Wave 2 — the mode axis

1. `@saxonberg/types`: `CockpitMode` + `COCKPIT_MODES` — `chat` ·
   `play` · `watch` · `build` · `govern`, the slate's front doors.
2. `cockpit.mode` as a `clientState` key on `HasInteractiveMixin`,
   defaulting to `play`.
3. ⚠ **Legacy migration, and it is a MAPPING, not a rename.** Every
   player who ever ran `layout builder` has `cockpit.layout: 'builder'`
   persisted, and the five old values now name a *mode plus that mode's
   default arrangement*:

   | legacy `cockpit.layout` | → mode | → arrangement |
   |---|---|---|
   | `world` | `play` | default |
   | `forum` | `chat` | default |
   | `livestream-viewer` | `watch` | viewer |
   | `streamer` | `watch` | streamer |
   | `builder` | `build` | default |

   Criterion 5 requires the test to use a real stored legacy value — a
   fresh-default test passes either way and proves nothing. `watch` is
   the row that matters most: two legacy values collapse into one mode
   with *different* arrangements, so a test that only covers `builder`
   would miss the only interesting case.

4. `cockpit mode <name>`, validated against `COCKPIT_MODES`, following
   the **write → save → push triple** the absorbed layout path already
   uses. Mirror it; do not invent a second commit path.

---

## Wave 3 — layouts become savable arrangements

⚠⚠ **The biggest shape change in MR A, and the one an earlier draft of
this plan got wrong.** The slate says layouts are *savable* pane
arrangements — a player composes and names one. So `cockpit layout`
**cannot validate against a frozen list** the way `layout` does today.

1. Per-mode **shipped defaults** — each mode ships at least one
   arrangement, and `watch` ships two (`viewer`, `streamer`) because the
   migration table needs them.
2. `cockpit layout <name>` resolves against **the mode's defaults plus
   this player's saved arrangements**. A name that exists in another
   mode is refused *with a reason naming the mode*.
3. `cockpit layout save <name>` names the current arrangement;
   `cockpit layout list` / `cockpit layout forget <name>`.
4. **Per-mode arrangement memory** — `cockpit mode chat` →
   `cockpit mode play` returns you where you were.

⚠ Saved arrangements and the memory are per-Interactive `clientState`,
not a new store. `cockpit.arrangements: { [mode]: name }` for the
memory; the saved set rides the same key space. One store, riding the
persistence `clientState` already has.

⚠ A player-supplied name is player-supplied **input** — length-capped,
and it can never collide with a shipped default in a way that shadows
it silently. Say which one won.

⚠ **A mode gates nothing.** Criterion 9's test asserts a verb runnable
in `play` runs in every mode. Write it now, while the temptation to
"helpfully" scope verbs to modes is live.

---

## Wave 4 — the pane set

The wave with real design risk. **Read
[mql-subscription.md](../subsystems/mql-subscription.md) and
[inspection-pane.md](../subsystems/inspection-pane.md) before writing
anything.**

1. `InspectionPane`'s single slot → an N-pane set.
2. **Five hold conditions**, evaluated **server-side**: `unanswered` ·
   `here` · `present` · `inReach` · `carried`. A manual pin **overrides
   either way** — it is not a sixth condition.
3. Release carries a **reason** on the wire.

⭐ `unanswered` first. It is the one the slate leans on (*"nothing that
is still actionable ever leaves"*), the one an earlier draft omitted,
and the only one whose subject is a pending **command**, not a Stuff —
so it is the one that will not fit the shape you build for the other
four if you build them first.

⚠ **Reuse the S1 substrate.** An N-pane set is N subscriptions plus a
lifetime rule. A second registry is the failure mode; criterion 11
asserts its absence.

⚠ Evaluate conditions on the **existing re-resolve batch**, not a new
timer. A pane set with its own tick is a second clock.

---

## Wave 5 — enumerate the affordance gap

The mechanical prerequisite to Wave 6, and what turns a scary 88-spec
change into a reviewable one. **This wave lands a report and a gate, not
a fix.**

1. `scripts/check-arg-kinds.ts` — for every `type: object` arg in
   `cmd/**` and `domain/**`, report whether it carries a semantic kind
   validator, declares `targetKind: any`, or is **unaccounted for**.
   Measured today: **112 args, 24 validated, 88 unaccounted.**
2. For each unaccounted arg, record **what the controller actually
   refuses** — read the controller, do not guess from the verb name.
   Output: spec → arg → controller's refusal → the predicate that
   expresses it → proposed validator (existing or new).
3. **Cluster the predicates.** Many verbs share one: `bulk/` wants "is
   a bulk source/sink", `boundary/` wants "is openable/lockable".
   Expect ~15–25 validators to cover 88 args; a validator per arg is
   the failure mode.
4. ⚠ Mark the genuinely unconstrained (`author/` wizard verbs) for
   `targetKind: any` rather than inventing a constraint for them.

**Land the table.** Wave 6 acts on it.

⚠ Do not skip step 2. The whole risk in this MR is a validator that
states a refusal the controller does not make — criterion 20 calls
under-reporting a build failure, and the only defence is having read
the controller.

---

## Wave 6 — close it

1. Add the clustered validators to `lib/command/validators/`. Each is
   **extracted from a controller**, and the controller then uses the
   same predicate — one source of truth (requirements § 9).
2. Apply them across the 88 args; `targetKind: any` where declared.
3. **A test per validator asserting the controller refuses exactly what
   the validator excludes** (criterion 19) — the shared-predicate
   constraint made checkable.
4. `check-arg-kinds.ts --lint` becomes CI-gating.
5. **The before/after candidate-set comparison** (criterion 20):
   resolve the affordance set over a representative world before and
   after, and diff. Every move must be `enabled → disabled` for a
   target the controller would refuse. **A verb that lost availability
   is a bug in the sweep, not an acceptable cost.**

⚠ Codemod the YAML, but **review the diff by eye**. 88 spec edits is
the shape of change that hides one non-mechanical mistake.

⚠ Stage by name.

---

## Wave 7 — the read surfaces

Three independent pieces, cheapest first.

**a. Competence digest** — a `subscribableFields` entry on `Avatar`
beside `practisingCompetence`, derived on read from `transcripts`.
⚠ **No stored total.**

**b. `makeStanding` becomes account-level** (requirements § 8). *Make*
is something the person does; only *Play* is per-character.
⚠ Do **not** re-key `producer_events` — aggregate across the account's
characters on read. Rewriting the ledger has a wrong answer available
(silently dropping the history of anyone with more than one character),
and derive-on-read makes the rewrite unnecessary.

**c. Notification policy read** — the receiver's `NotifyRule`s plus the
ping variants they produce. The surface is the policy, not a feed.

**d. `recall` + `SearchApi.query({ scope, terms, limit })`** — the new
subsystem face **and its verb**. Scopes: `wiki` · `forum` · `chat` ·
`press` · `help` · `all`.

⚠ The verb is `recall`, **not** `search` — `search` is the in-world
perception verb (finding a concealed thing). An Api with no verb would
break the axiom on the one surface that advertises it.

- Reads **existing** storage. No new collection, no index build.
- ⚠ Viewer-filtering **deletes**: an unreadable source is absent, not
  redacted. Both directions tested.
- ⚠ Shape the call so `'mine'` can be added without reshaping it.

---

## Wave 8 — docs

- `cockpit-layouts.md` — **rewritten**, and probably **renamed**: it
  documents one verb with four subcommands now, an activity axis and an
  arrangement axis. Carry *why the five layouts became modes* — that is
  what a future reader will otherwise re-litigate.
- `inspection-pane.md` — the pane set and hold conditions.
- `command-routing.md` + `command-spec.md` — the validator rule, the
  shared-predicate constraint, and `targetKind: any`. **The resolver's
  candidate set is no longer purely syntactic; say so where S2 said the
  opposite.**
- `shell-environment.md` / `shell-alias.md` — `cockpit scope` replaces
  the `mode` verb wherever they name it.
- `search.md` — **new subsystem doc.**
- `advancement.md` — the digest.
- `quantity.ts` — the stale `world.measure.*` doc reference.
- `CLAUDE.md` — **one line** for `search.md`, and its command-category
  list names `layout` / `mode`, which no longer exist.

---

## Risks

| Risk | Handling |
|---|---|
| **A validator states a refusal the controller doesn't make.** A verb silently disappears from menus and nobody can discover it. The worst outcome in this build. | Wave 5 step 2 reads every controller before proposing a predicate. Criterion 19 tests the pairing; criterion 20's before/after diff catches it at the set level. |
| **The absorption breaks a client dispatch site.** `mode chat --bar <id>` and `layout <name>` are sent by UI controls today. | Wave 1 greps `packages/client` explicitly. A missed site fails at runtime, not at build — so the grep *is* the test. |
| **The legacy `cockpit.layout` migration is written but never exercised.** | Criterion 5 requires a stored legacy value in the test, not a fresh default. |
| **The pane set grows a second subscription mechanism.** | Criterion 11 asserts the absence of a second registry. Read the S1 doc first. |
| **A mode quietly becomes a permission.** "Study mode shouldn't allow combat" is a seductive one-liner. | Criterion 9, written in Wave 3 before the temptation. |
| **The sweep grows a validator per arg** instead of a shared vocabulary. | Wave 5 step 3 clusters *before* Wave 6 writes anything; a validator that duplicates an existing one is a defect by the constraints. |
| **A catalogue row nothing warms at boot.** Recurred three times; CombatFormation is still broken. | Criterion 17 — the test asserts a cold read fails LOUDLY. |
| **Scope.** Three MRs. | A and B are the blocking ones; C degrades gracefully. |

## Out of scope

Every wave of the client overhaul. The per-player frame store. Durable
clips + attestation. Traits on the dashboard. The `capital` stock.
Rewriting controllers, or changing what any verb does when it runs.
