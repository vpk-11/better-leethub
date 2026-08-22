/* Firefox only (MV2 has no content_scripts "world": "MAIN" key). Runs as a normal
   isolated-world content script at document_start and self-injects interceptor.js via a
   <script src> tag, which always executes in true page (MAIN world) context regardless of
   manifest version - so interceptor.js itself stays byte-identical between both builds. */
const script = document.createElement('script');
script.src = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
  'scripts/interceptor.js'
);
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
