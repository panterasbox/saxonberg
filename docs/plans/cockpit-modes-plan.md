# S3 — plan

Implements
[cockpit-modes-requirements.md](../requirements/cockpit-modes-requirements.md).

**Five waves, two shippable halves.** Land as two MRs off one branch —
the mode axis touches the cockpit contract and the read surfaces touch
four unrelated subsystems, which is not one reviewable change.

| MR | Waves | What |
|---|---|---|
| **A — the cockpit axis** | 1–3 | `cockpit.mode`, per-mode arrangements, the pane set |
| **B — read surfaces** | 4–5 | Search, the competence digest, the notify read, docs |

B depends on nothing in A. **If time runs short, A ships alone** — it is
what the client overhaul is actually blocked on; B's gaps degrade to
"that panel is empty for now."

---

## Wave 1 — the vocabulary and the verb

Smallest possible slice that puts a mode on the wire.

1. `@saxonberg/types`: `CockpitMode` + `COCKPIT_MODES`
   (`world` · `study` · `classroom` · `tutor`), beside `LAYOUT_NAMES`
   and for the same reason — validator and client registry read one
   list.
2. `cockpit.mode` as a `clientState` key on `HasInteractiveMixin`,
   defaulting to `world`.
3. `cmd/shell/cockpit.yaml` + `obj/command/shell/CockpitController.ts`.
   Bare `cockpit` reports; `cockpit <name>` sets. Validator reads
   `COCKPIT_MODES`.
4. Follow the **write → save → push triple** `layout` already uses. Do
   not invent a second commit path — read `LayoutController` first and
   mirror it.

⚠ **Do not touch the `mode` verb.** Wave 1's own test asserts both
verbs coexist and that `applyInputMode`'s exemption still names the
input-mode verb only. That test is the guard against the collision this
build exists downstream of.

**Deliverable: `cockpit study` round-trips as a command.** Drive it
before Wave 2.

---

## Wave 2 — arrangements become per-mode

1. `LAYOUT_NAMES` → a per-mode map. The five current layouts are
   `world`'s; the other three modes ship one arrangement each.
2. `LayoutController`'s validator resolves against the **active mode's**
   set; an arrangement valid elsewhere is refused *with a reason naming
   the mode*.
3. **Per-mode arrangement memory.** A mode remembers the arrangement
   last used in it; `cockpit study` → `cockpit world` returns you where
   you were.

⚠ Memory is per-Interactive `clientState`, not a new store. Shape:
`cockpit.arrangements: { [mode]: layoutName }`. One key, and it rides
the persistence that `clientState` already has.

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
2. Hold conditions: `while-present` · `while-reachable` · `pinned`.
   Evaluated **server-side** — they are facts about the world.
3. Release carries a **reason** on the wire. A pane that vanishes
   silently reads as a bug.

⚠ **Reuse the S1 substrate.** The per-`Interactive` registry, dep index
and batched re-resolve exist. An N-pane set is N subscriptions plus a
lifetime rule. A second registry is the failure mode here, and criterion
9 asserts its absence.

⚠ Evaluate conditions on the **existing re-resolve batch**, not on a new
timer. A pane set with its own tick is a second clock.

---

## Wave 4 — the read surfaces

Three independent pieces; do them in this order, cheapest first.

**a. Competence digest** — a `subscribableFields` entry on `Avatar`
beside `practisingCompetence`. Derive on read from `transcripts`.
⚠ **No stored total** — the band is already a derivation and a cache
here is a second source of truth.

**b. Notification policy read** — the receiver's `NotifyRule`s plus the
ping variants they produce. The tray shows *what the receiver asked
for*, so the surface is the policy, not a feed.

**c. `SearchApi.query({ scope, terms, limit })`** — the new subsystem
face. Scopes: `wiki` · `forum` · `chat` · `press` · `help` · `all`.

- Reads **existing** storage. No new collection, no index build.
- ⚠ Viewer-filtering **deletes**: an unreadable source is absent, not
  redacted. Both directions tested — the honest-fog rule S2's resolver
  established.
- ⚠ Shape the call so a `'mine'` scope can be added without reshaping
  it. The frame-store decision is deliberately reversible.

---

## Wave 5 — docs

- `cockpit-layouts.md` — **rewritten** for the two axes, the arrangement
  memory, and *why the verb is `cockpit` and not `mode`*. That last is
  the thing a future reader will otherwise re-litigate.
- `inspection-pane.md` — the pane set and hold conditions.
- `search.md` — **new subsystem doc.**
- `advancement.md` — the digest.
- `CLAUDE.md` — **one line** for `search.md` in the map. One.

---

## Risks

| Risk | Handling |
|---|---|
| **The pane set grows a second subscription mechanism.** The likeliest real mistake. | Criterion 9 asserts the absence of a second registry. Read the S1 doc first. |
| **A mode quietly becomes a permission.** "Study mode shouldn't allow combat" is a seductive one-liner. | Criterion 7 asserts it does not. Written in Wave 2, before the temptation. |
| **The `cockpit` verb name ages badly.** | The runner-up (rename the per-bar verb to `bar`) is recorded in the requirements with its reasoning, so the swap is a decision and not an excavation. |
| **A catalogue row nothing warms at boot.** Has recurred three times; CombatFormation is still broken. | Criterion 14 — the test asserts a cold read fails LOUDLY, not that it defaults. |
| **Scope.** Two MRs, and A ships alone if B slips. | A is what the overhaul is blocked on. |

## Out of scope

Every wave of the client overhaul. The per-player frame store. Durable
clips + attestation. Traits on the dashboard. The `capital` stock.
