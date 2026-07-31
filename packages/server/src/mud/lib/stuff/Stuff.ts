/**
 * Stuff - Base class for all game objects
 *
 * This is the root of the Standard Model hierarchy. Every object in the game
 * (users, players, items, locations, etc.) is a Stuff.
 *
 * Responsibilities:
 * - Runtime ID generation (stuffId)
 * - Destruction lifecycle (isDestroyed flag)
 * - Auto-unregistration from StuffApi (on destroy)
 *
 * CRITICAL PATTERNS:
 *
 * 1. Object Creation:
 * - Use StuffApi.create(() => new YourClass()) to create objects
 * - This ensures objects are properly registered for tracking
 * - Direct 'new' calls will work but object won't be tracked
 *
 * 2. Object Destruction:
 * - Call StuffApi.destruct(obj) to destroy objects — it is the canonical
 *   destruction entry point. The call-security framework's `ApiOnly`
 *   policy enforces this at runtime; direct obj.destroy() throws
 *   `SecurityError`.
 * - Subclasses customize destruction via two optional Witness hooks:
 *     `canDestruct(): VetoResult` — refusal seam (return
 *       `{ ok: false, reason }` to abort). Bypassable via
 *       `StuffApi.forceDestruct` (admin-gated).
 *     `onDestruct(): void` — cleanup hook, runs while the target is
 *       still live. Replaces the retired `prepareDestroy()` hook.
 * - destroy() carries `@Final @Unshadowable @CallSecurity(ApiOnly)`.
 *   Subclass overrides throw `FinalViolationError` at import time;
 *   shadows attempting to attach throw `ShadowError`. Together these
 *   guarantee `StuffApi.unregister()` always runs (essential for GC).
 */

import { StuffApi } from '../../api/stuff';
import { ModuleApi } from '../../api/module';
import { ProxyApi } from '../../api/proxy';
import { SecurityApi } from '../../api/security';
import { MixinApi } from '../../api/mixin';
import { GrammarApi } from '../../api/grammar';
// Type-only: `Stuff` is the root base, so a *value* import of `Mml`
// (which pulls recognition → belief → `Idea extends Stuff`) would form a
// load-time cycle. The default fragment is built by `Mml.ref` instead;
// subclasses that decorate value-import `Mml` themselves.
import type { Mml } from '../../api/mml';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import type { VetoResult } from '../errors';

/**
 * Any class reference, abstract or concrete. Used by the top-level
 * branch registry — identity-based, no instantiation through this.
 */
type AnyClassRef = abstract new (...args: never[]) => unknown;
import type { SpatialZone } from '../zone/SpatialZone';
import { CallSecurity, Unshadowable, Final } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/**
 * Metadata for destroyed objects (used for debugging).
 */
export interface DestroyedObjectMetadata {
  stuffId: string;
  destroyedAt: Date;
}

/**
 * Baked-in fallback for {@link Stuff.getPresentation} when the target
 * has no `Named` name and no `Visible` shortDescription. Presentation
 * policy lives here, not in every caller — `getPresentation` always
 * returns a string, so call sites never write `??` ceremony.
 */
const DEFAULT_PRESENTATION = 'something';

/**
 * `setZone` is callable only from `SpatialZone` and its subclasses.
 * The legitimate writers are `SpatialZone.addLocation` /
 * `removeLocation` (and their CartesianZone/SphericalZone overrides
 * via `super`). Clone-time seeding from `StuffApi.#cloneInner`
 * uses the `_stampZone` seam instead, not this policy.
 *
 * Mirrors the `FromContainmentApi` pattern in `Containable.ts`.
 * `includeSubclasses: true` walks the prototype chain so
 * CartesianZone / SphericalZone (and any future SpatialZone
 * subclass) pass through.
 */
const FromSpatialZone = SecurityPolicies.FromModule('/lib/zone/SpatialZone#SpatialZone',
  { includeSubclasses: true }
);

/**
 * Runtime facts the residency (self-eviction) sweep hands to
 * {@link Stuff.canEvict} — only what an object *cannot* derive about
 * itself. Everything self-knowable (contents, engagement, host,
 * container chain) the object introspects directly; the context carries
 * the sweep-computed idle duration and the trigger that fired.
 *
 * Deliberately thin **and extensible**: the sole reason `canEvict`
 * takes a context object rather than being no-arg is so a future
 * resource-pressure trigger (compute-dormancy) can add fields
 * (`memoryPressure`, …) and a new `reason` **without changing any
 * existing override's signature**. v1 carries only these two.
 */
export interface EvictionContext {
  /** `Date.now() - getLastTouched()` at sweep time. */
  idleMs: number;
  /** What triggered the ask. Extensible; v1 is idle-driven only. */
  reason: 'idle';
}

/**
 * Base class for all game objects.
 */
export abstract class Stuff {
  /**
   * Universal live-query subscribable fields — fields every Stuff
   * exposes regardless of mixin composition. Currently just
   * `displayName`, a derived render that delegates to
   * {@link Stuff.getPresentation} (Named's `name` or Visible's
   * `shortDescription`, falling through to the baked-in `'something'`).
   *
   * Declared here rather than in a substrate-private synthetic
   * table because every Stuff genuinely owns the concept — there is
   * no "what if this Stuff has no displayable identity?" case. The
   * descriptor uses `dependsOnFields` to declare the leaf source
   * fields it depends on (`name`, `shortDescription`); the substrate
   * installs precise `(FieldChangedEvent, 'field', dep)` index
   * entries automatically. Shadow lifecycle support rides on
   * `ShadowChangedEvent` in `changes` (declared-but-unfired until
   * the shadow subsystem wires it).
   *
   * Mixin layers above Stuff add their own `subscribableFields` for
   * mixin-owned state; the substrate's prototype-chain walk
   * `hasOwnProperty`-checks at every level and unions the
   * descriptors.
   *
   * Future universal renders (`pronoun`, `articleName`, etc.) land
   * here too. Mixin-gated renders go on the mixin that owns the
   * gate.
   */
  static subscribableFields: SubscribableFieldDescriptor[] = [
    {
      name: 'displayName',
      // Viewer-blind baseline here; the viewer-aware re-point lives in
      // the projection layer (`MqlSubscriptionApi.projectFields`), which
      // threads the subscriber and applies `RecognitionApi.describe`.
      // Keeping the perception/belief dependency out of the root `Stuff`
      // module avoids a module-eval cycle (Stuff → recognition →
      // VisionModality → … → Stuff). Same routine the prose path uses,
      // so the surfaces can't diverge.
      read: (stuff) => stuff.getPresentation(),
      dependsOnFields: ['name', 'shortDescription'],
      changes: [{ on: ShadowChangedEvent, by: 'target' }],
    },
  ];

  /**
   * Self-presentation — the casual-register render string for this
   * object, the answer to "what does this Stuff call itself?" Three-
   * step resolution:
   *
   *   1. **`Named.name`** if present and non-empty — the object's
   *      *proper name* ("Alice", "Excalibur", "Town Square").
   *   2. **`Visible.shortDescription`** if present and non-empty —
   *      the object's *visual identity* ("a heavy oak door").
   *   3. The baked-in fallback ({@link DEFAULT_PRESENTATION}).
   *
   * For a `Globbable` stack (`quantity !== 1`) the count folds in as
   * an affix — `"30 coins"` — pluralized via {@link GrammarApi.pluralize}
   * (which honors host-side `getPluralForm()` overrides for
   * irregulars). Named takes precedence over Visible so a
   * Named-with-description renders by its proper name; code that
   * needs the formal register calls `getFullName()` when typed as
   * Named.
   *
   * **Viewer-blind by design.** This is the shared baseline every
   * Stuff exposes; the viewer-aware naming step (recognition /
   * identification — see
   * `docs/subsystems/belief.md`) composes on top
   * of it. Left **shadowable** (NOT `@Final`) so masking / disguise
   * effects can override the rendered identity via a method shadow.
   */
  getPresentation(): string {
    let base = DEFAULT_PRESENTATION;
    // Disguise defers FIRST and at the baseline (not via a shadow on
    // the synthesizer): a masked creature presents its covering's
    // `appearsAs` ("a hooded figure") in place of its true identity, so
    // every reader — prose, MQL projection, logs — sees the disguise
    // uniformly. The viewer-relative half (withholding a *known* name
    // from someone who'd recognize the wearer) lives in
    // `RecognitionApi.describe`; this layer is viewer-blind.
    if (MixinApi.isDisguisable(this)) {
      const disguise = this.getDisguise();
      if (disguise) base = disguise.appearsAs;
    }
    if (base === DEFAULT_PRESENTATION && MixinApi.isNamed(this)) {
      const name = this.getName();
      if (name) base = name;
    }
    if (base === DEFAULT_PRESENTATION && MixinApi.isVisible(this)) {
      const short = this.getShortDescription();
      if (short) base = short;
    }
    let identity = base;
    if (MixinApi.isGlobbable(this)) {
      const n = this.getQuantity();
      if (n !== 1) identity = `${n} ${GrammarApi.pluralize(this, base)}`;
    }
    // `getPresentation()` is pure identity. The authored activity-status
    // affix (`StatusMixin`, "watching the empty road") is a *presence*
    // decoration, not identity — it weaves in only through
    // `RecognitionApi.describeWithStatus` at presence-scan surfaces (the
    // room occupant roll-call, the profile), never on act-subject naming.
    return identity;
  }

  /**
   * Build the composable `Mml` fragment for this object's display name —
   * the Mml sibling of {@link getPresentation}. `Mml.ref` (and so every
   * `<item>` / `<name>` / … identity tag) renders this, not a raw
   * string, so a name joins the compose chain as a fragment like
   * everything else. The `label` is the already-resolved, viewer-aware
   * name (recognition runs in the render layer and hands it in).
   *
   * Return `null` for the plain default — `Mml.ref` then wraps the label
   * in `Mml.text`, which escapes it exactly once, so player-authored
   * names / status decoration are safe by construction and the fragment
   * is never re-escaped downstream. Override to build a richer fragment
   * (a TPA terminal wraps its name in `<color>` to tint by state). The
   * plain-string `getPresentation` stays the surface for non-prose
   * consumers (logs, `context.note`, MQL scalars).
   */
  getPresentationMml(_label: string): Mml | null {
    return null;
  }

  /**
   * Runtime ID for this object (generated using nanoid).
   * This is NOT the MongoDB _id - it's a runtime identifier.
   */
  public readonly stuffId: string;

  /**
   * CMS template path this object was cloned from, or null when the
   * object was constructed directly via `StuffApi.create`. Stamped
   * at clone time by `StuffApi.clone()` and (rare cases) by Api code
   * that wants MQL path-atom addressability for an ad-hoc runtime
   * singleton — e.g. `EvalScript` stamping `/home/<id>/_eval`.
   *
   * Hard-private (`#`) for tamper-resistance: the slot lives on the
   * raw target only and is unreachable from outside this class body
   * — not via bracket access, not via reflection, not via a wrapping
   * Proxy. The only writers are `setTemplatePath` (ApiOnly-gated
   * below) and the symbol-keyed pre-register stamp seam
   * (`Stuff[STAMP_TEMPLATE_PATH_SEAM]`). Forging the field through
   * `(stuff as any).templatePath = X` is a no-op on the `#` slot,
   * which keeps the `byTemplatePath` index honest.
   *
   * Note this is the **stamp** identifying the source template a
   * runtime instance was cloned from — not the same as a
   * `Template`'s own `path` field, which records that template's
   * own location in the content hierarchy. A `Template` instance
   * (also a Stuff) typically leaves `templatePath` null because
   * templates aren't themselves cloned.
   */
  #templatePath: string | null = null;

  /**
   * Read seam. Instance method, but unwraps via `ProxyApi.unwrap`
   * before reaching the `#` slot — `this` inside an instance method
   * called through the proxy is the proxy, and the `#` slot lives
   * on the raw target.
   */
  public getTemplatePath(): string | null {
    return ProxyApi.unwrap(this as unknown as Stuff).#templatePath;
  }

  /**
   * The IDENTITY this object acts as — the key the identity-keyed
   * epistemic producers (belief viewer key, chronicle owner,
   * transcript/disposition/renown subject) attribute to. Defaults to
   * `getTemplatePath()` (byte-identical for every ordinary object); a
   * projection vessel (the sandbox `WireBody`) overrides it to return
   * the real identity's path (`/obj/Avatar/<playerId>`), so in-circle
   * derive-on-read composes the player's real history ∪ scoped appends
   * and PASS rows attribute to the real identity, never the vessel.
   */
  public getIdentityPath(): string | null {
    return this.getTemplatePath();
  }

  /**
   * The controlling player's account id, or `null` when this Stuff is not a
   * player-controlled body (an NPC, a prop, a fixture). `Avatar` overrides to
   * return its `playerId`. This is the auth/account identity (OAuth id,
   * `User.playerIds`) — NOT a membership key. Group / authority membership
   * keys uniformly on `getTemplatePath()` (a player as `/obj/Avatar/<id>`, an
   * NPC as its own path), so a membership check never branches on player-vs-NPC
   * and never mixes id shapes. Kept as a typed method (rather than the old
   * `(x as { getPlayerId?() }).getPlayerId?.()` duck-typing) so the auth-layer
   * call sites that legitimately need the account id can ask any Stuff.
   */
  public getPlayerId(): string | null {
    return null;
  }

  /**
   * Stamp this Stuff's `templatePath` and re-key the
   * `byTemplatePath` index so future `findByTemplatePath` lookups
   * see the new path. No-op when `path` matches the current value.
   *
   * Locked down by `@CallSecurity(ApiOnly)` because flipping a
   * Stuff's identity post-clone would break `FromTemplate`
   * policies and any caller-side caching of template-path
   * identity. `@Final @Unshadowable` because the index update has
   * to run for every successful set — a subclass override that
   * forgot the index call (or a shadow that intercepted) would
   * silently desync `byTemplatePath`.
   *
   * Unwraps via `ProxyApi.unwrap` so the `#`-slot access lands on
   * the raw target (see comment on `#templatePath` above).
   */
  @Final
  @Unshadowable
  @CallSecurity(SecurityPolicies.ApiOnly)
  public setTemplatePath(path: string): void {
    const raw = ProxyApi.unwrap(this as unknown as Stuff);
    if (raw.#templatePath === path) return;
    const prev = raw.#templatePath;
    raw.#templatePath = path;
    StuffApi._reindexTemplatePath(this, prev, path);
  }

  /**
   * Pre-register stamp seam — used by `StuffApi.#cloneInner` to
   * stamp `templatePath` on a freshly-constructed backing BEFORE
   * the register pass.
   *
   * Skips the reindex on purpose: the caller is responsible for
   * ensuring the Stuff isn't in the `byTemplatePath` index when
   * this fires, so the regular register pass picks it up cleanly.
   *
   * Caller-gated by `#stampGateAllowlist` below: only StuffApi
   * (`mud/api/stuff.ts`), the test-setup helper, and `.test.ts`
   * files may invoke this. Any other caller throws — without this
   * gate, any in-tree module could forge a Stuff's `templatePath`
   * and bypass `FromTemplate`-based call-security policies. The
   * symbol-keyed shape this replaces was defense-by-obscurity;
   * this is the actual capability check.
   * @internal
   */
  public static _stampTemplatePath(
    stuff: Stuff,
    path: string | null
  ): void {
    Stuff.#assertStampGateAllowed('_stampTemplatePath');
    ProxyApi.unwrap(stuff).#templatePath = path;
  }

  /**
   * File-URL patterns whose code may call the private-slot stamp
   * seams (`_stampTemplatePath`, `_stampZone`). Same machinery as
   * `#constructionGateAllowlist` / `#branchRegistrationAllowlist`.
   * Adding a new legitimate stamp site is a deliberate edit here
   * AND its callsite.
   *
   * Narrower than the construction-gate allowlist on purpose: the
   * stamp seams skip the public setter's gates (e.g.
   * `byTemplatePath` reindex, `FromSpatialZone` policy), so the
   * only legitimate production caller is the clone pipeline.
   */
  static #stampGateAllowlist: ReadonlyArray<RegExp> = [
    /\/mud\/api\/stuff\.(ts|js)$/, // StuffApi.#cloneInner pre-register stamp
    /\/mud\/lib\/security\/__tests__\/test-setup\.(ts|js)$/, // stamp*ForTest helpers
    /\.test\.(ts|js)$/, // direct test usage
  ];

  static #stampGateCache: Map<string, boolean> = new Map();

  /**
   * Throw if the immediate caller of the named stamp seam isn't
   * on the allowlist. Per-URL cached after the first walk, so the
   * cost is one stack walk per file ever; after warmup it's a Map
   * lookup. Mirrors the construction-gate shape.
   *
   * `op` is the seam name (e.g. `'_stampTemplatePath'`,
   * `'_stampZone'`); included in the error message so the
   * offender sees which seam was misused.
   */
  static #assertStampGateAllowed(op: string): void {
    const url = ModuleApi.getImmediateCallerUrl(Stuff.#SELF_URL);
    if (url === null) {
      throw new Error(
        `Stuff.${op} refused: caller URL could not be determined`
      );
    }
    const cached = Stuff.#stampGateCache.get(url);
    if (cached === true) return;
    if (cached === false) {
      throw new Error(
        `Stuff.${op} refused from ${url}: only StuffApi ` +
          `(mud/api/stuff.ts), the test-setup helper (mud/lib/security/` +
          `__tests__/test-setup), and *.test.ts files may stamp ` +
          `private slots without going through the gated public setter.`
      );
    }
    const allowed = Stuff.#stampGateAllowlist.some((re) => re.test(url));
    Stuff.#stampGateCache.set(url, allowed);
    if (!allowed) {
      throw new Error(
        `Stuff.${op} refused from ${url}: only StuffApi ` +
          `(mud/api/stuff.ts), the test-setup helper (mud/lib/security/` +
          `__tests__/test-setup), and *.test.ts files may stamp ` +
          `private slots without going through the gated public setter.`
      );
    }
  }

  /**
   * Spatial zone this object belongs to. Stamped at clone-time from the
   * nearest spatial-zone ancestor via `ZoneApi.resolveZoneForPath`, or
   * left null when no spatial ancestor exists.
   *
   * The field is narrowed to `SpatialZone` (not the bare `Zone` base):
   * non-spatial Zone subclasses (`Clade`, future taxonomic / permission
   * scopes) NEVER stamp here. The folder-of-templates membership lives
   * in the template-tree structure; only spatial zones — the things
   * that own a `Set<Location>` and a coordinate grid — go on
   * `Stuff.zone`. Callers who want "what folder does this template path
   * sit under" should consult the template tree, not this field.
   *
   * Runtime-only: not auto-persisted (the authoritative source is the
   * `domain` template path at clone time).
   *
   * Hard-private (`#`) for tamper-resistance — same shape as
   * `#templatePath`. Bracket writes don't reach the slot; the only
   * writers are `setZone()` (proxy-gated to SpatialZone subclasses
   * only) and the caller-allowlisted `_stampZone` seam. Forgery
   * matters because `ContainmentApi.move` enforces
   * "Exitables can't cross zones via containment" by reading
   * `item.getZone()` / `to.getZone()`; a forged zone breaks that
   * invariant, and any future `FromZone`-style policy would
   * inherit the same risk.
   */
  #zone: SpatialZone | null = null;

  /**
   * Get the spatial zone. Unwraps via `RAW_TARGET` because the
   * `#` slot lives on the raw target only and `this` inside an
   * instance method called through the proxy is the proxy.
   */
  public getZone(): SpatialZone | null {
    return ProxyApi.unwrap(this as unknown as Stuff).#zone;
  }

  /**
   * Set the spatial zone. Gated by `FromSpatialZone` — only the
   * `SpatialZone` class and its subclasses (`CartesianZone`,
   * `SphericalZone`) may call this through the proxy. The
   * `addLocation` / `removeLocation` chokepoints on the zone side
   * are the legitimate callers; everyone else is rejected.
   *
   * Clone-time seeding from `StuffApi.#cloneInner` doesn't go
   * through this method — it uses the caller-allowlisted
   * `_stampZone` seam below.
   *
   * `@Final @Unshadowable` because the index of substrate
   * invariants that consult `getZone()` (containment's
   * cross-zone gate, Mobile.traverse, MQL scope walks) trusts
   * the slot's value; a subclass override or shadow that lied
   * about it could break those invariants. No legitimate
   * subclass needs to extend this anyway — the only legitimate
   * write paths are the `SpatialZone` chokepoints and clone-time.
   */
  @Final
  @Unshadowable
  @CallSecurity(FromSpatialZone)
  public setZone(value: SpatialZone | null): void {
    ProxyApi.unwrap(this as unknown as Stuff).#zone = value;
  }

  /**
   * Pre-register stamp seam — used by `StuffApi.#cloneInner` to
   * seed `zone` at clone time, BEFORE the proxy wrap. The clone
   * pipeline runs before any SpatialZone-side chokepoint fires;
   * if it went through the gated public setter, the proxy gate
   * (which on the raw target wouldn't fire anyway, but at runtime
   * would reject the StuffApi caller) would be the wrong shape.
   *
   * Caller-gated identically to `_stampTemplatePath` — only
   * `mud/api/stuff.ts`, the test-setup helper, and `*.test.ts`
   * files may invoke this. Anyone else trying to forge a zone
   * stamp through this seam is rejected.
   * @internal
   */
  public static _stampZone(stuff: Stuff, zone: SpatialZone | null): void {
    Stuff.#assertStampGateAllowed('_stampZone');
    ProxyApi.unwrap(stuff).#zone = zone;
  }

  /**
   * The circle scope this object belongs to — `null` for every ordinary
   * field object (zero cost by default), a wire parcel path
   * (`/home/<playerId>` / `/studio/<groupId>`) for a circle-born object.
   * Stamped at mint from the *minting context's* ambient scope
   * (`ExecutionContextApi.getCircleScope()` inside `StuffApi`'s register
   * path) — the induction that makes the sandbox boundary hold: objects
   * minted under circle context are circle-scoped, everything else stays
   * null with no work done.
   *
   * Hard-private (`#`) for tamper-resistance — same shape and same
   * threat model as `#zone`: the security gate's boundary check trusts
   * this slot, so a bracket-write forgery would be a containment escape.
   * Runtime-only: never persisted (a circle-born object's durable rows
   * carry the scope via the PM policy seam instead).
   */
  #circleScope: string | null = null;

  /**
   * The circle scope stamp, or `null` for a field object. Unwraps via
   * `RAW_TARGET` because the `#` slot lives on the raw target only.
   */
  public getCircleScope(): string | null {
    return ProxyApi.unwrap(this as unknown as Stuff).#circleScope;
  }

  /**
   * Restamp the circle scope — the rare cross-boundary move (promotion,
   * future governance acts). `ApiOnly`-gated: only Api-layer callers
   * (in practice `SandboxLogic` via its facade) may restamp; ordinary
   * player paths never touch this. Mint-time stamping uses the
   * caller-allowlisted `_stampCircleScope` seam instead.
   */
  @Final
  @Unshadowable
  @CallSecurity(SecurityPolicies.ApiOnly)
  public setCircleScope(value: string | null): void {
    ProxyApi.unwrap(this as unknown as Stuff).#circleScope = value;
  }

  /**
   * Pre-register stamp seam for the circle scope — used by `StuffApi`'s
   * register path to stamp newborns from the minting context's scope,
   * BEFORE the proxy wrap. Caller-gated identically to `_stampZone`.
   * @internal
   */
  public static _stampCircleScope(stuff: Stuff, scope: string | null): void {
    Stuff.#assertStampGateAllowed('_stampCircleScope');
    ProxyApi.unwrap(stuff).#circleScope = scope;
  }

  /**
   * Flag indicating whether this object has been destroyed.
   * Once destroyed, the object should not be used.
   */
  private _isDestroyed: boolean = false;

  /**
   * Recency timestamp for the residency (self-eviction) sweep. The
   * security gate calls `touch()` on the raw target after every
   * successful non-getter dispatch; the sweep reads `getLastTouched()`
   * (via `RAW_TARGET`, so asking never counts as a touch).
   *
   * Transient: never persisted, not in `persistentFields` or
   * `PASSTHROUGH_KEYS`; resets to construction time on every
   * clone/hydrate. TS-`private` (not `#`) so `touch()` works whether
   * `this` is the raw target or the security proxy — but the real
   * callpaths (the gate and the sweep) both operate on the **raw**
   * target, so `this` is raw there and no proxy is involved.
   *
   * Trade-off vs. the `#` scaffold: a raw-field write (`obj.lastTouched
   * = …`) can forge this value. That forge-resistance is intentionally
   * dropped — the field isn't security-sensitive, `touch()` itself is
   * still timestamp-fixed (no caller value), and the `canEvict` /
   * `canDestruct` vetoes backstop any force-cull.
   */
  private lastTouched: number = Date.now();

  /**
   * Refresh the recency timestamp to now. Timestamp-fixed (no
   * caller-supplied value). Called on the **raw** target by the
   * security gate on every successful dispatch (Phase 2) and by the
   * residency presence walk.
   */
  public touch(): void {
    this.lastTouched = Date.now();
  }

  /**
   * Read the recency timestamp. Read by the residency sweep — which
   * calls it on the raw target (via `RAW_TARGET`) so the sweep's own
   * introspection never counts as a touch.
   */
  public getLastTouched(): number {
    return this.lastTouched;
  }

  /**
   * Construction sentinel. Set to `true` immediately before
   * `StuffApi.#registerAndInit` invokes a factory or `new
   * ClassConstructor()`, then reset by the constructor when it consumes
   * the flag. Raw `new SomeStuff()` from outside `StuffApi` finds the
   * flag false and throws — the only legitimate construction path is
   * via `StuffApi.create` / `StuffApi.clone`.
   *
   * Hard-private: a wrapping Proxy must not be able to flip the flag,
   * and a malicious subclass field with the same name must not collide.
   */
  static #expectingConstruction: boolean = false;

  /**
   * Internal helper called by `StuffApi.#registerAndInit` immediately
   * before invoking the factory or `new ClassConstructor()`. The sentinel
   * MUST be paired with the constructor's consumption — never set it
   * without immediately running construction in the same synchronous
   * scope, or a parallel call could observe it set and bypass.
   *
   * Locked down by stack-walk allowlist: only callers from `mud/api/`
   * (StuffApi's create/clone/createSync),
   * `mud/lib/security/__tests__/test-setup` (the `makeStuff` helper),
   * or test files may flip the sentinel.
   * Anything else throws — closes the "replicate StuffApi's flow
   * without registering" attack the MR review flagged.
   *
   * The leading underscore signals "framework-internal"; matches the
   * existing convention (see `StuffApi._validateClassPath` test seam).
   * @internal
   */
  public static _beginConstruction(): boolean {
    Stuff.#assertConstructionGateAllowed('_beginConstruction');
    const prev = Stuff.#expectingConstruction;
    Stuff.#expectingConstruction = true;
    return prev;
  }

  /**
   * Companion to `_beginConstruction`. Called by `StuffApi`'s finally-
   * block to restore the sentinel even if construction throws. Pass the
   * value returned from the matching `_beginConstruction` to enable
   * nested begin/end pairs (otherwise pass `false`). Same stack-walk
   * allowlist applies.
   * @internal
   */
  public static _endConstruction(prev: boolean = false): void {
    Stuff.#assertConstructionGateAllowed('_endConstruction');
    Stuff.#expectingConstruction = prev;
  }

  /**
   * File-URL patterns whose code may flip the construction sentinel.
   * Same shape as `ExecutionContextApi`'s frame-mutator allowlist —
   * different method, different allowlist, but identical mechanism.
   */
  static #constructionGateAllowlist: ReadonlyArray<RegExp> = [
    /\/mud\/api\//,                                  // StuffApi.create / clone / createSync
    /\/mud\/lib\/security\/__tests__\/test-setup\.(ts|js)$/, // `makeStuff` test seam
    /\.test\.(ts|js)$/,                              // direct test usage
  ];

  static #constructionGateCache: Map<string, boolean> = new Map();

  /**
   * Throw if the immediate caller of `_beginConstruction` /
   * `_endConstruction` isn't on the allowlist. Per-URL cached, so the
   * cost is one stack walk per file ever; after warmup it's a Map
   * lookup. New legitimate callers must be added here with a one-line
   * justification — keep the list narrow.
   */
  static #assertConstructionGateAllowed(op: string): void {
    const url = ModuleApi.getImmediateCallerUrl(Stuff.#SELF_URL);
    if (url === null) {
      throw new Error(
        `Stuff.${op}() refused: caller URL could not be determined`
      );
    }
    const cached = Stuff.#constructionGateCache.get(url);
    if (cached === true) return;
    if (cached === false) {
      throw new Error(
        `Stuff.${op}() refused from ${url}: only StuffApi (mud/api/**), ` +
          `the test-setup helper (mud/lib/security/__tests__/test-setup), and ` +
          `*.test.ts files may flip the construction sentinel`
      );
    }
    const allowed = Stuff.#constructionGateAllowlist.some((re) => re.test(url));
    Stuff.#constructionGateCache.set(url, allowed);
    if (!allowed) {
      throw new Error(
        `Stuff.${op}() refused from ${url}: only StuffApi (mud/api/**), ` +
          `the test-setup helper (mud/lib/security/__tests__/test-setup), and ` +
          `*.test.ts files may flip the construction sentinel`
      );
    }
  }

  /**
   * Self-skip pattern for `ModuleApi.getImmediateCallerUrl` — frames
   * inside `Stuff.ts` (the construction-gate / branch-registration
   * helpers themselves) are dropped so the first reported frame is
   * the actual caller.
   */
  static #SELF_URL = /\/mud\/lib\/stuff\/Stuff\.(ts|js)(\?|$|:)/;

  /**
   * Constructor - generates unique runtime ID.
   *
   * Subclass constructors should call super() and then initialize their
   * fields. Use field initializers for default values where possible.
   *
   * IMPORTANT: Direct `new SomeStuff()` is rejected — every Stuff must
   * be created via `StuffApi.create(() => new YourClass())` or
   * `StuffApi.clone(...)`. The construction sentinel above guarantees
   * this; raw `new` outside the Api layer throws here.
   *
   * Constructor-body method calls bypass the Proxy (the Proxy is
   * installed AFTER the constructor returns). Initialize fields here;
   * do NOT invoke methods that carry @CallSecurity from inside a
   * constructor body.
   */
  constructor() {
    if (!Stuff.#expectingConstruction) {
      throw new Error(
        `Direct 'new' on a Stuff subclass is not allowed. ` +
          `Use StuffApi.create(() => new YourClass()) or StuffApi.clone(path).`
      );
    }
    Stuff.#expectingConstruction = false;
    Stuff.#assertTopLevelBranch(this.constructor as AnyClassRef);
    this.stuffId = SecurityApi.uuid();
  }

  /**
   * The sanctioned top-level branch constructors (Thing / Location /
   * Idea / Agent / Shadow), by **class identity**. Every concrete Stuff
   * subclass must trace through one of these in its prototype chain.
   * Identity — not module id — because it's robust across every module
   * loader (the vite-plugin, tsx, and the production node-hook stamp
   * default exports differently; a module-id check that passes under
   * one silently fails under another). A foreign same-named class is a
   * different constructor object and never matches. (A `Vessel` is a
   * container-object that `extends Thing`, so it traces the Thing
   * branch — it is not a branch of its own.)
   *
   * Populated ONCE via {@link registerTopLevelBranches} at framework
   * wiring (`BootstrapManager.installFrameworkWiring`, and the vitest
   * setup file) — a lifecycle call, not a module-scope statement (the
   * no-module-scope-statements rule). The value-import of the five
   * classes lives at the wiring site (backend), which sidesteps the
   * `Stuff` ↔ branch load cycle a value-import into this file would
   * create.
   */
  static #branches: Set<AnyClassRef> = new Set();

  /**
   * File-URL patterns whose code may call `_registerTopLevelBranch`.
   * Same machinery as the frame-mutator allowlist: only the five branch
   * files may register, so the branch set can't be extended from a
   * subclass or a third-party file.
   */
  static #branchRegistrationAllowlist: ReadonlyArray<RegExp> = [
    /\/mud\/lib\/stuff\/(Thing|Location|Idea|Agent|Shadow)\.(ts|js)$/,
  ];

  static #branchRegistrationCache: Map<string, boolean> = new Map();

  /**
   * Register a top-level branch by **class identity**. Each of the five
   * branch modules (Thing / Location / Idea / Agent / Shadow) calls this
   * once at its own module tail.
   *
   * WHY this is a module-scope self-registration (the one sanctioned
   * exception to "module scope declares; lifecycles initialize" — see
   * `scripts/check-module-scope.ts`'s allowlist): the branch check is
   * the type hierarchy's ROOT invariant, enforced in the `Stuff`
   * constructor, so the branch set must be populated before ANY Stuff
   * is constructed — including lazy singletons built during seeding /
   * pack-install, before any boot-lifecycle seam runs. Self-registration
   * from within each branch module guarantees that ordering AND that the
   * registered class is the SAME copy the rest of mudlib extends (a
   * lifecycle call from `backend/` force-imports the hierarchy early and
   * trips latent mixin-composition load cycles). Identity — not module
   * id — because the vite-plugin / tsx / node-hook loaders stamp default
   * exports differently; identity is loader-agnostic.
   *
   * @internal
   */
  public static _registerTopLevelBranch(ctor: AnyClassRef): void {
    const url = ModuleApi.getImmediateCallerUrl(Stuff.#SELF_URL);
    if (url === null) {
      throw new Error(
        `Stuff._registerTopLevelBranch refused: caller URL could not be determined`
      );
    }
    let allowed = Stuff.#branchRegistrationCache.get(url);
    if (allowed === undefined) {
      allowed = Stuff.#branchRegistrationAllowlist.some((re) => re.test(url));
      Stuff.#branchRegistrationCache.set(url, allowed);
    }
    if (!allowed) {
      throw new Error(
        `Stuff._registerTopLevelBranch refused from ${url}: only the ` +
          `five branch files (lib/stuff/{Thing,Location,Idea,Agent,Shadow}.ts) ` +
          `may register branches.`
      );
    }
    Stuff.#branches.add(ctor);
    Stuff.#branchCheckCache = new WeakSet();
  }

  /**
   * Cache of constructors known to trace through a registered branch.
   * Misses are not cached — failing classes should never be
   * constructed twice.
   */
  static #branchCheckCache: WeakSet<object> = new WeakSet();

  /**
   * Throw if `ctor` doesn't trace through one of the sanctioned
   * top-level branches. Walks `Object.getPrototypeOf(ctor)` upward
   * comparing constructor identity against `#branches`. See
   * `docs/architecture.md § Top-level branches` for the rule and the
   * rationale.
   */
  static #assertTopLevelBranch(ctor: AnyClassRef): void {
    if (Stuff.#branchCheckCache.has(ctor)) return;
    let cur: AnyClassRef | null = ctor;
    while (cur) {
      if (Stuff.#branches.has(cur)) {
        Stuff.#branchCheckCache.add(ctor);
        return;
      }
      cur = Object.getPrototypeOf(cur) as AnyClassRef | null;
    }
    throw new Error(
      `Stuff subclass '${ctor.name || '<anonymous>'}' does not extend ` +
        `through one of the top-level branches: Thing, Location, Idea, ` +
        `Agent, or Shadow. See ` +
        `docs/architecture.md § Top-level branches.`
    );
  }

  /**
   * Check if this object has been destroyed.
   *
   * `@Unshadowable`: the destroyed-state read is a framework invariant —
   * any shadow that lied about it would let consumers touch a torn-down
   * Stuff. `@Final`: subclasses overriding this would defeat the same
   * invariant; the loader hook throws `FinalViolationError` at import
   * time on any subclass that redefines it.
   */
  @Final
  @Unshadowable
  public isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * Destroy this object.
   *
   * Locked down by `@CallSecurity(ApiOnly)` — only callers under
   * `mud/api/` (in practice, `StuffApi.destruct`) may invoke it.
   * `@Unshadowable` because the unregistration path must always run;
   * a shadow that intercepts and skips it would leak the object into
   * the registry forever. `@Final` because subclass overrides would
   * defeat the same invariant — the loader hook throws
   * `FinalViolationError` at import time on any subclass redefinition.
   *
   * Subclass cleanup belongs on the optional `onDestruct()` witness
   * (consulted by `StuffApi.destruct` while the target is still live);
   * refusal logic belongs on `canDestruct()`. This terminal `destroy()`
   * is the unshadowable mark-and-unregister step only.
   */
  @Final
  @Unshadowable
  @CallSecurity(SecurityPolicies.ApiOnly)
  public destroy(): void {
    if (this._isDestroyed) {
      console.warn(`Stuff.destroy(): Object ${this.stuffId} already destroyed`);
      return;
    }

    // Mark as destroyed (prevents double-destroy)
    this._isDestroyed = true;

    // Critical housekeeping - unregister from StuffApi
    // This MUST happen for garbage collection to work properly
    StuffApi.unregister(this);
  }

  /**
   * Terminal `onDestruct` no-op. Exists so subclasses and mixins
   * overriding `onDestruct` can call `super.onDestruct()` without
   * the cast-to-optional-callable dance — the chain is guaranteed
   * to bottom out here. `StuffApi.destruct` invokes the hook via
   * the optional-method dispatcher in `api/stuff.ts`; that path
   * still works (always finds a function on the prototype).
   *
   * Override (not extend with `super`) at any layer that wants
   * cleanup; chain to `super.onDestruct()` from the override so
   * intermediate layers in a mixin chain run too.
   *
   * @hook Invoked by `StuffApi.destruct` (and `forceDestruct`) while
   *   the target is still live, after `canDestruct` passes and before
   *   shadow-detach + `destroy()`. **Witness** — the return value is
   *   ignored (it cannot veto; `canDestruct` is the veto seam). Override
   *   to release resources/listeners and **chain `super.onDestruct()`**
   *   so mixin layers run.
   */
  public onDestruct(): void {}

  /**
   * Consent seam for the residency (self-eviction) sweep. The sweep
   * asks each idle object whether it may be culled; the object decides,
   * reading its own knowledge. Default is **cull** (`{ ok: true }`) — a
   * fresh backing class is reclaimable by default and only becomes
   * sticky when its author deliberately vetoes, the correct bias for a
   * leak-plugger. Return `{ ok: false, reason }` to veto.
   *
   * Vetoes layer on the mixin/class that *owns* the relevant
   * relationship, composed via `super.canEvict(context)` — base `Stuff`
   * stays permissive and does not reach into Container/Shadow/Avatar/
   * Exit knowledge. The relational vetoes derive from the R2.x
   * ref-cleanup rules: an object in an owned/symmetric live-ref
   * relationship vetoes while its anchor is alive (see
   * `docs/subsystems/residency.md`).
   *
   * Distinct from `canDestruct`: an object that permits eviction can
   * still `canDestruct`-veto, so the sweep's enforce path tolerates a
   * `DestructError` (logs + continues). The sweep calls this on the
   * **raw** target (via `RAW_TARGET`) so asking never counts as a touch.
   *
   * @hook Invoked by the residency sweep (`ResidencyLogic`) on idle
   *   candidates. **Veto seam** — `{ ok: false, reason }` keeps the
   *   object resident. Override on the owning mixin/class and **chain
   *   `super.canEvict(context)`** so composed layers run. Public and
   *   ungateable (a subclass's `super.canEvict()` is author code).
   */
  public canEvict(context: EvictionContext): VetoResult {
    // Silence unused-param lint at the permissive base; overrides read it.
    void context;
    return { ok: true };
  }

  /**
   * Get a string representation of this object (for debugging).
   */
  public toString(): string {
    return `[Stuff ${this.stuffId}${this._isDestroyed ? ' (destroyed)' : ''}]`;
  }
}
