import { escapeHtml, getBrowser } from './leetcode/util.js';
import type { StatsCounts } from './leetcode/util.js';
import { renderConfigsSummary } from './configsSummary.js';
import { wireConfigsEditForm } from './configsEdit.js';
import { initTheme } from './theme.js';

const api = getBrowser();

initTheme();

/** Renders the reconciled stats returned by a POPUP_SYNC response into the DOM. */
const renderStats = (stats: (StatsCounts & { solved: number }) | undefined): void => {
  if (!stats) return;
  $('#p_solved').text(stats.solved);
  $('#p_solved_easy').text(stats.easy);
  $('#p_solved_medium').text(stats.medium);
  $('#p_solved_hard').text(stats.hard);
};

/* Sync (stats + config.json) runs in the background script, not here - the popup's own JS
   context can be torn down as soon as it closes/loses focus, which was killing the sync
   mid-flight (worse on Firefox than Chrome). See background.js. */
wireConfigsEditForm(() => api.runtime.sendMessage({ type: 'PUSH_CONFIG' }));

/* Auth/repo-linking always forces a real standalone tab, never rendered inside the popup's
 * own window - a popup tears down the instant it loses focus, and generating a PAT means a
 * github.com trip that always steals focus (confirmed not Firefox-specific, see
 * decisions.md). Applies on both Chrome and Firefox. */
const welcomeUrl = api.runtime.getURL('welcome.html');
$('#start-connect').attr('href', welcomeUrl);
$('#start-connect, #settings-link-different-repo').on('click', e => {
  e.preventDefault();
  api.tabs.create({ url: welcomeUrl });
});

/* Logout: actually clears the session (token + repo link + cached stats) from this
 * browser, after a confirm. The GitHub repo and its contents are untouched. Opening
 * welcome.html alone (the old behavior) left the stored PAT in place. */
$('#settings-logout-reauth').on('click', () => {
  const confirmed = confirm(
    'Log out of Better LeetHub? This clears your stored GitHub token and unlinks your ' +
      'repo from this browser. Your GitHub repo and its contents are not touched. ' +
      'You will need to paste your token again to reconnect.'
  );
  if (!confirmed) return;

  api.storage.local.set(
    {
      leethub_token: null,
      leethub_hook: null,
      leethub_username: null,
      repo: null,
      mode_type: 'hook',
      stats: null,
    },
    () => {
      $('#commit_mode').hide();
      $('#popup_settings_view').hide();
      $('#popup_normal_view').show();
      $('#start_view').show();
    }
  );
});

/* Gear icon -> Settings view (Level 2: Archive & Reset, Link a Different Repo, Logout/
 * Re-auth), back arrow returns to Normal view. */
$('#settings-gear-icon').click(() => {
  $('#popup_normal_view').hide();
  $('#popup_settings_view').show();
});
$('#settings-back-icon').click(() => {
  $('#popup_settings_view').hide();
  $('#popup_normal_view').show();
});

/* Archive & Reset must route through background.js, not run directly here - same class of
 * bug v2-phase-01's round 4 correction already fixed once (Firefox tearing down in-flight
 * popup fetches). This is several sequential Git Data API calls; if the popup loses focus
 * mid-operation, a direct-in-popup implementation would repeat that exact failure. */
$('#settings-archive-reset').click(() => {
  const confirmed = confirm(
    'Move LeetCode/, stats.json, and README.md into a dated Archive/ folder, then start fresh ' +
      'with a new stats.json and README.md? config.json is left untouched. This cannot be ' +
      'undone from the extension.'
  );
  if (!confirmed) return;

  $('#settings_status').text('Archiving...');
  api.runtime
    .sendMessage({ type: 'ARCHIVE_RESET' })
    .then((response: { stats?: StatsCounts & { solved: number }; error?: string }) => {
      if (response?.error) {
        $('#settings_status').text(`Failed to archive and reset: ${response.error}`);
        return;
      }
      renderStats(response?.stats);
      renderConfigsSummary();
      $('#settings_status').text('Archived! stats.json and README.md have been reset.');
    });
});

api.storage.local.get('leethub_token', data => {
  const token = data.leethub_token;
  if (token === null || token === undefined) {
    $('#start_view').show();
  } else {
    // To validate user, load user object from GitHub.
    const AUTHENTICATION_URL = 'https://api.github.com/user';

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          /* Show MAIN FEATURES */
          api.storage.local.get('mode_type', data2 => {
            if (data2 && data2.mode_type === 'commit') {
              $('#commit_mode').show();
              renderConfigsSummary();
              /* Get problem stats and repo link */
              api.storage.local.get(['stats', 'leethub_hook'], data3 => {
                renderStats(data3?.stats);
                const leethubHook = data3?.leethub_hook;
                if (leethubHook) {
                  $('#repo_url').html(
                    `<a target="_blank" href="https://github.com/${escapeHtml(
                      leethubHook
                    )}">${escapeHtml(leethubHook)}</a>`
                  );
                }
                // Auto-sync on every popup open (real 3.0's stats mechanism, triggered
                // eagerly instead of only on manual click, plus a config.json pull) - cached
                // stats paint immediately above, this refreshes them once the background
                // script's repo walk finishes. Routed through the background script (not
                // run here directly) so it survives the popup closing mid-fetch.
                api.runtime
                  .sendMessage({ type: 'POPUP_SYNC' })
                  .then((response: { stats?: StatsCounts & { solved: number } }) => {
                    renderStats(response?.stats);
                    renderConfigsSummary(); // background pulled config.json - re-read local
                  });
              });
            } else {
              $('#start_view').show();
            }
          });
        } else if (xhr.status === 401) {
          // GitHub rejected the stored PAT (expired, revoked, or its scopes changed).
          // Clear it and drop back to the connect flow so the user can paste a new one.
          api.storage.local.set({ leethub_token: null }, () => {
            console.log('LeetHub: stored PAT rejected by GitHub, clearing it.');
            $('#start_view').show();
          });
        }
      }
    });
    xhr.open('GET', AUTHENTICATION_URL, true);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    xhr.send();
  }
});
