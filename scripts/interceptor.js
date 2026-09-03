/* Runs in the page's own (MAIN world) JS context - on Chrome via the content_scripts
   "world": "MAIN" key, on Firefox via interceptorLoader.js appending a <script src> tag
   (Firefox 109+, its target, predates that key). Both routes execute this file in true
   page context, so it stays byte-identical between the two builds.

   Two jobs, both things an isolated-world content script cannot see on its own:
   1. Detect a passed submission's own /submit/ response (the auto-push trigger - passive
      network observation, no click handler needed, works on keyboard-submit for free).
   2. Detect a LeetCode "Solution" writeup being published (a GraphQL mutation). */

function handleSubmitResponse(url, data) {
  if (!url?.includes('/problems/') || !url?.includes('/submit/')) return;
  if (data?.submission_id == null) return;
  window.dispatchEvent(
    new CustomEvent('leetHubSubmissionId', { detail: { submissionId: data.submission_id } })
  );
}

function handleSolutionPostBody(body) {
  if (body?.operationName !== 'ugcArticlePublishSolution') return;

  const data = body.variables?.data;
  if (!data?.questionSlug || !data?.content) return;

  window.dispatchEvent(
    new CustomEvent('leetHubSolutionPost', {
      detail: { questionSlug: data.questionSlug, content: data.content, title: data.title },
    })
  );
}

const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const [resource, options] = args;
  const url = typeof resource === 'string' ? resource : resource?.url;
  const response = await originalFetch.apply(this, args);

  if (url?.includes('/problems/') && url?.includes('/submit/')) {
    try {
      handleSubmitResponse(url, await response.clone().json());
    } catch (err) {
      console.log('LeetHub: failed to parse submit response', err);
    }
  }

  if (url?.includes('/graphql/') && (options?.method || 'GET') === 'POST') {
    try {
      handleSolutionPostBody(JSON.parse(options?.body || '{}'));
    } catch (err) {
      console.log('LeetHub: failed to parse GraphQL request body (fetch)', err);
    }
  }

  return response;
};

const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...args) {
  this._leethub_url = url;
  this._leethub_method = method;
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function (data) {
  if (this._leethub_url?.includes('/graphql/') && this._leethub_method === 'POST') {
    try {
      handleSolutionPostBody(JSON.parse(data || '{}'));
    } catch (err) {
      console.log('LeetHub: failed to parse GraphQL request body (XHR)', err);
    }
  }
  return originalXHRSend.apply(this, [data]);
};
