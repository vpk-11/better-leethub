import { appendProblemToReadme } from '../scripts/leetcode/readmeTopics.js';

const START = '\x3C!---LeetCode Topics Start-->';
const END = '\x3C!---LeetCode Topics End-->';

describe('appendProblemToReadme (section/table creation branches)', () => {
  it('creates the LeetCode Topics section when the README has none', () => {
    const input = '# My Solutions\nsome preamble\n';
    const output = appendProblemToReadme(
      'Array',
      input,
      'me',
      '0001-two-sum',
      'LeetCode/0001-two-sum',
      'Easy'
    );

    expect(output).toContain(START);
    expect(output).toContain(END);
    expect(output).toContain('## Array');
    expect(output).toContain(
      '| [0001-two-sum](https://github.com/me/tree/main/LeetCode/0001-two-sum) | Easy |'
    );
    // Original content is preserved ahead of the generated section.
    expect(output.indexOf('# My Solutions')).toBeLessThan(output.indexOf(START));
  });

  it('adds a new topic table when the topic is not yet present in the section', () => {
    const input = [
      START,
      '# LeetCode Topics',
      '',
      '## Array',
      '| Problem Name | Difficulty |',
      '| ------- | ------- |',
      '| [0001-two-sum](https://github.com/me/tree/main/LeetCode/0001-two-sum) | Easy |',
      '',
      END,
    ].join('\n');

    const output = appendProblemToReadme(
      'Hash Table',
      input,
      'me',
      '0242-valid-anagram',
      'LeetCode/0242-valid-anagram',
      'Easy'
    );

    expect(output).toContain('## Array');
    expect(output).toContain('## Hash Table');
    expect(output).toContain(
      '| [0242-valid-anagram](https://github.com/me/tree/main/LeetCode/0242-valid-anagram) | Easy |'
    );
    // Existing Array row untouched.
    expect(output).toContain(
      '| [0001-two-sum](https://github.com/me/tree/main/LeetCode/0001-two-sum) | Easy |'
    );
  });

  it('is a no-op when the exact problem already exists in that topic table', () => {
    const input = [
      START,
      '# LeetCode Topics',
      '',
      '## Array',
      '| Problem Name | Difficulty |',
      '| ------- | ------- |',
      '| [0001-two-sum](https://github.com/me/tree/main/LeetCode/0001-two-sum) | Easy |',
      '',
      END,
    ].join('\n');

    const output = appendProblemToReadme(
      'Array',
      input,
      'me',
      '0001-two-sum',
      'LeetCode/0001-two-sum',
      'Easy'
    );

    expect(output).toBe(input);
  });

  it('uses problemPath (not the bare slug) for the link URL', () => {
    const input = [START, '# LeetCode Topics', END].join('\n');
    const output = appendProblemToReadme(
      'Array',
      input,
      'me',
      '0001-two-sum',
      'LeetCode/Python3/Easy/0001-two-sum',
      'Easy'
    );

    expect(output).toContain(
      '[0001-two-sum](https://github.com/me/tree/main/LeetCode/Python3/Easy/0001-two-sum)'
    );
  });
});
