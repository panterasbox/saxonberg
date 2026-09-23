/**
 * `reads-water` brain — **the mentor reads the water aloud, from the
 * record** (fishing D16). A `trigger: engage` responder: `talk fisher`
 * builds a one-beat dialogue tree from the reach's standing at the
 * *practised* band and hands it to `DialogueConversation` exactly as
 * `tree-dialogue.open` does.
 *
 * The config carries the man's LINES, keyed by what the record says —
 * `{ empty, thin, holds, apex }` — and the mechanism chooses which;
 * `{{read}}` in a line is replaced by the banded species read. When the
 * reach is empty he says so, and nothing about who did it: the record
 * holds no names.
 *
 * config: `{ shore?: <Shore path>, lines: { empty, thin, holds, apex } }`.
 */

import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainStatics, DialogueOpenArgs, DialogueOpenResult } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { DialogueTree } from '@saxonberg/server/mud/lib/npc/tree';
import {
  DialogueConversation,
  DialoguePartnerHold,
  DIALOGUE_CONVERSATION_TYPE,
} from '@saxonberg/server/mud/lib/npc/DialogueConversation';
import Waters, { WATERS_PATH } from '../idea/Waters';
import type { FisheryStanding } from '../lib/FisheryRead';

interface Lines {
  empty?: string;
  thin?: string;
  holds?: string;
  apex?: string;
}

const DEFAULT_LINES: Required<Lines> = {
  empty: 'Nothing in it. Nothing. Somebody has had the lot.',
  thin: 'Thin. {{read}} You would do better to wait a few days.',
  holds: '{{read}}',
  apex: '{{read}} And there is a big one lies under the far bank, if you have the arm for it.',
};

export const brain = class {
  static label = 'reads-water';
  static claims: readonly EngagementSlot[] = ['voice', 'attention'];

  /** Never fires on its own: reached only through {@link open}. */
  static act(): void {
    // intentional no-op
  }

  static async open(args: DialogueOpenArgs): Promise<DialogueOpenResult> {
    const { player, npc, config, interactive } = args;
    if (!interactive) return { ok: false, reason: 'no-viewer' };
    if (!MixinApi.isEngaged(npc) || !MixinApi.isEngaged(player)) {
      return { ok: false, reason: 'no-tree' };
    }
    if (npc.getEngagementByType(DIALOGUE_CONVERSATION_TYPE)) {
      return { ok: false, reason: 'busy' };
    }
    const tree = await brain.treeFor(npc, config);
    if (tree === null) return { ok: false, reason: 'no-tree' };

    const conversation = new DialogueConversation(npc, player, interactive, tree);
    if (!(await conversation.resolveEntry())) return { ok: false, reason: 'no-tree' };
    const started = SchedulerApi.start(conversation);
    if (!started.ok) return { ok: false, reason: 'busy' };
    const partner = new DialoguePartnerHold(player, conversation);
    conversation.setPartner(partner);
    const partnerStarted = SchedulerApi.start(partner);
    if (!partnerStarted.ok) {
      SchedulerApi.cancel(conversation, 'cancelled');
      return { ok: false, reason: 'busy' };
    }
    conversation.launch();
    return { ok: true };
  }

  /** ⭐ The tree, built from the record: one beat, chosen by what the water holds. */
  static async treeFor(npc: Stuff, config: Record<string, unknown>): Promise<DialogueTree | null> {
    const beat = await brain.lineFor(npc, config);
    if (beat === null) return null;
    return {
      entry: [{ node: 'read' }],
      nodes: { read: { beat, terminal: true } },
    };
  }

  /** The line: `empty` / `thin` / `holds` / `apex`, with `{{read}}` filled from the registry. */
  static async lineFor(npc: Stuff, config: Record<string, unknown>): Promise<string | null> {
    const lines: Required<Lines> = { ...DEFAULT_LINES, ...((config.lines as Lines | undefined) ?? {}) };
    const waters = await StuffApi.singleton<Waters>(WATERS_PATH);
    const room = MixinApi.isContainable(npc) ? npc.getContainer() : null;
    const reach = (await shoreReach(config)) ?? (room ? await waters.reachAt(room) : null);
    if (reach === null) return null;
    const registry = await waters.registry();
    if (registry === null) return null;
    const standing = await registry.standingAt(reach, WorldClockApi.getNow().rawValue());
    if (standing === null) return null;
    const read = registry.readFor(standing, 'proficient').join(' ');
    const key = classify(standing);
    return lines[key].replace(/\{\{\s*read\s*\}\}/g, read).trim();
  }
} satisfies BrainStatics;

/** What the record says, in four words. */
function classify(standing: FisheryStanding): keyof Required<Lines> {
  const present = standing.species.filter((s) => s.capacity > 0);
  if (present.length === 0) return 'empty';
  const emptyBelow = dial('water.fishery.read.emptyBelow', 0.1);
  const fractions = present.map((s) => s.level / Math.max(1, s.capacity));
  if (fractions.every((f) => f < emptyBelow)) return 'empty';
  if (present.some((s) => s.role === 'apex' && s.level > 0)) return 'apex';
  if (fractions.every((f) => f < 0.35)) return 'thin';
  return 'holds';
}

async function shoreReach(config: Record<string, unknown>): Promise<string | null> {
  const path = typeof config.shore === 'string' ? config.shore : '';
  if (!path) return null;
  try {
    const shore = (await StuffApi.singleton<Stuff>(path)) as unknown as { getReachRef?: () => string } | null;
    const ref = shore?.getReachRef?.() ?? '';
    return ref === '' ? null : ref;
  } catch {
    return null;
  }
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
