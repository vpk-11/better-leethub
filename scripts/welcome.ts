import {
  archiveAndResetStats,
  escapeHtml,
  getBrowser,
  githubHeaders,
  provisionRepoFiles,
  pushConfigToRepo,
  recomputeStatsFromRepo,
  syncConfigFromRepo,
  syncStatsFromRepo,
} from './leetcode/util.js';
import type { StatsCounts } from './leetcode/util.js';
import { renderConfigsSummary } from './configsSummary.js';
import { wireConfigsEditForm } from './configsEdit.js';
import { initTheme } from './theme.js';

const api = getBrowser();

initTheme();

/* Folder structure, timestamped filenames, solution-post auto-commit, commit-message
 * template - same settings/storage keys, same shared edit-form wiring as popup.ts (see
 * configsEdit.ts), since config.json (and the local storage it's synced with) is one shared
 * setting shape, editable from either surface. This page isn't a transient popup, so
 * pushConfigToRepo() can run directly here - no popup-teardown risk (unlike popup.ts, which
 * routes it through background.js). */
wireConfigsEditForm(() => pushConfigToRepo());

/** Renders the reconciled stats returned by stats sync. */
const renderStats = (stats: (StatsCounts & { solved?: number }) | null | undefined): void => {
  if (!stats) return;
  $('#p_solved').text(stats.solved ?? 0);
  $('#p_solved_easy').text(stats.easy ?? 0);
  $('#p_solved_medium').text(stats.medium ?? 0);
  $('#p_solved_hard').text(stats.hard ?? 0);
};

/** Sets #sync_status's text - a theme-aware color would need its own status classes, but a
 * single muted color reads fine here since this line is informational, not error/success
 * (errors already show inline in the button response). */
const setSyncStatus = (text: string): void => {
  $('#sync_status').text(text);
};

/* Validates a PAT against the GitHub API. Returns the user object on success, null on failure. */
const validateToken = async (token: string): Promise<{ login: string } | null> => {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: githubHeaders(token),
    });
    return res.ok ? res.json() : null;
  } catch (err) {
    console.error('LeetHub: failed to validate token', err);
    return null;
  }
};

/** Extracts `owner/repo` from a full GitHub repository URL. Accepts
 * `https://github.com/owner/repo`, with or without a trailing `.git` or `/`.
 * Returns null for anything that isn't a github.com repo URL (a bare repo name,
 * a non-GitHub host, a URL with no repo segment) so the caller can reject it
 * with a clear message instead of guessing which account it belongs to. */
const parseRepoUrl = (input: string): string | null => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;
  const parts = url.pathname
    .replace(/\.git$/, '')
    .split('/')
    .filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
};

/* Validates repository access against the GitHub API. */
const validateRepo = async (
  token: string,
  repoHook: string
): Promise<{ html_url: string } | null> => {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoHook}`, {
      headers: githubHeaders(token),
    });
    return res.ok ? res.json() : null;
  } catch (err) {
    console.error('LeetHub: failed to validate repo', err);
    return null;
  }
};

const showCommitMode = (hook: string): void => {
  $('#hook_mode').hide();
  $('#commit_mode').show();
  $('#repo_url').html(
    `<a target="_blank" href="https://github.com/${escapeHtml(hook)}">${escapeHtml(hook)}</a>`
  );
  renderConfigsSummary();
};

const showHookMode = (): void => {
  $('#hook_mode').show();
  $('#commit_mode').hide();
};

const unlinkRepo = (): void => {
  api.storage.local.set({ mode_type: 'hook', leethub_hook: null, stats: null }, () => {
    console.log('Unlinked repo and cleared local stats');
    showHookMode();
    $('#success').hide();
    $('#error').text('Successfully unlinked repo. Please connect a new repository.').show();
  });
};

/* On click submit: Handles 2-field form (PAT + Repo URL) connection */
$('#hook_button').on('click', async () => {
  const token = String($('#pat_input').val()).trim();
  const repoInput = String($('#name').val()).trim();

  if (!token) {
    $('#error').text('Please enter a valid GitHub Personal Access Token.').show();
    $('#success').hide();
    $('#pat_input').focus();
    return;
  }

  if (!repoInput) {
    $('#error').text('Please enter the full URL of your GitHub repository.').show();
    $('#success').hide();
    $('#name').focus();
    return;
  }

  const fullHook = parseRepoUrl(repoInput);
  if (!fullHook) {
    $('#error')
      .text('Enter the full repository URL, e.g. https://github.com/your-name/your-repo')
      .show();
    $('#success').hide();
    $('#name').focus();
    return;
  }

  $('#error').hide();
  $('#success').html('Validating Personal Access Token...').show();

  const user = await validateToken(token);
  if (!user) {
    $('#error')
      .text('Invalid or expired Personal Access Token. Please check token permissions and retry.')
      .show();
    $('#success').hide();
    return;
  }

  const username = user.login;

  $('#success').html(`Connecting to <strong>${escapeHtml(fullHook)}</strong>...`).show();

  const repoData = await validateRepo(token, fullHook);
  if (!repoData) {
    $('#error')
      .html(
        `Unable to access <strong>${escapeHtml(
          fullHook
        )}</strong>. Ensure the repository exists and your PAT has repo access.`
      )
      .show();
    $('#success').hide();
    return;
  }

  // Save authentication & hook state
  await api.storage.local.set({
    leethub_token: token,
    leethub_username: username,
    leethub_hook: fullHook,
    mode_type: 'commit',
    repo: repoData.html_url,
  });

  showCommitMode(fullHook);
  $('#error').hide();
  $('#success')
    .html(
      `Successfully connected <a target="_blank" href="${escapeHtml(
        repoData.html_url
      )}">${escapeHtml(fullHook)}</a> to LeetHub!`
    )
    .show();

  // Run sequential provisioning: config first, then stats (avoids API rate limits)
  try {
    setSyncStatus('Initializing repo files (config.json & stats.json)...');
    const stats = await provisionRepoFiles();
    renderStats(stats);
    renderConfigsSummary();
    setSyncStatus('Initialization complete! Config and stats are in sync.');
  } catch (err) {
    console.error('LeetHub: sequential initialization error', err);
    setSyncStatus('Connected! Automatic sync had an issue. Use the manual buttons below to retry.');
  }
});

/* Manual Action Failover Buttons */
$('#sync_config').on('click', async () => {
  setSyncStatus('Checking and syncing config.json from GitHub...');
  try {
    await syncConfigFromRepo();
    renderConfigsSummary();
    setSyncStatus('config.json successfully synced with GitHub!');
  } catch (err) {
    console.error('LeetHub: manual sync_config error', err);
    const message = err instanceof Error ? err.message : String(err);
    setSyncStatus(`Failed to sync config.json: ${message}`);
  }
});

$('#sync_counts').on('click', async () => {
  setSyncStatus('Checking and syncing stats.json from GitHub...');
  try {
    const stats = await recomputeStatsFromRepo();
    renderStats(stats);
    setSyncStatus('stats.json successfully synced with GitHub!');
  } catch (err) {
    console.error('LeetHub: manual sync_counts error', err);
    const message = err instanceof Error ? err.message : String(err);
    setSyncStatus(`Failed to sync stats.json: ${message}`);
  }
});

$('#archive_reset').on('click', async () => {
  const confirmed = confirm(
    'Move LeetCode/, stats.json, and README.md into a dated Archive/ folder, then start fresh ' +
      'with a new stats.json and README.md? config.json is left untouched. This cannot be ' +
      'undone from the extension.'
  );
  if (!confirmed) return;

  setSyncStatus('Archiving LeetCode/, stats.json, and README.md...');
  try {
    const stats = await archiveAndResetStats();
    renderStats(stats);
    setSyncStatus('Archived! stats.json and README.md have been reset.');
  } catch (err) {
    console.error('LeetHub: archive-and-reset error', err);
    const message = err instanceof Error ? err.message : String(err);
    setSyncStatus(`Failed to archive and reset: ${message}`);
  }
});

$('#unlink').on('click', () => {
  unlinkRepo();
});

/* Check current mode on page load */
const checkModeType = async (): Promise<void> => {
  const { mode_type, leethub_hook, leethub_token } = await api.storage.local.get([
    'mode_type',
    'leethub_hook',
    'leethub_token',
  ]);

  if (leethub_token) {
    $('#pat_input').val(leethub_token);
  }
  if (leethub_hook) {
    // Stored as `owner/repo`; the field now takes a full URL, so show it as one.
    $('#name').val(`https://github.com/${leethub_hook}`);
  }

  if (mode_type === 'commit' && leethub_hook && leethub_token) {
    showCommitMode(leethub_hook);
    const stats = await syncStatsFromRepo();
    renderStats(stats);
  } else {
    showHookMode();
  }
};

checkModeType();
