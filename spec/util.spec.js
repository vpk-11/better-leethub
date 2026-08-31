import {
  archiveAndResetStats,
  buildProblemPath,
  parseCustomCommitMessage,
  computeStatsFromReadmes,
  syncStatsFromRepo,
} from '../scripts/leetcode/util.js';

describe('buildProblemPath', () => {
  const problem = '0001-two-sum';
  const difficulty = 'Easy';
  const language = 'Python3';

  it('always prefixes LeetCode/, with no folders on', () => {
    expect(
      buildProblemPath(problem, difficulty, language, {
        folderDifficulty: false,
        folderLanguage: false,
      })
    ).toBe('LeetCode/0001-two-sum');
  });

  it('difficulty folder only', () => {
    expect(
      buildProblemPath(problem, difficulty, language, {
        folderDifficulty: true,
        folderLanguage: false,
      })
    ).toBe('LeetCode/Easy/0001-two-sum');
  });

  it('language folder only', () => {
    expect(
      buildProblemPath(problem, difficulty, language, {
        folderDifficulty: false,
        folderLanguage: true,
      })
    ).toBe('LeetCode/Python3/0001-two-sum');
  });

  it('language wins over difficulty when both are on - difficulty nests inside language', () => {
    expect(
      buildProblemPath(problem, difficulty, language, {
        folderDifficulty: true,
        folderLanguage: true,
      })
    ).toBe('LeetCode/Python3/Easy/0001-two-sum');
  });
});

describe('parseCustomCommitMessage', () => {
  it('substitutes known variables', () => {
    const template = '{date} - {problemName} - {problemTopic} - {difficulty} - {language}';
    const context = {
      date: '08-22-2026',
      problemName: '0001-two-sum',
      problemTopic: 'Array',
      difficulty: 'Easy',
      language: 'Python3',
    };
    expect(parseCustomCommitMessage(template, context)).toBe(
      '08-22-2026 - 0001-two-sum - Array - Easy - Python3'
    );
  });

  it('leaves unknown placeholders as literal text', () => {
    expect(parseCustomCommitMessage('{unknown} stays', {})).toBe('{unknown} stays');
  });
});

describe('syncStatsFromRepo', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.chrome = {
      runtime: {},
      storage: {
        local: {
          get: (keys, cb) => {
            const data = {
              leethub_hook: 'owner/repo',
              leethub_token: 'fake-token',
              stats: { shas: {} },
            };
            if (cb) cb(data);
            return Promise.resolve(data);
          },
          set: (obj, cb) => {
            if (cb) cb();
            return Promise.resolve();
          },
        },
      },
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reads stats.json from repository and calculates solved total', async () => {
    global.fetch = async url => {
      if (url.includes('stats.json')) {
        return {
          ok: true,
          json: async () => ({
            content: btoa(JSON.stringify({ easy: '5', medium: '10', hard: '2' })),
          }),
        };
      }
      return { ok: false };
    };

    const stats = await syncStatsFromRepo();
    expect(stats.easy).toBe(5);
    expect(stats.medium).toBe(10);
    expect(stats.hard).toBe(2);
    expect(stats.solved).toBe(17);
  });
});

describe('computeStatsFromReadmes', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses tree and counts problem difficulties', async () => {
    global.fetch = async url => {
      if (url.includes('/git/trees/HEAD')) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { type: 'blob', path: 'LeetCode/Easy/0001-two-sum/README.md' },
              { type: 'blob', path: 'LeetCode/Medium/0002-add-two-numbers/README.md' },
              { type: 'blob', path: 'README.md' },
            ],
          }),
        };
      }
      if (url.includes('0001-two-sum')) {
        return {
          ok: true,
          json: async () => ({
            content: btoa('<h3>Easy</h3>'),
          }),
        };
      }
      if (url.includes('0002-add-two-numbers')) {
        return {
          ok: true,
          json: async () => ({
            content: btoa('<h3>Medium</h3>'),
          }),
        };
      }
      return { ok: false };
    };

    const counts = await computeStatsFromReadmes('owner/repo', 'fake-token');
    expect(counts.easy).toBe(1);
    expect(counts.medium).toBe(1);
    expect(counts.hard).toBe(0);
  });

  it('returns all zeros when git tree response is not ok (empty repo)', async () => {
    global.fetch = async () => ({ ok: false });
    const counts = await computeStatsFromReadmes('owner/repo', 'fake-token');
    expect(counts.easy).toBe(0);
    expect(counts.medium).toBe(0);
    expect(counts.hard).toBe(0);
  });

  it('counts a problem once when the repo has duplicate READMEs for it under different folder shapes', async () => {
    global.fetch = async url => {
      if (url.includes('/git/trees/HEAD')) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              // same slug, two folder shapes - a leftover from toggling the difficulty
              // folder setting before v3-phase-09's fix
              { type: 'blob', path: 'LeetCode/0001-two-sum/README.md' },
              { type: 'blob', path: 'LeetCode/Easy/0001-two-sum/README.md' },
              { type: 'blob', path: 'LeetCode/Medium/0002-add-two-numbers/README.md' },
              { type: 'blob', path: 'README.md' },
            ],
          }),
        };
      }
      if (url.includes('0001-two-sum')) {
        return { ok: true, json: async () => ({ content: btoa('<h3>Easy</h3>') }) };
      }
      if (url.includes('0002-add-two-numbers')) {
        return { ok: true, json: async () => ({ content: btoa('<h3>Medium</h3>') }) };
      }
      return { ok: false };
    };

    const counts = await computeStatsFromReadmes('owner/repo', 'fake-token');
    expect(counts).toEqual({ easy: 1, medium: 1, hard: 0 });
  });

  it('counts correctly regardless of folder-structure depth (no folders, language-only, language+difficulty)', async () => {
    global.fetch = async url => {
      if (url.includes('/git/trees/HEAD')) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { type: 'blob', path: 'LeetCode/0001-two-sum/README.md' },
              { type: 'blob', path: 'LeetCode/Python3/0002-add-two-numbers/README.md' },
              { type: 'blob', path: 'LeetCode/Python3/Hard/0003-longest-substring/README.md' },
              { type: 'blob', path: 'README.md' },
            ],
          }),
        };
      }
      if (url.includes('0001-two-sum')) {
        return { ok: true, json: async () => ({ content: btoa('<h3>Easy</h3>') }) };
      }
      if (url.includes('0002-add-two-numbers')) {
        return { ok: true, json: async () => ({ content: btoa('<h3>Medium</h3>') }) };
      }
      if (url.includes('0003-longest-substring')) {
        return { ok: true, json: async () => ({ content: btoa('<h3>Hard</h3>') }) };
      }
      return { ok: false };
    };

    const counts = await computeStatsFromReadmes('owner/repo', 'fake-token');
    expect(counts).toEqual({ easy: 1, medium: 1, hard: 1 });
  });
});

describe('archiveAndResetStats', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.chrome = {
      runtime: {},
      storage: {
        local: {
          get: (keys, cb) => {
            const data = {
              leethub_hook: 'owner/repo',
              leethub_token: 'fake-token',
              stats: { shas: {} },
            };
            if (cb) cb(data);
            return Promise.resolve(data);
          },
          set: (obj, cb) => {
            if (cb) cb();
            return Promise.resolve();
          },
        },
      },
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('archives via a small fixed number of Git Data API calls, not one call per file', async () => {
    const calls = [];
    const manyFiles = Array.from({ length: 40 }, (_, i) => ({
      path: `LeetCode/000${i}-problem/README.md`,
      mode: '100644',
      type: 'blob',
      sha: `sha-${i}`,
    }));

    global.fetch = async (url, options = {}) => {
      const method = options.method || 'GET';
      calls.push({ url, method });

      if (url.includes('/git/trees/HEAD')) {
        return {
          ok: true,
          json: async () => ({
            sha: 'base-tree-sha',
            tree: [
              ...manyFiles,
              { path: 'stats.json', mode: '100644', type: 'blob', sha: 'old-stats-sha' },
              { path: 'README.md', mode: '100644', type: 'blob', sha: 'old-readme-sha' },
              { path: 'config.json', mode: '100644', type: 'blob', sha: 'config-sha' },
            ],
          }),
        };
      }
      if (url.includes('/git/refs/heads/main') && method === 'GET') {
        return { ok: true, json: async () => ({ object: { sha: 'parent-commit-sha' } }) };
      }
      if (url.includes('/git/blobs')) {
        return { ok: true, json: async () => ({ sha: 'new-blob-sha' }) };
      }
      if (url.endsWith('/git/trees')) {
        return { ok: true, json: async () => ({ sha: 'new-tree-sha' }) };
      }
      if (url.includes('/git/commits')) {
        return { ok: true, json: async () => ({ sha: 'new-commit-sha' }) };
      }
      if (url.includes('/git/refs/heads/main') && method === 'PATCH') {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false };
    };

    const stats = await archiveAndResetStats();

    expect(stats.easy).toBe(0);
    expect(stats.medium).toBe(0);
    expect(stats.hard).toBe(0);
    expect(stats.solved).toBe(0);
    // Exactly 7 calls regardless of how many files were archived (40 here) - tree read, ref
    // read, 2 blob creates (stats.json + README.md), tree-patch create, commit create, ref
    // update.
    expect(calls.length).toBe(7);

    const treePatchCall = calls.find(c => c.url.endsWith('/git/trees') && c.method === 'POST');
    expect(treePatchCall).toBeDefined();
  });
});
