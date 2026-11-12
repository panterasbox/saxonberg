/**
 * ReserveDashboardController — bare `reserve` — the Governor's
 * dashboard (over {@link BankingControllerBase}).
 *
 * ⭐ The reserve does not issue money by hand. It runs two published rules
 * — the window and the perpetual (`BankingLogic`'s `windowAdvanceImpl` /
 * `reconcilePerpetualImpl`) — and the Governor GOVERNS BY TUNING: bare
 * `reserve` is the dashboard (the three numbers, per currency, never
 * totalled), `reserve supply` the conservation audit
 * (`ReserveSupplyController`), `reserve set <row> <value>` the Schedule's
 * `reserve.*` rows and the Governor's Tier C keys (`ReserveSetController`),
 * and `reserve override <amount> to <target> "<reason>"` the ONE
 * hand-typed number left (`ReserveOverrideController`).
 *
 * `reserve mint` and `reserve issue` are gone: issuance no longer names a
 * destination. The treasury appropriates; a business opens on the
 * treasury's advance; a newcomer arrives on their Note.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import { ContractApi } from "../../../../api/contract";
import { GrammarApi } from "../../../../api/grammar";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

export default class ReserveDashboardController extends BankingControllerBase<CommandModel> {
  /**
   * The Governor's three numbers, per currency: money per active member
   * (the perpetual rule's own input), the default rate on window paper (the
   * inflation dial), and the price index over the basket (inflation you
   * can see) — beside the two lanes outstanding and the overrides on the
   * record. Rates and shares in words; never a total across currencies.
   */
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const d = await BankingApi.reserveDashboard(c);
      await ContractApi.reconcileLoans(null);
      const defaults = await ContractApi.windowDefaultRate(c);
      const index = await BankingApi.priceIndex();
      const amount = (minor: number): string => Money.of(minor, c).render();
      const perMember = Number(AppApi.setting(AppSettingKeys.reserveMoneyPerActiveMember) || 0);
      const windowRate = Number(AppApi.setting(AppSettingKeys.reserveWindowRatePerYear) || 0);
      const haircut = Number(AppApi.setting(AppSettingKeys.reserveHaircut) || 0);
      blocks.push(
        `The reserve (${record.plural})\n` +
          `  active members:            ${GrammarApi.inWords(d.activeMembers)}\n` +
          `  money per active member:   ${amount(d.moneyPerActiveMember)} (the rule buys up to ${amount(perMember)} each)\n` +
          `  the perpetual, held:       ${amount(d.perpetualOutstanding)}\n` +
          `  window advances outstanding: ${amount(d.windowOutstanding)} at ${ReserveDashboardController.percentInWords(windowRate)} per cent a game-year (a real month), haircut ${ReserveDashboardController.percentInWords(haircut)} per cent\n` +
          `  default rate on window paper: ${ReserveDashboardController.percentInWords(defaults.rate)} per cent (${amount(defaults.defaulted)} of ${amount(defaults.advanced)} advanced)\n` +
          `  price index:               ${GrammarApi.inWords(index.percent)} against a base of one hundred\n` +
          `  overrides on the record:   ${amount(d.overridesOutstanding)}\n` +
          `  the treasury holds:        ${amount(d.treasuryBalance)}`,
      );
    }
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${blocks.join("\n\n")}`)
      .send();
  }

  private static percentInWords(fraction: number): string {
    const pct = fraction * 100;
    const whole = Math.round(pct);
    return Math.abs(pct - whole) < 1e-9 ? GrammarApi.inWords(whole) : `${pct}`;
  }
}
