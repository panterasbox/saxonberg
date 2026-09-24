/**
 * Syringe — the carried instrument behind `bleed` / `transfuse` / `test`
 * (blood build D5). The `SurgicalKit` shape: a `ToolItem` whose
 * `phlebotomy` capability those views ask for by name, contributed
 * outward to whoever carries it.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SyringeBase = AudibleMixin(ToolItem);

export default class Syringe extends SyringeBase {
  static commandContributions: CommandContributions = {
    environment: [
      'trade/medicine/cmd/medical/bleed.yaml',
      'trade/medicine/cmd/medical/transfuse.yaml',
      'trade/medicine/cmd/medical/test.yaml',
    ],
  };

  public override capabilities: string[] = ['phlebotomy'];
}
