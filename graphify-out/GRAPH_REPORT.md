# Graph Report - leethub  (2026-09-15)

## Corpus Check
- 34 files · ~225,825 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 321 nodes · 636 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8f9bffe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_jQuery Vendor Bundle|jQuery Vendor Bundle]]
- [[_COMMUNITY_LeetCode Submission Core|LeetCode Submission Core]]
- [[_COMMUNITY_Stats and Version Utilities|Stats and Version Utilities]]
- [[_COMMUNITY_package.json Build Deps|package.json Build Deps]]
- [[_COMMUNITY_README and Popup UI|README and Popup UI]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_GeeksforGeeks Support|GeeksforGeeks Support]]
- [[_COMMUNITY_Webpack Build Config|Webpack Build Config]]
- [[_COMMUNITY_Background Service Worker|Background Service Worker]]
- [[_COMMUNITY_Feature Request Issue Template|Feature Request Issue Template]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 64 edges
2. `LeetCodeV2` - 22 edges
3. `getBrowser()` - 20 edges
4. `LeetCodeV1` - 18 edges
5. `githubHeaders()` - 17 edges
6. `checkElem()` - 15 edges
7. `compilerOptions` - 12 edges
8. `ee()` - 11 edges
9. `syncStatsFromRepo()` - 11 edges
10. `archiveAndResetStats()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `setSyncStatus()` --calls--> `$()`  [INFERRED]
  scripts/welcome.ts → scripts/jquery-3.7.1.min.js
- `renderStats()` --calls--> `$()`  [INFERRED]
  scripts/popup.ts → scripts/jquery-3.7.1.min.js
- `renderStats()` --calls--> `$()`  [INFERRED]
  scripts/welcome.ts → scripts/jquery-3.7.1.min.js
- `showCommitMode()` --calls--> `$()`  [INFERRED]
  scripts/welcome.ts → scripts/jquery-3.7.1.min.js
- `showHookMode()` --calls--> `$()`  [INFERRED]
  scripts/welcome.ts → scripts/jquery-3.7.1.min.js

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "jQuery Vendor Bundle"
Cohesion: 0.11
Nodes (42): Stats, archiveAndResetStats(), BrowserApi, bumpRepoStat(), computeStatsFromReadmes(), encodeJsonContent(), ensureRepoReadme(), escapeHtml() (+34 more)

### Community 1 - "LeetCode Submission Core"
Cohesion: 0.29
Nodes (11): buildProblemPath(), DEFAULT_CONFIG, isOn(), setSwitch(), updateFolderLivePreview(), updateTimestampExample(), wireConfigsEditForm(), renderConfigsSummary() (+3 more)

### Community 2 - "Stats and Version Utilities"
Cohesion: 0.06
Nodes (15): addManualSubmitBtn(), createGitIcon(), createToolTip(), getSubmissionPageBtns(), setupManualSubmitBtn(), checkElem(), formatStats(), getDifficulty() (+7 more)

### Community 3 - "package.json Build Deps"
Cohesion: 0.09
Nodes (35): api, createRepoReadme(), decode(), encode(), findExistingProblemDir(), getAndInitializeStats(), getCustomCommitMessage(), getGitHubFile() (+27 more)

### Community 4 - "README and Popup UI"
Cohesion: 0.06
Nodes (30): description, devDependencies, chrome-types, copy-webpack-plugin, eslint, filemanager-webpack-plugin, ignore-loader, jasmine (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): compilerOptions, allowJs, checkJs, esModuleInterop, module, moduleResolution, outDir, rootDir (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (21): Changes, No third-party requests, Privacy Policy - Better LeetHub, Scope, Short version, The honest limit: your device, What data the extension touches, What the developer collects: nothing (+13 more)

### Community 7 - "GeeksforGeeks Support"
Cohesion: 0.25
Nodes (6): diff, emptyTree, EXCLUDED_PATHS, full, hits, PATTERNS

### Community 8 - "Webpack Build Config"
Cohesion: 0.33
Nodes (4): __dirname, __filename, folderIgnore, ignore

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (9): Build instructions (source submission), Bundled third-party code, MAIN-world script: `scripts/interceptor.js`, Network activity, Notes for AMO reviewers - Better LeetHub, Permissions, Source, Token / data handling (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (37): $(), A(), Ae(), B(), Be(), c(), $e(), ee() (+29 more)

## Knowledge Gaps
- **91 isolated node(s):** `__filename`, `__dirname`, `ignore`, `folderIgnore`, `api` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `Community 18` to `jQuery Vendor Bundle`, `LeetCode Submission Core`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Why does `getBrowser()` connect `jQuery Vendor Bundle` to `LeetCode Submission Core`, `package.json Build Deps`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `LeetCodeV2` connect `Stats and Version Utilities` to `package.json Build Deps`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `$()` (e.g. with `updateFolderLivePreview()` and `updateTimestampExample()`) actually correct?**
  _`$()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `__filename`, `__dirname`, `ignore` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `jQuery Vendor Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.10530612244897959 - nodes in this community are weakly interconnected._
- **Should `Stats and Version Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.0596078431372549 - nodes in this community are weakly interconnected._