// SocialLogic — the hot-reloadable logic singleton behind SocialApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { MixinApi } from "../../../api/mixin";
import { GroupApi } from "../../../api/group";
import { RecognitionApi } from "../../../api/recognition";
import { PlayerApi } from "../../../api/player";
import { SandboxApi } from "../../../api/sandbox";
import { ShellApi } from "../../../api/shell";
import { GrammarApi } from "../../../api/grammar";
import { Mml } from "../../../api/mml";
import { ProseApi } from "../../../api/prose";
import { MessageApi } from "../../../api/message";
import { EventApi } from "../../../api/event";
import type { Subscription } from "../../../api/event";
import { ConnectionApi } from "../../../api/connection";
import { Events } from "../../../lib/events";
import type { Sensor } from "../../../lib/message/Sensor";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import type { SocialNotificationPayload } from "@saxonberg/types";
import type { GroupRef } from "../../../lib/social/GroupProvider";
import type { NotifyPolicy } from "../../../lib/social/NotifyPolicy";
import {
  RESERVED,
  PRESENCE_FORMAT_DEFAULT,
  type NotifyRule,
  type ResolvedRule,
  type RuleForOptions,
  type SetResult,
  type ReservedId,
  type PaletteToken,
} from "../../../lib/social/NotifyRule";

const SocialApiCallers = SecurityPolicies.FromModule("/api/social#SocialApi");

/**
 * The tap install is also callable by the self-warming `PresenceRelay`
 * singleton (the boot()-retirement shape).
 */
const SocialBootCallers = SecurityPolicies.AnyOf(
  SocialApiCallers,
  SecurityPolicies.FromTemplate("/platform/idea/PresenceRelay"),
);

/**
 * Code-side baseline fallback — used only when AppSettings isn't warmed
 * (pre-boot / unit fixtures). The live defaults are seeded from
 * `social.baselineRules` in the platform pack's `content/settings/social.yaml` (the renown
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
    onConnect: "show",
    onDisconnect: "show",
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
 * The membership key for a person used in group tests — uniformly the
 * `templatePath` (a player as `/platform/agent/Avatar/<playerId>`, an NPC as its own
 * path), so no avatar-vs-NPC branch. Null when it has no path (can't match a
 * group ref).
 */
function durablePersonId(person: Stuff): string | null {
  return person.getIdentityPath() ?? null;
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

/**
 * The reserved ids that resolve at the **head** of the effective list (the
 * `effectiveRuleList` virtual head), in baseline-rank order: `foes` before
 * `friends`. `everyone-else` / `strangers` are tail baselines and keep the
 * default append behaviour when materialized.
 */
const HEAD_RESERVED: readonly ReservedId[] = [RESERVED.foes, RESERVED.friends];

/** Is `id` a head-baseline reserved id (`foes` / `friends`)? */
function isHeadReserved(id: ReservedId | null): id is ReservedId {
  return id === RESERVED.foes || id === RESERVED.friends;
}

/**
 * The stored-list index a freshly-materialized head-baseline reserved rule
 * should occupy so it preserves its virtual-head precedence: above every
 * custom rule, and in baseline rank (`foes` before `friends`). The index is
 * the count of higher-ranked head-baseline rules already stored — so `foes`
 * always lands at 0 and `friends` lands just after a stored `foes`.
 */
function headInsertIndex(
  host: NotifyPolicy,
  viewer: Stuff,
  id: ReservedId,
): number {
  const myRank = HEAD_RESERVED.indexOf(id);
  let idx = 0;
  for (const r of host.notifyRules()) {
    const rid = reservedIdOf(viewer, r.groupRef);
    if (isHeadReserved(rid) && HEAD_RESERVED.indexOf(rid) < myRank) idx++;
  }
  return idx;
}

/**
 * Persist a (newly-built) rule into the store. A head-baseline reserved id
 * (`foes` / `friends`) being **materialized for the first time** is inserted
 * at the head (preserving baseline rank) rather than appended, so it keeps
 * the precedence its virtual twin had above all custom rules. Everything
 * else (custom refs, the `everyone-else` / `strangers` tail) appends. An
 * already-stored rule is replaced in place and never moved (re-materializing
 * is precedence-stable) — `upsertNotifyRuleAt` handles that case.
 */
function storeMaterialized(
  host: NotifyPolicy,
  viewer: Stuff,
  rule: NotifyRule,
): void {
  const id = reservedIdOf(viewer, rule.groupRef);
  if (isHeadReserved(id)) {
    host.upsertNotifyRuleAt(rule, headInsertIndex(host, viewer, id));
  } else {
    host.upsertNotifyRule(rule);
  }
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

/**
 * Is `ref` an `mql:` group ref? Safe against the bare reserved
 * pseudo-subjects (`strangers` / `everyone-else`), which aren't
 * `source:id`-shaped and make `GroupApi.parseRef` throw — those are never
 * MQL, so a throw resolves to `false`. The notification fan-out's
 * `excludeMql` walk reaches the reserved tail, so this guard must be total.
 */
function isMqlRef(ref: GroupRef): boolean {
  try {
    return GroupApi.parseRef(ref).source === "mql";
  } catch {
    return false;
  }
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
    if (opts.excludeMql && isMqlRef(entry.rule.groupRef)) {
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
  storeMaterialized(host, viewer, merged);
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
  storeMaterialized(host, viewer, defaultRuleFor(viewer, ref));
}

/* ── Phase 2: the display-lensing occupant formatter ─────────────────── */

/** A pre-grouped occupant's render disposition (see {@link modeFor}). */
type RenderMode = "boosted" | "individual" | "grouped" | "hidden";

/** The verbosity dial's three positions. */
type Verbosity = "minimal" | "standard" | "verbose";

/**
 * Density level `0..3` from the room's renderable-occupant count — the
 * requirements' four-tier table (`<10` / `10–30` / `30–100` / `>100`).
 * Boundaries: 30 sits in the `10–30` tier, 100 in the `30–100` tier.
 */
function densityLevel(roomSize: number): number {
  if (roomSize < 10) return 0;
  if (roomSize <= 30) return 1;
  if (roomSize <= 100) return 2;
  return 3;
}

/** The viewer's `social.verbosity` (schema default `standard`). */
function verbosityOf(viewer: Stuff): Verbosity {
  const v = ShellApi.resolveSetting<string>(viewer, "social.verbosity");
  return v === "minimal" || v === "verbose" ? v : "standard";
}

/**
 * The density level after verbosity modulation: `minimal` shifts one tier
 * more aggressive, `verbose` disables collapse entirely (signalled by a
 * `-1` level — every non-hidden occupant renders individually).
 */
function effectiveLevel(roomSize: number, verbosity: Verbosity): number {
  if (verbosity === "verbose") return -1;
  const base = densityLevel(roomSize);
  return verbosity === "minimal" ? Math.min(3, base + 1) : base;
}

/**
 * How a single occupant renders, given the effective density `level` and
 * the rule that matched them. Boosted rules (`boostInDense`) are always
 * lifted and named; `hidden` rules are dropped. Otherwise the rule's
 * `nameRendering` and the tier decide individual-vs-grouped — `name`-class
 * occupants (`everyone-else`) collapse only at the top tier, while
 * `feature-string`-class occupants (`strangers`) collapse from the
 * `30–100` tier up, matching the requirements table.
 */
function modeFor(level: number, rule: ResolvedRule): RenderMode {
  if (rule.boostInDense) return "boosted";
  if (rule.nameRendering === "hidden") return "hidden";
  if (level < 0) return "individual"; // verbose — no collapse
  switch (rule.nameRendering) {
    case "name":
      return level >= 3 ? "grouped" : "individual";
    case "feature-string":
      return level >= 2 ? "grouped" : "individual";
    case "count-only":
      return "grouped";
    default:
      return "individual";
  }
}

/** The species common-name of an organism occupant, or null. */
function speciesNameOf(occ: Stuff): string | null {
  if (!MixinApi.isOrganism(occ)) return null;
  return occ.getSpecies()?.getCommonNames()[0] ?? null;
}

/**
 * The most-distinctive worn feature of an occupant, parsed out of the
 * `RecognitionApi.salientFeatures` string (`"a dwarf wearing red robes"` →
 * `"red robes"`). Null when nothing notable is worn — composing *through*
 * the shipped salient-features primitive rather than re-deriving it.
 */
function wornFeatureOf(occ: Stuff): string | null {
  const salient = RecognitionApi.salientFeatures(occ);
  const marker = " wearing ";
  const idx = salient.lastIndexOf(marker);
  if (idx < 0) return null;
  const worn = salient.slice(idx + marker.length).trim();
  return worn.length > 0 ? worn : null;
}

/**
 * Build an eager `<name>` fragment for one occupant. The display text is
 * resolved **now** through `RecognitionApi.describeWithStatus(viewer, occ)`
 * (compose *through* describe, never re-implement naming) because the
 * occupant block is resolved eagerly for a single known viewer (see
 * `composeOccupantsImpl`); a boosted occupant carries its rule's palette
 * token as a `color` attribute the client theme maps to a treatment. This
 * is a presence-scan surface, so it carries the activity-status affix
 * ("…, watching the empty road").
 */
function nameMml(viewer: Stuff, occ: Stuff, color?: PaletteToken): Mml {
  const display = RecognitionApi.describeWithStatus(viewer, occ);
  const colorAttr = color ? ` color="${Mml.escape(color)}"` : "";
  // Hand-built rather than `Mml.actor` because of the `color` attribute
  // — so the kind resolution has to be asked for explicitly. ⚠ It must
  // be: the occupant list is the one surface where a hooded figure is
  // read carefully, so it is the last place that should quietly admit
  // a real person is under the hood.
  const tag = RecognitionApi.kindOf(viewer, occ);
  return Mml.fromMarkup(
    `<${tag} stuff-id="${Mml.escape(occ.stuffId)}"${colorAttr}>` +
      `${Mml.escape(display)}</${tag}>`,
  );
}

/**
 * A collapsed-group line — a targetable handle carrying its MQL seed in a
 * `mudq:` `<link>` so the four client addressability paths (hover →
 * command-bar preview, expand-on-pull, inspection-card drill, verb-time
 * `mqlMany`) have something to resolve. `mudq:` is inert-but-painted in v1
 * (see `message-rendering.md`); the click/preview wiring is the deferred
 * seam. The seed is the human-readable room-scope query (`dwarves in red
 * robes` / `others`); percent-encoding is deferred with the click handler.
 */
function groupHandle(seed: string, label: string): Mml {
  return Mml.link(`mudq:${seed}`, label);
}

/** See {@link SocialApi.composeOccupants}. */
async function composeOccupantsImpl(
  viewer: Stuff,
  occupants: Stuff[],
  roomSize: number,
): Promise<Mml> {
  const level = effectiveLevel(roomSize, verbosityOf(viewer));

  const boosted: Mml[] = [];
  const individual: Mml[] = [];
  const collapsible: Stuff[] = [];

  for (const occ of occupants) {
    // Eager (await) resolution: ruleFor is async (membership rides
    // GroupApi.isMember), but MML toString is sync. v1 renders the
    // occupant block for a single known viewer (look's toSelf, arrival's
    // forceCommand('look')), so we resolve here rather than via a
    // late-bound sync wrapper. Late-binding for a future multi-recipient
    // enter-broadcast is the deferred seam.
    const rule = await ruleForImpl(viewer, occ, {});
    switch (modeFor(level, rule)) {
      case "boosted":
        boosted.push(nameMml(viewer, occ, rule.color));
        break;
      case "individual":
        individual.push(nameMml(viewer, occ));
        break;
      case "grouped":
        collapsible.push(occ);
        break;
      case "hidden":
        break;
    }
  }

  // Similarity-group the collapsible occupants by (species, worn feature).
  // A group needs a shared tuple AND at least two members to read as a
  // count line ("12 dwarves in red robes"); everything else — incomplete
  // tuples and lone occupants — falls to the generic "(N others present)".
  const tupleGroups = new Map<string, Stuff[]>();
  const generic: Stuff[] = [];
  for (const occ of collapsible) {
    const species = speciesNameOf(occ);
    const feature = wornFeatureOf(occ);
    if (species && feature) {
      const key = `${species}␟${feature}`;
      const bucket = tupleGroups.get(key);
      if (bucket) bucket.push(occ);
      else tupleGroups.set(key, [occ]);
    } else {
      generic.push(occ);
    }
  }

  const grouped: Mml[] = [];
  for (const [key, members] of tupleGroups) {
    if (members.length < 2) {
      generic.push(...members);
      continue;
    }
    const sep = key.indexOf("␟");
    const species = key.slice(0, sep);
    const feature = key.slice(sep + 1);
    const plural = GrammarApi.pluralize(members[0]!, species);
    const seed = `${plural} in ${feature}`;
    grouped.push(groupHandle(seed, `${members.length} ${seed}`));
  }
  if (generic.length > 0) {
    const n = generic.length;
    const noun = n === 1 ? "other present" : "others present";
    grouped.push(groupHandle("others", `(${n} ${noun})`));
  }

  return Mml.list([...boosted, ...individual, ...grouped]);
}

/* ── Phase 3: the presence relay + message restyle ───────────────────── */

/**
 * Rate-limiter window (ms) per `(actor, viewer, event)` — a transient,
 * in-memory cadence cap (the `RenownLogic.receptionSeen` precedent;
 * nothing persisted). Cadence is *mechanism*, not a legislated value, so
 * it's a code constant rather than an AppSettings dial. A re-login inside
 * the window is dropped so a flapping connection doesn't spam a viewer.
 */
const PRESENCE_RATE_WINDOW_MS = 60_000;

/**
 * The four player-presence transitions, all gated on having a character
 * in the world (a bare welcome-screen socket and the OAuth layer never
 * reach here). Arrivals (`loggedIn` / `reconnected`) ride a rule's
 * `onConnect` surface; departures (`loggedOut` / `disconnected`) ride
 * `onDisconnect`.
 */
type PresenceEvent = "loggedIn" | "loggedOut" | "reconnected" | "disconnected";

/** Arrivals ride `onConnect`; everything else is a departure (`onDisconnect`). */
const PRESENCE_ARRIVALS: ReadonlySet<PresenceEvent> = new Set([
  "loggedIn",
  "reconnected",
]);

/** The player-facing verb phrase for each transition (`<name> has <verb>.`). */
const PRESENCE_VERB: Record<PresenceEvent, string> = {
  loggedIn: "entered the game",
  reconnected: "reconnected",
  loggedOut: "left the game",
  disconnected: "disconnected",
};

/**
 * The connecting player's country of origin (display name), or `undefined`
 * when unresolved — localhost / private IPs, an unknown geo, or simply no
 * captured origin for this session. Reads the transient per-connection
 * origin captured at the WS handshake via `ConnectionApi.originOf`; the
 * raw IP never leaves that layer (country is the only datum surfaced).
 */
function presenceCountryFor(actorPlayerId: string): string | undefined {
  try {
    return ConnectionApi.originOf(actorPlayerId).country;
  } catch {
    return undefined;
  }
}

/**
 * Fan a presence transition out to every online viewer whose first-
 * matching rule (excluding MQL refs — too costly as a notification
 * subject) for the acting player carries a non-silent surface. The frame
 * renders inline in each viewer's message buffer (no separate
 * notification surface), tinted by the rule color.
 *
 * Runs as substrate code (no command context) — the match comes from the
 * *viewer's own* rule list under the viewer's identity, so this never
 * exposes who-policied-whom: the pushed frame carries only the actor ref,
 * event, and color, never the rule list. Cost is `O(online viewers ×
 * rules × isMember)`; the default-silent baseline for non-contacts bounds
 * the fan-out (only bucketed non-silent rules emit).
 */
async function relayPresenceImpl(
  actorPlayerId: string,
  event: PresenceEvent,
  limiter: Map<string, number>,
): Promise<void> {
  const actor = PlayerApi.findAvatarByPlayerId(actorPlayerId);
  if (!actor) return;
  const now = Date.now();
  const isArrival = PRESENCE_ARRIVALS.has(event);
  // Country of origin rides arrivals only (a connection has an origin; a
  // departure doesn't). Resolved once per relay, shared across viewers.
  const country = isArrival ? presenceCountryFor(actorPlayerId) : undefined;
  const verb = PRESENCE_VERB[event];

  for (const viewer of PlayerApi.getAllAvatars()) {
    if ((viewer as Stuff) === (actor as Stuff)) continue; // never self-notify
    // Skip stale handles: a destroyed avatar (e.g. a just-logged-out
    // instance still lingering in the registry) can still report
    // `isConnected()` true, but sending to it throws DestroyedObjectError
    // on `onEnvelope` and would abort the whole relay loop.
    if ((viewer as Stuff).isDestroyed()) continue;
    // Sandbox (Decision N): rules stay on the registry avatar; delivery
    // follows the ACTIVE body. A parked viewer's wire body is the live
    // delivery target; an unparked viewer delivers to themselves.
    const deliveryBody = SandboxApi.activeBodyFor(viewer.getPlayerId()) ?? viewer;
    if (!deliveryBody.isConnected()) continue; // online viewers only — skip linkdead
    const rule = await ruleForImpl(viewer, actor as Stuff, {
      excludeMql: true,
    });
    const surface = isArrival ? rule.onConnect : rule.onDisconnect;
    if (surface === "silent") continue; // muted — nothing surfaces

    // Rate-limit per (actor, viewer, event). Transient; nothing persisted.
    const key = `${actorPlayerId}|${viewerPlayerId(viewer)}|${event}`;
    const last = limiter.get(key);
    if (last !== undefined && now - last < PRESENCE_RATE_WINDOW_MS) continue;
    limiter.set(key, now);

    const payload: SocialNotificationPayload = {
      kind: "presence",
      event,
      actor: MessageApi.refOf(actor as Stuff),
      color: rule.color,
      ...(country ? { country } : {}),
    };
    // Render the viewer's customizable Liquid presence template
    // (`social.presenceFormat`, persisted per-character) over the variable
    // context — `who` is a viewer-aware late-bound `Mml.name` (recognition-
    // gated), `country` is null on departures / unresolved origins so the
    // default "from …" tail elides. A syntactically broken custom template
    // never silences the notice — it falls back to the shipped default.
    const vars = {
      who: Mml.actor(actor as Stuff),
      action: verb,
      event,
      category: isArrival ? "arrival" : "departure",
      is_arrival: isArrival,
      country: country ?? null,
    };
    const template =
      ShellApi.resolveSetting<string>(viewer, "social.presenceFormat") ||
      PRESENCE_FORMAT_DEFAULT;
    let line: Mml;
    try {
      line = ProseApi.format(template, vars);
    } catch {
      line = ProseApi.format(PRESENCE_FORMAT_DEFAULT, vars);
    }
    // Resolve viewer-aware (we're already per-viewer), then tint inline by
    // the rule color (a `<highlight>` wrap when not the neutral default,
    // mirroring `styleMessageForImpl`).
    const resolved = line.toString(viewer as Stuff & Sensor);
    const body =
      rule.color && rule.color !== "neutral"
        ? Mml.fromMarkup(
            `<highlight color="${Mml.escape(rule.color)}">${resolved}</highlight>`,
          )
        : Mml.fromMarkup(resolved);
    // Per-viewer isolation: a single bad recipient (mid-teardown handle,
    // a send that throws) must not deny every other viewer their frame.
    // The scene anchors on the ACTIVE body so a parked viewer's notice
    // lands in their circle session (delivery follows identity).
    try {
      MessageApi.scene(deliveryBody)
        .topic("session.presence")
        .toSelf(body, payload)
        .send();
    } catch {
      // best-effort relay — drop this viewer, continue the scan
    }
  }
}

/**
 * Restyle a matched speaker's already-buffered message body per the
 * viewer's first-matching `onMessage` surface (a *notification* surface,
 * never feed-filtering — the message is never dropped):
 *   - `full`    → wrap the body in a `<highlight>` tinted by the rule color;
 *   - `summary` → (Phase 3b) aggregation has no clean per-recipient hook
 *     yet, so render like `full` for now (the limitation is flagged);
 *   - `silent`  → suppress the *notification* only; the body renders
 *     unchanged (never dropped).
 *
 * MQL refs are excluded (consistent with the presence relay — a message
 * restyle is a notification surface, and MQL refs are not notification
 * subjects). `body.toString(viewer)` materializes the inner per recipient.
 */
async function styleMessageForImpl(
  viewer: Stuff,
  speaker: Stuff,
  body: Mml,
): Promise<Mml> {
  const rule = await ruleForImpl(viewer, speaker, { excludeMql: true });
  if (rule.onMessage === "silent") return body;
  // `full` and `summary` both highlight in the rule color for now.
  return Mml.fromMarkup(
    `<highlight color="${Mml.escape(rule.color)}">` +
      `${body.toString(viewer as Stuff & Sensor)}</highlight>`,
  );
}

/**
 * SocialLogic — the hot-reloadable logic singleton behind
 * {@link SocialApi}.
 *
 * Lives at `/platform/idea/api/social` (a stateless `Stuff` singleton, no backing
 * `Template`); `SocialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The shared `ruleFor` first-match primitive and
 * the store CRUD all live in module-private free functions (the
 * `RenownLogic` discipline — so the public-to-public self-calls don't trip
 * the gate). Each public method carries the `FromModule` gate.
 *
 * Phase 1 surface: the rule store + `ruleFor`. The Phase-2 occupant
 * formatter and the Phase-3 presence tap (`installPresenceTap`) + message
 * restyle (`styleMessageFor`) land on this same singleton.
 *
 * TODO Phase 3b — `styleMessageFor` is implemented and unit-tested but is
 * NOT yet wired into the live message-delivery path. The clean per-
 * recipient seam (`SensorMixin.onMessage` is a framework template method
 * marked "DO NOT override"; the speech producers compose one multi-
 * recipient `Scene`) would require a broader comms/messaging refactor to
 * late-bind the per-viewer restyle, deferred rather than forced here. A
 * future consumer (a `filterMessage`-shadow or a late-bound producer-side
 * wrapper) calls `SocialApi.styleMessageFor(viewer, speaker, body)` at the
 * compose seam. `summary` currently renders like `full` (no clean
 * per-recipient aggregation hook yet).
 *
 * @internal
 */
@Unshadowable
export class SocialLogic extends ApiLogic {
  /**
   * The login subscription — retained so a re-install is a no-op.
   * Transient instance state on the singleton (not persisted); a fresh
   * singleton (post-HMR / post-`clearAll`) re-installs cleanly.
   */
  private loginSub: Subscription<unknown> | null = null;

  /** The logout subscription — retained so re-install is a no-op. */
  private logoutSub: Subscription<unknown> | null = null;

  /** The reconnect subscription — retained so re-install is a no-op. */
  private reconnectSub: Subscription<unknown> | null = null;

  /** The linkdead-drop subscription — retained so re-install is a no-op. */
  private disconnectSub: Subscription<unknown> | null = null;

  /**
   * Ephemeral per-`(actor, viewer, event)` rate-limiter (`key → last-emit
   * ms`). Transient instance state; a fresh singleton starts empty
   * (the `RenownLogic.receptionSeen` precedent). Nothing persisted.
   */
  private presenceSeen = new Map<string, number>();

  /**
   * Install the presence relay (idempotent). Subscribes to
   * `PlayerLoggedIn` / `PlayerLoggedOut` and fans each out to the online
   * viewers whose first-matching rule for the acting player is non-silent.
   * Armed by `PresenceRelay.warm` (the manifest postRegister).
   *
   * Unlike the renown reaction/reception taps, this does NOT
   * `restrictSubscribe`: login/logout is *public presence* (already an
   * open `emittableBy()` engine event), not a per-actor command/utterance
   * cadence side-channel — locking subscribe would wrongly bar other
   * legitimate future presence consumers.
   */
  @CallSecurity(SocialBootCallers)
  public installPresenceTap(): void {
    if (this.loginSub) return;
    const limiter = this.presenceSeen;
    const relay = (event: PresenceEvent) => (p: { playerId: string }) => {
      void relayPresenceImpl(p.playerId, event, limiter).catch((err) =>
        console.error(`SocialLogic: presence ${event} relay failed`, err),
      );
    };
    this.loginSub = EventApi.on<{ playerId: string; userId: string }>(
      Events.PlayerLoggedIn,
      relay("loggedIn"),
    );
    this.reconnectSub = EventApi.on<{ playerId: string; userId: string }>(
      Events.PlayerReconnected,
      relay("reconnected"),
    );
    this.logoutSub = EventApi.on<{ playerId: string }>(
      Events.PlayerLoggedOut,
      relay("loggedOut"),
    );
    this.disconnectSub = EventApi.on<{ playerId: string }>(
      Events.PlayerDisconnected,
      relay("disconnected"),
    );
  }

  /** See {@link SocialApi.styleMessageFor}. */
  @CallSecurity(SocialApiCallers)
  public styleMessageFor(
    viewer: Stuff,
    speaker: Stuff,
    body: Mml,
  ): Promise<Mml> {
    return styleMessageForImpl(viewer, speaker, body);
  }

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

  /** See {@link SocialApi.composeOccupants}. */
  @CallSecurity(SocialApiCallers)
  public composeOccupants(
    viewer: Stuff,
    occupants: Stuff[],
    roomSize: number,
  ): Promise<Mml> {
    return composeOccupantsImpl(viewer, occupants, roomSize);
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
