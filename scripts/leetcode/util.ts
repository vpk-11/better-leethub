/** Enum for languages supported by LeetCode. */
const languages: Record<string, string> = Object.freeze({
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
type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];

/** Two-toggle folder layout settings - see buildProblemPath. */
interface FolderSettings {
  folderDifficulty: boolean;
  folderLanguage: boolean;
}

/** stats.json's file shape (also local storage.stats minus `solved`/`shas`). */
interface StatsCounts {
  easy: number;
  medium: number;
  hard: number;
}

/** Local storage.stats - StatsCounts plus the derived total and the upload-dedup SHA cache. */
interface LocalStats extends StatsCounts {
  solved: number;
  shas: Record<string, unknown>;
}

/** Per-repo config.json shape - mirrors the five leethub_* settings keys, values vary by key
 * (booleans for the toggles, string for the commit-message template), so this stays loose
 * rather than pretending to a precise shape two call sites would have to keep in sync. */
type RepoConfig = Record<string, unknown>;

/** The browser-extension namespace, whichever of the two this browser exposes - see
 * getBrowser(). Chrome and Firefox's real extension APIs are close enough in shape that every
 * call site in this codebase (`.runtime`, `.storage.local`) works against either without a
 * cast, but the two @types packages describe them as fully distinct namespaces, not a shared
 * interface - so callers narrow with a type assertion at the one point this value is produced,
 * not scattered across every call site.
 * ponytail: no shared minimal interface extracted for the union; revisit if a third target
 * (e.g. Safari) or a call site needing a genuinely divergent method ever gets added. */
type BrowserApi = typeof chrome | typeof browser;

class LeetHubError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'LeetHubErr';
  }
}

function isEmptyObject(obj: object): boolean {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

/**
 * Delays the execution of a function by the specified time (in milliseconds)
 * and then executes the function with the provided arguments.
 *
 * @param func - The function to be executed after the delay.
 * @param wait - The number of milliseconds to wait before executing the function.
 * @param args - Additional arguments to pass to the function when it is called.
 * @returns A promise that resolves with the result of the function execution.
 */
function delay<T, Args extends unknown[]>(
  func: (...args: Args) => T,
  wait: number,
  ...args: Args
): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(func(...args)), wait));
}

/**
 * @returns namespace of browser extension api
 */
function getBrowser(): BrowserApi {
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
 * @param difficulty - The difficulty level as a string: "easy", "medium", "hard", etc.
 * @returns The difficulty level in PascalCase: "Easy", "Medium", or "Hard" or "Unknown" for unrecognized values.
 */
function getDifficulty(difficulty: string): Difficulty {
  const key = difficulty?.toUpperCase().trim();
  return (DIFFICULTY as Record<string, Difficulty>)[key] ?? DIFFICULTY.UNKNOWN;
}

/**
 * Derives the problem directory path from the two folder settings. Matches 3.0's real
 * fixed-precedence logic (language wins over difficulty when both are on - difficulty
 * nests inside language, not the reverse) plus this fork's own always-on LeetCode/
 * top-level prefix, regardless of the difficulty toggle - a deliberate addition on top
 * of 3.0, not something 3.0 itself does.
 *
 * @param problemSlug - e.g. "0001-two-sum"
 * @param difficulty - PascalCase difficulty, e.g. "Easy" (from getDifficulty())
 * @param languageName - the submission's verbose language name, e.g. "Python3".
 *   Must come from the platform's own language field (LeetCodeV2's `lang.verboseName`, or the
 *   equivalent DOM-sourced name on LeetCodeV1) - never reverse-derived from a file extension,
 *   since `languages` maps name -> extension and multiple names collide on the same extension
 *   (e.g. Pandas and Python3 both -> .py).
 * @returns the problem directory path, e.g. "LeetCode/Python3/Easy/0001-two-sum"
 */
function buildProblemPath(
  problemSlug: string,
  difficulty: string,
  languageName: string,
  settings: FolderSettings
): string {
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
 * left as literal text rather than stripped or erroring - matches 3.0's real behavior. Values
 * may be undefined (e.g. a problem with no resolved difficulty yet) - stringified the same
 * way untyped JS string interpolation always did, not silently swapped for empty text.
 */
function parseCustomCommitMessage(
  template: string,
  context: Record<string, string | undefined>
): string {
  return template.replace(/{(\w+)}/g, (match, key) =>
    Object.hasOwn(context, key) ? String(context[key]) : match
  );
}

/** Returns today's date as MM-DD-YYYY. */
function getTodaysDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${d.getFullYear()}`;
}

/** Returns a filename-safe timestamp: MM-DD-YYYY-hh-mm-ss. */
function getTimestamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${getTodaysDate()}-${hh}-${min}-${ss}`;
}

/**
 * Checks whether an array-like DOM result (HTMLCollection, NodeList, or a plain array of
 * strings from a split()) exists and has elements. Generic over anything with a `.length`
 * since every call site passes a different one of those three shapes.
 */
function checkElem(elem: { length: number } | null | undefined): boolean {
  return Boolean(elem && elem.length > 0);
}

/** @returns problem slug, e.g. 0001-two-sum */
function convertToSlug(str: string): string {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return str
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

function addLeadingZeros(title: string): string {
  const maxTitlePrefixLength = 4;
  const len = title.split('-')[0].length;
  if (len < maxTitlePrefixLength) {
    return '0'.repeat(4 - len) + title;
  }
  return title;
}

function formatStats(
  time: string,
  timePercentile: string,
  space: string,
  spacePercentile: string
): string {
  return `Time: ${time} (${timePercentile}%), Space: ${space} (${spacePercentile}%) - LeetHub`;
}

/** Standard GitHub REST API auth headers - shared by every fetch call in this codebase so
 * the header shape lives in exactly one place. */
function githubHeaders(token: string): Record<string, string> {
  return { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };
}

/** Escapes a string for safe interpolation into an HTML string (e.g. jQuery `.html()`). */
function escapeHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fetches one GitHub Contents API entry. Returns the directory listing array for a folder,
 * or the decoded (base64) text content for a file. */
const fetchRepoContent = async (
  hook: string,
  token: string,
  path: string
): Promise<unknown[] | string> => {
  const res = await fetch(`https://api.github.com/repos/${hook}/contents/${path}`, {
    headers: githubHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.type === 'dir' || Array.isArray(data) ? data : atob(data.content);
};

interface GitTreeItem {
  type: string;
  path: string;
  mode?: string;
  sha?: string | null;
}

/**
 * Recursively walks the linked repo via the Contents API and parses the difficulty out of
 * every per-problem README.md's `<h3>{difficulty}</h3>` tag - the expensive path (one
 * network request per problem). Only ever called once, when a repo is first linked (see
 * provisionRepoFiles below) or on an explicit manual re-sync - never on a routine popup
 * open. Doing that was an actual bug: for a repo with 100+ solved problems it fires 100+
 * sequential GitHub API calls, which reliably trips GitHub's secondary rate limit and
 * silently produces incomplete/wrong counts.
 */
async function computeStatsFromReadmes(hook: string, token: string): Promise<StatsCounts> {
  const counts: StatsCounts = { easy: 0, medium: 0, hard: 0 };

  try {
    const res = await fetch(`https://api.github.com/repos/${hook}/git/trees/HEAD?recursive=1`, {
      headers: githubHeaders(token),
    });

    if (!res.ok) return counts;

    const data = await res.json();
    const tree: GitTreeItem[] = data?.tree ?? [];

    const readmeItems = tree.filter(
      item =>
        item.type === 'blob' &&
        item.path.toLowerCase().endsWith('readme.md') &&
        item.path.toLowerCase() !== 'readme.md'
    );

    const BATCH_SIZE = 10;
    for (let i = 0; i < readmeItems.length; i += BATCH_SIZE) {
      const batch = readmeItems.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async item => {
          try {
            const content = await fetchRepoContent(hook, token, item.path);
            const match = String(content).match(/<h3[^>]*>\s*(Easy|Medium|Hard)\s*<\/h3>/i);
            if (match) {
              const diff = match[1].toLowerCase();
              if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
                counts[diff] += 1;
              }
            }
          } catch (err) {
            console.error(`LeetHub: failed to parse ${item.path}`, err);
          }
        })
      );
    }
  } catch (err) {
    console.error('LeetHub: failed to compute stats from git trees', err);
  }

  return counts;
}

function encodeJsonContent(value: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value, null, 2))));
}

async function putRepoFile(
  hook: string,
  token: string,
  filename: string,
  content: string,
  message: string,
  sha?: string
): Promise<unknown> {
  const bodyData: { message: string; content: string; sha?: string } = { message, content };
  if (sha) bodyData.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${hook}/contents/${filename}`, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message ? `: ${body.message}` : '';
    } catch (_err) {
      detail = '';
    }
    throw new Error(`GitHub write failed for ${filename}: HTTP ${res.status}${detail}`);
  }

  return res.json();
}

const STATS_FILENAME = 'stats.json';
const README_FILENAME = 'README.md';
/** Includes the empty LeetCode Topics section up front (same start/header/end tags
 * appendProblemToReadme in readmeTopics.js looks for) so a fresh repo's README is already in
 * the shape the topic-append logic expects, rather than relying on that logic's own
 * add-the-section-if-missing fallback to create it later on the first submission. The sync
 * message sits right below the header, inside the section - appendProblemToReadme appends
 * topic tables after whatever's already in the section, so this stays above every table. */
const DEFAULT_REPO_README =
  '<!---LeetCode Topics Start-->\n# LeetCode Topics\nThis repository is synced with [LeetHub](https://github.com/vpk-11/LeetHub).\n<!---LeetCode Topics End-->';

/** Reads stats.json from the linked repo. File shape is exactly
 * `{ "easy": "0", "medium": "0", "hard": "0" }` - string values, no "solved" key (that's
 * always just easy+medium+hard, computed where needed, never stored). Returns
 * `{ counts: {easy,medium,hard} }` (numbers) and the sha, or null if it doesn't exist yet or
 * the request fails. */
async function getRepoStats(
  hook: string,
  token: string
): Promise<{ counts: StatsCounts; sha: string } | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${hook}/contents/${STATS_FILENAME}`, {
      headers: githubHeaders(token),
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
async function putRepoStats(
  hook: string,
  token: string,
  counts: StatsCounts,
  sha?: string
): Promise<void> {
  try {
    let currentSha = sha;
    if (!currentSha) {
      const existing = await getRepoStats(hook, token);
      currentSha = existing?.sha;
    }
    const content = {
      easy: String(counts.easy),
      medium: String(counts.medium),
      hard: String(counts.hard),
    };
    await putRepoFile(
      hook,
      token,
      STATS_FILENAME,
      encodeJsonContent(content),
      currentSha ? 'Update LeetHub stats' : 'Create LeetHub stats',
      currentSha
    );
  } catch (err) {
    console.error('LeetHub: failed to write stats.json', err);
    throw err;
  }
}

/** Saves { easy, medium, hard } into local storage.stats (deriving `solved` as their sum),
 * keeping the existing sha cache (upload-dedup bookkeeping, local-only, never mirrored to
 * stats.json). */
async function saveLocalStats(counts: StatsCounts): Promise<LocalStats> {
  const api = getBrowser();
  const { stats: existing } = await api.storage.local.get('stats');
  const solved = counts.easy + counts.medium + counts.hard;
  const stats: LocalStats = { ...counts, solved, shas: existing?.shas ?? {} };
  await api.storage.local.set({ stats });
  return stats;
}

/**
 * Called on every popup open: pulls stats.json straight from the repo (one API call) into
 * local storage. For a repo linked after provisionRepoFiles existed, this is the only thing
 * that ever runs here - stats.json is already guaranteed to exist from link time. The
 * create-on-first-read fallback below exists only for a repo that was linked *before* this
 * feature existed (a real case, not hypothetical - stats.json doesn't retroactively appear
 * for repos linked in an earlier session) or had its stats.json deleted manually. It costs
 * the expensive README walk exactly once, the same way syncConfigFromRepo already does for
 * config.json - after that first walk, every later popup open is back to the one-call read.
 */
async function syncStatsFromRepo(): Promise<LocalStats | null> {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return null;

  const existing = await getRepoStats(leethub_hook, leethub_token);
  if (existing) {
    return saveLocalStats(existing.counts);
  }

  try {
    const counts = await computeStatsFromReadmes(leethub_hook, leethub_token);
    await putRepoStats(leethub_hook, leethub_token, counts);
    return saveLocalStats(counts);
  } catch (err) {
    console.error('LeetHub: failed to compute stats.json', err);
    return null;
  }
}

/** Forces a full README re-walk and overwrites stats.json - used both to provision a repo
 * the moment it's linked (see provisionRepoFiles) and by the manual "Sync Problem Counts"
 * link, when the cached file has drifted from the repo's real state (e.g. problems
 * added/removed outside the extension). */
async function recomputeStatsFromRepo(): Promise<LocalStats | null> {
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
async function pushStatsToRepo(): Promise<void> {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return;

  const { stats } = await api.storage.local.get('stats');
  if (!stats) return;
  const { easy, medium, hard } = stats as StatsCounts;

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
async function getRepoConfig(
  hook: string,
  token: string
): Promise<{ config: RepoConfig; sha: string } | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${hook}/contents/${CONFIG_FILENAME}`, {
      headers: githubHeaders(token),
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
async function putRepoConfig(
  hook: string,
  token: string,
  config: RepoConfig,
  sha?: string
): Promise<void> {
  try {
    let currentSha = sha;
    if (!currentSha) {
      const existing = await getRepoConfig(hook, token);
      currentSha = existing?.sha;
    }
    await putRepoFile(
      hook,
      token,
      CONFIG_FILENAME,
      encodeJsonContent(config),
      currentSha ? 'Update LeetHub config' : 'Create LeetHub config',
      currentSha
    );
  } catch (err) {
    console.error('LeetHub: failed to write config.json', err);
    throw err;
  }
}

/**
 * Pulls config.json into local storage on popup/welcome open, so settings configured from
 * one browser/profile carry over to another linked to the same repo. Creates the file from
 * the current local settings if it doesn't exist yet (first time this repo sees LeetHub).
 * The repo is treated as the source of truth on load - see pushConfigToRepo for the reverse
 * direction (local change -> repo).
 */
async function syncConfigFromRepo(): Promise<void> {
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

async function ensureRepoReadme(hook: string, token: string): Promise<void> {
  const existing = await fetch(
    `https://api.github.com/repos/${hook}/contents/${README_FILENAME}`,
    { headers: githubHeaders(token) }
  );

  if (existing.ok) return;
  if (existing.status !== 404) {
    throw new Error(`GitHub read failed for ${README_FILENAME}: HTTP ${existing.status}`);
  }

  await putRepoFile(
    hook,
    token,
    README_FILENAME,
    btoa(unescape(encodeURIComponent(DEFAULT_REPO_README))),
    'Create README - LeetHub'
  );
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
async function provisionRepoFiles(): Promise<LocalStats | null> {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return null;

  await ensureRepoReadme(leethub_hook, leethub_token);
  await syncConfigFromRepo();
  const stats = await syncStatsFromRepo();
  return stats;
}

/** Pushes the current local settings to config.json in the repo - call after any settings
 * change so the repo stays the up to date source of truth. */
async function pushConfigToRepo(): Promise<void> {
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

/**
 * Archives the current LeetCode/ folder, stats.json, and README.md under a single dated
 * Archive/{date}/ folder (LeetCode/, stats.json, and README.md all land inside it, in place),
 * then creates a fresh, all-zero stats.json and a fresh scaffolded README.md at the repo root -
 * the same two files provisionRepoFiles() creates for a brand-new repo link. config.json is
 * left untouched. Uses the Git Data API (a tree patch against the current base tree, one
 * commit, one ref update) instead of per-file copy+delete, so the whole operation is a small
 * fixed number of API calls regardless of how many problems are being archived - not one call
 * per file, which would trip GitHub's secondary rate limit on any repo with a meaningful number
 * of solves. Assumes the repo's default branch is `main`, matching this codebase's existing
 * convention elsewhere (the topics-README problem links are already hardcoded to `tree/main`).
 */
async function archiveAndResetStats(): Promise<LocalStats | null> {
  const api = getBrowser();
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token) return null;

  const headers = githubHeaders(leethub_token);

  // 1. Full current tree - also gives us the base tree sha the patch below is built against.
  const treeRes = await fetch(
    `https://api.github.com/repos/${leethub_hook}/git/trees/HEAD?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error(`Failed to read repo tree: HTTP ${treeRes.status}`);
  const treeData = await treeRes.json();
  const tree: GitTreeItem[] = treeData?.tree ?? [];
  const baseTreeSha = treeData.sha;

  // 2. Current branch head commit - the new commit's parent.
  const refRes = await fetch(`https://api.github.com/repos/${leethub_hook}/git/refs/heads/main`, {
    headers,
  });
  if (!refRes.ok) throw new Error(`Failed to read branch ref: HTTP ${refRes.status}`);
  const parentCommitSha = (await refRes.json()).object.sha;

  // Collision-safe archive folder name, checked against the tree already in memory (no extra
  // call). A second same-day reset gets an HH-MM-SS suffix instead of overwriting.
  const date = getTodaysDate();
  let archiveRoot = `Archive/${date}`;
  const collides = tree.some(item => item.path.startsWith(`${archiveRoot}/`));
  if (collides) {
    const now = new Date();
    const suffix = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join('-');
    archiveRoot = `${archiveRoot} ${suffix}`;
  }

  // 3. New blobs for the freshly re-provisioned root files - same shape provisionRepoFiles()
  // creates for a brand-new repo link (zeroed stats.json, scaffolded README.md).
  const [statsBlobRes, readmeBlobRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${leethub_hook}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: encodeJsonContent({ easy: '0', medium: '0', hard: '0' }),
        encoding: 'base64',
      }),
    }),
    fetch(`https://api.github.com/repos/${leethub_hook}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: btoa(unescape(encodeURIComponent(DEFAULT_REPO_README))),
        encoding: 'base64',
      }),
    }),
  ]);
  if (!statsBlobRes.ok)
    throw new Error(`Failed to create stats.json blob: HTTP ${statsBlobRes.status}`);
  if (!readmeBlobRes.ok)
    throw new Error(`Failed to create README.md blob: HTTP ${readmeBlobRes.status}`);
  const newStatsBlobSha = (await statsBlobRes.json()).sha;
  const newReadmeBlobSha = (await readmeBlobRes.json()).sha;

  // 4. Tree patch: move every LeetCode/ blob, stats.json, and README.md into Archive/{date}/ in
  // place - same blob shas, only the paths change - plus fresh stats.json and README.md blobs
  // at the root. config.json isn't touched, so it's simply not mentioned - base_tree carries it
  // forward.
  const patch: GitTreeItem[] = [];
  for (const item of tree) {
    if (item.type !== 'blob') continue;
    if (item.path.startsWith('LeetCode/')) {
      patch.push({ path: item.path, mode: item.mode, type: 'blob', sha: null });
      patch.push({
        path: `${archiveRoot}/${item.path}`,
        mode: item.mode,
        type: 'blob',
        sha: item.sha,
      });
    } else if (item.path === STATS_FILENAME || item.path === README_FILENAME) {
      patch.push({ path: item.path, mode: item.mode, type: 'blob', sha: null });
      patch.push({
        path: `${archiveRoot}/${item.path}`,
        mode: item.mode,
        type: 'blob',
        sha: item.sha,
      });
    }
  }
  patch.push({ path: STATS_FILENAME, mode: '100644', type: 'blob', sha: newStatsBlobSha });
  patch.push({ path: README_FILENAME, mode: '100644', type: 'blob', sha: newReadmeBlobSha });

  const newTreeRes = await fetch(`https://api.github.com/repos/${leethub_hook}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: patch }),
  });
  if (!newTreeRes.ok) throw new Error(`Failed to create archive tree: HTTP ${newTreeRes.status}`);
  const newTreeSha = (await newTreeRes.json()).sha;

  // 5. Commit it.
  const commitRes = await fetch(`https://api.github.com/repos/${leethub_hook}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: `Archive LeetCode/, stats.json, and README.md to ${archiveRoot} - LeetHub`,
      tree: newTreeSha,
      parents: [parentCommitSha],
    }),
  });
  if (!commitRes.ok) throw new Error(`Failed to create archive commit: HTTP ${commitRes.status}`);
  const newCommitSha = (await commitRes.json()).sha;

  // 6. Move the branch ref to point at it.
  const updateRefRes = await fetch(
    `https://api.github.com/repos/${leethub_hook}/git/refs/heads/main`,
    { method: 'PATCH', headers, body: JSON.stringify({ sha: newCommitSha }) }
  );
  if (!updateRefRes.ok) {
    throw new Error(`Failed to update branch ref: HTTP ${updateRefRes.status}`);
  }

  return saveLocalStats({ easy: 0, medium: 0, hard: 0 });
}

export {
  addLeadingZeros,
  archiveAndResetStats,
  buildProblemPath,
  checkElem,
  convertToSlug,
  DEFAULT_REPO_README,
  delay,
  DIFFICULTY,
  escapeHtml,
  formatStats,
  getBrowser,
  getDifficulty,
  githubHeaders,
  getTimestamp,
  getTodaysDate,
  isEmptyObject,
  languages,
  LeetHubError,
  parseCustomCommitMessage,
  pushConfigToRepo,
  syncConfigFromRepo,
  provisionRepoFiles,
  pushStatsToRepo,
  recomputeStatsFromRepo,
  syncStatsFromRepo,
  computeStatsFromReadmes,
};
export type { FolderSettings, StatsCounts, LocalStats, RepoConfig, Difficulty };
