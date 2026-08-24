import {
  archiveAndResetStats,
  getBrowser,
  provisionRepoFiles,
  recomputeStatsFromRepo,
  syncConfigFromRepo,
  syncStatsFromRepo,
} from './leetcode/util.js';

const api = getBrowser();

/** Renders the reconciled stats returned by stats sync. */
const renderStats = stats => {
  if (!stats) return;
  $('#p_solved').text(stats.solved ?? 0);
  $('#p_solved_easy').text(stats.easy ?? 0);
  $('#p_solved_medium').text(stats.medium ?? 0);
  $('#p_solved_hard').text(stats.hard ?? 0);
};

/* Validates a PAT against the GitHub API. Returns the user object on success, null on failure. */
const validateToken = async token => {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` },
    });
    return res.ok ? res.json() : null;
  } catch (err) {
    console.error('LeetHub: failed to validate token', err);
    return null;
  }
};

/* Validates repository access against the GitHub API. */
const validateRepo = async (token, repoHook) => {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoHook}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    return res.ok ? res.json() : null;
  } catch (err) {
    console.error('LeetHub: failed to validate repo', err);
    return null;
  }
};

const showCommitMode = hook => {
  $('#hook_mode').hide();
  $('#commit_mode').show();
  $('#unlink').show();
  $('#repo_url').html(
    `<a target="_blank" style="color: aqua !important;" href="https://github.com/${hook}">${hook}</a>`
  );
};

const showHookMode = () => {
  $('#hook_mode').show();
  $('#commit_mode').hide();
  $('#unlink').hide();
};

const unlinkRepo = () => {
  api.storage.local.set({ mode_type: 'hook', leethub_hook: null, stats: null }, () => {
    console.log('Unlinked repo and cleared local stats');
    showHookMode();
    $('#success').hide();
    $('#error').text('Successfully unlinked repo. Please connect a new repository.').show();
  });
};

/* On click submit: Handles 2-field form (PAT + Repo Name) connection */
$('#hook_button').on('click', async () => {
  const token = $('#pat_input').val().trim();
  const repoInput = $('#name').val().trim();

  if (!token) {
    $('#error').text('Please enter a valid GitHub Personal Access Token.').show();
    $('#success').hide();
    $('#pat_input').focus();
    return;
  }

  if (!repoInput) {
    $('#error').text('Please enter the name of your GitHub repository.').show();
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
  const fullHook = repoInput.includes('/') ? repoInput : `${username}/${repoInput}`;

  $('#success').html(`Connecting to <strong>${fullHook}</strong>...`).show();

  const repoData = await validateRepo(token, fullHook);
  if (!repoData) {
    $('#error')
      .html(
        `Unable to access <strong>${fullHook}</strong>. Ensure the repository exists and your PAT has repo access.`
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
      `Successfully connected <a target="_blank" href="${repoData.html_url}">${fullHook}</a> to LeetHub!`
    )
    .show();

  // Run sequential provisioning: config first, then stats (avoids API rate limits)
  try {
    $('#sync_status')
      .text('Initializing repo files (config.json & stats.json)...')
      .css('color', '#bfc0b9');
    const stats = await provisionRepoFiles();
    renderStats(stats);
    $('#sync_status')
      .text('Initialization complete! Config and stats are in sync.')
      .css('color', '#5cb85c');
  } catch (err) {
    console.error('LeetHub: sequential initialization error', err);
    $('#sync_status')
      .text('Connected! Automatic sync had an issue. Use the manual buttons below to retry.')
      .css('color', '#f0ad4e');
  }
});

/* Manual Action Failover Buttons */
$('#sync_config').on('click', async () => {
  $('#sync_status').text('Checking and syncing config.json from GitHub...').css('color', '#bfc0b9');
  try {
    await syncConfigFromRepo();
    $('#sync_status').text('config.json successfully synced with GitHub!').css('color', '#5cb85c');
  } catch (err) {
    console.error('LeetHub: manual sync_config error', err);
    $('#sync_status').text(`Failed to sync config.json: ${err.message}`).css('color', '#d9534f');
  }
});

$('#sync_counts').on('click', async () => {
  $('#sync_status').text('Checking and syncing stats.json from GitHub...').css('color', '#bfc0b9');
  try {
    const stats = await recomputeStatsFromRepo();
    renderStats(stats);
    $('#sync_status').text('stats.json successfully synced with GitHub!').css('color', '#5cb85c');
  } catch (err) {
    console.error('LeetHub: manual sync_counts error', err);
    $('#sync_status').text(`Failed to sync stats.json: ${err.message}`).css('color', '#d9534f');
  }
});

$('#archive_reset').on('click', async () => {
  const confirmed = confirm(
    'Move LeetCode/, stats.json, and README.md into a dated Archive/ folder, then start fresh ' +
      'with a new stats.json and README.md? config.json is left untouched. This cannot be ' +
      'undone from the extension.'
  );
  if (!confirmed) return;

  $('#sync_status')
    .text('Archiving LeetCode/, stats.json, and README.md...')
    .css('color', '#bfc0b9');
  try {
    const stats = await archiveAndResetStats();
    renderStats(stats);
    $('#sync_status')
      .text('Archived! stats.json and README.md have been reset.')
      .css('color', '#5cb85c');
  } catch (err) {
    console.error('LeetHub: archive-and-reset error', err);
    $('#sync_status').text(`Failed to archive and reset: ${err.message}`).css('color', '#d9534f');
  }
});

$('#unlink a').on('click', () => {
  unlinkRepo();
});

/* Check current mode on page load */
const checkModeType = async () => {
  const { mode_type, leethub_hook, leethub_token } = await api.storage.local.get([
    'mode_type',
    'leethub_hook',
    'leethub_token',
  ]);

  if (leethub_token) {
    $('#pat_input').val(leethub_token);
  }
  if (leethub_hook) {
    $('#name').val(leethub_hook);
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
