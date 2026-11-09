/**
 * BankingControllerBase — shared resolution helpers for the banking verbs.
 *
 * The dispatch-on-subcommand controllers (`bank` / `wallet` / `tab` /
 * `reserve` / `house`) and the flat `pay` verb all extend this. Resolving
 * the present bank / venue / bartender is the "agent performs, venue owns
 * the state" pattern (the `Menu`/crafting precedent).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MqlApi } from "../../../../api/mql";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import { BankingApi } from "../../../../api/banking";
import { EmploymentApi } from "../../../../api/employment";
import { PlayerApi } from "../../../../api/player";
import type { Business } from "../../../../api/employment";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import { Office } from "../../../../lib/governance/Office";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

export abstract class BankingControllerBase<
  T extends CommandModel = CommandModel,
> extends CommandController<T> {
  /**
   * MQL enumeration of the room's occupants (the `peers` seed) — the shared
   * candidate pool the capability filters below run over, in place of a
   * hand-rolled containment scan.
   */
  private peers(context: CommandContext): Stuff[] {
    return MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    }).stuff;
  }

  /**
   * A refusal from the banking logic, in the player's words: the logic tags
   * its errors with the method that threw (`BankingLogic.withdraw: …`) for
   * the log, and that tag is not for the counter (the water-supply walk
   * read "BankingLogic.withdraw: the branch can't cover …").
   */
  protected refusalWords(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    const bare = raw.replace(/^[A-Z][A-Za-z]*(Logic|Api)\.[a-zA-Z]+: /, '');
    return bare.charAt(0).toUpperCase() + bare.slice(1);
  }

  /**
   * ⭐ **A seat sets its own dials, on the record** (wizard-axis D11). The
   * one write path for a Tier C settings key: `treasury set` (the Minister
   * of Finance) and `reserve set` (the Governor) both land here. Whose row
   * it is (Tier C: its office; the Governor's `reserve.*` Schedule rows)
   * and whether the giver holds the seat are `AppApi.setSetting`'s refusals
   * (`wrong-seat` naming who does set it, `not-seated`). On success it writes the value
   * and records the change as the officer's DEED — *"As Minister of
   * Finance, set `banking.salesTaxRate` to 0.1; it was 0.08."* — readable
   * with `chronicle`.
   */
  protected async setSeatDial(
    context: CommandContext,
    rowIn: string | undefined,
    valueIn: string | undefined,
    seat: string,
  ): Promise<void> {
    const giver = context.commandGiver;
    const row = (rowIn ?? "").trim();
    const value = (valueIn ?? "").trim();
    const tell = (text: string): void => {
      MessageApi.scene(giver).topic("act.deed").toSelf(Mml.text(text)).send();
    };
    const known = (Object.values(AppSettingKeys) as string[]).includes(row);
    if (!known) {
      tell(`No such row in the Schedule: \`${row}\`.`);
      context.note({ kind: "controller-rejected", reason: "unknown-row", detail: row });
      return;
    }
    if (!value) {
      tell("Set it to what?");
      context.note({ kind: "controller-rejected", reason: "bad-value", detail: row });
      return;
    }
    // Whose row it is and whether the giver holds the seat are the write's
    // own rules (AppLogic.setSetting, controller-liquidity D9).
    const wrote = await AppApi.setSetting(giver, row, value, seat);
    if (!wrote.ok) {
      const detail =
        wrote.reason === "wrong-seat"
          ? `\`${row}\` is not this seat's to set: ${wrote.whoSets}.`
          : "You do not hold this seat.";
      tell(detail);
      context.note({ kind: "controller-rejected", reason: wrote.reason, detail });
      return;
    }
    const before = wrote.before;
    const office = Office.byKey(seat)?.getDisplayName() ?? seat;
    const text = `As ${office}, set \`${row}\` to ${value}; it was ${before || "unset"}.`;
    if (MixinApi.isPersona(giver)) {
      await giver.recordDeed({ text, tags: ["governance", "tier-c", row] });
    }
    tell(`The Schedule now reads \`${row} = ${value}\` (was \`${before || "unset"}\`). On the record.`);
  }

  /** The affording bank counter, else the BankMixin host present in the room. */
  /**
   * Who a fiscal act names — `reserve override … to <target>`, `treasury
   * appropriate … to <target>`: an online member by name, else a business
   * or organization by keyword (the `job post --business` resolver).
   * Returns the durable key its primary account is owned under.
   */
  protected static resolvePayee(asked: string): { key: string; label: string } | null {
    const want = asked.trim();
    if (!want) return null;
    const avatar = PlayerApi.findAvatarByName(want);
    if (avatar) {
      return { key: avatar.getIdentityPath() ?? "", label: avatar.getName() ?? want };
    }
    const org = EmploymentApi.findOrganization(want);
    if (org) {
      const key =
        (org as { getAccountPath?: () => string }).getAccountPath?.() ??
        org.getTemplatePath() ??
        "";
      return key ? { key, label: EmploymentApi.organizationLabel(org) } : null;
    }
    return null;
  }

  /**
   * Credit the `finance` Discipline for an act that exercises it —
   * borrowing (granted or refused: the refusal is the lesson), reading a
   * book, naming a beneficiary (economic bootstrap D21). On the giver,
   * narrowed by `isAdvancing`; the row is `Discipline/finance`.
   */
  protected creditFinance(giver: Stuff): void {
    if (!MixinApi.isAdvancing(giver)) return;
    void giver.creditDeed({ discipline: "finance", difficulty: "easy", outcome: "success" });
  }

  protected resolveBank(context: CommandContext): (Stuff & Bank) | null {
    const source = context.commandSource as Stuff | undefined;
    if (source && MixinApi.isBank(source)) return source;
    // MQL enumerates; `isBank` is the interim capability filter (a future
    // MQL type/mixin predicate subsumes it).
    return (
      this.peers(context).find((s): s is Stuff & Bank =>
        MixinApi.isBank(s),
      ) ?? null
    );
  }


  /**
   * ⭐ The house the giver acts for: the Business operating **here** when
   * the giver holds a position there or proprietors it, else the single
   * one they buy for, else null. Authority is the seat's — a position
   * held or the proprietorship — never the wizard axis and never a carried
   * screen.
   */
  protected async resolveHouse(
    context: CommandContext,
  ): Promise<(Stuff & Business) | null> {
    const giver = context.commandGiver;
    // ⭐ The wallet's choice first: `wallet use house` linked a house's
    // operating account into the giver's credential, and that is the house
    // they act for now — a teller who also keeps a stall borrows for the
    // stall at the bank counter she works. Then the house operating here.
    const active = BankingApi.activeCredential()?.getActiveAccount() ?? null;
    if (active) {
      const ownerKey = await BankingApi.ownerKeyOf(active);
      const live = ownerKey && ownerKey !== giver.getIdentityPath() ? StuffApi.findByTemplatePath(ownerKey) : null;
      if (live && MixinApi.isBusiness(live) && (live.employs(giver) || (await live.hasProprietor(giver)))) {
        return live;
      }
    }
    // The house operating HERE — the room, or a fixture standing in it
    // (attribution keys on the fixture: a bank's business operates its
    // counter, not the hall the counter stands in). ⭐ One walk, two
    // consumers: this, and the help-wanted sign (`EmploymentApi.noticesAt`).
    for (const here of EmploymentApi.operatorsAt(context.location ?? null)) {
      if (here.employs(giver) || (await here.hasProprietor(giver))) {
        return here;
      }
    }
    const mine = MixinApi.isEmployed(giver) ? await giver.buysFor() : [];
    return mine[0] ?? null;
  }

  /** A present bartender (whoever is on shift and fulfilling here) — the house's rep. */
  protected presentBartender(context: CommandContext): Stuff | null {
    return (
      this.peers(context).find(
        (s) => MixinApi.isEmployed(s) && s.isFulfilling(),
      ) ?? null
    );
  }
}
