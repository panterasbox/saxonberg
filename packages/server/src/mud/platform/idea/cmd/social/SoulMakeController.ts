/**
 * SoulMakeController — `soul make <verb> <yaml-or-json-spec>`: mint a new emote; the spec is a greedy remainder, JSON tried first then YAML (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';
import { SourceTreeApi } from '../../../../api/source-tree';
import type { EmoteSpec } from '../../SoulCatalogue';

interface CoerceOk { value: EmoteSpec; }
interface CoerceErr { error: string; }

export default class SoulMakeController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    const raw = (model.spec ?? '').trim();
    if (!raw) {
      return this.fail(
        context,
        'Provide an emote spec body (YAML or JSON).',
        'spec-required',
      );
    }
    let parsed: unknown;
    try {
      parsed = SourceTreeApi.parseYaml(raw);
    } catch (err) {
      return this.fail(
        context,
        `Could not parse spec: ${(err as Error).message}`,
        'spec-parse-failed',
      );
    }
    const spec = this.coerceEmoteSpec(verb, parsed);
    if ('error' in spec) {
      return this.fail(context, spec.error, 'spec-invalid');
    }
    try {
      await SoulApi.mint(spec.value);
    } catch (err) {
      if (this.refusedByCommittee(context, err)) return;
      return this.fail(
        context,
        `mint failed: ${(err as Error).message}`,
        'mint-failed',
      );
    }
    this.send(
      context,
      Mml.compose`\nMinted emote '${verb}'.\n`,
    );
  }

  /** Two shapes accepted: a bare grammar object, or a full EmoteSpec. */
  private coerceEmoteSpec(
    verb: string,
    parsed: unknown,
  ): CoerceOk | CoerceErr {
    if (!parsed || typeof parsed !== 'object') {
      return { error: 'spec must be an object' };
    }
    const obj = parsed as Record<string, unknown>;
    // Two shapes accepted: bare grammar object, or full EmoteSpec object.
    let grammar: EmoteSpec['grammar'] | undefined;
    if (obj.grammar && typeof obj.grammar === 'object') {
      grammar = obj.grammar as EmoteSpec['grammar'];
    } else if (typeof obj.template === 'string') {
      grammar = {
        slots: (obj.slots as Record<string, unknown> | undefined) as EmoteSpec['grammar']['slots'] | undefined ?? {},
        template: obj.template,
      } as EmoteSpec['grammar'];
    }
    if (!grammar || typeof grammar.template !== 'string') {
      return { error: 'spec missing grammar.template' };
    }
    const spec: EmoteSpec = {
      verb,
      grammar,
    };
    if (Array.isArray(obj.searchTerms)) {
      spec.searchTerms = obj.searchTerms.map(String);
    }
    if (Array.isArray(obj.tags)) {
      spec.tags = obj.tags.map(String);
    }
    if (typeof obj.emoji === 'string') spec.emoji = obj.emoji;
    if (
      typeof obj.echo === 'string' &&
      (obj.echo === 'default' || obj.echo === 'always' || obj.echo === 'never')
    ) {
      spec.echo = obj.echo;
    }
    return { value: spec };
  }
}
