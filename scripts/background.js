import {
  getBrowser,
  pushConfigToRepo,
  syncConfigFromRepo,
  syncStatsFromRepo,
} from './leetcode/util.js';

const api = getBrowser();

/* Sync (stats.json, config.json pull/push) runs here, not in popup.js: a toolbar popup's
   own JS context gets torn down as soon as it closes or loses focus, which can kill an
   in-flight fetch before storage.local.set ever runs - Firefox reaps popups more
   aggressively than Chrome, which is why this was flaky there specifically. The background
   script persists independent of the popup's lifecycle, so it can finish the work reliably
   on both browsers. */
api.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.type === 'POPUP_SYNC') {
    Promise.all([syncStatsFromRepo(), syncConfigFromRepo()]).then(([stats]) => {
      sendResponse({ stats });
    });
    return true; // keep the message channel open for the async response
  }
  if (request?.type === 'PUSH_CONFIG') {
    pushConfigToRepo().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
