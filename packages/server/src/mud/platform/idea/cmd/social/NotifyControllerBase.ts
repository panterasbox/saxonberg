/**
 * NotifyControllerBase — what every `notify` controller shares
 * (controller-liquidity W7b: one controller per subcommand over a base per
 * noun). The player surface for the attention-rule store (the social-graph
 * notify policy), a thin caller over the host's `NotifyPolicy`:
 *
 *   - bare `notify` — {@link NotifyListController}, the effective list;
 *   - `notify show <ref>` — {@link NotifyShowController};
 *   - `notify set <ref> --login show …` — {@link NotifySetController}, the
 *     field patch from typed options (each value validated) and the
 *     50-rule soft cap (storage stays dumb — the cap lives at set-time, the
 *     Contacts precedent);
 *   - `notify move <ref> --above|--below <other>` — {@link
 *     NotifyMoveController}, order = precedence;
 *   - `notify remove <ref>` — {@link NotifyRemoveController}.
 *
 * The typed `<ref>` is normalized here (bare contacts labels →
 * `contacts:<me>:<label>`). The store + first-match resolution live in
 * `SocialLogic` (behind `SocialApi`).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { PlayerApi } from "../../../../api/player";
import { ShellApi } from "../../../../api/shell";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { ClientState } from "../../../../lib/connection/ClientState";
import type { NotifyPolicy } from "../../../../lib/social/NotifyPolicy";
import type {
  SocialRuleProjection,
  SocialRulesState,
} from "@saxonberg/types";
import {
  RESERVED,
  NAME_RENDERINGS,
  CONNECT_SURFACES,
  MESSAGE_SURFACES,
  PALETTE_TOKENS,
  PRESENCE_FORMAT_DEFAULT,
  type NotifyRule,
} from "../../../../lib/social/NotifyRule";

/** The maximum number of user-defined rules (soft cap, slate open-Q 8). */
export const MAX_RULES = 50;

export interface NotifyModel extends CommandModel {
  ref?: string;
  login?: string;
  disconnect?: string;
  message?: string;
  render?: string;
  color?: string;
  boost?: boolean;
  noBoost?: boolean;
  above?: string;
  below?: string;
}

export type NotifyHost = Stuff & NotifyPolicy;

export abstract class NotifyControllerBase extends CommandController<NotifyModel> {
  /**
   * The giver's policy and player id, or `null` after refusing — a giver
   * with no notification policy has no rules to manage.
   */
  protected hostOf(context: CommandContext): { host: NotifyHost; vid: string } | null {
    const giver = context.commandGiver;
    if (!MixinApi.isNotifyPolicy(giver)) {
      this.fail(context, "You have no notification policy.", "mixin-missing");
      return null;
    }
    const vid = PlayerApi.isAvatarStuff(giver) ? giver.getPlayerId() : "";
    return { host: giver, vid };
  }

  /**
   * Push the viewer's effective ordered rule list as the `social.rules`
   * client-state projection (the Phase-4 settings-card feed). A pure
   * server→client push — `social.rules` is NOT a persisted client-state
   * key; the rule store stays the single source of truth, and the card
   * reads this as a read-only cache (writes go back through `notify`).
   * Skipped silently when the giver is an NPC with a policy but no
   * connected Interactive (the store mutation still stands).
   */
  protected pushProjection(host: NotifyHost): void {
    if (!MixinApi.isClientState(host)) return;
    const state: SocialRulesState = {
      rules: NotifyControllerBase.buildRulesProjection(host),
      presenceFormat:
        ShellApi.resolveSetting<string>(host as Stuff, "social.presenceFormat") ||
        PRESENCE_FORMAT_DEFAULT,
    };
    (host as NotifyHost & ClientState).pushClientStateUpdate(
      "social.rules",
      state,
    );
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: "controller-rejected", reason, detail });
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic("shell.result")
      .toSelf(body)
      .send();
  }

  /**
   * Normalize a typed `<ref>` to a canonical `GroupRef`:
   *   - the bare pseudo-subjects `everyone-else` / `strangers` stay bare,
   *   - anything already containing a `:` is a full ref (`managed:…`,
   *     `mql:…`, `contacts:…`) and passes through,
   *   - any other bare word (including `friends` / `foes`) is a contacts
   *     label → `contacts:<me>:<word>`.
   * MUST match `SocialLogic.canonicalReservedRef` so a materialized reserved
   * rule dedups its virtual baseline twin.
   */
  protected static normalizeRef(vid: string, raw: string): string {
    const trimmed = raw.trim();
    if (trimmed === RESERVED.everyoneElse || trimmed === RESERVED.strangers) {
      return trimmed;
    }
    if (trimmed.includes(":")) return trimmed;
    return `contacts:${vid}:${trimmed}`;
  }

  /**
   * Whether any field-setting option was provided (so `notify <ref>` with
   * one or more `--login/--disconnect/--message/--render/--boost/--no-boost/
   * --color` is a SET, and a bare `notify <ref>` with none is a SHOW).
   */
  protected static hasFieldOption(model: NotifyModel): boolean {
    return (
      model.login !== undefined ||
      model.disconnect !== undefined ||
      model.message !== undefined ||
      model.render !== undefined ||
      model.color !== undefined ||
      model.boost === true ||
      model.noBoost === true
    );
  }

  /**
   * Build a partial rule from the typed field options, or return an error
   * string on a bad value (the friendly rejection mirrors how other
   * controllers validate option values). Recognized options:
   * `--login`/`--disconnect`/`--message`/`--render`/`--color` (string,
   * checked against their vocabulary) + `--boost`/`--no-boost` (flags).
   */
  protected static buildPatch(model: NotifyModel): Partial<NotifyRule> | string {
    const patch: Partial<NotifyRule> = {};
    if (model.login !== undefined) {
      if (!CONNECT_SURFACES.includes(model.login as never)) {
        return `--login must be one of ${CONNECT_SURFACES.join(" / ")}.`;
      }
      patch.onConnect = model.login as NotifyRule["onConnect"];
    }
    if (model.disconnect !== undefined) {
      if (!CONNECT_SURFACES.includes(model.disconnect as never)) {
        return `--disconnect must be one of ${CONNECT_SURFACES.join(" / ")}.`;
      }
      patch.onDisconnect = model.disconnect as NotifyRule["onDisconnect"];
    }
    if (model.message !== undefined) {
      if (!MESSAGE_SURFACES.includes(model.message as never)) {
        return `--message must be one of ${MESSAGE_SURFACES.join(" / ")}.`;
      }
      patch.onMessage = model.message as NotifyRule["onMessage"];
    }
    if (model.render !== undefined) {
      if (!NAME_RENDERINGS.includes(model.render as never)) {
        return `--render must be one of ${NAME_RENDERINGS.join(" / ")}.`;
      }
      patch.nameRendering = model.render as NotifyRule["nameRendering"];
    }
    if (model.color !== undefined) {
      if (!PALETTE_TOKENS.includes(model.color as never)) {
        return `--color must be one of ${PALETTE_TOKENS.join(" / ")}.`;
      }
      patch.color = model.color as NotifyRule["color"];
    }
    // `--boost` / `--no-boost` flags. If both are somehow given, the
    // affirmative `--boost` wins (applied last).
    if (model.noBoost === true) patch.boostInDense = false;
    if (model.boost === true) patch.boostInDense = true;
    return patch;
  }

  /**
   * Flatten the host's effective ordered rule list into the wire
   * projection the settings card reads. `reserved` is `true` for a virtual
   * baseline row not yet materialized into the stored list (so the card can
   * style it as an un-pinned default); `label` is the friendly display name.
   */
  protected static buildRulesProjection(host: NotifyHost): SocialRuleProjection[] {
    const stored = new Set(host.notifyRules().map((r) => r.groupRef));
    return host.effectiveNotifyRules().map((r) => ({
      groupRef: r.groupRef,
      label: NotifyControllerBase.labelFor(r.groupRef),
      nameRendering: r.nameRendering,
      boostInDense: r.boostInDense,
      onConnect: r.onConnect,
      onDisconnect: r.onDisconnect,
      onMessage: r.onMessage,
      color: r.color,
      reserved: !stored.has(r.groupRef),
    }));
  }

  /**
   * The friendly display label for a `GroupRef`: a contacts ref shows its
   * bare label (`contacts:<pid>:friends` → `friends`); everything else
   * (managed / MQL / the bare pseudo-subjects) shows the ref verbatim. The
   * card addresses commands by `groupRef`, never the label.
   */
  protected static labelFor(ref: string): string {
    if (ref.startsWith("contacts:")) {
      const parts = ref.split(":");
      if (parts.length >= 3) return parts.slice(2).join(":");
    }
    return ref;
  }

  protected static renderRuleLine(r: NotifyRule): string {
    return (
      `${r.groupRef}  render=${r.nameRendering} boost=${r.boostInDense ? "on" : "off"} ` +
      `login=${r.onConnect} disconnect=${r.onDisconnect} message=${r.onMessage} ` +
      `color=${r.color}`
    );
  }
}
