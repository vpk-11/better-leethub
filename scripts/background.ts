import {
  archiveAndResetStats,
  getBrowser,
  pushConfigToRepo,
  recomputeStatsFromRepo,
  syncConfigFromRepo,
  syncStatsFromRepo,
} from './leetcode/util.js';

const api = getBrowser();

type BackgroundMessage =
  | { type: 'POPUP_SYNC' }
  | { type: 'RECOMPUTE_STATS' }
  | { type: 'PUSH_CONFIG' }
  | { type: 'ARCHIVE_RESET' };

/* Sync (stats.json, config.json pull/push) and Archive & Reset all run here, not in popup.js:
   a toolbar popup's own JS context gets torn down as soon as it closes or loses focus, which
   can kill an in-flight fetch before storage.local.set ever runs - Firefox reaps popups more
   aggressively than Chrome, which is why this was flaky there specifically. Archive & Reset
   is several sequential Git Data API calls (see archiveAndResetStats), so it's exactly as
   exposed to this failure class as the original stats/config sync was - same fix applies.
   The background script persists independent of the popup's lifecycle, so it can finish the
   work reliably on both browsers. */
api.runtime.onMessage.addListener(
  (request: BackgroundMessage, _sender, sendResponse: (response: unknown) => void) => {
    if (request?.type === 'POPUP_SYNC') {
      Promise.all([syncStatsFromRepo(), syncConfigFromRepo()]).then(([stats]) => {
        sendResponse({ stats });
      });
      return true; // keep the message channel open for the async response
    }
    if (request?.type === 'RECOMPUTE_STATS') {
      recomputeStatsFromRepo()
        .then(stats => sendResponse({ stats }))
        .catch(err => sendResponse({ error: err instanceof Error ? err.message : String(err) }));
      return true;
    }
    if (request?.type === 'PUSH_CONFIG') {
      pushConfigToRepo().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (request?.type === 'ARCHIVE_RESET') {
      archiveAndResetStats()
        .then(stats => sendResponse({ stats }))
        .catch(err => sendResponse({ error: err instanceof Error ? err.message : String(err) }));
      return true;
    }
    return false;
  }
);
