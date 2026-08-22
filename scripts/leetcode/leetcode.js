import { LeetCodeV1, LeetCodeV2 } from './versions.js';
import setupManualSubmitBtn from './submitBtn.js';
import {
  addLeadingZeros,
  buildProblemPath,
  convertToSlug,
  delay,
  DIFFICULTY,
  getBrowser,
  getDifficulty,
  getTimestamp,
  getTodaysDate,
  isEmptyObject,
  LeetHubError,
  parseCustomCommitMessage,
  pushStatsToRepo,
} from './util.js';
import { appendProblemToReadme, sortTopicsInReadme } from './readmeTopics.js';

/* Commit messages */
const readmeMsg = 'Create README - LeetHub';
const updateReadmeMsg = 'Update README - Topic Tags';
const discussionMsg = 'Prepend discussion post - LeetHub';
const createNotesMsg = 'Attach NOTES - LeetHub';
const solutionPostFallbackMsg = 'Add solution post - LeetHub';
const defaultRepoReadme =
  'A collection of LeetCode questions to ace the coding interview! - Created using [LeetHub v2](https://github.com/arunbhardwaj/LeetHub-2.0)';
const readmeFilename = 'README.md';

// problem types
const NORMAL_PROBLEM = 0;
const EXPLORE_SECTION_PROBLEM = 1;

const WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS = 500;

const api = getBrowser();

/**
 * Constructs a file path by appending the given filename to the problem directory.
 * If no filename is provided, it returns the problem name as the path.
 *
 * @param {string} problem - The base problem directory or the entire file path if no filename is provided.
 * @param {string} [filename] - Optional parameter for the filename to be appended to the problem directory.
 * @returns {string} - Returns a string representing the complete file path, either with or without the appended filename.
 */
const getPath = (problem, filename) => {
  return filename ? `${problem}/${filename}` : problem;
};

// https://web.archive.org/web/20190623091645/https://monsur.hossa.in/2012/07/20/utf-8-in-javascript.html
// In order to preserve mutation of the data, we have to encode it, which is usually done in base64.
// But btoa only accepts ASCII 7 bit chars (0-127) while Javascript uses 16-bit minimum chars (0-65535).
// EncodeURIComponent converts the Unicode Points UTF-8 bits to hex UTF-8.
// Unescape converts percent-encoded hex values into regular ASCII (optional; it shrinks string size).
// btoa converts ASCII to base64.
/** Decodes a base64 encoded string into UTF-8 format using URI encoding.*/
const decode = data => decodeURIComponent(escape(atob(data)));
/** Encodes a given string into base64 format.*/
const encode = data => btoa(unescape(encodeURIComponent(data)));

/**
 * Uploads content to a specified GitHub repository and updates local stats with the sha of the updated file.
 * @async
 * @param {string} token - The authentication token used to authorize the request.
 * @param {string} hook - The owner and repository name in the format 'owner/repo'.
 * @param {string} content - The content to be uploaded, typically a string encoded in base64.
 * @param {string} problem - The problem slug, which is a combination of problem ID and name, and acts as a folder.
 * @param {string} filename - The name of the file, typically the problem slug + file extension.
 * @param {string} sha - The SHA of the existing file.
 * @param {string} message - A commit message describing the change.
 * @param {string} [difficulty] - The difficulty level of the problem.
 *
 * @returns {Promise<string>} - A promise that resolves with the new SHA of the content after successful upload.
 *
 * @throws {LeetHubError} - Throws an error if the response is not OK (e.g., HTTP status code is not `200-299`).
 */
const upload = async (token, hook, content, problem, filename, sha, message) => {
  const path = getPath(problem, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  let data = {
    message,
    content,
    sha,
  };

  let options = {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(data),
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new LeetHubError(res.status, { cause: res });
  }
  console.log(`Successfully committed ${getPath(problem, filename)} to github`);

  const body = await res.json();
  //TODO: Think, should we be setting stats state here?
  const stats = await getAndInitializeStats(problem);
  stats.shas[problem][filename] = body.content.sha;
  api.storage.local.set({ stats });

  return body.content.sha;
};

// Returns stats object. If it didn't exist, initializes stats with default difficulty values and initializes the sha object for problem
const getAndInitializeStats = problem => {
  return api.storage.local.get('stats').then(({ stats }) => {
    if (stats == null || isEmptyObject(stats)) {
      stats = {};
      stats.shas = {};
      stats.solved = 0;
      stats.easy = 0;
      stats.medium = 0;
      stats.hard = 0;
    }

    if (stats.shas[problem] == null) {
      stats.shas[problem] = {};
    }

    return stats;
  });
};

/**
 * Increment the statistics for a given problem based on its difficulty.
 * @param {DIFFICULTY} difficulty - The difficulty level of the problem, which can be `easy`, `medium`, or `hard`.
 * @param {string} problem - The slug problem name, e.g. `0001-two-sum`
 * @returns {Promise<Object>} A promise that resolves to the updated statistics object.
 */
const incrementStats = (difficulty, problem) => {
  const diff = getDifficulty(difficulty);
  return api.storage.local.get('stats').then(({ stats }) => {
    stats.solved += 1;
    stats.easy += diff === DIFFICULTY.EASY ? 1 : 0;
    stats.medium += diff === DIFFICULTY.MEDIUM ? 1 : 0;
    stats.hard += diff === DIFFICULTY.HARD ? 1 : 0;
    stats.shas[problem].difficulty = diff.toLowerCase();
    api.storage.local.set({ stats });
    return stats;
  });
};

const isCompleted = problemName => {
  return api.storage.local.get('stats').then(data => {
    if (data?.stats?.shas?.[problemName] == null) return false;

    for (let file of Object.keys(data?.stats?.shas?.[problemName])) {
      if (file.includes(problemName)) return true;
    }

    return false;
  });
};

/* Discussion posts prepended at top of README */
/* Future implementations may require appending to bottom of file */
const updateReadmeWithDiscussionPost = async (
  addition,
  directory,
  filename,
  commitMsg,
  shouldPreprendDiscussionPosts
) => {
  let responseSHA;
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

/**
 * Wrapper func to upload code to a specific GitHub repository and handle 409 errors (conflict)
 * @async
 * @function uploadGitWith409Retry
 * @param {string} code - The code content that needs to be uploaded.
 * @param {string} problemName - The name of the problem or file where the code is related to.
 * @param {string} filename - The target filename in the repository where the code will be stored.
 * @param {string} commitMsg - The commit message that describes the changes being made.
 * @param {Object} [optionals] - Optional parameters for updating stats
 * @param {string} optionals.sha - The SHA value of the existing content to be updated (optional).
 * @param {DIFFICULTY} optionals.difficulty - The difficulty level of the problem (optional).
 *
 * @returns {Promise<string>} A promise that resolves with the new SHA of the content after successful upload.
 *
 * @throws {LeetHubError} If there's no token defined, the mode type is not `commit`, or if no repository hook is defined.
 */
async function uploadGitWith409Retry(code, problemName, filename, commitMsg, optionals) {
  let token;
  let hook;

  const storageData = await api.storage.local.get([
    'leethub_token',
    'mode_type',
    'leethub_hook',
    'stats',
  ]);

  token = storageData.leethub_token;
  if (!token) {
    throw new LeetHubError('LeethubTokenUndefined');
  }

  if (storageData.mode_type !== 'commit') {
    throw new LeetHubError('LeetHubNotAuthorizedByGit');
  }

  hook = storageData.leethub_hook;
  if (!hook) {
    throw new LeetHubError('NoRepoDefined');
  }

  /* Get SHA, if it exists */
  const sha = optionals?.sha
    ? optionals.sha
    : storageData.stats?.shas?.[problemName]?.[filename] !== undefined
    ? storageData.stats.shas[problemName][filename]
    : '';

  try {
    return await upload(
      token,
      hook,
      code,
      problemName,
      filename,
      sha,
      commitMsg,
      optionals?.difficulty
    );
  } catch (err) {
    if (err.message === '409') {
      const data = await getGitHubFile(token, hook, problemName, filename).then(res => res.json());
      return upload(
        token,
        hook,
        code,
        problemName,
        filename,
        data.sha,
        commitMsg,
        optionals?.difficulty
      );
    }
    throw err;
  }
}

/** Returns GitHub data for the file specified by `${directory}/${filename}` path
 * @async
 * @function getGitHubFile
 * @param {string} token - The personal access token for authentication with GitHub.
 * @param {string} hook - The owner and repository name in the format "owner/repository".
 * @param {string} directory - The directory within the repository where the file is located.
 * @param {string} filename - The name of the file to be fetched.
 * @returns {Promise<Response>} A promise that resolves with the response from the GitHub API request.
 * @throws {Error} Throws an error if the response is not OK (e.g., HTTP status code is not 200-299).
 */
async function getGitHubFile(token, hook, directory, filename) {
  const path = getPath(directory, filename);
  const URL = `https://api.github.com/repos/${hook}/contents/${path}`;

  let options = {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  };

  const res = await fetch(URL, options);
  if (!res.ok) {
    throw new Error(res.status);
  }

  return res;
}

/* Discussion Link - When a user makes a new post, the link is prepended to the README for that problem.*/
document.addEventListener('click', event => {
  const element = event.target;
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
        !Number.isNaN(window.location.pathname.charAt(oldPath.length))
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

function createRepoReadme() {
  const content = encode(defaultRepoReadme);
  return uploadGitWith409Retry(content, readmeFilename, '', readmeMsg);
}

async function updateReadmeTopicTagsWithProblem(topicTags, problemName, problemPath, difficulty) {
  if (topicTags == null) {
    console.log(new LeetHubError('TopicTagsNotFound'));
    return;
  }

  const { leethub_token, leethub_hook, stats } = await api.storage.local.get([
    'leethub_token',
    'leethub_hook',
    'stats',
  ]);

  let readme;
  let newSha;

  try {
    const { content, sha } = await getGitHubFile(
      leethub_token,
      leethub_hook,
      readmeFilename
    ).then(resp => resp.json());
    readme = content;
    stats.shas[readmeFilename] = { '': sha };
    await api.storage.local.set({ stats });
  } catch (err) {
    if (err.message === '404') {
      newSha = await createRepoReadme();
    }
    throw err;
  }
  readme = decode(readme);
  for (let topic of topicTags) {
    readme = appendProblemToReadme(
      topic.name,
      readme,
      leethub_hook,
      problemName,
      problemPath,
      difficulty
    );
  }
  readme = sortTopicsInReadme(readme);
  readme = encode(readme);

  return delay(
    () => uploadGitWith409Retry(readme, readmeFilename, '', updateReadmeMsg, { sha: newSha }),
    WAIT_FOR_GITHUB_API_TO_NOT_THROW_409_MS
  );
}

/** Returns the custom commit message template with {vars} substituted, or null if none is set. */
const getCustomCommitMessage = async problemContext => {
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
async function questionSlugToProblemName(questionSlug) {
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
async function getLastCommitMessage(problemName) {
  const { leethub_token, leethub_hook } = await api.storage.local.get([
    'leethub_token',
    'leethub_hook',
  ]);
  if (!leethub_token || !leethub_hook) return solutionPostFallbackMsg;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${leethub_hook}/commits?path=${problemName}&per_page=10`,
      {
        headers: {
          Authorization: `token ${leethub_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
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
async function handleSolutionPost(questionSlug, content, title) {
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
  const { questionSlug, content, title } = event.detail;
  handleSolutionPost(questionSlug, content, title);
});

/**
 * @param {LeetCodeV1 | LeetCodeV2} leetCode
 * @param {string} [suffix] - optional versioning suffix from the manual Push button's
 *   right-click prompt, e.g. "-bfs" - keeps multiple solution files per problem.
 */
function loader(leetCode, suffix) {
  let iterations = 0;
  const intervalId = setInterval(async () => {
    try {
      const isSuccessfulSubmission = leetCode.getSuccessStateAndUpdate();
      if (!isSuccessfulSubmission) {
        iterations++;
        if (iterations > 9) {
          // poll for max 10 attempts (10 seconds)
          throw new LeetHubError('Could not find successful submission after 10 seconds.');
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
      const problemPath = buildProblemPath(problemName, leetCode.difficulty, languageName, {
        folderDifficulty: !!leethub_use_difficulty_folder,
        folderLanguage: !!leethub_use_language_folder,
      });
      const suffixPart = suffix || '';
      const filename = leethub_use_timestamp_filename
        ? `${problemName}${suffixPart}-${getTimestamp()}${language}`
        : `${problemName}${suffixPart}${language}`;

      const alreadyCompleted = await isCompleted(problemPath);

      /* Upload README - write-once: matches 3.0's real behavior, not overwritten on repeat
         submissions to the same problem. */
      const uploadReadMe = await api.storage.local.get('stats').then(({ stats }) => {
        const shaExists = stats?.shas?.[problemPath]?.[readmeFilename] !== undefined;

        if (!shaExists) {
          return uploadGitWith409Retry(
            encode(probStatement),
            problemPath,
            readmeFilename,
            readmeMsg
          );
        }
      });

      /* Upload Notes if any*/
      const notes = leetCode.getNotesIfAny();
      let uploadNotes;
      if (notes != undefined && notes.length > 0) {
        uploadNotes = uploadGitWith409Retry(encode(notes), problemPath, 'NOTES.md', createNotesMsg);
      }

      /* Commit message: 3.0's real template variables (not decisions.md's older paraphrase). */
      const code = leetCode.findCode(probStats);
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
        // full recompute (see pushStatsToRepo in util.js).
        incrementStats(leetCode.difficulty, problemPath).then(pushStatsToRepo);
      }
    } catch (err) {
      leetCode.markUploadFailed();
      clearInterval(intervalId);

      if (!(err instanceof LeetHubError)) {
        console.error(err);
        return;
      }
    }
  }, 1000);
}

/**
 * Auto-push, matching 3.0's real mechanism: passively observe the submission network
 * response (via the MAIN-world interceptor, see interceptor.js) instead of hooking the
 * Submit button's click handler. No manual click required, and it fires the same way
 * regardless of whether the user clicked Submit or used the keyboard shortcut.
 * @param {LeetCodeV2} leetCode
 */
function listenForAutoSubmit(leetCode) {
  window.addEventListener('leetHubSubmissionId', event => {
    leetCode.submissionId = event.detail.submissionId;
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

/* Sync to local storage */
api.storage.local.get('isSync', data => {
  const keys = [
    'leethub_token',
    'leethub_username',
    'pipe_leethub',
    'stats',
    'leethub_hook',
    'mode_type',
  ];
  if (!data || !data.isSync) {
    keys.forEach(key => {
      api.storage.sync.get(key, data => {
        api.storage.local.set({ [key]: data[key] });
      });
    });
    api.storage.local.set({ isSync: true }, () => {
      console.log('LeetHub Synced to local values');
    });
  } else {
    console.log('LeetHub Local storage already synced!');
  }
});

class LeetHubNetworkError extends LeetHubError {
  constructor(response) {
    super(response.statusText);
    this.status = response.status;
  }
}
