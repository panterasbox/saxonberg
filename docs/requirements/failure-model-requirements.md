# Failure model — requirements

**Kind:** refactor/sweep, with a feature edge (scripts handle failure)
**Leads from:** kernel. First consumers in this build: the boundary verbs
(`open` / `unlock` — *locked*, *no-key*), the bank's settle refusal (the one
thrown refusal a player meets today), the forum board's refusals, and the
shell's `def` / `do`.

When something goes wrong in Saxonberg today, usually nobody is told. A
refused command inside a script is noted and the script carries on; 2,272
`return null`s and roughly 351 empty-bodied `catch`es collapse
distinguishable failures into "nothing"; five subsystems each invented
their own thrown refusal; and the one thing a player could act on — *why*
it failed — is a sentence a controller composed, which no script, client
or pack can read. This build gives failure a **model**: a small palette of
kinds, each with a channel and a named consumer, a reason vocabulary any
pack can extend, and scripts that can see and handle the world's failures.

Seeding slate: [failure-model-slate](../slates/tech-debt/failure-model-slate.md)
(which absorbs [silent-write-census-slate](../slates/tech-debt/silent-write-census-slate.md)).
The decisions below were taken with the owner on 2026-11-18.

## What already exists

- **Returned refusals** — the act convention (`ok: false`, a reason, optional
  facts) is the healthy channel: ~1,670 sites. Reasons are closed per-protocol
  lists, so a pack cannot add one (`ride` stayed prose for that reason).
- **Reason codes** — at least 210 distinct codes in literal form, 137 used
  exactly once; each controller words its own refusals.
- **The response envelope** — a controller notes `controller-rejected` with a
  reason and detail; a throw that escapes becomes `controller-error` for the
  player plus an author diagnostic (`errors` verb). So a throw tells
  somebody, in developer terms.
- **Thrown refusals, five of them, each ad hoc** — the bank's settle refusal,
  the forum board's, the document store's, the wiki's denial, and the shell's
  script-line refusal.
- **34 typed error classes** in all, grown independently, two of them in
  `lib/errors.ts`.
- **Scripts** (`def` / `do`, `if` / `each` / `while`, coroutines) — fail
  closed on a prompt (`needs-input`) but **continue past any refused
  command**, and a command has no value a script can read.
- **Timed steps** already end with a coded abort reason (interrupted, …).
- **Fitted suggestions** — the grammar already offers *"did you mean …"* as a
  tappable command for one failure class.
- **Diagnostics** — `DiagnosticApi` + the `errors` verb; parcel title already
  answers *who maintains this row*.

Therefore what is genuinely new here is: **the palette and its rule** (each
kind's channel and consumer), **reasons as rows** (code + facts + wording,
pack-extensible), **one thrown-refusal family**, **`try … on`** and
stop-on-refusal in scripts, **content errors routed to the row's
maintainer**, and **three census ratchets** (silent catch, unawaited
promise, the act-surface null).

## Goals

- **Every failure kind has a channel and a consumer** — and a new kind is
  admissible only if some consumer acts differently on it (the guard against
  exceptions for their own sake).
- **A refusal is the same thing however it travels** — returned or thrown, it
  carries a reason and facts and reaches the player in the same words.
- **A reason is authored content** — one row per reason holds the shape of its
  facts and its wording; a pack ships its own; an author re-words one with no
  code change.
- **A script sees why** — a refused command stops the script and the stop is
  reported once, worded; `try { … } on <reason> { … }` handles a refusal
  deliberately, with the refusal's facts as values.
- **Scripts handle the world's failures, never the code's.**
- **A bad row reaches its maintainer, not the general pile** — and is refused
  at install where it can be checked statically.
- **Silence is counted** — silent catches, unawaited promises and reason-less
  nulls on act surfaces each have a ceiling that can only fall.

## Non-goals

- **Burning every ratchet to zero in this build** → the ratchets themselves;
  later sweeps against `failure-model-slate` (it stays PARTIAL with the
  burn-down as its `Left`).
- **Migrating all 210+ reason codes to rows** → same ratchet. This build
  migrates the first consumers' reasons and gates the rest.
- **A client that renders refusals as more than a sentence** (a locked-door
  glyph, a tappable *unlock*) → the envelope carries code + facts from this
  build; the rendering is `card-surface` / client work, recorded on
  `failure-model-slate`.
- **Reasons in `help`** (`help locked`) → help.md, later; the rows make it
  trivial.
- **A script that pauses to ask its owner** → declined in scripting.md
  (fail-closed), nowhere.
- **Retrying for the script automatically** → nowhere, deliberately; a script
  that wants to retry says so in its handler.
- **Localization of wording** → nowhere for now; the row is the seam.

## Placement

Kernel: the palette, the error families, the reason row mechanism, the
script interpreter, the gates. The **platform pack** ships the kernel's
reason rows; **each pack ships its own** under its root. A second pack adding
a reason needs zero kernel code — that is the test.

## Collisions

- **Every controller that words a refusal** — wording moves to the reason
  row; a migrated controller stops composing refusal prose. Unmigrated ones
  keep working (the ratchet counts them).
- **The five ad-hoc thrown refusals** fold into the one family.
- **Stored scripts** — `def`s in the document store change behavior (they
  stop at a refusal). No real users; breaking is accepted.
- **NPC scripts and authored demo content** run through the same interpreter
  and inherit stop-on-refusal.
- **`silent-write-census-slate`** — absorbed; its census becomes one input to
  the silent-catch ratchet.

## Surface decisions

### The palette — seven kinds, each with a channel and a consumer

| kind | channel | owed to |
|---|---|---|
| **refusal** — the world says no | returned (or thrown, same family) with reason + facts | player: worded · script: catchable by code · client: code + facts |
| **absence** — a read finds nothing | empty / false / skip | — ⚠ when the reader *knows why* (found, but shut), it is a refusal, not an absence |
| **choices** — several qualify | the existing choices outcome | the caller picks or asks; a script: `needs-input` |
| **content error** — a row is wrong | thrown, naming the row and field | player: in-world words · maintainer of the row: a diagnostic |
| **bug** — the code asked the impossible | a plain error | player: *"something went wrong"* · wizard: the diagnostic |
| **chokepoint breach** | thrown | nobody, ever: callers check first, so reaching a player is itself a bug |
| **unavailable** — infrastructure | thrown, retryable | player: *"try again"* · script: catchable |

### Thrown refusals are one family (owner)

A refusal may travel as an exception across a deep stack. It carries the same
reason and facts as a returned one, and the guarded roots word it from the
same row. The five ad-hoc kinds fold in. Specificity lives in the **reason
code**, not in a subclass.

### A reason is a row (decided — lenses 2 and 3a)

One row per reason under its owner's root, holding the **shape of its facts**
(`locked` → the thing that is locked) and its **wording** over those facts.
The wording lives **only** in the row — a controller that also worded it
would be two copies of one sentence. The code is the row's address, so a
pack's reason is namespaced by its root and resolves by path when used.
Every consumer reads the same row: the stopped-script report, `$why`, the
guarded root's thrown-refusal wording, the client's envelope, the parse-time
check. ⚠ Wording that needs context the facts lack is solved by growing the
facts — which is exactly what scripts and the client need anyway.

### A refused command stops the script (owner)

The script's result is the refusal, reported once: *"stopped at `open
north`: the oak door is locked."* Effects already made stand.

### `try { … } on <reason> { … }` (owner)

`on` takes one or more reasons, or `*`. Inside the handler, `$why` is the
refusal — its code and its facts **as script values** (`$why.target` is the
door itself). A misspelled or unknown reason is refused **when the script is
parsed**, with a fitted suggestion — a handler that can never fire is a loud
error, not a silent one. A timed step interrupted mid-way is a refusal with
its abort reason (`on interrupted`).

### Scripts handle the world, never the code (owner)

Catchable: refusals, `needs-input`, choices, unavailable. **Never** catchable,
not even by `on *`: bugs and content errors — the script stops and the
diagnostic goes to whoever owns the defect.

### Content errors reach the row's maintainer (decided — lens 2)

A content error names its row; the diagnostic routes to that row's
maintainer by parcel title, and the player is told something is wrong with
*the thing*, in world terms. The installer and the lint family refuse rows
whose references do not resolve (a grade band, a material, a reason), so the
play-time path is only for what cannot be checked statically.

### Three ratchets (decided)

- **Silent catch** — a `catch` that neither rethrows, records a diagnostic,
  nor converts to a refusal. Ceiling ≈ 351 today.
- **Unawaited promise** — a promise fired with nothing to catch its failure.
  Ceiling ≈ 267.
- **Reason-less null on an act surface** — an act or resolver that returns
  null where a refusal was distinguishable. `return null` everywhere is too
  blunt to count; the census is scoped to acts and resolvers.
- And **the reason-row ratchet**: reason codes in code with no row.

### Late failures have an owner too

A failure inside a scheduled completion (after the controller is gone) goes
to the command that caused it — the attribution already exists — as a late
note, plus a diagnostic; never to nobody.

## Lens pass

1. **Pedagogy** — facts name the cause (*which* door, *what* it wants), so a
   failure teaches; a script that handles `locked` by unlocking encodes the
   lesson.
2. **Creative expression** — the ordinary case is a row: a pack adds a
   reason, an author re-words one, a player's script handles one — no code.
   The bespoke case (a new act) declares its reasons as rows like everyone
   else.
3. **3a Immersion** — one wording per reason, in world terms, everywhere —
   including refusals thrown from deep in the bank. Raw exception text never
   reaches a player. **3b Participation** — scripts that recover make
   automation a skill players build; no gap found.
4. **Values** — the undecidable choice is *who may hide a failure*; decided:
   a player's script may handle the world's, never the code's (a defect must
   always reach a person).
5. **Continuity** — reasons are rows, so a later epoch's act (an electric
   lock) answers with the same `locked` and old scripts still handle it.
6. **Economy** — produces nothing in-world; consumes authoring time on rows.
   The demand was there first: every silent failure found in the last ten
   drives.
7. **Governance** — routing a content error to its maintainer by title judges
   no person; no criterion needed.

## The drive

Staged in a test world; every step `instant` or `staged`. A locked door north
of a room (the boundary verbs), a key that opens it, a bank account short of
a price, a pack-shipped reason.

1. **(player)** `open north` → *"The oak door is locked."* — the wording comes
   from the `locked` row, and the envelope carries the code and the door.
2. **(player)** `def fetch { open north; go north }` then `do fetch` →
   the script stops at `open north`: one report, *"stopped at `open north`:
   the oak door is locked."* — and `go north` never runs.
3. **(player)** `def fetch2 { try { open north } on locked { unlock
   $why.target; open north }; go north }`, `do fetch2` with the key held →
   unlocked, opened, through.
4. **(player)** Same script without the key → stops at `unlock`, worded from
   `no-key`.
5. **(player)** `def bad { try { open north } on lockd { } }` → refused at
   parse: *"no reason `lockd` — did you mean `locked`?"*, tappable.
6. **(player)** A purchase the account cannot cover (the settle refusal,
   thrown deep in the bank) → worded from its reason row exactly like a
   returned refusal; no exception text.
7. **(player)** `try { <that purchase> } on * { say "Short today." }` → the
   handler runs (`*` catches a thrown refusal).
8. **(staged)** A wizard writes a recipe row naming a grade band that does not
   exist → the installer/lint refuses it. Forced through to play anyway
   (staged) → the player sees *something is wrong with that recipe*; the
   row's maintainer sees the diagnostic in `errors`; an unrelated wizard
   does not.
9. **(staged)** A script `try { <the staged bad act> } on * { say caught }` →
   the handler does **not** run; the script stops; the diagnostic goes to the
   maintainer.
10. **(player)** A pack-shipped reason (a trade's own refusal) handled by
    `try … on <pack reason>` → works with no kernel change.
11. **(player)** `try { fell <a tree> } on interrupted { say "Later." }`,
    interrupted mid-cut → the handler runs.
12. **(staged)** The datastore made unavailable for one call (a test seam) →
    the player is told to try again; `try … on unavailable` catches it.

## Acceptance criteria

- A player never sees raw exception text, from any command or script.
- Every refusal a player meets in the drive is worded from its reason row, and
  re-wording the row (no code change) changes what the player sees.
- A script stops at its first refusal and reports it once, worded.
- `$why` exposes the refusal's facts as objects a script can act on.
- An unknown reason in `on` is refused when the script is parsed, with a
  suggestion.
- No script handler ever runs for a bug or a content error.
- A pack can ship a reason and scripts can handle it with no kernel change.
- A content error's diagnostic reaches the row's maintainer and no one else.
- A thrown refusal and a returned one with the same reason are
  indistinguishable to the player, the script and the client.
- The silent-catch, unawaited-promise, act-surface-null and reason-row
  counts are each published and can only fall.

## Cross-references

- [failure-model-slate](../slates/tech-debt/failure-model-slate.md) ·
  [silent-write-census-slate](../slates/tech-debt/silent-write-census-slate.md)
- [response-envelope.md](../subsystems/response-envelope.md) ·
  [diagnostics.md](../subsystems/diagnostics.md) ·
  [scripting.md](../subsystems/scripting.md) ·
  [command-spec.md](../subsystems/command-spec.md) ·
  [activity.md](../subsystems/activity.md) (abort reasons) ·
  [content-packs.md](../subsystems/content-packs.md) ·
  [parcel.md](../subsystems/parcel.md) ·
  [spatial.md § Writes on a detached subject](../subsystems/spatial.md)
- [lint-family.md](../lint-family.md) (census-then-ratchet)
