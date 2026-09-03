# Better LeetHub - Automatically syncs your solved problems to GitHub.
<!-- version: v5.1.0 -->
![Version](https://img.shields.io/badge/version-v5.1.0-blue)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/vpk-11/better-leethub/blob/main/LICENSE)

<div align="center">
<img src="assets/octocode.png" alt="Better LeetHub - Automatically syncs your solved problems to GitHub." width="400">
</div>

## What is Better LeetHub?

<p>A browser extension for Chrome and Firefox that automatically pushes your code to GitHub when you pass all tests on a <a href="https://leetcode.com/">LeetCode</a> problem. Fast, reliable, and equipped with PAT authentication and custom settings support.</p>

## Why Better LeetHub?

<p><strong>1.</strong> Recruiters want to see your contributions to the engineering community on GitHub. Better LeetHub makes it seamless and automatic to track your algorithmic practice and problem-solving progress on GitHub.</p>

<p><strong>2.</strong> Manually committing code from LeetCode to GitHub is time-consuming. Better LeetHub automates the entire process instantly without spending a single extra second.</p>

## Privacy & security

Better LeetHub has no backend. Many "sync to GitHub" extensions route your traffic through a shared OAuth app or the developer's own server. This one does not:

- **You hold your own GitHub token.** You generate a fine-grained Personal Access Token scoped to a single repo and paste it in. It is stored in your browser's local extension storage, sent only as an authorization header to `api.github.com`, never sent to LeetCode or any other host, and never logged. No shared OAuth app.
- **Your data routes only to GitHub and LeetCode.** Your submission code, credentials, problem data, solved-problem counts, and settings go directly from your browser to `api.github.com` or `leetcode.com` and nowhere else. No third-party server sits in between.
- **The developer runs no server and receives nothing.** No analytics, no telemetry, no error reporting, no update pings. There is nothing on the developer's side to collect anything.
- **One third-party request, disclosed:** the popup and the setup page load webfonts from Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). That request tells Google your IP address, the request time, and your browser's User-Agent, the same as any site you load a font from. It carries none of your data: no code, no token, no repo contents, no stats, no account identifiers.
- **Verify it yourself.** The extension is open source. Every network call is in [`scripts/`](scripts/), or watch your browser's DevTools Network tab while it runs.

Full detail, including the honest limits of local token storage: [PRIVACY.md](PRIVACY.md).

## Features

- **GitHub Personal Access Token (PAT) Authentication**: Secure, fine-grained PAT access without third-party OAuth apps.
- **Fast Git Trees API Sync**: Instant stats checking and background file provisioning.
- **Customizable Structure**: Toggle difficulty folders, language folders, timestamp filenames, and solution-post auto-commits.
- **Custom Commit Messages**: Customize your commit message templates with dynamic variables (`{date}`, `{problemName}`, `{problemTopic}`, `{difficulty}`, `{language}`).

## How does Better LeetHub work?

<ol>
  <li>After installing the extension, open Better LeetHub.</li>
  <li>Enter your GitHub Personal Access Token (PAT) and your target repository name.</li>
  <li>Click <strong>Connect Repository</strong>.</li>
  <li>Start LeetCoding! Your submissions are automatically synced directly to your repository.</li>
</ol>

## Features & Settings

Every setting below lives in the toolbar popup (click the extension icon) and is mirrored to `config.json` in your linked repo, so it carries over if you use Better LeetHub from more than one browser or profile.

**Folder structure.** Two independent toggles: difficulty folder and language folder. Everything always lands under a top-level `LeetCode/` folder. With both toggles on, language wins as the outer folder and difficulty nests inside it - e.g. `LeetCode/Python3/Easy/0001-two-sum`. With only difficulty on: `LeetCode/Easy/0001-two-sum`. With both off: `LeetCode/0001-two-sum`.

**Commit message templating.** By default the commit message is Better LeetHub's runtime/memory stats line. Turn on a custom template and write your own, using any of these variables: `{date}`, `{problemName}`, `{problemTopic}`, `{difficulty}`, `{language}`, `{time}`, `{space}`. Example: `{date} - {problemName} - {problemTopic} - {difficulty} - {language}`.

**Solution-post auto-push.** On by default. When you publish a "Solution" writeup on LeetCode, Better LeetHub picks it up automatically and commits it as `Solution.md` alongside that problem's code. Turn it off under "Auto-Commit Solution Posts" in the popup if you don't want that.

**Archive and reset.** Found on the "Get Started" (`welcome.html`) screen once a repo is linked. Moves your current `LeetCode/` folder, `stats.json`, and `README.md` into a single dated `Archive/{date}/` folder, then starts a fresh `stats.json` (all zeros) and a fresh scaffolded `README.md` at the root. Nothing is deleted - it's a move, not a wipe - and `config.json` (your settings) is left untouched. Useful for starting a clean slate (e.g. a new job search cycle) without losing the old history.

**Manual sync buttons.** Also on the "Get Started" screen: **Sync Config** re-pulls `config.json` from the repo (use it if settings changed from another browser/profile and haven't shown up here yet), and **Sync Stats** forces a full recount of solved problems straight from your repo's README files (use it if the displayed count drifts from reality, e.g. after editing files directly on GitHub).

## How to set up Better LeetHub for local development

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/vpk-11/better-leethub.git
   ```
2. Install developer dependencies:
   ```bash
   pnpm run setup
   ```
3. Build the extension:
   ```bash
   pnpm run build
   ```
4. Load the unpacked extension:
   - **Chrome**: Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `./dist/chrome`.
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select `./dist/firefox/manifest.json`.

### pnpm Commands

```bash
pnpm test              # Run Jasmine test suite
pnpm run build         # Build production bundles for Chrome and Firefox
pnpm run dev           # Build with watch mode enabled
pnpm run format        # Auto-format codebase using Prettier
```

## Credits

Better LeetHub builds on two upstream projects:

- [arunbhardwaj/LeetHub-2.0](https://github.com/arunbhardwaj/LeetHub-2.0) - the base codebase this fork's infrastructure (build system, dual Chrome/Firefox manifests) is built on.
- [raphaelheinz/LeetHub-3.0](https://github.com/raphaelheinz/LeetHub-3.0) - the source for this fork's feature/scraper layer (folder structure, commit templating, submission detection).

## Changelog
- **v5.0.0** (2026-08-28) — major bump
- **v4.0.0** (2026-08-25) — major bump
- **v3.0.0** (2026-08-24) — major bump

<!-- Auto-updated by .github/workflows/version_bump.yml on every push/merge to main. -->
