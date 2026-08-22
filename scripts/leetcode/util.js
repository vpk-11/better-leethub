/** Enum for languages supported by LeetCode. */
const languages = Object.freeze({
  C: '.c',
  'C++': '.cpp',
  'C#': '.cs',
  Dart: '.dart',
  Elixir: '.ex',
  Erlang: '.erl',
  Go: '.go',
  Java: '.java',
  JavaScript: '.js',
  Javascript: '.js',
  Kotlin: '.kt',
  MySQL: '.sql',
  'MS SQL Server': '.sql',
  Oracle: '.sql',
  Pandas: '.py',
  PHP: '.php',
  Python: '.py',
  Python3: '.py',
  Racket: '.rkt',
  Ruby: '.rb',
  Rust: '.rs',
  Scala: '.scala',
  Swift: '.swift',
  TypeScript: '.ts',
});

/** @enum */
const DIFFICULTY = Object.freeze({
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  UNKNOWN: 'Unknown',
});

class LeetHubError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LeetHubErr';
  }
}

function isEmptyObject(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

function assert(truthy, msg) {
  if (!truthy) {
    throw new LeetHubError(msg);
  }
}

/**
 * Returns a function that can be immediately invoked but will start
 * a timeout of 'wait' milliseconds before it can be called again.
 * @param {Function} func to be called after wait
 * @param {number} wait time in ms
 * @param {boolean} invokeBeforeTimeout true if you want to invoke func before waiting
 * @returns {Function}
 */
function debounce(func, wait, invokeBeforeTimeout) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!invokeBeforeTimeout) func.apply(context, args);
    };
    const callNow = invokeBeforeTimeout && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Delays the execution of a function by the specified time (in milliseconds)
 * and then executes the function with the provided arguments.
 *
 * @param {Function} func - The function to be executed after the delay.
 * @param {number} wait - The number of milliseconds to wait before executing the function.
 * @param {...*} [args] - Additional arguments to pass to the function when it is called.
 * @returns {Promise<*>} A promise that resolves with the result of the function execution.
 */
function delay(func, wait, ...args) {
  return new Promise(resolve => setTimeout(() => resolve(func(...args)), wait));
}

/**
 *
 * @returns {chrome | browser} namespace of browser extension api
 */
function getBrowser() {
  if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') {
    return chrome;
  } else if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
    return browser;
  } else {
    throw new LeetHubError('BrowserNotSupported');
  }
}

/**
 * Returns the difficulty in PascalCase for a given difficulty
 * @param {string} difficulty - The difficulty level as a string: "easy", "medium", "hard", etc.
 * @returns {string} - The difficulty level in PascalCase: "Easy", "Medium", or "Hard" or "Unknown" for unrecognized values.
 */
function getDifficulty(difficulty) {
  difficulty &&= difficulty.toUpperCase().trim();
  return DIFFICULTY[difficulty] ?? DIFFICULTY.UNKNOWN;
}

/**
 * Derives the problem directory path from the two folder settings. Matches 3.0's real
 * fixed-precedence logic (language wins over difficulty when both are on - difficulty
 * nests inside language, not the reverse) plus this fork's own LeetCode/GFG top-level
 * separation, which is always prefixed regardless of the difficulty toggle - a deliberate
 * addition on top of 3.0, not something 3.0 itself does.
 *
 * @param {string} problemSlug - e.g. "0001-two-sum"
 * @param {string} difficulty - PascalCase difficulty, e.g. "Easy" (from getDifficulty())
 * @param {string} languageName - the submission's verbose language name, e.g. "Python3".
 *   Must come from the platform's own language field (LeetCodeV2's `lang.verboseName`, or the
 *   equivalent DOM-sourced name on LeetCodeV1) - never reverse-derived from a file extension,
 *   since `languages` maps name -> extension and multiple names collide on the same extension
 *   (e.g. Pandas and Python3 both -> .py).
 * @param {{folderDifficulty: boolean, folderLanguage: boolean}} settings
 * @returns {string} the problem directory path, e.g. "LeetCode/Python3/Easy/0001-two-sum"
 */
function buildProblemPath(problemSlug, difficulty, languageName, settings) {
  const { folderDifficulty, folderLanguage } = settings;
  const parts = ['LeetCode'];
  if (folderLanguage) {
    parts.push(languageName);
    if (folderDifficulty) parts.push(difficulty);
  } else if (folderDifficulty) {
    parts.push(difficulty);
  }
  parts.push(problemSlug);
  return parts.join('/');
}

/**
 * Substitutes {varName} placeholders in a custom commit message template. Unknown keys are
 * left as literal text rather than stripped or erroring - matches 3.0's real behavior.
 * @param {string} template
 * @param {Object} context - e.g. { date, problemName, problemTopic, difficulty, language, time, space }
 * @returns {string}
 */
function parseCustomCommitMessage(template, context) {
  return template.replace(/{(\w+)}/g, (match, key) =>
    Object.hasOwn(context, key) ? context[key] : match
  );
}

/** Returns today's date as MM-DD-YYYY. */
function getTodaysDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${d.getFullYear()}`;
}

/** Returns a filename-safe timestamp: MM-DD-YYYY-hh-mm-ss. */
function getTimestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${getTodaysDate()}-${hh}-${min}-${ss}`;
}

/**
 * Checks if an HTML Collection exists and has elements
 * @param {HTMLCollectionOf<Element>} elem
 * @returns
 */
function checkElem(elem) {
  return elem && elem.length > 0;
}

/** @param {string} string @returns {string} problem slug, e.g. 0001-two-sum */
function convertToSlug(string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

function addLeadingZeros(title) {
  const maxTitlePrefixLength = 4;
  var len = title.split('-')[0].length;
  if (len < maxTitlePrefixLength) {
    return '0'.repeat(4 - len) + title;
  }
  return title;
}

function formatStats(time, timePercentile, space, spacePercentile) {
  return `Time: ${time} (${timePercentile}%), Space: ${space} (${spacePercentile}%) - LeetHub`;
}

function isObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

function mergeDeep(target, source) {
  for (const key in source) {
    if (isObject(source[key])) {
      if (!target[key]) {
        Object.assign(target, { [key]: {} });
      }
      mergeDeep(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
}

function mergeStats(obj1, obj2) {
  function countDifficulties(shas) {
    const difficulties = { easy: 0, medium: 0, hard: 0, solved: 0 };
    for (const problem in shas) {
      if ('difficulty' in shas[problem]) {
        const difficulty = shas[problem].difficulty;
        if (difficulty in difficulties) {
          difficulties[difficulty]++;
        }
      }
    }
    for (let value of Object.values(difficulties)) {
      difficulties.solved += value;
    }
    return difficulties;
  }

  const merged = {};
  mergeDeep(merged, obj1);
  mergeDeep(merged, obj2);

  const shas = merged.shas || {};
  const difficulties = countDifficulties(shas);

  merged.easy = difficulties.easy;
  merged.medium = difficulties.medium;
  merged.hard = difficulties.hard;
  merged.solved = difficulties.solved;

  return merged;
}

/** Fetches one GitHub Contents API entry. Returns the directory listing array for a folder,
 * or the decoded (base64) text content for a file. */
const fetchRepoContent = async (hook, token, path) => {
  const res = await fetch(`https://api.github.com/repos/${hook}/contents/${path}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.type === 'dir' || Array.isArray(data) ? data : atob(data.content);
};

/**
 * Recursively walks the linked repo via the Contents API and parses the difficulty out of
 * every per-problem README.md's `<h3>{difficulty}</h3>` tag - the expensive path (one
 * network request per problem). Only ever called once, when a repo is first linked (see
 * provisionRepoFiles below) or on an explicit manual re-sync - never on a routine popup
 * open. Doing that was an actual bug: for a repo with 100+ solved problems it fires 100+
 * sequential GitHub API calls, which reliably trips GitHub's secondary rate limit and
 * silently produces incomplete/wrong counts.
 */
async function computeStatsFromReadmes(hook, token) {
  const counts = { easy: 0, medium: 0, hard: 0 };

  const walk = async contents => {
    for (const item of contents) {
      try {
        if (item.name.toLowerCase() === 'readme.md' && item.path !== 'README.md') {
          const content = await fetchRepoContent(hook, token, item.path);
          const difficulty = content.split('<h3>')[1]?.split('</h3>')[0]?.trim().toLowerCase();
          if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
            counts[difficulty] += 1;
          }
        } else if (item.type === 'dir') {
          await walk(await fetchRepoContent(hook, token, item.path));
        }
      } catch (err) {
        console.error(`LeetHub: failed to process ${item.path}`, err);
      }
    }
  };

  await walk(await fetchRepoContent(hook, token, ''));
  return counts;
}

const STATS_FILENAME = 'stats.json';

/** Reads stats.json from the linked repo. File shape is exactly
 * `{ "easy": "0", "medium": "0", "hard": "0" }` - string values, no "solved" key (that's
 * always just easy+medium+hard, computed where needed, never stored). Returns
 * `{ counts: {easy,medium,hard} }` (numbers) and the sha, or null if it doesn't exist yet or
 * the request fails. */
async function getRepoStats(hook, token) {
  try {
    const res = await fetch(`https://api.github.com/repos/${hook}/contents/${STATS_FILENAME}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = JSON.parse(atob(data.content));
    return {
      counts: {
        easy: Number(raw.easy) || 0,
        medium: Number(raw.medium) || 0,
        hard: Number(raw.hard) || 0,
      },
      sha: data.sha,
    };
  } catch (err) {
    console.error('LeetHub: failed to read stats.json', err);
    return null;
  }
}

/** Creates or updates stats.json in the linked repo (pass the existing sha to update).
 * Writes exactly `{ easy, medium, hard }` as strings - nothing else. */
async function putRepoStats(hook, token, counts, sha) {
  try {
    const content = {
      easy: String(counts.easy),
      medium: String(counts.medium),
      hard: String(counts.hard),
    };
    await fetch(`https://api.github.com/repos/${hook}/contents/${STATS_FILENAME}`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify({
        message: sha ? 'Update LeetHub stats' : 'Create LeetHub stats',
        content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
        sha,
      }),
    });
  } catch (err) {
    console.error('LeetHub: failed to write stats.json', err);
  }
}

/** Saves { easy, medium, hard } into local storage.stats (deriving `solved` as their sum),
 * keeping the existing sha cache (upload-dedup bookkeeping, local-only, never mirrored to
 * stats.json). */
async function saveLocalStats(counts) {
  const api = getBrowser();
  const { stats: existing } = await api.storage.local.get('stats');
  const solved = counts.easy + counts.medium + counts.hard;
  const stats = { ...counts, solved, shas: existing?.shas ?? {} };
  await api.storage.local.set({ stats });
  return stats;
}

/**
 * Pure read, called on every popup open: pulls stats.json straight from the repo (one API
 * call) into local storage. Never falls back to computing it - by the time a popup can open,
 * stats.json is guaranteed to already exist (provisionRepoFiles runs at repo-link time, not
 * lazily here), so there is nothing to fall back to and no reason to risk ever triggering
 * the expensive README walk from this path.
 */
async function syncStatsFromRepo() {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return null;

  const existing = await getRepoStats(leethub_hook, leethub_token);
  return existing ? saveLocalStats(existing.counts) : null;
}

/** Forces a full README re-walk and overwrites stats.json - used both to provision a repo
 * the moment it's linked (see provisionRepoFiles) and by the manual "Sync Problem Counts"
 * link, when the cached file has drifted from the repo's real state (e.g. problems
 * added/removed outside the extension). */
async function recomputeStatsFromRepo() {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return null;

  try {
    const [counts, existing] = await Promise.all([
      computeStatsFromReadmes(leethub_hook, leethub_token),
      getRepoStats(leethub_hook, leethub_token),
    ]);
    await putRepoStats(leethub_hook, leethub_token, counts, existing?.sha);
    return saveLocalStats(counts);
  } catch (err) {
    console.error('LeetHub: failed to recompute stats.json', err);
    return null;
  }
}

/** Pushes the current local stats counts to stats.json in the repo - call right after a
 * new problem is pushed, alongside the README-topic-table update, so stats.json stays a
 * running total instead of drifting until the next full recompute. */
async function pushStatsToRepo() {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return;

  const { stats } = await api.storage.local.get('stats');
  if (!stats) return;
  const { easy, medium, hard } = stats;

  const existing = await getRepoStats(leethub_hook, leethub_token);
  await putRepoStats(leethub_hook, leethub_token, { easy, medium, hard }, existing?.sha);
}

const CONFIG_FILENAME = 'config.json';
/** Every setting stored per-repo in config.json - the folder/timestamp/solution-post
 * toggles and the commit-message template. Not `leethub_token`/`leethub_hook` themselves -
 * those are per-browser auth state, not per-repo config. */
const SETTINGS_KEYS = [
  'leethub_use_difficulty_folder',
  'leethub_use_language_folder',
  'leethub_use_timestamp_filename',
  'leethub_auto_commit_solution_post',
  'leethub_custom_commit_message',
];

/** Reads config.json from the linked repo. Returns { config, sha }, or null if it doesn't
 * exist yet or the request fails. */
async function getRepoConfig(hook, token) {
  try {
    const res = await fetch(`https://api.github.com/repos/${hook}/contents/${CONFIG_FILENAME}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { config: JSON.parse(atob(data.content)), sha: data.sha };
  } catch (err) {
    console.error('LeetHub: failed to read config.json', err);
    return null;
  }
}

/** Creates or updates config.json in the linked repo (pass the existing sha to update). */
async function putRepoConfig(hook, token, config, sha) {
  try {
    await fetch(`https://api.github.com/repos/${hook}/contents/${CONFIG_FILENAME}`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify({
        message: sha ? 'Update LeetHub config' : 'Create LeetHub config',
        content: btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2)))),
        sha,
      }),
    });
  } catch (err) {
    console.error('LeetHub: failed to write config.json', err);
  }
}

/**
 * Pulls config.json into local storage on popup/welcome open, so settings configured from
 * one browser/profile carry over to another linked to the same repo. Creates the file from
 * the current local settings if it doesn't exist yet (first time this repo sees LeetHub).
 * The repo is treated as the source of truth on load - see pushConfigToRepo for the reverse
 * direction (local change -> repo).
 */
async function syncConfigFromRepo() {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return;

  const existing = await getRepoConfig(leethub_hook, leethub_token);
  if (existing) {
    await api.storage.local.set(existing.config);
    return;
  }

  const local = await api.storage.local.get(SETTINGS_KEYS);
  await putRepoConfig(leethub_hook, leethub_token, local);
}

/**
 * Builds config.json and stats.json the moment a repo is linked/created, not lazily on the
 * next popup open - so both files are guaranteed to already exist by the time anything reads
 * them, and a routine popup open never needs to fall back to computing anything. config.json:
 * check-or-create (syncConfigFromRepo - if the repo already has one from a previous link,
 * pull it instead of clobbering it). stats.json: no check, always a full README sweep
 * (recomputeStatsFromRepo) - an empty/fresh repo just sweeps to all zeros, same as 3.0's own
 * default behavior.
 */
async function provisionRepoFiles() {
  const [stats] = await Promise.all([recomputeStatsFromRepo(), syncConfigFromRepo()]);
  return stats;
}

/** Pushes the current local settings to config.json in the repo - call after any settings
 * change so the repo stays the up to date source of truth. */
async function pushConfigToRepo() {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return;

  const existing = await getRepoConfig(leethub_hook, leethub_token);
  const local = await api.storage.local.get(SETTINGS_KEYS);
  await putRepoConfig(leethub_hook, leethub_token, local, existing?.sha);
}

export {
  addLeadingZeros,
  assert,
  buildProblemPath,
  checkElem,
  convertToSlug,
  debounce,
  delay,
  DIFFICULTY,
  formatStats,
  getBrowser,
  getDifficulty,
  getTimestamp,
  getTodaysDate,
  isEmptyObject,
  languages,
  LeetHubError,
  mergeStats,
  parseCustomCommitMessage,
  pushConfigToRepo,
  syncConfigFromRepo,
  provisionRepoFiles,
  pushStatsToRepo,
  recomputeStatsFromRepo,
  syncStatsFromRepo,
};
