/**
 * InfluenceApi — the common, cross-stock layer of the influence substrate:
 * a thin, stock-parameterized dispatcher over the per-stock Apis, plus the
 * shared `InfluenceStanding` / `Band` output shape.
 *
 * The three-stock contract made structural. `standingOf(subject, stock)`
 * delegates by stock to the stock's home — today only `'consumer'`
 * (→ {@link ConsumerApi}); `'capital'` and `'producer'` are reserved values
 * (their faucets are the Twitch and CMS/AOP builds) and return a defined
 * **zero standing** tagged with that stock, never a throw. The symmetry
 * lives here at the standing/band layer; the asymmetry (each stock's faucet
 * and formula) stays in the stock's own Api — capital is `concave($)`, not
 * `engagement × quality`, so no shared formula could fit.
 *
 * InfluenceApi owns no faucet and no logic singleton: the consumer
 * projection lives in `ConsumerLogic`; this is pure dispatch.
 */

import { ConsumerApi } from './consumer';
import { ProducerApi } from './producer';
import { InfluenceStanding } from '../lib/standing/InfluenceStanding';
import type { Stock } from '../lib/standing/InfluenceStanding';
import type { Band } from '../lib/standing/Band';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  AccountScoped,
  AccountSubjects,
} from '../lib/standing/AccountScoped';
import { SecurityApi } from './security';

export type { Stock };

/**
 * Which *level* a stock measures at.
 *
 * From the seeding slate: **Make** (you build) and **Fund** (you pay)
 * are things the **person** does → account-level. **Play** accrues by
 * living in the world as one particular body → per-character, and is
 * the only standing that can legitimately diverge across an account's
 * characters.
 *
 * ⚠ This is **vocabulary, not arithmetic.** Declaring that producer is
 * account-level says nothing about how an account's figure is derived
 * from its characters' — that is an open design question (see
 * {@link InfluenceApi.standingForHost}).
 */
export type StandingLevel = 'account' | 'character';

/** The level each stock measures at. See {@link StandingLevel}. */
export const STOCK_LEVEL: Readonly<Record<Stock, StandingLevel>> = {
  consumer: 'character',
  producer: 'account',
  capital: 'account',
};

export class InfluenceApi {
  /**
   * A subject's measured standing in `stock`, carrying the `stock` tag and
   * its band. `'consumer'` delegates to {@link ConsumerApi}, `'producer'` to
   * {@link ProducerApi}; the still-reserved `'capital'` stock returns a
   * defined zero standing tagged with that stock.
   */
  public static standingOf(subjectId: string, stock: Stock): InfluenceStanding {
    if (stock === 'consumer') return ConsumerApi.standingOf(subjectId);
    if (stock === 'producer') return ProducerApi.standingOf(subjectId);
    return InfluenceStanding.zero(subjectId, stock);
  }

  /**
   * An **account's** standing in `stock` — the arithmetic, in one place.
   *
   * `subject` names what was measured; `members` are the per-character
   * subject keys the account owns. Only account-level stocks have a
   * roll-up: `'producer'` sums (see `ProducerLogic`), `'capital'` has no
   * faucet and returns a tagged zero, and `'consumer'` is character-level
   * so asking for an account roll-up of it is a caller error.
   *
   * ⭐ Two entry points, one formula. `standingForHost` resolves a host
   * to its account and delegates here; `Login` calls it directly, having
   * no host at all — at the character-select screen the player is not
   * embodied. Because both run this function, the roster and the
   * in-world figure **cannot** disagree, which is the structural answer
   * to the split-brain defect the previous attempt shipped.
   */
  public static standingForAccount(
    subject: string,
    members: readonly string[],
    stock: Stock
  ): InfluenceStanding {
    if (stock === 'producer') {
      return ProducerApi.standingForAccount(subject, members);
    }
    // `consumer` is character-level; there is no account roll-up of it,
    // and inventing one here would contradict STOCK_LEVEL.
    return InfluenceStanding.zero(subject, stock);
  }

  /**
   * A **host's** standing in `stock` — the seam every player-facing
   * surface reads through, so `standing`, `profile` and the live
   * dashboard field cannot disagree.
   *
   * ⚠⚠ **Returns `undefined` when an account-level stock cannot resolve
   * its account**, and a caller may NOT substitute a per-character
   * figure for it.
   *
   * That is the whole point. The account is resolved through the host's
   * runtime `User`, which is unpersisted — so "no account in hand" is a
   * reachable state, and the previous attempt at this roll-up quietly
   * fell back to the per-character number when it hit that state, with
   * nothing saying so. A figure whose *level* is wrong is worse than an
   * absent one, because it is confidently wrong at the exact moment
   * nobody is looking.
   *
   * The `undefined` convention is not invented here: `measuredRenownOf`
   * already returns it for an unmaterialized scope, precisely so a
   * reader can tell *never measured* from *measured at zero*.
   *
   * Character-level stocks never return `undefined`.
   */
  public static standingForHost(
    host: Stuff,
    stock: Stock
  ): InfluenceStanding | undefined {
    // The durable subject the faucets re-key storage to; the live
    // stuffId is re-minted on re-clone. Matches the faucet's own
    // fallback so the key always agrees.
    const subject = host.getTemplatePath() ?? host.stuffId;

    if (STOCK_LEVEL[stock] === 'character') {
      return InfluenceApi.standingOf(subject, stock);
    }

    const account = InfluenceApi.#accountOf(host);
    if (!account) return undefined;
    return InfluenceApi.standingForAccount(
      account.subject,
      account.members,
      stock
    );
  }

  /**
   * The account a host belongs to, or `undefined`.
   *
   * ⚠ A `typeof` guard rather than `MixinApi.isX`, and confined to this
   * one private method. See `lib/standing/AccountScoped.ts` for why: no
   * mixin owns account ownership, and reaching `Avatar` — directly or
   * through `PlayerApi` — would close an import cycle, because `Avatar`
   * imports this module.
   */
  static #accountOf(host: Stuff): AccountSubjects | undefined {
    const scoped = host as unknown as Partial<AccountScoped>;
    if (typeof scoped.getAccountSubjects !== 'function') return undefined;
    return scoped.getAccountSubjects();
  }

  /** The band a subject sits in for `stock` (the player-facing surface). */
  public static bandOf(subjectId: string, stock: Stock): Band {
    return InfluenceApi.standingOf(subjectId, stock).band;
  }
}

SecurityApi.decorateApiClass(InfluenceApi);
