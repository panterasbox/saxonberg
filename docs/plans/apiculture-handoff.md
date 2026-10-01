# Apiculture — session handoff (2026-10-01)

⚠ **Written to survive a context compact.** Read this first, then
`docs/plans/apiculture-plan.md` — its **Drive record** holds the twelve
drive rounds and every defect each one found, and its **W12** section
holds the Agent/Thing finding in full.

> ⭐ **Superseded in part.** The four branch predicates this doc called
> "the agreed next step" have landed (`isAgent` · `isThing` · `isIdea` ·
> `isLocation` on `Stuff`, one override each in `lib/stuff/`); `Shadow`
> deliberately has none. The three browser findings B1–B3 below have NOT
> been acted on and are still the live content of this file.

## Where things stand

- Branch `design/2026-09-25-apiculture-dairy`, **25 commits pushed, 0
  behind `origin/master`**.
- **MR !310 is open**: https://gitlab.com/panterasbox/saxonberg/-/merge_requests/310
- At the last full green run: `pnpm test` whole (`SUITEEXIT=0`),
  `lint:family` **58/58**, wire drive **19/19**.

## ✅ The branch predicates — landed

`Stuff.isAgent()` · `isThing()` · `isIdea()` · `isLocation()`, each
`false` on `Stuff` and overridden exactly once in `lib/stuff/Agent.ts`,
`Thing.ts`, `Idea.ts`, `Location.ts`. `Shadow` gets none, deliberately —
it is a framework attachment riding another Stuff, not a world object
anything asks about; the reason is written into `Stuff.isAgent`'s
docstring so the omission reads as a decision.

Three call sites ask them: `MixinApi.isOpenContainer`,
`RecognitionLogic.obscured`, `PutController` (whose private `isBody()`
copy is deleted). `describeFor.test.ts`'s `Being` fixture moved from
`Idea` to `Agent`, which is the one test the change touched.

⚠ **While adding `isAgent` I had inserted it between `@Final`
`@Unshadowable` and `isDestroyed`** — so the two framework decorators
were silently decorating the new predicate and `isDestroyed` had lost
them. tsc is blind to that. Found and fixed before the suites ran; worth
remembering, because a decorator pair is attached by *position* and a
docblock in between looks harmless.

## Why this exists at all — the finding behind it

Three call sites asked **`isOrganism`** (or proxies for it) when they
meant something narrower, and all three were wrong:

1. `RecognitionLogic.obscured` → **every PLANT in the game read as
   "someone" in the dark.** A `Plant` composes `OrganismMixin` and
   nothing person-shaped. Apiculture made it loud: `drop hive` answered
   *"You drop someone."* (the colony IS the organism).
2. `MixinApi.isOpenContainer` → the hive was **excluded from its own
   contents**: `look in hive` showed nothing, nothing inside was
   reachable, and the MQL `peers` walk would not enter it.
3. `PutController.isBody` → a **drifted copy** of (2)'s exclusion, whose
   own docstring admitted it was *"near enough the exclusions
   isOpenContainer makes, minus the lid"*. ⚠ I narrowed only the copy
   earlier in the session, which made (2) and (3) **disagree** — that is
   what broke reach-into-hive.

⭐ **"someone" vs "something" IS the Agent/Thing split**, which is the
user's insight and is better than all three mixin predicates I tried:
- `isOrganism` → a plant is "someone" ✗
- `isVitals` → caught by `describeFor.test.ts`'s own `Being` fixture (a
  Persona person with no vitals would read "something") ✗
- `isPersona` → **a cow would read "something"** ✗ (a cow is an actor)
- `isAgent` → plant, hive, person and cow all correct ✓

⚠⚠ **It must be a METHOD, not `instanceof`.** `MixinApi` sits *below* the
branch classes; importing `Agent` there closes the cycle
`mixin → Agent → Stuff → … → mixin`, leaves `Stuff` undefined at
class-evaluation time and fails **176 test files** with
`Class extends value undefined is not a constructor or null`. That cycle
is almost certainly why the three-predicate proxy existed. Measured, not
guessed — I did it and watched it break.

**Blast radius of the `isOpenContainer` change: exactly two classes.**
`Creature` (an Agent → still excluded, so a pack animal's panniers stay
private, which is the reason the original docstring gives for
`isOrganism` being there) and `Hive` (a Thing → newly admitted).

## What still needs doing

1. **Re-verify reach-into-hive in a browser** — `look in first hive`
   printed nothing before the fix; it should list the super and frames
   now. That is the observation that proves the `isOpenContainer` half,
   and no test reaches it.
2. The three browser findings below (B1–B3) are **not this build's** and
   want slate lines, not fixes here.

## Browser-walk findings not yet acted on

Full text: the session's scratchpad `browser-findings.md` (gone after the
compact — the substance is here).

- **B1 ⚠⚠ the `look` CARD shows a room you cannot see.** In the pitch-dark
  general store the transcript says *"It is pitch dark"* while the card
  renders the full authored description. The card gates **contents**
  (`something · someone`) but not the room's own prose. Not apiculture's —
  card surface vs `PerceiverMixin`. A finding for `card-surface.md`.
- **B2** the Terminus general store is **unlit**, so shopping is blind
  unless you already own the lantern that is inside the dark shop.
- **B3 ⚠⚠ nothing in the game can advance the world clock.** The `eval`
  allowlist is `StuffApi · MqlApi · ContainmentApi · MixinApi · console ·
  self · target`, and there is no clock verb in any category. So the
  **seasonal half of apiculture is unobservable by any in-game
  instrument** — swarming, the winter burn, absconding, starvation, the
  fruit set. Requirements drive step 16 (*"run the year forward"*) is a
  step no instrument can perform; only `_advanceForTesting` in unit tests
  reaches it.
- **Still unverified:** `envelopeCoefficients().uWperK` read off a hive
  cloned from the shipped `enclosure:` ROW. Every unit test builds the
  enclosure by hand with `setEnclosure`. The eval probe failed because the
  command interpreter tokenizes before `eval` sees the JS
  (`console.log('a:', x)` splits on the comma) and `MqlApi.resolve` is not
  a method. Needs another route.

## ⭐ What the browser DID confirm, rendered to a player

- `put nucleus in hive` → *"You put a nucleus of bees in a pine beehive."*
- the sting → *"One gets through — up your forearms. A veil and gloves,
  and smoke, is what you should have had."*
- the reading, **no digit in it** → *"Steady traffic in and out of the
  entrance. It lifts like an empty box. Brood, but spotty."*
- veiled → *"They come up around your hands and settle again. Nothing in
  it this time."*
- `rob` out of season → *"Nothing capped. Out of the flow there is simply
  nothing to take, and the refusal is the season's rather than the
  colony's."*
- `split` → *"There is not enough of them to make two."*
- the affordance card lists **`handle · rob · split`**; the skill chip
  walked **`apiculture · novice` → `competent`** during the walk.
- the close renders its clover and three cherries in full.

## Running processes to clean up

- dev server on **2010** (`AUTH_MODE=test FOUNDER_GOOGLE_EMAIL=founder@e2e.local pnpm dev:server`)
- vite client on **5173**
- ⚠ Kill **by PID** (`ps -eo pid,cmd | grep "[t]sx watch"`), never a
  self-matching `pkill -f`.
- ⚠ A sibling session's Chrome holds the shared chrome-devtools-mcp
  profile (`--remote-debugging-pipe`), so the MCP browser tools cannot
  attach. The browser walk went through **Playwright** in `e2e/` instead,
  which is the project's own render tier. Do that again rather than
  killing another session's browser.

## Standing constraints (do not relearn)

`packages/server/.env` holds live credentials — never echo or commit.
Merge on origin **through the GitLab tool**, never the CLI. Stage by name,
never `git add -A`. **Commit messages always from a file** (I slipped once
this session with `-m "$(printf …)"` — it landed intact, but the rule
exists so the judgment call never has to be made). Dev DBs are the user's
to drop, never ask (`pnpm --filter @saxonberg/server reset:db`).
`pnpm test` at exactly two moments: pre-MR and `/finalize`.
