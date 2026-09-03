# Privacy Policy - Better LeetHub

_Last updated: 2026-09-03_

Better LeetHub is a browser extension for Chrome and Firefox that commits your
solved LeetCode problems to a GitHub repository you own. This document describes
exactly what data the extension touches, where that data goes, and what it does
not do. It is written in plain language for a personal open-source project. It is
not a lawyer-reviewed document.

Every statement below reflects the actual behavior of the source code in this
repository and can be verified against it. See "What you can verify yourself" at
the end.

## Short version

- The extension talks to two places only: **GitHub** (`api.github.com`,
  `github.com`) and **LeetCode** (`leetcode.com`). Both connections go directly
  from your browser.
- **No submission data, credentials, or personal data ever leaves your browser
  except to GitHub and LeetCode.** The extension makes no other network request
  of any kind: no third-party hosts, no fonts or assets fetched at runtime
  (they ship inside the extension).
- The developer operates **no server**. There is no analytics, no telemetry, no
  error reporting, and no update-check ping. There is nothing on the developer's
  side to receive your data.
- Your GitHub Personal Access Token (PAT) is stored **only in your browser's
  local extension storage**, is sent **only** to `api.github.com` as an
  authorization header, and is **never logged**.

## What data the extension touches

**LeetCode submission data.** When you pass all tests on a problem, the extension
reads that submission: the code you wrote, the problem statement, difficulty,
topic tags, runtime/memory statistics, any notes you attached, and - if you
publish one - your "Solution" writeup. This is read from LeetCode's own GraphQL
API (`leetcode.com/graphql/`) and from the submission page itself.

**Your GitHub Personal Access Token.** You generate a fine-grained PAT and paste
it into the setup screen. The setup screen asks you to scope it to a single repo
with only `Contents: Read and write` and `Metadata: Read` permissions.

**Your linked repository's contents.** The extension reads and writes files in
the one GitHub repo you link (problem folders, `README.md`, `stats.json`,
`config.json`).

**Local extension state.** The following keys are stored in your browser's local
extension storage:

| Key | What it is |
| --- | --- |
| `leethub_token` | Your GitHub PAT |
| `leethub_username` | Your GitHub login name |
| `leethub_hook` | The `owner/repo` string of your linked repo |
| `repo` | The web URL of your linked repo |
| `mode_type` | Whether a repo is currently linked |
| `stats` | Solved-problem counts plus a local cache of file identifiers |
| `leethub_theme` | Your light/dark theme choice |
| `leethub_use_difficulty_folder` | Folder-structure setting |
| `leethub_use_language_folder` | Folder-structure setting |
| `leethub_use_timestamp_filename` | Filename setting |
| `leethub_auto_commit_solution_post` | Solution-post auto-commit setting |
| `leethub_custom_commit_message` | Your commit-message template |

This is stored with `storage.local` (local to your browser profile on your
device), never `storage.sync`. The extension applies no additional encryption of
its own; the token is stored as-is.

## Where each piece of data goes

**Submission code and metadata** are committed to the GitHub repo you linked, via
`api.github.com`. They go nowhere else. The "Solution" writeup, if you publish
one, is committed as `Solution.md` in the same repo, the same way.

**Your GitHub PAT** is attached only as an `Authorization: token <PAT>` header on
requests to `api.github.com`. It is never sent to LeetCode and never sent to any
other server. It is never written to
the browser console, never included in an error message, and never displayed in
the UI (the setup screen keeps it in a masked password field). If GitHub rejects
the token (expired, revoked, or scope changed), the next time you open the popup
the extension detects the 401 response, clears the stored token automatically,
and returns you to the connect screen. Until then, the auto-push and setup-page
flows simply fail their GitHub calls; they do not clear the token on their own.

**Your linked repo's contents** move between your browser and `api.github.com`
only.

**Your settings.** The five folder / filename / commit-message / solution-post
settings are mirrored to `config.json` in your linked repo, so they carry across
browsers or profiles that link the same repo. Your solved-problem counts
(`easy`, `medium`, `hard`) are mirrored to `stats.json` in that same repo. The
theme choice, the local file-identifier cache, your GitHub username, and the
`owner/repo` string are **not transmitted anywhere** - they stay in local
storage.

**Your LeetCode session cookie.** To read your own submissions, the extension's
requests to `leetcode.com/graphql/` include your existing LeetCode session
cookie. This is sent back to LeetCode's own domain only - it is how LeetCode
authorizes you to read your own data. It is not sent anywhere else.

## No third-party requests

The popup and the setup page use two webfonts (Manrope and JetBrains Mono).
Those font files are **bundled inside the extension** (`css/fonts/`) and loaded
from local extension storage. Nothing is fetched from Google Fonts or any other
third-party host at runtime. The extension has no CDN dependency, no remote
script, no remote stylesheet, and no remote image.

## What the developer collects: nothing

There is no Better LeetHub server. The extension contains no analytics SDK, no
telemetry, no crash/error reporting service, and no "check for updates" call.
Every network request it makes is to `api.github.com` or `leetcode.com`. The
developer has no way to receive your code, your statistics, your credentials, or
any record that you use the extension, because there is nothing on the
developer's side for the extension to talk to.

## The honest limit: your device

Your PAT lives in your browser profile's local storage on your own machine. If
your device itself is compromised - stolen, infected with malware, or accessible
to someone else while you are logged in - then local storage can be read, and
that is outside what a browser extension can protect against. Local storage
security is the responsibility of your browser and operating system, not
something this extension can add a layer on top of.

Two things reduce the impact if that happens:

- Use a **fine-grained PAT scoped to the single repo** you sync to, with only
  `Contents: Read and write` and `Metadata: Read`, as the setup screen instructs.
  A leaked token of that shape can touch that one repository and nothing else on
  your GitHub account.
- You can **revoke the token at GitHub** at any time. The next time you open the
  extension popup, it detects that GitHub is rejecting the token and clears it
  from storage. Removing the extension clears it immediately.

Note the difference between **Logout** (in the extension's settings) and
**revocation** (at GitHub). Logout clears the token and repo link from this
browser's local storage only - it does **not** tell GitHub anything, so a token
that was copied elsewhere before you logged out still works until you revoke it
at GitHub. If you think the token may have been exposed, revoke it at GitHub;
logging out of the extension is not a substitute for that.

## What you can verify yourself

Better LeetHub is open source: <https://github.com/vpk-11/better-leethub>

- **Read the code.** Every network request the extension makes is in these files:
  `scripts/leetcode/util.ts`, `scripts/leetcode/leetcode.ts`,
  `scripts/leetcode/versions.ts`, `scripts/popup.ts`, `scripts/welcome.ts`, and
  `scripts/interceptor.js`. Every one targets `api.github.com` or
  `leetcode.com/graphql/`.
- **Watch it run.** Open your browser's developer tools, go to the Network tab,
  and use the extension. Every request will be to `api.github.com` or
  `leetcode.com`. Nothing else.
- **Check the permissions.** The extension requests only the `storage` permission
  and runs its content script only on `https://leetcode.com/*`.

## Scope

This policy describes the extension's own behavior. Your data once it is in your
GitHub repository is governed by
[GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement);
your LeetCode account and submissions are governed by LeetCode's own policies.

## Changes

If the extension's data behavior changes, this file changes with it in the same
repository, with the date at the top updated.
