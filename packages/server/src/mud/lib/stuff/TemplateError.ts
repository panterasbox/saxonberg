/**
 * TemplateError — thrown when a domain-collection write would violate
 * the folder/leaf invariant (or the singleton-container-target
 * constraint).
 *
 * Lives in `lib/stuff/` next to `Template`; `TemplateApi` value-re-exports
 * it so existing `import { TemplateError } from '.../api/template'` sites
 * keep working, and `instanceof` / `toThrow(TemplateError)` checks
 * resolve to this single class.
 */
export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}
