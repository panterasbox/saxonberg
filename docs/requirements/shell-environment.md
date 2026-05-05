# Requirements: Shell Environment Subsystem (`EnvironmentMixin`)

Status: requirements draft. Successor: an architectural reference doc
under `docs/subsystems/`.

## Purpose

Provide a per-avatar typed, named keyspace that features can read at
runtime to configure their behavior, and that players can mutate
through a small set of commands. This is the first piece of a future
"shell" subsystem (`lib/shell/`) inspired by Unix shells (bash/zsh),
which will eventually grow additional mixins (working directory,
aliases, history, prompt) and commands (filesystem-style navigation,
env manipulation, etc.).

Concrete day-one use cases:
- Player-configurable message highlighting (colors, patterns).
- Default entrance/exit messages on rooms that don't override them.
- Future: prompt format, autoexits, anything currently hardcoded that
  ought to be a preference.

## Scope

### In scope

- A new mixin `EnvironmentMixin` providing per-instance storage for
  two value stores (persistent + session), the read/write surface
  feature code calls into, and schema-walking methods that introspect
  the avatar's composed mixin chain. Settings live on the mixin, not
  behind a separate Api layer or registry (see "Public Surface").
- A schema declaration convention: each mixin carries a static
  `settings: SettingsSchemaEntry[]` field listing the keys it
  declares. No central registry — schema is static class data,
  walked on demand.
- Two player-facing commands: `settings` (declared persistent store)
  and `var` (ad-hoc session store).
- `Avatar` composes `EnvironmentMixin`. No other class composes it on
  day one.
- Code-side rename of containment's `getEnvironment`/`setEnvironment`
  to `getContainer`/`setContainer` to free the word "environment"
  for shell semantics in the codebase.

### Out of scope (deferred, but design must not preclude)

- Variable interpolation (`$name` substitution) — a future
  shell-parser concern.
- A scripting language — future. Assumed to share the variable
  namespace with the interactive shell (bash model).
- Other shell mixins: prompt, history, working directory, aliases,
  jobs.
- Change notifications / reactive listeners on settings.
- Settings on classes other than `Avatar` (the mixin model leaves
  the door open; nothing else composes it now).
- Cross-account / cross-avatar settings migration tools.
- Structured (object/list) values in the user-facing `set` command
  (the type system supports them; the command surface accepts scalars
  only until there's a real use case).

## Design Decisions

### D1. Mixin-based, in `lib/shell/`

The capability is supplied as `EnvironmentMixin`. The subsystem folder
is `lib/shell/`. The mixin is the substrate; future shell features
(prompt, history, working directory, aliases) are sibling mixins under
the same folder. There is no meta "ShellMixin" — the player has a
"shell" by virtue of composing the relevant set of shell mixins.

### D2. Two stores: persistent + session

The mixin owns two stores per instance:

- **Persistent store** — saved through the `Hydrator` like any other
  persisted field. Survives logout.
- **Session store** — transient (not persisted via the Hydrator); it
  lives for the lifetime of the in-memory Avatar instance. There is
  no explicit clear hook.

Lookup is **session-first, then persistent** (shell-local-shadows-export
semantics). A given key lives in exactly one store at a time. Write
routing depends on the path: `setSetting` writes to the store
specified by the schema entry's `lifetime` (default `persistent`);
`setVar` writes to the session store. There is no path that writes
an unvalidated value to the persistent store.

This single mechanism handles both the long-lived "settings" use case
(persistent + schema-declared) and the future shell-var use case
(session + ad-hoc). Future interpolation extends — but does not
replace — this chain by prepending a frame-local scope owned by the
shell pipeline; see Load-Bearing Assumption #1.

### D3. Schema-declared keys, with ad-hoc fallback

Features declare schema entries via mixins (see D5). A schema entry is
the contract for one key: name, type, default, description, lifetime,
privacy.

Unknown keys (not in the schema):

- **Reads** of unknown keys return `undefined`.
- **Writes via the `settings` command** error ("no such setting").
- **Writes via the `var` command** succeed and store a string in the
  session store, **only if the key is not schema-declared on this
  avatar**. If the key *is* schema-declared, `var` errors and
  directs the player to `settings set` — this prevents `var` from
  being a back door that bypasses schema validation by clobbering a
  declared key in the session store.

### D4. Schema entry shape

```ts
interface SettingsSchemaEntry<T = unknown> {
  key: string;                    // dotted, e.g. 'highlight.self.color'
  type: SettingType;              // 'string' | 'number' | 'boolean'
                                  //   | 'enum' | 'struct' | 'list'
  default: T;
  description: string;            // shown in `settings describe`
  lifetime?: 'persistent' | 'session';      // default 'persistent'
  private?: boolean;                         // default false; see D8
  enumValues?: T[];               // required when type === 'enum'
  validator?: (value: T) => true | string;   // optional; returns
                                             // error message on failure
}
```

- Dotted keys are convention, not enforced. The first segment is
  typically the source mixin's domain (`highlight.*`, `combat.*`,
  `shell.*`).
- `struct` and `list` are supported in the type system; user-facing
  `set` rejects them until structured-value command syntax exists.
  Feature code can write structured values directly via
  `avatar.setSetting`.
- `default` is a static `T` value at this time. Per-avatar or
  dynamically-computed defaults are deferred; when needed, they
  arrive as an additive `defaultCompute?: (avatar: Avatar) => T`
  field on the entry. Static `default` remains the common case.
- `validator?` is the intended seam for template-syntax validation
  when settings hold format strings (e.g. message templates,
  prompts). Today's `Mml.format` is forgiving, so a syntax validator
  is unnecessary; when the format language acquires conditional or
  expression syntax worth validating, the per-entry `validator`
  rejects malformed candidates at write time rather than at render
  time.

### D5. Mixins declare schema entries the way they declare commands

Each mixin carries a static `settings: SettingsSchemaEntry[]` field.
**That static field is the only place a setting is declared.** There
is no central registry, no `register()` call at module load, and no
"global" partition for unowned settings. A setting that wants to be
on every avatar lives on a feature mixin every avatar composes —
same answer as D6.

An avatar's effective schema is computed on demand by walking its
composed mixins (via `MixinApi` introspection) and unioning each
mixin's static `settings`. The walk lives behind methods on
`EnvironmentMixin` itself (`describeSetting`, `listSettings`, and
internal helpers used by `setSetting`/`getSetting`). The walk is a
candidate for memoization keyed on mixin-chain shape if perf
demands; that's a planner concern.

Properties this gives:

- **Discovery follows composition.** `settings list` walks composed
  mixins and shows only relevant settings.
- **Validation is automatic.** The mixin knows what schema applies
  to itself based on its host's mixin chain.
- **Loose coupling.** Adding a feature mixin to an avatar drops its
  settings in for free; removing the mixin removes them.
- **Single source of truth.** A setting exists iff it appears in
  some mixin class's static `settings` field. Nowhere else.

### D6. Substrate discipline

`EnvironmentMixin` is the storage substrate. **It declares no
settings of its own today** — its static `settings` field is empty.
Substrate-flavored prefs that may emerge later (prompt format,
history size, completion behavior) belong on focused future mixins
(`PromptMixin`, `HistoryMixin`, etc. — see Future Neighbors), not
piled onto `EnvironmentMixin`.

**Settings about anything live on the mixin that owns the concept.**
A setting that "should be on every avatar" is a statement about the
*feature*: introduce a feature mixin and have every avatar compose
it.

This is enforced by code review and documented in
`docs/antipatterns.md`. No runtime check. If drift becomes a problem,
escalate to a structural rule (e.g. forbid schema declarations on
`EnvironmentMixin` outright).

### D7. Player-facing command surface

Two top-level commands:

**`settings`** — declared persistent store.

- `settings` (no args) or `settings list` — show declared settings
  for this avatar, grouped by source mixin, with current value vs
  default.
- `settings get <key>` — show one value. Errors on unknown key
  ("no such setting").
- `settings set <key> <value>` — validate against schema and write.
  Errors on unknown key.
- `settings unset <key>` — clear the avatar's override; the schema
  default applies. Errors on unknown key.
- `settings describe <key>` — show schema entry: type, default,
  description, source mixin, private flag. Errors on unknown key.

**`var`** — ad-hoc session store (bash-style shell variables).

- `var` or `var list` — show all session keys.
- `var set <name> <value>` (or `var <name> = <value>`) — write to
  session store, type string.
- `var unset <name>` — drop from session store.

The word "environment" never appears in the player surface.
Player-facing physical-world commands continue to use `look`, `here`,
`inventory`, `room`. The shell side uses `settings` and `var`. This
sidesteps the MUD-veteran-vs-Unix-veteran ambiguity around the word
"environment."

### D8. Privacy

A schema entry can be marked `private: true`. Private keys are
writable only when the actor performing the write matches the target
host instance — reference equality, not type identity. The actor is
typed `Stuff` (the host-instance base type), not `Avatar`; the privacy
check is reference equality against `target`, not a type check.

The single write entry point is the mixin method:

```ts
avatar.setSetting(key, value, actor); // actor: Stuff
```

- For non-private keys: write directly, no actor check.
- For private keys: assert `actor === target` (where `target` is the
  host instance receiving the call). Throw on mismatch.

The check runs inside `setSetting` after schema lookup; there is no
separate Api method or system-bypass path.

**Privacy gates writes only.** `getSetting` does not take an actor
and does not check one. Reads of private settings are unrestricted —
feature code that needs to render someone else's preferences (e.g.
the formatter rendering avatar X's arrival message for the room's
viewers) reads X's settings freely. If read-side access control
becomes a requirement later, it's a separate concern from privacy.

**Known weakness, future tightening:** once command stacking is
implemented, `actor === target` is spoofable by a wrapper command
that re-points the actor. The check should tighten to:

> The *interactive originator* of the current command stack is
> `target`, **and** the command stack contains exactly one command
> frame.

Both pieces of information are expected to come from
`ExecutionContextApi`. This gap is documented here and must be
carried forward into the architectural reference doc until the
tightening is implemented.

System code (cron-style background tasks with no human actor) cannot
write private settings. Such code is restricted to non-private
settings by construction; no separate "system bypass" is provided.

### D9. No change notifications

Settings are read on demand. No event firing on write, no listener
registration. If a future use case requires reactivity (eager
re-render of a prompt, etc.), it's a localized addition to the
`setSetting` write path; the absence of listeners today does not
preclude it.

### D10. Code-side rename

To free the word "environment" for shell semantics in the codebase:

- Rename `Containable.getEnvironment()` → `getContainer()`.
- Rename `Containable.setEnvironment()` → `setContainer()`.
- Update all callers across `lib/`, `obj/`, `cmd/`, tests, and docs.

This rename is a prerequisite for naming the new mixin
`EnvironmentMixin` cleanly. It is mechanical and bounded; the
codebase already uses `Container`/`Containable`/`ContainmentApi` for
the relation, so the accessor names are the only holdouts.

## Public Surface

The capability is exposed entirely as methods on `EnvironmentMixin`
(the host mixin). **There is no `SettingsApi` and no
`SettingsRegistry`.** This follows the `PropertiedMixin` precedent
(`avatar.setProp`/`getProp`) rather than the `ContainmentApi`
precedent: settings are unambiguously owned by a single host (the
avatar), and schema is static data on mixin classes — so neither an
Api shim nor a stateful registry adds anything. The Api convention
is reserved for cross-cutting capabilities that operate on relations
between objects.

### `EnvironmentMixin`

```ts
// Settings (schema-validated, persistent by default).
avatar.getSetting<T>(key: string): T | undefined;
avatar.setSetting<T>(key: string, value: T, actor: Stuff): void;
avatar.unsetSetting(key: string, actor: Stuff): void;
avatar.listSettings(): SettingsSnapshotEntry[];
avatar.describeSetting(key: string): SettingsSchemaEntry | undefined;

// Vars (ad-hoc session store, untyped strings).
avatar.setVar(name: string, value: string): void;
avatar.unsetVar(name: string): void;
avatar.listVars(): Record<string, string>;

// Returned by listSettings — one entry per declared setting on the
// avatar's effective schema. Enough to render `settings list`.
interface SettingsSnapshotEntry {
  schema: SettingsSchemaEntry;       // includes key, type, default, description, source mixin, private flag
  currentValue: unknown;             // stored override if present, else schema default
  isOverridden: boolean;             // true iff a value exists in either store for this key
}
```

Behavior:

- `getSetting` consults the lookup chain (session → persistent →
  schema default) and returns `undefined` for unknown keys (D3).
- `setSetting` finds the schema entry by walking the avatar's
  composed mixins, validates the value against the entry's type and
  optional `validator`, enforces the privacy check (D8), and writes
  to the store specified by the entry's `lifetime`. Unknown keys
  throw — the `var` surface is the ad-hoc path, not this one.
- `describeSetting` returns the schema entry for the given key (used
  by the `settings describe` command and by anything else that needs
  to introspect a setting). Returns `undefined` for unknown keys.
- `listSettings` walks the avatar's mixin chain, gathers all
  declared schema entries, and pairs each with its current value
  (or default when unset). Used by `settings list`.
- `setVar` checks the schema to reject keys that are declared on
  this avatar (D3) — declared keys must go through `setSetting`. For
  truly ad-hoc keys, it stores the value as a string in the session
  store with no further validation.
- `unsetVar` / `listVars` operate directly on the session store; no
  schema involvement.

Storage:

- Persistent store: a saved field (typed map or equivalent),
  Hydrator-visible per persistence subsystem rules (public field, no
  hard-private `#`).
- Session store: a transient field (excluded from persistence).

Schema discovery:

- Each mixin declares `static settings: SettingsSchemaEntry[]` (D5).
  Walking the avatar's composed mixins via `MixinApi` introspection
  gives the effective schema. The walk is internal to
  `EnvironmentMixin`; nothing outside calls a schema-lookup helper
  because there isn't one.

Security decorators on `setSetting`/`unsetSetting` (e.g. anything
needed to make these proper security boundaries under the
proxy/call-security framework) are a planner concern; the
requirement is that they be the equivalent of an Api boundary, not
that they take any specific decorator shape.

### Cross-host resolution

Some settings are declared on mixins composed by hosts that may not
also compose `EnvironmentMixin`. Movement-message templates declared
on `MobileMixin`, for example, exist on both Avatars (which compose
`EnvironmentMixin`) and NPCs (which do not). To avoid pushing the
host-type branch into every consumer, the subsystem exposes a free
function:

```ts
resolveSetting<T>(host: Stuff, key: string): T | undefined;
```

Behavior:

- If `host` composes `EnvironmentMixin`, delegates to
  `host.getSetting<T>(key)` (lookup chain → schema default).
- Otherwise, walks `host`'s mixin chain via `MixinApi.queryMixins`,
  finds the schema entry for `key` on a declaring layer, and returns
  `entry.default`.
- Returns `undefined` for keys not declared anywhere on the host's
  chain.

This is the single resolution entry point for callers that don't
know whether the host has `EnvironmentMixin`. It is **not** a
`SettingsApi` — just a colocated helper in `lib/shell/Environment.ts`,
exported alongside the mixin.

### Player commands

Implemented via the standard YAML view + controller pattern:

- `mud/cmd/settings.yaml` + `mud/obj/command/SettingsController.ts`
- `mud/cmd/var.yaml` + `mud/obj/command/VarController.ts`

`SettingsController` calls `setSetting` / `unsetSetting` on the
executing avatar, threading that same avatar as the `actor` argument.
Target and actor are equal by construction in the player-command
path, so the privacy check passes trivially. The privacy check earns
its keep against programmatic writes from feature code elsewhere
(see D8).

`VarController` calls `setVar` / `unsetVar` directly on the executing
avatar. Var writes are unguarded; no actor argument exists on those
methods.

## Antipatterns to Document

Add to `docs/antipatterns.md`:

| Don't | Do |
|---|---|
| Declare a setting on `EnvironmentMixin` because "every avatar needs it" | Declare it on the feature mixin that owns the concept; ensure every avatar composes that mixin |
| Reach into `EnvironmentMixin`'s persistent or session store directly to bypass the privacy check | Always go through `avatar.setSetting(key, value, actor)` |
| Read a setting via a bare property access on the mixin's storage map | Use `avatar.getSetting(key)` so the lookup chain and schema are honored |
| Use `var` for state that should be persistent | Declare a schema entry and use `settings` |
| Build a `SettingsApi` (or `SettingsRegistry`, or any other layer) that wraps `EnvironmentMixin` methods | Settings are mixin-owned and schema is static data on mixin classes; a wrapping layer adds nothing. Schema queries are mixin methods (`describeSetting`, `listSettings`) |
| Branch on `MixinApi.isEnvironment(host)` at the call site to read a setting with default fallback | Use `resolveSetting(host, key)`; the branch is centralized in the settings subsystem |

## Load-Bearing Assumptions

Decisions made now that depend on future work being consistent with
them. If any of these change, this doc and any successor must be
revisited.

1. **Variable interpolation, when it arrives, consults a lookup chain
   owned by the shell pipeline — not by `EnvironmentMixin` alone.**
   The chain is:

   > frame-local (positional args during alias/function calls)
   > → session store
   > → persistent store
   > → schema default (or, eventually, computed entry)

   `EnvironmentMixin` owns session and persistent stores only.
   Frame-local scope is push/pop'd by the future alias/function
   executor and is not the mixin's concern. The future scripting
   language shares session and persistent stores with the
   interactive shell (bash model) and gets frame-local scope when
   invoking functions; locally-scoped script variables, if needed,
   arrive as a `local` modifier and do not reclaim the word "var."

2. **Command stacking, when implemented, exposes interactive-originator
   and frame-count via `ExecutionContextApi`.** D8's tightening
   depends on this.

## Future Neighbors

Sibling shell mixins not built today, but whose shape constrains
decisions in this doc:

- **`AliasMixin`** — per-avatar command aliases, persistent + session
  stores following the same pattern as `EnvironmentMixin` but with
  its own storage. Aliases are consumed by the future shell
  pipeline's input-transformation phase, before the command
  controller pipeline. Planned to support positional argv
  interpolation in the alias body (`alias greet = 'wave $1'`); this
  is implemented via the frame-local store described in Load-Bearing
  Assumption #1, push/pop'd by the alias expander, not stored on the
  mixin. Aliases are a separate mixin, not an extension of
  `EnvironmentMixin`, because their value semantics, validation, and
  failure modes differ enough that conflating them muddies both
  surfaces.
- **`HistoryMixin`** — command history, recall, search.
- **`PromptMixin`** — prompt rendering. Settings declared by this
  mixin (e.g. `prompt.format`) are the canonical example of "shell
  meta-config" — they live on `PromptMixin` rather than
  `EnvironmentMixin` so that the substrate-discipline rule (D6)
  doesn't have an exception.
- **`WorkingDirectoryMixin`** — cwd over the in-game filesystem.

The pattern these share with `EnvironmentMixin` is per-avatar +
two-store + mixin-declared schema. If that pattern proves to be
genuine shared infrastructure across all of them, factor it out at
the second-mixin boundary, not preemptively.

## Migrating `Phrasebook`

`packages/server/src/mud/lib/Phrasebook.ts` is a placeholder that
hardcodes movement-message templates. After this subsystem lands, it
goes away. The migration is the final step of the implementation
plan and has the following shape:

**1. Templates become schema defaults on `MobileMixin`.**

Each entry in `Phrasebook.templates.movement` becomes a schema entry
on `MobileMixin.settings`:

```ts
class MobileMixin {
  static settings: SettingsSchemaEntry[] = [
    {
      key: 'messages.movement.departSelf',
      type: 'string',
      default: 'You leave to the {direction}.',
      description: "Message you see when you leave a room.",
      private: true,
    },
    // ... one entry per Phrasebook string
  ];
}
```

`MobileMixin` owns these because the messages describe Mobile's own
behavior. Settings are private (D8): each player configures only
their own messages.

**2. Phrasebook functions become formatter helpers.**

The `(mover, exit) => Mml` wrappers don't go away — they migrate to
`MobileMixin` (or `Mml`) as static helpers that read the template
from settings and format with context:

```ts
static formatDepartSelf(mover: Stuff, exit: Exit): Mml {
  const tpl = resolveSetting<string>(
    mover,
    'messages.movement.departSelf',
  ) ?? '';
  return Mml.format(tpl, { direction: Mml.direction(exit.direction) });
}
```

`resolveSetting` returns the schema default for declared keys with no
override (D3) regardless of whether the host composes
`EnvironmentMixin`, so the helper doesn't need its own fallback for
the missing-host-mixin case. A defensive `??` guards undeclared keys.

Existing `MobileMixin` callers that call into `Phrasebook` directly
swap to the new helpers.

**3. Compound logic splits into multiple keys — tactically.**

`Phrasebook.movement.arriveSelf` today has two branches: one when a
direction is known, one bland fallback. With today's `Mml.format`
having no conditional syntax, these become two settings:

- `messages.movement.arriveSelf.directional` —
  `'You arrive from the {direction}.'`
- `messages.movement.arriveSelf.bland` — `'You arrive.'`

The formatter helper picks based on whether the direction resolves.

**This split is tactical, not architectural.** When the format
language acquires conditional syntax (a future, unscheduled
upgrade), the two keys collapse back into one. The migration shape:
introduce a single `messages.movement.arriveSelf` key with a
conditional template, drop the directional/bland keys, and reset
any existing player overrides to default (the old strings would not
be valid in the new language anyway). Flag this consolidation
explicitly in any future format-language work — without the flag,
the tactical splits read as permanent.

**4. `Phrasebook.ts` is deleted.**

The file has no remaining role: templates live in schema entries,
and formatter functions live with the consumer mixin.

## Open Items for the Planning Agent

Implementation-shape decisions left to the planner:

- Concrete storage type for the two stores (`Map<string, unknown>`
  vs typed union per entry vs something else).
- How schema walking memoizes (per mixin-chain shape, per avatar,
  or not at all) if the on-demand walk is too slow in practice. The
  declaration shape itself is fixed: `static settings:
  SettingsSchemaEntry[]` on each mixin class.
- Where in the connection lifecycle the session store is cleared
  (state-model and/or lifecycle hook).
- Validation order when multiple checks apply: type-shape check
  first, custom `validator` callback second, both must pass.
- Whether `settings list` output is grouped by source mixin (default
  yes) and whether it shows defaults inline.
- Test layout — colocated `__tests__/` per project convention; the
  planner picks the file split.
- Order of work relative to the `getEnvironment`→`getContainer`
  rename (the rename should land first or alongside, not after, to
  avoid "environment" referring to two things in the same commit).
