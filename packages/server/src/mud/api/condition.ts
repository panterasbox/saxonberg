/**
 * ConditionApi — the gated facade over the vitals **condition** surface:
 * inflicted trauma + afflictions, the one home for inflicted status
 * effects on a body. (Reserves and transient combat flags are NOT
 * conditions and stay out.)
 *
 * Its keystone is the **inflict producer**: the single gated seam every
 * harm source (this build's floor-glass hazard, later combat, later
 * environmental hazards) calls to wound a body. `inflict(target, {
 * mechanism, site, energy })` builds a {@link Trauma} and lands it through
 * the `VitalsMixin.afflict()` door; the wound then progresses / heals /
 * kills **reconcile-on-read** (`VitalsMixin.reconcileConditions`, the
 * metabolism / thermal / respiration precedent — no recurring push tick,
 * no re-arm seam). The facade also forwards the plain condition mutators
 * (`afflict` / `relieve`) and a query (`conditionsOf`).
 *
 * `inflict` is a **powerful primitive** — it must not be callable by
 * arbitrary content. The logic lives in the gated, hot-reloadable
 * {@link ConditionLogic} singleton at `/obj/api/condition` (its methods
 * carry `@CallSecurity(FromModule('/api/condition#ConditionApi'))`, so only
 * this Api forwards in); this Api is the thin forwarding shell trusted
 * producers reach. The **inflicter is un-spoofable** — derived from
 * execution context inside `ConditionLogic`
 * (`ExecutionContextApi.getActingAuthor`), never a caller-supplied
 * parameter (the gated-Api actor-from-context rule). `dest
 * /obj/api/condition` reloads it.
 *
 * See `docs/subsystems/harm.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { AccountabilityFields } from '../lib/accountability/AccountabilityEvent';
import type {
  InsultKind,
  Trauma,
} from '../obj/Condition';
import type { Quantity } from '../lib/quantity';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ConditionLogic } from '../obj/api/ConditionLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export type { InsultKind, Channel } from '../obj/Condition';

/**
 * Caller-supplied facts for a death. Everything here is optional because
 * most deaths have nobody to blame: a body that froze on a mountainside
 * needs no attribution, and inventing one would sweep environmental harm
 * into the crime ledger (the wrong blast radius — see accountability.md
 * § Producers).
 */
export interface DeathSpec {
  /**
   * A fully-formed accountability row. Combat builds one (it knows the
   * killer, the terms, the consent); environmental drivers pass nothing
   * and `die` writes a harmless environmental default.
   */
  accountability?: AccountabilityFields;
}
export { CHANNELS, Channels } from '../obj/Condition';

/**
 * An **energy** insult — a materials-response `Channel` (edge / point /
 * blunt through the mechanical fold, or `heat` through the insulation fold),
 * resolved outside-in through the covering stack into the tissue (yielding
 * BOTH the trauma type and its severity), or the `'tearing'` passthrough
 * (magnitude-only → avulsion). The magnitude is an `energy` scalar.
 */
export interface EnergyInflictSpec {
  /** The insult kind — any non-`shock` {@link InsultKind}. Recorded raw. */
  mechanism: Exclude<InsultKind, 'shock'>;
  /** A `body.*` part key (anatomy) the wound sits at. */
  site: string;
  /**
   * Magnitude of the incident insult. For a mechanical `Channel`, the energy
   * delivered to the covering stack (attenuated inward, the residual meeting
   * tissue); for a passthrough, mapped straight to severity.
   */
  energy: number;
  /**
   * Directional-coverage hint for a **wielded shield** (a Constructed-armor
   * item held in a hand slot). A shield covers a *facing* attacker only —
   * combat sets this `false` for a flanking blow under focus-fire so the
   * shield is bypassed, `true`/absent for a faced (or non-combat) blow so a
   * held shield joins the covering stack. Worn armor is unaffected either way.
   */
  shieldFacing?: boolean;
}

/**
 * A **shock** insult — the electrical channel. Its magnitude is the
 * **current through the victim** (`Quantity<'A'>`), not an energy: the path
 * resistance was already resolved upstream by the conduction walk
 * (`ElectricityApi`), so shock **skips the covering-stack fold** entirely
 * and maps current → a local contact burn. It is the current that harms,
 * not the voltage.
 */
export interface ShockInflictSpec {
  mechanism: 'shock';
  /** A `body.*` part key (anatomy) the contact wound sits at. */
  site: string;
  /** The current through the victim on this path (A). */
  current: Quantity<'A'>;
}

/**
 * The insult a producer describes: what kind, where, and how hard. A
 * discriminated union on `mechanism` — energy-carrying (mechanical /
 * passthrough) vs current-carrying (shock).
 */
export type InflictSpec = EnergyInflictSpec | ShockInflictSpec;

/** The result of an `inflict` call — the built trauma and whether it landed. */
export interface InflictOutcome {
  /** The trauma value the insult produced. */
  trauma: Trauma;
  /** True iff the target was a wound-able body and the trauma was afflicted. */
  afflicted: boolean;
}

const LOGIC_PATH = '/obj/api/condition';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ConditionLogic', import.meta.url)
);

/** Resolve the HMR-able ConditionLogic singleton (sync). */
function logic(): ConditionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ConditionLogic'
      ) as typeof ConditionLogic | null) ?? ConditionLogic)()
  );
}

export class ConditionApi {
  /**
   * Wound `target` through the materials-response function. For a `Channel`
   * insult, resolves the covering stack at `spec.site` (armor occupants
   * outside-in), attenuates the energy through each layer, and lets the
   * residual meet the site's tissue — yielding BOTH the {@link Trauma}
   * *type* (edge→laceration, point→puncture, blunt→fracture/contusion,
   * heat→burn) AND its *severity*; a fully-attenuated blow lands no wound
   * (`afflicted: false`, a truthful "deflected"). For the `'tearing'`
   * passthrough, maps magnitude straight to an avulsion. Stamps the
   * context-derived inflicter, runs the trauma's `onset`, and stamps the
   * reconcile-on-read `tickedAt` anchor. No-op-afflict when `target` is not
   * a wound-able body.
   */
  public static inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    return logic().inflict(target, spec);
  }

  /**
   * **The single death transition.** Every lethal driver in the engine
   * ends here — the nine that could kill a character used to flip
   * `lifecycleState` themselves, in seven places, three of them
   * byte-identical copies of each other.
   *
   * What it does, in order: stamps the ground-truth cause, clears the
   * dying record, performs the lifecycle-visible work **synchronously**
   * (before the first `await`, so a read on the same tick cannot observe a
   * half-dead body), then writes the two ledgers.
   *
   * **The ledgers never infer.** `spec.accountability` is supplied by the
   * producer that knows the facts — combat knows the killer, the terms and
   * whether consent was given; hypothermia knows none of that and passes
   * nothing, so an environmental death records a row that is structurally
   * incapable of being a crime. This is what lets one call replace seven
   * without violating accountability's producers-not-a-chokepoint rule.
   *
   * Death is **not destruction**: the body persists as a corpse. See
   * `docs/subsystems/mortality.md`.
   */
  public static die(
    host: Stuff,
    cause: string,
    spec?: DeathSpec,
  ): Promise<void> {
    return logic().die(host, cause, spec);
  }

  /**
   * Resolve the body a session should attach to.
   *
   * Returns `avatar` unchanged for the living. For an identity that is
   * between bodies it swaps in a freshly-minted shade — the LAZY half of
   * the arc: a death with nobody connected mints no vessel, because there
   * would be nobody standing in it.
   *
   * This is what makes logging out fail as an escape hatch. The arc lives
   * durably on the identity, so a player who dies, quits and returns comes
   * back a ghost rather than a fresh body.
   */
  public static embodyForSession(avatar: Stuff): Promise<Stuff> {
    return logic().embodyForSession(avatar);
  }

  /**
   * **The transition back.** A shade becomes a living body again, at
   * `container`.
   *
   * This is deliberately the whole of the engine's involvement in coming
   * back, and it is **content-facing**: a resurrection business, a temple,
   * a quest, an altar — anything that wants to offer a way back calls this
   * when its own terms are satisfied.
   *
   * There is no route type, no terms vocabulary, and no registry, because
   * being a ghost is an authoring space and a schema written before that
   * content exists would constrain it rather than serve it. Everything a
   * passage might charge or restore is already expressible: banking
   * charges, containment gives and takes, a quest gates however it likes.
   *
   * **You come back where you are.** There is no wake point and no
   * destination argument: the shade walked somewhere, and that is where it
   * takes a body. Content that wants you to wake somewhere specific walks
   * you there first, or moves the body it gets back — the engine does not
   * decide where anybody ends up.
   *
   * It never reads the corpse. A body decays, can be destroyed, and does
   * not survive a restart — so nothing on the path back may depend on one.
   */
  public static reembody(shade: Stuff): Promise<Stuff> {
    return logic().reembody(shade);
  }

      }

SecurityApi.decorateApiClass(ConditionApi);
