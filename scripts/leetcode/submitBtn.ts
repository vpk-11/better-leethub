import type { LeetCodeV1, LeetCodeV2 } from './versions.js';

/* Manual "Push" button - lives on the submission/results page (not the code editor), by
   explicit project-owner preference: a re-push/fallback/versioning control that reads more
   naturally next to the Accepted result than sitting in the editor toolbar. Auto-push (the
   primary path) is handled passively by listenForAutoSubmit in leetcode.js via the
   MAIN-world interceptor - this button exists for re-pushing an already-viewed submission or
   adding a versioned suffix (right-click), not for detection. */

const getSubmissionPageBtns = (): Element | null => {
  return document.querySelector('.flex.flex-none.gap-2:not(.justify-center):not(.justify-between)');
};

const createToolTip = (): HTMLDivElement => {
  const toolTip = document.createElement('div');
  toolTip.id = 'leethub-upload-tooltip';
  toolTip.textContent =
    'Push this submission to GitHub.\nRight-click to add a suffix and keep multiple versions.\nPlease be mindful of your GitHub rate-limits.';
  toolTip.className =
    'fixed bg-sd-popover text-sd-popover-foreground rounded-sd-md z-modal text-xs text-left font-normal whitespace-pre-line shadow p-3 border-sd-border border cursor-default translate-y-20 pointer-events-none transition-opacity opacity-0 duration-300';
  return toolTip;
};

const createGitIcon = (): SVGSVGElement => {
  const uploadIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  uploadIcon.setAttribute('id', 'leethub-upload-icon');
  uploadIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  uploadIcon.setAttribute('width', '16');
  uploadIcon.setAttribute('height', '17');
  uploadIcon.setAttribute('viewBox', '0 0 38.999866 56.642887');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'style',
    'fill:#fcfcfc;fill-opacity:1;stroke:#ffffff;stroke-width:3;stroke-dasharray:none;stroke-opacity:1'
  );
  path.setAttribute(
    'd',
    'm 19.775372,2.121319 -9.072314,9.072314 a 0.51539412,0.66999737 45 0 0 -0.109554,0.838192 0.49679682,0.64582142 45 0 0 0.810286,-0.125057 l 7.846033,-7.846033 v 30.608468 a 0.47397466,0.47397466 0 0 0 0.473873,0.473873 h 0.0093 a 0.51713218,0.51713218 0 0 0 0.516765,-0.517281 V 4.018877 l 7.559745,7.560262 a 0.62190211,0.49679682 45 0 0 0.793233,0.107487 0.64518265,0.51539412 45 0 0 -0.09198,-0.820621 l -8.033101,-8.033102 0.0047,-0.0047 z m 7.81141,17.001029 v 0.999939 l 5.229655,0.01189 a 3.6922154,3.6922154 0 0 1 3.683496,3.692281 v 26.633 a 3.6835681,3.6835681 0 0 1 -3.683496,3.683496 H 6.1834371 a 3.6835681,3.6835681 0 0 1 -3.683496,-3.683496 v -26.633 a 3.6835681,3.6835681 0 0 1 3.683496,-3.683496 H 11.538666 V 19.143023 H 6.3121111 a 4.8119141,4.8119141 0 0 0 -4.812109,4.812109 v 26.375651 a 4.8119141,4.8119141 0 0 0 4.812109,4.81211 H 32.687762 a 4.8119141,4.8119141 0 0 0 4.81211,-4.81211 V 23.955128 a 4.8220648,4.8220648 0 0 0 -4.81211,-4.822444 z'
  );

  uploadIcon.appendChild(path);
  return uploadIcon;
};

/* Validate if string can be added as suffix. Can add more constraints if necessary. */
function isValidSuffix(suffix: string | null): suffix is string {
  if (!suffix || suffix.length > 255) {
    return false;
  }
  return true;
}

/**
 * Inserts the manual "Push" button into the submission page's button row.
 */
function addManualSubmitBtn(
  leetCode: LeetCodeV1 | LeetCodeV2,
  loader: (leetCode: LeetCodeV1 | LeetCodeV2, suffix?: string) => void
): void {
  if (document.getElementById('manualGitSubmit')) return;
  const btns = getSubmissionPageBtns();
  if (!btns || (btns as HTMLElement).innerText.includes('LeetHub')) return;

  /* leetCode.submissionId is only ever populated by the auto-detect interceptor path THIS
     session (see listenForAutoSubmit in leetcode.js). Viewing an already-accepted
     submission's results page directly - no fresh /submit/ fetch happened this session -
     leaves it undefined, so init()'s GraphQL query silently fails. Fall back to parsing it
     out of the current URL (this page's own URL always has it) before pushing. */
  const resolveSubmissionId = () => {
    if (!leetCode.submissionId) {
      const match = window.location.href.match(/\/submissions\/(\d+)/);
      if (match) leetCode.submissionId = match[1];
    }
  };

  const submitButton = document.createElement('button');
  submitButton.id = 'manualGitSubmit';
  submitButton.className =
    'whitespace-nowrap focus:outline-none text-label-r bg-green-s dark:bg-dark-blue-s hover:bg-green-3 dark:hover:bg-dark-blue-3 flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium';
  submitButton.setAttribute('style', 'background-color:darkorange');
  submitButton.textContent = 'Push ';
  submitButton.prepend(createGitIcon());
  const toolTip = createToolTip();
  submitButton.appendChild(toolTip);

  /* Real mouseenter/mouseleave on this exact button, not Tailwind's `.group`/`group-hover` -
     LeetCode's own page reuses `.group` ambiently elsewhere in this button row, so
     `group-hover` fired on any ancestor with that class being hovered, not just this one
     (the actual cause of the tooltip showing up nowhere near the button). Scoped to this
     element only. Keeps the same ~1s show delay the original CSS `transition-delay` gave. */
  let showTimeout: ReturnType<typeof setTimeout> | undefined;
  submitButton.addEventListener('mouseenter', () => {
    showTimeout = setTimeout(() => {
      toolTip.classList.remove('opacity-0');
      toolTip.classList.add('opacity-100');
    }, 1000);
  });
  submitButton.addEventListener('mouseleave', () => {
    clearTimeout(showTimeout);
    toolTip.classList.remove('opacity-100');
    toolTip.classList.add('opacity-0');
  });

  submitButton.addEventListener('click', () => {
    resolveSubmissionId();
    loader(leetCode);
  });
  submitButton.addEventListener('contextmenu', event => {
    event.preventDefault();
    const suffix = prompt(
      'Add a suffix for this solution file, i.e., -bfs, -dfs. \r\nWe recommend not including special characters except for "-".'
    );
    if (isValidSuffix(suffix)) {
      resolveSubmissionId();
      loader(leetCode, suffix);
    }
  });

  btns.appendChild(submitButton);
}

/**
 * Watches for the submission page's button row to appear (SPA navigation, so this needs to
 * keep observing rather than running once) and inserts the manual Push button.
 */
function setupManualSubmitBtn(
  leetCode: LeetCodeV1 | LeetCodeV2,
  loader: (leetCode: LeetCodeV1 | LeetCodeV2, suffix?: string) => void
): void {
  const observer = new MutationObserver(() => {
    if (window.location.href.match(/\/submissions\//) && getSubmissionPageBtns()) {
      addManualSubmitBtn(leetCode, loader);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export default setupManualSubmitBtn;
