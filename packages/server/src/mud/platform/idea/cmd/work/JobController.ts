/**
 * JobController — the board-afforded `job`/`jobs` verb (the `work`
 * category), dispatch-on-subcommand (the `office`/`party` shape):
 *
 *   - bare / `jobs` — browse the live gigs on this board;
 *   - `post <item> to <destination> for <reward>` [--bounty] [--business]
 *     [--expires <h>] — post a delivery gig, reward escrowed;
 *   - `claim <id>` — lock an exclusive gig;
 *   - `complete [id]` — the redeem beat (payday at the board);
 *   - `abandon [id]` — walk away (breach).
 *
 * Thin: map model → the `ContractApi` call, render Scene + `ctx.note`.
 * Every actor is context-derived inside the gated logic — the controller
 * passes no principal. The board resolves via `JobBoard.resolveIn`
 * (affordance fast-path, else reachable peers); gig ids accept a unique
 * prefix of the full contract id (the browse shows the short form).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { AddressApi } from "../../../../api/address";
import { MqlApi } from "../../../../api/mql";
import { Mml } from "../../../../api/mml";
import { ContractApi } from "../../../../api/contract";
import type { ConditionData } from "../../../../lib/employment/Condition";
import type { ContractRecord } from "../../../../lib/employment/ContractRecord";
import JobBoard from "../../../thing/JobBoard";

const TOPIC = "act.deed";

/** The browse's short id — enough to be unique on one board. */
const SHORT_ID_LEN = 8;

interface JobModel extends CommandModel {
  /**
   * `post`: the condition PHRASE — `deliver <thing> to <place>` or
   * `supply <n> <kind> to <place>`. Greedy up to `for`, parsed here
   * against the closed template vocabulary.
   */
  condition?: string;
  /** `post`: the reward, minor units (a string arg; coerced here). */
  reward?: string;
  /** `post`: where the work STARTS (name reachable-first, else a path). */
  from?: string;
  bounty?: boolean;
  business?: boolean;
  expires?: number;
  /**
   * ⭐ browse: list gigs whose ORIGIN is here rather than what hangs on
   * this board — the backhaul (D17). `here` is the only value that means
   * anything today; anything else is read as a place name.
   */
  origin?: string;
  /** `claim`/`complete`/`abandon`: a gig id (or unique prefix). */
  id?: string;
}

export default class JobController extends CommandController<JobModel> {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = JobBoard.resolveIn(context);
    if (!board) {
      return this.fail(context, "There's no job board here.", "no-board");
    }
    switch (model.subcommand ?? "browse") {
      case "post":
        return this.executePost(model, context, board);
      case "claim":
        return this.executeClaim(model, context, board);
      case "complete":
        return this.executeComplete(model, context, board);
      case "abandon":
        return this.executeAbandon(model, context, board);
      case "browse":
        return this.executeBrowse(model, context, board);
      default:
        return this.fail(
          context,
          `Unknown job subcommand: ${model.subcommand}`,
          "unknown-subcommand",
        );
    }
  }

  /* ─────────────────────────── browse ─────────────────────────── */

  private async executeBrowse(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const giver = context.commandGiver;
    const giverKey = giver.getIdentityPath() ?? "";

    // ⭐ `jobs --origin here` is the BACKHAUL read (D17): a hauler at the
    // far end of a corridor asking what wants moving back. It is a
    // different question from "what hangs on this board" — the return
    // load is posted wherever the shipper is, not where you are standing
    // — so it reads by origin rather than by board.
    const originRaw = (model.origin ?? "").trim();
    if (originRaw) {
      const originPath = this.place(originRaw, context);
      const back = await ContractApi.openGigsFrom(originPath);
      if (back.length === 0) {
        this.send(
          context,
          Mml.compose`\nNothing wants moving out of ${leafOf(originPath)} right now — you would go back empty.\n`,
        );
        return;
      }
      this.send(
        context,
        Mml.compose`\nWanting carriage out of ${leafOf(originPath)}:\n${back
          .map((gig) => this.describeGig(gig, giverKey))
          .join("\n")}\n`,
      );
      return;
    }

    const gigs = await ContractApi.openGigsOn(board.getTemplatePath() ?? "");
    if (gigs.length === 0) {
      this.send(
        context,
        Mml.compose`\nThe board is bare — nothing posted right now.\n`,
      );
      return;
    }
    const lines = gigs.map((gig) => this.describeGig(gig, giverKey));
    this.send(
      context,
      Mml.compose`\nPosted work:\n${lines.join("\n")}\n`,
    );
  }

  /**
   * Parse the condition PHRASE into an engine-verifiable condition.
   *
   * ```
   * deliver <thing> to <place>        → { delivery, item, destination }
   * supply <n> <kind> to <place>      → { supply, item, destination, count }
   * ```
   *
   * ⭐⭐ The condition is a phrase rather than a flag or a subcommand
   * because it is **what the work IS**, while `post`/`claim`/`complete`/
   * `abandon` are what you are DOING about it — two axes, two slots. A
   * third template adds a form here and changes nothing else.
   *
   * ⚠ This is also what retired `--kind`. One grammar was doing two
   * jobs, so a flag had to say which; now `supply 10 gin` is obviously a
   * kind and `deliver <that crate>` is obviously an instance, and the
   * flag has nothing left to disambiguate.
   */
  private parseCondition(
    raw: string,
    context: CommandContext,
  ):
    | {
        template: "delivery" | "supply";
        itemRef: ConditionData["item"];
        destinationPath: string;
        count: number;
      }
    | { error: string; reason: string } {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    const verb = (words.shift() ?? "").toLowerCase();
    if (verb !== "deliver" && verb !== "supply") {
      return {
        error:
          `Post what? Say what has to be true — ` +
          `\`deliver <thing> to <place>\` or ` +
          `\`supply <n> <kind> to <place>\`.`,
        reason: "no-condition",
      };
    }
    // The destination is everything after `to`; the subject is what is
    // left in front of it.
    const at = words.findIndex((w) => w.toLowerCase() === "to");
    if (at < 0 || at === 0 || at === words.length - 1) {
      return {
        error: `Deliver it WHERE? Name a place after \`to\`.`,
        reason: "no-destination",
      };
    }
    const subject = words.slice(0, at);
    const destinationPath = this.place(words.slice(at + 1).join(" "), context);
    if (destinationPath.length === 0) {
      return {
        error: `Nobody here has heard of that place.`,
        reason: "unknown-destination",
      };
    }

    if (verb === "supply") {
      const count = Number(subject.shift());
      if (!Number.isInteger(count) || count < 1) {
        return {
          error: `Supply how many? \`supply 10 iron-ore to <place>\`.`,
          reason: "no-count",
        };
      }
      const kind = this.kindOf(subject.join(" "), context);
      if (kind.length === 0) {
        return { error: `There is no such thing.`, reason: "no-item" };
      }
      return {
        template: "supply",
        itemRef: { kind: "template", path: kind },
        destinationPath,
        count,
      };
    }

    // `deliver` — point at it. A MARKED thing means THAT one; anything
    // else means its kind.
    const rawItem = subject.join(" ");
    const item =
      MqlApi.resolveMany(rawItem, {
        commandGiver: context.commandGiver,
        scope: "reachable",
      }).stuff[0] ?? null;
    if (!item) {
      const kind = this.kindOf(rawItem, context);
      if (kind.length === 0) {
        return {
          error: `There's no '${rawItem}' here to post about.`,
          reason: "no-item",
        };
      }
      return {
        template: "delivery",
        itemRef: { kind: "template", path: kind },
        destinationPath,
        count: 1,
      };
    }
    const chattelId = MixinApi.isChattel(item) ? item.getChattelId() : "";
    return {
      template: "delivery",
      itemRef: chattelId
        ? { kind: "chattel", chattelId }
        : { kind: "template", path: item.getTemplatePath() ?? "" },
      destinationPath,
      count: 1,
    };
  }

  /**
   * A KIND, as a durable path: something reachable resolves to its
   * template, and anything else is read as a path. ⚠ `ContractApi.post`
   * re-validates that the kind is really something — a gig for a kind
   * that is nothing would hold its escrow forever.
   */
  private kindOf(raw: string, context: CommandContext): string {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return "";
    const hit = MqlApi.resolveMany(trimmed, {
      commandGiver: context.commandGiver,
      scope: "reachable",
    }).stuff[0];
    const path = hit?.getTemplatePath() ?? "";
    if (path.length > 0) return path;
    return trimmed.startsWith("/") ? trimmed : "";
  }

  /**
   * A place the player named, as a durable path — ⭐ the ONE ladder, on
   * `AddressApi`. It used to be a private copy here that knew only
   * `here`, reachable and a path; `ship` grew a second, different copy,
   * and the two drifted until one of them could not name a remote
   * destination at all.
   */
  private place(raw: string, context: CommandContext): string {
    return AddressApi.resolvePlace(
      raw,
      context.commandGiver,
      context.location?.getTemplatePath() ?? "",
    );
  }

  private describeGig(gig: ContractRecord, giverKey: string): string {
    const short = gig.contractId.slice(0, SHORT_ID_LEN);
    const condition = gig.clause?.condition;
    const what =
      condition?.item.kind === "chattel"
        ? `a marked item (${condition.item.chattelId.slice(0, 6)}…)`
        : leafOf(condition?.item.kind === "template" ? condition.item.path : "");
    const where = leafOf(condition?.destinationPath ?? "");
    const mode =
      gig.claimMode === "open-bounty"
        ? "open bounty — reward held in escrow"
        : gig.claimant
          ? gig.claimant === giverKey
            ? "claimed by you — reward held in escrow"
            : "claimed"
          : "exclusive, unclaimed";
    const expiry =
      gig.postingExpiresAt > 0 ? `, lapses at ${gig.postingExpiresAt}` : "";
    return `  [${short}] deliver ${what} to ${where} — ${gig.rewardMinor} credits (${mode}${expiry})`;
  }

  /* ──────────────────────────── post ──────────────────────────── */

  private async executePost(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const parsed = this.parseCondition(model.condition ?? "", context);
    if ("error" in parsed) {
      return this.fail(context, parsed.error, parsed.reason);
    }
    const { itemRef, destinationPath, template, count } = parsed;
    const reward = Number(model.reward);

    // Where the work STARTS. Omitted ⇒ ContractApi derives it from the
    // poster's own environment, which is right for an NPC posting from
    // its floor and for a player posting at the board they stand at.
    const fromRaw = (model.from ?? "").trim();

    const result = await ContractApi.post({
      boardPath: board.getTemplatePath() ?? "",
      condition: {
        template,
        item: itemRef,
        destinationPath,
        // ⚠ Always on a supply, even at 1: `validate` requires it, and
        // omitting it "because 1 is the default" made `supply 1` — the
        // one-of-a-kind case that replaced `--kind` — refuse itself.
        ...(template === "supply" ? { count } : {}),
      },
      rewardMinor: reward,
      claimMode: model.bounty ? "open-bounty" : "exclusive",
      asBusiness: model.business === true,
      ...(fromRaw ? { originPath: this.place(fromRaw, context) } : {}),
      ...(model.expires ? { expiresGameHours: Number(model.expires) } : {}),
    });
    if (!result.ok) {
      return this.fail(context, `The posting is refused: ${result.reason}.`, "contract-refused");
    }
    const short = result.contractId.slice(0, SHORT_ID_LEN);
    const escrowNote = model.bounty
      ? " The reward is already held in escrow."
      : " The reward locks into escrow when it's claimed.";
    this.send(
      context,
      Mml.compose`\nYou pin the job to the board — [${short}], ${reward} credits on completion.${escrowNote}\n`,
    );
  }

  /* ──────────────── claim / complete / abandon ─────────────────── */

  /** Resolve a gig id (or unique prefix) against this board's live gigs;
   * a bare id falls back to the giver's single active claim here. */
  private async resolveGigId(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
    verb: string,
  ): Promise<string | null> {
    const gigs = await ContractApi.openGigsOn(board.getTemplatePath() ?? "");
    const raw = (model.id ?? "").trim();
    if (raw) {
      const matches = gigs.filter((g) => g.contractId.startsWith(raw));
      if (matches.length === 1) return matches[0]?.contractId ?? null;
      if (matches.length > 1) {
        this.fail(context, `'${raw}' matches several gigs — more letters.`, "ambiguous-id");
        return null;
      }
      // Not on this board's live list — let the Api speak to it (a
      // settled/expired id gets its real refusal, not "no such").
      return raw;
    }
    const giverKey = context.commandGiver.getIdentityPath() ?? "";
    const mine = gigs.filter((g) => g.claimant === giverKey);
    if (mine.length === 1) return mine[0]?.contractId ?? null;
    this.fail(
      context,
      mine.length === 0
        ? `You hold no claim here — name the gig to ${verb}.`
        : `You hold several claims here — name the gig to ${verb}.`,
      mine.length === 0 ? "no-claim" : "ambiguous-claim",
    );
    return null;
  }

  private async executeClaim(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const id = await this.resolveGigId(model, context, board, "claim");
    if (!id) return;
    const result = await ContractApi.claim(id);
    if (!result.ok) {
      return this.fail(context, `You can't claim that: ${result.reason}.`, "contract-refused");
    }
    this.send(
      context,
      Mml.compose`\nThe gig is yours — the reward is locked in escrow. Deliver, then \`fulfill\` at the drop or \`job complete\` here.\n`,
    );
  }

  private async executeComplete(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const id = await this.resolveGigId(model, context, board, "complete");
    if (!id) return;
    const result = await ContractApi.complete(id);
    if (!result.ok) {
      return this.fail(
        context,
        `Nothing pays out: ${result.reason}.`,
        "contract-refused",
      );
    }
    // The payoff Scene — the world noticing the work.
    const giver = context.commandGiver;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The board verifies the work and pays out — ${result.paidMinor} credits, released from escrow to your account.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} turns a job in at the board and gets paid.`,
      )
      .send();
  }

  private async executeAbandon(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const id = await this.resolveGigId(model, context, board, "abandon");
    if (!id) return;
    const result = await ContractApi.abandon(id);
    if (!result.ok) {
      return this.fail(context, `You can't abandon that: ${result.reason}.`, "contract-refused");
    }
    this.send(
      context,
      Mml.compose`\nYou strike your name off the gig. The escrow reverts — and the issuer will remember.\n`,
    );
  }

  /* ─────────────────────────── helpers ────────────────────────── */

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, message: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: message });
  }
}

/** The last path segment, for prose ("/world/lounge/location/bar" → "bar"). */
function leafOf(path: string): string {
  const leaf = path.split("/").filter(Boolean).pop();
  return leaf ?? "somewhere";
}
