import { getBrowser } from './leetcode/util.js';

const THEME_KEY = 'leethub_theme';

/** Applies the shared theme preference to <html data-theme="..."> and wires the toggle icon.
 * Single storage.local key, read/written by both popup.ts and welcome.ts, so the two surfaces
 * can't end up with two independent toggles that drift out of sync. Dark is the default
 * scheme (no stored preference yet) - see css/tokens.css. */
export function initTheme(): void {
  const api = getBrowser();
  api.storage.local.get({ [THEME_KEY]: 'dark' }, data => {
    document.documentElement.dataset.theme = data[THEME_KEY];
  });

  // A class, not an id - popup.html has two theme-toggle buttons (start view + commit-mode
  // view, mutually exclusive but both present in the DOM), and duplicate ids silently break
  // jQuery's id-selector optimization (only the first match gets the handler).
  $('.theme-toggle').click(() => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    api.storage.local.set({ [THEME_KEY]: next });
  });
}
