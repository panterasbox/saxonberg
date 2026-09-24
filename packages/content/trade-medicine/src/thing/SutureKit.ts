/**
 * SutureKit — the carried instrument behind `suture` (D8). A needle and
 * linen thread; the `suture` view asks for its `suture` capability.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SutureKitBase = AudibleMixin(ToolItem);

export default class SutureKit extends SutureKitBase {
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/suture.yaml'],
  };

  public override capabilities: string[] = ['suture'];
}
