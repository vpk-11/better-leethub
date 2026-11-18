import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addLeadingZeros,
  buildProblemPath,
  checkElem,
  convertToSlug,
  escapeHtml,
  formatStats,
  getDifficulty,
  getTimestamp,
  getTodaysDate,
  githubHeaders,
  isEmptyObject,
  parseCustomCommitMessage,
  problemDirInTree,
  problemSlugOfPath,
  slugFromPath,
} from '../scripts/leetcode/util.js';

describe('getDifficulty', () => {
  it('maps lowercase names to PascalCase', () => {
    assert.equal(getDifficulty('easy'), 'Easy');
    assert.equal(getDifficulty('medium'), 'Medium');
    assert.equal(getDifficulty('hard'), 'Hard');
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    assert.equal(getDifficulty('  EASY '), 'Easy');
    assert.equal(getDifficulty('HaRd'), 'Hard');
  });

  it('returns Unknown for unrecognized or empty input', () => {
    assert.equal(getDifficulty('impossible'), 'Unknown');
    assert.equal(getDifficulty(''), 'Unknown');
  });
});

describe('convertToSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    assert.equal(convertToSlug('Two Sum'), 'two-sum');
    assert.equal(convertToSlug('Longest Valid Parentheses'), 'longest-valid-parentheses');
  });

  it('replaces ampersand with -and-', () => {
    assert.equal(convertToSlug('Best Time to Buy & Sell Stock'), 'best-time-to-buy-and-sell-stock');
  });

  it('strips punctuation and collapses repeated hyphens', () => {
    assert.equal(convertToSlug('Add Two Numbers!!!'), 'add-two-numbers');
    assert.equal(convertToSlug('Roman  to   Integer'), 'roman-to-integer');
  });

  it('folds accented characters to ASCII', () => {
    assert.equal(convertToSlug('Café Menu'), 'cafe-menu');
  });

  it('trims leading and trailing hyphens', () => {
    assert.equal(convertToSlug('  spaced out  '), 'spaced-out');
  });
});

describe('addLeadingZeros', () => {
  it('pads the numeric prefix to 4 digits', () => {
    assert.equal(addLeadingZeros('1-two-sum'), '0001-two-sum');
    assert.equal(addLeadingZeros('42-trapping-rain-water'), '0042-trapping-rain-water');
    assert.equal(addLeadingZeros('100-same-tree'), '0100-same-tree');
  });

  it('leaves a 4-digit prefix unchanged', () => {
    assert.equal(addLeadingZeros('1000-foo'), '1000-foo');
  });

  it('leaves a 5-digit prefix unchanged (never truncates)', () => {
    assert.equal(addLeadingZeros('12345-foo'), '12345-foo');
  });
});

describe('slugFromPath', () => {
  it('returns the last segment of a folder path', () => {
    assert.equal(slugFromPath('LeetCode/Python3/Easy/0001-two-sum'), '0001-two-sum');
    assert.equal(slugFromPath('LeetCode/0001-two-sum'), '0001-two-sum');
  });

  it('returns a bare name with no slash unchanged', () => {
    assert.equal(slugFromPath('README.md'), 'README.md');
    assert.equal(slugFromPath('two-sum'), 'two-sum');
  });

  it('ignores a trailing slash', () => {
    assert.equal(slugFromPath('LeetCode/Easy/0042-foo/'), '0042-foo');
  });

  it('normalises an unpadded numeric prefix so it keys stats.shas under one identity', () => {
    assert.equal(slugFromPath('LeetCode/Easy/1-two-sum'), '0001-two-sum');
    assert.equal(slugFromPath('12-integer-to-roman'), '0012-integer-to-roman');
    assert.equal(slugFromPath('LeetCode/1-two-sum/1-two-sum.py'), '0001-two-sum');
  });
});

describe('problemSlugOfPath', () => {
  it('extracts the slug at any folder depth', () => {
    assert.equal(problemSlugOfPath('LeetCode/Python3/Easy/0001-two-sum/README.md'), '0001-two-sum');
    assert.equal(problemSlugOfPath('LeetCode/Easy/0001-two-sum/0001-two-sum.py'), '0001-two-sum');
    assert.equal(problemSlugOfPath('LeetCode/0001-two-sum/NOTES.md'), '0001-two-sum');
  });

  it('extracts the slug from a bare repo-root file with no folder (old-fork layout)', () => {
    assert.equal(problemSlugOfPath('0007-reverse-integer.py'), '0007-reverse-integer');
    assert.equal(problemSlugOfPath('0007-reverse-integer/README.md'), '0007-reverse-integer');
  });

  it('normalises an unpadded numeric prefix to the padded identity', () => {
    assert.equal(problemSlugOfPath('LeetCode/Easy/1-two-sum/README.md'), '0001-two-sum');
    assert.equal(
      problemSlugOfPath('12-integer-to-roman/12-integer-to-roman.java'),
      '0012-integer-to-roman'
    );
  });

  it('returns null for non-problem paths', () => {
    assert.equal(problemSlugOfPath('README.md'), null);
    assert.equal(problemSlugOfPath('config.json'), null);
    assert.equal(problemSlugOfPath('stats.json'), null);
    assert.equal(problemSlugOfPath('LeetCode/Easy'), null);
    assert.equal(problemSlugOfPath('Archive/09-01-2026/README.md'), null);
  });

  it('returns null for a problem file parked under Archive/ (out of play after Archive & Reset)', () => {
    assert.equal(
      problemSlugOfPath('Archive/09-01-2026/LeetCode/Easy/0001-two-sum/README.md'),
      null
    );
    assert.equal(problemSlugOfPath('Archive/09-01-2026/0001-two-sum.py'), null);
  });
});

describe('problemDirInTree', () => {
  it('returns the folder a solved slug sits in, whatever the folder shape', () => {
    const tree = [
      { type: 'blob', path: 'LeetCode/Python3/Easy/0002-add-two-numbers/README.md' },
      { type: 'blob', path: 'LeetCode/Python3/Easy/0002-add-two-numbers/0002-add-two-numbers.py' },
    ];
    assert.equal(
      problemDirInTree(tree, '0002-add-two-numbers'),
      'LeetCode/Python3/Easy/0002-add-two-numbers'
    );
  });

  it('returns the first match when the repo carries duplicate copies of a slug', () => {
    const tree = [
      { type: 'blob', path: 'LeetCode/0001-two-sum/README.md' },
      { type: 'blob', path: 'LeetCode/Easy/0001-two-sum/README.md' },
    ];
    assert.equal(problemDirInTree(tree, '0001-two-sum'), 'LeetCode/0001-two-sum');
  });

  it("returns '' for a pre-fork bare file at the repo root", () => {
    const tree = [{ type: 'blob', path: '0007-reverse-integer.py' }];
    assert.equal(problemDirInTree(tree, '0007-reverse-integer'), '');
  });

  it('normalises an unpadded prefix so 1-two-sum and 0001-two-sum are one identity', () => {
    const tree = [{ type: 'blob', path: 'LeetCode/Easy/1-two-sum/README.md' }];
    assert.equal(problemDirInTree(tree, '0001-two-sum'), 'LeetCode/Easy/1-two-sum');
  });

  it('ignores tree (directory) items and returns null when the slug is absent', () => {
    const tree = [
      { type: 'tree', path: 'LeetCode/0001-two-sum' },
      { type: 'blob', path: 'README.md' },
      { type: 'blob', path: 'config.json' },
    ];
    assert.equal(problemDirInTree(tree, '0001-two-sum'), null);
  });

  it('does not match a copy parked under Archive/ - a re-solve after Archive & Reset is new', () => {
    const tree = [
      { type: 'blob', path: 'Archive/09-01-2026/LeetCode/Easy/0001-two-sum/README.md' },
      { type: 'blob', path: 'Archive/09-01-2026/LeetCode/Easy/0001-two-sum/0001-two-sum.py' },
    ];
    assert.equal(problemDirInTree(tree, '0001-two-sum'), null);
  });

  it('picks the live copy when an archived copy of the same slug also exists', () => {
    const tree = [
      { type: 'blob', path: 'Archive/09-01-2026/LeetCode/0001-two-sum/README.md' },
      { type: 'blob', path: 'LeetCode/Easy/0001-two-sum/README.md' },
    ];
    assert.equal(problemDirInTree(tree, '0001-two-sum'), 'LeetCode/Easy/0001-two-sum');
  });
});

describe('buildProblemPath (language name preserved verbatim)', () => {
  it('keeps symbol-bearing language names like C++ intact in the path', () => {
    assert.equal(
      buildProblemPath('0001-two-sum', 'Easy', 'C++', {
        folderDifficulty: false,
        folderLanguage: true,
      }),
      'LeetCode/C++/0001-two-sum'
    );
  });
});

describe('parseCustomCommitMessage (edge cases)', () => {
  it('substitutes adjacent and repeated placeholders', () => {
    assert.equal(parseCustomCommitMessage('{a}{b} {a}', { a: 'x', b: 'y' }), 'xy x');
  });

  it('stringifies an explicitly undefined value rather than blanking it', () => {
    assert.equal(parseCustomCommitMessage('d={d}', { d: undefined }), 'd=undefined');
  });

  it('leaves a template with no placeholders untouched', () => {
    assert.equal(parseCustomCommitMessage('plain message', { a: '1' }), 'plain message');
  });

  it('leaves an unknown placeholder as literal text', () => {
    assert.equal(
      parseCustomCommitMessage('{date} {mystery}', { date: '08-27-2026' }),
      '08-27-2026 {mystery}'
    );
  });
});

describe('formatStats', () => {
  it('formats runtime/memory with percent signs and the LeetHub suffix', () => {
    assert.equal(
      formatStats('52 ms', '88', '17.2 MB', '63'),
      'Time: 52 ms (88%), Space: 17.2 MB (63%) - LeetHub'
    );
  });
});

describe('githubHeaders', () => {
  it('returns the token auth header and the v3 Accept header', () => {
    assert.deepEqual(githubHeaders('abc123'), {
      Authorization: 'token abc123',
      Accept: 'application/vnd.github.v3+json',
    });
  });
});

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    assert.equal(
      escapeHtml(`<a href="x" title='y'>&</a>`),
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('escapes ampersand before the entities it introduces (no double-escaping)', () => {
    assert.equal(escapeHtml('a & b < c'), 'a &amp; b &lt; c');
  });

  it('coerces non-string input to string', () => {
    assert.equal(escapeHtml(null), 'null');
    assert.equal(escapeHtml(42), '42');
  });
});

describe('isEmptyObject', () => {
  it('is true for a plain empty object and a null-prototype object', () => {
    assert.equal(isEmptyObject({}), true);
    assert.equal(isEmptyObject(Object.create(null)), true);
  });

  it('is false when own enumerable properties exist', () => {
    assert.equal(isEmptyObject({ a: 1 }), false);
  });
});

describe('checkElem', () => {
  it('is true only for an array-like with length > 0', () => {
    assert.equal(checkElem({ length: 3 }), true);
    assert.equal(checkElem(['a']), true);
  });

  it('is false for empty, null, or undefined', () => {
    assert.equal(checkElem({ length: 0 }), false);
    assert.equal(checkElem([]), false);
    assert.equal(checkElem(null), false);
    assert.equal(checkElem(undefined), false);
  });
});

describe('date helpers', () => {
  it('getTodaysDate returns MM-DD-YYYY', () => {
    assert.match(getTodaysDate(), /^\d{2}-\d{2}-\d{4}$/);
  });

  it('getTimestamp returns MM-DD-YYYY-hh-mm-ss', () => {
    assert.match(getTimestamp(), /^\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-\d{2}$/);
  });

  it('getTimestamp starts with getTodaysDate', () => {
    assert.equal(getTimestamp().startsWith(getTodaysDate()), true);
  });
});
