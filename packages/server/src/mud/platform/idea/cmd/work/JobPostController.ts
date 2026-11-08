/**
 * JobPostController — `job post <what has to be true> for <reward>` [--bounty] [--business] [--from] [--expires]: post a gig, reward escrowed. The condition phrase is parsed here against the closed template vocabulary.
 */

import type { CommandContext } from "../../../../api/command";
import { MixinApi } from "../../../../api/mixin";
import { MqlApi, type MqlOneResult } from "../../../../api/mql";
import { Mml } from "../../../../api/mml";
import { ContractApi } from "../../../../api/contract";
import type { ConditionData } from "../../../../lib/employment/Condition";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { SHORT_ID_LEN } from "./JobControllerBase";
import { JobControllerBase, type JobModel } from "./JobControllerBase";

/**
 * The unit words a `supply` phrase accepts, mapped to the par
 * vocabulary. ⚠ Prose spellings on purpose — somebody ordering stock
 * says "litres", not "L".
 */
const UNIT_WORDS: Record<string, "L" | "kg" | "count"> = {
  l: "L",
  litre: "L",
  litres: "L",
  liter: "L",
  liters: "L",
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  // ⭐ A COUNTED category (sugar W6): `supply 4 pieces of liming` — whole
  // things, any row that carries the tag, stacks included. The engine
  // always held this (a category condition in `count`); the phrase did
  // not, so a fungible good could not be ordered at all.
  piece: "count",
  pieces: "count",
};

export default class JobPostController extends JobControllerBase {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = this.boardOf(model.board, context);
    if (!board) return;
    const parsed = this.parseCondition(model.condition ?? "", context);
    if ("error" in parsed) {
      return this.fail(context, parsed.error, parsed.reason);
    }
    const { itemRef, destinationPath, template, count } = parsed;
    const gameHours = parsed.gameHours;
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
        ...(template === "watch" ? { gameHours } : {}),
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
        template: "delivery" | "supply" | "watch" | "clean";
        itemRef: ConditionData["item"];
        destinationPath: string;
        count: number;
        gameHours?: number;
      }
    | { error: string; reason: string } {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    let verb = (words.shift() ?? "").toLowerCase();
    // ⭐ `recover <body> to <place>` is a delivery of ONE thing by who or
    // what it is — a drowned body has no chattel row (underwater D17).
    const recovering = verb === "recover";
    if (recovering) verb = "deliver";
    if (
      verb !== "deliver" &&
      verb !== "supply" &&
      verb !== "watch" &&
      verb !== "clean"
    ) {
      return {
        error:
          `Post what? Say what has to be true — ` +
          `\`deliver <thing> to <place>\`, ` +
          `\`supply <n> <kind> to <place>\`, ` +
          `\`watch <place> for <n> hours\`, ` +
          `\`clean <place>\` / \`clean <thing> at <place>\` ` +
          `or \`recover <body> to <place>\`.`,
        reason: "no-condition",
      };
    }

    /*
     * ⭐⭐ `watch <place> for <n> hours` — the guard contract, and the
     * third clause template.
     *
     * ⚠ What makes it postable is **giving up on intent**. The engine
     * cannot check that you protected anything; it can check that you
     * were present, for the term, with your hands full of nothing else.
     * That is the whole of the third template, and it is why the
     * canonical example of what sits BEHIND the verifiability wall — a
     * guard contract — turned out to need four kernel touches rather
     * than being impossible.
     */
    if (verb === "watch") {
      const forAt = words.findIndex((w) => w.toLowerCase() === "for");
      if (forAt < 1 || forAt >= words.length - 1) {
        return {
          error:
            `Watch it for how long? \`watch <place> for <n> hours\`.`,
          reason: "no-term",
        };
      }
      const placePath = this.place(
        words.slice(0, forAt).join(" "),
        context,
      );
      if (placePath.length === 0) {
        return {
          error: `Nobody here has heard of that place.`,
          reason: "unknown-destination",
        };
      }
      const hours = Number(words[forAt + 1]);
      if (!Number.isFinite(hours) || hours <= 0) {
        return {
          error: `Watch it for how many hours?`,
          reason: "no-term",
        };
      }
      return {
        template: "watch",
        // ⚠ A watch binds no item and the shape requires one, so it
        // names the PLACE — inert for this template, and honest: what is
        // bound is where you stand.
        itemRef: { kind: "template", path: placePath },
        destinationPath: placePath,
        count: 1,
        gameHours: hours,
      };
    }
    if (verb === "clean") return this.parseClean(words, context);
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
      if (!Number.isFinite(count) || count <= 0) {
        return {
          error:
            `Supply how much? \`supply 10 iron-ore to <place>\`, or ` +
            `\`supply 6 litres of gin to <place>\`.`,
          reason: "no-count",
        };
      }

      /*
       * ⭐⭐ `supply <n> <unit> of <category>` — what the BUSINESS wants,
       * rather than the packaging somebody imagined it in. Six litres of
       * gin is six litres whether it arrives in one demijohn or eight
       * bottles, and a player who solves it their own way has still
       * done the job.
       */
      const unit = UNIT_WORDS[(subject[0] ?? "").toLowerCase()];
      if (unit && (subject[1] ?? "").toLowerCase() === "of") {
        const category = subject.slice(2).join(" ").trim();
        if (category.length === 0) {
          return { error: `Supply how much of WHAT?`, reason: "no-item" };
        }
        return {
          template: "supply",
          itemRef: { kind: "category", category, unit },
          destinationPath,
          count,
        };
      }
      if (!Number.isInteger(count)) {
        return {
          error: `You cannot order half a thing — say a unit, as in ` +
            `\`supply 6 litres of gin\`.`,
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
    // A body named by its identity path (a posting brain names it so).
    if (recovering && rawItem.startsWith("/")) {
      return {
        template: "delivery",
        itemRef: { kind: "identity", identityPath: rawItem },
        destinationPath,
        count: 1,
      };
    }
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
    // ⭐ No chattel, but its own identity (a body): THAT one, by identity.
    const identity = item.getIdentityPath() ?? "";
    const ownIdentity = identity !== "" && identity !== (item.getTemplatePath() ?? "");
    return {
      template: "delivery",
      itemRef: chattelId
        ? { kind: "chattel", chattelId }
        : ownIdentity
          ? { kind: "identity", identityPath: identity }
          : { kind: "template", path: item.getTemplatePath() ?? "" },
      destinationPath,
      count: 1,
    };
  }

  /**
   * ⭐ `clean <place>` · `clean <thing> [at <place>]` — the cleaning gig
   * (cleanliness D30). A place means its floor; a thing (a hearth, a
   * marked shirt) means that thing, found at the place when the work is
   * turned in. The engine checks the subject is clean NOW, not that
   * anybody took care.
   */
  private parseClean(
    words: string[],
    context: CommandContext,
  ):
    | {
        template: "clean";
        itemRef: ConditionData["item"];
        destinationPath: string;
        count: number;
      }
    | { error: string; reason: string } {
    const at = words.findIndex((w) => w.toLowerCase() === "at");
    const subjectRaw = (at < 0 ? words : words.slice(0, at)).join(" ").trim();
    const placeRaw = at < 0 ? "" : words.slice(at + 1).join(" ").trim();
    if (subjectRaw.length === 0) {
      return {
        error: `Clean what? \`clean <place>\` or \`clean <thing> at <place>\`.`,
        reason: "no-item",
      };
    }
    if (at < 0) {
      // A place by itself — or a thing here, when it names one.
      const thing =
        MqlApi.resolveMany(subjectRaw, {
          commandGiver: context.commandGiver,
          scope: "reachable",
        }).stuff[0] ?? null;
      if (thing === null || MixinApi.isFloor(thing)) {
        const placePath =
          thing !== null
            ? context.location?.getTemplatePath() ?? ""
            : this.place(subjectRaw, context);
        if (placePath.length === 0) {
          return {
            error: `Nobody here has heard of that place.`,
            reason: "unknown-destination",
          };
        }
        return {
          template: "clean",
          itemRef: { kind: "template", path: placePath },
          destinationPath: placePath,
          count: 1,
        };
      }
      return this.cleanThing(thing, context.location?.getTemplatePath() ?? "");
    }
    const placePath = this.place(placeRaw, context);
    if (placePath.length === 0) {
      return {
        error: `Nobody here has heard of that place.`,
        reason: "unknown-destination",
      };
    }
    const thing =
      MqlApi.resolveMany(subjectRaw, {
        commandGiver: context.commandGiver,
        scope: "reachable",
      }).stuff[0] ?? null;
    if (thing === null) {
      const kind = this.kindOf(subjectRaw, context);
      if (kind.length === 0) {
        return { error: `There is no such thing.`, reason: "no-item" };
      }
      return {
        template: "clean",
        itemRef: { kind: "template", path: kind },
        destinationPath: placePath,
        count: 1,
      };
    }
    return this.cleanThing(thing, placePath);
  }

  /** A pointed-at thing to clean: THAT one if it is marked, else its kind. */
  private cleanThing(
    thing: Stuff,
    placePath: string,
  ):
    | {
        template: "clean";
        itemRef: ConditionData["item"];
        destinationPath: string;
        count: number;
      }
    | { error: string; reason: string } {
    if (placePath.length === 0) {
      return { error: `Clean it where?`, reason: "unknown-destination" };
    }
    const chattelId = MixinApi.isChattel(thing) ? thing.getChattelId() : "";
    return {
      template: "clean",
      itemRef: chattelId
        ? { kind: "chattel", chattelId }
        : { kind: "template", path: thing.getTemplatePath() ?? "" },
      destinationPath: placePath,
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
}
