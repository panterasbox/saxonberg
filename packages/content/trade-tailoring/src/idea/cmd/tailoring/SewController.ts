/**
 * SewController — `sew`, the assembly step, and where a garment becomes
 * a **real object**.
 *
 * The output is a `Garment` carrying a material, a construction form, a
 * mass, a grade, a maker's mark and — when the pieces were cut for
 * somebody — a `cutTo` stamp. Everything downstream (insulation, the
 * covering stack, wear, dye, fit) then works on it because it is a
 * physical thing, not because sewing did anything special.
 *
 * ## ⭐ The maker's prose — you buy the look by buying the object
 *
 * The maker's authored `DetailedMixin` prose is routed onto the
 * instance through the `recordAuthoring` gate, so a coat by a
 * particular tailor *looks like theirs* to whoever is wearing it in
 * front of you. That is the customization product: not a cosmetic
 * layer minted from nothing, but a fact about a made object that
 * travels with it.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

const TOPIC = 'act.deed';

/** What a pattern makes. ⚠ A pattern is a RECIPE; these are its rows. */
const PATTERNS: ReadonlyMap<string, string> = new Map([
  ['shirt', '/trade/tailoring/thing/shirt'],
  ['trousers', '/trade/tailoring/thing/trousers'],
  ['coat', '/trade/tailoring/thing/coat'],
  ['apron', '/trade/tailoring/thing/apron'],
]);

interface SewModel extends CommandModel {
  pieces: MqlOneResult;
  pattern?: string;
}

export default class SewController extends ManualBuildController<SewModel> {
  static readonly BASE_MS_KEY = 'tailoring.sew.baseMs';
  static readonly BASE_MS = 90 * 60 * 1000;

  execute(model: SewModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const pieces = model.pieces?.stuff ?? null;
    if (!pieces || !MixinApi.isWearable(pieces)) {
      this.declineStep(context, Mml.compose`Sew what?`, 'no-pieces');
      return;
    }
    const pattern = (model.pattern ?? 'shirt').trim().toLowerCase();
    const row = PATTERNS.get(pattern);
    if (!row) {
      this.declineStep(
        context,
        Mml.compose`There is no pattern for '${pattern}'. There are ${[...PATTERNS.keys()].join(', ')}.`,
        'unknown-pattern',
      );
      return;
    }

    const instrument = this.findCapability(giver, 'mending');
    const durationMs = this.paceMs(
      dial(SewController.BASE_MS_KEY, SewController.BASE_MS),
      instrument as Stuff | null,
      ['mending'],
    );

    this.engageStep(context, {
      durationMs,
      beginSelf: Mml.compose`You thread a needle and begin putting ${Mml.thing(pieces)} together.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} settles down to sew.`,
      onComplete: () => {
        void finish(context, pieces, row, pattern);
      },
    });
  }
}

async function finish(
  context: CommandContext,
  pieces: Stuff,
  row: string,
  pattern: string,
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ A module function — the controller is destructed by now.
  const watching = !giver.isDestroyed();
  try {
    const garment = await StuffApi.clone<Stuff>(row);

    // Everything the pieces knew travels: the cloth's material and
    // form, its grade, and the measurements it was cut to.
    if (MixinApi.isTangible(garment) && MixinApi.isTangible(pieces)) {
      const mat = pieces.getMaterial();
      if (mat) garment.setMaterial(mat);
    }
    if (MixinApi.isConstructed(garment) && MixinApi.isConstructed(pieces)) {
      const form = pieces.getConstructionForm();
      if (form) garment.setConstructionForm(form);
    }
    if (MixinApi.isWearable(garment) && MixinApi.isWearable(pieces)) {
      const cut = pieces.getCutTo();
      if (cut.bodyPlanPath) {
        garment.setCutTo(cut.bodyPlanPath, cut.statureM, cut.girthIndex);
      }
    }
    const allowance =
      (pieces as unknown as { getSeamAllowance?(): number }).getSeamAllowance?.() ?? 0;
    (garment as unknown as { setSeamAllowance?(n: number): void }).setSeamAllowance?.(
      allowance,
    );

    // ⭐ The maker's mark. The maker is NEVER a parameter — it derives
    // from who is acting, through the authoring context.
    const maker =
      (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? giver;
    if (MixinApi.isCrafted(garment)) {
      garment.stamp({
        maker: maker.getTemplatePath() ?? '',
        grade: Grade.of(
          MixinApi.isGraded(pieces) ? pieces.getGradeBand() : 'fair',
        ),
        recipe: row,
        craftedAt: Math.floor(WorldClockApi.getNow().rawValue()),
      });
    }

    if (MixinApi.isContainable(garment) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(
        garment as Stuff & Containable,
        giver as Stuff & Container,
      );
    }
    StuffApi.destruct(pieces);

    if (!watching) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You finish ${Mml.thing(garment)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} finishes a ${pattern}.`)
      .send();
  } catch (err) {
    console.warn(`SewController: could not mint '${row}':`, err);
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
