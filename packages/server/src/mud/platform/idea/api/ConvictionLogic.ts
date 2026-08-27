// ConvictionLogic — the hot-reloadable logic singleton behind ConvictionApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import Position from '../../../lib/standing/Position';
import type { ConvictionPosition } from '../../../lib/standing/Position';
import { ConvictionTally } from '../../../lib/standing/ConvictionTally';
import type { Stock } from '../../../lib/standing/InfluenceStanding';
import { InfluenceApi } from '../../../api/influence';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistApi } from '../../../api/persist';

const ConvictionApiCallers = SecurityPolicies.FromModule('/api/conviction#ConvictionApi'
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** Read a numeric AppSetting with a pre-boot/tests fallback. */
function settingNumber(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw ? Number(raw) : fallback;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/** The conviction build period in MILLISECONDS. Default 7 days. */
function buildPeriodMs(): number {
  return settingNumber(AppSettingKeys.convictionBuildPeriodSeconds, 604_800) * 1000;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** The linear conviction ramp 0..1 for a position at real-time `nowMs`. */
function convictionFraction(p: Position, nowMs: number): number {
  return clamp01((nowMs - p.realSince) / buildPeriodMs());
}

/** Net direction sign of a yea/nay split (−1 / 0 / +1). */
function netDir(yea: number, nay: number): number {
  return Math.sign(yea - nay);
}

/**
 * Establish or update a held position. A NEW position, or one whose net
 * direction FLIPS, (re)starts the conviction clock (`realSince = now`); a
 * same-direction re-hold (adjusting magnitude) keeps building. A
 * module-private free function (no intra-singleton self-call to trip the
 * gate).
 */
async function holdImpl(
  subject: string,
  stock: Stock,
  target: string,
  yea: number,
  nay: number,
  nowMs: number
): Promise<void> {
  if (!active()) return;
  const [existing] = await Position.find({ subject, stock, target });
  const row = existing ?? new Position();
  const flipped =
    existing !== undefined &&
    netDir(existing.yea, existing.nay) !== 0 &&
    netDir(yea, nay) !== 0 &&
    netDir(existing.yea, existing.nay) !== netDir(yea, nay);
  row.subject = subject;
  row.stock = stock;
  row.target = target;
  row.yea = yea;
  row.nay = nay;
  row.since = WorldClockApi.getNow().rawValue();
  if (existing === undefined || flipped) {
    row.realSince = nowMs; // (re)start the conviction clock
  }
  await row.save();
}

/**
 * Record an **abstain** — a present, net-zero position (`yea = nay = 0`).
 * Distinct from `drop` (which removes the row → not voting): an abstain row
 * exists, so it counts toward quorum at the holder's full standing, while
 * contributing 0 to the decision. A new abstain stamps the clock; an
 * existing position converted to abstain keeps its `realSince` (conviction
 * is irrelevant to a net-zero position).
 */
async function abstainImpl(
  subject: string,
  stock: Stock,
  target: string,
  nowMs: number
): Promise<void> {
  if (!active()) return;
  const [existing] = await Position.find({ subject, stock, target });
  const row = existing ?? new Position();
  row.subject = subject;
  row.stock = stock;
  row.target = target;
  row.yea = 0;
  row.nay = 0;
  row.since = WorldClockApi.getNow().rawValue();
  if (existing === undefined) row.realSince = nowMs;
  await row.save();
}

/** Reverse a held position (swap yea/nay) and reset its conviction clock. */
async function flipImpl(
  subject: string,
  stock: Stock,
  target: string,
  nowMs: number
): Promise<void> {
  if (!active()) return;
  const [existing] = await Position.find({ subject, stock, target });
  if (!existing) return;
  const yea = existing.nay;
  const nay = existing.yea;
  existing.yea = yea;
  existing.nay = nay;
  existing.since = WorldClockApi.getNow().rawValue();
  existing.realSince = nowMs; // a flip restarts conviction
  await existing.save();
}

/** Drop a held position — delete the row. */
async function dropImpl(
  subject: string,
  stock: Stock,
  target: string
): Promise<void> {
  if (!active()) return;
  const [existing] = await Position.find({ subject, stock, target });
  if (existing) await existing.delete();
}

/** Read a held position with its derived conviction; `null` if none held. */
async function positionOfImpl(
  subject: string,
  stock: Stock,
  target: string,
  nowMs: number
): Promise<ConvictionPosition | null> {
  if (!active()) return null;
  const [p] = await Position.find({ subject, stock, target });
  if (!p) return null;
  return {
    subject: p.subject,
    stock: p.stock,
    target: p.target,
    yea: p.yea,
    nay: p.nay,
    conviction: convictionFraction(p, nowMs),
  };
}

/**
 * Tally held conviction on `{stock, target}`: `Σ standingOf(holder,
 * stock).scalar × convictionFraction × (yea − nay)` over every position.
 * **Full weight** (each position spends its holder's whole standing scalar —
 * no pool, no division across targets) and **non-fungible** (only positions
 * of `stock` count). Reads `InfluenceApi` (sync cached standing).
 */
async function tallyImpl(
  stock: Stock,
  target: string,
  nowMs: number
): Promise<ConvictionTally> {
  if (!active()) return new ConvictionTally(stock, target, 0, 0);
  const positions = await Position.find({ stock, target });
  let value = 0;
  for (const p of positions) {
    const scalar = InfluenceApi.standingOf(p.subject, stock).scalar;
    value += scalar * convictionFraction(p, nowMs) * (p.yea - p.nay);
  }
  return new ConvictionTally(stock, target, value, positions.length);
}

/**
 * The **quorum weight** cast on `{stock, target}`: `Σ standingOf(holder,
 * stock).scalar` over every *present* position (directional OR abstain).
 * This is the participation numerator — "votes cast" — that a passage rule
 * measures against the total possible. Deliberately **conviction-independent
 * and undirected**: showing up (any position) counts at full standing; not
 * voting (no row) does not. The decision direction/strength is `tally`'s job.
 */
async function quorumWeightImpl(
  stock: Stock,
  target: string
): Promise<number> {
  if (!active()) return 0;
  const positions = await Position.find({ stock, target });
  let weight = 0;
  for (const p of positions) {
    weight += InfluenceApi.standingOf(p.subject, stock).scalar;
  }
  return weight;
}

/**
 * ConvictionLogic — the hot-reloadable logic singleton behind
 * {@link ConvictionApi}.
 *
 * Lives at `/platform/idea/api/conviction` (a stateless `Stuff` singleton, no backing
 * `Template`); `ConvictionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the held-position store + the derive-on-read
 * conviction ramp + the tally (which reads `InfluenceApi` for each holder's
 * current standing). No stored weight is authoritative — conviction is
 * always recomputed from dwell time. No verb consumes it this build.
 *
 * Internal sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class ConvictionLogic extends ApiLogic {
  /** See {@link ConvictionApi.hold}. */
  @CallSecurity(ConvictionApiCallers)
  public async hold(
    subject: string,
    stock: Stock,
    target: string,
    split: { yea: number; nay: number },
    nowMs: number
  ): Promise<void> {
    return holdImpl(subject, stock, target, split.yea, split.nay, nowMs);
  }

  /** See {@link ConvictionApi.abstain}. */
  @CallSecurity(ConvictionApiCallers)
  public async abstain(
    subject: string,
    stock: Stock,
    target: string,
    nowMs: number
  ): Promise<void> {
    return abstainImpl(subject, stock, target, nowMs);
  }

  /** See {@link ConvictionApi.flip}. */
  @CallSecurity(ConvictionApiCallers)
  public async flip(
    subject: string,
    stock: Stock,
    target: string,
    nowMs: number
  ): Promise<void> {
    return flipImpl(subject, stock, target, nowMs);
  }

  /** See {@link ConvictionApi.drop}. */
  @CallSecurity(ConvictionApiCallers)
  public async drop(
    subject: string,
    stock: Stock,
    target: string
  ): Promise<void> {
    return dropImpl(subject, stock, target);
  }

  /** See {@link ConvictionApi.positionOf}. */
  @CallSecurity(ConvictionApiCallers)
  public async positionOf(
    subject: string,
    stock: Stock,
    target: string,
    nowMs: number
  ): Promise<ConvictionPosition | null> {
    return positionOfImpl(subject, stock, target, nowMs);
  }

  /** See {@link ConvictionApi.tally}. */
  @CallSecurity(ConvictionApiCallers)
  public async tally(
    stock: Stock,
    target: string,
    nowMs: number
  ): Promise<ConvictionTally> {
    return tallyImpl(stock, target, nowMs);
  }

  /** See {@link ConvictionApi.quorumWeight}. */
  @CallSecurity(ConvictionApiCallers)
  public async quorumWeight(stock: Stock, target: string): Promise<number> {
    return quorumWeightImpl(stock, target);
  }
}
