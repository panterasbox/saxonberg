/**
 * ContactsController — player surface for the per-Avatar personal-lists
 * substrate. Subcommands: add / remove / show / list / clear / rename.
 *
 * v1 limitations:
 *   - `add` only resolves online targets. Offline targeting requires the
 *     per-Avatar encounter-memory mechanism documented in the build
 *     plan's "Offline contacts targeting — deferred" section.
 *   - Owner-only read. Non-owner reads return empty/refusal — handled
 *     at the GroupProvider boundary, not here.
 *
 * Default `add iffy <label>` expands to one `kind: 'avatar'` entry per
 * current Avatar of iffy's User (sibling-character expansion). `--char`
 * stores a single entry for the resolved Avatar only.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import type { MqlOneResult } from '../../api/mql';
import { Mml } from '../../api/mml';
import { DescribeApi } from '../../api/describe';
import { GrammarApi } from '../../api/grammar';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Contacts, ContactEntry } from '../../lib/social/Contacts';
import { Avatar } from '../Avatar';
import { User } from '../../lib/identity/User';
import { Template } from '../../lib/stuff/Template';
import { PlayerApi } from '../../api/player';

type ContactsHost = Stuff & Contacts;

interface ContactsModel extends CommandModel {
  /**
   * Two shapes by subcommand:
   *   - `add`: `MqlOneResult` (target Avatar / NPC resolved via MQL)
   *   - `remove`: `string` (raw playerId or templatePath the caller typed)
   */
  target?: MqlOneResult | string;
  label?: string;
  char?: boolean;
  old_label?: string;
  new_label?: string;
}

export class ContactsController extends CommandController<ContactsModel> {
  async execute(model: ContactsModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isContacts(giver)) {
      return this.fail(context, 'You have no contacts list.', 'mixin-missing');
    }
    const host: ContactsHost = giver;

    const sub = model.subcommand ?? 'list';
    switch (sub) {
      case 'add':
        return this.executeAdd(host, model, context);
      case 'remove':
        return this.executeRemove(host, model, context);
      case 'show':
        return this.executeShow(host, model, context);
      case 'list':
        return this.executeList(host, context);
      case 'clear':
        return this.executeClear(host, model, context);
      case 'rename':
        return this.executeRename(host, model, context);
      default:
        return this.fail(
          context,
          `Unknown contacts subcommand: ${sub}`,
          'unknown-subcommand',
        );
    }
  }

  private async executeAdd(
    host: ContactsHost,
    model: ContactsModel,
    context: CommandContext,
  ): Promise<void> {
    const label = (model.label ?? '').trim();
    if (!label) return this.fail(context, 'label required', 'label-required');
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const target = resolved?.stuff;
    if (!target) {
      return this.fail(context, 'No such target.', 'no-target');
    }
    const now = Date.now();

    // NPC entries store the templatePath, since NPCs are runtime clones.
    if (!PlayerApi.isAvatarStuff(target)) {
      const tplPath = target.getTemplatePath();
      if (!tplPath) {
        return this.fail(
          context,
          `${DescribeApi.getDisplayName(target)} cannot be added — it has no durable identifier.`,
          'no-template-path',
        );
      }
      const added = host.addContact({
        kind: 'npc',
        templatePath: tplPath,
        label,
        source: 'self',
        addedAt: now,
      });
      const name = DescribeApi.getDisplayName(target);
      this.send(
        context,
        added
          ? Mml.compose`\nAdded ${name} to your ${label} list.\n`
          : Mml.compose`\n${name} is already in your ${label} list.\n`,
      );
      return;
    }

    // Avatar entry path. Default = sibling expansion across the target's
    // User. `--char` opts out to the single resolved Avatar.
    const addedNames: string[] = [];
    const dupeNames: string[] = [];
    if (model.char) {
      const playerId = target.getPlayerId();
      const ok = host.addContact({
        kind: 'avatar',
        playerId,
        label,
        source: 'self',
        addedAt: now,
      });
      (ok ? addedNames : dupeNames).push(
        DescribeApi.getDisplayName(target),
      );
    } else {
      const user = target.getUser();
      const playerIds = user?.playerIds ?? [target.getPlayerId()];
      const names = await bulkAvatarNames(playerIds);
      for (const playerId of playerIds) {
        const ok = host.addContact({
          kind: 'avatar',
          playerId,
          label,
          source: 'self',
          addedAt: now,
        });
        const name = names.get(playerId) ?? playerId;
        (ok ? addedNames : dupeNames).push(name);
      }
    }

    const lines: string[] = [];
    if (addedNames.length > 0) {
      lines.push(`Added ${GrammarApi.joinList(addedNames)} to your ${label} list.`);
    }
    if (dupeNames.length > 0) {
      lines.push(
        `Already in ${label}: ${GrammarApi.joinList(dupeNames)}.`,
      );
    }
    if (lines.length === 0) lines.push('No changes.');
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private executeRemove(
    host: ContactsHost,
    model: ContactsModel,
    context: CommandContext,
  ): void {
    const label = (model.label ?? '').trim();
    if (!label) return this.fail(context, 'label required', 'label-required');
    // remove matches against entries ALREADY in the caller's list.
    // We accept either a name (matched against current entries' display
    // names) OR the raw playerId/templatePath. For v1 we match by name
    // case-insensitively across stored entries — names cached at show time.
    const needle = String(model.target ?? '').trim().toLowerCase();
    if (!needle) {
      return this.fail(context, 'target required', 'target-required');
    }
    const entries = host.contactsByLabel(label);
    let removed = 0;
    for (const e of entries) {
      const refMatch =
        (e.kind === 'avatar' && e.playerId.toLowerCase() === needle) ||
        (e.kind === 'npc' && e.templatePath.toLowerCase() === needle);
      if (refMatch) {
        host.removeContact(
          e.kind,
          e.kind === 'avatar' ? e.playerId : e.templatePath,
          label,
        );
        removed++;
      }
    }
    if (removed === 0) {
      this.send(
        context,
        Mml.compose`\n${needle} isn't in your ${label} list.\n`,
      );
      return;
    }
    this.send(
      context,
      Mml.compose`\nRemoved ${String(removed)} entry from your ${label} list.\n`,
    );
  }

  private async executeShow(
    host: ContactsHost,
    model: ContactsModel,
    context: CommandContext,
  ): Promise<void> {
    const label = (model.label ?? '').trim();
    if (!label) return this.fail(context, 'label required', 'label-required');
    const entries = host.contactsByLabel(label);
    if (entries.length === 0) {
      this.send(
        context,
        Mml.compose`\nNo entries in your ${label} list.\n`,
      );
      return;
    }
    const avatarIds: string[] = [];
    const npcPaths: string[] = [];
    for (const e of entries) {
      if (e.kind === 'avatar') avatarIds.push(e.playerId);
      else npcPaths.push(e.templatePath);
    }
    const avatarNames = await bulkAvatarNames(avatarIds);
    const npcNames = await bulkTemplateNames(npcPaths);
    const lines = [`Your ${label} list:`];
    for (const e of entries) {
      if (e.kind === 'avatar') {
        lines.push(`  ${avatarNames.get(e.playerId) ?? e.playerId}`);
      } else {
        lines.push(`  ${npcNames.get(e.templatePath) ?? e.templatePath} (NPC)`);
      }
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private executeList(host: ContactsHost, context: CommandContext): void {
    const labels = host.contactLabels();
    if (labels.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo contacts.\n`));
      return;
    }
    const lines = ['Your contact labels:'];
    for (const l of labels) {
      const n = host.contactsByLabel(l).length;
      lines.push(`  ${l}  (${n} ${n === 1 ? 'entry' : 'entries'})`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private executeClear(
    host: ContactsHost,
    model: ContactsModel,
    context: CommandContext,
  ): void {
    const label = (model.label ?? '').trim();
    if (!label) return this.fail(context, 'label required', 'label-required');
    const removed = host.clearContactLabel(label);
    this.send(
      context,
      Mml.compose`\nRemoved ${String(removed)} from your ${label} list.\n`,
    );
  }

  private executeRename(
    host: ContactsHost,
    model: ContactsModel,
    context: CommandContext,
  ): void {
    const oldLabel = (model.old_label ?? '').trim();
    const newLabel = (model.new_label ?? '').trim();
    if (!oldLabel || !newLabel) {
      return this.fail(context, 'both labels required', 'label-required');
    }
    const renamed = host.renameContactLabel(oldLabel, newLabel);
    this.send(
      context,
      Mml.compose`\nRelabeled ${String(renamed)} from ${oldLabel} to ${newLabel}.\n`,
    );
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
      .topic('system.shell.contacts')
      .toSelf(body)
      .send();
  }
}

/**
 * Resolve display names for a batch of playerIds via their Avatar Template
 * docs. Useful since the Avatars may not be online; the Template name
 * is the persisted identity. Goes through `Template.findByPaths` (the
 * Document Api surface for abstract-Template bulk lookup) — never
 * touches the persistence chokepoint directly.
 */
async function bulkAvatarNames(
  playerIds: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (playerIds.length === 0) return out;
  const paths = playerIds.map((id) => Avatar.TEMPLATE_PATH_PREFIX + id);
  const templates = await Template.findByPaths(paths);
  for (const tpl of templates) {
    const playerId = tpl.path.slice(Avatar.TEMPLATE_PATH_PREFIX.length);
    const name = nameOf(tpl) ?? playerId;
    out.set(playerId, name);
  }
  return out;
}

async function bulkTemplateNames(
  paths: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const templates = await Template.findByPaths(paths);
  for (const tpl of templates) {
    const name = nameOf(tpl) ?? tpl.path;
    out.set(tpl.path, name);
  }
  return out;
}

function nameOf(tpl: Template): string | undefined {
  const data = tpl.data as { name?: unknown } | undefined;
  return typeof data?.name === 'string' ? data.name : undefined;
}

// Suppress unused warning for User type — kept for future expansion
// of the multi-character expansion path that needs the User Document.
void User;
