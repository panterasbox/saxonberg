/**
 * BoundaryRole — ⭐⭐⭐ **what a Stuff is, as far as the sandbox
 * boundary is concerned.** One declared axis, on the class, replacing
 * three hand-maintained central lists.
 *
 * ## What this replaces, and why
 *
 * The boundary check used to decide class-level exemption from two
 * enumerations, both living inside `api/security.ts` or planted into it
 * at boot:
 *
 *   - **twelve `SecurityApi._registerBoundaryExemptBase(...)` calls** in
 *     `BootstrapManager.installFrameworkWiring` — three infrastructure
 *     bases and nine reference bases;
 *   - **twenty-seven template-path strings** in
 *     `#BOUNDARY_EXEMPT_TEMPLATE_PATHS` — the registries and the seeded
 *     catalogues.
 *
 * ⚠⚠ **Every one of the thirty-nine was added after something broke in
 * production**, and the comments are a scar record of it: *"found live:
 * the wire body was refused `go` as 'not currently animate', then
 * refused again on its clade's rank"* · *"found live: `eval` in-circle
 * died on `lookupField`"* · *"without this, every clone inside a circle
 * silently skipped its content step"* · *"every one of these was a verb
 * that simply died inside a circle — `help`, `spells`,
 * `recipes`/`craft`, `studio`, `competence`, `government`. A player
 * standing in their own circle could not read the rulebook."*
 *
 * ⭐ And the path list carried its own reason for existing: *"enumerated
 * here because each is a singleton rather than a class of many."* That
 * is not a reason — a static on the class reads the same whether there
 * is one instance or a thousand. The list existed because there was no
 * declaration to make.
 *
 * ## ⛔ Why this is DECLARED and not derived
 *
 * The reference exemption was justified in prose by a three-limb test.
 * Each limb was checked against the code before this file was written,
 * and none of them is a usable predicate:
 *
 *   1. *seeded* — true, and says nothing: half the world is seeded.
 *   2. *never mutated at runtime* — **not derivable.** `Material`
 *      declares **32** public `set*` methods, because the
 *      `TemplateApplier` dispatches through them. Every authored
 *      reference class needs setters, so their presence distinguishes
 *      nothing.
 *   3. *the PM policy table REFUSEs writes to their rows* — ⛔ **false.**
 *      `Collections.Content` is `sandbox: pass`, deliberately
 *      (*"authored truth … the parcel-title gate is what governs that
 *      — not the circle"*). So the exemption never widened reads only,
 *      and limb 3 is **struck** rather than carried forward: a false
 *      guarantee that keeps justifying exemptions is worse than none.
 *
 * A fourth candidate — *nobody can hold title to it*,
 * `ParcelApi.ownerOf(path) === null` — is also false: `/platform` and
 * `/stuff` are both claimed extents.
 *
 * ⭐⭐ **So membership is a JUDGMENT.** The honest design is to put the
 * judgment where it is visible and reviewable — a static on the class —
 * and to hold its GROWTH with a ratchet rather than pretend a predicate
 * exists. What is derivable is the behaviour (one read site), the
 * totality (every declaration is a known value), and the census
 * (`pnpm -C packages/server lint:boundary-roles` gates today's
 * `commons` count as a ceiling, so widening the boundary is a visible
 * reviewed act instead of a line in a boot function).
 *
 * ## The roles
 *
 * See the table on {@link BoundaryRole}. `place` is the default and
 * nothing declares it — an unmarked class fails closed into the
 * ordinary compare, which is the posture the old code had and keeps.
 */

/**
 * ⭐ The declared answer to *what is this, to the boundary?*
 *
 * | role | the claim it makes | examples |
 * |---|---|---|
 * | `place` | *I am where my path says, or where my {@link Stuff.jurisdictionHost} is.* **The default — nothing declares it.** | rooms, goods, bodies, exits |
 * | `commons` | *Nobody holds title to me as a thing. I am shared vocabulary every body reads to know what it is, what it is made of, and what exists.* | `Material` `Species` `Locality` `HelpCatalogue` |
 * | `infrastructure` | *I am not a world object at all — I am engine plumbing that happens to be Stuff-shaped.* | `ApiLogic` `Interactive` the registries |
 *
 * ⚠ **`commons` is not a claim of immutability** — that cannot be
 * checked (see this module's header, limb 2), so it stays a review
 * criterion rather than a gate. The criterion, in one line: *would
 * minting a per-parcel copy of this be absurd?* A Terminus `iron` and a
 * Hinkley `iron` would fork a closed vocabulary; a Terminus
 * **torch** would not, which is why a torch is `place` and gets its
 * jurisdiction from the room it sits in.
 *
 * ⛔ **A thing with real runtime state is not `commons`, however
 * shared** — and the water pack is the worked example of getting that
 * split right. `Watercourse` holds authored topology only (key, basin,
 * the source-first node list, baseline chemistry) and so declares
 * `commons`; a river's *state* lives elsewhere — flow and direction are
 * derived, storage is a `StorageNode`, which is a `Thing` in a place
 * and therefore `place`, taking its jurisdiction from the room it sits
 * in. **Split the record from the state and each half gets an honest
 * role.**
 *
 * ⚠ `Watercourse` was withheld for one round on the reasoning that *"a
 * river's flow and storage are genuine runtime state"*. That
 * attributed to this class state that lives on other objects: nothing
 * calls its five setters but the `TemplateApplier`, and the denial that
 * prompted the doubt was `setKey()` — read as a write, and in fact the
 * applier hydrating an authored field, which is what every `commons`
 * member does (`Material` does it 32 times).
 *
 * ⛔ **And the question it was parked under did not exist.** *"What is
 * the jurisdiction of a thing that spans parcels?"* — nothing spans
 * parcels. `ParcelRegistry`'s coverage index is a `PathTrie` and
 * `ownerOf` is **longest-prefix**, so every path resolves to exactly
 * one holder by construction. A Watercourse is not in two parcels; it
 * is in **none**, because it has no location at all — a parcel CITES a
 * reach (`parcels.reach`) rather than containing a river, and that is
 * precisely what makes it vocabulary.
 */
export type BoundaryRole = 'place' | 'commons' | 'infrastructure';

/** Every legal value — the gate's totality check reads this. */
export const BOUNDARY_ROLES: readonly BoundaryRole[] = [
  'place',
  'commons',
  'infrastructure',
] as const;

/**
 * The one role that does NOT exempt its instances from the boundary
 * compare — and the default, so an unmarked class, a misspelled role
 * (refused by `lint:boundary-roles`) and a brand-new module category
 * all fail **closed** into the ordinary compare. That posture is the
 * one thing about the enumerations worth keeping.
 *
 * ⚠ Exported as the constant rather than as an `exempts(role)` helper:
 * `lib/**` recognizes vocabularies and their validation arrays, not
 * free functions (CLAUDE.md § Export discipline), and the rule has one
 * call site — `SecurityApi.#isBoundaryExempt`.
 */
export const BOUNDARY_ROLE_DEFAULT: BoundaryRole = 'place';
