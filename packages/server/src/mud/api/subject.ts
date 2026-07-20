/**
 * SubjectApi — thin facade over the SubjectCatalogue singleton.
 *
 * Stable caller-facing surface for the `subject` controller, the chat
 * retrofit (`ChannelCatalogue` reads audience + subscriptions through
 * here), and the forum board substrate (Wave 1+). Mirrors `ChatApi`.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link SubjectLogic} singleton at `/obj/api/subject`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/subject` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import type Subject from '../lib/forum/Subject';
import type { SubjectSurface } from '../lib/forum/Subject';
import type SubjectCatalogue from '../obj/SubjectCatalogue';
import type {
  SubjectSubscription,
  MakeSubjectOptions,
} from '../obj/SubjectCatalogue';
import type Avatar from '../obj/Avatar';
import { SubjectLogic } from '../obj/api/SubjectLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/subject';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/SubjectLogic', import.meta.url),
);

/** Resolve the HMR-able SubjectLogic singleton (sync). */
function logic(): SubjectLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SubjectLogic',
      ) as typeof SubjectLogic | null) ?? SubjectLogic)(),
  );
}

export class SubjectApi {
  static async makeSubject(
    owner: Stuff,
    title: string,
    opts?: MakeSubjectOptions,
  ): Promise<Subject> {
    return logic().makeSubject(owner, title, opts);
  }

  static async makeThreadSubject(
    owner: Stuff,
    parent: Subject,
    threadName: string,
  ): Promise<Subject> {
    return logic().makeThreadSubject(owner, parent, threadName);
  }

  static async resolveByTitle(title: string): Promise<Subject | null> {
    return logic().resolveByTitle(title);
  }

  static async resolveById(id: string): Promise<Subject | null> {
    return logic().resolveById(id);
  }

  static async resolveBoardScoped(
    boardTitle: string,
    threadName: string,
  ): Promise<Subject | null> {
    return logic().resolveBoardScoped(boardTitle, threadName);
  }

  static async addManifestation(
    subject: Subject,
    surface: SubjectSurface,
    ref: string,
  ): Promise<void> {
    return logic().addManifestation(subject, surface, ref);
  }

  static async visibleSubjects(actor: Stuff): Promise<Subject[]> {
    return logic().visibleSubjects(actor);
  }

  static async isAudienceMember(actor: Stuff, subject: Subject): Promise<boolean> {
    return logic().isAudienceMember(actor, subject);
  }

  static async getSubscription(
    avatar: Avatar,
    subjectId: string,
  ): Promise<SubjectSubscription> {
    return logic().getSubscription(avatar, subjectId);
  }

  static async setSubscription(
    avatar: Avatar,
    subjectId: string,
    next: Partial<SubjectSubscription>,
  ): Promise<SubjectSubscription> {
    return logic().setSubscription(avatar, subjectId, next);
  }

  static async follow(
    avatar: Avatar,
    subjectId: string,
    followed: boolean,
  ): Promise<SubjectSubscription> {
    return logic().follow(avatar, subjectId, followed);
  }

  static async mute(
    avatar: Avatar,
    subjectId: string,
    surface: SubjectSurface,
    muted: boolean,
  ): Promise<SubjectSubscription> {
    return logic().mute(avatar, subjectId, surface, muted);
  }

  static async migrateLegacySubscription(
    avatar: Avatar,
    subjectId: string,
    legacy: { tunedIn: boolean; muted: boolean },
  ): Promise<SubjectSubscription> {
    return logic().migrateLegacySubscription(avatar, subjectId, legacy);
  }

  static async renameSubject(subject: Subject, newTitle: string): Promise<void> {
    return logic().renameSubject(subject, newTitle);
  }

  static async deleteSubject(subject: Subject): Promise<void> {
    return logic().deleteSubject(subject);
  }

  static async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    return logic().getBackingGroupIds();
  }

  static async reservedNames(): Promise<ReadonlySet<string>> {
    return logic().reservedNames();
  }

  static async catalogue(): Promise<SubjectCatalogue> {
    return logic().catalogue();
  }
}
