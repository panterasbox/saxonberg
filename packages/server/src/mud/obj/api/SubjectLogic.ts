// SubjectLogic — the hot-reloadable logic singleton behind SubjectApi.
// (Doc comment lives on the class declaration so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Subject from '../../lib/forum/Subject';
import type { SubjectSurface } from '../../lib/forum/Subject';
import type SubjectCatalogue from '../SubjectCatalogue';
import type {
  SubjectSubscription,
  MakeSubjectOptions,
} from '../SubjectCatalogue';
import type Avatar from '../Avatar';

const CATALOGUE_PATH = '/obj/SubjectCatalogue';

const SubjectApiCallers = SecurityPolicies.FromModule(
  'mud/api/subject#SubjectApi',
);

/**
 * SubjectLogic — the hot-reloadable logic singleton behind {@link SubjectApi}.
 *
 * Lives at `/obj/api/subject` (a stateless `Stuff` singleton, no backing
 * `Template`); `SubjectApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`); the
 * `SubjectCatalogue` is resolved through the module-private
 * `requireCatalogue` free function.
 *
 * @internal
 */
@Unshadowable
export class SubjectLogic extends Idea {
  /** See {@link SubjectApi.makeSubject}. */
  @CallSecurity(SubjectApiCallers)
  public async makeSubject(
    owner: Stuff,
    title: string,
    opts?: MakeSubjectOptions,
  ): Promise<Subject> {
    return (await requireCatalogue()).makeSubject(owner, title, opts);
  }

  /** See {@link SubjectApi.makeThreadSubject}. */
  @CallSecurity(SubjectApiCallers)
  public async makeThreadSubject(
    owner: Stuff,
    parent: Subject,
    threadName: string,
  ): Promise<Subject> {
    return (await requireCatalogue()).makeThreadSubject(owner, parent, threadName);
  }

  /** See {@link SubjectApi.resolveByTitle}. */
  @CallSecurity(SubjectApiCallers)
  public async resolveByTitle(title: string): Promise<Subject | null> {
    return (await requireCatalogue()).resolveByTitle(title);
  }

  /** See {@link SubjectApi.resolveById}. */
  @CallSecurity(SubjectApiCallers)
  public async resolveById(id: string): Promise<Subject | null> {
    return (await requireCatalogue()).resolveById(id);
  }

  /** See {@link SubjectApi.resolveBoardScoped}. */
  @CallSecurity(SubjectApiCallers)
  public async resolveBoardScoped(
    boardTitle: string,
    threadName: string,
  ): Promise<Subject | null> {
    return (await requireCatalogue()).resolveBoardScoped(boardTitle, threadName);
  }

  /** See {@link SubjectApi.addManifestation}. */
  @CallSecurity(SubjectApiCallers)
  public async addManifestation(
    subject: Subject,
    surface: SubjectSurface,
    ref: string,
  ): Promise<void> {
    return (await requireCatalogue()).addManifestation(subject, surface, ref);
  }

  /** See {@link SubjectApi.visibleSubjects}. */
  @CallSecurity(SubjectApiCallers)
  public async visibleSubjects(actor: Stuff): Promise<Subject[]> {
    return (await requireCatalogue()).visibleSubjects(actor);
  }

  /** See {@link SubjectApi.isAudienceMember}. */
  @CallSecurity(SubjectApiCallers)
  public async isAudienceMember(actor: Stuff, subject: Subject): Promise<boolean> {
    return (await requireCatalogue()).isAudienceMember(actor, subject);
  }

  /** See {@link SubjectApi.getSubscription}. */
  @CallSecurity(SubjectApiCallers)
  public async getSubscription(
    avatar: Avatar,
    subjectId: string,
  ): Promise<SubjectSubscription> {
    return (await requireCatalogue()).getSubscription(avatar, subjectId);
  }

  /** See {@link SubjectApi.setSubscription}. */
  @CallSecurity(SubjectApiCallers)
  public async setSubscription(
    avatar: Avatar,
    subjectId: string,
    next: Partial<SubjectSubscription>,
  ): Promise<SubjectSubscription> {
    return (await requireCatalogue()).setSubscription(avatar, subjectId, next);
  }

  /** See {@link SubjectApi.follow}. */
  @CallSecurity(SubjectApiCallers)
  public async follow(
    avatar: Avatar,
    subjectId: string,
    followed: boolean,
  ): Promise<SubjectSubscription> {
    return (await requireCatalogue()).follow(avatar, subjectId, followed);
  }

  /** See {@link SubjectApi.mute}. */
  @CallSecurity(SubjectApiCallers)
  public async mute(
    avatar: Avatar,
    subjectId: string,
    surface: SubjectSurface,
    muted: boolean,
  ): Promise<SubjectSubscription> {
    return (await requireCatalogue()).mute(avatar, subjectId, surface, muted);
  }

  /** See {@link SubjectApi.migrateLegacySubscription}. */
  @CallSecurity(SubjectApiCallers)
  public async migrateLegacySubscription(
    avatar: Avatar,
    subjectId: string,
    legacy: { tunedIn: boolean; muted: boolean },
  ): Promise<SubjectSubscription> {
    return (await requireCatalogue()).migrateLegacySubscription(
      avatar,
      subjectId,
      legacy,
    );
  }

  /** See {@link SubjectApi.renameSubject}. */
  @CallSecurity(SubjectApiCallers)
  public async renameSubject(subject: Subject, newTitle: string): Promise<void> {
    return (await requireCatalogue()).renameSubject(subject, newTitle);
  }

  /** See {@link SubjectApi.deleteSubject}. */
  @CallSecurity(SubjectApiCallers)
  public async deleteSubject(subject: Subject): Promise<void> {
    return (await requireCatalogue()).deleteSubject(subject);
  }

  /** See {@link SubjectApi.getBackingGroupIds}. */
  @CallSecurity(SubjectApiCallers)
  public async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    return (await requireCatalogue()).getBackingGroupIds();
  }

  /** See {@link SubjectApi.reservedNames}. */
  @CallSecurity(SubjectApiCallers)
  public async reservedNames(): Promise<ReadonlySet<string>> {
    return (await requireCatalogue()).reservedNames();
  }

  /** See {@link SubjectApi.catalogue}. */
  @CallSecurity(SubjectApiCallers)
  public async catalogue(): Promise<SubjectCatalogue> {
    return requireCatalogue();
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private, off-class, not part of the public surface).
// ---------------------------------------------------------------------------

let catalogueRef: SubjectCatalogue | null = null;

async function requireCatalogue(): Promise<SubjectCatalogue> {
  if (catalogueRef) return catalogueRef;
  const cat = StuffApi.findByTemplatePath<SubjectCatalogue>(CATALOGUE_PATH);
  if (cat) {
    catalogueRef = cat;
    return cat;
  }
  const lazy = await StuffApi.singleton<SubjectCatalogue>(CATALOGUE_PATH);
  catalogueRef = lazy;
  return lazy;
}
