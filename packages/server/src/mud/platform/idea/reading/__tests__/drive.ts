/**
 * Dispatch a reading the way a player does — **through the verb**.
 *
 * ⭐⭐ `Reading.runMeasure` / `runAnalyze` are gated to the two
 * controllers, so a test that called a rung directly is denied. That is
 * deliberate, and this helper exists rather than a looser gate because
 * of the `Posed` lesson: `sit`, `stand`, `lie`, `kneel`, `mount` and
 * `dismount` all threw `controller-error` over the wire while their unit
 * suites were green, **because the suites called the mixin methods
 * directly**. A gate that fails closed fails silently, and only a real
 * dispatch walks the real gate.
 *
 * What is stubbed is exactly one thing: the channel LOOKUP. Standing the
 * roster up is `ReadingCatalogue`'s own test; everything below the
 * lookup here is the shipped path, gate included.
 */

import { vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { InstrumentApi } from '../../../../api/instrument';
import MeasureController from '../../cmd/perception/MeasureController';
import AnalyzeController from '../../cmd/perception/AnalyzeController';
import type Reading from '../../../../lib/instrument/Reading';
import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';

export interface DriveOptions {
  /** What the player named, if anything. */
  subject?: MqlOneResult;
  /** Everything tool-shaped in reach; the Reading narrows by capability. */
  tools?: Stuff[];
  /** The channel token, for the refusal text. Defaults to the row's. */
  channel?: string;
}

/** `measure <channel> …` — the instrumented rung, through the verb. */
export async function driveMeasure(
  reading: Reading,
  context: CommandContext,
  opts: DriveOptions = {},
): Promise<void> {
  vi.spyOn(InstrumentApi, 'reading').mockResolvedValue(reading);
  const ctrl = await StuffApi.create(() => new MeasureController());
  await ctrl.execute(
    {
      channel: opts.channel ?? reading.getChannel(),
      subject: opts.subject,
      tool: { stuff: opts.tools ?? [] },
    } as never,
    context,
  );
}

/** `analyze <channel> …` — the trained-eye rung, through the verb. */
export async function driveAnalyze(
  reading: Reading,
  context: CommandContext,
  opts: DriveOptions = {},
): Promise<void> {
  vi.spyOn(InstrumentApi, 'reading').mockResolvedValue(reading);
  const ctrl = await StuffApi.create(() => new AnalyzeController());
  await ctrl.execute(
    {
      channel: opts.channel ?? reading.getChannel(),
      subject: opts.subject,
      tool: { stuff: opts.tools ?? [] },
    } as never,
    context,
  );
}

/**
 * A plain instrument declaring one capability — what the binder hands a
 * Reading now that an instrument is an ARGUMENT rather than a class the
 * controller hunts for.
 */
export async function instrumentWith(
  capability: string,
  opts: { grade?: string; condition?: number } = {},
): Promise<Stuff> {
  const ToolItem = (await import('../../../thing/ToolItem')).default;
  const tool = await StuffApi.create(() => new ToolItem());
  tool.setCapabilities([capability]);
  // ⭐ The grade/condition pair IS the instrument's ceiling — a fine dial
  // in an untrained hand still reads coarsely, and a worn one caps an
  // expert. The tests that prove `min` set both.
  const graded = tool as unknown as {
    setGradeBand(v: string): void;
    setCondition(v: number): void;
  };
  if (opts.grade !== undefined) graded.setGradeBand(opts.grade);
  if (opts.condition !== undefined) graded.setCondition(opts.condition);
  return tool as unknown as Stuff;
}
