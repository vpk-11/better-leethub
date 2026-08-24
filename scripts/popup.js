import { escapeHtml, getBrowser } from './leetcode/util.js';

let api = getBrowser();

/** Renders the reconciled stats returned by a POPUP_SYNC response into the DOM. */
const renderStats = stats => {
  if (!stats) return;
  $('#p_solved').text(stats.solved);
  $('#p_solved_easy').text(stats.easy);
  $('#p_solved_medium').text(stats.medium);
  $('#p_solved_hard').text(stats.hard);
};

/* Sync (stats + config.json) runs in the background script, not here - the popup's own JS
   context can be torn down as soon as it closes/loses focus, which was killing the sync
   mid-flight (worse on Firefox than Chrome). See background.js. */
const pushConfigToRepo = () => api.runtime.sendMessage({ type: 'PUSH_CONFIG' });

/* Get URL for welcome page */
$('#welcome_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#hook_URL').attr('href', api.runtime.getURL('welcome.html'));
$('#authenticate').attr('href', api.runtime.getURL('welcome.html'));

/* Folder structure, timestamped filenames, solution-post auto-commit, commit-message
   template: 3.0's real settings, ported to this codebase's own leethub_-prefixed storage
   keys (internal only - the commit-message *variables* below use 3.0's real names). */
$('#collapsible-commit-message-icon').click(() => {
  $('#collapsible-commit-message-icon').toggleClass('open');
  $('#collapsible-commit-message-container').toggle();
  api.storage.local.get(['leethub_custom_commit_message'], data => {
    const commitMessage = data.leethub_custom_commit_message;
    if (!commitMessage) {
      $('#custom-commit-msg').attr(
        'placeholder',
        '{date} - {problemName} - {problemTopic} - {difficulty} - {language}'
      );
    } else {
      $('#custom-commit-msg').val(commitMessage);
    }
  });
});

$('#collapsible-difficulty-icon').click(() => {
  $('#collapsible-difficulty-icon').toggleClass('open');
  $('#collapsible-difficulty-container').toggle();
  api.storage.local.get({ leethub_use_difficulty_folder: false }, data => {
    $('#use-difficulty-folder').prop('checked', data.leethub_use_difficulty_folder);
  });
});
$('#use-difficulty-folder').change(function () {
  api.storage.local.set(
    { leethub_use_difficulty_folder: $(this).is(':checked') },
    pushConfigToRepo
  );
});

$('#collapsible-language-icon').click(() => {
  $('#collapsible-language-icon').toggleClass('open');
  $('#collapsible-language-container').toggle();
  api.storage.local.get({ leethub_use_language_folder: false }, data => {
    $('#use-language-folder').prop('checked', data.leethub_use_language_folder);
  });
});
$('#use-language-folder').change(function () {
  api.storage.local.set({ leethub_use_language_folder: $(this).is(':checked') }, pushConfigToRepo);
});

$('#collapsible-timestamp-icon').click(() => {
  $('#collapsible-timestamp-icon').toggleClass('open');
  $('#collapsible-timestamp-container').toggle();
  api.storage.local.get({ leethub_use_timestamp_filename: false }, data => {
    $('#use-timestamp-filename').prop('checked', data.leethub_use_timestamp_filename);
  });
});
$('#use-timestamp-filename').change(function () {
  api.storage.local.set(
    { leethub_use_timestamp_filename: $(this).is(':checked') },
    pushConfigToRepo
  );
});

$('#collapsible-solution-post-icon').click(() => {
  $('#collapsible-solution-post-icon').toggleClass('open');
  $('#collapsible-solution-post-container').toggle();
  api.storage.local.get({ leethub_auto_commit_solution_post: true }, data => {
    $('#auto-commit-solution-post').prop('checked', data.leethub_auto_commit_solution_post);
  });
});
$('#auto-commit-solution-post').change(function () {
  api.storage.local.set(
    { leethub_auto_commit_solution_post: $(this).is(':checked') },
    pushConfigToRepo
  );
});

$('#msg-save-btn').click(() => {
  const commitMessage = $('#custom-commit-msg').val().trim();
  api.storage.local.set({ leethub_custom_commit_message: commitMessage }, pushConfigToRepo);
  const successMessage = $('#success-message');
  successMessage.show();
  setTimeout(() => successMessage.hide(), 3000);
});

$('#msg-reset-btn').click(() => {
  $('#custom-commit-msg').val('');
  $('#custom-commit-msg').attr(
    'placeholder',
    '{date} - {problemName} - {problemTopic} - {difficulty} - {language}'
  );
  api.storage.local.set({ leethub_custom_commit_message: null }, pushConfigToRepo);
});

/* when a variable button is clicked, add it to the custom commit message text area */
$('.commit-variable').on('click', function () {
  const variableName = $(this).attr('id');
  $('#custom-commit-msg').val((index, currentValue) => `${currentValue}{${variableName}} `);
});

api.storage.local.get('leethub_token', data => {
  const token = data.leethub_token;
  if (token === null || token === undefined) {
    $('#auth_mode').show();
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
              /* Get problem stats and repo link */
              api.storage.local.get(['stats', 'leethub_hook'], data3 => {
                renderStats(data3?.stats);
                const leethubHook = data3?.leethub_hook;
                if (leethubHook) {
                  $('#repo_url').html(
                    `<a target="blank" style="color: cadetblue !important; font-size:0.8em;" href="https://github.com/${escapeHtml(
                      leethubHook
                    )}">${escapeHtml(leethubHook)}</a>`
                  );
                }
                // Auto-sync on every popup open (real 3.0's stats mechanism, triggered
                // eagerly instead of only on manual click, plus a config.json pull) - cached
                // stats paint immediately above, this refreshes them once the background
                // script's repo walk finishes. Routed through the background script (not
                // run here directly) so it survives the popup closing mid-fetch.
                api.runtime.sendMessage({ type: 'POPUP_SYNC' }, response =>
                  renderStats(response?.stats)
                );
              });
            } else {
              $('#hook_mode').show();
            }
          });
        } else if (xhr.status === 401) {
          // bad oAuth
          // reset token and redirect to authorization process again!
          api.storage.local.set({ leethub_token: null }, () => {
            console.log('Bad token. Redirecting back to auth.');
            $('#auth_mode').show();
          });
        }
      }
    });
    xhr.open('GET', AUTHENTICATION_URL, true);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    xhr.send();
  }
});
