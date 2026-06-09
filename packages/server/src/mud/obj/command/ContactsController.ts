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
  FieldValue,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import { Mml } from '../../api/mml';
import { DescribeApi } from '../../api/describe';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Contacts, ContactEntry } from '../../lib/social/Contacts';
import { Avatar } from '../Avatar';
import { User } from '../../lib/identity/User';

type ContactsHost = Stuff & Contacts;

interface ContactsModel extends CommandModel {
  target?: FieldValue | string;
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
    const stuffs = MqlApi.extractStuffs(model.target as FieldValue);
    if (!stuffs || stuffs.length === 0) {
      return this.fail(context, 'No such target.', 'no-target');
    }
    const target = stuffs[0] as Stuff;
    const now = Date.now();

    // NPC entries store the templatePath, since NPCs are runtime clones.
    if (!(target instanceof Avatar)) {
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
      lines.push(`Added ${joinList(addedNames)} to your ${label} list.`);
    }
    if (dupeNames.length > 0) {
      lines.push(
        `Already in ${label}: ${joinList(dupeNames)}.`,
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
 * is the persisted identity. Hits the persistence chokepoint directly
 * because Template is abstract — its static `find` is unusable on the
 * base class.
 */
async function bulkAvatarNames(
  playerIds: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (playerIds.length === 0) return out;
  const paths = playerIds.map((id) => Avatar.TEMPLATE_PATH_PREFIX + id);
  const { PersistenceManager } = await import('../../../backend/PersistenceManager');
  const docs = (await PersistenceManager.get().find('domain', {
    path: { $in: paths },
  })) as Array<{ path: string; data?: { name?: string } }>;
  for (const tpl of docs) {
    const playerId = tpl.path.slice(Avatar.TEMPLATE_PATH_PREFIX.length);
    const name = tpl.data?.name ?? playerId;
    out.set(playerId, name);
  }
  return out;
}

async function bulkTemplateNames(
  paths: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { PersistenceManager } = await import('../../../backend/PersistenceManager');
  const docs = (await PersistenceManager.get().find('domain', {
    path: { $in: [...paths] },
  })) as Array<{ path: string; data?: { name?: string } }>;
  for (const tpl of docs) {
    const name = tpl.data?.name ?? tpl.path;
    out.set(tpl.path, name);
  }
  return out;
}

function joinList(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

// Suppress unused warning for User type — kept for future expansion
// of the multi-character expansion path that needs the User Document.
void User;
