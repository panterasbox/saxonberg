/**
 * DmController — send a direct message (dm) to another player.
 *
 * Thin shim: validates the framework-resolved target, narrows the
 * speaker to `Aether`-capable, and delegates to `aether.tell(target,
 * text)`. All composition (chat-form bodies, markdown parsing,
 * mention resolution, audience routing, payload) lives on
 * `AetherMixin` — same pattern as `SayController` delegating to
 * `VocalMixin.say`.
 *
 * Target resolution is handled by the command framework via the
 * YAML's `scope: "online"` + `mustBeAgent` validator — no custom
 * lookup in the controller. Self-dm works because self is in the
 * `online` candidate pool and `mustBeAgent` accepts Avatars.
 *
 * Renamed from `TellController` — the verb is `dm` now, with `tell`
 * (and `whisper`) kept as aliases for muscle memory.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  FieldValue,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';

interface DmModel extends CommandModel {
  target: FieldValue;
  message: string;
}

export class DmController extends CommandController<DmModel> {
  execute(model: DmModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isAether(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.speech.dm')
        .toSelf(Mml.compose`You have no way to send a thought.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'AetherMixin' });
      return;
    }

    const stuffs = MqlApi.extractStuffs(model.target);
    if (!stuffs || stuffs.length === 0) {
      context.note({ kind: 'empty-result', field: 'target', query: '' });
      return;
    }
    const target = stuffs[0] as Stuff;

    speaker.tell(target, model.message);
  }
}
