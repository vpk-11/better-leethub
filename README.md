<h1 align="center">
  <img src="assets/octocode.png" alt="LeetHub - Automatically sync your code to GitHub." width="400">
  <br>
  LeetHub - Automatically sync your code to GitHub.
  <br>
  <br>
</h1>

<p align="center">
  <a href="https://github.com/vpk-11/LeetHub-2.0/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"/>
  </a>
</p>

## What is LeetHub?

<p>A browser extension for Chrome and Firefox that automatically pushes your code to GitHub when you pass all tests on a <a href="https://leetcode.com/">LeetCode</a> or <a href="https://practice.geeksforgeeks.org/">GeeksforGeeks</a> problem. Fast, reliable, and equipped with PAT authentication and custom settings support.</p>

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
   git clone https://github.com/vpk-11/LeetHub-2.0.git
   ```
2. Install developer dependencies:
   ```bash
   npm run setup
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the unpacked extension:
   - **Chrome**: Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `./dist/chrome`.
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select `./dist/firefox/manifest.json`.

### NPM Commands

```bash
npm test              # Run Jasmine test suite
npm run build         # Build production bundles for Chrome and Firefox
npm run dev           # Build with watch mode enabled
npm run format        # Auto-format codebase using Prettier
```
