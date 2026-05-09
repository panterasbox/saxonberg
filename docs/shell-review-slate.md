# Shell Tooling MR Review — Working Slate

Captures the review feedback on
[MR !15](https://gitlab.com/panterasbox/saxonberg/-/merge_requests/15)
("feat(shell): WorkspaceMixin + AuthorMixin + ScryMixin + lifecycle
refactor"). Working doc; retire when every thread is closed.

The reviewer left twelve comments; many apply broadly but were left
once. This doc lifts each comment into a thread, groups them by
shape question, and records decisions as we land them.

## Order of attack

1. **Helper-import shape** (thread H) — touches the most code; once
   we agree on `Workspace.pickTree(flags)` / settings access through
   the giver, we sweep ~9 controllers in one pass.
2. **Perceiver mixin + Scryable composition** (threads C, F, G) —
   entangled; resolve the placement question (`description/` vs
   `shell/`), the `look`-verb ownership question, and `Scryable`'s
   composition together.
3. **Scene topics** (thread I) — once the perceiver mixin lands,
   carve out the new topic family and re-route every new
   controller's Scene firing.
4. **Smaller fixes**: eval template path (A), eval `--on` (D), write
   body→struct (E), write require-tree (B), write header opts (L),
   teleport default destination (K), autoLookOnArrival method (J).
5. **Clone destination** (thread M) — open design conversation;
   land last, possibly its own mini-slate.

## Threads

### H. Helper-import shape (broad)

> "I don't like these kinds of imports. We should be calling methods
> on interface provided by mixins or stuff objects, or going through
> the api layer. not importing things like this."

Comment was on `CatController:27`'s `resolveSetting` import; the same
shape repeats across **9 controllers** that import both
`resolveSetting` and `pickWorkspaceTree` directly.

**Direction**: the controller's contract is "ask the giver" or "ask
an Api." So:

- `pickWorkspaceTree(giver, flags)` becomes a method:
  `giver.pickTree(flags)` on the `Workspace` mixin interface.
- `resolveSetting(host, key)` either becomes a method on
  `Environment` mixin (already provides `getSetting` for hosts that
  compose it; the cross-host `resolveSetting` exists for hosts that
  don't), OR moves to a new Api class. Probably keep it as a method
  on a mixin to match the inter-stuff contract — for the workspace
  controllers the giver always composes `Environment`, so
  `giver.getSetting<string>('workspace.home')` works directly.

**Decision**: TBD.

**Files**: `Cd`, `Cat`, `Cp`, `Grep`, `Ls`, `Mkdir`, `Mv`, `Rm`,
`Write` controllers + `lib/shell/Workspace.ts` (move
`pickWorkspaceTree` onto the mixin).

### I. Scene topics (broad)

> "we need new topics for all this stuff"

Comment was on `CatController:162`'s `MessageApi.Topics.world.perception.look`
— but every new controller (~17) fires under that same topic. Shell
output is not a perception event.

**Direction**: new topic family for shell-tier output. Candidates:

- `shell.fs.*` (fs-shaped: pwd / cd / ls / cat / grep / write /
  mkdir / rm / cp / mv) and `shell.author.*` (clone / reload /
  destruct / eval / teleport / scry / locate)?
- Or a flatter `shell.<verb>` per command?

**Decision**: TBD — depends on how `MessageApi.Topics` is currently
structured (worth checking before picking a shape).

**Files**: every new controller in this MR.

### A. Eval template path

> "the template path should be /home/playerId/_eval, whether it's a
> singleton or not. for spinning up different eval scripts that all
> stay in memory the path would get decorated /home/playerId/_eval.tag
> or something. … This is mainly about organisation. It's time to
> establish the /home/ branch of the template tree."

Currently `/tpl/eval/<avatarId>/_singleton`. Move to
`/home/<playerId>/_eval`; future variants tag with a suffix.

**Bigger lift**: establishing `/home/` as a real branch. Likely
needs a folder (Zone) template at `/home/`, plus a per-player
sub-folder convention. May connect to `workspace.home` setting (the
default `/` could become `/home/<playerId>` once the branch exists).

**Decision**: TBD — confirm `/home/` branch shape before changing
the eval path.

**Files**: `EvalController.ts`, possibly a new
`seeds/home/seed.yaml` for the folder template.

### B. Write: force explicit tree pick

> "The write command should probably force you to pick a tree
> instead of using the default. I can't imagine a time when you
> would want content and source to actually contain the same code.
> Same structure yes."

Currently write honors `workspace.tree`. Reviewer wants `-c` or `-s`
required.

**Decision**: TBD (probably yes — drop the default for write
specifically; pickWorkspaceTree's "no flag" branch returns an error
when called from `WriteController`).

**Files**: `WriteController.ts`, `cmd/write.yaml` (validators?).

### C. Scry placement (entangled with F + G)

> "not sure about putting this in shell. maybe description instead?
> I'm not sure. I feel like this belongs with 'look' but that gets
> added by Visible. I'm not sure why Visible would add look. it's
> about the ability to be seen not to see things. I think we need a
> new mixin and that can probably live in description/."

`scry` / `locate` (and `look`) are about the perceiver's capability,
not the perceived's. Visible owns `look` today, which is wrong.

**Direction**: new `Perceiver` (or similar) mixin in
`lib/description/`, owning `look` / `scry` / `locate` verb
contributions. Visible returns to "I can be seen." `Scry.ts` either
becomes that mixin or merges into it.

**Decision**: TBD — needs a name and a composition story (what
composes Perceiver?).

**Files**: `lib/shell/Scry.ts` → `lib/description/Perceiver.ts`
(or whatever name); `lib/description/Visible.ts` (drop look from
its commandContributions); `cmd/scry.yaml`, `cmd/locate.yaml`,
`cmd/look.yaml` (verb contributions move).

### F. Scryable: mixin not interface

> "shouldn't this be a mixin? and what composes it? everything but
> Idea? just Thing/VesselAvatar? is the 'location' scryable or just
> the things in it?"

Currently `Scryable` is a structural interface
(`{ _isScryable, canScryFor }`). Reviewer wants it as a mixin.

**Direction**: convert to `ScryableMixin` in `lib/perception/`
(or wherever the perceiver thread lands it). Composition target is
the open question — Thing? Vessel? Avatar? Locations?

**Decision**: TBD — needs to ride alongside the perceiver thread.

**Files**: `lib/perception/Scryable.ts` (rewrite as a mixin).

### G. autoLookOnArrival: not exported

> "I don't think we should export this, I think we should move it
> to a method on this mixin's public interface."

`Mobile.ts` exports `autoLookOnArrival`; `GotoController` imports
it. Both are wrong.

**Direction**: promote `autoLookOnArrival` to a method on the
`Mobile` interface (`mover.autoLookOnArrival()`). `GotoController`
calls it via the giver.

**Decision**: TBD (probably just do it; this one is nearly
mechanical).

**Files**: `lib/spatial/Mobile.ts`,
`obj/command/GotoController.ts`.

### D. Eval `--on`: type objects?

> "This is string and not objects?"

Currently `--on` is `type: string` and `EvalController` calls
`MqlApi.resolveMany` itself. Reviewer asks why not `type: objects`.

**Direction**: probably yes — push `--on` through the matcher's
MQL pipeline. Question downstream: with `type: objects` returning
an array natively, does `--all` still serve a purpose? Maybe not
(controller iterates whatever the matcher hands it).

**Decision**: TBD — also re-examine the multi-target dispatch
shape (errors on >1 without `--all` may be obsolete once `--on` is
properly objects-typed).

**Files**: `cmd/eval.yaml`, `obj/command/EvalController.ts`.

### E. Write body: type struct on the model

> "I know we decided that we can keep the body on the arg list. But
> realistically the client is always going to send this explicitly,
> not on the commandline. We set up 'struct' types for putting
> structured data on the model, just want to make sure that when
> the client puts the body on the model directly instead of the
> command, the command validation still passes."

Migrate `body` from `type: string` greedy positional to
`type: struct`. Verify validation passes when the body comes via
structured input. Implies dropping the text-input shape for write
bodies entirely (or keeping a separate `--text` short body for
short cases?).

**Decision**: TBD — does the text path stay at all? If not, write
becomes structured-input-only, which simplifies things.

**Files**: `cmd/write.yaml`, `obj/command/WriteController.ts`.

### K. Teleport: default destination "here"

> "how often does this happen? do we have a reasonable default
> e.g. 'here' I didnt look at the spec"

`TeleportController` errors on no destination. Common case is
"teleport target to me" — default to commandGiver's location.

**Direction**: `cmd/teleport.yaml` declares
`default: "$focus"` or `default: "here"` for the destination
positional. Drop the controller's "no destination" branch.

**Decision**: TBD (probably `default: "here"` — most predictable).

**Files**: `cmd/teleport.yaml`,
`obj/command/TeleportController.ts`.

### L. Write: header opts for content writes

> "I think we need some opts so that content writes can specify
> this sorta header data (backing class, hydrator, etc) doesn't
> matter for source writes"

Content writes currently hardcode `class: /lib/stuff/Idea` +
`hydratorClass: /lib/persistence/PersistentHydrator`. Need
`--class` / `--hydrator` opts (and maybe more — `--zone`?).
Source writes ignore these.

**Decision**: TBD — minimum is `--class` and `--hydrator`. May
also want a way to hand author the `data` shape (probably the
struct body covers that).

**Files**: `cmd/write.yaml`, `obj/command/WriteController.ts`.

### M. Clone destination — design conversation

> "we should have an option to teleport/move the object into the
> command giver's inventory after it's cloned. or maybe environment.
> I'm not sure. We haven't had a conversation about how we move
> objects actually into the game when they are needed. rooms or
> npcs that initialize holding things. or things that just 'know'
> where they need to go when they are created. these are slightly
> different use cases and maybe we need a small design session to
> flush it out. but I know the general use case for a lot of people
> using the clone command is just 'spawn a thing in my inventory'
> and slightly less often 'spawn a thing in the room'. The
> question is what happens when objects want to go somewhere else
> by nature?"

Bigger thread. Two sub-questions:

1. **Clone verb default landing**: probably `inventory` for the
   common case, with an opt (`--into <env|inventory|template-default>`)
   for the rest.
2. **Object-driven spawn locations**: how do "rooms initializing
   with contents" / "NPCs holding things" / "objects that know
   where they go" express that? This is the big one — likely a
   `defaultEnvironment` or `defaultLocation` field on the template,
   or a `PostRegistration` hook that places the new instance.

**Decision**: TBD — wants its own mini-slate before the clone
verb's option shape pins down.

**Files**: `cmd/clone.yaml`, `obj/command/CloneController.ts`,
plus whatever the spawn-location design lands.

## Decisions log

| Thread | Decision | Landed |
|---|---|---|
| H | `pickWorkspaceTree` standalone helper retired. Moved onto Workspace as `pickTree(flags)`. Added `getHome()` / `getPageSize()` accessors. `Workspace` interface extends `Environment` (compositional prereq). Controllers drop both `pickWorkspaceTree` and `resolveSetting` imports — call `giver.pickTree(model)` / `giver.getHome()` / `giver.getPageSize()` instead. `WorkspaceMixin`'s `TBase` constrains to `MixinConstructor<Stuff & Environment>`. The class drops `implements Workspace` because TS mixin-class typing doesn't merge inherited Base methods into the implements check; the `const w: Workspace = host` test assignment is the structural check. | ✓ c6bae78 |
| C, F, G | New `PerceiverMixin` in `lib/description/Perceiver.ts` owns `look` / `scry` / `locate` on `self`. `Visible` keeps `look` only on `environment` / `inventory` / `peers` (target-side). Composed on `Character` adjacent to Sensor (Perceiver requires Sensor at the type level, mirrors the Workspace/Environment shape). `lib/shell/Scry.ts` retired; ScryMixin removed from ShelledCharacter. `Scryable` interface converted to `ScryableMixin` in `lib/perception/Scryable.ts`, extends `Visible` (anything scryable is visible). `ScryController` finds candidates via `MixinApi.isScryable(item)` instead of structural `_isScryable` marker. Doc retired: `shell-scry.md`. New doc: `subsystems/perceiver.md`. | ✓ pending commit |

## Cross-references

- MR !15: feat(shell): WorkspaceMixin + AuthorMixin + ScryMixin + lifecycle refactor
- [docs/subsystems/shell-workspace.md](./subsystems/shell-workspace.md)
- [docs/subsystems/shell-author.md](./subsystems/shell-author.md)
- [docs/subsystems/perceiver.md](./subsystems/perceiver.md) — new (replaces shell-scry.md)
- [docs/subsystems/command-spec.md](./subsystems/command-spec.md) — `type: struct` section
