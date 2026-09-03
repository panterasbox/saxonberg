/**
 * SurveyInstrument — a handheld surveying instrument.
 *
 * ⭐ **One class, and the venue names the instruments.** A surveyor's
 * compass and a miner's dial differ in accuracy and in what they cost,
 * not in code, so they are two rows on this one class — the same shape
 * the four room type rows take. A second mine that wants a theodolite
 * writes a row.
 *
 * It contributes the whole `measure` view (the `Sextant` shape): an
 * instrument lights the verb up by being in reach, and each channel's
 * controller checks for the capability it actually needs. That is why
 * `measure strike` says *"you need a surveyor's instrument"* rather than
 * simply not existing — the failure is legible.
 *
 * ⚠ `surveying` is an open `ToolCapability` string; the kernel keeps no
 * list of them, and a capability entry names no verbs.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class SurveyInstrument extends ToolItem {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/perception/measure.yaml'],
    peers: ['platform/cmd/perception/measure.yaml'],
  };

  constructor() {
    super();
    this.capabilities = ['surveying'];
  }
}
