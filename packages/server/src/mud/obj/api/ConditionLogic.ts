// ConditionLogic — the hot-reloadable logic singleton behind ConditionApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';
import { ExecutionContextApi } from '../../api/execution-context';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from '../../lib/vitals/Condition';
import { ChronicleApi } from '../../api/chronicle';
import { AccountabilityApi } from '../../api/accountability';
import { SpeciesApi } from '../../api/species';
import { SecurityApi } from '../../api/security';
import type { AccountabilityFields } from '../../lib/accountability/AccountabilityEvent';
import type { DeathSpec } from '../../api/condition';
import { Channels } from '../../lib/material/Channel';
import type { Channel } from '../../lib/material/Channel';
import type { Construction } from '../../lib/material/Construction';
import type { Grade } from '../../lib/craft/Grade';
import type Material from '../../lib/material/Material';
import type {
  Trauma,
  TraumaType,
} from '../../lib/vitals/Condition';
import type {
  InflictSpec,
  InflictOutcome,
  EnergyInflictSpec,
  ShockInflictSpec,
} from '../../api/condition';

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
  const layers: CoveringLayer[] = [];
  const covering = host.getSpecies()?.getBodyPlan()?.getSlotsCovering(partKey);
  for (const spec of covering ?? []) {
    for (const occ of host.getOccupants(spec.name)) {
      if (!MixinApi.isConstructed(occ) || !MixinApi.isWearable(occ)) continue;
      const construction = occ.getConstruction();
      if (!construction || !construction.isArmor()) continue;
      layers.push(layerOf(occ, construction));
    }
  }
  // A wielded **shield** — a `Wieldable` item carrying an *armor*
  // construction (armor you hold, not wear; distinct from a weapon's
  // delivery construction and from worn `Wearable` armor) — covers a
  // *facing* attacker (directional; combat gates `shieldFacing` so a
  // flanking blow under focus-fire bypasses it). Unlike worn armor it isn't
  // tied to a body-plan `covers` slot: a raised shield fronts any struck part.
  if (shieldFacing) {
    for (const [, occupants] of host.getAllOccupants()) {
      for (const occ of occupants) {
        if (!MixinApi.isWieldable(occ) || !MixinApi.isConstructed(occ)) continue;
        const construction = occ.getConstruction();
        if (!construction || !construction.isArmor()) continue;
        layers.push(layerOf(occ, construction));
      }
    }
  }
  if (layers.length === 0) return [];
  // Outside-in: highest layer depth first (plate/shield outer, padded inner).
  layers.sort(
    (a, b) => b.construction.getLayerDepth() - a.construction.getLayerDepth(),
  );
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
 * Lives at `/obj/api/condition` (a stateless `Stuff` singleton, no backing
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
 * carries the `FromModule` gate. `dest /obj/api/condition` reloads it.
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

    host.setCauseOfDeath(cause);
    // Death is a lifecycle transition, NOT destruction — the body stays in
    // the world as a corpse (race.md). Never `StuffApi.destruct` here.
    host.setLifecycleState('dead');

    // The accountability row is a SYNCHRONOUS fire-and-forget append, and
    // it stays in the sync prefix deliberately: a consumer that reads the
    // ledger in the same turn as the killing blow (combat's own coup
    // choreography does) must not race the write.
    AccountabilityApi.record(
      (attribution as AccountabilityFields | undefined) ??
        environmentalRow(host),
    );

    // ── async tail ──────────────────────────────────────────────────
    // Only the chronicle deed, which renders prose and hits Mongo. Nobody
    // reads it in the same turn.
    await recordDeathDeed(host, cause);
  } finally {
    dying.delete(host.stuffId);
  }
}

/** The chronicle deed. No-ops without a durable owner key / connection. */
async function recordDeathDeed(host: Stuff, cause: string): Promise<void> {
  try {
    await ChronicleApi.recordDeed(host, {
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
        layer.occ.wear(dial(AppSettingKeys.craftingWearArmorPerBlow, 0.004));
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
  target.afflict(trauma);
  return { trauma, afflicted: true };
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
  target.afflict(trauma);
  return { trauma, afflicted: true };
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
  target.afflict(trauma);
  return { trauma, afflicted: true };
}
