# Controller liquidity — implementation plan

Executes `docs/requirements/controller-liquidity-requirements.md` (closed
scope). **Kind:** refactor/sweep. **Lead end:** kernel — the grammar, the
reach model, the gate moves and the act convention's third limb land first;
then every pack's controllers move in their pack, worst first, until all 527
have been read against the replacement test. The survey that is this build's
worklist is `docs/slates/builds/controller-survey/` (raw record) and its
machine copy `rows.json` (516 rows + 11 bases). Every survey fact used below
was re-verified against HEAD `2ce973dfb` before it went into § Grounding or
the ledgers; the survey's line numbers were taken at `369f59759` and are
stale, so the appendices cite current lines.

The one sentence the build is held to, from the owner: *what would a player
rewriting this controller be forced to copy that isn't about how it talks to
them?* Presentation stays in the controller however complex; the object
returns facts and choices; the view carries the grammar; MQL addresses and
never decides.

---

## ⭐⭐⭐ The owner's read — every player-visible word that changes

The owner reads this section before the build. Everything else in the plan
is engineering. Three kinds of change reach a player's fingers:

1. **Quoting replaces greedy for object names** (D3) — the one change that
   touches many verbs at once.
2. **Thirteen controllers change their forms** by the remedy ladder (the
   table below). Two of them end at rung 5 (a new word); both are flagged
   with why rungs 1–4 failed.
3. **Reach and grammar additions** that add forms without removing any
   (`--top`/`--open`/`--deep`, `:held`, `values:` refusals, `here` meaning
   the place).

Everything not in these tables keeps its typed forms exactly. The 75
multi-act and 44 protocol controllers are each given a rung in Appendix A /
B; 64 of the 77 resolve with **no visible change** (a mechanical split behind
the same words, or one protocol behind the same word).

### 1. Quoting replaces greedy (133 object args on 82 views)

| today | after | what breaks |
|---|---|---|
| `buy dog loaf`, `get red flower`, `look brass lantern`, `mill sack of wheat` — a multi-word name typed bare into an object slot | `buy "dog loaf"`, `get "red flower"`, `look "brass lantern"`; a single word still binds bare (`buy loaf`); a leading article still binds (`eat the apple`) | any script or alias that names a thing with two unquoted words. The refusal names the fix: *"too many words — quote a name with a space in it: `buy "dog loaf"`"* |
| `say hello there`, `dm bob see you at six`, `press post …`, `post …`, `def …` and every other **prose** arg | unchanged — greedy stays on `type: string` prose | nothing |

The full list of the 133 args, by view, is Appendix E. ⚠ Two shipped
doctrines reverse: command-spec.md's *"a prepositional object arg is born
`greedy: true`"* and `lint:reachability` arm G (`ARTICLE_SHAPE_CEILING`,
which ratchets toward MORE greedy). Both are retired in W1/W5 (D3).

### 2. Controllers whose forms change (the remedy ladder)

| controller | today's forms | rung | the new forms | what breaks |
|---|---|---|---|---|
| `HeatController` (platform crafting) | `heat <build>` (engaged, 200 W), `heat <tool>` (sterilize, engaged), `heat <pot>` (**instant** `move(…,'on')` — the `boil` fold) | 1 + existing verb | `heat <thing>` = hold it in the fire until it has taken the heat (`Heated.takeHeat`, one engaged act on three hosts). Setting a vessel on the fire is `put <pot> on <hearth>`; the world then heats it | `heat pot` as a way to set it on the fire; `boil` by typing `heat` |
| `FellController` (trade-forestry) | `fell <standard>`, `fell <planted tree>`, `fell <bole>` (= crosscut a length) | 1 + existing verb | `fell <tree>` on a standard or a planted tree (`Fellable.fellPlanFor`); a bole is cut with `cut <bole>` (Cuttable's crosscut, already answered) | `fell log` |
| `CharController` (trade-fuel) | `char [at <clamp>]` lights the burn; `char <n>` adjusts the draught | 1 + existing verb | `char [at <clamp>]` lights; the draught is the device verb's: `draught <clamp> <setting>` (`values: [wide, open, half, low, banked]`) | `char 0.5` |
| `TanController` (trade-tanning) | `tan <hide> in <pit>` lays in; `tan <hide>` again reports progress | 1 + existing verb | `tan <hide> in <pit>`; progress is a read: `look <pit>` (the pit's describe carries it) | `tan hide` as a progress check |
| `BelayController` (platform movement) | `belay <person> [with <rope>]`; `belay off` | 1 + existing verb | `belay <person> [with <rope>]`; taking the rope off the belay is `untie <rope>` (cordage's knot) | `belay off` |
| `BerthController` (transport harbor) | `berth <ship> at <quay> [in <book>]` berths; the same words with no free quay sends her to the roads | 3 | `berth <ship> at <quay>` (fallthrough form, unchanged) and `berth roads <ship>` (a subcommand of the harbormaster's book) | sending to the roads by omission |
| `BoreController` (trade-drilling) | `bore [<hole>] [with <rig>]` — sites a wellhead when there is none, swings the bit when there is | ⭐ **5** | `spud [with] <rig>` sites the hole (mints the wellhead, arms the rig — a title gate and a bank leg); `bore <hole>` swings the bit | `bore` as the way to start a hole. *Why 1–4 failed:* not one act (siting mints a wellhead and takes money; swinging is an engaged stroke) so not rung 1; siting is not a manner of boring (2); drilling has no noun the player groups these under (3); the two forms have the same syntax and differ only by world state, so no disjoint shape exists (4). `spud` is the driller's own word for it |
| `FitController` (platform crafting) | `fit <part> to <whole> [with <tool>]` (assembly, three heads that are one act); `fit <label> on <pot> with <paste pot>` (a face coat) | 1 for assembly; ⭐ **5** for the paste | `fit …` is assembly only (`CraftingApi.fit`); pasting a label is `paste <sheet> on <whole> [with <pot>]` | `fit label on pot`. *Why 1–4 failed:* the paste has its own refusals (glue), no engagement and a different outcome (a coat on a face), so not one act (1); not a manner of fitting (2); no noun groups "paste a label" with "fit a handle" (3); its syntax is `fit X on Y with Z`, which is also assembly's, so no shape is disjoint (4). `paste` sits beside `paint` and `dip` in the face-coat family |
| `AssessController` (platform perception) | `assess <target>` — in a fight, a read that **spends an exchange**; otherwise a medical examination | 3 | `assess <patient>` is the medical examination; the combat read is `fight assess <target>` (a subcommand of the fight noun the player already groups gambits under) | `assess <foe>` mid-fight |
| `NotifyController` (platform social) | `notify` lists; `notify <ref>` shows; `notify <ref> --login --message …` sets; `notify <ref> --above <x>` reorders; `notify remove <ref>` | 3 | `notify` (list), `notify show <ref>`, `notify set <ref> --login …`, `notify move <ref> --above <x>`, `notify remove <ref>` | `notify bob --login` (needs `set`); `notify bob` (needs `show`) |
| `EquipSetController` (platform inventory) | `equip set <name>` wears a set; `equip set <name> --save` saves one; `equip sets` lists | 3 → a verb (W16) | ⭐ **`outfit wear <name>`** wears; **`outfit save <name>`** saves; **`outfit list`** (or bare `outfit`) lists — a diegetic verb, so a plain word (owner, 2026-11-10; W7b had shipped `equip set save <name>`, nested) | `equip set …`, `equip sets`, `--save` |
| `LayoutController` (`cockpit layout`) | `cockpit layout <name>` recalls; `list`/`save <name>`/`forget <name>` are caught before names, so a layout *named* `list` can never be recalled | 3 → a verb (W16) | ⭐ **`client-layout list`** · `save <name>` · `forget <name>` · `recall <name>`; `client-layout <name>` still recalls by fallthrough. A layout named `list` is recalled with `client-layout recall list` — a non-diegetic compound name (owner, 2026-11-10; W7b had nested it under `cockpit`) | `cockpit layout …`; the dead end goes |
| `PackSyncController` (`pack sync`) | `pack sync <id>` then **prompts for a name** to staff the pack with (and passes the raw text as a member path, so the member never matches) | 3 | `pack sync <id>` syncs; `pack staff <id> <person>` staffs (an object arg, keyed by identity) | the prompt |
| `WatchController` | `watch <stream> [on <screen>]`; `watch horizon` (a ship's lookout, a different act) decided inside the controller | 3 + 4 | `watch horizon` is a declared subcommand; `watch <stream>` and `watch <stream> on <screen>` are two shapes (prepositionRequired) with their own controllers | nothing — the typed forms are the same; only an unknown second word is now refused by the view |

⚠ **Renamed by the build (W1, D4a) — not in the table above.** Reserving
the depth rungs as option names took three shipped options:
`forum make --open` and `subject make --open` → **`--public`**; `weave
--open` → **`--coarse`**. Same act, same field, a new flag word.

Behavior changes a player will notice without a word changing (D5–D7):
`here` in a boat/cart/bed means the **place** (`look here` on the river
describes the river; `look me:e` the boat); `reachable` now finds the apple
in the open bag in your pack; `eat apple` with the apple in a shut box says
*the box is shut* instead of *you have no apple*; `look me:I:apple` finds it
wherever it is. `draught fire medium` is refused by the view with the five
allowed words; `stream away 90m` and `job post … --expires 2h` accept written
durations.

### 3. Three representatives for drive step 8

- **a subcommand noun:** `notify set <ref> --login` / `notify show <ref>` /
  `notify move <ref> --above <x>` — `help notify` lists the five forms.
- **an option:** `draught <fire> low` — the five words are a `values:` list
  on one arg; `help draught` lists them; `draught fire medium` is refused
  by the view with the list.
- **a shape:** `dry <wet thing> with <cloth>` (rub dry, instant) vs
  `dry <thing> [on <rack>]` (hang up; the world dries it) — two shapes of
  one word, each with its own controller (the `throw` trio's rule);
  `help dry` shows both.

### 4. Counts by rung (Appendix A, 75 multi-act + 2 unclear)

| rung | count | visible change |
|---|---|---|
| 1 — one act, several hosts (a protocol or one planner) | 31 | 5 of them retire a head into an existing verb (`put`, `cut`, `draught`, `look`, `untie`) |
| 2 — a manner (an option) | 4 | none |
| 3 — subcommands of a noun the player groups (the 5 nested ones became verbs in W16) | 33 | `notify`, `outfit save`, `berth roads`, `pack staff`, `fight assess`, `client-layout recall` |
| 4 — disjoint shapes of one word | 6 | none |
| 5 — a new word | 2 | `spud`, `paste` (Fit's assembly half stays rung 1) |
| base, not a ladder item | 1 | `BankingControllerBase` |

The 44 protocol candidates (Appendix B) are rung 1 by definition and change
no words.

### 5. The owner's calls — decided 2026-11-09

1. **`house` / `job` stay on `Persona`** (self). Decided by the owner (D15).
2. **`spud` and `paste` are accepted** as the two rung-5 words.
3. **`heat` loses the set-it-on-the-fire arm** — the owner did not
   object; `put <pot> on <hearth>` is the act.
4. **`notify set` stays** (ruled 2026-11-09, during W7) — the builtin
   `set` word on a noun is accepted; `lint:subcommand-words` records it.
5. **No nested subcommands** (ruled 2026-11-10, W16) — a command is `verb
   target` or `verb subcommand target`, never deeper; D2 is reversed. A
   **non-diegetic** verb (the interface, the tooling) may take a hyphenated
   compound name; a diegetic verb stays a plain word. So `cockpit
   layout|card|shelf|style …` → `client-layout|client-card|client-shelf|
   client-style …`, `stream rotation …` → `stream-rotation …`, `testharness
   clock advance` → `testharness clock-advance` (and `weather-pin`,
   `weather-unpin`), `equip set <name>` / `equip set save <name>` / `equip
   sets` → `outfit wear` / `outfit save` / `outfit list`; `client-style
   mention self on` → `client-style mention on`, `… plain channel <k> on`
   → `client-style plain-channel <k> on`. `cockpit mode|cli|terminal` stay.

### 6. Found in the build — further player-visible changes

- `mill X at <stones>` — the preposition is required (W5, D3c).
- `stream away 10` is refused — a duration names its unit (`10m`) (W7b).
- `draught at <fire>` is the read; `draught <fire>` alone is refused (W7b).
- `berth <ship> roads` is refused — the form is `berth roads <ship>` (W7b).
- `watch X on <screen>` refuses when the screen is out of reach (W7b).
- `label X meet at noon` needs quotes — `at` names only a field part
  (`label X "meet at noon"`) (W7c).
- `belay off` is gone — `untie` ends the belay (W7c).
- `wash` needs water in reach (a tap, a pump, a shore — a crafted pail no
  longer counts) (W7c).
- `stir <churn>` → **`churn`** (the dairying pack's own verb) (W18).
- ⭐ **`stir` what runs, `knead` what is stiff** (owner, 2026-11-10; W19):
  `stir <runny compound>` (a paint pot, a glaze or slip tub, a plaster
  tub, a batch pot) stays **`stir`**; `stir <stiff compound>` (clay, raw
  rubber, a dough) → **`knead`** — refused "too stiff to stir — knead
  it", and `knead <runny compound>` refused "nothing to knead. Stir it."
  (W18 had sent every compound to `knead`.)
- `sweep <grate>` → **`rake`** (`rake hearth`, `rake pit`); `sweep` keeps
  the floor and, with a flue brush, the chimney (W18).
- ⭐ **`survey` is retired** (owner, 2026-11-10; W17) — the word belongs to
  land surveying. The place read is **`analyze rooms`** (what the room
  answers to and by what; at home the holding, the shell and who owes the
  upkeep); a building's outside from its landing is **`analyze condition
  <building>`** (the condition word and why) and **`measure paint
  <building>`** (the area to the weather and the litres a coat takes — a
  rule or a gauging rod); the floor line is `analyze cleanliness floor`'s.

---

## Grounding

Verified at HEAD `2ce973dfb` (merge-base with `origin/master` is
`d8b059abd`). Paths are repo-relative; `$C` = `packages/server/src/mud/platform/idea/cmd`,
`$L` = `packages/server/src/mud/lib`, `$I` = `packages/server/src/mud/platform/idea`,
`$P` = `packages/content`, `CL` = `$I/api/CommandLogic.ts`, `CD` =
`$L/command/CommandDefinition.ts`, `CG` = `$L/command/CommandGiver.ts`.

### The command grammar today

- The view types live in `packages/server/src/mud/api/command.ts`:
  `FieldDefinition` L817–989, `OptionDefinition` L1083–1161,
  `SubcommandDefinition` L1186–1209, `CommandView` L1230–1331. The
  load-time JSON schema is `$L/command/command.schema.json` (root
  `additionalProperties:false` L11; `$defs.subcommand` L163 has **no
  `subcommands` key** — nesting is unrepresentable; positional L207; option
  L340). `lint:command-views` validates every view against it.
- Arg types are exactly `string | number | boolean | object | objects |
  struct` (api/command.ts L841). **There is no `values:`/`enum:`, no
  `type: duration`, no `type: quantity`.** `type: number` is coerced only
  for options (`coerceOptionValue` CL L2661–2693) and struct input
  (L2711–2715); a typed **positional** binds the raw string
  (`bindPositionalsImpl` CL L3097, L3110 — `CockpitCardController` does its
  own `Number(model.col)` at L150).
- An out-of-set option value has **no view mechanism**; controllers refuse
  it (`StyleController` L92–112, `CockpitShelfController` L90–113,
  `CockpitCardController` L89–97). Unknown options and non-numbers are the
  binder's (`bindOptionToken` CL L2523–, ≈L2579/L2593).
- Validators: `$L/command/validators/*.ts`; `resolveCommandValidators` CL
  L3639–3680 (a `requires:` synthesizes one first, L3653–3662);
  `runValidators` CL L1920– (verb → subcommand → field → option); the note
  is `validator-failed` and the player sees the validator's string (CG
  L148–150).
- Subcommands: `assemble` Phase 2 CL L1049–1072 (`getSubcommand`;
  `fallthrough`; `unknown-subcommand`); `model.subcommand` set at L1183;
  `controllerForSubcommand` CD L347–352; dispatch picks it at CG
  L1694–1697; a verb-level `controller:` may be omitted iff every
  subcommand names one (CD L276–295). Per-subcommand controllers are
  shipped for `fight`, `bank`, `title`, `pack`, `soul`, `wiki`, `job`,
  `tune`, `equip`, `cockpit`; `house.yaml` is **mixed** (book/pnl/payroll/
  roster ride `HouseController`'s switch; eight others name their own).
- Second-level words ride **string args**, not subcommands:
  `cockpit card <action>` (cockpit.yaml L201, L237–249), `cockpit shelf
  <action>` (L251), `cockpit layout <name>` (L72; `LayoutController`
  L66–74 catches `list`/`save`/`forget` before names), `cockpit style
  <styleSub>` (L300). `SaxonbergClient.validateArrangementName`
  (`$L/connection/SaxonbergClient.ts` L834–868) does not reserve the
  control words — **a layout named `list` is saved and can never be
  recalled (confirmed).**
- Shapes: several view files declare the same `verbs:` (`throw.yaml`,
  `throw-at.yaml` with `prepositionRequired` L48–50, `throw-to.yaml`
  L37–40, all in `$P/platform/content/platform/cmd/inventory/`). Selection
  is `CG._runChain` L1190–: `matchAffordances` L1202, `assemble` per view
  L1290–1320, a `shape` error moves to the next view (L1305–1315), a `bind`
  or `unknown-subcommand` error **stops the chain**; all-fail →
  `shape-fall-through` (CG L110–111, L1459–1464).
- Greedy: `FieldDefinition.greedy` (api/command.ts L879–884);
  `validateArgOrdering` CD L698–760 (greedy last, or followed only by
  prepositioned args); consumption `bindPositionalsImpl` CL L2863–3062, the
  lone-quoted rule L2936–3027, `collectLaterPrepositions` ≈L3150–3180.
  **Census: 212 greedy args; 133 are object/objects (107 + 26), 79 are
  strings.** Appendix E lists the 133.
- Quoting already works: `CommandLineLogic.lex()`
  (`$I/api/CommandLineLogic.ts` L111–158; `readDoubleQuoted` L40–60) makes
  `"dog loaf"` one token with `value` (unquoted) and `raw`; a non-greedy
  positional binds `value`. MQL strips a leading article inside a token
  (`api/mql/desugar.ts` L118–240) but the **binder** does not: `eat the
  apple` into a non-greedy slot binds `the` (the article defect,
  command-spec.md § greedy).
- Reserved per-invocation flags: `reserved()` closure CL L999–1020
  (`--async/--sync`, `--strict/--loose`), stripped in Phases 1 and 3 (L1032,
  L1083), returned on `AssembleSuccess` (L1188–1189) and carried on
  `CommandContext.filterPolicy`; the only registry is
  `validateReservedFlagNames` CD L910–937 with the hard-coded set at L913.
  `--strict` acts in `applyFilteredPolicy` CL L603–622 and `strictCandidates`
  L576–/L1696–1707.
- The arg gate: `parseRequirement` CL L3458– (`any` → no terms L3463;
  unknown mixin throws ≈L3521; `class:` terms ≈L3500–3517); `walkScopes` CL
  L519–574 filters by `admitsAll` and, when nothing admissible survives,
  **returns the first raw match** (L570) — which the synthesized
  `requirementValidator` (CL L3562–3620) then refuses. Requirement terms are
  **AND** (L3562–3605): `unhitch.yaml` L23 `requires: [VisibleMixin,
  HaulableMixin]` refuses `DraftAnimal` (`MountableMixin(HaulerMixin(Beast))`,
  `$I/../platform/agent/DraftAnimal.ts` L57) at bind, so the help's own
  `unhitch horse` never binds (confirmed).
- `help <verb>`: `HelpCatalogue.ts` L505–528 projects `def.getHelpText()`
  under id `command.<verb>`; topics are a Map (L428) so **for a multi-view
  word the last view wins** — the throw trio's shapes are not merged.
  `getHelpText` (CD L490–561) renders one level of subcommands and options
  with no allowed values (`renderOptionLines` L587–610).

### MQL and reach today

- Pronoun seeds `me · here · it · them · him · her` (`api/mql/parser.ts`
  L84–91; `resolvePronoun` `api/mql/resolver.ts` L442–459). **`here` is
  `giver.getContainer()`** (L446–452) and `:e` is the same (L1273–1275);
  the `here` scope pool is `candidatesForHere(giver.getContainer())`
  (L794–800) and the `here` predicate compares against it
  (`predicates.ts` L99–109). **Confirmed: `here` ≡ `me:e`; in a boat `here`
  is the boat.** The docs say otherwise (mql-grammar.md L157, mql.md L336).
- Keyword seeds `inventory · online · world · peers · reachable · person ·
  horizon` (resolver L169–171; L485–524). `reachable` =
  `candidatesForReachable` (`api/mql/scope-walk.ts` L240–261) = `person`
  (L216–238: the giver, slot occupants, `giver.getContents()` **top level
  only**, L132–142) → `here` → `peers` (L159–187: the environment's
  contents, **one level into `isOpenContainer` items** L175–179, the
  fixtures L181–185). So today `reachable` does **not** look inside an
  open bag you carry, and does look one level into an open crate in the
  room. Openness is `MixinApi.isOpenContainer` (`api/mixin.ts` L1095–1106:
  Container, not an Agent, not a shut Sealable). `PerceptionLogic.canReach`
  (`$I/api/PerceptionLogic.ts` L315–391) is **asymmetric** with the seed:
  it reaches one level into open containers on both sides and checks
  `getEnclosingScope` for a shut lid (L350–357).
- Transforms `i I e E b` (`lexer.ts` L76–93; `applyTransform` resolver
  L1194–1299). `:i` → `visibleInside` → `PerceptionApi.visibleContentsOf`
  (`PerceptionLogic.ts` L596–637; **a shut Sealable yields nothing**,
  L599). `:I` → `visibleInsideDeep` (L1178–1192) re-applies that per level
  (cap 32), so **it stops at shut containers**; only a null viewer (system
  mode) uses `getDeepContents()` (`$L/spatial/Container.ts` L83, L498–510 —
  a DFS with no openness check; other callers `PersistableLogic.ts:455`,
  `ResidencyLogic.ts:152`, `Floor.ts:987`).
- Predicates: `MQL_PREDICATES` (`predicates.ts` L175–184) = `living ·
  online · mine · here · visible · loose · worn · carried`; the interface is
  `{check(target, giver, ctx)}` (L32–35). **`worn` (L156–158) and `carried`
  (L166–169) exist; `held` does not.** Held vs worn is distinguished only
  inside `visibleContentsOf` (L614–627, by the slot's `accepts`).
- **No plain word acts as a modifier inside MQL** (grep of `api/mql/*.ts`
  for open/top/deep/strict/shut/sealed finds only the quantity `mode:
  'strict'` field, types.ts L168). Reserved barewords: the pronouns, the
  seed words, `members · exits · to · from`, the eight predicates, the five
  transform letters, the bracket words.
- The binder's per-arg knobs are `scope:` (`def.scope ?? ['$focus']` CL
  L1556; `scopeTries` L498–503 drops a `here` try when a later try is
  `reachable`) and `default:` (applied as **text** before resolution,
  L2865–2866 etc.). `MqlOneResult` (`types.ts` L299–302 / L192–210) is
  `{stuff, via?, quantity?, scan?, isSet?, raw, prep?}` — **no `defaulted`
  flag**. There is no per-arg depth field.
- No public method walks up to the Place. `roomOf` (`PerceptionLogic.ts`
  L1430–1437: `getContainer()` until `cur.isPlace() && isContainer`, max 8)
  and `enclosingLocation` (`$L/message/Scene.ts` L419–431) are both
  module-private. `Containable` (`$L/spatial/Containable.ts` L63–140)
  exposes `getContainer`, `getRootContainer`, `getPlacement`,
  `getEnclosingScope`.
- Tests to extend: `api/__tests__/mql.test.ts` (seeds L25–167, transforms
  L256–418), `mql.reachable-seed.test.ts`, `mql.system-mode.test.ts`,
  `api/mql/__tests__/scope-walk.open-container.test.ts`,
  `visible-inside.test.ts`, `predicates.listing.test.ts`; binder:
  `$L/command/__tests__/CommandGiver.scope*.test.ts`,
  `CommandDefinition.*.test.ts`.

### The act convention (shipped by !527)

- `$L/craft/ActPlan.ts`: `ActRefusal<R, X>` L38–41, `ActOutcome<F>`
  L51–54, `ActDone` L57–59, `ActPlan<B, F, X>` L68–90
  (`{ok:true, durationMs, effortW, facts, onComplete, onAbort?}`). Reason
  unions are closed per protocol; controllers word them with an exhaustive
  `switch` + `never` arm. **There is no "choices" limb.**
- `$L/command/EngagedActController.ts` L94: `ActWords` L51–60
  (`beginSelf · beginPeers? · onRefused · onDone?`), `engageAct` L133–152 →
  `engageActPlan` L212–284 (zero duration runs inside the frame L226–233;
  otherwise `canExert`, a `land` closure guarding `giver.isDestroyed()`
  L240–256, a `ManualBuildStep` on `['hands']` via `SchedulerApi.start`
  L261–269). ⚠ `engagePlan` itself lives on
  `$C/crafting/ManualBuildController.ts` L169–217, so only ManualBuild
  subclasses have it; the rest use `engageAct(plan, words)`.
- A controller is cloned per execution and **destructed in the dispatcher's
  `finally`** (CG L1732–1733 async, L1752–1753 sync) while its engagement
  is still pending. A destroyed Stuff is **inert**: every method returns
  `undefined` silently (`api/security.ts` L1525–1567). Hence the
  `protected static` word pattern (`HarvestController` L98/136/146,
  `TapActController` L138/164/222, `TwistController` L60/65/79,
  `OrderController` L152–262, `EquipControllerBase`, `GroundWorkController`,
  `ManualBuildController`, `BankingControllerBase`, `ReloadController`).
- `lint:completion-this` (`packages/server/scripts/check-completion-this.ts`
  L63) matches only the **inline block-bodied** `onComplete: (…) => {`
  (plus `onRefused`/`onDone` L80). It is blind to `onComplete,` shorthand,
  `onComplete: <ident>`, and a hoisted `const onComplete = () =>`. **Three
  live sites call a destroyed controller (confirmed):**
  `$C/perception/SearchController.ts` L70 (passed L82; scheduled path
  L93 — a timed `search` never resolves or records `searched`),
  `$C/movement/TeleportController.ts` L320–322 (passed L337; an engaged
  anchored cast never arrives),
  `$P/trade-medicine/src/idea/cmd/medical/TransfuseController.ts`
  L77–81/L128–151 → L221 (`credit` L242, `narrate` L252, `recordHarm` L160,
  `recordRevival` L184 are instance methods; `patient.receiveBlood` L129
  does run, so the blood moves and nothing else happens). Every other
  `onComplete`-as-a-name site was checked and is clean (list in the W0
  brief).
- `Cuttable` (`$L/craft/Cuttable.ts`): `CutAnswers` L182–194 has **ten**
  keys (`cut · groove · scrape · saw · rive · crosscut · butcher · scribe ·
  snap · groze`; the survey said eleven), `CutRequest` L138–154 carries
  `raw` and `length` strings, `cutPlan(req)` L261–263, the mixin is
  `_mixinKind = 'protocol'` L276–286. Implementers: `Rope.ts:902` (cut),
  `Corpse.ts:256` (butcher), forestry `Bole.ts:168` (crosscut · rive ·
  saw), `Billet.ts:57` (rive), glass `Sheet.ts:100` (scribe · snap ·
  groze), water `IceSheet.ts:362` (groove · scrape · cut), sugar
  `SugarLoaf.ts:150` (cut). Callers: `CutController:65,81`, glass
  `Snap:33`/`Groze:38`/`Scribe:36`, ice `lib/IceActController:60`, cooking
  `ButcherController:335`, carpentry `SawController:173`, forestry
  `FellController:159`, `RiveController:111`. `CutPlanner.cutPlanFor`
  (`$L/craft/CutPlanner.ts` L15–18) has one composer (tailoring
  `CuttingTool`).
- Protocols that exist and are reused as-is: `Carvable.carvePlanFor`
  (`$L/craft/Carvable.ts:93`; Greenware, Mould, carpentry PatternStock),
  `DipBath.dipPlanFor` (`:98`; GlazeTub, DipPot, Blowpipe, Melt, PulpVat),
  `PourTarget.receivePour` (`$L/bulk/PourTarget.ts:78`; Bulkable,
  ManualBuild), `KneadVessel.kneadPlanFor` (`:88`; Compounding,
  DoughTrough), `Forming.shapePlanFor` (`:87`) / `Shapeable` (`:93`),
  `Pumpable.planPump/completePump` (`$L/pump/Pumpable.ts:111–132`),
  `Splittable = SplitWorkable` over `Workable.planWork`
  (`$L/ground/Workable.ts:118–125`), `Tieable.tieTo/untieBy`
  (`$L/spatial/Tieable.ts:30–38` — returns `line` strings, not an ActPlan),
  `Producing.planTap` (`$L/husbandry/Producing.ts:216–227`),
  `PricedOffer.orderPlanFor` (`$L/commerce/PricedOffer.ts:140,151`),
  `Vitals.treatmentPlanFor` (`$L/vitals/Vitals.ts:654,900`, impl `:3558`,
  synchronous), `HaulOut.pullOut` (`$L/location/HaulOut.ts:39–57`),
  `Frame.planCourse` (`$L/expanse/Frame.ts:82`; `Expanse.ts:151`;
  river.md's `LineFrame`). **`Launchable` does not exist** — the transport
  controllers duck-call `launchPlaceFor`/`recoverPlaceFor` on the water
  pack's `SeaWarren.ts:129/136` and `ReachWarren.ts:1114/1139`
  (`LaunchController:44`, `RecoverController:38`, `lib/Propel.ts:242`).
  `Ringable` exists (`$L/perception/Ringable.ts`; `Bell`, `SignalBell`).
- 24 `*ControllerBase.ts` files (Appendix A's base list);
  `pack-roots.controllerFiles()` (`scripts/pack-roots.ts` L405–430) includes
  them (regex `/Controller(?:Base)?\.ts$/` L413) and a pack's
  `src/lib/**/*Controller*.ts`.
- `house` and `job` are afforded on `Persona.commandContributions.self`
  (`$L/character/Persona.ts` L135; house.yaml at L173 with the W7/D9
  rationale L161–172; job.yaml at L181, L174–180), beside `office`,
  `government`, `committee`, `clock`, `title`.

### The gates, ceilings and the record method

- Census gates and their ceilings (code wins where lint-family.md
  disagrees): `controller-decisions` 1176 / durations 100
  (`check-controller-decisions.ts` L43–44); `controller-mutations` 318
  (L38); `controller-functions` 230 (L29); `controller-resolution` hunts 4
  / self 110 (L210/L216); `duck-typing` 539 / undefined 0 (L64/L66);
  `mixin-clusters` 40; `mixin-files` 0; `one-word` 0/0/0; `institution-verbs`
  0; `subcommand-words` pairs 42 / builtin 6 (L32–33); `contribution-keys`
  0; `completion-this` 0 (L39); `person-keys` hard 0 on the literal shape
  `kind:'player' + templatePath: …getTemplatePath()` only.
  `ratchet()` (`pack-roots.ts` L465–488) fails in both directions; a
  ceiling is lowered by editing the exported constant. The cleanest
  template for a new gate is `check-controller-functions.ts` (77 lines) +
  `scripts/__tests__/check-controller-functions.test.ts`. Registration is
  one `"lint:<name>"` line in `packages/server/package.json`;
  `lint:family` derives the roster.
- `lint:reachability` arm G `ARTICLE_SHAPE_CEILING = 110`
  (`check-reachability.ts` L885; checks L1254–1258) counts prepositional
  object args that are **not** greedy and ratchets them down — the opposite
  of D3.
- The before/after record method: `packages/wire/tests/controllers-are-io.dirty.wire.test.ts`
  L90–165 — `CAIO_RECORD=1` writes `controllers-are-io.baseline.json`
  (`{status, notes[{kind, reason, validator}], duration, state}` per act,
  state read through a seated wizard's `eval`, kinds and booleans never
  ids); every other run compares and fails on any difference. Step 16's
  alternate-controller install (L1026–1080) re-points a view's
  `controller:` through the CMS REST surface as a title-holding wizard.
  The restart steps (L1340–1440) boot an owned world
  (`bootOwnedWorld`). The e2e walk precedent is
  `e2e/tests/controllers-are-io-walk.spec.ts` (`openWorldAs`,
  `runCommand`, `/auth/test-hand`, a seated `eval`).

### The Harvest lesson, located

`HarvestController.ts` L80 passes `typed: model.target.raw` into
`Growing.harvestPlanFor` (`$L/husbandry/Growing.ts` L1584–1585 matches the
label by substring — resolution hiding in the model). `Soil.resolvePartFor`
(`$L/husbandry/Soil.ts` L1145–1161) returns `{ok:false, reason:'part-unnamed',
line: "Which field? Name one: …"}` — the **ground wrote the sentence and
chose to refuse rather than ask**; `soilPartRefusal` L1134–1142 builds the
list as prose. `Growing.harvestPartFor` L965–972 forwards the `line` as a
fact. `HarvestWordedController.ts` overrides three static word methods and
can change every word but cannot make `harvest` ask.

### Person keys on lineage (confirmed sites)

`Avatar.getIdentityPath()` (`$L/character/Avatar.ts` L753–757) is the
person; `Stuff.getIdentityPath()` falls back to the template path
(`Stuff.ts` L551–553) so the switch is always safe;
`AccessRegistry.subjectOwnsAsPlayer` (`$I/AccessRegistry.ts` ≈L455)
compares `owner.templatePath === subject.getIdentityPath()`. Defective:
`$C/social/IntroduceController.ts:75`; `$C/civics/TitleTransferController.ts:156`
(→ `ParcelApi.transfer` L189–192; the ship-share branch L219/233/272
already uses identity); `$I/api/CraftingLogic.ts:3609,3620` (the Crafted
maker stamp — and `$I/api/ChattelLogic.ts:318–320` derives **title** from
`getMaker()`, so every player-made good is titled to the lineage);
`$P/trade-tailoring/…/SewController.ts:137`; mining `DriftController.ts:211–212`
+ `ShoreController.ts:130` (`MineWarren.ts:121 holder`);
`$I/ChannelCatalogue.ts:260,264–266` (ad-hoc channel membership);
`$C/social/PartyControllerBase.ts:47–50` (playerId vs templatePath);
`$C/social/GroupRemoveController.ts:15,24` / `GroupRoleController.ts:18,28`
(a raw typed string against identity paths stored by `GroupAdd:37`);
`$C/social/ContactsController.ts:98` (NPC by templatePath). Issue #126
(`Login.ts:503`, `ConsumerLogic.ts:75`) is db-performance's and is left
alone. The legitimate lineage reads (a warren's structure owner, a
singleton organization, kind comparisons, log labels) are listed in the W3
brief so the gate's classifier can exempt them.

### In-flight siblings

- **material-decomposition** (build-1, `origin/reqs/material-decomposition`,
  plan W0–W4): touches `SmeltController`, `PourController`,
  `DoseController`, `ThrowController`, `WashController`, `PaintController`,
  `SurveyController`, `DyeController`, `RiveController`,
  `MordantController` only as **consumers narrowing by capability
  predicate** (its W1), one-line edits at the read sites.
- **documents-path-identity** (build-4, `origin/reqs/documents-path-identity`):
  turns `Placement`, `Form`, `Operation`, `DirtKind`, `Joint` into documents
  and names `HeatController:176` (`move(…,'on')`), `ShapeController`,
  `OperateController`, `StokeController`, `SipController`, `PressController`,
  `SurveyController`, `CastController`, `StudyController`, `PutController`
  tests.
- Neither owns controllers. Whichever merges second reconciles; the overlap
  is small because this build **moves** logic out of those files (their
  edits are inside blocks that move whole), and `HeatController:176` goes
  away here (the placement arm retires into `put`). W9–W13 briefs name the
  files to re-grep after a sibling merge.

---

## ⭐⭐ New substrate

Short is the goal. No new Api, no new logic singleton, no new hook, no new
document kind, no new collection, no new module category. The kernel grammar
grows by **fields on existing types**; reach grows by **one method and one
predicate**; the act convention grows by **one limb**. The protocol mixins
below are the price of rung 1: every one has at least two host *kinds*
(review question P1's earned test), and every one replaces an `instanceof`/
`isX` arm or a duck-typed probe a controller carries today.

| new thing | kind | where | reuse ledger row / why genuinely new |
|---|---|---|---|
| `values:` on an arg/option; `type: duration` | fields on `FieldDefinition`/`OptionDefinition` + schema | `api/command.ts`, `command.schema.json`, `CommandLogic` coercion, `CommandDefinition.getHelpText` | generalizes the existing `type: number` coercion and `validators:`; searched: no enum/duration exists (§ Grounding) |
| nested `subcommands:` | recursive field on `SubcommandDefinition` + schema | same + `CommandLogic.assemble` Phase 2, `controllerForSubcommand` | generalizes one-level subcommands; `model.subcommand` stays the leaf, `model.subcommandPath` added |
| `depth:` on an object arg; reserved `--top` / `--open` / `--deep` | field + three entries in `RESERVED` | `CommandDefinition.validateReservedFlagNames` L913, `CommandLogic.reserved()` L999–1020, `scopedMany` | generalizes `--strict`/`--loose` (the per-invocation option that settles ambiguity) |
| `held` predicate | one entry in `MQL_PREDICATES` | `api/mql/predicates.ts` L175–184 | beside `worn` and `carried`, which exist |
| `Containable.getEnclosingPlace()` | method on an existing mixin | `$L/spatial/Containable.ts` | promotes the module-private `roomOf` (PerceptionLogic L1430) / `enclosingLocation` (Scene L419) to the one public walk — the third consumer (`here`) is the signal |
| `ActChoices<C>` | third limb of the act convention | `$L/craft/ActPlan.ts` | genuinely new: the model returns the set, the controller picks/refuses/asks (the Harvest correction). Searched: `ActRefusal` carries prose today (`Soil.resolvePartFor` `line`) |
| `EngagedActController.engagePlan` | method move, not new | `$L/command/EngagedActController.ts` ← `ManualBuildController.ts` L169–217 | so a non-ManualBuild controller can engage an `ActPlan` with words |
| `Sawable` · `Rivable` · `Crosscuttable` · `Butcherable` | protocol mixins (kernel) | `$L/craft/` | replace four keys of `CutAnswers`; hosts: Bole+Billet / Bole+Billet / Bole+Log / Corpse+any Organism body (default plan). `cut` stays `Cuttable` (Rope, IceSheet, SugarLoaf, CuttingTool). `groove`/`scrape` (IceSheet only) and `scribe`/`snap`/`groze` (glass Sheet only) become **host methods**, not protocols — one host each |
| `Heated` | protocol mixin (kernel) | `$L/fire/Heated.ts` | `takeHeat(K, s)`; hosts ManualBuild (latch + anneal), Soilable tool (sterilize), Tempered. Replaces `HeatController`'s three arms |
| `Agitated` | protocol mixin (kernel) | `$L/craft/Agitated.ts` | `agitatePlanFor(actor, technique)`; hosts Compounding (knead), HandWorked (churn), ManualBuild (stir). Generalizes `KneadVessel.kneadPlanFor`, which stays as its Compounding implementation |
| `Washable` | protocol mixin (kernel) | `$L/cleanliness/Washable.ts` | `washPlanFor(spec)`; hosts Soilable goods and the body's hand faces (Creature) |
| `Sweepable` | protocol mixin (kernel) | `$L/cleanliness/Sweepable.ts` | hosts Floor, Burner grate, Flue |
| `Sampleable` | protocol mixin (kernel) | `$L/instrument/Sampleable.ts` | `samplePiece(actor, part?)`; hosts Growing stand, Stackable, Sampled, Floor (`sampleFace`) |
| `Surveyed` ⛔ folded W17 → `Place.readRooms` (→ `RoomsReading`, W21) / `Structure.readOutside` | protocol mixin (kernel) | `$L/construction/Surveyed.ts` | `surveyFor(viewer)`; hosts Location, Structure (Building, Ship) |
| `Fellable` | protocol mixin (kernel) | `$L/husbandry/Fellable.ts` | `fellPlanFor(actor, axe)`; hosts forestry `StandMixin` (pack) and kernel `Growing` (a planted tree) — kernel because the hosts have no common pack ancestor |
| `Readable` | protocol mixin (kernel) | `$L/description/Readable.ts` | `readFor(viewer, page?)`; hosts Display (`readScreen`), Marked, the paper leaves |
| `WaterEntry` ⛔ folded W17 → `Shore.wayIntoWater` | protocol mixin (kernel) | `$L/underwater/WaterEntry.ts` | `wayIntoWater(actor)`; hosts ShoreMixin, WaterPlaceMixin — replaces `SwimController`'s two-kind fork |
| `WaterSource` | protocol mixin (kernel) | `$L/bulk/WaterSource.ts` | `drawWaterFor(actor)`; hosts ShoreMixin, a Bulkable vessel — the Cool/Rinse/Wash/Water quadruplicated `findWater` |
| `Launchable` | protocol mixin (kernel) | `$L/location/Launchable.ts` | `launchPlaceFor(from)` / `recoverPlaceFor(from)`; hosts water's SeaWarren, ReachWarren; consumer is the transport pack → kernel (P4: a pack imports only what it declares; transport declares no dependency on water) |
| `Anchoring` | protocol mixin (kernel) | `$L/expanse/Anchoring.ts` | `anchorPlanFor(actor)`; hosts SmallCraft (`letGoAnchor`), Voyaging ship (`anchorHere`) |
| `Printing` | protocol mixin (pack lib) | `$P/trade-printing/src/lib/Printing.ts` | `printPlanFor(what)`; hosts Press (a forme), Printer (a page) |
| `Hammerable` · `Quenchable` | protocol mixins (pack lib) | `$P/trade-smithing/src/lib/` | hosts workpiece / bloom / die; ManualBuild / hot piece |
| `Assaying` | protocol mixin (pack lib) | `$P/trade-mining/src/lib/Assaying.ts` | hosts AssayKit, AssayBench (differ in time, fee, queue, ceiling) |
| `DyeBath` | protocol mixin (pack lib) | `$P/trade-dyeing/src/lib/DyeBath.ts` | mordant chemistry vs vat chemistry |
| five census gates | lint scripts | `packages/server/scripts/check-{greedy-object,multi-act,controller-gates,lineage-keys}.ts` + `check-completion-this.ts` extended | the census-then-ratchet pattern (lint-family.md § 30); template `check-controller-functions.ts` |
| `controller-liquidity.baseline.json` + the drive | wire file | `packages/wire/tests/controller-liquidity.dirty.wire.test.ts`, `e2e/tests/controller-liquidity-walk.spec.ts` | the !527 record method (CAIO_RECORD) generalized to the worklist |

**Not new, and named so nobody re-invents them:** `Carvable`, `DipBath`,
`PourTarget`, `KneadVessel`, `Forming`/`Shapeable`, `Pumpable`,
`Splittable`/`Workable`, `Tieable`, `Producing`, `PricedOffer`,
`Vitals.treatmentPlanFor`, `HaulOut`, `Frame`, `Ringable`, `Comminuting`,
`Cultivable`, `Marked`, `PosturedMixin.acceptPosture`, `NamedMixin`,
`HaulerMixin`, `Lockable.opensFor`, `SubjectSubscriber.isAudienceMemberOf`,
`Employed.isOnShiftFor`, `AccessApi.canAtPath`. Every protocol-candidate row
in Appendix B names which of these it rides.

**Deliberately a method, not a mixin** (one host, or one kind of host):
`Soil.plowPlanFor` / `Soil.amendPlanFor` (water + feed), `Organization.apply`,
`HerdRegistry.mayKeep`, `TipJar.collectBy`, `ChannelCatalogue.*(actor, …)`,
`WikiRegistry.historyFor(reader, …)`, `AppLogic.setSetting(actor, …)`,
`DiagnosticLogic.rawTail(reader, …)`, `Lockable.lock(by)`/`unlock(by)`,
`SmeltingFurnace.canSmelt/readCharge/tap`, `Working.hewPlanFor`,
`ClaimsRegister.stakePlanFor`, `Wellhead.swingPlan`, `MarketStalls.let/giveUp`,
`PlatBook.sell`, `DormWarren.endLet`, `Mill.millPlanFor` (via Comminuting),
`Window.canGlaze`, `Bore.canLine`, `Group.rename`, `SoulCatalogue.edit`
(merge), `ConsignmentShelf.consignBy`, `HeldGoodsMixin.mayDisposeOf`.

---

## Plan-level decisions

**D1 — `values:` and `type: duration` are view grammar.** An arg or option
may declare `values: [a, b, c]` (closed, case-insensitive on match, the
canonical spelling bound); the binder refuses an out-of-set value with a
`bind` error naming the list (`option --x: 'medium' is not one of wide,
open, half, low, banked`), before any controller is cloned. `type: duration`
accepts the written forms `90s · 15m · 2h · 1h30m · 3d · 90 seconds · 2
hours`, binds **milliseconds** as a number, refuses anything else. A typed
**positional** of `type: number`/`duration` is coerced too (today only
options are). `help` renders `values` after the option line and the
duration's forms. Reasoning: the survey's parse share was 8% and most of it
is word→value tables and hand-rolled refusals (`StyleController`,
`CockpitShelfController`, `DraughtController`'s `NAMED`, `StreamController`'s
`away <duration>`).
⭐ **Amended by the owner, 2026-11-10 (W22):** a closed word list is a
TYPE — `type: enum` with `values:` — not `values:` on a `type: string`
slot (*"isn't that just an enum type?"*). `values:` is required on `enum`
and refused on every other type; the behavior above is unchanged.

**D2 — Subcommands nest.** ⛔ **REVERSED BY OWNER 2026-11-10 (W16):** a
command is `verb target` or `verb subcommand target`, never deeper. The
nesting below shipped in W1/W7b and was removed from the grammar, the
schema and every view in W16; see D-W16a–c. *(Original text kept for the
record:)* `SubcommandDefinition.subcommands?:` recurses;
the schema's `$defs.subcommand` gains it; `assemble` walks words while they
match, binding each level's options lexically; `model.subcommand` is the
**leaf** (so every existing `switch (model.subcommand)` keeps working during
the split) and `model.subcommandPath` is the full list; `controller:` is
resolved at the deepest stanza that names one. `fallthrough: true` works at
any level. `help` renders the tree. The four cockpit controllers and the
`equip set save` form are the first consumers.

**D3 — No greedy object args, anywhere; articles are not names.** The
schema refuses `greedy: true` on `type: object|objects` once the census is
zero (W5); until then `lint:greedy-object` ratchets 133 → 0. The binder
gains two rules for a non-greedy **object** positional: (a) a leading
article token (`the|a|an|some`) is folded into the next token before
resolution (MQL strips it anyway; the slot stops binding `the`); (b) when
tokens are left over after the last positional and the view has no
`fallthrough`, the `bind` error is `too many words — quote a name with a
space in it: <verb> "<the two words>"`, built from the leftover tokens.
Greedy stays for `type: string` prose (`say`, `dm`, `press post`, a forum
body, `def`, `focus`) and is listed per view in Appendix E. ⚠ This reverses
command-spec.md's *"a prepositional object arg is born greedy"* and the
phrase-ladder rungs 1–3, and retires `lint:reachability` arm G's
`ARTICLE_SHAPE_CEILING` (the rule it enforced is gone); the doc and the gate
are rewritten in W1/W5. Lists (`get apple and pear`) are **out**
(mql-lists-slate).

**D4 — Reach rungs are per-invocation options and a per-arg default.**
`--top` · `--open` · `--deep` join `--strict`/`--loose` in `RESERVED`; a view
sets an object arg's `depth: top | open | deep` (default `open`). The binder
passes the rung into the MQL context (`ctx.depth`) and the seed walks obey
it: `top` = held, worn and the room's top level; `open` = `top` plus inside
open vessels you carry and inside open things here (**the new `reachable`**);
`deep` = everything, shut or not (`getDeepContents`). The MQL grammar gains
**no words**: `:i`/`:i:i`/`:I` remain the chain's depth and now **address
through shut containers for every viewer** (D6). Reasoning: the owner's
direction — reserved things get a token, never a plain word that collides
with a thing's name.

**D5 — `reachable` is what you could lay hands on now.** `person` descends
into open vessels you carry (today it is top level only); `peers` keeps its
one level into open things here; neither enters a shut thing. `canReach`
(`PerceptionLogic`) and the seed read the **same** walk — `scope-walk.ts`
exports it and `canReach` calls it — ending the asymmetry. Filters:
`:held` (in a slot that `accepts` Wieldable, or loose in `getContents()` with
no slot — today's carrying model, by size-slate § 9), `:worn` (exists),
`:carried` (exists). Every view's `scope:`/`depth:` is retuned once in W2
against the audit table (the W2 brief); the carrying build retunes again.

**D6 — MQL addresses; it never decides possibility.** `visibleInsideDeep`
and `visibleInside` stop refusing a shut Sealable for the giver's own
things and for things in the room (`look me:I:apple` finds it in a shut box);
the perception gate stays for **other people's** pockets (`visibleContentsOf`
on a person still yields worn + held only). The verb refuses what is not
possible: a new `ActRefusal` reason `enclosed-shut` with facts
`{by: the shut container}` is what `Containable.reachRefusal(actor)` returns
and every taking/eating/using controller words (*"the box is shut"*).

**D7 — `here` is the place.** The pronoun, the `here` scope pool, the `here`
predicate and `peers` all take `giver.getEnclosingPlace()` (new, D-substrate)
— the first container up the chain whose `isPlace()` is true, max 8 hops, the
immediate container when none is. `me:e` keeps `getContainer()`. The
`here:exits` step and `candidatesForHere` are unchanged in shape. Scene's
`enclosingLocation` and PerceptionLogic's `roomOf` call the method.

**D8 — The act convention gains choices.** `ActChoices<C> = {ok: 'choose',
reason: string, choices: C[], facts?}`. A planner that cannot decide between
several admissible things returns the set; the controller picks a default,
refuses with the list, or prompts (`PromptApi.choice`) — and a worded
replacement may do any of the three. `line:` leaves every refusal
(`Soil.resolvePartFor`, `harvestPartFor`, `Tieable.TieOutcome.line`,
`Clay.clay().line`, the magic Apis' `refusal` prose where a controller can
reach them). `Growing.harvestPlanFor` loses `req.typed`; the label becomes
a keyword the binder scores. `EngagedActController.engagePlan` moves up from
`ManualBuildController` so every controller engages a plan the same way.

**D9 — Gates live on what they protect, with the actor as an argument.**
Each confirmed controller-only gate (Appendix D) becomes a refusal on the
model method that does the read or write, taking `by: Stuff` (or `reader`),
and the controller's copy is deleted. Where a participant contract already
proves the actor is the caller (`SelfSubject(0)` on ForumsLogic, OrgCallers),
the relational half trusts it; where none exists the method asks the
predicate that exists on the model (`opensFor`, `isAudienceMemberOf`,
`isOnShiftFor`, `seatFor`/`holdsOffice`). Fail-closed: an unresolvable board,
a channel with no subject, a jar with no house all refuse. ⚠ `bleed`'s
consent has **no predicate to move** — nothing in vitals/blood/accountability
decides consent before the act (the memory rule: *compulsion gate = a
separate security build*). This build makes `Vitals.drawBlood(litres, by)`
require the phlebotomy tool, check capacity, and write the accountability
harm record when `by` is not the donor (what `transfuse` does); the consent
gate itself is a named deferred seam.

**D10 — Every refusal before every write; no money before a refusable
write.** Structural, not procedural: the money leg, the accountability
record and the mint live inside `ActPlan.onComplete`/`run`, after the plan
has been returned (a plan IS the statement that nothing refuses). Where an
act is instant the model method is check-then-act in one call
(`PlatBook.sell`, `Organization.apply`, `Ship.steer` consulting
`peopleInTheWater`). The confirmed sites: TitleBuy (settle L147 before
subdivide L161), Pilot (L53 before L62), Course `mayLeave` (L88/L229 before
the heading resolves), Equip `--from` (move L743 before `canEquip` L199),
Char (`setDraught` L64 before refusals), Fell/Rive (`spend` before the
engagement), Water (null-sink L153 before `takeStanding`), Drain (refuses
after 30 s), Embody (roster before clone), WikiEdit (frontmatter before the
body prompt), Mv (dst written before the refusing delete), Scutch/Spin/Weave
(consume before a mint that can throw).

**D11 — A person is keyed on `getIdentityPath()`; the gate learns the
shape.** The confirmed sites (§ Grounding) switch; `lint:lineage-keys`
(new) counts `getTemplatePath()` assigned to or compared with a field named
`holder|maker|owner|member|party|receiver|recipient|by|author|keeper|
memberKey` and ratchets to 0, with the legitimate structural reads
(FloorplanWarren, ShipWarren, LotGateExit, singleton organizations, kind
comparisons) exempted by an allowlist in the script with a reason each.
`MineWarren.carve/promote` take a `ParcelOwner`-shaped holder so
`lint:person-keys` sees them. `#126` stays db-performance's.

**D12 — A completion never calls its controller; the gate sees every
form.** `check-completion-this.ts` resolves `onComplete: <ident>`,
`onComplete,` and `const <ident> = (…) =>` (block or expression body) in the
same file and tests the body for `this.`; the three live sites convert to
`private static` word methods (`SearchController.resolveAndRender`,
`TeleportController.resolveAnchoredCast`, `TransfuseController.credit/
narrate/recordHarm/recordRevival`). The convention is written into
command-spec.md § Controllers: *word methods are `protected static`; a
completion closes over values, never over `this`.*

**D13 — The remedy ladder, applied per controller (Appendix A).** The
first rung that fits; rung 5 only for `spud` and `paste`, each with the
four failures written down. A head that is an existing verb's act retires
into that verb (`put`, `cut`, `draught`, `look`, `untie`) and the view's
`help:` names the redirect for one build. A bare form that reads is its own
controller on the bare shape (Journey, Course, Teleport, Draught, Press,
Help). The subcommand-switch family splits mechanically into
`<Noun>ControllerBase` + one controller per subcommand (the fight pattern);
the base holds shared reads and words as **protected methods**, never
permission (social-shell.md's rule).

**D14 — Cutting is several acts.** `CutAnswers`' ten keys become: `cut` on
`Cuttable` (unchanged for Rope, IceSheet, SugarLoaf, CuttingTool's planner);
`saw`/`rive`/`crosscut`/`butcher` on four kernel protocols (D-substrate);
`groove`/`scrape` as `IceSheet` methods the ice pack's two controllers call;
`scribe`/`snap`/`groze` as glass `Sheet` methods. `CutRequest` loses `raw`
and `length`-as-string (`length` becomes a `quantity` the binder parsed —
`type: number` with the unit in the view, or the existing measure grammar).
`FellController` stops crosscutting; `cut <bole>` answers it.

**D15 — The `house` / `job` affordance stays on `Persona`** (decided by
the owner, 2026-11-09). The direction prefers verbs from
portable objects *for acts on things*; `house` and `job` are a person's
transactions with an institution's book, and the principal is the seat, not
a thing in hand. The board subcommands already bind the board in reach
(`requires: class:JobBoard`), so `job post` away from a board refuses
today. Moving `house` onto the premises' fixtures would make `house roster`
unknown away from the shop and add a new affordance host for no protection
gained (every write is gated on the model by D9). If the owner rules
otherwise, the change is one line each in `Persona.commandContributions`
and `commandContributions` on `JobBoard`/the house's counter, plus the help
text.

**D16 — Pack logic moves into the pack.** A trade's rules leave its
controller for its own `src/thing|idea|lib` (SmeltController's Fe–C model
→ `trade-smelting/src/lib/IronCarbon.ts` value object + `SmeltingFurnace`
methods; Butcher's dressing → `Corpse.butcherPlan` + `Species`; Mill →
`Comminuting.millPlanFor`; Assay → `Assaying`; Bore → `Wellhead`). Nothing
crosses into the kernel unless its composers have no common pack ancestor
(`Fellable`, `Launchable`). A pack still ships no Api, no logic singleton,
no free helper (SawController's exported `boardsFrom`/`kerfSawdustKg` fold
into `Sawmill`).

**D17 — Censuses open on the tree they land on, then ratchet.** W0
measures every new gate at HEAD after the merge-base catch-up and pins it
there (lint-family.md's stale-tree lesson). Each wave's acceptance names
the ceilings it lowers (§ Test & gate strategy).

**D17a (build, W0) — the record is data-driven and honest.** The
before-record is one ROW per act (where, what is handed, the line typed) run
by one generic runner on a fresh wizard stager per act; `state` is generic
(where each handed thing is, the kinds the actor holds, the kinds that
appeared in the place, how the engagement ended) so a row costs a line, not a
suite. An act the world refuses for want of staging records the refusal —
still a before-record (the reason may not drift). A row whose staging is
not repeatable on one world (a free claim coordinate, a single horse clone)
is staged so that it refuses the same way every run (`stake 5,7,0`, a taken
coordinate). `fight assess` does not exist yet (fight has no `assess`
subcommand), so the combat read is not recordable; `assess` (self, at the
hub and at the ward) stands for it. `feed` is the compost verb, not an
animal's (animals take `offer`). `edit` cannot be driven by text (its body
is a payload), so its row records the refusal.

**D12a (build, W0) — word methods are `protected static`, reached through
`this.constructor`.** D12 said `private static`; the brief's rule (*word
methods `protected static`*) wins, so a worded replacement controller can
override them and its override is the one that runs at completion.

**D1a (build, W1) — a duration needs its unit; `values:` is for word
slots.** `90` is refused as a duration (seconds or minutes? the view will
not guess) — this diverges from `StreamController`/`PressController`'s
bare-number-is-minutes, which W7b must decide when `stream away` moves onto
`type: duration`. `parseDuration` is a static on `CommandDefinition`, not
`CommandLogic`: load-time validation checks a duration `default:` with it.
`values:` is refused on a non-`string` slot. A REQUIRED `number`/`duration`
positional that does not read is a `bind` refusal; an OPTIONAL one leaves
the word for the next slot (`mill wheat quern`); a `values:` slot always
refuses, naming the set.

**D2a (build, W1) — nested stanzas are addressed by PATH.** ⛔ Reversed with
D2 (W16): `subcommandKey`/`getSubcommandChain`/`subcommandPath` are gone;
a stanza is addressed by its one word. Every per-stanza
lookup (`getSubcommand`, `getOptions`, validators, the dispatcher's
controller) keys on the space-joined path (`layout save`), read from the
model by `CommandDefinition.subcommandKey(model)`; `allSubcommands()` is the
one walk every per-stanza pass uses. A structured caller names a nested
stanza by its path. A fallthrough node's bind error still reports
`unknown-subcommand` (unchanged).

**D3a (build, W1) — the quote hint rides a SHAPE error.** A `bind` error
stops the chain, so `throw rock at wolf` would have been refused by
`throw.yaml` before `throw-at.yaml` was tried. The hint is
`AssembleResult.quoteHint` on the shape error, and the dispatcher says it
(`bind-failed`) only when every view shape-failed. The search is the
shortest run of words whose join binds an OBJECT slot to the joined name.

**D4a (build, W1) — `--top`/`--open`/`--deep` are reserved as option NAMES,
not field names**, and three shipped options collided:
`forum make --open` and `subject make --open` → **`--public`**, `weave
--open` → **`--coarse`** (each keeps `field: open`, so no controller
changed). A player-visible word change the owner's read did not list. The
rung is carried to `CommandContext.depth` now; nothing reads it until W2.

**D9a (build, W3) — `setLocked` stays an ungated setter.** The hydrator
writes `locked` through it, and the berth/ashore exits and the water gate
use it structurally; the player-facing gate is on `lock(by)`/`unlock(by)`,
and the no-arg `lock()`/`unlock()` were removed instead of gating the setter.

**D9b (build, W3) — `Organization.apply` is sealed with no caller gate**, as
`appoint` is: the caller is the controller, and no policy can prove who the
applicant is.

**D9c (build, W3) — `mayDisposeOf` also accepts the shelf's own record** of
who left the good; `shelf consign` still accepts an unowned good and stamps
it to the principal.

**D9d (build, W3) — unhitching refuses only taking a cart out of another
PERSON's hands**; a draft animal's cart is anybody's to unhitch, as a
horse's harness is. `Haulable.canUnhitch(hauler, actor)` takes the hauler
as `canHitch` does (the green pass: reading `_hauledBy` had split the mixin
into a second co-use cluster).

**D9e (build, W3) — `bleed`'s `with` is optional** so the body says *You need
a syringe*; a draw from another body is recorded `consented: false` (consent
stays the deferred seam); the bag check counts the room left.

**D9f (build, W3) — ranching:** the keeper check runs before a kill in
`Livestock.cullRefusal`; `graze`/`update`/`returnHead` stay ungated (authored
grazing); the draft is written before the mint, and a failed mint is healed
at the next draft.

**D9g (build, W3) — `Ship.steer` refuses for people in the water only when
she is under way**; `leaveThem` is protected.

**D9h (build, W3) — bare `equip --from` still brings out layer-blocked
pieces**; the ladder dresses them next.

**D8a (build, W4) — `engagePlan` lands on `CommandController`, not
`EngagedActController`.** `ManualBuildController` descends `CraftController →
CommandController`, never `EngagedActController`, so the only common ancestor
is `CommandController`; the routine lives there, `EngagedActController`'s plan
overload of `engageAct` forwards to it, and ManualBuild's copy is deleted (no
override needed). Making `CraftController` extend `EngagedActController`
instead would have clashed with W6's controllers' `private decline`. The busy
line is ManualBuild's (*"Your hands are busy with something else."*); reasons
unchanged.

**D8b (build, W4) — no `onChoices` on `ActWords`; choices are answered BEFORE
a plan exists.** A planner's answer is `ActPlan | X | ActChoices | null`
(`ActAnswer`); the controller narrows `ok === 'choose'` and either refuses with
the list (`CommandController.partLine` / `choiceLine`), asks
(`chooseAmong` → `promptForObject`, fail-closed `needs-input`), or picks — then
asks the object again with the pick. `ActChoices.ok` is the string `'choose'`,
so the compiler refuses a choice handed to `engagePlan`.

**D8c (build, W4) — the label is scored by the binder, through
`CommandController.pickByWords`.** `Growing.harvestPlanFor` lost `typed`; a
labeled plant at a part where its kind's stand roots answers
`stand-or-labeled` (`preferred: stand`), and the controller re-scores the
player's words over the two choices with `MqlApi.resolveMany(words, {scope:
'reachable', admits})` — `harvest trial` names only the labeled plant (its
label is a keyword: `label` adds it), `harvest wheat` names both and the
preferred stand wins. `ripe-elsewhere` is a declared choice too
(`preferred: ripe sibling`); `HarvestRequest.chosen` = "cut as named, no
substitution". ⚠ This is +1 on `controller-resolution` self (the base's one
MQL call), stated with its caller audit below.

**D8d (build, W4) — refusals lose `line:` where W4 was told to look; done
lines stay.** `PartResolution`/`harvestPartFor`/`sowPlanFor` (choices +
`{part, ground}` facts), `HarvestRefusal.facts.line` (gone; `ground` added),
`Tieable` (`TieRefusal`: a closed 23-reason union + `{gear, load, on, knot}`;
worded by `TieControllerBase.refusalWords` (a base, so the words are protected statics — `lint:lib-statics` refused public ones), shared by `tie`/`untie`/`belay`; LineEnd /
AirBag / WaterHose wording unified — *"is not tied to anything"* for a bag
that was *"not lashed"*), `SugarLoaf.clay` (`not-clay` | `clayed-already`;
note reason stays `refused`). `soilPartRefusal()` is deleted (ranching's
`MoveController` and farming's `FieldWorkController` word the choice
themselves). ⚠ Tieable's DONE limb still carries `line`/`peers` — the pack
lanes' (Appendix B Tieable row).

**D5a (build, W2) — the one reach walk is `Container.getReachableContents(rung)`,
not a `scope-walk.ts` export.** `PerceptionLogic` may not import
`api/mql/**` (the sealed-subdir ESLint rule) and MqlApi stays two
functions, so the walk lives on the model, where both MQL's pools and
`canReach`/`reachableAmong` read it (*MQL is a view over the model*).
`open` descends a BODY's open vessels all the way down and anything
else's one level (the holder decides); breadth-first, so what is at hand
outranks what is in a bag; `deep` never enters another body. `inventory`
honors the rung too; a mid-chain anchor (`bob:inventory`) is read at
`top`. `canReach`'s holders are the actor, its location/immediate
container and its place, plus doors, ways and fixtures of each.

**D5b (build, W2) — `peers` takes the place AND the vessel you sit in**
(the passenger beside you in a shut coach is to hand); `:here` agrees.
`:held` = in a body's Wieldable slot, or loose on a body in no slot; a
rack is not a body.

**D6a (build, W2) — the deeper rung is a REFUSAL probe, never a bind.**
A bare name that finds nothing at the slot's rung is resolved once at
`deep`; a find behind a lid refuses the line `validator-failed
reach:enclosed-shut` (*"A box is shut."*) and nothing binds. Binding it
would have handed every verb without a reach check (eat has none) a
thing inside a shut box. A typed rung is never probed past (`--top` →
none at hand). The explicit-chain case (`eat me:I:apple`) is the new
`mustNotBeShutAway` validator on get/eat/drink/sip/fill/pour/read, and
`canReach` words the lid — so "the controllers word it" (D6) became the
view's validators; no controller changed.

**D6b (build, W2) — the retune.** `depth: top` on the slots that carry
`mustBeInInventory` (drop, give, put, hang, remove, wear, wield, unwield) —
a bag's contents would bind and then be refused *you don't have it*.
Everything else stays `open`. ⚠ Diverges from the plan's `look`/`search`/
`find` → `deep`: lens 3a — a bare `look sword` would describe a sword in a
shut chest you never opened; the probe already says the chest is shut,
and `look here:I:sword` addresses it on purpose.

**D7a (build, W2) — `getEnclosingPlace` returns the immediate container
when no Place is up the chain**; `roomOf` keeps its null (it asks for a
place), and `Scene.enclosingLocation` reads the method.

**D7b (build, W2) — the ways out are what HOLDS you: the eight movement
views scope `me:e:exits`, not `here:exits`.** With `here` the place, `go
out` from inside a wardrobe or a coach found the room's ways and not the
vessel's (GoController's vessel test caught it), and `go north` from a
shut coach would have reached the road's exit. `me:e` is exactly the old
`here`, so movement is unchanged. The `here` scope POOL and `reachable`
add the vessel's own surface (its door, its `out`) beside the place's;
the `here` PRONOUN is the place alone (`look here` in a boat = the river).

For later waves (W3): the river-bar steer ordering is W8/W12's; there is no
unit test for `breedRefusal` yet.

**D3a (build, W5) — five `string` slots are names, not prose, and lose
`greedy` too:** `buy <thing>`, `order <cocktail>`, `shelf reclaim
<thing>`, `rack reclaim <thing>`, `store withdraw <what>` (the owner's
read names `buy dog loaf` → `buy "dog loaf"`; lens 1 — a good's name is
matched against a keyword, never read as speech). They stay `string` (the
counter's book matches them, not MQL) and take the article fold when a
prepositioned object follows. The other greedy strings stay (prose).

**D3b (build, W5) — the determiner fold.** A leading count / measure /
`all` / ordinal joins the next word into ONE name before an object slot
binds (`get 1 gin`, `look 2nd greywater`, `get 1 "mooring line"`): MQL
reads determiners, the greedy slot used to hand them over, and brains emit
`get 1 ${kw}`. Without it every count broke.

**D3c (build, W5) — after a name, every prepositioned slot is
`prepositionRequired`.** Applied to every later prepositioned arg in an
args list that held a de-greedied slot, and to an optional de-greedied
prepositioned slot right after a name slot (`sell <thing> [to <counter>]`).
The greedy slot only ever bound those behind their preposition, so no form
changes meaning. An optional `prepositionRequired` slot now takes its
`default:` when absent (it was skipped — `buy loaf` lost its counter).

**D3d (build, W5) — the hint's shape.** Shortest join first, an OBJECT slot
before a string slot; a preposition, article or count is never inside the
quotes; two names → both quoted; a missing preposition word two took fires
it too. The fitted line rides the note as `suggestion` and the shell prints
it as a `mudcmd:` link (existing MML link channel, so no client code — the
renderer already makes it tappable; a client test pins it). Brains name
keywords through the new `CommandLineApi.word()`.

**W7a decisions (build, W7a).** (a) `CommandGiver`: an unknown subcommand
word hands the line to the verb's next view; a subcommand view (no
fallthrough) is tried before the verb's shapes, and `lint:verb-collisions`
reads the same rule (such a view is disjoint from a shape view that needs a
word). (b) Bare views declare the other shape's options (inert), so an
option never errors on the wrong view. (c) The controllers' own "unknown
subcommand" lines are gone — bare `wizard`/`player`/`subject`/`testharness`
get the dispatcher's *missing subcommand*; testharness clock/weather junk is
a shape error. (d) TestHarness is nested stanzas (left in the multi-act
census). (e) C73 fixed: contacts names come from the live character or
`PlayerApi.storedNameOf`, and `contacts remove` matches the name. (f)
Verb-level `--at`/`--alive` bind inside nested stanzas. (g) The
`setWizardMembership` gate admits exactly `WizardGrant`/`WizardRevoke`
controllers; wizard success is a `shell.result`. (h) Stale examples naming
the old controllers (command-routing.md, command-spec.md, contacts.md,
antipatterns.md, test inline YAML) are W14's docs pass.

**W7b decisions (build, W7b).** (a) A duration names its unit everywhere —
a bare number is refused (lens 1: the unit is part of the quantity);
`stream away 10` is refused, `stream away 10m` is not. (b) The binder holds
an unreadable typed word until a shape fits. (c) The cockpit style channel
stays one controller (+1 on `lint:multi-act`, counted). (d) Bare `cockpit
layout` lists. (e) `draught <fire>` with no setting is refused; the read is
`draught at <fire>`; the charcoal clamp's dial loses tenths (five words).
(f) `watch X on <out-of-reach screen>` refuses `no-screen`; `watch Horizon`
(capitalized) is a stream; bare `watch` is *missing subcommand*. (g) `notify
set` needs a field. (h) **Owner ruling 2026-11-09: keep `notify set`** —
`lint:subcommand-words` raised builtin 6 → 7 and different-act 42 → 44 (the
new pairs are `fight assess`, `notify show`, `notify move`, all owner-table
words; `notify remove` predates the build). (i) `tune off` edge is
pre-existing, not this build's.

**W7c decisions (build, W7c).** (a) `HeatedMixin` hosts `ManualBuild` (latch
+ anneal) and three soilable tool classes; the placing arm is gone and
`heat.yaml` requires `HeatedMixin`, its refusal naming `put … on hearth`.
(b) `AgitatedMixin` in `ManualBuild`, `HandWorked`, `Compounding` (delegates
`kneadPlanFor`). (c) `WashableMixin` in `Soilable`; `Hygiene` overrides for
hand-washing. (d) `wash`/`bathe` ask `WaterDrawable`; the answer carries
`draw` and accepts brine. (e) `SweepableMixin` in `Floor` + `Burner`,
`Flued` overrides. (f) No `Drying` protocol: the forecast is
`Moist.hoursToDry()`; the rack arg is `prepositionRequired`, so the two dry
shapes are disjoint. (g) Ring is `IntegrityMixin.ringBy` (no `Ringable`).
(h) Label is `Labelled.labelBy` (instant outcome / refusal / field-part
choices); `at` names only a field part. (i) `SampleableMixin` nests in
`Sampled` + `Strata` (no Floor `sampleFace`); `Plant` and mining's
`Working` override; the stamp stays the verb's. (j) `SurveyedMixin` lives
in `lib/spatial` (no `lib/construction`); the default is on the `Structure`
base, `Place` overrides; `getUpkeepTerm` moved to the `Warren` base. (k)
Carve with no named stock asks `RecipeCatalogue.carvingPlanFor`; a craft
failure reports `craft-refused`. (l) Fit is assembly only
(`CraftingApi.fit`); `whole` keeps `FacedMixin` one build so `fit label`
refuses `use-paste`; the tool arg narrowed to `ToolMixin`. (m) `belay off`
is gone: `untie` ends a belay, a second `untie` casts off. (n) Stand
decides by `acceptPosture` + `held`. (o) Tip (C46): a typed `SettleRefused`;
the EFT fallback only on `insufficient-coin`. (p) Dose is
`Metabolic.dosePlanFor` (instant plan; fixes the record's error row). (q)
Pay is `Payable.payBillsBy` (left in the multi-act census). (r) Open is
`Sealable.openPlanFor` (`Throttleable` overrides). (s) Defend is
`Combatant.defend`. (t) TitleTransfer: `for <price>` decides a share sale,
refused on a parcel. (u) Embody's confirm stanza is
`EmbodyConfirmController`; the sex refusal is now told (C35).

**W7 stabilizer decisions (build, W7).** (a) **`NestingConstructor<T>`**
(`lib/mixin.ts`, `new (...args: any[]) => T`, the handbook's mixin
constraint) is the constraint for a mixin that nests another mixin call or
`override`s a member of its base: with the union `MixinConstructor` as the
outer `TBase`, TypeScript drops the inner mixin's members and refuses every
`override` — the W7c Creature/Avatar chain collapsed (6,500 errors).
Applied to `Soilable`, `HandWorked`, `ManualBuild`, `Compounding`,
`Sampled`, `Burner`, `Floor`, `Hygiene`, `Flued`, `Throttleable`, and the
packs' `Strata`, `Working`, `OpenWorking`. `super` is then typed as the
constraint, so `Burner.getTemperature` / `Floor.getKeywords` reach the
deeper base through `Base.prototype`. The collapse had hidden five real
errors, fixed: `equip set` asks `isSlotted`; `dry … with` compares as
`Stuff`; a prescription and `pack staff` refuse a body with no identity
path; the cockpit-style test's controller table. (b) `lint:verb-collisions` proves
three more disjointness cases: two views naming the SAME controller (one
act's shapes — `draught <setting> [at <fire>]` · `draught <fire>
<setting>`); first words that cannot meet (a required `values:` slot
against an all-`prepositionRequired` view — `draught at <fire>` vs
`draught <setting>`); a bare view beside a fallthrough view whose own arg
is required (`press` reads, `press <headline>` posts). (c) The dairying
pack's row fixture stood up aromas by the retired `word` key; it reads
`aroma:` paths now (the 22 "Not connected" failures).
(d) `pack-roots.extendsAny` read every pack manifest on every call (a
`= packSources()` default, cache hits included) — `lint:locations` took
minutes and looked hung; it reads them once now (~25 s). (e) Ceilings at
W7's close: multi-act 22, controller-decisions 1070 (durations 83),
controller-functions 182, controller-mutations 282, self-resolution 104,
duck probes 529, mixin-clusters 42 (a stated rise — `Combatant.defend`
names three lone members together; caller audit in the gate header),
subcommand-words 44 / builtin 7 (owner ruling). lint:family 105/105;
test:near green.

---

**D18a (build, W14) — `multi-act` and `controller-gates` close at their
floor, not at 0.** The `subcommand` arm is 0 and `lineage-keys`/`greedy-object`
/`completion-this` are hard zeros; `multi-act` holds 6 (one act each — the
target-kind classifier sees a precondition or a second faculty as a second act;
`StyleChannel`'s `color|clear` comes after an argument, where no stanza can carry
it) and `controller-gates` 10 (each a verb's door onto a primitive the world
itself must call ungated). Every site is named in its gate's header. The
multi-act classifier stopped counting `''` as a word (−3, a measurement fix).

**D18b (build, W14) — #128: the tax is reserved INSIDE `settle`.** A sale's
`Charge` carries `taxableMinor`; `settle` keeps the tax on it with the payee, a
creditor's repayment share is of what is left, and splits that leave the payee
less refuse `splits-exceed` before any leg. The alternative — a `BankingApi`
tax read the employment logic subtracts — puts the rate in two places.

**D-W15a (build, W15) — the merged `stream` verb is one controller per
subcommand.** broadcast-ready shipped `stream` as one switch; this build's
`lint:multi-act` holds the subcommand arm at 0, so the merge split it over
`StreamControllerBase` (status · start · live/back · away · end · off ·
segment · agenda · next · rotation pin/skip/clear nested · channel with a
`values:` service · token). `stream start [in] <dur>` reads `in` as the
duration's preposition. ⚠ W7b's `stream away` `type: duration` is
superseded by broadcast-ready's reason grammar (`StreamApi.interpretAway`),
so drive step 7 proves a written duration on `press … --expires`.

**D-W15b (build, W15) — step 3's bare controller is the shipped one.**
After W3 the seven protected controllers hold no check
(`lint:controller-gates` names none of them), so a replacement that "only
calls the object" calls exactly what they call; the step drives each as a
player the object must refuse.

**D-W15c (build, W15) — step 1's replacements are worded twins.**
`SmeltWordedController`, `OrderWordedController`, `ButcherWordedController`
beside `HarvestWordedController`: each calls only the object and words it
plainly, so an author has a minimal controller to copy for each.

**D-W15d (build, W15) — a premises' pipe is a process mint, nobody's.**
`Plumbed.plumbingRun` declares its run `recordMadeBy(null)`; the
`recordMadeBy` gate admits `Plumbed` beside `Mould`. (The drive found the
bar's iron run titled to the customer whose order first read the tap.)

**D-W15e (build, W15) — a rag rubs a thing dry.** `Rag` affords
`dry-rub.yaml`, as `Cloth` does.

**D-W15f (build, W15) — a person's parcel is theirs to give.**
`TitleTransferController` admits the player a parcel is titled to (by
identity) before asking the zone; a lot off a plat book has no zone.

**D-W15g (build, W15) — reachability link 5.** `fight assess`'s target
requires `CombatantMixin`; `rm`'s missing-row refusal says `no-template`.

**D-W16a (owner, 2026-11-10) — depth: `verb target` or `verb subcommand
target`, never deeper.** D2 is reversed. The schema's `$defs.subcommand`
has no `subcommands`/`fallthrough` key (`additionalProperties: false`
refuses them), `CommandDefinition.validate()` refuses them in code, and
`lint:command-views` gained a **depth** half (hard, structural zero — no
ceiling). The binder walks one word; `model.subcommand` is it.

**D-W16b (owner, 2026-11-10) — the compound-name rule.** A verb that is
**non-diegetic** (acts on the player's interface or tooling, mostly sent by
the client) may take a hyphenated compound name: `client-layout`,
`client-card`, `client-shelf`, `client-style`, `stream-rotation`; the same
rule names a non-diegetic subcommand word that would otherwise nest
(`testharness clock-advance`, `weather-pin`, `weather-unpin`). A
**diegetic** verb stays a plain word: `equip set …` → `outfit
wear|save|list`. Hyphens needed no grammar change — the tokenizer, the
alias path, `help` and every gate (`one-word`, `command-views`,
`verb-collisions`, `subcommand-words`) already read a word as a string;
a test binds `client-style plain-channel gossip on` through the real
parser to hold it.

**D-W16c (build, W16) — the two third-level style forms, and the
exemption.** `cockpit style mention self on|off` → `client-style mention
on|off` (`self` was the only word); `cockpit style plain channel <key>
on|off` → `client-style plain-channel <key> on|off` (D-W16b). The
input-mode exemption covers every `client-…` verb as it covers `cockpit`
(`CommandApi.applyInputMode`). `SaxonbergClientMixin` affords the four
`client-` views beside `cockpit`; `BroadcastMixin` affords
`stream-rotation` beside `stream`; ⭐ `WardrobeMixin` affords `outfit` to
itself (the garments afforded `equip set`, but an outfit is kept whether
or not anything wearable is carried). Controllers renamed to their verbs
(`ClientLayout*`, `ClientCard*`, `ClientShelf*`, `ClientStyle*`,
`Outfit{Wear,Save,List}Controller`), one per subcommand still. Bare
`stream-rotation` has no controller of its own (every subcommand names
one) and is refused `missing-subcommand`. Player-facing outfit words say
*outfit* (`You have no outfit called 'x'.`, reason `unknown-outfit`).

**D-W18a (owner 2026-11-10; build, W18) — `stir` is the drink build's
alone.** `AgitatedMixin` retired (with `Mixins.Agitated`,
`MixinApi.isAgitated`); the plan is `ManualBuildMixin.stirPlan()`. A
shaker's technique `shaken` is the SAME act (working the build, the way
the tool works it) — no `shake` verb invented; the kernel's words say
"work" for any non-`stirred` method because `shaken` is a pack's name.
⚠ For the owner: if `shake` should be a word, it is a removable default
alias or a W-later call, not this wave's.

**D-W18b (build, W18) — compounds are `knead`'s, the matter decides the
work.** `knead` already asked `kneadPlanFor` with no word and took the
matter's `workVerb`; `stir`'s delegation was the only caller of
`KneadRequest.verb`, so `verb`, `Compounding.workRefusal` and the
`wrong-work` refusal are deleted — B101 (no word may pick the shorter
work) is now structural. ⚠ For the owner: a paint pot or glaze slurry is
TYPED `knead` though narrated "You begin to stir…"; the help and the row
comments say so. If that reads wrong, the honest fix is a word for
mixing (not `stir` back).

**D-W18c (build, W18) — `churn` lives in `trade-dairying`.** View
`content/trade/dairying/cmd/crafting/churn.yaml` (category `crafting`,
like hospitality's `muddle`), `ChurnController` in the pack's
`src/idea/cmd/crafting/`, afforded by the `Churn` CLASS (a kernel mixin
must not name a pack view, so `HandWorkedMixin` lost its
`commandContributions`). `HandWorkedMixin` stays the kernel protocol it
was before W7c, its plan now `handWorkPlan()`; one composer (the churn),
so moving it into the pack is a later cleanup, not needed for the split.
The pack's "ships no verb" row test now asserts one verb.

**D-W18d (build, W18) — `Sweepable` is KEPT, slimmed.** Two real hosts
(`FloorMixin`, `FluedMixin`), one act (taking something up off a
surface), and now ONE result shape `{ kg, kinds, taken }` with begin
`{ tool: broom|brush|hands }` — the union was the tell, and it is gone.
`BurnerMixin` no longer composes it; `FluedMixin` composes it itself and
refuses `no-brush` without a flue brush (it used to fall back to the
grate). `sweep <unflued fire>` refuses pointing at `rake`; any other
non-sweepable target (`sweep byre`) still sweeps the floor underfoot.

**D-W18e (build, W18) — `rake` is a platform `device` verb.** Beside
`light`/`douse`/`cover`/`draught`; `Burner.rakePlan(raker)` → `rakeGrate`
(a method, one host); afforded on the Burner's `peers` only (nobody rakes
the lamp in their hand). No tool gate, as before. The potash ash round
calls `rakeGrate` directly and is unchanged.

**D-W18f (build, W18) — the baseline row.** `stir` (recorded as `stir pot`
at the glasshouse batch pot) is renamed `knead.compound`, command `knead
pot`: the same plan (powder → two minutes, `engagement-started`), so the
recorded outcome is unchanged — the key moved, nothing re-recorded.
`sweep` (a floor with a broom) is unchanged.

**D-W19a (owner 2026-11-10; build, W19) — the matter routes the verb.**
`stir` is for runny stuff, `knead` for stiff. The predicate is the one
that already chose a stir's two minutes or a knead's quarter-hour:
`Compounding.workVerb()` (any `elastomer` → knead; `plastic` matter →
knead unless the belly's free water is ≥ 0.4× its mass — a slip; no
plastic matter → stir). No new field. `Compounding.kneadPlanFor` and the
new `stirPlanFor` share one private `workPlan(req, work)`, refusing
`wrong-work` (`facts.work` = the verb wanted) — the refusal W18 deleted,
restored on the type (`KneadRefusal`) and worded by EACH controller:
knead's "What is in X is runny — there is nothing to knead. Stir it.",
stir's "What is in X is too stiff to stir — knead it." Supersedes
D-W18b's routing (B101 still structural: no word picks the shorter work).
⚠ The rubber cement pot stays `knead` — rubber never slakes, so
`workVerb` says knead however much turpentine is in it.

**D-W19b (build, W19) — `stir` has two hosts, no protocol.** A build
vessel answers `{ method }` (`ManualBuildMixin.stirPlan()`), a compound a
product (`Compounding.stirPlanFor(req)` → `CompoundPlan`); different
shapes, so methods, and the controller asks the right object: a
compounding vessel first, then a knead vessel that compounds nothing (the
dough trough — a dough is stiff → `wrong-work`, no plan asked), then a
build vessel. `CompoundingMixin` affords `stir.yaml` again (its own
`commandContributions`, beside `KneadVesselMixin`'s `knead`); the view's
arg is `requires: any` with the union default
`reachable:[mixin.ManualBuildMixin],reachable:[mixin.CompoundingMixin]`.

**D-W19c (build, W19) — the baseline row moves back.** `knead.compound`
(`knead pot`, the glasshouse batch pot — sand, a powder) is runny, so the
row is `stir` again (`stir pot`): the same plan (two minutes,
`engagement-started`), the recorded outcome unchanged — the key moved
back, nothing re-recorded. Drives moved: paint (`stir me:i:kettle`, wire
+ e2e), glass (`stir pot`), ceramics-c (+soak: `stir "ash tub"`, `stir
"lead tub"`), ceramics-d (`stir "plaster tub"`, `stir "slip tub"`); the
temper pit, the rubber tub and the trough stay `knead`. No NPC brain
typed a runny knead (the moulds brain's `knead pit` stays).

**D-W19d (build, W19) — the `card-terminals` rejections.** The three
unhandled "Not connected to MongoDB" rejections were a production
floating promise: `CardRegistry.openTerminal`/`retarget` fired
`void this.markTerminalPrivacy(...)` with no catch, and the test's
`#general` terminals reached `ChatApi.catalogue()` (a store read) with
no store. Fixed both ends: the registry routes the fire-and-forget
through `resolveTerminalPrivacy`, which `.catch`es and warns (the card
keeps its privacy; the Ship precedent), and the test supplies a
catalogue (`#secret` player-made) and gains a case that AWAITS the
privacy landing (`vi.waitFor`) both ways.

**D-W20a (owner 2026-11-10; build, W20) — reach is ONE list,
`PerceptionApi.reach(actor, {depth, location, pools})`.** The owner: *"I
just don't want two different algos for the same thing."* After W2 the
per-container walk was single but the assembly (which holders, fixtures,
ways, doors) was written twice — MQL's pools in `scope-walk.ts` and
`PerceptionLogic.reachIds`. Now `PerceptionLogic.reachOf` returns
`{stuff, pool}[]` (`self` · `attached` · `inventory` · `around` · `here` ·
`peers`)
in MQL's tie-break order; `canReach`/`reachableAmong` are membership;
`candidatesForHere`/`Inventory`/`Peers`/`Person`/`Reachable` are filters
that only build candidates. A `PerceptionApi` static, not an MQL export:
`PerceptionLogic` may not import `api/mql/**` and MqlApi stays two
functions. The call-shape types (`ReachPool`, `Reached`, `ReachOptions`)
live in `api/perception.ts`. `reachIds` is deleted. `attached` is the
a tag the brief did not name: slot occupants and hosted apps are on the
`person` pool but not the `inventory` scope. So is `around` (D-W20b).

**D-W20b (build, W20) — where the two disagreed, the merge decides.**
(1) The place you stand in is NOT in reach though MQL's `here` names it
(harbors review 3: a direction binds the way, never the room; the
`validators.test` "rejects the room itself" case). It is in the one list
as its own pool, `around` — the holders themselves — which `canReach` /
`reachableAmong` skip and MQL's `here` includes. The exception is a tag
on the one list, not a second assembly; the vessel you sit in is still
reached as a peer of the place it stands in. (2) A door is in reach and in MQL's `here` only on a
way the actor can SEE (`obviousExitsFor`) — MQL used `getExitDoors()`
(the physics list), `canReach` the seen ways; lens 3a picks the seen
ways: a hidden way's door names the way it hides. (3) Hosted apps, slot
occupants, landed structures and open ground seen across a way are now
`canReach`-true (MQL offered them; nothing refused them by reach).
(4) `opts.location` adds a holder beside the place and the vessel (it
used to REPLACE the immediate container in the holder list — the
immediate was re-added anyway, so the set is unchanged).

**D-W20c (build, W20) — one walk per call, pinned.** `pools` computes
only the sections asked (an `inventory` scope never walks the room);
`reachableAmong` builds one id set. `reach.sameSet.test.ts` stages the
open bag in a pack, the shut box, the boat on the river, the shut-coach
passenger, a fixture sconce, a door on a way and the three rungs, and
asserts MQL `reachable` ≡ `canReach` both ways; its last case asserts a
300-item open floor stock is walked once by `reachableAmong` and once by
an MQL `peers` resolution.

**D-W21a (owner review 2026-11-10; build, W21) — the rooms read leaves
`Place`.** *"That's every single location in the game, are we sure what
we're doing belongs there?"* — it does not: `readRooms` was an
interpretation over five other objects (the archetype catalogue, the
warren's members + upkeep term, each archetype's `satisfies`, the
structure's `readOutside`, the realm's ways), not the place's own state.
It is `RoomsReading.readRooms` (+ `roomArchetypes`, `waysideOf`,
`standsIn`, the `RoomsRead` type); `Place.ts` is master's again. The
structure is asked through `Place.structure()`, the place's own answer.
This reverses D-W17a's *"a method on `Place` (the honest host)"*.

**D-W21b (build, W21) — the lane probe becomes a kernel seam.** No kernel
seam answered *the places along this place's way* (`WayRecord` is one
exit's wire state). New: `WayIndexMixin` (`lib/location/WayIndex.ts`,
`waysideOf(placePath)`), the `WaterSourceMixin` / `water.sourcePath`
shape — the transport pack's `LaneCatalogue` composes it and seeds
`ways.indexPath` from its own `content/settings/ways.yaml` (not the
platform pack's `transport.yaml`: the key names a row only that pack
ships). The reading reads the setting, `StuffApi.singleton`s it and
narrows `MixinApi.isWayIndex`. No index named → no corridor archetype is
reported (documented in the reading, logistics.md, instrumentation.md); a
named path that is not a `WayIndex` throws. The string lookup, the
`typeof lanesAt` probe and the `.catch(() => null)` are gone.

**D-W21c (build, W21) — a reader not standing in the place is refused by
name** (`not-here`, *"You take stock of a place from inside it."*), not
`null`. Through the verb `here` already resolves to where the reader
stands, so the test drives `analyze` directly.

**D-W21d (build, W21) — cleanliness drive 23 is the DRIVE's, and
pre-existing.** The restart spawned `dev-preflight` with its default
two-second grace (`PREFLIGHT_GRACE_MS ?? 2000`), which SIGKILLs the server
before its shutdown capture — the cookhouse's record (the rack, and the
shirt drive 9 hung on it via the view's `default:
reachable:[class.DryingRack]`) is never written. Harbors and sugar pass
60 s for exactly this; cleanliness never did (its restart lines are
master's, untouched by this build). The earlier greens printed a SECOND,
stained shirt — captured by luck before the kill; the !527 finalize saw the
same red on that branch. Not W7c: `dry` hangs on the rack the same way
master did (the diff is the `with`-cloth split and the forecast), and
`Soilable`'s only change is nesting `WashableMixin` (no fields). Fixed in
the drive: `PREFLIGHT_GRACE_MS: '300000'` (the !527 record measured a
loaded world's capture at ~3.5 min). Not re-driven (no world booted).

**D-W17a (owner, 2026-11-10) — `survey` retired; its reads are
channels.** No `survey` verb: `rooms` (`RoomsReading`, scope `here`, an
eye rung, **unbanded** — nothing in it is competence-resolved) reads
`Place.readRooms(viewer)`; `condition` reads a structure's cause off
`Structure.readOutside()`; `paint` (`PaintReading`, an instrument rung —
`gauging`, *a rule or a gauging rod* — unbanded) reads the job. No
protocol: the place read is a method on `Place` (the honest host — every
place has rooms to answer for), the outside a method on the `Structure`
base (`weatherSurface()` stays the hook Ship overrides). `SurveyedMixin`,
`Mixins.Surveyed`, `MixinApi.isSurveyed`, `survey.yaml` and
`SurveyController` (+ row) are deleted.

**D-W17b (build, W17) — what survey said that did not move.** The shell
line stays on `analyze rooms` for ANY structure a room is part of (a shop,
a ship — the harbors drives read *"the fabric of the place is sound"*
aboard), not only a holding; the coat line moved to `look`, which already
said it. The floor line moved to `analyze cleanliness floor` (the
untrained line adds *To scrub it would see to it.* off
`Floor.cleaningMethod()`). The archetype field `surveyScope` →
**`roomsScope`** (seven rows + `Archetype`). ⚠ **Kept, deliberately:** the
`survey` CARD (`analyze ground`/`analyze soil`'s deposit survey — the
land-surveying meaning the owner gave the word back to) and the
`sense.survey` TOPIC key (the topic of *looking* — `look`, `search`,
`inventory`; ~50 sites; a rename is a deliberate sweep, not this wave's).
The record's `survey` row now runs `analyze rooms` against the same
before-record shape (ok, no notes, nothing moved); not re-recorded.

**D-W17c (owner, 2026-11-10) — one-host protocols fold into the host.**
`SawableMixin` → `Bole.sawPlanFor` (the saw types moved to `Bole.ts`; the
sawmill asks `log instanceof Bole` — carpentry already depends on
forestry; the `saw` view keeps `requires: TangibleMixin` because a length
and a billet go on the saw too, so no `class:` binding was honest);
`WaterEntryMixin` → `Shore.wayIntoWater` (types in `Shore.ts`; `swim`
narrows `MixinApi.isShore`; `WaterPlace` overrides). `Butcherable` stays.

## ⭐⭐ Host placement

For every new mixin, field and method: which host carries it, and what
composing it claims about everything else that composes that host. P2's two
tests are applied — *a guard that re-narrows the host set means the wrong
host*, and *an honest default that answers "no" on most hosts means the
wrong host too*.

| new thing | host(s) | what composing it claims | P2 check |
|---|---|---|---|
| `values:`, `type: duration`, `depth:`, nested `subcommands:` | the view (content), not a class | a view is the player's grammar; no class learns anything | n/a — data |
| `getEnclosingPlace()` | `ContainableMixin` | every containable thing is somewhere, and "somewhere" has a nearest place; answers the immediate container when no place is above (a thing in a bag in the world root) | every host answers yes; no guard |
| `held` predicate | MQL predicate (a filter, not a host) | — | — |
| `ActChoices` | a return type | — | — |
| `Sawable` | forestry `Bole`, `Billet` (pack `thing/`) | a thing that can be sawn to boards/billets along its length; a plank is not Sawable (it is cut) | 2 hosts, both answer yes |
| `Rivable` | `Bole`, `Billet` | splits along the grain with a froe | both yes |
| `Crosscuttable` | `Bole`, `Log` (the felled length) | cut to a length across the grain | both yes |
| `Butcherable` | `Corpse` (kernel thing) — with the default plan for a body that carries no cut ledger | a dead body can be broken down; NOT on `Creature` (a live animal is slaughtered, not butchered) | one class, two states (with/without ledger) — a mixin is still right because the ice pack's `IceSheet` and the glass `Sheet` showed that a verb on one class is a method; here `Corpse` is the only host and the mixin exists so `butcher.yaml` can `requires:` it and the pack's `ButcherController` binds nothing else. ⚠ If review prefers a `Corpse` method + `requires: class:Corpse`, that is a one-line change |
| `Heated` | `ManualBuildMixin` (a build at the fire), `Soilable` **tools** (`Tool`), `Tempered` | can be held in a flame until it has taken the heat | ⚠ NOT on `Soilable` at large (a floor is soilable and is not heated) — on `Tool`'s composition; NOT on every `Thermal` (a pot is set on the fire, which is `put`) |
| `Agitated` | `Compounding`, `HandWorked`, `ManualBuild` vessels | the contents can be worked by hand and the vessel says what came of it | all three answer yes; a plain `Vessel` is not Agitated (stirring water does nothing) |
| `Washable` | `Soilable` goods (`Good`), `Creature` (the hand faces) | can be washed in water with a cleanser | a Soilable **floor** is `Sweepable`/mopped, not Washable → the host is `Good`'s Soilable composition + `Creature`, not `Soilable` itself |
| `Sweepable` | `Floor`, the `Burner` grate, `Flue` | debris can be swept out of it | three yes |
| `Sampleable` | `Growing` (a stand), `Stackable`, `Sampled` goods, `Floor` | a stamped real piece can be taken for the bench | four yes; a `Creature` is not (blood is `bleed`) |
| `Surveyed` | `Location`, `Structure` | can be surveyed for purpose/fabric/upkeep | both yes; a thing is `look`ed at |
| `Fellable` | forestry `StandMixin`, kernel `Growing` **when `isTree()`** | ⚠ an honest default on every Growing answers "no" for wheat — so the mixin goes on `Growing` only if it is composed by the tree rows' class; otherwise `Fellable` is composed by the forestry `Standard`/`Planted` classes and the kernel `Growing` tree subclass. **Decision:** compose on the planted-tree class, not on `Growing` | avoids the river's pools |
| `Readable` | `Display`, `Marked`, the paper leaves (`Sheet`/`Page`/`Book`) | has text to read for a viewer | all yes |
| `WaterEntry` | `ShoreMixin`, `WaterPlaceMixin` | a way into the water from here | both yes |
| `WaterSource` | `ShoreMixin`, `Bulkable` **with a water material** | ⚠ an honest default on every Bulkable answers "no" for a wine cask → the mixin is composed by `ShoreMixin` and by the vessel classes that hold water (bucket, basin, tub), not by `Bulkable`; the predicate `drawWaterFor` refuses on contents, and the view's default scope names the mixin | guards nothing |
| `Launchable` | water's `SeaWarren`, `ReachWarren` | a craft can be launched into / recovered from this water | both yes; a pond is not |
| `Anchoring` | transport `SmallCraft`, kernel `Ship` (`Voyaging`) | can let go an anchor where it floats | both yes |
| `Printing` | printing's `Press`, `Printer` | — | both yes |
| `Hammerable` / `Quenchable` | smithing workpiece / bloom / die; ManualBuild + hot piece | — | yes |
| `Assaying` | mining `AssayKit`, `AssayBench` | — | yes |
| `DyeBath` | dyeing vat, mordant bath | — | yes |
| gate methods with `by:` | the class that owns the read/write (Appendix D) | the method decides for every caller; a controller may not pre-decide | the whole point |
| `Vitals.drawBlood(litres, by)` | `VitalsMixin` | every body can be bled by an actor; the record is written when `by ≠ self` | yes |

Fields: this build adds **no persisted field** except `MineWarren.carved[].holder`
changing shape (string → `ParcelOwner`) and `TipJar.house` (an identity
path stamped at placement by the house's `place`). Both are content the row
already persists (holding and chattel slices); nothing new is persisted
per class (P6).

---

## Convention conformance

Checked at plan time against the current tree, not recalled:

- **`props:` / `cast:`** — no new rows with `populates:`; the few new rows
  (a `spud.yaml`, `paste.yaml`, the `berth roads`/`pack staff` stanzas) are
  views, not places.
- **Locations, not rooms** — `getEnclosingPlace()` stops at `isPlace()`,
  which `Location`/`SphericalLocation` answer; no "room" word in new code.
- **Persistence per content (P6)** — no class gains persistence; the two
  field changes above ride existing slices.
- **The five namespace axes** — new pack mixins at `/trade/<pack>/lib/…`
  with no template row; kernel mixins under `lib/<subsystem>/`; new views
  under `<root>/cmd/<category>/` with `category:` = directory
  (`lint:command-views`).
- **Module scope declares; lifecycles initialize** — the gates'
  `RESERVED` set and `MQL_PREDICATES` table are `const` value construction;
  nothing executes at module scope.
- **The import boundary** — `lint:imports`; no `fs`/`path` in mudlib; the
  duration parser lives in `CommandLogic` (an api logic singleton).
- **No new module category, no exported helper** — SawController's two
  exported functions fold into `Sawmill`; `TransfuseController`'s module
  function pattern is replaced by statics; no `eslint-disable` added.
- **Verbs on objects** — every new `*PlanFor`, `canX`, `*By(actor)` is a
  method on the thing; `lint:object-verbs` stays 0. The one Api-level
  orchestration added is the shell tree's search/remove with limits and
  per-path `canAtPath`, on `SourceTreeApi`/`DocumentApi`/`TemplateApi` (the
  tree is not a Stuff).
- **No new `isWizard`** — `lint:wizard-axis` allowlist unchanged; the
  `eval` authority copy collapses into `AccessApi.canAtPath`.
- **`getIdentityPath()` for persons** — D11.
- **Methods-only inter-Stuff** — `OperateController`'s direct `Trauma`
  field writes become `ConditionApi.worsen`/`Trauma.reopen()`; no
  `obj.field =` from a controller remains (counted by
  `lint:controller-mutations`' bare-assignment arm).
- **American English** — `plow.yaml` keeps its verb; `PloughController`
  keeps its class name (shipped British identifier, not renamed piecemeal);
  new names are American (`color`, `gray`).
- **P3 refuse/skip/throw** — every `return;` with no note in the ledger
  (Label L184–189, Practice L62, TuneControllerBase L134–137, Clone copies
  2..N, Scutch empty `made`) gets a refusal; `AppLogic.setSetting` on a
  missing row throws; an unresolvable board fails closed.
- **P4 no duck typing** — `Launchable`, `WaterEntry`, `Readable`,
  `Hauler.canUnhitch` replace `?.()` probes; `lint:duck-typing` falls
  (target ≤ 500; the plan does not promise a number the gate did not count
  — W0 measures).
- **P5 the mixin decides** — the ladder's rung 1 and D9 are this rule.
- **P7 load on use** — `productRowFor`'s template scan → `Material.getCastTemplate()`;
  no new boot entry; `lint:boot-entries` unchanged.
- **P8 names** — classes named for composition (`HouseTrafficController`,
  `TeleportBoardController`, `JourneyStatusController`); `Anchoring` not
  `Anchorable` on a class; the two new words are the trades' own
  (`spud`, `paste`).

**Lint gates this build must pass**, from `lint:family` (every `lint:*`):
`command-views`, `one-word`, `subcommand-words`, `institution-verbs`,
`contribution-keys`, `controller-rows`, `controller-decisions` (+ durations),
`controller-mutations`, `controller-functions`, `controller-resolution`,
`duck-typing` (+ undefined), `completion-this`, `person-keys`,
`mixin-names`, `mixin-files`, `mixin-clusters`, `instanceable`,
`module-scope`, `imports`, `object-verbs`, `wizard-axis`, `reachability`
(arms A/R; arm G rewritten), `verb-collisions` (the `dry`/`watch`/`tune`
shape splits must be disjoint by range or `prepositionRequired`), `schema`,
`test-bootstrap`, `drive-scripts`, plus the five new gates.

---

## Waves

Sixteen waves. W0–W6 are the kernel spine and run in order; W7 and W8 are
the kernel worklist; **W9–W13 are five pack lanes that run in parallel**
after W8 (each lane edits only its packs' directories, commits by name, and
begins by `git status --short && git show --stat HEAD` to see what the
sibling lanes have landed — the stale-index lesson); W14 and W15 close.
Every wave is independently landable and ends at a commit titled
`build(controller-liquidity W<n>): …`. Every wave's acceptance includes
`pnpm test:near`, the touched packs' own vitest, `lint:family` green, and
the named ceilings lowered.

### W0 — the before-record and the censuses (D17, D12) ✅ done

> **Done (`193962942` censuses + completions; `e9f6330ff` the before-record).**
> Ceilings opened: `greedy-object` **133** · `multi-act` **41** (subcommand
> 15 · arg-word 6 · target-kind 22) · `controller-gates` **44** ·
> `lineage-keys` **7** · `completion-this` **0** (now an AST walk over every
> form; it found Search/Teleport/Transfuse, fixed as `protected static`
> words, D12a). `controller-mutations` learned that a `this.constructor`
> binding is the controller's own surface (318 holds). The record: **78
> rows**, recorded on one freshly reset world and compared equal on a second
> (78/78); generic state (D17a), `CLIQ_ONLY=a,b` runs a subset. ⚠ For later
> waves: the record runs against a FRESH world (`reset:db`, boot kept on
> 2013 — a cold boot outruns the harness's 420 s, so boot with
> `WIRE_KEEP_WORLD=1` and attach with `WIRE_REUSE=1`); it is not idempotent
> on a world it already ran on (stock, a used mill hopper). Three rows record
> a thrown **controller-error** — `cool`, `dose`, `cp` — and `QuenchController`
> logs `Grade.of: unknown band 'good'` on its mint; `pay office` (the bills
> arm) errors intermittently, so `pay founder 1` is the row. The wave that
> fixes any of these re-records its row. `lineage-keys` cannot see a
> template path passed positionally or returned (lint-family.md says which);
> W3 switches D11's list by hand.

Goal: nothing moves until the world's answers are recorded and every count
the build will lower is pinned.

- `packages/wire/tests/controller-liquidity.dirty.wire.test.ts`, modeled
  line for line on `controllers-are-io.dirty.wire.test.ts` L90–165:
  `CLIQ_RECORD=1` writes `controller-liquidity.baseline.json`; otherwise
  compares. **Step 13's record set** is one act per controller whose logic
  moves (Appendix A rung-1 rows, Appendix B, and the pack worst-first list):
  `harvest · smelt · order · butcher · mill · saw · fell · carve · stir ·
  heat (hold) · dry (rub, hang) · wash · fit · quench · hammer · assay · hew
  · stake · drift · shore · char · plow · bore · water · feed · sample ·
  survey · sweep · label · dose · cool · warm · rinse · transfuse (sync
  path) · pump · split · plant · put · tie · read · lie · swim · hitch ·
  unhitch · anchor · launch · recover · menu · order · pay · tip · title
  transfer · title buy · stall rent · maintain · dye · fish · print · tan ·
  berth · course · journey · teleport (free) · fight assess (combat
  read) · assess · ring · name · chronicle · cat · ls · grep · mkdir · cp ·
  mv · rm · edit` — each as `{status, notes[{kind, reason, validator}],
  duration, state}`. Record it against **HEAD before W1**, commit the JSON.
  ⚠ A recorded act that is itself a confirmed defect (Appendix C) records
  the defective answer; its row in the baseline is **re-recorded in the
  wave that fixes it**, with the commit saying so — the record proves
  nothing else moved, not that the defect stayed.
- New gates, each from the `check-controller-functions.ts` template with a
  positive fixture test in `scripts/__tests__/`:
  - `lint:greedy-object` — `greedy: true` on a `type: object|objects` arg
    across `commandViews()`; opens at **133**.
  - `lint:multi-act` — a controller with (a) `switch (model.subcommand)`
    or an `if (model.subcommand === …)` chain, (b) a dispatch on a string
    positional's value (`switch (model.<arg>)` / `=== 'list'`), or (c) two
    or more arms that each call a different world mutator after a
    `MixinApi.isX`/`instanceof` test on the bound target; opens at the
    count it measures (the survey's 75 is a different classifier's).
  - `lint:controller-gates` — in a controller: `AccessApi.can*`,
    `CompactApi.holdsOffice`, `AppApi.seatFor`, `isAudienceMemberOf`,
    `getOwner() !== … getPlayerId()`, `isFulfilling`, `opensFor`,
    `considerApplicant`, `mayMove`/`mayKeep` — a permission decided in a
    controller; opens at its count. (The view-level `requires*` validators
    are not counted: a validator is the view's.)
  - `lint:lineage-keys` — D11's shape; opens at its count with the
    allowlist of structural reads.
  - `check-completion-this.ts` extended to the hoisted/shorthand/named
    forms (D12); it will find the three sites — **fix them in this wave**
    (`private static` moves in Search, Teleport, Transfuse) so the ceiling
    stays 0.
- `lint-family.md` gains the five rows (ceiling, what it counts, falls in).
- Acceptance: baseline committed; `lint:family --list` shows the five;
  every new gate ✔ at its opening count; `completion-this` 0; the three
  completions' unit tests (`SearchController`, `TeleportController`,
  `TransfuseController` test files) assert the scheduled path renders.
- Commit: `build(controller-liquidity W0): the before-record and five
  censuses; completions off the controller`.

### W1 — the grammar grows (D1, D2, D3-schema, D4-tokens) ✅ done

> **Done (`e21135a65`; this note and D1a–D4a rode in on W3's plan commit `876f0be80`).** `values:`, `type: duration` (ms), `depth:`, nested
> `subcommands:` (leaf + `subcommandPath`, path-keyed lookups), the
> `--top/--open/--deep` tokens (carried, inert), positional `number`
> coercion (fixes `house draw`'s `mustBeNumber`, which never passed), the
> article fold, the quote hint, merged `help` shapes; arm G's article
> ratchet retired (110 → gone). Decisions D1a–D4a. ⚠ Surprises: the
> reserved `--open` collided with three options (renamed, D4a); and **for
> W5**: an OPTIONAL prepositioned object slot that is not
> `prepositionRequired` silently takes word two of an unquoted name
> (`buy dog loaf` → counter `loaf`) — no leftover, so no hint. When W5
> drops `greedy`, such a slot after an object slot wants
> `prepositionRequired: true`. No view uses the new keys yet (W7 first).

Kernel only; no view changes beyond the schema admitting the new keys.

- `api/command.ts`: `values?: string[]` on `FieldDefinition` and
  `OptionDefinition`; `'duration'` in the type union; `depth?: 'top' |
  'open' | 'deep'` on object fields; `subcommands?` on `SubcommandDefinition`;
  `subcommandPath` on the model.
- `command.schema.json`: the same; `$defs.subcommand` gains
  `subcommands: {$ref: '#/$defs/subcommands'}`; `greedy` stays admitted on
  objects until W5 (the gate ratchets).
- `CommandLogic.ts`: `coerceOptionValue` + a new `coercePositionalValue`
  (number, duration, values); a `parseDuration` static; Phase 2 walks nested
  stanzas (lexical options per level; `model.subcommand` = leaf); Phase 3
  binds the leaf's args; `unknown-subcommand` names the valid words **at
  that level**. The binder's two object-positional rules (article fold;
  leftover-tokens → the quote hint) land here behind the greedy flag (a
  greedy field never hits them).
- `CommandDefinition.ts`: `validate()` checks `values` non-empty and
  unique, `default` ∈ `values`, nested `fallthrough` sanity;
  `validateReservedFlagNames` RESERVED += `top · open · deep`;
  `controllerForSubcommand(path)`; `getHelpText` renders nested stanzas,
  `values`, duration forms, and merges the shapes of a multi-view word
  (`HelpCatalogue` L428: key by verb, append shapes — fixes the throw trio).
- `CommandGiver.ts` L1694–1705: resolve the controller by path.
- `lint:reachability` arm G: `ARTICLE_SHAPE_CEILING` retired (the rule is
  D3's opposite); `PHRASE_SHAPE_CEILING` kept for the naming arm. Doc:
  command-spec.md § greedy / phrase ladder rewritten to D3 (the ladder
  collapses to *one word binds bare; a phrase is quoted; prose is greedy*).
- Tests: `CommandDefinition.values.test.ts`, `.duration.test.ts`,
  `.nested.test.ts`, `CommandGiver.articleFold.test.ts`,
  `CommandGiver.quoteHint.test.ts`, `HelpCatalogue.shapes.test.ts`.
- Acceptance: drive steps 7 and 9's grammar half pass in a unit harness
  (`values` refusal lists the set; `cockpit layout save list` then
  `cockpit layout recall list` round-trips once W7 nests the view);
  `lint:command-views` 0.
- Commit: `build(controller-liquidity W1): values, durations, nested
  subcommands, depth rungs; the article fold and the quote hint`.

### W2 — reach (D4-walk, D5, D6, D7) ✅ done

> **Done (`fd81f87e2`).** `getEnclosingPlace`/`reachRefusal` on Containable;
> `Container.getReachableContents(rung)` is the one reach walk (MQL's four
> giver pools + `canReach`/`reachableAmong`); `here`/`peers`/`:here` take
> the place; `MqlContext.depth` from the binder; `:i`/`:I` through shut
> things of yours or the room's; `:held`; the lid refusal; views retuned.
> Decisions D5a–D7b. ⚠ D7b: the movement views now scope `me:e:exits`. ⚠ Surprises: the plan's home for the walk
> (`scope-walk.ts` exported to `PerceptionLogic`) is unreachable — the
> sealed-subdir rule forbids importing `api/mql/**` and MqlApi is two
> functions — so it is a Container method (D5a); and a deep probe that
> BINDS would have let every verb with no reach check act inside shut
> boxes, so the probe only refuses (D6a). No ceiling moved; no controller
> touched. For W15: drive steps 4–5 should pass as written.


- `$L/spatial/Containable.ts`: `getEnclosingPlace()`; `PerceptionLogic.roomOf`
  and `Scene.enclosingLocation` call it.
- `api/mql/resolver.ts`: `here` (L446–452), the `here` pool (L794–800),
  `peers`' anchor (`scope-walk.ts` L163–165) and the `here` predicate
  (`predicates.ts` L99–109) take `getEnclosingPlace()`; `:e` unchanged.
  `MqlContext.depth` threaded from the binder; `candidatesForReachable`
  honors it (`top`: no descent; `open`: descend open vessels on the person
  and one level into open things here; `deep`: `getDeepContents`).
  `visibleInside`/`visibleInsideDeep` (L1168–1192) stop refusing a shut
  container for the giver's own things and the room's; the person gate
  stays. `held` predicate added. `scope-walk.ts` exports the walk;
  `PerceptionLogic.canReach` L315–391 calls it (one definition of reach).
- `Containable.reachRefusal(actor)` → `{reason: 'enclosed-shut', facts:
  {by}}` or null; the taking/eating/using controllers word it (Get, Eat,
  Drink, Sip, Wield, Wear, Read, Pour, Fill — the W2 brief lists the
  callers of `canReach`).
- The scope/depth retune: every view with an object arg gets a one-line
  decision in the W2 brief's audit table (the controllers-are-io
  scope-order audit extended with `depth:`): in-hand acts `depth: open`
  (default), `wield`/`wear`/`drop` `depth: top`, `look`/`search`/`find`
  `depth: deep` on their target. Docs: mql-grammar.md (`here`, `reachable`,
  the three rungs, `:held`), mql.md, command-spec.md § `scope:` + `depth:`.
- Tests: `mql.here-place.test.ts` (a giver in a boat on a river place),
  `mql.reachable-depth.test.ts` (apple in open bag → found; in shut box →
  `--deep` finds, default refuses with `enclosed-shut`), `predicates.held`,
  `canReach.sameWalk.test.ts`.
- Acceptance: drive steps 4 and 5 pass over the wire; the W0 baseline is
  unchanged for every recorded act (reach widening must not change any
  recorded outcome — if it does, that row is a finding, not a re-record).
- Commit: `build(controller-liquidity W2): here is the place; reachable is
  what you can lay hands on; MQL addresses through shut things`.

### W3 — the gates move onto what they protect (D9, D10, D11) ✅ done (cluster B's D10 ordering may land after this note)

> **Done** (`06aea6818`, `b3e494451`, `4fae95aa4`, `61c2bfdbd`, `50db4f1d0`, `a88f15774`, `55ef3f6cf`). Ceilings: `controller-gates` 44 → **16**, `lineage-keys` 7 → **0** (Sew included; D11's hand list — Introduce, TitleTransfer, Crafting ×2, Document owner, ad-hoc channels, group providers, Contacts NPC, party refs and the solo combat side — all on `getIdentityPath()`). (build, W3) decisions: chat answers are `ActRefusal`s from `ChannelCatalogue` (owner = Subject owner OR the audience group's `owner` role, so a party captain disbands); forum writes throw `BoardRefusal` (reason-carrying), fail-closed on no Subject; `rawTail`/`setSetting`/template writes read the acting principal from context, not an argument (an argument raised `object-verbs`); wiki redacts at min(reader, acting) ceiling; cp's source is an open read. ⚠ The 16 residue are OUTSIDE Appendix D (clone, destruct ×2, goto ×2, reload, title publish/subdivide/transfer, arm, get, broadcast, soul's pre-check of a model-gated write, BankingControllerBase's presence read, eval's target call, drilling) — W7/W8 decide each (most protect engine primitives with no actor). Forum edit/reply now prompt for the body before the model refuses (no read-only pre-check added). Record rows `cp`/`mv`/`rm`/`grep`/`mkdir` change on purpose — W15 re-records them.

Kernel and pack, by Appendix D. Each row: delete the controller's check,
add the model method's refusal with the actor, keep or add the participant
contract, test both the controller path and a direct call from a bare test
controller (drive step 3's shape).

- `DiagnosticLogic.rawTail(reader, filter)` (PM via `CompactApi.holdsOffice`)
  — `DiagnosticApi.rawTail` forwards; `ErrorsController` L92–107 deleted.
- `AppLogic.setSetting(actor, key, value)` refuses Tier C unless
  `holdsOffice(seatFor(key))`, Tier B unless PM; `ConfigController` L76–83
  and `BankingControllerBase` L84–96 call it.
- `WikiRegistry.historyFor(reader, id)` / `revisionAtFor(reader, id, rev)`
  redact through `WikiRenderer.redactSource` (its `RenderCallers` already
  admits the registry); the three controllers' redaction deleted.
- `Organization.apply(applicant, key)` = `considerApplicant` + `appoint`
  atomically; `JobApplyController` L84–93 calls it; `appoint` stays the
  governor's act.
- `ForumsLogic.castVote/postThread/reply` resolve the subject and refuse
  `not-member`, fail closed on null; `ForumVote` L27–38, `ForumReply`
  L23–25, `ForumEdit` L23–27 lose their copies.
- `ChannelCatalogue.renamePlayerChannel(actor, …)`, `.setAnonymity(actor, …)`,
  `.historyFor(actor, id)` refuse unless `kind === 'player-created'` and the
  owner matches / the actor is an audience member; the three controllers
  lose their copies; `ChatDisband`'s ladder moves onto `.disband(actor, …)`
  too so the four are one rule.
- `Lockable.lock(by)` / `unlock(by)` refuse `no-key` when `!opensFor(by)`;
  the state setter becomes `_setLocked`, `FromMixin(Lockable)`-gated; the
  two controllers word `already-locked` / `no-key` from the method's
  refusal (the *order* — visible state before the secret — is the method's).
- `EvalController.holdsAuthority` L181–224 → `AccessApi.canAtPath(giver,
  'eval', parcel)` (the self-home-root rule added to `AccessRegistry` if
  missing).
- `SourceTreeApi.search(pattern, {maxMatches, maxBytes, deadlineMs})` with
  a safe-regex check; `GrepController` renders the truncation. `TemplateApi.
  deleteSubtree(giver, path)` with per-descendant `canAtPath`; `TemplateApi.
  move(giver, src, dst)` refuses a folder with descendants before writing;
  `Cp`/`Mv`/`Write`/`Rm` use `canAtPath` (the `can(…, null)` always-false
  defect goes with it).
- `Vitals.drawBlood(litres, by)` (D9's bleed half); `BleedController`
  requires the phlebotomy tool via `requires:` on its `with` arg and uses
  `BulkableApi.transfer` for capacity.
- `HerdRegistry.mayKeep(actor, herd)` lifted from `MoveController.mayMove`
  L144–166; `draft`, `moveHerd` and the slaughter herdbook write call it;
  `SlaughterController` requires a blade via `requires:`; `BreedController`
  checks sex and a present male on the model (`Livestock.breedPlanFor`).
- `TipJar.houseOf()` (derived from the placing house at `place`) +
  `collectBy(actor)` requiring `isOnShiftFor(house)`.
- `Bonded.wouldEat` → `boolean` outward; `OfferController` notes `refused`.
- `ConsignmentShelf.consignBy(actor, item, ask)` with the stricter
  `HeldGoodsControllerBase` L82–87 rule shared by reclaim
  (`HeldGoodsMixin.mayDisposeOf`).
- `Hauler.unhitch(by)` / `Haulable.canUnhitch(actor)` on the interface
  (ends the duck-typed `canHitch`); `unhitch.yaml` `requires: [VisibleMixin]`
  with the controller asking hauler-vs-haulable (fixes `unhitch horse`).
- The money/write ordering sites of D10 that are kernel or small:
  Equip `--from` (ask `Attired.canDon` first), Course `mayLeave` last and
  the abandonment record written by `Ship.steer` on departure, Embody
  clone-then-roster, WikiEdit body-then-one-write, Mv refuse-then-write,
  Water ask-then-pour. (TitleBuy, Pilot, Char, Fell/Rive, Drain, Scutch/
  Spin/Weave are their pack lanes'.)
- D11's person keys: Introduce, TitleTransfer, CraftingLogic ×2 (and the
  title derivation in ChattelLogic now sees identity), Party (`refOf` →
  identity; PartyApi/PartyRecord to match), GroupRemove/GroupRole (bind an
  object; `Group.memberByName` fallback), ChannelCatalogue ad-hoc
  membership, Contacts NPC; Sew/Drift/Shore in their lanes.
  `lint:lineage-keys` → 0 at the end of W13 (each lane lowers its share).
- Acceptance: drive step 3 (a bare controller calling each model method is
  refused for another player), steps 11 and 12 (money untouched on a
  refused purchase — the TitleBuy half lands in W13 and the step's
  checkpoint is marked pending until then; introducing a player works; a
  gifted parcel is the receiver's); `lint:controller-gates` falls to the
  pack residue (Char, Stall, Assay remain for their lanes); `person-keys`
  0; W0 baseline unchanged except the rows re-recorded by name.
- Commit: `build(controller-liquidity W3): every gate on the read or write
  it protects; persons keyed on identity; refusals before writes`.

### W4 — the act convention's third limb and the Harvest correction (D8) ✅ done

> **Done.** `ActChoices`/`ActAnswer` in `ActPlan.ts`; `engagePlan` hoisted to
> **`CommandController`** (D8a — ManualBuild is not under EngagedAct);
> `chooseAmong` / `pickByWords` / `choiceLine` / `partLine` beside it.
> `Soil.resolvePartFor` answers `PartChoices` (no prose; `soilPartRefusal`
> deleted), `Growing.harvestPlanFor` lost `typed` (choices `part-unnamed` ·
> `stand-or-labeled` · `ripe-elsewhere`, `chosen` to cut as named);
> `HarvestAskingController` asks (fails closed to the list). Tieable refusals
> and `SugarLoaf.clay` are reasons + facts (`TieControllerBase` words tie /
> untie / belay). Ceilings: `controller-resolution` self **107 → 108** (a
> rise, audited in the gate: `pickByWords`, D8c); every other gate unchanged.
> W6's controllers needed no edit — `this.engagePlan` resolves to the base.
> **Prose-refusal audit (left for the lanes):** `Store` 14, `Line` 14 (incl.
> `LineEnd.tug`), `Book` 13, `Marked` 10, `Tariff` 7, `Respiration` 7, Rope
> splice/coil 6, `HaulOut` 6, `Sealable` 5, `Sheet` 4, `WaterSurface` 3,
> `Metabolic` 3, `Vocal` 3, `Capstan`/`Tossable`/`Spliceable`/`Pullable`/
> `Palate`/`Eating`/`Tearable` 2 each, `Garment`/`Stock`/`ForSale`/`Reading`/
> `SmallCraft` 1, `Soil.sowingRefusal` (a hook); packs: transport `Boat` 11,
> sugar `Copper` 8, printing `Forme` 7 / `Pen` 5 / `Printing` 4, diving
> `Spear` 5, farming `Tract` 4 (mark), water `ReachWarren` 3, papermaking 3,
> fishing 4, diving `Hoist` 2, energy `LineAccess` 2; the magic Apis'
> `refusal` prose untouched. Tieable's DONE limb keeps `line`. Record rows
> that may differ in wording only (none in reasons): tie/untie/belay refusal
> sentences for LineEnd/AirBag/WaterHose.


- `$L/craft/ActPlan.ts`: `ActChoices<C>`; `ActAnswer<B,F,X,C> = ActPlan |
  X | ActChoices<C> | null`. `EngagedActController.engagePlan` moved up
  from `ManualBuildController` (which keeps a thin override); `ActWords`
  gains `onChoices?(c) → Composed` with a default that refuses with the
  list; `CommandController.chooseAmong(context, choices, words)` prompts
  through `PromptApi.choice` when the giver is interactive and refuses
  otherwise (script-interaction's fail-closed rule).
- `Soil.resolvePartFor` / `harvestPartFor` return `ActChoices` of the parts
  (no `line`); `Growing.harvestPlanFor` loses `req.typed` and `ripeSibling`
  substitution becomes a declared choice (`choices: [named, ripe sibling]`
  with `facts.preferred`); the label becomes a keyword the binder's tiers
  score; `HarvestController` words/picks; a new
  `HarvestAskingController` (the drive's step 2 replacement) prompts.
  `Tieable.TieOutcome.line` → a reason; `Clay.clay()` → a structured reason.
- Every protocol's `*Refusal` type is audited for prose fields (`line`,
  `detail` that is a sentence): the W4 brief lists them from a grep of
  `line:` in `$L/**/*.ts` protocol files.
- Acceptance: drive steps 1 (`harvest` with `HarvestWordedController`:
  same state and duration) and 2 (`HarvestAskingController` asks; the
  shipped one refuses with the list; the world is the same); W0 baseline
  unchanged.
- Commit: `build(controller-liquidity W4): the object returns choices; the
  controller asks`.

### W5 — the greedy sweep (D3) ✅ done

> **Done** (`ca1547ca8` views, `a64187aee` kernel + tests, `8fa6b1118`, `566ff8ed7` mill; green-up `2c3f47cd4`). `greedy-object` 133 → **0** and the
> schema refuses `greedy` unless `type: string`; arm G 6 → **5** (a
> `prepositionRequired` slot is exempt). Five name-`string` slots lost greedy
> too (D3a); the **determiner fold** (D3b) was the surprise — every brain's
> `get 1 ${kw}` and every `look 2nd X` would have broken without it; every
> slot after a name is `prepositionRequired` and an optional one now takes
> its default (D3c — it was silently skipped). The hint rides the note as
> `suggestion` and prints as a `mudcmd:` link (D3d; no client code needed,
> a client test pins the tap). Brains name keywords via the new
> `CommandLineApi.word()`. ⚠ For W15: ~160 wire/e2e lines were requoted by
> binding each through the real views; templated names were quoted
> `"${x}"`. `LabelController`'s `at` re-glue still works for one word only.

- Every row in Appendix E: `greedy: true` removed from the object arg; the
  view's `help:` gains the quoting sentence where the common names are
  phrases (the general store's stock, the seed packets, the mana cell);
  `examples:` show one quoted form. Controllers that read `model.x.raw` to
  re-split a phrase (Label L96–99 re-gluing `at`, Fell's raw override
  L173–183) lose it.
- `command.schema.json`: `greedy` admitted only when `type: string`;
  `lint:greedy-object` → **0** and stays a zero invariant.
- The client's command sheet (client-shell.md) teaches quoting: the
  refusal's hint is rendered as a tappable suggestion (`buy "dog loaf"`)
  — a small client change in `packages/client` (the renderer of the
  `bind` note), listed because the owner's direction says *the client
  teaches it*.
- Tests: `CommandGiver.quoteHint.test.ts` extended per the ten most-used
  verbs; `shelf reclaim` (a string greedy over a thing name — becomes an
  object arg, non-greedy).
- Acceptance: drive step 6 (`buy "dog loaf"` buys; `buy dog loaf` refused
  with the hint; `say` whole); `lint:greedy-object` 0; the e2e walk's
  chapter for quoting; W0 baseline unchanged (the recorded acts used
  single-word names).
- Commit: `build(controller-liquidity W5): no greedy object anywhere; a
  phrase is quoted and the refusal teaches it`.

### W6 — cutting is several acts (D14) ✅ done

> **W6 note (build).** `Cuttable` keeps `cut` only (no verb tag;
> `CutRequest.raw` → `part`); kernel `SawableMixin` (Bole), `RivableMixin`
> (Bole, Billet), `ButcherableMixin` (Corpse; default = no ledger, spent at
> once); ice `groovePlan`/`scrapePlan` and glass `scribePlan`/`snapPlan`/
> `grozePlan` are host methods with their types in the host's file. The
> cross-cut is a `cut` (`Bole.cutPlan`, felling axe among the tools; the bole
> affords `cut.yaml`); `fell bole` refuses `not-a-tree` naming `cut`. C2 and
> C12 (Fell + Rive) fixed here. Ceiling: controller-decisions 1170 → 1167.
> **Decisions (build, W6):** (a) **no `Crosscuttable`** — once `fell` stops
> cross-cutting the only verb that crosscuts is `cut`, whose protocol is
> `Cuttable`; a fourth protocol would have no verb of its own (and no `Log`
> class exists). (b) `Sawable` has one host (Bole): every other wood is
> weighed as it is by `SawController`'s `chargeOf` (W11 folds that into
> `Sawmill`); Billet does not saw. (c) **`butcher.yaml` keeps
> `requires: any`** — binding on `ButcherableMixin` would refuse a live
> animal at the binder and lose the *"it is alive — slaughter it"* teaching
> refusal the controller orders last. (d) **cloth options stay on
> `cut.yaml`** — a pack cannot contribute options to a kernel view, and a
> `cut pattern` stanza would change what a tailor types, a break the
> owner's read does not list; `help cut` still lists them (acceptance item
> unmet on purpose). (e) **`length` stays a string the rope parses** — a
> `type: length` binder type is grammar growth in `CommandLogic`, which W2
> was editing concurrently; left for a grammar wave (W14). (f) `part`
> replaces `raw`: the ice's `cut hole`/`cut marked` need the part word.
> No baseline row re-recorded: `butcher`/`saw`/`fell oak` are unchanged in
> state (C2 changes only the wording of a `for <cut>` match and the stems;
> C12 moves endurance, which the record does not hold).
> Not mine in lint:family at commit: lint:duck-typing (fell to 535),
> lint:lib-statics (342 > 340), lint:controller-resolution (108 > 107) —
> sibling work in flight. C3 (butcher's dead `vessel` arg) and C6 (pit saw
> `setSawing`) left to W10/W11.

- `$L/craft/`: `Sawable.ts`, `Rivable.ts`, `Crosscuttable.ts`,
  `Butcherable.ts` (each `_mixinKind = 'protocol'`, a closed reason union,
  an `ActPlan`); `Cuttable.ts` keeps `cut` only; `CutRequest` loses `raw`;
  `length` is a parsed quantity. `Mixins` + `MixinApi.isX` for the four.
- Hosts: forestry `Bole` (saw · rive · crosscut), `Billet` (rive · saw),
  kernel `Corpse` (butcher, with the default plan for a body without a
  ledger — moved from `ButcherController` L327–350); `IceSheet.groove/
  scrape` methods; glass `Sheet.scribe/snap/groze` methods; `Rope`,
  `SugarLoaf`, `IceSheet.cut`, `CuttingTool`'s planner unchanged.
- Views: `saw.yaml`/`rive.yaml`/`butcher.yaml` `requires:` their protocol;
  `cut.yaml` loses `--for/--tight/--generous` (cloth's: they move to the
  tailoring `CuttingTool` planner's own options via a `cut` stanza the
  tailoring pack contributes — the one-host-owns-its-options rule);
  `fell.yaml` loses the bole.
- Callers: `CutController` (one path), glass `Scribe/Snap/Groze` (host
  methods), ice `IceActController` (host methods), `SawController`
  (`Sawable`), `RiveController` (`Rivable`), `FellController` (no
  crosscut), `ButcherController` (`Butcherable` — the full dressing move is
  W10's; here only the protocol seam).
- Acceptance: the cutting rows of the W0 baseline unchanged (`cut rope`,
  `saw log`, `rive billet`, `butcher carcass`, `scribe sheet`, `groove
  ice`); `lint:mixin-names` green; `help cut` no longer lists cloth
  options.
- Commit: `build(controller-liquidity W6): one small protocol per cutting
  act`.

### W7 — the kernel's multi-act controllers (D13, Appendix A kernel rows) ✅ done

> **W7a ✅** (`4261ee0f0`, `a341f4ec5`, `e8a1408f9`, `98cf053a5`, `2cea670c4`,
> `57e12bc6b`, `bcf73eb27`) — one controller per subcommand over a base per
> noun; tune/course/teleport/journey bare reads are their own shapes; a
> subcommand view is tried before the verb's shapes.
> **W7b ✅** (`fa9e742db`, `6d30fe35d`, `02a7e7f1b`, `5c89db603`, `f79a9aa95`)
> — watch horizon, notify's five forms, fight assess, berth roads, the
> cockpit nest, draught's three shapes, equip set save, pack staff, stream
> and press split. **W7c ✅** (`c3d518a22`, `b0869cda5`) — one act behind
> each kernel word (Heated, Agitated, Washable, Sweepable, Sampleable,
> Surveyed; Integrity.ringBy, Labelled.labelBy, Metabolic.dosePlanFor,
> Payable.payBillsBy, Sealable.openPlanFor, Combatant.defend; `paste`,
> `dry-rub`). Stabilized after: `NestingConstructor` (below), the dairying
> fixture, `lint:verb-collisions` taught same-controller / first-word /
> bare-vs-fallthrough disjointness. Decisions: § Plan-level decisions,
> "(build, W7a/b/c)".

Three sub-waves a single agent can land in order (or three agents on
disjoint categories):

- **W7a — the subcommand-switch family (mechanical).** `Player`, `Wizard`,
  `House` (book/pnl/payroll/roster), `Reserve`, `Treasury`, `Wallet`,
  `Store`, `Office`, `Government`, `Settings`, `Var`, `Contacts`, `Subject`,
  `Stream`, `Committee`, `Config` (shapes), `Errors`, `Git`, `Help`,
  `Press`, `TestHarness`, `HouseShop` (par/price/stock),
  `HouseFreight`/`HouseTraffic`, `Stall` (terminus — included here because
  it is the same mechanical shape; its logic move is W13's), `Tune`
  (follow/post shapes), `Journey`/`Course`/`Teleport`/`Draught` bare-read
  controllers. Each: `<Noun>ControllerBase` + one controller per
  subcommand with its row; the view names each `controller:`; no word
  changes. `lint:multi-act` falls by the count.
- **W7b — the cockpit nest and the ladder's word changes.** `cockpit.yaml`
  nests `card`/`shelf`/`layout`/`style` (the `action`/`name`/`styleSub`
  args become stanzas; `values:` for shelf rows, style themes, card ids
  where closed); `equip set save`; `notify` subcommands; `fight assess`;
  `watch horizon` stanza + the two `watch` shapes; `berth roads` (transport
  — W12 lands it, listed here for the word table); `pack staff`;
  `draught <fire> <setting>` with `values:` (five stanzas → one arg);
  `SaxonbergClient.validateArrangementName` reserves nothing (recall is
  explicit). Drive step 9.
- **W7c — the kernel protocol/one-engine conversions with no word change.**
  `Heat` (`Heated`; the placement arm retires — `heat.yaml` help names
  `put`), `Dry` (two shapes: `dry-rub.yaml` with `prepositionRequired: with`
  and `dry.yaml`), `Stir` (`Agitated`), `Wash` (`Washable`), `Carve` (one
  planner), `Fit` (assembly only; `paste.yaml` + `PasteController` over
  `Faced.pasteOn`), `Sample` (`Sampleable`), `Sweep` (`Sweepable`),
  `Survey` (`Surveyed`), `Label` (`Labelled.labelPlanFor`), `Ring`
  (`Ringable`), `Dose` (`Metabolic.dosePlanFor`), `Pay` (`Payee.paymentPlanFor`
  on a person and a `Payable`), `Open` (`Openable.openPlanFor(setting?)`
  over Bistate and Throttleable), `Defend` (the Combatant's `defendPlanFor`
  with the formation answering the coup stay), `TitleTransfer` (one act,
  the thing transferred answers; `for <price>` the sale), `Embody` (two
  shapes), `Belay` (`untie` for off), `Tip` (typed refusal from
  `BankingApi.settle`; fall through only on `insufficient-coin`), `Stand`
  (`acceptPosture` decides; HaulOut's haul-out stays HaulOut's).
- Acceptance: drive step 8's three representatives; `help` for each lists
  its forms; `lint:multi-act` at the pack residue; `lint:subcommand-words`
  pairs re-measured (the splits add no flat verbs); W0 baseline unchanged
  for every recorded kernel act except the rows named as defects.
- Commits: `build(controller-liquidity W7a): one controller per
  subcommand, over a base per noun` · `W7b: the cockpit nest and the
  ladder's word changes` · `W7c: one act behind each kernel word`.

### W8 — the kernel's protocol candidates and the misplaced rules (Appendix B) ✅ done

> **Done** (five parallel slices, `15469c88b`…`5214bc7dd`, ceilings in the
> last W8 commit). New kernel protocols: `WaterDrawable` (lib/bulk), `WaterEntry`,
> `Launchable` (lib/location), `Anchoring` (lib/expanse), `Readable`
> (lib/description); new object methods `Soil.amendPlanFor`, element tokens on
> `Vitals.treatmentPlanFor`, `PosturedMixin.acceptPosture` (it did not exist),
> `Hauler.hitchPlanFor`, `Combustible`/`Burner.ignitePlanFor`/`extinguishPlanFor`,
> `Burner.draughtFor` (the one fire vocabulary), `Integrity.fallOnto`,
> `TrapKit.armBy`, `ContainmentApi.putPlanFor` (closed `PlaceRefusal`),
> `Marked.inscribe`, `Named.takeName` (Bonded promotes), `PricedOffer.offerings`,
> `Persona.recordFor`, `Vitals.undressWound` (ActChoices), `ThrownLanding.settle`,
> `HeldGoodsMixin.accepts/checkIn`, `Adornment.mayTakeDown`, `Group.rename`,
> `SoulCatalogue.edit(EmotePatch)`, `ParcelApi.setPublished` → `PublishAnswer`,
> `BankingApi.payDraw` → `DrawResult`, `Haulable.slipHitch`, and
> `PerceptionApi.observe` (look's writes + warm, called once). Fixed: C24 C28 C31
> C32(draw) C33 C36 C40 C43 C44 C48 C50 C51 C53 C54 C61 C71 C72 C84 and the
> `cool`/`cp` record errors. Ceilings: decisions 1167→**1130**, durations
> 100→**99**, functions 229→**216**, gates 16→**11**, mutations 317→**302**,
> duck-typing 536→**534**, multi-act 39→**38**; ⚠ mixin-clusters **40→41**, a
> stated rise (Haulable's coupling beside its load; every host is both).
> The plan's targets (decisions ≤ 700, mutations ≤ 200, functions ≤ 150,
> self ≤ 60, duck ≤ 500) were NOT reached by the kernel slice alone — they
> are build totals the pack lanes and W14 must carry; self-resolution held at
> 105. **Decisions (build, W8):** (a) `WaterDrawable`, not `WaterSource` —
> `WaterSourceMixin` already exists as the water pack's seam; `WaterEntry` lives
> in `lib/location/` beside Shore/WaterPlace (no `lib/underwater/`). (b) look's
> self-reports (puddle, notices, placing, owner, screen) stay in the controller
> as the pre-declared exception: `markupAugmenters` is synchronous and folds into
> the long text the card and every sense verb share — moving them would change
> words and order; they are reads (0 mutators), so no row; the async seam is
> owed to `one-resolution-rule-slate` § 2. (c) A glance records a DISCOVERY,
> not a `searched` claim (location-graph § 4); `search`'s resolve still writes
> `searched`, pinned by a test. (d) Transport DOES declare water (its
> package.json) — `Launchable` is kept as the declared meeting point and the
> walk lives on `Boat.launch/recover`. (e) Instant acts answer an `ActPlan`
> with `durationMs: 0`; Anchor runs its completion itself to keep its topics.
> (f) C60 deferred: at arrival the command frame is gone and the engagement has
> completed — an abort reason needs a scheduler seam (an engagement whose
> completion can run an async check and cancel), not a controller edit. (g)
> W3's leftover gates: arm, get, title publish, soul, the banking presence read
> moved or went dead; clone, destruct ×2, goto ×2, reload, eval, title
> subdivide, broadcast STAY — each protects an engine primitive with no actor
> (`subdivide` is the primitive the plat book/lease/provision/stake call for
> parcels the actor does not own). (h) `Marked`'s old read is `textFor`
> (`readFor` is the protocol's); the write verb's method is async `inscribe`.
> (i) Chronicle's host is `Persona` (no `ChronicleMixin` exists); RackCheck's
> weapon rule is the pack's `CheckRack.accepts`. (j) Undress's choice is not
> `chooseAmong` — a wound is a condition record, not a Stuff. **Left for the
> lanes:** `PullOutcome` still carries words across five Pullable hosts in
> three packs (Pull is only partly done); `WashController`/`BatheController`
> keep their own `findWater` (should ask `WaterDrawable`);
> `LocomotionControllerBase.arriveAfter` pushes off with `instanceof
> WaterSurface` (→ `room.pushOff`); the killick's `facts.line` and Book/Marked
> `line` prose. **Record rows changed on purpose (W15 re-records):** `cool`
> (error → runs), `cp` (error → declined access-denied), `sip` (says why a
> source is empty), `warm` (arg type), `remove`/`unequip` (each layer's time),
> bare `equip` (no "leave X" lines), `throw`/`throw at` (the hand empties),
> `rack check` non-weapon (refusal, not TypeError).

- `Put` (`ContainmentApi.move`'s `canPlace` carries the slot/interior/
  region rule; the controller words `PlaceRefusal`), `Water`/`Feed`
  (`Soil.amendPlanFor({material|water, zone})`; two thin controllers),
  `Cool`/`Warm`/`Rinse` (`Vitals.treatmentPlanFor` tokens; `WaterSource`
  for the water), `Read` (`Readable`), `Swim` (`WaterEntry`), `Lie`
  (`acceptPosture`), `Hitch`/`Unhitch` (`Hauler.hitchPlanFor`/`unhitch(by)`),
  `Anchor` (`Anchoring`), `Launch`/`Recover` (`Launchable` — the kernel
  mixin here; the transport controllers in W12), `Light`/`Douse`
  (`Combustible.ignitePlanFor`/`extinguishPlanFor` — existing mixin, new
  methods), `Pull` (`HaulOut` + `Pullable` hosts' methods), `Plant`
  (`Cultivable.plantPlanFor`/`sowPlanFor`), `WriteOn` (`Marked.writeOn`
  with page), `Menu` (`PricedOffer.offerings()`), `Name`
  (`NamedMixin.takeName(name, by)`; `Bonded` overrides with the promotion),
  `Chronicle` (`ChronicleMixin.recordFor(viewer)` with the privacy
  predicate that the subscription gate uses), the shell tree verbs on the
  W3 Api methods, `Knead`/`Dip`/`Shape`/`Pump`/`Split`/`Tie`/`Order`
  verified clean (no change).
- `Look`'s four world writes and the warm (`reconcileAiring`,
  `learnSurroundings`, `learnIdentityOf`, the glance `resolveSearch`,
  `preloadForSenseGate`) move into one `PerceptionApi.observe(actor,
  target)` moment the controller calls once; the per-class self-reports
  (puddle, notices, placing, owner, screen) become the mixins' async
  augmenters where the augmenter seam exists today (`getMarkupLong`),
  else stay as the one listed exception with a `lint:controller-mutations`
  row. ⚠ `look` was held by client-surface in the last build; that branch
  is merged, so it is in scope here.
- The remaining kernel rule movers from the shards (each a one-line move
  the brief lists with file:line): Drop's fall dial, Cover/Disarm/Equip's
  `AppApi.setting` reads → the obeying object; `Draught`/`Fire` word
  tables → one vocabulary on `Burner`; `Undress.pickDressed` → a choice;
  Throw's slot release and `Combatant.deliverThrown` moving the item on
  every arrival; Unequip's chained strip; Equip's already-worn-first and
  the worn exclusion; RackCheck's `HeldGoodsMixin.accepts`; Label's silent
  return; Practice's; Tune's `serviceHandle`; Watch's `setWatch` boolean;
  Office's reason; Traits' `Mml.li`; Treasury/HouseDraw typed banking
  refusals; HouseDismiss `singleton`; Wallet freeze; Sip `settle`; Reserve
  `priceIndex` once; Alias reason; Goto's detach; Clone copies 2..N;
  Lime's dose.
- Acceptance: `lint:controller-decisions` ≤ 700 and durations ≤ 40 (the
  survey's kernel rule lines; W0's own measure sets the exact number),
  `controller-mutations` ≤ 200, `controller-functions` ≤ 150,
  `controller-resolution` self ≤ 60, `duck-typing` ≤ 500; W0 baseline
  unchanged except the named defect rows; drive step 10's `search`
  finishes (W0 fixed the completion; this wave proves the resolve records
  `searched`).
- Commit: `build(controller-liquidity W8): the kernel's objects answer
  their verbs; look observes once`.

### W9–W13 — the pack lanes (parallel after W8)

Each lane: read its packs' rows in `rows.json` and the shard files; for
each controller apply its Appendix A/B rung and Appendix C fixes; move
every rule to the pack's own `src/thing|idea|lib`; re-record its baseline
rows that were defects; lower its share of the ceilings; run the pack's
vitest. The lanes never touch another lane's directories; kernel edits a
lane needs (rare — a `Mixins` entry, a `MixinApi.isX`) go through the lane
owner's commit with the file named in the message so the sibling lanes
rebase cleanly.

- **W9 — the metal chain:** `trade-smelting` (Smelt → `SmeltingFurnace.
  canSmelt/readCharge/smeltPlan/tap`, `src/lib/IronCarbon.ts`, the charge
  predicates as declared tags, `productRowFor` → `getCastTemplate`, the
  clamp sniff gone because `smelt.yaml` `requires: class:SmeltingFurnace`),
  `trade-mining` (Hew → `Working.hewPlanFor` incl. barring down; Stake →
  `ClaimsRegister.stakePlanFor` with the owner compared; Assay →
  `Assaying` on kit and bench, samples moved into the bench at dispatch,
  the fee tied to the bench's business; Drift/Shore holders → identity;
  Drain `canDrain` first; `MiningActController.groundPermits` thresholds →
  `Working`), `trade-fuel` (Char → `CharcoalPit.lightPlan`; draught via
  `draught`; the engagement matched by host; a non-Engaged actor refused),
  `trade-smithing` (Quench → `Quenchable`; Hammer → `Hammerable`).
  > **W9: ✅ done.** Smelt → `SmeltingFurnace.smeltPlan` (Ore by the mining
  > pack's class, flux/sulfur/fuel by tag); `smelt.yaml` `requires: [BurnerMixin,
  > affords]` turns the clamp away (no `class:` term exists — `affords` is the
  > sanctioned one). (build, W9) **`IronCarbon` lives in `trade-smithing/src/lib`,
  > not smelting's** — Hammer, Quench and Bloom read the same Fe–C bands and
  > smelting depends on smithing, never the reverse. (build, W9) C41: the solid
  > product is `getCastTemplate()`; `castTemplate` authored on base-library
  > bloom-iron/sulfurous-iron/steel (the rubber precedent). (build, W9) Hammerable/
  > Quenchable are hosted by a new smithing `Stock` (= Ingot + both) that the
  > chain's ingot/bar/pig/blank rows now name, plus `Bloom`; generic-objects'
  > tin-bar/lead-pigs stay kernel Ingots and lose `hammer`/`quench` (lens 1: cast
  > metals). Char → `CharcoalPit.lightPlan`; kernel `ActPlan.slots`/`host` (a
  > watched act holds `attention`) — C11 fixed. Mining: the labour acts' plans on
  > `Working` (`Stability.cause`, drain checked before the pump — C20),
  > `MineWarren.secure` + `holder: ParcelOwner` by identity (C16), `Assaying` on
  > kit+bench (C18, samples handed INTO the instrument), `ClaimsRegister.
  > stakePlanFor` (C21). Quench's `Grade.of 'good'`: four recipes named a band
  > that does not exist (`good` → `fine`, incl. drilling's pressure-gauge);
  > recipe-bands tests guard it; the record row is unchanged (cold ingot →
  > `empty-build`). W9's share: decisions −141, durations −20, mutations −29,
  > functions −54, duck −25, multi-act −2, template-scans −1.
- **W10 — food and land:** `trade-cooking` (Butcher → `Corpse.butcherPlan`
  + `Species` dressing with the exemplar keyed by cut, the blood vessel
  bound or the arg deleted, blade/tools prepositions split; Cook/Plate/Cure/
  Dry/Smoke read against the test), `trade-farming` (Plow → `Soil.plowPlanFor`;
  Mow; Water/Feed consumers), `trade-ranching` (Draft/Move/Slaughter on
  `mayKeep`; Breed's sex check; the herdbook writes), `trade-milling` (Mill
  → `Comminuting.millPlanFor` one engine, the hopper takes the grain),
  `trade-baking`, `trade-sugar` (Clay's structured reason), `trade-dairying`,
  `trade-hospitality`, `trade-apiculture`.
  > **W10: ✅ done.** Kernel: `Comminuting.millPlanFor` (one engine; C17 —
  > driven stones take the charge as they start; dust is an authored
  > `dustMaterial`), `Butcherable.butcherPlan` (the whole breakdown on the
  > body — the plan's Corpse home, via the mixin Corpse composes),
  > `Organism.slaughterRefusal`/`slaughter` (@hooks; Livestock adds the
  > book), `RecipeCatalogue.curingRecipeFor`. Packs: `Tract.plowPlanFor`/
  > `readGround`, `Field.mowPlanFor` (the plow lives on the TRACT, not
  > `Soil` — clearing is the tract's), `HerdRegistry.pick`/`draftHead`/
  > `reapStrays`, `Livestock.returnToHerd`/`serveBy`/`answerToSpecies`,
  > `Copper` reasons not lines; serve = mix handed over. C3 closed (vessel
  > arg deleted — nothing caught blood; `blade` `with`, `tools` `using`),
  > C17, C19's W10 half, C21's sugar half. No record row re-recorded
  > (`mill`/`butcher`/`plow` end states unchanged). **Deferred:** plate/
  > muddle/strain/garnish paces (they act on the kernel `Builds` vessel — a
  > step protocol is kernel work), bake's lit-chamber read (a `Burner`
  > predicate), Move's field/herd word resolution. Ceilings: decisions −110,
  > durations −3, mutations −30, functions −9, multi-act −3, self −7, duck −8.
- **W11 — wood and fiber:** `trade-forestry` (Fell → `Fellable`, spend at
  engagement start; Rive → `Rivable`), `trade-carpentry` (Saw → `Sawmill.
  sawPlan` one engine, `setSawing` on both paths, the two exported
  functions folded), `trade-textiles` (Weave `isYarn` predicate; Spin/
  Weave/Scutch refuse-before-consume), `trade-tailoring` (Sew maker →
  identity; the `cut` cloth options), `trade-dyeing` (Dye → `DyeBath`;
  Mordant binds a material and a bath), `trade-tanning` (Tan one act;
  `look` reports), `trade-cordage`, `trade-sericulture`, `trade-papermaking`,
  `trade-printing` (Print → `Printing`; the `on` arg renamed `press`).

  > **W11: ✅ done.** Kernel: `ActPlan.onBegin` (a claim held while the act
  > runs, taken by `engagePlan` once the work is under way) and
  > `Wearable.alterPlanFor`. Packs: `FellableMixin` (Wood + a new forestry
  > `Standard`; oak/ash rows name it, `SapStandard` extends it),
  > `Sawmill.sawPlan` (both rungs claim the saw; C6), `TextileWork.
  > scutch/spin/weavePlan` (mint before consume, C29; yarn is what has a
  > count, C23), `CutPieces.sewPlan` (`--pattern` a `values:` list), `DyeBath`
  > (C9: the mordant is the bath's material, a dose spent), `Tanpit.
  > layInPlan` + the pit's `look` carries every skin, `PrintingMixin.
  > printFor`. **Decisions (build, W11):** (a) `Fellable` is a PACK mixin —
  > with the planted standard a forestry class both hosts share a pack
  > ancestor, and kernel `Plant` stays honest; (b) `DyeBath` is a value
  > object, not a protocol — a bath is any bulk vessel, so there is no host
  > class; (c) `sew` refuses a wearable that is not cut pieces; (d) the
  > textile plans live on a value object (`TextileWork(actor, instrument)`),
  > not `TextileStock` statics — `lint:lib-statics` held at 340 (what is
  > worked is not one class). **Player-
  > visible (add to § 6):** `mordant <cloth> [in <bath>]` (was `with
  > alum`, which cost nothing); `tan hide` on a skin already down refuses
  > and says `look` at the pit; `print "a name" 2` (quoted, `copies` a
  > number arg); hemp yarn now weaves. Ceilings (my share, per commit):
  > decisions −135, durations −11, functions −42, mutations −49, multi-act
  > −7, duck −3, self-resolution −1 — the lane's controllers are at 4
  > decisions / 0 functions / 1 mutation. The carcass-chain wire drive's
  > two tan checks now `look tanpit`. Cordage, papermaking, Rive: read,
  > no change (W6 did Rive; `--length` stays W6's grammar deferral).
- **W12 — water, transport and the ground you sink a hole in:**
  `transport` (Course readout controller + `Frame.planCourse` for the
  rest; Journey status controller; Berth → `berth roads`; Launch/Recover →
  `Launchable`; Anchor), `water` (Pilot: claims first, then settle; the
  `Launchable` hosts), `trade-fishing` (Fish → the rod implements `TakesFish`;
  Lay fills from the reach's water), `trade-drilling` (Bore → `spud.yaml` +
  `SpudController` over `Wellhead.siteAt`; `bore` swings over
  `Wellhead.swingPlan`; Line → `Bore.canLine`), `trade-ice` (host methods),
  `trade-glass` (host methods; `Window.canGlaze`), `trade-diving`, `tpa`
  (Teleport's board controller is kernel W7a; the node's `ridePlanFor`
  here), `energy`.
  > **W12: ✅ done** (`f971a8654`…`6237312c5`). `spud [with <bailer>]` sites
  > (`Bailer.spudPlanFor` — title via `AccessApi.can` on the room, bank before
  > mint; the controller gate is gone); `bore` swings (`Wellhead.swingPlan`);
  > `line` over `Wellhead.linePlan`/`canLine` (C8; liner default `me:i:liner`,
  > the rig takes `at` only — `with` collided). C27 `Pilot.sellWaterTo`; C13
  > `Trap.layIn` + `Waters.waterIn`; C14 kernel `Window.canGlaze` + `Sheet.glazeInto`;
  > `TakesFish` is wordless and the rod implements it; `Gather.crackPlan/
  > reheatPlanAt`, `Sheet.flattenPlanAt`, `Fish.releaseInto`, `Boat.paddleBy`,
  > `FastTravel.registerFor`, `LineAccess.severBy`, `LaneCatalogue.planJourney`.
  > **Decisions (build, W12):** (a) `spud` takes no rig — the rig is raised by
  > spudding; the bailer (its affordance) hosts the act, not a `Wellhead` static
  > (no instance exists yet). (b) DEFERRED: `TravelNode.ride` stays prose — a
  > kernel union of the TPA's reasons would put a pack network's words behind a
  > kernel MR (lens 2); `PullOutcome` wordless (~85 sentences, 3 kernel hosts) →
  > W14; `CourseController`'s heading parse → frame (it already steers through
  > `Frame.planCourse`; not on the multi-act census) → W14; C60 stays deferred.
  > Ice was already clean. Ceilings: multi-act −1, mutations −24, decisions −31,
  > durations −7, functions −12, gates −1, duck −4, self-resolution −4.
  > Recorded rows: `journey` now asks the vehicle's mode before the destination
  > (refusal order only); drilling.dirty sites with `spud`.
- **W13 — people and places:** `trade-medicine` (Transfuse → `Transfusable`
  is **not** minted: the vessel's payload decides saline vs blood inside
  `patient.receiveBlood`'s plan; Bleed per D9; Operate's hold abort linked
  inside `OperationEngagement`, Trauma writes → `ConditionApi`; Dose's
  licensing stays a lens-7 flag; Donate's line), `residence` (TitleBuy →
  `PlatBook.sell` check-then-act — the money leg inside; Lease/Unlease
  `ascentRefusal` → `PlatBook`; Maintain → the existing upkeep mixin's
  `upkeep(kit)` with the kit noun from the host), `eternal-university`
  (Unprovision → `DormWarren.endLet` evicting to storage; Provision/
  Unprovision/Remodel read against the test), `terminus` (Stall →
  `MarketStalls.let/giveUp`, the counter's goods handed back), `arcana`
  (Study → `Spellbook.studyPlanFor`; Cast/Recharge/Zap/Recite word the
  magic Apis' structured results — the Apis return reasons, not prose,
  where this build can reach them), `trade-shopkeeping` (HouseShop split
  is W7a; the stock sheet by screen principal stays — documented), the
  stub trades.

  > **W13: ✅ done.** `PlatBook.sell(extent, buyer, desk)` check-then-act
  > over the new `ParcelApi.subdivisionRefusal` (C1, drive step 11);
  > `LettingWarren` (residence `src/lib/`) is ONE let/end-let over Dorm +
  > Building warrens with `mayLetFor(by)` inside (D9; Hall/LettingController
  > deleted; C4 storage eviction; the dorm end-let scoped to the dorms);
  > the ascent gate is the `Ascent` value object (not on PlatBook — a let has
  > no book); `maintain` rides kernel `Maintainable` on `Building`/`Ship`
  > (no upkeep mixin existed); `MarketStalls.let/giveUp` (C5: goods to the
  > square when the keeper cannot hold), the fixture a bound `square` arg;
  > `receiveGift` credits + `GiftAnswer` (C15); `OperationEngagement` owns
  > the hold (C38); `Vitals.leaveWoundOpen` (C39, not ConditionApi — it is
  > the body's record); `receiveBlood({by})` records harm + revival;
  > `DonationBank.keptBy` gates `takeUnit`; `Spellbook.studyPlanFor`;
  > `job.yaml` help (C85). Step 12 was already W3's (identity-keyed
  > transfer + introduce; verified). Ceilings −18/−4/−1/−12/−6/−6
  > (decisions/durations/functions/mutations/duck/self-res); gates stay 11
  > (W8's engine primitives, none in these packs), lineage-keys 0.
  > **Deferred:** #128 (a kernel retail/banking settle path, not a pack
  > controller); Recharge's `transfer`-spell gate (the kernel `Charged`
  > cannot name a content spell — needs a kernel field + rows);
  > Cast/Zap/Recite still pass the magic Apis' prose (a kernel MagicApi
  > change); university-avenue verbs, Prescribe/Set/Test unchanged.
  > Record rows that change on purpose: `title buy` (zoning refusal now
  > takes no money), `unprovision` (goods to storage; new sentence),
  > `donate` (someone else's unit), `stall give-up`.
- Acceptance per lane: its rows in Appendix A/B/C closed; its pack's
  vitest green; its ceilings' share lowered (each lane's brief carries the
  per-pack counts from W0's census output); its baseline rows unchanged
  except the re-recorded defects; `lint:lineage-keys` and
  `lint:controller-gates` reach 0 when W13 lands.
- Commits: `build(controller-liquidity W9): the metal chain's rules in the
  metal chain` … `W13: …`.

### W14 — the gates close and the docs graduate ✅ done

- Every census at its end value; `lint:greedy-object`, `lint:multi-act`,
  `lint:controller-gates`, `lint:lineage-keys` at **0** and flipped to zero
  invariants (the schema refuses greedy on objects; `multi-act`'s arms are
  a hard 0); `controller-decisions`/`durations`/`mutations`/`functions`/
  `resolution`/`duck-typing` pinned at the measured floor.
- Docs: command-spec.md (D1–D3, D12, § Alternate controllers rewritten as
  the liquidity contract, § The remedy ladder new, the greedy section
  replaced), command-routing.md (nested dispatch, controller-by-path),
  mql-grammar.md + mql.md (`here`, `reachable`, rungs, `:held`, addressing
  through shut things), call-security.md (§ *possession is capability*
  gains *the method asks who* — D9's pattern), antipatterns.md (a gate in
  a controller; greedy on an object; a completion on `this` in any form;
  a person on lineage), lint-family.md (the five gates' rows and end
  values), CLAUDE.md's one-line pointers where a blurb changed truth
  (`cut`'s family, `heat`/`put`), crafting.md/forestry.md/butchery.md/
  glass.md for the cutting split, the trades' docs for the moved rules.
- Commit: `build(controller-liquidity W14): the gates close; the docs
  carry the liquidity contract`.

  > **W14: ✅ done.** Green first: tsc 0 (server + 54 packs), the four reds
  > (`census` — `dustMaterial` read by `refsOf`; decisions 635→633, functions
  > 64→63, mixin-clusters 42→41 re-pinned). Defects: **#128 fixed** (D18b;
  > `credit.test.ts` reproduces the floor throw); C5's square branch tested;
  > Sharpen's duration → `Keen.honeDurationMs`; Wash/Bathe verified; magic
  > prose, `PullOutcome`, Course's parse and C60 deferred to named slates (C93–
  > C96). Gates (D18a): greedy-object 0, lineage-keys 0, completion-this 0,
  > multi-act 6, controller-gates 10; decisions 633/38, functions 63, mutations
  > 138, resolution 1/80, duck 483/0, lib-statics 340. Docs: command-spec (the
  > liquidity contract + the remedy ladder; subcommand examples), command-
  > routing (by-path, nested), call-security (*the method asks who*),
  > antipatterns (+2), lint-family (at-merge column), glass, textiles, contacts;
  > 26 stale `greedy` YAML comments and `kermes.yaml`. CLAUDE.md left for the
  > sweep.

### W15 — the drive and the walk ✅ done

> **Done.** Master merged in (55 commits: material decomposition,
> broadcast-ready) — 15 conflicts, resolved to this build's structure with
> master's change re-applied where the logic now lives (SmeltingFurnace,
> `Metabolic.dosePlanFor`, the outside survey, `Bonded.canEat`); master's
> new one-controller `stream` verb split one controller per subcommand.
> Full suite once (`tools/suite`, 46 min): 56 packages, 3 red tests, all
> fixed (the reach walk in a sandbox circle, the field census's owner
> scan, a shopkeeping base no row names). The drive is green on all
> fourteen steps; five record rows re-recorded on purpose; the walk green
> on its eight concerns. Ceilings: decisions 633 → 620, mutations 138 →
> 137, duck 483 → 480, material-kinds 6057 → 6054; mixin-clusters 41 →
> 44 (master's own three, stated). At the end: tsc 0, lint:family 106/106.
> Decisions are D-W15a–g below.


- `packages/wire/tests/controller-liquidity.dirty.wire.test.ts` carries
  all fourteen steps (W0 wrote the record half; each wave added its
  steps); run once at code-complete, append the record to § Drive record.
- `e2e/tests/controller-liquidity-walk.spec.ts`: one test per concern —
  the quote hint reads as a sentence with a form you can tap back; `help
  notify`/`help draught`/`help dry` read their forms; `cockpit layout
  recall list`; `look here` on the river vs `look me:e`; `eat apple --top`;
  a `values:` refusal; a duration accepted; the replaced `harvest`
  controller's words (step 1's wizard install through the CMS, as in
  !527's step 16).
- The MR opens READY at code-complete (workflow.md § the user's time);
  the drive and the full suite run alongside review.
- Commit: `drive(controller-liquidity): <what driving found>`.
- ⚠ **Baseline rows to re-record on purpose** (behavior changed by a wave,
  not a regression): `unhitch`, `water`, `course`, `offer` (W3 cluster B);
  `cp`, `mv`, `rm`, `grep`, `mkdir` (W3 cluster A — the shell writes moved
  onto `TemplateApi` with every refusal before the first write); `dose`
  (W7c — the error row is fixed), `tip` (W7c — the typed settle refusal);
  check and re-record if changed: `label` (W7c — `at` names a field part),
  `wash` (W7c — needs a `WaterDrawable` source in reach; a crafted pail no
  longer counts), `char` (W7b — the draught arm moved to `draught`),
  `berth` (W7b — `berth roads` is its own word), `mill` (W5 — `at` is
  required).

### W16 — no nested subcommands (owner, 2026-11-10; D-W16a–c) ✅ done

> **Done (`8c41a78a4`, `ee6374390`).** D2 reversed: the binder walks one subcommand
> word; `subcommandPath`/`subcommandKey`/`getSubcommandChain` and the
> nested help walk are gone; the schema, `validate()` and a new **depth**
> half of `lint:command-views` (hard, structural zero) refuse a nested
> stanza. The five nested forms became verbs — `client-layout`,
> `client-card`, `client-shelf`, `client-style` (non-diegetic compound
> names), `stream-rotation`, and `outfit wear|save|list` (diegetic, a plain
> word); `testharness clock-advance`/`weather-pin`/`weather-unpin` are flat
> compound subcommand words. ⭐ Hyphens needed nothing: the tokenizer,
> aliases, `help` and every gate already read a word as a string (a test
> binds `client-style plain-channel gossip on` through the real parser).
> Ceilings: `lint:subcommand-words` different-act 44 → **49** (caller
> audit: `client-card close|move`, `client-layout recall`, `client-style
> show`, `stream-rotation clear` were the same pairs one level down, which
> the top-level-only census could not see; `outfit wear` is the owner's
> word), builtin `set` 7 → **6**. Verified: tsc 0 (server + packs,
> client), client vitest 1055/1055, lint:family 106/106, test:near
> origin/master 12,127 passed across 33 lanes after two source-shape tests
> were updated (`Wardrobe.test` pinned "a saved set is never a verb";
> `Login.verbs` the pre-world bucket, which gains the four `client-…`
> words — the old `cockpit` subcommands renamed, not a new reach), drive
> step 9 green on a fresh world, walk test 9 green. ⚠ Six other
> cockpit e2e specs run against the same world showed 12 reds that are
> NOT this wave's — every command they send was accepted and echoed
> (`client-card move who 2 0` → "card who moved"; `client-shelf first
> status` put Status first); the reds are older drift in what they assert
> (shelf labels `Standing`/`Known` vs the shipped `PLAY`/`RENOWN`; the
> default shelf grew `body`; `unknown theme` is the binder's `values:`
> refusal since W7b; the column/top-bar layout counts). Left for the
> sweep.

### W17 — `survey` retired; two one-host protocols fold (owner, 2026-11-10; D-W17a–c) ✅ done

> **Done (`ac2c3c883`).** `survey` → `analyze rooms` (new `rooms` row, `RoomsReading`,
> `Place.readRooms`), `analyze condition <building>` (the cause, off
> `Structure.readOutside`), `measure paint <building>` (new `paint` row,
> `PaintReading`); the floor line → `analyze cleanliness floor`.
> `Surveyed`/`Sawable`/`WaterEntry` mixins, their `Mixins` entries and
> `MixinApi.is*` gone; `surveyScope` → `roomsScope`. Surprise: the
> archetype field carried the verb's name into seven content rows; the
> `survey` card and the `sense.survey` topic are the other meaning and
> stay (D-W17b). Ceilings: `controller-decisions` 620 → **614** (−5 the
> survey controller; −1 W18's, pinned here), `duck-typing` 480 → **478**
> (W18's, pinned here). Verified: tsc 0 (server, client, forestry,
> carpentry, mining), client vitest 1055/1055, carpentry vitest 36/36,
> lint:family 106/106, test:near origin/master 11,446 kernel + every pack lane passed (the kernel lane's 3 unhandled Mongo rejections come from `card-terminals.test.ts` and reproduce on the pre-W17 HEAD — not this wave's). Wire and
> e2e moved to the new reads (not driven this wave: no world was started).

### W18 — two false unifications undone (owner, 2026-11-10; D-W18a–f) ✅ done

> **Done (`34f8e50c3`).** W7c's `Agitated` and `Sweepable` each stitched
> several acts behind one verb with a union result. Now: `stir` is the
> drink build's (`ManualBuildMixin.stirPlan`), a compound is `knead`ed
> (the matter decides the work), a churn is `churn`ed (new, the dairying
> pack's verb over `HandWorkedMixin.handWorkPlan`), a grate is `rake`d
> (new platform `device` verb over `Burner.rakePlan`). `AgitatedMixin` is
> retired; `Sweepable` keeps two hosts (Floor, Flued) with one result
> shape. Surprise: `knead` already did everything `stir` delegated, so
> the `wrong-work` refusal and `KneadRequest.verb` were dead the moment
> `stir` stopped asking. Content, wiki, wire drives and docs moved with
> it; the baseline row `stir` became `knead.compound` (same outcome);
> `reading-slate.md` holds the owner's open question on `Readable`.
> Ceilings: decision tokens 620 → 614 and duck probes 480 → 478 are
> pinned in W17's commit (W18's share is −1 and −2, measured together).
> Verified: tsc 0 (server; dairying, ceramics, potash, painting,
> cooking, hospitality), those packs' vitest + glass green, lint:family
> 104/106 (the two failures were the "fallen, re-pin" ratchets above),
> test:near origin/master 35 lanes green (server 11,446 passed). ⚠ 3
> unhandled "Not connected to MongoDB" rejections from
> `card-terminals.test.ts` (cockpit terminal; it fails the same way when
> run alone). W18 touched no code it reaches.

### W19 — `stir` what runs, `knead` what is stiff (owner, 2026-11-10; D-W19a–d) ✅ done

> **Done.** `Compounding.workVerb()` — the fact that already chose a
> stir's two minutes or a knead's quarter-hour — now routes the verb:
> `stirPlanFor` beside `kneadPlanFor`, each refusing `wrong-work` worded
> by its own controller; `StirController` asks a compound, refuses a
> dough trough, then asks a build. Help, docs (crafting, ceramics,
> command-spec, painting, mixins, architecture), the paint wiki page, the
> runny pots' row comments and the drives moved to `stir`; the baseline
> row is `stir` again (same outcome). Separately fixed: the
> `card-terminals` floating promise (D-W19d) — `test:near` exits 0.
> Ceilings unchanged.

### W20 — one definition of reach (owner, 2026-11-10; D-W20a–c) ✅ done

> **Done (`985558c4d`).** `PerceptionApi.reach` (backed by `PerceptionLogic.reachOf`)
> is the one list of what an actor can lay hands on, tagged by MQL's
> pools; `canReach`/`reachableAmong` test membership, MQL's `here` ·
> `inventory` · `peers` · `person` · `reachable` filter it, and
> `reachIds` plus scope-walk's holder/fixture/way/door assembly are gone.
> Surprises: the two disagreed on the room itself (now the `around` pool:
> named, not reached) and on doors of unseen ways (D-W20b). `reach.sameSet.test.ts` pins the agreement and the
> one-walk cost. Docs: perception, mql, mql-grammar, spatial,
> antipatterns. Ceilings unchanged.

### W21 — the rooms read leaves `Place` (owner review, 2026-11-10; D-W21a–d) ✅ done

> **Done (`1c63f86a4`).** `readRooms` and its two helpers moved into `RoomsReading`
> (`Place.ts` = master); the transport lane probe is a kernel seam,
> `WayIndexMixin`, composed by `LaneCatalogue` and named by the pack's
> `ways.indexPath` — no pack, no corridor, said so. A reader elsewhere is
> refused `not-here`. Tests: RoomsReading 14/14 (+ no-index, a building
> that is no holding, `not-here`), transport `Lane.test` pins `waysideOf`.
> Surprise: cleanliness 23 was never this build's — the drive's restart
> SIGKILLed the shutdown capture (D-W21d; fixed in the drive, not
> re-driven). ⚠ No ship fixture: the shell line for any structure is pinned
> with a building that is no holding. Ceilings: `duck-typing` 477 → **476**
> (the lane probe); lint:family 106/106, tsc 0 (server, transport),
> test:near origin/master: the one red was ArchetypeSatisfaction's file pin
> (Place.ts no longer names `Satisfaction`) — re-pinned, 19/19.


### W22 — a closed word list is `type: enum` (owner ruling, 2026-11-10; D-W22a–c) ✅ done

> **Done.** `enum` joined the arg/option `type` vocabulary; the schema
> requires `values:` on it and refuses `values:` elsewhere (if/then/else in
> an `allOf`, the greedy rule folded in beside it), and
> `CommandDefinition.validate()` refuses the same mismatch behind it. The
> binder, help and the verb-collision gate read `type === 'enum'`; 15 slots
> in 7 views (draught ×2, house freight `--since` ×2, stream, client-shelf ×3,
> client-style ×6, sew `--pattern`) migrated; no player-visible change.
> `CommandDefinition.values.test.ts` → `.enum.test.ts`. Ceilings unchanged.

**D-W22a (build, W22) — the schema speaks first.** A type/values mismatch
fails JSON-schema validation before `validate()` runs, so the test pins
the schema's message (`must match "else" schema` / `must have required
property 'values'`); the `validate()` copy stays for a definition built
past the schema, with its own sentence.

**D-W22b (build, W22) — a structured client is held to the list.**
`coerceStructuredValue` now canonicalizes an `enum` against its `values:`
(it accepted any string for a `values:` slot before) — the same refusal
a typed line gets.

**D-W22c (build, W22) — an enum never takes a name.** `takesAName` is
now plain `type === 'string'`: an enum is a different type, so the quote
hint can never join words into it, with no `values` test left to keep.

---

## Reachability wiring

Five links per new capability — verb · affordance · data · load · arg
gate. Each fails closed and silent.

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| `values:` / `duration` refusals | the existing verb | — | the view's `values:` | the view is content, installed by the platform pack | the binder refuses before the controller |
| nested subcommands | `cockpit card pin <id>` etc. | `cockpit.yaml` on the shell | stanzas | same | `unknown-subcommand` per level |
| the three rungs | any object arg | reserved flags on every view | `depth:` default | `RESERVED` | a bad rung word is `unknown option` |
| `here` = place | `look here`, every `here` scope | — | — | — | — |
| `:held` | MQL | — | — | `MQL_PREDICATES` | — |
| `spud` | `spud.yaml` (drilling category) | `commandContributions` on the drilling rig / wellhead class (`Derrick`/`DrillingOutfit`) — ⚠ the verb nothing affords is a verb nobody has | `SpudController.yaml` row + the view | pack install | `requires: capability.derrick` on the rig arg |
| `paste` | `paste.yaml` (crafting) | afforded by the paste pot (`Faced` coat family — the pot's `commandContributions`, as `dip` is the bath's) | row + view | platform pack | `requires: SheetMixin` on the label; `requires: FacedMixin` on the whole |
| `berth roads` | stanza on `berth.yaml` | the harbor book (already) | — | transport pack | `requires: class:HarborBook` |
| `pack staff` | stanza on `pack.yaml` | authoring | — | platform | the person arg `type: object`, `scope: online` |
| `fight assess` | stanza on `fight.yaml` → `FightAssessController` | the combatant (already) | — | — | `requires: CombatantMixin` |
| `notify set/show/move` | stanzas | the implant (already) | — | — | — |
| `outfit save` (was `equip set save`) | its own verb (W16) | already | — | — | — |
| `dry … with <cloth>` shape | `dry-rub.yaml` | the cloth's `commandContributions` (a towel affords rubbing dry) | row | platform | `prepositionRequired: with`, `requires: AbsorbentMixin` |
| `watch horizon` | stanza | the ship (already afforded `watch`) | — | — | — |
| every protocol mixin | the existing verb | the view's `requires:` names the protocol (`requires: SawableMixin`) — so a thing that does not compose it is refused **by the binder** and no controller test sees it | hosts compose it | pack discovery registers `_mixinName` | **this is the fifth link**: every converted view's `requires:` is re-checked against its hosts in the wave's acceptance (`lint:reachability` arm A) |
| the gate methods | — | — | — | — | the method refuses; the drive's bare controller proves it |
| `Launchable` | `launch`/`recover` | the water place's class composes it; the transport views `requires: LaunchableMixin` | — | — | the binder |

⚠ The two new words are the only places this build can ship a dead verb:
the W12 brief carries an explicit "who affords `spud`" check, and W7c's
"who affords `paste`".

---

## Acceptance-criteria coverage

| requirements AC | waves |
|---|---|
| A replaced controller that only words differently produces identical world state, durations and refusals for every act on the worklist | W0 (the record), W4 (the exemplar + asking), W7–W13 (every move re-checked against the record), W15 (step 1, step 13) |
| A replaced controller that only calls the object cannot get past any protection the survey listed | W3 (+ the pack residue in W9/W13), W15 step 3 |
| No command takes an unquoted multi-word object name; prose still reads whole | W1 (binder), W5 (the sweep + gate), W15 step 6 |
| `reachable` and the three rungs behave as above; MQL addresses things anywhere | W1 (tokens), W2, W15 step 4 |
| `here` is the place | W2, W15 step 5 |
| Every controller is one act, by the ladder; the owner reviewed the word list | this plan's first section; W7, W9–W13; W15 steps 8, 9 |
| Every confirmed survey defect is fixed; each dropped one has its reason | Appendix C; W0 (completions), W3, W8, W9–W13; W15 steps 10–12 |
| The survey's counts are gated and lower; none can rise | W0 (open), every wave (lower), W14 (close) |

Nothing in the requirements is unmapped. One requirement sentence is
narrower than it reads: *"bleed consent"* is verified **absent** (no
predicate exists anywhere), so this build makes the act accountable and
tool-gated and names the consent gate as a deferred seam (D9) — stated
here so it is not read as unfinished at review.

---

## Test & gate strategy

### Unit tests

- Grammar (W1): `CommandDefinition.values|duration|nested`,
  `CommandGiver.articleFold|quoteHint`, `HelpCatalogue.shapes`.
- Reach (W2): `mql.here-place`, `mql.reachable-depth`, `predicates.held`,
  `canReach.sameWalk`, the existing `scope-walk.open-container` and
  `visible-inside` tests updated to the new truth.
- Gates (W3): per method, two tests — the controller path refuses another
  player; a direct call from a bare test controller refuses too
  (`SecurityApi` participant contracts asserted).
- The convention (W4): `ActPlan.choices`, `EngagedActController.engagePlan`,
  `Soil.resolvePartFor` returns the set, `HarvestAskingController` prompts.
- Every protocol mixin: one test per host kind (the plan, a refusal, the
  outcome facts), in `lib/<subsystem>/__tests__/` or the pack's.
- Every split controller: the per-subcommand controller test binds what the
  view binds (command-spec.md § The subcommand rule).
- Every gate script: a positive fixture, a negative, the live-tree invariant
  (at or below the ceiling, above zero while it is a ratchet).
- The full suite runs at exactly two moments: code-complete (alongside
  review) and `/finalize`. Everything between is `test:near` + the touched
  packs' vitest + `lint:family`.

### The drive (requirements § The drive), paces and how each asserts

| step | pace | assertion | wave that makes it pass |
|---|---|---|---|
| 1 liquidity test (`harvest`, `smelt`, `order`, `butcher` replaced by minimal controllers) | instant · **staged** (a title-holding wizard re-points `controller:` through the CMS, as !527 step 16) | same `{status, reasons, duration, state}` as the shipped controller | W4, W7c, W9, W10, W15 |
| 2 asking test (`HarvestAskingController`) | instant · staged | the asking controller prompts; the shipped one refuses with the list; identical world after either | W4 |
| 3 protection test (a bare controller per protected act) | instant · staged (the bare controllers are test-world `testOnly:` views installed by the stager) | each refuses another player: chat rename, `errors raw`, Tier C, wiki hidden revision, hiring past criteria, lock you may not, post outside the audience | W3 |
| 4 `eat apple` in the open bag / shut box / `--top` / `me:I:apple` | instant · player | found · `enclosed-shut` · none at hand · found | W2 |
| 5 `look here` in a boat vs `look me:e` | instant · player | the river · the boat | W2 |
| 6 `buy "dog loaf"` / `buy dog loaf` / `say` | instant · player | bought · refused with the hint · whole sentence | W5 |
| 7 a bad `values:` word; written durations | instant · player | refused with the list; `90m`/`2 hours` accepted | W1 (+ W7b's `draught`, `stream away`) |
| 8 the three representatives (`notify set`, `draught … low`, `dry … with`) + `help` for each | instant · player | the new forms route; `help` lists them | W7b, W7c |
| 9 `client-layout save list` → `client-layout recall list` | instant · player | round-trips | W1, W7b, W16 |
| 10 a transfusion narrates/credits/records; a `search` finishes; an anchored teleport arrives | **short** (engaged acts of seconds to a minute) · player | the completion's effects observed | W0 (the fix), W8/W13 (the moved rules) |
| 11 refused land purchase leaves money untouched; pilot charges only with something to tell | instant · player | wallet delta 0 on refusal; 0 on "nothing to tell" | W13, W12 |
| 12 introducing a player; a gifted parcel | instant · player | known; owner is the receiver | W3 |
| 13 before and after | instant · **staged** | every recorded act equals the W0 record (re-recorded defect rows excepted, by name) | every wave; W15 |
| 14 a restart mid-act (a smelt run, a mill grind) | instant · staged (an owned world is restarted as !527 steps 17–18 do) | the act completes; the world reads back the same | W9, W10, W15 |

No span step; **no soak drive** (nothing waits on the clock). Every
checkpoint is made to fail once on purpose before it is trusted (B2):
the W15 brief lists the deliberate breaks (a controller that skips the
gate, a baseline row edited by hand, a `values:` list with the typo).

### The browser walk

`e2e/tests/controller-liquidity-walk.spec.ts`, once at code-complete:
the quote hint as a sentence a person can act on; `help` for the three
representatives; the nested cockpit forms; `look here` on the river; the
`values:` refusal; a duration; the replaced-controller install. Precedent
`controllers-are-io-walk.spec.ts`.

### Gates per wave (what falls where)

| gate | opens (W0) | W1–W6 | W7–W8 | W9–W13 | W14 |
|---|---|---|---|---|---|
| `greedy-object` | 133 | 0 at W5 | — | — | zero invariant (schema) |
| `multi-act` | measured | — | kernel share → pack residue | 0 | hard 0 |
| `controller-gates` | measured | W3 → pack residue | — | 0 | hard 0 |
| `lineage-keys` | measured | W3 → pack residue | — | 0 | hard 0 |
| `completion-this` (extended) | 0 (W0 fixes 3) | 0 | 0 | 0 | 0 |
| `controller-decisions` / durations | 1176 / 100 | W6 lowers the cutting share | ≤ 700 / ≤ 40 | each lane lowers its pack's share | pinned at the floor |
| `controller-mutations` | 318 | — | ≤ 200 | lanes | pinned |
| `controller-functions` | 230 | — | ≤ 150 (SawController's two are W11's) | lanes | pinned |
| `controller-resolution` self / hunts | 110 / 4 | W4 (Harvest) | ≤ 60 / hunts 0 | lanes | pinned |
| `duck-typing` / undefined | 539 / 0 | W6, W8 (`Launchable`, `WaterEntry`, `Readable`, `canUnhitch`) | ≤ 500 | lanes | pinned |
| `subcommand-words` pairs / builtin | 42 / 6 | — | re-measured after W7a (splits add no flat verbs) | — | pinned |
| `reachability` arm G article | 110 | retired W1 | — | — | — |
| `person-keys` | 0 | 0 (MineWarren's holder becomes visible to it in W9) | 0 | 0 | 0 |

The intermediate numbers (≤ 700, ≤ 200, …) are targets the plan expects
from the survey's shares; **W0's own census output is the number each
wave's brief carries**, and a wave that does not reach its target records
why in the plan rather than moving the target silently.

---

## Risks & opens

**The owner's calls — decided 2026-11-09:** (1) keep `house`/`job` on self; (2) accept `spud` and `paste`; (3) `heat` loses the set-on-fire arm (not objected to). The reasoning below is kept for review.

1. **`house` / `job` on `Persona` (D15).** The plan keeps them on self and
   says why; the direction asked for a revisit. The alternative (afford
   `house` from the house's counter, `job` from the board only) is a
   one-line change each but makes `house roster` unknown away from the
   premises. *Lens 7:* the seat is the authority, not a thing in hand.
2. **The two rung-5 words, `spud` and `paste`.** Each has its four failures
   written in the word table. If the owner would rather keep siting a well
   inside `bore` (state-decided) or pasting inside `fit`, the plan's rows
   for Bore and Fit fall back to rung 1 with a documented two-engine
   controller — against the one-controller-one-engine rule, so the plan
   recommends the words.
3. **`heat` losing the set-it-on-the-fire arm.** `put <pot> on <hearth>` is
   the honest act (an instant placement the world's clock then heats); the
   `boil` fold from !527 goes with it. A player who types `heat pot` is
   told to `put` it. If the owner wants `heat <vessel>` to remain a
   placement alias, it is a `defaultAliases`-style view that the one-word
   rule does not permit — hence the redirect.

**Risks the build should watch:**

- **The record half-lies on defects.** A W0 baseline row for a defective
  act records the defect; the fixing wave re-records it by name. A lane
  that re-records a row it did not intend to change is the signal the
  baseline exists for — stop and read the diff.
- **Reach widening changes outcomes.** D5 makes `reachable` find the
  flask in the open bag; a verb whose default scope was tuned against the
  old walk may now bind a different thing (`drink` your own flask over the
  table's). W2's retune table decides each; the baseline catches the rest.
- **Shape disjointness.** The `dry`, `watch`, `tune`, `config`, `embody`
  shape splits must pass `lint:verb-collisions`' range test; where ranges
  overlap, `prepositionRequired` is the tool, and where that fails the
  split is wrong and the row falls back to a subcommand.
- **Sibling merges.** material-decomposition edits read sites inside
  blocks this build moves (SmeltController, Dye, Mordant, Rive, Wash,
  Pour, Dose, Throw, Paint, Survey); documents-path-identity edits
  `HeatController:176` (gone here), `ShapeController`, `OperateController`,
  `StokeController`, `SipController`, `PressController`, `CastController`,
  `StudyController`. Whichever merges second re-greps those files; the
  lane briefs name them.
- **`Butcherable` on one class.** Flagged in host placement; a one-line
  fallback exists.
- **`look`'s move** is the largest single kernel change in W8; if the
  augmenter seam cannot carry the async self-reports, the plan's listed
  exception keeps them in the controller with a `controller-mutations`
  row, and the owner is told at review rather than the seam being
  invented mid-wave.
- **The client's quote hint.** A small client change (W5) in a build that
  is otherwise server-side; if `packages/client` is in flight elsewhere
  (broadcast-ready, build-3), land the hint as text first and the tappable
  form after.
- **Teleport fork 1** (free move inside a held extent) is design-level and
  needs the drive to confirm the unit tests' `model.destination` shortcut
  hides it; W7a's board/means split is where it is looked at.

---

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **The consent gate** (`bleed`, and every act one body does to another):
  `Vitals.drawBlood(litres, by)` takes the actor and writes the record;
  the predicate that decides consent before the act does not exist and is
  the compulsion-gate security build's → `call-security-pass-slate` (the
  memory rule *compulsion gate = separate security build*).
- **Lists in MQL** (`get apple and pear`; a view's declared plurality) →
  `mql-lists-slate.md`.
- **The carrying flip** (`:held` narrowing to hands; every `depth:`
  default retuned; `reachable` re-measured; the card's hidden pockets) →
  `size-slate.md` § 9.
- **The audit rail** (`@Audited`, `audit_events`) as the compensating
  control for *possession is capability* → `call-security-pass-slate`.
- **Dose's licensing** (*competent in medicine = licensed* judges a
  person; lens 7 wants the criterion, the appeal and the tier) →
  `moderation-slate` / the medicine doc's open questions.
- **The controller-adoption process** (how the Compact adopts a
  player-proposed controller) → raised for the owner in the requirements'
  lens 7 gap; no slate yet.
- **Async augmenters for `look`'s self-reports** if W8's listed exception
  is taken → `one-resolution-rule-slate` § 2 (already carries the six
  arms).
- **A `defaulted` flag on `MqlOneResult`** (Pour's `startsWith('reachable:')`
  wants to know whether an arg was defaulted) — one field, but it is the
  binder's and nothing here needs it after Pour moves; → noted in
  `controllers-are-io-slate` § Deferred if a second consumer appears.

---

## Critical files

Read first, in this order:

1. `docs/requirements/controller-liquidity-requirements.md` — the product
   half; `docs/slates/builds/controller-survey/README.md`,
   `multihead-scan.md`, then the shard for the pack in hand.
2. `packages/server/src/mud/api/command.ts` (L817–1331),
   `packages/server/src/mud/lib/command/command.schema.json`,
   `packages/server/src/mud/lib/command/CommandDefinition.ts`,
   `packages/server/src/mud/platform/idea/api/CommandLogic.ts` (assemble
   L999–1190; bind L1535–1762; `bindPositionalsImpl` L2817–3062;
   `parseRequirement` L3458–).
3. `packages/server/src/mud/api/mql/resolver.ts` (L365–524, L1168–1299),
   `api/mql/scope-walk.ts`, `api/mql/predicates.ts`,
   `platform/idea/api/PerceptionLogic.ts` (L315–391, L596–637, L1430).
4. `packages/server/src/mud/lib/craft/ActPlan.ts`,
   `lib/command/EngagedActController.ts`,
   `platform/idea/cmd/crafting/ManualBuildController.ts` (L169–217),
   `lib/command/CommandGiver.ts` (L1190–1320, L1685–1754),
   `api/security.ts` (L1525–1567).
5. `packages/server/src/mud/lib/craft/Cuttable.ts` and its seven
   implementers; `platform/idea/cmd/inventory/HarvestController.ts` +
   `HarvestWordedController.ts`; `lib/husbandry/Soil.ts` (L1130–1165),
   `lib/husbandry/Growing.ts` (L1570–1625).
6. `packages/server/scripts/pack-roots.ts` (L405–488),
   `check-controller-functions.ts` (the gate template),
   `check-completion-this.ts`, `check-reachability.ts` (L870–905, L1240–1260).
7. `packages/wire/tests/controllers-are-io.dirty.wire.test.ts` (L1–165,
   L1026–1080, L1340–1440); `e2e/tests/controllers-are-io-walk.spec.ts`.
8. `docs/subsystems/command-spec.md` (§ Subcommands, § Options, § greedy,
   § Alternate controllers), `command-routing.md`, `mql.md`,
   `docs/mql-grammar.md`, `call-security.md` (§ participant contracts,
   L1120–1160), `access.md`, `response-envelope.md`, `activity.md`,
   `docs/lint-family.md` (§ census then ratchet, § the controllers-are-io
   gates), `docs/antipatterns.md`.
9. `/home/bobalu/.claude/jobs/2eb60486/tmp/survey/rows.json` — the
   machine worklist (516 rows: `ctl, lines, rule, pres, coord, parse,
   heads, worst, notes`).

---

## Appendix A — the 75 multi-act controllers (+2 unclear), rung by rung

Columns: controller (pack) · the heads the survey found · today's forms
(from the view, verified) · rung · what the build does · visible change.
"→ verb" under rung means a head retires into an existing verb's act.

| controller | heads | today's forms | rung | the build does | visible |
|---|---|---|---|---|---|
| StallController (terminus) | rent / give-up | `stall rent` · `stall give-up` (TS switch) | 3 | `StallRentController` + `StallGiveUpController` over `StallControllerBase`; logic → `MarketStalls.let/giveUp`; goods handed back | none |
| BoreController (trade-drilling) | site a wellhead / swing the bit | `bore [<hole>] [with <rig>]` (state-decided) | **5** | `spud [with] <rig>` → `Wellhead.siteAt`; `bore <hole>` → `Wellhead.swingPlan` | `spud` |
| PloughController (trade-farming) | clear a tract / plow a field | `plow [with <tool>] [at <part>]` | 1 | `Soil.plowPlanFor(actor, tool)` — a tract's plan is the clearing, a field's the seedbed | none |
| FellController (trade-forestry) | fell standard / fell planted / crosscut bole | `fell <target> [with <axe>]` | 1 + → `cut` | `Fellable.fellPlanFor` on the stand and the planted tree; `cut <bole>` crosscuts; spend at engagement start | `fell log` → `cut log` |
| CharController (trade-fuel) | light the burn / adjust draught | `char [at <clamp>] [<draught>]` | 1 + → `draught` | `CharcoalPit.lightPlan`; `draught <clamp> <setting>` | `char 0.5` → `draught clamp low` |
| HouseFreightController (trade-haulage) | freight / traffic | `house freight` · `house traffic` (`if`) | 3 | two controllers | none |
| MillController (trade-milling) | extraction grind / recipe grind (two engines) | `mill <grain> [<extraction>] [at <mill>]` | 1 | `Comminuting.millPlanFor(source)` one engine; the hopper takes the grain | none |
| HewController (trade-mining) | win ore / bar down a fallen face | `hew [<face>] [with <tool>]` | 1 | `Working.hewPlanFor(face)` returns the barring plan when fallen | none |
| StakeController (trade-mining) | underground block / surface working | `stake [<block>] [at <register>]` | 1 | `ClaimsRegister.stakePlanFor(actor, where)`; owner compared | none |
| PrintController (trade-printing) | pull a forme on a press / print on a printer | `print <what> [on <press>]` | 1 | `Printing.printPlanFor(what)` on Press and Printer; the `on` arg renamed | none |
| HouseShopController (trade-shopkeeping) | par / price / stock | `house par` · `price` · `stock` (TS switch) | 3 | three controllers over `HouseControllerBase` | none |
| QuenchController (trade-smithing) | finish a build / heat-treat a bare piece | `quench [<target>] [on <anvil>]` | 1 | `Quenchable.quenchPlanFor` on ManualBuild and the hot piece | none |
| TanController (trade-tanning) | lay in / check on it | `tan <hide> [in <pit>]` (repeat = check) | 1 + → `look` | one act; the pit's describe reports progress | `tan hide` (check) → `look pit` |
| BerthController (transport) | berth at quay / send to roads | `berth <ship> at <quay> [in <book>]` | 3 | `berth <ship> at <quay>` (fallthrough) + `berth roads <ship>`; both on the harbor book | `berth roads` |
| JourneyController (transport) | set off / status readout | `journey [to <dest>] [via <x>]` | 4 | `JourneyStatusController` on the bare shape | none |
| CloneController (author) | mint from template / seed a live copy | `clone [<template>] --mql --into --here --count --instance --fresh` | 2 | one controller; the live copy is `--from <obj>` (a manner); copies 2..N report placement errors | none |
| PackSyncController (author) | sync / staff | `pack sync <id>` then a prompt | 3 | `pack staff <id> <person>` (object arg, identity-keyed) | `pack staff` |
| PlayerController (author) | name / pronouns / show | subs, TS switch | 3 | three controllers | none |
| WizardController (author) | grant / revoke | subs, `if` | 3 | two controllers; `shell.result` on success | none |
| BankBookController (banking) | what my house owes / what the bank holds | `bank book` | 1 | the book answers for the asker | none |
| BankingControllerBase | (base: seat dials, payee resolution, finance credit, talk) | — | n/a | the dial write → `AppLogic.setSetting(actor…)`; payee/house resolution → view args + model; stays a base of words | none |
| HouseController (banking) | book / pnl / payroll / roster | four subs on the view-level switch | 3 | four controllers over `HouseControllerBase` | none |
| PayController (banking) | pay a person / settle a bill | `pay <recipient> [<amount>] --cash --from` | 1 | `Payee.paymentPlanFor(amount?)` on a person and a `Payable` | none |
| ReserveController (banking) | dashboard / supply / set / override | subs, switch | 3 | four controllers; `priceIndex` once | none |
| TreasuryController (banking) | book / appropriate / set | subs, switch | 3 | three controllers; typed banking refusals | none |
| WalletController (banking) | show / use / freeze / beneficiary | subs, switch | 3 | four controllers; freeze refuses with no account | none |
| OpenController (boundary) | open / work a throttle | `open <target> [to <setting>]` | 1 | `Openable.openPlanFor(setting?)` — Bistate and Throttleable answer; `values:` on `setting` where the host's are closed | none |
| EmbodyController (chargen) | edit the draft / commit | `embody [<rest>…]` | 4 | `EmbodyEditController` (with args) + `EmbodyController` (bare commit); clone-then-roster; `setSex` refusal surfaced | none |
| GovernmentController (civics) | list / residency | subs, switch | 3 | two controllers | none |
| TitleTransferController (civics) | parcel / share sale / share gift | `title transfer <parcel> [to <x>] [from <y>] [for <price>] --group` | 1 (+2) | the thing transferred answers (registry or cap table); `for <price>` is the sale; receiver keyed on identity | none |
| DefendController (combat) | cover / stay a coup / interpose | `defend [<target>]`; `fight defend` | 1 | `Combatant.defendPlanFor(target?)`; the formation answers the coup stay | none |
| CarveController (crafting) | Carvable plan / recipe fallback (two engines) | `carve [<thing>] [on <target>] [from <stock>] --with --of --for` | 1 | one planner: a default `Carvable` plan on wood stock | none |
| DryController (crafting) | hang up to dry / rub dry | `dry <target> [on <rack>] [with <cloth>]` | 4 | `dry-rub.yaml` (`with`, prepositionRequired) + `dry.yaml`; `Drying.dryingProspect` for Moist vs Wet | none |
| FitController (crafting) | paste a label / raise / fit by line / fit a part | `fit [<thing>] [to <whole>] [with <tool>]` | 1 + **5** | assembly is one act (`CraftingApi.fit`); `paste <sheet> on <whole> [with <pot>]` | `paste` |
| HeatController (crafting) | hold a tool / set a vessel on the fire / heat a build | `heat [<target>]` | 1 + → `put` | `Heated.takeHeat` on three hosts; the placement is `put … on` | `heat pot` (to set) → `put pot on hearth` |
| StirController (crafting) | knead-plan / churn / stir a build | `stir [<vessel>]` | 1 | `Agitated.agitatePlanFor`; the two duration constants go | none |
| WashController (crafting) | hands / things / bathe | `wash [<target>] [in <water>] [with <cleanser>] [using <brush>] --hard` | 1 | `Washable.washPlanFor(spec)`; hands are the body's faces; `--hard` stays a manner | none |
| StoreController (custody) | deposit / withdraw / receipts | subs, switch | 3 | three controllers | none |
| DraughtController (device) | read the dial / set the dial | bare + five stanzas (`wide…banked`) | 4 + grammar | `DraughtReadController` (bare) + `DraughtSetController` with `setting` `values: [wide, open, half, low, banked]`; the table is `Burner`'s vocabulary | none (typed forms identical) |
| TipController (employment) | cash into jar / EFT | `tip <amount> --eft` | 2 | one act; typed refusal; fall through only on `insufficient-coin` | none |
| OfficeController (governance) | assign / vacate / list | subs, switch | 3 | three controllers; the assign reason | none |
| EquipSetController (inventory) | save a set / wear a set | `equip set <name> [--save]` | 3 → a verb (W16) | `outfit wear <name>`; `outfit save <name>`; `outfit list` | `--save` → `save`; `equip set` → `outfit` |
| LabelController (inventory) | annotate / mark one plant out | `label <target> [<text>] [at <part>]` | 1 | `Labelled.labelPlanFor(text)`; the stand marks one out; the `at` re-glue goes | none |
| SampleController (inventory) | stem / piece / chip the face | `sample [<subject>] [at <part>]` | 1 | `Sampleable.samplePiece(actor, part?)`; host order is the hosts' | none |
| SweepController (inventory) | floor / grate / flue | `sweep [<target>] [with <tool>]` | 1 | `Sweepable.sweepPlanFor` | none |
| DoseController (medical) | antidote / administer an active | `dose [<patient>] [with <x>] [<prescription>]` | 1 | `Metabolic.dosePlanFor(substance, prescription?)`; the substance decides | none |
| BelayController (movement) | belay a person / belay off | `belay <person> [with <rope>]`; `belay off` | 1 + → `untie` | one act; `untie <rope>` releases | `belay off` → `untie rope` |
| CourseController (movement) | readout / sea / alongside / bar / river / small boat | `course [<heading>] --leaving-them` | 1 + 4 | `CourseReadoutController` (bare); `Frame.planCourse` for every steer incl. coming alongside; `mayLeave` last, written by `Ship.steer` | none |
| TeleportController (movement) | board read / free move / ride / anchored cast | `teleport [<dest>] --channel --meter` | 1 + 4 | `TeleportBoardController` (bare at a node); the node's `ridePlanFor`, the extent's free arrival, the spell's plan — the controller asks in order (coordination); completion static | none |
| AssessController (perception) | combat read / medical examination | `assess [at <target>]` | 3 | `assess <patient>` medical; `fight assess <target>` the exchange-spending read | `assess <foe>` in a fight → `fight assess` |
| FeelController (perception) | ambient / surface / detail | `feel [at <target>]` | 1 | presentation of one perception act (look's sibling) | none |
| RingController (perception) | tap for soundness / strike a bell | `ring <target>` | 1 | `Ringable.ringPlanFor` — a pot sounds true or cracked, a bell signals | none |
| SurveyController (perception) ⛔ retired W17 → `analyze rooms` · `analyze condition` · `measure paint` | purpose / fabric / upkeep / floor | `survey [<target>]` | 1 | `Surveyed.surveyFor(viewer)` on Location and Structure | none |
| CockpitCardController (shell) | list / pin / dismiss / auto / move / shrink | `cockpit card <action> [<id>] [<col>] [<row>]` | 3 (nested) | stanzas under `card`; `values:` where closed | none |
| CockpitShelfController (shell) | list / pin / unpin / first | `cockpit shelf <action> [<row>]` | 3 (nested) | stanzas; `row` `values:` = `SHELF_ROW_IDS` | none |
| LayoutController (shell) | recall / save / forget / list | `cockpit layout <name> [<target>]` | 3 (nested) | `list · save <n> · forget <n> · recall <n>` + fallthrough recall | a layout named `list` via `recall` |
| SettingsController (shell) | list / get / set / unset / describe | subs, switch | 3 | five controllers | none |
| StyleController (shell) | show / theme / channel / mention / plain / links / reset | `cockpit style <sub> [a] [b] [c]` | 3 (nested) | stanzas; theme names `values:` | none |
| VarController (shell) | list / set / unset | subs, switch | 3 | three controllers | none |
| ContactsController (social) | add / remove / show / list / clear / rename | subs, switch | 3 | six controllers; names from the identity substrate | none |
| NotifyController (social) | list / show / set / reorder / remove | `notify [<ref>] --flags`; `notify remove` | 3 | `notify` · `show <ref>` · `set <ref> --…` · `move <ref> --above/--below` · `remove <ref>` | `notify bob --login` → `notify set bob --login`; `notify bob` → `notify show bob` |
| SoulEditController (social) | per-field edits | `soul edit <verb> <field> <value>` | 1 + grammar | `field` `values:`; `SoulCatalogue.edit` merges | none |
| SubjectController (social) | make / list | subs, switch | 3 | two controllers | none |
| StreamController (stream) | away / back | subs, switch | 3 | two controllers; `away <duration>` typed | none |
| TuneInController (stream) | follow / post / list | `tune <target> [<message>]` + subs | 4 | `TuneFollowController` (arity 1) + `TunePostController` (arity 2); `serviceHandle` refuses aloud | none |
| WatchController (stream) | watch a stream / drive a screen / horizon watch | `watch <target> [on <screen>]`; `watch horizon` | 3 + 4 | `horizon` stanza; two shapes by `on` | none |
| CommitteeController (system) | show / channel | subs, switch | 3 | two controllers | none |
| ConfigController (system) | list / show / set | `config [<key>] [<value>]` | 4 | three shapes by arity; Tier C on the model | none |
| ErrorsController (system) | list / raw / clear | subs, `if` | 3 | three controllers; `rawTail(reader)` | none |
| GitController (system) | status / diff / log / publish / revert | subs, switch | 3 | five controllers | none |
| HelpController (system) | landing+topic / verb / api / search | subs, switch | 3 | `HelpTopicController` (bare + topic) + three | none |
| PressController (system) | read / post / edit / retract | `press <headline>` + subs | 3 | `PressReadController` (bare) + three; caps on `PressLogic` | none |
| TestHarnessController (system) | clock / weather / ship | subs, switch | 3 | three controllers (test-world only) | none |
| WikiEditController (system) | frontmatter / prose | `wiki edit <page> --title --tag … ` | 2 | one act; body first, one write | none |
| JobBrowseController (work) | board / backhaul | `job [on <board>] --origin` | 2 | a manner (filter) | none |
| **SawController** (trade-carpentry, unclear) | pit vs mill (two engines) | `saw <log> [at <saw>] --quarter --through` | 1 | `Sawmill.sawPlan(log, {quarter})` one engine; `setSawing` on both paths; the two exports folded | none |
| **StandController** (posture, unclear) | stand on / haul out / stand up | `stand [on <target>]` | 1 | `acceptPosture` decides; the haul-out is HaulOut's | none |

**Base list** (24 `*ControllerBase.ts`, subclass counts): Wiki 17 · Party 15
· Chat 14 · Forum 11 · Locomotion 10 · Soul 8 · Pack 8 · Job 8 · Group 8 ·
Fight 8 · Bank 8 · Banking 7 · Tune 5 · Title 5 · Equip 5 · SingleSense 4 ·
House 4 · HeldGoods 4 · Unequip 3 · TitleBook (residence) 3 · Throw 3 ·
SwimVertical 2 · Record 2 · Profile 2. W7a adds: Stall, Player, Wizard,
Reserve, Treasury, Wallet, Store, Office, Government, Settings, Var,
Contacts, Subject, Stream, Committee, Config, Errors, Git, Help, Press,
TestHarness, Notify, Draught, Journey, Course, Teleport, Embody (each a
base only where two or more subclasses share words).

## Appendix B — the 44 protocol candidates

All rung 1; no word changes. "rides" names the existing protocol or the
new one from § New substrate.

| controller | hosts that differ today | rides | note |
|---|---|---|---|
| MaintainController (residence) | Building / Ship (kit words by `instanceof Ship`) | the residence upkeep mixin's `upkeep(kit)`; the host supplies its kit noun (`kitNoun()`) | verify the mixin's name in the pack at W13 |
| DyeController (trade-dyeing) | mordant chemistry / vat chemistry | `DyeBath` (new, pack lib) | |
| FishController (trade-fishing) | spear / rod | the pack's `TakesFish` (spear already; the rod implements it) | |
| IceActController (trade-ice base) | groove / scrape | `IceSheet.groove/scrape` methods (one host) | the base stays as words |
| TransfuseController (trade-medicine) | saline / blood unit | `patient.receiveBlood`'s plan reads the payload — no `Transfusable` minted | completion static (W0) |
| AssayController (trade-mining) | kit / bench | `Assaying` (new, pack lib) | samples into the bench at dispatch |
| HammerController (trade-smithing) | workpiece / bloom / die | `Hammerable` (new, pack lib) | |
| LaunchController / RecoverController (transport) | SeaWarren / ReachWarren (duck-typed) | `Launchable` (new, kernel) | |
| WaterController (bulk) | soil / plant (and Feed, its twin) | `Soil.amendPlanFor({water|material, zone})`; Growing delegates to its bed | two thin controllers |
| ChronicleController (chargen) | person / institution | `ChronicleMixin.recordFor(viewer)` with the privacy predicate the subscription gate uses | |
| CutController | rope / loaf / ice / cloth | `Cuttable` (kept for `cut`) | cloth options → the tailoring planner's stanza |
| DipController | coat / candle / gather / sheet | `DipBath` (exists) | the sheet's `face` arg is meaningless to it — the papermaking vat's row drops it (hard case 2 noted, not acted on: the candle's melt stays inside the chandler's one motion) |
| KneadController | — | `KneadVessel` (exists; becomes `Agitated`'s Compounding implementation) | clean |
| ShapeController | wheel / table / blowpipe | `Forming`/`Shapeable` (exist) | clean |
| DouseController / LightController | lamp / candle / fire / torch | `Combustible.extinguishPlanFor` / `ignitePlanFor` (new methods on the existing mixin; `LightSource` delegates) | |
| PumpController | pump / bellows / air pump | `Pumpable` (exists) | clean |
| SplitController (ground) | wheel / block / hive | `Splittable` (exists) | clean |
| PlantController | pot / bed / field | `Cultivable.plantPlanFor` / `sowPlanFor` | |
| PullController | water haul-out / others | `HaulOut.pullOut` + the other hosts' `pullPlanFor` | |
| PutController | slot / interior / placing region | `ContainmentApi.move`'s `canPlace` carries the rule; controller words `PlaceRefusal` | the one Api-orchestrated case (movement) |
| TieController | rope / hose / line end | `Tieable` (exists; `line` strings → reasons) | |
| WriteOnController | sheet / page / surface | `Marked.writeOn(words, page?)` | |
| CoolController / RinseController / WarmController | water / shore / fire | `Vitals.treatmentPlanFor` tokens + `WaterSource.drawWaterFor` | Cool's missing shore branch goes with it |
| AnchorController | small craft / ship | `Anchoring` (new, kernel) | |
| HitchController | self / beast as hauler | `Hauler.hitchPlanFor(cart, actor)`; `Haulable.canHitch(hauler, actor)` on the interface | |
| UnhitchController | cart / hauler | `Hauler.unhitch(by)` / `Haulable.canUnhitch(actor)`; view `requires: [VisibleMixin]` | fixes `unhitch horse` |
| SwimController | shore / water surface | `WaterEntry` (new, kernel) | |
| ReadController | screen / marks / page | `Readable` (new, kernel) | |
| LieController | bed / water surface | `PosturedMixin.acceptPosture` (exists) | |
| MenuController | tariff / menu board | `PricedOffer.offerings()` | |
| OrderController | — | `PricedOffer.orderPlanFor` (exists) | the confirm-on-quote fork keys on `plan.needsConsent`, not on `kind` |
| CatController / LsController / GrepController / MkdirController / CpController / MvController / RmController / WriteController | template / document / source backends | `SourceTreeApi`/`DocumentApi`/`TemplateApi` ops with `canAtPath`, limits, subtree ops (W3) | the tree is not a Stuff; Api orchestration is right here |
| NameController | a thing / a kept animal | `NamedMixin.takeName(name, by)`; `Bonded` overrides with the promotion | |

## Appendix C — the defect ledger (every survey defect: confirmed → the wave, or dropped with its reason)

Current lines at `2ce973dfb`. **52 confirmed and fixed, 2 reclassified,
2 not defects, 1 design-level (drive).** Nothing dropped without a line.

| # | where (current) | finding | verdict | wave |
|---|---|---|---|---|
| C1 | residence `TitleBuyController` settle L147 → `ParcelApi.subdivide` L161 (registry throws L325/349) | money before a refusable write | confirmed | W13 (`PlatBook.sell`) |
| C2 | cooking `ButcherController` L310–316/L358/L388/L409 | exemplar index misaligned with `dressOut`'s dropped lines → wrong cut | confirmed | ✅ W6 (exemplar by cut path) |
| C3 | `ButcherController` L154; `butcher.yaml` L117–123; L84/L109 | dead `vessel` arg; blade/tools share prepositions | confirmed | W10 |
| C4 | eternal-university `UnprovisionController` L90/L92 vs `UnleaseController` L85 | no `evictToStorage` before the unit is dropped | confirmed (loss mode by drive) | W13 (`DormWarren.endLet`) |
| C5 | terminus `StallController` L251–256/L264 | counter destructed with the goods when the giver is not a Container | confirmed | W13 |
| C6 | carpentry `SawController` L142/L229/L249–262/L355 | pit path never `setSawing`; silent no-op after effort | confirmed | W11 |
| C7 | medicine `TransfuseController` L77–81/L128–151 → L221 | completion on a destroyed controller | confirmed | **W0** |
| C8 | drilling `LineController` L73/L111/L128 (L39 dead) | liner unvalidated; destroys whatever binds | confirmed | W12 (`Bore.canLine`) |
| C9 | dyeing `MordantController` L50/L64/L95 | mordant is a free string; nothing consumed | confirmed | W11 |
| C10 | medicine `BleedController` L43–45; no tool; L80–81/L105–108 | no consent gate; tool never required; no capacity | confirmed (consent predicate absent → D9) | W3 |
| C11 | fuel `CharController` L64; L70–71; L155–158 | draught written before refusals; any attention engagement = adjusting; non-engaged completes instantly | confirmed | W9 |
| C12 | forestry `FellController` L210/L230/L298; `RiveController` L126 | endurance spent before the engagement can refuse | confirmed (Rive partial) | ✅ W6 (spent in the completions) |
| C13 | fishing `LayController` L24/L64–66 | trap filled with fresh water whatever the reach | confirmed | W12 |
| C14 | glass `GlazeController` L40 | overwrites existing glazing | confirmed | W12 (`Window.canGlaze`) |
| C15 | medicine `DonateController` L68/L75 | "your blood" for anyone's unit | confirmed | W13 |
| C16 | mining `DriftController` L211–212, `ShoreController` L130 (`MineWarren.ts` L121) | holder keyed on lineage | confirmed | W9 |
| C17 | milling `MillController` L131/L189–192/L448/L543 | water path never takes the grain; free flour | confirmed | W10 |
| C18 | mining `AssayController` L148/L368/L371; L141/L284–286; L273–280 | samples not handed over; fee exempt for any business; any on-shift employee is the assayer | confirmed | W9 |
| C19 | ranching `DraftController` L60–64/L328; `SlaughterController` L120–195; `BreedController` L101–129 | no keeper gate; no ownership/blade; no sex check | confirmed | W3 (`mayKeep`) + W10 |
| C20 | mining `DrainController` L83–91/L103 | `no-gas`/`not-sealed` after the 30 s pump | confirmed | W9 |
| C21 | sugar `ClayController` L33; mining `StakeController` L139–143 | reason collapses to `'refused'`; "not yours" for your own block | confirmed | W10 / W9 |
| C22 | tailoring `SewController` L137 | maker keyed on lineage | confirmed | W11 |
| C23 | textiles `WeaveController` L79 | `endsWith('/yarn')` path test | confirmed | W11 |
| C24 | author `GotoController` L84–85/L89/L105–110 | fallback never detaches a hitched mover; broken sentence | confirmed | ✅ W8 |
| C25 | author `PackSyncController` L35–44 | raw name as member path | confirmed | W7b (`pack staff`) |
| C26 | author `WizardController` L82–87 | success on `shell.error` | confirmed | W7a |
| C27 | water `PilotController` L53 → L62 → L68 | fee before the claims | confirmed | W12 |
| C28 | author `CloneController` L185–187 | copies 2..N swallow a placement error | confirmed | ✅ W8 |
| C29 | textiles `ScutchController` L218/L227–228, `SpinController` L219 (consume L171), `WeaveController` L167 (consume L143) | mint failure after consume is a `console.warn`; "You get ." | confirmed | W11 |
| C30 | bulk `WaterController` L153 → L155 | water to the null sink before the ground is asked | confirmed | W3 |
| C31 | chargen `TraitsController` L36–40 | bare list bodies (Chronicle fixed the same) | confirmed | ✅ W8 |
| C32 | banking `TreasuryController` L108–115; `HouseDrawController` L61–63 | refusal by regex on a message | confirmed | W7a / ✅ W8 (draw) |
| C33 | banking `HouseDismissController` L63 vs `HouseAppointController` L92 | `findByTemplatePath` vs `singleton` | confirmed | ✅ W8 |
| C34 | banking `WalletController` L234–240 | freeze with no account says a card was issued | confirmed | W7a |
| C35 | chargen `EmbodyController` L715–716 → L721; L735–739 | roster before clone; `setSex` swallowed | confirmed | W3 / W7c |
| C36 | bulk `SipController` (no `settle`; Drink L55, Fill L72 do) | unsettled read | confirmed (asymmetry) | ✅ W8 |
| C37 | banking `ReserveController` L78/L83/L96 | `priceIndex()` printed per currency | confirmed | W7a |
| C38 | medicine `OperateController` L224–230 (`OperationEngagement.ts` L107–119) | patient hold's abort is a no-op; surgery carries on | confirmed | W13 (inside `OperationEngagement`) |
| C39 | `OperateController` L195–201 | direct `Trauma` field writes | confirmed | W13 |
| C40 | shell `AliasController` L154 (default L190) | `fail` without a reason | confirmed | ✅ W8 |
| C41 | smelting `SmeltController` L770–777 (vs `getCastTemplate` L899) | a template scan for what the Material answers | confirmed | W9 |
| C42 | `EquipControllerBase` L191 → L743 → L199 | `--from` moves before `canEquip` | confirmed | W3 |
| C43 | `EquipControllerBase` L519 vs L215 | `already-worn` unreachable | confirmed | ✅ W8 |
| C44 | `EquipControllerBase` L721/L303/L465/L367 | bare `equip` pools worn items | confirmed | ✅ W8 |
| C45 | employment `CollectController` L36/L55–58; `TipJar.ts` L21–36 | any jar on your own premises | confirmed (narrower than surveyed) | W3 |
| C46 | employment `TipController` L69–79/L142–145 | any settle failure → EFT; raw exception text | confirmed | W7c |
| C47 | governance `OfficeController` L89–95 | every `!ok` is "No such office" | confirmed (one reachable case) | W7a |
| C48 | ground `LimeController` L91 (quicklime `Lump` is Stackable) | destructs the whole stack | confirmed | ✅ W8 |
| C49 | inventory `OfferController` L119 (`Bonded.ts` L175–178; envelope `CommandGiver.ts` L280–299) | hidden reason reaches the wire | confirmed | W3 |
| C50 | `ThrowAtController` L78–84; `Combatant.ts` L609/L620/L621 | on wide/hit the item stays in hand | confirmed | ✅ W8 |
| C51 | `ThrowControllerBase` L24–29; `ThrowController` L22 | no slot release | confirmed | ✅ W8 |
| C52 | movement `CourseController` L88/L229; `mayLeave` L269–291 (`Ship.ts` L432–433) | abandonment recorded and overboard cleared before the heading resolves | confirmed | W3 |
| C53 | `UnequipControllerBase` L113–116/L183/L201/L217–224 | the strip's start result ignored; one layer's clock | confirmed | ✅ W8 |
| C54 | medical `CoolController` L114–123 vs `RinseController` L131–160 | drift between copies (no shore branch, no settle) | confirmed | ✅ W8 (`WaterDrawable`) |
| C55 | inventory `LabelController` L184–189 | silent return | confirmed | W7c |
| C56 | perception `SearchController` L70/L82/L93 | completion on a destroyed controller | confirmed | **W0** |
| C57 | movement `TeleportController` L320–322/L337/L345 | completion on a destroyed controller | confirmed | **W0** |
| C58 | `TeleportController` L92–98; `teleport.yaml` L64; `resolveAnchored` L416–430 | free move inside a held extent rarely binds | **design-level — the drive decides** | W7a looks; W15 step 10 |
| C59 | movement `UnhitchController` L48–49; `unhitch.yaml` L23; `DraftAnimal.ts` L57 | `unhitch horse` refused at bind | confirmed | W3 |
| C60 | `LocomotionControllerBase` L313–327 | refusal at arrival writes no note | confirmed (minor) | W8 → deferred (scheduler seam, W8 note f) → `controllers-are-io-slate` § Deferred from controller-liquidity |
| C61 | retail `RackCheckController` L79; `rack.yaml` L35–36 | TypeError on a non-weapon | confirmed | ✅ W8 |
| C62 | shell `CpController` L61–65, `MvController` L52–68, `WriteController` L271–278 (`AccessRegistry` L136–148) | `can(…, null)` always false | confirmed | W3 (`canAtPath`) |
| C63 | retail `ShelfConsignController` L143–180/L242–244 vs `HeldGoodsControllerBase` L82–88 | consignable but never reclaimable (parent-org title; released id) | confirmed (premise corrected) | W3 |
| C64 | shell `LayoutController` L66–74; `SaxonbergClient.ts` L834–868 | a layout named `list` unrecallable | confirmed | W7b |
| C65 | shell `RmController` L79–106 | `-r` checks title on the root only | confirmed | W3 |
| C66 | shell `MvController` L76–91 (hook refuses the delete, `TemplateLogic.ts` L265–286) | **reclassified**: no orphans — dst written before the refusing delete leaves a stray duplicate | reclassified, fixed | W3 |
| C67 | social `IntroduceController` L75 | recognition read by lineage | confirmed | W3 |
| C68 | social `ChatAnonymityController` L46–56; `ChannelCatalogue` L691–702 | fail-open owner gate; model ungated | confirmed | W3 |
| C69 | social `ChatRenameController` L78–99; `ChannelCatalogue` L704–731 | no owner/kind check anywhere | confirmed | W3 |
| C70 | social `GroupRemoveController` L15/L24, `GroupRoleController` L18/L28 vs `GroupAdd` L37 | raw string against identity paths | confirmed | W3 |
| C71 | social `GroupRenameController` L19–25 | no duplicate check; `matches[0]` | confirmed | ✅ W8 |
| C72 | social `SoulEditController` L25–32; `SoulCatalogue` L317 | grammar slots wiped | confirmed | ✅ W8 |
| C73 | social `ContactsController` L315–328/L238/L176–189 | raw playerIds; remove by name never matches | confirmed | W7a |
| C74 | social `ForumVoteController` L27–38 (also Reply L23–25, Edit L23–27) | audience gate fail-open | confirmed | W3 |
| C75 | social `PartyControllerBase` L47–50 | NPCs keyed on lineage; two key schemes | confirmed | W3 |
| C76 | stream `TuneControllerBase` L125–141 (+ four callers) | silent `{ok:false}` | confirmed | W7a |
| C77 | stream `WatchController` L249–280; L178–191/L211–219 | follows chat after a refused screen | confirmed | W7b |
| C78 | system `ErrorsController` L92–107; `diagnostics.ts` L142–149 | PM gate only in the controller | confirmed | W3 |
| C79 | system `ConfigController` L76–83; `AppLogic.ts` L85–91 | Tier C only in the controller | confirmed | W3 |
| C80 | system `PressController` L168–182/L257–275/L378–391; `PressLogic.ts` L437–449 | caps only in the controller | confirmed | W7a |
| C81 | system `WikiEditController` L48 → L78 → L88/L96 | frontmatter saved before the body prompt | confirmed | W3 |
| C82 | `WikiRegistry.ts` L235–246; `WikiPage.ts` L190 | ungated unredacted revisions | confirmed (by design, still a leak) | W3 |
| C83 | work `JobApplyController` L84–93; `Organization.ts` L562–573/L638–650 | criteria separate from `appoint` | confirmed (partial: `appoint` is the governor's) | W3 (`Organization.apply`) |
| C84 | system `PracticeController` L62 | silent no-op | confirmed | ✅ W8 |
| C85 | `job.yaml` L59–70/L91–95 vs `JobPostController` L118–130/L150–180 | help omits `watch`/`recover`; contradicts the template | confirmed (content) | W13 |
| C86 | `GrepController` L45–54/L95–137 | no limits; raw regex | confirmed | W3 |
| C87 | `EvalController` L181–224 | a hand copy of the access decision | partial (duplication) | W3 |
| C88 | `LockController`/`UnlockController` vs `Lockable.lock()` L177–183 | the mutator asks nobody | confirmed (by design) | W3 |
| C89 | `ChatHistoryController` L13–16 → `ChannelCatalogue.historyFor` L462–464 | no membership check | confirmed | W3 |
| C90 | GitLab #128 — `EmploymentLogic.settleSale` → `remitDemoTax` | a sale whose creditor's repayment share left the shop less than the sales tax threw at the ledger floor (`controller-error`) | confirmed (reproduced in `credit.test.ts`) | ✅ W14 (`Charge.taxableMinor`: `settle` keeps the tax with the payee; a creditor's share is of what is left; splits that leave less refuse `splits-exceed` before any leg) |
| C91 | terminus `MarketStalls.giveUp` (C5's square branch) | no test for a keeper who cannot hold things | confirmed | ✅ W14 (`stall.test.ts`) |
| C92 | smithing `SharpenController` | a module-level duration helper reading a setting | confirmed | ✅ W14 (`Keen.honeDurationMs`) |
| C93 | arcana `Cast`/`Zap`/`Recite`/`Recharge` | the magic Apis return prose; `recharge` cannot name its transfer spell | confirmed | deferred → `spellbook-slate` § 8 (a reason union over the faculty/band/impairment/suppression producers, and a `Charged` field + rows — kernel work beyond this build) |
| C94 | `PullOutcome` (six hosts, four packs) | words on the protocol, not reasons | confirmed | deferred → `controllers-are-io-slate` (a kernel union would hold pack words — lens 2, the `TravelNode.ride` call) |
| C95 | movement `CourseController` | the heading parse is read in the controller | not a defect (the decisions are Ship's/the frame's) | deferred → `controllers-are-io-slate` (`Frame.readHeading`) |
| C96 | crafting `Wash`/`Bathe` `findWater` | should ask `WaterDrawable` | verified done (W7c) | — |
| — | `HouseShopController` L196–205 (stock by the screen's principal) | **not a defect** — documented posture (L18–19, display.md) | dropped | — |
| — | `WhoController` L4–10 | **not a defect** — presence is public; lensing is `SocialApi.composeRow`'s | dropped | — |

(The numbering is the plan's; a wave's commit cites `C<n>`.)

## Appendix D — the controller-only gates (verdicts and hosts)

| # | item | verdict | gate moves to | the existing pattern it copies |
|---|---|---|---|---|
| 1 | `errors raw` | confirmed — `DiagnosticApi.rawTail` is an open static (`diagnostics.ts` L147–149) | `DiagnosticLogic.rawTail(reader, filter)` asking `CompactApi.holdsOffice(reader, 'prime-minister')` | the `FromModule('/api/diagnostics#DiagnosticApi')` family on the rest of `DiagnosticLogic` |
| 2 | `config set` Tier C | confirmed — `AppLogic.setSetting` L86–91 writes any key; a second writer at `BankingControllerBase` L84–96 | `AppLogic.setSetting(actor, key, value)` using its own `tierOf`/`seatFor` (L39–71) | `BankingControllerBase.setSeatDial`'s rule L84, lifted |
| 3 | wiki hidden revisions | confirmed (documented as "reads are ungated", still a leak) | `WikiRegistry.historyFor(reader, id)` / `revisionAtFor(reader, id, rev)` redacting via `WikiRenderer.redactSource` | `RenderCallers` already admits `FromTemplate('/platform/idea/WikiRegistry')` (`WikiRenderer.ts` L117–123) |
| 4 | `job apply` | partial — `appoint` is deliberately the house's act; the self-application has no model verb | `Organization.apply(applicant, key)` = `considerApplicant` + `appoint` atomically | `OrgCallers` / `SelfSubject(0)` (`EmploymentLogic.ts` L69–78) |
| 5 | forum audience | confirmed, fail-open (Vote L27–38, Reply L23–25, Edit L23–27) | `ForumsLogic.castVote/postThread/reply` resolve the subject and refuse `not-member`; null → refuse | `SubjectSubscriber.isAudienceMemberOf` L79/L192 |
| 6 | chat rename | confirmed — no check anywhere | `ChannelCatalogue.renamePlayerChannel(actor, old, new)` | `ChatDisbandController` L35's owner rule + `subjects.isAudienceMember` L258 |
| 7 | chat anonymity | confirmed, fail-open | `ChannelCatalogue.setAnonymity(actor, name, mode)` | same |
| 8 | `lock`/`unlock` | confirmed (explicit design: "the bolt's STATE and the keyway's AUTHORITY are two calls") | `Lockable.lock(by)`/`unlock(by)` refuse `no-key` when `!opensFor(by)`; the setter becomes `_setLocked`, `FromMixin`-gated | `Lockable.opensFor(mover)` L218 |
| 9 | `eval` authority | partial — a copy of `AccessRegistry.subjectOwnsAsPlayer`/`memberKeyOf` that will drift | `AccessApi.canAtPath(giver, 'eval', parcel)` (self-home-root rule into the registry) | `AccessApi.can/canAtPath` L122–136 |
| 10 | `grep` limits | confirmed — unbounded walk, raw `RegExp` | `SourceTreeApi.search(pattern, {maxMatches, maxBytes, deadlineMs})` + safe-regex | none (new, Api-level: the tree is not a Stuff) |
| 11 | `rm -r` | confirmed — root title only; nested parcels exist (`ParcelRegistry.subdivide` L299) | `TemplateApi.deleteSubtree(giver, path)` with per-descendant `canAtPath` | `AccessApi.canAtPath` |
| 12 | `bleed` consent | confirmed — and **no consent predicate exists** in vitals/blood/accountability | `Vitals.drawBlood(litres, by)`: tool required, capacity checked, the accountability record written when `by ≠ self`; the consent gate is a deferred seam | `TransfuseController`'s after-the-fact record (L140–146) |
| 13 | `slaughter`/`draft` | confirmed — `mayMove` is a private controller method (`MoveController` L144–166); `HerdRegistry` has no gate | `HerdRegistry.mayKeep(actor, herd)` asked by `draft`/`moveHerd`/the herdbook write | the body of `mayMove`, lifted |
| 14 | `collect` | confirmed (narrower: own premises, any jar) — `TipJar` has no house | `TipJar.houseOf()` + `collectBy(actor)` requiring `isOnShiftFor(house)` | `Employed.isOnShiftFor`, `HeldGoodsControllerBase.activeHouse` |
| 15 | `offer` reason leak | confirmed — every note reaches the wire (`CommandGiver.ts` L280–299) | `Bonded.wouldEat` → boolean outward; the controller notes `refused` | — |
| 16a | consign vs reclaim | confirmed asymmetry | `ConsignmentShelf.consignBy(actor, item, ask)` + `HeldGoodsMixin.mayDisposeOf` shared | `HeldGoodsControllerBase` L82–87 |
| 16b | `house stock` by screen | **not a defect** (documented) | — | — |
| 16c | chat history | confirmed | `ChannelCatalogue.historyFor(actor, id)` | `subjects.isAudienceMember` |
| 16d | `who` | **not a defect** | — | — |
| 16e | unhitch ownership | partial (neither hitch nor unhitch checks ownership; `canHitch` is duck-typed) | `Hauler.unhitch(by)` / `Haulable.canUnhitch(actor)` on the interface | `HaulageRig.canHitch` L112, declared |

The threat posture these moves sit in, for the reviewer: call-security.md
L1140–1147 — *possession is capability*; the gate prevents calling the
logic as an object you are not. What D9 adds is the **who-initiates**
decision on the method, so a replaced controller cannot skip it.

## Appendix E — the 133 greedy object args (W5 removes `greedy:` from each) — ✅ all closed in W5

**platform** (`packages/content/platform/content/platform/cmd/`): paint → pot,
brush · carve → thing, target, stock · cut → target, tools · dry → cloth ·
fit → thing, whole, tool · bathe → water, cleanser · impress → medium ·
splice → target, other · wash → water, cleanser, brush · repair → item ·
stoke → fuel, burner · bail → target, tool, vessel · cover → fire · pump →
target · turn → target · turn [back] → target · feed → part · water → part ·
drink → target · sip → target · fill → target, source · job → board · job
[post] → board · job [claim] → board · job [complete] → board · job
[abandon] → board · charter → book · write → surface, medium · tie → gear,
load · tear → thing · sweep → target, tool · inventory → target · untie →
target · strew → item · label → part · coil → target · dispose → midden ·
drop → targets · get → targets, source · put → item · seal → thing · sample
→ subject, part · brush → tool · store [receipts] → book · store [deposit]
→ book · store [withdraw] → book · trace [address] → location · rinse →
water · title [list] → desk · title [buy] → desk · title [transfer] →
recipient, holder · search → target · look → target · focus → fragment ·
read → target · analyze → subject, tool · query → set · measure → subject,
tool · show → screen · ring → target · readings → tool · belay → person,
rope · open → target · lock → target · close → target · unlock → target ·
order → subject · buy → counter · rack [reclaim] → rack · sell → counter ·
rent → boat, book · shelf [reclaim] → shelf · find → query · stand → target
· kneel → target · lie → target · sit → target.

**packs:** trade-sericulture unwind → tool · trade-drilling bore → rig;
line → rig, liner · trade-printing distribute → forme; compose → forme;
print → on; copy → from, onto, pen; proof → forme · trade-forestry rive →
target, froe · trade-cordage twist → stock, jack · transport berth → book ·
trade-milling mill → mill · trade-sugar clay → clay; temper → lime; skim →
pail · trade-mining assay → samples, bench; drain → vessel · trade-baking
bake → oven · trade-farming unmark → field; mow → part; plow → part ·
trade-ice groove → tool; scrape → tool · trade-carpentry saw → saw ·
trade-papermaking couch → mould, post.

The 79 **string** greedy args (prose) stay; `shelf reclaim → thing` is the
one string greedy over a thing's name and becomes a non-greedy object arg.

---

## Drive record

**W15, 2026-11-10 — after the master merge (`af5ec7e3c`).** Fresh worlds
(`reset:db`, `WIRE_BOOT=1 WIRE_KEEP_WORLD=1 WIRE_PORT=2013`), two of them:
step 13 and the re-records each need an unused world, and steps 1–2 spend
the same panel, carcass, bar and furnace step 13 does. The soak drive is
none.

**Full suite** (`tools/suite`, once, 46 min): 19,576 passed, 3 failed —
`lookup.escape` (the W2 reach walk asked a field object for its lid inside
a sandbox circle and threw), `wiki-spoiler-fields` (W7c's `const raker` /
`const sweeper` above two `fieldMeta`s re-filed their fields), and
trade-shopkeeping's pack-rows (`HouseShopControllerBase`). All three fixed.

| step | result | what driving found |
|---|---|---|
| 1 | ✅ harvest · smelt · order · butcher under worded replacements equal the record | needed `SmeltWorded`/`OrderWorded`/`ButcherWordedController` (D-W15c) |
| 2 | ✅ shipped refuses `part-unnamed` with both fields; the asking one prompts; answering = naming the field | — |
| 3 | ✅ a–g: chat rename `not-owner` · `errors raw` `pm-only` · Tier C `tier-c` (even the PM) · a level-3 line absent from a player's `read`/`history`/`diff` · `job apply hand` refused for gigs · `lock north` refused · `forum post` outside the audience refused | the founder holds no wiki seat (a `/wiki` owner authors); the lounge bartender seat has no criteria |
| 4 | ✅ open bag found · shut chest `reach:enclosed-shut` · `--top` none · `me:I:` found | the shut refusal is the reach validator's, not a reason |
| 5 | ✅ in a canoe at the put-in, `look here` ≠ `look me:e` (the canoe) | — |
| 6 | ✅ `buy padded gambeson` → `bind-failed` + the quote hint; quoted, bought; `say` whole | funding finds the holder online |
| 7 | ✅ `draught forge medium` lists the five words; `--expires 10` refused; `90m`, `2 hours` taken | D-W15a (press, not stream) |
| 8 | ✅ `notify set/show/move`; `draught forge low`; `dry … with` / `dry … on` each route; `help` lists them | ⚠ `dry #rag with …` was an unknown shape — fixed (D-W15e) |
| 9 | ✅ `cockpit layout save list` → `recall list`; **W16:** re-driven as `client-layout save list` → `client-layout recall list` on a fresh world, green (wire + walk) | — |
| 10 | ✅ transfusion completes · `search` completes · held-extent teleport arrives | — |
| 11 | ✅ refused `title buy` moves no coin; a pilot refused for coin tells nothing | the paid pilot path is maritime-space step 21 |
| 12 | ✅ introduced, the receiver sees the name; a bought lot given, the receiver (by identity) owns it | ⚠ a player could not give a lot they bought — fixed (D-W15f) |
| 13 | ✅ 78 rows equal the record, five re-recorded (below) | ⚠ `order pint` left the bar's new pipe run titled to the customer — fixed (D-W15d); `rm` refused `unspecified` — fixed |
| 14 | ✅ a real restart mid-smelt and mid-grind: the furnace's charge became its product, the grind its sacks | — |

**Re-recorded on purpose** (CLIQ_RECORD=1 on a fresh world): `dose`
(error → `nothing-to-counter`, W7c), `cool` (error → `nothing-to-cool`, W8),
`cp` (error → `access-denied`, W3), `rm` (`access-denied` → `no-template`,
W3: the path's existence first), `fell` (the acorn reaches the feller's
hand — the old controller `void`-ed the drop and the record read first).
Every other listed row (`unhitch`, `water`, `course`, `mv`, `grep`,
`mkdir`, `tip`, `label`, `wash`, `char`, `berth`, `mill`, `warm`, `journey`,
`title.buy`) matched its record unchanged. Two typed lines follow the new
grammar and still match: `feed … at the "far side"`, `mill … at stones`.

**Every checkpoint made to fail once.** Red for real during the drive: 4,
6, 8, 10a, 11b, 12, 13 (eight rows), 14a, 14b, 3d, 3e. Broken on purpose
and watched go red (then restored): 2 (the shipped controller installed
for the asking one), 3a (the owner renames), 3b (the PM reads), 3c (an
untiered key), 3f (`look` for `lock`), 3g (the owner posts), 5 (`look
here` twice), 7 (`draught forge wide`), 9 (an unsaved name), 10b (`look`
for `search`), 10c (no hop), 11a (a coin deposited mid-step). Step 1
shares step 13's comparison.

**The walk** (`e2e/tests/controller-liquidity-walk.spec.ts`, against the
kept world with `CLIENT_URL` and vite on 5183): green on all eight
concerns. Found: the server's CORS names one client origin, so a walk on
its own port needs `CLIENT_URL` at boot; and ⚠ OPEN, not this build's — a
binder prompt sent in a page's first moments reached no chip bar (the
dispatch waited until the socket closed); after one `look` it shows.

**The cockpit specs, 2026-11-10 (after W16).** Six cockpit e2e specs
went red against this branch's world (12 failures). Every one was a
stale assertion, none a regression — each checked against the commit
that changed the behavior; no code changed:

- `client-surface-layout` › every width — **stale vs master**: the top
  bar came back (B42, `e0d4e6ae7`) and the column arranger was retired
  for a packed gallery (`e30fc2aea`, `card-column` gone); now asserts
  the top bar, `card-grid`'s `data-columns` ≥ 1 and non-decreasing,
  the measure and no sideways scroll.
- `client-surface-layout` › placed card returns (AC 2) — **stale vs
  master** (`e30fc2aea`: the order is the client's, a server placement
  is not rendered); now asserts the moved card stays in the gallery
  across narrowing and widening.
- `mobile-chrome` × 3 (two rows/glance-line · `client-shelf first`
  through a reload · tap echoes its command) — **stale vs master**: the
  shelf wears master's words again (PLAY · RENOWN · SKILL, B42).
- `panes` › settings — **stale vs master** (B42): Settings is the top
  bar's button toggling master's settings PANEL, closed by its ✕; the
  rail has no settings and it is not a card.
- `shelf` × 4 (honest/hatched · server owns pinning · wraps · ＋ menu) —
  **stale vs master**: the default is four rows (`body`, `de748bb51`),
  the catalogue ten, MAKE live since `5b53647fd` (hatched five, not six);
  **stale vs this build** for the unknown-row refusal (W7b `values:` —
  the binder names the ten). Shelf commands now re-send until the bar
  changes, because the first command after a world entry can be dropped
  (the `sendUntil` race — pre-existing, and it cost two retries here).
- `theme` › all three repaint — **stale vs master** (`e30fc2aea`): the
  terminal is a neutral near-black with the invariant `terminal-fg` in
  every theme, so marble's transcript is light.
- `theme` › `default` refuses — **stale vs this build** (W7b): the binder's
  `'default' is not one of ink, marble, high-contrast`.
- `status-bar` — green unchanged (it was named, never red).

Fresh world (`reset:db`, server on 2013 with `CLIENT_URL`, vite on 5183):
the six specs 33/33 serially (one retry was a world-entry wait under a
load average of 11–13 from sibling worktrees, not an assertion); the walk
8/8 on the fresh world. ⚠ The walk's step 5 spends the put-in's canoe
(`launch` floats it away), so a second walk on the same world fails at
`go canoe` — run it on a fresh world, as W15 did.

**After W16–W20 + master merge, 2026-11-10** (merge `c26e782b1`: the
boundary build and the map/step-beat/client-knowledge slates; conflicts in
reach — kept `PerceptionApi.reach`, master's `getDoor`→`getBoundary` applied
in `reachOf` — `Sealable` both hooks, `LookController`, `mql.md`). Gates:
tsc 0 (server, client, 54 packs); `lint:family` 106/106 after two merge
fixes (the boundary build's dead `boltedByDefault`/`fitExit` seams retired;
curtain/grating/hatch rows `unreachable: parent`; `lint:duck-typing`
478 → 477); `test:near origin/master` exit 0. Fresh worlds throughout.

| drive | result |
|---|---|
| step 13 (world A) | ✅ 78/78 rows equal the record — `survey`→`analyze rooms`, `stir`, `sweep` unchanged; nothing re-recorded |
| steps 1–12 (world B) | ✅ 25/25 |
| step 14 (world B) | ⚠ red: a water-mill grind started before a restart never landed and its grain was gone — the landing was a closure timer (W15's green was timing). Fixed: `ComminutingMixin.pendingGrind` is persisted state whose setter re-arms the landing; re-driven green |
| boundary (master's) | ⚠ red: `open pump-house door` unquoted under W5's grammar — the drive quotes it now; 5/5 on a fresh world |
| paint | ✅ 16/16 |
| cleanliness | ⚠ 22/23 — drive 23: after a restart the washed shirt is no longer on the cookhouse drying rack (`look rack` shows none; `look shirt` binds the cook's own). Not diagnosed → /finalize |
| placement | ✗ not run — the shared world's cold boot overran 420 s → /finalize |
| `controller-liquidity-walk.spec.ts` (world D, one worker, `CLIENT_URL`, vite 5183) | ✅ 8/8 |

**Skipped → /finalize** (owner ruling, scope cut): wire — placement,
harbors, metal-chain, nutrition-fitness, tracts, ceramics-c, ceramics-d,
glass, cordage, dairy, potash, client-surface, wizard-axis; walks — paint,
residences, harbors, the six cockpit specs. Seen in passing, not this
build's: an infirmary NPC's `press post` notice is `unknown-verb` (the
blood-bank brain posts with a verb only `Avatar`/`Editor` afford — on
master too).
