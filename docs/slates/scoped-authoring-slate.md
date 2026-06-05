# Scoped personal authoring slate (working doc)

> **Status: model set, GUI is the bulk (and a client concern).** The
> democratized, *safe*, ownership-scoped slice of content authoring —
> every player authors their own space (their dorm). The server stays
> thin (`write`/`cat` + a validation gate); the complexity is the client
> GUI + the permissions/validation model. The validation core is a
> **(access-policy, value-validator) pair per field, default-deny** — not
> a boolean flag.

Working slate for **scoped personal authoring** — the content-authoring
on-ramp surfaced by onboarding (you learn to customize your dorm). It's
strategically the platform's path to *player-generated content*, so the
safety story carries the design.

The load-bearing decisions:

1. **Democratized, but safe *structurally*.** Every player authors their
   own space; the safety doesn't rest on trust — abusive authoring is
   *unexpressible*, not policed after the fact.

2. **GUI-first, thin-command** — *the deliberate exception to command-bus
   primacy.* Nobody hand-types room decoration; the GUI wins (even
   mobile). So the server surface is thin (`write`/`cat` + validation),
   and the **complexity lives in the client GUI + the permissions**.

3. **One authoring ladder, access-gated.** Scoped-personal (everyone,
   own space, default-deny per field) → granted (assigned areas) →
   wizard (full power, code, the existing shells). Scoped personal
   authoring is the bottom rung.

4. **The validation core is a (policy, validator) pair, default-deny —
   not a flag.** A boolean conflates two questions and under-powers both;
   split them: **(a) an *access policy* — who/when may write this field**
   (reuse the access system), and **(b) a *value validator* — what values
   are legal** (composable). The gate on a write is `auth ∧ validate`.

5. **Functional content comes from vetted catalogs, not free declaration.**
   Players *instantiate* from balanced, content-team-authored templates;
   they never *parameterize* functional stats. The god-weapon is
   structurally impossible (functional fields never opt in + catalog-only).

6. **`write`/`cat` is the universal primitive.** The wizard shell (raw)
   and the player GUI are two front-ends over it, gated by the same
   policy/validator.

See also:

- [docs/slates/access-slate.md](./access-slate.md) — the **authorization
  half** (the access policy on field-writes; the ladder; ownership-
  scoping). Authoring is access applied to `write`. Also the do/see/write
  × circumstances framing this instantiates.
- [docs/subsystems/shell-author.md](../subsystems/shell-author.md) /
  [docs/subsystems/shell-workspace.md](../subsystems/shell-workspace.md)
  — `write`/`cat` + the homedir (`$HOME`); the **wizard front-end** (the
  top rung).
- [docs/subsystems/properties.md](../subsystems/properties.md) — per-
  field access-control + masks; the value-validator echoes the
  Hydrator's per-field validation.
- [docs/slates/onboarding-slate.md](./onboarding-slate.md) — the dorm-
  customization step that introduces this; the dorm = homedir-as-room.
- [docs/slates/client-cockpit-slate.md](./client-cockpit-slate.md) — the
  **rich authoring GUI** (the bulk of the work) is a client concern.
- [docs/subsystems/persistence.md](../subsystems/persistence.md) —
  authored space state persists (snapshot/restore).
- moderation (the sanitizer = one value-validator) + **the spoiler/
  integrity thread** (parallel concern, perception-side — its own slate).
- [docs/design-philosophy.md](../design-philosophy.md) — content-vs-engine
  (thin server, content-heavy); safe-by-default.

---

## Principle

1. **Democratized + structurally safe** (abuse unexpressible).
2. **GUI-first, thin-command** (the command-bus exception).
3. **Default-deny**; per-field **(access policy, value validator)**.
4. **One access-gated ladder** (personal → granted → wizard).
5. **Functional content via vetted catalog**, never free declaration.

---

## The thin server surface

The universal content-authoring primitive is **`write`/`cat`** (exist).
Both front-ends bottom out in them:

- **Wizards** use them raw (the author/workspace shell — technical users).
- **Players** use them via a **rich GUI** (a visual room editor) — never
  typing them.

So the server adds little: `write`/`cat` + the **validation gate**
(below). (`describe`/`put` already exist for trivial cases.) Authoring is
**GUI-first** — a deliberate exception to command-bus primacy: the GUI
writes data via `write`, not via previewable verb-commands.

---

## The validation core — (policy, validator) per field, default-deny

A field is **wizard-only unless it explicitly opts into authoring.** When
it opts in, it carries **two** things — because "is authorable" is really
two questions:

### (a) Access policy — *who / when* may write it

This *is* the access slate applied to a field-write: `can(subject,
'write', resource.field)`. Usually `owner-of-this-space`, but as rich as
access policies get — a **conditional** policy ("only if you've unlocked
X," "only in your own dorm," "only during char-gen"). Not a flag; a
policy.

### (b) Value validator — *what values* are legal

A function `(value, object, context, subject) → ok | reject`, composed
from small constraints: type · range · length · **enum / catalog-
membership** · reference-validity · **moderation** · **cross-field
consistency**. Because it sees the whole object + context, it does what a
bound can't (consistency, "must point at something you own"). The "modes"
(free-within-bounds vs choose-from-a-set) aren't special — they're just
*different validators* (a range vs a membership check).

### The gate

A `write` passes iff **`auth(policy) ∧ validate(value)`**. Default-deny
means a field with no policy is simply not player-writable.

### How it covers the cases

| Field | access policy | value validator |
|---|---|---|
| `description` | owner-of-space | text · maxlen · **moderated** |
| `name` | owner-of-space | text · moderated · unique |
| `sharpness` / `damage` / effects | *(never opts in → denied)* | — |
| catalog instance (`make`) | owner-of-space + quota | **member of vetted catalog** |
| progress-unlocked field | `can(...)` conditional | … |
| consistency-bound field | owner | **cross-field** validator |

The **god-weapon** fails at (a) — `sharpness` never opted in — *and* at
(b) — you didn't get it from a vetted catalog. Structural, both ways. A
length-bomb description fails at (b). Decorating someone else's dorm
fails at (a).

### Why it's the right amount of machinery

- **Reuses what exists** — authorization is the access/capability system
  (already rich); value-validation echoes properties' access-control +
  the Hydrator's validation. No new policy DSL.
- **Scales simple→rich** — most fields are trivial (denied by default;
  the few that open get a one-line policy + a stock validator like
  `text+moderated`, `range`, or `catalog`); the expressiveness
  (conditional access, cross-field validators) is available when needed,
  never imposed.

---

## The permissions structure (the access half)

The **ladder**, expressed as a write-permission policy scoped by
ownership: scoped-personal writes to *your owned content* (dorm /
homedir); granted rungs to assigned areas; wizard to anything (+ code).
**Space ownership** is the scoping anchor — you own your dorm (control-
over, via access); **co-owned spaces / roommates** = a shared-ownership
group (grouping facade) — deferred.

---

## The player surface (the GUI — bulk of the work, client-owned)

A **rich visual room editor**: edit descriptions, place/arrange owned
items, `make` decor from a curated catalog, add look-at-able details.
Under the hood it's `cat` (read) + `write` (write) against your owned
content. This is the largest piece of work — and it's a **client /
cockpit concern**, with its own client design. This slate owns the
**server + permissions/validation**; it points at the GUI.

---

## Quotas & the catalog

- **Quota** — a per-space object/size budget (anti clone-spam); expressed
  as a value-validator/budget check on `make`.
- **Catalog** — content: curated, balanced, instantiable templates
  players can `make`. The catalog-membership check is a value-validator.
  Functional catalog items carry pre-vetted stats (authored at the wizard
  rung), so "take it out and grief" is fine — it's balanced.

---

## Persistence

A player's customized dorm is **persisted per-character** (the dorm is
their homedir-as-room); ties to persistence + the snapshot/restore
surface (`TemplateApi.snapshotToTemplate`/`restoreFromTemplate`) applied
to the owned space.

---

## What this reveals / needs (new)

- **The (policy, validator) per-field model + default-deny** — the
  validation core (reuses access + composable validators).
- **Quotas** — a per-space budget (small resource-accounting).
- **Space ownership** — you own your dorm (access); roommates = a group
  (deferred).
- **A safe decor/furniture catalog** — content.
- **(Parallel, separate)** the **spoiler/integrity** concern — perception-
  side, best-effort, its own slate (see below).

Everything else **reuses**: `write`/`cat` + the workspace homedir; access
(ladder/ownership/policy); properties (per-field access-control);
moderation (sanitizer = a validator); persistence (snapshot); templates
(catalog instantiation).

---

## Open questions / forks

1. **GUI-first as a command-bus exception?** *Confirmed* — record it; the
   GUI writes data via `write`, not previewable verb-commands.
2. **The (policy, validator) model?** *Confirmed* — the validation core.
3. **Where the authoring GUI is designed** — its own client slate vs
   client-cockpit. *Lean: its own (it's substantial).*
4. **Quota model** — *Lean: a simple per-space object budget v1.*
5. **Space ownership / roommates** — *Lean: solo dorms v1; co-owned =
   a group, deferred.*
6. **Catalog scope v1** — *Lean: a small decor catalog.*

---

## Build order

**Wave 1 — the safe core + a basic editor.** The validation gate on
`write` (**default-deny**; the (policy, validator) pair); the **permission
scoping** to your dorm/homedir; opt-in the cosmetic fields
(`description`/`name` with text+moderated validators) + placement + a
**small catalog** (`make`, catalog-membership validator) + a **quota**; a
**basic client editor** over `cat`/`write`.

**Wave 2 — richer GUI + content.** A richer room editor; more catalog;
appearance/details; co-owned spaces (roommates) if wanted.

**Wave 3+ — up the ladder.** Granted rungs (assigned areas), deeper
building (structure); **crafting** (player-set *functional* stats) is a
*separate, deferred system* with its own balance/validation — not this.

---

## What this slate does NOT cover

- **The rich authoring GUI internals** — client/cockpit design.
- **The wizard authoring shell** — exists; the top ladder rung.
- **Crafting** (player-chosen functional stats within a balanced
  envelope) — a separate, deferred system; dorm authoring touches *no*
  functional stats.
- **Spoiler / secret / integrity protection** — the parallel perception-
  side concern (best-effort server-side fact-gating + a player choice
  guard; assessment integrity is a deeper, separate assessment-system
  problem). Its own slate.
- **The economy** — catalog `make` is free/comped v1.
- **The do/see/write × circumstances unification** — belongs in the
  access slate as the meta-framing.

---

## Once shaped into formal requirements

This slate boils down to:

- **`write`/`cat` + a validation gate** as the thin server surface; the
  GUI-first stance (a command-bus exception).
- The **validation core**: per-field, **default-deny**, an **(access
  policy, value validator)** pair; the gate = `auth ∧ validate`; reusing
  access (who/when) + composable validators (what), with **catalog-
  membership** and **moderation** as validator instances.
- The **permission structure** (the ladder as a write-policy scoped by
  **space ownership**; conditional policies available).
- **Quotas**, the **safe catalog** (content), and **per-character
  persistence** of authored space.
- The **rich client GUI** flagged as the bulk-of-work, client-owned.
- Tests: a player writes `description` of their own dorm (passes auth +
  moderated validator); the same write on another's dorm fails auth;
  `sharpness` is unwritable by a player (no policy); `make` only yields
  vetted-catalog items, within quota; authored state persists.

The GUI, crafting, spoiler/integrity, co-owned spaces, the economy, and
higher ladder rungs wait for their own work.
