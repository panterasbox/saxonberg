/**
 * AppsControllerBase — the shared half of the `apps` verb (aether-devices
 * D3): which device the act is on, and the one way a refusal is said.
 *
 * The device is the one named (`on <device>`), else the device that
 * afforded the verb (`commandSource` — a host hands `apps` outward to
 * whoever bears it). A person's own host is never that source, and a
 * host that is not a device (a mount's rider) is answered *nothing to act
 * on*. The host decides everything after that; these controllers render.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { AetherHost } from '../../../../lib/augmentation/AetherHost';

export interface AppsModel extends CommandModel {
  app?: string;
  device?: MqlOneResult;
}

export abstract class AppsControllerBase extends CommandController<AppsModel> {
  /** The device this `apps` act is on, or `null` (already said why). */
  protected deviceFor(
    model: AppsModel,
    context: CommandContext,
  ): (Stuff & AetherHost) | null {
    const named = model.device?.stuff;
    const candidate = named ?? context.commandSource;
    if (
      candidate &&
      MixinApi.isAetherHost(candidate) &&
      MixinApi.isAugment(candidate)
    ) {
      return candidate;
    }
    this.say(context, 'You carry nothing that runs apps.', 'no-device');
    return null;
  }

  /** The name a player reads for the app at `path` on `host`. */
  protected nameOf(host: Stuff & AetherHost, path: string): string {
    const running = host.getHostedApps().find((a) => a.getTemplatePath() === path);
    return running ? running.getAppName() : path.slice(path.lastIndexOf('/') + 1);
  }

  /** Say a line to the actor; a refusal also notes why. */
  protected say(context: CommandContext, line: string, refusal?: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.fromMarkup(`\n${line}\n`))
      .send();
    if (refusal) {
      context.note({ kind: 'controller-rejected', reason: refusal, detail: line });
    }
  }

  /** `the phone`, `the aether implant` — how the device is named in a line. */
  protected deviceName(device: Stuff): string {
    return Mml.actor(device).toString();
  }
}
