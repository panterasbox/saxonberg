/**
 * RepairController — `repair <item>` (the smith's service act, engaged).
 *
 * An engaged act since the capability-table build: the work takes real
 * time on the `hands` slot, paced by the domain instrument (the
 * `mending` tool for soft goods, the reachable anvil for metal — the
 * kinds whose families confer `repair`; a rate-3 sewing machine works
 * in a third the time). At completion, `CraftingApi.repair` resolves
 * the domain gate (forge heat for metal, a `mending` tool for soft
 * goods), prices the material cost off the condition deficit (doubled
 * broken), draws the stock from the same gather walk a craft uses, and
 * restores the condition to full — ceiling-free. A completion-time
 * decline narrates a wasted engagement (the quench posture). Declines
 * render diegetically via the shared CraftController base.
 */

import { ManualBuildController } from './ManualBuildController';
import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { CraftingApi } from '../../../../api/crafting';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { CraftingDecline } from '../../../../lib/craft/CraftingDecline';
import { GrammarApi } from '../../../../api/grammar';
import type { MendOutcome, SkippedPart } from '../../../../api/crafting';

const TOPIC = 'act.deed';
const REPAIR_MS = 6000;

interface RepairModel extends CommandModel {
  kit?: MqlManyResult;
  item?: MqlOneResult;
}

export default class RepairController extends ManualBuildController<RepairModel> {
  async execute(model: RepairModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item: Stuff | null = model.item?.stuff ?? null;
    if (!item) {
      const raw = model.item?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here to repair.`)
        .send();
      context.note({ kind: 'empty-result', field: 'item', query: raw });
      return;
    }

    // ⭐ What cannot be mended is answered NOW, not after a spell of work
    // (assembly D6): the hand looks it over first (a diagnosis changes
    // nothing), and when nothing in it is mendable here the refusal names
    // the cure — a split haft wants a new haft; iron wants a fire.
    const look = await CraftingApi.diagnose({ item });
    if (look.ok) {
      const mendable = look.faults.filter((f) => f.mendable);
      const first = look.faults[0];
      if (mendable.length === 0) {
        const outcome = first
          ? { ok: false as const, reason: first.reason ?? ('insufficient-input' as const), ...(first.detail !== undefined ? { detail: first.detail } : {}) }
          : { ok: false as const, reason: 'insufficient-input' as const, detail: 'nothing-to-repair' };
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`${CraftingDecline.messageFor(outcome)}`)
          .send();
        context.note({ kind: 'controller-rejected', reason: outcome.reason, detail: outcome.detail ?? '' });
        return;
      }
    } else {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${CraftingDecline.messageFor(look)}`)
        .send();
      context.note({ kind: 'controller-rejected', reason: look.reason, detail: look.detail ?? '' });
      return;
    }

    // The pacer: the reachable instrument of a kind whose family
    // confers `repair` — the mending kit/machine or the anvil. The
    // real feasibility gates (durable? worn? stock? heat?) stay in
    // CraftingApi.repair at completion; absence of a pacer is not a
    // gate here (rate 1 — the Api declines diegetically if the domain
    // tool is genuinely missing).
    const pacer =
      this.bestInstrument(model.kit, 'mending') ??
      this.bestInstrument(model.kit, 'anvil') ??
      this.bestInstrument(model.kit, 'cutting');

    // Capture the maker from the live command frame; the repair runs at
    // engaged-completion, where no frame exists (the strain pattern).
    // ⚠ The IDENTITY path — a joint re-made records WHO, and every player
    // Avatar shares one templatePath (assembly D3).
    const author = ExecutionContextApi.getActingAuthor() as Stuff | null;
    const makerPath = author?.getIdentityPath() ?? author?.getTemplatePath() ?? '';

    this.engageStep(context, {
      durationMs: this.paceMs(REPAIR_MS, pacer, ['mending', 'anvil', 'cutting']),
      effortW: 250,
      beginSelf: Mml.compose`You settle in over ${Mml.thing(item)} and set to the repair.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to repairing ${Mml.thing(item)}.`,
      // No `this` in the closure — the controller clone is destructed
      // when execute returns (antipatterns.md § Activity-completion
      // closures); the body is a module-private free function.
      onComplete: () => completeRepair(giver, item, makerPath),
    });
  }
}

/** The completion body — plain values only, never the controller. */
function completeRepair(giver: Stuff, item: Stuff, makerPath: string): void {
  void (async (): Promise<void> => {
    const outcome = await CraftingApi.repair({ item, makerPath });
    if (!outcome.ok) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${CraftingDecline.messageFor(outcome)}`)
        .send();
      return;
    }
    if (outcome.rung === 'tightened') {
      // ⭐ The joint, not the parts: nothing was consumed (assembly D6).
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You take up the slack in ${Mml.thing(item)} — the ${outcome.named ?? 'joint'}, driven home. Nothing else wanted doing.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} tightens ${Mml.thing(item)}.`)
        .send();
      return;
    }
    if (outcome.rung === 'refired') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You shave ${Mml.thing(item)} back to clean wood and fire the inside until it chars — it will give its contents something again.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} re-fires ${Mml.thing(item)}.`)
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${mendLine(outcome.mended, outcome.skipped)}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} works on ${Mml.thing(item)}.`)
      .send();
  })().catch((err: unknown) => {
    console.error('RepairController: repair failed', err);
  });
}

/**
 * ⭐ What the mend did, part by part, in one breath (repair D8): what came
 * back sound, what came back short of it, and what wants something this
 * hand does not have — *You mend the head; the haft wants an edge to work
 * it.* A thing of one piece is "it".
 */
function mendLine(mended: MendOutcome[], skipped: SkippedPart[]): string {
  const name = (o: MendOutcome): string => (o.part ? `the ${o.part}` : 'it');
  const reforged = mended.filter((o) => o.kind === 'reforged');
  const sound = mended.filter((o) => o.kind === 'mended' && o.result === 'sound');
  const short = mended.filter((o) => o.kind === 'mended' && o.result === 'short');
  const clauses: string[] = [];
  if (reforged.length > 0) {
    clauses.push(`You put ${GrammarApi.joinList(reforged.map(name))} back in the fire and forge ${reforged.length === 1 ? 'it' : 'them'} whole again`);
  }
  if (sound.length > 0) {
    clauses.push(`${clauses.length > 0 ? 'you' : 'You'} mend ${GrammarApi.joinList(sound.map(name))} as sound as the day ${sound.length === 1 ? 'it was' : 'they were'} made`);
  }
  if (short.length > 0) {
    clauses.push(`${clauses.length > 0 ? 'you' : 'You'} mend ${GrammarApi.joinList(short.map(name))} as best you can — serviceable, not what it was`);
  }
  for (const s of skipped) clauses.push(skippedPhrase(s));
  if (clauses.length === 0) return 'You go over it, and nothing wanted doing.';
  return `${GrammarApi.cap(clauses.join('; '))}.`;
}

/** What a missing capability is, as the cure a person would name. */
const TOOL_WORDS: Record<string, string> = {
  cutting: 'an edge to work it',
  mending: 'a mending kit',
  anvil: 'an anvil',
  shaving: 'a shaving tool',
  striking: 'a hammer',
};

/**
 * ⭐ One part a mend could NOT reach, as the cure (repair D8): *the haft
 * wants an edge to work it*, *the head wants a fire*. Said beside what
 * WAS mended, so a whole that mends what it can tells you the rest.
 */
function skippedPhrase(skip: SkippedPart): string {
  const part = skip.part ? `the ${skip.part}` : 'it';
  switch (skip.reason) {
    case 'insufficient-heat':
      return `${part} wants a fire hotter than any here`;
    case 'missing-tool':
      return `${part} wants ${TOOL_WORDS[skip.detail ?? ''] ?? `a ${skip.detail ?? 'tool'}`}`;
    case 'insufficient-input':
      return `there is no ${skip.detail ?? 'stock'} here to mend ${part} with`;
    case 'part-failed':
      return skip.detail?.startsWith('something about')
        ? `there is ${skip.detail} that wants replacing`
        : `${part} has failed, and wants a new one fitted`;
    case 'not-skilled':
      return `${part} wants a surer hand — ${skip.detail ?? 'more skill than yours'}`;
    default:
      return `${part} could not be mended`;
  }
}
