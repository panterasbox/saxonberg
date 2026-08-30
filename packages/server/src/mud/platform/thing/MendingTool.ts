/**
 * MendingTool — a tool whose work is mending: it affords `repair` and
 * `salvage`. The general store's sewing kit and sewing machine are rows
 * over it, differing only in `rate` and `control`, which is exactly the
 * kind of variation that belongs in a row.
 *
 * It sits in the platform tree because `repair` and `salvage` are
 * PLATFORM crafting verbs — a platform class naming platform views. A
 * trade's own steps live with that trade's classes, so a pack can never
 * need this file edited.
 */

import ToolItem from './ToolItem';
import type { CommandContributions } from '../../api/command';

const MENDING = [
  'platform/cmd/crafting/repair.yaml',
  'platform/cmd/crafting/salvage.yaml',
];

export default class MendingTool extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: MENDING,
    peers: MENDING,
  };
}
