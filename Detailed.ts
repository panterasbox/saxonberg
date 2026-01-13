import { Templatized } from "..";
import { Constructor, Mixin, Mixins } from "../../../util/mixin";
import { StuffTemplate } from "../domain/StuffTemplate";
import { IStuff } from "./Stuff";

export const PATH_DELIM = ".";

export type DetailId = string;
export type DetailMap = Map<DetailId, Detail>;

export interface Detail {
  ids: Set<DetailId>;
  description: string;
  details: Map<DetailId, Detail> | undefined;
}

export interface Detailed extends Templatized {
  details: Map<DetailId, Detail>;
}

export type DetailedConstraint = IStuff & Templatized;

export function DetailedMixin<T extends Constructor<DetailedConstraint>>(
  Base: T
) {
  @Mixin(Mixins.Detailed)
  class BaseDetailed extends Base implements Detailed {
    details: DetailMap = new Map();

    constructor(...args: any[]) {
      super(...args);
    }

    getDetail(id: DetailId, parent?: DetailId): string | null {
      const resolved = this.resolveParent(parent, id);
      if (!resolved) {
        return null;
      }
      const [details, resolvedId] = resolved;
      if (!resolvedId || !details?.has(resolvedId)) {
        return null;
      }
      return details.get(resolvedId)?.description || null;
    }

    getDetailIds(parent?: DetailId): DetailId[] | null {
      const resolved = this.resolveParent(parent);
      if (!resolved) {
        return null;
      }
      const [details, resolvedId] = resolved;
      if (!details) {
        return null;
      }
      return Array.from(details.keys());
    }

    getDeepDetailIds(parent?: DetailId): string[] | null {
      const resolved = this.resolveParent(parent);
      if (!resolved) {
        return null;
      }
      const [details, resolvedId] = resolved;
      if (!details) {
        return null;
      }
      return this.resolveChildIds(details, "");
    }

    setDetail(ids: DetailId[], description: string, parent?: DetailId): number {
      let result: number = 0;
      const detail = this.newOrExistingDetail(description);

      for (const id of ids) {
        const resolved = this.resolveParent(parent, id);
        if (!resolved) {
          continue;
        }
        const [details, resolvedId] = resolved;
        if (!resolvedId || details?.has(resolvedId)) {
          continue;
        }

        detail.ids.add(resolvedId);
        this.details.set(resolvedId, detail);
        result++;
      }

      return result;
    }

    removeDetail(ids: DetailId[], parent?: DetailId): number {
      let result: number = 0;

      for (const id of ids) {
        const resolved = this.resolveParent(parent, id);
        if (!resolved) {
          continue;
        }
        const [details, resolvedId] = resolved;
        if (!resolvedId || !details?.has(resolvedId)) {
          continue;
        }

        const detail = this.details.get(resolvedId);
        detail?.ids.delete(resolvedId);
        this.details.delete(resolvedId);
        result++;
      }

      return result;
    }

    private getParentDetails(path: DetailId[]): DetailMap | undefined {
      let details: DetailMap | undefined = this.details;
      for (let i = 0; i < path.length; i++) {
        if (!details || !details.has(path[i])) {
          return undefined;
        }
        details = details.get(path[i])?.details;
      }
      return details;
    }

    private resolveParent(
      parent?: DetailId,
      id?: DetailId
    ): [DetailMap?, DetailId?] | undefined {
      let details: DetailMap | undefined = this.details;

      if (id) {
        const pos = id.lastIndexOf(PATH_DELIM);
        if (pos >= 0) {
          if (parent && parent.length) {
            parent = parent + PATH_DELIM + id.substring(0, pos);
          } else {
            parent = id.substring(0, pos);
          }
          id = id.substring(pos);
        }
      }

      if (parent && parent.length) {
        const path = parent.split(PATH_DELIM);
        details = this.getParentDetails(path);
        if (!details) {
          return undefined;
        }
        details = details.get(path[path.length - 1])?.details;
      }

      return [details, id];
    }

    private resolveChildIds(details: DetailMap, parent: DetailId): DetailId[] {
      const result: string[] = [];

      details.forEach((detail, id) => {
        result.push(id);
        const path = parent + (parent.length ? PATH_DELIM : "") + id;
        if (detail.details) {
          result.push(...this.resolveChildIds(detail.details, path));
        }
      });

      return result;
    }

    private newOrExistingDetail(description: string): Detail {
      for (const [id, detail] of this.details.entries()) {
        if (detail.description == description) {
          return detail;
        }
      }
      return {
        ids: new Set(),
        description,
        details: new Map(),
      };
    }

    applyTemplate(template: StuffTemplate): void {
      super.applyTemplate(template);
      const tmpl = template.template;

      type DetailTemplate = {
        ids: string[];
        description: string;
        children: DetailTemplate[];
      };
      const applyDetail = (detail: DetailTemplate, parent?: string) => {
        this.setDetail(detail.ids, detail.description, parent);
        for (const child of detail.children || []) {
          for (const id of detail.ids) {
            applyDetail(child, id);
          }
        }
      };

      if ("detail" in tmpl) {
        for (const detail of tmpl.detail) {
          applyDetail(detail);
        }
      }
    }
  }

  return BaseDetailed;
}
