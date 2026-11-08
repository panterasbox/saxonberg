/**
 * HouseDrawController — `house draw <amount>` (the flat `draw` verb until
 * controllers-are-io W7 — the operating account is the house's book): the proprietor's take-home, a `draw`
 * leg from the Business account to the proprietor's primary (never
 * silently a wage — the distinct kind is the future tax wedge).
 *
 * The participant gate is structural: the business is resolved **from the
 * actor** (`EmploymentApi.businessOfProprietor` — a non-proprietor
 * resolves null and is refused; no business parameter exists to spoof),
 * keeping banking↔employment imports one-directional (employment →
 * banking only; this controller is the join point). Solvency refusals
 * come from `BankingApi.payDraw`.
 */

import { HouseControllerBase } from "./HouseControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";

const TOPIC = "act.deed";

interface DrawModel extends CommandModel {
  amount: number;
}

export default class HouseDrawController extends HouseControllerBase<DrawModel> {
  async execute(model: DrawModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.refuseDraw(context, "Draw how much? Name a whole amount.", "bad-amount");
    }

    const business = EmploymentApi.businessOfProprietor(giver);
    if (!business) {
      return this.refuseDraw(
        context,
        "You don't run a business to draw from.",
        "not-proprietor",
      );
    }
    const giverKey = giver.getIdentityPath() ?? "";
    let account: string;
    try {
      // Custody is the business's authored banksAt (never a default).
      account = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return this.refuseDraw(
        context,
        "The business banks nowhere — author its banksAt.",
        "no-bank",
      );
    }
    try {
      await BankingApi.payDraw(account, giverKey, Money.of(minor, BankingApi.compactCurrency()));
    } catch (err) {
      return this.refuseDraw(
        context,
        err instanceof Error && /holds less/.test(err.message)
          ? "The business can't cover that draw."
          : "The draw can't be paid — do you have an account?",
        "draw-refused",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You draw ${Money.of(minor, BankingApi.compactCurrency()).render()} from the business into your own account — the owner's take, on the books as exactly that.`,
      )
      .send();
  }

  /** The deed-topic refusal (the base's `fail` speaks to the shell). */
  private refuseDraw(context: CommandContext, message: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: message });
  }
}
