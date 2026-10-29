/**
 * `shape` is dumb (ceramics D14): the instrument plans, else the material
 * plans by hand; `shape bottle` (no `into`) reads its one word as the form —
 * the glassblower's line, word for word.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ShapeController from '../ShapeController';
import Good from '../../../../../lib/stuff/Good';
import { Mml } from '../../../../../api/mml';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { ShapeableMixin } from '../../../../../lib/craft/Shapeable';
import type { ShapeRequest } from '../../../../../lib/craft/Shapeable';
import { FormingMixin } from '../../../../../lib/craft/Forming';
import type { FormableClass, FormingHand } from '../../../../../lib/craft/Forming';
import type { CommandContext } from '../../../../../api/command';
import { TestActor, standUpBranchHarness, makeContext } from './branch-fixtures';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';

class Pipe extends FormingMixin(Good) {
  public seen: ShapeRequest | null = null;
  public override async shapePlanFor(req: ShapeRequest) {
    this.seen = req;
    return { ok: true as const, durationMs: 1, effortW: 1, beginSelf: Mml.compose`go`, onComplete: () => {} };
  }
}
/** An instrument with nothing to say — the default plan, `null`. */
class Idle extends FormingMixin(Good) {}
/** A plastic mass, for an instrument that declares no form classes. */
class Putty extends Good {
  // Never reached: the class check refuses before the hand is read.
  public async formingHand(): Promise<FormingHand> {
    throw new Error('the hand was read');
  }
  public refuseBeyond(): never {
    throw new Error('the hand was read');
  }
}
/** ⭐ B102: works a mass, and declares no classes — the kernel lends none. */
class Undeclared extends FormingMixin(Good) {
  protected override formingMassClass(): FormableClass {
    return Putty;
  }
  public override async shapePlanFor(req: ShapeRequest) {
    const t = await this.resolveForming(req);
    return t === null || !('mass' in t) ? t : null;
  }
}
class Lump extends ShapeableMixin(Good) {
  public asked = false;
  public override async shapePlanFor() {
    this.asked = true;
    return { ok: false as const, reason: 'too-dry', line: Mml.compose`too dry` };
  }
}

let actor: TestActor;
let room: TestActor;

beforeEach(async () => {
  await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  actor = makeStuff(() => new TestActor());
});
afterEach(() => vi.restoreAllMocks());

async function shape(model: Record<string, unknown>): Promise<CommandContext> {
  const ctx = makeContext(actor, room, 'shape');
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    await makeStuff(() => new ShapeController()).execute(model as never, ctx);
  });
  return ctx;
}

const declined = (c: CommandContext) =>
  c.getNotes().find((n) => n.kind === 'controller-rejected')?.reason;

describe('shape asks; it never decides', () => {
  it('⭐ `shape bottle`: the bare word is the FORM, and the pipe plans it', async () => {
    const pipe = makeStuff(() => new Pipe());
    await shape({ material: { stuff: null, raw: 'bottle' }, instrument: { stuff: [pipe] } });
    expect(pipe.seen?.formText).toBe('bottle');
    expect(pipe.seen?.material).toBeNull();
  });

  it('an instrument with nothing to say passes; the material plans by hand', async () => {
    const lump = makeStuff(() => new Lump());
    const ctx = await shape({
      material: { stuff: lump, raw: 'clay' },
      instrument: { stuff: [makeStuff(() => new Idle())] },
      form: 'open vessel holding 2 pints',
    });
    expect(lump.asked).toBe(true);
    expect(declined(ctx)).toBe('too-dry');
  });

  it('nothing to shape and nothing to shape it on is refused in words', async () => {
    expect(declined(await shape({ form: 'mug' }))).toBe('nothing-to-shape');
  });

  it('⭐ an instrument that declares no form classes makes no shape (B102)', async () => {
    const putty = makeStuff(() => new Putty());
    const ctx = await shape({
      material: { stuff: putty, raw: 'putty' },
      instrument: { stuff: [makeStuff(() => new Undeclared())] },
      form: 'open vessel holding 2 pints',
    });
    expect(declined(ctx)).toBe('wrong-instrument');
  });
});
