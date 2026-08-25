import { buildProblemPath, getBrowser, getTimestamp } from './leetcode/util.js';
import { renderConfigsSummary } from './configsSummary.js';

/** The literal defaults every repo is provisioned with (see util.ts's own fallback values,
 * used consistently everywhere these keys are read) - what Reset restores, not just "undo
 * this edit session". */
const DEFAULT_SETTINGS = {
  leethub_custom_commit_message: null as string | null,
  leethub_use_difficulty_folder: false,
  leethub_use_language_folder: false,
  leethub_use_timestamp_filename: false,
  leethub_auto_commit_solution_post: true,
};

const EDIT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const CANCEL_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

/** Reads a .switch button's on/off state - the switch is a real <button role="switch">, not a
 * checkbox input (matches the reviewed design mockup), so state lives in the `is-on` class and
 * the `aria-checked` attribute stays in sync with it for assistive tech. */
function isOn($switch: JQuery): boolean {
  return $switch.hasClass('is-on');
}

function setSwitch($switch: JQuery, on: boolean): void {
  $switch.toggleClass('is-on', on).attr('aria-checked', String(on));
}

/** Recomputes the live folder-structure preview inside the edit form from the two subfolder
 * switches' current (unsaved) state - via the same exported buildProblemPath() the real
 * upload path uses, not a second copy of the precedence rule. */
function updateFolderLivePreview(): void {
  const path = buildProblemPath('0001-two-sum', 'Easy', 'Python3', {
    folderDifficulty: isOn($('#use-difficulty-folder')),
    folderLanguage: isOn($('#use-language-folder')),
  });
  $('#folder-live-preview').text(`${path}.py`);
}

/** Shows what a filename looks like with timestamping on, right below the toggle - dead
 * weight when it's off, so only rendered in that case. */
function updateTimestampExample(): void {
  const on = isOn($('#use-timestamp-filename'));
  $('#timestamp-example').text(on ? `0001-two-sum-${getTimestamp()}.py` : '');
}

/** Wires the Configs edit form shared by popup.html and welcome.html.
 *
 * Semantics (matches the project owner's explicit design): opening the editor is a draft -
 * every switch click only updates the on-screen state and live previews, nothing is written
 * to storage until the user commits. The edit icon becomes a cancel (X) while the draft is
 * open; clicking it discards the draft with no storage write and falls back to whatever is
 * already saved (populateForm() re-reads storage fresh next time it opens, so an abandoned
 * draft just evaporates). Save writes every field's current draft value in one batched
 * storage.local.set, then pushes to config.json via `onChange`. Reset writes the literal
 * default settings (not "whatever it was before this edit session") and pushes them too - a
 * real reset, not an undo. Both Save and Reset close the editor back to the summary view.
 *
 * `onChange` is the only thing that differs per surface (popup.ts routes it through
 * background.js's PUSH_CONFIG message to survive popup teardown; welcome.ts calls
 * pushConfigToRepo() directly since a full tab has no such teardown risk). */
export function wireConfigsEditForm(onChange: () => void): void {
  const api = getBrowser();

  const closeEditor = (): void => {
    $('#configs-edit-body').hide();
    $('#configs-summary-body').show();
    $('#configs-edit-icon').html(EDIT_ICON).attr('aria-label', 'Edit configs');
  };

  const populateForm = (): void => {
    api.storage.local.get(DEFAULT_SETTINGS, data => {
      $('#custom-commit-msg').val(data.leethub_custom_commit_message || '');
      setSwitch($('#use-difficulty-folder'), Boolean(data.leethub_use_difficulty_folder));
      setSwitch($('#use-language-folder'), Boolean(data.leethub_use_language_folder));
      setSwitch($('#use-timestamp-filename'), Boolean(data.leethub_use_timestamp_filename));
      setSwitch($('#auto-commit-solution-post'), Boolean(data.leethub_auto_commit_solution_post));
      updateFolderLivePreview();
      updateTimestampExample();
    });
  };

  const openEditor = (): void => {
    populateForm();
    $('#configs-summary-body').hide();
    $('#configs-edit-body').show();
    $('#configs-edit-icon').html(CANCEL_ICON).attr('aria-label', 'Cancel editing');
  };

  /** Writes `data` in one batched call, refreshes the summary, notifies the caller, and
   * closes the editor - the shared tail of both Save and Reset. */
  const commit = (data: Record<string, unknown>): void => {
    api.storage.local.set(data, () => {
      renderConfigsSummary();
      onChange();
      closeEditor();
    });
  };

  $('#configs-edit-icon').click(() => {
    if ($('#configs-edit-body').is(':visible')) closeEditor(); // cancel - no storage write
    else openEditor();
  });

  // Draft-only: no storage write on click, just the visual state and live previews.
  $('#use-difficulty-folder').click(function () {
    setSwitch($(this), !isOn($(this)));
    updateFolderLivePreview();
  });
  $('#use-language-folder').click(function () {
    setSwitch($(this), !isOn($(this)));
    updateFolderLivePreview();
  });
  $('#use-timestamp-filename').click(function () {
    setSwitch($(this), !isOn($(this)));
    updateTimestampExample();
  });
  $('#auto-commit-solution-post').click(function () {
    setSwitch($(this), !isOn($(this)));
  });

  $('#msg-save-btn').click(() => {
    const commitMessage = String($('#custom-commit-msg').val()).trim();
    commit({
      leethub_custom_commit_message: commitMessage || null,
      leethub_use_difficulty_folder: isOn($('#use-difficulty-folder')),
      leethub_use_language_folder: isOn($('#use-language-folder')),
      leethub_use_timestamp_filename: isOn($('#use-timestamp-filename')),
      leethub_auto_commit_solution_post: isOn($('#auto-commit-solution-post')),
    });
    const successMessage = $('#success-message');
    successMessage.show();
    setTimeout(() => successMessage.hide(), 3000);
  });

  $('#msg-reset-btn').click(() => {
    commit({ ...DEFAULT_SETTINGS });
  });

  $('.chip').on('click', function () {
    const variableName = $(this).attr('id');
    $('#custom-commit-msg').val((_index, currentValue) => `${currentValue}{${variableName}} `);
  });
}
