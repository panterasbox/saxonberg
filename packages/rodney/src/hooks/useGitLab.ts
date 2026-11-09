import { useEffect, useState } from 'react';

/** The public project — its API answers a browser directly (CORS `*`). */
export const GITLAB_PROJECT = 'panterasbox/saxonberg';
const API = `https://gitlab.com/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT)}`;
const REFRESH_MS = 30 * 60_000;

export interface GitLabFacts {
  /** When the project began on GitLab, epoch ms. */
  since: number | null;
  /** Merge requests merged, all time. */
  merged: number | null;
}

/**
 * Evergreen facts about the code from GitLab's public API, refreshed every
 * half hour. Each fact is null until it has been read; a failed read leaves
 * the last good value.
 */
export default function useGitLab(): GitLabFacts {
  const [facts, setFacts] = useState<GitLabFacts>({ since: null, merged: null });
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const [project, merged] = await Promise.all([
          fetch(API).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API}/merge_requests?state=merged&per_page=1`).then((r) =>
            r.ok ? Number(r.headers.get('X-Total')) || null : null
          ),
        ]);
        if (cancelled) return;
        setFacts((f) => ({
          since: project?.created_at ? Date.parse(project.created_at) : f.since,
          merged: merged ?? f.merged,
        }));
      } catch {
        // Offline or rate-limited — keep what we had.
      }
    };
    read();
    const id = setInterval(read, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return facts;
}
