# Arrival — implementation plan

Wave 2 of the client rebuild. Scope, decisions and acceptance criteria
are [arrival-requirements](../requirements/arrival-requirements.md);
this is the *how*, in build order.

**Shape:** one MR, ten phases, **server first**. The client phases each
depend on a wire that already landed, so nothing is built twice against
a moving payload. If the session runs out, the cut is between phase 6
and phase 7 (the requirements' A/B split).

---

## Grounding — facts established by investigation, do not re-verify

### The wire as it stands

- `CharGenStatePayload` carries **five** hardcoded option arrays
  (`speciesOptions`, `sexOptions`, `pronounOptions`,
  `aspirationOptions`) plus `picks`, and `missing: CharGenField[]` where
  `CharGenField` is a closed union of five.
- `EnrollController` already has the right structure: a `FIELDS`
  table, one `FieldHandler` per field, each knowing `applicable` /
  `isSet` / `options` / `validate` / `apply`. **The table is already the
  single definition; the payload re-states it.**
- `CharGenRosterEntry` **already carries** `lastSeen`, `playStanding`,
  `lastLocation` and `practice` — shipped in MR C, and
  `packages/client` has never read any of them. Its doc comment
  explains why they must ride the payload: at `Login` you are not
  embodied, so no subscription is available.
- `DossierSection.rows` is `{ label, value }` — no level.
  `SpeciesApi.buildDossier` has exactly **one** caller,
  `EnrollController`.
- `prompt.format` is rendered **server-side** already
  (`PromptApi.renderPromptRefresh`). Not this wave's concern; recorded
  so it is not mistaken for a gap.

### The standing seam

- `InfluenceApi.standingForHost(host, stock)` is the one function the
  `standing` verb, `ProfileLogic.selfDigest` and the `makeStanding`
  live field all read through. **Its account aggregation is an explicit
  stub** that returns the host's own subject standing.
- `STOCK_LEVEL` already declares `producer` and `capital` as `account`,
  `consumer` as `character`. Vocabulary exists; arithmetic does not.
- The previous attempt's three named defects: split-brain (only the
  dashboard changed), wrong cutoffs (`Band.fromScalar` with no argument
  silently uses `DEFAULT_BAND_THRESHOLDS`), silent downgrade (read
  `getUser()`, unset, fell back with nothing saying so).
- `Avatar.getUser()` is **runtime-only and unpersisted**;
  `User.playerIds` is the persisted ownership list.
- ⭐ **`PANES.self` deliberately omits `makeStanding`**, and its comment
  says so in as many words: *"It joins this list the day the account
  roll-up lands."* This wave is that day — see D6.
- `producer_events` dedupes appends on `{author, actor, bucket}`, and
  `author` is a per-character durable `templatePath`.

### The client as it stands

- `CharGenStage.tsx` — 941 lines. Carries `optionsFor(field)`,
  `FIELD_HEADING`, `ILLUSTRATED_FIELDS` and a `SCREENS` config that
  chunks fields into five screens with client-side Back/Next.
- `CharacterSelect.tsx` — 238 lines, minimal: name, species,
  description, a Play button, a create button, a sign-out link. **It
  also carries a dev auto-enter latch** (`autoEnterPending` →
  auto-`play` the first character) that the dev loop depends on.
- `StartScreen.tsx` — 265 lines. `PROVIDERS` is already a data-shaped
  list; `configuredProviders` comes from `/auth/status` and `null`
  means *not yet known* (render enabled). `PressRoom` is **never
  awaited** and renders `null` rather than an error.
- `Figure` (live / empty / unwired, reason required on the latter two)
  and `UnbuiltGround` (hatched card) ship from Build A.
- `useIsCompact()` subscribes to `matchMedia` — not a one-shot read.
- `tokens.rail.width` is `22rem`; `App.tsx` carries a comment recording
  that the in-world layout's fixed rail makes the document 698px at a
  390px viewport.

### What has no source

- No `retire` / `restore` / `rename` / `appearance` verb.
- No mailbox, offline-notice store or notice queue.
- No nightly wipe — no cron, no CI job, no script.
- A guest is `anon:<nanoid>` with **no persisted `User`**.
- `'capital'` (Fund) returns a zero standing tagged with the stock.

---

## Decisions

### D1 — The payload is *projected* from `FIELDS`, not assembled beside it

One new function on `EnrollController`, `projectFields(draft, cfg)`,
maps the `FIELDS` table to `CharGenFieldState[]`. Each `FieldHandler`
gains two static descriptors — `kind` and `label` — and the projector
reads `applicable`, `isSet`, `options` and the current value from the
handler that already computes them.

The acceptance test is behavioural, not structural: **add an entry to
`FIELDS` and it appears on the wire with no other edit.**

This is the whole point. Today a new field is a `types` change plus a
payload change plus a client change; after this it is a table entry.

### D2 — `picks` leaves the wire; a field carries its own value

Two sources of truth for the same fact is what created the adapter
switch. `CharGenFieldState.value` is the field's current value as a
display string; `CharGenPicks` stops being emitted.

**The name field needs no new concept.** Its `value` is the joined
display name and its `suggestion` keeps the `{ name, surname }` shape
it already has, so the text renderer knows to show two inputs when a
suggestion carries a surname. The client keeps sending
`enroll name <given> <surname>` exactly as it does now.

⚠ Do **not** invent a `parts` array or a per-component value. The
suggestion shape already discriminates one-input from two-input, and a
second mechanism would be the same duplication D1 removes.

### D3 — `missing` gates; the client never names a field to gate on

`missing: string[]`. The confirm control is enabled iff `missing` is
empty, and the "still missing" line renders the server's list verbatim.
No client-side knowledge of which fields are required, or in what
order.

### D4 — `SCREENS` becomes an ordering *hint*, and leftovers still render

The client keeps layout ownership, but its grouping config stops being
exhaustive:

1. Fields named by the config render in its groups, in its order.
2. **Every field not named by it renders anyway**, appended, each on its
   own screen, using its `kind` renderer and server `label`.
3. A field with an **unknown `kind`** renders as a hatched row naming
   the reason — never omitted.

Rule 2 is the one that matters: without it a server-added field can be
invisible while still gating `enroll confirm` through `missing`, which
is a dead-end the player cannot diagnose. Two tests, one per rule.

### D5 — `standingForAccount` holds the arithmetic; `standingForHost` may return `undefined`

```ts
InfluenceApi.standingForAccount(subjectIds: string[], stock: Stock): InfluenceStanding
InfluenceApi.standingForHost(host: Stuff, stock: Stock): InfluenceStanding | undefined
```

`standingForAccount` sums the per-subject producer scalars and bands the
sum with the **producer-configured** thresholds. `standingForHost`
resolves an account-level stock to its subject list via
`getUser().playerIds` → `Avatar.getTemplatePath(id)` and delegates;
character-level stocks are unchanged and never return `undefined`.

`undefined` means **this account could not be resolved** and no caller
may substitute a per-character figure for it. This copies
`measuredRenownOf`, which already returns `undefined` for an
unmaterialized scope precisely so *never measured* is distinguishable
from *measured at zero*.

Each of the three recorded defects gets a structural answer, not a
promise: split-brain is impossible because both entry points run one
function; cutoffs come from AppSettings; the downgrade path is a
return type rather than a fallback.

### D6 — `PANES.self` gains `makeStanding`, and its guard test flips

The catalogue's comment states the condition for admission — *"the day
the account roll-up lands"* — and `pane-catalogue.test.ts` currently
asserts the field is **absent**. Both change in phase 3, together with
the roll-up, in the same commit.

⚠ This is the trap in this wave: adding the field without the roll-up
puts a wrong-level figure on the wire; landing the roll-up without the
field leaves a number computed and unused, which the comment warns is
"a number the next builder wires up in one line". They move together or
not at all.

### D7 — The reset notice is a policy the server reports

`/auth/status` gains two fields: an aggregate `online` count, and an
optional `resetPolicy` describing the wipe. The front door renders the
presence line from the first and the reset notice **iff** the second is
present. It is absent today.

`/auth/status` is already public and already fetched by `App.tsx`, so
this adds no request. The count is an aggregate only — no names.

### D8 — The rail collapse is a layout change, not a token change

`tokens.rail.width` stays `22rem`; the compact branch stops rendering
the rail as a fixed column. Changing the token would silently affect
`ForumLayout`, `FilterDrawer` and `SettingsPane`, which are not this
wave's business and are not the thing that is broken.

⚠ Verified under `isMobile: true` only. This is the same class as the
ICB bug and a narrow desktop viewport cannot see it.

### D9 — The dev auto-enter latch survives the `CharacterSelect` rewrite

`autoEnterPending` + the local `autoEntering` latch are load-bearing for
the dev loop ("Skip to world" must not stop at the picker), and the
latch exists because the store flag is cleared while the window is still
open. Carry both across verbatim, with the comment.

Easy to lose in a rewrite and immediately annoying.

### D10 — One MR, server-first, compact last

Order is: wire → arithmetic → server reads → client screens → compact →
driven. Every client phase consumes a payload that already shipped in an
earlier phase of the same MR, so nothing is written twice against a
moving target. Compact is last because it is the phase that must be
verified in a real browser and benefits from everything else being
settled.

---

## Phase 1 — The char-gen payload

**Types.** `CharGenFieldState`, `CharGenFieldKind`; `CharGenStatePayload`
loses the four option arrays and `picks`, gains `fields`;
`missing: string[]`; `error.field: string`. `CharGenField` stays as a
server-internal key type and leaves `@saxonberg/types`' wire surface.

**Server.** Each `FieldHandler` gains `kind` + `label`;
`EnrollController.projectFields` maps the table; the emitter calls it.

**Test.** Add a throwaway field to `FIELDS` in a test and assert it
appears on the wire with no emitter edit (D1). Assert `missing` is still
computed from `FIELD_ORDER` applicability, unchanged.

⚠ `enroll` must stay fully typeable — the payload is display only. A
bare-text-client test run of the whole flow is the guard.

## Phase 2 — The dossier's reveal level

`DossierSection.rows` becomes `{ label, value, spoiler?: number }`.
`SpeciesApi.buildDossier` stamps the level from `fieldMeta` where it
reads one — Composition's `Density` and `Edible` are the live cases;
Biology, Classification and Anatomy are level 0.

**Test.** `Density` arrives carrying `spoiler: 1`.

## Phase 3 — Account-level Make

`InfluenceApi.standingForAccount` + the `standingForHost` resolution and
return-type change (D5). `PANES.self` gains `makeStanding` and
`pane-catalogue.test.ts` flips (D6). `Login.rosterFigures` gains the
account block, reading `standingForAccount` directly with the account's
subject paths.

Fund renders from `'capital'`, which returns a zero standing tagged with
the stock — the client hatches on that, not on a special case.

**Tests.**
- Two characters band from the sum.
- Splitting one character's work across two does not change the figure.
- The roster's account figure and an in-world `makeStanding` read for
  the same account **agree** — the split-brain defect as an assertion.
- `DEFAULT_BAND_THRESHOLDS` is not reachable on this path.
- An unresolvable host yields `undefined` and no caller substitutes.

## Phase 4 — The front door's server side

`/auth/status` gains `online` and optional `resetPolicy` (D7). No auth
required; aggregate only.

## Phase 5 — The front door

`StartScreen` onto the civic ground: the three providers (unconfigured
ones disabled, `null` still meaning *unknown → enabled*), the guest
control with its honest warning, `PressRoom` beside it and still never
awaited, the live presence line, the reset notice gated on
`resetPolicy`.

The guest door (requirements D14) — a persistent quiet route back to
sign-in whose copy says a real character starts fresh.

**Tests.** No reset copy renders while the server reports no policy; the
guest copy does not imply preservation.

## Phase 6 — Intake

`CharGenStage` rebuilt against `fields`. Delete `optionsFor`,
`FIELD_HEADING`, `ILLUSTRATED_FIELDS`. Two renderers — `choose-one` and
`text` — dispatched on `kind`. `SCREENS` demoted to an ordering hint
with the leftover and unknown-kind rules (D4). Illustrated is derived
(*options carry `image` or `dossier`*), not declared. Dossier rows at
level ≥ 1 collapse.

**This is the A/B cut point.** Everything above is the pre-account
phase.

## Phase 7 — Character select

The roster reading the four MR C fields; the detail pane; "Since you
left" wrapped in `UnbuiltGround`; retire/restore/rename/appearance as
disabled controls with distinct reasons; the account standing block from
phase 3; never-played as a reasoned `empty`, never a zero; the Enter
control previewing `play <id>`. Carry the dev auto-enter latch (D9).

Single-character accounts pre-select on desktop.

## Phase 8 — Compact

Phone forms for all three screens: sign-in above the fold with the press
room as the scroll; intake one column; character select as two screens
split by question, with a single-character account opening straight on
the detail and a way back to the list.

Then the rail collapse (D8).

## Phase 9 — Driven, not just green

⚠ **The wave is not done when the suite is green.** Wave 1 found six
bugs by driving that a fully green suite could not see, and three were
structural blindness in the tests themselves.

- The whole path at 390px `isMobile`: front door → intake → character
  select → in-world, with no horizontal scroll on any screen. One e2e
  spec; the wave's headline assertion.
- The same path on desktop.
- **Ask of each new subscription: does anything actually open it?** The
  mobile bar's dead `self` subscription passed eleven tests that seeded
  the store directly.
- Intake completed end to end from a bare command line, no clicks.

## Phase 10 — Docs

`char-gen.md` § Forward compatibility rewritten to describe what
shipped; `client-shell.md` gains the three arrival screens and their
phone forms; `influence.md`'s stub section records the formula, the two
entry points and the unresolved outcome; the client slate marks Wave 2
shipped; `CLAUDE.md` map entries widened by one line each if a doc's
one-liner is now wrong.

---

## Test cadence

`pnpm test:near` per phase; one full `pnpm test` before the MR and one
after the last review round. `pnpm lint` and `pnpm build` before push —
`build:types` catches the frozen-literal breakages `vitest` does not.

---

## ⚠ Flags — worth a nod before or during the build

1. **`CharGenPicks` leaving the wire may have a consumer I have not
   found.** Phase 1 should grep before deleting.
2. **The roster's account block is per-account, but the payload is
   per-character-list.** If a future account has 50 characters the sum
   is 50 standing reads per roster emit. Fine now; worth a comment.
3. **Retired characters** — the roster branches on a state nothing
   currently sets. The branch ships against whatever the server can
   report, which today is *nothing is retired*. Do not invent the state
   to demo the branch.
4. **`/auth/status` gaining an online count** is a public unauthenticated
   read. Aggregate only, and it should stay that way.
5. **The A/B cut** is between phases 6 and 7 if the session runs out.
6. **Backticks inside styled-components CSS comments** terminate the
   template literal. Cost Wave 1 time twice.

---

## Critical files

| File | Phase |
|---|---|
| `packages/types/src/index.ts` | 1, 2, 3 |
| `mud/obj/command/charactergen/EnrollController.ts` | 1 |
| `mud/api/species.ts` (`buildDossier`) | 2 |
| `mud/api/influence.ts` | 3 |
| `mud/lib/connection/Panes.ts` + `api/__tests__/pane-catalogue.test.ts` | 3 |
| `mud/obj/Login.ts` (`rosterFigures`) | 3 |
| `backend/` `/auth/status` | 4 |
| `client/src/components/StartScreen.tsx` | 5 |
| `client/src/components/CharGenStage.tsx` | 6 |
| `client/src/components/CharacterSelect.tsx` | 7 |
| `client/src/layouts/WorldLayout.tsx`, `App.tsx` | 8 |
| `e2e/tests/` | 9 |
