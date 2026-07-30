/**
 * Whetstone — the personal-capital exemplar: a carried `ToolItem` whose
 * `whetstone` capability backs the `sharpen` ritual (the working-surface
 * maintenance tier — cheap, frequent, owner-performed, anywhere). Composes
 * {@link AudibleMixin} so the rasp of stone on steel is *heard* — the room
 * shares the ritual. Wears with use like any durable tool; sold at the
 * general store.
 */

import ToolItem from './ToolItem';
import { AudibleMixin } from '../perception/Audible';
import type { CommandContributions } from '../../api/command';

const WhetstoneBase = AudibleMixin(ToolItem);

export default class Whetstone extends WhetstoneBase {
  /** The defining capability default — authored seeds may extend it. */
  public override capabilities: string[] = ['whetstone'];

  /**
   * The carried-affordance source: `sharpen` lights up for whoever
   * carries the stone — personal capital, no venue (the ritual works at
   * a campfire as well as a smithy).
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: [],
    inventory: ['crafting/sharpen.yaml'],
    peers: [],
  };
}
