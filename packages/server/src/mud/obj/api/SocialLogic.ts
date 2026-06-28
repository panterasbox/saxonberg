// SocialLogic — the hot-reloadable logic singleton behind SocialApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import { MixinApi } from "../../api/mixin";
import { GroupApi } from "../../api/group";
import { RecognitionApi } from "../../api/recognition";
import { PlayerApi } from "../../api/player";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import type { GroupRef } from "../../lib/social/GroupProvider";
import type { NotifyPolicy } from "../../lib/social/NotifyPolicy";
import {
  RESERVED,
  type NotifyRule,
  type ResolvedRule,
  type RuleForOptions,
  type SetResult,
  type ReservedId,
  type PaletteToken,
} from "../../lib/social/NotifyRule";

const SocialApiCallers = SecurityPolicies.FromModule("mud/api/social#SocialApi");

/**
 * Code-side baseline fallback — used only when AppSettings isn't warmed
 * (pre-boot / unit fixtures). The live defaults are seeded from
 * `social.baselineRules` in `mud/config/app-settings.yaml` (the renown
 * `receptionWindowS` precedent: try AppSettings, fall back to a sane
 * literal so a pre-warm read is still safe).
 */
const BASELINE_FALLBACK: Record<ReservedId, Omit<NotifyRule, "groupRef">> = {
  [RESERVED.foes]: {
    nameRendering: "feature-string",
    boostInDense: false,
    onConnect: "silent",
    onDisconnect: "silent",
    onMessage: "silent",
    color: "rose",
  },
  [RESERVED.friends]: {
    nameRendering: "name",
    boostInDense: true,
    onConnect: "banner",
    onDisconnect: "banner",
    onMessage: "full",
    color: "amber",
  },
  [RESERVED.everyoneElse]: {
    nameRendering: "name",
    boostInDense: false,
    onConnect: "silent",
    onDisconnect: "silent",
    onMessage: "silent",
    color: "neutral",
  },
  [RESERVED.strangers]: {
    nameRendering: "feature-string",
    boostInDense: false,
    onConnect: "silent",
    onDisconnect: "silent",
    onMessage: "silent",
    color: "slate",
  },
};

const DEFAULT_COLOR_FALLBACK: PaletteToken = "neutral";

/** The viewer's durable player id, or '' for a non-Avatar viewer. */
function viewerPlayerId(viewer: Stuff): string {
  return PlayerApi.isAvatarStuff(viewer) ? viewer.getPlayerId() : "";
}

/**
 * The durable identity key for a person used in membership tests:
 * `playerId` for an Avatar, else the runtime `templatePath` (NPCs). Null
 * when neither resolves — such a person can't match a group ref.
 */
function durablePersonId(person: Stuff): string | null {
  if (PlayerApi.isAvatarStuff(person)) return person.getPlayerId();
  return person.getTemplatePath() ?? null;
}

/**
 * The canonical groupRef a reserved label resolves to. `foes` / `friends`
 * are contacts labels (`contacts:<viewer>:<id>`); `everyone-else` /
 * `strangers` are bare pseudo-subjects. This MUST match the verb-side
 * `normalizeRef` so a materialized reserved rule dedups its virtual twin.
 */
function canonicalReservedRef(viewer: Stuff, id: ReservedId): GroupRef {
  if (id === RESERVED.everyoneElse || id === RESERVED.strangers) return id;
  return `contacts:${viewerPlayerId(viewer)}:${id}`;
}

/** Load the baseline field defaults for a reserved id (AppSettings → fallback). */
function baselineFields(id: ReservedId): Omit<NotifyRule, "groupRef"> {
  try {
    const raw = AppApi.setting(AppSettingKeys.socialBaselineRules);
    if (raw) {
      const map = JSON.parse(raw) as Record<
        string,
        Partial<Omit<NotifyRule, "groupRef">>
      >;
      const entry = map[id];
      if (entry) return { ...BASELINE_FALLBACK[id], ...entry };
    }
  } catch {
    /* AppSettings not warmed (pre-boot / tests) — use the literal */
  }
  return BASELINE_FALLBACK[id];
}

/** The neutral color a fresh custom rule inherits (AppSettings → fallback). */
function defaultColor(): PaletteToken {
  try {
    const raw = AppApi.setting(AppSettingKeys.socialDefaultColor);
    if (raw) return raw as PaletteToken;
  } catch {
    /* not warmed */
  }
  return DEFAULT_COLOR_FALLBACK;
}

/** Build the virtual baseline rule for a reserved id. */
function baselineRule(viewer: Stuff, id: ReservedId): NotifyRule {
  return { groupRef: canonicalReservedRef(viewer, id), ...baselineFields(id) };
}

/** A fresh, neutral custom rule for a never-seen ref. */
function defaultCustomRule(ref: GroupRef): NotifyRule {
  return {
    groupRef: ref,
    nameRendering: "name",
    boostInDense: false,
    onConnect: "silent",
    onDisconnect: "silent",
    onMessage: "silent",
    color: defaultColor(),
  };
}

/**
 * The reserved id a stored ref materializes (so `setRule`/reorder can seed
 * the right baseline defaults for it), or null for a true custom ref.
 */
function reservedIdOf(viewer: Stuff, ref: GroupRef): ReservedId | null {
  for (const id of [
    RESERVED.foes,
    RESERVED.friends,
    RESERVED.everyoneElse,
    RESERVED.strangers,
  ] as ReservedId[]) {
    if (canonicalReservedRef(viewer, id) === ref) return id;
  }
  return null;
}

/** Default rule for any ref — reserved baseline when recognized, else neutral. */
function defaultRuleFor(viewer: Stuff, ref: GroupRef): NotifyRule {
  const id = reservedIdOf(viewer, ref);
  return id ? baselineRule(viewer, id) : defaultCustomRule(ref);
}

interface ListEntry {
  rule: NotifyRule;
  reserved: boolean;
}

/**
 * The effective ordered rule list: the virtual `foes`/`friends` baseline
 * (when not materialized) → the player's stored rules in order → the
 * virtual `strangers`/`everyone-else` tail. A reserved label only
 * materializes a stored row once edited; otherwise it resolves at its
 * baseline position with baseline defaults. `strangers` precedes the
 * always-true `everyone-else` catch-all so an unrecognized person resolves
 * to `strangers` and a recognized one falls to `everyone-else`.
 */
function effectiveRuleList(viewer: Stuff): ListEntry[] {
  const stored: readonly NotifyRule[] = MixinApi.isNotifyPolicy(viewer)
    ? viewer.notifyRules()
    : [];
  const storedRefs = new Set(stored.map((r) => r.groupRef));

  const head: ListEntry[] = [];
  for (const id of [RESERVED.foes, RESERVED.friends] as ReservedId[]) {
    if (!storedRefs.has(canonicalReservedRef(viewer, id))) {
      head.push({ rule: baselineRule(viewer, id), reserved: true });
    }
  }

  const mid: ListEntry[] = stored.map((r) => ({ rule: r, reserved: false }));

  const tail: ListEntry[] = [];
  for (const id of [RESERVED.strangers, RESERVED.everyoneElse] as ReservedId[]) {
    if (!storedRefs.has(canonicalReservedRef(viewer, id))) {
      tail.push({ rule: baselineRule(viewer, id), reserved: true });
    }
  }

  return [...head, ...mid, ...tail];
}

/**
 * Does `rule` apply to `person` for `viewer`? `strangers` → not yet
 * recognized; `everyone-else` → always (the tail); any other ref →
 * `GroupApi.isMember` on the person's durable id (covers the normalized
 * `friends`/`foes` contacts refs, managed groups, and MQL).
 */
async function matchesRule(
  viewer: Stuff,
  person: Stuff,
  personId: string | null,
  rule: NotifyRule,
): Promise<boolean> {
  const ref = rule.groupRef;
  if (ref === RESERVED.strangers) {
    return !RecognitionApi.recognizes(viewer, person);
  }
  if (ref === RESERVED.everyoneElse) return true;
  if (!personId) return false;
  try {
    return await GroupApi.isMember(personId, ref);
  } catch {
    return false;
  }
}

function asResolved(entry: ListEntry): ResolvedRule {
  return { ...entry.rule, reserved: entry.reserved };
}

/** See {@link SocialApi.ruleFor}. */
async function ruleForImpl(
  viewer: Stuff,
  person: Stuff,
  opts: RuleForOptions,
): Promise<ResolvedRule> {
  const list = effectiveRuleList(viewer);
  const personId = durablePersonId(person);
  let everyoneElse: ListEntry | null = null;
  for (const entry of list) {
    if (entry.rule.groupRef === RESERVED.everyoneElse) everyoneElse = entry;
    if (opts.excludeMql && GroupApi.parseRef(entry.rule.groupRef).source === "mql") {
      continue;
    }
    if (await matchesRule(viewer, person, personId, entry.rule)) {
      return asResolved(entry);
    }
  }
  // Defensive tail catch-all (effectiveRuleList always supplies it, but a
  // materialized `everyone-else` set to a non-default could be reordered
  // away — resolve to the baseline regardless so ruleFor is total).
  return everyoneElse
    ? asResolved(everyoneElse)
    : asResolved({ rule: baselineRule(viewer, RESERVED.everyoneElse), reserved: true });
}

/** See {@link SocialApi.listRules}. */
function listRulesImpl(viewer: Stuff): NotifyRule[] {
  return effectiveRuleList(viewer).map((e) => e.rule);
}

/** See {@link SocialApi.setRule}. */
function setRuleImpl(
  viewer: Stuff,
  ref: GroupRef,
  patch: Partial<NotifyRule>,
): SetResult {
  if (!MixinApi.isNotifyPolicy(viewer)) {
    const rule: NotifyRule = { ...defaultRuleFor(viewer, ref), ...patch, groupRef: ref };
    return { rule, created: false };
  }
  const host: NotifyPolicy = viewer;
  const existing = host.notifyRules().find((r) => r.groupRef === ref);
  const base = existing ?? defaultRuleFor(viewer, ref);
  const merged: NotifyRule = { ...base, ...patch, groupRef: ref };
  host.upsertNotifyRule(merged);
  return { rule: merged, created: existing === undefined };
}

/** See {@link SocialApi.removeRule}. */
function removeRuleImpl(viewer: Stuff, ref: GroupRef): boolean {
  if (!MixinApi.isNotifyPolicy(viewer)) return false;
  return viewer.removeNotifyRule(ref);
}

/** See {@link SocialApi.reorderRule}. */
function reorderRuleImpl(
  viewer: Stuff,
  ref: GroupRef,
  anchor: GroupRef,
  where: "above" | "below",
): boolean {
  if (!MixinApi.isNotifyPolicy(viewer)) return false;
  const host: NotifyPolicy = viewer;
  // Reorder operates on stored rows; a referenced reserved label that
  // isn't materialized yet is seeded with its baseline defaults first.
  ensureStored(host, viewer, ref);
  ensureStored(host, viewer, anchor);
  return host.reorderNotifyRule(ref, anchor, where);
}

function ensureStored(host: NotifyPolicy, viewer: Stuff, ref: GroupRef): void {
  if (host.notifyRules().some((r) => r.groupRef === ref)) return;
  host.upsertNotifyRule(defaultRuleFor(viewer, ref));
}

/**
 * SocialLogic — the hot-reloadable logic singleton behind
 * {@link SocialApi}.
 *
 * Lives at `/obj/api/social` (a stateless `Stuff` singleton, no backing
 * `Template`); `SocialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The shared `ruleFor` first-match primitive and
 * the store CRUD all live in module-private free functions (the
 * `RenownLogic` discipline — so the public-to-public self-calls don't trip
 * the gate). Each public method carries the `FromModule` gate.
 *
 * Phase 1 surface: the rule store + `ruleFor`. The Phase-3 presence tap
 * (`installPresenceTap`) and the Phase-2 occupant formatter land on this
 * same singleton.
 *
 * @internal
 */
@Unshadowable
export class SocialLogic extends Idea {
  /** See {@link SocialApi.ruleFor}. */
  @CallSecurity(SocialApiCallers)
  public async ruleFor(
    viewer: Stuff,
    person: Stuff,
    opts: RuleForOptions = {},
  ): Promise<ResolvedRule> {
    return ruleForImpl(viewer, person, opts);
  }

  /** See {@link SocialApi.listRules}. */
  @CallSecurity(SocialApiCallers)
  public listRules(viewer: Stuff): NotifyRule[] {
    return listRulesImpl(viewer);
  }

  /** See {@link SocialApi.setRule}. */
  @CallSecurity(SocialApiCallers)
  public setRule(
    viewer: Stuff,
    ref: GroupRef,
    patch: Partial<NotifyRule>,
  ): SetResult {
    return setRuleImpl(viewer, ref, patch);
  }

  /** See {@link SocialApi.removeRule}. */
  @CallSecurity(SocialApiCallers)
  public removeRule(viewer: Stuff, ref: GroupRef): boolean {
    return removeRuleImpl(viewer, ref);
  }

  /** See {@link SocialApi.reorderRule}. */
  @CallSecurity(SocialApiCallers)
  public reorderRule(
    viewer: Stuff,
    ref: GroupRef,
    anchor: GroupRef,
    where: "above" | "below",
  ): boolean {
    return reorderRuleImpl(viewer, ref, anchor, where);
  }
}
