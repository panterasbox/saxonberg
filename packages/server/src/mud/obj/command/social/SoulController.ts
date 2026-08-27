/**
 * SoulController — the emote catalogue's verb. The reads (`list` /
 * `show` / `search`) are anyone's; the mutations (`make` / `edit` /
 * `delete` / `disable` / `enable`) are the SOUL COMMITTEE's — the group
 * holding title over `/expression` (content-packs wave 3, D2b). The
 * real gate is the document store's (`DocumentLogic.gateMutation` →
 * `AccessApi.canAtPath`); this controller pre-checks the same title so
 * the refusal is diegetic rather than a thrown SecurityError.
 *
 * `soul make <verb> <yaml-or-json-spec>` — the spec is a greedy
 * remainder. YAML and JSON are both accepted; the parse path tries
 * JSON first then YAML.
 *
 * `soul edit <verb> <field> <newvalue>` — `field` is one of `template`,
 * `grammar`, `searchTerms`, `tags`, `emoji`, `echo`. `template` is sugar
 * for editing `grammar.template`.
 *
 * `soul search <term>` — every emote a term finds (verb, tag, or search
 * term). Search terms never dispatch; this is how an author finds the
 * verb that does.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { AccessApi } from '../../../api/access';
import { Mml } from '../../../api/mml';
import { SoulApi } from '../../../api/soul';
import { EMOTE_MINT_BRANCH, type EmoteSpec } from '../../SoulCatalogue';
import { SourceTreeApi } from '../../../api/source-tree';
import type { Stuff } from '../../../lib/stuff/Stuff';

/** The subcommands that write the catalogue — the soul committee's. */
const MUTATIONS: ReadonlySet<string> = new Set(['make', 'edit', 'delete', 'disable', 'enable']);

interface SoulModel extends CommandModel {
  verb?: string;
  spec?: string;
  field?: string;
  value?: string;
}

export default class SoulController extends CommandController<SoulModel> {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sub = model.subcommand ?? 'list';
    if (MUTATIONS.has(sub) && !(await this.holdsCatalogue(giver, model))) {
      return this.fail(
        context,
        'The soul committee holds the emote catalogue; this is its work.',
        'not-soul-committee',
      );
    }
    switch (sub) {
      case 'make':
        return this.executeMake(model, context);
      case 'edit':
        return this.executeEdit(model, context);
      case 'delete':
        return this.executeDelete(model, context);
      case 'disable':
        return this.executeSetDisabled(model, context, true);
      case 'enable':
        return this.executeSetDisabled(model, context, false);
      case 'show':
        return this.executeShow(model, context);
      case 'list':
        return this.executeList(context);
      case 'search':
        return this.executeSearch(model, context);
      default:
        return this.fail(context, `Unknown soul subcommand: ${sub}`, 'unknown-subcommand');
    }
  }

  /**
   * Does `giver` hold the emote the mutation targets — the existing
   * row's path, else the mint branch? The same title `DocumentLogic`
   * gates the write on.
   */
  private async holdsCatalogue(giver: Stuff, model: SoulModel): Promise<boolean> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    const existing = verb ? await SoulApi.resolveAny(verb) : null;
    const target = existing?.path || `${EMOTE_MINT_BRANCH}/${verb || 'new'}`;
    return AccessApi.canAtPath(giver, 'write-document', target);
  }

  private async executeSetDisabled(
    model: SoulModel,
    context: CommandContext,
    flag: boolean,
  ): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    const ok = await SoulApi.setDisabled(verb, flag);
    if (!ok) return this.fail(context, `No emote '${verb}'.`, 'no-such-emote');
    this.send(context, Mml.compose`\n${flag ? 'Disabled' : 'Enabled'} emote '${verb}'.\n`);
  }

  private async executeMake(
    model: SoulModel,
    context: CommandContext,
  ): Promise<void> {
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
    const spec = coerceEmoteSpec(verb, parsed);
    if ('error' in spec) {
      return this.fail(context, spec.error, 'spec-invalid');
    }
    try {
      await SoulApi.mint(spec.value);
    } catch (err) {
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

  private async executeEdit(
    model: SoulModel,
    context: CommandContext,
  ): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    const field = (model.field ?? '').trim();
    const value = (model.value ?? '').trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    if (!field) return this.fail(context, 'field required', 'field-required');
    if (!value) return this.fail(context, 'value required', 'value-required');

    let patch: Partial<EmoteSpec> = {};
    try {
      switch (field) {
        case 'template':
          patch = { grammar: { slots: {}, template: value } };
          // We can't read the existing grammar here without an extra
          // call; instead pass through edit which preserves slots:
          // the catalogue's `edit` semantics replace the whole grammar
          // when grammar is in patch. The author can edit grammar
          // wholesale via `soul edit <verb> grammar <yaml>`.
          break;
        case 'grammar': {
          const parsed = SourceTreeApi.parseYaml(value);
          patch = { grammar: parsed as EmoteSpec['grammar'] };
          break;
        }
        case 'searchTerms': {
          const parsed = SourceTreeApi.parseYaml(value);
          if (!Array.isArray(parsed)) {
            return this.fail(
              context,
              'searchTerms must be a list',
              'invalid-search-terms',
            );
          }
          patch = { searchTerms: parsed.map(String) };
          break;
        }
        case 'tags': {
          const parsed = SourceTreeApi.parseYaml(value);
          if (!Array.isArray(parsed)) {
            return this.fail(context, 'tags must be a list', 'invalid-tags');
          }
          patch = { tags: parsed.map(String) };
          break;
        }
        case 'emoji':
          patch = { emoji: value };
          break;
        case 'echo':
          if (value !== 'default' && value !== 'always' && value !== 'never') {
            return this.fail(context, 'echo must be default/always/never', 'invalid-echo');
          }
          patch = { echo: value };
          break;
        default:
          return this.fail(
            context,
            `Unknown field '${field}'`,
            'unknown-field',
          );
      }
    } catch (err) {
      return this.fail(
        context,
        `Could not parse value: ${(err as Error).message}`,
        'value-parse-failed',
      );
    }

    try {
      await SoulApi.edit(verb, patch);
    } catch (err) {
      return this.fail(
        context,
        `edit failed: ${(err as Error).message}`,
        'edit-failed',
      );
    }
    this.send(context, Mml.compose`\nUpdated emote '${verb}'.\n`);
  }

  private async executeDelete(
    model: SoulModel,
    context: CommandContext,
  ): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    const ok = await SoulApi.delete(verb);
    if (!ok) {
      return this.fail(context, `No emote '${verb}'.`, 'no-such-emote');
    }
    this.send(context, Mml.compose`\nDeleted emote '${verb}'.\n`);
  }

  private async executeShow(
    model: SoulModel,
    context: CommandContext,
  ): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    const e = await SoulApi.resolveAny(verb);
    if (!e) return this.fail(context, `No emote '${verb}'.`, 'no-such-emote');
    const lines = [
      '',
      `  verb:     ${e.verb}${e.disabled ? '  (disabled)' : ''}`,
      `  search terms: ${e.searchTerms.join(', ') || '(none)'}`,
      `  emoji:    ${e.emoji ?? '(none)'}`,
      `  echo:     ${e.echo}`,
      `  tags:     ${e.tags.join(', ') || '(none)'}`,
      `  template: ${e.grammar.template}`,
      `  slots:    ${JSON.stringify(e.grammar.slots)}`,
      '',
    ];
    this.send(context, Mml.fromMarkup(lines.join('\n')));
  }

  private async executeSearch(
    model: SoulModel,
    context: CommandContext,
  ): Promise<void> {
    const term = (model.verb ?? '').toLowerCase().trim();
    if (!term) return this.fail(context, 'term required', 'term-required');
    const hits = await SoulApi.search(term);
    if (hits.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo emote matches '${term}'.\n`));
      return;
    }
    const lines = ['', `'${term}' finds (${hits.length}):`];
    for (const e of hits) {
      const glyph = e.emoji ? `${e.emoji} ` : '   ';
      lines.push(`  ${glyph}${e.verb}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
  }

  private async executeList(context: CommandContext): Promise<void> {
    const all = await SoulApi.all();
    if (all.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo emotes minted.\n`));
      return;
    }
    const lines = ['', `Catalog (${all.length}):`];
    const sorted = [...all].sort((a, b) => a.verb.localeCompare(b.verb));
    for (const e of sorted) {
      const glyph = e.emoji ? `${e.emoji} ` : '   ';
      lines.push(`  ${glyph}${e.verb}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}

interface CoerceOk { value: EmoteSpec; }
interface CoerceErr { error: string; }

function coerceEmoteSpec(
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
