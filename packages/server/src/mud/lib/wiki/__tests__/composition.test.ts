/**
 * `<composition>` — the live architecture panel.
 *
 * Gates acceptance criteria **12** (⭐ renders a subject's live mixin
 * architecture, and CHANGES when the subject's composition changes,
 * with no edit to the page), **27** (⭐ a `spoiler`-declared field is
 * gated in a derived panel exactly as tagged prose is — asserted on a
 * REAL render, not on a tag scan) and **65** (a dangling subject
 * renders a note, and the page still renders).
 *
 * Criterion 28's enumerating audit is its own file
 * (`wiki-spoiler-fields.snapshot.test.ts`) — a snapshot belongs apart
 * from behavioural assertions, because its failures mean something
 * completely different: "review this diff", not "this broke".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { component as composition } from '../components/composition';
import WikiRenderer from '../../../obj/WikiRenderer';
import { Idea } from '../../stuff/Idea';
import { Template } from '../../stuff/Template';
import { AccessApi } from '../../../api/access';
import { AppApi } from '../../../api/app';
import { CommandApi } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { ShellApi } from '../../../api/shell';
import { StuffApi } from '../../../api/stuff';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ProxyApi } from '../../../api/proxy';
import { makeStuff } from '../../security/__tests__/test-setup';
import { RenderBudget } from '../RenderBudget';
import { SpoilerLevels, type ComponentContext } from '../render';
import type { FieldMeta } from '../../mixin';
import type { MmlNode } from '../../../api/mml';
import type { Stuff } from '../../stuff/Stuff';

class Principal extends Idea {}

/**
 * A subject with an ordinary field and a **spoilery** one.
 *
 * `fireVulnerability` is exactly the case D9 was written for: a
 * creature's weakness, which is a spoiler wherever it surfaces —
 * whereas its mass is not.
 */
class Mimic extends Idea {
  static fieldMeta: FieldMeta = {
    mass: { persistent: true },
    fireVulnerability: { persistent: true, spoiler: 3 },
  };
  mass = 40;
  fireVulnerability = 'catastrophic';
}

/** The same shape with nothing declared spoilery. */
class Oak extends Idea {
  static fieldMeta: FieldMeta = {
    density: { persistent: true },
    hardness: { persistent: true },
  };
  density = 0.75;
  hardness = 1360;
}

const ctx: ComponentContext = { budget: new RenderBudget() };

/** Render the component directly and flatten to a searchable string. */
async function panel(props: Record<string, string>): Promise<string> {
  const nodes = await composition.render(props, [], ctx);
  return JSON.stringify(nodes);
}

/** A fake Template row. */
function template(path: string, classPath: string): Template {
  return { path, class: classPath } as unknown as Template;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ the template panel — what is this thing made of (12)', () => {
  beforeEach(() => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      template('/obj/material/oak', '/obj/Oak'),
    );
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(Oak as never);
  });

  it('names the class and the composed mixins', async () => {
    const out = await panel({ kind: 'template', of: '/obj/material/oak' });
    expect(out).toContain('/obj/Oak');
    expect(out).toContain('composes');
  });

  it('lists every declared field', async () => {
    const out = await panel({ kind: 'template', of: '/obj/material/oak' });
    expect(out).toContain('density');
    expect(out).toContain('hardness');
  });

  it('summarises what each declaration says about a field', async () => {
    const out = await panel({ kind: 'template', of: '/obj/material/oak' });
    expect(out).toContain('persistent');
  });

  it('⭐ CHANGES when the subject changes, with no edit to the page', async () => {
    // Criterion 12. The panel is derived at read time, so it cannot go
    // stale — which is the whole reason the wiki carries one at all.
    const before = await panel({ kind: 'template', of: '/obj/material/oak' });
    expect(before).not.toContain('flammable');

    class OakV2 extends Idea {
      static fieldMeta: FieldMeta = {
        density: { persistent: true },
        hardness: { persistent: true },
        flammable: { persistent: true },
      };
    }
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(OakV2 as never);

    const after = await panel({ kind: 'template', of: '/obj/material/oak' });
    expect(after).toContain('flammable');
  });

  it('infers the kind from a `/`-rooted reference', async () => {
    const out = await panel({ of: '/obj/material/oak' });
    expect(out).toContain('density');
  });
});

describe('a dangling subject still renders (65)', () => {
  it('a missing template is a NOTE, not a failure', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    const out = await panel({ kind: 'template', of: '/obj/material/gone' });
    expect(out).toContain('no template');
    expect(out).toContain('renamed or removed');
  });

  it('a template with no class is a note', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      template('/obj/x', ''),
    );
    expect(await panel({ of: '/obj/x' })).toContain('declares no class');
  });

  it('a class that will not load is a note, not a throw', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      template('/obj/x', '/obj/Missing'),
    );
    vi.spyOn(StuffApi, 'loadClassByPath').mockRejectedValue(
      new Error('not found'),
    );
    expect(await panel({ of: '/obj/x' })).toContain('will not load');
  });

  it('refuses an unknown kind, naming the three', async () => {
    const out = await panel({ kind: 'nonsense', of: 'x' });
    expect(out).toContain('template');
    expect(out).toContain('mixin');
    expect(out).toContain('command');
  });

  it('refuses an empty subject', async () => {
    expect(await panel({ kind: 'template', of: '' })).toContain('needs an');
  });
});

describe('⭐ the mixin panel and its INVERSE', () => {
  class Torch extends Idea {}
  class Log extends Idea {}
  class Rock extends Idea {}

  beforeEach(() => {
    vi.spyOn(Template, 'findDescendants').mockResolvedValue([
      template('/obj/Torch', '/obj/Torch'),
      template('/obj/Log', '/obj/Log'),
      template('/obj/Rock', '/obj/Rock'),
    ]);
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async (p: string) =>
        (p === '/obj/Torch' ? Torch : p === '/obj/Log' ? Log : Rock) as never,
    );
    vi.spyOn(MixinApi, 'queryMixins').mockImplementation((ctor) =>
      ctor === Torch || ctor === Log
        ? ([{ _mixinName: 'CombustibleMixin' }] as never)
        : [],
    );
  });

  it('⭐ answers "what in this world can burn" — the question no template can', async () => {
    // A template page asks what oak composes; a mixin page asks what
    // composes Combustible. The inverse is the labour-facing view, and
    // it is a thing the wiki can do that a help page cannot.
    const out = await panel({ kind: 'mixin', of: 'CombustibleMixin' });
    expect(out).toContain('/obj/Torch');
    expect(out).toContain('/obj/Log');
    expect(out).not.toContain('/obj/Rock');
  });

  it('says so when nothing composes it', async () => {
    const out = await panel({ kind: 'mixin', of: 'NobodyHasThisMixin' });
    expect(out).toContain('nothing yet');
  });

  it('infers the kind from a `*Mixin` name', async () => {
    const out = await panel({ of: 'CombustibleMixin' });
    expect(out).toContain('/obj/Torch');
  });

  it('scans the WORLD, not the source tree', async () => {
    // The question is what in this world can burn, not what classes
    // exist. A class nothing instantiates is not part of the answer.
    const spy = vi.mocked(Template.findDescendants);
    await panel({ kind: 'mixin', of: 'CombustibleMixin' });
    expect(spy).toHaveBeenCalledWith('/obj');
  });

  it('⚠ reports truncation rather than lying about completeness', async () => {
    // "These twelve things" when it means "the first twelve I looked
    // at" is worse than refusing.
    const many = Array.from({ length: 500 }, (_, i) =>
      template(`/obj/T${i}`, `/obj/T${i}`),
    );
    vi.spyOn(Template, 'findDescendants').mockResolvedValue(many);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(Torch as never);
    const out = await panel({ kind: 'mixin', of: 'CombustibleMixin' });
    expect(out).toContain('truncated');
  });
});

describe('the command panel — what can I type, and what gates it', () => {
  it('names the verbs, subcommands and validators', async () => {
    vi.spyOn(CommandApi, 'getCommand').mockReturnValue({
      verbs: ['plant'],
      description: 'Put a seed in the ground',
      subcommands: { here: {} },
      validators: ['/lib/command/validators/requiresAnimate'],
    } as never);
    const out = await panel({ kind: 'command', of: 'inventory/plant.yaml' });
    expect(out).toContain('plant');
    expect(out).toContain('Put a seed in the ground');
    expect(out).toContain('here');
    expect(out).toContain('requiresAnimate');
  });

  it('says "nothing" when a verb is ungated', async () => {
    vi.spyOn(CommandApi, 'getCommand').mockReturnValue({
      verbs: ['look'],
      description: '',
    } as never);
    expect(await panel({ kind: 'command', of: 'perception/look.yaml' })).toContain(
      '(nothing)',
    );
  });

  it('a renamed spec is a note, not a failure', async () => {
    vi.spyOn(CommandApi, 'getCommand').mockReturnValue(null);
    expect(await panel({ kind: 'command', of: 'gone.yaml' })).toContain(
      'no command spec',
    );
  });

  it('infers the kind from a `.yaml` reference', async () => {
    vi.spyOn(CommandApi, 'getCommand').mockReturnValue({
      verbs: ['x'],
    } as never);
    expect(await panel({ of: 'a/b.yaml' })).toContain('x');
  });
});

describe('⭐ a spoiler-declared field is gated ON A REAL RENDER (27)', () => {
  let renderer: WikiRenderer;
  let reader: Stuff;

  /** Drive the whole pipeline, component included. */
  async function render(body: string): Promise<string> {
    const raw = ProxyApi.unwrap(
      renderer as unknown as Stuff,
    ) as unknown as WikiRenderer;
    return ExecutionContextApi.runRoot(null, 'wiki.read', async () => {
      ExecutionContextApi.tagActingAuthor(reader);
      return (await raw.render(body)).body;
    });
  }

  beforeEach(() => {
    renderer = makeStuff(() => new WikiRenderer());
    reader = makeStuff(() => new Principal()) as unknown as Stuff;
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      template('/obj/npc/mimic', '/obj/Mimic'),
    );
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(Mimic as never);
    // Resolve the real component module by path.
    vi.spyOn(StuffApi, 'resolveExport').mockImplementation(
      async (path: string, name: string) =>
        path === '/lib/wiki/components/composition' && name === 'component'
          ? (composition as never)
          : null,
    );
  });

  it('OMITS the spoilery field for a reader below its level', async () => {
    // Asserted on the emitted STRING of a real render — not on a tag
    // scan, and not on the component's own output. What matters is
    // what crosses the wire.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);

    const out = await render('<composition of="/obj/npc/mimic"/>');
    expect(out).toContain('mass');
    expect(out).not.toContain('fireVulnerability');
  });

  it('TAGS it for a reader who may see it but did not ask to', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true); // ceiling 3
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(0 as unknown as never);

    const out = await render('<composition of="/obj/npc/mimic"/>');
    expect(out).toContain('fireVulnerability');
    expect(out).toContain('<spoiler level="3">');
  });

  it('shows it plainly to a reader who asked for everything', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);

    const out = await render('<composition of="/obj/npc/mimic"/>');
    expect(out).toContain('fireVulnerability');
    expect(out).not.toContain('<spoiler');
  });

  it('⚠ hides the field NAME too, not just its value', async () => {
    // On a creature whose fireVulnerability is a spoiler, the
    // EXISTENCE of that field is the reveal as much as its value.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
    const out = await render('<composition of="/obj/npc/mimic"/>');
    expect(out.toLowerCase()).not.toContain('vulnerab');
  });

  it('⭐ the component itself never learns who is reading', async () => {
    // C1 in practice. The gating above happened entirely in the
    // pipeline; this file contains no capability check at all.
    const source = composition.render.toString();
    expect(source).not.toMatch(/isWizard|canMutateZone|getActingAuthor|ceiling/);
  });
});

describe('SpoilerLevels.ofField — the one seam', () => {
  it('reads a declared level', () => {
    expect(SpoilerLevels.ofField(Mimic, 'fireVulnerability')).toBe(3);
  });

  it('⚠ an UNDECLARED field is level 0 — open, deliberately', () => {
    // A reveal system defaulting to reveal. Default-spoiler would
    // empty every panel until several hundred mundane fields were
    // tagged, and would train authors to tag reflexively.
    expect(SpoilerLevels.ofField(Mimic, 'mass')).toBe(0);
    expect(SpoilerLevels.ofField(Oak, 'density')).toBe(0);
  });

  it('an unknown field is 0, not a throw', () => {
    expect(SpoilerLevels.ofField(Mimic, 'nosuchfield')).toBe(0);
  });

  it('a non-class is 0', () => {
    expect(SpoilerLevels.ofField(null, 'x')).toBe(0);
    expect(SpoilerLevels.ofField({}, 'x')).toBe(0);
  });

  it('⭐ property-level merge: a subclass adds `spoiler` and keeps `persistent`', () => {
    // Why `spoiler` needed no new mechanism — `getAllFieldMeta` already
    // merges per property, so a subclass tagging a field its base
    // declares persistent gets both.
    class Base extends Idea {
      static fieldMeta: FieldMeta = { weakness: { persistent: true } };
    }
    class Derived extends Base {
      static fieldMeta: FieldMeta = { weakness: { spoiler: 2 } };
    }
    const merged = MixinApi.getAllFieldMeta(Derived);
    expect(merged.weakness?.persistent).toBe(true);
    expect(merged.weakness?.spoiler).toBe(2);
    expect(SpoilerLevels.ofField(Derived, 'weakness')).toBe(2);
  });
});

describe('the node shape', () => {
  it('returns MML nodes, never a string', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      template('/obj/x', '/obj/Oak'),
    );
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(Oak as never);
    const nodes = await composition.render({ of: '/obj/x' }, [], ctx);
    expect(Array.isArray(nodes)).toBe(true);
    for (const n of nodes as MmlNode[]) {
      expect(['text', 'tag']).toContain(n.kind);
    }
  });

  it('reads the budget without spending it (D-5)', async () => {
    vi.spyOn(Template, 'findDescendants').mockResolvedValue([]);
    const budget = new RenderBudget();
    await composition.render({ kind: 'mixin', of: 'XMixin' }, [], { budget });
    expect(budget.getComponentCount()).toBe(0);
  });
});
