/**
 * ReserveController — the `reserve` verb (Governor-gated): the Central
 * Bank's surface after the economic bootstrap.
 *
 * ⭐ The reserve does not issue money by hand. It runs two published rules
 * — the window and the perpetual (`BankingLogic`'s `windowAdvanceImpl` /
 * `reconcilePerpetualImpl`) — and the Governor GOVERNS BY TUNING: bare
 * `reserve` is the dashboard (the three numbers, per currency, never
 * totalled), `reserve supply` the conservation audit, `reserve set <row>
 * <value>` the Schedule's `reserve.*` rows (refuses any other prefix — the
 * independence clause in code: the treasury seat cannot reach these, and
 * `config` stays the operator's code-trust act), and `reserve override
 * <amount> to <target> "<reason>"` the ONE hand-typed number left: a mint
 * the ledger records as the officer's act with the officer's reason.
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

/** The Schedule prefix this seat may write. */
const RESERVE_PREFIX = "reserve.";

interface ReserveModel extends CommandModel {
  row?: string;
  value?: string;
  amount?: string;
  to?: string;
  target?: string;
  reason?: string;
}

export default class ReserveController extends BankingControllerBase<ReserveModel> {
  async execute(model: ReserveModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case undefined:
      case "":
        return this.dashboard(context);
      case "supply":
        return this.supply(context);
      case "set":
        return this.set(model, context);
      case "override":
        return this.override(model, context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`Usage: \`reserve\`, \`reserve supply\`, \`reserve set <row> <value>\` or \`reserve override <amount> to <target> "<reason>"\`. The reserve no longer mints or issues by hand.`,
          )
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand ?? "" });
    }
  }

  /**
   * The Governor's three numbers, per currency: money per active member
   * (the perpetual rule's own input), the default rate on window paper (the
   * inflation dial), and the price index over the basket (inflation you
   * can see) — beside the two lanes outstanding and the overrides on the
   * record. Rates and shares in words; never a total across currencies.
   */
  private async dashboard(context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const d = await BankingApi.reserveDashboard(c);
      await ContractApi.reconcileLoans(null);
      const defaults = await ContractApi.windowDefaultRate(c);
      const index = BankingApi.priceIndex();
      const amount = (minor: number): string => Money.of(minor, c).render();
      const perMember = Number(AppApi.setting(AppSettingKeys.reserveMoneyPerActiveMember) || 0);
      const windowRate = Number(AppApi.setting(AppSettingKeys.reserveWindowRatePerYear) || 0);
      const haircut = Number(AppApi.setting(AppSettingKeys.reserveHaircut) || 0);
      blocks.push(
        `The reserve (${record.plural})\n` +
          `  active members:            ${GrammarApi.inWords(d.activeMembers)}\n` +
          `  money per active member:   ${amount(d.moneyPerActiveMember)} (the rule buys up to ${amount(perMember)} each)\n` +
          `  the perpetual, held:       ${amount(d.perpetualOutstanding)}\n` +
          `  window advances outstanding: ${amount(d.windowOutstanding)} at ${ReserveController.percentInWords(windowRate)} per cent a game-year (a real month), haircut ${ReserveController.percentInWords(haircut)} per cent\n` +
          `  default rate on window paper: ${ReserveController.percentInWords(defaults.rate)} per cent (${amount(defaults.defaulted)} of ${amount(defaults.advanced)} advanced)\n` +
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

  /**
   * Write one Schedule row — and ONLY a `reserve.*` one. The prefix check
   * is the independence clause: the seat that spends (the Minister of
   * Finance) cannot tune the rules, and the seat that tunes cannot spend.
   */
  private async set(model: ReserveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const row = (model.row ?? "").trim();
    const value = (model.value ?? "").trim();
    if (!row.startsWith(RESERVE_PREFIX)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The Governor writes the reserve's rows and no others: \`${RESERVE_PREFIX}…\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "not-a-reserve-row", detail: row });
      return;
    }
    const known = Object.values(AppSettingKeys).includes(row as never);
    if (!known) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No such row in the Schedule: \`${row}\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "unknown-row", detail: row });
      return;
    }
    if (!value) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Set it to what?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-value", detail: row });
      return;
    }
    const before = AppApi.setting(row);
    await AppApi.setSetting(row, value);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The Schedule now reads \`${row} = ${value}\` (was \`${before || "unset"}\`).`)
      .send();
  }

  /**
   * The emergency override: a mint into a named target's account, the
   * reason on the ledger row, the officer as the actor from context. The
   * dashboard prints overrides outstanding as its own line; the faucet
   * lint allowlists exactly this act.
   */
  private async override(model: ReserveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Override how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    if ((model.to ?? "").toLowerCase() !== "to") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`reserve override <amount> to <target> "<reason>"\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-syntax", detail: model.to ?? "" });
      return;
    }
    const reason = (model.reason ?? "").trim().replace(/^["']|["']$/g, "");
    if (!reason) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`An override goes on the record with a reason. Give one.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-reason", detail: "" });
      return;
    }
    const target = ReserveController.resolvePayee(model.target ?? "");
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No business or member answers to "${model.target ?? ""}".`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-target", detail: model.target ?? "" });
      return;
    }
    const account = await BankingApi.primaryAccountIdOf(target.key);
    if (!account) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${target.label} has no account to receive into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: target.key });
      return;
    }
    const money = Money.of(minor, BankingApi.compactCurrency());
    await BankingApi.override(account, money, reason);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The reserve mints ${money.render()} into ${target.label}'s account on your override — "${reason}" — and the record says so.`,
      )
      .send();
  }

  /**
   * One block per registered currency, from the COMPLETE audit — supply
   * against every reservoir, including vault float and coin captured in
   * `holder_snapshots`.
   *
   * ⚠ It never sums across currencies. There is no rate, so a combined total
   * would be a number nobody can justify — and asking for one is the first
   * step toward an exchange this design deliberately refuses.
   */
  private async supply(context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const r = await BankingApi.fullReconcile(c);
      const amount = (minor: number): string => Money.of(minor, c).render();
      // ⭐ The overdraft line is only printed when there IS one — and since
      // the floor (economic bootstrap D3) it is expected to read zero; a
      // non-zero line is a defect report, not a policy.
      const overdraft =
        r.overdraft > 0
          ? `\n  of which overdraft: ${amount(r.overdraft)} (unissued credit — THE FLOOR IS BREACHED)`
          : "";
      blocks.push(
        `Money supply (${record.plural}): ${amount(r.supply)}\n` +
          `  in accounts:       ${amount(r.accountTotal)}${overdraft}\n` +
          `  in circulation:    ${amount(r.circulatingCoin)}\n` +
          `  in bank vaults:    ${amount(r.vaultCoin)} (backed on-ledger)\n` +
          `  held offline:      ${amount(r.snapshotCoin)}\n` +
          `  cash in existence: ${amount(r.cashInExistence)}\n` +
          `  reconciliation: ${r.fullyBalanced ? "balanced" : "OUT OF BALANCE"}`,
      );
    }
    const body = blocks.join("\n\n");
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
