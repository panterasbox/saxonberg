/**
 * EquipController — `equip`, and getting kitted out is ONE act.
 *
 * Absorbs `wear` and `wield`, which are now aliases: worn and wielded
 * are two answers to one intention, and a player who wants their kit on
 * should not have to know which word a given object answers to.
 *
 * ⭐⭐ **The reason the verb exists is ORDERING, not keystrokes.**
 * `wear`'s own help used to say *"a light thing will not go on OVER a
 * heavy one"* — that is the covering ladder (`wouldLayerViolate`), which
 * the engine knows exactly and the PLAYER was rediscovering one refusal
 * at a time. Shirt, gambeson, hauberk, surcoat is a fact about the
 * model, not a preference, and making the person guess it was the
 * interface handing them a problem it had already solved.
 *
 * ⚠⚠ **It sorts by layer depth, and the appealing alternative was
 * wrong.** The first draft did not sort at all: it repeatedly put on
 * whatever was legal right now and looped — a topological sort by
 * refusal, needing no new surface and unable to drift from the ladder
 * because it *was* the ladder being asked. It fails on the first real
 * kit. Once plate is on, a shirt can never go under it, and no amount
 * of retrying recovers because nothing takes the plate back off; a
 * cuirass sitting before a shirt in the pack dressed the actor in the
 * cuirass alone. So the walk is ordered by the same `getLayerDepth()`
 * the ladder itself reads, and `wouldLayerViolate` stays as the
 * per-item gate for the thing a sort cannot know — what is ALREADY on.
 * Ties (a shirt and a coat, both band 0) keep the caller's order, which
 * is the player's own call exactly as it was before.
 *
 * ⭐⭐ **Dressing costs time** — a `DressingStep` per layer, occupying
 * `hands`. You cannot armour up in an ambush, and an interrupted
 * dressing leaves what went on ON, because the covering stack is a
 * stack and a shorter one is already a coherent state.
 *
 * ⚠ **The skip report is not optional.** Bare `equip` always passes
 * over something — a garment cut for another body, a full slot, a
 * second two-hander — and silently omitting it is worse than any
 * refusal. One line for what went on, one for what did not and why.
 *
 * Grammar (`cmd/inventory/equip.yaml`):
 *   equip                      everything you carry, inside-out
 *   equip <thing>              one thing, worn or wielded
 *   equip <thing> --from <box> reach into a container you can see
 *   equip set <name>           a saved set   (`--save` to record one)
 *   equip sets                 list them
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SpeciesApi } from '../../../../api/species';
import { SchedulerApi } from '../../../../api/scheduler';
import { ContainmentApi } from '../../../../api/containment';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { DressingStep } from '../../../../lib/slot/DressingStep';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';

const TOPIC = 'sense.survey';

interface EquipModel extends CommandModel {
  /** Absent for bare `equip` — the whole-kit form. */
  target?: MqlOneResult;
  /** `--from <container>`: the wardrobe, the chest, the pack. */
  from?: MqlOneResult;
  /** `equip set <name>` / `equip sets`. */
  name?: string;
  /** `--save`: record what is on right now under `<name>`. */
  save?: boolean;
  /** `set` / `sets`, from the view's `subcommands:`. */
  subcommand?: string;
}

/** Why a candidate was passed over — the skip report's vocabulary. */
type SkipReason =
  | 'fit'
  | 'layer'
  | 'slot-full'
  | 'no-slots'
  | 'busy';

const SKIP_PHRASE: Record<SkipReason, string> = {
  fit: 'not cut for you',
  layer: "won't go on over what you have on",
  'slot-full': 'nowhere left to put it',
  'no-slots': "doesn't fit your body",
  busy: 'your hands are full',
};

/**
 * A covering's band on the `0..4` ladder — the same read `Slotted`'s own
 * comparator makes. Anything that is not a covering (a sword, a ring)
 * sorts at 0 and lands wherever its slot allows.
 */
function layerDepthOf(item: Stuff): number {
  if (!MixinApi.isConstructed(item)) return 0;
  const construction = item.getConstruction();
  if (!construction || !construction.isCovering()) return 0;
  return construction.getLayerDepth();
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * How long this garment takes to get onto a body.
 *
 * ⭐ DERIVED from mass — the `clo` doctrine. A linen shirt weighs
 * nothing and goes on in seconds; a mail hauberk weighs ten kilos and
 * takes minutes, and that falls out of what they ARE rather than out of
 * a number somebody typed on every row.
 */
export function donDurationMs(item: Stuff): number {
  const base = dial(AppSettingKeys.equipBaseMs, 4000);
  const perKg = dial(AppSettingKeys.equipMsPerKg, 14000);
  const kg = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
  return Math.max(base, Math.round(base + kg * perKg));
}

export default class EquipController extends CommandController<EquipModel> {
  async execute(model: EquipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `EquipController: requiresSlotted should have caught ${giver.stuffId}`,
      );
    }

    // `equip sets` — the wardrobe roster.
    if (model.subcommand === 'sets') {
      this.listSets(context);
      return;
    }
    // `equip set <name>` (+ `--save`).
    if (model.subcommand === 'set') {
      await this.set(model, context);
      return;
    }

    /*
     * ⚠ The hauling refusal comes FIRST — before the pool, and before
     * any `--from` moves a thing out of a wardrobe. Refusing after the
     * goods are already in your hands would leave the world changed by
     * a command that declined; and being synchronous, it also lands in
     * the envelope before the first `await`, which is where a caller
     * that does not await expects to find it.
     */
    if (model.target?.stuff && this.handsHauling(model.target.stuff, context, giver)) {
      return;
    }

    // Reach: `--from <container>` widens the pool past the inventory,
    // which is the ONE genuinely new capability here. Without it a
    // wardrobe is six `get`s before you can dress, which is exactly what
    // made saved sets feel like machinery for nothing.
    const pool = await this.pool(model, context, giver);
    if (pool === null) return;

    if (!model.target?.stuff) {
      await this.equipAll(pool, context, giver);
      return;
    }
    const one = model.target.stuff;
    const skip = this.canEquip(one, giver);
    if (skip) {
      this.refuseOne(one, skip, context, giver);
      return;
    }
    await this.engage(one, context, giver, () => {
      this.put(one, giver);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You put on ${Mml.thing(one)}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} puts on ${Mml.thing(one)}.`)
        .send();
    });
  }

  /**
   * ⚠ Hands-occupied while hauling: you cannot take up a weapon with a
   * cart handle in your fists. Keyed on the giver being THE HAULER — a
   * mounted rider whose horse hauls is not, so their hands stay free.
   *
   * ⭐ Gates the WIELD half only. A cart in your hands does not stop you
   * pulling a hood up, and refusing the whole kit for it would be the
   * collapse of `wear` and `wield` costing a distinction that matters.
   */
  private handsHauling(
    item: Stuff,
    context: CommandContext,
    giver: Stuff,
  ): boolean {
    if (MixinApi.isWearable(item)) return false;
    if (!MixinApi.isHauling(giver) || !giver.isHitched()) return false;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`Your hands are full — you're pulling ${Mml.thing(giver.getHauledCart()!)}.`,
      )
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'hands-hauling',
      detail: 'hauling',
    });
    return true;
  }

  // ── the whole kit ────────────────────────────────────────────────

  /**
   * ⭐ The list arrives already sorted innermost-outward, and each pass
   * still asks `canEquip` afresh: a piece the sort could not place —
   * because of something ALREADY on when the command started — becomes
   * legal the moment its blocker is dealt with. The walk ends when a
   * pass achieves nothing, which is either "all on" or "the rest
   * genuinely cannot go on".
   */
  private async equipAll(
    pool: readonly Stuff[],
    context: CommandContext,
    giver: Stuff & Slotted,
  ): Promise<void> {
    const remaining = pool.filter((c) => this.equippable(c));
    if (remaining.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing to put on.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-to-equip',
        detail: 'no wearable or wieldable in reach',
      });
      return;
    }
    /*
     * ⚠⚠ SORT BY LAYER DEPTH FIRST, innermost outward.
     *
     * "The ladder sorts itself" was an appealing idea and it is WRONG:
     * asking `wouldLayerViolate` repeatedly only works if the low bands
     * happen to be tried first. Put plate on before a shirt and the
     * shirt can never go under it — there is no retry that recovers,
     * because nothing takes the plate back off. A drive of exactly that
     * (a cuirass sitting before a shirt in the pack) dressed the actor
     * in the cuirass alone and left the shirt behind, "won't go on over
     * what you have on", which is true and useless.
     *
     * So the walk is ordered by the same `getLayerDepth()` the ladder
     * itself reads, and `wouldLayerViolate` stays as the per-item gate
     * for what the sort cannot know (what is ALREADY on).
     */
    remaining.sort((a, b) => layerDepthOf(a) - layerDepthOf(b));
    this.dressNext(remaining, [], [], context, giver);
    return Promise.resolve();
  }

  /**
   * ⚠⚠ Layers CHAIN; they do not loop.
   *
   * Each layer is an engagement occupying `hands`, so starting the next
   * one before the last has landed is an `engagement-conflict` — a loop
   * that fires them back to back dresses you in exactly one garment and
   * reports the rest as "your hands are full". (Measured: it did.) The
   * next layer therefore starts from the previous one's COMPLETION, and
   * `execute` returns as soon as the first is under way, because a
   * command must not block for the minutes a hauberk takes.
   *
   * ⭐ The ladder still sorts itself: each pass asks `canEquip` afresh,
   * so a piece that was blocked becomes legal the moment the thing it
   * was waiting on is on.
   */
  private dressNext(
    remaining: Stuff[],
    worn: Stuff[],
    skipped: Array<[Stuff, SkipReason]>,
    context: CommandContext,
    giver: Stuff & Slotted,
  ): void {
    for (;;) {
      let next: Stuff | null = null;
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i]!;
        const hauling =
          !MixinApi.isWearable(item) &&
          MixinApi.isHauling(giver) &&
          giver.isHitched();
        const skip = hauling ? 'busy' : this.canEquip(item, giver);
        if (skip === null) {
          next = item;
          remaining.splice(i, 1);
          break;
        }
        // ⚠ `layer` is not a refusal yet — it may come good once
        // something else is on. Anything else never will.
        if (skip !== 'layer') {
          skipped.push([item, skip]);
          remaining.splice(i, 1);
          i--;
        }
      }
      if (next === null) {
        // Nothing legal remains: whatever is left is ladder-blocked.
        for (const item of remaining) skipped.push([item, 'layer']);
        remaining.length = 0;
        this.report(worn, skipped, context, giver);
        return;
      }
      const item = next;
      if (!MixinApi.isEngaged(giver)) {
        this.put(item, giver);
        worn.push(item);
        continue; // no clock in play — keep going inline
      }
      const step = new DressingStep({
        actor: giver,
        durationMs: donDurationMs(item),
        onComplete: () => {
          this.put(item, giver);
          worn.push(item);
          this.dressNext(remaining, worn, skipped, context, giver);
        },
        onAbort: () => {
          // ⭐ What went on stays on. The stack is just shorter, and the
          // report says what never got its turn.
          for (const left of remaining) skipped.push([left, 'busy']);
          remaining.length = 0;
          this.report(worn, skipped, context, giver);
        },
      });
      const result = SchedulerApi.start(step);
      if (result.ok && result.status === 'completed-sync') continue;
      if (result.ok) return; // the chain resumes at completion
      skipped.push([item, 'busy']);
      for (const left of remaining) skipped.push([left, 'busy']);
      remaining.length = 0;
      this.report(worn, skipped, context, giver);
      return;
    }
  }

  /**
   * ⚠ ONE scene for the whole act, and a second line for what was
   * passed over. Six pieces must not spam the room with six lines, and
   * a silent omission is worse than any refusal.
   */
  private report(
    worn: readonly Stuff[],
    skipped: ReadonlyArray<readonly [Stuff, SkipReason]>,
    context: CommandContext,
    giver: Stuff & Slotted,
  ): void {
    const names = worn.map((w) => w.getPresentation()).join(', ');
    const scene = MessageApi.scene(giver).topic(TOPIC);
    if (worn.length > 0) {
      scene
        .toSelf(Mml.compose`You dress: ${names}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} gets dressed.`);
    } else {
      scene.toSelf(Mml.compose`You put nothing on.`);
    }
    scene.send();

    /*
     * ⚠⚠ A skip is a CAVEAT, not a rejection. `equip` that got five of
     * six pieces on SUCCEEDED — and emitting `controller-rejected` for
     * the sixth would tell every consumer of the envelope that the act
     * failed. The line says what was left and why; the notes stay clean.
     * (This is the shipped `wear set` contract, which had it right: "a
     * partial dress is a success with a caveat".)
     */
    void context;
    for (const [item, reason] of skipped) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You leave ${Mml.thing(item)} — ${SKIP_PHRASE[reason]}.`,
        )
        .send();
    }
  }

  // ── one item ─────────────────────────────────────────────────────

  /** Is this something `equip` has any business touching? */
  private equippable(item: Stuff): boolean {
    return MixinApi.isWearable(item) || MixinApi.isWieldable(item);
  }

  /**
   * The gates, in the order the old `wear` applied them. Returns the
   * reason it cannot go on, or `null` when it can.
   */
  private canEquip(item: Stuff, giver: Stuff & Slotted): SkipReason | null {
    if (!this.equippable(item)) return 'no-slots';
    const plan = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!plan) return 'no-slots';
    const slots = MixinApi.isWearable(item)
      ? item.getSlotClaim(plan)
      : MixinApi.isWieldable(item)
        ? item.getSlotClaim(plan)
        : [];
    if (slots.length === 0) return 'no-slots';
    // ⚠ The impossible fit is a HARD refusal, independent of the ladder:
    // a coat cut for a halfling fails on a NUMBER, so a heavy human and
    // a light dragonborn shade into each other correctly.
    if (MixinApi.isWearable(item)) {
      const fit = item.fitOn(giver);
      const refuseAbove = dial(AppSettingKeys.textilesFitRefuseAbove, 0.35);
      if (fit.measurable && (fit.wrongBody || fit.distance > refuseAbove)) {
        return 'fit';
      }
      if (giver.wouldLayerViolate(item)) return 'layer';
    }
    for (const slot of slots) if (giver.isSlotFull(slot)) return 'slot-full';
    return null;
  }

  /** Claim the slots. Atomic via `occupyAll`. */
  private put(item: Stuff, giver: Stuff & Slotted): void {
    const plan = SpeciesApi.tryGetBodyPlanPath(giver) ?? '';
    const slots = (
      MixinApi.isWearable(item) || MixinApi.isWieldable(item)
        ? item.getSlotClaim(plan)
        : []
    ) as readonly string[];
    giver.occupyAll(item as Parameters<typeof giver.occupyAll>[0], [...slots]);
  }

  /**
   * ⚠ The single-item refusals keep the SHIPPED reason strings —
   * `fit-impossible`, `layer-order`, `wrong-fit`, and the `slot-occupied`
   * note kind. Those are envelope contract that consumers and tests read;
   * collapsing four verbs into one is no reason to rename the answers
   * they gave.
   */
  private refuseOne(
    item: Stuff,
    reason: SkipReason,
    context: CommandContext,
    giver: Stuff & Slotted,
  ): void {
    if (reason === 'slot-full') {
      const plan = SpeciesApi.tryGetBodyPlanPath(giver) ?? '';
      const slots =
        MixinApi.isWearable(item) || MixinApi.isWieldable(item)
          ? item.getSlotClaim(plan)
          : [];
      const full = slots.find((sl) => giver.isSlotFull(sl)) ?? 'slot';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Your ${full} is occupied.`)
        .send();
      context.note({
        kind: 'slot-occupied',
        host: MessageApi.refOf(giver),
        slot: full,
      });
      return;
    }
    const line =
      reason === 'fit'
        ? Mml.compose`${Mml.thing(item)} was not cut for a body like yours — it will not go on.`
        : reason === 'layer'
          ? Mml.compose`${Mml.thing(item)} won't go on over ${this.outermostInWay(item, giver)}.`
          : Mml.compose`${Mml.thing(item)} doesn't fit your body.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note({
      kind: 'controller-rejected',
      reason:
        reason === 'fit'
          ? 'fit-impossible'
          : reason === 'layer'
            ? 'layer-order'
            : 'wrong-fit',
      detail: item.getPresentation(),
    });
  }

  /**
   * What the ladder refusal NAMES — so the line says what is in the way
   * rather than just "no". Falls back to a bare phrase if the stack has
   * gone empty between the check and the read.
   */
  private outermostInWay(item: Stuff, giver: Stuff & Slotted): string {
    const outer = [...giver.wornStack()][0] as unknown as Stuff | undefined;
    void item;
    return outer && MixinApi.isPerceptible(outer)
      ? outer.getPresentation()
      : 'what you already have on';
  }

  // ── the engagement ───────────────────────────────────────────────

  /** Start a dressing step; the effect lands at ITS completion. */
  private engage(
    item: Stuff,
    context: CommandContext,
    giver: Stuff & Slotted,
    onComplete: () => void,
  ): Promise<void> {
    if (!MixinApi.isEngaged(giver)) {
      onComplete();
      return Promise.resolve();
    }
    const step = new DressingStep({
      actor: giver,
      durationMs: donDurationMs(item),
      onComplete,
    });
    const result = SchedulerApi.start(step);
    if (result.ok) {
      if (result.status !== 'completed-sync') context.note(result.note);
      return Promise.resolve();
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your hands are busy with something else.`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'busy',
      detail: item.getPresentation(),
    });
    return Promise.resolve();
  }

  // ── the pool ─────────────────────────────────────────────────────

  /**
   * What `equip` may reach. Inventory by default; `--from <container>`
   * pulls the goods out first, because a slot claim wants the thing in
   * your hands (`occupyAll` claims off the wearer's own contents).
   */
  private async pool(
    model: EquipModel,
    context: CommandContext,
    giver: Stuff & Slotted,
  ): Promise<readonly Stuff[] | null> {
    if (!MixinApi.isContainer(giver)) return [];
    const source = model.from?.stuff ?? null;
    if (source === null) return giver.getContents() as Stuff[];
    if (!MixinApi.isContainer(source)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't take anything out of ${Mml.thing(source)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-container',
        detail: source.getPresentation(),
      });
      return null;
    }
    // ⭐ Draw only what is being asked for: the named thing, or every
    // equippable in there for the bare form.
    const wanted = (source.getContents() as Stuff[]).filter((c) => {
      if (!this.equippable(c)) return false;
      if (!model.target?.stuff) return true;
      return c === model.target.stuff;
    });
    for (const item of wanted) {
      if (MixinApi.isContainable(item)) {
        ContainmentApi.move(
          item as Stuff & Containable,
          giver as unknown as Stuff & Container,
        );
      }
    }
    return giver.getContents() as Stuff[];
  }

  // ── saved sets (moved wholesale from `wear`) ──────────────────────

  private listSets(context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isWardrobe(giver)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You keep no sets.`)
        .send();
      return;
    }
    const names = giver.getWardrobeNames();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        names.length === 0
          ? Mml.compose`You have no saved sets.`
          : Mml.compose`Your sets: ${names.join(', ')}.`,
      )
      .send();
  }

  private async set(
    model: EquipModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const name = (model.name ?? '').trim();
    if (!MixinApi.isWardrobe(giver) || !MixinApi.isSlotted(giver)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't keep sets.`)
        .send();
      return;
    }
    if (name === '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Which set?`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-name', detail: '' });
      return;
    }
    if (model.save) {
      /*
       * ⭐ Captured in WEAR ORDER. `wornStack()` is outermost-first, so
       * reversing it gives innermost-first — exactly the order a replay
       * must dress in for the covering ladder never to refuse. (The
       * ladder walk below would sort it anyway; storing it right means
       * the saved set reads correctly to a human too.)
       */
      const keywords = [...giver.wornStack()]
        .reverse()
        .map((g) => {
          const asStuff = g as unknown as Stuff;
          return MixinApi.isPerceptible(asStuff)
            ? asStuff.getPrimaryKeyword()
            : undefined;
        })
        .filter((k): k is string => !!k);
      if (keywords.length === 0) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You aren't wearing anything to save.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'nothing-worn',
          detail: name,
        });
        return;
      }
      giver.setWardrobe(name, keywords);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Saved '${name}': ${keywords.join(', ')}.`)
        .send();
      return;
    }
    const keywords = giver.getWardrobe(name);
    if (keywords.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no set called '${name}'.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-set',
        detail: name,
      });
      return;
    }
    // A set is a list of KEYWORDS; equipping it is the ordinary
    // whole-kit walk over just those things, so the ladder sorts it the
    // same way and the skip report reads the same. Anything the set
    // names that you no longer have is simply not in the pool, and the
    // report says so.
    const pool = await this.pool(model, context, giver);
    if (pool === null) return;
    /*
     * ⚠ Matched on the PRIMARY keyword, which is what a set stores and
     * what the shipped `wear set` matched on. `hasKeyword` is wider and
     * looks like an improvement until two garments answer to the same
     * alias and a set starts putting on the wrong coat.
     *
     * ⭐ Ordered by the SET, not by the pool: a set is recorded
     * innermost-first, so replaying it in its own order is what makes
     * the ladder land the way it was saved.
     */
    const wanted: Stuff[] = [];
    for (const keyword of keywords) {
      const match = pool.find(
        (c) =>
          MixinApi.isPerceptible(c) &&
          c.getPrimaryKeyword() === keyword &&
          !wanted.includes(c),
      );
      if (match) wanted.push(match);
    }
    await this.equipAll(wanted, context, giver);
  }
}
