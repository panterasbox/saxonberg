import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * `virtual:repo-stats` — facts about the Saxonberg checkout Rodney runs from,
 * counted when the dev server (or a build) starts: content packs, subsystem
 * docs, slates, lines of TypeScript and test files. Fresh each time the
 * overlay is started for a show; no network, no server.
 */
function repoStats(): Plugin {
  const id = 'virtual:repo-stats';
  const resolved = '\0' + id;
  return {
    name: 'rodney-repo-stats',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(loadId) {
      if (loadId !== resolved) return;
      const root = resolve(__dirname, '../..');
      const files = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n');
      const isTest = (f: string) => f.includes('__tests__/') || /\.test\.tsx?$/.test(f);
      const ts = files.filter((f) => /^packages\/.*\.tsx?$/.test(f));
      let lines = 0;
      for (const f of ts.filter((f) => !isTest(f))) {
        lines += readFileSync(resolve(root, f), 'utf8').split('\n').length;
      }
      const stats = {
        packs: files.filter((f) => /^packages\/content\/[^/]+\/pack\.yaml$/.test(f)).length,
        subsystems: files.filter((f) => /^docs\/subsystems\/[^/]+\.md$/.test(f)).length,
        slates: files.filter((f) => /^docs\/slates\/.+\.md$/.test(f) && !f.endsWith('README.md')).length,
        linesOfTypeScript: lines,
        testFiles: ts.filter(isTest).length,
        countedAt: Date.now(),
      };
      return `export default ${JSON.stringify(stats)};`;
    },
  };
}

// Multi-page: each overlay is its own entry so OBS points a Browser Source at
// a dedicated, unauthenticated page (e.g. http://localhost:5200/standby.html).
export default defineConfig({
  plugins: [react(), repoStats()],
  server: { port: 5200 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        standby: resolve(__dirname, 'standby.html'),
        live: resolve(__dirname, 'live.html'),
      },
    },
  },
});
