# Notes for AMO reviewers - Better LeetHub

Paste the relevant parts of this file into the "Notes for reviewers" field when
submitting to addons.mozilla.org. Keep it in sync with the code.

## What the add-on does

When you pass every test case on a LeetCode problem, the add-on commits that
solution (code, problem statement, difficulty, topic tags, runtime/memory
stats, any notes) to a GitHub repository you own, using a GitHub Personal
Access Token you provide. It also maintains a `README.md` index, a `stats.json`
counter, and a `config.json` of your settings in that same repo. Personal
open-source project; no backend.

## Build instructions (source submission)

The submitted XPI is produced from the tagged source, no manual editing.

- Toolchain: Node.js (built and tested with 24.18.0; >=18 is fine), pnpm
  (built with 11.21.0).
- Steps, from the repo root:
  ```
  pnpm install --frozen-lockfile
  pnpm run build
  ```
- Output: `dist/firefox/` is the unpacked add-on. `dist/firefox/manifest.json`
  is generated from `manifest-firefox.json` with the version string filled in
  from `package.json`.
- `webpack.config.js` sets `optimization.minimize: false`. The JavaScript in
  `dist/` is TypeScript compiled to readable ES2022, not minified and not
  obfuscated. It corresponds line-for-line to `scripts/**/*.ts` in the source.
- Tests: `pnpm test` (Jasmine, 67 specs).

## Bundled third-party code

- **jQuery 3.3.1** - `scripts/jquery-3.3.1.min.js`, stock and unmodified,
  raw-copied into the build (not processed by webpack). Used for DOM queries
  and AJAX in the content script and popup. (Known item: this version is old
  and is slated to be bumped.)
- Runtime `dependencies` in `package.json` are build-time only (webpack, loaders,
  eslint, jasmine). None ship in the add-on.
- No other vendored or bundled libraries.

## MAIN-world script: `scripts/interceptor.js`

This is the one part that runs in the LeetCode page's own JavaScript context
(Chrome: `content_scripts` entry with `"world": "MAIN"`; Firefox:
`scripts/interceptorLoader.js` runs in the isolated world at `document_start`
and appends a `<script src="` + `runtime.getURL('scripts/interceptor.js')` + `">`
tag, so the file itself stays byte-identical between the two builds).

Why it needs page context: an isolated-world content script cannot see the
page's own `fetch` / `XMLHttpRequest` traffic. The add-on's auto-commit trigger
is passive observation of two of the page's own requests:

1. the `/problems/.../submit/` response, to know a submission passed (works for
   keyboard-submit, no click handler needed);
2. the `ugcArticlePublishSolution` GraphQL mutation, to know the user published
   a "Solution" writeup.

What it does: wraps `window.fetch` and `XMLHttpRequest.prototype.open/send`,
reads the response/request body for those two request shapes, extracts a small
set of fields (submission id; or question slug + article content + title), and
re-dispatches them as `window` `CustomEvent`s (`leetHubSubmissionId`,
`leetHubSolutionPost`) that the isolated-world content script listens for.

What it does not do: no remote code, no `eval`, no `new Function`, no dynamic
script insertion, no network requests of its own. It adds nothing to the page
beyond the two wrappers and the event dispatch. The whole file is ~75 lines,
unminified, reviewable at `scripts/interceptor.js`.

## Network activity

Every network request the add-on makes goes to exactly one of:

- `https://api.github.com/*` - reads the repo tree and commits files. Carries
  an `Authorization: token <the user's PAT>` header.
- `https://leetcode.com/graphql/` and the LeetCode submission page - reads the
  signed-in user's own submission data. Carries the user's existing LeetCode
  session cookie (same-origin, LeetCode's own auth).

There is no analytics, no telemetry, no error-reporting SDK, and no
update-check ping. The two UI webfonts (Manrope, JetBrains Mono) are bundled as
`.woff2` files under `css/fonts/` and are not fetched from any host. (A pre-1.x
version loaded them from Google Fonts; the current version does not.)

## Permissions

- `permissions`: `["storage"]` only.
- No `host_permissions`. GitHub API calls are ordinary CORS `fetch` requests
  (`api.github.com` returns permissive CORS headers).
- No `tabs`, no `<all_urls>`, no `webRequest`, no `cookies`.
- Content scripts match `https://leetcode.com/*` only.
- `web_accessible_resources`: `scripts/interceptor.js`, exposed to
  `https://leetcode.com/*` only.
- `content_security_policy.extension_pages`: `script-src 'self'; object-src
  'self'`.

## Token / data handling

- The GitHub PAT is entered by the user on the setup page (`welcome.html`, a
  masked field). The setup instructions tell the user to create a fine-grained
  token scoped to the single sync repo with `Contents: Read and write` +
  `Metadata: Read`.
- It is stored with `storage.local` only, never `storage.sync`.
- It is attached only as an `Authorization` header to `api.github.com`. It is
  never written to the console, never put in an error message, never shown in
  the UI, and never sent to any other host.
- Full data-flow writeup: `PRIVACY.md` in the repo root.

## Source

- Repository: https://github.com/vpk-11/better-leethub
- Submitted build corresponds to tag `vX.Y.Z` (commit `________`) - fill in at
  submission time.
