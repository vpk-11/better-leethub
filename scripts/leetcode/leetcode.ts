import { LeetCodeV1, LeetCodeV2 } from './versions.js';
import setupManualSubmitBtn from './submitBtn.js';
import {
  addLeadingZeros,
  buildProblemPath,
  convertToSlug,
  DEFAULT_REPO_README,
  delay,
  DIFFICULTY,
  fetchRepoTree,
  getBrowser,
  getDifficulty,
  githubHeaders,
  getTimestamp,
  getTodaysDate,
  isEmptyObject,
  LeetHubError,
  parseCustomCommitMessage,
  problemDirInTree,
  pushStatsToRepo,
  slugFromPath,
} from './util.js';
import { appendProblemToReadme, sortTopicsInReadme } from './readmeTopics.js';
import type { StatsCounts } from './util.js';

/* Commit messages */
const readmeMsg = 'Create README - LeetHub';
const updateReadmeMsg = 'Update README - Topic Tags';
const discussionMsg = 'Prepend discussion post - LeetHub';
const createNotesMsg = 'Attach NOTES - LeetHub';
const solutionPostFallbackMsg = 'Add solution post - LeetHub';
const readmeFilename = 'README.md';

const WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS = 500;
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 10;

/** Per-problem SHA cache, keyed by filename - `difficulty` is also stored alongside the
 * filename keys (see incrementStats) so it isn't a pure filename->sha map, hence the loose
 * string value type. */
type ProblemShas = Record<string, string>;

/** Local storage.stats - the running totals plus the upload-dedup SHA cache. */
interface Stats extends StatsCounts {
  solved: number;
  shas: Record<string, ProblemShas>;
}

/** Default (empty) stats shape - used whenever local storage has no `stats` yet. */
const DEFAULT_STATS = (): Stats => ({ solved: 0, easy: 0, medium: 0, hard: 0, shas: {} });

/** Wraps a failed GitHub API `Response`, carrying its numeric `status` alongside the
 * message - lets callers branch on `err.status` instead of string-matching `err.message`. */
class LeetHubNetworkError extends LeetHubError {
  status: number;
  statusText: string;

  constructor(response: Response) {
    super(String(response.status));
    this.status = response.status;
    this.statusText = response.statusText;
  }
}

const api = getBrowser();

/**
 * Constructs a file path by appending the given filename to the problem directory.
 * If no filename is provided, it returns the problem name as the path.
 *
 * @param problem - The base problem directory or the entire file path if no filename is provided.
 * @param filename - Optional parameter for the filename to be appended to the problem directory.
 * @returns Returns a string representing the complete file path, either with or without the appended filename.
 */
const getPath = (problem: string, filename?: string): string => {
  return filename ? `${problem}/${filename}` : problem;
};

// https://web.archive.org/web/20190623091645/https://monsur.hossa.in/2012/07/20/utf-8-in-javascript.html
// In order to preserve mutation of the data, we have to encode it, which is usually done in base64.
// But btoa only accepts ASCII 7 bit chars (0-127) while Javascript uses 16-bit minimum chars (0-65535).
// EncodeURIComponent converts the Unicode Points UTF-8 bits to hex UTF-8.
// Unescape converts percent-encoded hex values into regular ASCII (optional; it shrinks string size).
// btoa converts ASCII to base64.
/** Decodes a base64 encoded string into UTF-8 format using URI encoding.*/
const decode = (data: string): string => decodeURIComponent(escape(atob(data)));
/** Encodes a given string into base64 format.*/
const encode = (data: string): string => btoa(unescape(encodeURIComponent(data)));

/**
 * Uploads content to a specified GitHub repository and updates local stats with the sha of the updated file.
 * @param token - The authentication token used to authorize the request.
 * @param hook - The owner and repository name in the format 'owner/repo'.
 * @param content - The content to be uploaded, typically a string encoded in base64.
 * @param problem - The problem slug, which is a combination of problem ID and name, and acts as a folder.
 * @param filename - The name of the file, typically the problem slug + file extension.
 * @param sha - The SHA of the existing file.
 * @param message - A commit message describing the change.
 *
 * @returns A promise that resolves with the new SHA of the content after successful upload.
 *
 * @throws {LeetHubNetworkError} Throws an error if the response is not OK (e.g., HTTP status code is not `200-299`).
 */
const upload = async (
  token: string,
  hook: string,
  content: string,
  problem: string,
  filename: string,
  sha: string,
  message: string
): Promise<string> => {
  const path = getPath(problem, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  const data = {
    message,
    content,
    sha,
  };

  const options = {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify(data),
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new LeetHubNetworkError(res);
  }
  console.log(`Successfully committed ${getPath(problem, filename)} to github`);

  const body = await res.json();
  //TODO: Think, should we be setting stats state here?
  // stats.shas is keyed by the bare problem slug, not the folder path - the folder shape can
  // change (difficulty/language toggles) while the problem's identity does not.
  const slug = slugFromPath(problem);
  const stats = await getAndInitializeStats(slug);
  stats.shas[slug][filename] = body.content.sha;
  api.storage.local.set({ stats });

  return body.content.sha;
};

// Returns stats object. If it didn't exist, initializes stats with default difficulty values
// and initializes the sha sub-object for the given problem slug.
const getAndInitializeStats = (slug: string): Promise<Stats> => {
  return api.storage.local.get('stats').then(({ stats }) => {
    if (stats == null || isEmptyObject(stats)) {
      stats = DEFAULT_STATS();
    }

    if (stats.shas[slug] == null) {
      stats.shas[slug] = {};
    }

    return stats as Stats;
  });
};

/**
 * Increment the statistics for a given problem based on its difficulty.
 * @param difficulty - The difficulty level of the problem, which can be `easy`, `medium`, or `hard`.
 * @param slug - The bare problem slug, e.g. `0001-two-sum` (not the folder path).
 * @returns A promise that resolves to the updated statistics object.
 */
const incrementStats = (difficulty: string | undefined, slug: string): Promise<Stats> => {
  const diff = getDifficulty(difficulty ?? '');
  return api.storage.local.get('stats').then(({ stats }) => {
    if (!stats) {
      stats = DEFAULT_STATS();
    }
    stats.solved = (stats.solved || 0) + 1;
    stats.easy = (stats.easy || 0) + (diff === DIFFICULTY.EASY ? 1 : 0);
    stats.medium = (stats.medium || 0) + (diff === DIFFICULTY.MEDIUM ? 1 : 0);
    stats.hard = (stats.hard || 0) + (diff === DIFFICULTY.HARD ? 1 : 0);
    stats.shas = stats.shas || {};
    if (slug) {
      stats.shas[slug] = stats.shas[slug] || {};
      stats.shas[slug].difficulty = diff.toLowerCase();
    }
    api.storage.local.set({ stats });
    return stats as Stats;
  });
};

/**
 * The repo directory a previously-solved problem already occupies, or null if this slug
 * isn't in the repo yet. One git-tree scan (loader() runs once per submission, so this is
 * never inside a per-problem loop). Matches the slug under ANY folder shape - a
 * difficulty/language-prefixed path, a bare `LeetCode/<slug>` path, or a pre-fork file at
 * the repo root - with no separate fork-detection logic. The problem's identity is its
 * slug; the folder it happens to sit in is not, so this is what "already solved" keys on
 * now, never the constructed path.
 *
 * @param slug - bare problem slug, e.g. `0001-two-sum`
 */
const findExistingProblemDir = async (slug: string): Promise<string | null> => {
  const { leethub_hook, leethub_token } = await api.storage.local.get([
    'leethub_hook',
    'leethub_token',
  ]);
  if (!leethub_hook || !leethub_token || !slug) return null;
  const tree = await fetchRepoTree(leethub_hook, leethub_token);
  return problemDirInTree(tree, slug);
};

/* Discussion posts prepended at top of README */
/* Future implementations may require appending to bottom of file */
const updateReadmeWithDiscussionPost = async (
  addition: string,
  directory: string,
  filename: string,
  commitMsg: string,
  shouldPreprendDiscussionPosts: boolean
): Promise<string> => {
  let responseSHA: string;
  const { leethub_token, leethub_hook } = await api.storage.local.get([
    'leethub_token',
    'leethub_hook',
  ]);

  return getGitHubFile(leethub_token, leethub_hook, directory, filename)
    .then(resp => resp.json())
    .then(data => {
      responseSHA = data.sha;
      return decode(data.content);
    })
    .then(existingContent =>
      shouldPreprendDiscussionPosts ? encode(addition + existingContent) : encode(existingContent)
    )
    .then(newContent =>
      upload(leethub_token, leethub_hook, newContent, directory, filename, responseSHA, commitMsg)
    );
};

interface UploadOptionals {
  sha?: string;
  difficulty?: string;
}

/**
 * Wrapper func to upload code to a specific GitHub repository and handle 409 errors (conflict)
 * @param code - The code content that needs to be uploaded.
 * @param problemName - The name of the problem or file where the code is related to.
 * @param filename - The target filename in the repository where the code will be stored.
 * @param commitMsg - The commit message that describes the changes being made.
 * @param optionals - Optional parameters for updating stats.
 *
 * @returns A promise that resolves with the new SHA of the content after successful upload.
 *
 * @throws {LeetHubError} If there's no token defined, the mode type is not `commit`, or if no repository hook is defined.
 */
async function uploadGitWith409Retry(
  code: string,
  problemName: string,
  filename: string,
  commitMsg: string,
  optionals?: UploadOptionals
): Promise<string> {
  const storageData = await api.storage.local.get([
    'leethub_token',
    'mode_type',
    'leethub_hook',
    'stats',
  ]);

  const token = storageData.leethub_token;
  if (!token) {
    throw new LeetHubError('LeethubTokenUndefined');
  }

  if (storageData.mode_type !== 'commit') {
    throw new LeetHubError('LeetHubNotAuthorizedByGit');
  }

  const hook = storageData.leethub_hook;
  if (!hook) {
    throw new LeetHubError('NoRepoDefined');
  }

  /* Get SHA, if it exists. stats.shas is slug-keyed (problemName may be a folder path). */
  const cacheKey = slugFromPath(problemName);
  const sha = optionals?.sha
    ? optionals.sha
    : storageData.stats?.shas?.[cacheKey]?.[filename] !== undefined
      ? storageData.stats.shas[cacheKey][filename]
      : '';

  try {
    return await upload(token, hook, code, problemName, filename, sha, commitMsg);
  } catch (err) {
    if (err instanceof LeetHubNetworkError && err.status === 409) {
      const data = await getGitHubFile(token, hook, problemName, filename).then(res => res.json());
      return upload(token, hook, code, problemName, filename, data.sha, commitMsg);
    }
    throw err;
  }
}

/** Returns GitHub data for the file specified by `${directory}/${filename}` path
 * @param token - The personal access token for authentication with GitHub.
 * @param hook - The owner and repository name in the format "owner/repository".
 * @param directory - The directory within the repository where the file is located.
 * @param filename - The name of the file to be fetched.
 * @returns A promise that resolves with the response from the GitHub API request.
 * @throws Throws an error if the response is not OK (e.g., HTTP status code is not 200-299).
 */
async function getGitHubFile(
  token: string,
  hook: string,
  directory: string,
  filename?: string
): Promise<Response> {
  const path = getPath(directory, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  const options = {
    method: 'GET',
    headers: githubHeaders(token),
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new Error(String(res.status));
  }

  return res;
}

/* Discussion Link - When a user makes a new post, the link is prepended to the README for that problem.*/
document.addEventListener('click', event => {
  const element = event.target as HTMLElement | null;
  const oldPath = window.location.pathname;

  /* Act on Post button click */
  /* Complex since "New" button shares many of the same properties as "Post button */
  if (
    element &&
    (element.classList.contains('icon__3Su4') ||
      element.parentElement?.classList.contains('icon__3Su4') ||
      element.parentElement?.classList.contains('btn-content-container__214G') ||
      element.parentElement?.classList.contains('header-right__2UzF'))
  ) {
    setTimeout(function () {
      /* Only post if post button was clicked and url changed */
      if (
        oldPath !== window.location.pathname &&
        oldPath === window.location.pathname.substring(0, oldPath.length) &&
        !Number.isNaN(Number(window.location.pathname.charAt(oldPath.length)))
      ) {
        const date = new Date();
        const currentDate = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()} at ${date.getHours()}:${date.getMinutes()}`;
        const addition = `[Discussion Post (created on ${currentDate})](${window.location})  \n`;
        const problemName = window.location.pathname.split('/')[2]; // must be true.
        updateReadmeWithDiscussionPost(addition, problemName, readmeFilename, discussionMsg, true);
      }
    }, 1000);
  }
});

function createRepoReadme(): Promise<string> {
  const content = encode(DEFAULT_REPO_README);
  return uploadGitWith409Retry(content, readmeFilename, '', readmeMsg);
}

async function updateReadmeTopicTagsWithProblem(
  topicTags: { name: string }[] | undefined,
  problemName: string,
  problemPath: string,
  difficulty: string | undefined
): Promise<string | void> {
  if (topicTags == null) {
    console.log(new LeetHubError('TopicTagsNotFound'));
    return;
  }

  const { leethub_token, leethub_hook, stats } = await api.storage.local.get([
    'leethub_token',
    'leethub_hook',
    'stats',
  ]);

  let readme: string;
  let newSha: string | undefined;

  try {
    const { content, sha } = await getGitHubFile(leethub_token, leethub_hook, readmeFilename).then(
      resp => resp.json()
    );
    readme = content;
    stats.shas[readmeFilename] = { '': sha };
    await api.storage.local.set({ stats });
  } catch (err) {
    if (err instanceof Error && err.message === '404') {
      newSha = await createRepoReadme();
    }
    throw err;
  }
  readme = decode(readme);
  for (const topic of topicTags) {
    readme = appendProblemToReadme(
      topic.name,
      readme,
      leethub_hook,
      problemName,
      problemPath,
      difficulty ?? ''
    );
  }
  readme = sortTopicsInReadme(readme);
  const encodedReadme = encode(readme);

  return delay(
    () =>
      uploadGitWith409Retry(encodedReadme, readmeFilename, '', updateReadmeMsg, { sha: newSha }),
    WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS
  );
}

/** Returns the custom commit message template with {vars} substituted, or null if none is set. */
const getCustomCommitMessage = async (
  problemContext: Record<string, string | undefined>
): Promise<string | null> => {
  const { leethub_custom_commit_message } = await api.storage.local.get(
    'leethub_custom_commit_message'
  );
  if (!leethub_custom_commit_message || !leethub_custom_commit_message.trim()) {
    return null;
  }
  return parseCustomCommitMessage(leethub_custom_commit_message, problemContext);
};

/**
 * Resolves a LeetCode "Solution" writeup's questionSlug to this codebase's problemName slug
 * (e.g. "0001-two-sum"), via the same GraphQL question lookup 3.0 uses.
 */
async function questionSlugToProblemName(questionSlug: string): Promise<string> {
  const query = {
    query:
      'query questionDetail($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId titleSlug } }',
    variables: { titleSlug: questionSlug },
    operationName: 'questionDetail',
  };

  try {
    const res = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: { cookie: document.cookie, 'content-type': 'application/json' },
      body: JSON.stringify(query),
    }).then(r => r.json());

    const question = res?.data?.question;
    if (question) {
      return addLeadingZeros(`${question.questionFrontendId}-${question.titleSlug}`);
    }
  } catch (err) {
    console.log('LeetHub: failed to resolve question slug', err);
  }
  return addLeadingZeros(convertToSlug(questionSlug));
}

/**
 * Best-effort: reuses the last non-README/NOTES/solution-post commit message for this problem
 * so Solution.md's commit doesn't just say the generic fallback with no context. Matches 3.0's
 * real (already best-effort) behavior - it searches by the bare problem slug regardless of
 * folder settings, so a commit under a difficulty/language-prefixed path won't match and this
 * falls back to the default message. That's an existing 3.0 limitation, not something to fix
 * here.
 */
async function getLastCommitMessage(problemName: string): Promise<string> {
  const { leethub_token, leethub_hook } = await api.storage.local.get([
    'leethub_token',
    'leethub_hook',
  ]);
  if (!leethub_token || !leethub_hook) return solutionPostFallbackMsg;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${leethub_hook}/commits?path=${problemName}&per_page=10`,
      { headers: githubHeaders(leethub_token) }
    );
    if (res.ok) {
      const commits = await res.json();
      for (const commit of commits) {
        const message = commit.commit.message;
        if (
          /^(Create README|Attach NOTES|Prepend discussion post|Add solution post)/.test(message)
        ) {
          continue;
        }
        return message;
      }
    }
  } catch (err) {
    console.log('LeetHub: failed to look up last commit message', err);
  }
  return solutionPostFallbackMsg;
}

/**
 * Uploads a published LeetCode "Solution" writeup as Solution.md alongside the problem's code.
 * Fired by the MAIN-world interceptor (see interceptor.js) via the `leetHubSolutionPost` event,
 * since an isolated-world content script can't observe the page's own GraphQL mutation.
 */
async function handleSolutionPost(questionSlug: string, content: string, title: string) {
  const { leethub_auto_commit_solution_post = true } = await api.storage.local.get(
    'leethub_auto_commit_solution_post'
  );
  if (!leethub_auto_commit_solution_post) return;

  try {
    const problemName = await questionSlugToProblemName(questionSlug);
    const commitMsg = await getLastCommitMessage(problemName);
    const solutionContent = `# ${title}\n\n${content}`;
    await uploadGitWith409Retry(encode(solutionContent), problemName, 'Solution.md', commitMsg);
  } catch (err) {
    console.log('LeetHub: failed to upload solution post', err);
  }
}

window.addEventListener('leetHubSolutionPost', event => {
  const { questionSlug, content, title } = (event as CustomEvent).detail;
  handleSolutionPost(questionSlug, content, title);
});

/**
 * @param leetCode
 * @param suffix - optional versioning suffix from the manual Push button's
 *   right-click prompt, e.g. "-bfs" - keeps multiple solution files per problem.
 */
function loader(leetCode: LeetCodeV1 | LeetCodeV2, suffix?: string): void {
  let iterations = 0;
  const intervalId = setInterval(async () => {
    try {
      const isSuccessfulSubmission = leetCode.getSuccessStateAndUpdate();
      if (!isSuccessfulSubmission) {
        iterations++;
        if (iterations >= MAX_POLL_ATTEMPTS) {
          throw new LeetHubError(
            `Could not find successful submission after ${MAX_POLL_ATTEMPTS} seconds.`
          );
        }
        return;
      }
      leetCode.startSpinner();

      // If successful, stop polling
      clearInterval(intervalId);

      // For v2, query LeetCode API for submission results
      await leetCode.init();

      const probStats = leetCode.parseStats();
      if (!probStats) {
        throw new LeetHubError('SubmissionStatsNotFound');
      }

      const probStatement = leetCode.parseQuestion();
      if (!probStatement) {
        throw new LeetHubError('ProblemStatementNotFound');
      }

      const problemName = leetCode.getProblemNameSlug();
      const language = leetCode.getLanguageExtension();
      if (!language) {
        throw new LeetHubError('LanguageNotFound');
      }
      const languageName = leetCode.getLanguageName();
      if (!languageName) {
        throw new LeetHubError('LanguageNotFound');
      }

      /* Folder structure: 3.0's real fixed-precedence 2-toggle system, plus this fork's
         LeetCode/ top-level prefix (see buildProblemPath in util.js). languageName MUST come
         from the platform's own language field, never a reverse lookup through the extension
         table - multiple language names collide on the same extension. */
      const {
        leethub_use_difficulty_folder,
        leethub_use_language_folder,
        leethub_use_timestamp_filename,
      } = await api.storage.local.get([
        'leethub_use_difficulty_folder',
        'leethub_use_language_folder',
        'leethub_use_timestamp_filename',
      ]);
      const freshPath = buildProblemPath(problemName, leetCode.difficulty ?? '', languageName, {
        folderDifficulty: !!leethub_use_difficulty_folder,
        folderLanguage: !!leethub_use_language_folder,
      });
      const suffixPart = suffix || '';
      const filename = leethub_use_timestamp_filename
        ? `${problemName}${suffixPart}-${getTimestamp()}${language}`
        : `${problemName}${suffixPart}${language}`;

      /* Identity is the slug, not the path. If this problem is already in the repo (under
         any folder shape, including an older/other-fork layout), re-solving writes back to
         where it already lives and never re-counts it - so toggling a folder setting and
         re-syncing can't fork a duplicate under the new shape. A pre-fork bare-repo-root
         file (existingDir === '') is the one case left to the fresh path, so the re-solve
         lands in a proper LeetCode/ folder. */
      const existingDir = await findExistingProblemDir(problemName);
      const alreadyCompleted = existingDir !== null;
      const problemPath = existingDir ? existingDir : freshPath;

      /* Upload README - write-once: not overwritten on repeat submissions to the same
         problem (3.0's real behavior). */
      const uploadReadMe = alreadyCompleted
        ? undefined
        : uploadGitWith409Retry(encode(probStatement), problemPath, readmeFilename, readmeMsg);

      /* Upload Notes if any*/
      const notes = leetCode.getNotesIfAny();
      let uploadNotes;
      if (notes != undefined && notes.length > 0) {
        uploadNotes = uploadGitWith409Retry(encode(notes), problemPath, 'NOTES.md', createNotesMsg);
      }

      /* Commit message: 3.0's real template variables (not decisions.md's older paraphrase). */
      // findCode() is async for LeetCodeV1 (fetches the submission details page) and sync for
      // LeetCodeV2 - awaiting unconditionally is correct for both, and fixes a real bug this
      // migration's typing surfaced: the un-awaited call previously passed the V1 Promise
      // itself into encode() below, silently uploading a stringified Promise as the "code".
      const code = await leetCode.findCode(probStats);
      if (!code) {
        throw new LeetHubError('SolutionCodeNotFound');
      }
      const problemContext = {
        date: getTodaysDate(),
        problemName,
        problemTopic: leetCode.submissionData?.question?.topicTags?.[0]?.name ?? 'Unknown',
        difficulty: leetCode.difficulty,
        language: languageName,
        time: leetCode.submissionData?.runtimeDisplay ?? '',
        space: leetCode.submissionData?.memoryDisplay ?? '',
      };
      const commitMsg = (await getCustomCommitMessage(problemContext)) ?? probStats;

      /* Upload code to Git */
      const uploadCode = uploadGitWith409Retry(encode(code), problemPath, filename, commitMsg);

      /* Group problem into its relevant topics */
      const updateRepoReadMe = updateReadmeTopicTagsWithProblem(
        leetCode.submissionData?.question?.topicTags,
        problemName,
        problemPath,
        leetCode.difficulty
      );

      await Promise.all([uploadReadMe, uploadNotes, uploadCode, updateRepoReadMe]);

      leetCode.markUploaded();

      if (!alreadyCompleted) {
        // Keep stats.json as a running total instead of letting it drift until the next
        // full recompute (see pushStatsToRepo in util.js). Slug-keyed: a re-solve under a
        // different folder shape resolves to a non-null existingDir above and never gets
        // here.
        incrementStats(leetCode.difficulty, problemName).then(pushStatsToRepo);
      }
    } catch (err) {
      leetCode.markUploadFailed();
      clearInterval(intervalId);

      if (!(err instanceof LeetHubError)) {
        console.error(err);
        return;
      }
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Auto-push, matching 3.0's real mechanism: passively observe the submission network
 * response (via the MAIN-world interceptor, see interceptor.js) instead of hooking the
 * Submit button's click handler. No manual click required, and it fires the same way
 * regardless of whether the user clicked Submit or used the keyboard shortcut.
 */
function listenForAutoSubmit(leetCode: LeetCodeV2): void {
  window.addEventListener('leetHubSubmissionId', event => {
    leetCode.submissionId = (event as CustomEvent).detail.submissionId;
    loader(leetCode);
  });
}

// Use MutationObserver to determine when the submit button elements are loaded
const submitBtnObserver = new MutationObserver(function (_mutations, observer) {
  const v1SubmitBtn = document.querySelector('[data-cy="submit-code-btn"]');
  const v2SubmitBtn = document.querySelector('[data-e2e-locator="console-submit-button"]');
  const textareaList = document.getElementsByTagName('textarea');
  const textarea =
    textareaList.length === 4
      ? textareaList[2]
      : textareaList.length === 2
        ? textareaList[0]
        : textareaList[1];

  if (v1SubmitBtn) {
    observer.disconnect();

    const leetCode = new LeetCodeV1();
    v1SubmitBtn.addEventListener('click', () => loader(leetCode));
    return;
  }

  if (v2SubmitBtn && textarea) {
    observer.disconnect();

    const leetCode = new LeetCodeV2();
    listenForAutoSubmit(leetCode);
    setupManualSubmitBtn(leetCode, loader);
  }
});

submitBtnObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
