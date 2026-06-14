# TODO (this branch, after command conversion lands): reserve /obj/api/ template-path namespace

The surface-architecture logic singletons live at runtime template-paths
`/obj/api/<feature>` via `StuffApi.singletonSync` (runtime indexes only —
no DB write). Risk: an author/seeder could save a real `domain`-collection
Template at `/obj/api/X`, which `singletonSync`'s `byTemplatePath.exact()`
would then return as the (wrong-class) logic singleton.

Guard (apply post-command-agent):
- lib/paths.ts: add `/obj/api/` as a RESERVED template-path prefix const.
- TemplateLogic (obj/api/TemplateLogic.ts) + face (api/template.ts): add
  `validateReservedPath(doc)` — throws if doc.path starts with a reserved
  prefix.
- obj/hooks/DomainHook.ts aroundSave: call it alongside
  validateFolderLeafSave / validateSingletonContainerTarget.
- Test: saving a Template at `/obj/api/foo` throws.

DomainHook.aroundSave is the chokepoint for every domain Template write,
so this single guard covers all creation paths. Clone can't find a
nonexistent template, so no clone-side guard needed.
