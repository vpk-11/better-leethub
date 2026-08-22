import {
  buildProblemPath,
  mergeStats,
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

describe('mergeStats', () => {
  it('should correctly merge stats', () => {
    const obj1 = {
      easy: 1,
      hard: 0,
      medium: 1,
      shas: {
        '0003-longest-substring-without-repeating-characters': {
          '0003-longest-substring-without-repeating-characters.js':
            '2f4a1eba5c5c7cb86e115f10252c5afb3d1bf528',
          'README.md': '23fe8b26580352e70c75f4236710f6846864a455',
          difficulty: 'medium',
        },
        '0021-merge-two-sorted-lists': {
          '0021-merge-two-sorted-lists.js': 'f393d2c3b716a7f7196af020cd7c8f7e8c994759',
          'README.md': '859aec2842f4b0ee5bcbc96fb86ed1988c287b12',
          difficulty: 'easy',
        },
      },
      solved: 2,
    };

    const obj2 = {
      easy: 1,
      hard: 1,
      medium: 0,
      shas: {
        '0021-merge-two-sorted-lists': {
          '0021-merge-two-sorted-lists.js': 'a393d2c3b716a7f7196af020cd7c8f7e8c994759',
          'README.md': '959aec2842f4b0ee5bcbc96fb86ed1988c287b12',
          difficulty: 'easy',
        },
        '0022-generate-parentheses': {
          '0022-generate-parentheses.js': '4e4a1eba5c5c7cb86e115f10252c5afb3d1bf529',
          'README.md': '33fe8b26580352e70c75f4236710f6846864a456',
          difficulty: 'hard',
        },
        '0024-sample': {
          '0022-generate-parentheses.js': '4e4a1eba5c5c7cb86e115f10252c5afb3d1bf529',
          'README.md': '33fe8b26580352e70c75f4236710f6846864a456',
          difficulty: 'hard',
        },
      },
      solved: 3,
    };

    const result = mergeStats(obj1, obj2);
    const expected = {
      easy: 1,
      hard: 2,
      medium: 1,
      shas: {
        '0003-longest-substring-without-repeating-characters': {
          '0003-longest-substring-without-repeating-characters.js':
            '2f4a1eba5c5c7cb86e115f10252c5afb3d1bf528',
          'README.md': '23fe8b26580352e70c75f4236710f6846864a455',
          difficulty: 'medium',
        },
        '0021-merge-two-sorted-lists': {
          '0021-merge-two-sorted-lists.js': 'a393d2c3b716a7f7196af020cd7c8f7e8c994759',
          'README.md': '959aec2842f4b0ee5bcbc96fb86ed1988c287b12',
          difficulty: 'easy',
        },
        '0022-generate-parentheses': {
          '0022-generate-parentheses.js': '4e4a1eba5c5c7cb86e115f10252c5afb3d1bf529',
          'README.md': '33fe8b26580352e70c75f4236710f6846864a456',
          difficulty: 'hard',
        },
        '0024-sample': {
          '0022-generate-parentheses.js': '4e4a1eba5c5c7cb86e115f10252c5afb3d1bf529',
          'README.md': '33fe8b26580352e70c75f4236710f6846864a456',
          difficulty: 'hard',
        },
      },
      solved: 4,
    };
    expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
  });

  it('should work when one has no stats', () => {
    const obj1 = {
      easy: 1,
      hard: 0,
      medium: 1,
      shas: {
        '0003-longest-substring-without-repeating-characters': {
          '0003-longest-substring-without-repeating-characters.js':
            '2f4a1eba5c5c7cb86e115f10252c5afb3d1bf528',
          'README.md': '23fe8b26580352e70c75f4236710f6846864a455',
          difficulty: 'medium',
        },
        '0021-merge-two-sorted-lists': {
          '0021-merge-two-sorted-lists.js': 'f393d2c3b716a7f7196af020cd7c8f7e8c994759',
          'README.md': '859aec2842f4b0ee5bcbc96fb86ed1988c287b12',
          difficulty: 'easy',
        },
      },
      solved: 2,
    };

    const obj2 = {
      shas: {},
    };

    const result = mergeStats(obj1, obj2);
    const expected = {
      easy: 1,
      hard: 0,
      medium: 1,
      shas: {
        '0003-longest-substring-without-repeating-characters': {
          '0003-longest-substring-without-repeating-characters.js':
            '2f4a1eba5c5c7cb86e115f10252c5afb3d1bf528',
          'README.md': '23fe8b26580352e70c75f4236710f6846864a455',
          difficulty: 'medium',
        },
        '0021-merge-two-sorted-lists': {
          '0021-merge-two-sorted-lists.js': 'f393d2c3b716a7f7196af020cd7c8f7e8c994759',
          'README.md': '859aec2842f4b0ee5bcbc96fb86ed1988c287b12',
          difficulty: 'easy',
        },
      },
      solved: 2,
    };
    expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
  });

  it('should correctly merge two objects with shas and difficulties', () => {
    const obj1 = {
      shas: {
        sha1: { difficulty: 'easy' },
        sha2: { difficulty: 'medium' },
      },
    };
    const obj2 = {
      shas: {
        sha3: { difficulty: 'hard' },
        sha4: { difficulty: 'easy' },
      },
    };

    const result = mergeStats(obj1, obj2);

    expect(result).toEqual({
      shas: {
        sha1: { difficulty: 'easy' },
        sha2: { difficulty: 'medium' },
        sha3: { difficulty: 'hard' },
        sha4: { difficulty: 'easy' },
      },
      easy: 2,
      medium: 1,
      hard: 1,
      solved: 4,
    });
  });

  it('should handle missing difficulties by setting them to zero', () => {
    const obj1 = {
      shas: {
        sha1: {},
      },
    };
    const obj2 = {
      shas: {
        sha2: {},
      },
    };

    const result = mergeStats(obj1, obj2);

    expect(JSON.stringify(result)).toBe(
      JSON.stringify({
        shas: {
          sha1: {},
          sha2: {},
        },
        easy: 0,
        medium: 0,
        hard: 0,
        solved: 0,
      })
    );
  });

  it('should handle empty objects', () => {
    const obj1 = {};
    const obj2 = {};

    const result = mergeStats(obj1, obj2);

    expect(JSON.stringify(result)).toEqual(
      JSON.stringify({
        easy: 0,
        medium: 0,
        hard: 0,
        solved: 0,
      })
    );
  });

  it('should correctly count difficulties from duplicate shas', () => {
    const obj1 = {
      shas: {
        sha1: { difficulty: 'easy' },
        sha2: { difficulty: 'medium' },
      },
    };
    const obj2 = {
      shas: {
        sha1: { difficulty: 'easy' },
        sha4: { difficulty: 'easy' },
      },
    };

    const result = mergeStats(obj1, obj2);

    expect(result).toEqual({
      shas: {
        sha1: { difficulty: 'easy' },
        sha2: { difficulty: 'medium' },
        sha4: { difficulty: 'easy' },
      },
      easy: 2,
      medium: 1,
      hard: 0,
      solved: 3,
    });
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
});
