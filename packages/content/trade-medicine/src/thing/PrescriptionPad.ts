/**
 * PrescriptionPad — the doctor's instrument behind `prescribe` (D9). The
 * `prescribe` view asks for its `prescribing` capability.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const PrescriptionPadBase = AudibleMixin(Tool);

export default class PrescriptionPad extends PrescriptionPadBase {
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/prescribe.yaml'],
  };

  public override capabilities: string[] = ['prescribing'];
}
