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
import type { AccountabilityFields } from '../../../lib/accountability/AccountabilityEvent';
import type { DeathSpec } from '../../../api/condition';
import { Channels } from '../../../lib/material/Channel';
import type { Channel } from '../../../lib/material/Channel';
import type { Construction } from '../../../lib/material/Construction';
import type { Grade } from '../../../lib/craft/Grade';
import type Material from '../../../lib/material/Material';
import type {
  Trauma,
  TraumaType,
} from '../Condition';
import type {
  InflictSpec,
  InflictOutcome,
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
  if (!MixinApi.isOrganism(host) || !MixinApi.isSlotted(host)) return [];
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
    // `spec` is now the energy-carrying variant (shock excluded).
    return Channels.isChannel(spec.mechanism)
      ? inflictThroughStack(target, spec, spec.mechanism, inflicter)
      : inflictPassthrough(target, spec, inflicter);
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
    // ONE RULE, TWO MECHANISMS, and the axis is whether an identity has
    // to leave. race.md's "death is not destruction" holds either way:
    // both paths end with a persistent Creature-tier body in the world.
    //
    //  - nothing to walk away  → this Stuff simply stops. Unchanged,
    //    zero new machinery, and what every NPC and beast does.
    //  - a player identity     → the body divides: a corpse takes the
    //    material half, and the identity walks off as a shade.
    const player = playerBodyOf(host);

    // A death inside a holodeck circle is REAL there and discarded with
    // it — which is the point of a holodeck, and what lets an author test
    // a lethal trap on themselves. The body leaves a circle-scoped corpse
    // (born in the circle, reaped with it) and the player is ejected to
    // the field body that was parked all along.
    //
    // No shade, no arc, no snapshot: minting a real body from inside a
    // circle is exactly the boundary the sandbox exists to hold. The
    // discriminator is the receiver's circle stamp rather than
    // `instanceof WireBody`, so a future circle vessel of another class
    // behaves identically without being enumerated here.
    if (player && host.getCircleScope() !== null) {
      host.setCauseOfDeath(cause);
      await ejectFromCircle(host, player, cause);
      return;
    }

    if (!player) {
      host.setCauseOfDeath(cause);
      // The body stays in the world as a corpse. Never
      // `StuffApi.destruct` here.
      host.setLifecycleState('dead');
      // Start the postmortem clock. Algor mortis needs no code: a body
      // that stops regulating drifts toward ambient through the shipped
      // Thermal layer all by itself.
      if (MixinApi.isPostmortem(host)) {
        const nowS = conditionNowSeconds();
        if (nowS !== null) host.markDeceasedAt(nowS);
      }
    }

    // The accountability row is a SYNCHRONOUS fire-and-forget append, and
    // it stays in the sync prefix deliberately: a consumer that reads the
    // ledger in the same turn as the killing blow (combat's own coup
    // choreography does) must not race the write.
    AccountabilityApi.record(
      (attribution as AccountabilityFields | undefined) ??
        environmentalRow(host),
    );

    // ── async tail ──────────────────────────────────────────────────
    await recordDeathDeed(host, cause);
    if (player) await divideBody(player, cause);
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
  const material: Record<string, unknown> = {};
  for (const name of MATERIAL_FORK_SLICES) {
    const fn = (body as unknown as Record<string, () => unknown>)[
      `forkSlice_${name}`
    ];
    if (typeof fn === 'function') material[name] = fn.call(body);
  }

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
 * Mint a corpse carrying a body's material state and its loadout.
 *
 * Cloned from the authored corpse template, then configured from the body
 * — the `GlobbableApi.split` shape, which mints a runtime-derived instance
 * the same way. What a corpse IS is authored; whose it WAS is poured in.
 *
 * **Throws if the template is missing**, deliberately. A body failing to
 * appear where someone died is exactly the kind of thing that should be
 * loud: silent absence would leave a death with no evidence, no loot and
 * nothing to examine, and forensics would simply not work in that world.
 */
async function mintCorpseFrom(
  body: Stuff & Vitals,
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

  const corpse = await StuffApi.clone(TemplatePaths.mortalityCorpse, undefined, {
    dataOverlay: {
      shortDescription: `the body of ${body.getPresentation()}`,
      _speciesPath: speciesPath,
      causeOfDeath: cause,
      diedAtGameSec: nowS,
    },
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
  const { default: Shade } = await import('../../agent/Shade');
  const species = MixinApi.isOrganism(avatar as unknown as Stuff)
    ? (avatar as unknown as { getSpecies(): never }).getSpecies()
    : null;
  const shade = await StuffApi.create(
    () => new Shade(avatar.getPlayerId(), species),
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
    initiator: '',
    opponent: '',
    victim: host.getTemplatePath() ?? host.stuffId,
    killer: '',
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
  spec: EnergyInflictSpec,
  channel: Channel,
  inflicter: string | undefined,
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
      ).residualEnergy;
      // Wear-on-use (Law 2): a covering layer that attenuated a
      // mechanical blow wears — armor degrades by taking hits, never by
      // the clock. Heat/shock leave no structural wear here.
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

  // Non-body target, or the stack turned the blow → nothing afflicted, but
  // the outcome carries the (severity-0 / deflected) record.
  if (!isBody || resolution === null) {
    return { trauma, afflicted: false };
  }

  const nowS = conditionNowSeconds();
  if (nowS !== null) trauma.tickedAt = nowS;
  TRAUMA_BEHAVIOR[trauma.type].onset(target, trauma);
  // The veto layer (magic-items D14) sits HERE — after the covering-stack
  // fold, before the write. Armor still attenuates; a conferred immunity
  // simply refuses what is left, and the outcome says so honestly rather
  // than reporting a hit that never landed.
  const landed = target.afflict(trauma);
  return { trauma, afflicted: landed };
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

  if (!MixinApi.isVitals(target)) {
    return { trauma, afflicted: false };
  }
  const nowS = conditionNowSeconds();
  if (nowS !== null) trauma.tickedAt = nowS;
  TRAUMA_BEHAVIOR[type].onset(target, trauma);
  // Same veto seam as the stack path — a passthrough insult is no less
  // refusable by a conferred immunity.
  const landed = target.afflict(trauma);
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
  if (nowS !== null) trauma.tickedAt = nowS;
  TRAUMA_BEHAVIOR[trauma.type].onset(target, trauma);
  // The veto layer (magic-items D14) sits HERE — after the covering-stack
  // fold, before the write. Armor still attenuates; a conferred immunity
  // simply refuses what is left, and the outcome says so honestly rather
  // than reporting a hit that never landed.
  const landed = target.afflict(trauma);
  return { trauma, afflicted: landed };
}

