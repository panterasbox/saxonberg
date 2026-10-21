/**
 * TypecheckController — type-check one source file without reloading it.
 *
 * The check half of `reload`: the same target resolution, the same
 * out-of-process `DiagnosticApi.typecheck`, and the same verdict, but it
 * waits for the answer and swaps nothing in.
 */

import type { CommandContext } from '../../../../api/command';
import ReloadController, { type ReloadModel } from './ReloadController';

export default class TypecheckController extends ReloadController {
  override async execute(
    model: ReloadModel,
    context: CommandContext,
  ): Promise<void> {
    const path = this.resolveTarget(model, context);
    if (path === null) return;
    const checked = await this.check(context, path);
    if (checked === null) return;
    this.tell(context, `\n${this.verdict(checked)}\n`);
  }

  protected override verb(): string {
    return 'typecheck';
  }
}
