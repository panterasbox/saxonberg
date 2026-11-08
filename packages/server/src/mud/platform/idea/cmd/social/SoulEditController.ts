/**
 * SoulEditController — `soul edit <verb> <field> <newvalue>`: `field` is one of `template`, `grammar`, `searchTerms`, `tags`, `emoji`, `echo` (`template` is sugar for editing `grammar.template`) (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';
import { SourceTreeApi } from '../../../../api/source-tree';
import type { EmoteSpec } from '../../SoulCatalogue';

export default class SoulEditController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    if (await this.refuseUnlessCommittee(model, context)) return;
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
}
