/**
 * requiresPackInstaller — verb-level precondition for the content-pack
 * installer's operator surface (`pack`). Rejects when the giver is not a
 * member of the `pack-installers` managed group: the executive's
 * content-operations committee, owned by the Prime Minister's OFFICE
 * (`office:prime-minister` in `config/groups.yaml`) and appointed by
 * whoever holds that seat through the ordinary `group add`.
 *
 * The axis is **committee membership per se** — never wizardness (the
 * code-trust axis is the wrong axis: installing content is a content
 * operation, not a code-authoring one), and deliberately not
 * `AccessApi.can` (that path resolves *parcel title*, and this committee
 * holds no parcel). A validator is the sanctioned home for an axis check
 * (the `requiresWizard` / `requiresGovernor` precedents).
 *
 * The async preload resolves membership (keys are Avatar templatePaths —
 * the `GroupController.executeAdd` convention); a missing group or an
 * unpathed giver fails closed. The sync body maps `false` to a diegetic
 * decline.
 */

import type { CommandValidator } from '../../../api/command';
import { GroupApi } from '../../../api/group';

const COMMITTEE = 'pack-installers';

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the whole
// thing a pure declaration (no free-standing module-scope statement).
const body: CommandValidator<boolean> = (_context, allowed) => {
  if (allowed) return undefined;
  return (
    'the pack office does not recognize your commission — installation ' +
    "is the pack-installers committee's work (appointed by whoever holds " +
    "the Prime Minister's seat)"
  );
};
const preload: NonNullable<CommandValidator<boolean>['preload']> = async (
  context,
) => {
  const giverPath = context.commandGiver?.getTemplatePath?.() ?? null;
  if (!giverPath) return false;
  const g = await (await GroupApi.registry()).managed().findByName(COMMITTEE);
  if (!g) return false;
  return g.roleOf(giverPath) != null;
};
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
