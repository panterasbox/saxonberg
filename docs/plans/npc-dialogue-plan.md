# NPC dialogue (Wave 1) — implementation plan

A grounded, wave-structured plan for the **branching-tree dialogue responder** and the **responder seam** behind a new `talk to` verb. Authoritative spec: [npc-dialogue-requirements.md](../requirements/npc-dialogue-requirements.md) — every scope/non-goal/AC there is settled; this plan is *how*, not *what*. The build is **server-only**; all paths are under `packages/server/src/mud/` unless noted. Every step names the real file it mirrors. This plan is self-contained; a build agent that has not seen the requirements conversation can execute it.

## 1. Approach overview

### The shape

Dialogue Wave 1 is **one new brain + one new verb + one engagement class + one declarative tree format**, composed entirely from shipped substrate. Build against these mirrors; don't invent:

| Dialogue piece | Mirrors exactly | Evidence |
|---|---|---|
| `tree-dialogue` brain (`export const brain = class {…}`) | `converses` / `greets` brains — named class-expression, `BrainStatics` statics, `act(ctx)` | `lib/behavior/converses.ts:34`, `greets.ts:13`, contract in `lib/behavior/brain.ts:83` |
| The conversation engagement (1:1, slot-holding, no timer) | `RespirationDrain` `SustainedEngagement` (registers at module load, `getHost`, `onAbort`, slot set) | `lib/respiration/RespirationDrain.ts:57` |
| Slot-claim on both participants | `BehaviorBeat` `DurativeActivity` holding a slot via `SchedulerApi.start` | `lib/behavior/BehaviorBeat.ts:26` |
| Private choice wheel | `PromptApi.choice(iact, label, choices, opts?)` → `Promise<string>` | `api/prompt.ts:171`; choices are `PromptChoice {label, response}` (`packages/types/src/index.ts:257`) |
| Player line + NPC beat spoken aloud (directed, room-visible) | `VocalMixin.say(text, target?)` — composes a `world.speech.say` Scene with self/peers/target frames | `lib/message/Vocal.ts:80` + `vocalEmit` `:121` |
| `talk` verb (YAML view + controller + reg seed) | `say` / `introduce` MVC triple | `cmd/social/say.yaml`, `obj/command/social/SayController.ts`, `seeds/obj/command/social/SayController.yaml` |
| `talk` affordance attribution | `commandContributions` bucket + `getAffordances`/`commandSource` source-not-category | command-routing.md § Affordance attribution; `VocalMixin.commandContributions` `Vocal.ts:70` |
| Tree save-gate validation | `validateBehaviorPaths(data)` in `CmsLogic._writeContent` | `obj/api/CmsLogic.ts:105,413` |
| Guard reads | `RegardApi.getRegard` (`api/regard.ts:54`), `TraitApi.positionFor`→`AxisEstimate{position,band,...}` (`api/trait.ts:128`, `lib/trait/TraitPosition.ts:76`), `WorldClockApi.getNow` (`api/worldclock.ts:104`) | |
| The one write effect | `RegardApi.adjustRegard(viewer, subject, delta)` — persists, clamps ±100 | `api/regard.ts:64` |

### Constraints the investigation resolved

1. **The tree walk is a long-lived state machine that outlives a single command dispatch.** A controller's `execute()` returns `void` and its `CommandContext` dies after the turn (command-routing.md § CommandContext "Lifetime: per-`_executeOne` attempt"). But the conversation spans many player picks. **Resolution: the live conversation state machine lives on the `SustainedEngagement` instance** (a plain object held in the `SchedulerRegistry` active set, keyed to the actor — exactly where `RespirationDrain` lives), NOT on the controller and NOT on the brain class (brains are stateless per `brain.ts`). The engagement holds: current node id, the tree (resolved from the NPC's spec config), the driving player + NPC refs, the captured driving `Interactive`, and the ephemeral scratch bag. The brain's `act` *opens* the conversation (constructs + starts the engagement, emits root beat, pushes first choice prompt) and then the **choice-await loop runs on the engagement**, re-arming `PromptApi.choice` after each NPC reply. This is the central architectural fork — see Risk 1 for the alternative (a per-turn re-entrant controller) and why it's rejected.

2. **`talk to` reaches the responder by resolving the NPC's `tree-dialogue` spec and invoking the brain — not via a new dispatch path.** The `talk` controller narrows the target to a `Behaved` NPC, finds its `tree-dialogue` `BehaviorSpec` in `getBehaviors()` (public, `Behaved.ts:112`), resolves the brain by path with `StuffApi.resolveExportSync(spec.brain, 'brain')` (the exact re-resolve seam `Behaved._resolveBrain` uses, `Behaved.ts:357`), and calls a static **open** entry on the brain (an addition to the brain's surface, beside `act`) passing the driving player, the NPC host, the spec config (the tree), and the driving `Interactive` from `context.interactive`. The controller does **not** itself walk the tree — it hands off and returns. This keeps "responder is a brain," keeps the verb an ordinary controller, and respects "go through a code seam, not a bespoke path." The brain stays the only code that knows the tree format. See Risk 2 for the rejected alternative (a `TreeDialogueApi`).

3. **`talk to` is a witness-style *engage*, not a `say`/witness trigger.** The requirements forbid speech-triggered trees this build. So `tree-dialogue` carries **no cadence/witness trigger** in the `behaviors:` spec — its `trigger` is a new sentinel (`engage`, parsed by `BehavedMixin._parseTrigger`) that wires **nothing** (no timer, no `handleMessage` dispatch). The spec exists purely so (a) `getBehaviors()` surfaces the tree to the `talk` controller, (b) the save-gate validates the brain path, and (c) the affordance machinery can detect "this NPC has a tree." The brain is invoked only through the `talk`-controller open seam (Constraint 2), never by the trigger substrate. This is the minimal `_parseTrigger` change and keeps the requirements' "neither undirected nor directed speech opens a tree" honest.

4. **The driving `Interactive` must be captured for the whole conversation.** `PromptApi` is keyed by `Interactive` (`PromptLogic.byInteractive`, `PromptLogic.ts:88`); `cancelAll` on disconnect already rejects pending awaits (`prompt.md` Disconnect ordering). The engagement captures `context.interactive` at open. For robustness across reconnect within a session, the engagement can re-derive a live Interactive from the driving Avatar's `getInteractives()` (`HasInteractive.ts:242`) — but Wave 1 captures the one from `context.interactive` and aborts the conversation on its disconnect (the prompt await rejects with `PromptCancelledError`, which the engagement's loop catches → `SchedulerApi.cancel`).

5. **"Choosing is interior, speaking is exterior" maps cleanly to two existing channels.** The choice wheel is `PromptApi.choice` (private, per-Interactive). The picked line is spoken by **the player's** character: the engagement calls `player.say(chosenLine, npc)` (directed speech → self/peers/target frames, room overhears — `Vocal.ts:138`). The NPC beat is `npc.say(beatLine, player)` (same path, NPC as speaker). No private side-channel for either spoken half. Attribution of the player's spoken line: it is `player.say` so `Mml.name(player)` renders the speaker correctly; the room sees "Bobalu says to the barkeep, …" — the exterior half — with no choice wheel leaking.

6. **No new Module Category.** Brain (`tree-dialogue`) + the tree value-object/vocabulary types + the `SustainedEngagement` class (a lib value-object like `RespirationDrain`) + the controller/YAML/seed triple + a `MixinApi.isBehaved` predicate addition. Every file maps to an existing category in CLAUDE.md § Module Categories. The guard/effect vocabularies are **value-object/vocabulary** modules (the home that kills the `types.ts` reflex). No Api-per-NPC, no free-floating helpers.

7. **The tree is template data — no new collection, no `DialogueTree` Stuff/Document.** A tree is the `config` blob of the NPC's `tree-dialogue` `BehaviorSpec`, and `behaviors` is already a `persistentField` on `BehavedMixin` (`Behaved.ts:92`; `config?: Record<string, unknown>` — `brain.ts:46`, an opaque blob the brain interprets). So a tree rides inside the NPC's template `data.behaviors[].config`, persisted in the **existing `domain` collection** alongside the rest of the cast and hydrated in by the normal `PersistentHydrator` on every clone/reboot. **Do NOT create a `dialogue` collection or a `DialogueTree` Document/Stuff.** `lib/npc/tree.ts`'s `DialogueTree`/`DialogueNode`/`DialogueChoice`/… are **interfaces** (value-object/vocabulary) describing that blob's shape — nothing is ever instantiated as a Stuff; at runtime the brain reads `spec.config` (already a live plain object) and treats it as a `DialogueTree`. Because `config` is `Record<string, unknown>`, the shape is **not** TS-checked at hydration — `validateTree` (the CMS save-gate, plus defense-in-depth at `open`) is the *only* structural guard, which is why the save-gate validation (Wave 3) is a real step, not a nicety.

## 2. Proposed file/module layout

All under `packages/server/src/mud/`. Every file maps to an existing Module Category (CLAUDE.md:309).

**`lib/npc/` (new NPC-only scope folder — see § "The `lib/npc/` home" below):**
- `NPC.ts` — **relocated** from `lib/character/NPC.ts` (Wave 0). The thin `BehavedMixin(PostRegistrationMixin(Character))` archetype. Its class path re-keys to `/lib/npc/NPC` — handled as a deliberate Wave 0 refactor with a template migration, *not* a silent move.
- `tree.ts` — the declarative tree **value-object/vocabulary**: `DialogueTree`, `DialogueNode`, `DialogueChoice`, `DialogueGuard`, `DialogueEffect` interfaces; the guard **fact-namespace** union + validation array; the registered **effect-verb** name set + validation array; `validateTree(tree)` (pure structural check used by both the save-gate and tests). [Value-object/vocabulary]
- `DialogueConversation.ts` — the `SustainedEngagement` class (the live state machine). `implements SustainedEngagement`, registers `SchedulerApi.registerActivity('tree-dialogue-conversation', …)` at module load. Holds node cursor + scratch + player/NPC/Interactive refs + tree; drives the choice-await loop; applies effects; emits beats; ends/aborts cleanly releasing both participants' slots. [Stuff-adjacent value-object — same category as `RespirationDrain`]
- `guards.ts` — **NO.** Do not create a free-floating evaluator module (export discipline). Guard evaluation + effect application are **private methods on `DialogueConversation`** (it owns the conversation state the facts read). The fact/effect *vocabularies* live in `tree.ts`.

> **The `lib/npc/` home.** `lib` is organized by *scope/concern*, and the PC/NPC axis already has two of its three homes: `lib/shell/` is the **PC-only** scope (`ShelledCharacter` lives there), and `lib/character/` is the **shared PC∪NPC union** (`Character`, `Persona`, `Posed`, `Sexed`, `Gendered`). `lib/npc/` is the missing symmetric third — the home for types that apply **only to NPCs and not PCs**. `NPC.ts` (an `NPC`, not a `Character`-in-general) and the dialogue runtime (trees/conversations exist only on NPCs) both belong there. **The `tree-dialogue` brain does NOT move** — brains are path-pinned to `lib/behavior/` by the Module-Categories taxonomy (resolution mirrors the file path), and behavior is deliberately branch-agnostic. **Open candidate, not in scope unless the user says so:** `lib/character/Crafter.ts` `extends NPC`, so by this principle it is also NPC-only and a natural follow-on relocation (it would re-key `/lib/character/Crafter` → `/lib/npc/Crafter`, a second template migration). This plan moves only `NPC.ts`.

**Brain (`lib/behavior/`):**
- `tree-dialogue.ts` — `export const brain = class {…}` with `static label='tree-dialogue'`, `static claims=['voice','attention']`, and the static **open** entry the `talk` controller calls (plus a no-op/guard-only `act` to satisfy `BrainStatics` — see Risk 3). The brain selects the guard-chosen entry node, constructs + starts a `DialogueConversation`, and returns. [Brain]

**Verb triple (`talk`, alias `converse`):**
- `cmd/social/talk.yaml` — view: `verbs: [talk, converse]`, `controller: social/TalkController`, one `object` arg (the NPC) `scope: ['$focus','reachable']` `onExcess: prompt`, validator `requiresAnimate` (mirror `say.yaml`). [Command YAML]
- `obj/command/social/TalkController.ts` — narrows target to a `Behaved` NPC, finds its `tree-dialogue` spec, resolves the brain, calls `brain.open(...)`; declines gracefully (Scene + `ctx.note`) when the target has no tree or is already in a conversation. [Controller]
- `seeds/obj/command/social/TalkController.yaml` — `{ class: /obj/command/social/TalkController, data: {} }` (verbatim shape of `SayController.yaml`). [seed YAML]

**Edits to existing files:**
- `lib/behavior/brain.ts` — add the `engage` witness/sentinel trigger to the vocabulary (a new `ParsedTrigger` variant `{source:'engage'}`), and extend `BrainStatics` with the optional static `open(...)` entry (documented as the dialogue-responder open seam; other brains don't implement it).
- `lib/behavior/Behaved.ts` — `_parseTrigger` recognizes `engage` and wires nothing (no schedule, not added to witness dispatch); `getBehaviors()` already public (no change). Optionally a `getBehaviorByBrainLabel`/helper kept private — but the controller can filter `getBehaviors()` itself.
- `api/mixin.ts` — add `MixinApi.isBehaved(obj): obj is Stuff & Behaved` (mirror `isEngaged` `:760`); the controller uses it to narrow. `Mixins.Behaved` already exists (`lib/mixin.ts:119`).
- `obj/api/CmsLogic.ts` — extend the save-gate: after `validateBehaviorPaths`, for any `behaviors[]` entry whose brain resolves to `label === 'tree-dialogue'`, run `validateTree(entry.config)` and reject with `CmsError('invalid', …)` on a dangling node target or unknown effect verb (mirror the existing `validateBehaviorPaths` loop, `:105`).
- `docs/subsystems/npc-dialogue.md` (new) + `CLAUDE.md` doc map — folded into the sweep (Doc wave).

**Discoverability seam — where `talk` is afforded:** A tree-bearing NPC must contribute `talk` to surrounding givers' stacks. Two options (decide per Risk 4): (a) **author-driven** — cast templates list `social/talk.yaml` in their own `commandContributions.environment`/`peers` (no code, but every tree NPC must remember to); (b) **systemic** — `BehavedMixin` contributes `social/talk.yaml` on `environment`+`peers` **only when** the host carries a `tree-dialogue` spec. Recommendation: **(b)**, computed in `BehavedMixin` from the persisted `behaviors:` list, so "has a tree ⇒ affords talk" is automatic and silent NPCs never afford it (the requirement's exact wording). The look/examine cue is authored prose on the NPC template's `VisibleMixin` description (pure content, no code).

## 3. Wave breakdown

Each wave ends green (typechecks + its colocated Vitest suite passes) and is independently reviewable. AC# refers to the requirements' Acceptance criteria.

### Wave 0 — Relocate `NPC.ts` to `lib/npc/` (structural prep)

Stand up the `lib/npc/` scope home and move `NPC.ts` into it, so the rest of the build lands NPC-only types in their permanent home. **This is a self-contained refactor; land it as its own commit before Wave 1.** Class paths are file-location-derived (`StuffApi.loadClassByPath` imports `..${classPath}.js` and takes the last segment as the class name — `api/stuff.ts:1079`), so this is a class-path re-key, not a free move.

- **`git mv`** `lib/character/NPC.ts` → `lib/npc/NPC.ts`.
- **Fix imports inside `NPC.ts`:** `./Character` → `../character/Character` (the `../stuff/...` and `../behavior/...` imports are unchanged — same depth). Update the doc-comment example `class: /lib/npc/NPC` → `/lib/npc/NPC`.
- **Fix importers** (only two sites): `lib/character/Crafter.ts` `import NPC from './NPC'` → `'../npc/NPC'`; `domain/lounge/__tests__/cast-content.test.ts` allow-list string `'/lib/character/NPC'` → `'/lib/npc/NPC'`.
- **Update docs that name the path:** `docs/subsystems/behavior.md` (three refs — the YAML example, the file-header comment, the cast table) and `docs/architecture.md` (one ref). The `npc-dialogue.md` subsystem doc (Doc wave) documents `lib/npc/` as the new home.
- **Template migration (the live-data step — REQUIRES the operator, cannot be done from code):** every existing NPC template stores `class: '/lib/character/NPC'`. The cast lives in the Mongo `domain` collection (authored content, not repo seeds), so after deploy run a one-time migration on each DB (local dev + the live box per [the deploy topology](../deployment.md)):
  ```
  db.domain.updateMany({ class: '/lib/character/NPC' }, { $set: { class: '/lib/npc/NPC' } })
  ```
  Until migrated, NPC templates fail to resolve at clone time (`loadClassByPath` → import of the now-missing `../lib/character/NPC.js`). **Flag this in the MR description** so the operator runs it at deploy. (If Crafter is also moved, add the parallel `'/lib/character/Crafter'` → `'/lib/npc/Crafter'` update.)
- **Verify:** `pnpm --filter @saxonberg/server exec tsc --noEmit` clean; no residual `character/NPC` refs (`grep -rn 'character/NPC' packages/ docs/`); the lounge `cast-content` suite green.

**AC (this wave):** `NPC.ts` resolves at `/lib/npc/NPC`; typecheck + existing suites green; the migration command is recorded in the MR for the operator.

### Wave 1 — The tree format + validator (pure data, no runtime)

The declarative format and its structural validator exist and are CMS-validatable; nothing walks it yet.

- **Create** `lib/npc/tree.ts` — see §4 for the full type shapes. Define `DialogueTree`/`Node`/`Choice`/`Guard`/`Effect`; the `GUARD_FACTS` namespace + validation array; the `EFFECT_VERBS` registered set + validation array; `validateTree(tree): void | string[]` (collect-all-errors: dangling `choice.to`, dangling `entry[].node`, unknown `effect.verb`, unknown `guard.fact`, missing terminal reachability is *not* enforced — terminal/leave is a node flag). Pure, no I/O, no `noUncheckedIndexedAccess` violations (guard every author-supplied lookup).
- **Tests** `lib/npc/__tests__/tree.test.ts` — valid tree round-trips; dangling node target rejected; unknown effect verb rejected; unknown guard fact rejected; empty/malformed tolerated with structured errors.

**AC:** the format exists and `validateTree` rejects dangling targets + unknown effect verbs (the data half of the save-gate AC).

### Wave 2 — The conversation engagement + the brain open seam (the core loop)

`talk to` opens a 1:1 conversation: both slots held on both participants, NPC speaks the guard-selected root, the driver gets a private choice wheel, picking speaks the player's line aloud and the NPC replies, the tree advances, terminal/leave ends cleanly.

- **Edit** `lib/behavior/brain.ts` — add `{source:'engage'}` to `ParsedTrigger`; add optional `open(args): Promise<OpenResult>` to `BrainStatics` (documented as the responder-open seam). Define `OpenResult = {ok:true} | {ok:false; reason:'no-tree'|'busy'|'no-viewer'}` so the controller renders the right decline prose.
- **Edit** `lib/behavior/Behaved.ts` — `_parseTrigger` returns `{source:'engage'}` for `engage`; `_wireBehaviors` skips scheduling/witness for engage specs (they wire nothing). Add the systemic `talk` affordance contribution (Risk 4 option b): compute from `behaviors:` whether any spec resolves to a tree-dialogue brain and, if so, include `social/talk.yaml` in the host's `environment`+`peers` contributions. (Confirm the mechanism — static `commandContributions` is class-level; a *conditional* per-instance contribution likely rides `pushCommandSource` at `postRegister`. Verify against `CommandGiver.pushCommandSource` + the `applyContainmentDelta` push path before implementing; fall back to author-driven option (a) if per-instance dynamic contribution is heavier than the wave warrants.)
- **Edit** `api/mixin.ts` — add `MixinApi.isBehaved` (mirror `isEngaged`).
- **Create** `lib/npc/DialogueConversation.ts`:
  - `implements SustainedEngagement`: `type='tree-dialogue-conversation'`, `slots = {voice, attention}`, `cancelable=true`, `interruptibleBy` includes the leave/host-destroyed reasons. `getHost()` returns the NPC. Registers itself via `SchedulerApi.registerActivity` at module load (mirror `RespirationDrain.ts:144`).
  - **Two engagements, one driver.** Because slots must be held **on both participants** (AC: free slots on both at end), open starts a *companion* slot-hold on the player too. Cleanest: the `DialogueConversation` is the NPC-side engagement (it `getHost()`s the NPC); a sibling lightweight `SustainedEngagement` (or a `BehaviorBeat`-style hold) occupies `voice`+`attention` on the **player**, referenced by the conversation so abort/end releases both. Verify both can be started without mutual conflict (disjoint actors → no slot contention between them; `SchedulerApi.start` checks slots per-actor).
  - **The loop** (runs after open returns, driven by the engagement, not a controller): emit current node beat via `npc.say(node.beat, player)`; build the choice list from the node's choices whose guards pass; `await PromptApi.choice(interactive, label, choices)`; on resolve → `player.say(choice.line, npc)` (the exterior spoken line), apply `choice.effects` in order, advance to `choice.to`; if the new node is terminal → emit its beat (if any) and end; else loop. Wrap the await in try/catch: `PromptCancelledError` (disconnect / `prompt cancel`) → `SchedulerApi.cancel(this, 'cancelled')`.
  - **Guard evaluation** (private method): map `guard.fact` to a read — `regard` → `RegardApi.getRegard(npc, player)`; `trait:<axis>` → `(await TraitApi.positionFor(npc, axis)).position`; `time:*` → `WorldClockApi.getNow()`; `state:<key>` → the ephemeral scratch bag — then apply `op`/`value`. Unknown fact → guard fails closed (validator already rejected at save, this is defense-in-depth).
  - **Effect application** (private method): `set-state` writes scratch; `regard` → `RegardApi.adjustRegard(npc, player, delta)`; `say`/`emote` → `npc.say`/host emote; `end`/`goto` → flow control. Unknown verb → no-op (validator caught it).
  - **End/abort** (`onAbort` + an `end()` path): cancel the player-side slot hold, `PromptApi.cancel` any in-flight prompt for this conversation, discard scratch. The NPC's ambient cadence brains resume automatically next tick (they yield via `requiresFree` while `voice`/`attention` are held — `Behaved._blocked` `:393`).
- **Create** `lib/behavior/tree-dialogue.ts` — `static open(player, npc, config, interactive)`: returns `{ok:false,reason:'no-viewer'}` if no interactive; reads `config` as a `DialogueTree`; if the NPC already has a `tree-dialogue-conversation` engagement → `{ok:false,reason:'busy'}` (check `SchedulerApi.getEngagementByType`); select the entry node (first `entry[]` whose guard passes, evaluated via a shared static the conversation also uses, or construct the conversation and let it pick); construct + `SchedulerApi.start(new DialogueConversation(...))`; kick the loop; return `{ok:true}`. `static act` is a documented no-op (the brain never fires on a trigger this build — Risk 3).
- **Create** `cmd/social/talk.yaml`, `obj/command/social/TalkController.ts`, `seeds/obj/command/social/TalkController.yaml`. Controller: narrow `model.target` to a Stuff; `MixinApi.isBehaved` → else decline ("they have nothing to say"); find the `tree-dialogue` spec in `getBehaviors()` → else decline; resolve brain via `StuffApi.resolveExportSync` (mirror `Behaved._resolveBrain`); `await brain.open(player, npc, spec.config, context.interactive)`; render decline prose per `OpenResult.reason` (`busy` → "the barkeep's busy with someone"; `no-tree` → polite refusal). Emits no player line on open (AC).
- **Tests** `lib/npc/__tests__/DialogueConversation.test.ts` + `obj/command/social/__tests__/TalkController.test.ts`:
  - open → NPC root beat heard by room, no player line emitted (AC#1).
  - `talk` to a silent (non-tree / non-Behaved) NPC declines gracefully (AC#1).
  - choice delivered privately (assert `PromptApi.choice` pushed to the driver's Interactive only); picking → `player.say` directed line observable to a room peer (AC#4, AC#5).
  - second driver `talk` on a busy NPC declined; can still overhear (AC#3).
  - guard reading regard/trait selects a different entry node / hides a choice (AC#6).
  - effect applies a regard delta; new regard observable after end; scratch gone on re-open (AC#7).
  - terminal/leave ends → both participants' `voice`/`attention` free; disconnect mid-conversation cancels the prompt + releases both sides (AC#8).

**AC:** the full responder loop, 1:1 contention, interior/exterior split, guard reads, regard-delta effect, clean exit — AC#1–8.

### Wave 3 — Save-gate tree validation + discoverability + seed cast

The CMS rejects malformed trees; tree NPCs afford `talk` + carry an examine cue; a seed bar NPC proves the loop end-to-end.

- **Edit** `obj/api/CmsLogic.ts` — in `_writeContent`, after `validateBehaviorPaths(data)` (`:413`), walk `behaviors[]`; for entries whose resolved brain `label === 'tree-dialogue'`, run `validateTree(entry.config)` and throw `CmsError('invalid', …)` on errors (mirror the resolve-loop shape at `:105`).
- **Wire discoverability** — confirm Wave 2's affordance contribution surfaces `talk` on a tree NPC and not on a silent one (the `affordances` system verb is the test harness). Add the authored examine cue to the seed NPC's description (content only).
- **Seed** a tree-bearing bar NPC template (e.g. the barkeep) under the Dave's Bar cast: `class: /lib/npc/NPC`, a `behaviors:` entry `{ brain: /lib/behavior/tree-dialogue, trigger: engage, config: <a small authored tree> }` alongside the existing chatter brains, and a `look`/examine cue. The tree exercises: a guard-selected warm vs neutral entry (regard), a choice hidden by a trait guard, a regard-delta effect, and a terminal leave node.
- **Tests** `obj/api/__tests__/CmsLogic.dialogue.test.ts` — save with a dangling node target rejected; unknown effect verb rejected; valid tree saves (AC: CMS save-gate). Affordance test: tree NPC affords `talk`, silent NPC does not (AC#2).

**AC:** CMS save-gate rejects dangling targets / unknown effect verbs (AC); tree NPC affords `talk` + examine cue, silent NPC affords neither (AC#2).

### Doc wave (folded into the sweep)

`docs/subsystems/npc-dialogue.md` describes: the responder seam (`talk` → spec lookup → `brain.open` → `DialogueConversation`); the tree authoring format; the guard fact-namespace + registered effect-verb set; the interior/exterior invariant; the 1:1 engagement model; and the deferred seams (scripted/`intent-dialogue`, `addressed`/`handleMessage` trigger, implant `tell` entry, persistent relationship state, multiplayer participation). `CLAUDE.md` doc map updated. Per the workflow's artifact-retirement rule (see behavior.md History), the requirements + this plan retire into the subsystem doc at sweep.

## 4. Key type shapes

In `lib/npc/tree.ts` — the canonical authoring format (pure declarative data on the NPC template's `tree-dialogue` spec `config`):

```ts
// A whole tree (the brain spec's `config`).
interface DialogueTree {
  entry: DialogueEntry[];            // guard-selected root; first passing wins
  nodes: Record<string, DialogueNode>;
}

interface DialogueEntry {
  node: string;                      // node id; must exist in `nodes`
  guard?: DialogueGuard[];           // all must pass (AND); empty = always
}

interface DialogueNode {
  beat?: string;                     // the NPC's spoken line for this node
  choices?: DialogueChoice[];        // player responses (guard-filtered)
  terminal?: boolean;                // reaching this ends the conversation
}

interface DialogueChoice {
  line: string;                      // what the PLAYER speaks aloud when picked
  guard?: DialogueGuard[];           // hide the choice unless all pass
  to?: string;                       // target node id; required unless an `end` effect
  effects?: DialogueEffect[];        // applied in order on pick
}

// Guards — structured predicates over a fixed fact namespace.
interface DialogueGuard {
  fact: GuardFact;                   // see GUARD_FACTS
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | number | boolean;
}

// The fixed fact namespace (validation array drives the save-gate).
// 'regard'        → RegardApi.getRegard(npc, player)            (signed -100..100)
// 'trait:<axis>'  → TraitApi.positionFor(npc, axis).position    (signed -100..100)
// 'time:hour'     → WorldClockApi-derived hour-of-day            (world)
// 'state:<key>'   → ephemeral conversation scratch               (this conversation only)
type GuardFact = 'regard' | `trait:${string}` | `time:${string}` | `state:${string}`;

// Effects — a small REGISTERED verb set (extensible by future builds).
type DialogueEffect =
  | { verb: 'set-state'; key: string; value: string | number | boolean }
  | { verb: 'regard'; delta: number }     // RegardApi.adjustRegard(npc, player, delta) — persists
  | { verb: 'say'; line: string }         // extra NPC beat
  | { verb: 'emote'; emote: string }      // NPC emote (composes with speech)
  | { verb: 'goto'; node: string }        // branch
  | { verb: 'end' };                      // end the conversation

const EFFECT_VERBS = ['set-state','regard','say','emote','goto','end'] as const;
```

**Conversation scratch state** (ephemeral, framework-owned, dies with the engagement, per requirements slate #5): a `Record<string, string|number|boolean>` field on the `DialogueConversation` instance — never persisted, never in `persistentFields`, mirrors `EngagedMixin`'s runtime-only `_engagements` (activity.md decision #2). Cross-conversation warmth lives **only** in regard (persisted via the belief store), never here.

**The brain open seam** (`lib/behavior/brain.ts`):

```ts
interface BrainStatics {
  // …existing label / claims / requiresFree / presenceGated / act…
  // The responder-open seam — only dialogue brains implement it. The
  // `talk` controller calls it after resolving the spec by path.
  open?(args: {
    player: Stuff; npc: Stuff;
    config: Record<string, unknown>;     // the tree
    interactive?: Interactive;
  }): Promise<{ ok: true } | { ok: false; reason: 'no-tree'|'busy'|'no-viewer' }>;
}
```

## 5. Open risks / seams (forks called, with recommendations)

1. **Where the tree-walk state machine lives — engagement vs re-entrant controller.** **Decision: on the `DialogueConversation` `SustainedEngagement`** (Constraint 1). The alternative — a controller re-invoked each turn (player types a number, a `respond`/choice verb re-enters) — was rejected: it conflicts with "choices are private `PromptApi` prompts" (the requirements settled the choice channel is the prompt substrate, not a verb), and `PromptApi` already owns the await/cancel/disconnect lifecycle the loop needs. Putting the live machine on the engagement mirrors `RespirationDrain` exactly (state machine on the `SustainedEngagement`, registered for HMR-aware lifecycle dispatch) and gives clean abort on disconnect/host-destruct/leave for free.

2. **How `talk to` reaches the responder — brain `open` seam vs a `TreeDialogueApi`.** **Decision: a static `open` on the brain, called by the controller after path-resolving the spec** (Constraint 2). The alternative — a `DialogueApi` the controller calls, which finds the tree and drives it — was rejected: it would split tree knowledge across the brain and an Api (the requirements insist the responder *is* the brain and there's "no Api-per-NPC"). The brain staying the single owner of the tree format keeps the seam honest and keeps the second responder (`intent-dialogue`, Wave 2) a drop-in with no contract change (it implements the same `open` shape).

3. **A `tree-dialogue` brain that never fires on a trigger still needs a valid `BrainStatics`.** `act` is required by the contract but this brain is only ever called via `open`. **Decision: `act` is a documented no-op** (it can't fire — the `engage` sentinel wires no trigger). Alternative considered: make `act` optional in `BrainStatics`. Rejected for Wave 1 to avoid loosening the contract every other brain relies on; the no-op is one line and clearly commented.

4. **Discoverability contribution — systemic (BehavedMixin computes it) vs author-listed.** **Recommendation: systemic** (a tree NPC automatically affords `talk`, silent ones never do — the requirements' exact wording, AC#2). Risk: per-instance *conditional* contributions may need the `pushCommandSource` dynamic path rather than a static `commandContributions` (which is class-level and unconditional). **Verify the `pushCommandSource` mechanism in `lib/command/CommandGiver.ts` against the conditional-per-instance need before committing**; if it's heavier than the wave warrants, fall back to author-listing `social/talk.yaml` in each tree NPC template's `commandContributions` (option a) and note the systemic version as a follow-up. Either way the player-facing behavior (tree ⇒ talk, silent ⇒ none) is identical.

5. **Both-participant slot holds — two engagements vs one.** A single `SustainedEngagement` has one `actor` and occupies slots on that actor only (`SchedulerRegistry` slot map is per-actor). Holding `voice`+`attention` on **both** the player and the NPC therefore needs a companion hold on the player (Constraint/§3 Wave 2). **Decision: the `DialogueConversation` (NPC-side) starts and references a sibling player-side hold**, releasing both on end/abort. Verify `SchedulerApi.start` for the player-side hold doesn't conflict with anything the player already has (it shouldn't — `talk` is the player's action; if the player is mid-activity, declining gracefully is acceptable). Note as the one place to watch in tests (AC#8's "both sides free").

6. **`noUncheckedIndexedAccess` over author-supplied trees.** Every `nodes[id]` / `choices[i]` lookup is over data the author wrote and the validator checked at save — but runtime traversal must still guard (constraint in requirements). Pattern: resolve through helper accessors on `DialogueConversation` that return `undefined`-typed and end the conversation gracefully on a miss (defense-in-depth even though `validateTree` ran).

7. **Player's spoken line attribution.** The exterior line is emitted as `player.say(line, npc)` so the speaker is the player (the requirements' "the player's character speaks the authored line aloud"). Confirmed `VocalMixin.say` renders `Mml.name(speaker)` and fans self/peers/target frames (`Vocal.ts:138`) — the room overhears, the choice wheel never leaks. No new emission code needed.

## 6. Cross-references

- Spec: [npc-dialogue-requirements.md](../requirements/npc-dialogue-requirements.md).
- Precedents: [behavior.md](../subsystems/behavior.md) (brain contract, `BehavedMixin`, `validateBehaviorPaths`, slot contention), [activity.md](../subsystems/activity.md) (`SustainedEngagement`, `EngagedMixin` slots, `SchedulerApi.start`/`cancel`), [prompt.md](../subsystems/prompt.md) (`PromptApi.choice`, disconnect `cancelAll`), [command-routing.md](../subsystems/command-routing.md) (verb MVC triple, affordance attribution, `commandSource`), [comms.md](../subsystems/comms.md) / [messaging.md](../subsystems/messaging.md) (directed `say` Scene path).
- Read-only consumers: [trait.md](../subsystems/trait.md) (`TraitApi.positionFor`→`AxisEstimate`), [belief.md](../subsystems/belief.md) (`RegardApi.getRegard`/`adjustRegard`).
- House style: [advancement-plan.md](./advancement-plan.md) (plan shape this mirrors), [CLAUDE.md](../../CLAUDE.md) § Module Categories + § Export discipline + the Api↔logic-singleton split.
- Deferred (do not build): scripted `intent-dialogue` + the `addressed`/`handleMessage` trigger + implant `tell` entry (slate Wave 2), LLM responder (Wave 3), persistent per-relationship state ([social-graph-slate.md](../slates/builds/social-graph-slate.md)), multiplayer tree participation (Wave 3), complex guard/effect expressiveness ([scripting-slate.md](../slates/builds/scripting-slate.md)).
