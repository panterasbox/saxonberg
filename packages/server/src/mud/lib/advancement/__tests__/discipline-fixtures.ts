/**
 * The discipline dictionary, stood up and warmed for a suite — as a
 * character's first band read leaves it in a running world (documents
 * D11: the dictionary is never booted, and a cold read throws). A suite has
 * no `content` collection behind it, so the rows are handed in.
 */

import { vi } from "vitest";
import DisciplineCatalogue from "../../../platform/idea/DisciplineCatalogue";
import { Template } from "../../stuff/Template";
import { TemplatePaths } from "../../paths";
import { StuffApi } from "../../../api/stuff";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";

/** Stand the dictionary up at its path, warmed from `rows` (default: none). */
export async function rememberDisciplines(
  rows: ReadonlyArray<Record<string, unknown>> = [],
): Promise<DisciplineCatalogue> {
  const spy = vi
    .spyOn(Template, "findByClass")
    .mockResolvedValue(
      rows.map((data) => ({ path: `/platform/idea/Discipline/${String(data.key)}`, data })) as never,
    );
  // One dictionary, as a world has: drop any a previous test left standing.
  for (let old = StuffApi.findByTemplatePath(TemplatePaths.disciplineCatalogue); old;
    old = StuffApi.findByTemplatePath(TemplatePaths.disciplineCatalogue)) {
    StuffApi.unregister(old);
  }
  const cat = makeStuffAtPath(() => new DisciplineCatalogue(), TemplatePaths.disciplineCatalogue);
  await cat.onCreate();
  spy.mockRestore();
  return cat;
}
