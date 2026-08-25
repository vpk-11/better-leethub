import { buildProblemPath, getBrowser, getTodaysDate, parseCustomCommitMessage } from './leetcode/util.js';

const DEFAULT_COMMIT_TEMPLATE =
  '{date} - {problemName} - {problemTopic} - {difficulty} - {language}';

/** Fills the Configs summary block (#config-commit-preview etc - shared markup/ids between
 * popup.html and welcome.html) with real examples built from current settings, via the same
 * exported util.ts helpers the actual upload path uses - never a second hand-typed example of
 * what these settings produce. Shared here so popup.ts and welcome.ts don't each keep their
 * own copy of this rendering logic. */
export function renderConfigsSummary(): void {
  const api = getBrowser();
  api.storage.local.get(
    {
      leethub_custom_commit_message: null,
      leethub_use_difficulty_folder: false,
      leethub_use_language_folder: false,
      leethub_use_timestamp_filename: false,
      leethub_auto_commit_solution_post: true,
    },
    data => {
      const template = data.leethub_custom_commit_message || DEFAULT_COMMIT_TEMPLATE;
      const commitExample = parseCustomCommitMessage(template, {
        date: getTodaysDate(),
        problemName: 'Two Sum',
        problemTopic: 'Array',
        difficulty: 'Easy',
        language: 'Python3',
        time: '85',
        space: '92',
      });
      $('#config-commit-preview').text(commitExample);

      const folderPath = buildProblemPath('0001-two-sum', 'Easy', 'Python3', {
        folderDifficulty: data.leethub_use_difficulty_folder,
        folderLanguage: data.leethub_use_language_folder,
      });
      $('#config-folder-preview').text(`${folderPath}/0001-two-sum.py`);

      $('#config-timestamp-preview').text(data.leethub_use_timestamp_filename ? 'On' : 'Off');

      $('#config-solution-preview').text(data.leethub_auto_commit_solution_post ? 'On' : 'Off');
    }
  );
}
