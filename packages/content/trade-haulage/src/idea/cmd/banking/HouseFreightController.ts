/**
 * `house freight` and `house traffic` — ⭐⭐ **the reporting spine, and
 * there is no reporting subsystem.**
 *
 * D12's whole claim: no new store, no dashboard, no aggregate. Bills of
 * lading are documents; *what moved from X to Y this season* and *which
 * stretch of road carried the most* are **queries over the paper**.
 *
 * ⚠ An earlier draft said the query language was MQL. It cannot be:
 * every MQL seed resolves `Stuff` and `MqlMatch` wraps `Stuff`, so
 * documents are not in its world, and making them seedable means a new
 * seed inside the sealed `api/mql/**` subdir **and** widening the result
 * type across every consumer of every MQL result — a large refactor for
 * one wording. The queries live on the registry that owns the paper and
 * surface here, on the shipped `house` verb (the `house stock` /
 * `house pnl` precedent).
 *
 * ⭐ **They read the caller's OWN books, and only those.** Bills are
 * path-keyed under the filing business's branch, so coverage is
 * structural: a depot sees exactly what it handled. That is the honest
 * consequence of shipping without customs — **private books do not
 * aggregate**, nobody sees the realm's trade, and the first institution
 * that can see across is not the state but the depot, whose coverage IS
 * its market share.
 *
 * ⚠ A stanza on a shipped view, per the instrumentation doctrine — the
 * trade's controller on the platform's verb. An install without this
 * pack gets a legible `controller-error`, never a crash.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Business } from '@saxonberg/server/mud/platform/idea/Business';
import type { Employed } from '@saxonberg/server/mud/lib/employment/Employed';
import WaybillRegistry, {
  type FreightQuery,
} from '../../WaybillRegistry';
import { WAYBILL_REGISTRY_PATH } from '../../../lib/haulage/ShipmentDesk';

const TOPIC = 'act.deed';
/** A season, in game seconds — the default `--since` window. */
const SEASON_S = 91 * 24 * 3_600;

interface FreightModel extends CommandModel {
  from?: string;
  to?: string;
  since?: string;
}

export default class HouseFreightController extends CommandController<FreightModel> {
  async execute(model: FreightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.houseOf(giver);
    if (!house) {
      return this.fail(context, "You don't keep any house here.", 'not-staff');
    }
    const registry = await StuffApi.singleton<WaybillRegistry>(
      WAYBILL_REGISTRY_PATH,
    );

    const query: FreightQuery = {};
    if (model.from) query.from = model.from;
    if (model.to) query.to = model.to;
    if (model.since === 'season') {
      query.sinceS = Math.max(0, WorldClockApi.getNow().rawValue() - SEASON_S);
    }

    if (model.subcommand === 'traffic') {
      const traffic = await registry.trafficOf(house, query);
      if (traffic.length === 0) {
        return this.tell(giver, 'Nothing of yours has been on a road yet.');
      }
      // ⭐⭐ Derived, and there is no counter anywhere in the realm to go
      // stale: nobody authors that the valley road is busy — it is busy
      // because the goods go down it, and if the mine closes it stops
      // being busy on its own.
      const lines = traffic.map(
        (t) =>
          `  ${leafOf(t.from)} → ${leafOf(t.to)} — ${t.crossings} ` +
          `${t.crossings === 1 ? 'load' : 'loads'}`,
      );
      return this.tell(
        giver,
        `What your loads have crossed, busiest first:\n${lines.join('\n')}\n\n` +
          `Counted off the bills. Nobody keeps a tally of the road itself.`,
      );
    }

    const bills = await registry.freightOf(house, query);
    if (bills.length === 0) {
      return this.tell(giver, 'No paper. Nothing of yours has moved.');
    }
    const lines = bills
      .slice(0, 20)
      .map(
        (b) =>
          `  ${b.what} · ${b.howMuch} · ${leafOf(b.from)} → ${leafOf(b.to)}` +
          (b.declaredValueMinor > 0 ? ` · declared ${b.declaredValueMinor}` : '') +
          ` · by ${b.via}`,
      );
    this.tell(
      giver,
      `Your freight${bills.length > 20 ? ' (last 20)' : ''}:\n${lines.join('\n')}`,
    );
  }

  /** The business the caller keeps — proprietor, or one they buy for. */
  private async houseOf(giver: Stuff): Promise<(Stuff & Business) | null> {
    if (!MixinApi.isEmployed(giver)) return null;
    const houses = await (giver as Stuff & Employed).buysFor();
    return (houses[0] as (Stuff & Business) | undefined) ?? null;
  }

  private tell(who: Stuff, text: string): void {
    MessageApi.scene(who)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${text}\n`))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.tell(context.commandGiver, detail);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

/** The last path segment, for prose. */
function leafOf(path: string): string {
  if (path === '') return 'somewhere';
  const leaf = path.split('/').filter(Boolean).pop() ?? path;
  return leaf.replace(/-/g, ' ');
}
