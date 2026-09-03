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

  it('does not tally per-problem READMEs parked under Archive/ (post Archive & Reset)', async () => {
    global.fetch = async url => {
      if (url.includes('/git/trees/HEAD')) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { type: 'blob', path: 'LeetCode/Easy/0001-two-sum/README.md' },
              { type: 'blob', path: 'Archive/09-01-2026/LeetCode/Hard/0004-median/README.md' },
              { type: 'blob', path: 'Archive/09-01-2026/LeetCode/Medium/0002-add/README.md' },
            ],
          }),
        };
      }
      if (url.includes('0001-two-sum')) {
        return { ok: true, json: async () => ({ content: btoa('<h3>Easy</h3>') }) };
      }
      // archived READMEs still carry a difficulty tag - they must not be fetched or counted
      return { ok: true, json: async () => ({ content: btoa('<h3>Hard</h3>') }) };
    };

    const counts = await computeStatsFromReadmes('owner/repo', 'fake-token');
    expect(counts).toEqual({ easy: 1, medium: 0, hard: 0 });
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

  const manyFiles = Array.from({ length: 40 }, (_, i) => ({
    path: `LeetCode/00${String(i).padStart(2, '0')}-problem/README.md`,
    mode: '100644',
    type: 'blob',
    sha: `sha-${i}`,
  }));

  /** Wires global.fetch to a mock GitHub Git Data API. `configContent` is the raw (decoded)
   * text returned for a GET on contents/config.json; pass null to omit config.json entirely.
   * Returns the recorded call log. */
  function mockGitApi(configContent) {
    const calls = [];
    global.fetch = async (url, options = {}) => {
      const method = options.method || 'GET';
      calls.push({ url, method, body: options.body });

      if (url.includes('/git/trees/HEAD')) {
        return {
          ok: true,
          json: async () => ({
            sha: 'base-tree-sha',
            tree: [
              ...manyFiles,
              { path: 'stats.json', mode: '100644', type: 'blob', sha: 'old-stats-sha' },
              { path: 'README.md', mode: '100644', type: 'blob', sha: 'old-readme-sha' },
              { path: '.gitignore', mode: '100644', type: 'blob', sha: 'gitignore-sha' },
              {
                path: 'Archive/01-01-2026/stats.json',
                mode: '100644',
                type: 'blob',
                sha: 'old-archive-sha',
              },
              ...(configContent != null
                ? [{ path: 'config.json', mode: '100644', type: 'blob', sha: 'config-sha' }]
                : []),
            ],
          }),
        };
      }
      if (url.endsWith('/contents/config.json')) {
        return { ok: true, json: async () => ({ type: 'file', content: btoa(configContent) }) };
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
    return calls;
  }

  const treePatchOf = calls => {
    const call = calls.find(c => c.url.endsWith('/git/trees') && c.method === 'POST');
    return call ? JSON.parse(call.body).tree : null;
  };

  it('moves every file into the archive in a fixed call count, keeping a recognised config.json in place', async () => {
    const goodConfig = JSON.stringify({
      leethub_use_difficulty_folder: true,
      leethub_use_language_folder: false,
      leethub_use_timestamp_filename: false,
      leethub_auto_commit_solution_post: true,
      leethub_custom_commit_message: null,
    });
    const calls = mockGitApi(goodConfig);

    const stats = await archiveAndResetStats();
    expect(stats.solved).toBe(0);

    // tree read, ref read, config.json content read, 2 blob creates (stats.json + README.md),
    // tree-patch, commit, ref update - 8, regardless of the 40 files moved.
    expect(calls.length).toBe(8);

    const patch = treePatchOf(calls);
    const paths = patch.map(e => e.path);
    // recognised config.json + .gitignore + the prior Archive/ are left untouched (not in the patch)
    expect(paths).not.toContain('config.json');
    expect(paths).not.toContain('.gitignore');
    expect(paths.some(p => p.startsWith('Archive/01-01-2026/'))).toBe(false);
    // a problem file is moved (deleted at old path, recreated under Archive/)
    expect(
      patch.filter(e => e.path === 'LeetCode/0000-problem/README.md' && e.sha === null).length
    ).toBe(1);
    expect(paths.some(p => p.endsWith('/LeetCode/0000-problem/README.md'))).toBe(true);
    // fresh root files
    expect(patch.find(e => e.path === 'stats.json' && e.sha === 'new-blob-sha')).toBeDefined();
    expect(patch.find(e => e.path === 'README.md' && e.sha === 'new-blob-sha')).toBeDefined();
  });

  it('archives an unrecognised config.json and writes a fresh default in its place', async () => {
    const calls = mockGitApi(JSON.stringify({ totally: 'not a leethub config' }));

    await archiveAndResetStats();

    // one extra blob create (the replacement config.json) vs the keep-config case
    expect(calls.length).toBe(9);

    const patch = treePatchOf(calls);
    // old config.json removed from root and moved under Archive/
    expect(patch.filter(e => e.path === 'config.json' && e.sha === null).length).toBe(1);
    expect(patch.some(e => e.path.endsWith('/config.json') && e.sha === 'config-sha')).toBe(true);
    // fresh default config.json written at the root
    expect(patch.filter(e => e.path === 'config.json' && e.sha === 'new-blob-sha').length).toBe(1);
  });

  it('handles a repo with no config.json at all (no content read, no replacement)', async () => {
    const calls = mockGitApi(null);

    await archiveAndResetStats();

    // no contents/config.json read (nothing to inspect); still writes a fresh default config.json.
    // tree, ref, 3 blobs (stats + readme + config), tree-patch, commit, ref = 8.
    expect(calls.some(c => c.url.endsWith('/contents/config.json'))).toBe(false);
    expect(calls.length).toBe(8);
    const patch = treePatchOf(calls);
    expect(patch.filter(e => e.path === 'config.json').length).toBe(1); // only the fresh default
    expect(patch.find(e => e.path === 'config.json').sha).toBe('new-blob-sha');
  });
});
