/**
 * AssembledSpinningTool — a spinning tool made of parts — a shaft through a whorl, held by friction (the drop spindle); pulled apart, both come away whole.
 *
 * ⭐ Its own class, not `AssembledMixin` on `SpinningTool`: the other SpinningTool rows
 * have no parts (`lint:bills` holds both directions).
 *
 * ⚠ A class's own `commandContributions` is read up the prototype chain,
 * so the mixin's (fit · repair · salvage) would SHADOW SpinningTool's own verbs
 * here — restated, the Blank/Billet pattern. The mixin's are collected
 * from the mixin chain regardless.
 */

import SpinningTool from './SpinningTool';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const AssembledSpinningToolBase = AssembledMixin(SpinningTool);

export default class AssembledSpinningTool extends AssembledSpinningToolBase {
  static commandContributions: CommandContributions = SpinningTool.commandContributions as CommandContributions;
}
