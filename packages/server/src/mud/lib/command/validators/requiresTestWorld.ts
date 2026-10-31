/**
 * requiresTestWorld — verb-level precondition for the `testharness`
 * scaffolding. Rejects unless this process is a test world
 * (`SecurityApi.isTestEnvironment()` — the wire runner's
 * `SAXONBERG_TEST_WORLD=1`, or a unit test).
 *
 * The belt to the loader's braces: a `testOnly` view is never even
 * admitted outside a test world (CommandLogic's `admitsView`), so this
 * only speaks if that filter were ever bypassed — and it puts the gate in
 * the view's own data, where a reader of the YAML sees it.
 */

import type { CommandValidator } from '../../../api/command';
import { SecurityApi } from '../../../api/security';

// Same split-declaration shape as requiresWizard (no module-scope
// statement; the preload rides the validator as a property).
const body: CommandValidator<boolean> = (context, inTestWorld) => {
  if (inTestWorld) return undefined;
  return (
    `\`${context.verb}\` is a test-world verb and this world is not one ` +
    '(SAXONBERG_TEST_WORLD)'
  );
};
const preload: NonNullable<CommandValidator<boolean>['preload']> = async () =>
  SecurityApi.isTestEnvironment();
const validator: CommandValidator<boolean> = Object.assign(body, {
  preload,
});

export default validator;
