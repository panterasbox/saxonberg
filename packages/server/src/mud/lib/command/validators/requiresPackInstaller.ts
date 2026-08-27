/**
 * requiresPackInstaller — verb-level precondition for the content-pack
 * installer's operator surface (`pack`). The executive installs
 * (content-packs wave 3, D3): the giver must hold `/compact/executive`,
 * which the platform pack titles to the Office of the Prime Minister —
 * so the PM (the seat's holder, founder default included) and everyone
 * holding a non-exited position there pass, and nobody else does. The
 * former content-operations committee folded into the executive.
 *
 * The axis is **holding the executive** — never wizardness (the
 * code-trust axis is the wrong axis: installing content is a content
 * operation, not a code-authoring one). A validator is the sanctioned
 * home for an axis check (the `requiresWizard` / `requiresGovernor`
 * precedents); the resolution itself is the ordinary title dispatch
 * (`AccessApi.canAtPath`, action `install`).
 *
 * The async preload resolves the title; an unpathed giver fails closed.
 * The sync body maps `false` to a diegetic decline.
 */

import type { CommandValidator } from '../../../api/command';
import { AccessApi } from '../../../api/access';

/** The organization that installs: the Office of the Prime Minister. */
const EXECUTIVE = '/compact/executive';

// Split declaration: the annotated body const gives the arrow its
// contextual typing; `Object.assign` in the initializer keeps the whole
// thing a pure declaration (no free-standing module-scope statement).
const body: CommandValidator<boolean> = (_context, allowed) => {
  if (allowed) return undefined;
  return (
    'the pack office does not recognize your commission — installation ' +
    "is the executive's work (the Prime Minister and her staff; appoint " +
    'through the Office of the Prime Minister)'
  );
};
const preload: NonNullable<CommandValidator<boolean>['preload']> = async (
  context,
) => {
  const giver = context.commandGiver;
  if (!giver || !(giver.getIdentityPath?.() ?? giver.getTemplatePath?.())) return false;
  return AccessApi.canAtPath(giver, 'install', EXECUTIVE);
};
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
