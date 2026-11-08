/**
 * BankStatementController — `bank statement [count]`: the account's
 * recent ledger as a running statement. Read-only over the same account
 * `balance` resolves; the running balance is accumulated over the *full*
 * history (oldest→newest) so the shown window's balances are true, then
 * the most recent `count` rows (default 20, capped 100) are rendered
 * newest-first.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

/** Default / max rows a `bank statement` lists (most recent first). */
const DEFAULT_STATEMENT_ROWS = 20;
const MAX_STATEMENT_ROWS = 100;

export default class BankStatementController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const accountId = await this.accountHere(bank, context, "statement");
    if (!accountId) return;
    const rows = await BankingApi.entriesFor(accountId);
    if (rows.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No activity on your account here yet.`)
        .send();
      return;
    }
    // Oldest → newest so the running balance accumulates in order (wall clock
    // primary, game clock as the tiebreak).
    const ordered = [...rows].sort(
      (a, b) => (a.realAt || 0) - (b.realAt || 0) || (a.at || 0) - (b.at || 0)
    );
    let running = 0;
    const annotated = ordered.map((r) => {
      const delta = r.toAccount === accountId ? r.amount : -r.amount;
      running += delta;
      return { r, delta, running };
    });
    const requested = Number(model.count);
    const limit =
      Number.isInteger(requested) && requested > 0
        ? Math.min(requested, MAX_STATEMENT_ROWS)
        : DEFAULT_STATEMENT_ROWS;
    const shown = annotated.slice(-limit).reverse();
    const lines = shown
      .map(({ r, delta, running: bal }) => {
        const sign = delta >= 0 ? "+" : "";
        const label = r.memo || r.kind;
        return `  ${sign}${Money.of(delta, BankingApi.compactCurrency()).render()}  ${label}  (balance ${Money.of(bal, BankingApi.compactCurrency()).render()})`;
      })
      .join("\n");
    const heading =
      annotated.length > shown.length
        ? `Statement (most recent ${shown.length} of ${annotated.length}):`
        : `Statement:`;
    const body =
      `${heading}\n${lines}\n` +
      `  Current balance: ${BankingApi.balanceOf(accountId).render()}`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
