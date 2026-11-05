/**
 * Brush — the tool that affords `paint` (paint build D9).
 *
 * ⭐ A verb affordance is a static on a CLASS (a row's
 * `commandContributions:` is dead silently), so the brush is a kernel
 * class: whoever holds one can paint. What a brush IS — its bristles, its
 * handle, the glue between them — is its row's (an assembly the painting
 * trade ships). Its `capabilities` (`painting`) come from the row, as any
 * tool's do; `paint`'s brush argument binds `[capability.painting]`.
 */

import Tool from './Tool';
import type { CommandContributions } from '../../api/command';

export default class Brush extends Tool {
  static commandContributions: CommandContributions = {
    self: [],
    peers: [],
    environment: ['platform/cmd/crafting/paint.yaml'],
  };
}
