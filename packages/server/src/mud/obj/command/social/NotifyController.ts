/**
 * NotifyController — player surface for the attention-rule store (the
 * social-graph notify policy). Thin caller over `SocialApi`: bare list /
 * `<ref>` show / `<ref> --login show …` set (typed options) /
 * `--above`/`--below` reorder / `--remove` (and the `remove` subcommand).
 *
 * The store + first-match resolution live in `SocialLogic` (behind
 * `SocialApi`); this controller only normalizes the typed `<ref>` (bare
 * contacts labels → `contacts:<me>:<label>`), builds the field patch from
 * the typed `--login/--disconnect/--message/--render/--boost/--no-boost/
 * --color` options (validating each value), and enforces the 50-rule soft
 * cap with a friendly rejection (storage stays dumb — the cap lives at
 * set-time, the Contacts precedent). The set-fields are OPTIONS, not
 * positional `k=v`, because the framework forbids an optional `<ref>`
 * positional followed by a greedy assignment positional.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import { PlayerApi } from "../../../api/player";
import { SocialApi } from "../../../api/social";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { HasInteractive } from "../../../lib/connection/HasInteractive";
import type { NotifyPolicy } from "../../../lib/social/NotifyPolicy";
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
  type NotifyRule,
} from "../../../lib/social/NotifyRule";

/** The maximum number of user-defined rules (soft cap, slate open-Q 8). */
const MAX_RULES = 50;

interface NotifyModel extends CommandModel {
  ref?: string;
  login?: string;
  disconnect?: string;
  message?: string;
  render?: string;
  color?: string;
  boost?: boolean;
  noBoost?: boolean;
  remove?: boolean;
  above?: string;
  below?: string;
}

type NotifyHost = Stuff & NotifyPolicy;

export default class NotifyController extends CommandController<NotifyModel> {
  async execute(model: NotifyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isNotifyPolicy(giver)) {
      return this.fail(
        context,
        "You have no notification policy.",
        "mixin-missing",
      );
    }
    const host: NotifyHost = giver;
    const vid = PlayerApi.isAvatarStuff(giver) ? giver.getPlayerId() : "";

    // `remove` subcommand: `notify remove <ref>`.
    if (model.subcommand === "remove") {
      return this.executeRemove(host, vid, model.ref ?? "", context);
    }

    const rawRef = (model.ref ?? "").trim();

    // Reorder: `notify <ref> --above/--below <other>`.
    if (model.above || model.below) {
      return this.executeReorder(host, vid, rawRef, model, context);
    }

    // `notify <ref> --remove` (the ref-first remove grammar).
    if (model.remove) {
      return this.executeRemove(host, vid, rawRef, context);
    }

    // Bare `notify` — list.
    if (!rawRef) return this.executeList(host, context);

    // `notify <ref> --login show …` — set (any field option provided).
    if (hasFieldOption(model)) {
      return this.executeSet(host, vid, rawRef, model, context);
    }

    // `notify <ref>` — show one rule.
    return this.executeShow(host, vid, rawRef, context);
  }

  private executeList(host: NotifyHost, context: CommandContext): void {
    const rules = SocialApi.listRules(host);
    if (rules.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo notify rules.\n`));
      return;
    }
    const lines = ["Your notify rules (top = highest precedence):"];
    for (const r of rules) lines.push(`  ${renderRuleLine(r)}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join("\n")}\n`));
    // A bare `notify` is how the settings pane requests a fresh
    // projection on mount — push the effective list back.
    this.pushProjection(host);
  }

  private executeShow(
    host: NotifyHost,
    vid: string,
    rawRef: string,
    context: CommandContext,
  ): void {
    const ref = normalizeRef(vid, rawRef);
    const rule = SocialApi.listRules(host).find((r) => r.groupRef === ref);
    if (!rule) {
      this.send(context, Mml.fromMarkup(`\nNo rule for ${ref}.\n`));
      return;
    }
    this.send(context, Mml.fromMarkup(`\n${renderRuleLine(rule)}\n`));
  }

  private executeSet(
    host: NotifyHost,
    vid: string,
    rawRef: string,
    model: NotifyModel,
    context: CommandContext,
  ): void {
    const ref = normalizeRef(vid, rawRef);
    const parsed = buildPatch(model);
    if (typeof parsed === "string") {
      return this.fail(context, parsed, "bad-option");
    }

    // Soft cap: only a genuinely NEW user-defined rule counts against it.
    const exists = host.notifyRules().some((r) => r.groupRef === ref);
    if (!exists && host.notifyRules().length >= MAX_RULES) {
      return this.fail(
        context,
        `You already have ${MAX_RULES} notify rules — remove one before ` +
          `adding another.`,
        "rule-cap",
      );
    }

    const result = SocialApi.setRule(host, ref, parsed);
    const verb = result.created ? "Set" : "Updated";
    this.send(
      context,
      Mml.fromMarkup(`\n${verb} rule for ${ref}.\n  ${renderRuleLine(result.rule)}\n`),
    );
    this.pushProjection(host);
  }

  private executeReorder(
    host: NotifyHost,
    vid: string,
    rawRef: string,
    model: NotifyModel,
    context: CommandContext,
  ): void {
    if (!rawRef) {
      return this.fail(context, "Which rule to reorder?", "ref-required");
    }
    const where: "above" | "below" = model.above ? "above" : "below";
    const anchorRaw = (model.above ?? model.below ?? "").trim();
    if (!anchorRaw) {
      return this.fail(context, "Reorder relative to which rule?", "anchor-required");
    }
    const ref = normalizeRef(vid, rawRef);
    const anchor = normalizeRef(vid, anchorRaw);
    if (ref === anchor) {
      return this.fail(context, "A rule can't be reordered against itself.", "self-anchor");
    }
    const ok = SocialApi.reorderRule(host, ref, anchor, where);
    if (!ok) {
      return this.fail(context, `Couldn't reorder ${ref}.`, "reorder-failed");
    }
    this.send(context, Mml.fromMarkup(`\nMoved ${ref} ${where} ${anchor}.\n`));
    this.pushProjection(host);
  }

  private executeRemove(
    host: NotifyHost,
    vid: string,
    rawRef: string,
    context: CommandContext,
  ): void {
    const trimmed = rawRef.trim();
    if (!trimmed) return this.fail(context, "Remove which rule?", "ref-required");
    const ref = normalizeRef(vid, trimmed);
    const removed = SocialApi.removeRule(host, ref);
    if (!removed) {
      this.send(context, Mml.fromMarkup(`\nNo rule for ${ref}.\n`));
      return;
    }
    this.send(
      context,
      Mml.fromMarkup(`\nRemoved rule for ${ref}; it falls back to the default.\n`),
    );
    this.pushProjection(host);
  }

  /**
   * Push the viewer's effective ordered rule list as the `social.rules`
   * client-state projection (the Phase-4 settings-pane feed). A pure
   * server→client push — `social.rules` is NOT a persisted client-state
   * key; the rule store stays the single source of truth, and the pane
   * reads this as a read-only cache (writes go back through `notify`).
   * Skipped silently when the giver is an NPC with a policy but no
   * connected Interactive (the store mutation still stands).
   */
  private pushProjection(host: NotifyHost): void {
    if (!MixinApi.isHasInteractive(host)) return;
    const state: SocialRulesState = { rules: buildRulesProjection(host) };
    (host as NotifyHost & HasInteractive).pushClientStateUpdate(
      "social.rules",
      state,
    );
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: "controller-rejected", reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic("system.shell.notify")
      .toSelf(body)
      .send();
  }
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
function normalizeRef(vid: string, raw: string): string {
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
function hasFieldOption(model: NotifyModel): boolean {
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
function buildPatch(model: NotifyModel): Partial<NotifyRule> | string {
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
 * projection the settings pane reads. `reserved` is `true` for a virtual
 * baseline row not yet materialized into the stored list (so the pane can
 * style it as an un-pinned default); `label` is the friendly display name.
 */
function buildRulesProjection(host: NotifyHost): SocialRuleProjection[] {
  const stored = new Set(host.notifyRules().map((r) => r.groupRef));
  return SocialApi.listRules(host).map((r) => ({
    groupRef: r.groupRef,
    label: labelFor(r.groupRef),
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
 * pane addresses commands by `groupRef`, never the label.
 */
function labelFor(ref: string): string {
  if (ref.startsWith("contacts:")) {
    const parts = ref.split(":");
    if (parts.length >= 3) return parts.slice(2).join(":");
  }
  return ref;
}

function renderRuleLine(r: NotifyRule): string {
  return (
    `${r.groupRef}  render=${r.nameRendering} boost=${r.boostInDense ? "on" : "off"} ` +
    `login=${r.onConnect} disconnect=${r.onDisconnect} message=${r.onMessage} ` +
    `color=${r.color}`
  );
}
