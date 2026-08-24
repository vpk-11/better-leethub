<!-- version: v3.0.0 -->
![Version](https://img.shields.io/badge/version-v3.0.0-blue)

<h1 align="center">
  <img src="assets/octocode.png" alt="LeetHub - Automatically sync your code to GitHub." width="400">
  <br>
  LeetHub - Automatically sync your code to GitHub.
  <br>
  <br>
</h1>

<p align="center">
  <a href="https://github.com/vpk-11/LeetHub/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"/>
  </a>
</p>

## What is LeetHub?

<p>A browser extension for Chrome and Firefox that automatically pushes your code to GitHub when you pass all tests on a <a href="https://leetcode.com/">LeetCode</a> problem. Fast, reliable, and equipped with PAT authentication and custom settings support.</p>

## Why LeetHub?

<p><strong>1.</strong> Recruiters want to see your contributions to the engineering community on GitHub. LeetHub makes it seamless and automatic to track your algorithmic practice and problem-solving progress on GitHub.</p>

<p><strong>2.</strong> Manually committing code from LeetCode to GitHub is time-consuming. LeetHub automates the entire process instantly without spending a single extra second.</p>

## Features

- **GitHub Personal Access Token (PAT) Authentication**: Secure, fine-grained PAT access without third-party OAuth apps.
- **Fast Git Trees API Sync**: Instant stats checking and background file provisioning.
- **Customizable Structure**: Toggle difficulty folders, language folders, timestamp filenames, and solution-post auto-commits.
- **Custom Commit Messages**: Customize your commit message templates with dynamic variables (`{date}`, `{problemName}`, `{problemTopic}`, `{difficulty}`, `{language}`).

## How does LeetHub work?

<ol>
  <li>After installing the extension, open LeetHub.</li>
  <li>Enter your GitHub Personal Access Token (PAT) and your target repository name.</li>
  <li>Click <strong>Connect Repository</strong>.</li>
  <li>Start LeetCoding! Your submissions are automatically synced directly to your repository.</li>
</ol>

## How to set up LeetHub for local development

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/vpk-11/LeetHub.git
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

LeetHub builds on two upstream projects:

- [arunbhardwaj/LeetHub-2.0](https://github.com/arunbhardwaj/LeetHub-2.0) - the base codebase this fork's infrastructure (build system, dual Chrome/Firefox manifests) is built on.
- [raphaelheinz/LeetHub-3.0](https://github.com/raphaelheinz/LeetHub-3.0) - the source for this fork's feature/scraper layer (folder structure, commit templating, submission detection).

## Changelog
- **v3.0.0** (2026-08-24) — major bump

<!-- Auto-updated by .github/workflows/version_bump.yml on every push/merge to main. -->
