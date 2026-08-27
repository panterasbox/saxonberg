// StudioLogic — the hot-reloadable logic singleton behind StudioApi. (Doc
// comment lives on the class declaration below so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { readFileSync, readdirSync } from 'fs';
import { dirname, join, relative, sep, posix } from 'path';
import { fileURLToPath } from 'url';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { AccessApi } from '../../../api/access';
import { HelpApi } from '../../../api/help';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import type { AnyConstructor } from '../../../api/mixin';
import { ProvenanceApi } from '../../../api/provenance';
import { DocumentApi } from '../../../api/document';
import { TemplateApi, TemplateError } from '../../../api/template';
import { Template } from '../../../lib/stuff/Template';
import { SourceTreeApi, SourceTreeSandboxError } from '../../../api/source-tree';
import { HotReloadApi } from '../../../api/hot-reload';
import { Quantity } from '../../../lib/quantity';
import { Mixins } from '../../../lib/mixin';
import type { FieldMeta } from '../../../lib/mixin';
import { StudioError } from '../../../api/studio';
import { SecurityError } from '../../../lib/security/errors';
import { Blueprint } from '../../../lib/studio/Blueprint';
import { Idea } from '../../../lib/stuff/Idea';
import Thing from '../../../lib/stuff/Thing';
import { Vessel } from '../../../lib/stuff/Vessel';
import Location from '../../../lib/stuff/Location';
import { Agent } from '../../../lib/stuff/Agent';
import { Creature } from '../../../lib/creature/Creature';
import { Character } from '../../../lib/character/Character';
import { Shadow } from '../../../lib/stuff/Shadow';
import type BlueprintCatalogue from '../BlueprintCatalogue';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type {
  AuthorableFieldDescriptor,
  AuthorableFieldsArtifact,
  BaseClassEntry,
  BlueprintDetail,
  BlueprintSummary,
  BlueprintWriteResult,
  ClassCommitResult,
  ClassDescription,
  CommitClassInput,
  CreateTemplateInput,
  HelpRelation,
  HelpTopic,
  MixinDetail,
  MixinFieldDetail,
  MixinPalette,
  MixinPaletteEntry,
  PublishBlueprintInput,
  ScaffoldClassInput,
  ScaffoldResult,
  StudioFieldDescriptor,
  StudioValueSource,
  TemplateWriteResult,
} from '@saxonberg/types';

const StudioApiCallers = SecurityPolicies.FromModule('/api/studio#StudioApi');

/**
 * The CMS source backend is rooted at the mudlib (`packages/server/src/mud`)
 * — the same root `CmsLogic` uses. Scaffold/commit target paths are
 * CMS-relative to this root (`/stuff/thing/Coin.ts`, not the absolute FS path).
 * Copied verbatim from `CmsLogic` (the source-write mirror).
 */
const SOURCE_ROOT_DISPLAY = '/server/src/mud';

/**
 * The base-class constructors offered by the composition palette, keyed by
 * name. `Character` is abstract but a constructor reference is all
 * `MixinApi.queryMixins` (a prototype-chain walk) needs — never instantiated
 * here. The array below is the display order; this map is the resolution for
 * `impliedMixins`.
 */
const PALETTE_BASE_CTORS: Record<string, AnyConstructor> = {
  // The real fundamental divisions of `Stuff` (Idea/Shadow extend Stuff
  // directly; Agent = TangibleMixin(Stuff); Thing/Location are composed
  // roots; Vessel = a container-object that extends Thing;
  // Creature→Character specialize Agent). `Idea` is the bare-Stuff base, so
  // `Stuff` itself isn't offered. Abstract bases (Character/Shadow) are fine
  // — only prototype-walked, never instantiated. Vessel is kept in the
  // palette as its own describable base even though it now extends Thing.
  Idea: Idea as unknown as AnyConstructor,
  Thing: Thing as unknown as AnyConstructor,
  Vessel: Vessel as unknown as AnyConstructor,
  Location: Location as unknown as AnyConstructor,
  Agent: Agent as unknown as AnyConstructor,
  Creature: Creature as unknown as AnyConstructor,
  Character: Character as unknown as AnyConstructor,
  Shadow: Shadow as unknown as AnyConstructor,
};

/** Instantiable base classes offered by the composition palette (display order). */
const PALETTE_BASE_CLASSES = Object.keys(
  PALETTE_BASE_CTORS
) as ReadonlyArray<string>;

/** The runtime blueprint index singleton — ungated reference reads. */
const CATALOGUE_PATH = '/platform/idea/BlueprintCatalogue';

/**
 * Where a published curated blueprint's document lands — the platform's
 * own `/blueprints/` branch (the `/emotes/` convention: untitled ⇒ the
 * state; the pack that later ships the id adopts it by natural key).
 */
const BLUEPRINT_MINT_BRANCH = '/blueprints';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Root of the mudlib source tree (`.../src/mud`) — the classification scan. */
const MUD_ROOT = join(HERE, '..', '..', '..');
/** The field-schema artifact — OPTIONAL enrichment; absence is fine. */
const ARTIFACT_PATH = join(
  HERE,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'api',
  'authorable-fields.json'
);

// ---- export-source scan helpers ----------------------------------------

/**
 * The acting principal for a Studio op — resolved from the execution
 * context (`getActingAuthor`), NEVER a caller-supplied argument. A context
 * with no derivable actor yields `null` → the read gate fails closed.
 * Copied verbatim from `CmsLogic` (the anti-spoof property).
 */
function actingActor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/** Call `get<Pascal(field)>()` on a duck-typed host; undefined on any miss. */
function readViaGetter(host: unknown, field: string): unknown {
  const getterName = 'get' + MixinApi.pascalCase(field);
  const getter = (host as Record<string, unknown>)[getterName];
  if (typeof getter !== 'function') return undefined;
  try {
    return (getter as () => unknown).call(host);
  } catch {
    return undefined;
  }
}

/** Read the host's own field slot directly (no getter); undefined on miss. */
function readOwn(host: unknown, field: string): unknown {
  try {
    return (host as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

// ---- scaffold: source-write helpers (mirrored from CmsLogic) -------------

/**
 * Resolve a CMS-relative source path (rooted at the mudlib) to an absolute
 * filesystem path, enforcing it stays within the mud root. A `..` that
 * climbs out of mud throws `SourceTreeSandboxError`. Verbatim in shape from
 * `CmsLogic.sourceAbs` — mud is a hard boundary.
 */
function sourceAbs(cmsPath: string): string {
  const display =
    cmsPath === '/' ? SOURCE_ROOT_DISPLAY : SOURCE_ROOT_DISPLAY + cmsPath;
  const abs = SourceTreeApi.resolvePath('/', display, { home: '/' });
  const rootAbs = SourceTreeApi.resolvePath('/', SOURCE_ROOT_DISPLAY, {
    home: '/',
  });
  if (abs !== rootAbs && !abs.startsWith(rootAbs + '/')) {
    throw new SourceTreeSandboxError(
      `path '${cmsPath}' resolves outside the source root`
    );
  }
  return abs;
}

/**
 * Source-tree write gate — `isWizard(actor)` AND `can(actor, 'write',
 * resolveSourceFolderZone(path))`. Verbatim from `CmsLogic.gateSourceWrite`
 * (which mirrors `WriteController._gateSourceWrite`). Returns null on allow,
 * a human-readable reason on deny — the caller surfaces it as a graceful
 * `denied` disposition rather than throwing.
 */
async function gateSourceWrite(
  actor: Stuff | null,
  sourceLogical: string
): Promise<string | null> {
  if (!(await AccessApi.isWizard(actor))) {
    return 'you must be a wizard to publish a class';
  }
  const resource = await AccessApi.resolveSourceFolderZone(sourceLogical);
  if (!(await AccessApi.can(actor, 'write', resource))) {
    return "you don't have permission to write to that source slice";
  }
  return null;
}

// ---- scaffold: import resolution + source composition --------------------

/** Whether `name` is a legal PascalCase TS class identifier. */
function isValidClassName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(name);
}

/** A resolved base-class export: its source file + whether it's a default export. */
interface ClassExport {
  file: string;
  isDefault: boolean;
}

/** A mixin file's full top concept comment, cleaned, plus a `docs/…` ref. */
interface TopDescription {
  /** The cleaned multi-paragraph description text (list structure kept). */
  text: string;
  /** A `docs/…(.md)` path named in the prose, when present. */
  docRef?: string;
}

/** The export-source scan result — mixin factories + base classes by name. */
interface ExportSources {
  mixins: Map<string, string>;
  classes: Map<string, ClassExport>;
  /** mixin factory name → the doc summary ADJACENT to `export function`. */
  summaries: Map<string, string>;
  /** mixin name → its file's top concept-comment summary (the usual source). */
  topSummaries: Map<string, string>;
  /**
   * mixin name → its file's FULL top concept comment (multi-paragraph, list
   * structure preserved) + any `docs/…` ref — the inspector-card substance.
   */
  topDescriptions: Map<string, TopDescription>;
  /** exported `interface <Name>` → its TSDoc summary — the companion fallback. */
  interfaceSummaries: Map<string, string>;
}

/** Cap a palette summary so one verbose comment can't blow up the row. */
const SUMMARY_MAX = 200;

/**
 * The one-line summary of a TSDoc doc-comment body: the first PARAGRAPH (up to
 * the first blank line or the first `@`-block-tag line — these mixin concept
 * comments lead with a `Name — summary.` line), reduced to its first sentence
 * when it carries a terminator, with the `*` gutter, `{@link}` wrappers, and
 * `**bold**` markdown stripped. `undefined` for an empty / tag-only comment.
 */
function firstDocSentence(block: string): string | undefined {
  const para: string[] = [];
  for (const raw of block.split('\n')) {
    const line = raw.replace(/^\s*\*?\s?/, '').trimEnd();
    const trimmed = line.trim();
    if (trimmed.startsWith('@')) break; // stop at the first block tag
    if (trimmed === '') {
      if (para.length > 0) break; // end of the first paragraph
      continue; // skip leading blank lines
    }
    para.push(line);
  }
  const text = para
    .join(' ')
    // `{@link Foo}` / `{@link Foo | bar}` → the referenced name only.
    .replace(/\{@link\s+([^}|]+?)(?:\s*\|[^}]*)?\}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1') // strip **bold** markdown
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  const m = /^(.*?[.!?])(\s|$)/.exec(text);
  let sentence = (m ? m[1]! : text).trim();
  if (sentence.length > SUMMARY_MAX) {
    sentence = sentence.slice(0, SUMMARY_MAX - 1).trimEnd() + '…';
  }
  return sentence || undefined;
}

/** The first `/** … *&#47;` doc comment's summary in a source file, if any. */
function fileTopSummary(src: string): string | undefined {
  const m = /\/\*\*([\s\S]*?)\*\//.exec(src);
  return m ? firstDocSentence(m[1]!) : undefined;
}

/** A `docs/…(.md)` path named in prose (the "learn more" pointer). */
const DOC_REF_RE = /docs\/[A-Za-z0-9_./-]+\.md/;

/**
 * The FULL top concept comment of a source file as clean text — the whole
 * leading `/** … *&#47;` block, NOT just the first sentence. The `*` gutter is
 * stripped while paragraph breaks (blank lines) and numbered/bulleted list
 * structure (leading indentation + `1.` / `-` markers) are preserved;
 * `{@link Foo}` wrappers and `**bold**` markdown are reduced to plain text.
 * Capture stops at the first `@`-block-tag line so a trailing `@internal` /
 * `@packageDocumentation` never leaks in. A `docs/…` reference in the prose
 * rides back as `docRef`. `undefined` for an empty / tag-only comment.
 */
function fileTopDescription(src: string): TopDescription | undefined {
  const m = /\/\*\*([\s\S]*?)\*\//.exec(src);
  if (!m) return undefined;
  const block = m[1]!;
  const docRefMatch = DOC_REF_RE.exec(block);
  const lines: string[] = [];
  for (const raw of block.split('\n')) {
    // De-gutter: drop leading whitespace + the `*` and one following space,
    // KEEPING any further indentation (list nesting is meaningful).
    const line = raw.replace(/^\s*\*? ?/, '').replace(/\s+$/, '');
    if (line.trim().startsWith('@')) break; // stop at the first block tag
    lines.push(line);
  }
  const text = lines
    .join('\n')
    // `{@link Foo}` / `{@link Foo | bar}` → the referenced name only.
    .replace(/\{@link\s+([^}|]+?)(?:\s*\|[^}]*)?\}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1') // strip **bold** markdown
    .replace(/\n{3,}/g, '\n\n') // collapse runs of blank lines
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
  if (!text.trim()) return undefined;
  const out: TopDescription = { text };
  if (docRefMatch) out.docRef = docRefMatch[0];
  return out;
}

/** Recursive `.ts` walk, shared by the export-source scan. */
function walkTsFiles(dir: string, acc: string[]): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue;
      walkTsFiles(p, acc);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * The HelpApi enrichment for a mixin — the typed relations + conferred method
 * names from the boot-warmed help index. Degrades to empty (never throws) when
 * the help artifact is absent or the mixin has no topic.
 */
function collectHelpEnrichment(mixinName: string): {
  relations: HelpRelation[];
  methods: string[];
} {
  const concept = mixinName.replace(/Mixin$/, '');
  let topic: HelpTopic | null = null;
  try {
    topic = HelpApi.apiTopic(concept);
  } catch {
    topic = null;
  }
  if (!topic) return { relations: [], methods: [] };
  const relations = topic.relations ?? [];
  // Conferred method names ride the `confers` edges' `targetTitle`.
  const methods = [
    ...new Set(
      relations.filter((r) => r.kind === 'confers').map((r) => r.targetTitle)
    ),
  ];
  return { relations, methods };
}

/**
 * A one-time scan mapping each exported mixin factory (`_mixinName`) and each
 * exported base class to its source file (absolute), recording whether a base
 * class is a `export default` (so the scaffolder emits a default import, not a
 * named one — e.g. `Thing`/`Location`). Reuses the same tree walk as the
 * classification scan. Best-effort — an unresolved name degrades to a
 * placeholder comment the wizard fixes in Monaco.
 */
function scanExportSources(): ExportSources {
  const mixins = new Map<string, string>();
  const classes = new Map<string, ClassExport>();
  const summaries = new Map<string, string>();
  const topSummaries = new Map<string, string>();
  const topDescriptions = new Map<string, TopDescription>();
  const interfaceSummaries = new Map<string, string>();
  for (const file of walkTsFiles(MUD_ROOT, [])) {
    const src = readFileSync(file, 'utf8');
    // The file-top concept comment — for a one-concept mixin file this IS the
    // mixin's description (it sits above the imports, not the factory).
    const topSummary = fileTopSummary(src);
    const topDescription = fileTopDescription(src);
    // Mixin factories are always NAMED exports (`export function FooMixin`);
    // their `_mixinName` marker names them.
    for (const m of src.matchAll(
      /static\s+_mixinName\s*=\s*['"]([A-Za-z0-9_]+)['"]/g
    )) {
      const name = m[1]!;
      if (!mixins.has(name)) mixins.set(name, file);
      if (topSummary && !topSummaries.has(name)) {
        topSummaries.set(name, topSummary);
      }
      if (topDescription && !topDescriptions.has(name)) {
        topDescriptions.set(name, topDescription);
      }
    }
    // `export default (abstract)? class X` — a default export.
    for (const m of src.matchAll(
      /export\s+default\s+(?:abstract\s+)*class\s+([A-Za-z0-9_]+)/g
    )) {
      const name = m[1]!;
      if (!classes.has(name)) classes.set(name, { file, isDefault: true });
    }
    // `export (abstract)? class X` — a named export (the `default` keyword
    // sits between `export` and `class`, so this pattern won't match those).
    for (const m of src.matchAll(
      /export\s+(?:abstract\s+)*class\s+([A-Za-z0-9_]+)/g
    )) {
      const name = m[1]!;
      if (!classes.has(name)) classes.set(name, { file, isDefault: false });
    }
    // The leading doc-comment above `export function <Name>(…)` — the mixin
    // factory's summary. Keyed by the factory name (== `_mixinName`).
    for (const m of src.matchAll(
      /\/\*\*([\s\S]*?)\*\/\s*export\s+function\s+([A-Za-z0-9_]+)\s*(?:<[\s\S]*?>)?\s*\(/g
    )) {
      const name = m[2]!;
      if (summaries.has(name)) continue;
      const s = firstDocSentence(m[1]!);
      if (s) summaries.set(name, s);
    }
    // The leading doc-comment above `export interface <Name>` — the companion
    // fallback when the factory itself carries no doc comment.
    for (const m of src.matchAll(
      /\/\*\*([\s\S]*?)\*\/\s*export\s+interface\s+([A-Za-z0-9_]+)\b/g
    )) {
      const name = m[2]!;
      if (interfaceSummaries.has(name)) continue;
      const s = firstDocSentence(m[1]!);
      if (s) interfaceSummaries.set(name, s);
    }
  }
  return {
    mixins,
    classes,
    summaries,
    topSummaries,
    topDescriptions,
    interfaceSummaries,
  };
}

/**
 * The one-line summary for a mixin, by precedence: a doc comment adjacent to
 * its `export function`, else the file's top concept comment (the usual
 * source — the description sits above the imports), else the companion
 * interface's doc (the un-suffixed name, e.g. `ContainerMixin` →
 * `interface Container`). `undefined` when none carries a doc comment.
 */
function mixinSummary(
  name: string,
  sources: ExportSources
): string | undefined {
  const bare = name.replace(/Mixin$/, '');
  return (
    sources.summaries.get(name) ??
    sources.topSummaries.get(name) ??
    sources.interfaceSummaries.get(bare) ??
    sources.interfaceSummaries.get(name)
  );
}

/**
 * The mud-rooted, forward-slashed, extension-stripped path of a source file
 * (`.../src/mud/lib/stuff/Idea.ts` → `/lib/stuff/Idea`). The stable "class
 * path" shape the palette reports for a base class.
 */
function mudRootedPath(absFile: string): string {
  return (
    '/' + relative(MUD_ROOT, absFile).split(sep).join('/').replace(/\.ts$/, '')
  );
}

/**
 * The relative import specifier (no extension, no `.js`) from the scaffold
 * target directory (`/obj`) to `absFile`. `null` when unresolved.
 */
function importSpecifierFor(absFile: string | undefined, targetDir: string): string | null {
  if (!absFile) return null;
  // Mud-rooted, forward-slashed, extension-stripped path of the source file.
  const mudRel = mudRootedPath(absFile);
  // Scaffold targets live at `/platform/<branch>/<Name>.ts`, so imports are
  // relative to that branch dir.
  let spec = posix.relative(targetDir, mudRel);
  if (!spec.startsWith('.')) spec = './' + spec;
  return spec;
}

/**
 * Compose a static TS backing-class module: resolved imports for the base +
 * each mixin, then `export class <Name> extends <M0>(<M1>(<Base>)) {}`. An
 * unresolved import becomes a `// TODO` placeholder (the module won't compile
 * until fixed — the reload gate catches it; scaffolding is best-effort text).
 */
function composeSource(
  name: string,
  baseClass: string,
  mixinNames: string[],
  sources: ExportSources,
  targetDir: string,
): string {
  const lines: string[] = [];
  const unresolved = (ident: string): void => {
    lines.push(`// TODO: could not resolve the import for ${ident};`);
    lines.push(`// import { ${ident} } from '...';`);
  };
  // The base may be a NAMED or a DEFAULT export.
  const baseExport = sources.classes.get(baseClass);
  const baseSpec = importSpecifierFor(baseExport?.file, targetDir);
  if (baseSpec) {
    lines.push(
      baseExport?.isDefault
        ? `import ${baseClass} from '${baseSpec}';`
        : `import { ${baseClass} } from '${baseSpec}';`
    );
  } else {
    unresolved(baseClass);
  }
  // Mixin factories are always named exports.
  for (const m of [...new Set(mixinNames)]) {
    const spec = importSpecifierFor(sources.mixins.get(m), targetDir);
    if (spec) lines.push(`import { ${m} } from '${spec}';`);
    else unresolved(m);
  }

  // Right-fold the mixins over the base: [A, B] → A(B(Base)).
  let composed = baseClass;
  for (let i = mixinNames.length - 1; i >= 0; i--) {
    composed = `${mixinNames[i]}(${composed})`;
  }

  const body =
    lines.join('\n') +
    '\n\n' +
    `/**\n * ${name} — a composed backing class (scaffolded by the CMS Studio).\n */\n` +
    `export class ${name} extends ${composed} {}\n`;
  return body;
}

/**
 * The owner id for a `/home/<self>/` draft branch — the acting Avatar's
 * durable id (the last segment of its templatePath). `'anon'` when the
 * context has no derivable identity (the draft path is a reserved seam only).
 */
function selfIdOf(actor: Stuff | null): string {
  const path = actor?.getTemplatePath?.() ?? '';
  const seg = path.split('/').filter(Boolean).pop();
  return seg || 'anon';
}

/**
 * StudioLogic — the hot-reloadable logic singleton behind
 * {@link StudioApi}.
 *
 * Lives at `/platform/idea/api/studio` (a stateless `Stuff` singleton, no backing
 * `Template`); `StudioApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and calls
 * a method other than through the Api gets `SecurityError`.
 *
 * Composes `AccessApi`, `StuffApi`, and `MixinApi`. Field classification —
 * which fields are author-editable, which are engine-written, which want a
 * reference picker — is READ FROM THE DECLARATION, via
 * `MixinApi.getAllFieldMeta`. It used to be recovered by scanning the mud
 * source tree as text and regex-binding doc comments to identifiers, with
 * underscore-insensitive name *guessing* because the scan could not tell
 * which field a comment belonged to; that is gone. The sparse
 * TypeDoc-derived `authorable-fields.json` artifact is still joined in for
 * its richer type/ref shapes when present.
 *
 * The `FromModule` gate is applied per public method.
 *
 * @internal
 */
@Unshadowable
export class StudioLogic extends ApiLogic {
  /** Cached artifact enrichment (loaded once; empty when absent). */
  private artifact: AuthorableFieldsArtifact | null = null;
  /** Cached export-source scan (mixin/base name → file), for scaffold imports. */
  private exportSources: ExportSources | null = null;

  /** See {@link StudioApi.describeClass}. */
  @CallSecurity(StudioApiCallers)
  public async describeClass(
    classPath: string,
    contextPath?: string
  ): Promise<ClassDescription> {

    let ctor: AnyConstructor;
    try {
      ctor = (await StuffApi.loadClassByPath(classPath)) as AnyConstructor;
    } catch (err) {
      throw new StudioError(
        'not-found',
        `cannot resolve class ${classPath}: ${(err as Error).message}`
      );
    }

    const meta = MixinApi.getAllFieldMeta(ctor);
    const artifact = this.getArtifact();

    const mixins = MixinApi.queryMixins(ctor);
    const mixinNames = mixins.map((m) => m._mixinName ?? m.name ?? '<anonymous>');
    const persistent = MixinApi.getAllPersistentFields(ctor);
    const instruction = MixinApi.getAllInstructionFields(ctor);
    const instructionSet = new Set(instruction);
    const allFields = [...new Set([...persistent, ...instruction])];

    // A representative live instance drives effective-value resolution:
    // the given contextPath, else any existing instance of the class.
    const instance =
      (contextPath
        ? StuffApi.findByTemplatePath<Stuff>(contextPath)
        : undefined) ??
      StuffApi.findAllByTemplatePath<Stuff>(classPath)[0] ??
      null;

    const fields: StudioFieldDescriptor[] = [];
    for (const field of allFields) {
      if (!meta[field]?.authorable) continue;
      const owner = this.ownerMixinOf(mixins, field, instructionSet);
      if (!owner) continue; // a base-class (non-mixin) field — never authorable

      const kind: 'property' | 'instruction' = instructionSet.has(field)
        ? 'instruction'
        : 'property';

      const enrichment = this.artifactFor(artifact, owner, field);
      const { value, valueSource } = await this.readEffectiveValue(
        instance,
        ctor,
        field
      );

      const typeShape =
        enrichment?.typeShape ?? inferTypeShape(value) ?? 'json';

      const descriptor: StudioFieldDescriptor = {
        name: field,
        mixin: owner,
        kind,
        typeShape,
        valueSource,
      };
      if (enrichment?.description) descriptor.description = enrichment.description;
      if (enrichment?.enumValues) descriptor.enumValues = enrichment.enumValues;
      if (enrichment?.refShape) descriptor.refShape = enrichment.refShape;
      if (enrichment?.refType) descriptor.refType = enrichment.refType;
      // Fall back to the declared picker (the artifact is sparse for
      // mixin fields, so `authorPicker` is usually the only source).
      const picker = meta[field]?.authorPicker;
      if (!descriptor.refShape && picker) {
        descriptor.refShape = 'path';
        descriptor.refType = picker;
      }
      if (value !== undefined) descriptor.defaultValue = value;
      fields.push(descriptor);
    }

    return { classPath, mixins: mixinNames, fields };
  }

  /** See {@link StudioApi.describeMixin}. */
  @CallSecurity(StudioApiCallers)
  public async describeMixin(name: string): Promise<MixinDetail> {
    const mixinName = (name ?? '').trim();
    if (!mixinName) {
      throw new StudioError('invalid', 'a mixin name is required');
    }

    const sources = this.getExportSources();

    // Description + docRef — the always-available source scan (the substance).
    const top = sources.topDescriptions.get(mixinName);

    // Contributed fields — reuse describeClass's inference by composing the
    // mixin over a bare Idea (best-effort; degrades to a static read of
    // the mixin's own `fieldMeta`).
    const { authorableFields, runtimeState } = await this.describeMixinFields(
      mixinName,
      sources
    );

    // Enrichment — typed help relations + conferred method names. Empty (never
    // a throw) when the help artifact is absent / the mixin has no topic.
    const { relations, methods } = collectHelpEnrichment(mixinName);

    const detail: MixinDetail = {
      name: mixinName,
      description: top?.text ?? '',
      authorableFields,
      runtimeState,
      relations,
      methods,
    };
    if (top?.docRef) detail.docRef = top.docRef;
    return detail;
  }

  /** See {@link StudioApi.listBlueprints}. */
  @CallSecurity(StudioApiCallers)
  public async listBlueprints(): Promise<BlueprintSummary[]> {
    const catalogue = await this.requireCatalogue();
    return catalogue.allBlueprints().map((bp) => toSummary(bp));
  }

  /** See {@link StudioApi.getBlueprint}. */
  @CallSecurity(StudioApiCallers)
  public async getBlueprint(blueprintId: string): Promise<BlueprintDetail> {
    const catalogue = await this.requireCatalogue();
    const bp = catalogue.getBlueprint(blueprintId);
    if (!bp) {
      throw new StudioError('not-found', `no blueprint '${blueprintId}'`);
    }
    return toDetail(bp);
  }

  /** See {@link StudioApi.publishBlueprint}. */
  @CallSecurity(StudioApiCallers)
  public async publishBlueprint(
    input: PublishBlueprintInput
  ): Promise<BlueprintWriteResult> {
    // Act #2 — naming/publishing a composition of already-approved classes.
    // The document gate decides (content-packs wave 3): the curated
    // blueprint lands under `/blueprints`, which the platform pack claims
    // for the executive — publishing one is a platform act. Denial is a
    // graceful disposition, not a throw, so the gate's refusal is caught.
    if (!input.name || !input.baseClass) {
      throw new StudioError('invalid', 'name and baseClass are required');
    }

    const mixinNames = [...new Set(input.mixinNames ?? [])].sort();
    const signature = Blueprint.signatureFromParts(input.baseClass, mixinNames);
    const catalogue = await this.requireCatalogue();

    // Dedup on signature: a collision reuses the existing durable id (stable
    // across rename), attaching the new name/metadata to the same blueprint.
    const existing = catalogue.findBySignature(signature);
    const bp = existing ?? new Blueprint();
    const blueprintId = existing
      ? existing.getBlueprintId()
      : mintBlueprintId(input.name, signature);

    bp.blueprintId = blueprintId;
    bp.signature = signature;
    bp.name = input.name;
    bp.baseClass = input.baseClass;
    bp.mixinNames = mixinNames;
    bp.kind = input.kind ?? 'composition';
    bp.classPath = input.classPath ?? '';
    bp.parent = input.parent ?? '';
    bp.blessed = input.blessed ?? false;
    bp.description = input.description ?? '';

    // The curated layer's source of truth is a `kind: 'blueprint'` document
    // on the platform's own `/blueprints/` branch (the platform's claim,
    // held by the executive). `DocumentApi.save` gates the write,
    // stamps the owner, and records provenance keyed on the document path
    // (one ledger row, not two — the former synthetic per-id path is gone).
    try {
      await DocumentApi.save(
        `${BLUEPRINT_MINT_BRANCH}/${blueprintId}`,
        'blueprint',
        bp.toCuratedData(),
      );
    } catch (err) {
      if (err instanceof SecurityError) {
        return { disposition: 'denied', message: 'you do not hold /blueprints' };
      }
      throw err;
    }
    catalogue.upsert(bp);

    return { disposition: 'committed', blueprintId };
  }

  /** See {@link StudioApi.listMixins}. */
  @CallSecurity(StudioApiCallers)
  public async listMixins(): Promise<MixinPalette> {
    const sources = this.getExportSources();
    const mixins: MixinPaletteEntry[] = [];
    for (const base of PALETTE_BASE_CLASSES) {
      mixins.push({ name: base, kind: 'base' });
    }
    for (const name of Object.values(Mixins)) {
      const entry: MixinPaletteEntry = { name, kind: 'mixin' };
      // Inline one-line help, sourced from the mixin's TSDoc doc comment (or
      // its companion interface's). Degrades to `undefined` when undocumented.
      const summary = mixinSummary(name, sources);
      if (summary) entry.summary = summary;
      mixins.push(entry);
    }

    // Each base class with the mixin set it already composes (its own
    // prototype-chain `_mixinName`s, deduped, composition order) — so a
    // client can pre-seed a base's composition instead of starting at 0.
    const bases: BaseClassEntry[] = [];
    for (const name of PALETTE_BASE_CLASSES) {
      const ctor = PALETTE_BASE_CTORS[name];
      const impliedMixins = ctor
        ? [
            ...new Set(
              MixinApi.queryMixins(ctor).map(
                (m) => m._mixinName ?? m.name ?? '<anonymous>'
              )
            ),
          ]
        : [];
      const file = sources.classes.get(name)?.file;
      bases.push({
        name,
        classPath: file ? mudRootedPath(file) : '',
        impliedMixins,
      });
    }

    return { mixins, bases };
  }

  /** See {@link StudioApi.createTemplate}. */
  @CallSecurity(StudioApiCallers)
  public async createTemplate(
    input: CreateTemplateInput
  ): Promise<TemplateWriteResult> {
    // Act #1 — "instantiate a template": save a NEW content template pointing
    // at an already-approved class. A write with no acting principal fails
    // closed before any I/O (everyone is an author — content-packs wave 3 —
    // but nobody is not somebody); title over the path is the template
    // chokepoint's gate, and the wizard-lockdown code-field gate inside
    // `saveTemplate` still applies to the `class` set — both surfaced as a
    // graceful `denied`, not a 500.
    if (actingActor() === null) {
      return { disposition: 'denied', message: 'no acting principal' };
    }

    const path = (input.path ?? '').trim();
    const classPath = (input.classPath ?? '').trim();
    if (!path || !classPath) {
      throw new StudioError('invalid', 'path and classPath are required');
    }

    // CREATE-only: an existing path is refused (updates go through
    // `CmsApi.write('content', …)`).
    const existing = await Template.findByPath(path);
    if (existing) {
      return {
        disposition: 'denied',
        message: `a template already exists at ${path}`,
      };
    }

    try {
      await TemplateApi.saveTemplate(path, classPath, input.data ?? {});
    } catch (err) {
      // The code-field gate (a non-wizard setting `class`) throws a
      // `TemplateError` at the `saveTemplate` chokepoint — a content-authoring
      // refusal, surfaced as a graceful `denied` (the wizard-lockdown stays
      // intact; this op just doesn't 500 on it). Anything else propagates.
      if (err instanceof TemplateError) {
        return { disposition: 'denied', message: (err as Error).message };
      }
      throw err;
    }

    return { disposition: 'committed', path };
  }

  /** See {@link StudioApi.scaffoldClass}. */
  @CallSecurity(StudioApiCallers)
  public async scaffoldClass(
    input: ScaffoldClassInput
  ): Promise<ScaffoldResult> {
    // Author-tier, open to all — scaffolding is inert client text (a wizard
    // gate applies only at commit). A null actor still fails the read gate.
    const actor = actingActor();

    const name = (input.name ?? '').trim();
    const baseClass = (input.baseClass ?? '').trim();
    if (!isValidClassName(name)) {
      throw new StudioError(
        'invalid',
        `'${name}' is not a valid PascalCase class name`
      );
    }
    if (!baseClass) {
      throw new StudioError('invalid', 'a base class is required');
    }
    const mixinNames = (input.mixinNames ?? []).filter(
      (m): m is string => typeof m === 'string' && m.length > 0
    );

    // The scaffold lives beside its base: `/platform/<branch>/<Name>.ts`,
    // the branch being the base class's own (its second path segment).
    const branch = baseClass.split('/')[2] ?? 'thing';
    const source = composeSource(name, baseClass, mixinNames, this.getExportSources(), `/platform/${branch}`);
    const targetPath = `/platform/${branch}/${name}.ts`;

    const result: ScaffoldResult = { source, targetPath };
    // A non-wizard cannot commit; hand back the reserved draft-branch path.
    // v1 does NOT persist — `_persistDraft` is the dormant seam.
    if (!(await AccessApi.isWizard(actor))) {
      const draftPath = `/home/${selfIdOf(actor)}/drafts/${name}.ts`;
      result.draftPath = draftPath;
      this._persistDraft(draftPath, source);
    }
    return result;
  }

  /** See {@link StudioApi.commitClass}. */
  @CallSecurity(StudioApiCallers)
  public async commitClass(
    input: CommitClassInput
  ): Promise<ClassCommitResult> {
    // Act #3 — committing a new class is a SOURCE write, wizard-gated. A
    // non-wizard gets a graceful `denied` disposition (the banner warned
    // before save), NOT a throw.
    const actor = actingActor();
    const targetPath = (input.targetPath ?? '').trim();
    if (!targetPath) {
      throw new StudioError('invalid', 'a targetPath is required');
    }
    const source = input.source ?? '';

    const display =
      targetPath === '/'
        ? SOURCE_ROOT_DISPLAY
        : SOURCE_ROOT_DISPLAY + targetPath;
    const denial = await gateSourceWrite(actor, display);
    if (denial) {
      // Graceful, non-throwing refusal — nothing is written.
      return { disposition: 'denied', message: denial };
    }

    // sourceAbs throws SourceTreeSandboxError on a mud-boundary escape.
    let abs: string;
    try {
      abs = sourceAbs(targetPath);
    } catch (err) {
      throw new StudioError('invalid', (err as Error).message);
    }

    await SourceTreeApi.write(abs, source);

    // The source is now persisted (committed) — attribute the authoring act
    // to the context-derived author (never a param). `SourceTreeApi.write`
    // bypasses the `saveTemplate` chokepoint, so it is recorded here (the
    // `/platform/idea/api/studio` provenance transport). Recorded regardless of the
    // reload outcome, since the file is persisted either way.
    await ProvenanceApi.recordAuthoring({ path: targetPath });

    // Class-then-template ordering: only on `reloaded: true` may the client
    // then save a template referencing the new `class:`. A compile failure
    // leaves the file persisted-but-not-live (the shipped CMS behavior) —
    // surfaced, never a 500.
    try {
      await HotReloadApi.reload(abs);
    } catch (err) {
      return {
        disposition: 'committed',
        classPath: targetPath,
        reloaded: false,
        reloadDetail: (err as Error).message,
      };
    }
    return {
      disposition: 'committed',
      classPath: targetPath,
      reloaded: true,
      reloadDetail: 'reloaded module',
    };
  }

  /**
   * The reserved draft-persistence seam. A non-wizard's scaffold
   * has a stable `/home/<self>/drafts/<Name>.ts` path, but v1 keeps the draft
   * in the client Monaco buffer only — persisting a non-executable draft
   * would need a new document `kind` and non-executing go-live semantics the
   * future review workflow owns. **Documented no-op**; the future workflow
   * fills it in against the `/home/<self>/` document-store branch.
   */
  private _persistDraft(_path: string, _source: string): void {
    // Intentionally empty — the review-workflow seam (see the StudioApi
    // doc comment). Do NOT execute a draft.
  }

  /**
   * The contributed authorable fields (+ runtime-state names) of a single
   * mixin. Tries to compose the mixin over a bare `Idea` so it can read clean
   * field names + best-effort type shapes through the same machinery
   * `describeClass` uses (`getAll*Fields` + a throwaway class-default read).
   * ANY failure (a mixin that needs a richer base, a throwing constructor)
   * degrades to a static read of the mixin's own `fieldMeta` with a `json`
   * shape — the card is always useful, and the names are now the declared
   * ones rather than guessed candidates.
   */
  private async describeMixinFields(
    mixinName: string,
    sources: ExportSources
  ): Promise<{ authorableFields: MixinFieldDetail[]; runtimeState: string[] }> {
    const file = sources.mixins.get(mixinName);
    let composed: AnyConstructor | null = null;
    if (file) {
      try {
        const factory = await StuffApi.resolveExport(
          mudRootedPath(file),
          mixinName
        );
        if (typeof factory === 'function') {
          composed = (factory as (base: AnyConstructor) => AnyConstructor)(
            Idea as unknown as AnyConstructor
          );
        }
      } catch {
        composed = null;
      }
    }

    if (composed) {
      try {
        const meta = MixinApi.getAllFieldMeta(composed);
        const persistent = MixinApi.getAllPersistentFields(composed);
        const instruction = MixinApi.getAllInstructionFields(composed);
        const instructionSet = new Set(instruction);
        const allFields = [...new Set([...persistent, ...instruction])];
        const authorableFields: MixinFieldDetail[] = [];
        for (const field of allFields) {
          if (!meta[field]?.authorable) continue;
          const { value } = await this.readClassDefault(composed, field);
          authorableFields.push({
            name: field,
            kind: instructionSet.has(field) ? 'instruction' : 'property',
            typeShape: inferTypeShape(value) ?? 'json',
          });
        }
        const runtimeState = persistent.filter((f) => meta[f]?.runtimeState);
        return { authorableFields, runtimeState };
      } catch {
        // fall through to the static fallback below
      }
    }

    // Fallback for a mixin whose factory will not compose over `Idea` or
    // whose class defaults throw. It used to fall back to the source
    // scan's CANDIDATE names — guesses, including ones that were never
    // fields. Now it composes over a bare base purely to read the
    // `fieldMeta` statics: no instance, no defaults, but the field names
    // are the declared ones rather than invented.
    try {
      const factory = file
        ? await StuffApi.resolveExport(mudRootedPath(file), mixinName)
        : null;
      if (typeof factory !== 'function') {
        return { authorableFields: [], runtimeState: [] };
      }
      const bare = (factory as (b: AnyConstructor) => AnyConstructor)(
        class {} as unknown as AnyConstructor
      );
      const meta = MixinApi.getAllFieldMeta(bare);
      const instructionSet = new Set(MixinApi.getAllInstructionFields(bare));
      const authorableFields: MixinFieldDetail[] = Object.entries(meta)
        .filter(([, e]) => e.authorable)
        .map(([name]) => ({
          name,
          kind: instructionSet.has(name)
            ? ('instruction' as const)
            : ('property' as const),
          typeShape: 'json' as const,
        }));
      const runtimeState = Object.entries(meta)
        .filter(([, e]) => e.persistent && e.runtimeState)
        .map(([name]) => name);
      return { authorableFields, runtimeState };
    } catch {
      return { authorableFields: [], runtimeState: [] };
    }
  }

  /** Lazily build + cache the export-source scan (mixin/base → file). */
  private getExportSources(): ExportSources {
    if (!this.exportSources) this.exportSources = scanExportSources();
    return this.exportSources;
  }

  /**
   * Resolve the ungated {@link BlueprintCatalogue} singleton (the
   * gating-on-the-Api, reference-read-on-the-catalogue split). Prefers the
   * live registered instance (HMR/test-reset supersede a stale handle).
   */
  private async requireCatalogue(): Promise<BlueprintCatalogue> {
    const found =
      StuffApi.findByTemplatePath<BlueprintCatalogue>(CATALOGUE_PATH);
    if (found) return found;
    return StuffApi.singleton<BlueprintCatalogue>(CATALOGUE_PATH);
  }

  /** Lazily load + cache the TypeDoc enrichment artifact. */
  /** Lazily load + cache the artifact; empty (no fields) when absent. */
  private getArtifact(): AuthorableFieldsArtifact {
    if (!this.artifact) {
      try {
        this.artifact = JSON.parse(
          readFileSync(ARTIFACT_PATH, 'utf8')
        ) as AuthorableFieldsArtifact;
      } catch {
        this.artifact = { fields: {}, coverage: { unclassified: [], doubleClassified: [] } };
      }
    }
    return this.artifact;
  }

  /**
   * The `_mixinName` of the first effective mixin (leaf-first) whose **own**
   * `fieldMeta` declares `field` as persistent or instruction — the
   * declaring layer, for classification + attribution. `null` for a field
   * owned by a base (non-mixin) class.
   *
   * Reads the OWN static only (`hasOwnProperty`): a subclass mixin inherits
   * an ancestor mixin's `fieldMeta` through the prototype chain, so a plain
   * `m.fieldMeta` would mis-attribute a field to the wrong (outer) mixin
   * and read the wrong classification.
   */
  private ownerMixinOf(
    mixins: ReadonlyArray<{
      _mixinName?: string;
      name?: string;
      fieldMeta?: FieldMeta;
    }>,
    field: string,
    _instructionSet: Set<string>
  ): string | null {
    for (const m of mixins) {
      if (!Object.prototype.hasOwnProperty.call(m, 'fieldMeta')) continue;
      const meta = m.fieldMeta;
      if (!meta || typeof meta !== 'object') continue;
      const entry = meta[field];
      if (entry?.persistent === true || entry?.instruction === true) {
        return m._mixinName ?? m.name ?? '<anonymous>';
      }
    }
    return null;
  }

  /** The artifact descriptor for `mixin`.`field`, or null (join by name). */
  private artifactFor(
    artifact: AuthorableFieldsArtifact,
    mixin: string,
    field: string
  ): AuthorableFieldDescriptor | null {
    const list = artifact.fields[mixin];
    if (!list) return null;
    return list.find((d) => d.field === field) ?? null;
  }

  /**
   * Effective value + the source it came from, reading through the engine's
   * own accessors (never reimplementing the resolution chain):
   *
   *   - a live instance holding its own value → `instance`;
   *   - a live instance with no own value but a zone/biome
   *     `lookupField` default → `resolution-chain`;
   *   - no live instance → a guarded throwaway construction reads the
   *     class field initializer → `class-default`.
   */
  private async readEffectiveValue(
    instance: Stuff | null,
    ctor: AnyConstructor,
    field: string
  ): Promise<{ value: unknown; valueSource: StudioValueSource }> {
    if (instance) {
      const got = readViaGetter(instance, field);
      const own = readOwn(instance, field);
      const hasOwn = own !== undefined && own !== null && own !== '';
      if (hasOwn) return { value: got ?? own, valueSource: 'instance' };
      const chained = await this.probeResolutionChain(instance, field);
      if (chained !== undefined && chained !== null) {
        return { value: chained, valueSource: 'resolution-chain' };
      }
      return { value: got, valueSource: 'instance' };
    }
    return this.readClassDefault(ctor, field);
  }

  /**
   * Ask the instance's nearest spatial zone for a `lookupField` default —
   * the engine's own inheritance walk (`Zone.lookupField` → biome
   * resolution). Duck-typed to avoid coupling to the zone types.
   */
  private async probeResolutionChain(
    instance: Stuff,
    field: string
  ): Promise<unknown> {
    const zone = (instance as { getZone?: () => unknown }).getZone?.();
    const lookup = (zone as { lookupField?: (f: string) => Promise<unknown> })
      ?.lookupField;
    if (typeof lookup !== 'function') return undefined;
    try {
      return await lookup.call(zone, field);
    } catch {
      return undefined;
    }
  }

  /**
   * Read a field's class-default off a throwaway construction (no live
   * instance existed). Constructed + destructed through the Api so the
   * construction sentinel + registry stay consistent; guarded so a
   * side-effecting `postRegister` never breaks a read.
   */
  private async readClassDefault(
    ctor: AnyConstructor,
    field: string
  ): Promise<{ value: unknown; valueSource: StudioValueSource }> {
    let created: Stuff | null = null;
    try {
      created = await StuffApi.create(
        () => new (ctor as unknown as new () => Stuff)()
      );
      const got = readViaGetter(created, field);
      const value = got !== undefined ? got : readOwn(created, field);
      return { value, valueSource: 'class-default' };
    } catch {
      return { value: undefined, valueSource: 'class-default' };
    } finally {
      if (created) {
        try {
          StuffApi.destruct(created);
        } catch {
          /* best-effort cleanup of the throwaway */
        }
      }
    }
  }
}

/** Project a stored {@link Blueprint} to its wire summary. */
function toSummary(bp: Blueprint): BlueprintSummary {
  const s: BlueprintSummary = {
    blueprintId: bp.getBlueprintId(),
    name: bp.getName(),
    kind: bp.getKind(),
    baseClass: bp.getBaseClass(),
    mixinNames: [...bp.getMixinNames()],
    blessed: bp.isBlessed(),
    signature: bp.getSignature(),
  };
  const classPath = bp.getClassPath();
  if (classPath) s.classPath = classPath;
  const parent = bp.getParent();
  if (parent) s.parent = parent;
  const description = bp.getDescription();
  if (description) s.description = description;
  return s;
}

/** Project a stored {@link Blueprint} to its wire detail (summary + sig). */
function toDetail(bp: Blueprint): BlueprintDetail {
  return { ...toSummary(bp), signature: bp.getSignature() };
}

/**
 * Mint a stable, unique blueprintId for a brand-new composition — a name
 * slug plus a short signature-derived suffix (so two distinct compositions
 * that happen to share a name don't collide on id).
 */
function mintBlueprintId(name: string, signature: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'blueprint';
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return `${slug}-${(hash >>> 0).toString(36)}`;
}

/** Infer a readable widget-selection type string from a sample value. */
function inferTypeShape(value: unknown): string {
  if (value === null || value === undefined) return 'json';
  if (value instanceof Quantity) return 'Quantity';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'json';
}
