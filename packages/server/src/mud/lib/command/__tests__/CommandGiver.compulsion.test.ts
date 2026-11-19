/**
 * ⭐⭐ The compulsion gate (call-security pass W4, D8–D11, D14): a command
 * one body's code asks another body to run is refused unless the verb may
 * be asked with consent on BOTH keys (the view's `compellable: consent`, the
 * controller class's `static compellable`), and then the body's own player
 * is asked. A body's own act — its player, its brain, its own reflex, the
 * system — is never gated.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandDefinition } from '../CommandDefinition';
import { CommandController } from '../CommandController';
import { ExecutionContextApi } from '../../../api/execution-context';
import { TestHarnessApi } from '../../../api/test-harness';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ProxyApi } from '../../../api/proxy';
import { DiagnosticApi } from '../../../api/diagnostics';
import { Refusal } from '../../errors';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance } from '../CommandGiver';

class NeverCtl extends CommandController {
  async execute(): Promise<void> {}
}
class AgreeingCtl extends CommandController {
  static override compellable = true;
  async execute(): Promise<void> {}
}
class Asker extends Idea {}

const view = async (yaml: string): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(yaml, '<test>');
  await CommandApi.resolveValidators(def);
  return def;
};

describe('the compulsion gate', () => {
  let world: MqlWorld;
  let giver: Stuff & { executeCommand(t: string): Promise<void>; forceCommand(t: string): Promise<void> };
  let asker: Stuff;
  let ran: string[];
  let prompt: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    world = makeWorld();
    giver = world.giver as never;
    asker = makeStuff(() => new Asker());
    ran = [];
    const chatter = await view(`
verbs: [chatter]
controller: /test/NeverCtl
description: speech, never compellable
args:
  - name: text
    type: string
    greedy: true
`);
    const buyit = await view(`
verbs: [buyit]
controller: /test/AgreeingCtl
compellable: consent
description: a purchase, compellable with consent
args:
  - name: what
    type: string
    greedy: true
`);
    const sham = await view(`
verbs: [sham]
controller: /test/NeverCtl
compellable: consent
description: a view that says consent over a class that does not
args:
  - name: what
    type: string
    greedy: true
`);
    const g = giver as unknown as { getAffordances(): Affordance[]; _runChain(...a: unknown[]): Promise<unknown> };
    vi.spyOn(g, 'getAffordances').mockReturnValue(
      [chatter, buyit, sham].map((command) => ({ command, source: giver, bucket: 'self' }) as Affordance),
    );
    vi.spyOn(g, '_runChain').mockImplementation(async (parsed: unknown, outer: unknown) => {
      ran.push((parsed as { verb: string }).verb);
      return outer;
    });
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) =>
      makeStuff(() => (path.endsWith('AgreeingCtl') ? new AgreeingCtl() : new NeverCtl()))) as never);
    vi.spyOn(StuffApi, 'destruct').mockResolvedValue(undefined as never);
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
    prompt = vi.fn().mockResolvedValue(true);
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((x: unknown) => x === giver) as never);
    (ProxyApi.unwrap(giver) as unknown as { getInteractives(): Set<unknown> }).getInteractives = () =>
      new Set([{ promptConfirm: prompt }]);
  });
  afterEach(() => vi.restoreAllMocks());

  const compel = (line: string, by: Stuff = asker): Promise<void> =>
    TestHarnessApi.actAs(by, () => giver.forceCommand(line));

  it("a body's own line is never gated, and never prompts", async () => {
    await TestHarnessApi.actAs(giver, () => giver.executeCommand('chatter hello'));
    expect(ran).toEqual(['chatter']);
    expect(prompt).not.toHaveBeenCalled();
  });

  it("⭐ the body's own reflex inside somebody else's act is its own (an arrival look)", async () => {
    await TestHarnessApi.actAs(asker, () =>
      ExecutionContextApi.run(asker, giver, 'autoLookOnArrival', undefined, () => giver.forceCommand('chatter look')),
    );
    expect(ran).toEqual(['chatter']);
  });

  it('the system acting is never compulsion', async () => {
    await ExecutionContextApi.runAsSystem('residency', () => giver.forceCommand('chatter tidy'));
    expect(ran).toEqual(['chatter']);
  });

  it('⛔ a never-verb compelled is refused — no prompt, nothing runs', async () => {
    await expect(compel('chatter hello')).rejects.toMatchObject({ reason: 'not-compellable' });
    expect(ran).toEqual([]);
    expect(prompt).not.toHaveBeenCalled();
    expect(DiagnosticApi.record).toHaveBeenCalledWith(expect.objectContaining({ channel: 'call-security' }));
  });

  it("⭐ a consent verb asks the body's own player, worded from the line; yes runs it as the body", async () => {
    await compel('buyit lot 4');
    expect(prompt).toHaveBeenCalledWith(expect.stringMatching(/would have you run `buyit lot 4`\. Let them\?/), 'no');
    expect(ran).toEqual(['buyit']);
  });

  it('no is `compel-declined`, and nothing runs', async () => {
    prompt.mockResolvedValue(false);
    await expect(compel('buyit lot 4')).rejects.toMatchObject({ reason: 'compel-declined' });
    expect(ran).toEqual([]);
  });

  it('a prompt that ends unanswered is a no', async () => {
    prompt.mockRejectedValue(new Error('disconnected'));
    await expect(compel('buyit lot 4')).rejects.toMatchObject({ reason: 'compel-declined' });
  });

  it('nobody at the body to ask is `cannot-consent`', async () => {
    (ProxyApi.unwrap(giver) as unknown as { getInteractives(): Set<unknown> }).getInteractives = () => new Set();
    await expect(compel('buyit lot 4')).rejects.toMatchObject({ reason: 'cannot-consent' });
    expect(ran).toEqual([]);
  });

  it('⭐ a view saying consent over a class that does not agree is refused (D11)', async () => {
    await expect(compel('sham it')).rejects.toMatchObject({ reason: 'not-compellable' });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('code with nobody acting never compels', async () => {
    await expect(
      ExecutionContextApi.runRoot(null, 'timer', () => giver.forceCommand('buyit lot 4')),
    ).rejects.toBeInstanceOf(Refusal);
    expect(prompt).not.toHaveBeenCalled();
  });

  it('sandboxed code (an eval, a circle) never compels, even a consent verb (D14)', async () => {
    const acting = TestHarnessApi.actAs(asker, () => ExecutionContextApi.captureActor());
    await expect(
      ExecutionContextApi.runRoot(
        null,
        'sandbox.runGoverned',
        async () => ExecutionContextApi.runAsCaptured(acting, () => giver.forceCommand('buyit lot 4')),
        { jurisdictionBound: '/home/asker' },
      ),
      // The sandbox boundary refuses a body outside the extent first; the
      // gate is the second wall for one inside it.
    ).rejects.toThrow();
    expect(prompt).not.toHaveBeenCalled();
  });

  it("an executeCommand call (not forceCommand) from another body's code is gated too", async () => {
    await expect(TestHarnessApi.actAs(asker, () => giver.executeCommand('chatter hello'))).rejects.toMatchObject({
      reason: 'not-compellable',
    });
  });
});
