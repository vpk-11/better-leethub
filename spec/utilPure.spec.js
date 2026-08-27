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
} from '../scripts/leetcode/util.js';

describe('getDifficulty', () => {
  it('maps lowercase names to PascalCase', () => {
    expect(getDifficulty('easy')).toBe('Easy');
    expect(getDifficulty('medium')).toBe('Medium');
    expect(getDifficulty('hard')).toBe('Hard');
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(getDifficulty('  EASY ')).toBe('Easy');
    expect(getDifficulty('HaRd')).toBe('Hard');
  });

  it('returns Unknown for unrecognized or empty input', () => {
    expect(getDifficulty('impossible')).toBe('Unknown');
    expect(getDifficulty('')).toBe('Unknown');
  });
});

describe('convertToSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(convertToSlug('Two Sum')).toBe('two-sum');
    expect(convertToSlug('Longest Valid Parentheses')).toBe('longest-valid-parentheses');
  });

  it('replaces ampersand with -and-', () => {
    expect(convertToSlug('Best Time to Buy & Sell Stock')).toBe('best-time-to-buy-and-sell-stock');
  });

  it('strips punctuation and collapses repeated hyphens', () => {
    expect(convertToSlug('Add Two Numbers!!!')).toBe('add-two-numbers');
    expect(convertToSlug('Roman  to   Integer')).toBe('roman-to-integer');
  });

  it('folds accented characters to ASCII', () => {
    expect(convertToSlug('Café Menu')).toBe('cafe-menu');
  });

  it('trims leading and trailing hyphens', () => {
    expect(convertToSlug('  spaced out  ')).toBe('spaced-out');
  });
});

describe('addLeadingZeros', () => {
  it('pads the numeric prefix to 4 digits', () => {
    expect(addLeadingZeros('1-two-sum')).toBe('0001-two-sum');
    expect(addLeadingZeros('42-trapping-rain-water')).toBe('0042-trapping-rain-water');
    expect(addLeadingZeros('100-same-tree')).toBe('0100-same-tree');
  });

  it('leaves a 4-digit prefix unchanged', () => {
    expect(addLeadingZeros('1000-foo')).toBe('1000-foo');
  });

  it('leaves a 5-digit prefix unchanged (never truncates)', () => {
    expect(addLeadingZeros('12345-foo')).toBe('12345-foo');
  });
});

describe('buildProblemPath (language name preserved verbatim)', () => {
  it('keeps symbol-bearing language names like C++ intact in the path', () => {
    expect(
      buildProblemPath('0001-two-sum', 'Easy', 'C++', {
        folderDifficulty: false,
        folderLanguage: true,
      })
    ).toBe('LeetCode/C++/0001-two-sum');
  });
});

describe('parseCustomCommitMessage (edge cases)', () => {
  it('substitutes adjacent and repeated placeholders', () => {
    expect(parseCustomCommitMessage('{a}{b} {a}', { a: 'x', b: 'y' })).toBe('xy x');
  });

  it('stringifies an explicitly undefined value rather than blanking it', () => {
    expect(parseCustomCommitMessage('d={d}', { d: undefined })).toBe('d=undefined');
  });

  it('leaves a template with no placeholders untouched', () => {
    expect(parseCustomCommitMessage('plain message', { a: '1' })).toBe('plain message');
  });

  it('leaves an unknown placeholder as literal text', () => {
    expect(parseCustomCommitMessage('{date} {mystery}', { date: '08-27-2026' })).toBe(
      '08-27-2026 {mystery}'
    );
  });
});

describe('formatStats', () => {
  it('formats runtime/memory with percent signs and the LeetHub suffix', () => {
    expect(formatStats('52 ms', '88', '17.2 MB', '63')).toBe(
      'Time: 52 ms (88%), Space: 17.2 MB (63%) - LeetHub'
    );
  });
});

describe('githubHeaders', () => {
  it('returns the token auth header and the v3 Accept header', () => {
    expect(githubHeaders('abc123')).toEqual({
      Authorization: 'token abc123',
      Accept: 'application/vnd.github.v3+json',
    });
  });
});

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('escapes ampersand before the entities it introduces (no double-escaping)', () => {
    expect(escapeHtml('a & b < c')).toBe('a &amp; b &lt; c');
  });

  it('coerces non-string input to string', () => {
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('isEmptyObject', () => {
  it('is true for a plain empty object and a null-prototype object', () => {
    expect(isEmptyObject({})).toBe(true);
    expect(isEmptyObject(Object.create(null))).toBe(true);
  });

  it('is false when own enumerable properties exist', () => {
    expect(isEmptyObject({ a: 1 })).toBe(false);
  });
});

describe('checkElem', () => {
  it('is true only for an array-like with length > 0', () => {
    expect(checkElem({ length: 3 })).toBe(true);
    expect(checkElem(['a'])).toBe(true);
  });

  it('is false for empty, null, or undefined', () => {
    expect(checkElem({ length: 0 })).toBe(false);
    expect(checkElem([])).toBe(false);
    expect(checkElem(null)).toBe(false);
    expect(checkElem(undefined)).toBe(false);
  });
});

describe('date helpers', () => {
  it('getTodaysDate returns MM-DD-YYYY', () => {
    expect(getTodaysDate()).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it('getTimestamp returns MM-DD-YYYY-hh-mm-ss', () => {
    expect(getTimestamp()).toMatch(/^\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-\d{2}$/);
  });

  it('getTimestamp starts with getTodaysDate', () => {
    expect(getTimestamp().startsWith(getTodaysDate())).toBe(true);
  });
});
