// ConditionLogic — the hot-reloadable logic singleton behind ConditionApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Interactive from '../../../platform/idea/Interactive';
import { MixinApi } from '../../../api/mixin';
import { MaterialApi } from '../../../api/material';
import { ExecutionContextApi } from '../../../api/execution-context';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from '../Condition';
import { MATERIAL_FORK_SLICES } from '../../../lib/vitals/Vitals';
import type { Vitals } from '../../../lib/vitals/Vitals';
import type { MortalArc } from '../../../lib/mortality/MortalArc';
import { ContainmentApi } from '../../../api/containment';
import { SandboxApi } from '../../../api/sandbox';
import { PersistableApi } from '../../../api/persistable';
import { PlayerApi } from '../../../api/player';
import { AccountabilityApi } from '../../../api/accountability';
import { SpeciesApi } from '../../../api/species';
import { SecurityApi } from '../../../api/security';
import AccountabilityEvent, {
  type AccountabilityFields,
} from '../../../lib/accountability/AccountabilityEvent';
import type { DeathSpec } from '../../../api/condition';
import { Channels } from '../../../lib/material/Channel';
import type { Channel } from '../../../lib/material/Channel';
import type { Construction } from '../../../lib/material/Construction';
import type { Grade } from '../../../lib/craft/Grade';
import type Material from '../../../lib/material/Material';
import type {
  Trauma,
  TraumaType,
  AfflictionRecord,
} from '../Condition';
import type {
  InflictSpec,
  InflictOutcome,
  CorrosionInflictSpec,
  EnergyInflictSpec,
  ShockInflictSpec,
} from '../../../api/condition';

const ConditionApiCallers = SecurityPolicies.FromModule(
  '/api/condition#ConditionApi'
);

/**
 * The channel's default trauma type — used to *record* a deflected (null-
 * resolution) blow's shape and to name the trauma a channel produces:
 * edge→laceration, point→puncture, blunt→contusion. `resolveTrauma`
 * refines blunt to a fracture on a boned part; this is the base.
 */
function channelDefaultType(channel: Channel): TraumaType {
  switch (channel) {
    case 'edge':
      return 'laceration';
    case 'point':
      return 'puncture';
    case 'blunt':
      return 'contusion';
    case 'shock':
      // A shock's local wound is a contact burn (the whole-body
      // let-go/tetany/fibrillation outcomes are the vitals coupling).
      return 'burn';
    case 'heat':
      // Heat that survives the insulation stack burns the tissue.
      return 'burn';
    case 'cold':
      // The same insulation stack, run the other way.
      return 'frostbite';
    case 'corrosion':
      // What got past the covering is still chemically active when it
      // reaches skin — that is what makes it different from a burn.
      return 'caustic';
  }
}

/**
 * The legacy magnitude-only severity — `energy → severity`, linear via a
 * single dial. Used ONLY by the `'tearing'` passthrough (avulsion) until it
 * folds into a tearing channel. Channel insults (including `heat`) derive
 * severity from the materials-response function instead.
 */
function severityFromEnergy(energy: number): number {
  return Math.max(0, energy) * HARM_DEFAULTS.SEVERITY_PER_ENERGY;
}

/** One armor layer over a struck part — the materials-response inputs. */
interface CoveringLayer {
  /** The armor/shield Stuff itself (the wear-on-use target). */
  occ: Stuff;
  material: Material | null;
  construction: Construction;
  grade: Grade | undefined;
  condition: number;
}

/** Numeric AppSetting read, falling back to the seeded literal (the
 * `Combustible` dial pattern — pre-warm / test safe). */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Resolve the armor covering `partKey` on `host`, ordered **outside-in**
 * (outer layer first). Reads the body plan's `getSlotsCovering` (the
 * `covers` edge), keeps the occupants that are `Constructed` armor +
 * `Wearable`, and sorts by construction layer depth (plate outer … padded
 * inner). A module-private free function (no intra-singleton self-call).
 */
function resolveCoveringStack(
  host: Stuff,
  partKey: string,
  shieldFacing = true
): CoveringLayer[] {
  if (!MixinApi.isOrganism(host) || !MixinApi.isAttired(host)) return [];
  // ⭐ ONE outside-in walk, on the host that owns the slots. This used
  // to be a hand-rolled copy — the same loop existed here, in the
  // struck-site armor stack, and in the conduction walk. `coveringAt`
  // returns the occupants ordered by the ladder and leaves the
  // narrowing to the caller, because each of the three cares about a
  // different property.
  //
  // `includeHeld` is the shield: a `Wieldable` carrying a COVERING
  // construction (armor you hold, not wear) fronts a *facing* attacker
  // and is not tied to a `covers` edge — combat gates it so a flanking
  // blow under focus-fire bypasses it.
  const layers: CoveringLayer[] = [];
  for (const occ of host.coveringAt(partKey, { includeHeld: shieldFacing })) {
    const asStuff = occ as unknown as Stuff;
    if (!MixinApi.isConstructed(asStuff)) continue;
    const construction = asStuff.getConstruction();
    if (!construction || !construction.isCovering()) continue;
    layers.push(layerOf(asStuff, construction));
  }
  return layers;
}

/** Build a covering layer from an armor/shield occupant. */
function layerOf(occ: Stuff, construction: Construction): CoveringLayer {
  return {
    occ,
    material: MixinApi.isTangible(occ) ? occ.getMaterial() : null,
    construction,
    grade: MixinApi.isGraded(occ) ? occ.getGrade() : undefined,
    condition: MixinApi.isDurable(occ) ? occ.getCondition() : 1,
  };
}

/** Does the resolved part carry a bone tissue (gates blunt → fracture)? */
function partHasBoneTissue(part: { tissues?: { tissuePath: string }[] }): boolean {
  for (const t of part.tissues ?? []) {
    const mat = StuffApi.findByTemplatePath<Material>(t.tissuePath);
    if (mat && mat.hasTag('bone')) return true;
    if (t.tissuePath.includes('bone')) return true; // pre-load fallback
  }
  return false;
}

/** The first resolvable tissue Material of the part (v1: type-decision only). */
function primaryTissueMaterial(part: {
  tissues?: { tissuePath: string }[];
}): Material | null {
  for (const t of part.tissues ?? []) {
    const mat = StuffApi.findByTemplatePath<Material>(t.tissuePath);
    if (mat) return mat;
  }
  return null;
}

/**
 * Resolve the inflicter's durable `templatePath` from execution context —
 * the command-frame giver (non-forced, single-consistent) or the REST
 * acting-author stamp. Never a caller-supplied parameter (the gated-Api
 * actor-from-context rule); `undefined` for an environmental / far-cause
 * / unattributable insult (forced dispatch, cross-actor cascade).
 */
function resolveInflicter(): string | undefined {
  const author = ExecutionContextApi.getActingAuthor();
  if (author == null) return undefined;
  const path = (author as Stuff).getTemplatePath?.();
  return path ?? undefined;
}

/** In-session game-time seconds, or `null` when no world clock is running. */
function conditionNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}

/**
 * ConditionLogic — the hot-reloadable logic singleton behind
 * {@link ConditionApi}.
 *
 * Lives at `/platform/idea/api/condition` (a stateless `Stuff` singleton, no backing
 * `Template`); `ConditionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The gated **inflict producer** — now resolving
 * a `Channel` insult outside-in through the materials-response covering
 * stack into the tissue (both trauma type and severity), with a legacy
 * `thermal`/`tearing` passthrough — plus the plain condition mutators
 * (`afflict` / `relieve`) and the condition query. Wound progression
 * (bleed / heal / death) is
 * driven **reconcile-on-read** by `VitalsMixin.reconcileConditions` — this
 * singleton holds NO tick handles and NO in-memory state. Internal
 * sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate. `dest /platform/idea/api/condition` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ConditionLogic extends ApiLogic {
  /** See {@link ConditionApi.inflict}. */
  @CallSecurity(ConditionApiCallers)
  public inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    const inflicter = resolveInflicter();
    // Shock is intercepted FIRST — its path resistance was resolved upstream
    // in the conduction walk, so it skips the covering-stack fold entirely (a
    // third path beside the mechanical fold + the thermal/tearing passthrough,
    // leaving both byte-identical).
    if (spec.mechanism === 'shock') {
      return inflictShock(target, spec, inflicter);
    }
    // `spec` is now the energy-carrying variant (shock excluded). A
    // corrosive one carries the agent's chemistry; everything else has
    // none, and an empty list attacks nothing.
    if (spec.mechanism === 'corrosion') {
      return inflictThroughStack(
        target,
        spec,
        'corrosion',
        inflicter,
        spec.corrosiveTo,
      );
    }
    return Channels.isChannel(spec.mechanism)
      ? inflictThroughStack(target, spec, spec.mechanism, inflicter)
      : inflictPassthrough(target, spec, inflicter);
  }

  /** See {@link ConditionApi.treatWorstResolvable}. */
  @CallSecurity(ConditionApiCallers)
  public treatWorstResolvable(
    body: Stuff & Vitals,
    supplies: ReadonlySet<string>,
    efficacy: number,
  ): string | null {
    const conditions = [...body.getConditions()];
    // Over every token the caller can supply: a fully-stocked clinic
    // resolves a fracture, a rupture, a burn or a frostbite too — through
    // the ONE treatment primitive, not a skilled per-wound check (that is
    // `treat`'s job). We take the single worst dressable trauma whose
    // resolution the supplies cover.
    const worst = conditions
      .filter((c): c is Trauma => c.kind === 'trauma')
      .filter((t) => !t.dressed && t.severity > 0)
      .filter((t) => supplies.has(TRAUMA_BEHAVIOR[t.type]?.resolution ?? ''))
      .sort((a, b) => b.severity - a.severity)[0];
    if (worst) {
      body.applyTreatment(worst, {
        by: TRAUMA_BEHAVIOR[worst.type].resolution ?? 'dressing',
        efficacy,
      });
      return `the ${worst.type}`;
    }
    // Then an illness — the load knock a competent hand is worth.
    const ill = conditions
      .filter((c): c is AfflictionRecord => c.kind === 'affliction')
      .filter((a) => (a.pathogenLoad ?? 0) > 0)
      .sort((a, b) => (b.pathogenLoad ?? 0) - (a.pathogenLoad ?? 0))[0];
    if (ill) {
      ill.pathogenLoad = Math.max(0, (ill.pathogenLoad ?? 0) * 0.4);
      if (ill.pathogenLoad <= 0.01) body.relieve(ill);
      return 'the fever';
    }
    return null;
  }

  /** See {@link ConditionApi.die}. */
  @CallSecurity(ConditionApiCallers)
  public die(host: Stuff, cause: string, spec?: DeathSpec): Promise<void> {
    return dieImpl(host, cause, spec);
  }

  /** See {@link ConditionApi.embodyForSession}. */
  @CallSecurity(ConditionApiCallers)
  public embodyForSession(avatar: Stuff): Promise<Stuff> {
    return embodyForSessionImpl(avatar);
  }

  /** See {@link ConditionApi.reembody}. */
  @CallSecurity(ConditionApiCallers)
  public reembody(shade: Stuff): Promise<Stuff> {
    return reembodyImpl(shade);
  }

  // The former `afflict` / `relieve` / `conditionsOf` thin forwarders
  // were removed (item-1 antipattern sweep): callers narrow with
  // `MixinApi.isVitals` and call `target.afflict` / `.relieve` /
  // `.getConditions()` directly. `inflict` (the producer above) stays.
}

/**
 * Bodies currently mid-transition. `die` does its lifecycle-visible work
 * synchronously and its ledger writes after an `await`, so a second read
 * on the same tick can re-enter; the guard is entered in the sync prefix,
 * never after the await, or the re-entry it exists to stop slips past it.
 */
const dying = new Set<string>();

/**
 * The structural shape of a player body — what the death choreography
 * needs from it, without importing the Avatar tree (an import cycle).
 */
interface PlayerBody {
  getPlayerId(): string;
  setMortalArc(arc: MortalArc | null): void;
  stopAutoSave(): void;
  markForRevert(): void;
  save(): Promise<void>;
  getInteractives(): Iterable<unknown>;
  enter(interactive: never): Promise<void>;
  getUser?(): unknown;
  setUser?(user: unknown): void;
}

/**
 * The single death transition (see {@link ConditionApi.die} for the
 * contract). Module-private so the gated method makes no intra-singleton
 * self-call.
 *
 * Ordering is the substance of this function. Everything that changes what
 * the world can observe happens BEFORE the first `await`; the ledger
 * writes come after, because they are I/O and no reader is waiting on
 * them.
 */
async function dieImpl(
  host: Stuff,
  cause: string,
  spec?: DeathSpec,
): Promise<void> {
  // ── synchronous prefix ────────────────────────────────────────────
  // ⚠⚠ **The destroyed check comes FIRST, and it has to.** Every guard
  // below asks the host a question, and a destroyed Stuff answers every
  // question with `undefined` rather than throwing (`api/security.ts` —
  // the inert proxy). So `host.isDead()` reads falsy on a body that has
  // already been replaced by its corpse, the guard falls through, and the
  // next line crashes on `getConditions().find`. Harmless before this
  // build, because the only destructing death was a player's; now that
  // every death destructs, a second `die` on the same body is the
  // ordinary case — the dying window's expiry firing after a kill, or
  // anything holding a ref across the await.
  if (host.isDestroyed()) return;
  if (dying.has(host.stuffId)) return;
  if (!MixinApi.isOrganism(host) || host.isDead()) return;
  if (!MixinApi.isVitals(host)) return;
  dying.add(host.stuffId);

  try {
    // A dying record may be carrying attribution stamped by whoever put
    // the body in the window (combat stamps a bleed-out it caused). The
    // explicit spec wins; otherwise inherit what the record carried.
    const record = host
      .getConditions()
      .find((c) => c.kind === 'dying');
    const attribution =
      spec?.accountability ??
      (record?.kind === 'dying' ? record.accountability : undefined);
    if (record) host.relieve(record);

    // ── the split ───────────────────────────────────────────────────
    // ⭐⭐ **ONE BODY, TWO CHOREOGRAPHIES**, and the axis is whether an
    // identity has to leave. race.md's "death is not destruction" holds
    // either way, and now holds in the same sentence for both: every
    // death mints a `Corpse` and destructs the thing that died.
    //
    //  - nothing to walk away  → the body is replaced by its corpse.
    //  - a player identity     → the body DIVIDES: the corpse takes the
    //    material half, and the identity walks off as a shade.
    //
    // ⚠ It used to be two mechanisms, and the cheap one was wrong. A
    // beast or an NPC was flipped to `dead` in place and kept every mixin
    // it had, so a dead ewe was a ewe that could no longer be milked,
    // sheared, handled or herded, and the realm showed every one of those
    // disabled capabilities to the player. Two kinds of death read as two
    // kinds of object with nothing to explain the asymmetry. A corpse's
    // lifecycle is genuinely a different lifecycle — it cools, it decays,
    // it is evidence, it is never alive again — so it is a different
    // object. The mint is lossy on purpose (a herd place, a bond, a job,
    // a brain: none of it is true of a body).
    const player = playerBodyOf(host);

    // The accountability row is a SYNCHRONOUS fire-and-forget append, and
    // it stays in the sync prefix deliberately: a consumer that reads the
    // ledger in the same turn as the killing blow (combat's own coup
    // choreography does) must not race the write.
    //
    // ⚠⚠ **It is hoisted ABOVE the circle branch, which used to `return`
    // before reaching it.** `sandbox.md` classes `accountability_events`
    // PASS(mark) — *"Identity-real … what happened to YOU stays yours"* —
    // and a death inside a circle wrote no row at all, so the one thing
    // the policy promises to keep was the one thing dropped. The mark is
    // stamped by the persistence layer from the ambient circle context,
    // and `deriveBlame` is what refuses to convict on it: recorded, and
    // structurally incapable of being evidence.
    AccountabilityApi.record(
      (attribution as AccountabilityFields | undefined) ??
        environmentalRow(host),
    );

    // A death inside a holodeck circle is REAL there and discarded with
    // it — which is the point of a holodeck, and what lets an author test
    // a lethal trap on themselves. The body leaves a circle-scoped corpse
    // (born in the circle, reaped with it) and the player is ejected to
    // the field body that was parked all along.
    //
    // No shade, no arc, no snapshot: minting a real body from inside a
    // circle is exactly the boundary the sandbox exists to hold. The
    // discriminator is the receiver's circle stamp rather than
    // `instanceof SandboxAvatar`, so a future circle vessel of another class
    // behaves identically without being enumerated here.
    if (player && host.getCircleScope() !== null) {
      host.setCauseOfDeath(cause);
      await ejectFromCircle(host, player, cause);
      return;
    }

    if (!player) {
      host.setCauseOfDeath(cause);
      // ⭐ The flip is still SYNCHRONOUS, and it is what a same-tick
      // reader sees. Combat's cull narrates and resolves its session
      // inside this very turn, before the tail below has replaced
      // anything — so `isDead()` is already true for every consumer that
      // runs between the killing blow and the next await. The flip also
      // stamps `diedAt`, which is what makes the corpse's age the age it
      // died at rather than its age now.
      host.setLifecycleState('dead');
      // Start the postmortem clock. Algor mortis needs no code: a body
      // that stops regulating drifts toward ambient through the shipped
      // Thermal layer all by itself.
      if (MixinApi.isPostmortem(host)) {
        const nowS = conditionNowSeconds();
        if (nowS !== null) host.markDeceasedAt(nowS);
      }
      // ⚠⚠ **Before the first await**, or a periodic capture can write a
      // DEAD body into `holder_snapshots` and the boot-time
      // `resetVitalsToSpeciesBaseline` backstop would stand a destructed
      // pet back up alive. The player path does exactly this at step (a)
      // / (g) of `divideBody`; a named animal is `Persistable` too, and
      // this is the one line that keeps it from becoming a zombie.
      if (MixinApi.isPersistable(host)) host.markForRevert();
    }

    // ── async tail ──────────────────────────────────────────────────
    await recordDeathDeed(host, cause);
    if (player) {
      await divideBody(player, cause);
      return;
    }

    // ⚠ **Re-check after every await.** A body can be destructed while
    // it sits in the dying window by something that is not this
    // transition — the fox eats the hen it has just mauled
    // (`trade-ranching/src/behavior/raids.ts`) — and the window's expiry
    // then runs `die` on a corpse-shaped hole. A destroyed Stuff is
    // INERT rather than throwing (`api/security.ts`), so without these
    // the mint would clone a body out of `undefined` reads and lay it in
    // nowhere.
    if (host.isDestroyed()) return;
    const nowS = conditionNowSeconds() ?? 0;
    await mintCorpseFrom(host, materialSlicesOf(host), cause, nowS);
    if (host.isDestroyed()) return;
    await StuffApi.destruct(host);
  } finally {
    dying.delete(host.stuffId);
  }
}

/**
 * The host as a player body, or `null`.
 *
 * Detected STRUCTURALLY rather than by `instanceof Avatar`: this module
 * must not statically import the Avatar tree (an import cycle), and a
 * future player-bearing class should behave identically without being
 * enumerated here.
 */
function playerBodyOf(host: Stuff): PlayerBody | null {
  if (!MixinApi.isHasInteractive(host)) return null;
  const candidate = host as unknown as PlayerBody;
  if (typeof candidate.getPlayerId !== 'function') return null;
  if (!candidate.getPlayerId()) return null;
  if (typeof candidate.setMortalArc !== 'function') return null;
  return candidate;
}

/**
 * Divide a player's body: the corpse takes the material half and the
 * loadout, the identity takes the arc, and the drained shell is destructed
 * so a shade can hold the identity path.
 *
 * ⭐ **This is the PLAYER'S specialization of the shared mint**, not a
 * second kind of death. `materialSlicesOf` and `mintCorpseFrom` below are
 * called by both paths and are where "what a corpse carries" is decided
 * once. What is player-only is everything around them: an autosave to
 * stop, an arc to record on an identity, a body to drain back to a living
 * baseline so nothing dead ever reaches `holder_snapshots`, a snapshot to
 * take, and a shade to hand the sockets to. A beast has none of those, so
 * its tail is the mint and a destruct.
 *
 * **The ordering here IS the substance.** Each step is placed against a
 * specific failure:
 *
 *   (a) stop the autosave first, or the periodic capture can write a
 *       half-drained body over a good snapshot;
 *   (b) take the material slices BEFORE draining, since draining is what
 *       destroys them;
 *   (c) record the arc on the identity — the durable death fact, and
 *       deliberately never a dead lifecycle on the body;
 *   (d) drain the body to a clean baseline. The avatar is NEVER flipped to
 *       `dead`: that state on a persisted body is the bricking defect;
 *   (e) capture BEFORE anything is destructed, so the snapshot records a
 *       clean body plus the arc;
 *   (f) only then mint the corpse and hand it the gear;
 *   (g) revert-and-destruct the old body BEFORE any new one registers —
 *       `PlayerApi` warns-and-returns on a taken slot and `byTemplatePath`
 *       throws on two live objects at one path;
 *   (h) and only now may the shade take the slot and the sockets.
 */
async function divideBody(avatar: PlayerBody, cause: string): Promise<void> {
  const body = avatar as unknown as Stuff & Vitals;
  const nowS = conditionNowSeconds() ?? 0;
  const held = MixinApi.isHasInteractive(avatar as unknown as Stuff)
    ? [...avatar.getInteractives()]
    : [];

  // (a)
  avatar.stopAutoSave();

  // (b) — before the drain destroys them
  const material = materialSlicesOf(body);

  // (c) — the room is captured as BOTH a durable path (for a shade that
  // comes back at a later login) and a live ref (for the shade minted in
  // this same breath). The live ref is why the walk back up the container
  // chain happens here, while the body is still standing in the world:
  // three lines further down it has been destructed and there is nothing
  // left to ask.
  const fell = MixinApi.isContainable(body) ? body.getContainer() : null;
  const where = fell?.getTemplatePath() ?? undefined;
  avatar.setMortalArc({ diedAt: nowS, cause, whereTemplatePath: where });

  // (d) — a clean, living baseline. NOT dead.
  body.resetVitalsToSpeciesBaseline();
  // ⭐⭐ …and a WHOLE body. A severed limb is cleared here with everything
  // else, so a reembodied player is not headless-and-re-dying on arrival
  // (the anatomy death floor would otherwise brick them). Resurrection
  // restores the body; a living limb-restore is the slated content path.
  body.resetAnatomyToSpeciesBaseline();
  for (const condition of [...body.getConditions()]) body.relieve(condition);
  body.setCauseOfDeath(null);

  // (e)
  try {
    await avatar.save();
  } catch {
    // A snapshot failure must not strand a player mid-transition.
  }

  // (f)
  await mintCorpseFrom(body, material, cause, nowS);

  // (g/h) — mint the shade from the drained body BEFORE destructing it,
  // so the shell fork has something to read.
  const shade = held.length > 0 ? await mintShadeFrom(avatar) : null;

  avatar.markForRevert();
  PlayerApi.unregisterAvatar(avatar as unknown as never);
  await StuffApi.destruct(avatar as unknown as Stuff);

  if (shade) {
    PlayerApi.registerAvatar(shade as unknown as never);
    // STAND IT UP BEFORE HANDING IT THE SOCKETS. `Avatar.enter` refuses a
    // body with no container — it is the spawn contract, and a shade is an
    // Avatar — so a shade minted in mid-air threw straight out of the
    // dying clock's expiry. That rejection surfaced to the player as the
    // client dropping to "Disconnected — reconnecting…" at the exact
    // moment of death: the socket went down with the command, and the arc
    // was unreachable past its first step. The login path
    // (`embodyForSessionImpl`) always placed its shade; this one did not,
    // and nothing caught it because no test drove death with a live
    // connection attached.
    if (fell && MixinApi.isContainable(shade) && MixinApi.isContainer(fell)) {
      ContainmentApi.move(shade, fell);
    }
    for (const interactive of held) {
      (interactive as unknown as Interactive).transferTo(shade as never);
    }
    for (const interactive of held) {
      await (shade as unknown as PlayerBody).enter(interactive as never);
    }
  }
}

/**
 * ⭐ **A corpse's own identity — issue #40's blocker.**
 *
 * Every corpse used to share ONE identity (the template path
 * `/stuff/thing/Corpse`), because nothing stamped one. Per-instance facts
 * survived as hydrated *fields*, which is why nothing looked broken — but
 * every identity-keyed ledger saw one object. Two bodies in a room were
 * one body to the chronicle, to belief, to chattel, to anything that
 * asks *whose is this*. A necropolis that cannot tell two bodies apart is
 * not a necropolis.
 *
 * The scheme is `OuterWarren`'s: a root plus a derived key
 * (`${corpseRoot}/${deceased}/${diedAtGameSec}`, the deceased's leading
 * slash dropped so the two paths compose into segments).
 *
 * ⚠ **It has to survive two things**, and the second is the one that
 * catches people:
 *
 *   - `reembody` — one person can leave several corpses over a life, so
 *     the deceased's key alone is not enough. The **moment** is the
 *     second half.
 *   - a shared deceased key — under D7 an `Extra` keeps its own identity,
 *     so two dead sentries genuinely share the first half. Different
 *     seconds separate them; the same second falls through to the
 *     ordinal, which is the only remaining honest distinction.
 *
 * A body with no identity at all (a bare fixture) gets no minted identity
 * — the corpse then behaves exactly as every corpse did before, rather
 * than minting a key on `stuffId` that no reader could query after a
 * reboot.
 */
function corpseIdentityFor(body: Stuff, nowS: number): string | undefined {
  const deceased = body.getIdentityPath();
  if (!deceased) return undefined;
  // ⭐⭐⭐ **A body with no MINTED identity gets no minted identity.** This
  // is the plan's own half-rule (*no identity path, no minted identity*)
  // one rung up, and `getIdentityPath()` is `#identityPath ??
  // getTemplatePath()` — so when the two are equal nothing was ever
  // minted and the "identity" below would be built out of a ROW its whole
  // flock shares. The key could then only ever mean *the Nth body off the
  // ewe row in game-second T*: not durable (no deed is written for a
  // non-persona, and `Creature` composes no `PersistableMixin`), not
  // constructible by any caller, and — the axis that actually decides it
  // — **not legible**. A player refers to a thing by keyword, then the
  // `distinguishing` form, then an ordinal; nothing in that ladder can
  // name a game-second, so the key is unspeakable by construction.
  //
  // A beast's corpse is therefore an ordinary multi-instance clone of the
  // corpse row, exactly as cuts and logs already are. Nothing reads that
  // row as a singleton (checked across the tree), and what tells two
  // bodies apart is the presentation path — see `salientFeaturesImpl`,
  // which now says a body's decay.
  //
  // ⚠ The mint SURVIVES where the identity is genuine: a player can die,
  // `reembody` and die again before the first body decays, so one avatar
  // owns two coexisting corpses and `<gameSecond>` names WHICH DEATH.
  // There the chronicle writes a `['death']` deed and the corpse persists
  // its own `diedAtGameSec`, so the name is recorded rather than guessed.
  if (deceased === body.getTemplatePath()) return undefined;
  const base =
    `${TemplatePaths.mortalityCorpse}/` +
    `${deceased.replace(/^\/+/, '')}/${nowS}`;
  // Two deaths in one game-second: the ordinal is the disambiguator. A
  // reaped corpse leaves the index, so keys are recycled rather than
  // monotonic — which is correct, because identity is about telling live
  // bodies apart, not about an audit trail (that is the chronicle's job).
  //
  // ⚠⚠ `findByIdentityPath`, and this is MANDATORY, not tidiness. The
  // probe asks *is this IDENTITY free*, and a corpse's own
  // `getTemplatePath()` is the corpse ROW — never the identity it was
  // stamped with. A read that narrowed a row's instances by lineage
  // would drop the exact hit, report an occupied identity as free, and
  // collide two deaths in the same game-second. A probe for an identity
  // must not depend on how a ROW read scopes its filter.
  if (StuffApi.findByIdentityPath(base).length === 0) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (StuffApi.findByIdentityPath(candidate).length === 0) {
      return candidate;
    }
  }
}

/**
 * Take the material slices off a body — the forensic half of what it was.
 *
 * ⚠ **Order matters for the player path and not for the other one.** On a
 * player's body this MUST run before the drain, because draining is what
 * destroys the thing being copied; on a beast's there is no drain, so it
 * runs in the tail. Extracted here so the two paths cannot disagree about
 * what a corpse is made of: the list is `MATERIAL_FORK_SLICES`, and the
 * apply side (`adoptMaterialState`) has no `mergeSlice_` counterpart,
 * which is what makes a corpse un-reanimatable by protocol.
 */
function materialSlicesOf(body: Stuff): Record<string, unknown> {
  const material: Record<string, unknown> = {};
  for (const name of MATERIAL_FORK_SLICES) {
    const fn = (body as unknown as Record<string, () => unknown>)[
      `forkSlice_${name}`
    ];
    if (typeof fn === 'function') material[name] = fn.call(body);
  }
  return material;
}

/**
 * Mint a corpse carrying a body's material state and its loadout.
 *
 * Cloned from the authored corpse template, then configured from the body
 * — the `StackableApi.split` shape, which mints a runtime-derived instance
 * the same way. What a corpse IS is authored; whose it WAS is poured in.
 *
 * **Throws if the template is missing**, deliberately. A body failing to
 * appear where someone died is exactly the kind of thing that should be
 * loud: silent absence would leave a death with no evidence, no loot and
 * nothing to examine, and forensics would simply not work in that world.
 */
async function mintCorpseFrom(
  body: Stuff,
  material: Record<string, unknown>,
  cause: string,
  nowS: number,
): Promise<Stuff & Vitals> {
  // Everything ORDINARY about this corpse arrives through hydration.
  //
  // `dataOverlay` merges per-instance data over the template's authored
  // block (`{...template.data, ...overlay}`) at the hydrate step — the
  // shipped channel for cloning a shared seed with instance-specific
  // fields. Hydration is state INJECTION; nothing in its contract says
  // the state has to be authored, and the Stuff lifecycle is exactly why
  // constructor args are not the alternative here. So the corpse arrives
  // already named, already the right species, already carrying its cause
  // and its time of death, instead of being minted blank and patched.
  const speciesPath = MixinApi.isOrganism(body)
    ? (body.getSpecies()?.getTemplatePath() ?? null)
    : null;

  /*
   * ⚠⚠ **The mass has to be STAMPED, and this is why.**
   *
   * `Creature.getMass()` prefers a stored mass and otherwise derives one
   * from `species.massAt(getAgeDays())`. A fresh clone's `bornAt` is 0,
   * so a derived corpse masses a NEWBORN: a full-grown ewe would have
   * dressed out as a lamb, and every downstream reader of a carcass's
   * weight — the butcher's yield, carry capacity, thermal mass — would
   * have been quietly wrong. So the body's own figure is copied, which is
   * also the honest one (it already includes what the animal had put on).
   * `bornAt` rides along beside it so the corpse's AGE is the age it died
   * at rather than its age now, which is what `race.md` promises a
   * forensic body reports. The slices carry no reserves, so nothing
   * re-adds a body-composition delta on top of the stamp.
   */
  const stampedMass = MixinApi.isTangible(body)
    ? body.getMass().rawValue()
    : undefined;
  const bornAt = MixinApi.isOrganism(body) ? body.getBornAt() : undefined;

  /*
   * ⭐ **The condition it died in — a number, never a reserve.** The
   * butcher is reading what the stockman achieved before the kill, and a
   * dead animal's condition cannot change. `flesh` is the ranching stock
   * (`ranching.md`); a body that carries none (a person, a fixture)
   * stamps `null` and the kitchen falls back to its own default.
   */
  const conditionAtDeath = MixinApi.isReserved(body)
    ? (body.getReserve('flesh')?.current.rawValue() ?? null)
    : null;

  /*
   * ⭐ **A body answers to the dead thing's own words.** The row's
   * `[body, corpse, carcass]` plus whatever the thing was called, so
   * `butcher ewe` finds the carcass and `look clerk` finds the body of
   * the clerk. Deliberate on the player path too: a name-keyword now
   * binds to the body its owner left.
   */
  const keywords = [
    'body',
    'corpse',
    'carcass',
    ...(MixinApi.isPerceptible(body) ? body.getKeywords() : []),
  ];

  const corpse = await StuffApi.clone(TemplatePaths.mortalityCorpse, undefined, {
    dataOverlay: {
      // ⚠ A STEM plus its register, not a string with "the" welded on.
      // ⭐ And note what the stem contains: `getPresentation()` renders
      // the dead body's OWN phrase, so a corpse reads "the body of Odile"
      // for somebody and "the body of a sentry" for a role — the one
      // place in the tree where a description is built out of another
      // thing's identity, and the reason it has to be a phrase.
      shortDescription: `body of ${body.getPresentation()}`,
      register: 'definite',
      _speciesPath: speciesPath,
      causeOfDeath: cause,
      diedAtGameSec: nowS,
      conditionAtDeath,
      keywords,
      ...(stampedMass !== undefined ? { mass: stampedMass } : {}),
      ...(bornAt !== undefined ? { bornAt } : {}),
    },
    // Nothing reads a corpse by identity.
    // `reembody` never looks one up, and belief's naming path is gated
    // on `isPersona` (composed on `Character`, not `Creature`), so the
    // only consumer of this string is the mint's OWN ordinal probe,
    // which is circular and cannot justify the mint it serves.
    //
    // ⚠⚠ **Two corrections from the carcass-chain build (2026-10-05),
    // and they sharpen WHY this is unjustified rather than softening
    // it.** (1) You can die, `reembody`, and die again before the first
    // body decays, so ONE avatar owns two coexisting corpses — the
    // `<gameSecond>` is not redundant, it names WHICH DEATH. (2) That
    // second IS recorded: `diedAtGameSec` is persistent on
    // `PostmortemMixin`, and `recordDeathDeed` writes a chronicle deed
    // whose `when` is persistent. So on the player path the name IS
    // durable, and requirements 9a's two limbs LICENSE this key.
    //
    // ⭐⭐ The reason to remove it anyway is a third limb 9a does not
    // have: **can anyone NAME it?** The way a person refers to a thing
    // is keyword → the `distinguishing` form → an ordinal where those
    // tie (`PromptLogic.projectMatches`). Nothing in that ladder can
    // hold a path or a game-second: a player cannot type it, the
    // disambiguation prompt will not render it, and MQL's own answer to
    // *which of these identical things* is an ordinal. The key is
    // durable and UNSPEAKABLE. ⭐ And the real fix was presentation, not
    // identity — the carcass build made `getDecayStage()` a salient
    // feature, so `butcher stale` works and two of one player's corpses
    // are finally distinguishable in the UX.
    //
    // ⛔ UNJUSTIFIED and deliberately left alone: that build owns the
    // decision and has narrowed the mint on its side (a beast's corpse
    // no longer mints at all). See
    // `docs/slates/builds/instance-addressing-slate.md § the third
    // limb`.
    // identity-keyed-by: none — nothing durable reads it, and nothing
    // speakable names it.
    asIdentityPath: corpseIdentityFor(body, nowS),
  });
  if (!MixinApi.isVitals(corpse)) {
    throw new Error(
      `ConditionApi.die: the corpse template ` +
        `'${TemplatePaths.mortalityCorpse}' did not produce a body with ` +
        `vitals — a death must not leave the world without one.`,
    );
  }

  // The material record is the ONE thing that stays outside hydration,
  // and deliberately. `adoptMaterialState` is gated to this choreography
  // and has no `mergeSlice_` counterpart — that absence is what makes a
  // corpse un-reanimatable. Routing it through the hydrator would mean
  // widening the gate to a component any template can name, which is the
  // opposite of the guarantee. What a corpse IS hydrates; whose body it
  // WAS is poured, once, by the only caller allowed to.
  corpse.adoptMaterialState(material);

  // The loadout moves with the body it was on — that gear is the stake,
  // and the corpse is where someone has to go to get it.
  if (MixinApi.isContainer(body) && MixinApi.isContainer(corpse)) {
    for (const item of [...body.getContents()]) {
      if (MixinApi.isContainable(item)) ContainmentApi.move(item, corpse);
    }
  }

  // ⭐ The silent population moves with the meat. A carcass in the sun is
  // growing something nothing reports, and this is what keeps the fishing
  // pack's outfall load on the fillet now that a dead fish is a Corpse
  // rather than a dead `Fish` — the load was on the animal, and the
  // animal is gone.
  if (MixinApi.isContaminable(body) && MixinApi.isContaminable(corpse)) {
    body.transferContaminationTo(corpse);
  }

  // Lay it where the body fell.
  if (MixinApi.isContainable(body) && MixinApi.isContainable(corpse)) {
    const at = body.getContainer();
    if (at && MixinApi.isContainer(at)) ContainmentApi.move(corpse, at);
  }
  return corpse;
}

/**
 * Mint the shade a player occupies while dead, carrying the SHELL slices
 * (name, aliases, settings, cockpit layout, contacts) off the drained
 * body.
 *
 * The material slices are offered by the same protocol call and silently
 * dropped, because a shade implements no applier for them — the
 * fork-only asymmetry doing its job with no special-casing here.
 */
async function mintShadeFrom(
  avatar: PlayerBody,
): Promise<Stuff | null> {
  const species = MixinApi.isOrganism(avatar as unknown as Stuff)
    ? (avatar as unknown as { getSpecies(): { getTemplatePath(): string | null } | null }).getSpecies()
    : null;
  // ⭐ Clone the row with the minted-identity channel, exactly as an
  // Avatar is minted. What the constructor used to take — the player id
  // and the species — rides `dataOverlay`, which hydration Phase 1
  // lands BEFORE `onCreate`, which is the ordering the constructor
  // existed to guarantee.
  const shade = await StuffApi.clone<Stuff>(
    '/platform/agent/ShadeAvatar',
    undefined,
    {
      // identity-keyed-by: own-record — a shade is the same PERSON, so
      // it attributes to the same identity-keyed ledgers as the body of
      // record, and the path is re-derivable from the playerId.
      // Declares its own `identityNamespace` rather than inheriting the
      // Avatar family's, because this prefix is its own.
      asIdentityPath: `/platform/agent/ShadeAvatar/${avatar.getPlayerId()}`,
      dataOverlay: {
        playerId: avatar.getPlayerId(),
        ...(species?.getTemplatePath()
          ? { _speciesPath: species.getTemplatePath() }
          : {}),
      },
    },
  );
  const user = avatar.getUser?.();
  if (user) (shade as unknown as PlayerBody).setUser?.(user);
  await PersistableApi.forkRuntimeState(
    avatar as unknown as Stuff,
    shade as unknown as Stuff,
  );
  return shade as unknown as Stuff;
}

/**
 * Swap a deceased identity's restored body for a shade (see
 * {@link ConditionApi.embodyForSession}).
 *
 * The restored Avatar is a real, living, baseline body — that is exactly
 * what the death choreography captured, on purpose — so it must be
 * unregistered and destructed before the shade can take the identity path.
 * Same ordering rule as the split itself.
 *
 * Where the shade appears: **beside its own corpse** when that body still
 * exists, otherwise where it fell, otherwise the wake point. The corpse is
 * a nicety, never a requirement — it decays, and nothing on the path back
 * may depend on it.
 */
async function embodyForSessionImpl(avatar: Stuff): Promise<Stuff> {
  const player = playerBodyOf(avatar);
  if (!player) return avatar;
  const arc = (
    avatar as unknown as { getMortalArc?(): MortalArc | null }
  ).getMortalArc?.();
  if (!arc) return avatar;

  const shade = await mintShadeFrom(player);
  if (!shade) return avatar;

  const landing = resolveShadeLanding(arc);

  player.markForRevert();
  PlayerApi.unregisterAvatar(avatar as unknown as never);
  await StuffApi.destruct(avatar);

  PlayerApi.registerAvatar(shade as unknown as never);
  if (landing && MixinApi.isContainable(shade) && MixinApi.isContainer(landing)) {
    ContainmentApi.move(shade, landing);
  }
  return shade;
}

/**
 * Where a returning shade appears: the place the body fell.
 *
 * There is deliberately no corpse handle here. A corpse is laid at the
 * body's own container, so "beside your corpse" and "where you fell" are
 * the SAME room — the handle was redundant with a durable field that was
 * already recorded. Its one unique case (somebody dragged the body
 * elsewhere) cannot survive the login this resolve exists to serve,
 * because a corpse is runtime-only and does not outlive a restart.
 *
 * That is why the arc holds only durable scalars: a field that can never
 * be valid when it is read is worse than no field.
 */
function resolveShadeLanding(arc: MortalArc): Stuff | null {
  if (arc.whereTemplatePath) {
    return StuffApi.findByTemplatePath(arc.whereTemplatePath) ?? null;
  }
  return null;
}

/**
 * A shade becomes a living body again (see {@link ConditionApi.reembody}).
 *
 * Nothing here reads the corpse — not the signature, not the body. That is
 * how "no path back may depend on a body that decays" stops being a rule
 * anyone has to remember and becomes a fact about the code.
 *
 * The ordering mirrors the split, for the same reason: the shade holds the
 * identity path and the `PlayerApi` slot, so it must be unregistered and
 * destructed before a restored body can take them.
 */
async function reembodyImpl(shade: Stuff): Promise<Stuff> {
  const ghost = playerBodyOf(shade);
  if (!ghost || !MixinApi.isIncorporeal(shade)) {
    throw new Error('ConditionApi.reembody: not a shade');
  }

  // You come back WHERE YOU ARE. There is no wake point and no relocation:
  // the shade walked somewhere, and that is where it takes a body. Read it
  // before the shade is destructed, since the restored avatar lands
  // wherever its own snapshot/instruction put it and has to be moved here.
  //
  // Content that wants you to wake somewhere specific walks you there, or
  // moves the returned body — the engine does not decide where anybody
  // ends up.
  const landing = MixinApi.isContainable(shade) ? shade.getContainer() : null;

  const playerId = ghost.getPlayerId();
  const user = ghost.getUser?.();
  const held = [...ghost.getInteractives()];

  // Free the identity path and the registry slot first.
  PlayerApi.unregisterAvatar(shade as unknown as never);
  await StuffApi.destruct(shade);

  // Clone + materialize the identity's own body: the clean baseline the
  // death choreography captured, plus the arc it recorded.
  const avatars = await PlayerApi.loadAvatarsForUser(user as never);
  const body = (avatars as unknown as PlayerBody[]).find(
    (a) => a.getPlayerId() === playerId,
  );
  if (!body) throw new Error('ConditionApi.reembody: no body to return to');

  const stuff = body as unknown as Stuff;
  if (landing && MixinApi.isContainable(stuff) && MixinApi.isContainer(landing)) {
    ContainmentApi.move(stuff, landing);
  }

  // The arc is cleared HERE and only here — the identity is alive and
  // unmarked again, and the next login gets an ordinary body.
  body.setMortalArc(null);
  try {
    await body.save();
  } catch {
    // A snapshot failure must not strand someone mid-return.
  }

  await recordReturnDeed(stuff);

  for (const interactive of held) {
    (interactive as unknown as Interactive).transferTo(stuff as never);
  }
  for (const interactive of held) {
    await body.enter(interactive as never);
  }
  return stuff;
}

/** The other half of the death deed — the chronicle records both edges. */
async function recordReturnDeed(host: Stuff): Promise<void> {
  try {
    if (!MixinApi.isPersona(host)) return;
    await host.recordDeed({
      template: '{{ who | name }} returned to the world.',
      vars: { who: host },
      tags: ['death', 'passage'],
    });
  } catch {
    // Fire-and-forget.
  }
}

/**
 * A vessel died inside a circle: leave a circle-scoped corpse, then hand
 * the player back to the field body that was parked the whole time.
 *
 * The ledger writes have already happened by the time this runs, and they
 * ride the shipped write-path policy table rather than any bespoke
 * suppression here — `chronicles` and `accountability_events` are
 * PASS(mark) collections, so the rows persist carrying their circle stamp
 * and `deriveBlame` declines to convict on them. Suppressing the writes
 * instead would be drift; the table is the sandbox's contract.
 */
async function ejectFromCircle(
  host: Stuff,
  player: PlayerBody,
  cause: string,
): Promise<void> {
  const nowS = conditionNowSeconds() ?? 0;
  if (MixinApi.isVitals(host)) {
    const material: Record<string, unknown> = {};
    for (const name of MATERIAL_FORK_SLICES) {
      const fn = (host as unknown as Record<string, () => unknown>)[
        `forkSlice_${name}`
      ];
      if (typeof fn === 'function') material[name] = fn.call(host);
    }
    // Minted in the ambient (circle) context, so it is circle-born and
    // dies with the discard.
    await mintCorpseFrom(host, material, cause, nowS);
  }
  void player;
  await SandboxApi.exit(host as never);
}

/** The chronicle deed. No-ops without a durable owner key / connection. */
async function recordDeathDeed(host: Stuff, cause: string): Promise<void> {
  try {
    if (!MixinApi.isPersona(host)) return;
    await host.recordDeed({
      template: '{{ who | name }} died of {{ cause }}.',
      vars: { who: host, cause },
      where: MixinApi.isContainable(host)
        ? (host.getContainer()?.getTemplatePath() ?? null)
        : null,
      tags: ['death'],
    });
  } catch {
    // Fire-and-forget: a ledger write must never block the transition.
  }
}

/**
 * The row for a death nobody is responsible for — cold, hunger, a fall.
 *
 * `lethality` is deliberately OMITTED so it defaults to `'non-lethal'`,
 * which makes an environmental death **structurally incapable** of
 * deriving as a crime. That is stronger than passing `consented: true`
 * would be: it does not assert something false about the victim, it simply
 * records that no lethal terms were imposed by anybody.
 */
function environmentalRow(host: Stuff): AccountabilityFields {
  return {
    kind: 'death',
    sessionId: SecurityApi.uuid(),
    // ⭐ `NOBODY` on all three actor fields is the CLAIM this row makes —
    // an environmental death is nobody's doing. It is the one legitimate
    // empty party id in the ledger.
    initiator: AccountabilityEvent.NOBODY,
    opponent: AccountabilityEvent.NOBODY,
    // The victim is keyed on IDENTITY, like every other ledger. The
    // `?? stuffId` fallback is gone: an unidentifiable victim is refused
    // by the append seam rather than filed under a shared key.
    victim: AccountabilityEvent.partyIdOf(host) ?? AccountabilityEvent.NOBODY,
    killer: AccountabilityEvent.NOBODY,
    // ⭐ The loss is counted even though nobody is to blame. The watch
    // loses a guard to a blizzard exactly as it loses one to a duel.
    killerFor: AccountabilityEvent.NOBODY,
    victimFor: AccountabilityEvent.partyForOf(host),
    consented: false,
    sentient: SpeciesApi.isSentient(host),
  };
}

/**
 * The materials-response path — a {@link Channel} insult resolved
 * outside-in through the covering stack into the tissue. Both the trauma
 * *type* and its *severity* come from the response function; a fully-
 * attenuated blow (null resolution) lands no wound but returns a truthful
 * record. Module-private (off-class, so no intra-singleton self-call).
 */
function inflictThroughStack(
  target: Stuff,
  spec: EnergyInflictSpec | CorrosionInflictSpec,
  channel: Channel,
  inflicter: string | undefined,
  agent: readonly string[] = [],
): InflictOutcome {
  const isBody = MixinApi.isVitals(target);
  let residual = Math.max(0, spec.energy);
  let partHasBone = false;
  let tissueMaterial: Material | null = null;

  if (isBody) {
    for (const layer of resolveCoveringStack(
      target,
      spec.site,
      spec.shieldFacing ?? true
    )) {
      const incident = residual;
      residual = MaterialApi.attenuate(
        channel,
        residual,
        layer.material,
        layer.construction,
        layer.grade,
        layer.condition,
        agent,
        'penetration' in spec ? (spec.penetration ?? 1) : 1,
        // ⭐ The layer's REAL insulation for the thermal channels — the
        // same clo that widens its wearer's comfort band. A held shield
        // is Wieldable, not Wearable, and derives none; the fold scores
        // it as a slab instead.
        MixinApi.isWearable(layer.occ) ? layer.occ.getClo().rawValue() : null,
      ).residualEnergy;
      // Wear-on-use (Law 2): a covering layer that attenuated a
      // mechanical blow wears — armor degrades by taking hits, never by
      // the clock. Heat/shock leave no structural wear here.
      // ⭐ **A layer that was EATEN wears for it.** Corrosion's wear is
      // the inverse of the mechanical rule: a mechanical layer wears
      // because it stopped something, and a corroded one wears precisely
      // because it did NOT — the agent went through, and took some of the
      // layer with it. `residual === incident` is the tell.
      if (
        channel === 'corrosion' &&
        residual >= incident &&
        MixinApi.isDurable(layer.occ)
      ) {
        layer.occ.wear(
          dial(AppSettingKeys.responseCorrosionWearPerContact, 0.2),
        );
      }
      if (
        Channels.isMechanicalChannel(channel) &&
        residual < incident &&
        MixinApi.isDurable(layer.occ)
      ) {
        // ⭐ A TIGHT garment wears at the seams faster — it is under
        // tension before anything hits it. A multiplier on the EXISTING
        // per-blow decrement, ⚠ never a clock: wear stays act-driven.
        const tightness = MixinApi.isWearable(layer.occ)
          ? layer.occ.fitOn(target).tightness
          : 0;
        const seamWear =
          1 +
          tightness * dial(AppSettingKeys.textilesFitTightnessWear, 1.5);
        layer.occ.wear(
          dial(AppSettingKeys.craftingWearArmorPerBlow, 0.004) * seamWear,
        );
      }
    }
    const part = target.getPart(spec.site);
    if (part) {
      partHasBone = partHasBoneTissue(part);
      tissueMaterial = primaryTissueMaterial(part);
    }
  }

  const resolution = MaterialApi.resolveTrauma(
    channel,
    residual,
    tissueMaterial,
    partHasBone,
  );
  const trauma: Trauma = {
    kind: 'trauma',
    type: resolution?.type ?? channelDefaultType(channel),
    site: spec.site,
    severity: resolution?.severity ?? 0,
    mechanism: channel,
  };
  if (inflicter !== undefined) trauma.inflictedBy = inflicter;
  // Whether this blow may maim — only a mechanical/tearing avulsion ever
  // reads it, but stamp it here for every wound so provenance is uniform.
  // `spec` here is `EnergyInflictSpec | CorrosionInflictSpec`; a corrosion
  // spec carries no `maim` (`in` guards it) and its wound is never an
  // avulsion regardless.
  if ('maim' in spec && spec.maim === false) trauma.maimAllowed = false;

  // ⭐ Embedding (D6): a penetrating blow that leaves the thing in the
  // wound. A `puncture` at/above the embed floor carrying an `embeds`
  // becomes a `foreign-body` — only extraction resolves it. Below the
  // floor the object passes through and it stays an ordinary puncture.
  if (
    trauma.type === 'puncture' &&
    'embeds' in spec &&
    spec.embeds !== undefined &&
    trauma.severity >= HARM_DEFAULTS.EMBED_MIN_SEVERITY
  ) {
    trauma.type = 'foreign-body';
    trauma.foreignBody = spec.embeds;
  }

  // Non-body target, or the stack turned the blow → nothing afflicted, but
  // the outcome carries the (severity-0 / deflected) record.
  if (!isBody || resolution === null) {
    return { trauma, afflicted: false };
  }

  const nowS = conditionNowSeconds();
  if (nowS !== null) {
    trauma.tickedAt = nowS;
    trauma.mendedAt = nowS; // D3: the healing clock starts beside the harm clock
  }
  // ⭐⭐ **Veto first, then onset** (D1). The veto layer (magic-items D14)
  // sits HERE — after the covering-stack fold, before anything happens.
  // Armor still attenuates; a conferred immunity simply refuses what is
  // left, and the outcome says so honestly rather than reporting a hit that
  // never landed.
  //
  // ⚠ The order was onset-then-afflict, which was harmless only while every
  // `onset` mutated the trauma VALUE and nothing else. It stopped being
  // harmless the moment an onset could act on the BODY: an avulsion's onset
  // now severs a limb, and a wound the body refused must not take an arm
  // with it. The pushed record is the same object either way, so a landed
  // wound is byte-identical to before.
  const landed = target.afflict(trauma);
  if (landed) TRAUMA_BEHAVIOR[trauma.type].onset(target, trauma);
  if (!landed) return { trauma, afflicted: false };

  const reached = reachInterior(target, channel, trauma, inflicter, nowS);
  return reached.length > 0
    ? { trauma, afflicted: true, reached }
    : { trauma, afflicted: true };
}

/**
 * ⭐⭐ **The depth ladder** — what a blow that got through the skin meets
 * underneath it.
 *
 * A wound past `response.depth.reachThreshold` has excess left over, and
 * the excess reaches the interior parts sitting under the site **largest
 * cross-section first** — a bigger organ presents more of itself to
 * whatever is coming through. Each organ takes `stepPerOrgan` out of what
 * remains, so a deeper blow reaches **more** organs rather than merely
 * hurting the first one worse. It stops when there is not enough left to
 * make a wound.
 *
 * ⚠⚠ **No roll anywhere.** The biggest organ under a site is hit first,
 * every time; a deeper wound reaches further, every time. A student can
 * derive both from `assess`, which is the whole difference between a model
 * and a slot machine — and a weighted site pick would be a roll deciding
 * what your action DID, which `docs/uncertainty.md` bans outright.
 *
 * Each interior trauma lands through the same `afflict` door as the
 * exterior wound, so a conferred immunity refuses it too.
 */
function reachInterior(
  target: Stuff & Vitals,
  channel: Channel,
  exterior: Trauma,
  inflicter: string | undefined,
  nowS: number | null,
): Trauma[] {
  if (!MixinApi.isOrganism(target)) return [];
  const plan = target.getSpecies()?.getBodyPlan();
  if (!plan) return [];
  const organs = plan.interiorChildrenOf(exterior.site);
  if (organs.length === 0) return [];

  const threshold = dial(AppSettingKeys.responseDepthReachThreshold, 2);
  const excess = exterior.severity - threshold;
  if (!(excess > 0)) return [];

  const step = dial(AppSettingKeys.responseDepthStepPerOrgan, 1);
  const floor = dial(AppSettingKeys.responseNoWoundThreshold, 0.25);
  const ruptureAt = dial(AppSettingKeys.responseBluntRuptureThreshold, 1);

  const reached: Trauma[] = [];
  for (let k = 0; k < organs.length; k++) {
    const severity = excess - k * step;
    if (!(severity > floor)) break;
    const organ = organs[k]!;
    const inner: Trauma = {
      kind: 'trauma',
      type: interiorTypeFor(channel, severity, ruptureAt),
      site: organ.key,
      severity,
      mechanism: channel,
    };
    if (inflicter !== undefined) inner.inflictedBy = inflicter;
    if (exterior.magicOrigin !== undefined) {
      inner.magicOrigin = exterior.magicOrigin;
    }
    if (nowS !== null) {
      inner.tickedAt = nowS;
      inner.mendedAt = nowS; // D3: the healing clock starts beside the harm clock
    }
    if (target.afflict(inner)) {
      TRAUMA_BEHAVIOR[inner.type].onset(target, inner);
      reached.push(inner);
    }
  }
  return reached;
}

/**
 * What the channel does to an organ. A point punctures it and an edge
 * lacerates it exactly as they would skin; a blunt blow is the interesting
 * one — hard enough and the organ **tears** (`rupture`), otherwise it is
 * bruised (`contusion`: a concussion, a bruised liver).
 *
 * ⚠ Non-mechanical channels never reach here: heat and cold are stopped by
 * the insulation fold at the surface, and shock does not resolve through
 * the stack at all.
 */
function interiorTypeFor(
  channel: Channel,
  severity: number,
  ruptureAt: number,
): TraumaType {
  if (channel === 'point') return 'puncture';
  if (channel === 'edge') return 'laceration';
  if (channel === 'blunt') {
    return severity >= ruptureAt ? 'rupture' : 'contusion';
  }
  return channelDefaultType(channel);
}

/**
 * The magnitude-only passthrough — the sole remaining token is `'tearing'`
 * → avulsion, byte-preserving harm's shipped avulsion math until tearing
 * folds into its own channel. (`'thermal'` was retired — heat now resolves
 * through the `heat` {@link Channel} + the insulation fold.) See
 * docs/subsystems/materials-response.md.
 */
function inflictPassthrough(
  target: Stuff,
  spec: EnergyInflictSpec,
  inflicter: string | undefined,
): InflictOutcome {
  // Only `'tearing'` reaches here (every Channel routes through the stack).
  const type: TraumaType = 'avulsion';
  const trauma: Trauma = {
    kind: 'trauma',
    type,
    site: spec.site,
    severity: severityFromEnergy(spec.energy),
    mechanism: spec.mechanism,
  };
  if (inflicter !== undefined) trauma.inflictedBy = inflicter;
  // The `'tearing'` passthrough is the OTHER avulsion producer; it honours
  // the same maim gate. (No shipped combat producer uses it, but a future
  // deliverer would inherit the consent rule for free.)
  if (spec.maim === false) trauma.maimAllowed = false;

  if (!MixinApi.isVitals(target)) {
    return { trauma, afflicted: false };
  }
  const nowS = conditionNowSeconds();
  if (nowS !== null) {
    trauma.tickedAt = nowS;
    trauma.mendedAt = nowS; // D3: the healing clock starts beside the harm clock
  }
  // Same veto seam as the stack path — a passthrough insult is no less
  // refusable by a conferred immunity — and the same veto-then-onset order
  // (D1), so a refused avulsion severs nothing.
  const landed = target.afflict(trauma);
  if (landed) TRAUMA_BEHAVIOR[type].onset(target, trauma);
  return { trauma, afflicted: landed };
}

/**
 * The **shock** path — a `{mechanism:'shock', current}` insult. The path
 * resistance was resolved upstream (the conduction walk divided current
 * toward ground), so this does **NOT** consult the covering stack /
 * `MaterialApi.attenuate` — it maps the current-through-victim straight to
 * a local contact `burn` via `MaterialApi.resolveShock`. Below the burn
 * threshold (a tingle) the record is truthful but nothing is afflicted.
 * Module-private (off-class, so no intra-singleton self-call). The
 * whole-body outcomes (tetany / fibrillation → arrest) are the vitals
 * coupling's job (the being-shocked sustain + the electrocution death seam),
 * not this local wound.
 */
function inflictShock(
  target: Stuff,
  spec: ShockInflictSpec,
  inflicter: string | undefined,
): InflictOutcome {
  const resolution = MaterialApi.resolveShock(spec.current);
  const trauma: Trauma = {
    kind: 'trauma',
    type: resolution?.type ?? 'burn',
    site: spec.site,
    severity: resolution?.severity ?? 0,
    mechanism: 'shock',
  };
  if (inflicter !== undefined) trauma.inflictedBy = inflicter;

  // Non-body target, or a below-threshold current (tingle) → nothing
  // afflicted, but a truthful record.
  if (!MixinApi.isVitals(target) || resolution === null) {
    return { trauma, afflicted: false };
  }
  const nowS = conditionNowSeconds();
  if (nowS !== null) {
    trauma.tickedAt = nowS;
    trauma.mendedAt = nowS; // D3: the healing clock starts beside the harm clock
  }
  // The veto layer (magic-items D14), and the same veto-then-onset order
  // as the other two terminal paths (D1) — a conferred immunity refuses
  // what the circuit delivered, and nothing develops from a refused wound.
  const landed = target.afflict(trauma);
  if (landed) TRAUMA_BEHAVIOR[trauma.type].onset(target, trauma);
  return { trauma, afflicted: landed };
}

